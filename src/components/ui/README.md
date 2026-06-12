# UI Primitives

This directory owns reusable, business-agnostic UI building blocks.

Rules:

- Use existing SnipForge CSS variables from `App.vue`.
- Do not import command, library, settings, or Electron domain code.
- Keep props small and stable.
- Prefer slots over business-specific variants.
- New app UI should use these primitives before adding local button, modal, input, select, or empty-state CSS.

Current primitives:

- `BaseButton`: text or icon+text actions with `primary`, `secondary`, `subtle`, and `danger` variants.
- `IconButton`: icon-only actions with shared hover, focus, size, title, and aria-label behavior.
- `BaseModal`: overlay, shell, header, body, footer, close, and backdrop behavior.
- `BaseInput`, `BaseTextarea`, `BaseSelect`, `BaseCheckbox`: form primitives with `v-model` and native attrs.
- `FormField`: label, description, error, and header-action layout around a control slot.
- `ToolbarButton`: editor toolbar buttons with active and disabled states.

Keep this layer generic. If a prop would mention commands, libraries, settings, sync, or Electron APIs, put that behavior in `src/components/domain/` or the consuming component instead.
