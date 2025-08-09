import React, { useEffect, useMemo, useRef, useState } from "react";

// Beatbox Eletrônico — Site Tocável (versão estendida)
// + Mais instrumentos, Teclado (chord stab), Templates (Salvar/Exportar/Importar),
//   Mute/Solo por trilha e Arpegiador para o Teclado.
// 100% WebAudio, sem samples.

const STEPS = 16;
const LS_KEY = "beatbox.presets.v2";

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

function makeEmptyPattern() {
  return Object.fromEntries(tracksInit.map((t) => [t.id, Array(STEPS).fill(false)]));
}

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
  const tomH = [];
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
  for (const i of tomH) p.tomH[i] = true;
  for (const i of ride) p.ride[i] = true;
  for (const i of crash) p.crash[i] = true;
  for (const i of keys) p.keys[i] = true;
  for (const i of bass) p.bass[i] = true;
  return p;
}

function randomPreset(density = 0.35) {
  const p = makeEmptyPattern();
  for (const id of Object.keys(p)) {
    for (let i = 0; i < STEPS; i++) {
      const boost = id === "hat" || id === "shaker" ? 1.2 : 1.0;
      p[id][i] = Math.random() < density * boost;
    }
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

  // Arpegiador para o teclado
  const [arpOn, setArpOn] = useState(false);
  const [arpRate, setArpRate] = useState(2); // subdivisões por passo (2=colcheia, 4=semicolcheia)
  const [arpMode, setArpMode] = useState("up"); // up | down | random

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
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = master;
    }
    if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
  };

  const engines = useMemo(() => {
    return {
      kick(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const gain = ctx.createGain();
        const dist = ctx.createWaveShaper();
        dist.curve = makeDistortionCurve(5);
        osc.connect(dist); dist.connect(gain); gain.connect(masterGainRef.current);
        const v = 0.9 * velocity;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(v, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
        osc.frequency.setValueAtTime(130, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);
        osc.start(time); osc.stop(time + 0.3);
      },
      snare(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const noise = whiteNoise(ctx);
        const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = "highpass"; noiseFilter.frequency.setValueAtTime(1500, time);
        const noiseGain = ctx.createGain(); noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGainRef.current);
        const v = 0.7 * velocity;
        noiseGain.gain.setValueAtTime(0.0001, time);
        noiseGain.gain.exponentialRampToValueAtTime(v, time + 0.002);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
        const osc = ctx.createOscillator(); osc.type = "triangle";
        const bodyGain = ctx.createGain(); osc.connect(bodyGain); bodyGain.connect(masterGainRef.current);
        osc.frequency.setValueAtTime(185, time);
        bodyGain.gain.setValueAtTime(0.0001, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.4 * velocity, time + 0.002);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        noise.start(time); noise.stop(time + 0.2);
        osc.start(time); osc.stop(time + 0.15);
      },
      hat(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const noise = whiteNoise(ctx);
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
        const gain = ctx.createGain(); noise.connect(hp); hp.connect(gain); gain.connect(masterGainRef.current);
        const v = 0.4 * velocity;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(v, time + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
        noise.start(time); noise.stop(time + 0.07);
      },
      clap(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        [0, 0.012, 0.025].forEach((o) => {
          const n = whiteNoise(ctx);
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200;
          const g = ctx.createGain(); n.connect(bp); bp.connect(g); g.connect(masterGainRef.current);
          const v = 0.6 * velocity;
          g.gain.setValueAtTime(0.0001, time + o);
          g.gain.exponentialRampToValueAtTime(v, time + o + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, time + o + 0.12);
          n.start(time + o); n.stop(time + o + 0.14);
        });
      },
      shaker(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const n = whiteNoise(ctx);
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
        const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
        const v = 0.35 * velocity;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(v, time + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
        n.start(time); n.stop(time + 0.16);
      },
      rim(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const n = whiteNoise(ctx);
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
        const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
        const v = 0.45 * velocity;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(v, time + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
        n.start(time); n.stop(time + 0.06);
      },
      tomL(time, velocity = 1) { drumTom(time, 130, 0.75 * velocity); },
      tomM(time, velocity = 1) { drumTom(time, 170, 0.7 * velocity); },
      tomH(time, velocity = 1) { drumTom(time, 210, 0.65 * velocity); },
      ride(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const n = whiteNoise(ctx);
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
        const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
        const v = 0.25 * velocity;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(v, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
        n.start(time); n.stop(time + 0.4);
      },
      crash(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const n = whiteNoise(ctx);
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
        const g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(masterGainRef.current);
        const v = 0.5 * velocity;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(v, time + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
        n.start(time); n.stop(time + 1.0);
      },
      keys(time, velocity = 1) {
        // acorde "stab"
        const ctx = audioCtxRef.current;
        const rootHz = chordRootHz(nextStepRef.current);
        const chord = minor7(rootHz);
        const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 2200;
        const chorusDelay = ctx.createDelay(); chorusDelay.delayTime.value = 0.015 + Math.random()*0.008;
        const outG = ctx.createGain(); outG.gain.value = 0.0001;
        chord.forEach((f, idx) => {
          const o = ctx.createOscillator(); o.type = idx % 2 ? "sawtooth" : "triangle";
          const g = ctx.createGain(); g.gain.value = 0.6 / chord.length;
          o.frequency.setValueAtTime(f, time); o.connect(g); g.connect(lpf);
          o.start(time); o.stop(time + 0.45);
        });
        lpf.connect(chorusDelay); chorusDelay.connect(outG); outG.connect(masterGainRef.current);
        const v = 0.7 * velocity;
        outG.gain.setValueAtTime(0.0001, time);
        outG.gain.exponentialRampToValueAtTime(v, time + 0.015);
        outG.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
      },
      keysArp(time, velocity = 1, noteIndex = 0) {
        // nota única do acorde para arpegiador
        const ctx = audioCtxRef.current;
        const rootHz = chordRootHz(nextStepRef.current);
        const chord = minor7(rootHz);
        const f = chord[noteIndex % chord.length];
        const o = ctx.createOscillator(); o.type = "sawtooth";
        const g = ctx.createGain(); g.gain.value = 0.0001;
        const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 2400;
        o.connect(lpf); lpf.connect(g); g.connect(masterGainRef.current);
        const v = 0.55 * velocity;
        o.frequency.setValueAtTime(f, time);
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(v, time + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
        o.start(time); o.stop(time + 0.18);
      },
      bass(time, velocity = 1) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator(); osc.type = "sawtooth";
        const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 220;
        const gain = ctx.createGain(); gain.gain.value = 0.0001;
        osc.connect(lpf); lpf.connect(gain); gain.connect(masterGainRef.current);
        const v = 0.5 * velocity;
        const notes = [55, 65.41, 73.42, 82.41, 92.5, 110];
        const f = notes[Math.floor((nextStepRef.current / 4) % notes.length)];
        osc.frequency.setValueAtTime(f, time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(v, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
        osc.start(time); osc.stop(time + 0.35);
      },
    };
  }, [arpOn, arpRate, arpMode]);

  function chordRootHz(step) {
    const roots = [55, 65.41, 73.42, 82.41]; // A, C, D, E aprox
    return roots[Math.floor(step / 4) % roots.length];
  }
  function minor7(rootHz) {
    const r = rootHz;
    const m3 = r * Math.pow(2, 3/12);
    const p5 = r * Math.pow(2, 7/12);
    const m7 = r * Math.pow(2, 10/12);
    return [r, m3, p5, m7];
  }
  function makeDistortionCurve(amount = 10) {
    const n = 44100, curve = new Float32Array(n), deg = Math.PI / 180; let x;
    for (let i = 0; i < n; ++i) { x = (i * 2) / n - 1; curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x)); }
    return curve;
  }
  function whiteNoise(ctx) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const node = ctx.createBufferSource(); node.buffer = buffer; node.loop = true; return node;
  }
  function drumTom(time, baseFreq, amp) {
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator(); osc.type = "sine";
    const g = ctx.createGain(); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = baseFreq * 2;
    osc.connect(bp); bp.connect(g); g.connect(masterGainRef.current);
    osc.frequency.setValueAtTime(baseFreq * 1.1, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, time + 0.18);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(amp, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    osc.start(time); osc.stop(time + 0.3);
  }

  const scheduleNote = (step, time) => {
    const secondsPerBeat = 60.0 / tempo;
    const stepDur = 0.25 * secondsPerBeat; // duração de um 16th
    const sixteenth = step % 2 === 1;
    const swingDelay = sixteenth ? swing * (60 / tempo) / 2 : 0;
    const tPlay = time + swingDelay;

    const anySolo = tracks.some((t) => t.solo);

    tracks.forEach((tinfo) => {
      if (pattern[tinfo.id][step]) {
        if (tinfo.muted) return;
        if (anySolo && !tinfo.solo) return;
        if (tinfo.id === "keys" && arpOn) {
          const divisions = Math.max(1, Math.min(8, arpRate|0));
          for (let j = 0; j < divisions; j++) {
            const offset = (stepDur / divisions) * j;
            const idx = chooseArpIndex(j);
            engines.keysArp(tPlay + offset, tinfo.vol, idx);
          }
        } else {
          engines[tinfo.id](tPlay, tinfo.vol);
        }
      }
    });
  };

  function chooseArpIndex(j) {
    if (arpMode === "random") return Math.floor(Math.random() * 4);
    if (arpMode === "down") return 3 - (j % 4);
    return j % 4; // up
  }

  const nextNote = () => {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTimeRef.current += 0.25 * secondsPerBeat;
    nextStepRef.current = (nextStepRef.current + 1) % STEPS;
  };

  const scheduler = () => {
    const ctx = audioCtxRef.current;
    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadRef.current) {
      scheduleNote(nextStepRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    setCurrentStep(nextStepRef.current);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (timerIdRef.current) window.clearInterval(timerIdRef.current);
      timerIdRef.current = null; setCurrentStep(-1); return;
    }
    (async () => {
      await ensureAudio();
      const ctx = audioCtxRef.current;
      nextStepRef.current = 0;
      nextNoteTimeRef.current = ctx.currentTime + 0.05;
      timerIdRef.current = window.setInterval(scheduler, lookaheadRef.current);
    })();
    return () => { if (timerIdRef.current) window.clearInterval(timerIdRef.current); timerIdRef.current = null; };
  }, [isPlaying, tempo, swing, pattern, tracks, arpOn, arpRate, arpMode]);

  // --- UI actions ---
  const toggleCell = (trackId, step) => {
    setPattern((prev) => ({
      ...prev,
      [trackId]: prev[trackId].map((v, i) => (i === step ? !v : v)),
    }));
  };
  const setVol = (trackId, vol) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, vol } : t)));
  };
  const toggleMute = (trackId) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)));
  };
  const toggleSolo = (trackId) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t)));
  };
  const clearAll = () => setPattern(makeEmptyPattern());
  const loadElectro = () => setPattern(electroPreset());
  const randomize = () => setPattern(randomPreset());

  // --- Templates (localStorage) ---
  function serialize(name) {
    return { name: name || presetName || "Untitled", pattern, tracks, tempo, swing, arpOn, arpRate, arpMode, ts: Date.now() };
  }
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  }
  function persistAll(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  }
  function saveCurrent(asName) {
    const name = (asName || presetName || "Meu Groove").trim();
    if (!name) return;
    const all = loadAll();
    all[name] = serialize(name);
    persistAll(all);
    setSaved(all);
  }
  function loadPreset(name) {
    const data = saved[name]; if (!data) return;
    applyStateFromData(data);
    setPresetName(name);
  }
  function deletePreset(name) {
    const all = { ...saved }; delete all[name]; persistAll(all); setSaved(all);
  }
  function exportCurrent() {
    const data = serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.name.replaceAll(" ", "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function applyStateFromData(data){
    if (data.pattern) setPattern(data.pattern);
    if (data.tracks) setTracks(data.tracks);
    if (typeof data.tempo === 'number') setTempo(data.tempo);
    if (typeof data.swing === 'number') setSwing(data.swing);
    if (typeof data.arpOn === 'boolean') setArpOn(data.arpOn);
    if (typeof data.arpRate === 'number') setArpRate(data.arpRate);
    if (typeof data.arpMode === 'string') setArpMode(data.arpMode);
  }
  async function importFromFile(file){
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyStateFromData(data);
      if (data.name) setPresetName(String(data.name));
    } catch (e) {
      alert("Arquivo inválido. Certifique-se de que é um JSON exportado pelo app.");
    }
  }

  // --- Teclado rápido (dispara sons na hora) ---
  const keyboardOrder = ["kick","snare","hat","clap","shaker","rim","tomL","tomM","tomH","ride","crash","keys","bass"];
  const triggerNow = async (id) => {
    await ensureAudio();
    const t = audioCtxRef.current.currentTime + 0.001;
    if (id === 'keys' && arpOn) {
      const secondsPerBeat = 60.0 / tempo; const stepDur = 0.25 * secondsPerBeat;
      const divisions = Math.max(1, Math.min(8, arpRate|0));
      for (let j=0;j<divisions;j++) {
        const idx = chooseArpIndex(j); engines.keysArp(t + (stepDur/divisions)*j, tracks.find(x=>x.id===id)?.vol ?? 0.7, idx);
      }
    } else {
      engines[id](t, tracks.find((x) => x.id === id)?.vol ?? 0.7);
    }
  };

  // --- Drag & Drop para importar ---
  const dropRef = useRef(null);
  useEffect(()=>{
    const el = dropRef.current; if(!el) return;
    const onDragOver = (e)=>{e.preventDefault(); el.classList.add('ring-2','ring-emerald-500')};
    const onDragLeave = ()=>{el.classList.remove('ring-2','ring-emerald-500')};
    const onDrop = (e)=>{e.preventDefault(); el.classList.remove('ring-2','ring-emerald-500'); const f=e.dataTransfer.files?.[0]; if(f) importFromFile(f)};
    el.addEventListener('dragover', onDragOver); el.addEventListener('dragleave', onDragLeave); el.addEventListener('drop', onDrop);
    return ()=>{el.removeEventListener('dragover', onDragOver); el.removeEventListener('dragleave', onDragLeave); el.removeEventListener('drop', onDrop)};
  },[]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Beatbox Eletrônico — Site Tocável</h1>
            <p className="text-zinc-400">Sequenciador de 16 passos com teclado, arpegiador, mute/solo e templates.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setIsPlaying((p) => !p)} className={`px-4 py-2 rounded-2xl shadow ${isPlaying ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"} transition`}>{isPlaying ? "Parar" : "Tocar"}</button>
            <button onClick={loadElectro} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700">Preset: Electro</button>
            <button onClick={randomize} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700">Randomizar</button>
            <button onClick={clearAll} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700">Limpar</button>
          </div>
        </header>

        {/* Presets */}
        <div className="rounded-2xl p-4 bg-zinc-900/70 shadow mb-6" ref={dropRef}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto,auto,auto] gap-3 items-end">
            <div>
              <label className="text-sm text-zinc-400">Nome do template</label>
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Meu Groove" className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-800 outline-none" />
            </div>
            <button onClick={() => saveCurrent()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">Salvar</button>
            <button onClick={exportCurrent} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700">Exportar JSON</button>
            <label className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 cursor-pointer inline-flex items-center gap-2">
              <input type="file" accept="application/json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importFromFile(f); e.target.value='';}} />
              Importar JSON
            </label>
            <div className="text-sm text-zinc-400">{Object.keys(saved).length} salvos</div>
          </div>
          {Object.keys(saved).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(saved).sort().map((name) => (
                <div key={name} className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                  <button onClick={() => loadPreset(name)} className="underline decoration-dotted">{name}</button>
                  <button onClick={() => deletePreset(name)} className="text-rose-400 hover:text-rose-300" title="apagar">×</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-3">Dica: arraste e solte um arquivo .json aqui para importar.</p>
        </div>

        {/* Teclado & Arp */}
        <div className="rounded-2xl p-4 bg-zinc-900/60 shadow mb-6">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold mb-2">Teclado rápido</h2>
              <div className="flex flex-wrap gap-2">
                {keyboardOrder.map((id) => (
                  <button key={id} onClick={() => triggerNow(id)} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">
                    {tracks.find((t) => t.id === id)?.name || id}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl">
                <input type="checkbox" checked={arpOn} onChange={(e)=>setArpOn(e.target.checked)} />
                Arpegiador no Teclado
              </label>
              <div className="bg-zinc-800 px-3 py-2 rounded-xl">
                <div className="text-xs text-zinc-400">Rate (subdivisões por passo)</div>
                <input type="range" min={1} max={8} value={arpRate} onChange={(e)=>setArpRate(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs">{arpRate}x</div>
              </div>
              <div className="bg-zinc-800 px-3 py-2 rounded-xl">
                <div className="text-xs text-zinc-400">Padrão</div>
                <select value={arpMode} onChange={(e)=>setArpMode(e.target.value)} className="mt-1 w-full bg-zinc-900 rounded-lg px-2 py-1">
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
            <div className="rounded-2xl p-4 bg-zinc-900/70 shadow">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm text-zinc-400">Tempo</label>
                  <input type="range" min={60} max={180} value={tempo} onChange={(e) => setTempo(parseInt(e.target.value))} className="w-full" />
                  <div className="text-sm">{tempo} BPM</div>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-zinc-400">Swing</label>
                  <input type="range" min={0} max={0.5} step={0.01} value={swing} onChange={(e) => setSwing(parseFloat(e.target.value))} className="w-full" />
                  <div className="text-sm">{Math.round(swing * 100)}%</div>
                </div>
              </div>
            </div>

            {tracks.map((t) => (
              <div key={t.id} className="rounded-2xl p-4 bg-zinc-900/70 shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${t.color}`} />
                    <h3 className="font-semibold">{t.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggleMute(t.id)} className={`px-2 py-1 rounded-lg text-xs ${t.muted? 'bg-rose-600':'bg-zinc-800 hover:bg-zinc-700'}`}>{t.muted? 'Muted':'Mute'}</button>
                    <button onClick={()=>toggleSolo(t.id)} className={`px-2 py-1 rounded-lg text-xs ${t.solo? 'bg-emerald-600':'bg-zinc-800 hover:bg-zinc-700'}`}>{t.solo? 'Soloed':'Solo'}</button>
                    <div className="w-36">
                      <label className="text-xs text-zinc-400">Volume</label>
                      <input type="range" min={0} max={1} step={0.01} value={t.vol} onChange={(e) => setVol(t.id, parseFloat(e.target.value))} className="w-full" />
                    </div>
                  </div>
                </div>
                <StepGrid currentStep={currentStep} color={t.color} values={pattern[t.id]} onToggle={(i) => toggleCell(t.id, i)} />
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4 bg-zinc-900/50 shadow">
            <h2 className="text-xl font-semibold mb-2">Dicas</h2>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300 text-sm">
              <li>Use <b>Solo</b> para isolar uma trilha e ajustar o groove.</li>
              <li>Arpegiador em 4x com modo <b>Up</b> dá energia sem embolar.</li>
              <li>Importe/Exporte seus templates para compartilhar ideias.</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-3">Tudo roda localmente no seu navegador; templates ficam no seu dispositivo.</p>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-500">Feito com ❤️ em WebAudio – Divirta‑se!</footer>
      </div>
    </div>
  );
}

function StepGrid({ values, onToggle, currentStep, color }){
  return (
    <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
      {values.map((v, i) => {
        const isBeat = i % 4 === 0;
        const isCurrent = i === currentStep;
        return (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={[
              "h-10 rounded-lg transition relative",
              v ? color : "bg-zinc-800 hover:bg-zinc-700",
              isBeat && "outline outline-1 outline-zinc-700",
              isCurrent && "ring-2 ring-white/70",
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
