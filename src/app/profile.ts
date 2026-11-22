/* A structured case history to help tell a language difference (typical bilingual learner) from a
   possible language disorder in a multilingual child. It is not a diagnostic test. Weighted signs
   and three "core" signs (late milestones, weak home language, difficulty in every language) drive
   the pattern; language exposure is estimated from reported hours. */

export interface Question { id: string; w: number; q: string }
export const QS: Question[] = [
  { id: "late", w: 2, q: "First words came after 18 months, or word combinations after 24 months, in the home language" },
  { id: "homeWeak", w: 2, q: "Family says the child speaks the home language less well than siblings or children of the same age" },
  { id: "allLangs", w: 2, q: "Difficulties are noticed in every language the child uses, not only the newest one" },
  { id: "family", w: 1, q: "A parent or sibling had a speech, language or reading difficulty" },
  { id: "understand", w: 1, q: "Child has trouble understanding instructions in the home language" },
  { id: "frustration", w: 1, q: "Child gets frustrated or withdrawn because others do not understand them" }
];
export const CORE = ["late", "homeWeak", "allLangs"];
export const LANG_OPTS = ["Kannada", "Telugu", "Hindi", "Tamil", "Malayalam", "Tulu", "Konkani", "Marathi", "Urdu", "Bengali", "English", "Other"];

export type Answer = "yes" | "no" | "unsure";
export interface LangRow { name: string; hrs: string; age: string }
export interface LangShare extends LangRow { pct: number }

export function exposure(langs: LangRow[]): LangShare[] {
  const tot = langs.reduce((s, l) => s + (Number(l.hrs) || 0), 0);
  if (!tot) return [];
  return langs.map(l => ({ ...l, pct: Math.round((Number(l.hrs) || 0) / tot * 100) }));
}

export type Level = "incomplete" | "low" | "mid" | "high";
export interface Assessment { answered: number; score: number; max: number; core: number; level: Level; text: string; tone: "muted" | "ok" | "mid" | "high" }

export function assess(answers: Record<string, Answer | undefined>): Assessment {
  const answered = QS.filter(q => answers[q.id]).length;
  const score = QS.reduce((s, q) => s + (answers[q.id] === "yes" ? q.w : 0), 0);
  const max = QS.reduce((s, q) => s + q.w, 0);
  const core = CORE.filter(k => answers[k] === "yes").length;
  if (answered < 3) return { answered, score, max, core, level: "incomplete", text: "Answer the questions to see the pattern.", tone: "muted" };
  if (core >= 2 || score >= 5) return { answered, score, max, core, level: "high", text: "Signs point towards a possible language disorder", tone: "high" };
  if (core === 1 || score >= 3) return { answered, score, max, core, level: "mid", text: "Mixed picture: some signs of concern", tone: "mid" };
  return { answered, score, max, core, level: "low", text: "Pattern fits a typical second-language learner", tone: "ok" };
}

export const LEVEL_LABEL: Record<Level, string> = { incomplete: "Incomplete", low: "Difference", mid: "Watch", high: "Concern" };

export const BASE_RECS = [
  "Assess in the home language as well as the school language, with an interpreter or bilingual clinician if needed.",
  "Score vocabulary across languages (conceptual or total vocabulary), not one language alone.",
  "Interpret norms from single-language or English-speaking samples with great caution.",
  "Use dynamic assessment (test, teach, retest) to see how quickly the child learns new words or rules.",
  "Advise the family to keep using the home language. Dropping it does not speed up learning the school language."
];
export function recommendations(level: Level): string[] {
  const recs = [...BASE_RECS];
  if (level === "high") recs.unshift("Proceed to a full speech-language assessment in all languages, and check hearing.");
  if (level === "low") recs.unshift("Monitor progress in the school language over the next term; review sooner if concerns grow.");
  return recs;
}
