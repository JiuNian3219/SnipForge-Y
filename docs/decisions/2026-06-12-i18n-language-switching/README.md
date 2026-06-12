# i18n Language Switching

## Goal

Add first-party internationalization for SnipForge so the app can switch between English and Simplified Chinese from Settings.

## Decisions

- Support English and Simplified Chinese in the first version.
- Add a `System` language option that follows `navigator.language`; Chinese locales resolve to Simplified Chinese, all other locales resolve to English.
- Store the language preference as `general.language` in the existing settings system.
- Translate app-owned UI copy only. User command content, tags, library manifest data, paths, repository URLs, shortcuts, and language identifiers stay unchanged.
- GitHub Issues are no longer required for task tracking; this decision record is the task source of truth.

## Plan

- Introduce `vue-i18n` and register it in the Vue renderer entrypoint.
- Add an i18n module with English and Simplified Chinese messages.
- Apply the language setting after settings load and whenever the setting changes.
- Add a language selector to the General settings page using existing settings row styling.
- Replace visible app UI strings across the main palette, settings, common modals, notifications, confirms, alerts, and placeholders where practical.

## Implementation Notes

- Added `vue-i18n` and renderer i18n files under `src/i18n/`.
- Added the persisted `general.language` setting and applied it from `useSettings`.
- Added a Settings → General → Display language selector using the existing dark settings row style.
- Localized app-owned UI copy across the main palette, common modals, settings high-traffic paths, library list, update banner, notifications, confirms, alerts, and placeholders.
- Left user-authored command/library data, paths, repository URLs, shortcuts, code language identifiers, and raw system/Git errors untranslated.

## Validation

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm install --frozen-lockfile` passed.
- `pnpm test` passed: 11 files, 105 tests.
- `pnpm test:db` passed: 13 database tests.
- `pnpm dev:debug` visual verification was attempted but blocked by the local Windows rebuild path: `electron-builder` tried to execute `C:\nvm4w\nodejs\node_modules\pnpm\bin\pnpm.mjs` directly and failed with `%1 is not a valid Win32 application`.

## Follow-ups

- Consider extracting Markdown help content into localized markdown files.
- Add coverage for future locales once copy stabilizes.
- Translate deeper dynamic Git workflow summaries in the library management workspace once those status strings stabilize.
