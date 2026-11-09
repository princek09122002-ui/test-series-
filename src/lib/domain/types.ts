export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type Mode = "LEARNING" | "TIMED" | "NEET";
export interface QuestionSnapshot {
  structuredContent?: {stem:import('./canonical-question').ContentBlock[];options:Array<{id:string;label:string;content:import('./canonical-question').ContentBlock[]}>};
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: Difficulty;
  chapterId: string;
  chapter: string;
  subjectId: string;
  subject: string;
  classLevel: number;
  topics: { id: string; name: string }[];
  prerequisites: string[];
  media: { url: string; alt: string }[];
  correction?: { reason: string; previousCorrectOption: number; at: string };
}
export type SafeQuestion = Omit<
  QuestionSnapshot,
  "correctOption" | "explanation" | "prerequisites" | "correction"
> & { testQuestionId: string; position: number };
export interface Candidate {
  id: string;
  chapterId: string;
  subjectId: string;
  difficulty: Difficulty;
  topicIds: string[];
  prerequisiteIds: string[];
}
export interface Marking {
  correctMarks: number;
  incorrectMarks: number;
  unansweredMarks: number;
}
export interface Outcome {
  id: string;
  correctOption: number;
  selectedOption: number | null;
  activeMs: number;
  subject: string;
  chapter: string;
  topics: { id: string; name: string }[];
}
