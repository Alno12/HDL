import { useState, useEffect, useRef, useMemo } from "react";

/* ─────────────  Design tokens — linguagem Apple Saúde  ──────────── */
/* Pilha do sistema: no iPhone renderiza SF Pro (a alma do visual iOS) e
   elimina a dependência de rede para carregar fontes. */
const SYS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const C = {
  bg:    "#F2F2F7", // fundo agrupado
  card:  "#FFFFFF", // cartão
  ink:   "#1C1C1E", // rótulo primário (quase-preto)
  mute:  "#8E8E93", // rótulo secundário
  faint: "#AEAEB2", // terciário / dígito zerado (systemGray2 — 2.21:1, era #C7C7CC/1.68)
  hair:  "#E5E5EA", // separadores / grade (hairline)
  fill:  "#EFEFF4", // preenchimento interno (tiles, botões rápidos)

  // Cores por categoria — VIVAS: só em preenchimentos (barras, gráficos,
  // botões cheios com texto branco, ícones grandes).
  activity: "#FF6B35", // Atividade / minutos em zona
  heart:    "#FF2D55", // Coração / FC
  body:     "#AF52DE", // Corpo / Peso (4.13:1 — serve também como texto)
  food:     "#34C759", // Alimentação
  exam:     "#30B0C7", // Exames / sangue
  blue:     "#007AFF", // ação primária do sistema / configurações
  danger:   "#FF3B30", // exclusão / zerar dados

  // Variantes de TEXTO (mais escuras) — cor de categoria como rótulo sobre
  // branco/fill. Verificadas ≥3:1 (padrão do próprio Apple Saúde).
  activityTx: "#C6441A", // 4.95:1
  foodTx:     "#248A3D", // 4.40:1
  examTx:     "#0E7A8D", // 5.02:1
  heartTx:    "#D91E52", // 4.93:1
};

// Cor de texto por categoria (usa a variante escura; `body` já passa vivo).
const CTX = {
  activity: C.activityTx, food: C.foodTx, exam: C.examTx,
  heart: C.heartTx, body: C.body,
};

// Ícone pequeno de categoria (18px, stroke em currentColor) — usado no
// cabeçalho dos cards e na tab bar para reforçar a cor de cada assunto.
function CatIcon({ kind, size = 18 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (kind === "activity") // cronômetro (minutos em zona)
    return (<svg {...p}><circle cx="12" cy="13" r="8" /><path d="M12 13V9" /><path d="M9 2h6" /></svg>);
  if (kind === "heart")
    return (<svg {...p}><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.3 4 2.5.8-1.2 2-2.5 4-2.5 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20Z" /></svg>);
  if (kind === "body") // balança (gauge)
    return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M12 8v3l2.5 1.5" /></svg>);
  if (kind === "food") // folha
    return (<svg {...p}><path d="M4 20c8 2 15-4 15-13 0-1-.2-2-.5-3-9-1-14 4-14 10 0 2 .5 4 1.5 5Z" /><path d="M5 19c4-4 8-6 12-7" /></svg>);
  if (kind === "exam") // gota (sangue)
    return (<svg {...p}><path d="M12 3.5s6.5 7.7 6.5 12.3a6.5 6.5 0 0 1-13 0C5.5 11.2 12 3.5 12 3.5Z" /></svg>);
  return null;
}

const KEY = "hdl-app-state-v3";
const LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];

const FOODS = [
  { key: "fish", emoji: "🐟", name: "Peixe gordo", portion: "100–150g (sardinha, salmão, atum)" },
  { key: "nuts", emoji: "🥜", name: "Castanhas", portion: "1 punhado (~30g)" },
  { key: "oats", emoji: "🌾", name: "Aveia", portion: "3–4 col. de sopa (30–40g)" },
  { key: "olive", emoji: "🫒", name: "Azeite extravirgem", portion: "1 col. de sopa, de preferência cru" },
  { key: "avocado", emoji: "🥑", name: "Abacate", portion: "1/2 abacate ou 1 avocado (~100g)" },
];

/* ─────────────────────────  Datas  ─────────────────────────────── */

// Formata um Date como YYYY-MM-DD usando os componentes LOCAIS (nunca UTC).
// toISOString() converte para UTC e, à noite no Brasil (UTC-3) ou em fusos
// com offset > +12h (ex.: Kiribati, UTC+14), a data resultante pode cair no
// dia errado. Usar getFullYear/getMonth/getDate evita isso em qualquer fuso.
function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOf(dateStr) {
  // "T12:00:00" (meio-dia local, sem "Z") ancora no meio do dia só para
  // proteger a subtração de DST — a leitura de volta é sempre local (ymdLocal).
  const d = new Date(dateStr + "T12:00:00");
  const off = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - off);
  return ymdLocal(d);
}
const todayStr = () => ymdLocal(new Date());
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return ymdLocal(d);
}
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function weekLabel(monday) {
  const a = new Date(monday + "T12:00:00");
  const b = new Date(monday + "T12:00:00");
  b.setDate(b.getDate() + 6);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MESES[a.getMonth()]}`
    : `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}
function fmtBR(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function fmtShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}
function weekdayShort(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}
// Índice do dia da semana com segunda = 0 ... domingo = 6 (mesma convenção de mondayOf).
function weekdayMon0(dateStr) {
  return (new Date(dateStr + "T12:00:00").getDay() + 6) % 7;
}
const WEEKDAY_CAP = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

/* ─────────────────────────  Estado  ────────────────────────────── */

const defaultGoals = {
  minWeek: 140, zoneLow: 130, zoneHigh: 155,
  fish: 2, nuts: 5, oats: 5, olive: 7, avocado: 4,
  weightGoal: 75, hdlGoal: 40,
};

function emptyState() {
  return {
    goals: { ...defaultGoals },
    workouts: [],
    exams: [{ id: "e1", date: "2026-07-15", ct: 155, hdl: 39, tg: 97, note: "Início do plano" }],
    days: {},
    vitals: {},
  };
}

function demoState() {
  const thisMon = mondayOf(todayStr());
  const workouts = [];
  const days = {};
  const vitals = {};
  const mins = [55, 70, 80, 95, 90, 110, 105, 125, 120, 135, 130, 145];
  const rest = [67, 66, 66, 65, 65, 64, 63, 63, 62, 62, 61, 61];
  const wt =  [79.8, 79.6, 79.4, 79.2, 79.0, 78.9, 78.7, 78.6, 78.4, 78.3, 78.2, 78.1];
  const hr =  [134, 135, 136, 137, 138, 139, 140, 141, 141, 142, 143, 144];
  for (let i = 0; i < 12; i++) {
    const mon = addDays(thisMon, -7 * (12 - i));
    const per = Math.round(mins[i] / 3);
    [1, 3, 5].forEach((dow, j) => {
      const m = j === 2 ? mins[i] - per * 2 : per;
      if (m > 0)
        workouts.push({
          id: `d${i}-${j}`, date: addDays(mon, dow), minutes: m,
          type: j === 1 ? "Bike" : "Corrida", avgHr: hr[i] + (j - 1) * 2,
        });
    });
    for (let d = 0; d < 7; d++) {
      days[addDays(mon, d)] = {
        fish: (d === 2 || (d === 6 && i % 2 === 0)) ? 1 : 0,
        nuts: d < 4 + (i % 2) ? 1 : 0,
        oats: d < 4 + Math.floor(i / 6) ? 1 : 0,
        olive: d < 5 + (i % 3 === 0 ? 1 : 0) ? 1 : 0,
        avocado: (d === 1 || d === 4 || (d === 6 && i % 2 === 1)) ? 1 : 0,
      };
      vitals[addDays(mon, d)] = {
        weight: Math.round((wt[i] + (d - 3) * 0.03) * 10) / 10,
        restHr: rest[i] + (d % 3 === 0 ? -1 : d % 3 === 1 ? 1 : 0),
      };
    }
  }
  const wd = (new Date().getDay() + 6) % 7;
  for (let d = 0; d <= wd; d++) {
    days[addDays(thisMon, d)] = {
      fish: d === 2 ? 1 : 0,
      nuts: d <= wd ? 1 : 0,
      oats: d % 2 === 0 || d === wd ? 1 : 0,
      olive: 1,
      avocado: d === 1 || d === 4 ? 1 : 0,
    };
    vitals[addDays(thisMon, d)] = {
      weight: Math.round((78.1 - d * 0.02) * 10) / 10,
      restHr: 61 - (d % 2),
    };
  }
  workouts.push({ id: "cw1", date: addDays(thisMon, Math.max(0, wd - 2)), minutes: 48, type: "Corrida", avgHr: 144 });
  if (wd >= 2) workouts.push({ id: "cw2", date: addDays(thisMon, wd - 1), minutes: 42, type: "Bike", avgHr: 139 });
  return {
    goals: { ...defaultGoals },
    workouts, days, vitals,
    exams: [
      { id: "e0", date: "2026-01-20", ct: 162, hdl: 35, tg: 118, note: "Antes de começar" },
      { id: "e05", date: "2026-04-14", ct: 158, hdl: 37, tg: 104, note: "3 meses de caminhada" },
      { id: "e1", date: "2026-07-15", ct: 155, hdl: 39, tg: 97, apoB: 92, lpa: 18, note: "Início do plano estruturado" },
    ],
  };
}

/* ─────────────────────────  Persistência  ──────────────────────── */
/* Usa localStorage do navegador — os dados ficam só no seu dispositivo. */

function migrateState(s) {
  if (!s) return s;
  let out = s;
  if (!s.vitals) {
    const vitals = {};
    if (s.weeks) {
      for (const [mon, w] of Object.entries(s.weeks)) {
        if (w && (w.weight || w.restHr)) vitals[mon] = { weight: w.weight || "", restHr: w.restHr || "" };
      }
    }
    const { weeks, ...rest } = s;
    out = { ...rest, vitals };
  }
  // Backfill de metas ausentes (ex.: alimento novo adicionado depois que o
  // backup foi salvo) a partir de defaultGoals, sem sobrescrever metas já
  // personalizadas pelo usuário.
  return { ...out, goals: { ...defaultGoals, ...out.goals } };
}
async function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrateState(JSON.parse(raw));
  } catch (e) { /* sem dados salvos */ }
  return null;
}
async function saveState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) { /* armazenamento indisponível (modo privado, etc.) */ }
}

