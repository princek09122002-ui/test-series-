import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import { dateLabel } from "@/lib/utils";
export function AttemptList({
  attempts,
  timezone,
}: {
  attempts: {
    id: string;
    testId: string;
    status: string;
    score: number | null;
    maximum: number | null;
    startedAt: Date;
    test: { name: string; configuration: { mode: string } | null };
  }[];
  timezone?: string;
}) {
  if (!attempts.length)
    return (
      <EmptyState
        title="Your first test is a fresh start"
        description="Choose the topics you’ve studied and create a practice test. Your results will appear here."
        href="/tests/create"
      />
    );
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Date</th>
            <th>Mode</th>
            <th>Result</th>
            <th>
              <span className="sr-only">Open test</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id}>
              <td className="font-medium min-w-44">{a.test.name}</td>
              <td className="whitespace-nowrap text-muted-foreground">
                {dateLabel(a.startedAt, timezone)}
              </td>
              <td>
                <Badge>{a.test.configuration?.mode}</Badge>
              </td>
              <td>
                {a.status === "SUBMITTED" ? (
                  <span className="font-semibold">
                    {a.score}{" "}
                    <span className="text-muted-foreground font-normal">
                      / {a.maximum}
                    </span>
                  </span>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    IN PROGRESS
                  </Badge>
                )}
              </td>
              <td>
                <Link
                  className="flex items-center gap-1 text-xs font-semibold text-primary whitespace-nowrap"
                  href={`/tests/${a.testId}${a.status === "SUBMITTED" ? "/result" : ""}`}
                >
                  {a.status === "SUBMITTED" ? "View result" : "Resume"}
                  <ArrowUpRight className="size-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
