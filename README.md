# NDC Quantity Calculator

A fast, AI-accelerated tool for calculating medication dispense quantities and matching prescriptions with valid National Drug Codes (NDCs). Built for Foundation Health to improve prescription fulfillment accuracy and reduce claim rejections.

## Overview

The NDC Quantity Calculator helps pharmacists and pharmacy technicians:

- Match prescriptions to valid NDCs from the FDA NDC Directory
- Calculate accurate dispense quantities based on SIG (prescription instructions) and days' supply
- Identify inactive NDCs and highlight overfill/underfill scenarios
- Normalize drug names using RxNorm API integration

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Runtime:** Node.js (Edge runtime where applicable)
- **UI:** React 19, Tailwind CSS 4, Radix UI primitives, shadcn/ui components, lucide-react icons
- **State Management:** React Query v5, tRPC v11 (client/react/server), superjson
- **Authentication:** next-auth v5 (Auth.js) with @auth/drizzle-adapter (optional)
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod schemas, environment variables via @t3-oss/env-nextjs
- **Charts & UX:** recharts, sonner (toasts)
- **Utilities:** date-fns, class-variance-authority, clsx

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.20.0+ (package manager)
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ndc-quantity-calculator
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local` (if available)
   - Configure required environment variables (see `src/env.js` for schema)

4. Set up the database:

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Or push schema directly (development)
pnpm db:push
```

5. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├─ page.tsx                         # Landing page (/)
├─ login/
│  └─ page.tsx                      # Login page (/login)
└─ calculator/
   ├─ page.tsx                      # Calculator form hub (/calculator)
   ├─ [id]/
   │  └─ page.tsx                   # Results page with tabs (/calculator/[id])
   └─ history/
      ├─ page.tsx                   # Calculation history (/calculator/history)
      └─ [id]/
         └─ page.tsx                # Read-only history view (/calculator/history/[id])

src/
├─ components/
│  ├─ ui/                           # shadcn/ui primitives
│  ├─ layout/                       # Header, Footer, AppShell
│  └─ feedback/                     # Toaster, Skeletons, EmptyState
├─ features/
│  └─ calculator/
│     ├─ components/                # Calculator-specific components
│     ├─ hooks/                     # Custom React hooks
│     ├─ server/                    # Server actions and loaders
│     └─ utils/                     # Calculation utilities
├─ lib/
│  ├─ db.ts                         # Database client (Drizzle)
│  ├─ auth.ts                       # Authentication setup
│  └─ utils.ts                      # Shared utilities
├─ server/
│  ├─ api/                          # tRPC routers
│  ├─ auth/                         # Auth configuration
│  └─ db/                           # Database schema
└─ styles/
   └─ globals.css                   # Global styles
```

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm preview` - Build and preview production build
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check` - Run lint and typecheck
- `pnpm format:check` - Check code formatting
- `pnpm format:write` - Format code with Prettier
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database (dev)
- `pnpm db:studio` - Open Drizzle Studio

## Key Features

### Calculation Flow

1. **Input Form** (`/calculator`)
   - Enter drug name or NDC
   - Provide SIG (prescription instructions)
   - Specify days' supply
   - Submit to create calculation

2. **Results Page** (`/calculator/[id]`)
   - Single canonical results page per calculation
   - Tabbed interface: Summary, NDC, Quantity, Warnings, JSON
   - URL-based tab navigation via `?tab=` query parameter
   - Default tab: `summary`

3. **History** (`/calculator/history`)
   - View past calculations
   - Read-only access to historical results

### Core Functionality

- **RxNorm Integration:** Normalizes drug names to RxCUI
- **FDA NDC Directory:** Retrieves valid NDCs and package sizes
- **Quantity Math:** Deterministic calculation of dispense quantities
- **AI Assist:** Optional AI-powered ranking for edge cases
- **Warnings System:** Highlights inactive NDCs, overfills, and underfills
- **Export Options:** Copy JSON or export to JSON/CSV formats

### Database

- Use Drizzle ORM for all database operations
- Run migrations via `pnpm db:generate` and `pnpm db:migrate`
- Use `pnpm db:studio` for database inspection

## Deployment

The application can be deployed to any platform that supports Next.js:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Docker** containers
- Other Node.js hosting platforms

Ensure environment variables are configured in your deployment platform.

## License
