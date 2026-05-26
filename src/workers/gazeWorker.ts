// gazeWorker.ts
let t = 0;
let smoothedX = 50;
let smoothedY = 50;
const ALPHA = 0.15; // Smoothing factor
let interval: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'START') {
    if (interval) clearInterval(interval);
    
    interval = setInterval(() => {
      t += 0.05;
      
      // Simulate raw gaze input with some jitter (noise)
      const rawX = 50 + 30 * Math.sin(t) + (Math.random() * 5 - 2.5);
      const rawY = 50 + 20 * Math.sin(t * 2) + (Math.random() * 5 - 2.5);
      
      // Apply coordinate smoothing (Exponential Moving Average)
      smoothedX = smoothedX + ALPHA * (rawX - smoothedX);
      smoothedY = smoothedY + ALPHA * (rawY - smoothedY);
      
      self.postMessage({
        type: 'GAZE_UPDATE',
        payload: {
          x: smoothedX,
          y: smoothedY
        }
      });
    }, 50);
  } else if (type === 'STOP') {
    if (interval) clearInterval(interval);
  } else if (type === 'PROCESS_TELEMETRY') {
      // In a real scenario, this branch processes incoming UDP packets or similar.
      const { rawX, rawY } = payload;
      smoothedX = smoothedX + ALPHA * (rawX - smoothedX);
      smoothedY = smoothedY + ALPHA * (rawY - smoothedY);
      self.postMessage({
        type: 'GAZE_UPDATE',
        payload: { x: smoothedX, y: smoothedY }
      });
  }
};
export {};
