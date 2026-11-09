"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function PyqBuilder({
  papers,
}: {
  papers: { id: string; name: string; count: number }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const r = await fetch("/api/pyq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paper: f.get("paper"),
              subject: f.get("subject"),
              count: Number(f.get("count")),
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          router.push("/tests/" + data.testId);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not create test");
          setBusy(false);
        }
      }}
    >
      <label className="block">
        Paper
        <select
          name="paper"
          className="block w-full rounded border bg-card p-3 mt-2"
        >
          {papers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.count} available)
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Subject
        <select
          name="subject"
          className="block w-full rounded border bg-card p-3 mt-2"
        >
          {["All", "Biology", "Chemistry", "Physics"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Questions
        <input
          name="count"
          type="number"
          min="1"
          max="180"
          defaultValue="10"
          required
          className="block w-full rounded border bg-card p-3 mt-2"
        />
      </label>
      <p className="text-sm text-muted-foreground">
        One minute per question. +4 correct, −1 incorrect. Answers unlock after
        submission.
      </p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <Button disabled={busy || !papers.length}>
        {busy ? "Creating test…" : "Start PYQ practice"}
      </Button>
    </form>
  );
}
