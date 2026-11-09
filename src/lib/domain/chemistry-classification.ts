export type ChemistryChapter = {
  id: string;
  category: string;
  topics: { id: string; name: string; parentId?: string | null }[];
};
const groups: Record<string, string[]> = {
  "Some Basic Concepts of Chemistry": ["11-1"],
  "Structure of Atom": ["11-2"],
  "Periodic Table and Periodicity": ["11-3"],
  "Chemical Bonding and Molecular Structure": ["11-4"],
  "Redox Reactions": ["11-7"],
  Thermodynamics: ["11-5"],
  "Chemical Equilibrium": ["11-6"],
  "Ionic Equilibrium": ["11-6"],
  "Some Basic Concepts of Organic Chemistry": ["11-8"],
  Hydrocarbons: ["11-9"],
  Solutions: ["12-1"],
  Electrochemistry: ["12-2"],
  "Chemical Kinetics": ["12-3"],
  "d and f Block Elements": ["12-4"],
  "Coordination Compounds": ["12-5"],
  "p-Block Elements": ["11-formative-block"],
  "Haloalkanes and Haloarenes": ["12-6"],
  "Alcohol, Phenols and Ethers": ["12-7"],
  "Aldehydes, Ketones and Carboxylic Acids": ["12-8"],
  "Organic Compounds Containing Nitrogen": ["12-9"],
  Biomolecules: ["12-10"],
  "Nuclear Chemistry": [],
};
export const chemistryChapterCandidates = (source: string) =>
  (groups[source] ?? []).map((id) => "chemistry-school-" + id);
const stop = new Set([
  "with",
  "from",
  "which",
  "following",
  "their",
  "this",
  "that",
  "when",
  "into",
  "given",
  "chemistry",
  "chemical",
  "compounds",
  "properties",
]);
const words = (text: string) =>
  new Set(
    (text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !stop.has(w)),
  );
export function suggestChemistryMapping(
  source: string,
  text: string,
  syllabus: ChemistryChapter[],
) {
  const scope = new Set(chemistryChapterCandidates(source)),
    tokens = words(text);
  const ranked = syllabus
    .flatMap((c) =>
      c.topics.map((t) => ({
        chapterId: c.id,
        topicId: t.id,
        category: c.category,
        score: [...words(t.name)].filter((w) => tokens.has(w)).length,
        inSourceScope: scope.has(c.id),
      })),
    )
    .filter((t) => t.score >= 2)
    .sort((a, b) => b.score - a.score);
  const candidates = ranked.filter((r) => r.inSourceScope).slice(0, 6);
  return {
    status: "UNREVIEWED",
    method: "source-context-and-content-tokens-v1",
    confidence: "LOW",
    candidateChapterIds: [...scope],
    candidates,
    possibleCrossChapterConcepts: ranked
      .filter((r) => !r.inSourceScope)
      .slice(0, 5),
    primaryTopicId: null,
    prerequisiteIds: [],
    prerequisiteReview: "REQUIRED",
    categoryCandidates: [
      ...new Set(
        syllabus.filter((c) => scope.has(c.id)).map((c) => c.category),
      ),
    ],
    provisionalDifficulty: /Assertion|Statement I|Match|stereo/i.test(text)
      ? "HARD"
      : /calculate|molar|\d+\s*(mol|g|volt)/i.test(text)
        ? "MEDIUM"
        : "EASY",
    difficultyStatus: "HEURISTIC_UNREVIEWED",
    warning:
      "Source context and lexical matches are suggestions only. Verify all primary concepts, prerequisites, formulas and current eligibility.",
  };
}
