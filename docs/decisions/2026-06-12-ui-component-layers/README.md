# UI Component Layers

## Goal

Create a two-layer frontend component structure so reusable UI primitives stay separate from SnipForge-specific business components.

## Decisions

- Use an internal lightweight component layer instead of adding an external UI library.
- Put generic, business-agnostic primitives in `src/components/ui/`.
- Put SnipForge domain components in `src/components/domain/`, grouped by domain.
- First migration only covers small, low-risk components. `SettingsModal.vue` and `LibraryManagementModal.vue` stay in place for now.

## Initial APIs

- `BaseButton.vue`: shared button variants: `primary`, `secondary`, `subtle`, `danger`.
- `IconButton.vue`: shared icon-only button behavior.
- `BaseModal.vue`: shared overlay, shell, header, body, footer, close, and backdrop behavior.
- `BaseInput.vue`: shared text input styling with `v-model` and exposed `focus()`.
- `BaseSelect.vue`: shared select styling with `v-model`.
- `EmptyState.vue`: shared title/message empty-state layout.

## Implementation Notes

- Migrated variable input, duplicate resolution, description, help, and update banner components into `src/components/domain/`.
- The migrated domain components now compose primitives from `src/components/ui/`.
- Existing props/emits were preserved so `App.vue` behavior stays stable.
- Empty domain folders have README files to document their intended future ownership.

## Validation

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm test` passed: 11 files, 105 tests.
- `pnpm test:db` passed when run after the full test suite: 1 file, 13 tests.
- Running `pnpm test` and `pnpm test:db` concurrently on Windows can lock `better_sqlite3.node`; rerun `pnpm test:db` after the full suite if that happens.
- `pnpm dev:debug` started successfully after rebuilding `better-sqlite3` for Electron with `pnpm exec electron-rebuild -f -w better-sqlite3`.
- Electron renderer smoke passed over Chrome DevTools: `#app` rendered content, `window.electronAPI` was available, and no console errors were reported.

## Follow-ups

- Migrate `CommandModal.vue` form controls after the primitive APIs settle.
- Extract setting rows and toggles from `SettingsModal.vue` in a separate, focused pass.
- Extract library list and toolbar pieces from `LibraryManagementModal.vue` after visual parity is easy to verify.
