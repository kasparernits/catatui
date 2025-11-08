// examples/zstack_modal_demo.ts
import { TerminalBackend, InputBackend, Scheduler } from "..";
import { DiffRenderer } from "..";
import { Frame } from "../render/frame";
import { FramePainter } from "../render/painter";
import { vstack } from "../layout/vstack";
import { hstack } from "../layout/hstack";
import { zstack } from "../layout/zstack";
import type { Widget, Rect, RenderCtx } from "..";

const term = new TerminalBackend();
const input = new InputBackend();
const sched = new Scheduler();
const renderer = new DiffRenderer(term);

term.install();
input.install();

// --- small widget helpers ---
function Box(title: string): Widget {
  return {
    render(a: Rect, { painter }: RenderCtx) {
      const p = painter as FramePainter;
      const w = Math.max(2, a.w),
        h = Math.max(2, a.h);
      p.box(a.x, a.y, w, h, ` ${title} `, { fg: 245, bold: true });
    },
  };
}
function Text(get: () => string, dx = 2, dy = 1): Widget {
  return {
    render(a: Rect, { painter }: RenderCtx) {
      (painter as FramePainter).text(a.x + dx, a.y + dy, get(), {
        fg: 39,
        bold: true,
      });
    },
  };
}

// --- base UI (behind the modal) ---
let tick = 0;
const base = vstack([
  {
    render(a, ctx) {
      Box("Header").render(a, ctx);
      const title = "CATATUI — zstack modal demo (q=quit, z=open, c=close)";
      const tx = Math.max(a.x + 1, a.x + Math.floor((a.w - title.length) / 2));
      (ctx.painter as FramePainter).text(tx, a.y, title, {
        fg: 214,
        bold: true,
      });
    },
  },
  hstack([
    {
      render(a, ctx) {
        Box("Left").render(a, ctx);
        Text(() => `Tick: ${tick}`).render(a, ctx);
      },
    },
    {
      render(a, ctx) {
        Box("Right").render(a, ctx);
        Text(() => `Time: ${new Date().toLocaleTimeString()}`).render(a, ctx);
      },
    },
  ])
    .gap(2)
    .childGrow(0, 1)
    .childGrow(1, 2),
  {
    render(a, ctx) {
      Box("Footer").render(a, ctx);
      Text(() => "Press z to open modal; c to close.").render(a, ctx);
    },
  },
])
  .pad(1)
  .gap(1)
  .childGrow(0, 1)
  .childGrow(1, 5)
  .childGrow(2, 1);

// --- modal widget ---
function Modal(getVisible: () => boolean): Widget {
  return {
    render(a: Rect, { painter }: RenderCtx) {
      if (!getVisible()) return;
      const p = painter as FramePainter;

      // Backdrop: dim entire area using background color (spaces)
      p.rect(a.x, a.y, a.w, a.h, " ", { bg: 236 }); // subtle gray

      // Modal size & position (centered)
      const mw = Math.min(48, Math.max(28, Math.floor(a.w * 0.6)));
      const mh = Math.min(12, Math.max(7, Math.floor(a.h * 0.4)));
      const mx = a.x + Math.floor((a.w - mw) / 2);
      const my = a.y + Math.floor((a.h - mh) / 2);

      // Modal window
      p.box(mx, my, mw, mh, " Modal ", { fg: 223, bold: true });
      p.text(mx + 2, my + 2, "Press 'c' to close", { fg: 229 });
      p.text(mx + 2, my + 4, "This is drawn by zstack on top.", { fg: 252 });
      p.text(mx + 2, my + 6, "Background stays rendered underneath.", {
        fg: 252,
      });
    },
  };
}

// --- compose with zstack (base below, modal above) ---
let showModal = false;
const ui = zstack([base, Modal(() => showModal)]).pad(0); // no padding for the overlay

function draw() {
  const frame: Frame = renderer.newFrame();
  const painter = new FramePainter(frame);
  ui.render({ x: 0, y: 0, w: frame.cols, h: frame.rows }, { painter });
  renderer.commit(frame);
}

// --- animate, keys, resize ---
const anim = setInterval(() => {
  tick++;
  sched.requestRedraw(draw);
}, 500);
(anim as any).ref?.();

input.on((k) => {
  if (k.name === "q" || (k.ctrl && k.name === "c")) {
    clearInterval(anim);
    process.exit(0);
  }
  if (k.name === "z") {
    showModal = true;
    sched.requestRedraw(draw);
  }
  if (k.name === "c") {
    showModal = false;
    sched.requestRedraw(draw);
  }
});

term.onResizeEvent(() => {
  renderer.reset();
  sched.requestRedraw(draw);
});

draw();
