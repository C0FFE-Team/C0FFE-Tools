#!/bin/bash
# context-reinject.sh
# Hook: SessionStart (Claude Code ~/.claude/settings.json + Codex ~/.codex/hooks.json)
# Purpose: Re-inject active feature context after context window compaction.
#
# Installed by `coff install`. Runs only when the session starts from a
# compaction (source=compact); set COFF_CONTEXT_ON_START=1 to also inject on
# startup/resume. Emits {"hookSpecificOutput":{"additionalContext":...}},
# the format both Claude Code and Codex accept.

set -euo pipefail

INPUT=""
if [ ! -t 0 ]; then INPUT="$(cat || true)"; fi

json_field() {
  [ -z "$INPUT" ] && return 0
  command -v node &>/dev/null || return 0
  printf '%s' "$INPUT" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      try { const v = JSON.parse(s)[process.argv[1]]; if (typeof v === "string") process.stdout.write(v); } catch {}
    });' "$1" 2>/dev/null || true
}

SOURCE="$(json_field source)"
if [ -n "$SOURCE" ] && [ "$SOURCE" != "compact" ] && [ "${COFF_CONTEXT_ON_START:-0}" != "1" ]; then
  exit 0
fi

PROJECT_DIR="$(json_field cwd)"
[ -z "$PROJECT_DIR" ] && PROJECT_DIR="$(pwd)"
HARNESS_DIR="$PROJECT_DIR/.harness"
CONFIG_FILE="$HARNESS_DIR/config.json"

# Exit silently if no harness
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
fi

build_context() {

echo "---"
echo "## Project Context (re-injected after compaction)"
echo ""

# Inject project config
if [ -f "$CONFIG_FILE" ]; then
  echo "### Project Config"
  echo '```json'
  cat "$CONFIG_FILE"
  echo '```'
  echo ""
fi

# Inject style guide summary (first 50 lines)
STYLEGUIDE="$HARNESS_DIR/styleguide.md"
if [ -f "$STYLEGUIDE" ]; then
  echo "### Style Guide (summary)"
  head -50 "$STYLEGUIDE"
  echo ""
  echo "_(Full style guide: .harness/styleguide.md)_"
  echo ""
fi

# Inject feature status
FEATURES="$HARNESS_DIR/memory/features.md"
if [ -f "$FEATURES" ]; then
  echo "### Feature Status"
  cat "$FEATURES"
  echo ""
fi

# Detect active feature branch from repos
# Parse repos from config.json using node
FEATURE_SLUG=""
if command -v node &>/dev/null && [ -f "$CONFIG_FILE" ]; then
  REPO_PATHS=$(node -e "
    const cfg = JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf-8'));
    if (cfg.repos) cfg.repos.forEach(r => console.log(r.path));
  " 2>/dev/null || echo "")

  if [ -z "$REPO_PATHS" ]; then
    # Fallback: check root as a single repo
    REPO_PATHS="."
  fi

  echo "### Repositories"
  for REPO_PATH in $REPO_PATHS; do
    FULL_REPO_PATH="$PROJECT_DIR/$REPO_PATH"
    if [ -d "$FULL_REPO_PATH/.git" ]; then
      BRANCH=$(git -C "$FULL_REPO_PATH" branch --show-current 2>/dev/null || echo "")
      echo "- \`$REPO_PATH\`: branch \`$BRANCH\`"

      # Extract feature slug from first repo with a feature branch
      if [ -z "$FEATURE_SLUG" ] && [ -n "$BRANCH" ]; then
        FEATURE_SLUG="${BRANCH#feature/}"
      fi
    fi
  done
  echo ""
else
  # Fallback: single-repo behavior
  BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [ -n "$BRANCH" ]; then
    FEATURE_SLUG="${BRANCH#feature/}"
  fi
fi

# Inject active feature plan (if feature slug was detected)
if [ -n "$FEATURE_SLUG" ]; then
  PLAN_DIR="$HARNESS_DIR/plans/$FEATURE_SLUG"

  if [ -d "$PLAN_DIR" ]; then
    echo "### Active Feature: $FEATURE_SLUG"
    echo ""

    # Inject context brief
    if [ -f "$PLAN_DIR/context-brief.md" ]; then
      echo "#### Context Brief"
      cat "$PLAN_DIR/context-brief.md"
      echo ""
    fi

    # Inject implementation plan
    if [ -f "$PLAN_DIR/implementation-plan.md" ]; then
      echo "#### Implementation Plan"
      cat "$PLAN_DIR/implementation-plan.md"
      echo ""
    fi

    # Inject implementation notes
    if [ -f "$PLAN_DIR/implementation-notes.md" ]; then
      echo "#### Implementation Notes"
      cat "$PLAN_DIR/implementation-notes.md"
      echo ""
    fi
  fi
fi

echo "---"
}

CONTEXT="$(build_context)"

if command -v node &>/dev/null; then
  printf '%s' "$CONTEXT" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: s },
      }));
    });'
else
  printf '%s\n' "$CONTEXT"
fi
