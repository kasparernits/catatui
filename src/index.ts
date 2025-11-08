// src/index.ts
export { Frame } from "./render/frame";
export { FramePainter } from "./render/painter";   // renamed export
export { DiffRenderer } from "./render/diff_renderer";

// keep the Painter interface as-is (no changes needed)
export type Style = { fg?: number; bg?: number; bold?: boolean; underline?: boolean; inverse?: boolean; };
export type Rect  = { x: number; y: number; w: number; h: number; };
export type Cell  = { ch: string; style?: Style };

export interface Painter {
  put(x: number, y: number, ch: string, style?: Style): void;
  text(x: number, y: number, s: string, style?: Style): void;
}
export interface RenderCtx { painter: Painter; }
export interface Widget { render(area: Rect, ctx: RenderCtx): void; }

// runtime exports unchanged…
export { TerminalBackend } from "./runtime/terminal_backend";
export { InputBackend, type KeyEvent } from "./runtime/input_backend";
export { Scheduler } from "./runtime/scheduler";
export { measureRTT } from "./runtime/rtt";
