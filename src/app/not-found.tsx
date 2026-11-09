import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="my-4 text-3xl font-bold">This page couldn’t be found</h1>
      <Button asChild>
        <Link href="/dashboard">Back to your dashboard</Link>
      </Button>
    </div>
  );
}
