'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bricolage_Grotesque, Source_Serif_4 } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--fd-display', display: 'swap' });
const body = Source_Serif_4({ subsets: ['latin'], variable: '--fd-body', display: 'swap' });

/* ---------------- types and sample data (all fake) ---------------- */

type Mark = 'P' | 'A' | 'L';
type Screen = 'dashboard' | 'attendance' | 'fees' | 'students';
type Payment = { date: string; amount: number; method: string };
type Cls = { id: string; name: string; tutor: string; when: string; fee: number };
type Student = {
  id: number;
  name: string;
  parent: string;
  phone: string;
  classes: string[];
  balance: number;
  history: Mark[];
  payments: Payment[];
};
type Activity = { text: string; time: string };

const CLASSES: Cls[] = [
  { id: 'c1', name: 'Form 3 Maths', tutor: 'Mr Kebonang', when: '15:00', fee: 450 },
  { id: 'c2', name: 'Form 5 Physics', tutor: 'Ms Lebogang', when: '16:00', fee: 500 },
  { id: 'c3', name: 'Std 7 English', tutor: 'Ms Pelonomi', when: '14:00', fee: 350 },
  { id: 'c4', name: 'Form 1 Science', tutor: 'Ms Lebogang', when: '17:00', fee: 400 },
  { id: 'c5', name: 'Form 4 Add Maths', tutor: 'Mr Seretse', when: '17:30', fee: 550 },
];

const NAMES = [
  'Kabo Mogapi', 'Neo Sebego', 'Tshepo Molefe', 'Lesedi Kgosi', 'Boitumelo Modise',
  'Thato Tau', 'Mpho Ramotswe', 'Onalenna Mosweu', 'Kitso Dintwe', 'Refilwe Mogapi',
  'Tumelo Sebego', 'Kagiso Molefe', 'Naledi Kgosi', 'Gape Modise', 'Lorato Tau',
  'Keabetswe Ramotswe', 'Omphile Mosweu', 'Tebogo Dintwe', 'Masego Mogapi', 'Thabo Sebego',
  'Atang Molefe', 'Goitseone Kgosi', 'Karabo Modise', 'Resego Tau', 'Oratile Ramotswe',
];

const MONTHS_OWED = [0, 0, 1, 0, 2, 0, 0, 3, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 3, 0, 1, 0, 2, 0, 0];

const feeOf = (s: Pick<Student, 'classes'>) =>
  s.classes.reduce((t, id) => t + (CLASSES.find((c) => c.id === id)?.fee ?? 0), 0);

function seedStudents(): Student[] {
  return NAMES.map((name, i) => {
    const classes = [CLASSES[i % 5].id];
    if (i % 3 === 0) classes.push(CLASSES[(i + 2) % 5].id);
    const fee = feeOf({ classes });
    const owed = MONTHS_OWED[i];
    const surname = name.split(' ')[1];
    const history: Mark[] = Array.from({ length: 8 }, (_, j) => {
      const r = (i * 7 + j * 5) % 13;
      return r === 0 ? 'A' : r === 1 ? 'L' : 'P';
    });
    const payments: Payment[] = owed === 0
      ? [{ date: `${2 + (i % 6)} Oct`, amount: fee, method: i % 2 ? 'Bank transfer' : 'Cash' }]
      : [{ date: `${4 + (i % 5)} Aug`, amount: fee, method: 'Mobile money' }];
    return {
      id: i + 1,
      name,
      parent: `${i % 2 ? 'Mr' : 'Mrs'} ${surname}`,
      phone: `7${1 + (i % 7)} ${100 + i * 17} ${200 + i * 13}`,
      classes,
      balance: owed * fee,
      history,
      payments,
    };
  });
}

const seedCollected = (list: Student[]) =>
  list.filter((s) => s.balance === 0).reduce((t, s) => t + feeOf(s), 0);

const SEED_ACTIVITY: Activity[] = [
  { text: 'Ms Lebogang marked Form 1 Science: 11 present, 1 absent', time: '08:05' },
  { text: 'Payment of P450 recorded for Tumelo Sebego', time: 'Yesterday' },
];

