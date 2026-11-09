import Link from "next/link";
import {
  ArrowRight,
  Check,
  GraduationCap,
  SlidersHorizontal,
  ChartNoAxesCombined,
  CalendarCheck,
  Atom,
  FlaskConical,
  Dna,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default function Home() {
  return (
    <div className="min-h-screen bg-card">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="flex gap-3 items-center font-bold text-lg">
          <span className="logo-mark">
            <GraduationCap className="size-5" />
          </span>
          NEET <span className="font-medium text-primary -ml-2">Adaptive</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/features"
            className="hidden sm:block text-muted-foreground"
          >
            The approach
          </Link>
          <Link href="/login" className="font-medium">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">
              Get started
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl gap-14 px-6 pt-16 pb-24 lg:grid-cols-[1.1fr_1fr] lg:pt-24 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <span className="size-1.5 rounded-full bg-primary" />A more
              personal way to prepare
            </span>
            <h1 className="mt-7 text-5xl md:text-6xl font-bold tracking-[-.04em] leading-[1.12]">
              Your syllabus.
              <br />
              Your test.
              <br />
              <span className="text-primary">Your improvement.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Studied half a chapter? Start there. Create NEET practice tests
              around what you know, discover what needs work, and make your next
              step count.
            </p>
            <div className="mt-8 flex gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Build your first test
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/features">Explore features</Link>
              </Button>
            </div>
            <div className="mt-6 flex gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="size-3 text-emerald-600" />
                Your results stay private
              </span>
              <span className="flex items-center gap-1">
                <Check className="size-3 text-emerald-600" />
                No AI API required
              </span>
            </div>
          </div>
          <div className="relative rounded-[28px] border bg-background p-5 md:p-8">
            <div className="flex justify-between mb-7 items-center">
              <span className="eyebrow">A TEST THAT FITS YOUR LEARNING</span>
              <SlidersHorizontal className="size-4 text-primary" />
            </div>
            <h2 className="text-xl font-bold">
              Start with what you’ve studied.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Whole chapters. Selected topics. Your choice.
            </p>
            <div className="mt-6 space-y-3">
              {[
                {
                  name: "Chemistry",
                  sub: "Mole concept + selected atomic structure topics",
                  icon: FlaskConical,
                  tone: "text-violet-600 bg-violet-500/10",
                },
                {
                  name: "Physics",
                  sub: "Choose your chapters and concepts",
                  icon: Atom,
                  tone: "text-blue-600 bg-blue-500/10",
                },
                {
                  name: "Biology",
                  sub: "Botany, zoology, and everything you’ve covered",
                  icon: Dna,
                  tone: "text-emerald-600 bg-emerald-500/10",
                },
              ].map((s, i) => (
                <Card
                  key={s.name}
                  className={`p-4 flex items-center gap-3 ${i === 0 ? "border-primary/35 ring-2 ring-primary/5" : ""}`}
                >
                  <span className={`p-3 rounded-xl ${s.tone}`}>
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.sub}
                    </p>
                  </div>
                  {i === 0 && (
                    <Check className="size-4 text-primary ml-auto shrink-0" />
                  )}
                </Card>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/6 p-3 text-xs text-primary">
              <Target className="size-4 shrink-0" />
              Every question stays inside your selected topics.
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground">
              Illustration of test setup. No student performance data shown.
            </p>
          </div>
        </section>
        <section id="features" className="border-y bg-background">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="eyebrow text-primary">PREPARE WITH PURPOSE</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              More clarity. Better practice.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: SlidersHorizontal,
                  title: "Make it your test",
                  text: "Mix complete chapters with individual topics. Choose the length, difficulty, exposure, and marking mode.",
                },
                {
                  icon: ChartNoAxesCombined,
                  title: "See what’s holding you back",
                  text: "Review every answer, compare subjects, and understand how you use time. All grounded in your actual attempts.",
                },
                {
                  icon: CalendarCheck,
                  title: "Give learning another chance",
                  text: "Keep a mistake notebook and an explainable revision plan. Use fresh questions to check your understanding.",
                },
              ].map((f) => (
                <Card key={f.title} className="p-7">
                  <div className="mb-6 inline-flex rounded-xl bg-primary/8 p-3 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {f.text}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-20 flex flex-wrap justify-between items-center gap-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              One thoughtful step closer.
            </h2>
            <p className="mt-3 text-muted-foreground text-sm">
              Start where you are. Build from there.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">
              Start your preparation
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="border-t px-6 py-8 text-xs text-muted-foreground flex flex-wrap gap-4 justify-center">
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-3" />
          Independent of NTA · Online mocks are practice simulations
        </span>
        <a href="https://neet.nta.nic.in/" target="_blank" rel="noreferrer">
          Official NEET information ↗
        </a>
      </footer>
    </div>
  );
}
