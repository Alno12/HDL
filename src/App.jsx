import { useState, useEffect, useRef } from "react";

/* ─────────────────────────  Design tokens  ────────────────────── */

const C = {
  mist: "#EEF2F1",
  card: "#FFFFFF",
  ink: "#12343B",
  zone: "#E4572E",
  zoneSoft: "#FBE3DB",
  sea: "#3E7C85",
  seaSoft: "#D8E6E7",
  mute: "#6B7F82",
  line: "#DDE7E6",
};

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
      { id: "e1", date: "2026-07-15", ct: 155, hdl: 39, tg: 97, note: "Início do plano estruturado" },
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
function lastNWeeks(n) {
  const cur = mondayOf(todayStr());
  const arr = [];
  for (let i = n - 1; i >= 0; i--) arr.push(addDays(cur, -7 * i));
  return arr;
}
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

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
};
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
    <label style={{ display: "block", marginBottom: 14, flex: 1 }}>
      <span style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: C.mute, fontWeight: 600 }}>{label}</span>
      <div style={{ marginTop: 6 }}>{children}</div>
    </label>
  );
}
const inputStyle = {
  width: "100%", padding: "10px 12px", fontSize: 16,
  border: `1.5px solid ${C.line}`, borderRadius: 10,
  fontFamily: "'IBM Plex Sans', sans-serif", color: C.ink,
  background: "#fff", boxSizing: "border-box",
};
function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(18,52,59,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "18px 18px 0 0", padding: "20px 20px 28px", width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, margin: 0, color: C.ink }}>{title}</h2>
          <button onClick={onClose} aria-label="Fechar"
            style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: C.mute }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function PrimaryBtn({ children, onClick, tone = C.ink }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "none", background: tone, color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "'Sora', sans-serif", cursor: "pointer" }}>
      {children}
    </button>
  );
}
function Card({ title, right, children }) {
  return (
    <section style={{ background: C.card, borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: "0 1px 3px rgba(18,52,59,.06)" }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          {title && <h3 style={{ margin: 0, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.mute, fontWeight: 700 }}>{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
function SmallBtn({ children, onClick, tone = C.mute }) {
  return (
    <button onClick={onClick}
      style={{ border: `1px solid ${C.line}`, background: "#fff", color: tone, borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
      {children}
    </button>
  );
}

/* ─────────────────  Barra de zona (assinatura)  ─────────────────── */

function ZoneBar({ minutes, goal }) {
  const segs = Math.max(1, Math.round(goal / 10));
  const filled = Math.min(segs, Math.floor((minutes / goal) * segs));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{minutes}</span>
        <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, color: C.mute }}>/ {goal} min</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
        {Array.from({ length: segs }).map((_, i) => {
          const on = i < filled;
          const t = segs > 1 ? i / (segs - 1) : 0;
          const bg = on ? `color-mix(in srgb, ${C.sea} ${100 - t * 70}%, ${C.zone} ${t * 70}%)` : C.seaSoft;
          return <div key={i} style={{ flex: 1, height: 13, borderRadius: 4, background: bg }} />;
        })}
      </div>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>
        {minutes >= goal ? "Meta da semana atingida ✓" : `Faltam ${goal - minutes} min em zona`}
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
    <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
      {dayData.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: d.future ? 0.4 : 1 }}>
          <span style={{ fontSize: 9, fontFamily: "'Sora', sans-serif", color: d.min > 0 ? C.ink : "transparent" }}>{d.min || "0"}</span>
          <div style={{ height: 38, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ width: "70%", borderRadius: 4, height: d.min > 0 ? Math.max(5, (d.min / maxMin) * 38) : 3, background: d.min > 0 ? C.sea : C.line }} />
          </div>
          <span style={{
            fontSize: 10, fontFamily: "'Sora', sans-serif",
            fontWeight: d.isToday ? 700 : 400, color: d.isToday ? "#fff" : C.mute,
            background: d.isToday ? C.zone : "transparent",
            borderRadius: 6, padding: "1px 5px",
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
    width: 38, height: 38, borderRadius: 11, fontSize: 20, cursor: "pointer",
    fontFamily: "'Sora', sans-serif", fontWeight: 600, border: `1.5px solid ${C.line}`,
    background: "#fff", color: C.ink,
  };
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{food.emoji} {food.name}</div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{food.portion}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <button aria-label={`Remover porção de hoje`} style={{ ...btn, opacity: countToday === 0 ? 0.35 : 1 }}
            onClick={() => onSetDay(today, Math.max(0, countToday - 1))}>−</button>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 700, width: 20, textAlign: "center", color: countToday > 0 ? C.ink : C.mute }}>
            {countToday}
          </span>
          <button aria-label={`Adicionar porção hoje`} style={{ ...btn, background: C.ink, color: "#fff", border: "none" }}
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
                  flex: 1, height: 26, borderRadius: 7, cursor: future ? "default" : "pointer",
                  fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 600,
                  border: isToday ? `1.5px solid ${C.zone}` : `1.5px solid ${c > 0 ? "transparent" : C.line}`,
                  background: c >= 2 ? C.ink : c === 1 ? C.sea : "#fff",
                  color: c > 0 ? "#fff" : C.mute,
                  opacity: future ? 0.35 : 1,
                }}>
                {c >= 2 ? c : L}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, fontFamily: "'Sora', sans-serif", color: done ? C.sea : C.mute, fontWeight: done ? 700 : 400, width: 46, textAlign: "right" }}>
          {weekTotal}/{weekGoal}{done ? " ✓" : ""}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────  Gráficos  ──────────────────────────── */

