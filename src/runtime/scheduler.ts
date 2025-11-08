// A tiny render scheduler that:
// - Coalesces multiple redraw requests into a single frame
// - Caps frame rate based on measured RTT (adaptive FPS)
// - Re-probes RTT periodically

import { measureRTT } from "./rtt";

export class Scheduler {
  private maxFps = 30;     // current FPS cap
  private nextAllowed = 0; // timestamp when next frame is allowed
  private pending = false; // whether a redraw was requested
  private running = false; // whether tick loop is active

  // Map RTT to a reasonable FPS cap (empirical)
  setMaxFpsByRtt(rttMs: number | null) {
    this.maxFps = rttMs == null ? 20  // unknown RTT → conservative default
      : rttMs < 50  ? 30              // near-local → smooth
      : rttMs < 120 ? 15              // regional → moderate
      : rttMs < 200 ? 8               // transcontinental → lower
      : 4;                            // very high latency → minimal
  }

  // Ask for a redraw; the callback will be called when allowed by FPS cap.
  requestRedraw(cb: () => void) {
    this.pending = true;         // mark that a frame is needed
    if (!this.running) this.tick(cb); // start loop if not already running
  }

  // Internal timing loop: waits until nextAllowed, then renders once if pending.
  private tick(cb: () => void) {
    this.running = true;

    const now = Date.now();
    const frameInterval = 1000 / this.maxFps;       // ms between frames
    const wait = Math.max(0, this.nextAllowed - now); // how long we should wait

    setTimeout(async () => {
      // Occasionally refresh RTT (about every ~5s; cheap heuristic)
      // This simple modulo check avoids another timer; good enough for MVP.
      if (now % 5000 < 20) {
        const rtt = await measureRTT(250);
        this.setMaxFpsByRtt(rtt);
      }

      if (this.pending) {
        this.pending = false;   // consume the pending frame
        cb();                   // perform the actual draw
        this.nextAllowed = Date.now() + frameInterval; // schedule next allowed time
      }

      // If more redraws were requested during the wait, keep looping.
      if (this.pending) {
        this.tick(cb);
      } else {
        this.running = false;   // nothing to do → stop until next request
      }
    }, wait);
  }
}
