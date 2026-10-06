# Environment Variables

## Harness & MCP Variables

These are used by the harness and MCP servers. Set them in your shell profile or a global `.env`.

```bash
# Linear (required for /coff-plan, /coff-solve)
LINEAR_API_KEY=lin_api_...

# Figma (required for Framelink MCP, optional if using Desktop MCP)
FIGMA_ACCESS_TOKEN=figd_...

# GitHub (usually auto-configured by gh CLI)
GITHUB_TOKEN=ghp_...

# Notion (usually handled by Claude AI integration, no manual token needed)
# NOTION_TOKEN=ntn_...
```

## Common Project Variables

Copy these to each repo's `.env` as needed.

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Server
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET=your-secret-here
# SESSION_SECRET=your-session-secret

# AWS (if using S3, SES, etc.)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# S3_BUCKET=

# Payments (if applicable)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Email (if applicable)
# SENDGRID_API_KEY=
# RESEND_API_KEY=

# Analytics (if applicable)
# MIXPANEL_TOKEN=
# POSTHOG_API_KEY=
```

## Per-Repo .env Files

Each repo in a multi-repo project should have its own `.env`:

```
project/
├── web/.env          <-- Frontend env vars (VITE_API_URL, etc.)
├── server/.env       <-- Backend env vars (DATABASE_URL, PORT, etc.)
├── mobile/.env       <-- Mobile env vars (API_URL, etc.)
└── worker/.env       <-- Worker env vars
```

Frontend repos typically prefix variables:
- **Vite**: `VITE_` prefix (e.g., `VITE_API_URL`)
- **Next.js**: `NEXT_PUBLIC_` prefix for client-side vars
- **Expo**: Use `app.config.ts` or `expo-constants`

## Security Reminders

- Never commit `.env` files — ensure they're in `.gitignore`
- Use different keys for development and production
- Rotate keys if they're ever exposed
