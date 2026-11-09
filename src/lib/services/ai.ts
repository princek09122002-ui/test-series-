export interface ExplanationAssistant {
  explain(input: {
    question: string;
    approvedExplanation: string;
    language: "en" | "hi";
  }): Promise<{ text: string; provider: string }>;
}
export function optionalAssistant(): ExplanationAssistant | null {
  return null;
}
