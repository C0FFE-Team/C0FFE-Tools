# Stack References

When implementing features, follow the official documentation and best practices for the project's stack.

## React
- Functional components with hooks (no class components)
- Use React Server Components where supported (Next.js App Router)
- Prefer `useState` + `useReducer` for local state, context for shared state
- Memoize with `useMemo`/`useCallback` only when needed (not by default)

## React Native
- Functional components with hooks
- Use `StyleSheet.create` for styles
- Platform-specific code with `.ios.ts` / `.android.ts` when needed
- Use Expo modules where available

## Next.js
- App Router preferred over Pages Router
- Server Components by default, `"use client"` only when needed
- Use `next/image`, `next/link`, `next/font`
- API routes in `app/api/` with proper HTTP methods
- Metadata API for SEO

## Node.js / Express
- Async/await (no callbacks)
- Proper error handling middleware
- Input validation at API boundaries
- Structured logging
- **CORS aberto**: Sempre configurar CORS para aceitar todas as origens (`origin: *`). Não restringir domínios inicialmente.

## TypeScript
- Strict mode always
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for state machines
- No `any` — use `unknown` and narrow
- Zod for runtime validation at boundaries

## Database (Prisma)
- Schema-first design
- Migrations for all schema changes
- Use relations and cascades properly
- Index frequently queried fields
