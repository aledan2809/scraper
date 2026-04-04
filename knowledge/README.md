# Knowledge Base — Scrap-module

This folder contains project documentation and reference materials.

## Current Files

- `README.md` - This overview file
- **Coming next:** API specifications, user guides, technical docs

## Project Overview

**Scrap-Module** is a secure web scraping tool that:
- Extracts structured data from websites using AI (Claude 3.5 Sonnet)
- Exports data in JSON, CSV, XML formats
- Supports template files for output structure
- Implements security features (SSRF protection, rate limiting)
- Provides user-friendly Next.js interface

## Technical Architecture

```
Frontend (Next.js + React + Tailwind)
    ↓
API Routes (/api/scrape, /api/generate)
    ↓
AI Processing (Anthropic Claude SDK)
    ↓
Data Formatting (JSON/CSV/XML)
    ↓
File Generation & Download
```

## Security Features

- **SSRF Protection**: Blocks localhost/private IPs
- **Rate Limiting**: 10 requests/hour per IP
- **Input Validation**: URL format checking
- **Template Security**: Safe file parsing

## Usage Patterns

1. **Basic Scraping**: URL → AI extraction → Export
2. **Template-based**: URL + Template → Structured export
3. **Batch Processing**: Multiple formats from same data

## Integration Points

- **Anthropic API**: Core AI processing
- **Supabase**: Database (configured, ready for user features)
- **Next.js API**: Backend processing and file generation

## Known Limitations

- Max 5 items per scrape (configurable in future)
- 8KB HTML content limit for AI processing
- Public websites only (no authentication)

---

*Updated after security audit and feature improvements (2026-03-22)*
