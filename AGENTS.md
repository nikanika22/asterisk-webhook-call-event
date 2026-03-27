# AGENTS.md — Project AI Assistant Instructions
# Version: 2.0 | Best Practice Template
# Copy file này vào root project, chỉnh phần [PROJECT CONFIG] cho phù hợp

---

## [PROJECT CONFIG] — Thay đổi phần này cho project của bạn

```
Project Name  : [YourAppName]
Tech Stack    : [e.g. Next.js 14 App Router + NestJS + PostgreSQL + Prisma]
Styling       : [e.g. Tailwind CSS v3]
Testing       : [e.g. Vitest + Playwright]
Auth          : [e.g. JWT + refresh token / NextAuth / Clerk]
Deploy        : [e.g. Vercel (FE) + Railway (BE)]
Team Size     : [solo / 2-5 / 5+]
Environments  : dev | staging | production
```

---

## 🧰 Tool Stack

This project uses 3 AI assistance layers working together:

| Layer | Tool | Purpose |
|-------|------|---------|
| 1 | **Neural Memory** | Persistent project context across sessions |
| 2 | **AG Kit Skills** | Best practices, auto-loaded on keyword match |
| 3 | **OpenSpec** | Per-feature/bug/task documentation & scope control |

---

## 📋 OpenSpec Workflow Rules

Every code change — no matter how small — MUST go through OpenSpec.

### Commands
- `/opsx:new <name>` — Start any change. Create proposal first.
- `/opsx:ff` — Fast-forward: generate specs, design, tasks from proposal
- `/opsx:apply` — Implement tasks from tasks.md (attach tasks.md + design.md)
- `/opsx:archive` — Done. Archive change, update system docs.

### Flow by Change Type

**Feature (medium/large):**
```
/opsx:new → review proposal → /opsx:ff → review tasks → /opsx:apply → /opsx:archive
```

**Bug fix (root cause known):**
```
/opsx:new fix-[name] → write short proposal + tasks manually → /opsx:apply → /opsx:archive
```

**Bug fix (root cause unknown):**
```
/debug [description] (AG Kit) → find root cause → /opsx:new fix-[name] → ...
```

**Refactor / Tech debt:**
```
/opsx:new refactor-[name] → design.md is critical here → granular tasks → /opsx:apply
```

**System-wide change:**
```
Epic pattern: openspec/changes/epic-[name]/01-step/ 02-step/ ...
```

### Mandatory Rules
1. NEVER write code for a change without a corresponding `openspec/changes/` entry
2. ALWAYS review proposal before running `/opsx:ff`
3. ALWAYS review tasks.md before running `/opsx:apply`
4. If approach deviates during implementation: update design.md first, mark DEVIATION in tasks.md
5. Clear context before each `/opsx:apply` session. Attach only: tasks.md + design.md
6. EVERY tasks.md MUST include a final "Documentation Phase" (see template below)

### tasks.md Documentation Phase — Always Include
```markdown
## Phase N: Documentation & Compliance
- [ ] N.1 Update CHANGELOG.md with this change
- [ ] N.2 Update README.md if user-facing feature added
- [ ] N.3 Update API docs (Swagger / Postman) if endpoints changed
- [ ] N.4 Update ARCHITECTURE.md if system structure changed
- [ ] N.5 Security checklist completed (see Security Rules)
- [ ] N.6 Error handling verified (see Error Handling Rules)
- [ ] N.7 Performance impact assessed (see Performance Rules)
```

---

## 🔒 Security Rules — MANDATORY on Every Change

These rules apply to ALL changes. Do not skip, do not assume "this feature doesn't need it."

### Authentication & Authorization
- [ ] Every API endpoint MUST have auth guard unless explicitly marked `@Public()`
- [ ] Role-based access verified for each endpoint (admin / user / public)
- [ ] Never expose internal IDs directly — use UUIDs or slugs in public APIs
- [ ] JWT tokens: short expiry (15m access, 7d refresh). Never store in localStorage.
- [ ] Password: bcrypt with min rounds=12. Never log passwords.

### Input Validation & Sanitization
- [ ] ALL user inputs validated with schema (Zod / class-validator / Joi)
- [ ] File uploads: validate type (allowlist), size limit, scan filename for path traversal
- [ ] SQL: use ORM parameterized queries only. Never string-concatenate SQL.
- [ ] Output: sanitize before rendering to prevent XSS (DOMPurify on client)

### API Security
- [ ] Rate limiting on all public endpoints (especially auth: 5 req/min)
- [ ] CORS configured explicitly — no wildcard `*` in production
- [ ] Sensitive data (passwords, tokens, card numbers) NEVER in logs
- [ ] HTTP headers: X-Content-Type-Options, X-Frame-Options, CSP configured
- [ ] Webhook endpoints: verify signature (HMAC) before processing

### Secrets & Configuration
- [ ] NO secrets, API keys, or credentials in code or git history
- [ ] All secrets via environment variables only
- [ ] `.env.example` updated when new env vars added (never `.env` in git)
- [ ] Production secrets in secret manager (not plain text env files)

