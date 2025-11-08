// A simple 2D framebuffer for terminal cells.
// Each cell holds a character and an optional style.

import type { Cell, Style } from "../index";

export class Frame {
  readonly cols: number;
  readonly rows: number;

  // buf[y][x] => Cell
  readonly buf: Cell[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    // Initialize with spaces (no style)
    this.buf = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ ch: " " } as Cell))
    );
  }

  // Put a single character at (x, y). Ignores out-of-bounds safely.
  put(x: number, y: number, ch: string, style?: Style) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    // Only use the first visible char; terminals are grid-based.
    const c = ch.length ? ch[0] : " ";
    this.buf[y][x] = style ? { ch: c, style } : { ch: c };
  }

  // Write a string horizontally starting at (x, y).
  text(x: number, y: number, s: string, style?: Style) {
    for (let i = 0; i < s.length; i++) {
      this.put(x + i, y, s[i], style);
    }
  }

  // Fill a rectangle with a character/style (useful for clearing regions).
  fill(x: number, y: number, w: number, h: number, ch = " ", style?: Style) {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        this.put(x + xx, y + yy, ch, style);
      }
    }
  }

  // Reset entire frame to spaces with no style.
  clear() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.buf[y][x] = { ch: " " };
      }
    }
  }
}
