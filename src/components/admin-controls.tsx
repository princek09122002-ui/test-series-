"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
export async function adminAction(data: unknown) {
  const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
}
export function AdminAction({
  data,
  label,
  variant = "outline",
}: {
  data: Record<string, unknown>;
  label: string;
  variant?: "default" | "outline" | "destructive";
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await adminAction(data);
          toast.success("Changes saved");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Unable to save");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Saving…" : label}
    </Button>
  );
}
export function AdminForm({
  action,
  fields,
  hidden = {},
  label = "Save",
}: {
  action: string;
  fields: {
    name: string;
    label: string;
    type?: string;
    options?: { value: string; label: string }[];
    value?: string;
  }[];
  hidden?: Record<string, unknown>;
  label?: string;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = e.currentTarget,
          values = Object.fromEntries(new FormData(form));
        for (const field of fields)
          if (field.type === "number")
            values[field.name] = Number(
              values[field.name],
            ) as unknown as string;
        try {
          await adminAction({ action, ...hidden, ...values });
          toast.success("Saved successfully");
          form.reset();
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save");
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <label key={f.name} className="field">
          {f.label}
          {f.options ? (
            <Select name={f.name} defaultValue={f.value} required>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : f.type === "textarea" ? (
            <Textarea name={f.name} defaultValue={f.value} required />
          ) : (
            <Input
              name={f.name}
              type={f.type ?? "text"}
              defaultValue={f.value}
              required
            />
          )}
        </label>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button size="sm" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
    </form>
  );
}
export function UserControls({
  id,
  role,
  disabled,
}: {
  id: string;
  role: string;
  disabled: boolean;
}) {
  const [value, setValue] = useState(role),
    [off, setOff] = useState(disabled);
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select
        className="h-9 w-28 text-xs"
        aria-label="Account role"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {["STUDENT", "EDITOR", "ADMIN"].map((r) => (
          <option key={r}>{r}</option>
        ))}
      </Select>
      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          checked={off}
          onChange={(e) => setOff(e.target.checked)}
        />
        Disabled
      </label>
      <AdminAction
        label="Apply"
        data={{ action: "updateUser", id, role: value, disabled: off }}
      />
    </div>
  );
}
export function BulkImport() {
  const router = useRouter(),
    [data, setData] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Import an array of up to 100 questions. All are saved as drafts and must
        be reviewed before publication. Use the template in
        docs/question-import.example.json.
      </p>
      <label className="field">
        JSON file
        <Input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 900000) {
                setError("Use a file smaller than 900 KB");
                return;
              }
              setData(await file.text());
              setError("");
            }
          }}
        />
      </label>
      <Textarea
        aria-label="Question import JSON"
        value={data}
        onChange={(e) => setData(e.target.value)}
        placeholder="Paste a JSON array of questions"
        rows={6}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        size="sm"
        disabled={busy || !data}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const questions = JSON.parse(data);
            await adminAction({ action: "importQuestions", questions });
            toast.success("Questions imported as drafts");
            setData("");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Import failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        Validate & import drafts
      </Button>
    </div>
  );
}
export function JsonAdminForm({
  action,
  initial,
  label,
}: {
  action: string;
  initial: unknown;
  label: string;
}) {
  const router = useRouter(),
    [text, setText] = useState(JSON.stringify(initial, null, 2)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <Textarea
        aria-label={label}
        className="font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await adminAction({ action, ...JSON.parse(text) });
            toast.success("Configuration saved");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to save");
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
    </div>
  );
}
