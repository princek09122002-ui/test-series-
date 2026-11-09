import "dotenv/config";
import { readFileSync } from "node:fs";
const { student } = JSON.parse(readFileSync(".local/credentials.json", "utf8"));
const base = "http://127.0.0.1:3000",
  cookies = new Map();
async function request(path, options = {}) {
  const r = await fetch(base + path, {
    ...options,
    redirect: "manual",
    headers: {
      ...options.headers,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    signal: AbortSignal.timeout(30000),
  });
  for (const cookie of r.headers.getSetCookie()) {
    const part = cookie.split(";")[0],
      i = part.indexOf("=");
    cookies.set(part.slice(0, i), part.slice(i + 1));
  }
  return r;
}
const csrf = await (await request("/api/auth/csrf")).json();
const login = await request("/api/auth/callback/credentials", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "http://localhost:3000",
  },
  body: new URLSearchParams({
    email: student.email,
    password: student.password,
    csrfToken: csrf.csrfToken,
    callbackUrl: "http://localhost:3000/dashboard",
    json: "true",
  }),
});
const result = await login.json();
console.log(
  "Credential callback status:",
  login.status,
  "error:",
  result.url?.includes("error=") ?? false,
);
const session = await (await request("/api/auth/session")).json();
console.log("Authenticated session:", !!session.user?.id);
const dashboard = await request("/dashboard");
const body = await dashboard.text();
console.log(
  "Dashboard status:",
  dashboard.status,
  "redirect:",
  dashboard.headers.get("location"),
  "has greeting:",
  body.includes("Good to see you"),
);
