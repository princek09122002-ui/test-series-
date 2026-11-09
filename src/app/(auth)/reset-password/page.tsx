import { AuthForm } from "@/components/auth-form";
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <AuthForm mode="reset" token={(await searchParams).token ?? ""} />;
}
