// Procedural sound, WebAudio only — no audio files. A low ambient drone,
// a heartbeat that quickens as sanity falls, filtered-noise whispers that
// lean toward the wrong doors, and a dissonant sting for the jumpscare.
// Everything is guarded: no gesture yet, no audio; any failure is silent.
export function createSound() {
  const sound = {
    ctx: null,
    master: null,
    droneGain: null,
    whisperGain: null,
    whisperPan: null,
    muted: false,
    started: false,
    noiseBuffer: null,
  };

  function ensure() {
    if (sound.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      sound.ctx = new AC();
      sound.master = sound.ctx.createGain();
      sound.master.gain.value = sound.muted ? 0 : 0.9;
      sound.master.connect(sound.ctx.destination);
      // Shared noise buffer (2 s of white noise) for whispers and the sting.
      const len = sound.ctx.sampleRate * 2;
      sound.noiseBuffer = sound.ctx.createBuffer(1, len, sound.ctx.sampleRate);
      const data = sound.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (sound.ctx && sound.ctx.state === 'suspended') {
      sound.ctx.resume().catch(() => {});
    }
  }

  // Call on the first user gesture (click / key). Starts the drone and the
  // whisper bed; both run until the page closes.
  sound.unlock = () => {
    if (!ensure()) return;
    resume();
    if (sound.started) return;
    sound.started = true;
    try {
      // Drone: two detuned low sines through a lowpass, barely there.
      sound.droneGain = sound.ctx.createGain();
      sound.droneGain.gain.value = 0.05;
      const filter = sound.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      filter.connect(sound.droneGain);
      sound.droneGain.connect(sound.master);
      for (const freq of [55, 55.7, 110.4]) {
        const osc = sound.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start();
      }
      // Whisper bed: looped noise through a bandpass, quiet, panned.
      const src = sound.ctx.createBufferSource();
      src.buffer = sound.noiseBuffer;
      src.loop = true;
      const bp = sound.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 2.5;
      sound.whisperPan = sound.ctx.createStereoPanner
        ? sound.ctx.createStereoPanner()
        : null;
      sound.whisperGain = sound.ctx.createGain();
      sound.whisperGain.gain.value = 0.0;
      src.connect(bp);
      bp.connect(sound.whisperGain);
      if (sound.whisperPan) {
        sound.whisperGain.connect(sound.whisperPan);
        sound.whisperPan.connect(sound.master);
      } else {
        sound.whisperGain.connect(sound.master);
      }
      src.start();
    } catch { /* audio is decoration, never fatal */ }
  };

  // Whisper bed follows the room: louder from room 6, panned toward the
  // wrong side (-1 left … +1 right, from the safe door's side).
  sound.setWhisper = (gain, pan) => {
    if (!sound.ctx || !sound.whisperGain) return;
    try {
      sound.whisperGain.gain.setTargetAtTime(
        Math.max(0, Math.min(0.12, gain)),
        sound.ctx.currentTime, 0.4,
      );
      if (sound.whisperPan) {
        sound.whisperPan.pan.setTargetAtTime(
          Math.max(-0.8, Math.min(0.8, pan)), sound.ctx.currentTime, 0.4,
        );
      }
    } catch { /* ignore */ }
  };

  // One heartbeat: two low thumps (lub-dub).
  sound.heartbeat = (strength) => {
    if (!sound.ctx || !sound.master) return;
    try {
      const t0 = sound.ctx.currentTime;
      for (const [at, vol] of [[0, 0.5], [0.16, 0.32]]) {
        const osc = sound.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(64, t0 + at);
        osc.frequency.exponentialRampToValueAtTime(38, t0 + at + 0.12);
        const g = sound.ctx.createGain();
        g.gain.setValueAtTime(0, t0 + at);
        g.gain.linearRampToValueAtTime(vol * strength, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.16);
        osc.connect(g);
        g.connect(sound.master);
        osc.start(t0 + at);
        osc.stop(t0 + at + 0.2);
      }
    } catch { /* ignore */ }
  };

  // The jumpscare sting: a loud, harsh dissonant cluster plus a noise
  // burst, a scream-like high shriek and a deep low-frequency thump — fired
  // twice, once per hit of the double-hit scare (hit 2 slightly louder).
  // Everything runs through one sting gain so the sum stays loud without
  // clipping badly.
  sound.sting = () => {
    if (!sound.ctx || !sound.master) return;
    try {
      const t0 = sound.ctx.currentTime;
      const sg = sound.ctx.createGain();
      sg.gain.value = 0.4;
      sg.connect(sound.master);
      const cluster = [220, 233.1, 311.1, 466.2, 622.3, 932, 1244];
      const scream = [1800, 2130, 2510];
      const hit = (at, vol, dur) => {
        for (const freq of cluster) {
          const osc = sound.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          const g = sound.ctx.createGain();
          g.gain.setValueAtTime(0.14 * vol, t0 + at);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + at + dur);
          osc.connect(g);
          g.connect(sg);
          osc.start(t0 + at);
          osc.stop(t0 + at + dur + 0.1);
        }
        // Scream: high shriek falling in pitch, with a fast vibrato.
        const lfo = sound.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 28;
        const lfoGain = sound.ctx.createGain();
        lfoGain.gain.value = 70;
        lfo.connect(lfoGain);
        for (const freq of scream) {
          const osc = sound.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t0 + at);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t0 + at + 0.45);
          lfoGain.connect(osc.frequency);
          const g = sound.ctx.createGain();
          g.gain.setValueAtTime(0.09 * vol, t0 + at);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.5);
          osc.connect(g);
          g.connect(sg);
          osc.start(t0 + at);
          osc.stop(t0 + at + 0.6);
        }
        lfo.start(t0 + at);
        lfo.stop(t0 + at + 0.6);
        // Noise burst.
        const noise = sound.ctx.createBufferSource();
        noise.buffer = sound.noiseBuffer;
        const hp = sound.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 900;
        const ng = sound.ctx.createGain();
        ng.gain.setValueAtTime(0.55 * vol, t0 + at);
        ng.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.45);
        noise.connect(hp);
        hp.connect(ng);
        ng.connect(sg);
        noise.start(t0 + at);
        noise.stop(t0 + at + 0.55);
        // Deep low-frequency thump.
        const th = sound.ctx.createOscillator();
        th.type = 'sine';
        th.frequency.setValueAtTime(58, t0 + at);
        th.frequency.exponentialRampToValueAtTime(30, t0 + at + 0.25);
        const tg = sound.ctx.createGain();
        tg.gain.setValueAtTime(0.85 * vol, t0 + at);
        tg.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.3);
        th.connect(tg);
        tg.connect(sg);
        th.start(t0 + at);
        th.stop(t0 + at + 0.35);
      };
      hit(0, 1.0, 0.8); // hit 1
      hit(0.38, 1.15, 0.55); // hit 2, slightly louder
    } catch { /* ignore */ }
  };

  // A soft wooden creak when a door swings open.
  sound.creak = () => {
    if (!sound.ctx || !sound.master) return;
    try {
      const t0 = sound.ctx.currentTime;
      const osc = sound.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t0);
      osc.frequency.linearRampToValueAtTime(55, t0 + 0.5);
      const lp = sound.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      const g = sound.ctx.createGain();
      g.gain.setValueAtTime(0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.connect(lp);
      lp.connect(g);
      g.connect(sound.master);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    } catch { /* ignore */ }
  };

  sound.setMuted = (muted) => {
    sound.muted = muted;
    if (sound.master && sound.ctx) {
      sound.master.gain.setTargetAtTime(muted ? 0 : 0.9, sound.ctx.currentTime, 0.05);
    }
  };

  return sound;
}
