# Claude Agents for SnipForge

Specialized agents for recurring tasks. Keep them narrow and well-defined.

## Available Agents

### Release Manager

Handles the complete release lifecycle: version bumping, changelog generation, tagging, pushing, and monitoring builds.

**Invoke by asking:**
```
"Use the release manager agent to create an auto release"
"Use release-manager to bump patch version"
"Check release status using the release manager"
```

**What it does:**
1. Analyzes commits since last release
2. Determines version bump from conventional commits
3. Generates formatted changelog
4. Shows preview, asks for confirmation
5. Updates package.json, creates tag, pushes
6. Updates GitHub draft release with changelog
7. Monitors GitHub Actions build status

**Config:** `.claude/agents/release-manager.md`

## Context Management

For large features, use separate issues/sessions for backend and frontend. The main agent handles all code (both backend and frontend) and has direct access to Chrome DevTools MCP for screenshots and visual verification. Design skills (`frontend-design`, `ui-ux-pro-max`) are available globally.

**Planned agents:**
- **Technical Writer** — reviews feature docs for accuracy against the codebase
- **PR Reviewer** — reviews PRs before merge, checks for consistency and regressions
