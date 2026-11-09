"use client";
import { useState } from "react";
import {
  expandTopicSelection,
  removeTopicSelection,
} from "@/lib/domain/selection";
import {
  useForm,
  useWatch,
  type Resolver,
  type PathValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Search,
  SlidersHorizontal,
  Atom,
  FlaskConical,
  Dna,
  Clock3,
  Target,
  ListChecks,
  LoaderCircle,
} from "lucide-react";
import { testConfigSchema, type TestConfig } from "@/lib/domain/validation";
import type { SyllabusData } from "@/lib/services/syllabus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { quotas } from "@/lib/domain/generation";
const kinds = [
  {
    id: "BIOLOGY_SECTION",
    name: "Biology section",
    desc: "90 questions · provisional class/category coverage",
  },
  {
    id: "CHEMISTRY_SECTION",
    name: "Chemistry section",
    desc: "45 questions · provisional class/category coverage",
  },
  {
    id: "PHYSICS_SECTION",
    name: "Physics section",
    desc: "45 questions · provisional coverage policy",
  },
  { id: "CUSTOM", name: "Custom test", desc: "Your chapters. Your topics." },
  {
    id: "CLASS_11",
    name: "Complete Class 11",
    desc: "Available Class 11 coverage",
  },
  {
    id: "CLASS_12",
    name: "Complete Class 12",
    desc: "Available Class 12 coverage",
  },
  {
    id: "FULL_MOCK",
    name: "Full NEET mock",
    desc: "Provisional blueprint; verified availability required",
  },
  { id: "WEAK", name: "Weak-topic revision", desc: "Build from your mistakes" },
  {
    id: "COMPLETED",
    name: "Completed syllabus",
    desc: "Practice what you’ve covered",
  },
] as const;
type Availability = {
  total: number;
  shortages?: string[];
  difficulty: Record<string, number>;
  chapters: Record<string, number>;
};
export function TestBuilder({
  syllabus,
  preselect = [],
  initialKind = "CUSTOM",
  language = "en",
  blueprint,
  developmentLab = false,
}: {
  syllabus: SyllabusData;
  preselect?: string[];
  initialKind?: TestConfig["kind"];
  language?: "en" | "hi";
  blueprint: {
    totalQuestions: number;
    durationMinutes: number;
    sections: { name: string; count: number }[];
  } | null;
  developmentLab?: boolean;
}) {
  const router = useRouter(),
    [step, setStep] = useState(0),
    [subjects, setSubjects] = useState(syllabus.subjects.map((s) => s.id)),
    [classes, setClasses] = useState([11, 12]),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [available, setAvailable] = useState<Availability | null>(null),
    [checkedConfig, setCheckedConfig] = useState("");
  const initialSection =
    initialKind === "PHYSICS_SECTION" ||
    initialKind === "CHEMISTRY_SECTION" ||
    initialKind === "BIOLOGY_SECTION";
  const form = useForm<TestConfig>({
    resolver: zodResolver(testConfigSchema) as Resolver<TestConfig>,
    defaultValues: {
      name: "My personalized practice",
      kind: initialKind,
      topicIds: preselect,
      fullChapterIds: [],
      count: initialSection
        ? initialKind === "BIOLOGY_SECTION"
          ? 90
          : 45
        : initialKind === "FULL_MOCK"
          ? (blueprint?.totalQuestions ?? 180)
          : 10,
      mode: initialSection || initialKind === "FULL_MOCK" ? "NEET" : "LEARNING",
      durationMinutes: initialSection
        ? initialKind === "BIOLOGY_SECTION"
          ? 90
          : 45
        : initialKind === "FULL_MOCK"
          ? (blueprint?.durationMinutes ?? 180)
          : null,
      difficulty: { EASY: 30, MEDIUM: 50, HARD: 20 },
      difficultyMode: "STRICT",
      exposure: "ALL",
      allocation: "AUTO",
      chapterCounts: {},
      instantFeedback: false,
      language,
    },
  });
  const config = useWatch({ control: form.control }) as TestConfig;
  const allChapters = syllabus.subjects.flatMap((s) =>
      s.chapters.map((c) => ({ ...c, subject: s.name, subjectId: s.id })),
    ),
    allTopics = allChapters.flatMap((c) => c.topics);
  const selected = new Set(
    expandTopicSelection(
      [
        ...config.topicIds,
        ...allChapters
          .filter((c) => config.fullChapterIds.includes(c.id))
          .flatMap((c) => c.topics.map((t) => t.id)),
      ],
      allTopics,
    ),
  );
  const selectedChapters = allChapters.filter((c) =>
    c.topics.some((t) => selected.has(t.id)),
  );
  const isSection =
    config.kind === "PHYSICS_SECTION" ||
    config.kind === "CHEMISTRY_SECTION" ||
    config.kind === "BIOLOGY_SECTION";
  const sectionSubject =
    config.kind === "BIOLOGY_SECTION"
      ? "Biology"
      : config.kind === "CHEMISTRY_SECTION"
        ? "Chemistry"
        : "Physics";
  const isFull = config.kind === "FULL_MOCK" || isSection,
    isClass = config.kind === "CLASS_11" || config.kind === "CLASS_12";
  const count = isSection
    ? config.kind === "BIOLOGY_SECTION"
      ? 90
      : 45
    : isFull
      ? (blueprint?.totalQuestions ?? 180)
      : config.count;
  const set = <K extends keyof TestConfig>(key: K, value: TestConfig[K]) => {
    form.setValue(key, value as PathValue<TestConfig, K>);
    setAvailable(null);
    setError("");
  };
  const serialized = JSON.stringify(config),
    validAvailability = available && checkedConfig === serialized;
  function chooseKind(kind: TestConfig["kind"]) {
    set("kind", kind);
    if (
      kind === "PHYSICS_SECTION" ||
      kind === "CHEMISTRY_SECTION" ||
      kind === "BIOLOGY_SECTION"
    ) {
      set(
        "topicIds",
        allChapters
          .filter(
            (c) =>
              c.subject ===
              (kind === "BIOLOGY_SECTION"
                ? "Biology"
                : kind === "CHEMISTRY_SECTION"
                  ? "Chemistry"
                  : "Physics"),
          )
          .flatMap((c) => c.topics.map((t) => t.id)),
      );
      set("fullChapterIds", []);
      set("count", kind === "BIOLOGY_SECTION" ? 90 : 45);
      set("mode", "NEET");
      set("durationMinutes", kind === "BIOLOGY_SECTION" ? 90 : 45);
      set("allocation", "AUTO");
    }
    if (kind === "FULL_MOCK") {
      set("count", blueprint?.totalQuestions ?? 180);
      set("mode", "NEET");
      set("durationMinutes", blueprint?.durationMinutes ?? 180);
      set("instantFeedback", false);
      set("allocation", "AUTO");
    } else if (kind === "CLASS_11" || kind === "CLASS_12") {
      set(
        "topicIds",
        allChapters
          .filter((c) => c.classLevel === (kind === "CLASS_11" ? 11 : 12))
          .flatMap((c) => c.topics.map((t) => t.id)),
      );
      set("fullChapterIds", []);
    } else if (kind === "COMPLETED") {
      set(
        "topicIds",
        allTopics
          .filter((t) => ["COMPLETED", "REVISING"].includes(t.status))
          .map((t) => t.id),
      );
      set("fullChapterIds", []);
    } else if (kind === "WEAK") {
      set("topicIds", preselect);
      set("fullChapterIds", []);
    }
  }
  function scopeTopicIds() {
    const term = search.toLowerCase();
    return allChapters
      .filter(
        (c) =>
          subjects.includes(c.subjectId) &&
          classes.includes(c.classLevel) &&
          (!category || c.classification === category),
      )
      .flatMap((c) =>
        c.topics
          .filter(
            (t) =>
              !term ||
              c.name.toLowerCase().includes(term) ||
              t.name.toLowerCase().includes(term),
          )
          .map((t) => t.id),
      );
  }
  function toggleTopic(id: string) {
    const chapter = allChapters.find((c) => c.topics.some((t) => t.id === id))!;
    if (config.fullChapterIds.includes(chapter.id)) {
      set(
        "fullChapterIds",
        config.fullChapterIds.filter((x) => x !== chapter.id),
      );
      set(
        "topicIds",
        removeTopicSelection(
          [...config.topicIds, ...chapter.topics.map((t) => t.id)],
          allTopics,
          id,
        ),
      );
    } else
      set(
        "topicIds",
        selected.has(id)
          ? removeTopicSelection(config.topicIds, allTopics, id)
          : [...config.topicIds, id],
      );
  }
  async function checkAvailability() {
    setError("");
    const parsed = testConfigSchema.safeParse(config);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/tests/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.error);
      setAvailable(json);
      setCheckedConfig(serialized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Availability check failed");
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.error);
      router.push(`/tests/${json.testId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate test");
    } finally {
      setBusy(false);
    }
  }
  const allocationTotal = Object.values(config.chapterCounts).reduce(
    (a, b) => a + b,
    0,
  );
  return (
    <div className="grid gap-7 xl:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-7 flex gap-2">
          {[
            "Choose your test",
            "Select syllabus",
            "Set your preferences",
            "Review & start",
          ].map((s, i) => (
            <button
              key={s}
              onClick={() => {
                setStep(i);
                setError("");
              }}
              className={cn(
                "flex-1 flex flex-col sm:flex-row items-center gap-2 rounded-xl p-2 text-xs font-medium",
                step === i
                  ? "text-primary bg-primary/7"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-6 rounded-full flex items-center justify-center shrink-0 text-[11px]",
                  step === i ? "bg-primary text-white" : "bg-secondary",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </button>
          ))}
        </div>
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>What would you like to practice?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Start with a test that matches today’s goal.
              </p>
            </CardHeader>
            <CardContent>
              {developmentLab && (
                <Link href="/dev-test" className="mb-4 block rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Open local development test lab · original sample questions · excluded from database analytics
                </Link>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {kinds.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => chooseKind(k.id)}
                    className={cn(
                      "text-left rounded-xl border p-5 transition-colors",
                      config.kind === k.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/15"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="flex justify-between">
                      <span className="font-semibold text-sm">{k.name}</span>
                      {config.kind === k.id && (
                        <Check className="size-4 text-primary" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {k.desc}
                    </p>
                  </button>
                ))}
              </div>
              {isFull && (
                <p className="mt-5 text-sm bg-amber-500/8 p-4 rounded-xl text-amber-700 dark:text-amber-300">
                  Requires the complete approved question bank. The illustrative
                  seed does not contain enough questions for a full mock.
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {step === 1 && (
          <div className="space-y-5">
            {!isFull && !isClass && (
              <Card>
                <CardHeader>
                  <CardTitle>Make room for what you’ve learned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {syllabus.subjects.map((s, i) => {
                      const Icon = [Atom, FlaskConical, Dna][i % 3];
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            const next = subjects.includes(s.id)
                              ? subjects.filter((x) => x !== s.id)
                              : [...subjects, s.id];
                            setSubjects(next);
                          }}
                          className={cn(
                            "p-4 rounded-xl border text-left flex gap-3 items-center",
                            subjects.includes(s.id)
                              ? "border-primary bg-primary/5"
                              : "",
                          )}
                        >
                          <Icon className="size-5 text-primary" />
                          <span className="text-sm font-semibold">
                            {s.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-4">
                    {[11, 12].map((c) => (
                      <Button
                        key={c}
                        variant={classes.includes(c) ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => {
                          const next = classes.includes(c)
                            ? classes.filter((x) => x !== c)
                            : [...classes, c];
                          setClasses(next);
                        }}
                      >
                        Class {c}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isFull
                    ? "Full syllabus simulation"
                    : isClass
                      ? `Class ${config.kind === "CLASS_11" ? 11 : 12} coverage`
                      : "Chapters & topics"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isFull || isClass
                    ? "All available topics in this scope are included. Check content availability before starting."
                    : "Mix whole chapters with individual topics. Unselected concepts stay out."}
                </p>
              </CardHeader>
              <CardContent>
                {!isFull && !isClass && (
                  <>
                    <label className="field mb-3">
                      Subject category
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">All categories</option>
                        {[
                          "Physical Chemistry",
                          "Inorganic Chemistry",
                          "Organic Chemistry",
                          "Practical Chemistry",
                          "Botany",
                          "Zoology",
                          "Mixed",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </label>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Search chapters or topics…"
                        aria-label="Search syllabus"
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-3 mb-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          set("topicIds", [
                            ...new Set([...selected, ...scopeTopicIds()]),
                          ])
                        }
                      >
                        Select all in scope
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const scope = new Set(scopeTopicIds());
                          set(
                            "topicIds",
                            [...selected].filter((id) => !scope.has(id)),
                          );
                          set("fullChapterIds", []);
                        }}
                      >
                        Deselect all in scope
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSearch("");
                          setCategory("");
                          setClasses([11, 12]);
                          setSubjects(syllabus.subjects.map((s) => s.id));
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </>
                )}
                <Accordion
                  type="multiple"
                  className="divide-y max-h-[65vh] overflow-y-auto"
                >
                  {allChapters
                    .filter((c) => !isSection || c.subject === sectionSubject)
                    .filter(
                      (c) =>
                        isFull ||
                        !category || c.classification === category,
                    )
                    .filter(
                      (c) =>
                        (isFull || isClass
                          ? isFull ||
                            c.classLevel ===
                              (config.kind === "CLASS_11" ? 11 : 12)
                          : subjects.includes(c.subjectId) &&
                            classes.includes(c.classLevel)) &&
                        (!search ||
                          `${c.name} ${c.topics.map((t) => t.name).join(" ")}`
                            .toLowerCase()
                            .includes(search.toLowerCase())),
                    )
                    .map((c) => (
                      <AccordionItem value={c.id} key={c.id}>
                        <AccordionTrigger>
                          <div>
                            <span className="text-[10px] block mb-1 text-muted-foreground uppercase tracking-wide">
                              {c.subject} · Class {c.classLevel}
                              {(c.subject === "Chemistry" || c.subject === "Biology") && c.classification
                                ? ` · ${c.classification}`
                                : ""}
                            </span>
                            {c.name}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              {
                                c.topics.filter((t) => selected.has(t.id))
                                  .length
                              }
                              /{c.topics.length} topics
                              {" · "}{c.questionCount} approved in chapter
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {!isFull && !isClass && (
                            <label className="mb-4 flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={config.fullChapterIds.includes(c.id)}
                                onChange={(e) => {
                                  set(
                                    "fullChapterIds",
                                    e.target.checked
                                      ? [...config.fullChapterIds, c.id]
                                      : config.fullChapterIds.filter(
                                          (x) => x !== c.id,
                                        ),
                                  );
                                  set(
                                    "topicIds",
                                    config.topicIds.filter(
                                      (id) =>
                                        !c.topics.some((t) => t.id === id),
                                    ),
                                  );
                                }}
                              />
                              Full chapter{" "}
                              <span className="ml-auto text-xs text-muted-foreground">
                                Includes every active topic
                              </span>
                            </label>
                          )}
                          {!isFull && !isClass && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mb-3"
                              onClick={() => {
                                set(
                                  "fullChapterIds",
                                  config.fullChapterIds.filter(
                                    (id) => id !== c.id,
                                  ),
                                );
                                set(
                                  "topicIds",
                                  config.topicIds.filter(
                                    (id) => !c.topics.some((t) => t.id === id),
                                  ),
                                );
                              }}
                            >
                              Clear chapter selection
                            </Button>
                          )}
                          <div className="grid sm:grid-cols-2 gap-3">
                            {c.topics.map((t) => (
                              <label
                                key={t.id}
                                className={cn(
                                  "flex items-center gap-2 text-sm",
                                  t.parentId && "ml-4 border-l pl-3",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    isFull || isClass || selected.has(t.id)
                                  }
                                  disabled={isFull || isClass}
                                  onChange={() => toggleTopic(t.id)}
                                />
                                <span>
                                  {t.name}
                                  <span className="block text-xs text-muted-foreground">
                                    {t.questionCount} approved in topic · before test filters
                                  </span>
                                  <span className="block text-[10px] text-muted-foreground">
                                    {t.status
                                      .replaceAll("_", " ")
                                      .toLowerCase()}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Length & distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="field">
                  Give your test a name
                  <Input {...form.register("name")} />
                </label>
                <p className="text-xs text-muted-foreground mb-4">
                  Physics, Chemistry and Biology school syllabi include Class 11/12. NEET
                  2027 eligibility is provisional. Imported questions require
                  academic and rights approval; zero availability is shown
                  honestly.
                </p>
                <label className="field">
                  Source
                  <Select
                    value={config.sourceFilter ?? "ALL"}
                    onChange={(e) =>
                      set("sourceFilter", e.target.value as "ALL" | "PYQ")
                    }
                  >
                    <option value="ALL">All verified questions</option>
                    <option value="PYQ">PYQs only</option>
                  </Select>
                </label>
                <label className="field mt-4">
                  Years
                  <Select
                    value={config.yearPreset ?? "ALL"}
                    onChange={(e) => {
                      set(
                        "yearPreset",
                        e.target.value as "ALL" | "LAST10" | "RANGE",
                      );
                      set("yearFrom", null);
                      set("yearTo", null);
                    }}
                  >
                    <option value="ALL">All available years</option>
                    <option value="LAST10">Last 10 available exam years</option>
                    <option value="RANGE">Specific year or custom range</option>
                  </Select>
                </label>
                <div className="flex gap-3 mt-4">
                  <label className="field">
                    From year
                    <Input
                      type="number"
                      disabled={config.yearPreset !== "RANGE"}
                      value={config.yearFrom ?? ""}
                      onChange={(e) =>
                        set(
                          "yearFrom",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    To year
                    <Input
                      type="number"
                      disabled={config.yearPreset !== "RANGE"}
                      value={config.yearTo ?? ""}
                      onChange={(e) =>
                        set(
                          "yearTo",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave years blank for all years; use the same year for a
                  specific year.
                </p>
                <label className="field mt-5">
                  Number of questions
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={count}
                    disabled={isFull}
                    onChange={(e) => set("count", Number(e.target.value))}
                  />
                </label>
                <div className="flex flex-wrap gap-2 my-3">
                  {[10, 15, 20, 30, 45, 60, 90].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={config.count === n ? "secondary" : "ghost"}
                      disabled={isFull}
                      onClick={() => set("count", n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                {!isFull && (
                  <>
                    <label className="field mt-5">
                      Question allocation
                      <Select
                        value={config.allocation}
                        onChange={(e) =>
                          set(
                            "allocation",
                            e.target.value as TestConfig["allocation"],
                          )
                        }
                      >
                        <option value="AUTO">
                          Automatic — balanced chapter coverage within each
                          difficulty
                        </option>
                        <option value="MANUAL">
                          Manual — set a count for each chapter
                        </option>
                        <option value="MANUAL_SUBJECT">
                          Manual — set a count for each subject
                        </option>
                      </Select>
                    </label>
                    {config.allocation === "MANUAL_SUBJECT" && (
                      <div className="space-y-3 mt-4">
                        {syllabus.subjects
                          .filter((subject) =>
                            selectedChapters.some(
                              (c) => c.subjectId === subject.id,
                            ),
                          )
                          .map((subject) => (
                            <label
                              key={subject.id}
                              className="flex justify-between items-center text-sm"
                            >
                              {subject.name}
                              <Input
                                className="w-24"
                                type="number"
                                min={0}
                                max={180}
                                value={config.subjectCounts?.[subject.id] ?? 0}
                                onChange={(e) =>
                                  set("subjectCounts", {
                                    ...config.subjectCounts,
                                    [subject.id]: Number(e.target.value),
                                  })
                                }
                              />
                            </label>
                          ))}
                        <p className="text-xs">
                          Allocated{" "}
                          {Object.values(config.subjectCounts ?? {}).reduce(
                            (a, b) => a + b,
                            0,
                          )}{" "}
                          / {config.count} questions
                        </p>
                      </div>
                    )}
                    {config.allocation === "MANUAL" && (
                      <div className="space-y-3 mt-4">
                        {selectedChapters.map((c) => (
                          <label
                            key={c.id}
                            className="flex gap-3 items-center text-sm justify-between"
                          >
                            {c.name}
                            <Input
                              className="w-24"
                              type="number"
                              min={0}
                              max={180}
                              value={config.chapterCounts[c.id] ?? 0}
                              onChange={(e) =>
                                set("chapterCounts", {
                                  ...config.chapterCounts,
                                  [c.id]: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        ))}
                        <p
                          className={cn(
                            "text-xs",
                            allocationTotal === config.count
                              ? "text-emerald-600"
                              : "text-destructive",
                          )}
                        >
                          Allocated {allocationTotal} / {config.count} questions
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Challenge level</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Editorial difficulty labels. These are not statistically
                  calibrated.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    {
                      label: "Any Difficulty",
                      mix: { EASY: 30, MEDIUM: 50, HARD: 20 },
                      mode: "ANY" as const,
                    },
                    {
                      label: "Foundation",
                      mix: { EASY: 100, MEDIUM: 0, HARD: 0 },
                      mode: "STRICT" as const,
                    },
                    {
                      label: "NEET Balanced",
                      mix: { EASY: 30, MEDIUM: 50, HARD: 20 },
                      mode: "STRICT" as const,
                    },
                    {
                      label: "Challenging",
                      mix: { EASY: 10, MEDIUM: 30, HARD: 60 },
                      mode: "STRICT" as const,
                    },
                  ].map((m) => (
                    <Button
                      key={m.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        set("difficulty", m.mix);
                        set("difficultyMode", m.mode);
                      }}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
                {config.difficultyMode === "ANY" ? (
                  <p className="text-sm text-muted-foreground">
                    Any Difficulty uses every otherwise eligible question and balances chapter coverage without enforcing a difficulty quota.
                  </p>
                ) : (
                <div className="grid grid-cols-3 gap-4">
                  {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                    <label key={d} className="field">
                      {d.toLowerCase()} %
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={config.difficulty[d]}
                        onChange={(e) =>
                          {
                            set("difficulty", {
                              ...config.difficulty,
                              [d]: Number(e.target.value),
                            });
                            set("difficultyMode", "STRICT");
                          }
                        }
                      />
                    </label>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Make practice work for you</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="field">
                  Question exposure
                  <Select
                    value={config.exposure}
                    onChange={(e) =>
                      set("exposure", e.target.value as TestConfig["exposure"])
                    }
                  >
                    <option value="ALL">
                      Include previously attempted questions
                    </option>
                    <option value="UNSEEN">Unseen questions only</option>
                    <option value="INCORRECT">Incorrect questions only</option>
                    <option value="BOOKMARKED">
                      Bookmarked questions only
                    </option>
                  </Select>
                </label>
                <label className="field">
                  Test mode
                  <Select
                    value={config.mode}
                    disabled={isFull}
                    onChange={(e) => {
                      const mode = e.target.value as TestConfig["mode"];
                      set("mode", mode);
                      set(
                        "durationMinutes",
                        mode === "LEARNING" ? null : Math.max(5, config.count),
                      );
                      if (mode !== "LEARNING") set("instantFeedback", false);
                    }}
                  >
                    <option value="LEARNING">
                      Learning — +4 / 0, optional timer
                    </option>
                    <option value="TIMED">Timed practice — +4 / 0</option>
                    <option value="NEET">NEET exam mode — +4 / −1</option>
                  </Select>
                </label>
                <label className="field">
                  Time limit in minutes{" "}
                  {config.mode === "LEARNING" && "(blank for untimed)"}
                  <Input
                    type="number"
                    min={1}
                    max={360}
                    disabled={isFull}
                    value={config.durationMinutes ?? ""}
                    onChange={(e) =>
                      set(
                        "durationMinutes",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </label>
                <label className="field">
                  Question language
                  <Select
                    value={config.language}
                    onChange={(e) =>
                      set("language", e.target.value as "en" | "hi")
                    }
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </Select>
                </label>
                <p className="text-sm text-muted-foreground">
                  Answers and explanations are available after submission.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>A moment to check your plan</CardTitle>
              <p className="text-sm text-muted-foreground">
                We’ll validate availability again on the server when you start.
              </p>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg mb-4">{config.name}</h3>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
                {[
                  ["Test type", kinds.find((k) => k.id === config.kind)?.name],
                  ["Questions", count],
                  ["Mode", config.mode],
                  [
                    "Time limit",
                    config.durationMinutes
                      ? `${config.durationMinutes} minutes`
                      : "Untimed",
                  ],
                  [
                    "Difficulty",
                    Object.entries(config.difficulty)
                      .map(([d, n]) => `${d.toLowerCase()} ${n}%`)
                      .join(" / "),
                  ],
                  [
                    "Marking",
                    config.mode === "NEET"
                      ? "+4 correct / −1 incorrect / 0 skipped"
                      : "+4 correct / 0 incorrect or skipped",
                  ],
                  ["Exposure", config.exposure.toLowerCase()],
                  ["Language", config.language === "en" ? "English" : "Hindi"],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs text-muted-foreground mb-1">
                      {label}
                    </dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="border-t mt-6 pt-5">
                <h3 className="text-sm font-semibold mb-3">
                  Selected coverage
                </h3>
                {isSection ? (
                  <p>
                    {sectionSubject}: {config.kind === "BIOLOGY_SECTION" ? 90 : 45} questions with Class 11/12 coverage.{" "}
                    {sectionSubject === "Chemistry"
                      ? "Physical, Organic and Inorganic category quotas follow the provisional policy."
                      : sectionSubject === "Biology"
                        ? "Botany, Zoology and mixed reporting-category quotas follow the provisional policy."
                        : "Class quotas follow the provisional policy."}
                  </p>
                ) : isFull && blueprint ? (
                  <p className="text-sm text-muted-foreground">
                    {blueprint.sections
                      .map((s) => `${s.name}: ${s.count}`)
                      .join(" · ")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedChapters.map((c) => (
                      <div key={c.id}>
                        <p className="text-xs font-semibold">
                          {c.subject} · {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.topics
                            .filter((t) => selected.has(t.id))
                            .map((t) => t.name)
                            .join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={checkAvailability}
                disabled={busy}
                variant="outline"
                className="mt-6"
              >
                <CheckCheck />
                Check question availability
              </Button>
              {validAvailability && (
                <div
                  role="status"
                  className="mt-4 p-4 bg-secondary rounded-xl text-sm"
                >
                  <p className="font-semibold">
                    {available.total} eligible approved questions
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {Object.entries(available.difficulty)
                      .map(([d, n]) => `${d.toLowerCase()}: ${n}`)
                      .join(" · ")}
                  </p>
                  {available.total < count && (
                    <p className="text-destructive mt-3">
                      {available.total === 0
                        ? "No verified questions are currently available for this selection."
                        : `Requested ${count}; only ${available.total} are available. Choose fewer questions, expand your topics, or change exposure preferences.`}
                    </p>
                  )}
                  {!!available.shortages?.length && (
                    <ul className="mt-3 list-disc pl-5 text-destructive">
                      {available.shortages.map((shortage) => (
                        <li key={shortage}>{shortage}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl bg-destructive/8 text-destructive p-4 text-sm"
          >
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-between gap-3">
          <Button
            variant="outline"
            disabled={step === 0 || busy}
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            <ArrowLeft />
            Back
          </Button>
          {step < 3 ? (
            <Button
              disabled={busy}
              onClick={async () => {
                if (step === 1 && !isFull && !selected.size) {
                  setError("Select at least one topic to continue");
                  return;
                }
                if (step === 2) await checkAvailability();
                setStep(step + 1);
              }}
            >
              Continue
              <ArrowRight />
            </Button>
          ) : (
            <Button
              disabled={
                busy ||
                !validAvailability ||
                available.total < count ||
                !!available.shortages?.length
              }
              onClick={generate}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ArrowRight />
              )}
              Generate & start test
            </Button>
          )}
        </div>
      </div>
      <aside>
        <Card className="xl:sticky xl:top-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Your test, at a glance</CardTitle>
              <SlidersHorizontal className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <Badge>
              {isFull ? "NEET SIMULATION" : "PERSONALIZED PRACTICE"}
            </Badge>
            <div className="my-6 space-y-5">
              {[
                {
                  icon: ListChecks,
                  label: "Topics selected",
                  value: isFull ? "Full syllabus" : selected.size,
                },
                { icon: Target, label: "Requested questions", value: count },
                {
                  icon: CheckCheck,
                  label: "Available for this selection",
                  value: validAvailability ? available.total : "Check at review",
                },
                {
                  icon: Clock3,
                  label: "Duration",
                  value: config.durationMinutes
                    ? `${config.durationMinutes} min`
                    : "Your own pace",
                },
              ].map((r) => (
                <div key={r.label} className="flex gap-3 items-center">
                  <span className="rounded-lg bg-secondary p-2">
                    <r.icon className="size-4 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-semibold">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-between text-sm">
              <span className="text-muted-foreground">Possible score if generated</span>
              <strong>{count * 4} marks</strong>
            </div>
            {config.difficultyMode === "STRICT" && Object.values(config.difficulty).reduce((a, b) => a + b, 0) ===
              100 && (
              <p className="mt-4 text-[11px] text-muted-foreground">
                Question mix:{" "}
                {Object.entries(quotas(count, config.difficulty))
                  .map(([d, n]) => `${n} ${d.toLowerCase()}`)
                  .join(", ")}
              </p>
            )}
            <p className="mt-5 rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              Only approved questions whose concepts and prerequisites are in
              your selection can appear. We never fill gaps with unrelated
              content.
            </p>
            {syllabus.demo && (
              <p className="mt-4 text-[11px] text-amber-700 dark:text-amber-300">
                School syllabus coverage is imported; the active platform version still includes illustrative content.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
