import { AuthForm } from "@/components/auth-form";
export default function Signup() {
  return (
    <AuthForm
      mode="signup"
      google={!!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET}
    />
  );
}
