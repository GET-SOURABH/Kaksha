/* Kaksha class register — app logic.
   Ported from the original single-file HTML prototype to TypeScript.
   startKaksha() draws the app into `root` and returns a cleanup function. */

import { builtInSheet, type Sheet } from "./sheets";

/* ---------- types ---------- */
type Sub = "lit" | "math";
type LevelKey = "base" | "now";

interface Student {
  id: string;
  roll: number;
  name: string;
  phone: string;
  remark: string;
}
interface Test {
  id: string;
  name: string;
  subject: string;
  max: number;
  date: string;
  marks: Record<string, number | null>;
}
interface LevelRec {
  base: number;
  now: number;
}
type Levels = Record<Sub, Record<string, LevelRec>>;
interface State {
  teacher: { name: string; email: string };
  cls: { school: string; grade: string; section: string; year: string };
  students: Student[];
  attendance: Record<string, Record<string, boolean>>;
  tests: Test[];
  ll: Levels;
  llBase: string | null;
  llDate: string | null;
  sample: boolean;
  sheets?: Record<string, Sheet>; // practice sheets, key = "lit:2" (subject:level)
  plans?: Record<string, DayPlan>; // daily plans by date
  todos?: Todo[];
  dismissed?: string[]; // suggested tasks the teacher dismissed
  ptmDate?: string;
  ptmNotes?: Record<string, string>; // parent meeting notes by student id
}
interface PlanRow {
  id: string;
  time: string;
  subject: string;
  topic: string;
  done: boolean;
}
interface DayPlan {
  rows: PlanRow[];
  note: string;
}
interface Todo {
  id: string;
  text: string;
  done: boolean;
  due: string; // yyyy-mm-dd or ""
  key?: string; // set when it came from a suggestion
}
type AgTab = "plan" | "todo" | "ptm";
interface SubjectTotal {
  subject: string;
  got: number;
  max: number;
  abs: number;
}
type Tone = "good" | "warn" | "bad" | "na";
type View = "home" | "students" | "student" | "attendance" | "tests" | "test" | "skills" | "sheets" | "reports" | "remarks" | "agenda";

