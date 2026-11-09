"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AuthForm({
  mode,
  google = false,
  token = "",
}: {
  mode: "login" | "signup" | "forgot" | "reset";
  google?: boolean;
  token?: string;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const titles = {
    login: "Welcome back",
    signup: "Your next chapter starts here",
    forgot: "Let’s get you back in",
    reset: "Choose a new password",
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "signup") {
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
      }
      if (mode === "login" || mode === "signup") {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });
        if (result?.error)
          throw new Error(
            "Unable to sign in. Check your credentials or try again later.",
          );
        router.push(mode === "signup" ? "/onboarding" : "/dashboard");
        router.refresh();
      } else {
        const r = await fetch("/api/password", {
          method: mode === "forgot" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "forgot" ? data : { ...data, token }),
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        setMessage(
          mode === "forgot"
            ? json.message
            : "Your password was updated. You can now sign in.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full max-w-sm">
      <p className="eyebrow text-primary mb-3">
        A LITTLE PRACTICE. A LOT OF POSSIBILITY.
      </p>
      <h1 className="text-3xl font-bold tracking-tight">{titles[mode]}</h1>
      <p className="mt-3 mb-7 text-sm text-muted-foreground leading-relaxed">
        {mode === "login"
          ? "Pick up where you left off. Your progress is waiting for you."
          : mode === "signup"
            ? "Build a preparation plan around what you’ve actually studied."
            : "We’ll help you securely recover access to your account."}
      </p>
      <form onSubmit={submit} className="space-y-5">
        {mode === "signup" && (
          <label className="field">
            Your name
            <Input
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={70}
              placeholder="What should we call you?"
              required
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            Email address
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="field">
            Password
            <Input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? 1 : 12}
              maxLength={72}
              required
            />
            {mode !== "login" && (
              <span className="text-xs text-muted-foreground font-normal">
                At least 12 characters. Use a unique password.
              </span>
            )}
          </label>
        )}
        {mode === "login" && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-primary font-medium"
            >
              Forgot password?
            </Link>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/5 rounded-xl p-3"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="text-sm text-emerald-700 dark:text-emerald-300 rounded-xl bg-emerald-500/10 p-3"
          >
            {message}
          </p>
        )}
        <Button disabled={busy} className="w-full" type="submit">
          {busy ? <LoaderCircle className="animate-spin" /> : null}
          {mode === "login"
            ? "Sign in"
            : mode === "signup"
              ? "Create your account"
              : mode === "forgot"
                ? "Send reset link"
                : "Update password"}
          <ArrowRight />
        </Button>
      </form>
      {google && (mode === "login" || mode === "signup") && (
        <>
          <div className="my-5 text-center text-xs text-muted-foreground">
            or continue with
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Google
          </Button>
        </>
      )}
      <p className="mt-7 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link className="text-primary font-medium" href="/signup">
              Create an account
            </Link>
          </>
        ) : (
          <Link className="text-primary font-medium" href="/login">
            Back to sign in
          </Link>
        )}
      </p>
      <p className="mt-8 text-xs text-muted-foreground leading-relaxed">
        We collect only what’s needed for your learning. Your test results are
        private, and leaderboard participation is optional.
      </p>
    </div>
  );
}
