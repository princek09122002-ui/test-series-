import Link from "next/link";
import { requireStaff } from "@/lib/auth";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff(false, true);
  return (
    <>
      <nav className="mb-7 flex flex-wrap gap-2 border-b pb-5">
        {[
          ["/admin", "Overview"],
          ["/admin/questions", "Questions"],
          ["/admin/imports", "Physics imports"],
          ...(user.role === "ADMIN"
            ? [
                ["/admin/review", "Review queue"],
                ["/admin/syllabus", "Syllabus"],
                ["/admin/challenges", "Challenges"],
                ["/admin/users", "Users"],
                ["/admin/reports", "Reports"],
                ["/admin/settings", "Settings"],
              ]
            : []),
        ].map(([href, label]) => (
          <Link
            href={href}
            key={href}
            className="rounded-lg border bg-card px-3 py-2 text-xs font-medium hover:border-primary"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
