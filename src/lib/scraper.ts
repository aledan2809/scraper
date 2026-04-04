import { aiRouter } from "./ai-router";

interface ScrapedItem {
  title?: string;
  description?: string;
  url?: string;
  [key: string]: any;
}

/**
 * Validate URL for security against SSRF attacks
 */
function validateUrlForScraping(url: string): void {
  const parsedUrl = new URL(url);

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  // Block localhost and local network IP ranges
  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost variations
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    throw new Error("Localhost URLs are not allowed for security reasons");
  }

  // Block local network IP ranges
  const ip4LocalRanges = [
    /^10\./,         // 10.0.0.0/8
    /^172\.1[6-9]\./, // 172.16.0.0/12
    /^172\.2[0-9]\./, // 172.16.0.0/12
    /^172\.3[0-1]\./, // 172.16.0.0/12
    /^192\.168\./,   // 192.168.0.0/16
    /^169\.254\./,   // 169.254.0.0/16 (link-local)
  ];

  for (const range of ip4LocalRanges) {
    if (range.test(hostname)) {
      throw new Error("Private network IP addresses are not allowed");
    }
  }

  // Block common internal hostnames
  const internalHosts = ['internal', 'intranet', 'admin', 'management'];
  if (internalHosts.some(host => hostname.includes(host))) {
    throw new Error("Internal hostnames are not allowed");
  }
}

/**
 * Scrape data from a URL using Claude's vision and analysis capabilities
 * Returns structured data that can be formatted for various output types
 */
export async function scrapeUrl(url: string): Promise<ScrapedItem[]> {
  // Validate URL for security before making any requests
  validateUrlForScraping(url);

  try {
    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Use AIRouter to extract structured data from HTML
    const aiResponse = await aiRouter.chat({
      messages: [
        {
          role: "user",
          content: `Extract structured data from this HTML content. Return a JSON array of items, each with relevant fields (title, description, url, etc.). Extract up to 5 items maximum. Return ONLY valid JSON, no markdown formatting.

HTML Content:
${html.substring(0, 8000)}`,
        },
      ],
      provider: "auto",
      maxTokens: 1024,
      taskHint: "extraction",
    });

    // Extract JSON from response
    const jsonMatch = aiResponse.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    const items: ScrapedItem[] = JSON.parse(jsonMatch[0]);
    return items.slice(0, 5); // Return max 5 items
  } catch (error) {
    console.error("Scraping error:", error);
    throw error;
  }
}

/**
 * Validate scraped data has required structure
 */
export function validateScrapedData(items: ScrapedItem[]): boolean {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((item) => typeof item === "object" && item !== null)
  );
}
