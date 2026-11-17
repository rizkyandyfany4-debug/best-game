// Every sound in LUMENFALL is synthesised with WebAudio at run time — no audio
// files, no network. A tiny synth: short oscillator blips and filtered noise
// bursts, each named for the game event that plays it.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Browsers only let audio start after a user gesture; call this from the
  // first click or key press and the engine wakes up quietly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, cutoff) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff || 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() { this.tone(740, 0.09, 'square', 0.08, 340); }
  spit() { this.tone(300, 0.14, 'sawtooth', 0.07, 140); }
  hit() { this.noise(0.06, 0.12, 2400); }
  kill() { this.tone(520, 0.16, 'sine', 0.16, 940); this.noise(0.1, 0.08, 1800); }
  ember() { this.tone(980, 0.08, 'sine', 0.1, 1420); }
  mend() { this.tone(660, 0.25, 'sine', 0.12, 990); }
  hurt() { this.tone(180, 0.28, 'sawtooth', 0.18, 70); this.noise(0.18, 0.14, 700); }
  flameHit() { this.tone(220, 0.22, 'sawtooth', 0.14, 90); }
  horn() { this.tone(196, 0.55, 'sawtooth', 0.12, 392); this.tone(294, 0.55, 'sawtooth', 0.07, 392); }
  draft() { this.tone(523, 0.12, 'sine', 0.12); setTimeout(() => this.tone(659, 0.12, 'sine', 0.12), 90); setTimeout(() => this.tone(784, 0.18, 'sine', 0.12), 180); }
  nova() { this.noise(0.35, 0.2, 3200); this.tone(880, 0.3, 'sine', 0.12, 220); }
  dash() { this.noise(0.12, 0.1, 3000); }
  victory() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.35, 'sine', 0.14), i * 130));
  }
  defeat() {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.4, 'triangle', 0.14), i * 170));
  }
}
