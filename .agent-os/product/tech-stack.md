# Technical Stack

## Frontend Architecture
- **Application Framework:** Next.js 15+ with App Router
- **Language:** TypeScript 5+
- **Build Tool:** Turbopack (Next.js native)
- **Import Strategy:** Node.js ES modules
- **Package Manager:** npm
- **Node Version:** 22 LTS

## Database & Storage
- **Primary Database:** PostgreSQL 17+ 
- **ORM:** Drizzle ORM (existing in project)
- **File Storage:** R2 (Cloudflare) for user files and references
- **CDN:** CloudFront for asset delivery
- **Asset Access:** Private with signed URLs for user content

## UI & Styling
- **CSS Framework:** TailwindCSS 4.0+
- **UI Component Library:** shadcn/ui
- **Font Provider:** Google Fonts (self-hosted)
- **Icon Library:** Lucide React components

## AI Integration
- **AI Providers:** OpenAI GPT-4, Claude (Anthropic), custom provider support
- **API Layer:** tRPC for type-safe API routes (existing)
- **Text Processing:** Native JavaScript for content analysis
- **File Processing:** Server-side text extraction and analysis

## Authentication & Security
- **Authentication:** Better Auth (existing in project)
- **Session Management:** Database-stored sessions
- **File Security:** Signed URLs with user-based access control
- **Data Privacy:** User-scoped data isolation

## Deployment & Operations
- **Application Hosting:** Coolify on Hetzner
- **Database Hosting:** Managed PostgreSQL
- **Database Backups:** Daily automated backups
- **CI/CD Platform:** GitHub Actions
- **CI/CD Trigger:** Push to main/staging branches
- **Environment Management:** Staging and production branches

## Development Tools
- **Code Quality:** Biome for linting and formatting (existing)
- **Type Checking:** TypeScript strict mode
- **Testing:** Tests run before deployment
- **Database Management:** Drizzle Studio for development