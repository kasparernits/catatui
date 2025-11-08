// examples/diff_demo.ts
import { TerminalBackend, InputBackend, Scheduler } from "..";
import { Frame } from "../render/frame";
import { FramePainter } from "../render/painter";
import { DiffRenderer } from "..";

const term = new TerminalBackend();
const input = new InputBackend();
const sched = new Scheduler();
const renderer = new DiffRenderer(term);

term.install();
input.install();

let si = 0;
const spin = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function draw() {
  try {
    const frame: Frame = renderer.newFrame();
    const p = new FramePainter(frame);

    const cols = frame.cols;
    const rows = frame.rows;

    p.box(
      2,
      1,
      Math.max(10, cols - 4),
      Math.max(5, rows - 2),
      " Catatui diff demo (q to quit) ",
      { fg: 245, bold: true }
    );
    const now = new Date().toLocaleTimeString();
    p.text(6, 3, `Time: ${now}`, { fg: 39, bold: true });
    p.text(6, 5, `Spinner: ${spin[si]}`, { fg: 46 });

    const rx = 6,
      ry = 7,
      rw = Math.max(20, Math.min(40, cols - 12)),
      rh = Math.max(4, Math.min(8, rows - 10));
    p.box(rx - 2, ry - 1, rw + 4, rh + 2, " Live Region ", { fg: 244 });
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const dot = Math.random() < 0.02 ? "•" : " ";
        p.put(rx + x, ry + y, dot, { fg: 244 });
      }
    }

    renderer.commit(frame);
  } catch (e) {
    // If something throws and crashes the event loop, we’ll see it
    console.error("draw() error:", e);
  }
}

// 1) Animation timer (keeps process alive)
const anim = setInterval(() => {
  si = (si + 1) % spin.length;
  sched.requestRedraw(draw);
}, 80);
if (typeof (anim as any).ref === "function") (anim as any).ref(); // force keep-alive

// 2) Minimal keep-alive guard (in case the environment unrefs timers)
const keepAlive = setInterval(() => {}, 1 << 30);
if (typeof (keepAlive as any).ref === "function") (keepAlive as any).ref();

// 3) Keyboard
input.on((k) => {
  if (k.name === "q" || (k.ctrl && k.name === "c")) {
    clearInterval(anim);
    clearInterval(keepAlive);
    process.exit(0);
  }
  sched.requestRedraw(draw);
});

// 4) Resize
term.onResizeEvent(() => {
  renderer.reset();
  sched.requestRedraw(draw);
});

// 5) Exit diagnostics
process.on("beforeExit", (code) => console.error("[beforeExit]", code));
process.on("exit", (code) => console.error("[exit]", code));
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});
process.on("unhandledRejection", (r) => {
  console.error("[unhandledRejection]", r);
});

// First paint
draw();
