export async function sendPasswordReset(email: string, token: string) {
  if (!process.env.RESEND_API_KEY) return false;
  const link = `${process.env.NEXTAUTH_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: "Reset your NEET Adaptive password",
      text: `Use this link within 30 minutes to reset your password: ${link}\n\nIf you did not request this, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error("The password-reset email service is unavailable");
  return true;
}
