"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">We couldn’t load this page</h1>
      <p className="my-4 text-muted-foreground">
        Please try again. If you are setting up the project, check that
        PostgreSQL is running and migrations have been applied.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
