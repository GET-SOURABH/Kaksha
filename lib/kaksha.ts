/* Kaksha class register — app logic.
   Ported from the original single-file HTML prototype to TypeScript.
   startKaksha() draws the app into `root` and returns a cleanup function. */

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
}
interface SubjectTotal {
  subject: string;
  got: number;
  max: number;
  abs: number;
}
type Tone = "good" | "warn" | "bad" | "na";
type View = "home" | "students" | "student" | "attendance" | "tests" | "test" | "skills" | "reports";

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
    llFocus: number | null = null;

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
  function autoRemark(s: Student): string {
    const a = avgPct(s.id),
      at = attStats(s.id).pct;
    let txt: string;
    if (a == null) txt = "Marks not entered yet.";
    else if (a >= 80) txt = "Excellent work this year. Keep reading every day.";
    else if (a >= 60) txt = "Steady progress. Keep practising daily at home.";
    else if (a >= 40) txt = "Improving. Needs regular practice in weaker subjects.";
    else txt = "Needs extra support. Daily home practice will help a lot.";
    if (at != null && at < 75) txt += " Please ensure regular attendance.";
    return txt;
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
  };
  function icon(k: string): string {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + "</svg>";
  }
  const NAV: [View, string][] = [
    ["home", "Home"],
    ["students", "Students"],
    ["attendance", "Attendance"],
    ["tests", "Tests"],
    ["skills", "Learning levels"],
    ["reports", "Report cards"],
  ];
  function navKey(): View {
    return view === "student" ? "students" : view === "test" ? "tests" : view;
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
          (n[0] === "reports" ? "Reports" : n[0] === "skills" ? "Levels" : n[1]) + "</span></button>"
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
      case "reports":
        body = reportsView();
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
    return phead("", hello, "Here’s how your class is doing.", null) + today + stats + '<div class="two">' + needList + recent + "</div>" + llHomePanel(n);
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
      '</textarea><p class="muted" style="font-size:.85rem">Leave empty to use the suggested remark shown above.</p>' +
      '<div><button class="btn" data-act="reportone" data-param="' + s.id + '">View report card</button></div></div>'
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
        : '<button class="btn primary" data-act="lledit">' + (st.llBase ? "Update levels" : "Add baseline levels") + "</button>"
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
    const table =
      '<div class="panel"><div class="phead"><h2>Every student · ' + SUBJ[sub] + "</h2>" + (llEdit ? '<span class="status unsaved">Editing</span>' : "") + "</div>" +
      (llEdit ? '<p class="note">Choose each student’s current level after this month’s check, then press Save levels. Growth updates automatically.</p>' : "") +
      '<div class="sgrid"><table class="lltable"><thead><tr><th class="sticky">Student</th><th>Baseline</th><th>Now</th><th>Growth</th><th>Status</th></tr></thead><tbody>' +
      rows + "</tbody></table></div></div>";
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
    const head = phead("End of year", "Report cards", "Every report card is built from the attendance and marks you have already entered.", '<button class="btn primary" data-act="reportall">Print all ' + n + " report cards</button>");
    const note =
      '<div class="note"><b>Tip:</b> each student’s report card prints on its own page. To get a PDF, choose <b>Save as PDF</b> in the print window.</div>';
    let body = "";
    if (reportOne) {
      const s = st.students.find((x) => x.id === reportOne);
      body =
        '<div class="savebar"><span class="actions"><button class="btn small" data-act="print">Print this report card</button><button class="link" data-act="showall">Show all ' + n +
        '</button></span></div><div class="cards">' +
        (s ? rcHtml(s) : "") + "</div>";
    } else if (reportsShown) {
      body =
        '<div class="savebar"><span class="pill good">' + n + ' report cards ready</span><button class="btn small" data-act="print">Print</button></div><div class="cards">' +
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

  /* ---------- events ---------- */
  function onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-act]");
    if (!el) return;
    const ds = el.dataset;
    const a = ds.act;
    if (a === "go") {
      if (ds.add) addOpen = true;
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
    } else if (el.id === "remark") {
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
