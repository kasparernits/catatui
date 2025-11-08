// Normalized keyboard input handling for Node TTY

import readline from "node:readline";

// A simple, normalized key event
export type KeyEvent = {
  type: "key";        // event type (future-proofing)
  name: string;       // "q", "return", "up", "down", "escape", etc.
  ctrl?: boolean;     // Ctrl modifier
  meta?: boolean;     // Alt/Meta modifier
  shift?: boolean;    // Shift modifier
  sequence?: string;  // Raw sequence, if needed
};

export class InputBackend {
  private in = process.stdin;                      // input stream
  private handlers = new Set<(k: KeyEvent) => void>(); // subscribers
  private installed = false;                       // raw-mode state

  // Enable raw mode and start emitting normalized key events
  install() {
    if (this.installed) return;
    this.installed = true;

    // Put terminal into raw mode so we get keypresses immediately
    if (this.in.isTTY) this.in.setRawMode(true);
    this.in.resume(); // ensure stream is flowing

    // Let Node build keypress events from raw data
    readline.emitKeypressEvents(this.in);

    // Convert Node's keypress into our KeyEvent shape
    const onKeypress = (_str: string, key: any) => {
      const ev: KeyEvent = {
        type: "key",
        name: key?.name ?? "",
        ctrl: !!key?.ctrl,
        meta: !!key?.meta,
        shift: !!key?.shift,
        sequence: key?.sequence,
      };
      // Notify all subscribers
      for (const fn of this.handlers) fn(ev);
    };

    // @ts-ignore - Node augments stdin with 'keypress' after emitKeypressEvents
    this.in.on("keypress", onKeypress);

    // Safety: allow Ctrl+C to terminate process by default
    this.on((k) => { if (k.ctrl && k.name === "c") process.exit(0); });
  }

  // Disable raw mode and stop emitting key events
  uninstall() {
    if (!this.installed) return;
    this.installed = false;
    try { if (this.in.isTTY) this.in.setRawMode(false); } catch {}
    this.in.pause();       // stop flow
    this.handlers.clear(); // drop listeners
  }

  // Subscribe to key events; returns an unsubscribe
  on(fn: (k: KeyEvent) => void) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }
}
