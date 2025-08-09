import React, { useEffect, useMemo, useRef, useState } from "react";

// Beatbox Eletrônico — Site Tocável (Visual Premium)
// UI refinada: glassmorphism, tipografia melhor, botões/controles estilizados,
// grade com feedback visual e acentos sutis. 100% WebAudio.

const STEPS = 16;
const LS_KEY = "beatbox.presets.v2";

// Paleta e utilitários de UI
const ACCENT = {
  base: "#7c3aed", // violet-600
  baseSoft: "#a78bfa", // violet-300
  glow: "#22d3ee", // cyan-400
};

const ui = {
  container: "min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100",
  wrap: "max-w-6xl mx-auto px-6 py-8",
  h1: "text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 via-white to-cyan-300 bg-clip-text text-transparent",
  sub: "text-zinc-400",
  row: "flex flex-wrap items-center gap-3",
  btnPrimary: "px-4 py-2 rounded-2xl bg-violet-600/90 hover:bg-violet-500 active:scale-[.98] shadow-lg shadow-violet-900/40 transition",
  btnDanger: "px-3 py-2 rounded-2xl bg-rose-600/90 hover:bg-rose-500 active:scale-[.98] transition",
  btnGhost: "px-3 py-2 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-[.98] transition",
  card: "rounded-2xl bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/50 shadow-lg shadow-black/30",
  cardPad: "p-4",
  label: "text-xs text-zinc-400",
  input: "w-full mt-1 px-3 py-2 rounded-xl bg-zinc-800/80 outline-none ring-1 ring-zinc-700/60 focus:ring-violet-500/60 transition",
  chip: "px-2.5 py-1 rounded-xl bg-zinc-800/80 text-xs text-zinc-300",
};

const tracksInit = [
  { id: "kick", name: "Kick", color: "bg-emerald-500", vol: 0.9, muted: false, solo: false },
  { id: "snare", name: "Snare", color: "bg-rose-500", vol: 0.8, muted: false, solo: false },
  { id: "hat", name: "Hat", color: "bg-amber-400", vol: 0.6, muted: false, solo: false },
  { id: "clap", name: "Clap", color: "bg-fuchsia-500", vol: 0.7, muted: false, solo: false },
  { id: "shaker", name: "Shaker", color: "bg-lime-400", vol: 0.55, muted: false, solo: false },
  { id: "rim", name: "Rimshot", color: "bg-sky-400", vol: 0.6, muted: false, solo: false },
  { id: "tomL", name: "Tom Low", color: "bg-indigo-500", vol: 0.75, muted: false, solo: false },
  { id: "tomM", name: "Tom Mid", color: "bg-indigo-400", vol: 0.7, muted: false, solo: false },
  { id: "tomH", name: "Tom High", color: "bg-indigo-300", vol: 0.65, muted: false, solo: false },
  { id: "ride", name: "Ride", color: "bg-teal-400", vol: 0.55, muted: false, solo: false },
  { id: "crash", name: "Crash", color: "bg-red-400", vol: 0.6, muted: false, solo: false },
  { id: "keys", name: "Teclado", color: "bg-violet-500", vol: 0.7, muted: false, solo: false },
  { id: "bass", name: "Bass", color: "bg-cyan-500", vol: 0.8, muted: false, solo: false },
];

function makeEmptyPattern() { return Object.fromEntries(tracksInit.map((t) => [t.id, Array(STEPS).fill(false)])); }

function electroPreset() {
  const p = makeEmptyPattern();
  const kick = [0, 4, 8, 12];
  const snare = [4, 12];
  const hat = [2, 6, 10, 14, 0, 4, 8, 12];
  const clap = [12];
  const shaker = [1, 3, 5, 7, 9, 11, 13, 15];
  const rim = [10];
  const tomL = [11];
  const tomM = [15];
  const ride = [0, 8];
  const crash = [0];
  const keys = [0, 8, 12];
  const bass = [0, 8];
  for (const i of kick) p.kick[i] = true;
  for (const i of snare) p.snare[i] = true;
  for (const i of hat) p.hat[i] = true;
  for (const i of clap) p.clap[i] = true;
  for (const i of shaker) p.shaker[i] = true;
  for (const i of rim) p.rim[i] = true;
  for (const i of tomL) p.tomL[i] = true;
  for (const i of tomM) p.tomM[i] = true;
  for (const i of ride) p.ride[i] = true;
  for (const i of crash) p.crash[i] = true;
  for (const i of keys) p.keys[i] = true;
  for (const i of bass) p.bass[i] = true;
  return p;
}

