# UI Primitives

This directory owns reusable, business-agnostic UI building blocks.

Rules:

- Use existing SnipForge CSS variables from `App.vue`.
- Do not import command, library, settings, or Electron domain code.
- Keep props small and stable.
- Prefer slots over business-specific variants.
- New app UI should use these primitives before adding local button, modal, input, select, or empty-state CSS.
