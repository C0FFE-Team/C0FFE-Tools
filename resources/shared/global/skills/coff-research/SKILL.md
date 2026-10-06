---
name: coff-research
description: "Research libraries, frameworks, and best practices. Args: <topic>"
user_invocable: true
---

# /coff-research

Research a topic using web search and documentation sources.

**Arguments:** `<topic>`

## Steps

### 1. Search
- Use web search to find official documentation, guides, and best practices
- Focus on the project's stack (from `.harness/config.json` if present, otherwise `package.json` / lockfiles / framework configs)
- Prioritize official docs, then reputable community resources

### 2. Synthesize
Provide a concise summary with:
- **Recommended approach** for the project's stack
- **Key APIs/patterns** with code examples
- **Gotchas** and common mistakes
- **Links** to official documentation

### 3. Context
If research is for a specific feature, save relevant findings to the feature's context brief or plan.
