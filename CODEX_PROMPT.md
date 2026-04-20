# Build Task: git-history-search

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: git-history-search
HEADLINE: Git History Search — "find all commits that touched the auth flow" via natural language
WHAT: Connect GitHub repo. Ask "which PRs fixed auth bugs" or "when did we add rate limiting" in English. AI searches commit msgs + diffs + issue titles.
WHY: git-log is a grep contest. AI+semantic search is the unlock. Investigating prod bugs or onboarding = huge time saver.
WHO PAYS: Staff engineers onboarding + debugging
NICHE: dev-productivity
PRICE: $$9/mo per repo, $39/mo for 10 repos/mo

ARCHITECTURE SPEC:
Next.js app with GitHub OAuth integration that indexes repository data (commits, PRs, issues) into a vector database for semantic search. Users authenticate, connect repos, and query their git history using natural language through an AI-powered search interface.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/search/page.tsx
- app/api/auth/github/route.ts
- app/api/repos/sync/route.ts
- app/api/search/route.ts
- app/api/webhooks/lemonsqueezy/route.ts
- lib/github.ts
- lib/vector-db.ts
- lib/openai.ts
- lib/lemonsqueezy.ts
- components/repo-selector.tsx
- components/search-interface.tsx
- components/pricing-cards.tsx

DEPENDENCIES: next, tailwindcss, @auth/nextjs, @octokit/rest, openai, pinecone-client, @lemonsqueezy/lemonsqueezy.js, prisma, @prisma/client, lucide-react, framer-motion

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