/* ─────────────────────────  Cálculos  ──────────────────────────── */

function ldlOf(ct, hdl, tg) {
  if (!ct || !hdl || tg === "" || tg == null) return null;
  if (Number(tg) >= 400) return null;
  return Math.round(Number(ct) - Number(hdl) - Number(tg) / 5);
}
function weekMinutes(workouts, monday) {
  const end = addDays(monday, 6);
  return workouts.filter((w) => w.date >= monday && w.date <= end)
    .reduce((s, w) => s + Number(w.minutes || 0), 0);
}
function dayMinutes(workouts, date) {
  return workouts.filter((w) => w.date === date).reduce((s, w) => s + Number(w.minutes || 0), 0);
}
function foodWeekTotal(days, monday, key) {
  let t = 0;
  for (let i = 0; i < 7; i++) t += Number(days[addDays(monday, i)]?.[key] || 0);
  return t;
}
function weekVitalsAvg(vitals, monday, key) {
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const v = Number(vitals[addDays(monday, i)]?.[key]);
    if (v > 0) vals.push(v);
  }
  return vals.length ? mean(vals) : null;
}
// Série diária de um vital (peso ou FC de repouso) nos últimos `n` dias
// (hoje incluso), só com os dias que têm registro válido (> 0). Usada
// pelos gráficos DIÁRIOS de Tendências — diferente de weekVitalsAvg (que
// segue agregando por semana, intocada, para os Δ de 4 semanas nos Stats).
// Custo é sempre O(n) fixo (30 chamadas a addDays), independente de quanto
// histórico o usuário acumulou — por isso não precisa de useMemo aqui
// (diferente de `insights`, que varre o objeto `vitals` inteiro).
function dailyVitalsSeries(vitals, key, today, n = 30) {
  const pts = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const v = Number(vitals[d]?.[key]);
    if (v > 0) pts.push({ date: d, v });
  }
  return pts;
}
// Média móvel sobre os ATÉ 7 registros anteriores (incluindo o próprio
// ponto) de uma série já filtrada para só valores válidos — a janela conta
// REGISTROS, não dias corridos, então um dia sem anotação não distorce a
// suavização nem produz um buraco na linha.
function movingAvg(pts, window = 7) {
  return pts.map((_, i) => mean(pts.slice(Math.max(0, i - window + 1), i + 1).map((p) => p.v)));
}
function lastNWeeks(n) {
  const cur = mondayOf(todayStr());
  const arr = [];
  for (let i = n - 1; i >= 0; i--) arr.push(addDays(cur, -7 * i));
  return arr;
}
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// Sequência atual de dias consecutivos (terminando hoje) em que hasFn(date)
// é verdadeiro. Mesma tolerância do streak semanal existente: se hoje ainda
// não tem registro, isso não quebra a sequência de ontem — só pulamos hoje.
function currentDailyStreak(hasFn, today) {
  let cursor = hasFn(today) ? today : addDays(today, -1);
  let streak = 0;
  while (hasFn(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
// Maior sequência de dias consecutivos já vista em `sortedDates` (datas
// únicas, ordenadas ascendentemente como string "YYYY-MM-DD").
function longestDailyStreak(sortedDates) {
  if (!sortedDates.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    cur = addDays(sortedDates[i - 1], 1) === sortedDates[i] ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─────────────────────────  Validação  ──────────────────────────── */
/* Faixas de sanidade: só avisam (confirm), nunca bloqueiam o registro —
   o usuário sabe mais que o app. */

const RANGES = {
  weight: { min: 30, max: 250, label: "Peso", unit: "kg" },
  restHr: { min: 30, max: 220, label: "FC de repouso", unit: "bpm" },
  avgHr: { min: 30, max: 220, label: "FC média do treino", unit: "bpm" },
  minutes: { min: 1, max: 600, label: "Minutos de treino", unit: "min" },
  apoB: { min: 20, max: 300, label: "ApoB", unit: "mg/dL" },
  lpa: { min: 0, max: 500, label: "Lp(a)", unit: "mg/dL" },
};
// Um valor opcional é considerado "presente" apenas quando não é
// undefined/null/"" — usado para exames antigos sem ApoB/Lp(a) (undefined)
// e para não confundir um Lp(a) genuinamente igual a 0 com "ausente".
function hasVal(v) {
  return v !== undefined && v !== null && v !== "";
}
function confirmRange(key, value) {
  if (value === "" || value == null) return true;
  const n = Number(value);
  if (isNaN(n)) return true;
  const r = RANGES[key];
  if (n < r.min || n > r.max) {
    return confirm(`Valor incomum: ${r.label} de ${n} ${r.unit} está fora da faixa esperada (${r.min}–${r.max} ${r.unit}). Salvar mesmo assim?`);
  }
  return true;
}
// Último registro de peso com data anterior à "date" informada.
function lastWeightBefore(vitals, date) {
  const dates = Object.keys(vitals)
    .filter((d) => d < date && vitals[d] && vitals[d].weight !== "" && vitals[d].weight != null)
    .sort();
  return dates.length ? Number(vitals[dates[dates.length - 1]].weight) : null;
}
function confirmWeightJump(vitals, date, value) {
  if (value === "" || value == null) return true;
  const n = Number(value);
  if (isNaN(n)) return true;
  const last = lastWeightBefore(vitals, date);
  if (last != null && Math.abs(n - last) > 3) {
    return confirm(`Peso incomum: ${n} kg difere ${Math.abs(n - last).toFixed(1)} kg do último peso registrado (${last} kg). Salvar mesmo assim?`);
  }
  return true;
}
function confirmExam(ct, hdl, tg) {
  if (ct === "" || hdl === "" || tg === "") return true;
  const c = Number(ct), h = Number(hdl), t = Number(tg);
  if (!isNaN(h) && !isNaN(c) && h >= c) {
    if (!confirm(`Valor incomum: HDL (${h}) não pode ser maior ou igual ao colesterol total (${c}). Salvar mesmo assim?`)) return false;
  }
  if (!isNaN(t) && t <= 0) {
    if (!confirm(`Valor incomum: triglicerídeos (${t}) deveria ser maior que zero. Salvar mesmo assim?`)) return false;
  }
  return true;
}

/* ─────────────────────────  UI básicos  ────────────────────────── */

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 16, flex: 1 }}>
      <span style={{ fontSize: 13, color: C.mute, fontWeight: 600 }}>{label}</span>
      <div style={{ marginTop: 6 }}>{children}</div>
    </label>
  );
}
const inputStyle = {
  width: "100%", padding: "12px 14px", fontSize: 17,
  border: "none", borderRadius: 12,
  fontFamily: SYS, color: C.ink,
  background: C.fill, boxSizing: "border-box",
};
function Modal({ title, onClose, children }) {
  // Sheet iOS: alça (grabber), cantos superiores 20px, título grande à
  // esquerda + botão fechar circular discreto.
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: "8px 20px calc(24px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 12px" }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: C.hair }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: SYS, fontSize: 22, fontWeight: 700, margin: 0, color: C.ink, letterSpacing: "-0.01em" }}>{title}</h2>
          <button onClick={onClose} aria-label="Fechar"
            style={{ border: "none", background: C.fill, width: 30, height: 30, borderRadius: 15, fontSize: 17, lineHeight: 1, cursor: "pointer", color: C.mute, display: "grid", placeItems: "center" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function PrimaryBtn({ children, onClick, tone = C.blue }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", padding: "15px 16px", minHeight: 50, borderRadius: 12, border: "none", background: tone, color: "#fff", fontSize: 17, fontWeight: 600, fontFamily: SYS, cursor: "pointer", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
      {children}
    </button>
  );
}
// Cabeçalho de card estilo Apple Saúde: ícone + rótulo da categoria na cor
// da categoria + elemento à direita (timestamp/chevron). `cat` recebe uma
// das chaves de categoria (activity/heart/body/food/exam) para colorir.
function CardHead({ cat, tint, label, right }) {
  const color = tint || CTX[cat] || C[cat] || C.mute;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color, minWidth: 0 }}>
        {cat && <CatIcon kind={cat} size={17} />}
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </div>
      {right && <span style={{ fontSize: 13, color: C.mute, flexShrink: 0, marginLeft: 8 }}>{right}</span>}
    </div>
  );
}
function Card({ title, right, cat, tint, children }) {
  return (
    <section style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 14 }}>
      {(title || right) && <CardHead cat={cat} tint={tint} label={title} right={right} />}
      {children}
    </section>
  );
}
function SmallBtn({ children, onClick, tone = C.blue }) {
  return (
    <button onClick={onClick}
      style={{
        border: "none", background: C.fill, color: tone, borderRadius: 9,
        padding: "9px 14px", minHeight: 44, fontSize: 15, cursor: "pointer", fontWeight: 500,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
      }}>
      {children}
    </button>
  );
}

/* ─────────────────  Barra de zona (assinatura)  ─────────────────── */

function ZoneBar({ minutes, goal }) {
  const pct = Math.min(1, goal > 0 ? minutes / goal : 0);
  const hit = minutes >= goal;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: SYS, fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>{minutes}</span>
        <span style={{ fontFamily: SYS, fontSize: 17, color: C.mute, fontWeight: 500 }}>/ {goal} min em zona</span>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: C.fill, marginTop: 14, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 6, background: C.activity, transition: "width .3s ease" }} />
      </div>
      <div style={{ fontSize: 13, color: hit ? C.foodTx : C.mute, marginTop: 8, fontWeight: hit ? 600 : 400 }}>
        {hit ? "Meta da semana atingida ✓" : `Faltam ${goal - minutes} min em zona`}
      </div>
    </div>
  );
}

/* ─────────────  Faixa de treino da semana (Home)  ───────────────── */

