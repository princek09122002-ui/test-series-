"use client";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { SyllabusData } from "@/lib/services/syllabus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { percent } from "@/lib/utils";
export function SyllabusTracker({ initial }: { initial: SyllabusData }) {
  const [syllabus, setSyllabus] = useState(initial),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState<string | null>(null);
  const chapters = syllabus.subjects.flatMap((s) =>
      s.chapters.map((c) => ({ ...c, subject: s.name })),
    ),
    topics = chapters.flatMap((c) => c.topics),
    done = topics.filter((t) =>
      ["COMPLETED", "REVISING"].includes(t.status),
    ).length;
  async function update(topicId: string, status: string) {
    setBusy(topicId);
    try {
      const r = await fetch("/api/progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, status }),
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSyllabus({
        ...syllabus,
        subjects: syllabus.subjects.map((s) => ({
          ...s,
          chapters: s.chapters.map((c) => ({
            ...c,
            topics: c.topics.map((t) =>
              t.id === topicId
                ? { ...t, status: status as typeof t.status }
                : t,
            ),
          })),
        })),
      });
      toast.success("Progress updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update");
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <Card className="p-6 mb-6">
        <div className="flex justify-between gap-3 items-center">
          <div>
            <h2 className="font-semibold">
              Your declared preparation progress
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {done} of {topics.length} active topics completed or revising
            </p>
          </div>
          <strong className="text-2xl text-primary">
            {percent(done, topics.length)}%
          </strong>
        </div>
        <Progress className="mt-5" value={percent(done, topics.length)} />
        <p className="text-xs text-muted-foreground mt-4">
          Completion is your own declaration. Measured understanding comes from
          assessment evidence.
          {syllabus.demo
            ? " This illustrative syllabus does not represent full official NEET coverage."
            : ""}
        </p>
      </Card>
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Find a chapter or topic…"
          aria-label="Search preparation tracker"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="w-44"
          aria-label="Filter preparation class"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Both classes</option>
          <option value="11">Class 11</option>
          <option value="12">Class 12</option>
        </Select>
      </div>
      <div className="space-y-5">
        {syllabus.subjects.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="divide-y">
                {s.chapters
                  .filter(
                    (c) =>
                      (filter === "all" || c.classLevel === Number(filter)) &&
                      (!search ||
                        `${c.name} ${c.topics.map((t) => t.name).join(" ")}`
                          .toLowerCase()
                          .includes(search.toLowerCase())),
                  )
                  .map((c) => (
                    <AccordionItem key={c.id} value={c.id}>
                      <AccordionTrigger>
                        <div>
                          {c.name}
                          <span className="block text-xs font-normal text-muted-foreground mt-1">
                            Class {c.classLevel} ·{" "}
                            {
                              c.topics.filter((t) =>
                                ["COMPLETED", "REVISING"].includes(t.status),
                              ).length
                            }
                            /{c.topics.length} topics complete
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {c.topics.map((t) => (
                            <div
                              key={t.id}
                              className="flex flex-wrap gap-3 items-center rounded-xl bg-background p-3"
                            >
                              <div className="flex-1 min-w-32">
                                <p className="text-sm font-medium">{t.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {t.questionCount} question mappings ·
                                  availability depends on constraints
                                </p>
                              </div>
                              <Select
                                className="w-40 h-9 text-xs"
                                value={t.status}
                                disabled={busy === t.id}
                                aria-label={`${t.name} progress`}
                                onChange={(e) => update(t.id, e.target.value)}
                              >
                                {[
                                  ["NOT_STARTED", "Not started"],
                                  ["LEARNING", "Learning"],
                                  ["COMPLETED", "Completed"],
                                  ["REVISING", "Revising"],
                                ].map(([v, l]) => (
                                  <option key={v} value={v}>
                                    {l}
                                  </option>
                                ))}
                              </Select>
                              <Link
                                className="text-xs text-primary px-2"
                                href={`/tests/create?topic=${t.id}`}
                              >
                                Practice →
                              </Link>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
