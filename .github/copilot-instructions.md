# Copilot Instructions for Scrap-module

## 🚀 Session Management

### Quick Start on New Session
When user types **"status update"**, immediately:
1. Load and restore `backup-status.json`
2. Display project state overview
3. Show current phase, metrics, and known issues
4. List next steps
5. Wait for next instruction

This is the primary restore mechanism for continuity.

## Project Purpose
Scrap-module is a web scraping utility built as a reusable module for multiple applications. It enables users to:
1. Input URLs and specify desired output file format
2. Preview the first 5 scraped results for validation
3. Generate the final output file after user confirmation

**Key constraint**: Always prioritize data validation before file generation - preview results must be confirmed by the client/user before proceeding.

## Architecture & Key Files

### Next.js Frontend Structure
- **[src/app/layout.tsx](src/app/layout.tsx)**: Root layout with metadata configuration
- **[src/app/page.tsx](src/app/page.tsx)**: Homepage (currently placeholder, will house scraping UI)
- **[src/app/globals.css](src/app/globals.css)**: Global Tailwind styling

### Configuration Files
- **[tsconfig.json](tsconfig.json)**: Strict TypeScript with path alias `@/*` → `src/*`
- **[package.json](package.json)**: Node 20+ required; includes AI SDK dependencies (Anthropic, OpenAI)
- **[CLAUDE.md](CLAUDE.md)**: Project specification and development notes

## Tech Stack & Dependencies
- **Framework**: Next.js 16 with React 19 (latest stable)
- **Styling**: Tailwind CSS 4
- **AI Integration**: Anthropic SDK + OpenAI SDK (for multi-LLM support)
- **Backend Services**: Supabase for data persistence
- **Language**: TypeScript (strict mode enforced)

## Development Workflows

### Local Development
```bash
npm run dev  # Start dev server at http://localhost:3010
npm run build  # Production build
npm run start  # Run production server
npm run lint  # Run ESLint checks
```

### Code Quality Standards
- **Strict TypeScript**: No `any` types; strict null checks enabled
- **Module aliases**: Use `@/components`, `@/lib`, etc. instead of relative imports
- **Code style**: Follow Next.js conventions; ESLint config includes `eslint-config-next`

## Project Patterns to Follow

### Component Structure
Create feature components in `src/app/` subdirectories or extract to a `src/components/` folder for reusability. Keep layout and page components focused on structure; delegate logic to custom hooks or utility functions.

### API Integration Points
- **Anthropic SDK**: For advanced AI-powered scraping logic
- **OpenAI SDK**: Fallback/alternative LLM support for scraping analysis
- **Supabase**: Store scraping jobs and user validation history

### Validation & Preview Workflow
1. Accept URL + format inputs from user
2. Perform scraping (use AI models if needed for parsing complex pages)
3. Return **first 5 results** for preview
4. Wait for user confirmation (critical step)
5. Only generate full output file after confirmation

## Critical Notes for AI Agents
- **Do NOT skip validation**: The preview-then-confirm pattern is core to the module's design
- **Output formats matter**: Support multiple formats (JSON, CSV, XML, etc.); parametrize output generation
- **Error handling**: Scraping can fail gracefully (bad URLs, blocked requests); surface errors clearly to users
- **No hardcoding**: Keep scraping logic configurable; avoid site-specific hacks unless documented
- **Test critical paths**: Especially the validation flow—data integrity depends on accurate previews

## Related Context
Referenced similar module: OCR-parse (multi-application utility pattern)
