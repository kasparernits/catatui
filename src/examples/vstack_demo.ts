import { TerminalBackend, InputBackend, Scheduler } from "..";
import { DiffRenderer } from "..";
import { Frame } from "../render/frame";
import { FramePainter } from "../render/painter";
import { vstack } from "../layout/vstack";
import type { Widget, Rect, RenderCtx } from "..";

const term = new TerminalBackend();
const input = new InputBackend();
const sched = new Scheduler();
const renderer = new DiffRenderer(term);

term.install();
input.install();

/** Tiny helper widgets for the demo */
function Box(title: string): Widget {
  return {
    render(area: Rect, { painter }: RenderCtx) {
      const p = painter as FramePainter;
      const w = Math.max(2, area.w);
      const h = Math.max(2, area.h);
      p.box(area.x, area.y, w, h, ` ${title} `, { fg: 245, bold: true });
    },
  };
}

function Text(get: () => string): Widget {
  return {
    render(area: Rect, { painter }: RenderCtx) {
      const p = painter as FramePainter;
      const s = get();
      // left/top inside the area
      p.text(area.x + 2, area.y + 1, s, { fg: 39, bold: true });
    },
  };
}

// App state
let tick = 0;

// Build a widget tree using vstack.
// Top header (fixed by grow 0? We'll just give it small grow but it will still get space),
// middle content grows 3x, footer grows 1x.
const ui = vstack([
  {
    render(area: Rect, ctx: RenderCtx) {
      // header: box + centered title text
      Box("Header").render(area, ctx);
      const title = "CATATUI — vstack demo (press q to quit)";
      const tx = Math.max(
        area.x + 1,
        area.x + Math.floor((area.w - title.length) / 2)
      );
      (ctx.painter as FramePainter).text(tx, area.y, title, {
        fg: 214,
        bold: true,
      });
    },
  },
  {
    render(area: Rect, ctx: RenderCtx) {
      // content: box + dynamic text
      Box("Content").render(area, ctx);
      Text(
        () => `Time: ${new Date().toLocaleTimeString()}   Tick: ${tick}`
      ).render(area, ctx);
    },
  },
  {
    render(area: Rect, ctx: RenderCtx) {
      // footer: box + hint
      Box("Footer").render(area, ctx);
      Text(() => "Hint: try resizing your terminal.").render(area, ctx);
    },
  },
])
  .pad(1) // inset the whole stack
  .gap(1) // 1-row gap between children
  .childGrow(0, 1) // header weight
  .childGrow(1, 3) // content weight (bigger)
  .childGrow(2, 1); // footer weight

function draw() {
  const frame: Frame = renderer.newFrame();
  const painter = new FramePainter(frame);
  ui.render({ x: 0, y: 0, w: frame.cols, h: frame.rows }, { painter });
  renderer.commit(frame);
}

// Animate and redraw
const anim = setInterval(() => {
  tick++;
  sched.requestRedraw(draw);
}, 500);
(anim as any).ref?.();

// Keys
input.on((k) => {
  if (k.name === "q" || (k.ctrl && k.name === "c")) {
    clearInterval(anim);
    process.exit(0);
  }
  sched.requestRedraw(draw);
});

// Resize → reset diff and redraw
term.onResizeEvent(() => {
  renderer.reset();
  sched.requestRedraw(draw);
});

// First paint
draw();
