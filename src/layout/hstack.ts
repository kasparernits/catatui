// Horizontal stack layout: splits the given area by width and renders children left→right.
// Supports: .gap(n) spacing, .childGrow(i, n) flex growth, and .pad(n) to inset the stack.

import type { Rect, Widget, RenderCtx } from "../index";

type StackChild = { widget: Widget; grow: number };

export interface HStackNode extends Widget {
  gap(n: number): HStackNode;
  childGrow(index: number, grow: number): HStackNode;
  pad(n: number): HStackNode;
}

export function hstack(children: Widget[]): HStackNode {
  let gapValue = 0;
  let padValue = 0;
  const childData: StackChild[] = children.map((w) => ({ widget: w, grow: 1 }));

  const node: HStackNode = {
    gap(n: number) {
      gapValue = Math.max(0, n | 0);
      return this;
    },
    pad(n: number) {
      padValue = Math.max(0, n | 0);
      return this;
    },
    childGrow(i: number, g: number) {
      if (childData[i]) childData[i].grow = Math.max(0, g);
      return this;
    },

    render(area: Rect, ctx: RenderCtx) {
      // Apply padding to container rect
      const x = area.x + padValue;
      const y = area.y + padValue;
      const w = Math.max(0, area.w - padValue * 2);
      const h = Math.max(0, area.h - padValue * 2);

      if (w <= 0 || h <= 0 || childData.length === 0) return;

      const gaps = gapValue * (childData.length - 1);
      const freeW = Math.max(0, w - gaps);
      const totalGrow = childData.reduce((s, c) => s + c.grow, 0) || 1;

      // Compute widths per child by grow share
      const widths = childData.map((c) =>
        Math.floor(freeW * (c.grow / totalGrow))
      );
      // Distribute leftover columns due to rounding, left→right
      let used = widths.reduce((a, b) => a + b, 0);
      let leftover = freeW - used;
      for (let i = 0; i < widths.length && leftover > 0; i++, leftover--)
        widths[i]++;

      // Render children left→right
      let cx = x;
      for (let i = 0; i < childData.length; i++) {
        const ch = childData[i];
        const cw = widths[i];
        if (cw > 0) {
          ch.widget.render({ x: cx, y, w: cw, h }, ctx);
        }
        cx += cw + (i < childData.length - 1 ? gapValue : 0);
      }
    },
  };

  return node;
}
