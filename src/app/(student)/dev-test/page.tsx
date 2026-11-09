import { notFound } from "next/navigation";
import { DevTestLab } from "@/components/dev-test-lab";
import { PageHeading } from "@/components/shared";

export default function DevelopmentTestPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <PageHeading title="Development test lab" description="A local-only assessment sandbox, separate from the published question bank." />
      <DevTestLab />
    </>
  );
}
