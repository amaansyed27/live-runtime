import { HelpTip } from "../components/HelpTip";

interface SkillItem {
  id: string;
  name: string;
  status: "Learning" | "Ready" | "Draft";
  detail: string;
}

export const defaultSkills: SkillItem[] = [
  { id: "preferences", name: "Preferences", status: "Learning", detail: "Tone, theme, shortcuts" },
  { id: "web-research", name: "Web research", status: "Draft", detail: "Search, read, summarize" },
  { id: "docs", name: "Docs helper", status: "Draft", detail: "Clean notes into docs" }
];

export function SkillsView({ skills, setSkills, searchProvider, setSearchProvider }: { skills: SkillItem[]; setSkills(value: SkillItem[] | ((current: SkillItem[]) => SkillItem[])): void; searchProvider: string; setSearchProvider(value: string): void; }) {
  return <section className="page-panel skills-page"><div className="page-header"><p className="eyebrow">Skills</p><h2>Capabilities</h2></div><div className="skills-layout"><section className="skill-hero"><span>Skill loop</span><strong>Notice → Package → Reuse</strong></section><section className="settings-card"><label htmlFor="searchProvider">Search provider <HelpTip text="Use your own SearXNG instance for reliable free JSON search." /></label><input id="searchProvider" value={searchProvider} onChange={(event) => setSearchProvider(event.target.value)} title="SearXNG instance URL" /></section><section className="skill-grid">{skills.map((skill) => <article className="skill-card" key={skill.id}><span>{skill.status}</span><h3>{skill.name}</h3><p>{skill.detail}</p></article>)}</section><button type="button" title="Restore starter skills" onClick={() => setSkills(defaultSkills)}>Reset starter skills</button></div></section>;
}

export type { SkillItem };
