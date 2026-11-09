import Link from "next/link";
import { ArrowRight, BookOpen, Plus, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight md:text-[34px]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  href,
  label = "Create a test",
  icon: Icon = BookOpen,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-2xl bg-primary/7 p-4">
        <Icon className="size-7 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {href && (
        <Button className="mt-5" size="sm" asChild>
          <Link href={href}>
            {label}
            <ArrowRight />
          </Link>
        </Button>
      )}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon: Icon,
  color = "text-primary",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {label}
          <span className={`rounded-lg bg-secondary p-2 ${color}`}>
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-3 text-[30px] font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
export function NewTestButton() {
  return (
    <Button asChild>
      <Link href="/tests/create">
        <Plus />
        Create a test
      </Link>
    </Button>
  );
}
