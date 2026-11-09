import Link from "next/link";
import { GraduationCap, Check, Sparkles } from "lucide-react";
export const dynamic = "force-dynamic";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[.95fr_1fr] bg-card">
      <div className="relative hidden overflow-hidden bg-[#18244b] p-14 text-white lg:flex lg:flex-col">
        <Link
          href="/"
          className="flex items-center gap-3 font-semibold text-xl"
        >
          <span className="logo-mark">
            <GraduationCap className="size-5" />
          </span>
          NEET Adaptive
        </Link>
        <div className="my-auto max-w-md">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
            <Sparkles className="size-6 text-indigo-200" />
          </div>
          <h2 className="text-5xl font-semibold leading-[1.18] tracking-tight">
            Your journey.
            <br />
            Your pace.
            <br />
            <span className="text-[#b6bcff]">Your potential.</span>
          </h2>
          <p className="mt-6 text-base text-indigo-100/70 leading-relaxed">
            A more personal way to prepare for NEET. Turn today’s learning into
            tomorrow’s confidence.
          </p>
          <div className="mt-9 space-y-4 text-sm text-indigo-100">
            {[
              "Practice exactly what you’ve studied",
              "Understand every mark you lose",
              "Give the right concepts another look",
            ].map((t) => (
              <p className="flex items-center gap-3" key={t}>
                <Check className="size-4 text-emerald-300" />
                {t}
              </p>
            ))}
          </div>
        </div>
        <p className="text-xs text-indigo-100/50">
          Independent learning platform · Online exam simulations
        </p>
        <div className="absolute -right-40 -bottom-48 size-[500px] rounded-full border-[80px] border-white/[.025] pointer-events-none" />
      </div>
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-14">
        <Link
          href="/"
          className="mb-10 flex items-center gap-2 lg:hidden font-bold text-primary"
        >
          <GraduationCap />
          NEET Adaptive
        </Link>
        {children}
      </main>
    </div>
  );
}
