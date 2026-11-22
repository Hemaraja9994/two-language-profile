/* Two-Language Profile: estimate a multilingual child's language exposure, record a structured
   set of signs, and see whether the pattern fits a typical second-language learner or a possible
   language disorder, with next steps. A case history, not a diagnosis. On-device. */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, ListChecks, Save } from "lucide-react";
import { AppShell, type Section } from "@/shell/AppShell";
import { Button, Callout, Empty, Field, Input, Panel, Pill, ResponsiveTable, Segmented, Select } from "@/shell/ui";
import { References } from "@/shell/References";
import { usePersistent } from "@/shell/storage";
import { toast } from "@/shell/toast";
import { downloadCSV, esc, fmtDate, printHTML, todayISO, uid } from "@/shell/lib";
import { LANG_OPTS, LEVEL_LABEL, QS, assess, exposure, recommendations, type Answer, type Assessment, type LangRow, type LangShare } from "./profile";
import refs from "./refs.json";

interface Saved { id: string; date: string; code: string; age: string; langs: LangShare[]; answers: Record<string, Answer>; result: Assessment }
const defaultLangs = (): LangRow[] => [{ name: "Kannada", hrs: "", age: "0" }, { name: "English", hrs: "", age: "3" }];

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState("profile");
  const [code, setCode] = useState("");
  const [age, setAge] = useState("");
  const [langs, setLangs] = useState<LangRow[]>(defaultLangs());
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>({});
  const [profiles, setProfiles] = usePersistent<Saved[]>("tlp-profiles", []);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const ex = useMemo(() => exposure(langs), [langs]);
  const a = useMemo(() => assess(answers), [answers]);

  const sections: Section[] = [{ id: "profile", label: "Profile", icon: Languages }, { id: "saved", label: "Saved", icon: ListChecks }];
  const go = (id: string) => { setView(id); window.scrollTo({ top: 0 }); };

  const setLang = (i: number, k: keyof LangRow, v: string) => setLangs(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const lowExp = ex.filter(l => l.pct > 0 && l.pct < 20);

  const save = () => {
    if (!code.trim()) { toast("Enter a child code first."); return; }
    setProfiles(ps => [...ps, { id: uid(), date: todayISO(), code: code.trim(), age, langs: ex.length ? ex : langs.map(l => ({ ...l, pct: 0 })), answers: answers as Record<string, Answer>, result: a }]);
    toast("Profile saved");
  };
  const openSaved = (p: Saved) => { setCode(p.code); setAge(p.age); setLangs(p.langs.map(l => ({ name: l.name, hrs: l.hrs, age: l.age }))); setAnswers(p.answers); go("profile"); };
  const del = (id: string) => { if (confirmDel !== id) { setConfirmDel(id); return; } setProfiles(ps => ps.filter(p => p.id !== id)); setConfirmDel(null); toast("Deleted"); };

  const print = () => printHTML(`<h2>Two-language case history</h2><p>Child: <b>${esc(code)}</b>. Age: ${esc(age)} years. Date: ${esc(fmtDate(new Date()))}.</p>
    <h3>Language exposure</h3><table><tr><th>Language</th><th>Hours a week</th><th>Share</th><th>First heard at age</th></tr>${(ex.length ? ex : langs.map(l => ({ ...l, pct: "" as unknown as number }))).map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.hrs)}</td><td>${l.pct}%</td><td>${esc(l.age)}</td></tr>`).join("")}</table>
    <h3>Signs</h3><table>${QS.map(q => `<tr><td>${esc(q.q)}</td><td>${esc(answers[q.id] || "not asked")}</td></tr>`).join("")}</table>
    <h3>Pattern</h3><p><b>${esc(a.text)}</b> (weighted signs ${a.score} of ${a.max}; core signs ${a.core} of 3).</p>
    <p>This is a structured case history, not a diagnosis.</p><div class="sig"><div>Speech-language pathologist (name, RCI number)</div><div>Date</div></div>`);

  return (
    <AppShell title={t("appName")} subtitle={t("appSub")} sections={sections} active={view} onSection={go}
      footer={<p className="m-0">{t("disclaimer")}</p>}>
      {view === "profile" && (
        <div className="mx-auto grid max-w-3xl gap-5">
          <Panel title="Child">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Child code" className="mt-0">{id => <Input id={id} value={code} maxLength={30} onChange={e => setCode(e.target.value)} />}</Field>
              <Field label="Age (years)" className="mt-0">{id => <Input id={id} type="number" min={0} max={18} step={0.5} value={age} onChange={e => setAge(e.target.value)} />}</Field>
            </div>
          </Panel>

          <Panel title="Languages and exposure" action={langs.length < 5 ? <Button size="sm" onClick={() => setLangs(l => [...l, { name: "Hindi", hrs: "", age: "" }])}>Add language</Button> : undefined}>
            <ul className="m-0 grid list-none gap-3 p-0">
              {langs.map((l, i) => (
                <li key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-paper p-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                  <Field label="Language" className="mt-0">{id => <Select id={id} value={l.name} onChange={e => setLang(i, "name", e.target.value)}>{LANG_OPTS.map(o => <option key={o}>{o}</option>)}</Select>}</Field>
                  <Field label="Hours/week" className="mt-0">{id => <Input id={id} type="number" min={0} max={112} value={l.hrs} className="sm:w-24" onChange={e => setLang(i, "hrs", e.target.value)} />}</Field>
                  <Field label="Heard from age" className="mt-0">{id => <Input id={id} type="number" min={0} max={18} step={0.5} value={l.age} className="sm:w-24" onChange={e => setLang(i, "age", e.target.value)} />}</Field>
                  <Button size="sm" variant="quiet" disabled={langs.length <= 1} onClick={() => setLangs(ls => ls.filter((_, j) => j !== i))}>Remove</Button>
                </li>
              ))}
            </ul>
            {ex.length > 0 && (
              <div className="mt-4 grid gap-2">
                {ex.map(l => (
                  <div key={l.name} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[0.9rem]">{l.name}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-track"><span className="block h-full rounded-full bg-accent" style={{ width: `${l.pct}%` }} /></span>
                    <b className="w-10 text-right tabular-nums">{l.pct}%</b>
                  </div>
                ))}
                {lowExp.length > 0 && <Callout tone="mid">Less than about 20% of a child's input in a language is often not enough for them to speak it actively yet. Expect understanding before speaking in {lowExp.map(l => l.name).join(", ")}.</Callout>}
              </div>
            )}
          </Panel>

          <Panel title="Signs">
            <ul className="m-0 grid list-none gap-4 p-0">
              {QS.map(q => (
                <li key={q.id}>
                  <p className="m-0 mb-1.5 text-[0.98rem]">{q.q}</p>
                  <Segmented label={q.q} value={answers[q.id]} onChange={v => setAnswers(p => ({ ...p, [q.id]: p[q.id] === v ? undefined : v }))}
                    options={(["yes", "no", "unsure"] as Answer[]).map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Pattern" action={<div className="flex gap-2"><Button size="sm" onClick={print}>Print</Button><Button size="sm" variant="primary" onClick={save}><Save className="h-4 w-4" aria-hidden />Save</Button></div>}>
            <p className="m-0 flex items-center gap-2 text-[1.05rem]"><Pill tone={a.tone}>{LEVEL_LABEL[a.level]}</Pill> {a.text}</p>
            <p className="m-0 mt-2 text-[0.85rem] text-muted">Weighted signs: {a.score} of {a.max} ({a.answered} of {QS.length} answered). Core signs (late milestones, weak home language, difficulty in every language): {a.core} of 3.</p>
            {a.level !== "incomplete" && <Callout tone="info" title="Next steps"><ul className="m-0 grid list-disc gap-1 pl-5">{recommendations(a.level).map((r, i) => <li key={i}>{r}</li>)}</ul></Callout>}
          </Panel>

          <References refs={refs} contextQuery={a.level === "high" ? "disorder all languages assessment home language" : "bilingual difference typical keep home language"} contextLabel="Behind this profile" />
        </div>
      )}

      {view === "saved" && (
        <Panel title={`Saved profiles (${profiles.length})`} action={profiles.length ? <Button size="sm" onClick={() => downloadCSV([["date", "child_code", "age", "languages", "pattern", "weighted_score", "core_signs", ...QS.map(q => q.id)], ...profiles.map(p => [p.date, p.code, p.age, p.langs.map(l => `${l.name} ${l.pct}% (from age ${l.age})`).join("; "), p.result.text, p.result.score, p.result.core, ...QS.map(q => p.answers[q.id] || "")])], `two-language-profiles-${todayISO()}.csv`)}>Download CSV</Button> : undefined}>
          <ResponsiveTable rows={[...profiles].reverse()} rowKey={p => p.id} empty={<Empty>No saved profiles yet.</Empty>}
            columns={[
              { header: "Date", cell: p => fmtDate(p.date) }, { header: "Child", cell: p => p.code }, { header: "Age", cell: p => p.age || "–" },
              { header: "Languages", cell: p => p.langs.map(l => `${l.name} ${l.pct}%`).join(", ") },
              { header: "Pattern", cell: p => <Pill tone={p.result.tone}>{LEVEL_LABEL[p.result.level]}</Pill> },
              { header: "", cell: p => <div className="flex gap-2"><Button size="sm" onClick={() => openSaved(p)}>Open</Button><Button size="sm" variant="danger" onClick={() => del(p.id)}>{confirmDel === p.id ? "Confirm" : "Delete"}</Button></div> }]} />
        </Panel>
      )}
    </AppShell>
  );
}
