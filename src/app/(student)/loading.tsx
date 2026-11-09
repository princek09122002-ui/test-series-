export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading your workspace"
      className="space-y-6 animate-pulse"
    >
      <div className="h-12 w-64 rounded-xl bg-secondary" />
      <div className="grid gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-secondary" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-secondary" />
    </div>
  );
}
