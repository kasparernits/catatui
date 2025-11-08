// Measure terminal round-trip time (RTT) using a cursor position report.
// We send ESC[6n (Device Status Report for cursor position).
// The *local terminal app* responds with ESC[{row};{col}R.
// Measuring time from send → receive yields a true UI round-trip,
// including SSH, remote shell, and terminal rendering.

export async function measureRTT(timeoutMs = 500): Promise<number | null> {
  const out = process.stdout; // where we write the query
  const input = process.stdin; // where the terminal replies

  let resolveFn!: (v: number | null) => void;
  const p = new Promise<number | null>((resolve) => (resolveFn = resolve));

  const started = Date.now(); // record send time
  let buffer = "";            // buffer for incoming bytes

  // When terminal sends back the cursor report, it looks like ESC[<row>;<col>R
  const onData = (chunk: Buffer) => {
    buffer += chunk.toString("utf8");                     // accumulate
    const m = /\x1b\[(\d+);(\d+)R/.exec(buffer);          // try to parse report
    if (m) {
      cleanup();                                          // stop listening
      resolveFn(Date.now() - started);                    // elapsed ms
    }
  };

  // Detach handler and cancel timeout
  const cleanup = () => {
    input.off("data", onData);
    clearTimeout(t);
  };

  // Listen to raw terminal input
  input.on("data", onData);

  // Ask terminal for cursor position (the request that generates the reply)
  out.write("\x1b[6n");

  // Safety timeout: resolve with null if nothing comes back
  const t = setTimeout(() => { cleanup(); resolveFn(null); }, timeoutMs);

  return p;
}
