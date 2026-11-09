import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = {
  title: {
    default: "NEET Adaptive — Your syllabus. Your test.",
    template: "%s | NEET Adaptive",
  },
  description:
    "Test exactly what you have studied. Personalized NEET practice, transparent analytics, and a revision plan that grows with you.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
