// src/layout/zstack.ts
import type { Rect, Widget, RenderCtx } from "../index";

export interface ZStackNode extends Widget {
  pad(n: number): ZStackNode;
}

export function zstack(children: Widget[]): ZStackNode {
  let padValue = 0;

  const node: ZStackNode = {
    pad(n: number) {
      padValue = Math.max(0, n | 0);
      return this;
    },

    render(area: Rect, ctx: RenderCtx) {
      // inset once; every child renders into the same (padded) rect
      const x = area.x + padValue;
      const y = area.y + padValue;
      const w = Math.max(0, area.w - padValue * 2);
      const h = Math.max(0, area.h - padValue * 2);
      if (w <= 0 || h <= 0) return;

      for (const child of children) {
        child.render({ x, y, w, h }, ctx);
      }
    },
  };

  return node;
}
