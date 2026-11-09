"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, CalendarPlus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea, Select } from "@/components/ui/input";
export async function learningAction(data: unknown) {
  const r = await fetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    j = await r.json();
  if (!r.ok) throw new Error(j.error);
}
export function LearningControls({
  testId,
  testQuestionId,
  topics,
  bookmarked = false,
}: {
  testId: string;
  testQuestionId: string;
  topics: { id: string; name: string }[];
  bookmarked?: boolean;
}) {
  const [saved, setSaved] = useState(bookmarked),
    [report, setReport] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(data: unknown, success: string) {
    setBusy(true);
    try {
      await learningAction(data);
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (
              await run(
                { action: "bookmark", testId, testQuestionId, enabled: !saved },
                saved ? "Bookmark removed" : "Question bookmarked",
              )
            )
              setSaved(!saved);
          }}
        >
          <Bookmark />
          {saved ? "Bookmarked" : "Bookmark"}
        </Button>
        {topics.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                { action: "revise", topicId: t.id },
                "Topic added to your revision plan",
              )
            }
          >
            <CalendarPlus />
            Revise {t.name}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => setReport(true)}
        >
          <Flag />
          Report a problem
        </Button>
      </div>
      <Dialog open={report} onOpenChange={setReport}>
        <DialogContent>
          <DialogTitle className="text-lg font-bold">
            Help us improve this question
          </DialogTitle>
          <DialogDescription className="my-3 text-sm text-muted-foreground">
            Explain the issue with the question, answer, or explanation. A
            content reviewer will check it.
          </DialogDescription>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Describe the question issue"
            maxLength={2000}
          />
          <Button
            className="mt-4"
            disabled={busy || message.trim().length < 10}
            onClick={async () => {
              if (
                await run(
                  { action: "report", testId, testQuestionId, message },
                  "Report sent for content review",
                )
              ) {
                setReport(false);
                setMessage("");
              }
            }}
          >
            Submit report
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function RevisionControls({ taskId }: { taskId: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  async function review(remembered: boolean) {
    setBusy(true);
    try {
      await learningAction({ action: "review", taskId, remembered });
      toast.success("Revision plan updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => review(false)}
      >
        Needs another look
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => review(true)}
      >
        I recalled the concept
      </Button>
    </div>
  );
}
export function MistakeControls({
  id,
  category,
  reviewed,
}: {
  id: string;
  category: string;
  reviewed: boolean;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  async function update(data: { category: string; reviewed: boolean }) {
    setBusy(true);
    try {
      await learningAction({ action: "mistake", mistakeId: id, ...data });
      toast.success("Mistake updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      <label className="text-xs text-muted-foreground flex items-center gap-2">
        What happened?
        <Select
          className="w-48 h-9"
          aria-label="Mistake category"
          value={category}
          disabled={busy}
          onChange={(e) => update({ category: e.target.value, reviewed })}
        >
          {[
            ["UNCATEGORIZED", "Choose a category"],
            ["CONCEPT", "Concept not understood"],
            ["FORGOTTEN", "Forgotten information"],
            ["CALCULATION", "Calculation error"],
            ["MISREAD", "Misread question"],
            ["GUESSING", "Guessing"],
            ["TIME_PRESSURE", "Time pressure"],
            ["OTHER", "Other"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => update({ category, reviewed: !reviewed })}
      >
        {reviewed ? "Mark unreviewed" : "Mark reviewed"}
      </Button>
    </div>
  );
}
