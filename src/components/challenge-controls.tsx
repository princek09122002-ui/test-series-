"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
export async function challengeAction(data: unknown) {
  const r = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
}
export function JoinChallenge({
  id,
  inviteCode,
}: {
  id: string;
  inviteCode?: string;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const j = await challengeAction({ action: "join", id, inviteCode });
          router.push(`/tests/${j.testId}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Unable to join");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Starting…" : "Join & start challenge →"}
    </Button>
  );
}
export function ChallengeForm({
  tests,
}: {
  tests: { id: string; name: string }[];
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        setError("");
        try {
          await challengeAction({
            action: "create",
            name: values.name,
            description: values.description,
            sourceTestId: values.sourceTestId,
            startsAt: new Date(String(values.startsAt)).toISOString(),
            endsAt: new Date(String(values.endsAt)).toISOString(),
            public: values.audience === "public",
          });
          toast.success("Standardized challenge published");
          router.refresh();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Unable to create challenge",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Challenge name
        <Input name="name" required minLength={3} />
      </label>
      <label className="field">
        Description & eligibility
        <Textarea name="description" required minLength={10} />
      </label>
      <label className="field">
        Source NEET-style test
        <Select name="sourceTestId" required>
          <option value="">Select one of your timed NEET-style tests</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Starts (your device’s local time)
          <Input type="datetime-local" name="startsAt" required />
        </label>
        <label className="field">
          Closes (your device’s local time)
          <Input type="datetime-local" name="endsAt" required />
        </label>
      </div>
      <label className="field">
        Audience
        <Select name="audience">
          <option value="public">All registered students</option>
          <option value="private">Private invitation link</option>
        </Select>
      </label>
      <p className="text-xs text-muted-foreground">
        The paper is copied and frozen for this challenge. All students receive
        identical questions, order, duration, and scoring. Late starts are
        blocked when less than the full duration remains. Results release after
        closing.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button disabled={busy || !tests.length}>
        {busy ? "Creating…" : "Create standardized challenge"}
      </Button>
    </form>
  );
}
