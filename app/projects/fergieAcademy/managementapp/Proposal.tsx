'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bricolage_Grotesque, Source_Serif_4 } from 'next/font/google';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--fa-display',
  display: 'swap',
});
const body = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--fa-body',
  display: 'swap',
});

/* ------------------------------------------------------------------
   EDIT HERE. Everything highlighted yellow on the page comes from
   <Ph> and is a placeholder to confirm before sending the final.
------------------------------------------------------------------- */
const SHOW_DRAFT_BANNER = true;

const CFG = {
  client: 'Fergie Academy',
  contact: '[Client contact name]',
  preparedBy: 'Judah',
  company: 'Kgaso Web Solutions',
  email: 'hey@judah.guru',
  phone: '[Phone / WhatsApp]',
  date: '[Date]',
  validUntil: '[Date, e.g. 14 days from issue]',
  deposit: '[30]%',
  midpoint: '[40]%',
  final: '[30]%',
  supportDays: '[30]',
};

const Ph = ({ children }: { children: React.ReactNode }) => (
  <span className="fa-ph">{children}</span>
);

type Role = 'admin' | 'tutor' | 'parent';

const ROLES: { id: Role; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'parent', label: 'Parent' },
];

const LOOP: {
  title: string;
  note: string;
  view: Record<Role, string>;
}[] = [
  {
    title: 'Class happens',
    note: 'Timetable',
    view: {
      admin:
        'Sets up classes, assigns tutors and enrols students. Changes to the timetable are made in one place.',
      tutor: 'Opens the app and sees today’s classes and who is enrolled.',
      parent: 'Sees when their child’s classes are, including any changes.',
    },
  },
  {
    title: 'Attendance is marked',
    note: 'Attendance',
    view: {
      admin:
        'Sees attendance across all classes and tutors, with a record of who marked what and when.',
      tutor:
        'Taps present, absent or late for each student. It takes seconds and works on a phone.',
      parent: 'Can see their child’s attendance record.',
    },
  },
  {
    title: 'Fees are tracked',
    note: 'Fees',
    view: {
      admin:
        'Records payments, sees every balance and gets an overdue list without opening a spreadsheet.',
      tutor: 'Does not see fee information.',
      parent: 'Sees what is owed, what has been paid and the payment history.',
    },
  },
  {
    title: 'Parent is informed',
    note: 'Updates',
    view: {
      admin:
        'Posts announcements and sends reminders to all parents, or to one class only.',
      tutor: 'Can add a short note on a student’s progress.',
      parent: 'Gets announcements, reminders and progress notes in one place.',
    },
  },
];

const ROLE_TABLE: { role: string; sees: string; version: string }[] = [
  {
    role: 'Admin',
    sees: 'Everything: students, tutors, classes, money, reports.',
    version: 'Version 1',
  },
  {
    role: 'Tutor',
    sees: 'Only their own classes. Marks attendance and adds notes.',
    version: 'Version 1',
  },
  {
    role: 'Parent',
    sees: 'Only their own children: attendance, fees, announcements.',
    version: 'Version 1 (view only)',
  },
  {
    role: 'Student',
    sees: 'Own timetable, attendance and notes.',
    version: 'Version 2',
  },
];

type Version = {
  id: string;
  name: string;
  tag?: string;
  summary: string;
  weeks: string;
  build: string;
  running: string;
  includes: string[];
};

const VERSIONS: Version[] = [
  {
    id: 'v1',
    name: 'Version 1: Core',
    tag: 'Recommended start',
    summary:
      'Replaces paper, WhatsApp lists and spreadsheets with one system for people, attendance and fees.',
    weeks: '[X–X] weeks',
    build: 'P[X,XXX]',
    running: 'P[XXX] / month',
    includes: [
      'Admin and tutor logins',
      'Students, parents, tutors and classes',
      'Fast attendance marking on a phone',
      'Fee recording, balances and an overdue list',
      'Read-only parent view',
      'Basic reports: attendance rate and who owes what',
      'Printable receipts and statements',
      'Move over your existing student list',
    ],
  },
  {
    id: 'v2',
    name: 'Version 2: Automation',
    summary:
      'Takes work off your hands: reminders go out on their own and payments can happen online.',
    weeks: '[X–X] weeks',
    build: 'P[X,XXX]',
    running: 'P[XXX] / month + usage',
    includes: [
      'Automatic fee reminders to parents',
      'WhatsApp or SMS notifications',
      'Online payments',
      'Student logins',
      'Make-up class and absence tracking',
      'Tutor payroll: sessions taught × rate',
    ],
  },
  {
    id: 'v3',
    name: 'Version 3: Growth',
    summary:
      'For when the academy grows: more locations, deeper reports and an installable app.',
    weeks: '[X–X] weeks',
    build: 'Quoted per feature',
    running: 'P[XXX] / month + usage',
    includes: [
      'Multiple branches',
      'Deeper analytics and exports',
      'Installable app experience',
      'Integrations you ask for',
    ],
  },
];

