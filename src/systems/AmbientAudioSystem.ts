import type { TimeLayer, VoiceStyle } from '../types/content';

export interface AmbientMix {
  murmurs: number;
  timeLayer: TimeLayer;
  location: string;
}

export type SoundDirection = '左侧' | '右侧' | '前方' | '远处' | '地下';

export interface DirectionalCaption {
  text: string;
  direction: SoundDirection;
}

/**
 * 无外部音频依赖的科马拉音景。
 * 管理所有定时器和音频节点，场景/HMR 重入不会叠加旧音轨。
 */
export class AmbientAudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private ambience?: GainNode;
  private wind?: AudioBufferSourceNode;
  private readonly sources = new Set<AudioScheduledSourceNode>();
  private readonly timers = new Set<number>();
  private muted = false;
  private volume = 0.65;
  private environmentVolume = 0.72;
  private dialogueVolume = 0.7;
  private paused = false;
  private mix: AmbientMix = { murmurs: 0, timeLayer: 'embers', location: 'comala' };
  private readonly captionListeners = new Set<(caption: DirectionalCaption) => void>();

  async start(): Promise<void> {
    if (!this.context) this.createGraph();
    this.paused = false;
    await this.context?.resume();
    this.updateMaster();
  }

  async pause(): Promise<void> {
    this.paused = true;
    await this.context?.suspend();
  }

  async resume(): Promise<void> {
    this.paused = false;
    await this.context?.resume();
    this.updateMaster();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateMaster();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.updateMaster();
  }

  setEnvironmentVolume(volume: number): void {
    this.environmentVolume = Math.min(1, Math.max(0, volume));
    this.updateAmbience();
  }

  setDialogueVolume(volume: number): void {
    this.dialogueVolume = Math.min(1, Math.max(0, volume));
  }

  onCaption(listener: (caption: DirectionalCaption) => void): () => void {
    this.captionListeners.add(listener);
    return () => this.captionListeners.delete(listener);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get masterVolume(): number {
    return this.volume;
  }

  setSceneMix(mix: AmbientMix): void {
    this.mix = mix;
    this.updateAmbience();
  }

  playDoor(): void {
    this.playTone(82, 39, 0.9, 'sawtooth', 0.035, 'ui');
  }

  playDialogueTick(voice: VoiceStyle): void {
    const frequency = voice === 'ghost' ? 176 : voice === 'memory' ? 238 : voice === 'narration' ? 212 : 285;
    this.playTone(frequency, frequency * 0.92, 0.035, 'sine', 0.0035, 'dialogue');
  }

  destroy(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // 已经结束的节点无需再次停止。
      }
      source.disconnect();
    });
    this.sources.clear();
    this.captionListeners.clear();
    this.wind = undefined;
    this.ambience?.disconnect();
    this.master?.disconnect();
    void this.context?.close();
    this.context = undefined;
    this.ambience = undefined;
    this.master = undefined;
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.ambience = this.context.createGain();
    this.master.connect(this.context.destination);
    this.ambience.connect(this.master);
    this.updateMaster();

    const buffer = this.createNoiseBuffer(4);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 210;
    const windGain = this.context.createGain();
    windGain.gain.value = 0.06;
    this.wind = this.context.createBufferSource();
    this.wind.buffer = buffer;
    this.wind.loop = true;
    this.wind.connect(filter).connect(windGain).connect(this.ambience);
    this.wind.start();
    this.track(this.wind);
    this.scheduleBell();
    this.scheduleDog();
    this.scheduleHooves();
    this.scheduleMurmur();
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (0.55 + Math.sin(index / 1700) * 0.2);
    }
    return buffer;
  }

  private playTone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    bus: 'environment' | 'dialogue' | 'ui' = 'environment',
  ): void {
    if (!this.context || !this.master || this.muted || this.paused) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, this.context.currentTime + duration);
    const busVolume = bus === 'environment'
      ? this.environmentVolume
      : bus === 'dialogue'
        ? this.dialogueVolume
        : 1;
    gain.gain.setValueAtTime(gainValue * busVolume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration + 0.02);
    this.track(oscillator);
  }

  private playWhisper(): void {
    if (!this.context || !this.ambience || this.muted || this.paused || this.mix.murmurs < 2) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.createNoiseBuffer(0.9);
    filter.type = 'bandpass';
    filter.frequency.value = 520 + Math.random() * 260;
    filter.Q.value = 2.8;
    const strength = Math.min(0.035, 0.008 + this.mix.murmurs * 0.0035);
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(strength, this.context.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.85);
    source.connect(filter).connect(gain).connect(this.ambience);
    source.start();
    source.stop(this.context.currentTime + 0.9);
    this.track(source);
    this.emitCaption({ text: '含混的人声贴着泥土移动', direction: '地下' });
  }

  private scheduleBell(): void {
    this.schedule(() => {
      if (this.mix.timeLayer !== 'grave') {
        this.playTone(146.83, 144, 4.8, 'sine', 0.025);
        this.emitCaption({ text: '教堂钟声', direction: '远处' });
      }
      this.scheduleBell();
    }, 11000, 18000);
  }

  private scheduleDog(): void {
    this.schedule(() => {
      if (this.mix.timeLayer === 'embers') {
        this.playTone(118, 72, 0.22, 'square', 0.009);
        this.schedule(() => this.playTone(104, 64, 0.19, 'square', 0.007), 220, 340);
        this.emitCaption({ text: '一声很远的狗叫', direction: Math.random() > 0.5 ? '左侧' : '右侧' });
      }
      this.scheduleDog();
    }, 16000, 26000);
  }

  private scheduleHooves(): void {
    this.schedule(() => {
      if (this.mix.timeLayer !== 'grave') {
        this.playTone(74, 52, 0.14, 'triangle', 0.012);
        this.schedule(() => this.playTone(68, 48, 0.12, 'triangle', 0.01), 260, 390);
        this.emitCaption({ text: '没有骑手的马蹄残响', direction: '前方' });
      }
      this.scheduleHooves();
    }, 19000, 31000);
  }

  private scheduleMurmur(): void {
    this.schedule(() => {
      this.playWhisper();
      this.scheduleMurmur();
    }, 3200, 6800);
  }

  private schedule(callback: () => void, minimum: number, maximum: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, minimum + Math.random() * (maximum - minimum));
    this.timers.add(timer);
  }

  private track(source: AudioScheduledSourceNode): void {
    this.sources.add(source);
    source.addEventListener('ended', () => {
      this.sources.delete(source);
      source.disconnect();
    }, { once: true });
  }

  private updateMaster(): void {
    if (!this.master) return;
    this.master.gain.value = this.muted || this.paused ? 0 : 0.1 * this.volume;
  }

  private updateAmbience(): void {
    if (!this.ambience || !this.context) return;
    const layerGain = this.mix.timeLayer === 'grave' ? 0.045 : this.mix.timeLayer === 'past' ? 0.07 : 0.06;
    this.ambience.gain.setTargetAtTime(layerGain * this.environmentVolume, this.context.currentTime, 0.8);
  }

  private emitCaption(caption: DirectionalCaption): void {
    this.captionListeners.forEach((listener) => listener(caption));
  }
}

export const ambientAudio = new AmbientAudioSystem();
