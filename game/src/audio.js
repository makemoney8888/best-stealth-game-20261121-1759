// Lantern's Shadow — synthesized sound effects (WebAudio, no audio files).
// Everything is a short oscillator / noise burst so the game needs no assets.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._noiseBuffer = null;
  }

  /** Create the audio context on first user gesture (browsers require one). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 0.3;
      this._noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted || !this._noiseBuffer) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = src;
    if (lowpass) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      src.connect(filter);
      node = filter;
    }
    node.connect(gain).connect(this.ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  click() { this._tone(660, 0.07, 'triangle', 0.12); }
  pickup() {
    this._tone(880, 0.09, 'sine', 0.16);
    setTimeout(() => this._tone(1318, 0.14, 'sine', 0.16), 70);
  }
  alarm() {
    this._tone(220, 0.35, 'sawtooth', 0.2, 440);
    setTimeout(() => this._tone(330, 0.3, 'sawtooth', 0.18, 550), 120);
  }
  caught() {
    this._tone(392, 0.25, 'square', 0.18, 98);
    this._noise(0.4, 0.2, 900);
  }
  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'triangle', 0.16), i * 90));
  }
  win() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => this._tone(f, 0.25, 'triangle', 0.16), i * 110));
  }
  step() { this._noise(0.05, 0.05, 500); }
}
