// Web Audio Engine for Falling Words Typing Game
// Provides zero-latency synthesized SFX and an upbeat lo-fi procedural rhythmic BGM loop,
// with support for mute toggling and volume control.

class GameAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private bgmIntervalId: number | null = null;
  private isBgmPlaying: boolean = false;
  private beatStep: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evely_game_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.masterGainNode.connect(this.ctx.destination);

        this.sfxGainNode = this.ctx.createGain();
        this.sfxGainNode.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.sfxGainNode.connect(this.masterGainNode);

        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.bgmGainNode.connect(this.masterGainNode);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('evely_game_muted', String(this.isMuted));
    }
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  /**
   * Crisp mechanical keyboard click sound
   */
  public playKeyClick(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(3, t);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Harmonious success chime when a word is completed
   */
  public playWordSuccess(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    // C-E-G-C major arpeggio chords
    const freqs = [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((freq, idx) => {
      if (!ctx || !this.sfxGainNode) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = t + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });
  }

  /**
   * Soft miss notification sound
   */
  public playWordMiss(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Crisp airy droplet sound when a bubble is tapped
   */
  public playBubbleSelect(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Satisfying pop sound with pitch rising with combo
   */
  public playBubblePop(combo = 1): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    // Pentatonic scale base frequencies for combos: C5, D5, E5, G5, A5, C6
    const basePitches = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const pitch = basePitches[Math.min(Math.max(combo - 1, 0), basePitches.length - 1)];

    // Pop burst (fast descending frequency creates the 'pop' membrane release)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();

    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(pitch * 2, t);
    popOsc.frequency.exponentialRampToValueAtTime(pitch * 0.5, t + 0.04);

    popGain.gain.setValueAtTime(0.35, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    popOsc.connect(popGain);
    popGain.connect(this.sfxGainNode);
    popOsc.start(t);
    popOsc.stop(t + 0.06);

    // Harmonic chime tail for juiciness
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(pitch, t);

    chimeGain.gain.setValueAtTime(0, t);
    chimeGain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.sfxGainNode);
    chimeOsc.start(t);
    chimeOsc.stop(t + 0.25);
  }

  /**
   * Wobbly spring mismatch sound
   */
  public playBubbleMismatch(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.15);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Punchy sci-fi laser blast sound for Sonic Blaster
   */
  public playLaserBlast(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.22);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Resonant cosmic explosion when a target is destroyed
   */
  public playTargetExplosion(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;

    // Sub-bass rumble
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.35);

    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGainNode);
    subOsc.start(t);
    subOsc.stop(t + 0.42);

    // Crunch noise impact
    const crunchOsc = ctx.createOscillator();
    const crunchGain = ctx.createGain();
    crunchOsc.type = 'sawtooth';
    crunchOsc.frequency.setValueAtTime(280, t);
    crunchOsc.frequency.exponentialRampToValueAtTime(40, t + 0.18);

    crunchGain.gain.setValueAtTime(0.35, t);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    crunchOsc.connect(crunchGain);
    crunchGain.connect(this.sfxGainNode);
    crunchOsc.start(t);
    crunchOsc.stop(t + 0.22);
  }

  /**
   * Metallic shield deflection sound when pronunciation misfires
   */
  public playShieldDeflect(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.05);
    osc.frequency.linearRampToValueAtTime(320, t + 0.16);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Procedural upbeat lo-fi groove loop
   * 108 BPM chill rhythm beat that loops continuously
   */
  public startBgm(): void {
    if (this.isBgmPlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.isBgmPlaying = true;
    this.beatStep = 0;

    // 108 BPM -> 1 beat = 60 / 108 = 0.555s, 16th note = 0.1388s
    const stepDurationMs = 138;

    // Simple smooth chord progression: Fmaj7 -> G6 -> Em7 -> Am7
    const chords = [
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [392.0, 493.88, 587.33, 659.25], // G6
      [329.63, 392.0, 493.88, 587.33], // Em7
      [440.0, 523.25, 659.25, 783.99], // Am7
    ];

    const playStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const t = this.ctx.currentTime;
      const step16 = this.beatStep % 16;
      const bar = Math.floor((this.beatStep / 16) % 4);

      // Kick on 0, 8 (or 10 for syncopation)
      if (step16 === 0 || step16 === 8 || step16 === 10) {
        this.playKick(t);
      }

      // Snare / clap on 4, 12
      if (step16 === 4 || step16 === 12) {
        this.playSnare(t);
      }

      // Closed hi-hat on every 2nd 16th note (0, 2, 4, 6...)
      if (step16 % 2 === 0) {
        this.playHiHat(t, step16 % 4 === 2);
      }

      // Ambient electric piano chord on step 0 and 8
      if (step16 === 0 || step16 === 6) {
        const chordNotes = chords[bar];
        chordNotes.forEach((freq) => {
          this.playChordNote(freq, t, step16 === 0 ? 0.6 : 0.3);
        });
      }

      this.beatStep++;
    };

    // Run interval
    this.bgmIntervalId = window.setInterval(playStep, stepDurationMs);
  }

  private playKick(t: number): void {
    if (!this.ctx || !this.bgmGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  private playSnare(t: number): void {
    if (!this.ctx || !this.bgmGainNode) return;
    // Tone + noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  private playHiHat(t: number, accent: boolean): void {
    if (!this.ctx || !this.bgmGainNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(7500, t);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, t);

    gain.gain.setValueAtTime(accent ? 0.08 : 0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playChordNote(freq: number, t: number, duration: number): void {
    if (!this.ctx || !this.bgmGainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public cleanup(): void {
    this.stopBgm();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const gameAudio = new GameAudioManager();
