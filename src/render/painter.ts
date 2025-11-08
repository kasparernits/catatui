// src/render/painter.ts
// Small helper that writes into a Frame with convenient primitives.

import type { Style, Painter as PainterAPI } from "../index";
import { Frame } from "./frame";

// Rename the concrete class to FramePainter and have it implement the Painter interface
export class FramePainter implements PainterAPI {
  constructor(public frame: Frame) {}

  put(x: number, y: number, ch: string, style?: Style) {
    this.frame.put(x, y, ch, style);
  }

  text(x: number, y: number, s: string, style?: Style) {
    this.frame.text(x, y, s, style);
  }

  hline(x: number, y: number, w: number, ch = "─", style?: Style) {
    for (let i = 0; i < w; i++) this.put(x + i, y, ch, style);
  }

  vline(x: number, y: number, h: number, ch = "│", style?: Style) {
    for (let i = 0; i < h; i++) this.put(x, y + i, ch, style);
  }

  box(x: number, y: number, w: number, h: number, title?: string, style?: Style) {
    if (w < 2 || h < 2) return;
    this.put(x, y, "┌", style);
    this.put(x + w - 1, y, "┐", style);
    this.put(x, y + h - 1, "└", style);
    this.put(x + w - 1, y + h - 1, "┘", style);
    this.hline(x + 1, y, w - 2, "─", style);
    this.hline(x + 1, y + h - 1, w - 2, "─", style);
    this.vline(x, y + 1, h - 2, "│", style);
    this.vline(x + w - 1, y + 1, h - 2, "│", style);
    if (title) {
      const t = ` ${title} `;
      for (let i = 0; i < t.length && i + 1 < w - 1; i++) {
        this.put(x + 1 + i, y, t[i], style);
      }
    }
  }
}