### Dependency Security
- [ ] Before adding new package: check npm audit, check last updated date
- [ ] Prefer packages with > 1M weekly downloads for critical functionality
- [ ] Lock versions in package.json for security-sensitive packages

### Security Checklist in Every PR/Change
When completing any change that touches auth, payments, user data, or APIs:
```
Security self-check:
□ Authentication required where needed?
□ Authorization (permissions) checked?
□ Input validated?
□ Output sanitized?
□ Secrets not exposed?
□ Rate limiting in place?
□ Sensitive data not logged?
□ OWASP Top 10 considered?
```

---

## 🧪 Testing Rules — MANDATORY

### Coverage Requirements
| Change Type | Minimum Coverage |
|-------------|-----------------|
| New Service / Business Logic | Unit tests: happy path + 2 error cases |
| New API Endpoint | Integration test: 200, 401, 400, 404 |
| New UI Component | Component test or Storybook story |
| Bug Fix | Regression test that would have caught the bug |
| Auth / Payment | Full E2E test (Playwright) |

### Test Structure
```
tests/
├── unit/          # Service, util, helper tests (Vitest)
├── integration/   # API endpoint tests (Supertest)
└── e2e/           # Full user flow tests (Playwright)
```

### Rules
1. Tests run before every `/opsx:archive` — no red tests allowed in archive
2. Test file naming: `[module].test.ts` (unit), `[feature].e2e.ts` (e2e)
3. Mock external services (payment gateways, email, S3) in unit/integration tests
4. E2E tests use dedicated test database — never run against production
5. Test names must be descriptive: `should return 401 when token is expired`
6. Use `describe` blocks to group related tests
7. Snapshot tests allowed only for pure UI components, not business logic

### tasks.md Testing Phase Template
```markdown
## Phase N: Testing
- [ ] N.1 Unit tests for [ServiceName]: happy path + error cases
- [ ] N.2 Integration tests for [endpoints]: success + auth + validation
- [ ] N.3 E2E test for [user flow] (if user-facing)
- [ ] N.4 Run full test suite — all green before archive
- [ ] N.5 Check coverage report — no regression in coverage %
```

---

## ⚠️ Error Handling Rules — MANDATORY

### Backend
```typescript
// Standard error response shape — ALWAYS use this:
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",       // machine-readable, SCREAMING_SNAKE
    "message": "Payment declined",  // human-readable, safe to show user
    "details": { ... }              // optional context (never sensitive data)
  },
  "requestId": "uuid"               // for tracing
}
```

Rules:
- [ ] ALL async operations wrapped in try/catch
- [ ] Use custom exception classes (not generic Error)
- [ ] HTTP status codes used correctly: 400 (bad input), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation), 429 (rate limit), 500 (server error)
- [ ] 500 errors MUST be logged with full stack trace (server-side only)
- [ ] 500 error response to client: generic message only, NO stack traces
- [ ] External service failures (payment, email): catch, log, return meaningful error
- [ ] Database errors: catch constraint violations (duplicate key → 409, not 500)

### Frontend
```typescript
// Standard pattern for API calls:
const [data, setData] = useState(null)
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)

// Never swallow errors silently:
catch (err) {
  setError(err.message || 'Something went wrong')  // always show user something
  logger.error('Context:', err)                    // always log
}
```

Rules:
- [ ] Every API call has loading + error + success states handled in UI
- [ ] Error boundary at page level (React ErrorBoundary)
- [ ] Network errors show retry option when possible
- [ ] Form validation errors shown inline, not as alerts
- [ ] 401 errors auto-redirect to login (in API interceptor, not per-component)
- [ ] Error messages user-facing: helpful, not technical ("Payment failed, please try again" not "HTTP 402")

### Logging Standards
```
ERROR   — exceptions, failed operations, security events (always log)
WARN    — degraded state, retry attempts, deprecated usage
INFO    — significant business events (payment completed, user registered)
DEBUG   — development detail (never in production)
```
- Use structured logging (JSON format in production)
- Include: timestamp, level, requestId, userId (if available), message, context
- NEVER log: passwords, tokens, card numbers, PII beyond what's necessary

---

## ⚡ Performance Rules — MANDATORY for User-Facing Changes

### API Performance
- [ ] Database queries: check query plan for N+1 issues (use `include` or dataloader)
- [ ] Add indexes for: foreign keys, frequently filtered columns, sort columns
- [ ] Paginate all list endpoints: default 20, max 100 per page
- [ ] Response time target: < 200ms p95 for read, < 500ms p95 for write
- [ ] Cache read-heavy data: Redis for sessions, hot data (TTL appropriate to staleness)
- [ ] Avoid fetching full objects when only IDs needed (select specific fields)

