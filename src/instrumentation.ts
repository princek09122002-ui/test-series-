export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.RUN_EXPIRY_WORKER !== "true") return;
    const { expireAttempts } = await import("@/lib/services/testing");
    const globalWorker = globalThis as unknown as {
      expiryWorker?: ReturnType<typeof setInterval>;
    };
    if (!globalWorker.expiryWorker)
      globalWorker.expiryWorker = setInterval(() => {
        void expireAttempts().catch(() =>
          console.error("Expiry worker failed; retrying on next tick"),
        );
      }, 15000).unref();
  }
}
