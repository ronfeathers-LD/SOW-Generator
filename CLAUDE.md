# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOW Generator is an internal tool for creating Statement of Work documents with AI-powered content generation, Salesforce CRM integration, and multi-stage approval workflows. Built for LeanData's Professional Services team.

## Commands

- `npm run dev` — Start development server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run postinstall` — Install Puppeteer browsers for PDF generation

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL with RLS), migrations in `supabase/migrations/`
- **Auth**: NextAuth.js v4 with Google OAuth provider, JWT strategy
- **Styling**: Tailwind CSS 3 with `@tailwindcss/typography` plugin
- **Rich Text**: TipTap editor with table extensions
- **PDF**: Puppeteer (puppeteer-core + @sparticuz/chromium for production)
- **AI**: Google Gemini via `@google/generative-ai`
- **CRM**: Salesforce via jsforce
- **External**: Slack (webhooks + bot), Google Drive, Avoma, Nodemailer

## Architecture

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

### Supabase Client Patterns
- `src/lib/supabase.ts` — Browser client (anon key). Also defines shared TypeScript interfaces (SOW, User, Comment, etc.).
- `src/lib/supabase-server.ts` — Server client. `createServerSupabaseClient()` uses service role for authenticated users (bypasses RLS). `createServiceRoleClient()` for admin operations.
- API routes and server components use the server client; client components use the browser client.

### Authentication Flow
- `src/lib/auth.ts` — NextAuth config with Google provider. Falls back to local auth (`src/lib/local-auth.ts`, `src/lib/local-db-adapter.ts`) when Google credentials aren't configured.
- `src/app/providers.tsx` — SessionProvider wrapper (client-side).
- User roles: admin, manager, pmo, user. Role-based access controls approval workflows and admin pages.

### Key Domains
- **SOW lifecycle**: Create (`/sow/new`) → Edit (`/sow/[id]/edit`) → Preview/Print (`/print-sow/[id]`) → PDF generation → Approval workflow → Google Drive upload
- **Approval workflow**: Multi-stage approval with Slack notifications (`src/lib/approval-workflow-service.ts`, `src/lib/approval-workflow-rules.ts`)
- **Change Orders**: Amendments to existing SOWs (`/change-orders`, `src/components/change-orders/`)
- **PM Hours Removal**: Special approval flow for removing PM hours from SOWs
- **Pricing Calculator**: Role-based pricing with configurable rates (`/pricing-calculator`)
- **AI Content Generation**: Gemini analyzes Avoma transcriptions + Google Drive documents to generate SOW objectives via a wizard (`src/components/sow/objectives-wizard/`)

### API Routes
All under `src/app/api/`. Major groups:
- `sow/[id]/` — CRUD, approvals, versions, revisions, changelog, PDF generation
- `salesforce/` — Customer info, billing, opportunities, account contacts
- `admin/` — Config management for Salesforce, Slack, Gemini, Google Drive, Avoma, users, pricing roles, products
- `slack/` — User lookup, team messages, workspace users
- `google-drive/` — Search, upload, folder browsing, content extraction
- `avoma/` — Meeting transcription search and retrieval

### SOW Form Components
`src/components/SOWForm.tsx` is the main form orchestrator. Tab-based UI delegates to specialized components in `src/components/sow/`:
- CustomerInformationTab, BillingInformationTab, ProjectOverviewTab
- ObjectivesTab (with ObjectivesWizard for AI generation)
- TeamRolesTab, ContentEditingTab, PricingDisplay
- MultiStepApprovalWorkflow, ChangelogTab

### PDF Generation
`src/lib/pdf-generator.ts` uses Puppeteer to render the print template (`src/app/print-sow/`) to PDF. Supports both SOW and Change Order PDFs. In production, uses `@sparticuz/chromium`; locally uses system Chrome.

## Environment Variables

Required variables are in `.env.local`. Key groups: Supabase (URL, anon key, service role key), NextAuth (secret, Google OAuth), Salesforce, Slack (webhook, bot token), Avoma API, Vercel Blob storage. See README.md for the full list.