### Frontend Performance
- [ ] Images: next/image (lazy load, WebP, responsive sizes) — no bare `<img>`
- [ ] Code splitting: lazy-load heavy components (`dynamic()` in Next.js)
- [ ] Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, FID/INP < 200ms
- [ ] Bundle check: run `next build --analyze` after adding new dependencies
- [ ] Avoid: useEffect with no deps (runs every render), inline object/array props to memoized components

### Performance Checklist for Every Change
```
□ No new N+1 queries introduced?
□ New DB columns have appropriate indexes?
□ List endpoints paginated?
□ Heavy data cached appropriately?
□ No unnecessary re-renders added?
□ No large dependencies added without justification?
```

---

## 📄 Documentation Rules — MANDATORY on Every Archive

### Files to Update (check which apply to each change)

| File | Update When |
|------|-------------|
| `CHANGELOG.md` | **EVERY change** — no exceptions |
| `README.md` | New user-facing feature, changed setup, new env vars |
| `docs/API.md` or Swagger | New/changed/deleted endpoints |
| `docs/ARCHITECTURE.md` | System structure, new service, new pattern |
| `docs/ADR/[date]-[decision].md` | Significant architecture decision made |
| `.env.example` | New environment variable added |
| `docs/RUNBOOK.md` | New deployment step, new maintenance task |

### CHANGELOG.md Format (Keep a Changelog standard)
```markdown
## [Unreleased]

## [1.2.0] - 2025-03-15
### Added
- User review system with star ratings and photo upload (#42)
- Email notification when review is published

### Changed
- Improved checkout flow — reduced to 3 steps (was 5)

### Fixed
- Cart total rounding error for orders > $999 (#38)

### Security
- Added rate limiting to auth endpoints (5 req/min)
```

### README.md Must Always Have
```markdown
# [App Name]
[1-sentence description]

## Quick Start
## Environment Variables (link to .env.example)
## Development Setup
## Running Tests
## Deployment
## Architecture Overview (link to ARCHITECTURE.md)
## Contributing (link to CONTRIBUTING.md)
```

---

## 🏗 Architecture & Code Standards

### Folder Structure Convention
```
src/
├── modules/          # Feature modules (each self-contained)
│   └── [feature]/
│       ├── [feature].controller.ts
│       ├── [feature].service.ts
│       ├── [feature].module.ts
│       ├── dto/
│       └── [feature].service.spec.ts
├── common/           # Shared: guards, decorators, filters, pipes
├── config/           # Config modules
└── main.ts
```

### Naming Conventions
- Files: `kebab-case.ts`
- Classes / Components: `PascalCase`
- Functions / Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case` (plural: `users`, `order_items`)
- API routes: `kebab-case` (`/api/user-profiles`, not `/api/userProfiles`)

### Code Quality Rules
- [ ] No `any` type in TypeScript (use `unknown` + type guard if needed)
- [ ] No commented-out code committed (use git to store history)
- [ ] No `console.log` in production code (use logger)
- [ ] Functions: max 30 lines, single responsibility
- [ ] Files: max 300 lines (split if larger)
- [ ] PR/commit: one logical change per commit

---

## 🔄 Git & Branch Rules

```
main          — production, protected
staging       — staging environment, protected  
develop       — integration branch
feature/[name]  — from develop, merge back to develop
fix/[name]      — bug fixes
chore/[name]    — non-code changes (docs, config)
```

### Commit Message Format (Conventional Commits)
```
type(scope): short description

Types: feat | fix | docs | style | refactor | test | chore | security | perf
Examples:
  feat(auth): add refresh token rotation
  fix(cart): correct total rounding for decimal prices
  security(api): add rate limiting to auth endpoints
  docs(api): update swagger for payment endpoints
  perf(db): add index on orders.user_id
```

---

## 🚀 Definition of Done

A change is NOT done until ALL of these are true:

```
Code
  □ All tasks in tasks.md checked off
  □ No TypeScript errors (tsc --noEmit passes)
  □ Linter passes (eslint --max-warnings 0)

Tests
  □ All tests green (no skipped tests without comment)
  □ New tests written per Testing Rules
  □ Coverage not regressed

Security
  □ Security checklist completed
  □ No secrets in code

Error Handling
  □ All error states handled (loading, error, empty)
  □ No silent error swallowing

Documentation
  □ CHANGELOG.md updated
  □ README.md updated if needed
  □ API docs updated if endpoints changed
  □ .env.example updated if new env vars

OpenSpec
  □ /opsx:archive run
  □ Spec accurate (update if deviated)
```

---

## 📐 Project-Specific Notes

> ✏️ Add project-specific rules here that override or extend the defaults above.
> Examples:
> - "We use Resend for email (not Nodemailer)"  
> - "All monetary values stored as integers (cents), never floats"
> - "Vietnamese content must support UTF-8 special chars — test with ắ ở ừ"
> - "Mobile-first: test all UI on 375px viewport before PR"
> - "Our SLA: API response < 300ms. Alert if P95 > 500ms"

---

*AGENTS.md v2.0 — Best Practice Template · OpenSpec + AG Kit + Neural Memory*
*Update this file when project conventions change. Commit every update.*
