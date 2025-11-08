// Minimal terminal backend for catatui MVP

export type Style = {
  fg?: number;          // 0..255 (ANSI 256-color foreground)
  bg?: number;          // 0..255 (ANSI 256-color background)
  bold?: boolean;       // SGR bold
  underline?: boolean;  // SGR underline
  inverse?: boolean;    // SGR inverse (swap fg/bg)
};

const ESC = "\x1b["; // ANSI escape introducer

// Convert a lightweight Style object into an ANSI SGR sequence.
// Returns "" if there's nothing to change; "\x1b[0m" reset if needed.
function sgrFromStyle(s?: Style): string {
  if (!s) return ESC + "0m"; // if style is undefined → reset styles
  const codes: string[] = [];
  if (s.bold) codes.push("1");
  if (s.underline) codes.push("4");
  if (s.inverse) codes.push("7");
  if (typeof s.fg === "number") codes.push(`38;5;${s.fg}`); // 256-color fg
  if (typeof s.bg === "number") codes.push(`48;5;${s.bg}`); // 256-color bg
  return codes.length ? ESC + codes.join(";") + "m" : "";    // join and wrap
}

export class TerminalBackend {
  // Shorthands to Node’s stdio streams
  private out = process.stdout;
  private in = process.stdin;

  // Whether alt-screen/handlers are currently installed
  private installed = false;

  // Subscribers to terminal resize events
  private resizeHandlers = new Set<() => void>();

  // Enter alternate screen, hide cursor, clear screen, and attach handlers.
  install() {
    if (this.installed) return;
    this.installed = true;

    // Enable alternate screen buffer, hide cursor, reset SGR
    this.write("\x1b[?1049h\x1b[?25l\x1b[0m");
    // Clear whole screen and move cursor to (1,1)
    this.write("\x1b[2J\x1b[H");

    // Listen for terminal resize (SIGWINCH under the hood)
    this.out.on("resize", this.onResize);

    // Ensure we restore the terminal on exits/errors
    const restore = () => this.uninstall();
    process.on("SIGINT", restore);
    process.on("SIGTERM", restore);
    process.on("uncaughtException", (e) => { this.uninstall(); throw e; });
    process.on("exit", () => this.uninstall());
  }

  // Leave alternate screen, show cursor, detach handlers.
  uninstall() {
    if (!this.installed) return;
    this.installed = false;

    // Stop listening for resize
    this.out.off("resize", this.onResize);

    // Reset SGR, show cursor, exit alt screen buffer
    this.write("\x1b[0m\x1b[?25h\x1b[?1049l");
  }

  // Internal: fan out resize events to subscribers
  private onResize = () => {
    for (const fn of this.resizeHandlers) fn();
  };

  // Allow external code to subscribe to resize; returns an unsubscribe
  onResizeEvent(fn: () => void) {
    this.resizeHandlers.add(fn);
    return () => this.resizeHandlers.delete(fn);
  }

  // Current terminal size (fallback defaults for safety)
  get columns() { return this.out.columns ?? 80; }
  get rows()    { return this.out.rows ?? 24; }

  // Write raw string to terminal
  write(s: string) { this.out.write(s); }

  // Clear screen and home the cursor
  clear() { this.write("\x1b[2J\x1b[H"); }

  // Move cursor to 1-based coordinates (x=column, y=row)
  goto(x1: number, y1: number) { this.write(`${ESC}${y1};${x1}H`); }

  // Emit SGR based on style
  sgr(style?: Style) { this.write(sgrFromStyle(style)); }

  // Reset all SGR attributes
  resetSGR() { this.write(ESC + "0m"); }

  // Cursor visibility toggles
  hideCursor() { this.write("\x1b[?25l"); }
  showCursor() { this.write("\x1b[?25h"); }

  // Batch write: join many small strings into one big write (perf over SSH)
  batch(chunks: string[]) { this.out.write(chunks.join("")); }
}
