import { TerminalBackend, InputBackend, Scheduler } from "..";
import { DiffRenderer } from "..";
import { Frame } from "../render/frame";
import { FramePainter } from "../render/painter";
import { vstack } from "../layout/vstack";
import { hstack } from "../layout/hstack";
import { zstack } from "../layout/zstack";
import type { Widget, Rect, RenderCtx } from "..";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const term = new TerminalBackend();
const input = new InputBackend();
const sched = new Scheduler();
const renderer = new DiffRenderer(term);

term.install();
input.install();

const execp = promisify(exec);
const datadir = "/mnt/samsung/bitcoin";

type Cmd = { title: string; cmd: string };
const CMDS: Cmd[] = [
  { title: "Blockchain Info", cmd: `bitcoin-cli -datadir=${datadir} getblockchaininfo` },
  { title: "Wallet Info", cmd: `bitcoin-cli -datadir=${datadir} getwalletinfo` },
];

let selected = 0;
let outputLines: string[] = ["(select a command)"];
let tick = 0;
let showModal = false;

async function runSelected() {
  const { cmd } = CMDS[selected];
  try {
    const { stdout, stderr } = await execp(cmd, {
      shell: "/bin/ksh",
      maxBuffer: 2 * 1024 * 1024,
    });
    const out = stdout || "";
    const err = stderr ? "\n[stderr]\n" + stderr : "";
    outputLines = (out + err).split(/\r?\n/);
  } catch (e: any) {
    outputLines = [`[error running "${cmd}"]`, String(e?.message ?? e)];
  } finally {
    sched.requestRedraw(draw);
  }
}

// ----- tiny widgets -----
function Box(title: string): Widget {
  return {
    render(a, { painter }) {
      const p = painter as FramePainter;
      p.box(a.x, a.y, Math.max(2, a.w), Math.max(2, a.h), ` ${title} `, {
        fg: 245,
        bold: true,
      });
    },
  };
}

const List: Widget = {
  render(a: Rect, { painter }: RenderCtx) {
    const p = painter as FramePainter;
    Box("Commands (↑/↓, z/c, q)").render(a, { painter });

    const ix = a.x + 1,
      iy = a.y + 1,
      iw = a.w - 2,
      ih = a.h - 2;
    for (let i = 0; i < ih && i < CMDS.length; i++) {
      const isSel = i === selected;
      const label = CMDS[i].title;
      const line =
        label.length > iw - 2 ? label.slice(0, iw - 5) + "..." : label;
      const style = isSel ? { inverse: true, fg: 15 } : { fg: 250 };
      p.text(ix + 1, iy + i, line, style as any);
    }
  },
};

const Detail: Widget = {
  render(a: Rect, { painter }: RenderCtx) {
    const p = painter as FramePainter;
    Box(`Output — ${CMDS[selected].title}`).render(a, { painter });

    const padX = 1,
      padY = 1;
    const maxW = Math.max(0, a.w - 2 * padX);
    const maxH = Math.max(0, a.h - 2 * padY);

    for (let i = 0; i < maxH && i < outputLines.length; i++) {
      const s = outputLines[i];
      const line = s.length > maxW ? s.slice(0, maxW - 1) : s;
      p.text(a.x + padX, a.y + padY + i, line, { fg: 252 } as any);
    }
  },
};

function Modal(getVisible: () => boolean): Widget {
  return {
    render(a: Rect, { painter }: RenderCtx) {
      if (!getVisible()) return;
      const p = painter as FramePainter;

      // Backdrop
      p.rect(a.x, a.y, a.w, a.h, " ", { bg: 236 } as any);

      const mw = Math.min(54, Math.max(32, Math.floor(a.w * 0.6)));
      const mh = Math.min(12, Math.max(7, Math.floor(a.h * 0.4)));
      const mx = a.x + Math.floor((a.w - mw) / 2);
      const my = a.y + Math.floor((a.h - mh) / 2);

      // Window
      p.box(mx, my, mw, mh, " Help ", { fg: 223, bold: true } as any);
      p.text(mx + 2, my + 2, "↑ / ↓ : select command", { fg: 229 } as any);
      p.text(mx + 2, my + 3, "z : open this help", { fg: 229 } as any);
      p.text(mx + 2, my + 4, "c : close help", { fg: 229 } as any);
      p.text(mx + 2, my + 5, "q : quit", { fg: 229 } as any);
    },
  };
}

// ----- layout with zstack -----
const base = vstack([
  {
    render(a, ctx) {
      Box("BITATUI 🧀").render(a, ctx);
      const title = "";
      const tx = Math.max(a.x + 1, a.x + Math.floor((a.w - title.length) / 2));
      (ctx.painter as FramePainter).text(tx, a.y, title, {
        fg: 214,
        bold: true,
      } as any);
    },
  },
  hstack([List, Detail]).gap(2).childGrow(0, 1).childGrow(1, 2),
  {
    render(a, ctx) {
      Box("Footer").render(a, ctx);
      (ctx.painter as FramePainter).text(
        a.x + 2,
        a.y + 1,
        `Tick: ${tick} | Selected: ${CMDS[selected].title} | z=open help | c=close | q=quit`,
        { fg: 244 } as any
      );
    },
  },
])
  .pad(1)
  .gap(1)
  .childGrow(0, 1)
  .childGrow(1, 6)
  .childGrow(2, 1);

const ui = zstack([base, Modal(() => showModal)]);

function draw() {
  const frame: Frame = renderer.newFrame();
  const painter = new FramePainter(frame);
  ui.render({ x: 0, y: 0, w: frame.cols, h: frame.rows }, { painter });
  renderer.commit(frame);
}

// ----- behavior -----
const anim = setInterval(() => {
  tick++;
  sched.requestRedraw(draw);
}, 1000);
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

  if (k.name === "up") {
    selected = Math.max(0, selected - 1);
    runSelected();
  }
  if (k.name === "down") {
    selected = Math.min(CMDS.length - 1, selected + 1);
    runSelected();
  }
});

term.onResizeEvent(() => {
  renderer.reset();
  sched.requestRedraw(draw);
});

// initial run + paint
runSelected();
draw();