const COSTS: { item: string; when: string; cost: string; payer: string }[] = [
  { item: 'Hosting', when: 'Version 1', cost: 'P[XXX] / month', payer: '[Client]' },
  { item: 'Database and backups', when: 'Version 1', cost: 'P[XXX] / month', payer: '[Client]' },
  { item: 'Domain name', when: 'Version 1', cost: 'P[XXX] / year', payer: '[Client]' },
  { item: 'WhatsApp / SMS messages', when: 'Version 2', cost: 'P[X.XX] per message', payer: '[Client]' },
  { item: 'Online payment fees', when: 'Version 2', cost: '[X.X]% per payment', payer: '[Client]' },
];

const MILESTONES: { title: string; detail: string; pay: string }[] = [
  {
    title: 'Approval',
    detail: 'You confirm the scope for Version 1 and the fee model.',
    pay: CFG.deposit,
  },
  {
    title: 'Working demo',
    detail:
      'You try attendance and fee recording with real classes and give feedback.',
    pay: CFG.midpoint,
  },
  {
    title: 'Launch',
    detail:
      'Your data is loaded, accounts are created and a training session is held for you and your tutors.',
    pay: CFG.final,
  },
  {
    title: 'First month',
    detail: `Fixes and adjustments for ${CFG.supportDays} days after launch.`,
    pay: 'Included',
  },
];

const NEEDS = [
  'Your current student list, parent contacts and class list',
  'Your current fee structure: monthly, per session or packages',
  'A photo or screenshot of how attendance and fees are tracked today',
  'Which tutors need accounts, and which classes each one teaches',
  'Your logo and brand colours, if you want them used',
  'One person who can answer questions during the build',
];

const TERMS = [
  'Prices are in Botswana Pula and exclude any running costs listed above.',
  'Work outside the agreed Version 1 scope is quoted before it starts.',
  `You own your data and can export it at any time. Code ownership: [to be agreed].`,
  'Running costs are paid by the academy directly to the providers.',
  'Timelines assume feedback within [3] working days at each stage.',
];

