// Professional Audio Synthesizer & Sound Effects Service using Tone.js
// Provides zero-latency, studio-grade game sound effects with polyphony, reverb, and filter envelopes.

import * as Tone from 'tone';

class SoundService {
  constructor() {
    this.enabled = true;
    this.volume = 0.8;
    this.isInitialized = false;

    // Load persisted user preferences
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('quizlive_sound_enabled');
      this.enabled = stored !== null ? stored === 'true' : true;

      const storedVol = localStorage.getItem('quizlive_sound_volume');
      if (storedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(storedVol) || 0.8));
      }
    }

    // Lazy instruments and effects nodes
    this.masterGain = null;
    this.reverb = null;
    this.synth = null;
    this.polySynth = null;
    this.bassSynth = null;
    this.pluckSynth = null;
    this.metalSynth = null;
  }

  /**
   * Lazily initializes Tone.js audio context and studio synthesis chain.
   * Tone.js requires a user gesture (click/tap) before starting audio context.
   */
  async init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      await Tone.start();

      // Master output node with volume
      this.masterGain = new Tone.Volume(Tone.gainToDb(this.volume)).toDestination();

      // Ambient studio reverb (adds lush space to chimes and chords)
      this.reverb = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: 0.25,
      }).connect(this.masterGain);

      // Polyphonic Synth for chords, reveals, and fanfares
      this.polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.2,
          release: 0.4,
        },
      }).connect(this.reverb);

      // Warm FM Synth for bright success bells and chimes
      this.chimeSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 1.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.05, release: 0.5 },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
      }).connect(this.reverb);

      // Punchy Membrane Synth for kick drums, start fanfare beats, and ticks
      this.bassSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.3 },
      }).connect(this.masterGain);

      // Acoustic-style Pluck Synth for countdown ticks & bubbles
      this.pluckSynth = new Tone.PluckSynth({
        attackNoise: 0.8,
        dampening: 3500,
        resonance: 0.9,
      }).connect(this.masterGain);

      // Metal Synth for crisp clicks and cymbal flourishes
      this.metalSynth = new Tone.MetalSynth({
        frequency: 200,
        envelope: { attack: 0.001, decay: 0.04, release: 0.04 },
        harmonicity: 5.1,
        modulationIndex: 16,
        resonance: 4000,
        octaves: 1.5,
      }).connect(this.masterGain);

      this.isInitialized = true;
    } catch {
      // AudioContext policy deferred until next user click
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizlive_sound_enabled', String(this.enabled));
    }
    if (this.enabled) {
      this.init().then(() => this.play('click'));
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizlive_sound_volume', String(this.volume));
    }
    if (this.masterGain) {
      this.masterGain.volume.rampTo(Tone.gainToDb(this.volume), 0.05);
    }
  }

  /**
   * Play a game sound effect.
   * @param {'click'|'join'|'start'|'tick'|'urgentTick'|'correct'|'wrong'|'reveal'|'timeUp'|'fanfare'} type
   */
  async play(type) {
    if (!this.enabled || typeof window === 'undefined') return;

    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const now = Tone.now();

      switch (type) {
        case 'click': {
          // Tactile modern UI tap
          if (this.pluckSynth) {
            this.pluckSynth.triggerAttack('G5', now);
          }
          break;
        }

        case 'join': {
          // Cheerful ascending bubble chime (C5, E5, G5, C6)
          if (this.chimeSynth) {
            this.chimeSynth.triggerAttackRelease('C5', '16n', now);
            this.chimeSynth.triggerAttackRelease('E5', '16n', now + 0.06);
            this.chimeSynth.triggerAttackRelease('G5', '16n', now + 0.12);
            this.chimeSynth.triggerAttackRelease('C6', '8n', now + 0.18);
          }
          break;
        }

        case 'start': {
          // Energetic game show launch fanfare: Bass kick + Bright poly chord
          if (this.bassSynth) {
            this.bassSynth.triggerAttackRelease('C2', '8n', now);
          }
          if (this.polySynth) {
            this.polySynth.triggerAttackRelease(['G4', 'C5'], '16n', now);
            this.polySynth.triggerAttackRelease(['A4', 'D5'], '16n', now + 0.08);
            this.polySynth.triggerAttackRelease(['B4', 'E5'], '16n', now + 0.16);
            this.polySynth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '4n', now + 0.24);
          }
          break;
        }

        case 'tick': {
          // Subtle wooden metronome countdown tick
          if (this.pluckSynth) {
            this.pluckSynth.triggerAttack('C4', now);
          }
          break;
        }

        case 'urgentTick': {
          // Urgent double pulse for final 5 seconds
          if (this.pluckSynth) {
            this.pluckSynth.triggerAttack('G5', now);
            this.pluckSynth.triggerAttack('C6', now + 0.06);
          }
          break;
        }

        case 'correct': {
          // Rewarding triumphant chime (D5 -> F#5 -> A5 -> D6) with warm resonance
          if (this.chimeSynth) {
            this.chimeSynth.triggerAttackRelease('D5', '16n', now);
            this.chimeSynth.triggerAttackRelease('F#5', '16n', now + 0.07);
            this.chimeSynth.triggerAttackRelease('A5', '16n', now + 0.14);
            this.chimeSynth.triggerAttackRelease(['D6', 'F#6'], '4n', now + 0.21);
          }
          break;
        }

        case 'wrong': {
          // Soft descending low-passed thud (clear feedback, not obnoxious)
          if (this.polySynth) {
            this.polySynth.triggerAttackRelease(['Eb3', 'G3'], '16n', now);
            this.polySynth.triggerAttackRelease(['D3', 'F3'], '8n', now + 0.12);
          }
          if (this.bassSynth) {
            this.bassSynth.triggerAttackRelease('F1', '8n', now + 0.05);
          }
          break;
        }

        case 'reveal': {
          // Celestial shimmering major-7th chord for answer & leaderboard reveal
          if (this.polySynth) {
            this.polySynth.triggerAttackRelease(['C4', 'E4', 'G4', 'B4', 'D5'], '2n', now);
          }
          break;
        }

        case 'timeUp': {
          // Time expired dramatic gong accent
          if (this.bassSynth) {
            this.bassSynth.triggerAttackRelease('G2', '4n', now);
          }
          if (this.polySynth) {
            this.polySynth.triggerAttackRelease(['Db4', 'G4'], '8n', now);
            this.polySynth.triggerAttackRelease(['C4', 'F#4'], '4n', now + 0.12);
          }
          break;
        }

        case 'fanfare': {
          // Grand celebration victory theme for winners & podium
          if (this.bassSynth) {
            this.bassSynth.triggerAttackRelease('C2', '8n', now);
            this.bassSynth.triggerAttackRelease('G2', '8n', now + 0.4);
            this.bassSynth.triggerAttackRelease('C2', '4n', now + 0.8);
          }
          if (this.polySynth) {
            // C - E - G - C arpeggio fanfare
            this.polySynth.triggerAttackRelease('C5', '16n', now);
            this.polySynth.triggerAttackRelease('C5', '16n', now + 0.1);
            this.polySynth.triggerAttackRelease('C5', '16n', now + 0.2);
            this.polySynth.triggerAttackRelease(['E5', 'G5'], '8n', now + 0.3);
            this.polySynth.triggerAttackRelease(['D5', 'F5'], '16n', now + 0.5);
            this.polySynth.triggerAttackRelease(['E5', 'G5'], '16n', now + 0.6);
            this.polySynth.triggerAttackRelease(['G5', 'B5', 'D6'], '8n', now + 0.7);
            this.polySynth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '2n', now + 0.95);
          }
          break;
        }

        default:
          break;
      }
    } catch {
      // Audio playback safely ignored if blocked by browser policy
    }
  }
}

export const sound = new SoundService();
export default sound;
