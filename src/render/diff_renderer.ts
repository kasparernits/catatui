// Diff the new frame against the previous one and emit *batched* ANSI writes.
// Strategy: per row, group *runs* of changed cells with the same style,
// then write: GOTO + SGR + runText. One big write per commit (great over SSH).

import type { Cell, Style } from "../index";
import { TerminalBackend } from "../runtime/terminal_backend";
import { Frame } from "./frame";

// Convert a Style into a stable string key for run-grouping.
function styleKey(s?: Style): string {
  if (!s) return "";
  const fg = s.fg ?? "";
  const bg = s.bg ?? "";
  const b = s.bold ? "b" : "";
  const u = s.underline ? "u" : "";
  const i = s.inverse ? "i" : "";
  return `${fg};${bg};${b}${u}${i}`;
}

// Whether two cells are identical (char + style).
function sameCell(a: Cell, b: Cell): boolean {
  if (a.ch !== b.ch) return false;

  const as = a.style, bs = b.style;
  if (!as && !bs) return true;
  if (!as || !bs) return false;

  return (
    as.fg === bs.fg &&
    as.bg === bs.bg &&
    !!as.bold === !!bs.bold &&
    !!as.underline === !!bs.underline &&
    !!as.inverse === !!bs.inverse
  );
}

// Turn a Style into an SGR sequence (matches TerminalBackend.sgr semantics).
function sgrFromStyle(s?: Style): string {
  if (!s) return "\x1b[0m";
  const codes: string[] = [];
  if (s.bold) codes.push("1");
  if (s.underline) codes.push("4");
  if (s.inverse) codes.push("7");
  if (typeof s.fg === "number") codes.push(`38;5;${s.fg}`);
  if (typeof s.bg === "number") codes.push(`48;5;${s.bg}`);
  return codes.length ? `\x1b[${codes.join(";")}m` : "";
}

export class DiffRenderer {
  private prev: Frame | null = null;
  private currentSGR = "\x1b[0m";

  constructor(private term: TerminalBackend) {}

  // Create a new Frame sized to the current terminal.
  newFrame(): Frame {
    return new Frame(this.term.columns, this.term.rows);
  }

  // Reset internal state, e.g., after a resize.
  reset() {
    this.prev = null;
    this.currentSGR = "\x1b[0m";
  }

  // Core: compute diffs and emit batched ANSI updates.
  commit(next: Frame) {
    // If terminal resized since prev, drop prev to force full repaint.
    if (!this.prev ||
        this.prev.cols !== next.cols ||
        this.prev.rows !== next.rows) {
      this.prev = new Frame(next.cols, next.rows);
      // Also clear the screen and home the cursor.
      this.term.write("\x1b[2J\x1b[H");
      this.currentSGR = "\x1b[0m";
    }

    const out: string[] = [];
    const goto = (x: number, y: number) => `\x1b[${y};${x}H`;

    for (let y = 0; y < next.rows; y++) {
      let x = 0;
      while (x < next.cols) {
        const a = next.buf[y][x];
        const b = this.prev.buf[y][x];

        if (sameCell(a, b)) { x++; continue; }

        // Start a run of changed cells with same styleKey.
        const sk = styleKey(a.style);
        let runStart = x;
        let runEnd = x;

        while (runEnd < next.cols) {
          const na = next.buf[y][runEnd];
          const nb = this.prev.buf[y][runEnd];
          if (!sameCell(na, nb) && styleKey(na.style) === sk) {
            runEnd++;
          } else {
            break;
          }
        }

        // Move cursor to run start (1-based).
        out.push(goto(runStart + 1, y + 1));

        // Ensure correct SGR (avoid redundant SGR if same as current).
        const nextSGR = sgrFromStyle(a.style) || "\x1b[0m";
        if (nextSGR !== this.currentSGR) {
          out.push(nextSGR);
          this.currentSGR = nextSGR;
        }

        // Append the run's text and update prev as we go.
        let text = "";
        for (let i = runStart; i < runEnd; i++) {
          const c = next.buf[y][i];
          text += c.ch;
          // Copy over to prev so next diff is correct.
          this.prev.buf[y][i] = c.style ? { ch: c.ch, style: { ...c.style } } : { ch: c.ch };
        }
        out.push(text);

        x = runEnd;
      }
    }

    // Reset SGR at end (keeps terminal state clean if app crashes later).
    out.push("\x1b[0m");
    this.currentSGR = "\x1b[0m";

    // Single big write → great over SSH.
    this.term.batch(out);
  }
}
