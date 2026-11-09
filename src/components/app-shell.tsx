"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ClipboardList,
  ChartNoAxesCombined,
  BookOpen,
  CalendarCheck,
  Bookmark,
  Trophy,
  Settings,
  Shield,
  Menu,
  X,
  Moon,
  Sun,
  ArrowUpRight,
  GraduationCap,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
const navigation = [
  { href: "/pyq", label: "PYQ practice", icon: BookOpen },
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tests", label: "My tests", icon: ClipboardList },
  { href: "/analytics", label: "Performance", icon: ChartNoAxesCombined },
  { href: "/syllabus", label: "My syllabus", icon: BookOpen },
  { href: "/revision", label: "Revision plan", icon: CalendarCheck },
  { href: "/mistakes", label: "Mistake notebook", icon: Bookmark },
  { href: "/challenges", label: "Challenges", icon: Trophy },
];
export function AppShell({
  children,
  user,
  demo,
}: {
  children: React.ReactNode;
  user: { name: string; role: string; stage: string };
  demo: boolean;
}) {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    { theme, setTheme } = useTheme();
  const exam = /^\/tests\/[^/]+$/.test(path) && path !== "/tests/create";
  if (exam) return <>{children}</>;
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 bg-card p-3"
      >
        Skip to content
      </a>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-border bg-card transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-7 pt-8 pb-10"
        >
          <span className="logo-mark">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            NEET <span className="font-medium text-primary">Adaptive</span>
          </span>
        </Link>
        <div className="px-5">
          <p className="px-3 pb-3 text-[10px] font-bold tracking-[.16em] text-muted-foreground">
            YOUR PREPARATION
          </p>
          <nav className="space-y-1">
            {navigation.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "nav-item",
                  path === n.href ||
                    (n.href !== "/dashboard" && path.startsWith(n.href + "/"))
                    ? "nav-active"
                    : "",
                )}
              >
                <n.icon className="size-[18px]" />
                {n.label}
                {path === n.href && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-5">
          <div className="mb-5 rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <span className="eyebrow">ONE STEP AT A TIME</span>
            <p className="mt-2 text-sm font-semibold">
              Build understanding.
              <br />
              Then build confidence.
            </p>
            <Link
              href="/tests/create"
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Practice your way
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
          {user.role !== "STUDENT" && (
            <Link className="nav-item" href="/admin">
              <Shield className="size-4" />
              Content workspace
            </Link>
          )}
          <Link href="/settings" className="nav-item">
            <Settings className="size-4" />
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="nav-item w-full"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
          <Link
            href="/profile"
            className="mt-5 flex items-center gap-3 border-t pt-5"
          >
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {user.stage.replaceAll("_", " ")}
              </p>
            </div>
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between gap-4 border-b bg-card/90 px-5 md:px-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X /> : <Menu />}
            </Button>
            <span className="text-sm text-muted-foreground">
              Your learning space <span className="mx-2 text-border">/</span>{" "}
              <span className="text-foreground font-medium">
                {navigation.find((n) => path.startsWith(n.href))?.label ??
                  "Workspace"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {demo && (
              <span className="hidden sm:inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
                Illustrative syllabus
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
            </Button>
            <Link
              href="/profile"
              className="avatar size-9 text-xs"
              aria-label="Open profile"
            >
              {user.name.slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1500px] p-5 md:px-10 md:py-9"
        >
          {children}
        </main>
        <footer className="px-10 py-6 text-xs text-muted-foreground border-t flex flex-wrap justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          <span>Online practice simulations · Independent of NTA</span>
        </footer>
      </div>
    </div>
  );
}
