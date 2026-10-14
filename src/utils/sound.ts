/**
 * محاكي صوت تقليب وتطويق ورق السجلات الطبيعية باستخدام Web Audio API
 * يعطي إحساساً فيزيائياً واقعياً بتقليب صفحات الدفتر الورقي الفاخر
 */

let audioCtx: AudioContext | null = null;

export function playPaperTurnSound(): void {
  try {
    if (typeof window === 'undefined') return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const duration = 0.22; // 220ms soft paper rustle
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate gentle pink/brown noise resembling paper friction
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter towards softer paper friction frequencies
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      // Envelope: gentle attack, soft rustle decay
      const progress = i / bufferSize;
      const envelope = Math.sin(progress * Math.PI) * (1 - progress * 0.4);
      data[i] *= envelope * 0.8;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter to paper swish frequencies (600Hz - 1600Hz)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

    const gainNode = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch (e) {
    // Audio is optional and non-blocking
  }
}