function randomPreset(density = 0.35) {
  const p = makeEmptyPattern();
  for (const id of Object.keys(p)) for (let i = 0; i < STEPS; i++) {
    const boost = id === "hat" || id === "shaker" ? 1.2 : 1.0;
    p[id][i] = Math.random() < density * boost;
  }
  return p;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(110);
  const [swing, setSwing] = useState(0.1);
  const [tracks, setTracks] = useState(tracksInit);
  const [pattern, setPattern] = useState(electroPreset);
  const [currentStep, setCurrentStep] = useState(-1);
  const [presetName, setPresetName] = useState("");
  const [saved, setSaved] = useState(() => loadAll());

  // Arp
  const [arpOn, setArpOn] = useState(false);
  const [arpRate, setArpRate] = useState(2);
  const [arpMode, setArpMode] = useState("up");

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const lookaheadRef = useRef(25);
  const scheduleAheadRef = useRef(0.1);
  const nextNoteTimeRef = useRef(0);
  const nextStepRef = useRef(0);
  const timerIdRef = useRef(null);

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      audioCtxRef.current = ctx; masterGainRef.current = master;
    }
    if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
  };

  const engines = useMemo(() => ({
    kick(time, velocity = 1) {
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator(); o.type = "sine";
      const g = ctx.createGain(); const d = ctx.createWaveShaper(); d.curve = makeDistortionCurve(5);
      o.connect(d); d.connect(g); g.connect(masterGainRef.current);
      const v = 0.9 * velocity;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(v, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
      o.frequency.setValueAtTime(130, time);
      o.frequency.exponentialRampToValueAtTime(45, time + 0.15);
      o.start(time); o.stop(time + 0.3);
    },
    snare(time, velocity = 1) {
      const ctx = audioCtxRef.current;
      const n = whiteNoise(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.setValueAtTime(1500, time);
      const ng = ctx.createGain(); n.connect(hp); hp.connect(ng); ng.connect(masterGainRef.current);
      const v = 0.7 * velocity; ng.gain.setValueAtTime(0.0001, time); ng.gain.exponentialRampToValueAtTime(v, time + 0.002); ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
      const o = ctx.createOscillator(); o.type = "triangle"; const bg = ctx.createGain(); o.connect(bg); bg.connect(masterGainRef.current);
      o.frequency.setValueAtTime(185, time);
      bg.gain.setValueAtTime(0.0001, time); bg.gain.exponentialRampToValueAtTime(0.4 * velocity, time + 0.002); bg.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      n.start(time); n.stop(time + 0.2); o.start(time); o.stop(time + 0.15);
    },
    hat(time, velocity = 1) {
      const ctx = audioCtxRef.current; const n = whiteNoise(ctx);
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
      const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
      const v = 0.4 * velocity; g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(v, time + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      n.start(time); n.stop(time + 0.07);
    },
    clap(time, velocity = 1) {
      const ctx = audioCtxRef.current;
      [0, 0.012, 0.025].forEach((o) => {
        const n = whiteNoise(ctx); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200;
        const g = ctx.createGain(); n.connect(bp); bp.connect(g); g.connect(masterGainRef.current);
        const v = 0.6 * velocity; g.gain.setValueAtTime(0.0001, time + o); g.gain.exponentialRampToValueAtTime(v, time + o + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, time + o + 0.12);
        n.start(time + o); n.stop(time + o + 0.14);
      });
    },
    shaker(time, velocity = 1) {
      const ctx = audioCtxRef.current; const n = whiteNoise(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
      const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
      const v = 0.35 * velocity; g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(v, time + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
      n.start(time); n.stop(time + 0.16);
    },
    rim(time, velocity = 1) {
      const ctx = audioCtxRef.current; const n = whiteNoise(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
      const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
      const v = 0.45 * velocity; g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(v, time + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      n.start(time); n.stop(time + 0.06);
    },
    tomL(time, velocity = 1) { drumTom(time, 130, 0.75 * velocity); },
    tomM(time, velocity = 1) { drumTom(time, 170, 0.7 * velocity); },
    tomH(time, velocity = 1) { drumTom(time, 210, 0.65 * velocity); },
    ride(time, velocity = 1) {
      const ctx = audioCtxRef.current; const n = whiteNoise(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
      const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
      const v = 0.25 * velocity; g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(v, time + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
      n.start(time); n.stop(time + 0.4);
    },
    crash(time, velocity = 1) {
      const ctx = audioCtxRef.current; const n = whiteNoise(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
      const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
      const v = 0.5 * velocity; g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(v, time + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
      n.start(time); n.stop(time + 1.0);
    },
    keys(time, velocity = 1) {
      const ctx = audioCtxRef.current; const rootHz = chordRootHz(nextStepRef.current); const chord = minor7(rootHz);
      const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 2200;
      const delay = ctx.createDelay(); delay.delayTime.value = 0.015 + Math.random()*0.008;
      const outG = ctx.createGain(); outG.gain.value = 0.0001;
      chord.forEach((f, idx) => { const o = ctx.createOscillator(); o.type = idx % 2 ? "sawtooth" : "triangle"; const g = ctx.createGain(); g.gain.value = 0.6 / chord.length; o.frequency.setValueAtTime(f, time); o.connect(g); g.connect(lpf); o.start(time); o.stop(time + 0.45); });
      lpf.connect(delay); delay.connect(outG); outG.connect(masterGainRef.current);
      const v = 0.7 * velocity; outG.gain.setValueAtTime(0.0001, time); outG.gain.exponentialRampToValueAtTime(v, time + 0.015); outG.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    },
    keysArp(time, velocity = 1, noteIndex = 0) {
      const ctx = audioCtxRef.current; const rootHz = chordRootHz(nextStepRef.current); const chord = minor7(rootHz); const f = chord[noteIndex % chord.length];
      const o = ctx.createOscillator(); o.type = "sawtooth"; const g = ctx.createGain(); g.gain.value = 0.0001; const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 2400;
      o.connect(lpf); lpf.connect(g); g.connect(masterGainRef.current);
      const v = 0.55 * velocity; o.frequency.setValueAtTime(f, time); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(v, time + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      o.start(time); o.stop(time + 0.18);
    },
    bass(time, velocity = 1) {
      const ctx = audioCtxRef.current; const o = ctx.createOscillator(); o.type = "sawtooth"; const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 220; const g = ctx.createGain(); g.gain.value = 0.0001;
      o.connect(lpf); lpf.connect(g); g.connect(masterGainRef.current);
      const v = 0.5 * velocity; const notes = [55, 65.41, 73.42, 82.41, 92.5, 110]; const f = notes[Math.floor((nextStepRef.current / 4) % notes.length)];
      o.frequency.setValueAtTime(f, time); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(v, time + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3); o.start(time); o.stop(time + 0.35);
    },
  }), [arpOn, arpRate, arpMode]);

  function chordRootHz(step) { const roots = [55, 65.41, 73.42, 82.41]; return roots[Math.floor(step / 4) % roots.length]; }
  function minor7(rootHz) { const r = rootHz; const m3 = r * Math.pow(2, 3/12); const p5 = r * Math.pow(2, 7/12); const m7 = r * Math.pow(2, 10/12); return [r, m3, p5, m7]; }
  function makeDistortionCurve(amount = 10) { const n = 44100, curve = new Float32Array(n), deg = Math.PI / 180; let x; for (let i = 0; i < n; ++i) { x = (i * 2) / n - 1; curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x)); } return curve; }
  function whiteNoise(ctx) { const bufferSize = 2 * ctx.sampleRate; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; const node = ctx.createBufferSource(); node.buffer = buffer; node.loop = true; return node; }
  function drumTom(time, baseFreq, amp) { const ctx = audioCtxRef.current; const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain(); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = baseFreq * 2; o.connect(bp); bp.connect(g); g.connect(masterGainRef.current); o.frequency.setValueAtTime(baseFreq * 1.1, time); o.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, time + 0.18); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(amp, time + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.28); o.start(time); o.stop(time + 0.3); }

  const scheduleNote = (step, time) => {
    const secondsPerBeat = 60.0 / tempo; const stepDur = 0.25 * secondsPerBeat; const sixteenth = step % 2 === 1; const swingDelay = sixteenth ? swing * (60 / tempo) / 2 : 0; const tPlay = time + swingDelay;
    const anySolo = tracks.some((t) => t.solo);
    tracks.forEach((tinfo) => {
      if (pattern[tinfo.id][step]) {
        if (tinfo.muted) return; if (anySolo && !tinfo.solo) return;
        if (tinfo.id === "keys" && arpOn) {
          const divisions = Math.max(1, Math.min(8, arpRate|0));
          for (let j = 0; j < divisions; j++) { const offset = (stepDur / divisions) * j; const idx = chooseArpIndex(j); engines.keysArp(tPlay + offset, tinfo.vol, idx); }
        } else { engines[tinfo.id](tPlay, tinfo.vol); }
      }
    });
  };
  function chooseArpIndex(j) { if (arpMode === "random") return Math.floor(Math.random() * 4); if (arpMode === "down") return 3 - (j % 4); return j % 4; }
  const nextNote = () => { const secondsPerBeat = 60.0 / tempo; nextNoteTimeRef.current += 0.25 * secondsPerBeat; nextStepRef.current = (nextStepRef.current + 1) % STEPS; };
  const scheduler = () => { const ctx = audioCtxRef.current; while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadRef.current) { scheduleNote(nextStepRef.current, nextNoteTimeRef.current); nextNote(); } setCurrentStep(nextStepRef.current); };
  useEffect(() => { if (!isPlaying) { if (timerIdRef.current) window.clearInterval(timerIdRef.current); timerIdRef.current = null; setCurrentStep(-1); return; } (async () => { await ensureAudio(); const ctx = audioCtxRef.current; nextStepRef.current = 0; nextNoteTimeRef.current = ctx.currentTime + 0.05; timerIdRef.current = window.setInterval(scheduler, lookaheadRef.current); })(); return () => { if (timerIdRef.current) window.clearInterval(timerIdRef.current); timerIdRef.current = null; }; }, [isPlaying, tempo, swing, pattern, tracks, arpOn, arpRate, arpMode]);

  // --- State helpers ---
  const toggleCell = (trackId, step) => setPattern((prev) => ({ ...prev, [trackId]: prev[trackId].map((v, i) => (i === step ? !v : v)) }));
  const setVol = (trackId, vol) => setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, vol } : t)));
  const toggleMute = (trackId) => setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)));
  const toggleSolo = (trackId) => setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t)));
  const clearAll = () => setPattern(makeEmptyPattern());
  const loadElectro = () => setPattern(electroPreset());
  const randomize = () => setPattern(randomPreset());

  function serialize(name) { return { name: name || presetName || "Untitled", pattern, tracks, tempo, swing, arpOn, arpRate, arpMode, ts: Date.now() }; }
  function loadAll() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } }
  function persistAll(obj) { localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
  function saveCurrent(asName) { const name = (asName || presetName || "Meu Groove").trim(); if (!name) return; const all = loadAll(); all[name] = serialize(name); persistAll(all); setSaved(all); }
  function loadPreset(name) { const data = saved[name]; if (!data) return; applyStateFromData(data); setPresetName(name); }
  function deletePreset(name) { const all = { ...saved }; delete all[name]; persistAll(all); setSaved(all); }
  function exportCurrent() { const data = serialize(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${data.name.replaceAll(" ", "_")}.json`; a.click(); URL.revokeObjectURL(url); }
  function applyStateFromData(data){ if (data.pattern) setPattern(data.pattern); if (data.tracks) setTracks(data.tracks); if (typeof data.tempo === 'number') setTempo(data.tempo); if (typeof data.swing === 'number') setSwing(data.swing); if (typeof data.arpOn === 'boolean') setArpOn(data.arpOn); if (typeof data.arpRate === 'number') setArpRate(data.arpRate); if (typeof data.arpMode === 'string') setArpMode(data.arpMode); }
  async function importFromFile(file){ try { const text = await file.text(); const data = JSON.parse(text); applyStateFromData(data); if (data.name) setPresetName(String(data.name)); } catch { alert("Arquivo inválido. Use um JSON exportado pelo app."); } }

  // Drag & Drop import
  const dropRef = useRef(null);
  useEffect(()=>{ const el = dropRef.current; if(!el) return; const onDragOver = (e)=>{e.preventDefault(); el.classList.add('ring-2','ring-cyan-400/60')}; const onDragLeave = ()=>{el.classList.remove('ring-2','ring-cyan-400/60')}; const onDrop = (e)=>{e.preventDefault(); el.classList.remove('ring-2','ring-cyan-400/60'); const f=e.dataTransfer.files?.[0]; if(f) importFromFile(f)}; el.addEventListener('dragover', onDragOver); el.addEventListener('dragleave', onDragLeave); el.addEventListener('drop', onDrop); return ()=>{el.removeEventListener('dragover', onDragOver); el.removeEventListener('dragleave', onDragLeave); el.removeEventListener('drop', onDrop)}; },[]);

  return (
    <div className={ui.container}>
      <style>{`
        :root{ --accent:${ACCENT.base}; --accent-soft:${ACCENT.baseSoft}; --glow:${ACCENT.glow}; }
        /* Range elegant */
        input[type="range"]{ -webkit-appearance:none; appearance:none; width:100%; height:10px; background:linear-gradient(90deg,var(--accent) 0%,var(--accent-soft) 100%); border-radius:999px; outline:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); }
        input[type="range"]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:999px; background:white; box-shadow:0 0 0 4px rgba(124,58,237,.35), 0 4px 14px rgba(0,0,0,.5); border:none; }
        input[type="range"]::-moz-range-thumb{ width:18px; height:18px; border-radius:999px; background:white; border:none; box-shadow:0 0 0 4px rgba(124,58,237,.35), 0 4px 14px rgba(0,0,0,.5); }
        select{ background-color:rgba(24,24,27,.7); border-radius:12px; padding:.5rem .75rem; border:1px solid rgba(63,63,70,.8); }
        .step-cell{ background:linear-gradient(180deg, rgba(39,39,42,.9), rgba(24,24,27,.9)); box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 1px 8px rgba(0,0,0,.45); }
        .step-cell.active{ background:linear-gradient(180deg, rgba(99,102,241,.95), rgba(76,29,149,.95)); box-shadow:0 0 0 2px rgba(255,255,255,.08), 0 0 20px rgba(34,211,238,.25); transform:translateY(-1px); }
        .current-step{ box-shadow:0 0 0 2px rgba(255,255,255,.18) inset, 0 0 24px rgba(34,211,238,.25); }
      `}</style>

      <div className={ui.wrap}>
        <header className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between mb-6">
          <div>
            <h1 className={ui.h1}>Beatbox Eletrônico — Site Tocável</h1>
            <p className={ui.sub}>Sequenciador de 16 passos com teclado, arpegiador, mute/solo e templates.</p>
          </div>
          <div className={ui.row}>
            <button onClick={() => setIsPlaying((p) => !p)} className={isPlaying ? ui.btnDanger : ui.btnPrimary}>{isPlaying ? "Parar" : "Tocar"}</button>
            <button onClick={loadElectro} className={ui.btnGhost}>Preset: Electro</button>
            <button onClick={randomize} className={ui.btnGhost}>Randomizar</button>
            <button onClick={clearAll} className={ui.btnGhost}>Limpar</button>
          </div>
        </header>

        {/* Presets */}
        <div className={`${ui.card} ${ui.cardPad} mb-6`} ref={dropRef}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto,auto,auto] gap-3 items-end">
            <div>
              <label className={ui.label}>Nome do template</label>
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Meu Groove" className={ui.input} />
            </div>
            <button onClick={() => saveCurrent()} className={ui.btnPrimary}>Salvar</button>
            <button onClick={exportCurrent} className={ui.btnGhost}>Exportar JSON</button>
            <label className={`${ui.btnGhost} cursor-pointer inline-flex items-center gap-2`}>
              <input type="file" accept="application/json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importFromFile(f); e.target.value='';}} />
              Importar JSON
            </label>
            <div className="text-sm text-zinc-400">{Object.keys(saved).length} salvos</div>
          </div>
          {Object.keys(saved).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(saved).sort().map((name) => (
                <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/70 ring-1 ring-zinc-700/60">
                  <button onClick={() => loadPreset(name)} className="underline decoration-dotted hover:text-white">{name}</button>
                  <button onClick={() => deletePreset(name)} className="text-rose-400 hover:text-rose-300" title="apagar">×</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-3">Dica: arraste e solte um arquivo .json aqui para importar.</p>
        </div>

        {/* Teclado & Arp */}
        <div className={`${ui.card} ${ui.cardPad} mb-6`}>
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold mb-2 tracking-tight">Teclado rápido</h2>
              <div className="flex flex-wrap gap-2">
                {["kick","snare","hat","clap","shaker","rim","tomL","tomM","tomH","ride","crash","keys","bass"].map((id) => (
                  <button key={id} onClick={() => triggerNow(id)} className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 ring-1 ring-zinc-700/60 text-sm">
                    {tracks.find((t) => t.id === id)?.name || id}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
                <input type="checkbox" checked={arpOn} onChange={(e)=>setArpOn(e.target.checked)} />
                Arpegiador no Teclado
              </label>
              <div className="px-3 py-2 rounded-xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
                <div className={ui.label}>Rate (subdivisões por passo)</div>
                <input type="range" min={1} max={8} value={arpRate} onChange={(e)=>setArpRate(parseInt(e.target.value))} />
                <div className="text-xs mt-1">{arpRate}x</div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-zinc-800/60 ring-1 ring-zinc-700/60">
                <div className={ui.label}>Padrão</div>
                <select value={arpMode} onChange={(e)=>setArpMode(e.target.value)} className="mt-1 w-full">
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[auto,1fr] gap-4 items-start">
          <div className="space-y-4">
            <div className={`${ui.card} ${ui.cardPad}`}>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className={ui.label}>Tempo</div>
                  <input type="range" min={60} max={180} value={tempo} onChange={(e) => setTempo(parseInt(e.target.value))} />
                  <div className="text-sm mt-1">{tempo} BPM</div>
                </div>
                <div className="flex-1">
                  <div className={ui.label}>Swing</div>
                  <input type="range" min={0} max={0.5} step={0.01} value={swing} onChange={(e) => setSwing(parseFloat(e.target.value))} />
                  <div className="text-sm mt-1">{Math.round(swing * 100)}%</div>
                </div>
              </div>
            </div>

            {tracks.map((t) => (
              <div key={t.id} className={`${ui.card} ${ui.cardPad}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${t.color}`} />
                    <h3 className="font-semibold tracking-tight">{t.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggleMute(t.id)} className={`px-2 py-1 rounded-lg text-xs ring-1 ring-zinc-700/70 ${t.muted? 'bg-rose-600/90':'bg-zinc-800/70 hover:bg-zinc-700/70'}`}>{t.muted? 'Muted':'Mute'}</button>
                    <button onClick={()=>toggleSolo(t.id)} className={`px-2 py-1 rounded-lg text-xs ring-1 ring-zinc-700/70 ${t.solo? 'bg-emerald-600/90':'bg-zinc-800/70 hover:bg-zinc-700/70'}`}>{t.solo? 'Soloed':'Solo'}</button>
                    <div className="w-40">
                      <div className={ui.label}>Volume</div>
                      <input type="range" min={0} max={1} step={0.01} value={t.vol} onChange={(e) => setVol(t.id, parseFloat(e.target.value))} />
                    </div>
                  </div>
                </div>
                <StepGrid currentStep={currentStep} color={t.color} values={pattern[t.id]} onToggle={(i) => toggleCell(t.id, i)} />
              </div>
            ))}
          </div>

          <div className={`${ui.card} ${ui.cardPad}`}>
            <h2 className="text-xl font-semibold mb-2 tracking-tight">Dicas</h2>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300 text-sm">
              <li>Use <b>Solo</b> para isolar uma trilha e ajustar o groove.</li>
              <li>Arpegiador em 4x com modo <b>Up</b> dá energia sem embolar.</li>
              <li>Importe/Exporte seus templates para compartilhar ideias.</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-3">Tudo roda localmente no seu navegador; templates ficam no seu dispositivo.</p>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-500">Feito com ❤️ em WebAudio – Divirta-se!</footer>
      </div>
    </div>
  );

  // --- Local triggers ---
  async function triggerNow(id) {
    await ensureAudio(); const t = audioCtxRef.current.currentTime + 0.001;
    if (id === 'keys' && arpOn) { const secondsPerBeat = 60.0 / tempo; const stepDur = 0.25 * secondsPerBeat; const divisions = Math.max(1, Math.min(8, arpRate|0)); for (let j=0;j<divisions;j++) { const idx = chooseArpIndex(j); engines.keysArp(t + (stepDur/divisions)*j, tracks.find(x=>x.id===id)?.vol ?? 0.7, idx); } }
    else { engines[id](t, tracks.find((x) => x.id === id)?.vol ?? 0.7); }
  }
}

function StepGrid({ values, onToggle, currentStep, color }){
  return (
    <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
      {values.map((v, i) => {
        const isBeat = i % 4 === 0; const isCurrent = i === currentStep;
        return (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={[
              "h-10 rounded-lg transition relative step-cell",
              v && "active",
              isBeat && "outline outline-1 outline-zinc-700/60",
              isCurrent && "current-step",
            ].filter(Boolean).join(" ")}
            aria-pressed={v}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500">{i + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
