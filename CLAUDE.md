# CLAUDE.md

Read **README.md** for full project documentation, architecture, and coding conventions.

## AI Tool Delegation

When generating code, match the task to the best available CLI tool:

| Task | Tool | Command |
|------|------|---------|
| Architecture, code review, prompt design, Thai UX copy | **Claude** (default) | — |
| Large-context analysis, research, broad summarization | **Gemini** (if available) | `gemini ...` |
| Boilerplate, migrations, repetitive scaffolding | **Codex** (if available) | `codex exec "..."` |

Always check availability before delegating (`which gemini`, `which codex`). Fall back to Claude if the CLI is not installed.
