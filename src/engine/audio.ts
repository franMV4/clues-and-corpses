// Sonido: ambientes y foley con grabaciones CC0 en public/audio; tonos musicales sintetizados con WebAudio.
type Amb = 'londres' | 'temporal' | 'fiesta' | 'archivo';

export class Sound {
  ctx?: AudioContext;
  private master!: GainNode;
  private ambBus!: GainNode;
  private noise!: AudioBuffer;
  private stopAmb: (() => void) | null = null;
  private want: Amb | null = null;
  private bufs = new Map<string, Promise<AudioBuffer | null>>();
  muted = localStorage.getItem('sg.mute') === '1';

  constructor() {
    const unlock = () => { this.ensure(); if (this.want && !this.stopAmb) this.ambience(this.want); };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
  }

  private ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = (this.ctx = new AudioContext());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
    const len = ctx.sampleRate * 3;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) n[i] = Math.random() * 2 - 1;
    // precarga del foley para que el primer clic no llegue tarde
    ['hoja1', 'hoja2', 'hoja3', 'clic', 'abrir', 'sello', 'paso0', 'paso1', 'paso2', 'paso3'].forEach(f => this.load(`${f}.ogg`));
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('sg.mute', this.muted ? '1' : '0');
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.1);
    return this.muted;
  }

  private src(buf: AudioBuffer, loop = true) {
    const s = this.ctx!.createBufferSource();
    s.buffer = buf; s.loop = loop;
    s.loopStart = Math.random(); s.start(0, Math.random() * 2);
    return s;
  }
  private filt(type: BiquadFilterType, f: number, q = 0.7) { const b = this.ctx!.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  private gain(v: number) { const g = this.ctx!.createGain(); g.gain.value = v; return g; }

  /** Carga y decodifica un archivo de public/audio una sola vez (null si falla: el juego sigue mudo). */
  private load(file: string) {
    let p = this.bufs.get(file);
    if (!p) {
      p = fetch(`audio/${file}`).then(r => r.arrayBuffer()).then(b => this.ctx!.decodeAudioData(b)).catch(() => null);
      this.bufs.set(file, p);
    }
    return p;
  }

  /** Reproduce una muestra con un poco de variación de tono para que no suene repetida. */
  private play(file: string, vol: number, dest: AudioNode = this.master, rate = 1 + (Math.random() - 0.5) * 0.12, chain: AudioNode[] = []) {
    return this.load(file).then(buf => {
      if (!buf) return null;
      const s = this.ctx!.createBufferSource(), g = this.gain(vol);
      s.buffer = buf; s.playbackRate.value = rate;
      let cur: AudioNode = s;
      for (const c of chain) { cur.connect(c); cur = c; }
      cur.connect(g).connect(dest); s.start();
      return s;
    });
  }

  // Ambientes con grabaciones reales CC0 (ver public/audio/CREDITOS.txt).
  ambience(kind: Amb | null) {
    this.want = kind;
    this.stopAmb?.(); this.stopAmb = null;
    if (!kind || !this.ctx) return;
    const ctx = this.ctx, out = this.gain(0), nodes: AudioScheduledSourceNode[] = [], timers: number[] = [];
    let alive = true;
    out.connect(this.ambBus);
    out.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    const loop = (file: string, vol: number, chain: AudioNode[] = []) => {
      const g = this.gain(vol);
      this.load(file).then(buf => {
        if (!buf || !alive) return;
        const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
        let cur: AudioNode = s;
        for (const c of chain) { cur.connect(c); cur = c; }
        cur.connect(g).connect(out); s.start(0, Math.random() * buf.duration); nodes.push(s);
      });
      return g;
    };
    const lfo = (target: AudioParam, freq: number, depth: number) => {
      const o = ctx.createOscillator(); o.frequency.value = freq; const g = this.gain(depth); o.connect(g).connect(target); o.start(); nodes.push(o);
    };
    const every = (min: number, max: number, fn: () => void) => {
      const next = () => timers.push(window.setTimeout(() => { if (alive) { fn(); next(); } }, min + Math.random() * (max - min)));
      next();
    };

    if (kind === 'londres') {
      loop('lluvia.ogg', 0.45, [this.filt('lowpass', 7000)]);
      loop('reloj.ogg', 0.35);
    }
    if (kind === 'archivo') {
      // lluvia al otro lado de la ventana del despacho
      loop('lluvia.ogg', 0.3, [this.filt('lowpass', 2200)]);
      loop('reloj.ogg', 0.22);
    }
    if (kind === 'temporal') {
      loop('lluvia.ogg', 0.35);
      const wind = loop('viento.ogg', 0.9);
      lfo(wind.gain, 0.09, 0.4);
      every(2500, 6500, () => this.play(Math.random() < 0.5 ? 'ola1.flac' : 'ola2.flac', 0.35 + Math.random() * 0.35, out, 0.6 + Math.random() * 0.25, [this.filt('lowpass', 1600)]));
      every(9000, 20000, () => this.play('cruje.ogg', 0.12, out, 0.7 + Math.random() * 0.2));
    }
    if (kind === 'fiesta') {
      // la música del vernissage tras una pared
      loop('club.mp3', 0.35, [this.filt('lowpass', 380), this.filt('highpass', 40)]);
    }
    this.stopAmb = () => {
      alive = false;
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      timers.forEach(clearTimeout);
      setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch { /* ya parado */ } }); out.disconnect(); }, 2000);
    };
  }

  private tone(f: number, dur: number, vol: number, type: OscillatorType = 'sine', at = 0, glide?: number) {
    const ctx = this.ctx!, t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = this.gain(0);
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }

  private burst(dur: number, vol: number, f: number, type: BiquadFilterType = 'bandpass', q = 1, at = 0) {
    const ctx = this.ctx!, t = ctx.currentTime + at;
    const s = this.src(this.noise, false), b = this.filt(type, f, q), g = this.gain(0);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(b).connect(g).connect(this.master); s.stop(t + dur + 0.05);
  }

  sfx(name: 'paper' | 'seal' | 'stamp' | 'pick' | 'clue' | 'wrong' | 'string' | 'success' | 'step' | 'thunder' | 'open' | 'flip') {
    this.ensure();
    if (!this.ctx) return;
    switch (name) {
      case 'paper': this.play(`hoja${1 + Math.floor(Math.random() * 3)}.ogg`, 0.6); break;
      case 'flip': this.play('hoja1.ogg', 0.7, this.master, 0.85); break;
      case 'pick': this.play('clic.ogg', 0.35); break;
      case 'open': this.play('abrir.ogg', 0.6); break;
      case 'seal': this.burst(0.08, 0.5, 3000, 'highpass', 0.7); this.burst(0.05, 0.4, 1500, 'bandpass', 2, 0.04); this.tone(180, 0.15, 0.2, 'triangle', 0, 90); break;
      case 'stamp': this.play('sello.ogg', 0.9, this.master, 0.8); this.tone(90, 0.3, 0.3, 'sine', 0, 40); break;
      case 'clue': this.tone(587, 0.6, 0.12, 'sine'); this.tone(880, 0.9, 0.09, 'sine', 0.09); this.tone(1318, 0.9, 0.03, 'sine', 0.09); break;
      case 'success': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 1.6, 0.08, 'triangle', i * 0.07)); break;
      case 'wrong': this.tone(140, 0.35, 0.15, 'triangle', 0, 110); break;
      case 'string': this.tone(196, 0.5, 0.15, 'triangle', 0, 190); this.tone(392, 0.25, 0.04, 'sine'); break;
      case 'step': this.play(`paso${Math.floor(Math.random() * 4)}.ogg`, 0.35); setTimeout(() => this.play(`paso${Math.floor(Math.random() * 4)}.ogg`, 0.3), 330); break;
      case 'thunder': this.burst(3.2, 0.5, 120, 'lowpass', 0.5); this.burst(1.2, 0.2, 400, 'lowpass', 0.5, 0.05); break;
    }
  }

  /** Raspado de lápiz mientras se frota: devuelve una función para pararlo. */
  scratch() {
    this.ensure();
    if (!this.ctx) return () => {};
    let on = true;
    const rub = () => { if (on) this.play('raspado.ogg', 0.4, this.master, 0.9 + Math.random() * 0.3).then(src => { if (src) src.onended = rub; }); };
    rub();
    return () => { on = false; };
  }

}
