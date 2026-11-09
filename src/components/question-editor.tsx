"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { questionSchema } from "@/lib/domain/validation";
import { adminAction } from "@/components/admin-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScienceText } from "@/components/science-text";
import { QuestionImage } from "@/components/question-image";
type Question = z.infer<typeof questionSchema>;
export function QuestionEditor({
  chapters,
  topics,
  initial,
  id,
}: {
  chapters: { id: string; name: string; label: string }[];
  topics: { id: string; name: string; chapterId: string }[];
  initial?: Question;
  id?: string;
}) {
  const router = useRouter(),
    [data, setData] = useState<Question>(
      initial ?? {
        text: "",
        options: ["", "", "", ""],
        correctOption: 0,
        explanation: "",
        chapterId: chapters[0]?.id ?? "",
        topicIds: [],
        prerequisiteIds: [],
        difficulty: "EASY",
        language: "en",
        source: "Original",
        license: "ORIGINAL",
        tags: [],
        media: [],
      },
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = questionSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await adminAction({
        action: "saveQuestion",
        questionId: id,
        question: data,
      });
      toast.success(
        "Question saved as a draft. Submit it for review when ready.",
      );
      router.push(`/admin/questions/${r.id}/edit`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-5">
            <label className="field">
              Question text
              <Textarea
                rows={5}
                value={data.text}
                onChange={(e) => setData({ ...data, text: e.target.value })}
                required
              />
              <span className="text-xs text-muted-foreground font-normal">
                Plain text with $inline math$ or $$display math$$. HTML is
                displayed as text.
              </span>
            </label>
            <fieldset className="space-y-3">
              <legend className="font-medium text-sm mb-3">
                Four answer options · select the correct answer
              </legend>
              {data.options.map((o, i) => (
                <label className="flex gap-3 items-center" key={i}>
                  <input
                    type="radio"
                    name="correct"
                    checked={data.correctOption === i}
                    onChange={() => setData({ ...data, correctOption: i })}
                    aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
                  />
                  <Input
                    aria-label={`Option ${String.fromCharCode(65 + i)}`}
                    value={o}
                    onChange={(e) =>
                      setData({
                        ...data,
                        options: data.options.map((x, j) =>
                          i === j ? e.target.value : x,
                        ),
                      })
                    }
                    required
                  />
                </label>
              ))}
            </fieldset>
            <label className="field">
              Educational explanation
              <Textarea
                value={data.explanation}
                rows={4}
                onChange={(e) =>
                  setData({ ...data, explanation: e.target.value })
                }
                required
              />
            </label>
            <label className="field">
              Chapter
              <Select
                aria-label="Chapter"
                value={data.chapterId}
                onChange={(e) =>
                  setData({
                    ...data,
                    chapterId: e.target.value,
                    topicIds: [],
                    prerequisiteIds: [],
                  })
                }
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </label>
            <fieldset>
              <legend className="text-sm font-medium mb-3">
                Primary topics in this chapter
              </legend>
              <div className="grid sm:grid-cols-2 gap-3">
                {topics
                  .filter((t) => t.chapterId === data.chapterId)
                  .map((t) => (
                    <label
                      key={t.id}
                      className="flex gap-2 items-center text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={data.topicIds.includes(t.id)}
                        onChange={(e) =>
                          setData({
                            ...data,
                            topicIds: e.target.checked
                              ? [...data.topicIds, t.id]
                              : data.topicIds.filter((x) => x !== t.id),
                          })
                        }
                      />
                      {t.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium mb-3">
                Required prerequisite topics
              </legend>
              <div className="max-h-48 overflow-auto grid sm:grid-cols-2 gap-3 rounded-xl bg-background p-3">
                {topics
                  .filter((t) => !data.topicIds.includes(t.id))
                  .map((t) => (
                    <label
                      key={t.id}
                      className="flex gap-2 items-center text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={data.prerequisiteIds.includes(t.id)}
                        onChange={(e) =>
                          setData({
                            ...data,
                            prerequisiteIds: e.target.checked
                              ? [...data.prerequisiteIds, t.id]
                              : data.prerequisiteIds.filter((x) => x !== t.id),
                          })
                        }
                      />
                      {t.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="field">
                Difficulty
                <Select
                  value={data.difficulty}
                  onChange={(e) =>
                    setData({
                      ...data,
                      difficulty: e.target.value as Question["difficulty"],
                    })
                  }
                >
                  {["EASY", "MEDIUM", "HARD"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </label>
              <label className="field">
                Language
                <Select
                  value={data.language}
                  onChange={(e) =>
                    setData({
                      ...data,
                      language: e.target.value as "en" | "hi",
                    })
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </Select>
              </label>
              <label className="field">
                Source
                <Input
                  value={data.source}
                  onChange={(e) => setData({ ...data, source: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                Rights status
                <Select
                  value={data.license}
                  onChange={(e) =>
                    setData({
                      ...data,
                      license: e.target.value as Question["license"],
                    })
                  }
                >
                  {["ORIGINAL", "LICENSED", "PUBLIC_DOMAIN"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="field">
              Tags (comma separated)
              <Input
                value={data.tags.join(", ")}
                onChange={(e) =>
                  setData({
                    ...data,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Optional diagram URL (HTTPS)
                <Input
                  type="url"
                  value={data.media[0]?.url ?? ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      media: e.target.value
                        ? [
                            {
                              url: e.target.value,
                              alt: data.media[0]?.alt ?? "",
                            },
                          ]
                        : [],
                    })
                  }
                />
              </label>
              <label className="field">
                Diagram alternative text
                <Input
                  value={data.media[0]?.alt ?? ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      media: data.media.length
                        ? [{ ...data.media[0], alt: e.target.value }]
                        : [],
                    })
                  }
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Edits create a new version and reset publication to draft.
              Historical attempts retain their question snapshot.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button disabled={busy}>
                {busy ? "Saving…" : "Save question draft"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview(!preview)}
              >
                Toggle preview
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className={preview ? "h-fit" : "hidden xl:block h-fit"}>
        <CardHeader>
          <CardTitle>Student preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ScienceText text={data.text || "Your question will appear here."} />
          {data.media.map((m) => (
            <QuestionImage
              key={m.url}
              src={m.url}
              alt={m.alt}
              className="max-h-64 max-w-full my-4"
              referrerPolicy="no-referrer"
            />
          ))}
          <div className="mt-5 space-y-3">
            {data.options.map((o, i) => (
              <div key={i} className="rounded-xl border p-3 text-sm">
                <strong className="mr-2">{String.fromCharCode(65 + i)}.</strong>
                <ScienceText text={o || "Answer option"} />
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-secondary p-4 text-sm">
            <p className="font-semibold text-xs mb-2">
              Explanation · Answer{" "}
              {String.fromCharCode(65 + data.correctOption)}
            </p>
            <ScienceText
              text={
                data.explanation ||
                "Your explanation will appear after submission."
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
