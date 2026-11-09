"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUESTIONS = [
  { text: "A car travels 120 m in 10 s at constant speed. What is its speed?", options: ["10 m/s", "12 m/s", "15 m/s", "20 m/s"], answer: 1 },
  { text: "Which SI unit measures electric current?", options: ["Volt", "Ohm", "Ampere", "Coulomb"], answer: 2 },
  { text: "A wave has frequency 5 Hz and wavelength 2 m. What is its speed?", options: ["2.5 m/s", "7 m/s", "10 m/s", "25 m/s"], answer: 2 },
] as const;

export function DevTestLab() {
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("neet-dev-test-lab");
    return saved ? JSON.parse(saved) : {};
  });
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => localStorage.setItem("neet-dev-test-lab", JSON.stringify(answers)), [answers]);
  const score = useMemo(() => QUESTIONS.reduce((total, question, index) => total + Number(answers[index] === question.answer), 0), [answers]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Local development test lab</CardTitle>
        <p className="text-sm text-muted-foreground">Original sample MCQs for UI, autosave, submission and scoring checks. Nothing here is stored in PostgreSQL or included in student analytics.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm">Timer: {seconds}s · Autosave: browser only</p>
        {QUESTIONS.map((question, index) => (
          <fieldset key={question.text} className="rounded-xl border p-4" disabled={submitted}>
            <legend className="px-2 font-semibold">{index + 1}. {question.text}</legend>
            <div className="mt-3 grid gap-2">
              {question.options.map((option, position) => (
                <label key={option} className="flex gap-2 rounded-lg border p-3">
                  <input type="radio" name={`dev-${index}`} checked={answers[index] === position} onChange={() => setAnswers((current) => ({ ...current, [index]: position }))} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {submitted ? (
          <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900">Development result: {score}/{QUESTIONS.length}. This result was not persisted.</div>
        ) : (
          <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== QUESTIONS.length}>Submit development test</Button>
        )}
        <Button variant="outline" onClick={() => { localStorage.removeItem("neet-dev-test-lab"); setAnswers({}); setSubmitted(false); setSeconds(0); }}>Reset local lab</Button>
      </CardContent>
    </Card>
  );
}
