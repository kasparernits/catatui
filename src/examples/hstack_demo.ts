import { TerminalBackend, InputBackend, Scheduler } from "..";
import { DiffRenderer } from "..";
import { Frame } from "../render/frame";
import { FramePainter } from "../render/painter";
import { vstack } from "../layout/vstack";
import { hstack } from "../layout/hstack";
import type { Widget, Rect, RenderCtx } from "..";

const term = new TerminalBackend();
const input = new InputBackend();
const sched = new Scheduler();
const renderer = new DiffRenderer(term);

term.install();
input.install();

// tiny helper widgets
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
function Text(get: () => string, dx = 2, dy = 1): Widget {
  return {
    render(area: Rect, { painter }: RenderCtx) {
      (painter as FramePainter).text(area.x + dx, area.y + dy, get(), {
        fg: 39,
        bold: true,
      });
    },
  };
}

let tick = 0;

// UI: vstack(header, hstack(left,right), footer)
const ui = vstack([
  {
    render(a, ctx) {
      Box("Header").render(a, ctx);
      const title = "CATATUI — hstack demo (q to quit)";
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
    .childGrow(1, 2), // right panel 2× width
  {
    render(a, ctx) {
      Box("Footer").render(a, ctx);
      Text(() => "Resize the terminal to see layout adapt.").render(a, ctx);
    },
  },
])
  .pad(1)
  .gap(1)
  .childGrow(0, 1) // header
  .childGrow(1, 5) // content row (bigger)
  .childGrow(2, 1); // footer

function draw() {
  const frame: Frame = renderer.newFrame();
  const painter = new FramePainter(frame);
  ui.render({ x: 0, y: 0, w: frame.cols, h: frame.rows }, { painter });
  renderer.commit(frame);
}

// animate + keys + resize
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
  sched.requestRedraw(draw);
});

term.onResizeEvent(() => {
  renderer.reset();
  sched.requestRedraw(draw);
});

draw();
