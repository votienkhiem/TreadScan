// Bíp và rung khi quét.

let audioCtx = null;

export function primeAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { try { audioCtx = new AC(); } catch (_) {} }
}

export function buzz(good) {
  if (navigator.vibrate) navigator.vibrate(good ? 60 : [40, 60, 40]);
  if (!audioCtx) return;
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = good ? 950 : 300;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (_) {}
}
