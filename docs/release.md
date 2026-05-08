# Release Pipeline

SnipForge releases are produced from Git tags (`v*`) by GitHub Actions.

## Active Notes

### Issue #66: single-source release workflow

Plan:
- make `softprops/action-gh-release` the only release publisher
- remove `GH_TOKEN` from platform build jobs so `electron-builder` cannot auto-create draft releases during packaging
- collect macOS, Windows, and Linux build outputs as workflow artifacts
- create/update the GitHub draft release in one dedicated job after all platform builds complete
- keep draft releases as the review gate before public publishing

Final notes:
- `.github/workflows/release.yml` now has platform build jobs with no release credentials and one `create-release` job that owns draft release creation
- platform artifacts are uploaded with `actions/upload-artifact` and then downloaded into the release job before `softprops/action-gh-release` attaches them
- this removes the previous race where `electron-builder` and the release action could both create/update draft releases, which produced `untagged-*` draft URLs

### Issue #65: Node 24-compatible release actions

Plan:
- run the release workflow with Node 24 so release builds exercise the upcoming GitHub runner default
- opt JavaScript actions into the Node 24 runtime during the transition window
- update third-party release/upload actions to current major versions where safe

Final notes:
- release CI now sets `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`, uses Node 24 for package/build steps, and updates `pnpm/action-setup` plus release artifact actions to current major versions
- `actions/checkout` and `actions/setup-node` stay on v4 with the Node 24 runtime opt-in until the workflow is validated against the next tag build

## Current Release Flow

1. A local release script bumps `package.json`, commits, tags, and pushes.
2. The tag push starts `.github/workflows/release.yml`.
3. Matrix build jobs run `pnpm build` on macOS, Windows, and Linux without release credentials.
4. Each build uploads only packaged release artifacts (`.dmg`, `.exe`, `.AppImage`, blockmaps, and update YAML files) to the workflow run.
5. A single `create-release` job downloads those artifacts and creates one draft GitHub release for the tag.
6. A human reviews and publishes the draft from GitHub Releases.

## Design Decisions

| Decision | Why |
|---|---|
| GitHub Actions owns publishing | Avoids `electron-builder` and release actions racing to create different draft releases. |
| Build jobs do not receive `GH_TOKEN` | Prevents accidental `electron-builder` auto-publish on tag builds. |
| Release job runs after all platforms build | One tag should produce one release object with all platform artifacts attached together. |
| Draft releases remain the default | Keeps manual review before users receive the update. |
| Node 24 is used in CI | Catches upcoming runner/runtime compatibility issues before GitHub forces the migration. |

## Key Files

| File | Role |
|---|---|
| `.github/workflows/release.yml` | CI build matrix and single release-publisher job |
| `scripts/release.sh` | Local version bump, tag, and push helper |
| `electron-builder.json5` | Platform package/artifact naming config |
| `AGENTS.md` | Human/agent release instructions |