function Bars({ data, goal, labels, ma }) {
  const W = 320, H = 120, pad = 4;
  const max = Math.max(goal, ...data, 1) * 1.12;
  const bw = (W - pad * 2) / data.length;
  const gy = H - (goal / max) * H;
  const maPts = ma
    ? ma.map((v, i) => (v == null ? null : `${pad + i * bw + bw / 2},${H - (v / max) * H}`)).filter(Boolean).join(" ")
    : null;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} style={{ width: "100%" }}>
      {data.map((v, i) => {
        const h = (v / max) * H;
        return <rect key={i} x={pad + i * bw + 2} y={H - h} width={bw - 4} height={Math.max(h, 1)} rx="3" fill={v >= goal ? C.sea : C.seaSoft} />;
      })}
      <line x1="0" x2={W} y1={gy} y2={gy} stroke={C.zone} strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={W - 2} y={gy - 4} textAnchor="end" fontSize="10" fill={C.zone}>meta {goal}</text>
      {maPts && <polyline points={maPts} fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" opacity="0.75" />}
      {labels.map((l, i) => i % 3 === 0 ? (
        <text key={i} x={pad + i * bw + bw / 2} y={H + 12} textAnchor="middle" fontSize="8.5" fill={C.mute}>{l}</text>
      ) : null)}
    </svg>
  );
}