export function startKaksha(root: HTMLElement, toastEl: HTMLElement): () => void {
  /* ---------- helpers ---------- */
  const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s: unknown): string {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  }
  function rng(seed: number): () => number {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function iso(d: Date): string {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  const TODAY = iso(new Date());
  function fmt(s: string): string {
    return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtShort(s: string): string {
    return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  function initials(n: string): string {
    return n
      .split(/\s+/)
      .map((w) => w[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  let toastT: ReturnType<typeof setTimeout> | undefined;
  function toast(msg: string): void {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      toastEl.hidden = true;
    }, 2600);
  }
  function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  const NAMES = ["Aarav Shinde", "Ananya Patil", "Arjun Kamble", "Ayesha Shaikh", "Bhavna Jadhav", "Chirag More", "Deepika Gaikwad", "Farhan Ansari", "Gauri Pawar", "Harsh Salunkhe", "Ishita Waghmare", "Jay Bhosale", "Kavya Mane", "Lakshmi Naik", "Mohit Chavan", "Nandini Kale", "Om Sawant", "Pooja Thorat", "Rahul Lokhande", "Riya Deshmukh", "Sahil Khan", "Sana Qureshi", "Siddharth Ghule", "Sneha Kadam", "Tanvi Shirke", "Umar Siddiqui", "Vaishnavi Pandit", "Vedant Jagtap", "Yash Dhumal", "Zoya Mulla"];

  /* TFI-style learning levels: each student's reading and maths level as a grade level, in half-grade steps.
     TFI's public goal is that students grow 1.5 levels in a year; reading is reported as at/above grade, 1-2 years behind, 3+ years behind. */
  const SUBJ: Record<Sub, string> = { lit: "Reading", math: "Maths" };
  const SUBS: Sub[] = ["lit", "math"];
  const GOAL = 1.5;
  function emptyLL(): Levels {
    return { lit: {}, math: {} };
  }

  function sampleState(): State {
    const r = rng(42);
    const students: Student[] = NAMES.map((n, i) => ({
      id: "s" + (i + 1),
      roll: i + 1,
      name: n,
      phone: "98" + String(Math.floor(r() * 1e8)).padStart(8, "0"),
      remark: "",
    }));
    const ability: Record<string, number> = {};
    const presence: Record<string, number> = {};
    students.forEach((s) => {
      ability[s.id] = 0.4 + r() * 0.55;
      presence[s.id] = 0.72 + r() * 0.27;
    });
    ability.s9 = 0.28;
    presence.s9 = 0.64;
    ability.s23 = 0.33;
    presence.s17 = 0.66;
    presence.s26 = 0.7;
    const attendance: State["attendance"] = {};
    const d = new Date();
    let count = 0;
    d.setDate(d.getDate() - 1);
    while (count < 42) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) {
        const k = iso(d);
        attendance[k] = {};
        students.forEach((s) => {
          attendance[k][s.id] = r() < presence[s.id];
        });
        count++;
      }
      d.setDate(d.getDate() - 1);
    }
    const defs: [string, string, number, number][] = [
      ["Unit Test 1", "Maths", 25, -52],
      ["Unit Test 1", "English", 25, -51],
      ["Unit Test 1", "Hindi", 25, -50],
      ["Unit Test 1", "EVS", 25, -49],
      ["Unit Test 2", "Maths", 25, -17],
      ["Unit Test 2", "English", 25, -16],
      ["Unit Test 2", "Hindi", 25, -15],
    ];
    const tests: Test[] = defs.map((t, i) => {
      const dd = new Date();
      dd.setDate(dd.getDate() + t[3]);
      const marks: Test["marks"] = {};
      students.forEach((s) => {
        if (r() < 0.03) {
          marks[s.id] = null;
          return;
        }
        let v = ability[s.id] + (r() - 0.5) * 0.3;
        v = Math.max(0.05, Math.min(1, v));
        marks[s.id] = Math.round(v * t[2]);
      });
      return { id: "t" + (i + 1), name: t[0], subject: t[1], max: t[2], date: iso(dd), marks };
    });
    const ll = emptyLL();
    SUBS.forEach((sub) => {
      students.forEach((s) => {
        const b = Math.round(Math.max(0, Math.min(5, ability[s.id] * 5.2 - 0.9 + (r() - 0.5) * 1.2)) * 2) / 2;
        const g = Math.round(Math.max(0, Math.min(2, ability[s.id] * 1.9 - 0.2 + (r() - 0.5) * 0.8)) * 2) / 2;
        ll[sub][s.id] = { base: b, now: Math.min(8, b + g) };
      });
    });
    const bd = new Date();
    bd.setDate(bd.getDate() - 118);
    const sd = new Date();
    sd.setDate(sd.getDate() - 3);
    return {
      teacher: { name: "Neha", email: "neha.sample@kaksha.in" },
      cls: { school: "Gangotri Public School", grade: "4", section: "A", year: "2026–27" },
      students,
      attendance,
      tests,
      ll,
      llBase: iso(bd),
      llDate: iso(sd),
      sample: true,
      plans: {
        [TODAY]: {
          rows: [
            ["8:00", "Assembly", "Attendance and news of the day"],
            ["8:30", "English", "Group reading: The lost ball"],
            ["9:15", "Maths", "Two-digit subtraction with borrowing"],
            ["10:00", "Break", ""],
            ["10:20", "Hindi", "Matra practice: chhoti i and badi ee"],
            ["11:05", "EVS", "Plants around us: leaf walk"],
            ["11:50", "Practice groups", "Practice sheets by level"],
          ].map((r, i) => ({ id: "p" + i, time: r[0], subject: r[1], topic: r[2], done: false })),
          note: "",
        },
      },
      todos: [
        { id: "td1", text: "Check Unit Test 2 Hindi copies", done: false, due: TODAY },
        { id: "td2", text: "Send parent meeting notice in the class WhatsApp group", done: false, due: iso(new Date(Date.now() + 3 * 864e5)) },
        { id: "td3", text: "Set up the reading corner with new storybooks", done: false, due: "" },
        { id: "td4", text: "Submit attendance register to the headmaster", done: true, due: "" },
      ],
    };
  }

  /* ---------- state ---------- */
  let S: State | null = null;
  // Views below are only drawn while logged in, so they read the state through D().
  const D = (): State => S as State;

  /* ---------- saving (in this browser only) ---------- */
  const KEY_CLASS = "kaksha:class:";
  const KEY_SESSION = "kaksha:session";
  const SAMPLE_EMAIL = "neha.sample@kaksha.in";
  function keyFor(email: string): string {
    return KEY_CLASS + (email.trim().toLowerCase() || "teacher");
  }
  function store(k: string, v: string | null): void {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage blocked (private window etc.) — app still works, just won't remember */
    }
  }
  function load(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }
  function save(): void {
    if (!S) return;
    store(keyFor(S.teacher.email), JSON.stringify(S));
    store(KEY_SESSION, S.teacher.email || "teacher");
  }
  function loadClass(email: string): State | null {
    const raw = load(keyFor(email));
    if (!raw) return null;
    try {
      const x = JSON.parse(raw) as State;
      return x && Array.isArray(x.students) && Array.isArray(x.tests) && x.ll ? x : null;
    } catch {
      return null;
    }
  }

  let view: View = "home";
  let param: string | null = null;
  let authTab = "login";
  let addOpen = false,
    newTestOpen = false,
    query = "";
  let attDate = TODAY,
    attDraft: { date: string; m: Record<string, boolean> } | null = null,
    attSaved = false;
  let testDraft: { id: string; m: Record<string, number | null>; raw: Record<string, string> } | null = null;
  let reportsShown = false,
    reportOne: string | null = null;
  let llSub: Sub = "lit",
    llEdit = false,
    llFocus: number | null = null,
    llView: "list" | "groups" = "list";
  const remarkTurn: Record<string, number> = {}; // how many times "New wording" was pressed per student
  let agTab: AgTab = "plan",
    planDate = TODAY,
    showDone = false,
    ptmFilter: "need" | "all" = "need",
    ptmOne: string | null = null;
  let printGroup: string | null = null; // which practice-sheet group to print (null = all)

  /* ---------- calculations ---------- */
  function attStats(id: string): { p: number; t: number; pct: number | null } {
    let p = 0,
      t = 0;
    const att = D().attendance;
    for (const k in att) {
      const r = att[k];
      if (id in r) {
        t++;
        if (r[id]) p++;
      }
    }
    return { p, t, pct: t ? Math.round((p / t) * 100) : null };
  }
  function avgPct(id: string): number | null {
    let sum = 0,
      n = 0;
    D().tests.forEach((t) => {
      const m = t.marks[id];
      if (m != null) {
        sum += m / t.max;
        n++;
      }
    });
    return n ? Math.round((sum / n) * 100) : null;
  }
  function classAvg(t: Test): number | null {
    let sum = 0,
      n = 0;
    D().students.forEach((s) => {
      const m = t.marks[s.id];
      if (m != null) {
        sum += m / t.max;
        n++;
      }
    });
    return n ? Math.round((sum / n) * 100) : null;
  }
  function entered(t: Test): number {
    return D().students.filter((s) => t.marks[s.id] != null).length;
  }
  function testsDesc(): Test[] {
    return D()
      .tests.slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }
  function testsAsc(): Test[] {
    return testsDesc().reverse();
  }
  function grade(p: number | null): string {
    if (p == null) return "–";
    return p >= 91 ? "A1" : p >= 81 ? "A2" : p >= 71 ? "B1" : p >= 61 ? "B2" : p >= 51 ? "C1" : p >= 41 ? "C2" : p >= 33 ? "D" : "E";
  }
  function tone(p: number | null, lo: number, hi: number): Tone {
    if (p == null) return "na";
    return p < lo ? "bad" : p < hi ? "warn" : "good";
  }
  function attPill(p: number | null): string {
    return '<span class="pill ' + tone(p, 75, 85) + '" title="Attendance">' + (p == null ? "—" : p + "%") + "</span>";
  }
  function mkPill(p: number | null): string {
    return '<span class="pill ' + tone(p, 40, 60) + '" title="Average marks">' + (p == null ? "—" : p + "%") + "</span>";
  }
  function subjectsFor(id: string): SubjectTotal[] {
    const order: string[] = [];
    const map: Record<string, SubjectTotal> = {};
    testsAsc().forEach((t) => {
      if (!map[t.subject]) {
        map[t.subject] = { subject: t.subject, got: 0, max: 0, abs: 0 };
        order.push(t.subject);
      }
      const m = t.marks[id];
      if (m == null) {
        map[t.subject].abs++;
      } else {
        map[t.subject].got += m;
        map[t.subject].max += t.max;
      }
    });
    return order.map((k) => map[k]);
  }
  /* ---------- remark writer ----------
     Builds a personal remark from marks, attendance and learning levels — no AI, no cost.
     `turn` picks different wording, so pressing "New wording" gives a fresh version. */
  const RM = {
    top: ["{F} has had an excellent term, and {best} is a real strength.", "{F} has worked very well this term, especially in {best}.", "{F} is a keen and careful learner who has done very well in {best}."],
    good: ["{F} has made steady progress this term and does well in {best}.", "{F} works sincerely in class and has done well in {best}.", "{F} is growing in confidence, and {best} is a strong subject."],
    mid: ["{F} is making progress this term and does best in {best}.", "{F} tries hard in class and is doing well in {best}.", "{F} is learning steadily, with {best} as the strongest subject."],
    low: ["{F} has shown effort this term, especially in {best}.", "{F} is starting to make progress, especially in {best}.", "{F} needs some extra support this year but is trying hard in {best}."],
    weak: ["{weak} needs more practice, and ten minutes of practice at home each day will help.", "Daily practice of {weak} at home will help {F} improve.", "With a little regular practice, {weak} will get better."],
    readBig: ["Reading has grown from {from} to {to} level this year, which is a big step.", "{F}’s reading has improved a lot, from {from} to {to} level."],
    readUp: ["Reading has improved from {from} to {to} level.", "{F} now reads at {to} level, up from {from}."],
    readHome: ["Reading aloud at home for ten minutes every day will help {F} reach grade level.", "Please help {F} read a short story aloud at home each day."],
    mathHome: ["Practising tables at home will help {F} in Maths.", "Counting and simple sums at home will build {F}’s confidence in Maths."],
    attLow: ["Coming to school every day will help {F} keep up.", "More regular attendance will help {F} learn even more."],
    attHigh: ["{F} also comes to school very regularly.", "{F}’s regular attendance is a big help."],
  };
  function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function remarkFor(s: Student, turn: number): string {
    const F = s.name.split(" ")[0];
    let k = hash(s.id + ":" + turn);
    const pick = (opts: string[]): string => {
      const x = opts[k % opts.length];
      k = Math.imul(k ^ (k >>> 13), 2654435761) >>> 0;
      return x;
    };
    const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_m, n: string) => v[n] ?? "");
    const subs = subjectsFor(s.id)
      .filter((x) => x.max)
      .map((x) => ({ subject: x.subject, p: Math.round((x.got / x.max) * 100) }));
    const at = attStats(s.id).pct;
    const out: string[] = [];
    let weakLine = false;
    if (!subs.length) out.push(F + "’s marks have not been entered yet.");
    else {
      const best = subs.reduce((a, b) => (b.p > a.p ? b : a));
      const weak = subs.reduce((a, b) => (b.p < a.p ? b : a));
      const avg = avgPct(s.id) ?? 0;
      const v = { F, best: best.subject, weak: weak.subject };
      out.push(fill(pick(avg >= 80 ? RM.top : avg >= 60 ? RM.good : avg >= 40 ? RM.mid : RM.low), v));
      if (weak.subject !== best.subject && weak.p < 60) {
        out.push(fill(pick(RM.weak), v));
        weakLine = true;
      }
    }
    const r = D().ll.lit[s.id] || null,
      g = growthOf(r);
    if (r && g != null) {
      const v = { F, from: lvLabel(r.base), to: lvLabel(r.now) };
      if (g >= GOAL) out.push(fill(pick(RM.readBig), v));
      else if (g >= 0.5) out.push(fill(pick(RM.readUp), v));
      else if (bandOf(r.now) !== 0) out.push(fill(pick(RM.readHome), v));
    }
    const m = D().ll.math[s.id] || null;
    if (!weakLine && m && bandOf(m.now) === 2) out.push(fill(pick(RM.mathHome), { F }));
    if (at != null && at < 75) out.push(fill(pick(RM.attLow), { F }));
    else if (at != null && at >= 95 && out.length < 4) out.push(fill(pick(RM.attHigh), { F }));
    return out.slice(0, 4).join(" ");
  }
  /** The suggested remark shown in grey and used when the teacher leaves the box empty. */
  function autoRemark(s: Student): string {
    return remarkFor(s, 0);
  }
  function needsAttention(): Student[] {
    return D().students.filter((s) => {
      const a = attStats(s.id).pct,
        v = avgPct(s.id);
      return (a != null && a < 75) || (v != null && v < 40);
    });
  }

  const BANDS = ["At or above grade", "1–2 years behind", "3+ years behind"];
  function gradeNum(): number {
    const g = parseInt(D().cls.grade, 10);
    return isNaN(g) ? 1 : g;
  }
  function lvLabel(v: number | null): string {
    return v == null ? "–" : v === 0 ? "Pre-Gr 1" : "Gr " + v;
  }
  function llOf(sub: Sub, id: string): LevelRec | null {
    return D().ll[sub][id] || null;
  }
  function bandOf(v: number | null): number | null {
    if (v == null) return null;
    const gap = gradeNum() - v;
    return gap <= 0 ? 0 : gap <= 2 ? 1 : 2;
  }
  function growthOf(r: LevelRec | null): number | null {
    return r ? Math.round((r.now - r.base) * 10) / 10 : null;
  }
  function bandPill(b: number | null): string {
    return b == null
      ? '<span class="pill na">Not checked</span>'
      : '<span class="pill ' + ["good", "warn", "bad"][b] + '">' + BANDS[b] + "</span>";
  }
  function growthPill(g: number | null): string {
    if (g == null) return '<span class="pill na">—</span>';
    return '<span class="pill ' + (g >= GOAL ? "good" : g >= 0.5 ? "warn" : "bad") + '">' + (g > 0 ? "+" : "") + g + "</span>";
  }
  function bandCounts(sub: Sub, key: LevelKey): { c: number[]; na: number } {
    const c = [0, 0, 0];
    let na = 0;
    D().students.forEach((s) => {
      const r = llOf(sub, s.id);
      const b = r ? bandOf(r[key]) : null;
      if (b == null) na++;
      else c[b]++;
    });
    return { c, na };
  }
  function grown(sub: Sub): number {
    return D().students.filter((s) => {
      const g = growthOf(llOf(sub, s.id));
      return g != null && g >= GOAL;
    }).length;
  }
  function bandBar(c: number[], n: number): string {
    const w = (x: number) => (n ? Math.round((x / n) * 1000) / 10 : 0);
    return (
      '<span class="stack wide" aria-hidden="true"><i class="s2" style="width:' + w(c[0]) + '%"></i><i class="s1" style="width:' + w(c[1]) +
      '%"></i><i class="s0" style="width:' + w(c[2]) + '%"></i></span>'
    );
  }
  function pct(x: number, n: number): number {
    return n ? Math.round((x / n) * 100) : 0;
  }
  function llHomePanel(n: number): string {
    if (!D().llDate) return "";
    return (
      '<div class="panel"><div class="phead"><h2>Learning levels</h2><button class="link" data-act="go" data-view="skills">Open learning levels</button></div>' +
      SUBS.map((sub) => {
        const c = bandCounts(sub, "now").c;
        return (
          '<button class="gaprow" data-act="llfocus" data-sub="' + sub + '" data-band="2"><span class="who"><b>' + SUBJ[sub] + "</b><span>" +
          pct(c[0], n) + "% at or above grade · " + c[2] + " students 3+ years behind · " + grown(sub) + " of " + n + " grown 1.5+ levels</span></span>" +
          bandBar(c, n) + "</button>"
        );
      }).join("") +
      "</div>"
    );
  }
  function llProfile(id: string): string {
    const st = D();
    return (
      '<div class="panel"><div class="phead"><h2>Learning levels</h2><span class="muted" style="font-size:.78rem">' +
      (st.llDate && st.llBase ? "Baseline " + fmtShort(st.llBase) + " · checked " + fmtShort(st.llDate) : "Not checked yet") +
      '</span></div><div class="skl">' +
      SUBS.map((sub) => {
        const r = llOf(sub, id),
          g = growthOf(r);
        return (
          '<div class="lvcard"><span class="eyebrow">' + SUBJ[sub] + '</span><div class="lvnow">' + (r ? lvLabel(r.now) + " level" : "Not checked") + "</div>" +
          '<p class="muted">' + (r ? "Started the year at " + lvLabel(r.base) + " · class is Grade " + gradeNum() : "Add a baseline level to start tracking.") + "</p>" +
          '<div class="r2">' + bandPill(r ? bandOf(r.now) : null) + growthPill(g) + '<span class="muted" style="font-size:.74rem">Goal +' + GOAL + " this year</span></div></div>"
        );
      }).join("") +
      "</div></div>"
    );
  }
  function rcSkills(s: Student): string {
    const parts = SUBS.map((sub) => {
      const r = llOf(sub, s.id),
        g = growthOf(r);
      return (
        "<div><span>" + SUBJ[sub] + "</span><b>" +
        (r && g != null ? lvLabel(r.now) + " level (" + (g > 0 ? "+" : "") + g + " since " + lvLabel(r.base) + ")" : "Not checked") +
        "</b></div>"
      );
    }).join("");
    return '<div class="rc-skills"><span class="eyebrow">Learning levels · goal: grow ' + GOAL + ' levels this year</span><div class="rc-sk">' + parts + "</div></div>";
  }

  /* ---------- icons ---------- */
  const IC: Record<string, string> = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    students: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.5 3.5 5.2"/>',
    attendance: '<rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M8.5 15l2.5 2.5 4.5-5"/>',
    tests: '<path d="M6 3.5h9l4 4v13H6z"/><path d="M15 3.5v4h4M9.5 12h6M9.5 16h4"/>',
    skills: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M14 17.5l2.2 2.2 4-4.5"/>',
    reports: '<path d="M5 3.5h14v17H5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
    agenda: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10.5l1.5 1.5 2.5-2.5M14 11h2M8.5 16.5l1.5 1.5 2.5-2.5M14 17h2"/>',
  };
  function icon(k: string): string {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + "</svg>";
  }
  const NAV: [View, string][] = [
    ["home", "Home"],
    ["agenda", "Agenda"],
    ["students", "Students"],
    ["attendance", "Attendance"],
    ["tests", "Tests"],
    ["skills", "Learning levels"],
    ["reports", "Report cards"],
  ];
  function navKey(): View {
    return view === "student" ? "students" : view === "test" ? "tests" : view === "sheets" ? "skills" : view === "remarks" ? "reports" : view;
  }

  /* ---------- render ---------- */
  function render(): void {
    if (!S) {
      root.innerHTML = authView();
      return;
    }
    const nk = navKey(),
      c = S.cls;
    const side =
      '<aside class="side"><div class="brandmark"><span class="logo">क</span><b>Kaksha</b></div>' +
      '<div class="classcard"><span class="eyebrow">Your class</span><strong>Class ' + esc(c.grade) + "-" + esc(c.section) +
      '</strong><span class="muted" style="font-size:.85rem">' + esc(c.school) + " · " + esc(c.year) + "</span></div>" +
      NAV.map((n) => '<button class="navlink' + (nk === n[0] ? " on" : "") + '" data-act="go" data-view="' + n[0] + '">' + icon(n[0]) + n[1] + "</button>").join("") +
      '<div class="spacer"></div><button class="navlink" data-act="logout">Log out</button></aside>';
    const tabs =
      '<nav class="tabbar" aria-label="Main">' +
      NAV.map(
        (n) =>
          '<button class="tab' + (nk === n[0] ? " on" : "") + '" data-act="go" data-view="' + n[0] + '">' + icon(n[0]) + "<span>" +
          (n[0] === "reports" ? "Reports" : n[0] === "skills" ? "Levels" : n[0] === "attendance" ? "Attend" : n[1]) + "</span></button>"
      ).join("") +
      "</nav>";
    const strip =
      '<div class="topbar"><span class="crumb">Class ' + esc(c.grade) + "-" + esc(c.section) + " <span>· " + esc(c.school) + " · " + esc(c.year) + "</span></span>" +
      '<div class="me"><span class="me-av">' + esc(initials(S.teacher.name)) + '</span><span class="me-name">' + esc(S.teacher.name) +
      '</span><button class="btn small" data-act="logout">Log out</button></div></div>';
    const protonote =
      '<p class="protonote">' + (S.sample ? "Sample class. " : "") + "Your changes are saved in this browser only." +
      (S.sample ? ' <button class="link" data-act="resetsample">Reset sample data</button>' : "") + "</p>";
    let body: string;
    switch (view) {
      case "students":
        body = studentsView();
        break;
      case "student":
        body = studentView(param);
        break;
      case "attendance":
        body = attendanceView();
        break;
      case "tests":
        body = testsView();
        break;
      case "test":
        body = testView(param);
        break;
      case "skills":
        body = skillsView();
        break;
      case "sheets":
        body = sheetsView();
        break;
      case "reports":
        body = reportsView();
        break;
      case "agenda":
        body = agendaView();
        break;
      case "remarks":
        body = remarksView();
        break;
      default:
        body = homeView();
    }
    root.innerHTML = '<div class="app">' + side + '<main class="main"><div class="wrap">' + strip + body + protonote + "</div></main>" + tabs + "</div>";
    save();
  }
  function go(v: View, p?: string | null): void {
    view = v;
    param = p || null;
    if (v !== "test") testDraft = null;
    render();
    window.scrollTo(0, 0);
  }

  function phead(eyebrow: string, title: string, sub: string | null, actions: string | null): string {
    return (
      '<div class="phead"><div>' + (eyebrow ? '<span class="eyebrow">' + eyebrow + "</span>" : "") + "<h1>" + title + "</h1>" +
      (sub ? '<p class="muted">' + sub + "</p>" : "") + "</div>" + (actions ? '<div class="actions">' + actions + "</div>" : "") + "</div>"
    );
  }

  /* ----- Auth ----- */
  function authView(): string {
    const login =
      '<form id="f-login" class="panel"><div class="field"><label for="l-email">Email</label><input class="input" id="l-email" type="email" value="neha.sample@kaksha.in" autocomplete="off"></div>' +
      '<div class="field"><label for="l-pass">Password</label><input class="input" id="l-pass" type="password" value="sample123"></div>' +
      '<button class="btn primary" type="submit">Log in</button>' +
      '<p class="muted" style="font-size:.85rem">Prototype: any email works and opens a sample Class 4-A with 30 students.</p></form>';
    const signup =
      '<form id="f-signup" class="panel"><div class="grid2"><div class="field"><label for="u-name">Your name</label><input class="input" id="u-name" required placeholder="e.g. Rohan Verma"></div>' +
      '<div class="field"><label for="u-email">Email</label><input class="input" id="u-email" type="email" required placeholder="you@email.com"></div></div>' +
      '<div class="field"><label for="u-school">School name</label><input class="input" id="u-school" required placeholder="e.g. Govandi Municipal School"></div>' +
      '<div class="grid3"><div class="field"><label for="u-grade">Class</label><select class="input" id="u-grade">' +
      [1, 2, 3, 4, 5, 6, 7, 8].map((g) => "<option" + (g === 3 ? " selected" : "") + ">" + g + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label for="u-sec">Section</label><input class="input" id="u-sec" value="A" maxlength="3"></div>' +
      '<div class="field"><label for="u-year">Session</label><input class="input" id="u-year" value="2026–27"></div></div>' +
      '<div class="field"><label for="u-pass">Password</label><input class="input" id="u-pass" type="password" required placeholder="At least 6 characters" minlength="6"></div>' +
      '<button class="btn primary" type="submit">Create my class</button>' +
      '<p class="muted" style="font-size:.85rem">These class details print on every report card. You enter them once.</p></form>';
    return (
      '<div class="auth"><div class="authcard"><div class="authhero"><span class="eyebrow">Kaksha · for teachers</span><h1>Your class register, <em>built for teachers.</em></h1>' +
      "<p>Mark attendance in a minute. Enter test marks for the whole class on one screen. Print every report card with one tap.</p></div>" +
      '<div class="authform"><div class="tabs" role="tablist"><button data-act="authtab" data-tab="login" class="' + (authTab === "login" ? "on" : "") +
      '">Log in</button><button data-act="authtab" data-tab="signup" class="' + (authTab === "signup" ? "on" : "") + '">Sign up</button></div>' +
      (authTab === "login" ? login : signup) +
      '<div class="or">or</div><button class="btn" data-act="sample">Explore the sample class</button></div></div></div>'
    );
  }

  /* ----- Home ----- */
  function homeView(): string {
    const st = D();
    const first = st.teacher.name.split(" ")[0],
      h = new Date().getHours();
    const hello = (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", " + esc(first);
    const n = st.students.length;
    if (!n) {
      return (
        phead("", hello, "Let’s set up your class.", null) +
        '<div class="panel empty"><h2>Add your students to get started</h2><p class="muted">Add them one by one or paste the whole class list at once.</p><button class="btn primary" data-act="go" data-view="students" data-add="1">Add students</button></div>'
      );
    }
    const rec = st.attendance[TODAY];
    let present: number | null = null;
    if (rec) present = st.students.filter((s) => rec[s.id]).length;
    const today =
      '<div class="today"><div><span class="eyebrow" style="color:inherit;opacity:.8">Today · ' + fmt(TODAY) + '</span><div class="big">' +
      (rec ? present + " of " + n + " present" : "Attendance not marked yet") + "</div></div>" +
      '<button class="btn" data-act="go" data-view="attendance">' + (rec ? "Edit attendance" : "Mark attendance") + "</button></div>";
    const atts = st.students.map((s) => attStats(s.id).pct).filter((x): x is number => x != null);
    const avgAtt = atts.length ? Math.round(atts.reduce((a, b) => a + b, 0) / atts.length) : null;
    const latest = testsDesc()[0],
      need = needsAttention();
    const stats =
      '<div class="stats"><div class="stat"><span class="v">' + n + '</span><span class="l">Students</span></div>' +
      '<div class="stat"><span class="v">' + (avgAtt == null ? "—" : avgAtt + "%") + '</span><span class="l">Average attendance</span></div>' +
      '<div class="stat"><span class="v">' + (latest ? classAvg(latest) + "%" : "—") + '</span><span class="l">' +
      (latest ? "Class average, " + esc(latest.subject) + " " + esc(latest.name.replace("Unit Test ", "UT")) : "No tests yet") + "</span></div>" +
      '<div class="stat"><span class="v">' + need.length + '</span><span class="l">Need attention</span></div></div>';
    const needList =
      '<div class="ledger"><div class="lhead"><span>Roll</span><span>Needs attention</span><span>Att · Marks</span></div>' +
      (need.length
        ? need
            .slice(0, 6)
            .map((s) => {
              const ap = attStats(s.id).pct;
              return (
                '<button class="row" data-act="go" data-view="student" data-param="' + s.id + '"><span class="roll">' + String(s.roll).padStart(2, "0") +
                '</span><span class="who"><b>' + esc(s.name) + "</b><span>" + (ap != null && ap < 75 ? "Low attendance" : "Low marks") +
                '</span></span><span class="right">' + attPill(ap) + mkPill(avgPct(s.id)) + "</span></button>"
              );
            })
            .join("")
        : '<div class="row"><span></span><span class="muted">Everyone is on track.</span><span></span></div>') +
      "</div>";
    const recent =
      '<div class="panel"><div class="phead"><h2>Recent tests</h2><button class="link" data-act="go" data-view="tests">All tests</button></div>' +
      (st.tests.length
        ? testsDesc()
            .slice(0, 4)
            .map((t) => {
              const a = classAvg(t);
              return (
                '<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><span><b>' + esc(t.subject) +
                '</b> <span class="muted">· ' + esc(t.name) + '</span></span><span class="num">' + (a == null ? "—" : a + "%") +
                '</span></div><div class="bar"><i style="width:' + (a || 0) + '%"></i></div></div>'
              );
            })
            .join("")
        : '<p class="muted">No tests yet. Create one from the Tests page.</p>') +
      "</div>";
    return phead("", hello, "Here’s how your class is doing.", null) + today + stats + '<div class="two">' + needList + recent + "</div>" + agendaHomePanel() + llHomePanel(n);
  }

  /* ----- Students ----- */
  function studentRows(): string {
    const st = D();
    const q = query.trim().toLowerCase();
    const list = st.students.filter((s) => !q || s.name.toLowerCase().indexOf(q) > -1 || String(s.roll) === q);
    if (!st.students.length) return '<div class="empty"><h2>No students yet</h2><p class="muted">Use “Add students” above to build your class list.</p></div>';
    if (!list.length) return '<div class="row"><span></span><span class="muted">No student matches “' + esc(query) + "”.</span><span></span></div>";
    return (
      '<div class="lhead"><span>Roll</span><span>Name</span><span>Att · Marks</span></div>' +
      list
        .map(
          (s) =>
            '<button class="row" data-act="go" data-view="student" data-param="' + s.id + '"><span class="roll">' + String(s.roll).padStart(2, "0") +
            '</span><span class="who"><b>' + esc(s.name) + "</b><span>Parent: " + esc(s.phone || "—") + '</span></span><span class="right">' +
            attPill(attStats(s.id).pct) + mkPill(avgPct(s.id)) + "</span></button>"
        )
        .join("")
    );
  }
  function studentsView(): string {
    const st = D();
    const next = st.students.reduce((m, s) => Math.max(m, s.roll), 0) + 1;
    const add = addOpen
      ? '<div class="two"><form id="f-add" class="panel"><h2>Add one student</h2><div class="field"><label for="a-name">Full name</label><input class="input" id="a-name" required placeholder="e.g. Meera Iyer"></div>' +
        '<div class="grid2"><div class="field"><label for="a-roll">Roll no.</label><input class="input mono" id="a-roll" type="number" min="1" value="' + next +
        '"></div><div class="field"><label for="a-phone">Parent phone</label><input class="input mono" id="a-phone" inputmode="numeric" placeholder="10 digits"></div></div>' +
        '<button class="btn primary" type="submit">Add student</button></form>' +
        '<form id="f-bulk" class="panel"><h2>Paste the whole class</h2><div class="field"><label for="b-names">One name per line</label><textarea class="input" id="b-names" placeholder="Meera Iyer&#10;Kabir Rao&#10;Fatima Sayed"></textarea></div>' +
        '<p class="muted" style="font-size:.85rem">Copy the name column from Excel and paste it here. Roll numbers are given in order.</p><button class="btn primary" type="submit">Add all</button></form></div>'
      : "";
    return (
      phead(st.students.length + " students", "Students", "Tap a student to see their profile.", '<button class="btn primary" data-act="toggleadd">' + (addOpen ? "Close" : "Add students") + "</button>") +
      add +
      '<input class="input" id="q" type="search" placeholder="Search by name or roll no." value="' + esc(query) + '" aria-label="Search students">' +
      '<div class="ledger" id="slist">' + studentRows() + "</div>"
    );
  }

  /* ----- Student profile ----- */
  function studentView(id: string | null): string {
    const st = D();
    const s = st.students.find((x) => x.id === id);
    if (!s || !id) return phead("", "Student not found", null, null);
    const a = attStats(id),
      avg = avgPct(id),
      ts = testsAsc();
    const W = 600,
      H = 200,
      L = 34,
      B = 44,
      T = 16,
      bw = Math.min(48, (W - L - 10) / Math.max(ts.length, 1) - 14);
    let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Marks in each test, as a percentage">';
    [0, 25, 50, 75, 100].forEach((g) => {
      const y = T + (H - T - B) * (1 - g / 100);
      svg += '<line class="chart-grid" x1="' + L + '" x2="' + (W - 6) + '" y1="' + y + '" y2="' + y + '"/><text class="chart-t" x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + g + "</text>";
    });
    const step = (W - L - 10) / Math.max(ts.length, 1);
    ts.forEach((t, i) => {
      const m = t.marks[id],
        cx = L + step * i + step / 2,
        base = H - B;
      const lbl =
        '<text class="chart-t" x="' + cx + '" y="' + (base + 16) + '" text-anchor="middle">' + esc(t.subject.slice(0, 3)) + "</text>" +
        '<text class="chart-t" x="' + cx + '" y="' + (base + 30) + '" text-anchor="middle">' + esc(t.name.replace("Unit Test ", "UT")) + "</text>";
      if (m == null) {
        svg += '<text class="chart-v" x="' + cx + '" y="' + (base - 6) + '" text-anchor="middle">AB</text>' + lbl;
        return;
      }
      const p = Math.round((m / t.max) * 100),
        h = ((H - T - B) * p) / 100;
      svg +=
        '<rect class="chart-bar' + (p < 40 ? " low" : "") + '" x="' + (cx - bw / 2) + '" y="' + (base - h) + '" width="' + bw + '" height="' + h + '" rx="3"/>' +
        '<text class="chart-v" x="' + cx + '" y="' + (base - h - 5) + '" text-anchor="middle">' + p + "</text>" + lbl;
    });
    svg += "</svg>";
    const days = Object.keys(st.attendance)
      .sort()
      .filter((k) => id in st.attendance[k])
      .slice(-20);
    const dots =
      '<div class="dots" aria-label="Last 20 school days">' +
      days
        .map((k) => {
          const p = st.attendance[k][id];
          return '<i class="' + (p ? "p" : "a") + '" title="' + fmtShort(k) + ": " + (p ? "Present" : "Absent") + '"></i>';
        })
        .join("") +
      "</div>";
    const rows = testsDesc()
      .map((t) => {
        const m = t.marks[id],
          p = m == null ? null : Math.round((m / t.max) * 100);
        return (
          "<tr><td>" + esc(t.subject) + "</td><td>" + esc(t.name) + '</td><td class="muted">' + fmtShort(t.date) + '</td><td class="n">' +
          (m == null ? "AB" : m + " / " + t.max) + '</td><td class="n">' + (p == null ? "—" : p + "%") + "</td></tr>"
        );
      })
      .join("");
    return (
      '<div><button class="link" data-act="go" data-view="students">← All students</button></div>' +
      '<div class="profhead"><span class="avatar">' + esc(initials(s.name)) + '</span><div style="min-width:0"><span class="eyebrow">Roll no. ' + s.roll + "</span><h1>" + esc(s.name) +
      '</h1><p class="muted">Parent phone: <span class="mono">' + esc(s.phone || "—") + "</span></p></div></div>" +
      '<div class="stats"><div class="stat"><span class="v">' + (a.pct == null ? "—" : a.pct + "%") + '</span><span class="l">Attendance · ' + a.p + " of " + a.t + " days</span></div>" +
      '<div class="stat"><span class="v">' + (avg == null ? "—" : avg + "%") + '</span><span class="l">Average marks</span></div>' +
      '<div class="stat"><span class="v">' + grade(avg) + '</span><span class="l">Current grade</span></div>' +
      '<div class="stat"><span class="v">' + ts.filter((t) => t.marks[id] == null).length + '</span><span class="l">Tests absent</span></div></div>' +
      llProfile(id) +
      '<div class="panel"><h2>Marks in each test (%)</h2><div class="chartbox">' + svg + "</div></div>" +
      '<div class="panel"><h2>Last 20 school days</h2>' + dots + '<p class="muted" style="font-size:.85rem">Green = present, red = absent.</p></div>' +
      '<div class="panel"><h2>All marks</h2><div class="tablewrap"><table><thead><tr><th>Subject</th><th>Test</th><th>Date</th><th class="n">Marks</th><th class="n">%</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" class="muted">No tests yet.</td></tr>') + "</tbody></table></div></div>" +
      '<div class="panel"><h2>Teacher’s remark for report card</h2><textarea class="input" id="remark" data-id="' + s.id + '" placeholder="' + esc(autoRemark(s)) + '">' + esc(s.remark) +
      '</textarea><p class="muted" style="font-size:.85rem">Press <b>Write remark</b> for a remark based on this student’s marks, attendance and reading level, then change anything you like. Press <b>New wording</b> for a different version. If you leave the box empty, the grey suggestion is printed.</p>' +
      '<div class="actions"><button class="btn" data-act="remarkone" data-id="' + s.id + '">' + (s.remark.trim() ? "New wording" : "Write remark") + "</button>" +
      '<button class="btn" data-act="reportone" data-param="' + s.id + '">View report card</button>' +
      '<button class="btn" data-act="ptmopen" data-id="' + s.id + '">Parent meeting agenda</button></div></div>'
    );
  }

  /* ----- Attendance ----- */
  function ensureAttDraft(): { date: string; m: Record<string, boolean> } {
    if (attDraft && attDraft.date === attDate) return attDraft;
    const rec = D().attendance[attDate];
    const m: Record<string, boolean> = {};
    D().students.forEach((s) => {
      m[s.id] = rec && s.id in rec ? rec[s.id] : true;
    });
    attDraft = { date: attDate, m };
    attSaved = !!rec;
    return attDraft;
  }
  function attendanceView(): string {
    const st = D();
    if (!st.students.length)
      return phead("", "Attendance", null, null) + '<div class="panel empty"><h2>No students yet</h2><button class="btn primary" data-act="go" data-view="students" data-add="1">Add students</button></div>';
    const draft = ensureAttDraft();
    const p = st.students.filter((s) => draft.m[s.id]).length,
      n = st.students.length;
    const d = new Date(attDate + "T00:00:00").getDay(),
      weekend = d === 0 || d === 6;
    const list =
      '<div class="ledger"><div class="lhead"><span>Roll</span><span>Name</span><span>P / A</span></div>' +
      st.students
        .map((s) => {
          const on = draft.m[s.id];
          return (
            '<div class="row"><span class="roll">' + String(s.roll).padStart(2, "0") + '</span><span class="who"><b>' + esc(s.name) +
            '</b></span><span class="seg" role="group" aria-label="' + esc(s.name) + '"><button class="p' + (on ? " on" : "") + '" data-act="att" data-id="' + s.id +
            '" data-v="1" aria-pressed="' + on + '">P</button><button class="a' + (!on ? " on" : "") + '" data-act="att" data-id="' + s.id + '" data-v="0" aria-pressed="' + !on +
            '">A</button></span></div>'
          );
        })
        .join("") +
      "</div>";
    return (
      phead("Daily register", "Attendance", "Everyone starts as present. Tap A for students who are absent, then save.", null) +
      '<div class="panel"><div class="grid2"><div class="field"><label for="attdate">Date</label><input class="input" id="attdate" type="date" max="' + TODAY + '" value="' + attDate + '"></div>' +
      '<div class="field"><label>Summary</label><div style="display:flex;gap:8px;align-items:center;min-height:44px;flex-wrap:wrap"><span class="pill good">' + p +
      ' present</span><span class="pill bad">' + (n - p) + " absent</span>" + (weekend ? '<span class="pill warn">Weekend</span>' : "") + "</div></div></div>" +
      '<div class="savebar"><button class="btn small" data-act="attall">Mark all present</button><span class="status ' + (attSaved ? "saved" : "unsaved") + '">' +
      (attSaved ? "Saved" : "Not saved yet") + "</span></div></div>" +
      list +
      '<div class="savebar"><span class="muted">' + fmt(attDate) + '</span><button class="btn primary" data-act="attsave">Save attendance</button></div>'
    );
  }

  /* ----- Tests ----- */
  function testsView(): string {
    const st = D();
    const form = newTestOpen
      ? '<form id="f-newtest" class="panel"><h2>New test</h2><div class="grid2"><div class="field"><label for="n-name">Test name</label><input class="input" id="n-name" required value="Final Exam"></div>' +
        '<div class="field"><label for="n-sub">Subject</label><input class="input" id="n-sub" required list="subs" placeholder="e.g. Maths"><datalist id="subs"><option>Maths</option><option>English</option><option>Hindi</option><option>EVS</option></datalist></div></div>' +
        '<div class="grid2"><div class="field"><label for="n-max">Maximum marks</label><input class="input mono" id="n-max" type="number" min="1" value="50" required></div><div class="field"><label for="n-date">Date</label><input class="input" id="n-date" type="date" value="' +
        TODAY + '" required></div></div>' +
        '<button class="btn primary" type="submit">Create and enter marks</button></form>'
      : "";
    const list = st.tests.length
      ? '<div class="ledger">' +
        testsDesc()
          .map((t) => {
            const a = classAvg(t),
              e = entered(t);
            return (
              '<button class="row" style="grid-template-columns:minmax(0,1fr) auto" data-act="go" data-view="test" data-param="' + t.id + '"><span class="who"><b>' +
              esc(t.subject) + " · " + esc(t.name) + "</b><span>" + fmt(t.date) + " · out of " + t.max + " · " + e + " of " + st.students.length +
              ' entered</span></span><span class="right"><span class="chip">Avg</span>' + mkPill(a) + "</span></button>"
            );
          })
          .join("") +
        "</div>"
      : '<div class="panel empty"><h2>No tests yet</h2><p class="muted">Create a test, then enter marks for the whole class on one screen.</p></div>';
    return (
      phead(st.tests.length + " tests", "Tests", "Create a test, then fill marks for all students at once.", '<button class="btn primary" data-act="togglenew">' + (newTestOpen ? "Close" : "New test") + "</button>") +
      form +
      list
    );
  }
  function testStatsHtml(t: Test, marks: Record<string, number | null>): string {
    const vals = D()
      .students.map((s) => marks[s.id])
      .filter((v): v is number => typeof v === "number" && !isNaN(v) && v >= 0 && v <= t.max);
    if (!vals.length) return '<div class="stat"><span class="v">—</span><span class="l">No marks yet</span></div>';
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length,
      hi = Math.max(...vals),
      lo = Math.min(...vals),
      below = vals.filter((v) => v / t.max < 0.33).length;
    return (
      '<div class="stat"><span class="v">' + Math.round(avg * 10) / 10 + '</span><span class="l">Average of ' + t.max + "</span></div>" +
      '<div class="stat"><span class="v">' + hi + '</span><span class="l">Highest</span></div>' +
      '<div class="stat"><span class="v">' + lo + '</span><span class="l">Lowest</span></div>' +
      '<div class="stat"><span class="v">' + below + '</span><span class="l">Below 33%</span></div>'
    );
  }
  function testView(id: string | null): string {
    const st = D();
    const t = st.tests.find((x) => x.id === id);
    if (!t || !id) return phead("", "Test not found", null, null);
    if (!testDraft || testDraft.id !== id) {
      const m: Record<string, number | null> = {};
      st.students.forEach((s) => {
        m[s.id] = t.marks[s.id] == null ? null : t.marks[s.id];
      });
      testDraft = { id, m, raw: {} };
    }
    const draft = testDraft;
    const rows = st.students
      .map((s) => {
        const v = draft.raw[s.id] != null ? draft.raw[s.id] : draft.m[s.id] == null ? "" : draft.m[s.id];
        return (
          '<div class="row"><span class="roll">' + String(s.roll).padStart(2, "0") + '</span><label class="who" for="mk-' + s.id + '"><b>' + esc(s.name) +
          '</b></label><span class="right"><input class="mk" id="mk-' + s.id + '" data-id="' + s.id + '" inputmode="numeric" value="' + esc(v) +
          '" placeholder="AB" aria-label="Marks for ' + esc(s.name) + '"><span class="outof">/ ' + t.max + "</span></span></div>"
        );
      })
      .join("");
    return (
      '<div><button class="link" data-act="go" data-view="tests">← All tests</button></div>' +
      phead(fmt(t.date) + " · out of " + t.max, esc(t.subject) + " · " + esc(t.name), "Type marks for each student. Leave empty if the student was absent.", null) +
      '<div class="stats" id="tstats">' + testStatsHtml(t, draft.m) + "</div>" +
      '<div class="ledger"><div class="lhead"><span>Roll</span><span>Name</span><span>Marks</span></div>' + rows + "</div>" +
      '<div class="savebar"><span class="muted" id="terr"></span><button class="btn primary" data-act="testsave">Save marks</button></div>'
    );
  }

  /* ----- Learning levels ----- */
  function llOptions(v: number): string {
    let o = "";
    for (let x = 0; x <= 8; x += 0.5) {
      o += '<option value="' + x + '"' + (x === v ? " selected" : "") + ">" + lvLabel(x) + "</option>";
    }
    return o;
  }
  /** Card view: one card per level, each listing the students at that level. */
  function levelGroupsHtml(sub: Sub): string {
    const groups = groupsFor(sub);
    if (!groups.length) return '<p class="muted">No levels recorded yet.</p>';
    return (
      '<p class="muted" style="font-size:.85rem">' + groups.length + " groups, from lowest to highest level. Use them for group work and practice sheets.</p>" +
      '<div class="lvgroups">' +
      groups
        .map((g) => {
          const b = bandOf(g.level);
          return (
            '<div class="lvgroup b' + (b == null ? "n" : b) + '"><div class="lvg-head"><div><h3>' + esc(g.label) + ' level</h3><span class="muted">' + (b == null ? "" : BANDS[b]) +
            '</span></div><span class="lvg-count">' + g.students.length + "</span></div>" +
            '<div class="lvg-list">' +
            g.students
              .map((s) => {
                const r = llOf(sub, s.id);
                const gr = growthOf(r);
                return (
                  '<button class="lvg-row" data-act="go" data-view="student" data-param="' + s.id + '"><span class="r">' + String(s.roll).padStart(2, "0") + "</span><b>" + esc(s.name) +
                  "</b><span class=\"lvg-lv\">" + (r ? lvLabel(r.now) : "") + (gr != null && gr > 0 ? ' <i>+' + gr + "</i>" : "") + "</span></button>"
                );
              })
              .join("") +
            "</div>" +
            '<button class="link lvg-foot" data-act="lvsheet">Practice sheet for this group →</button></div>'
          );
        })
        .join("") +
      "</div>"
    );
  }
  function skillsView(): string {
    const st = D();
    const n = st.students.length,
      sub = llSub;
    if (!n)
      return phead("", "Learning levels", null, null) + '<div class="panel empty"><h2>No students yet</h2><button class="btn primary" data-act="go" data-view="students" data-add="1">Add students</button></div>';
    if (!st.llBase) {
      st.students.forEach((s) => {
        SUBS.forEach((k) => {
          if (!st.ll[k][s.id]) st.ll[k][s.id] = { base: Math.max(0, gradeNum() - 1), now: Math.max(0, gradeNum() - 1) };
        });
      });
    }
    const head = phead(
      "Reading and maths",
      "Learning levels",
      "Each student’s level as a grade, compared with Grade " + gradeNum() + ". Goal: every student grows " + GOAL + " levels this year." +
        (st.llDate && st.llBase ? " Baseline " + fmt(st.llBase) + ", last checked " + fmt(st.llDate) + "." : ""),
      llEdit
        ? '<button class="btn primary" data-act="lldone">Save levels</button>'
        : (st.llBase ? '<button class="btn" data-act="go" data-view="sheets">Practice sheets</button>' : "") +
          '<button class="btn primary" data-act="lledit">' + (st.llBase ? "Update levels" : "Add baseline levels") + "</button>"
    );
    const filt = '<div class="filters">' + SUBS.map((k) => '<button class="fbtn' + (sub === k ? " on" : "") + '" data-act="llsub" data-sub="' + k + '">' + SUBJ[k] + "</button>").join("") + "</div>";
    const now = bandCounts(sub, "now"),
      base = bandCounts(sub, "base"),
      g = grown(sub);
    const stats =
      '<div class="stats"><div class="stat"><span class="v">' + pct(now.c[0], n) + '%</span><span class="l">At or above grade</span></div>' +
      '<div class="stat"><span class="v">' + pct(now.c[1], n) + '%</span><span class="l">1–2 years behind</span></div>' +
      '<div class="stat"><span class="v">' + pct(now.c[2], n) + '%</span><span class="l">3+ years behind</span></div>' +
      '<div class="stat"><span class="v">' + g + "/" + n + '</span><span class="l">Grown ' + GOAL + "+ levels</span></div></div>";
    const chart =
      '<div class="panel"><h2>' + SUBJ[sub] + ": start of year vs now</h2>" +
      '<div class="bandrow"><span class="muted">Baseline' + (st.llBase ? " · " + fmtShort(st.llBase) : "") + "</span>" + bandBar(base.c, n) + "</div>" +
      '<div class="bandrow"><span class="muted">Now' + (st.llDate ? " · " + fmtShort(st.llDate) : "") + "</span>" + bandBar(now.c, n) + "</div>" +
      '<div class="filters">' +
      [0, 1, 2]
        .map(
          (b) =>
            '<button class="fbtn band b' + b + (llFocus === b ? " on" : "") + '" data-act="llfocus" data-sub="' + sub + '" data-band="' + b + '"><i></i>' + BANDS[b] + " · " + now.c[b] + "</button>"
        )
        .join("") +
      "</div></div>";
    let focus = "";
    if (llFocus != null) {
      const fb = llFocus;
      const grp = st.students.filter((s) => {
        const r = llOf(sub, s.id);
        return r && bandOf(r.now) === fb;
      });
      focus =
        '<div class="panel focus"><div class="phead"><div><span class="eyebrow">Group for ' + (fb === 0 ? "stretch work" : "extra help") + "</span><h2>" + SUBJ[sub] + " · " + BANDS[fb] + " · " +
        grp.length + ' students</h2></div><button class="link" data-act="llunfocus">Close</button></div>' +
        '<div class="names">' +
        (grp.length
          ? grp
              .map((s) => {
                const r = llOf(sub, s.id);
                return '<button class="namechip" data-act="go" data-view="student" data-param="' + s.id + '">' + esc(s.name) + " · " + lvLabel(r ? r.now : null) + "</button>";
              })
              .join("")
          : '<span class="muted">No students in this group.</span>') +
        "</div></div>";
    }
    const rows = st.students
      .map((s) => {
        const r = llOf(sub, s.id),
          gr = growthOf(r);
        return (
          '<tr><td class="sticky"><button class="namebtn" data-act="go" data-view="student" data-param="' + s.id + '"><span class="r">' + String(s.roll).padStart(2, "0") + "</span>" +
          esc(s.name) + "</button></td>" +
          "<td>" + (r ? lvLabel(r.base) : "–") + "</td>" +
          "<td>" +
          (llEdit
            ? '<select class="llsel" data-id="' + s.id + '" aria-label="' + esc(s.name) + ' current level">' + llOptions(r ? r.now : 0) + "</select>"
            : r
              ? "<b>" + lvLabel(r.now) + "</b>"
              : "–") +
          "</td>" +
          "<td>" + growthPill(gr) + "</td><td>" + bandPill(r ? bandOf(r.now) : null) + "</td></tr>"
        );
      })
      .join("");
    const grouped = llView === "groups" && !llEdit;
    const toggle = llEdit
      ? '<span class="status unsaved">Editing</span>'
      : '<div class="seg2" role="group" aria-label="View"><button class="' + (grouped ? "" : "on") + '" data-act="llview" data-v="list">List</button><button class="' + (grouped ? "on" : "") + '" data-act="llview" data-v="groups">Groups</button></div>';
    const table =
      '<div class="panel"><div class="phead"><h2>Every student · ' + SUBJ[sub] + "</h2>" + toggle + "</div>" +
      (llEdit ? '<p class="note">Choose each student’s current level after this month’s check, then press Save levels. Growth updates automatically.</p>' : "") +
      (grouped
        ? levelGroupsHtml(sub)
        : '<div class="sgrid"><table class="lltable"><thead><tr><th class="sticky">Student</th><th>Baseline</th><th>Now</th><th>Growth</th><th>Status</th></tr></thead><tbody>' +
          rows + "</tbody></table></div>") +
      "</div>";
    return head + filt + stats + chart + focus + table;
  }

  /* ----- Report cards ----- */
  function rcHtml(s: Student): string {
    const st = D();
    const c = st.cls,
      a = attStats(s.id),
      subs = subjectsFor(s.id);
    let G = 0,
      M = 0;
    const rows = subs
      .map((x) => {
        G += x.got;
        M += x.max;
        const p = x.max ? Math.round((x.got / x.max) * 100) : null;
        return (
          "<tr><td>" + esc(x.subject) + '</td><td class="n">' + (x.max ? x.got : "AB") + '</td><td class="n">' + (x.max || "—") + '</td><td class="n">' +
          (p == null ? "—" : p + "%") + '</td><td class="n">' + grade(p) + "</td></tr>"
        );
      })
      .join("");
    const op = M ? Math.round((G / M) * 100) : null;
    const file = String(s.roll).padStart(2, "0") + "_" + s.name.replace(/\s+/g, "_") + ".pdf";
    return (
      '<div><div class="fname">' + icon("reports").replace("<svg", '<svg width="16" height="16"') + esc(file) + '</div><article class="rc">' +
      '<header class="rc-head"><span class="eyebrow">Progress Report · Session ' + esc(c.year) + "</span><h3>" + esc(c.school) + '</h3><span class="muted">Class ' + esc(c.grade) + "-" +
      esc(c.section) + "</span></header>" +
      '<div class="rc-meta"><div><span>Student:</span> <b>' + esc(s.name) + '</b></div><div><span>Roll no.:</span> <b class="mono">' + s.roll +
      '</b></div><div><span>Attendance:</span> <b class="mono">' + a.p + " / " + a.t + " days</b></div><div><span>Class teacher:</span> <b>" + esc(st.teacher.name) + "</b></div></div>" +
      '<div class="tablewrap"><table><thead><tr><th>Subject</th><th class="n">Marks</th><th class="n">Out of</th><th class="n">%</th><th class="n">Grade</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" class="muted">No marks entered yet.</td></tr>') + "</tbody></table></div>" +
      rcSkills(s) +
      '<div class="rc-total"><span>Total: <span class="mono">' + G + " / " + M + '</span></span><span>Overall: <span class="mono">' + (op == null ? "—" : op + "%") +
      "</span></span><span>Grade: " + grade(op) + "</span></div>" +
      '<div class="rc-remark"><span class="eyebrow">Teacher’s remark</span><p>' + esc(s.remark || autoRemark(s)) + "</p></div>" +
      '<p class="muted" style="font-size:.75rem">Grades: A1 91–100 · A2 81–90 · B1 71–80 · B2 61–70 · C1 51–60 · C2 41–50 · D 33–40 · E below 33</p>' +
      '<div class="rc-sign"><div>Class teacher</div><div>Principal</div><div>Parent</div></div></article></div>'
    );
  }
  function reportsView(): string {
    const st = D();
    const n = st.students.length;
    if (!n)
      return phead("", "Report cards", null, null) + '<div class="panel empty"><h2>No students yet</h2><button class="btn primary" data-act="go" data-view="students" data-add="1">Add students</button></div>';
    const head = phead(
      "End of year",
      "Report cards",
      "Every report card is built from the attendance and marks you have already entered.",
      '<button class="btn" data-act="go" data-view="remarks">Remarks</button><button class="btn primary" data-act="reportall">Print all ' + n + " report cards</button>"
    );
    const note =
      '<div class="note"><b>Tip:</b> open <b>Remarks</b> to fill every student’s remark in one click and check them all in one place. Each report card prints on its own page; to get a PDF, choose <b>Save as PDF</b> in the print window.</div>';
    let body = "";
    if (reportOne) {
      const s = st.students.find((x) => x.id === reportOne);
      body =
        '<div class="savebar">' + '<button class="link" data-act="reportlist">← Back to student list</button>' + '<span class="actions"><button class="btn small" data-act="print">Print this report card</button><button class="link" data-act="showall">Show all ' + n +
        '</button></span></div><div class="cards">' +
        (s ? rcHtml(s) : "") + "</div>";
    } else if (reportsShown) {
      body =
        '<div class="savebar">' + '<button class="link" data-act="reportlist">← Back to student list</button>' + '<span class="actions"><span class="pill good">' + n + ' report cards ready</span><button class="btn small" data-act="print">Print</button></span></div><div class="cards">' +
        st.students.map(rcHtml).join("") + "</div>";
    } else {
      body =
        '<div class="ledger"><div class="lhead"><span>Roll</span><span>Preview one student</span><span>Overall</span></div>' +
        st.students
          .map((s) => {
            let G = 0,
              M = 0;
            subjectsFor(s.id).forEach((x) => {
              G += x.got;
              M += x.max;
            });
            const op = M ? Math.round((G / M) * 100) : null;
            return (
              '<button class="row" data-act="reportone" data-param="' + s.id + '"><span class="roll">' + String(s.roll).padStart(2, "0") + '</span><span class="who"><b>' + esc(s.name) +
              "</b><span>Grade " + grade(op) + '</span></span><span class="right">' + mkPill(op) + "</span></button>"
            );
          })
          .join("") +
        "</div>";
    }
    return head + note + body;
  }

  /* ----- Remarks (review all) ----- */
  function remarksView(): string {
    const st = D();
    const n = st.students.length;
    if (!n) return phead("", "Remarks", null, null) + '<div class="panel empty"><h2>No students yet</h2><button class="btn primary" data-act="go" data-view="students" data-add="1">Add students</button></div>';
    const done = st.students.filter((s) => s.remark.trim()).length;
    const head = phead(
      "Report cards",
      "Remarks",
      "Kaksha writes each remark from the student’s marks, attendance and learning levels. Read them, change anything you like, then print. Changes save as you type.",
      '<button class="btn primary" data-act="remarksall">' + (done === n ? "New wording for all" : "Fill " + (n - done) + " empty remark" + (n - done > 1 ? "s" : "")) + "</button>"
    );
    const rows = st.students
      .map((s) => {
        return (
          '<div class="rmkrow"><div class="rmkwho"><span class="roll">' + String(s.roll).padStart(2, "0") + '</span><b>' + esc(s.name) + "</b>" +
          '<button class="fbtn" data-act="remarkone" data-id="' + s.id + '">' + (s.remark.trim() ? "New wording" : "Write") + "</button>" +
          '</div><textarea class="input rmk" data-id="' + s.id + '" rows="3" placeholder="' + esc(autoRemark(s)) + '">' + esc(s.remark) + "</textarea></div>"
        );
      })
      .join("");
    return (
      '<div><button class="link" data-act="go" data-view="reports">← Report cards</button></div>' +
      head +
      '<div class="savebar"><span class="pill ' + (done === n ? "good" : "warn") + '">' + done + " of " + n + ' remarks written</span><span class="muted" style="font-size:.85rem">Empty boxes use the grey suggestion.</span></div>' +
      '<div class="panel rmklist">' + rows + "</div>"
    );
  }

  /* ----- Practice sheets ----- */
  interface Group {
    key: string;
    level: number;
    label: string;
    students: Student[];
  }
  function groupsFor(sub: Sub): Group[] {
    const map: Record<number, Student[]> = {};
    D().students.forEach((s) => {
      const r = llOf(sub, s.id);
      if (!r) return;
      const L = Math.floor(r.now);
      (map[L] = map[L] || []).push(s);
    });
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map((L) => ({ key: sub + ":" + L, level: L, label: lvLabel(L), students: map[L] }));
  }
  function sheetHtml(sh: Sheet, sub: Sub, label: string, student: Student | null): string {
    const c = D().cls;
    let num = 0;
    const secs = sh.sections
      .map((sec) => {
        const start = num + 1;
        num += sec.items.length;
        return '<div class="sh-sec"><h4>' + esc(sec.heading) + '</h4><ol start="' + start + '">' + sec.items.map((it) => "<li>" + esc(it) + "</li>").join("") + "</ol></div>";
      })
      .join("");
    return (
      '<article class="rc sheet"><header class="rc-head"><span class="eyebrow">Practice sheet · ' + SUBJ[sub] + " · " + esc(label) + " level</span><h3>" + esc(sh.title) + "</h3></header>" +
      '<div class="rc-meta"><div><span>Name:</span> <b>' + (student ? esc(student.name) : "______________________") + "</b></div><div><span>Date:</span> <b>____________</b></div>" +
      "<div><span>Class:</span> <b>" + esc(c.grade) + "-" + esc(c.section) + "</b></div><div><span>School:</span> <b>" + esc(c.school) + "</b></div></div>" +
      (sh.intro ? '<p class="sh-intro">' + esc(sh.intro) + "</p>" : "") +
      (sh.passage ? '<div class="sh-passage">' + esc(sh.passage).replace(/\n+/g, "<br>") + "</div>" : "") +
      secs +
      "</article>"
    );
  }
  function sheetsView(): string {
    const st = D();
    const sub = llSub;
    const back = '<div><button class="link" data-act="go" data-view="skills">← Learning levels</button></div>';
    if (!st.llBase)
      return back + phead("", "Practice sheets", null, null) + '<div class="panel empty"><h2>Add learning levels first</h2><p class="muted">Sheets are made for groups of students at the same level.</p><button class="btn primary" data-act="go" data-view="skills">Go to learning levels</button></div>';
    const groups = groupsFor(sub);
    const sheets = st.sheets || {};
    const made = groups.filter((g) => sheets[g.key]).length;
    const head = phead(
      "Learning levels",
      "Practice sheets",
      "Students are grouped by their current " + SUBJ[sub].toLowerCase() + " level, and each group gets its own sheet. When you print, every student gets a copy with their name on it.",
      '<button class="btn' + (made ? "" : " primary") + '" data-act="sheetsall">' + (made ? "New sheets for all" : "Make all sheets") + "</button>" +
        (made ? '<button class="btn primary" data-act="sheetsprint">Print all (' + groups.filter((g) => sheets[g.key]).reduce((a, g) => a + g.students.length, 0) + " copies)</button>" : "")
    );
    const filt = '<div class="filters">' + SUBS.map((k) => '<button class="fbtn' + (sub === k ? " on" : "") + '" data-act="llsub" data-sub="' + k + '">' + SUBJ[k] + "</button>").join("") + "</div>";
    const list = groups
      .map((g) => {
        const sh = sheets[g.key];
        return (
          '<div class="panel sgroup"><div class="phead"><div><span class="eyebrow">' + g.students.length + " student" + (g.students.length > 1 ? "s" : "") + "</span><h2>" + esc(g.label) + " level</h2></div>" +
          '<div class="actions"><button class="btn" data-act="sheetone" data-key="' + g.key + '">' + (sh ? "New sheet" : "Make sheet") + "</button>" +
          (sh ? '<button class="btn primary" data-act="sheetprint" data-key="' + g.key + '">Print ' + g.students.length + " cop" + (g.students.length > 1 ? "ies" : "y") + "</button>" : "") +
          "</div></div>" +
          '<div class="names">' + g.students.map((s) => '<button class="namechip" data-act="go" data-view="student" data-param="' + s.id + '">' + esc(s.name) + "</button>").join("") + "</div>" +
          (sh
            ? '<p class="muted" style="font-size:.78rem">Made ' + fmtShort(sh.made) + ". Press New sheet for a different one.</p>" + sheetHtml(sh, sub, g.label, null)
            : '<p class="muted">No sheet yet.</p>') +
          "</div>"
        );
      })
      .join("");
    // Print-only copies: one per student, with their name filled in.
    const printing = groups
      .filter((g) => sheets[g.key] && (printGroup == null || printGroup === g.key))
      .map((g) => g.students.map((s) => "<div>" + sheetHtml(sheets[g.key], sub, g.label, s) + "</div>").join(""))
      .join("");
    return back + head + filt + (groups.length ? list : '<div class="panel empty"><p class="muted">No levels recorded for ' + SUBJ[sub] + " yet.</p></div>") + '<div class="print-only cards">' + printing + "</div>";
  }
  function makeSheet(g: Group, sub: Sub): void {
    const st = D();
    st.sheets = st.sheets || {};
    const old = st.sheets[g.key];
    const turn = old && typeof old.v === "number" ? old.v + 1 : 0;
    st.sheets[g.key] = builtInSheet(sub, g.level, hash(g.key + ":" + turn + ":" + Date.now()), TODAY, turn);
  }

  /* ================= Agenda: today's plan, to-do, parent meeting ================= */
  function uid(): string {
    return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function shiftDate(d: string, days: number): string {
    const x = new Date(d + "T00:00:00");
    x.setDate(x.getDate() + days);
    return iso(x);
  }
  const PERIOD_TIMES = ["8:00", "8:40", "9:20", "10:00", "10:40", "11:20"];

  function agendaView(): string {
    const st = D();
    const open = (st.todos || []).filter((t) => !t.done).length;
    const tabs: [AgTab, string][] = [
      ["plan", "Today’s plan"],
      ["todo", "To-do" + (open ? " · " + open : "")],
      ["ptm", "Parent meeting"],
    ];
    const sub =
      agTab === "plan"
        ? "Plan each period: what you will teach and when. Tick periods off as you finish them."
        : agTab === "todo"
          ? "Your task list. Kaksha also suggests tasks from your class data, like calling parents of absent students."
          : "A ready agenda for each parent meeting, made from attendance, marks and learning levels. Add notes during the meeting.";
    const head = phead("Teacher’s agenda", "Agenda", sub, null);
    const bar = '<div class="filters">' + tabs.map((t) => '<button class="fbtn' + (agTab === t[0] ? " on" : "") + '" data-act="agtab" data-tab="' + t[0] + '">' + t[1] + "</button>").join("") + "</div>";
    return head + bar + (agTab === "plan" ? planView() : agTab === "todo" ? todoView() : ptmView());
  }

  /* ----- Today's plan ----- */
  function subjectList(): string[] {
    const set = new Set<string>(["English", "Hindi", "Maths", "EVS", "Science", "Social Studies", "Art", "Games", "Library", "Assembly", "Break"]);
    D().tests.forEach((t) => set.add(t.subject));
    return Array.from(set);
  }
  function planView(): string {
    const st = D();
    const plans = st.plans || {};
    const plan = plans[planDate];
    const bar =
      '<div class="panel"><div class="planbar"><button class="btn small" data-act="planday" data-d="-1" aria-label="Previous day">←</button>' +
      '<input class="input" id="plandate" type="date" value="' + planDate + '" aria-label="Plan date">' +
      '<button class="btn small" data-act="planday" data-d="1" aria-label="Next day">→</button>' +
      '<span class="muted planday">' + (planDate === TODAY ? "Today · " : "") + fmt(planDate) + "</span>" +
      (planDate !== TODAY ? '<button class="link" data-act="planday" data-d="0">Go to today</button>' : "") +
      "</div></div>";
    if (!plan) {
      const earlier = Object.keys(plans)
        .filter((d) => d !== planDate && plans[d].rows.length)
        .sort();
      const last = earlier.filter((d) => d < planDate).pop() || earlier.pop();
      return (
        bar +
        '<div class="panel empty"><h2>No plan for ' + fmt(planDate) + " yet</h2>" +
        '<p class="muted">Copy your timetable from an earlier day, or start with empty periods.</p><div class="actions" style="justify-content:center">' +
        (last ? '<button class="btn primary" data-act="plancopy" data-from="' + last + '">Copy timetable from ' + fmtShort(last) + "</button>" : "") +
        '<button class="btn' + (last ? "" : " primary") + '" data-act="plannew">Start with 6 empty periods</button></div></div>'
      );
    }
    const done = plan.rows.filter((r) => r.done).length;
    const rows = plan.rows
      .map(
        (r) =>
          '<div class="row planrow' + (r.done ? " isdone" : "") + '">' +
          '<input class="input plf pt" data-id="' + r.id + '" data-f="time" value="' + esc(r.time) + '" placeholder="Time" aria-label="Time">' +
          '<div class="pmid"><input class="input plf" data-id="' + r.id + '" data-f="subject" list="subjlist" value="' + esc(r.subject) + '" placeholder="Subject" aria-label="Subject">' +
          '<input class="input plf" data-id="' + r.id + '" data-f="topic" value="' + esc(r.topic) + '" placeholder="What will you teach?" aria-label="What will you teach"></div>' +
          '<span class="right"><label class="tick"><input type="checkbox" class="pdone" data-id="' + r.id + '"' + (r.done ? " checked" : "") + '><span>Done</span></label>' +
          '<button class="xbtn" data-act="planrm" data-id="' + r.id + '" aria-label="Remove period">×</button></span></div>'
      )
      .join("");
    return (
      bar +
      '<div class="savebar"><span class="pill ' + (plan.rows.length && done === plan.rows.length ? "good" : "na") + '">' + done + " of " + plan.rows.length + ' periods done</span><button class="btn small" data-act="planadd">+ Add period</button></div>' +
      '<div class="ledger">' + (rows || '<div class="row"><span></span><span class="muted">No periods. Press “Add period”.</span><span></span></div>') + "</div>" +
      '<datalist id="subjlist">' + subjectList().map((x) => "<option>" + esc(x) + "</option>").join("") + "</datalist>" +
      '<div class="panel"><h2>Notes for the day</h2><textarea class="input" id="plannote" placeholder="Things to remember, e.g. bring chart paper, PTM at 2 pm">' + esc(plan.note) + "</textarea></div>"
    );
  }

  /* ----- To-do ----- */
  function suggestions(): { key: string; text: string }[] {
    const st = D();
    const out: { key: string; text: string }[] = [];
    if (!st.students.length) return out;
    const wd = new Date().getDay();
    if (wd !== 0 && wd !== 6 && !st.attendance[TODAY]) out.push({ key: "att:" + TODAY, text: "Mark today’s attendance" });
    const days = Object.keys(st.attendance).sort().slice(-3);
    if (days.length === 3)
      st.students.forEach((s) => {
        if (days.every((d) => st.attendance[d][s.id] === false))
          out.push({ key: "abs3:" + s.id + ":" + days[2], text: "Call " + s.name + "’s parents" + (s.phone ? " (" + s.phone + ")" : "") + ": absent 3 school days in a row" });
      });
    st.tests.forEach((t) => {
      if (entered(t) === 0) out.push({ key: "marks:" + t.id, text: "Enter marks for " + t.subject + " · " + t.name });
    });
    if (st.llDate) {
      const gap = (Date.parse(TODAY) - Date.parse(st.llDate)) / 864e5;
      if (gap >= 30) out.push({ key: "ll:" + st.llDate, text: "Check reading and maths levels (last checked " + fmtShort(st.llDate) + ")" });
    } else out.push({ key: "ll:none", text: "Add baseline reading and maths levels" });
    const low = st.students.filter((s) => {
      const p = attStats(s.id).pct;
      return p != null && p < 75;
    });
    if (low.length) out.push({ key: "lowatt:" + TODAY.slice(0, 7), text: "Meet parents of " + low.length + " student" + (low.length > 1 ? "s" : "") + " with attendance below 75%" });
    const todos = st.todos || [],
      dismissed = st.dismissed || [];
    return out.filter((x) => !todos.some((t) => t.key === x.key) && dismissed.indexOf(x.key) < 0);
  }
  function dueChip(d: string): string {
    if (!d) return "";
    if (d < TODAY) return '<span class="pill bad">Overdue · ' + fmtShort(d) + "</span>";
    if (d === TODAY) return '<span class="pill warn">Today</span>';
    if (d === shiftDate(TODAY, 1)) return '<span class="pill na">Tomorrow</span>';
    return '<span class="pill na">' + fmtShort(d) + "</span>";
  }
  function todoRow(t: Todo): string {
    return (
      '<div class="row todorow' + (t.done ? " isdone" : "") + '"><label class="tick"><input type="checkbox" class="tdone" data-id="' + t.id + '"' + (t.done ? " checked" : "") +
      ' aria-label="Mark done"></label><span class="who"><b>' + esc(t.text) + "</b></span>" +
      '<span class="right">' + (t.done ? "" : dueChip(t.due)) + '<button class="xbtn" data-act="todorm" data-id="' + t.id + '" aria-label="Delete task">×</button></span></div>'
    );
  }
  function todoView(): string {
    const st = D();
    const todos = st.todos || [];
    const open = todos.filter((t) => !t.done).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : (a.due || "9999") > (b.due || "9999") ? 1 : 0);
    const done = todos.filter((t) => t.done);
    const sug = suggestions();
    const form =
      '<form id="f-todo" class="panel"><div class="todoadd"><div class="field"><label for="td-text">New task</label><input class="input" id="td-text" required placeholder="e.g. Check UT2 Hindi copies"></div>' +
      '<div class="field"><label for="td-due">Due (optional)</label><input class="input" id="td-due" type="date"></div><button class="btn primary" type="submit">Add</button></div></form>';
    const sugHtml = sug.length
      ? '<div class="panel"><h2>Suggested from your class</h2>' +
        sug
          .map(
            (x) =>
              '<div class="sugrow"><span>' + esc(x.text) + '</span><span class="actions"><button class="btn small" data-act="sugadd" data-key="' + esc(x.key) + '">Add</button>' +
              '<button class="link" data-act="sugno" data-key="' + esc(x.key) + '">Dismiss</button></span></div>'
          )
          .join("") +
        "</div>"
      : "";
    const list =
      '<div class="ledger">' + (open.length ? open.map(todoRow).join("") : '<div class="row"><span></span><span class="muted">Nothing to do. Add a task above.</span><span></span></div>') + "</div>";
    const doneHtml = done.length
      ? '<div><button class="link" data-act="todoshowdone">' + (showDone ? "Hide" : "Show") + " " + done.length + " done task" + (done.length > 1 ? "s" : "") + "</button></div>" +
        (showDone ? '<div class="ledger">' + done.map(todoRow).join("") + "</div>" : "")
      : "";
    return form + sugHtml + list + doneHtml;
  }

  /* ----- Parent meeting ----- */
  function subjectTrend(id: string): { subject: string; from: number; to: number }[] {
    const by: Record<string, number[]> = {};
    testsAsc().forEach((t) => {
      const m = t.marks[id];
      if (m == null) return;
      (by[t.subject] = by[t.subject] || []).push(Math.round((m / t.max) * 100));
    });
    return Object.keys(by)
      .filter((k) => by[k].length >= 2)
      .map((k) => ({ subject: k, from: by[k][0], to: by[k][by[k].length - 1] }));
  }
  function ptmPoints(s: Student): { good: string[]; discuss: string[]; ask: string[]; home: string[] } {
    const F = s.name.split(" ")[0];
    const a = attStats(s.id);
    const subs = subjectsFor(s.id)
      .filter((x) => x.max)
      .map((x) => ({ subject: x.subject, p: Math.round((x.got / x.max) * 100) }));
    const best = subs.length ? subs.reduce((x, y) => (y.p > x.p ? y : x)) : null;
    const weak = subs.length ? subs.reduce((x, y) => (y.p < x.p ? y : x)) : null;
    const trend = subjectTrend(s.id);
    const rd = llOf("lit", s.id),
      mt = llOf("math", s.id);
    const rg = growthOf(rd);
    const absentTests = testsAsc().filter((t) => t.marks[s.id] == null).length;
    const good: string[] = [],
      discuss: string[] = [],
      ask: string[] = [],
      home: string[] = [];

    if (best && best.p >= 60) good.push("Doing well in " + best.subject + " (" + best.p + "%)");
    trend.filter((t) => t.to - t.from >= 10).slice(0, 1).forEach((t) => good.push(t.subject + " marks went up from " + t.from + "% to " + t.to + "%"));
    if (rd && rg != null && rg >= 1) good.push("Reading grew from " + lvLabel(rd.base) + " to " + lvLabel(rd.now) + " level");
    if (a.pct != null && a.pct >= 90) good.push("Comes to school regularly (" + a.pct + "%)");
    if (!good.length) good.push("Write one thing " + F + " does well: ________________");

    if (a.pct != null && a.pct < 75) discuss.push("Attendance is " + a.pct + "% (" + (a.t - a.p) + " days missed)");
    if (weak && weak.p < 40) discuss.push(weak.subject + " marks are low (" + weak.p + "%)");
    trend.filter((t) => t.from - t.to >= 10).slice(0, 1).forEach((t) => discuss.push(t.subject + " marks dropped from " + t.from + "% to " + t.to + "%"));
    if (rd && bandOf(rd.now) === 2) discuss.push("Reading is at " + lvLabel(rd.now) + " level, 3+ years below Grade " + gradeNum());
    if (mt && bandOf(mt.now) === 2) discuss.push("Maths is at " + lvLabel(mt.now) + " level, 3+ years below Grade " + gradeNum());
    if (absentTests) discuss.push("Missed " + absentTests + " test" + (absentTests > 1 ? "s" : ""));
    if (!discuss.length) discuss.push("No major concerns. Share the next goal for " + F + ".");

    ask.push("Does " + F + " read or study at home? At what time?");
    if (a.pct != null && a.pct < 75) ask.push("What makes it hard for " + F + " to come to school every day?");
    ask.push("Is there anything at home we should know about?");

    if (rd && bandOf(rd.now) !== 0) home.push("Read aloud together for 10 minutes every day (use the reading practice sheet)");
    if (weak && weak.p < 60) home.push("Practise " + weak.subject + " for 10 minutes daily");
    if (mt && bandOf(mt.now) === 2 && home.length < 3) home.push("Practise tables and simple sums at home");
    if (a.pct != null && a.pct < 75 && home.length < 3) home.push("Send " + F + " to school every day, on time");
    if (!home.length) home.push("Keep praising " + F + "’s effort and ask about school every day");
    return { good: good.slice(0, 3), discuss: discuss.slice(0, 4), ask: ask.slice(0, 3), home: home.slice(0, 3) };
  }
  function ptmCard(s: Student, forPrint: boolean): string {
    const st = D();
    const a = attStats(s.id),
      avg = avgPct(s.id);
    const rd = llOf("lit", s.id),
      mt = llOf("math", s.id);
    const pts = ptmPoints(s);
    const note = (st.ptmNotes || {})[s.id] || "";
    const ul = (xs: string[]) => "<ul>" + xs.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
    return (
      '<article class="rc ptm"><header class="rc-head"><span class="eyebrow">Parent–teacher meeting' + (st.ptmDate ? " · " + fmt(st.ptmDate) : "") + "</span><h3>" + esc(s.name) +
      '</h3><span class="muted">Roll ' + s.roll + " · Class " + esc(st.cls.grade) + "-" + esc(st.cls.section) + (s.phone ? " · Parent " + esc(s.phone) : "") + "</span></header>" +
      '<div class="ptm-facts"><div><span>Attendance</span><b>' + (a.pct == null ? "—" : a.pct + "%") + "</b></div><div><span>Average marks</span><b>" + (avg == null ? "—" : avg + "% · " + grade(avg)) +
      "</b></div><div><span>Reading</span><b>" + (rd ? lvLabel(rd.now) : "—") + "</b></div><div><span>Maths</span><b>" + (mt ? lvLabel(mt.now) : "—") + "</b></div></div>" +
      '<div class="ptm-grid"><div class="ptm-sec good"><h4>Going well</h4>' + ul(pts.good) + '</div><div class="ptm-sec warn"><h4>To discuss</h4>' + ul(pts.discuss) + "</div>" +
      '<div class="ptm-sec"><h4>Ask the parents</h4>' + ul(pts.ask) + '</div><div class="ptm-sec"><h4>Agree on home support</h4>' + ul(pts.home) + "</div></div>" +
      '<div class="ptm-sec"><h4>Notes from the meeting</h4>' +
      (forPrint
        ? note
          ? "<p>" + esc(note) + "</p>"
          : '<div class="lines"><i></i><i></i><i></i></div>'
        : '<textarea class="input ptmnote" data-id="' + s.id + '" placeholder="What did the parents say? What did you agree?">' + esc(note) + "</textarea>") +
      "</div>" +
      '<div class="rc-sign"><div>Teacher</div><div>Parent</div><div>Next check-in</div></div></article>'
    );
  }
  function ptmList(): Student[] {
    const st = D();
    return ptmFilter === "need" ? needsAttention() : st.students;
  }
  function ptmView(): string {
    const st = D();
    if (!st.students.length) return '<div class="panel empty"><h2>No students yet</h2><button class="btn primary" data-act="go" data-view="students" data-add="1">Add students</button></div>';
    const need = needsAttention().length;
    const list = ptmList();
    const top =
      '<div class="panel"><div class="grid2"><div class="field"><label for="ptmdate">Meeting date</label><input class="input" id="ptmdate" type="date" value="' + esc(st.ptmDate || "") + '"></div>' +
      '<div class="field"><label>Which students</label><div class="filters" style="min-height:44px;align-items:center">' +
      '<button class="fbtn' + (ptmFilter === "need" ? " on" : "") + '" data-act="ptmfilter" data-f="need">Need attention · ' + need + "</button>" +
      '<button class="fbtn' + (ptmFilter === "all" ? " on" : "") + '" data-act="ptmfilter" data-f="all">All students · ' + st.students.length + "</button></div></div></div></div>";
    let body: string;
    let printing: Student[];
    if (ptmOne) {
      const s = st.students.find((x) => x.id === ptmOne);
      printing = s ? [s] : [];
      body =
        '<div class="savebar"><button class="link" data-act="ptmback">← All agendas</button><button class="btn small" data-act="ptmprint">Print this agenda</button></div>' +
        '<div class="cards">' + (s ? ptmCard(s, false) : "") + "</div>";
    } else {
      printing = list;
      body =
        '<div class="savebar"><span class="muted">' + list.length + " agenda" + (list.length === 1 ? "" : "s") + ". Tap a student to open and add notes.</span>" +
        (list.length ? '<button class="btn primary small" data-act="ptmprint">Print ' + list.length + " agenda" + (list.length === 1 ? "" : "s") + "</button>" : "") + "</div>" +
        '<div class="ledger"><div class="lhead"><span>Roll</span><span>Student · main point</span><span>Att · Marks</span></div>' +
        (list.length
          ? list
              .map((s) => {
                const p = ptmPoints(s);
                return (
                  '<button class="row" data-act="ptmone" data-id="' + s.id + '"><span class="roll">' + String(s.roll).padStart(2, "0") + '</span><span class="who"><b>' + esc(s.name) + "</b><span>" + esc(p.discuss[0]) +
                  '</span></span><span class="right">' + attPill(attStats(s.id).pct) + mkPill(avgPct(s.id)) + "</span></button>"
                );
              })
              .join("")
          : '<div class="row"><span></span><span class="muted">No students need attention right now.</span><span></span></div>') +
        "</div>";
    }
    return top + body + '<div class="print-only cards">' + printing.map((s) => "<div>" + ptmCard(s, true) + "</div>").join("") + "</div>";
  }

  /* ----- Agenda on the home page ----- */
  function agendaHomePanel(): string {
    const st = D();
    const plan = (st.plans || {})[TODAY];
    const open = (st.todos || []).filter((t) => !t.done).sort((a, b) => ((a.due || "9999") < (b.due || "9999") ? -1 : 1));
    const sug = suggestions().length;
    const planLine = plan && plan.rows.length
      ? plan.rows.filter((r) => r.done).length + " of " + plan.rows.length + " periods done"
      : "No plan for today yet";
    const next = plan ? plan.rows.find((r) => !r.done) : null;
    return (
      '<div class="two"><div class="panel"><div class="phead"><h2>Today’s plan</h2><button class="link" data-act="go" data-view="agenda" data-tab="plan">Open plan</button></div>' +
      '<p><b>' + planLine + "</b></p>" + (next ? '<p class="muted">Next: ' + esc(next.time) + " · " + esc(next.subject || "Period") + (next.topic ? ": " + esc(next.topic) : "") + "</p>" : "") +
      '</div><div class="panel"><div class="phead"><h2>To-do</h2><button class="link" data-act="go" data-view="agenda" data-tab="todo">All tasks</button></div>' +
      (open.length ? open.slice(0, 3).map((t) => '<div class="sugrow"><span>' + esc(t.text) + "</span>" + dueChip(t.due) + "</div>").join("") : '<p class="muted">No open tasks.</p>') +
      (sug ? '<p class="muted" style="font-size:.85rem">' + sug + " suggested task" + (sug > 1 ? "s" : "") + " waiting</p>" : "") +
      "</div></div>"
    );
  }

  /* ---------- events ---------- */
  function onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-act]");
    if (!el) return;
    const ds = el.dataset;
    const a = ds.act;
    if (a === "go") {
      if (ds.add) addOpen = true;
      if (ds.view === "agenda" && ds.tab) {
        agTab = ds.tab as AgTab;
        ptmOne = null;
      }
      if (ds.view === "reports") reportOne = null;
      go(ds.view as View, ds.param);
    } else if (a === "authtab") {
      authTab = ds.tab || "login";
      render();
    } else if (a === "sample") {
      S = loadClass(SAMPLE_EMAIL) || sampleState();
      go("home");
    } else if (a === "logout") {
      store(KEY_SESSION, null);
      S = null;
      view = "home";
      attDraft = null;
      testDraft = null;
      reportsShown = false;
      reportOne = null;
      addOpen = false;
      llEdit = false;
      llFocus = null;
      llSub = "lit";
      newTestOpen = false;
      query = "";
      authTab = "login";
      agTab = "plan";
      planDate = TODAY;
      ptmOne = null;
      render();
      window.scrollTo(0, 0);
    }
    if (!S) return; // everything below needs a logged-in class
    const st = S;
    if (a === "toggleadd") {
      addOpen = !addOpen;
      render();
    } else if (a === "togglenew") {
      newTestOpen = !newTestOpen;
      render();
    } else if (a === "att" && attDraft && ds.id) {
      attDraft.m[ds.id] = ds.v === "1";
      attSaved = false;
      render();
    } else if (a === "attall" && attDraft) {
      const draft = attDraft;
      st.students.forEach((s) => {
        draft.m[s.id] = true;
      });
      attSaved = false;
      render();
    } else if (a === "attsave" && attDraft) {
      const draft = attDraft;
      st.attendance[attDate] = Object.assign({}, draft.m);
      attSaved = true;
      render();
      const p = st.students.filter((s) => draft.m[s.id]).length;
      toast("Attendance saved for " + fmtShort(attDate) + ": " + p + " of " + st.students.length + " present");
    } else if (a === "testsave" && testDraft) {
      const draft = testDraft;
      const t = st.tests.find((x) => x.id === draft.id);
      if (!t) return;
      let bad = 0;
      st.students.forEach((s) => {
        const v = draft.m[s.id];
        if (v !== null && (isNaN(v) || v < 0 || v > t.max)) bad++;
      });
      if (bad) {
        toast("Fix " + bad + " mark" + (bad > 1 ? "s" : "") + " in red: each must be between 0 and " + t.max);
        return;
      }
      st.students.forEach((s) => {
        t.marks[s.id] = draft.m[s.id];
      });
      toast("Marks saved for " + t.subject + " · " + t.name);
      testDraft = null;
      go("tests");
    } else if (a === "lledit") {
      llEdit = true;
      if (!st.llBase) st.llBase = TODAY;
      render();
    } else if (a === "lldone") {
      llEdit = false;
      st.llDate = TODAY;
      render();
      toast(SUBJ[llSub] + " levels saved for " + st.students.length + " students");
    } else if (a === "llsub") {
      llSub = ds.sub as Sub;
      llFocus = null;
      render();
    } else if (a === "llfocus") {
      llSub = ds.sub as Sub;
      const b = Number(ds.band);
      llFocus = view === "skills" && llFocus === b ? null : b;
      if (view === "skills") render();
      else go("skills");
    } else if (a === "llunfocus") {
      llFocus = null;
      render();
    } else if (a === "reportall" || a === "showall") {
      reportsShown = true;
      reportOne = null;
      view = "reports";
      render();
      if (a === "reportall") setTimeout(() => window.print(), 60);
    } else if (a === "remarkone" && ds.id) {
      const s = st.students.find((x) => x.id === ds.id);
      if (!s) return;
      const turn = s.remark.trim() ? (remarkTurn[s.id] || 0) + 1 : remarkTurn[s.id] || 0;
      remarkTurn[s.id] = turn;
      s.remark = remarkFor(s, turn);
      render();
    } else if (a === "remarksall") {
      const empty = st.students.filter((s) => !s.remark.trim());
      if (empty.length) {
        empty.forEach((s) => {
          s.remark = remarkFor(s, remarkTurn[s.id] || 0);
        });
        render();
        toast(empty.length + " remarks filled. Read them and change anything you like.");
      } else {
        if (!window.confirm("Give every student a fresh remark? Anything you typed in the remarks will be replaced.")) return;
        st.students.forEach((s) => {
          remarkTurn[s.id] = (remarkTurn[s.id] || 0) + 1;
          s.remark = remarkFor(s, remarkTurn[s.id]);
        });
        render();
        toast("New wording for all " + st.students.length + " remarks.");
      }
    } else if (a === "sheetone" && ds.key) {
      const g = groupsFor(llSub).find((x) => x.key === ds.key);
      if (!g) return;
      makeSheet(g, llSub);
      render();
      toast("Sheet ready for " + g.label + " level.");
    } else if (a === "sheetsall") {
      const groups = groupsFor(llSub);
      if (!groups.length) return;
      groups.forEach((g) => makeSheet(g, llSub));
      render();
      toast(groups.length + " sheets ready.");
    } else if (a === "sheetprint" || a === "sheetsprint") {
      printGroup = a === "sheetprint" ? ds.key || null : null;
      render();
      setTimeout(() => window.print(), 60);
    } else if (a === "llview") {
      llView = ds.v === "groups" ? "groups" : "list";
      render();
    } else if (a === "lvsheet") {
      go("sheets");
    } else if (a === "agtab") {
      agTab = (ds.tab as AgTab) || "plan";
      ptmOne = null;
      render();
    } else if (a === "planday") {
      const d = Number(ds.d);
      planDate = d === 0 ? TODAY : shiftDate(planDate, d);
      render();
    } else if (a === "plannew" || a === "plancopy") {
      st.plans = st.plans || {};
      const from = a === "plancopy" && ds.from ? st.plans[ds.from] : null;
      st.plans[planDate] = {
        rows: from
          ? from.rows.map((r) => ({ id: uid(), time: r.time, subject: r.subject, topic: "", done: false }))
          : PERIOD_TIMES.map((t) => ({ id: uid(), time: t, subject: "", topic: "", done: false })),
        note: "",
      };
      render();
    } else if (a === "planadd") {
      const plan = (st.plans || {})[planDate];
      if (!plan) return;
      plan.rows.push({ id: uid(), time: "", subject: "", topic: "", done: false });
      render();
      const ins = root.querySelectorAll<HTMLInputElement>(".planrow .pt");
      if (ins.length) ins[ins.length - 1].focus();
    } else if (a === "planrm" && ds.id) {
      const plan = (st.plans || {})[planDate];
      if (!plan) return;
      plan.rows = plan.rows.filter((r) => r.id !== ds.id);
      render();
    } else if (a === "todorm" && ds.id) {
      st.todos = (st.todos || []).filter((t) => t.id !== ds.id);
      render();
    } else if (a === "sugadd" && ds.key) {
      const sg = suggestions().find((x) => x.key === ds.key);
      if (!sg) return;
      (st.todos = st.todos || []).push({ id: uid(), text: sg.text, done: false, due: TODAY, key: sg.key });
      render();
      toast("Added to your to-do list");
    } else if (a === "sugno" && ds.key) {
      (st.dismissed = st.dismissed || []).push(ds.key);
      render();
    } else if (a === "todoshowdone") {
      showDone = !showDone;
      render();
    } else if (a === "ptmfilter") {
      ptmFilter = ds.f === "all" ? "all" : "need";
      ptmOne = null;
      render();
    } else if (a === "ptmone" && ds.id) {
      ptmOne = ds.id;
      render();
      window.scrollTo(0, 0);
    } else if (a === "ptmopen" && ds.id) {
      agTab = "ptm";
      ptmOne = ds.id;
      go("agenda");
    } else if (a === "ptmback") {
      ptmOne = null;
      render();
    } else if (a === "ptmprint") {
      window.print();
    } else if (a === "reportlist") {
      reportsShown = false;
      reportOne = null;
      render();
      window.scrollTo(0, 0);
    } else if (a === "print") {
      window.print();
    } else if (a === "resetsample") {
      if (!window.confirm("Reset the sample class? All changes to it will be lost.")) return;
      S = sampleState();
      attDraft = null;
      testDraft = null;
      go("home");
      toast("Sample class reset");
    } else if (a === "reportone") {
      reportOne = ds.param || null;
      go("reports");
    }
  }

  function onSubmit(e: SubmitEvent): void {
    const f = e.target as HTMLFormElement;
    if (!root.contains(f)) return;
    e.preventDefault();
    const v = (id: string): string => {
      const x = byId<HTMLInputElement>(id);
      return x ? x.value.trim() : "";
    };
    if (f.id === "f-login") {
      // Prototype login: opens this email's saved class, or a fresh sample class.
      const email = v("l-email") || SAMPLE_EMAIL;
      S = loadClass(email);
      if (!S) {
        S = sampleState();
        S.teacher.email = email;
      }
      go("home");
    } else if (f.id === "f-signup") {
      S = {
        teacher: { name: v("u-name") || "Teacher", email: v("u-email") },
        cls: { school: v("u-school"), grade: v("u-grade"), section: v("u-sec") || "A", year: v("u-year") || "2026–27" },
        students: [],
        attendance: {},
        tests: [],
        ll: emptyLL(),
        llBase: null,
        llDate: null,
        sample: false,
      };
      go("home");
      toast("Class created. Now add your students.");
    }
    if (!S) return;
    const st = S;
    if (f.id === "f-add") {
      const name = v("a-name");
      if (!name) return;
      const roll = parseInt(v("a-roll"), 10) || st.students.length + 1;
      st.students.push({ id: "s" + Date.now(), roll, name, phone: v("a-phone"), remark: "" });
      st.students.sort((a, b) => a.roll - b.roll);
      attDraft = null;
      render();
      toast(name + " added");
    } else if (f.id === "f-bulk") {
      const lines = v("b-names")
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean);
      if (!lines.length) return;
      const next = st.students.reduce((m, s) => Math.max(m, s.roll), 0);
      lines.forEach((nm, i) => {
        st.students.push({ id: "s" + Date.now() + "_" + i, roll: next + i + 1, name: nm, phone: "", remark: "" });
      });
      attDraft = null;
      addOpen = false;
      render();
      toast(lines.length + " students added");
    } else if (f.id === "f-todo") {
      const text = v("td-text");
      if (!text) return;
      (st.todos = st.todos || []).push({ id: uid(), text, done: false, due: v("td-due") });
      render();
      const box = byId<HTMLInputElement>("td-text");
      if (box) box.focus();
    } else if (f.id === "f-newtest") {
      const max = parseInt(v("n-max"), 10);
      if (!(max > 0)) return;
      const t: Test = { id: "t" + Date.now(), name: v("n-name") || "Test", subject: v("n-sub") || "Subject", max, date: v("n-date") || TODAY, marks: {} };
      st.students.forEach((s) => {
        t.marks[s.id] = null;
      });
      st.tests.push(t);
      newTestOpen = false;
      go("test", t.id);
    }
  }

  function onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (!S || !root.contains(el)) return;
    const st = S;
    if (el.id === "q") {
      query = el.value;
      const box = byId("slist");
      if (box) box.innerHTML = studentRows();
    } else if (el.classList.contains("mk") && testDraft) {
      const draft = testDraft;
      const t = st.tests.find((x) => x.id === draft.id);
      const id = el.dataset.id;
      if (!t || !id) return;
      const raw = el.value.trim();
      draft.raw[id] = el.value;
      if (raw === "" || raw.toUpperCase() === "AB") {
        draft.m[id] = null;
        el.classList.remove("err");
      } else {
        const n = Number(raw);
        draft.m[id] = n;
        el.classList.toggle("err", isNaN(n) || n < 0 || n > t.max);
      }
      const sts = byId("tstats");
      if (sts) sts.innerHTML = testStatsHtml(t, draft.m);
      const errs = root.querySelectorAll(".mk.err").length,
        te = byId("terr");
      if (te) te.textContent = errs ? errs + " mark" + (errs > 1 ? "s are" : " is") + " above " + t.max + " or not a number" : "";
    } else if (el.classList.contains("plf") && el.dataset.id && el.dataset.f) {
      const plan = (st.plans || {})[planDate];
      const r = plan ? plan.rows.find((x) => x.id === el.dataset.id) : null;
      const f = el.dataset.f;
      if (r && (f === "time" || f === "subject" || f === "topic")) r[f] = el.value;
      save();
    } else if (el.id === "plannote") {
      const plan = (st.plans || {})[planDate];
      if (plan) plan.note = el.value;
      save();
    } else if (el.classList.contains("ptmnote") && el.dataset.id) {
      (st.ptmNotes = st.ptmNotes || {})[el.dataset.id] = el.value;
      save();
    } else if (el.id === "remark" || el.classList.contains("rmk")) {
      const s = st.students.find((x) => x.id === el.dataset.id);
      if (s) s.remark = el.value;
      save();
    }
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (!S || !root.contains(el)) return;
    if (el.classList && el.classList.contains("llsel") && el.dataset.id) {
      const rr = S.ll[llSub][el.dataset.id];
      if (rr) rr.now = Number(el.value);
      save();
    }
    const st = S;
    if (el.classList.contains("pdone") && el.dataset.id) {
      const plan = (st.plans || {})[planDate];
      const r = plan ? plan.rows.find((x) => x.id === el.dataset.id) : null;
      if (r) r.done = (el as HTMLInputElement).checked;
      render();
    }
    if (el.classList.contains("tdone") && el.dataset.id) {
      const t = (st.todos || []).find((x) => x.id === el.dataset.id);
      if (t) t.done = (el as HTMLInputElement).checked;
      render();
      if (t && t.done) toast("Done: " + t.text);
    }
    if (el.id === "plandate" && el.value) {
      planDate = el.value;
      render();
    }
    if (el.id === "ptmdate") {
      st.ptmDate = el.value;
      render();
    }
    if (el.id === "attdate" && el.value) {
      attDate = el.value > TODAY ? TODAY : el.value;
      render();
    }
  }

  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);

  // Reopen the class that was open last time on this browser.
  const session = load(KEY_SESSION);
  if (session) S = loadClass(session);

  render();

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("submit", onSubmit);
    document.removeEventListener("input", onInput);
    document.removeEventListener("change", onChange);
    clearTimeout(toastT);
    root.innerHTML = "";
  };
}
