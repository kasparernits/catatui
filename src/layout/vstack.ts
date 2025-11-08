// src/layout/vstack.ts
import type { Rect, Widget, RenderCtx } from "../index";

type StackChild = { widget: Widget; grow: number };

export interface VStackNode extends Widget {
  gap(n: number): VStackNode;
  childGrow(index: number, grow: number): VStackNode;
  pad(n: number): VStackNode;
}

export function vstack(children: Widget[]): VStackNode {
  let gapValue = 0;
  let padValue = 0;
  const childData: StackChild[] = children.map((w) => ({ widget: w, grow: 1 }));

  const node: VStackNode = {
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
      // Apply padding
      const x = area.x + padValue;
      const y = area.y + padValue;
      const w = Math.max(0, area.w - padValue * 2);
      const h = Math.max(0, area.h - padValue * 2);

      if (w <= 0 || h <= 0 || childData.length === 0) return;

      const gaps = gapValue * (childData.length - 1);
      const freeH = Math.max(0, h - gaps);
      const totalGrow = childData.reduce((s, c) => s + c.grow, 0) || 1;

      // Compute heights
      const heights = childData.map((c) =>
        Math.floor(freeH * (c.grow / totalGrow))
      );
      let sum = heights.reduce((a, b) => a + b, 0);
      let leftover = freeH - sum;
      for (let i = 0; i < heights.length && leftover > 0; i++, leftover--)
        heights[i]++;

      // Render children
      let cy = y;
      for (let i = 0; i < childData.length; i++) {
        const ch = childData[i];
        const chH = heights[i];
        if (chH > 0) {
          ch.widget.render({ x, y: cy, w, h: chH }, ctx);
        }
        cy += chH + gapValue;
      }
    },
  };

  return node;
}