function Line({ points, goal, unit, color = C.ink, band }) {
  const W = 320, H = 116, padX = 8, padY = 16;
  const vals = points.map((p) => p.v);
  const all = [...vals];
  if (goal != null) all.push(goal);
  if (band) all.push(band[0], band[1]);
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const x = (i) => padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2);
  const y = (v) => padY + (1 - (v - min) / span) * (H - padY * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ");
  const area = `${d} L${x(points.length - 1)},${H} L${x(0)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: "100%" }}>
      {band && (
        <>
          <rect x="0" y={y(band[1])} width={W} height={Math.max(2, y(band[0]) - y(band[1]))} fill={C.zoneSoft} opacity="0.7" />
          <text x={W - 2} y={y(band[1]) + 10} textAnchor="end" fontSize="9" fill={C.zone}>zona {band[0]}–{band[1]}</text>
        </>
      )}
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="0" x2={W} y1={padY + t * (H - padY * 2)} y2={padY + t * (H - padY * 2)} stroke={C.line} strokeWidth="0.5" />
      ))}
      {goal != null && (
        <>
          <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke={C.zone} strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={W - 2} y={y(goal) - 4} textAnchor="end" fontSize="10" fill={C.zone}>meta {goal}</text>
        </>
      )}
      <path d={area} fill={color} opacity="0.07" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.v)} r="3.2" fill={color} />)}
      {points.map((p, i) => (points.length <= 8 || i % 2 === 0 || i === points.length - 1) ? (
        <text key={"t" + i} x={x(i)} y={y(p.v) - 7} textAnchor="middle" fontSize="9" fill={C.mute}>{p.v}{unit || ""}</text>
      ) : null)}
      {points.map((p, i) => p.l && (points.length <= 6 || i % 2 === 0) ? (
        <text key={"l" + i} x={x(i)} y={H + 11} textAnchor="middle" fontSize="8.5" fill={C.mute}>{p.l}</text>
      ) : null)}
    </svg>
  );
}

const Empty = ({ children }) => (
  <div style={{ padding: "18px 8px", textAlign: "center", color: C.mute, fontSize: 14 }}>{children}</div>
);

function Stat({ label, value, sub, tone }) {
  return (
    <div style={{ background: C.mist, borderRadius: 12, padding: "11px 13px" }}>
      <div style={{ fontSize: 10.5, letterSpacing: ".05em", textTransform: "uppercase", color: C.mute, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: tone || C.ink, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.mute, marginTop: 2 }}>{sub}</div>}
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

  if (!state)
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.mist, color: C.mute, fontFamily: "'IBM Plex Sans', sans-serif" }}>Carregando…</div>;

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

  const restSeries = weeks12.map((m, i) => ({ l: wLabels[i], v: restVals[i] != null ? Math.round(restVals[i]) : null }))
    .filter((p) => p.v != null);
  const wtSeries = weeks12.map((m, i) => ({ l: wLabels[i], v: wtVals[i] != null ? Math.round(wtVals[i] * 10) / 10 : null }))
    .filter((p) => p.v != null);

  const hrSeries = weeks12.map((m, i) => {
    const end = addDays(m, 6);
    const hrs = state.workouts.filter((w) => w.date >= m && w.date <= end && Number(w.avgHr) > 0).map((w) => Number(w.avgHr));
    return hrs.length ? { l: wLabels[i], v: Math.round(mean(hrs)) } : null;
  }).filter(Boolean);

  const weeks4 = lastNWeeks(4);
  const foodAdesao = FOODS.map((f) => {
    const totals = weeks4.map((m) => foodWeekTotal(state.days, m, f.key));
    const avg = mean(totals) || 0;
    return { ...f, avg, pct: Math.min(100, Math.round((avg / state.goals[f.key]) * 100)) };
  });
  const adesaoGeral = Math.round(mean(foodAdesao.map((f) => f.pct)));

  /* ═══ Home ═══ */

  const Home = (
    <>
      <Card title={`Semana · ${weekLabel(monday)}`}>
        <ZoneBar minutes={minutes} goal={state.goals.minWeek} />
        <WeekStrip workouts={state.workouts} monday={monday} />
        <div style={{ marginTop: 14 }}>
          <PrimaryBtn onClick={() => setModal({ kind: "treino" })}>+ Registrar treino</PrimaryBtn>
        </div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 8, textAlign: "center" }}>
          Zona alvo: {state.goals.zoneLow}–{state.goals.zoneHigh} bpm
        </div>
      </Card>

      <Card title="Alimentação"
        right={<span style={{ fontSize: 11, color: C.mute }}>toque nos dias para ajustar</span>}>
        {FOODS.map((f) => (
          <FoodRow key={f.key} food={f} monday={monday} days={state.days}
            weekGoal={state.goals[f.key]}
            onSetDay={(date, v) => setFoodDay(date, f.key, v)} />
        ))}
      </Card>

      <Card title="Medidas de hoje">
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: C.mute }}>Peso (kg)</span>
            <input type="number" step="0.1" inputMode="decimal" value={todayVitals.weight}
              onFocus={(e) => { weightFocusRef.current = e.target.value; }}
              onChange={(e) => setVitalVal(today, { weight: e.target.value })}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === "" || val === weightFocusRef.current) return;
                const ok = confirmRange("weight", val) && confirmWeightJump(state.vitals, today, val);
                if (!ok) setVitalVal(today, { weight: weightFocusRef.current });
              }}
              style={{ ...inputStyle, marginTop: 4, fontFamily: "'Sora', sans-serif" }} placeholder="—" />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: C.mute }}>FC repouso (bpm)</span>
            <input type="number" inputMode="numeric" value={todayVitals.restHr}
              onFocus={(e) => { hrFocusRef.current = e.target.value; }}
              onChange={(e) => setVitalVal(today, { restHr: e.target.value })}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === "" || val === hrFocusRef.current) return;
                if (!confirmRange("restHr", val)) setVitalVal(today, { restHr: hrFocusRef.current });
              }}
              style={{ ...inputStyle, marginTop: 4, fontFamily: "'Sora', sans-serif" }} placeholder="—" />
          </label>
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Registro diário — anote todos os dias, de preferência ao acordar.</div>
      </Card>
    </>
  );

  /* ═══ Tendências ═══ */

  const Trends = (
    <>
      <Card title="Resumo · 12 semanas">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <Stat label="Média / semana" value={`${media12} min`} sub={`últimas 4: ${media4} min`} />
          <Stat label="Semanas na meta" value={`${weeksOnGoal}/12`} sub={`meta ${state.goals.minWeek} min`} />
          <Stat label="Sequência atual" value={streak > 0 ? `${streak} sem` : "—"} sub="semanas seguidas na meta" />
          <Stat label="Recorde semanal" value={`${record} min`} sub="melhor semana do período" />
          <Stat label="Total no mês" value={`${totalMonth} min`} sub={`${monthWk.length} treinos em ${MESES[Number(curMonth.slice(5)) - 1]}`} />
          <Stat label="Adesão alimentar" value={`${adesaoGeral}%`} sub={`média 4 sem, ${FOODS.length} alimentos`} tone={adesaoGeral >= 80 ? C.sea : undefined} />
          <Stat label="Δ FC repouso" value={fmtDelta(dRest, "bpm")} sub="4 sem vs 4 anteriores" tone={dRest != null && dRest < 0 ? C.sea : undefined} />
          <Stat label="Δ Peso" value={fmtDelta(dWt, "kg")} sub="4 sem vs 4 anteriores" tone={dWt != null && dWt < 0 ? C.sea : undefined} />
        </div>
      </Card>

      <Card title="Minutos em zona · 12 semanas"
        right={<span style={{ fontSize: 11, color: C.mute }}>linha = média móvel 4 sem</span>}>
        {minsSeries.some((v) => v > 0)
          ? <Bars data={minsSeries} goal={state.goals.minWeek} labels={wLabels} ma={maSeries} />
          : <Empty>Registre treinos para ver a evolução aqui.</Empty>}
      </Card>

      <Card title="FC média dos treinos"
        right={<span style={{ fontSize: 11, color: C.mute }}>faixa = sua zona alvo</span>}>
        {hrSeries.length >= 2
          ? <Line points={hrSeries} color={C.ink} band={[state.goals.zoneLow, state.goals.zoneHigh]} />
          : <Empty>Anote a FC média nos treinos para ver se está caindo na zona.</Empty>}
      </Card>

      <Card title="Adesão alimentar · média 4 semanas">
        {foodAdesao.map((f) => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
            <span style={{ fontSize: 14, width: 112, color: C.ink }}>{f.emoji} {f.name.split(" ")[0]}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.seaSoft, overflow: "hidden" }}>
              <div style={{ width: `${f.pct}%`, height: "100%", background: f.pct >= 100 ? C.sea : `color-mix(in srgb, ${C.sea} 65%, ${C.seaSoft} 35%)` }} />
            </div>
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, color: C.mute, width: 76, textAlign: "right" }}>
              {f.avg.toFixed(1)}/{state.goals[f.key]} · {f.pct}%
            </span>
          </div>
        ))}
      </Card>

      <Card title="FC de repouso · semanal">
        {restSeries.length >= 2 ? <Line points={restSeries} color={C.zone} /> : <Empty>Anote a FC de repouso semanal na Home.</Empty>}
      </Card>

      <Card title="Peso · semanal">
        {wtSeries.length >= 2 ? <Line points={wtSeries} goal={Number(state.goals.weightGoal) || null} /> : <Empty>Anote o peso semanal na Home.</Empty>}
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
      <Card title="Adicionar retroativo">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Treino", () => setModal({ kind: "treino" })],
            ["Alimentação", () => setModal({ kind: "dia", date: today })],
            ["Medidas", () => setModal({ kind: "vitals", date: today })],
          ].map(([l, fn]) => (
            <button key={l} onClick={fn}
              style={{ padding: "12px 4px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 13, color: C.ink, cursor: "pointer" }}>
              + {l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Todos permitem escolher a data — inclusive dias e semanas passadas.</div>
      </Card>

      <Card title={`Treinos · ${workoutsSorted.length}`}>
        {workoutsSorted.length === 0 && <Empty>Nenhum treino registrado.</Empty>}
        {workoutsSorted.slice(0, 20).map((w) => (
          <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>
                {fmtBR(w.date)} <span style={{ color: C.mute, fontWeight: 400 }}>· {weekdayShort(w.date)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.mute }}>{w.type} · {w.minutes} min{w.avgHr ? ` · FC ${w.avgHr}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <SmallBtn onClick={() => setModal({ kind: "treino", w })}>editar</SmallBtn>
              <SmallBtn tone={C.zone} onClick={() => { if (confirm("Excluir este treino?")) update({ ...state, workouts: state.workouts.filter((x) => x.id !== w.id) }); }}>excluir</SmallBtn>
            </div>
          </div>
        ))}
      </Card>

      <Card title="Alimentação · últimos dias">
        {daysSorted.length === 0 && <Empty>Nenhum registro de alimentação.</Empty>}
        {daysSorted.map(([date, v]) => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>
                {fmtBR(date)} <span style={{ color: C.mute, fontWeight: 400 }}>· {weekdayShort(date)}</span>
              </div>
              <div style={{ fontSize: 13, color: C.mute }}>
                {FOODS.filter((f) => Number(v[f.key]) > 0).map((f) => `${f.emoji}${v[f.key] > 1 ? "×" + v[f.key] : ""}`).join("  ") || "—"}
              </div>
            </div>
            <SmallBtn onClick={() => setModal({ kind: "dia", date })}>editar</SmallBtn>
          </div>
        ))}
      </Card>

      <Card title="Medidas diárias · últimos dias">
        {vitalsSorted.length === 0 && <Empty>Nenhum registro de peso/FC ainda.</Empty>}
        {vitalsSorted.map(([date, v]) => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: C.ink }}>
                {fmtBR(date)} <span style={{ color: C.mute, fontWeight: 400 }}>· {weekdayShort(date)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.mute }}>
                {v.weight ? v.weight + " kg" : "peso —"} · {v.restHr ? "FC " + v.restHr : "FC —"}
              </div>
            </div>
            <SmallBtn onClick={() => setModal({ kind: "vitals", date })}>editar</SmallBtn>
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
      <Card title="HDL ao longo do tempo">
        {hdlPts.length >= 2
          ? <Line points={hdlPts} goal={state.goals.hdlGoal} color={C.sea} />
          : (
            <div>
              {hdlPts.length === 1 && (
                <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 44, fontWeight: 700, color: C.ink }}>{hdlPts[0].v}</span>
                  <span style={{ color: C.mute, fontSize: 14 }}> mg/dL · meta {state.goals.hdlGoal}+</span>
                </div>
              )}
              <Empty>Com o próximo exame, o gráfico de evolução aparece aqui.</Empty>
            </div>
          )}
      </Card>
      <div style={{ marginBottom: 14 }}>
        <PrimaryBtn onClick={() => setModal({ kind: "exame" })}>+ Novo exame</PrimaryBtn>
      </div>
      {[...examsSorted].reverse().map((e) => {
        const ldl = ldlOf(e.ct, e.hdl, e.tg);
        return (
          <Card key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontFamily: "'Sora', sans-serif", color: C.ink }}>{fmtBR(e.date)}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <SmallBtn onClick={() => setModal({ kind: "exame", e })}>editar</SmallBtn>
                <SmallBtn tone={C.zone} onClick={() => { if (confirm("Excluir este exame?")) update({ ...state, exams: state.exams.filter((x) => x.id !== e.id) }); }}>excluir</SmallBtn>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", fontFamily: "'Sora', sans-serif", fontSize: 14, color: C.ink }}>
              <span>CT <b>{e.ct}</b></span>
              <span style={{ color: e.hdl >= state.goals.hdlGoal ? C.sea : C.zone }}>HDL <b>{e.hdl}</b></span>
              <span>TG <b>{e.tg}</b></span>
              <span>LDL <b>{ldl != null ? `~${ldl}` : "n/c*"}</b></span>
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
            style={{ ...inputStyle, fontFamily: "'Sora', sans-serif", fontSize: 22 }} placeholder="0" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {quickMins.map((m) => (
              <button key={m} type="button" onClick={() => setF({ ...f, minutes: String(m) })}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 10, cursor: "pointer",
                  fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600,
                  border: `1.5px solid ${String(f.minutes) === String(m) ? C.sea : C.line}`,
                  background: String(f.minutes) === String(m) ? C.seaSoft : "#fff",
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
        <PrimaryBtn onClick={() => {
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
    const btn = { width: 38, height: 38, borderRadius: 11, fontSize: 20, cursor: "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 600, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink };
    return (
      <Modal title="Alimentação do dia" onClose={() => setModal(null)}>
        <Field label="Data">
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
        {FOODS.map((f) => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{f.emoji} {f.name}</div>
              <div style={{ fontSize: 12, color: C.mute }}>{f.portion}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <button style={{ ...btn, opacity: (d[f.key] || 0) === 0 ? 0.35 : 1 }}
                onClick={() => setFoodDay(date, f.key, Math.max(0, (d[f.key] || 0) - 1))}>−</button>
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 700, width: 20, textAlign: "center" }}>{d[f.key] || 0}</span>
              <button style={{ ...btn, background: C.ink, color: "#fff", border: "none" }}
                onClick={() => setFoodDay(date, f.key, (d[f.key] || 0) + 1)}>+</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16 }}><PrimaryBtn onClick={() => setModal(null)}>Concluir</PrimaryBtn></div>
      </Modal>
    );
  }

  function VitalsModal({ date: initialDate }) {
    const [date, setDate] = useState(initialDate || today);
    const v = state.vitals[date] || { weight: "", restHr: "" };
    const inherited = lastWeightBefore(state.vitals, date);
    const [f, setF] = useState({ weight: v.weight || (inherited != null ? String(inherited) : ""), restHr: v.restHr || "" });
    const [weightInherited, setWeightInherited] = useState(!v.weight && inherited != null);
    useEffect(() => {
      const vv = state.vitals[date] || { weight: "", restHr: "" };
      const inh = lastWeightBefore(state.vitals, date);
      setF({ weight: vv.weight || (inh != null ? String(inh) : ""), restHr: vv.restHr || "" });
      setWeightInherited(!vv.weight && inh != null);
    }, [date]);
    return (
      <Modal title="Medidas do dia" onClose={() => setModal(null)}>
        <Field label="Data">
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Peso (kg)">
            <input type="number" step="0.1" inputMode="decimal" value={f.weight}
              onChange={(e) => { setF({ ...f, weight: e.target.value }); setWeightInherited(false); }}
              style={{ ...inputStyle, fontFamily: "'Sora', sans-serif" }} placeholder="—" />
            {weightInherited && f.weight !== "" && (
              <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>
                último registro: {String(inherited).replace(".", ",")} kg — edite para gravar hoje
              </div>
            )}
          </Field>
          <Field label="FC repouso (bpm)">
            <input type="number" inputMode="numeric" value={f.restHr} onChange={(e) => setF({ ...f, restHr: e.target.value })}
              style={{ ...inputStyle, fontFamily: "'Sora', sans-serif" }} placeholder="—" />
          </Field>
        </div>
        <PrimaryBtn onClick={() => {
          // Peso herdado (pré-preenchido) e não editado não é gravado — só o
          // que o usuário mediu de fato entra na série (achado da revisão).
          const weightToSave = weightInherited ? (v.weight || "") : f.weight;
          if (!confirmRange("weight", weightToSave)) return;
          if (!confirmRange("restHr", f.restHr)) return;
          if (!weightInherited && !confirmWeightJump(state.vitals, date, f.weight)) return;
          setVitalVal(date, { weight: weightToSave, restHr: f.restHr });
          setModal(null);
        }}>Salvar medidas</PrimaryBtn>
      </Modal>
    );
  }

  function ExameModal({ e }) {
    const [f, setF] = useState(e ? { ...e } : { date: today, ct: "", hdl: "", tg: "", note: "" });
    const ldl = ldlOf(f.ct, f.hdl, f.tg);
    return (
      <Modal title={e ? "Editar exame" : "Novo exame"} onClose={() => setModal(null)}>
        <Field label="Data"><input type="date" value={f.date} max={today} onChange={(ev) => setF({ ...f, date: ev.target.value })} style={inputStyle} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          {[["ct", "CT"], ["hdl", "HDL"], ["tg", "TG"]].map(([k, l]) => (
            <Field key={k} label={l}>
              <input type="number" inputMode="numeric" value={f[k]} onChange={(ev) => setF({ ...f, [k]: ev.target.value })}
                style={{ ...inputStyle, fontFamily: "'Sora', sans-serif" }} placeholder="—" />
            </Field>
          ))}
        </div>
        <div style={{ background: C.mist, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 14, color: C.ink }}>
          LDL calculado:{" "}
          <b style={{ fontFamily: "'Sora', sans-serif" }}>
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
          const rec = { ...f, ct: Number(f.ct), hdl: Number(f.hdl), tg: Number(f.tg), id: e ? e.id : String(Date.now()) };
          update({ ...state, exams: e ? state.exams.map((x) => (x.id === e.id ? rec : x)) : [...state.exams, rec] });
          setModal(null);
        }}>{e ? "Salvar alterações" : "Salvar exame"}</PrimaryBtn>
      </Modal>
    );
  }

  function ConfigModal() {
    const [g, setG] = useState({ ...state.goals });
    const fileRef = useRef(null);

    function exportJSON() { download("hdl-backup.json", JSON.stringify(state, null, 2), "application/json"); }
    function exportCSV() {
      const t = ["data,minutos,tipo,fc_media", ...state.workouts.map((w) => `${w.date},${w.minutes},${w.type},${w.avgHr || ""}`)].join("\n");
      const e = ["data,ct,hdl,tg,ldl,nota", ...state.exams.map((x) => `${x.date},${x.ct},${x.hdl},${x.tg},${ldlOf(x.ct, x.hdl, x.tg) ?? ""},"${x.note || ""}"`)].join("\n");
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
        ex ? `Último exame (${fmtBR(ex.date)}): CT ${ex.ct} · HDL ${ex.hdl} · TG ${ex.tg} · LDL ~${ldlOf(ex.ct, ex.hdl, ex.tg) ?? "n/c"}` : "Sem exames registrados.",
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
        <h3 style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.mute }}>Metas</h3>
        {goalFields.map(([k, l]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
            <span style={{ fontSize: 14, color: C.ink }}>{l}</span>
            <input type="number" step="0.1" inputMode={k === "weightGoal" ? "decimal" : "numeric"} value={g[k]} onChange={(e) => setG({ ...g, [k]: e.target.value })}
              style={{ ...inputStyle, width: 88, fontFamily: "'Sora', sans-serif", textAlign: "center" }} />
          </div>
        ))}
        <div style={{ margin: "12px 0 20px" }}>
          <PrimaryBtn onClick={() => { update({ ...state, goals: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, Number(v)])) }); setModal(null); }}>
            Salvar metas
          </PrimaryBtn>
        </div>

        <h3 style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.mute }}>Exportar</h3>
        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          <PrimaryBtn tone={C.sea} onClick={exportJSON}>Backup completo (JSON)</PrimaryBtn>
          <PrimaryBtn tone={C.sea} onClick={exportCSV}>Planilhas (4 CSV)</PrimaryBtn>
          <PrimaryBtn tone={C.sea} onClick={resumo}>Resumo para consulta (texto)</PrimaryBtn>
        </div>

        <h3 style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.mute }}>Restaurar / dados</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={() => fileRef.current?.click()} style={{ ...inputStyle, cursor: "pointer", textAlign: "center", fontWeight: 600 }}>
            Importar backup JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
          <button onClick={() => { update(demoState()); setModal(null); }} style={{ ...inputStyle, cursor: "pointer", textAlign: "center" }}>
            Recarregar dados de exemplo
          </button>
          <button onClick={() => { if (confirm("Apagar todos os dados e começar do zero?")) { update(emptyState()); setModal(null); } }}
            style={{ ...inputStyle, cursor: "pointer", textAlign: "center", color: C.zone, borderColor: C.zone }}>
            Zerar dados (começar meu uso real)
          </button>
        </div>
      </Modal>
    );
  }

  /* ═══ Layout ═══ */

  const NAV_ICONS = {
    home: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    ),
    trends: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 16 10 10 14 13 20 6" />
        <polyline points="14 6 20 6 20 12" />
      </svg>
    ),
    log: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
    exams: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5s6.5 7.7 6.5 12.3a6.5 6.5 0 0 1-13 0C5.5 11.2 12 3.5 12 3.5Z" />
      </svg>
    ),
  };

  const tabs = [["home", "Home"], ["trends", "Tendências"], ["log", "Registros"], ["exams", "Exames"]];

  return (
    <div style={{ minHeight: "100vh", background: C.mist, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.sea}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        .nav-btn { transition: filter .1s ease, transform .1s ease; }
        .nav-btn:active { filter: brightness(0.93); transform: scale(0.96); }
      `}</style>

      <header style={{ maxWidth: 480, margin: "0 auto", padding: "18px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: C.ink }}>HDL 40+</div>
          <div style={{ fontSize: 12, color: C.mute }}>Acompanhamento pessoal</div>
        </div>
        <button onClick={() => setModal({ kind: "config" })} aria-label="Configurações"
          style={{ border: `1.5px solid ${C.line}`, background: "#fff", borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer" }}>⚙</button>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "10px 16px calc(110px + env(safe-area-inset-bottom))" }}>
        {tab === "home" && Home}
        {tab === "trends" && Trends}
        {tab === "log" && Registros}
        {tab === "exams" && Exams}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex" }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="nav-btn"
              aria-current={tab === id ? "page" : undefined}
              aria-label={label}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, border: "none", cursor: "pointer", boxSizing: "border-box",
                paddingTop: 12, paddingLeft: 4, paddingRight: 4,
                paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                background: tab === id ? C.seaSoft : "transparent",
                fontFamily: "'Sora', sans-serif", fontSize: 11,
                fontWeight: tab === id ? 700 : 500,
                color: tab === id ? C.ink : C.mute,
                borderTop: tab === id ? `3px solid ${C.sea}` : "3px solid transparent",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}>
              {NAV_ICONS[id]}
              <span>{label}</span>
            </button>
          ))}
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
