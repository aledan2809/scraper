# Scrap-Module

A powerful web scraping tool that extracts structured data from websites and exports it in multiple formats (JSON, CSV, XML).

![Scrap-Module Logo](https://img.shields.io/badge/Scrap--Module-v1.0-blue?style=for-the-badge)

## 🚀 Features

- **Web Scraping**: Extract data from any public website using AI-powered analysis
- **Multiple Output Formats**: Export to JSON, CSV, or XML
- **Template Support**: Use template files to structure your output data
- **Preview Before Export**: Review extracted data before generating files
- **Rate Limited**: Secure with built-in rate limiting (10 requests/hour per IP)
- **SSRF Protection**: Secure URL validation prevents internal network access

## 🛠 Technology Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **AI Engine**: Anthropic Claude 3.5 Sonnet
- **Backend**: Next.js API Routes
- **Database**: Supabase (configured, ready for features like user history)
- **Language**: TypeScript

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Scrap-module
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your API keys:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   OPENAI_API_KEY=sk-proj-your-key-here  # Optional, for future features
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   PORT=3010
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3010`

## 🎯 Usage

### Basic Scraping

1. **Enter Website URL**: Input the URL of the website you want to scrape
2. **Select Output Format**: Choose between JSON, CSV, or XML
3. **Optional Template**: Upload a template file to structure your output
4. **Scrape**: Click "Scrape Website" to extract data
5. **Preview**: Review the extracted data (up to 5 items)
6. **Download**: Confirm and download your file

### Template Files

Upload template files to structure your output data:

**JSON Template** (`template.json`):
```json
{
  "title": "",
  "description": "",
  "url": "",
  "price": ""
}
```

**CSV Template** (`template.csv`):
```csv
title,description,url,price
```

**XML Template** (`template.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<items>
  <item>
    <title></title>
    <description></description>
  </item>
</items>
```

## 🔧 API Endpoints

### POST `/api/scrape`

Scrapes a website and returns preview data.

**Request** (FormData):
- `url`: Website URL (required)
- `format`: Output format - json/csv/xml (required)
- `file`: Template file (optional)

**Response**:
```json
{
  "success": true,
  "preview": [...],
  "count": 5,
  "fileInfo": { "name": "...", "size": 1024, "type": "application/json" },
  "message": "Found 5 items..."
}
```

### POST `/api/generate`

Generates and downloads the final file.

**Request** (JSON):
```json
{
  "items": [...],
  "format": "json",
  "filename": "my-data.json",
  "templateFile": {
    "name": "template.json",
    "content": "..."
  }
}
```

**Response**: Downloadable file blob

## 🛡 Security Features

- **Rate Limiting**: 10 requests per hour per IP address
- **SSRF Protection**: Blocks localhost and private network access
- **URL Validation**: Only HTTP/HTTPS protocols allowed
- **Input Sanitization**: Validates all user inputs

## 🚦 Rate Limits

- **Scraping**: 10 requests per hour per IP
- **File Generation**: 10 requests per hour per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: When the limit resets

## 🔍 Error Handling

Common error responses:

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "details": "Maximum 10 requests per hour allowed."
}
```

```json
{
  "error": "Private network IP addresses are not allowed"
}
```

## 🎨 Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main UI component
│   ├── layout.tsx            # App layout
│   ├── globals.css           # Global styles
│   └── api/
│       ├── scrape/route.ts   # Scraping endpoint
│       └── generate/route.ts # File generation endpoint
├── hooks/
│   └── useScraper.ts         # Custom React hook for scraping
└── lib/
    ├── scraper.ts            # AI scraping logic (Claude)
    ├── formatter.ts          # Data formatting utilities
    └── rate-limit.ts         # Rate limiting utilities
```

## 🌟 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing-feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

If you encounter any issues or have questions:

1. Check the error messages in the browser console
2. Verify your API keys are correctly set
3. Ensure the website you're scraping is publicly accessible
4. Check rate limiting headers if requests are failing

---

**Happy Scraping! 🚀**