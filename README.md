# Catatui

A performant and flexible Terminal UI (TUI) toolkit for Node.js, written in TypeScript. `Catatui` provides a declarative way to build interactive command-line applications by abstracting away the complexities of terminal control and ANSI escape codes.

## Features

-   **Component-based UI:** Define reusable UI elements using a `Widget` interface.
-   **Flexible Layouts:** Easily arrange widgets with `vstack`, `hstack`, and `zstack` for vertical, horizontal, and layered compositions, supporting padding, gaps, and responsive sizing.
-   **Efficient Diff-based Rendering:** Utilizes a `DiffRenderer` to intelligently update only the changed parts of the terminal. This minimizes redraws and flicker, resulting in smooth animations and optimal performance, especially over slower network connections like SSH.
-   **Low-level Terminal Control:** Manages core terminal interactions through a `TerminalBackend`, including:
    -   Alternate screen buffer management (taking over the full terminal without scrollback interference).
    -   Cursor visibility control.
    -   Screen clearing and cursor positioning.
    -   Rich text styling with ANSI SGR sequences (256-color support, bold, underline, inverse).
-   **Event Handling:** Integrates with `InputBackend` for capturing keyboard events and handles terminal resize events to ensure adaptive layouts.

Inspired by modern TUI frameworks, `Catatui` aims to provide a robust foundation for building sophisticated and responsive terminal applications in the Node.js ecosystem.
