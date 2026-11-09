export type BiologyChapter = {
  id: string;
  category: string;
  topics: { id: string; name: string; parentId?: string | null }[];
};

const sourceChapters: Record<string, string> = {
  "The Living World": "11-1",
  "Biological Classification": "11-2",
  "Plant Kingdom": "11-3",
  "Animal Kingdom": "11-4",
  "Morphology of Flowering Plants": "11-5",
  "Anatomy of Flowering Plants": "11-6",
  "Structural Organisation in Animals": "11-7",
  "Cell - The Unit of Life": "11-8",
  Biomolecules: "11-9",
  "Cell Cycle and Cell Division": "11-10",
  "Photosynthesis in Higher Plants": "11-11",
  "Respiration in Plants": "11-12",
  "Plant Growth and Development": "11-13",
  "Breathing and Exchange of Gases": "11-14",
  "Body Fluids and Its Circulation": "11-15",
  "Excretory Products and Their Elimination": "11-16",
  "Locomotion and Movement": "11-17",
  "Neural Control and Coordination": "11-18",
  "Chemical Coordination and Integration": "11-19",
  "Sexual Reproduction in Flowering Plants": "12-1",
  "Human Reproduction": "12-2",
  "Reproductive Health": "12-3",
  "Principles of Inheritance and Variation": "12-4",
  "Molecular Basis of Inheritance": "12-5",
  Evolution: "12-6",
  "Human Health and Diseases": "12-7",
  "Microbes in Human Welfare": "12-8",
  "Biotechnology: Principles and Processes": "12-9",
  "Biotechnology and It's Applications": "12-10",
  "Organisms and Populations": "12-11",
  Ecosystem: "12-12",
  "Biodiversity and Conservation": "12-13",
};

const stop = new Set([
  "with", "from", "which", "following", "their", "this", "that", "when",
  "into", "given", "biology", "correct", "answer", "option", "question",
]);
const words = (text: string) =>
  new Set(
    (text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !stop.has(w)),
  );

export function biologyChapterCandidate(source: string) {
  const id = sourceChapters[source];
  return id ? `biology-school-${id}` : null;
}

export function suggestBiologyMapping(
  source: string,
  text: string,
  syllabus: BiologyChapter[],
) {
  const chapterId = biologyChapterCandidate(source);
  const chapter = syllabus.find((c) => c.id === chapterId);
  const tokens = words(text);
  const candidates = (chapter?.topics ?? [])
    .map((t) => ({
      chapterId: chapter!.id,
      topicId: t.id,
      score: [...words(t.name)].filter((w) => tokens.has(w)).length,
    }))
    .filter((t) => t.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  return {
    status: "UNREVIEWED",
    method: "source-chapter-context-and-content-tokens-v1",
    confidence: "LOW",
    candidateChapterIds: chapterId ? [chapterId] : [],
    candidates,
    primaryTopicId: null,
    prerequisiteIds: [],
    prerequisiteReview: "REQUIRED",
    categoryCandidate: chapter?.category ?? null,
    categoryStatus: "UNREVIEWED",
    eligibility: "UNVERIFIED",
    ncertMappingStatus: "UNVERIFIED",
    warning:
      "These are private review suggestions. Check the actual concepts, diagram, syllabus eligibility, answer and rights before publication.",
  };
}