function WeekStrip({ workouts, monday }) {
  const today = todayStr();
  const dayData = LETTERS.map((_, i) => {
    const date = addDays(monday, i);
    return { date, min: dayMinutes(workouts, date), isToday: date === today, future: date > today };
  });
  const maxMin = Math.max(45, ...dayData.map((d) => d.min));
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
      {dayData.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: d.future ? 0.4 : 1 }}>
          <span style={{ fontSize: 10, fontFamily: SYS, fontWeight: 600, color: d.min > 0 ? C.ink : "transparent" }}>{d.min || "0"}</span>
          <div style={{ height: 40, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ width: "68%", borderRadius: 4, height: d.min > 0 ? Math.max(6, (d.min / maxMin) * 40) : 3, background: d.min > 0 ? C.activity : C.hair }} />
          </div>
          <span style={{
            fontSize: 11, fontFamily: SYS,
            fontWeight: d.isToday ? 700 : 500, color: d.isToday ? "#fff" : C.mute,
            background: d.isToday ? C.activity : "transparent",
            borderRadius: 8, minWidth: 18, textAlign: "center", padding: "1px 5px", lineHeight: "16px",
          }}>{LETTERS[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────  Linha de alimento com faixa semanal tocável  ────────── */

function FoodRow({ food, monday, days, weekGoal, onSetDay }) {
  const today = todayStr();
  const countToday = Number(days[today]?.[food.key] || 0);
  const weekTotal = foodWeekTotal(days, monday, food.key);
  const done = weekTotal >= weekGoal;
  const btn = {
    width: 40, height: 40, borderRadius: 20, fontSize: 22, cursor: "pointer",
    fontFamily: SYS, fontWeight: 400, border: "none",
    background: C.fill, color: C.foodTx, display: "grid", placeItems: "center",
    WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
  };
  return (
    <div style={{ padding: "12px 0", borderBottom: `0.5px solid ${C.hair}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>{food.emoji} {food.name}</div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{food.portion}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <button aria-label={`Remover porção de hoje`} style={{ ...btn, opacity: countToday === 0 ? 0.35 : 1 }}
            onClick={() => onSetDay(today, Math.max(0, countToday - 1))}>−</button>
          <span style={{ fontFamily: SYS, fontSize: 20, fontWeight: 700, width: 20, textAlign: "center", color: countToday > 0 ? C.ink : C.faint }}>
            {countToday}
          </span>
          <button aria-label={`Adicionar porção hoje`} style={{ ...btn, background: C.food, color: "#fff" }}
            onClick={() => onSetDay(today, countToday + 1)}>+</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <div style={{ display: "flex", gap: 5, flex: 1 }}>
          {LETTERS.map((L, i) => {
            const date = addDays(monday, i);
            const c = Number(days[date]?.[food.key] || 0);
            const future = date > today;
            const isToday = date === today;
            return (
              <button key={i} disabled={future}
                aria-label={`${L}: ${c} porções — toque para ajustar`}
                onClick={() => onSetDay(date, (c + 1) % 3)}
                style={{
                  flex: 1, height: 28, borderRadius: 8, cursor: future ? "default" : "pointer",
                  fontFamily: SYS, fontSize: 11, fontWeight: 600,
                  border: isToday ? `1.5px solid ${C.food}` : "none",
                  background: c >= 2 ? C.food : c === 1 ? `color-mix(in srgb, ${C.food} 55%, #fff)` : C.fill,
                  color: c > 0 ? "#fff" : C.mute,
                  opacity: future ? 0.35 : 1,
                }}>
                {c >= 2 ? c : L}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 13, fontFamily: SYS, color: done ? C.foodTx : C.mute, fontWeight: done ? 700 : 500, width: 46, textAlign: "right" }}>
          {weekTotal}/{weekGoal}{done ? " ✓" : ""}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────  Gráficos  ──────────────────────────── */

function Bars({ data, goal, labels, ma, color = C.activity }) {
  const W = 320, H = 120, pad = 4;
  const max = Math.max(goal, ...data, 1) * 1.12;
  const bw = (W - pad * 2) / data.length;
  const gy = H - (goal / max) * H;
  const soft = `color-mix(in srgb, ${color} 22%, #fff)`;
  const maPts = ma
    ? ma.map((v, i) => (v == null ? null : `${pad + i * bw + bw / 2},${H - (v / max) * H}`)).filter(Boolean).join(" ")
    : null;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} style={{ width: "100%" }}>
      {[0.33, 0.66].map((t) => (
        <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke={C.hair} strokeWidth="0.5" />
      ))}
      {data.map((v, i) => {
        const h = (v / max) * H;
        return <rect key={i} x={pad + i * bw + 2.5} y={H - h} width={bw - 5} height={Math.max(h, 1)} rx="3" fill={v >= goal ? color : soft} />;
      })}
      <line x1="0" x2={W} y1={gy} y2={gy} stroke={C.mute} strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - 2} y={gy - 4} textAnchor="end" fontSize="10" fill={C.mute}>meta {goal}</text>
      {maPts && <polyline points={maPts} fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" opacity="0.65" />}
      {labels.map((l, i) => i % 3 === 0 ? (
        <text key={i} x={pad + i * bw + bw / 2} y={H + 12} textAnchor="middle" fontSize="8.5" fill={C.mute}>{l}</text>
      ) : null)}
    </svg>
  );
}

// `raw`: série de apoio opcional (mesmo índice/posição x de `points`) —
// usada pelos gráficos diários para plotar o valor bruto do dia como ponto
// pequeno e claro POR BAIXO da linha protagonista (`points`, ex.: a média
// móvel de 7 dias). `showValues=false` esconde o rótulo numérico de cada
// ponto — necessário quando `points` tem muitos pontos (série diária de
// até 30 dias) e o número em cima de cada um poluiria o gráfico.
function Line({ points, raw, goal, unit, color = C.ink, band, showValues = true }) {
  const W = 320, H = 116, padX = 8, padY = 16;
  const vals = points.map((p) => p.v);
  const all = [...vals];
  if (raw) all.push(...raw.filter((v) => v != null));
  if (goal != null) all.push(goal);
  if (band) all.push(band[0], band[1]);
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const x = (i) => padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2);
  const y = (v) => padY + (1 - (v - min) / span) * (H - padY * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ");
  const area = `${d} L${x(points.length - 1)},${H} L${x(0)},${H} Z`;
  // Passo dos rótulos: 1 a cada ponto até o limiar de sempre; a partir daí,
  // um passo que mira ~6 rótulos no total — senão uma série diária de até
  // 30 pontos sobrepõe datas. Os limiares (8 p/ valores, 6 p/ datas) e o
  // passo fixo de 2 para até 12 pontos são os mesmos de antes desta função
  // aceitar séries longas. Única diferença nos gráficos semanais (≤12
  // pontos): o último ponto agora sempre ganha rótulo de data — antes, em
  // séries de comprimento par, a data mais recente ficava sem rótulo.
  const valueStep = points.length <= 8 ? 1 : Math.ceil(points.length / 6);
  const labelStep = points.length <= 6 ? 1 : Math.ceil(points.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: "100%" }}>
      {band && (
        <>
          <rect x="0" y={y(band[1])} width={W} height={Math.max(2, y(band[0]) - y(band[1]))} fill={color} opacity="0.12" />
          <text x={W - 2} y={y(band[1]) + 10} textAnchor="end" fontSize="9" fill={color}>zona {band[0]}–{band[1]}</text>
        </>
      )}
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="0" x2={W} y1={padY + t * (H - padY * 2)} y2={padY + t * (H - padY * 2)} stroke={C.hair} strokeWidth="0.5" />
      ))}
      {goal != null && (
        <>
          <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke={C.mute} strokeWidth="1" strokeDasharray="4 4" />
          <text x={W - 2} y={y(goal) - 4} textAnchor="end" fontSize="10" fill={C.mute}>meta {goal}</text>
        </>
      )}
      <path d={area} fill={color} opacity="0.1" />
      {raw && raw.map((v, i) => v == null ? null : (
        <circle key={"r" + i} cx={x(i)} cy={y(v)} r="1.8" fill={color} opacity="0.32" />
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r="3.2" fill={color} />)}
      {showValues && points.map((p, i) => (i % valueStep === 0 || i === points.length - 1) ? (
        <text key={"t" + i} x={x(i)} y={y(p.v) - 7} textAnchor="middle" fontSize="9" fill={C.mute}>{p.v}{unit || ""}</text>
      ) : null)}
      {points.map((p, i) => p.l && (i % labelStep === 0 || i === points.length - 1) ? (
        // Extremos ancoram para dentro (start/end) — senão o 1º e o último
        // rótulo de data vazam da largura do SVG e aparecem cortados no card.
        <text key={"l" + i} x={i === 0 ? 2 : i === points.length - 1 ? W - 2 : x(i)} y={H + 11}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="8.5" fill={C.mute}>{p.l}</text>
      ) : null)}
    </svg>
  );
}

const Empty = ({ children }) => (
  <div style={{ padding: "18px 8px", textAlign: "center", color: C.mute, fontSize: 14 }}>{children}</div>
);

