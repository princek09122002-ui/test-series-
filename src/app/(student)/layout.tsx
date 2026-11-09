import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, syllabus] = await Promise.all([
    requireUser(true),
    db.syllabusVersion.findFirst({
      where: { active: true },
      select: { demo: true },
    }),
  ]);
  return (
    <AppShell
      user={{
        name: user.name ?? "Student",
        role: user.role,
        stage: user.profile?.stage ?? "CLASS_11",
      }}
      demo={syllabus?.demo ?? false}
    >
      {children}
    </AppShell>
  );
}
