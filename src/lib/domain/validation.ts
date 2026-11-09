import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(72, "Use at most 72 characters")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Use at most 72 UTF-8 bytes for the password",
  );
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export const signupSchema = z.object({
  name: z.string().trim().min(2).max(70),
  email: emailSchema,
  password: passwordSchema,
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(70),
  stage: z.enum(["CLASS_11", "CLASS_12", "REPEATER"]),
  examYear: z.number().int().min(2026).max(2040),
  language: z.enum(["en", "hi"]),
  dailyGoal: z.number().int().min(1).max(180),
  subjects: z
    .array(z.enum(["Physics", "Chemistry", "Biology"]))
    .min(1)
    .max(3),
  displayName: z
    .string()
    .trim()
    .max(40)
    .regex(/^[\p{L}\p{N} _-]*$/u, "Use a name without contact details"),
  leaderboard: z.boolean(),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
});
export const testConfigSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    kind: z.enum([
      "CUSTOM",
      "PHYSICS_SECTION",
      "CHEMISTRY_SECTION",
      "BIOLOGY_SECTION",
      "CLASS_11",
      "CLASS_12",
      "FULL_MOCK",
      "WEAK",
      "COMPLETED",
    ]),
    topicIds: z.array(z.string().min(1)).max(1000),
    fullChapterIds: z.array(z.string().min(1)).max(200).default([]),
    count: z.number().int().min(1).max(180),
    mode: z.enum(["LEARNING", "TIMED", "NEET"]),
    durationMinutes: z.number().int().min(1).max(360).nullable(),
    difficulty: z
      .object({
        EASY: z.number().min(0).max(100),
        MEDIUM: z.number().min(0).max(100),
        HARD: z.number().min(0).max(100),
      })
      .refine(
        (v) => v.EASY + v.MEDIUM + v.HARD === 100,
        "Difficulty percentages must add to 100",
      ),
    difficultyMode: z.enum(["STRICT", "ANY"]).optional(),
    yearPreset: z.enum(["ALL", "LAST10", "RANGE"]).optional(),
    sourceFilter: z.enum(["ALL", "PYQ"]).optional(),
    yearFrom: z.number().int().min(1900).max(2100).nullable().optional(),
    yearTo: z.number().int().min(1900).max(2100).nullable().optional(),
    exposure: z.enum(["UNSEEN", "ALL", "INCORRECT", "BOOKMARKED"]),
    allocation: z.enum(["AUTO", "MANUAL", "MANUAL_SUBJECT"]),
    subjectCounts: z
      .record(z.string(), z.number().int().min(0).max(180))
      .optional(),
    chapterCounts: z.record(z.string(), z.number().int().min(0).max(180)),
    language: z.enum(["en", "hi"]).default("en"),
    instantFeedback: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.yearFrom && value.yearTo && value.yearFrom > value.yearTo)
      ctx.addIssue({ code: "custom", message: "Year range is reversed" });
    if (value.mode !== "LEARNING" && value.durationMinutes === null)
      ctx.addIssue({
        code: "custom",
        message: "Timed tests require a duration",
        path: ["durationMinutes"],
      });
    if (value.mode !== "LEARNING" && value.instantFeedback)
      ctx.addIssue({
        code: "custom",
        message: "Instant explanations are only available in learning mode",
      });
    if (
      value.allocation === "MANUAL_SUBJECT" &&
      Object.values(value.subjectCounts ?? {}).reduce((a, b) => a + b, 0) !==
        value.count
    )
      ctx.addIssue({
        code: "custom",
        message: "Subject allocations must add to the question count",
      });
    if (
      value.allocation === "MANUAL" &&
      Object.values(value.chapterCounts).reduce((a, b) => a + b, 0) !==
        value.count
    )
      ctx.addIssue({
        code: "custom",
        message: "Chapter allocations must add to the question count",
      });
  });
export type TestConfig = z.infer<typeof testConfigSchema>;
export const answerSchema = z.object({
  testQuestionId: z.string(),
  selectedOption: z.number().int().min(0).max(3).nullable(),
  marked: z.boolean(),
  revision: z.number().int().min(1).max(2147483646),
});
export const eventSchema = z.object({
  id: z.string().uuid(),
  testQuestionId: z.string().optional(),
  type: z.enum([
    "VISIT",
    "HEARTBEAT",
    "HIDDEN",
    "VISIBLE",
    "OFFLINE",
    "ONLINE",
    "SKIP",
    "REVIEW",
  ]),
  activeMs: z.number().int().min(0).max(15000).default(0),
});
const mediaSchema = z.object({
  url: z
    .string()
    .url()
    .max(2000)
    .refine((v) => v.startsWith("https://"), "Media must use HTTPS"),
  alt: z.string().min(1).max(300),
});
export const questionSchema = z.object({
  text: z.string().trim().min(10).max(12000),
  options: z
    .array(z.string().trim().min(1).max(4000))
    .length(4)
    .refine((v) => new Set(v).size === 4, "Use four distinct answer options"),
  correctOption: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(10).max(16000),
  chapterId: z.string().min(1),
  topicIds: z.array(z.string()).min(1).max(20),
  prerequisiteIds: z.array(z.string()).max(20).default([]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  language: z.enum(["en", "hi"]),
  source: z.string().trim().min(1).max(300),
  license: z.enum(["ORIGINAL", "LICENSED", "PUBLIC_DOMAIN"]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  media: z.array(mediaSchema).max(5).default([]),
});