function Stat({ label, value, sub, tone }) {
  return (
    <div style={{ background: C.fill, borderRadius: 12, padding: "12px 13px" }}>
      <div style={{ fontSize: 12, color: C.mute, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: SYS, fontSize: 23, fontWeight: 700, color: tone || C.ink, marginTop: 3, letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────  App  ───────────────────────────────── */

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null); // {kind, ...payload}
  const saveTimer = useRef(null);
  const weightFocusRef = useRef(""); // valor ao focar o campo, p/ reverter se o aviso de faixa for recusado
  const hrFocusRef = useRef("");

  useEffect(() => { loadState().then((s) => setState(s || demoState())); }, []);

  function update(next) {
    setState(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(next), 300);
  }

  /* Insights de Registros — tudo derivado de workouts/days/vitals,
     memoizado porque o histórico pode ter 1 ano de dados diários e esse
     cálculo roda a cada render. Fica ANTES do "if (!state) return" porque
     hooks não podem ser chamados condicionalmente — o guard de estado
     nulo vive dentro do próprio callback. */
  const insights = useMemo(() => {
    if (!state) return { empty: true };
    const today = todayStr();

    // Alimento com a maior meta semanal (ex.: azeite) — depende só das metas
    // configuradas, não de haver dados registrados, então fica disponível
    // mesmo no estado vazio (evita acessar propriedade de undefined no card
    // "Constância e corpo" quando ainda não há nenhum registro).
    const topGoalFood = [...FOODS].sort((a, b) => (Number(state.goals[b.key]) || 0) - (Number(state.goals[a.key]) || 0))[0];

    const hasAnyData = state.workouts.length > 0 || Object.keys(state.days).length > 0 || Object.keys(state.vitals).length > 0;
    if (!hasAnyData) return { empty: true, topGoalFood };

    // Constância — sequência de peso registrado.
    const weightDates = Object.keys(state.vitals)
      .filter((d) => state.vitals[d]?.weight !== "" && state.vitals[d]?.weight != null)
      .sort();
    const weightSet = new Set(weightDates);
    const weightStreak = currentDailyStreak((d) => weightSet.has(d), today);
    const weightStreakBest = longestDailyStreak(weightDates);

    // % dos últimos 30 dias com pelo menos um registro de qualquer tipo.
    const workoutDateSet = new Set(state.workouts.map((w) => w.date));
    const foodDateSet = new Set(
      Object.entries(state.days).filter(([, v]) => FOODS.some((f) => Number(v[f.key]) > 0)).map(([d]) => d)
    );
    const vitalsDateSet = new Set(
      Object.entries(state.vitals).filter(([, v]) => v.weight || v.restHr).map(([d]) => d)
    );
    let daysWithAny = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      if (workoutDateSet.has(d) || foodDateSet.has(d) || vitalsDateSet.has(d)) daysWithAny++;
    }
    const pct30 = Math.round((daysWithAny / 30) * 100);

    // Treinos — janela das últimas 12 semanas.
    const winStart = lastNWeeks(12)[0];
    const workouts12 = state.workouts.filter((w) => w.date >= winStart && w.date <= today);
    const typeCounts = {};
    workouts12.forEach((w) => { typeCounts[w.type || "Outro"] = (typeCounts[w.type || "Outro"] || 0) + 1; });
    const typeDist = workouts12.length
      ? Object.entries(typeCounts)
          .map(([type, n]) => ({ type, n, pct: Math.round((n / workouts12.length) * 100) }))
          .sort((a, b) => b.n - a.n)
      : [];

    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    workouts12.forEach((w) => { weekdayCounts[weekdayMon0(w.date)]++; });
    const maxWd = Math.max(0, ...weekdayCounts);
    const bestWd = maxWd > 0 ? weekdayCounts.indexOf(maxWd) : -1;

    const allMinutes = state.workouts.map((w) => Number(w.minutes) || 0).filter((m) => m > 0);
    const avgDuration = allMinutes.length ? Math.round(mean(allMinutes)) : null;
    const maxDuration = allMinutes.length ? Math.max(...allMinutes) : null;

    const hrWorkouts = state.workouts.filter((w) => Number(w.avgHr) > 0);
    const inZone = hrWorkouts.filter((w) => Number(w.avgHr) >= state.goals.zoneLow && Number(w.avgHr) <= state.goals.zoneHigh);
    const pctZone = hrWorkouts.length ? Math.round((inZone.length / hrWorkouts.length) * 100) : null;

    // Sequência diária no alimento de meta semanal mais alta (ex.: azeite).
    // (topGoalFood já foi calculado acima, antes do guard de dados vazios.)
    const topFoodSet = new Set(
      Object.entries(state.days).filter(([, v]) => Number(v[topGoalFood.key]) > 0).map(([d]) => d)
    );
    const topFoodStreak = currentDailyStreak((d) => topFoodSet.has(d), today);

    // Medidas — variação de peso nos últimos 30 dias (primeiro vs. último registro).
    const windowStart = addDays(today, -29);
    const weightsWindow = weightDates.filter((d) => d >= windowStart && d <= today);
    const deltaWeight30 = weightsWindow.length >= 2
      ? Number(state.vitals[weightsWindow[weightsWindow.length - 1]].weight) - Number(state.vitals[weightsWindow[0]].weight)
      : null;

    return {
      empty: false,
      weightStreak, weightStreakBest, pct30,
      typeDist, workouts12Count: workouts12.length,
      bestWd, bestWdCount: bestWd >= 0 ? weekdayCounts[bestWd] : 0,
      avgDuration, maxDuration,
      pctZone, hrWorkoutsCount: hrWorkouts.length,
      topGoalFood, topFoodStreak, topFoodSetSize: topFoodSet.size,
      deltaWeight30,
    };
  }, [state]);

  if (!state)
    return <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: C.bg, color: C.mute, fontFamily: SYS }}>Carregando…</div>;

  const today = todayStr();
  const monday = mondayOf(today);
  const todayVitals = state.vitals[today] || { weight: "", restHr: "" };
  const minutes = weekMinutes(state.workouts, monday);

  function setVitalVal(date, patch) {
    update({ ...state, vitals: { ...state.vitals, [date]: { ...(state.vitals[date] || {}), ...patch } } });
  }
  function setFoodDay(date, key, val) {
    const d = state.days[date] || { fish: 0, nuts: 0, oats: 0, olive: 0, avocado: 0 };
    update({ ...state, days: { ...state.days, [date]: { ...d, [key]: val } } });
  }

  /* ═══ Estatísticas compartilhadas ═══ */

  const weeks12 = lastNWeeks(12);
  const minsSeries = weeks12.map((m) => weekMinutes(state.workouts, m));
  const wLabels = weeks12.map((m) => weekLabel(m).split("–")[0].trim());
  const maSeries = minsSeries.map((_, i) => (i < 3 ? null : Math.round(mean(minsSeries.slice(i - 3, i + 1)))));

  const activeMins = minsSeries.filter((v) => v > 0);
  const media12 = activeMins.length ? Math.round(mean(activeMins)) : 0;
  const last4 = minsSeries.slice(-4).filter((v) => v > 0);
  const media4 = last4.length ? Math.round(mean(last4)) : 0;
  const weeksOnGoal = minsSeries.filter((v) => v >= state.goals.minWeek).length;
  const record = Math.max(...minsSeries, 0);

  let streak = 0;
  for (let i = minsSeries.length - 1; i >= 0; i--) {
    if (i === minsSeries.length - 1 && minsSeries[i] < state.goals.minWeek) continue;
    if (minsSeries[i] >= state.goals.minWeek) streak++;
    else break;
  }

  const curMonth = today.slice(0, 7);
  const monthWk = state.workouts.filter((w) => w.date.startsWith(curMonth));
  const totalMonth = monthWk.reduce((s, w) => s + Number(w.minutes), 0);

  const restVals = weeks12.map((m) => weekVitalsAvg(state.vitals, m, "restHr"));
  const wtVals = weeks12.map((m) => weekVitalsAvg(state.vitals, m, "weight"));
  function delta(vals) {
    const recent = vals.slice(-4).filter((v) => v != null);
    const prev = vals.slice(-8, -4).filter((v) => v != null);
    if (!recent.length || !prev.length) return null;
    return mean(recent) - mean(prev);
  }
  const dRest = delta(restVals), dWt = delta(wtVals);
  const fmtDelta = (d, unit) => (d == null ? "—" : `${d > 0 ? "+" : ""}${d.toFixed(1)} ${unit}`);

  // Os Δ de 4 semanas acima (dRest/dWt) usam as médias SEMANAIS restVals/
  // wtVals. Os GRÁFICOS de peso/FC de repouso usam séries DIÁRIAS (abaixo):
  // item 8 do roadmap — com agregação semanal, quem começa a anotar há
  // poucos dias não via gráfico nenhum (exigia 2 semanas distintas).
  const weightDaily = dailyVitalsSeries(state.vitals, "weight", today);
  const restDaily = dailyVitalsSeries(state.vitals, "restHr", today);
  const weightDailyMA = movingAvg(weightDaily);
  const restDailyMA = movingAvg(restDaily);
  // Pontos da linha protagonista (a média móvel) e série de apoio (valor
  // bruto do dia) alinhados pelo mesmo índice — ver comentário do `Line`.
  const weightMAPts = weightDaily.map((p, i) => ({ l: fmtShort(p.date), v: Math.round(weightDailyMA[i] * 10) / 10 }));
  const weightRaw = weightDaily.map((p) => p.v);
  const restMAPts = restDaily.map((p, i) => ({ l: fmtShort(p.date), v: Math.round(restDailyMA[i]) }));
  const restRaw = restDaily.map((p) => p.v);

  const hrSeries = weeks12.map((m, i) => {
    const end = addDays(m, 6);
    const hrs = state.workouts.filter((w) => w.date >= m && w.date <= end && Number(w.avgHr) > 0).map((w) => Number(w.avgHr));
    return hrs.length ? { l: wLabels[i], v: Math.round(mean(hrs)) } : null;
  }).filter(Boolean);

  const weeks4 = lastNWeeks(4);
  const foodAdesao = FOODS.map((f) => {
    const totals = weeks4.map((m) => foodWeekTotal(state.days, m, f.key));
    const avg = mean(totals) || 0;
    const goal = Number(state.goals[f.key]);
    return { ...f, avg, pct: goal > 0 ? Math.min(100, Math.round((avg / goal) * 100)) : 0 };
  });
  const adesaoGeral = Math.round(mean(foodAdesao.map((f) => f.pct)));

  // Melhor/pior alimento das últimas 4 semanas, derivado do mesmo
  // `foodAdesao` usado nas barras — evita recalcular a adesão por alimento
  // uma segunda vez (antes era feito de novo dentro de `insights`).
  const foodAdesaoRanked = [...foodAdesao].sort((a, b) => b.pct - a.pct);
  const algumaAdesao = foodAdesaoRanked.some((f) => f.avg > 0);
  const melhorFood = foodAdesaoRanked[0];
  const piorFood = foodAdesaoRanked[foodAdesaoRanked.length - 1];
  const foodInsightValido = algumaAdesao && melhorFood.key !== piorFood.key;

  /* ═══ Home ═══ */

  const Home = (
    <>
      <Card cat="activity" title="Atividade" right={weekLabel(monday)}>
        <ZoneBar minutes={minutes} goal={state.goals.minWeek} />
        <WeekStrip workouts={state.workouts} monday={monday} />
        <div style={{ marginTop: 16 }}>
          <PrimaryBtn tone={C.activity} onClick={() => setModal({ kind: "treino" })}>Registrar treino</PrimaryBtn>
        </div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 10, textAlign: "center" }}>
          Zona alvo: {state.goals.zoneLow}–{state.goals.zoneHigh} bpm
        </div>
      </Card>

      <Card cat="food" title="Alimentação"
        right="toque nos dias para ajustar">
        {FOODS.map((f) => (
          <FoodRow key={f.key} food={f} monday={monday} days={state.days}
            weekGoal={state.goals[f.key]}
            onSetDay={(date, v) => setFoodDay(date, f.key, v)} />
        ))}
      </Card>

      <Card tint={C.mute} title="Medidas de hoje">
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: C.body, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CatIcon kind="body" size={15} /> Peso (kg)</span>
            <input type="number" step="0.1" inputMode="decimal" value={todayVitals.weight ?? ""}
              onFocus={(e) => { weightFocusRef.current = e.target.value; }}
              onChange={(e) => setVitalVal(today, { weight: e.target.value })}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === "" || val === weightFocusRef.current) return;
                const ok = confirmRange("weight", val) && confirmWeightJump(state.vitals, today, val);
                if (!ok) setVitalVal(today, { weight: weightFocusRef.current });
              }}
              style={{ ...inputStyle, marginTop: 6, fontFamily: SYS }} placeholder="—" />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: C.heartTx, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CatIcon kind="heart" size={15} /> FC repouso (bpm)</span>
            <input type="number" inputMode="numeric" value={todayVitals.restHr ?? ""}
              onFocus={(e) => { hrFocusRef.current = e.target.value; }}
              onChange={(e) => setVitalVal(today, { restHr: e.target.value })}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === "" || val === hrFocusRef.current) return;
                if (!confirmRange("restHr", val)) setVitalVal(today, { restHr: hrFocusRef.current });
              }}
              style={{ ...inputStyle, marginTop: 6, fontFamily: SYS }} placeholder="—" />
          </label>
        </div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 10 }}>Registro diário — anote todos os dias, de preferência ao acordar.</div>
      </Card>
    </>
  );

  /* ═══ Tendências ═══ */

  const Trends = (
    <>
      <Card cat="activity" title="Atividade · 12 semanas">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <Stat label="Média / semana" value={`${media12} min`} sub={`últimas 4: ${media4} min`} />
          <Stat label="Semanas na meta" value={`${weeksOnGoal}/12`} sub={`meta ${state.goals.minWeek} min`} />
          <Stat label="Sequência atual" value={streak > 0 ? `${streak} sem` : "—"} sub="semanas seguidas na meta" />
          <Stat label="Recorde semanal" value={`${record} min`} sub="melhor semana do período" />
          <Stat label="Total no mês" value={`${totalMonth} min`} sub={`${monthWk.length} treinos em ${MESES[Number(curMonth.slice(5)) - 1]}`} />
          <Stat label="FC na zona" value={insights.pctZone != null ? `${insights.pctZone}%` : "—"}
            sub={insights.pctZone != null ? `${insights.hrWorkoutsCount} treino${insights.hrWorkoutsCount > 1 ? "s" : ""} com FC média` : "anote a FC média do treino"}
            tone={insights.pctZone != null && insights.pctZone >= 70 ? C.activityTx : undefined} />
          <Stat label="Dia mais treinado" value={insights.bestWd >= 0 ? WEEKDAY_CAP[insights.bestWd] : "—"}
            sub={insights.bestWd >= 0 ? `${insights.bestWdCount}× nas últimas 12 sem` : "sem treinos ainda"} />
          <Stat label="Duração média" value={insights.avgDuration != null ? `${insights.avgDuration} min` : "—"}
            sub={insights.maxDuration != null ? `por sessão · recorde ${insights.maxDuration} min` : "por sessão"} />
        </div>
      </Card>

      <Card cat="body" title="Constância e corpo">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <Stat label="Sequência de peso"
            value={insights.weightStreak > 0 ? `${insights.weightStreak} dia${insights.weightStreak > 1 ? "s" : ""}` : "—"}
            sub={insights.weightStreakBest > 0 ? `recorde: ${insights.weightStreakBest} dia${insights.weightStreakBest > 1 ? "s" : ""}` : "registre o peso hoje"}
            tone={insights.weightStreak >= 7 ? C.body : undefined} />
          <Stat label="Constância · 30 dias" value={insights.empty ? "—" : `${insights.pct30}%`} sub="dias com algum registro"
            tone={!insights.empty && insights.pct30 >= 80 ? C.activityTx : undefined} />
          <Stat label="Δ FC repouso" value={fmtDelta(dRest, "bpm")} sub="4 sem vs 4 anteriores" tone={dRest != null && dRest < 0 ? C.heartTx : undefined} />
          <Stat label="Δ Peso · 4 sem" value={fmtDelta(dWt, "kg")} sub="4 sem vs 4 anteriores" tone={dWt != null && dWt < 0 ? C.body : undefined} />
          <Stat label="Peso · 30 dias"
            value={insights.deltaWeight30 != null ? `${insights.deltaWeight30 > 0 ? "+" : ""}${insights.deltaWeight30.toFixed(1)} kg` : "—"}
            sub="primeiro vs. último registro"
            tone={insights.deltaWeight30 != null && insights.deltaWeight30 < 0 ? C.body : undefined} />
          <Stat label={`Sequência · ${insights.topGoalFood.name.split(" ")[0]}`}
            value={insights.topFoodSetSize > 0 ? `${insights.topFoodStreak} dia${insights.topFoodStreak !== 1 ? "s" : ""}` : "—"}
            sub={`${insights.topGoalFood.emoji} dias seguidos com registro`} />
        </div>
      </Card>

      <Card cat="activity" title="Minutos em zona · 12 sem"
        right="média móvel 4 sem">
        {minsSeries.some((v) => v > 0)
          ? <Bars data={minsSeries} goal={state.goals.minWeek} labels={wLabels} ma={maSeries} color={C.activity} />
          : <Empty>Registre treinos para ver a evolução aqui.</Empty>}
      </Card>

      <Card cat="activity" title="Treinos por tipo · 12 sem">
        {insights.typeDist && insights.typeDist.length > 0 ? (
          insights.typeDist.map((t) => (
            <div key={t.type} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <span style={{ fontSize: 13, width: 108, color: C.ink, flexShrink: 0 }}>{t.type}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: `color-mix(in srgb, ${C.activity} 18%, #fff)`, overflow: "hidden" }}>
                <div style={{ width: `${t.pct}%`, height: "100%", background: C.activity }} />
              </div>
              <span style={{ fontFamily: SYS, fontSize: 12, color: C.mute, width: 62, textAlign: "right", flexShrink: 0 }}>
                {t.n} · {t.pct}%
              </span>
            </div>
          ))
        ) : (
          <Empty>Registre treinos para ver a distribuição por tipo.</Empty>
        )}
      </Card>

      <Card cat="heart" title="FC média dos treinos"
        right="faixa = zona alvo">
        {hrSeries.length >= 2
          ? <Line points={hrSeries} color={C.heart} band={[state.goals.zoneLow, state.goals.zoneHigh]} />
          : <Empty>Anote a FC média nos treinos para ver se está caindo na zona.</Empty>}
      </Card>

      <Card cat="food" title="Adesão alimentar · 4 sem">
        {foodAdesao.map((f) => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
            <span style={{ fontSize: 14, width: 112, color: C.ink }}>{f.emoji} {f.name.split(" ")[0]}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: `color-mix(in srgb, ${C.food} 18%, #fff)`, overflow: "hidden" }}>
              <div style={{ width: `${f.pct}%`, height: "100%", background: f.pct >= 100 ? C.food : `color-mix(in srgb, ${C.food} 60%, #fff)` }} />
            </div>
            <span style={{ fontFamily: SYS, fontSize: 12, color: C.mute, width: 76, textAlign: "right" }}>
              {f.avg.toFixed(1)}/{state.goals[f.key]} · {f.pct}%
            </span>
          </div>
        ))}
        {foodInsightValido && (
          <div style={{ background: C.fill, borderRadius: 12, padding: "11px 13px", fontSize: 13, color: C.ink, marginTop: 10 }}>
            {melhorFood.emoji} <b>{melhorFood.name.split(" ")[0]}</b> é seu ponto forte · {piorFood.emoji} <b>{piorFood.name.split(" ")[0]}</b> precisa de atenção
          </div>
        )}
      </Card>

      <Card cat="heart" title="FC de repouso · diário" right="média móvel · 7 registros">
        {restDaily.length >= 2 ? (
          <Line points={restMAPts} raw={restRaw} color={C.heart} showValues={false} />
        ) : restDaily.length === 1 ? (
          <div>
            <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
              <span style={{ fontFamily: SYS, fontSize: 44, fontWeight: 700, color: C.ink }}>{restDaily[0].v}</span>
              <span style={{ color: C.mute, fontSize: 14 }}> bpm</span>
            </div>
            <Empty>Registre mais um dia para ver a evolução aqui.</Empty>
          </div>
        ) : (
          <Empty>Registre sua FC de repouso na Home — a partir do 2º dia o gráfico aparece aqui.</Empty>
        )}
      </Card>

      <Card cat="body" title="Peso · diário" right="média móvel · 7 registros">
        {weightDaily.length >= 2 ? (
          <Line points={weightMAPts} raw={weightRaw} goal={Number(state.goals.weightGoal) || null} color={C.body} showValues={false} />
        ) : weightDaily.length === 1 ? (
          <div>
            <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
              <span style={{ fontFamily: SYS, fontSize: 44, fontWeight: 700, color: C.ink }}>{weightDaily[0].v}</span>
              <span style={{ color: C.mute, fontSize: 14 }}> kg</span>
            </div>
            <Empty>Registre mais um dia para ver a evolução aqui.</Empty>
          </div>
        ) : (
          <Empty>Registre seu peso na Home — a partir do 2º dia o gráfico aparece aqui.</Empty>
        )}
      </Card>
    </>
  );

  /* ═══ Registros ═══ */

  const workoutsSorted = [...state.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const daysSorted = Object.entries(state.days)
    .filter(([, v]) => FOODS.some((f) => Number(v[f.key]) > 0))
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);
  const vitalsSorted = Object.entries(state.vitals)
    .filter(([, v]) => v.weight || v.restHr)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);

  const Registros = (
    <>
      <Card tint={C.mute} title="Adicionar retroativo">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Treino", "activity", () => setModal({ kind: "treino" })],
            ["Alimentação", "food", () => setModal({ kind: "dia", date: today })],
            ["Medidas", "body", () => setModal({ kind: "vitals", date: today })],
          ].map(([l, cat, fn]) => (
            <button key={l} onClick={fn}
              style={{ padding: "13px 4px", minHeight: 48, borderRadius: 12, border: "none", background: C.fill, fontFamily: SYS, fontWeight: 600, fontSize: 13, color: CTX[cat] || C[cat], cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, WebkitTapHighlightColor: "transparent" }}>
              <CatIcon kind={cat} size={18} />{l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 10 }}>Todos permitem escolher a data — inclusive dias e semanas passadas.</div>
      </Card>

      <Card cat="activity" title={`Treinos · ${workoutsSorted.length}`}>
        {workoutsSorted.length === 0 && <Empty>Nenhum treino registrado.</Empty>}
        {workoutsSorted.slice(0, 20).map((w) => (
          <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.hair}` }}>
            <div>
              <div style={{ fontFamily: SYS, fontSize: 14, fontWeight: 600, color: C.ink }}>
                {fmtBR(w.date)} <span style={{ color: C.mute, fontWeight: 400 }}>· {weekdayShort(w.date)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.mute }}>{w.type} · {w.minutes} min{w.avgHr ? ` · FC ${w.avgHr}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <SmallBtn onClick={() => setModal({ kind: "treino", w })}>editar</SmallBtn>
              <SmallBtn tone={C.danger} onClick={() => { if (confirm("Excluir este treino?")) update({ ...state, workouts: state.workouts.filter((x) => x.id !== w.id) }); }}>excluir</SmallBtn>
            </div>
          </div>
        ))}
      </Card>

      <Card cat="food" title="Alimentação · últimos dias">
        {daysSorted.length === 0 && <Empty>Nenhum registro de alimentação.</Empty>}
        {daysSorted.map(([date, v]) => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.hair}` }}>
            <div>
              <div style={{ fontFamily: SYS, fontSize: 14, fontWeight: 600, color: C.ink }}>
                {fmtBR(date)} <span style={{ color: C.mute, fontWeight: 400 }}>· {weekdayShort(date)}</span>
              </div>
              <div style={{ fontSize: 13, color: C.mute }}>
                {FOODS.filter((f) => Number(v[f.key]) > 0).map((f) => `${f.emoji}${v[f.key] > 1 ? "×" + v[f.key] : ""}`).join("  ") || "—"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <SmallBtn onClick={() => setModal({ kind: "dia", date })}>editar</SmallBtn>
              <SmallBtn tone={C.danger} onClick={() => {
                if (confirm("Excluir o registro de alimentação deste dia?")) {
                  const { [date]: _omit, ...rest } = state.days;
                  update({ ...state, days: rest });
                }
              }}>excluir</SmallBtn>
            </div>
          </div>
        ))}
      </Card>

      <Card cat="body" title="Medidas diárias · últimos dias">
        {vitalsSorted.length === 0 && <Empty>Nenhum registro de peso/FC ainda.</Empty>}
        {vitalsSorted.map(([date, v]) => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.hair}` }}>
            <div>
              <div style={{ fontFamily: SYS, fontSize: 14, fontWeight: 600, color: C.ink }}>
                {fmtBR(date)} <span style={{ color: C.mute, fontWeight: 400 }}>· {weekdayShort(date)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.mute }}>
                {v.weight ? v.weight + " kg" : "peso —"} · {v.restHr ? "FC " + v.restHr : "FC —"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <SmallBtn onClick={() => setModal({ kind: "vitals", date })}>editar</SmallBtn>
              <SmallBtn tone={C.danger} onClick={() => {
                if (confirm("Excluir as medidas deste dia?")) {
                  const { [date]: _omit, ...rest } = state.vitals;
                  update({ ...state, vitals: rest });
                }
              }}>excluir</SmallBtn>
            </div>
          </div>
        ))}
      </Card>
    </>
  );

  /* ═══ Exames ═══ */

  const examsSorted = [...state.exams].sort((a, b) => (a.date < b.date ? -1 : 1));
  const hdlPts = examsSorted.map((e) => ({ l: fmtBR(e.date).slice(0, 5), v: Number(e.hdl) }));

  const Exams = (
    <>
      <Card cat="exam" title="HDL ao longo do tempo">
        {hdlPts.length >= 2
          ? <Line points={hdlPts} goal={state.goals.hdlGoal} color={C.exam} />
          : (
            <div>
              {hdlPts.length === 1 && (
                <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
                  <span style={{ fontFamily: SYS, fontSize: 44, fontWeight: 700, color: C.ink }}>{hdlPts[0].v}</span>
                  <span style={{ color: C.mute, fontSize: 14 }}> mg/dL · meta {state.goals.hdlGoal}+</span>
                </div>
              )}
              <Empty>Com o próximo exame, o gráfico de evolução aparece aqui.</Empty>
            </div>
          )}
      </Card>
      <div style={{ marginBottom: 14 }}>
        <PrimaryBtn tone={C.exam} onClick={() => setModal({ kind: "exame" })}>Novo exame</PrimaryBtn>
      </div>
      {[...examsSorted].reverse().map((e) => {
        const ldl = ldlOf(e.ct, e.hdl, e.tg);
        return (
          <Card key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontFamily: SYS, fontSize: 17, fontWeight: 700, color: C.ink }}>{fmtBR(e.date)}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <SmallBtn onClick={() => setModal({ kind: "exame", e })}>editar</SmallBtn>
                <SmallBtn tone={C.danger} onClick={() => { if (confirm("Excluir este exame?")) update({ ...state, exams: state.exams.filter((x) => x.id !== e.id) }); }}>excluir</SmallBtn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", fontFamily: SYS, fontSize: 14, color: C.ink }}>
              <span>CT <b>{e.ct}</b></span>
              <span style={{ color: e.hdl >= state.goals.hdlGoal ? C.examTx : C.danger }}>HDL <b>{e.hdl}</b></span>
              <span>TG <b>{e.tg}</b></span>
              <span>LDL <b>{ldl != null ? `~${ldl}` : "n/c*"}</b></span>
              {hasVal(e.apoB) && <span>ApoB <b>{e.apoB}</b></span>}
              {hasVal(e.lpa) && <span>Lp(a) <b>{e.lpa}</b></span>}
            </div>
            {ldl == null && <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>*TG ≥ 400: Friedewald não se aplica</div>}
            {e.note && <div style={{ fontSize: 13, color: C.mute, marginTop: 8, fontStyle: "italic" }}>"{e.note}"</div>}
          </Card>
        );
      })}
    </>
  );

  /* ═══ Modais ═══ */

  function TreinoModal({ w }) {
    const lastType = [...state.workouts].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.type;
    const [f, setF] = useState(w ? { ...w } : { date: today, minutes: "", type: lastType || "Elíptico", avgHr: "" });
    const quickMins = [30, 40, 45, 60];
    return (
      <Modal title={w ? "Editar treino" : "Registrar treino"} onClose={() => setModal(null)}>
        <Field label="Data"><input type="date" value={f.date} max={today} onChange={(e) => setF({ ...f, date: e.target.value })} style={inputStyle} /></Field>
        <Field label="Minutos em zona *">
          <input type="number" inputMode="numeric" autoFocus={!w} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })}
            style={{ ...inputStyle, fontFamily: SYS, fontSize: 28, fontWeight: 700 }} placeholder="0" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {quickMins.map((m) => (
              <button key={m} type="button" onClick={() => setF({ ...f, minutes: String(m) })}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 10, cursor: "pointer",
                  fontFamily: SYS, fontSize: 15, fontWeight: 600,
                  border: `1.5px solid ${String(f.minutes) === String(m) ? C.activity : "transparent"}`,
                  background: String(f.minutes) === String(m) ? `color-mix(in srgb, ${C.activity} 15%, #fff)` : C.fill,
                  color: C.ink, WebkitTapHighlightColor: "transparent",
                }}>{m}</button>
            ))}
          </div>
        </Field>
        <Field label="Tipo">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={inputStyle}>
            {["Elíptico", "Corrida", "Bike", "Caminhada rápida", "Natação", "Outro"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="FC média (opcional)">
          <input type="number" inputMode="numeric" value={f.avgHr} onChange={(e) => setF({ ...f, avgHr: e.target.value })} style={inputStyle} placeholder="—" />
        </Field>
        <PrimaryBtn tone={C.activity} onClick={() => {
          if (!f.minutes || Number(f.minutes) <= 0) return;
          if (!confirmRange("minutes", f.minutes)) return;
          if (!confirmRange("avgHr", f.avgHr)) return;
          const rec = { ...f, minutes: Number(f.minutes), id: w ? w.id : String(Date.now()) };
          update({ ...state, workouts: w ? state.workouts.map((x) => (x.id === w.id ? rec : x)) : [...state.workouts, rec] });
          setModal(null);
        }}>{w ? "Salvar alterações" : "Salvar treino"}</PrimaryBtn>
      </Modal>
    );
  }

  function DiaModal({ date: initialDate }) {
    const [date, setDate] = useState(initialDate || today);
    const d = state.days[date] || { fish: 0, nuts: 0, oats: 0, olive: 0, avocado: 0 };
    const btn = { width: 40, height: 40, borderRadius: 20, fontSize: 22, cursor: "pointer", fontFamily: SYS, fontWeight: 400, border: "none", background: C.fill, color: C.foodTx, display: "grid", placeItems: "center", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" };
    return (
      <Modal title="Alimentação do dia" onClose={() => setModal(null)}>
        <Field label="Data">
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
        {FOODS.map((f) => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${C.hair}` }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>{f.emoji} {f.name}</div>
              <div style={{ fontSize: 12, color: C.mute }}>{f.portion}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <button style={{ ...btn, opacity: (d[f.key] || 0) === 0 ? 0.35 : 1 }}
                onClick={() => setFoodDay(date, f.key, Math.max(0, (d[f.key] || 0) - 1))}>−</button>
              <span style={{ fontFamily: SYS, fontSize: 20, fontWeight: 700, width: 20, textAlign: "center", color: (d[f.key] || 0) > 0 ? C.ink : C.faint }}>{d[f.key] || 0}</span>
              <button style={{ ...btn, background: C.food, color: "#fff" }}
                onClick={() => setFoodDay(date, f.key, (d[f.key] || 0) + 1)}>+</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16 }}><PrimaryBtn tone={C.food} onClick={() => setModal(null)}>Concluir</PrimaryBtn></div>
      </Modal>
    );
  }

  function VitalsModal({ date: initialDate }) {
    const originalDate = initialDate || today;
    // Só "move" o registro se a data de origem já tinha dados de fato — ao
    // abrir via "+ Medidas" para uma data vazia, trocar a data é só escolher
    // onde gravar, sem nada a remover.
    const hadOriginalData = !!(state.vitals[originalDate] && (state.vitals[originalDate].weight || state.vitals[originalDate].restHr));
    const [date, setDate] = useState(originalDate);
    const moving = hadOriginalData && date !== originalDate;
    const originalRecord = state.vitals[originalDate] || { weight: "", restHr: "" };
    const v = state.vitals[date] || { weight: "", restHr: "" };
    // Peso do último dia registrado antes desta data — usado só como DICA
    // (placeholder) de quanto foi o último peso, nunca como valor do campo.
    // Um campo com valor visível passa a impressão de que o peso do dia já
    // está gravado; o dono do app perdeu 2 de 3 registros de peso por isso
    // (achado de QA com usuário real). Durante uma movimentação, a dica deve
    // refletir a origem, para ficar coerente com os valores reais que viajam
    // nos campos abaixo.
    const inherited = moving ? lastWeightBefore(state.vitals, originalDate) : lastWeightBefore(state.vitals, date);
    const [f, setF] = useState({
      weight: (moving ? originalRecord.weight : v.weight) || "",
      restHr: (moving ? originalRecord.restHr : v.restHr) || "",
    });
    useEffect(() => {
      // Durante uma movimentação (hadOriginalData && date !== originalDate),
      // NÃO recarrega os campos a partir do destino — os valores da origem
      // (ou já editados pelo usuário) precisam permanecer para serem
      // gravados lá. Recarregar aqui era a causa da perda de dados
      // encontrada pelo QA: os campos passavam a exibir e a salvar os
      // valores do DESTINO, apagando os da origem ao mover.
      if (moving) return;
      const vv = state.vitals[date] || { weight: "", restHr: "" };
      setF({ weight: vv.weight || "", restHr: vv.restHr || "" });
    }, [date]);
    return (
      <Modal title="Medidas do dia" onClose={() => setModal(null)}>
        <Field label="Data">
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Peso (kg)">
            <input type="number" step="0.1" inputMode="decimal" value={f.weight}
              onChange={(e) => setF({ ...f, weight: e.target.value })}
              style={{ ...inputStyle, fontFamily: SYS }}
              placeholder={inherited != null ? `último: ${String(inherited).replace(".", ",")}` : "—"} />
            {inherited != null && f.weight === "" && (
              <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>
                toque para registrar o peso de hoje
              </div>
            )}
          </Field>
          <Field label="FC repouso (bpm)">
            <input type="number" inputMode="numeric" value={f.restHr} onChange={(e) => setF({ ...f, restHr: e.target.value })}
              style={{ ...inputStyle, fontFamily: SYS }} placeholder="—" />
          </Field>
        </div>
        <PrimaryBtn onClick={() => {
          // O campo nunca é pré-preenchido com o peso herdado (só o placeholder
          // mostra a dica) — então o que está em f.weight é sempre o que o
          // usuário de fato digitou (ou o valor real já salvo, ao editar um dia
          // que já tem peso próprio). "Herdado não grava" passa a ser automático:
          // campo vazio → weight "".
          const weightToSave = f.weight;
          if (!confirmRange("weight", weightToSave)) return;
          if (!confirmRange("restHr", f.restHr)) return;
          if (!confirmWeightJump(state.vitals, date, f.weight)) return;

          // Se a data foi trocada e a origem tinha registro, isso é uma
          // MOVIMENTAÇÃO: grava no destino os valores atualmente nos campos
          // (preservados da origem pelo useEffect acima, ou já editados pelo
          // usuário) e remove a origem na mesma atualização de estado, para
          // nunca duplicar nem perder o dado.
          if (moving) {
            const dest = state.vitals[date];
            const destHasData = !!(dest && (dest.weight || dest.restHr));
            if (destHasData && !confirm(`Já existe registro em ${fmtBR(date)}. Substituir?`)) return;
            const nextVitals = { ...state.vitals };
            delete nextVitals[originalDate];
            nextVitals[date] = { weight: weightToSave, restHr: f.restHr };
            update({ ...state, vitals: nextVitals });
          } else {
            setVitalVal(date, { weight: weightToSave, restHr: f.restHr });
          }
          setModal(null);
        }} tone={C.body}>Salvar medidas</PrimaryBtn>
      </Modal>
    );
  }

  function ExameModal({ e }) {
    // apoB/lpa começam em "" tanto para exame novo quanto para um exame
    // antigo que nunca teve esses campos (undefined) — o spread de "e" só
    // sobrescreve o default quando o valor de fato existir no registro.
    const [f, setF] = useState(e ? { apoB: "", lpa: "", ...e } : { date: today, ct: "", hdl: "", tg: "", apoB: "", lpa: "", note: "" });
    const ldl = ldlOf(f.ct, f.hdl, f.tg);
    return (
      <Modal title={e ? "Editar exame" : "Novo exame"} onClose={() => setModal(null)}>
        <Field label="Data"><input type="date" value={f.date} max={today} onChange={(ev) => setF({ ...f, date: ev.target.value })} style={inputStyle} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          {[["ct", "CT"], ["hdl", "HDL"], ["tg", "TG"]].map(([k, l]) => (
            <Field key={k} label={l}>
              <input type="number" inputMode="numeric" value={f[k]} onChange={(ev) => setF({ ...f, [k]: ev.target.value })}
                style={{ ...inputStyle, fontFamily: SYS }} placeholder="—" />
            </Field>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label={<>ApoB <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: C.mute }}>· Apolipoproteína B</span></>}>
            <input type="number" step="0.1" inputMode="decimal" value={f.apoB} onChange={(ev) => setF({ ...f, apoB: ev.target.value })}
              style={{ ...inputStyle, fontFamily: SYS }} placeholder="—" />
          </Field>
          <Field label={<>Lp(a) <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: C.mute }}>· Lipoproteína(a)</span></>}>
            <input type="number" step="0.1" inputMode="decimal" value={f.lpa} onChange={(ev) => setF({ ...f, lpa: ev.target.value })}
              style={{ ...inputStyle, fontFamily: SYS }} placeholder="—" />
          </Field>
        </div>
        <div style={{ background: C.fill, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 14, color: C.ink }}>
          LDL calculado:{" "}
          <b style={{ fontFamily: SYS }}>
            {f.ct && f.hdl && f.tg !== "" ? (ldl != null ? `~${ldl} mg/dL` : "TG ≥ 400 — não calculável") : "—"}
          </b>
          {ldl != null && <span style={{ color: C.mute }}> · não-HDL {Number(f.ct) - Number(f.hdl)}</span>}
        </div>
        <Field label="Anotação (opcional)">
          <input value={f.note} onChange={(ev) => setF({ ...f, note: ev.target.value })} style={inputStyle} placeholder="ex.: 3 meses de corrida" />
        </Field>
        <PrimaryBtn onClick={() => {
          if (!f.ct || !f.hdl || f.tg === "") return;
          if (!confirmExam(f.ct, f.hdl, f.tg)) return;
          if (!confirmRange("apoB", f.apoB)) return;
          if (!confirmRange("lpa", f.lpa)) return;
          const rec = { ...f, ct: Number(f.ct), hdl: Number(f.hdl), tg: Number(f.tg), id: e ? e.id : String(Date.now()) };
          // Nunca converta "" (não preenchido) para Number — daria 0, um
          // valor espúrio e clinicamente enganoso. Campo vazio = ausente,
          // então removemos a chave por completo em vez de gravar "".
          if (f.apoB !== "") rec.apoB = Number(f.apoB); else delete rec.apoB;
          if (f.lpa !== "") rec.lpa = Number(f.lpa); else delete rec.lpa;
          update({ ...state, exams: e ? state.exams.map((x) => (x.id === e.id ? rec : x)) : [...state.exams, rec] });
          setModal(null);
        }} tone={C.exam}>{e ? "Salvar alterações" : "Salvar exame"}</PrimaryBtn>
      </Modal>
    );
  }

  function ConfigModal() {
    const [g, setG] = useState({ ...state.goals });
    const fileRef = useRef(null);

    function exportJSON() { download("hdl-backup.json", JSON.stringify(state, null, 2), "application/json"); }
    function exportCSV() {
      const t = ["data,minutos,tipo,fc_media", ...state.workouts.map((w) => `${w.date},${w.minutes},${w.type},${w.avgHr || ""}`)].join("\n");
      const e = ["data,ct,hdl,tg,ldl,apob,lpa,nota", ...state.exams.map((x) => `${x.date},${x.ct},${x.hdl},${x.tg},${ldlOf(x.ct, x.hdl, x.tg) ?? ""},${hasVal(x.apoB) ? x.apoB : ""},${hasVal(x.lpa) ? x.lpa : ""},"${x.note || ""}"`)].join("\n");
      const d = ["data,peixe,castanhas,aveia,azeite,abacate", ...Object.entries(state.days).sort().map(([k, v]) => `${k},${v.fish || 0},${v.nuts || 0},${v.oats || 0},${v.olive || 0},${v.avocado || 0}`)].join("\n");
      const s = ["data,peso,fc_repouso", ...Object.entries(state.vitals).sort().map(([k, w]) => `${k},${w.weight || ""},${w.restHr || ""}`)].join("\n");
      download("treinos.csv", t, "text/csv");
      download("exames.csv", e, "text/csv");
      download("alimentacao-diaria.csv", d, "text/csv");
      download("medidas-diarias.csv", s, "text/csv");
    }
    function resumo() {
      const ex = [...state.exams].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const txt = [
        "RESUMO — ACOMPANHAMENTO HDL",
        `Gerado em ${fmtBR(today)}`,
        "",
        ex ? `Último exame (${fmtBR(ex.date)}): CT ${ex.ct} · HDL ${ex.hdl} · TG ${ex.tg} · LDL ~${ldlOf(ex.ct, ex.hdl, ex.tg) ?? "n/c"}`
          + `${hasVal(ex.apoB) ? ` · ApoB ${ex.apoB}` : ""}${hasVal(ex.lpa) ? ` · Lp(a) ${ex.lpa}` : ""}` : "Sem exames registrados.",
        `Meta de HDL: ${state.goals.hdlGoal}+ mg/dL`,
        "",
        `Exercício: média ${media12} min/semana em zona (${state.goals.zoneLow}–${state.goals.zoneHigh} bpm) · meta ${state.goals.minWeek} min`,
        `${weeksOnGoal}/12 semanas na meta · sequência atual ${streak} sem · recorde ${record} min`,
        `FC de repouso hoje: ${todayVitals.restHr || "—"} bpm (Δ 4 sem: ${fmtDelta(dRest, "bpm")})`,
        `Peso hoje: ${todayVitals.weight || "—"} kg (Δ 4 sem: ${fmtDelta(dWt, "kg")})`,
        "",
        `Adesão alimentar geral: ${adesaoGeral}% (média 4 semanas)`,
        ...foodAdesao.map((f) => `  ${f.name}: ${f.avg.toFixed(1)}/${state.goals[f.key]} porções/sem (${f.pct}%)`),
      ].join("\n");
      download("resumo-consulta.txt", txt, "text/plain");
    }
    function importJSON(ev) {
      const file = ev.target.files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          // Valida a estrutura ANTES da migração: migrateState preenche
          // goals com defaults, o que mascararia um arquivo malformado.
          const raw = JSON.parse(r.result);
          const valido = raw && raw.goals && Array.isArray(raw.exams) &&
            Array.isArray(raw.workouts) && typeof raw.days === "object";
          if (valido) { update(migrateState(raw)); setModal(null); }
          else alert("Arquivo não reconhecido como backup do app.");
        } catch { alert("Não foi possível ler o arquivo. Confira se é o backup JSON."); }
      };
      r.readAsText(file);
    }

    const goalFields = [
      ["minWeek", "Minutos em zona / semana"], ["zoneLow", "Zona FC — mínimo (bpm)"], ["zoneHigh", "Zona FC — máximo (bpm)"],
      ["fish", "Peixe (porções/semana)"], ["nuts", "Castanhas (porções/semana)"], ["oats", "Aveia (porções/semana)"],
      ["olive", "Azeite (dias/semana)"], ["avocado", "Abacate (porções/semana)"],
      ["weightGoal", "Meta de peso (kg)"], ["hdlGoal", "Meta de HDL (mg/dL)"],
    ];

    return (
      <Modal title="Configurações" onClose={() => setModal(null)}>
        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: C.mute, margin: "6px 0 10px" }}>Metas</h3>
        {goalFields.map(([k, l]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
            <span style={{ fontSize: 14, color: C.ink }}>{l}</span>
            <input type="number" step="0.1" inputMode={k === "weightGoal" ? "decimal" : "numeric"} value={g[k]} onChange={(e) => setG({ ...g, [k]: e.target.value })}
              style={{ ...inputStyle, width: 88, fontFamily: SYS, textAlign: "center" }} />
          </div>
        ))}
        <div style={{ margin: "12px 0 20px" }}>
          <PrimaryBtn onClick={() => { update({ ...state, goals: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, Number(v)])) }); setModal(null); }}>
            Salvar metas
          </PrimaryBtn>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: C.mute, margin: "6px 0 10px" }}>Exportar</h3>
        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          <PrimaryBtn tone={C.blue} onClick={exportJSON}>Backup completo (JSON)</PrimaryBtn>
          <PrimaryBtn tone={C.blue} onClick={exportCSV}>Planilhas (4 CSV)</PrimaryBtn>
          <PrimaryBtn tone={C.blue} onClick={resumo}>Resumo para consulta (texto)</PrimaryBtn>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: C.mute, margin: "6px 0 10px" }}>Restaurar / dados</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={() => fileRef.current?.click()} style={{ ...inputStyle, cursor: "pointer", textAlign: "center", color: C.blue, fontWeight: 600 }}>
            Importar backup JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
          <button onClick={() => { update(demoState()); setModal(null); }} style={{ ...inputStyle, cursor: "pointer", textAlign: "center", color: C.blue, fontWeight: 500 }}>
            Recarregar dados de exemplo
          </button>
          <button onClick={() => { if (confirm("Apagar todos os dados e começar do zero?")) { update(emptyState()); setModal(null); } }}
            style={{ ...inputStyle, cursor: "pointer", textAlign: "center", color: C.danger, fontWeight: 500 }}>
            Zerar dados (começar meu uso real)
          </button>
        </div>
      </Modal>
    );
  }

  /* ═══ Layout ═══ */

  const NAV_ICONS = {
    home: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    ),
    trends: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 16 10 10 14 13 20 6" />
        <polyline points="14 6 20 6 20 12" />
      </svg>
    ),
    log: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
    exams: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5s6.5 7.7 6.5 12.3a6.5 6.5 0 0 1-13 0C5.5 11.2 12 3.5 12 3.5Z" />
      </svg>
    ),
  };

  const tabs = [["home", "Resumo"], ["trends", "Tendências"], ["log", "Registros"], ["exams", "Exames"]];
  const tabTitle = { home: "Resumo", trends: "Tendências", log: "Registros", exams: "Exames" };
  const dataExtenso = new Date(today + "T12:00:00")
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })
    .toUpperCase().replace(/\.$/, "");

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: SYS }}>
      <style>{`
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        .nav-btn { transition: filter .1s ease, transform .1s ease; }
        .nav-btn:active { filter: brightness(0.93); transform: scale(0.96); }
      `}</style>

      {/* Cabeçalho de aba estilo iOS: data por extenso em caixa alta cinza
          ACIMA do título grande (large title), com engrenagem discreta. */}
      <header style={{ maxWidth: 480, margin: "0 auto", padding: "calc(16px + env(safe-area-inset-top)) 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".02em", color: C.mute }}>{dataExtenso}</div>
          <h1 style={{ margin: "2px 0 0", fontFamily: SYS, fontWeight: 700, fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.ink }}>{tabTitle[tab]}</h1>
        </div>
        <button onClick={() => setModal({ kind: "config" })} aria-label="Configurações"
          style={{ border: "none", background: C.fill, borderRadius: 18, width: 36, height: 36, cursor: "pointer", color: C.blue, display: "grid", placeItems: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "8px 16px calc(116px + env(safe-area-inset-bottom))" }}>
        {tab === "home" && Home}
        {tab === "trends" && Trends}
        {tab === "log" && Registros}
        {tab === "exams" && Exams}
      </main>

      {/* Barra inferior — no Safari iOS a barra do navegador fica colada logo
          abaixo desta nav; por isso o conteúdo (ícone+rótulo) é ancorado no
          TOPO de cada botão (justifyContent flex-start), com respiro grande na
          base (22px + safe-area) para afastar o alvo útil da faixa que o Safari
          rouba. viewport-fit=cover (index.html) faz o env() valer no aparelho.
          Fundo translúcido com blur (estilo iOS), hairline superior, sem pílula
          nem borda de 3px. minHeight 76 e paddings preservados intactos. */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(255,255,255,0.82)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderTop: `0.5px solid ${C.hair}`,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex" }}>
          {tabs.map(([id, label]) => {
            const active = tab === id;
            return (
            <button key={id} onClick={() => setTab(id)} className="nav-btn"
              aria-current={active ? "page" : undefined}
              aria-label={label}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                gap: 4, border: "none", cursor: "pointer", boxSizing: "border-box",
                minHeight: 76, paddingTop: 12, paddingLeft: 4, paddingRight: 4,
                paddingBottom: "calc(22px + env(safe-area-inset-bottom))",
                background: "transparent",
                fontFamily: SYS, fontSize: 11,
                fontWeight: active ? 600 : 500,
                color: active ? C.blue : C.mute,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}>
              {NAV_ICONS[id]}
              <span>{label}</span>
            </button>
          );})}
        </div>
      </nav>

      {modal?.kind === "treino" && <TreinoModal w={modal.w} />}
      {modal?.kind === "dia" && <DiaModal date={modal.date} />}
      {modal?.kind === "vitals" && <VitalsModal date={modal.date} />}
      {modal?.kind === "exame" && <ExameModal e={modal.e} />}
      {modal?.kind === "config" && <ConfigModal />}
    </div>
  );
}
