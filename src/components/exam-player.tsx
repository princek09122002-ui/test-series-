"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCheck,
  Clock3,
  CloudOff,
  GraduationCap,
  Grid2X2,
  LoaderCircle,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScienceText } from "@/components/science-text";
import { QuestionContent } from "@/components/question-content";
import { QuestionImage } from "@/components/question-image";
import { cn, secondsLabel } from "@/lib/utils";
import type { studentAttempt } from "@/lib/services/testing";
type Attempt = Awaited<ReturnType<typeof studentAttempt>>;
type Answer = {
  selectedOption: number | null;
  marked: boolean;
  visited: boolean;
  revision: number;
};
type Change = { selectedOption: number | null; marked: boolean };
export function ExamPlayer({ initial }: { initial: Attempt }) {
  const router = useRouter(),
    [index, setIndex] = useState(0),
    [palette, setPalette] = useState(false),
    [confirm, setConfirm] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [saveState, setSaveState] = useState("All changes saved"),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState<{
      id: string;
      correctOption: number;
      explanation: string;
    } | null>(null),
    [seconds, setSeconds] = useState<number | null>(
      initial.deadline
        ? Math.max(
            0,
            Math.ceil(
              (Date.parse(initial.deadline) - Date.parse(initial.serverNow)) /
                1000,
            ),
          )
        : null,
    );
  const first = Object.fromEntries(
    initial.questions.map((q) => {
      const r = initial.responses.find(
        (r) => r.testQuestionId === q.testQuestionId,
      );
      return [
        q.testQuestionId,
        {
          selectedOption: r?.selectedOption ?? null,
          marked: r?.marked ?? false,
          visited: r?.visited ?? false,
          revision: r?.revision ?? 0,
        },
      ];
    }),
  );
  const [answers, setAnswers] = useState<Record<string, Answer>>(first),
    latest = useRef(first),
    pending = useRef(new Map<string, Change>()),
    flushing = useRef(false),
    indexRef = useRef(0),
    ended = useRef(false),
    mounted = useRef(false),
    eventQueue = useRef(Promise.resolve()),
    lastActive = useRef(0),
    isActive = useRef(false),
    submitRef = useRef<(automatic?: boolean) => Promise<void>>(async () => {});
  const storageKey = `neet-attempt:${initial.id}`;
  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify([...pending.current]));
    } catch {
      setError(
        "Device storage is unavailable. Keep this tab open until every answer has synced.",
      );
    }
  }, [storageKey]);
  const flush = useCallback(async () => {
    if (flushing.current) return false;
    flushing.current = true;
    try {
      while (pending.current.size && !ended.current) {
        const [id, change] = pending.current.entries().next().value!;
        const revision = latest.current[id].revision + 1;
        setSaveState("Saving your answer…");
        const r = await fetch(`/api/tests/${initial.testId}/answers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testQuestionId: id, ...change, revision }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (data.conflict)
          throw new Error(
            "Answers changed in another tab. Refresh to load the latest responses.",
          );
        latest.current = {
          ...latest.current,
          [id]: { ...latest.current[id], revision: data.revision },
        };
        setAnswers({ ...latest.current });
        if (pending.current.get(id) === change) pending.current.delete(id);
        if (data.feedback && !pending.current.has(id))
          setFeedback({ id, ...data.feedback });
        persist();
      }
      setSaveState(
        pending.current.size ? "Answers waiting to sync" : "All changes saved",
      );
      setError("");
      return !pending.current.size;
    } catch (e) {
      setSaveState("Not synced — retrying");
      setError(
        e instanceof Error
          ? e.message
          : "Connection lost. Keep this tab open; your changes are saved on this device.",
      );
      return false;
    } finally {
      flushing.current = false;
    }
  }, [initial.testId, persist]);
  const sendEvent = useCallback(
    (type: string, id?: string, activeMs = 0) => {
      if (ended.current) return;
      eventQueue.current = eventQueue.current
        .then(async () => {
          await fetch(`/api/tests/${initial.testId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              type,
              testQuestionId: id,
              activeMs: Math.min(15000, Math.max(0, Math.round(activeMs))),
            }),
            keepalive: true,
          });
        })
        .catch(() => {});
    },
    [initial.testId],
  );
  const flushTime = useCallback(
    (type = "HEARTBEAT") => {
      const now = performance.now(),
        elapsed = isActive.current ? now - lastActive.current : 0;
      lastActive.current = now;
      sendEvent(
        type,
        initial.questions[indexRef.current].testQuestionId,
        elapsed,
      );
    },
    [initial.questions, sendEvent],
  );
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    lastActive.current = performance.now();
    isActive.current =
      document.visibilityState === "visible" && document.hasFocus();
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]") as [
        string,
        Change,
      ][];
      for (const [id, c] of stored)
        if (
          latest.current[id] &&
          (c.selectedOption === null ||
            (Number.isInteger(c.selectedOption) &&
              c.selectedOption >= 0 &&
              c.selectedOption <= 3)) &&
          typeof c.marked === "boolean"
        ) {
          pending.current.set(id, c);
          latest.current[id] = { ...latest.current[id], ...c };
        }
      setAnswers({ ...latest.current });
    } catch {
      sessionStorage.removeItem(storageKey);
    }
    sendEvent("VISIT", initial.questions[0].testQuestionId);
    latest.current[initial.questions[0].testQuestionId].visited = true;
    void flush();
  }, [flush, initial.questions, sendEvent, storageKey]);
  useEffect(() => {
    const updateVisibility = () => {
      flushTime(
        document.visibilityState === "visible" && document.hasFocus()
          ? "VISIBLE"
          : "HIDDEN",
      );
      isActive.current =
        document.visibilityState === "visible" && document.hasFocus();
      lastActive.current = performance.now();
    };
    const online = () => {
      sendEvent("ONLINE");
      setError("");
      void flush();
    };
    const offline = () => {
      flushTime("OFFLINE");
      setSaveState("Offline — answers saved on this device");
    };
    const unload = (e: BeforeUnloadEvent) => {
      flushTime("HIDDEN");
      if (pending.current.size) {
        e.preventDefault();
      }
    };
    const interval = setInterval(() => {
      flushTime();
      if (pending.current.size && !flushing.current) void flush();
    }, 5000);
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("focus", updateVisibility);
    window.addEventListener("blur", updateVisibility);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeunload", unload);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("focus", updateVisibility);
      window.removeEventListener("blur", updateVisibility);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeunload", unload);
    };
  }, [flush, flushTime, sendEvent]);
  useEffect(() => {
    if (!initial.deadline) return;
    const offset = Date.parse(initial.serverNow) - Date.now(),
      deadline = Date.parse(initial.deadline);
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((deadline - Date.now() - offset) / 1000),
      );
      setSeconds(left);
      if (left === 0 && !ended.current) void submitRef.current(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [initial.deadline, initial.serverNow]);
  async function submit(automatic = false) {
    if (submitting || ended.current) return;
    setSubmitting(true);
    setError("");
    try {
      if (!automatic) {
        if (flushing.current) {
          setError("Please wait for your answers to finish saving.");
          return;
        }
        if (!(await flush())) {
          setError("Please reconnect and sync your answers before submitting.");
          return;
        }
        flushTime();
        await eventQueue.current;
      }
      const r = await fetch(`/api/tests/${initial.testId}/submit`, {
          method: "POST",
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      ended.current = true;
      sessionStorage.removeItem(storageKey);
      router.replace(`/tests/${initial.testId}/result`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not submit. Please reconnect and retry.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  useEffect(() => {
    submitRef.current = submit;
  });
  const question = initial.questions[index],
    answer = answers[question.testQuestionId],
    answered = Object.values(answers).filter(
      (a) => a.selectedOption !== null,
    ).length,
    marked = Object.values(answers).filter((a) => a.marked).length;
  function update(change: Partial<Change>) {
    if (seconds === 0 || submitting) return;
    const id = question.testQuestionId;
    latest.current = {
      ...latest.current,
      [id]: { ...latest.current[id], ...change, visited: true },
    };
    setAnswers({ ...latest.current });
    pending.current.set(id, {
      selectedOption: latest.current[id].selectedOption,
      marked: latest.current[id].marked,
    });
    persist();
    setFeedback(null);
    setError("");
    void flush();
  }
  function navigate(next: number) {
    if (next < 0 || next >= initial.questions.length) return;
    flushTime(
      answers[question.testQuestionId].selectedOption === null
        ? "SKIP"
        : "HEARTBEAT",
    );
    indexRef.current = next;
    setIndex(next);
    setPalette(false);
    const id = initial.questions[next].testQuestionId;
    latest.current = {
      ...latest.current,
      [id]: { ...latest.current[id], visited: true },
    };
    setAnswers({ ...latest.current });
    sendEvent("VISIT", id);
    lastActive.current = performance.now();
  }
  const feedbackForQuestion =
    feedback?.id === question.testQuestionId ? feedback : null;
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b bg-card px-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="logo-mark hidden sm:flex">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <h1 className="font-semibold text-sm sm:text-base">
              {initial.name}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              {initial.mode === "NEET"
                ? "NEET-style practice · +4 / −1"
                : initial.mode === "TIMED"
                  ? "Timed practice · +4 / 0"
                  : "Learning mode · +4 / 0"}
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div
            role="timer"
            aria-label="Time remaining"
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-lg",
              seconds !== null && seconds < 60 ? "text-destructive" : "",
            )}
          >
            <Clock3 className="size-4" />
            {seconds === null ? "Untimed" : secondsLabel(seconds)}
          </div>
          <Button
            className="hidden sm:flex"
            disabled={submitting}
            onClick={() => setConfirm(true)}
          >
            <Send />
            Submit test
          </Button>
          <Button
            className="lg:hidden"
            variant="outline"
            size="icon"
            aria-label="Question navigator"
            onClick={() => setPalette(!palette)}
          >
            <Grid2X2 />
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1450px] gap-6 p-4 md:p-8 lg:grid-cols-[1fr_290px]">
        <main className="min-w-0">
          <div className="flex justify-between text-xs text-muted-foreground mb-4 gap-3">
            <span>
              {question.subject} <span className="mx-2">/</span>{" "}
              {question.chapter}
            </span>
            <span className="shrink-0">
              {index + 1} of {initial.questions.length}
            </span>
          </div>
          <section className="rounded-2xl border bg-card p-5 md:p-9">
            <div className="flex justify-between gap-3 items-center mb-7">
              <h2 className="font-semibold text-primary text-sm">
                Question {index + 1}
              </h2>
              <span className="text-xs text-muted-foreground">
                {answer.marked ? "Marked for review" : "Single correct answer"}
              </span>
            </div>
            <div className="text-base md:text-lg">
              {question.structuredContent ? <QuestionContent blocks={question.structuredContent.stem}/> : <ScienceText text={question.text} />}
            </div>
            {(question.structuredContent ? [] : question.media).map((m) => (
              <div key={m.url} className="my-5">
                <QuestionImage
                  src={m.url}
                  alt={m.alt}
                  referrerPolicy="no-referrer"
                  className="h-auto w-full max-w-full rounded-xl"
                />
              </div>
            ))}
            <fieldset className="mt-8 space-y-3">
              <legend className="sr-only">Select one answer</legend>
              {question.options.map((option, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 md:p-5 transition-colors cursor-pointer",
                    answer.selectedOption === i
                      ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                      : "hover:bg-background",
                    seconds === 0 ? "pointer-events-none opacity-70" : "",
                  )}
                >
                  <input
                    type="radio"
                    name={`answer-${question.testQuestionId}`}
                    className="mt-2 shrink-0"
                    value={i}
                    checked={answer.selectedOption === i}
                    disabled={seconds === 0 || submitting}
                    onChange={() => update({ selectedOption: i })}
                  />
                  <span
                    className={cn(
                      "size-8 shrink-0 rounded-lg border flex items-center justify-center text-xs font-semibold",
                      answer.selectedOption === i
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="pt-1 min-w-0">
                    {question.structuredContent?.options[i] ? <QuestionContent blocks={question.structuredContent.options[i].content}/> : <ScienceText text={option} />}
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap justify-between gap-3 border-t mt-8 pt-5">
              <Button
                variant={answer.marked ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  update({ marked: !answer.marked });
                  sendEvent("REVIEW", question.testQuestionId);
                }}
              >
                <Bookmark />
                {answer.marked ? "Unmark review" : "Mark for review"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update({ selectedOption: null })}
              >
                <RotateCcw />
                Clear response
              </Button>
            </div>
            {feedbackForQuestion && (
              <div className="mt-6 rounded-xl bg-secondary p-5">
                <h3 className="text-sm font-semibold mb-2">
                  {answer.selectedOption === feedbackForQuestion.correctOption
                    ? "That’s correct"
                    : "Let’s understand this"}{" "}
                  · Answer{" "}
                  {String.fromCharCode(65 + feedbackForQuestion.correctOption)}
                </h3>
                <ScienceText text={feedbackForQuestion.explanation} />
              </div>
            )}
          </section>
          <div className="mt-6 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => navigate(index - 1)}
            >
              <ArrowLeft />
              Previous
            </Button>
            <div
              className="hidden sm:flex gap-2 items-center text-xs text-muted-foreground"
              role="status"
            >
              {saveState.includes("saved") ? (
                <CheckCheck className="size-4 text-emerald-600" />
              ) : saveState.startsWith("Saving") ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CloudOff className="size-4 text-amber-600" />
              )}
              {saveState}
            </div>
            {index < initial.questions.length - 1 ? (
              <Button onClick={() => navigate(index + 1)}>
                Save & next
                <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => setConfirm(true)}>
                Review & submit
                <Check />
              </Button>
            )}
          </div>
          <p
            className="sm:hidden mt-4 text-center text-xs text-muted-foreground"
            role="status"
          >
            {saveState}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-destructive/7 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            Your answers save automatically. Timed sessions continue through
            refreshes and disconnections.{" "}
            <Link href="/tests" className="text-primary">
              Return to my tests
            </Link>
          </p>
        </main>
        <aside
          className={cn(
            "rounded-2xl border bg-card p-5 h-fit lg:sticky lg:top-28",
            palette ? "block" : "hidden lg:block",
          )}
        >
          <h2 className="font-semibold text-sm mb-2">Question navigator</h2>
          <p className="text-xs text-muted-foreground">
            {answered} answered · {initial.questions.length - answered}{" "}
            remaining
          </p>
          <div className="my-5 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${(answered / initial.questions.length) * 100}%`,
              }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {initial.questions.map((q, i) => {
              const a = answers[q.testQuestionId];
              return (
                <button
                  key={q.testQuestionId}
                  aria-label={`Question ${i + 1}${a.selectedOption !== null ? ", answered" : a.visited ? ", unanswered" : ", not visited"}${a.marked ? ", marked for review" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => navigate(i)}
                  className={cn(
                    "relative h-10 rounded-lg border text-xs font-semibold",
                    a.marked
                      ? "border-violet-300 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"
                      : a.selectedOption !== null
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                        : a.visited
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
                          : "bg-secondary text-muted-foreground",
                    i === index
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                      : "",
                  )}
                >
                  {i + 1}
                  {a.marked && a.selectedOption !== null && (
                    <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-500 border border-card" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-6 border-t pt-5 space-y-3 text-[11px] text-muted-foreground">
            {[
              ["bg-emerald-500", "Answered"],
              ["bg-amber-400", "Visited, unanswered"],
              ["bg-violet-400", "Marked for review"],
              ["bg-slate-300", "Not visited"],
            ].map(([color, label]) => (
              <div key={label} className="flex gap-2 items-center">
                <span className={`size-2 rounded-sm ${color}`} />
                {label}
              </div>
            ))}
            <p className="text-[10px]">
              Green dot on purple = answered & marked.
            </p>
          </div>
          <Button
            className="w-full mt-6"
            onClick={() => setConfirm(true)}
            disabled={submitting}
          >
            Submit test
            <Send />
          </Button>
        </aside>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle className="text-xl font-bold">
            Ready to finish?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-3">
            You’ve answered {answered} of {initial.questions.length} questions.{" "}
            {marked} marked for review. Your final score will be calculated on
            the server.
          </DialogDescription>
          <div className="my-6 grid grid-cols-3 gap-3 text-center">
            {[
              [answered, "Answered"],
              [initial.questions.length - answered, "Unanswered"],
              [marked, "For review"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl bg-secondary p-3">
                <strong className="block text-xl">{n}</strong>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Keep working
            </Button>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting ? "Submitting…" : "Submit test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
