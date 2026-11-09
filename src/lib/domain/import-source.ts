export type ImportSubject = "Physics" | "Chemistry" | "Biology";
export function importSubject(metadata: unknown): ImportSubject {
  if (metadata && typeof metadata === "object" && "subject" in metadata) {
    if (metadata.subject === "Chemistry") return "Chemistry";
    if (metadata.subject === "Biology") return "Biology";
  }
  return "Physics";
}
export function importDirectory(subject: ImportSubject) {
  if (subject === "Biology") return ".local/biology-import";
  if (subject === "Chemistry") return ".local/chemistry-import";
  return ".local/physics-import";
}