const fmt = (n: number) => `P${n.toLocaleString('en-US')}`;
const statusOf = (s: Student) => (s.balance === 0 ? 'Paid up' : s.balance <= feeOf(s) ? 'Due' : 'Overdue');
const nowTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const SCREENS: { id: Screen; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'fees', label: 'Fees' },
  { id: 'students', label: 'Students' },
];

/* ---------------- component ---------------- */

export default function Demo() {
  const [students, setStudents] = useState<Student[]>(seedStudents);
  const [marks, setMarks] = useState<Record<string, Record<number, Mark>>>({});
  const [collected, setCollected] = useState(() => seedCollected(seedStudents()));
  const [activity, setActivity] = useState<Activity[]>(SEED_ACTIVITY);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [clsId, setClsId] = useState('c1');
  const [filter, setFilter] = useState<'All' | 'Overdue' | 'Paid up'>('All');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [newCls, setNewCls] = useState('c1');
  const [toast, setToast] = useState('');
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const log = (text: string) => setActivity((a) => [{ text, time: nowTime() }, ...a].slice(0, 6));
  const enrolled = (id: string) => students.filter((s) => s.classes.includes(id));
  const className = (id: string) => CLASSES.find((c) => c.id === id)?.name ?? '';

  /* derived numbers */
  let attended = 0;
  let total = 0;
  students.forEach((s) => s.history.forEach((m) => { total++; if (m !== 'A') attended++; }));
  Object.values(marks).forEach((cm) => Object.values(cm).forEach((m) => { total++; if (m !== 'A') attended++; }));
  const rate = total ? Math.round((attended / total) * 100) : 0;
  const slots = CLASSES.reduce((t, c) => t + enrolled(c.id).length, 0);
  const markedToday = Object.values(marks).reduce((t, cm) => t + Object.keys(cm).length, 0);
  const totalOwed = students.reduce((t, s) => t + s.balance, 0);
  const overdueCount = students.filter((s) => statusOf(s) === 'Overdue').length;

  /* actions */
  const setMark = (cid: string, s: Student, m: Mark) => {
    setMarks((p) => ({ ...p, [cid]: { ...(p[cid] ?? {}), [s.id]: m } }));
    log(`Admin marked ${s.name} ${m === 'P' ? 'present' : m === 'A' ? 'absent' : 'late'} in ${className(cid)}`);
  };
  const markAll = (cid: string) => {
    const all: Record<number, Mark> = {};
    enrolled(cid).forEach((s) => { all[s.id] = 'P'; });
    setMarks((p) => ({ ...p, [cid]: all }));
    log(`Admin marked everyone present in ${className(cid)}`);
    setToast('Everyone marked present');
  };
  const openPay = (s: Student) => {
    setPayFor(payFor === s.id ? null : s.id);
    setAmount(String(s.balance || feeOf(s)));
    setMethod('Cash');
  };
  const recordPayment = (s: Student) => {
    const paid = Math.max(0, Math.round(Number(amount)));
    if (!paid) { setToast('Enter an amount to record'); return; }
    setStudents((list) => list.map((x) => x.id === s.id
      ? { ...x, balance: Math.max(0, x.balance - paid), payments: [{ date: 'Today', amount: paid, method }, ...x.payments] }
      : x));
    setCollected((c) => c + paid);
    log(`Payment of ${fmt(paid)} recorded for ${s.name} (${method})`);
    setToast(`${fmt(paid)} recorded for ${s.name}`);
    setPayFor(null);
  };
  const addStudent = () => {
    if (!newName.trim()) { setToast('Enter the student’s name'); return; }
    const fee = feeOf({ classes: [newCls] });
    const id = Math.max(...students.map((s) => s.id)) + 1;
    setStudents((l) => [{ id, name: newName.trim(), parent: newParent.trim() || 'Parent', phone: '', classes: [newCls], balance: fee, history: [], payments: [] }, ...l]);
    log(`Admin added ${newName.trim()} to ${className(newCls)}`);
    setToast(`${newName.trim()} added to ${className(newCls)}`);
    setNewName('');
    setNewParent('');
  };
  const reset = () => {
    const fresh = seedStudents();
    setStudents(fresh); setMarks({}); setCollected(seedCollected(fresh)); setActivity(SEED_ACTIVITY);
    setOpenId(null); setPayFor(null); setToast('Demo reset');
  };
  const goPay = (s: Student) => { setScreen('fees'); setFilter('All'); setPayFor(s.id); setAmount(String(s.balance || feeOf(s))); setMethod('Cash'); };

  const badge = (s: Student) => <span className={`fd-badge b-${statusOf(s).replace(' ', '').toLowerCase()}`}>{statusOf(s)}</span>;
  const dots = (s: Student) => s.history.length
    ? <div className="fd-dots" aria-label="Last sessions">{s.history.map((m, i) => <span key={i} className={`fd-dot d-${m}`} title={m === 'P' ? 'Present' : m === 'A' ? 'Absent' : 'Late'}>{m}</span>)}</div>
    : <span className="fd-muted">New student, no sessions yet</span>;

  const open = students.find((s) => s.id === openId) ?? null;
  const q = query.trim().toLowerCase();
  const shown = students.filter((s) => !q || s.name.toLowerCase().includes(q) || s.parent.toLowerCase().includes(q));
  const feeList = students.filter((s) => filter === 'All' || (filter === 'Overdue' ? statusOf(s) === 'Overdue' : s.balance === 0));

  return (
    <div className={`fd-root ${display.variable} ${body.variable}`}>
      <style>{css}</style>

      <div className="fd-banner">
        <span>Demo with sample data. Nothing here is saved.</span>
        <button onClick={reset}>Reset demo</button>
        <Link href="/projects/fergieAcademy/managementapp">Back to proposal</Link>
      </div>

      <header className="fd-head">
        <div>
          <h1>Fergie Academy</h1>
          <p className="fd-muted">{today || 'Admin'}</p>
        </div>
      </header>

      <nav className="fd-nav" aria-label="Sections">
        {SCREENS.map((s) => (
          <button key={s.id} className={screen === s.id ? 'is-on' : ''} aria-current={screen === s.id ? 'page' : undefined}
            onClick={() => { setScreen(s.id); setOpenId(null); }}>
            {s.label}
          </button>
        ))}
      </nav>

      <main className="fd-main">
        {screen === 'dashboard' && (
          <>
            <div className="fd-stats">
              <div className="fd-stat"><span>Attendance rate</span><b>{rate}%</b></div>
              <div className="fd-stat"><span>Marked today</span><b>{markedToday}<small>/{slots}</small></b></div>
              <div className="fd-stat"><span>Collected this month</span><b>{fmt(collected)}</b></div>
              <div className="fd-stat warn"><span>Owed</span><b>{fmt(totalOwed)}</b><small>{overdueCount} overdue</small></div>
            </div>

            <h2>Today’s classes</h2>
            <div className="fd-list">
              {CLASSES.map((c) => {
                const n = enrolled(c.id).length;
                const done = Object.keys(marks[c.id] ?? {}).length;
                return (
                  <button key={c.id} className="fd-item" onClick={() => { setClsId(c.id); setScreen('attendance'); }}>
                    <div><b>{c.name}</b><span className="fd-muted">{c.when} · {c.tutor}</span></div>
                    <span className={`fd-prog ${done === n && n ? 'full' : ''}`}>{done === n && n ? 'Marked' : `${done}/${n} marked`}</span>
                  </button>
                );
              })}
            </div>

            <h2>Recent activity</h2>
            <ul className="fd-log">
              {activity.slice(0, 5).map((a, i) => <li key={i}><span>{a.text}</span><time>{a.time}</time></li>)}
            </ul>
          </>
        )}

        {screen === 'attendance' && (
          <>
            <div className="fd-chips" role="tablist" aria-label="Classes">
              {CLASSES.map((c) => (
                <button key={c.id} role="tab" aria-selected={clsId === c.id} className={clsId === c.id ? 'is-on' : ''} onClick={() => setClsId(c.id)}>{c.name}</button>
              ))}
            </div>
            <div className="fd-bar">
              <span className="fd-muted">{CLASSES.find((c) => c.id === clsId)?.tutor} · {CLASSES.find((c) => c.id === clsId)?.when}</span>
              <button className="fd-btn" onClick={() => markAll(clsId)}>Mark all present</button>
            </div>
            <div className="fd-list">
              {enrolled(clsId).map((s) => {
                const m = marks[clsId]?.[s.id];
                return (
                  <div key={s.id} className="fd-item static">
                    <b>{s.name}</b>
                    <div className="fd-seg" role="group" aria-label={`Attendance for ${s.name}`}>
                      {(['P', 'L', 'A'] as Mark[]).map((k) => (
                        <button key={k} className={`s-${k} ${m === k ? 'is-on' : ''}`} aria-pressed={m === k} onClick={() => setMark(clsId, s, k)}>
                          {k === 'P' ? 'Present' : k === 'L' ? 'Late' : 'Absent'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {screen === 'fees' && (
          <>
            <div className="fd-chips" role="tablist" aria-label="Filter">
              {(['All', 'Overdue', 'Paid up'] as const).map((f) => (
                <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
            <div className="fd-list">
              {feeList.length === 0 && <p className="fd-muted">No students in this list.</p>}
              {feeList.map((s) => (
                <div key={s.id} className="fd-card">
                  <div className="fd-item static">
                    <div><b>{s.name}</b><span className="fd-muted">{s.classes.map(className).join(', ')}</span></div>
                    <div className="fd-right"><b>{fmt(s.balance)}</b>{badge(s)}</div>
                  </div>
                  <div className="fd-actions">
                    <button className="fd-btn" onClick={() => openPay(s)}>Record payment</button>
                    {s.balance > 0 && (
                      <button className="fd-btn ghost" onClick={() => setToast(`Reminder to ${s.parent} (WhatsApp reminders come in Version 2)`)}>Send reminder</button>
                    )}
                  </div>
                  {payFor === s.id && (
                    <div className="fd-pay">
                      <label>Amount (P)<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} /></label>
                      <label>Method
                        <select value={method} onChange={(e) => setMethod(e.target.value)}>
                          <option>Cash</option><option>Bank transfer</option><option>Mobile money</option>
                        </select>
                      </label>
                      <button className="fd-btn solid" onClick={() => recordPayment(s)}>Save payment</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {screen === 'students' && !open && (
          <>
            <input className="fd-search" type="search" placeholder="Search students or parents" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
            <details className="fd-add">
              <summary>Add a student</summary>
              <div className="fd-pay">
                <label>Student name<input value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
                <label>Parent name<input value={newParent} onChange={(e) => setNewParent(e.target.value)} /></label>
                <label>Class
                  <select value={newCls} onChange={(e) => setNewCls(e.target.value)}>
                    {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <button className="fd-btn solid" onClick={addStudent}>Add student</button>
              </div>
            </details>
            <div className="fd-list">
              {shown.map((s) => (
                <button key={s.id} className="fd-item" onClick={() => setOpenId(s.id)}>
                  <div><b>{s.name}</b><span className="fd-muted">{s.classes.map(className).join(', ')}</span></div>
                  {badge(s)}
                </button>
              ))}
              {shown.length === 0 && <p className="fd-muted">No match. Try another name.</p>}
            </div>
          </>
        )}

        {screen === 'students' && open && (
          <div className="fd-profile">
            <button className="fd-back" onClick={() => setOpenId(null)}>Back to students</button>
            <h2>{open.name}</h2>
            <p className="fd-muted">Parent: {open.parent}{open.phone ? ` · ${open.phone}` : ''}</p>
            <div className="fd-stats two">
              <div className="fd-stat"><span>Balance</span><b>{fmt(open.balance)}</b>{badge(open)}</div>
              <div className="fd-stat"><span>Monthly fee</span><b>{fmt(feeOf(open))}</b></div>
            </div>
            <h3>Classes</h3>
            <p>{open.classes.map(className).join(', ')}</p>
            <h3>Recent attendance</h3>
            {dots(open)}
            <h3>Payments</h3>
            {open.payments.length === 0 && <p className="fd-muted">No payments yet.</p>}
            <ul className="fd-log">
              {open.payments.map((p, i) => <li key={i}><span>{fmt(p.amount)} · {p.method}</span><time>{p.date}</time></li>)}
            </ul>
            <button className="fd-btn solid" onClick={() => goPay(open)}>Record payment</button>
          </div>
        )}
      </main>

      {toast && <div className="fd-toast" role="status">{toast}</div>}
    </div>
  );
}

const css = `
.fd-root{--paper:#F4F6F5;--ink:#12201C;--muted:#55645F;--line:#CBD5D1;--accent:#0E6B5C;--soft:#DCEBE7;
  position:relative;z-index:10;min-height:100vh;background:var(--paper);color:var(--ink);
  font-family:var(--fd-body),Georgia,serif;font-size:17px;line-height:1.5;padding-bottom:5.5rem}
.fd-root *{box-sizing:border-box}
.fd-root h1,.fd-root h2,.fd-root h3,.fd-root button,.fd-root input,.fd-root select,.fd-root label,.fd-root .fd-badge,
.fd-root .fd-stat span,.fd-root summary{font-family:var(--fd-display),system-ui,sans-serif}
.fd-root h1{font-size:1.6rem;margin:0;letter-spacing:-.02em}
.fd-root h2{font-size:1.15rem;margin:1.8rem 0 .6rem}
.fd-root h3{font-size:.95rem;margin:1.2rem 0 .3rem}
.fd-root p{margin:.2rem 0}
.fd-muted{color:var(--muted);font-size:.9rem}
.fd-banner{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;justify-content:center;background:#FFE27A;color:#3A2F00;padding:.5rem 1rem;font-size:.88rem;font-family:var(--fd-display),system-ui,sans-serif}
.fd-banner button,.fd-banner a{background:none;border:0;color:#3A2F00;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
.fd-head{max-width:760px;margin:0 auto;padding:1.4rem 1.1rem .4rem}
.fd-nav{position:fixed;left:0;right:0;bottom:0;z-index:20;display:grid;grid-template-columns:repeat(4,1fr);background:#fff;border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0)}
.fd-nav button{border:0;background:none;padding:.9rem .2rem;font-size:.9rem;color:var(--muted);cursor:pointer}
.fd-nav button.is-on{color:var(--accent);font-weight:700;box-shadow:inset 0 3px 0 var(--accent)}
@media(min-width:760px){
  .fd-nav{position:static;max-width:760px;margin:0 auto;border:0;border-bottom:1px solid var(--line);background:none;display:flex;gap:1.5rem;padding:0 1.1rem}
  .fd-nav button{padding:.7rem 0;font-size:1rem}
  .fd-nav button.is-on{box-shadow:inset 0 -3px 0 var(--accent)}
  .fd-root{padding-bottom:3rem}
}
.fd-main{max-width:760px;margin:0 auto;padding:.6rem 1.1rem 2rem}
.fd-stats{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.8rem}
.fd-stats.two{margin-top:.4rem}
@media(min-width:760px){.fd-stats:not(.two){grid-template-columns:repeat(4,1fr)}}
.fd-stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:.8rem .9rem;display:flex;flex-direction:column;gap:.1rem}
.fd-stat span{font-size:.8rem;color:var(--muted)}
.fd-stat b{font-family:var(--fd-display),system-ui,sans-serif;font-size:1.45rem;letter-spacing:-.02em}
.fd-stat small{font-size:.8rem;color:var(--muted);font-family:var(--fd-display),system-ui,sans-serif}
.fd-stat.warn{background:#FBEDE9;border-color:#EFC9C0}
.fd-list{display:flex;flex-direction:column;gap:.5rem}
.fd-card{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.fd-item{display:flex;justify-content:space-between;align-items:center;gap:.8rem;width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:12px;padding:.8rem .9rem;color:var(--ink);font-size:1rem;cursor:pointer}
.fd-item b{display:block;font-family:var(--fd-display),system-ui,sans-serif;font-weight:600}
.fd-item.static{cursor:default;border:0;border-radius:0}
.fd-card .fd-item.static{background:none}
.fd-item:not(.static):hover{border-color:var(--accent)}
.fd-right{display:flex;flex-direction:column;align-items:flex-end;gap:.2rem}
.fd-prog{font-size:.82rem;color:var(--muted);font-family:var(--fd-display),system-ui,sans-serif;white-space:nowrap}
.fd-prog.full{color:var(--accent);font-weight:600}
.fd-badge{font-size:.75rem;padding:.1rem .55rem;border-radius:999px;font-weight:600;white-space:nowrap}
.b-paidup{background:var(--soft);color:var(--accent)}
.b-due{background:#FFF0B8;color:#6B5200}
.b-overdue{background:#F8D7D2;color:#8A2C20}
.fd-chips{display:flex;gap:.4rem;overflow-x:auto;padding:.8rem 0 .4rem}
.fd-chips button{flex:none;border:1.5px solid var(--line);background:none;border-radius:999px;padding:.35rem .9rem;font-size:.9rem;cursor:pointer;color:var(--ink)}
.fd-chips button.is-on{background:var(--ink);border-color:var(--ink);color:var(--paper)}
.fd-bar{display:flex;justify-content:space-between;align-items:center;gap:.6rem;margin:.4rem 0 .8rem;flex-wrap:wrap}
.fd-btn{border:1.5px solid var(--accent);background:none;color:var(--accent);border-radius:8px;padding:.45rem .9rem;font-size:.9rem;cursor:pointer;font-weight:600}
.fd-btn.solid{background:var(--accent);color:#fff}
.fd-btn.ghost{border-color:var(--line);color:var(--muted)}
.fd-actions{display:flex;gap:.5rem;padding:0 .9rem .8rem;flex-wrap:wrap}
.fd-seg{display:flex;border:1.5px solid var(--line);border-radius:8px;overflow:hidden;flex:none}
.fd-seg button{border:0;border-right:1px solid var(--line);background:#fff;padding:.4rem .6rem;font-size:.82rem;cursor:pointer;color:var(--muted)}
.fd-seg button:last-child{border-right:0}
.fd-seg .s-P.is-on{background:var(--accent);color:#fff}
.fd-seg .s-L.is-on{background:#E0A800;color:#2b2000}
.fd-seg .s-A.is-on{background:#B7402F;color:#fff}
.fd-pay{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-end;padding:.8rem .9rem;background:var(--soft)}
.fd-pay label{display:flex;flex-direction:column;gap:.2rem;font-size:.8rem;color:var(--muted)}
.fd-pay input,.fd-pay select,.fd-search{border:1.5px solid var(--line);border-radius:8px;padding:.45rem .6rem;font-size:1rem;background:#fff;color:var(--ink);min-width:0}
.fd-search{width:100%;margin:.8rem 0 .5rem}
.fd-add{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:.6rem;overflow:hidden}
.fd-add summary{padding:.7rem .9rem;cursor:pointer;font-weight:600;font-size:.95rem}
.fd-log{list-style:none;padding:0;margin:0;border-top:1px solid var(--line)}
.fd-log li{display:flex;justify-content:space-between;gap:1rem;padding:.6rem 0;border-bottom:1px solid var(--line);font-size:.92rem}
.fd-log time{color:var(--muted);white-space:nowrap;font-size:.85rem}
.fd-dots{display:flex;gap:.3rem;margin:.3rem 0}
.fd-dot{width:1.7rem;height:1.7rem;border-radius:6px;display:grid;place-items:center;font-size:.78rem;font-weight:700;font-family:var(--fd-display),system-ui,sans-serif}
.d-P{background:var(--soft);color:var(--accent)}
.d-L{background:#FFF0B8;color:#6B5200}
.d-A{background:#F8D7D2;color:#8A2C20}
.fd-back{border:0;background:none;color:var(--accent);cursor:pointer;padding:.8rem 0 0;font-size:.9rem}
.fd-profile .fd-btn{margin-top:1.2rem}
.fd-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:5rem;z-index:30;background:var(--ink);color:#fff;padding:.6rem 1rem;border-radius:10px;font-size:.9rem;max-width:90vw;text-align:center;font-family:var(--fd-display),system-ui,sans-serif}
@media(min-width:760px){.fd-toast{bottom:2rem}}
.fd-root button:focus-visible,.fd-root input:focus-visible,.fd-root select:focus-visible,.fd-root summary:focus-visible,.fd-root a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
`;