export default function Proposal() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>('tutor');
  const [ver, setVer] = useState('v1');

  const v = VERSIONS.find((x) => x.id === ver) ?? VERSIONS[0];

  return (
    <div className={`fa-root ${display.variable} ${body.variable}`}>
      <style>{css}</style>

      {SHOW_DRAFT_BANNER && (
        <div className="fa-banner">
          Draft for discussion. Anything highlighted in yellow is a placeholder
          and will be confirmed.
        </div>
      )}

      <main className="fa-page">
        <header className="fa-hero">
          <p className="fa-meta">
            Proposal for {CFG.client} · prepared for <Ph>{CFG.contact}</Ph> ·{' '}
            <Ph>{CFG.date}</Ph>
          </p>
          <h1>One place for your classes, attendance and fees.</h1>
          <p className="fa-lead">
            A management app built around the way {CFG.client} already works.
            Tutors mark attendance from their phones, you see who has paid, and
            parents stay informed without chasing anyone.
          </p>
          <p>
            <Link className="fa-demo" href="/projects/fergieAcademy/managementapp/demo">
              Try the live admin demo
            </Link>
          </p>
        </header>

        <section>
          <h2>How it works</h2>
          <p>
            Everything in the app serves one cycle that repeats every class.
            Pick a step and a role to see what each person does.
          </p>

          <div className="fa-loop" role="tablist" aria-label="Class cycle">
            {LOOP.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={step === i}
                className={`fa-step ${step === i ? 'is-on' : ''}`}
                onClick={() => setStep(i)}
              >
                <span className="fa-step-note">{s.note}</span>
                <span className="fa-step-title">{s.title}</span>
              </button>
            ))}
          </div>
          <p className="fa-loopback">Then it starts again at the next class.</p>

          <div className="fa-roles" role="group" aria-label="Role">
            {ROLES.map((r) => (
              <button
                key={r.id}
                aria-pressed={role === r.id}
                className={`fa-chip ${role === r.id ? 'is-on' : ''}`}
                onClick={() => setRole(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="fa-panel" aria-live="polite">
            <strong>
              {ROLES.find((r) => r.id === role)?.label}: {LOOP[step].title}
            </strong>
            <p>{LOOP[step].view[role]}</p>
          </div>
        </section>

        <section>
          <h2>Who uses it</h2>
          <div className="fa-table">
            {ROLE_TABLE.map((r) => (
              <div className="fa-row" key={r.role}>
                <div className="fa-cell-strong">{r.role}</div>
                <div>{r.sees}</div>
                <div className="fa-cell-muted">{r.version}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>What you get, and when</h2>
          <p>
            I recommend starting with Version 1. It solves the daily work, and
            you can decide on the rest once you have used it.
          </p>

          <div className="fa-roles" role="tablist" aria-label="Versions">
            {VERSIONS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={ver === x.id}
                className={`fa-chip ${ver === x.id ? 'is-on' : ''}`}
                onClick={() => setVer(x.id)}
              >
                {x.name.split(':')[0]}
              </button>
            ))}
          </div>

          <div className="fa-panel fa-version">
            <div className="fa-version-head">
              <h3>{v.name}</h3>
              {v.tag && <span className="fa-tag">{v.tag}</span>}
            </div>
            <p>{v.summary}</p>
            <dl className="fa-figures">
              <div>
                <dt>Build time</dt>
                <dd>
                  <Ph>{v.weeks}</Ph>
                </dd>
              </div>
              <div>
                <dt>Build price</dt>
                <dd>
                  <Ph>{v.build}</Ph>
                </dd>
              </div>
              <div>
                <dt>Running cost</dt>
                <dd>
                  <Ph>{v.running}</Ph>
                </dd>
              </div>
            </dl>
            <ul className="fa-list">
              {v.includes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2>Running costs</h2>
          <p>
            These are paid to the service providers, not to me. I keep them as
            low as the features allow, and I will set them up in the
            academy’s name so you stay in control.
          </p>
          <div className="fa-table fa-table-4">
            <div className="fa-row fa-row-head">
              <div>Item</div>
              <div>Needed from</div>
              <div>Estimate</div>
              <div>Paid by</div>
            </div>
            {COSTS.map((c) => (
              <div className="fa-row" key={c.item}>
                <div className="fa-cell-strong">{c.item}</div>
                <div className="fa-cell-muted">{c.when}</div>
                <div>
                  <Ph>{c.cost}</Ph>
                </div>
                <div>
                  <Ph>{c.payer}</Ph>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>How the work and payments run</h2>
          <ol className="fa-steps">
            {MILESTONES.map((m) => (
              <li key={m.title}>
                <div>
                  <strong>{m.title}</strong>
                  <p>{m.detail}</p>
                </div>
                <div className="fa-pay">
                  {m.pay === 'Included' ? m.pay : <Ph>{m.pay}</Ph>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>What I need from you</h2>
          <ul className="fa-list">
            {NEEDS.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Terms</h2>
          <ul className="fa-list">
            {TERMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="fa-muted">
            This proposal is valid until <Ph>{CFG.validUntil}</Ph>.
          </p>
        </section>

        <footer className="fa-foot">
          <h2>Next step</h2>
          <p>
            Tell me which version you want to start with and which fee model
            you use, and I will send the final scope for sign-off.
          </p>
          <p>
            {CFG.preparedBy}, {CFG.company}
            <br />
            <a href={`mailto:${CFG.email}`}>{CFG.email}</a> ·{' '}
            <Ph>{CFG.phone}</Ph>
          </p>
        </footer>
      </main>
    </div>
  );
}

const css = `
.fa-root{
  --paper:#F4F6F5; --ink:#12201C; --muted:#55645F; --line:#CBD5D1;
  --accent:#0E6B5C; --accent-soft:#DCEBE7; --mark:#FFE27A; --margin:#E39A9A;
  position:relative; z-index:10; min-height:100vh;
  background:var(--paper); color:var(--ink);
  font-family:var(--fa-body),Georgia,serif; font-size:18px; line-height:1.7;
}
.fa-root *{box-sizing:border-box}
.fa-banner{
  background:var(--mark); color:#3A2F00; text-align:center;
  padding:.55rem 1rem; font-size:.9rem; line-height:1.4;
  font-family:var(--fa-display),system-ui,sans-serif;
}
.fa-page{
  max-width:860px; margin:0 auto; padding:3rem 1.25rem 5rem 2.25rem;
  border-left:1px solid var(--margin);
}
@media (min-width:900px){ .fa-page{margin-left:max(2rem,calc(50vw - 430px)); padding-left:3rem} }
.fa-root h1,.fa-root h2,.fa-root h3,.fa-root .fa-meta,.fa-root button,
.fa-root .fa-row-head,.fa-root dt,.fa-root .fa-tag{
  font-family:var(--fa-display),system-ui,sans-serif;
}
.fa-root h1{font-size:clamp(2rem,6vw,3.4rem); line-height:1.08; letter-spacing:-.025em; margin:.6rem 0 1.2rem; font-weight:700}
.fa-root h2{font-size:1.55rem; letter-spacing:-.015em; margin:0 0 .6rem; font-weight:700}
.fa-root h3{font-size:1.2rem; margin:0; font-weight:700}
.fa-root section{margin-top:3.5rem}
.fa-root p{margin:.4rem 0 1rem; max-width:62ch}
.fa-meta{font-size:.92rem; color:var(--muted); margin:0}
.fa-lead{font-size:1.25rem; line-height:1.55}
.fa-muted{color:var(--muted)}
.fa-root a{color:var(--accent)}
.fa-demo{display:inline-block;background:var(--accent);color:#fff!important;text-decoration:none;padding:.6rem 1.2rem;border-radius:999px;font-family:var(--fa-display),system-ui,sans-serif;font-weight:600;font-size:1rem}
.fa-ph{background:var(--mark); padding:0 .25em; border-radius:3px; box-decoration-break:clone; -webkit-box-decoration-break:clone}

.fa-loop{display:grid; grid-template-columns:repeat(4,1fr); gap:.5rem; margin-top:1.4rem}
.fa-step{
  text-align:left; cursor:pointer; padding:.9rem .9rem 1rem; border:1.5px solid var(--line);
  background:transparent; color:var(--ink); border-radius:10px; display:flex; flex-direction:column; gap:.25rem;
  transition:background .15s,border-color .15s;
}
.fa-step:hover{border-color:var(--accent)}
.fa-step.is-on{background:var(--accent); border-color:var(--accent); color:#fff}
.fa-step-note{font-size:.8rem; opacity:.75}
.fa-step-title{font-size:1.02rem; font-weight:600; line-height:1.25}
.fa-loopback{font-size:.9rem; color:var(--muted); margin:.6rem 0 1.4rem}
@media (max-width:640px){ .fa-loop{grid-template-columns:1fr 1fr} }

.fa-roles{display:flex; flex-wrap:wrap; gap:.5rem; margin:1rem 0}
.fa-chip{
  cursor:pointer; padding:.45rem 1rem; border-radius:999px; border:1.5px solid var(--line);
  background:transparent; color:var(--ink); font-size:.95rem; transition:background .15s,border-color .15s;
}
.fa-chip:hover{border-color:var(--accent)}
.fa-chip.is-on{background:var(--ink); border-color:var(--ink); color:var(--paper)}
.fa-root button:focus-visible,.fa-root a:focus-visible{outline:3px solid var(--accent); outline-offset:2px}

.fa-panel{background:var(--accent-soft); border-radius:12px; padding:1.1rem 1.3rem; margin-top:.4rem}
.fa-panel p{margin-bottom:.2rem}
.fa-version{background:#fff; border:1.5px solid var(--line)}
.fa-version-head{display:flex; align-items:center; gap:.8rem; flex-wrap:wrap}
.fa-tag{font-size:.8rem; background:var(--accent); color:#fff; padding:.15rem .6rem; border-radius:999px}
.fa-figures{display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin:1rem 0; padding:1rem 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line)}
.fa-figures dt{font-size:.82rem; color:var(--muted)}
.fa-figures dd{margin:.15rem 0 0; font-size:1.1rem; font-weight:600}
@media (max-width:640px){ .fa-figures{grid-template-columns:1fr} }

.fa-list{padding-left:1.2rem; margin:.6rem 0}
.fa-list li{margin:.3rem 0; padding-left:.2rem; max-width:62ch}
.fa-list li::marker{color:var(--accent)}

.fa-table{border-top:1px solid var(--line); margin-top:1rem}
.fa-row{display:grid; grid-template-columns:7rem 1fr 10rem; gap:1rem; padding:.8rem 0; border-bottom:1px solid var(--line); font-size:.98rem; line-height:1.5}
.fa-table-4 .fa-row{grid-template-columns:1.3fr .8fr 1.2fr .8fr}
.fa-row-head{font-size:.85rem; color:var(--muted); font-weight:600}
.fa-cell-strong{font-weight:600}
.fa-cell-muted{color:var(--muted)}
@media (max-width:640px){
  .fa-row,.fa-table-4 .fa-row{grid-template-columns:1fr; gap:.15rem}
  .fa-row-head{display:none}
}

.fa-steps{list-style:none; padding:0; margin:1rem 0 0; border-top:1px solid var(--line)}
.fa-steps li{display:flex; justify-content:space-between; gap:1.5rem; padding:1rem 0; border-bottom:1px solid var(--line)}
.fa-steps p{margin:.2rem 0 0; color:var(--muted); font-size:.98rem}
.fa-pay{font-family:var(--fa-display),system-ui,sans-serif; font-weight:600; white-space:nowrap}

.fa-foot{margin-top:4rem; padding-top:2rem; border-top:2px solid var(--ink)}

@media (prefers-reduced-motion:reduce){ .fa-step,.fa-chip{transition:none} }
`;
