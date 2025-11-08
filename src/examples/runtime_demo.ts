// Small demo to verify the runtime pieces work together.

import { TerminalBackend } from "../runtime/terminal_backend";
import { InputBackend } from "../runtime/input_backend";
import { Scheduler } from "../runtime/scheduler";
import { measureRTT } from "../runtime/rtt";

// Create instances of our runtime helpers
const term = new TerminalBackend();
const input = new InputBackend();
const sched = new Scheduler();

// Switch terminal to alt-screen, hide cursor, clear, attach handlers
term.install();
// Enable raw key input and normalized key events (q, arrows, etc.)
input.install();

let frames = 0;               // frame counter (to see redraw cadence)
let lastRtt: number | null = null; // most recent RTT measurement

// A trivial "draw" function that prints some lines (clears for demo simplicity).
const draw = () => {
  const cols = term.columns, rows = term.rows;

  // Batch multiple small strings into one write → better over SSH
  const chunks: string[] = [];
  chunks.push("\x1b[2J\x1b[H"); // clear & home (demo only; real app would diff)
  chunks.push(`Runtime demo (press 'q' to quit)\n`);
  chunks.push(`Size: ${cols}x${rows}\n`);
  chunks.push(`Frames: ${frames++}\n`);
  chunks.push(`RTT: ${lastRtt ?? "…" } ms\n`);

  // Display an approximate FPS tier based on current RTT
  const tier =
    lastRtt == null ? "~20" :
    lastRtt < 50   ? "~30" :
    lastRtt < 120  ? "~15" :
    lastRtt < 200  ? "~8"  : "~4";
  chunks.push(`Adaptive max FPS: ${tier}\n`);

  term.batch(chunks); // single write → smooth over SSH
};

// On any key: schedule a redraw; on 'q': exit process (restores terminal)
input.on((k) => {
  if (k.name === "q") process.exit(0);
  sched.requestRedraw(draw);
});

// Periodically re-measure RTT and request a redraw to reflect new value
setInterval(async () => {
  lastRtt = await measureRTT(250);  // returns ms or null on timeout
  sched.setMaxFpsByRtt(lastRtt);    // adapt FPS cap to measured RTT
  sched.requestRedraw(draw);
}, 3000);

// Animate a counter to see coalescing and FPS capping at work
setInterval(() => sched.requestRedraw(draw), 250);

// Initial paint
draw();
