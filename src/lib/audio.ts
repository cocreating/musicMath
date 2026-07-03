/**
 * Metronome scheduler using Web Audio API for high-precision clicks
 * independent of main thread rendering jitter.
 */
export class MetronomeScheduler {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private nextNoteTime = 0.0;
  private currentBeat = 0;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // seconds
  private timerId: any = null;
  private bpm = 120;
  private onBeatCallback: ((beat: number, time: number) => void) | null = null;

  constructor() {}

  /**
   * Dynamically adjusts the BPM while running.
   */
  public setBpm(newBpm: number): void {
    this.bpm = newBpm;
  }

  /**
   * Sets a callback which fires on each beat, synchronized with the audio click.
   */
  public setOnBeat(callback: (beat: number, time: number) => void): void {
    this.onBeatCallback = callback;
  }

  private initAudio(): void {
    if (!this.audioCtx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private nextNote(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
  }

  private scheduleClick(beatNumber: number, time: number): void {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    // Beat 1 gets a higher pitch click
    const freq = beatNumber === 0 ? 1000 : 800;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Click envelope: short sound with an exponential decay
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.05);

    // Call UI callback synchronizing it with the precise audio context schedule time
    if (this.onBeatCallback) {
      const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isPlaying && this.onBeatCallback) {
          this.onBeatCallback(beatNumber, time);
        }
      }, delayMs);
    }
  }

  private scheduler(): void {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleClick(this.currentBeat, this.nextNoteTime);
      this.nextNote();
      this.currentBeat = (this.currentBeat + 1) % 4; // 4/4 time signature
    }
  }

  /**
   * Starts the metronome clock loop.
   */
  public start(): void {
    if (typeof window === 'undefined') return; // Safe for SSR
    this.initAudio();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = 0;
    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    }
    
    const run = () => {
      if (!this.isPlaying) return;
      this.scheduler();
      this.timerId = setTimeout(run, this.lookahead);
    };
    run();
  }

  /**
   * Stops the metronome clock loop.
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Returns if the metronome is active.
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
