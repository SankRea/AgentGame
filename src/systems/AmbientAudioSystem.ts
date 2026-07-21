/** 无外部音频依赖的低沉古琴、风声与远钟氛围层。 */
export class AmbientAudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private wind?: AudioBufferSourceNode;
  private qinTimer?: number;
  private bellTimer?: number;
  private muted = false;

  async start(): Promise<void> {
    if (!this.context) this.createGraph();
    await this.context?.resume();
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.08;
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  playDoor(): void {
    if (!this.context || this.muted) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(95, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(38, this.context.currentTime + 0.8);
    gain.gain.setValueAtTime(0.025, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.9);
    oscillator.connect(gain).connect(this.master!);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.9);
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.08;
    this.master.connect(this.context.destination);

    const buffer = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    const windGain = this.context.createGain();
    windGain.gain.value = 0.07;
    this.wind = this.context.createBufferSource();
    this.wind.buffer = buffer;
    this.wind.loop = true;
    this.wind.connect(filter).connect(windGain).connect(this.master);
    this.wind.start();

    this.scheduleQin();
    this.scheduleBell();
  }

  private scheduleQin(): void {
    const play = (): void => {
      if (this.context && !this.muted) {
        const notes = [110, 130.81, 146.83, 196, 220];
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        gain.gain.setValueAtTime(0.06, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 2.5);
        oscillator.connect(gain).connect(this.master!);
        oscillator.start();
        oscillator.stop(this.context.currentTime + 2.6);
      }
      this.qinTimer = window.setTimeout(play, 2600 + Math.random() * 2400);
    };
    play();
  }

  private scheduleBell(): void {
    const play = (): void => {
      if (this.context && !this.muted) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 164.81;
        gain.gain.setValueAtTime(0.035, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 5);
        oscillator.connect(gain).connect(this.master!);
        oscillator.start();
        oscillator.stop(this.context.currentTime + 5.1);
      }
      this.bellTimer = window.setTimeout(play, 12000 + Math.random() * 9000);
    };
    this.bellTimer = window.setTimeout(play, 5000);
  }
}

export const ambientAudio = new AmbientAudioSystem();
