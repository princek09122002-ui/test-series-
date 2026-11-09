"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { z } from "zod";
import type { profileSchema } from "@/lib/domain/validation";
type Profile = z.infer<typeof profileSchema>;
export function ProfileForm({
  initial,
  onboarding = false,
}: {
  initial: Profile;
  onboarding?: boolean;
}) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(false),
    router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.error);
      toast.success("Your preferences are saved");
      if (onboarding) router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="field">
          Your name
          <Input
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            minLength={2}
            maxLength={70}
            required
          />
        </label>
        <label className="field">
          Preparation stage
          <Select
            value={data.stage}
            onChange={(e) =>
              setData({ ...data, stage: e.target.value as Profile["stage"] })
            }
          >
            <option value="CLASS_11">Class 11</option>
            <option value="CLASS_12">Class 12</option>
            <option value="REPEATER">NEET repeater</option>
          </Select>
        </label>
        <label className="field">
          Exam year
          <Input
            type="number"
            min={2026}
            max={2040}
            value={data.examYear}
            onChange={(e) =>
              setData({ ...data, examYear: Number(e.target.value) })
            }
          />
        </label>
        <label className="field">
          Question language
          <Select
            value={data.language}
            onChange={(e) =>
              setData({ ...data, language: e.target.value as "en" | "hi" })
            }
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </Select>
          <span className="text-xs text-muted-foreground font-normal">
            Tests require published questions in this language.
          </span>
        </label>
        <label className="field">
          Daily practice goal (questions)
          <Input
            type="number"
            min={1}
            max={180}
            value={data.dailyGoal}
            onChange={(e) =>
              setData({ ...data, dailyGoal: Number(e.target.value) })
            }
          />
        </label>
        <label className="field">
          Display timezone
          <Select
            value={data.timezone}
            onChange={(e) => setData({ ...data, timezone: e.target.value })}
          >
            {[
              "Asia/Kolkata",
              "UTC",
              "Asia/Dubai",
              "Europe/London",
              "America/New_York",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium mb-3">
          Subjects you’re studying
        </legend>
        <div className="flex flex-wrap gap-5">
          {["Physics", "Chemistry", "Biology"].map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data.subjects.includes(
                  s as Profile["subjects"][number],
                )}
                onChange={(e) =>
                  setData({
                    ...data,
                    subjects: e.target.checked
                      ? [...data.subjects, s as Profile["subjects"][number]]
                      : data.subjects.filter((x) => x !== s),
                  })
                }
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      {!onboarding && (
        <>
          <div className="border-t pt-6">
            <h2 className="font-semibold mb-2">Your privacy</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Results are private. Challenge leaderboards show only an optional
              alias, and only after a challenge closes.
            </p>
            <label className="field max-w-md">
              Anonymous display name
              <Input
                value={data.displayName}
                maxLength={40}
                onChange={(e) =>
                  setData({ ...data, displayName: e.target.value })
                }
                placeholder="e.g. CuriousLearner"
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={data.leaderboard}
                onChange={(e) =>
                  setData({ ...data, leaderboard: e.target.checked })
                }
              />
              Include my alias on eligible challenge leaderboards
            </label>
          </div>
        </>
      )}
      <Button type="submit" disabled={busy}>
        {busy
          ? "Saving…"
          : onboarding
            ? "Let’s get started"
            : "Save preferences"}
      </Button>
    </form>
  );
}
export function RevokeSessions() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/sessions", { method: "DELETE" });
        if (r.ok) await signOut({ callbackUrl: "/login" });
        else {
          toast.error("Unable to revoke sessions");
          setBusy(false);
        }
      }}
    >
      Sign out on every device
    </Button>
  );
}
