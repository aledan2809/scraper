import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { aiRouter } from "./ai-router";

interface ScrapedItem {
  title?: string;
  description?: string;
  url?: string;
  [key: string]: any;
}

// Max number of redirect hops we follow (each re-validated against the guard).
const MAX_REDIRECTS = 5;

/**
 * Decide whether a resolved IP address points at a private / loopback /
 * link-local / reserved range that must never be reachable from this server.
 * Covers the cloud-metadata endpoint (169.254.169.254) and IPv4-mapped IPv6.
 */
function isBlockedIp(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return isBlockedIpv4(address);
  }

  if (family === 6) {
    const lower = address.toLowerCase();

    // IPv6 loopback
    if (lower === "::1" || lower === "::") {
      return true;
    }
    // Unique-local fc00::/7 (fc.. + fd..) and link-local fe80::/10
    if (/^f[cd][0-9a-f]{0,2}:/.test(lower) || /^fe[89ab][0-9a-f]?:/.test(lower)) {
      return true;
    }
    // IPv4-mapped / IPv4-compatible IPv6 — validate the embedded IPv4 against
    // the same rules so it cannot smuggle a private target. Node's URL parser
    // normalises ::ffff:127.0.0.1 to the hex form ::ffff:7f00:1, so handle BOTH
    // the dotted-decimal and the hex-compressed representations.
    const dotted = lower.match(/(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/);
    if (dotted && isBlockedIpv4(dotted[1])) {
      return true;
    }
    const hexMapped = lower.match(/(?:::ffff:|::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMapped) {
      const hi = parseInt(hexMapped[1], 16);
      const lo = parseInt(hexMapped[2], 16);
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      if (isBlockedIpv4(v4)) {
        return true;
      }
    }
    return false;
  }

  // Not a parseable IP literal — treat as blocked (fail closed).
  return true;
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // malformed → fail closed
  }
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT

  return false;
}

/**
 * Validate a URL against SSRF attacks.
 *
 * Unlike the previous text-only check, this RESOLVES the hostname via DNS and
 * rejects on the *resolved* IP if it falls in any private/loopback/link-local/
 * reserved range — defeating DNS-rebinding, numeric/octal/hex IP encodings, and
 * IPv6 forms. Each redirect hop is re-validated through this same function.
 */
async function validateUrlForScraping(url: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  // Only allow HTTP and HTTPS protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  // Strip brackets from IPv6 literals before normalising
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Block localhost / loopback names outright
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed for security reasons");
  }
  // Block *.local mDNS names (often resolve to internal hosts)
  if (hostname === "local" || hostname.endsWith(".local")) {
    throw new Error("Local network hostnames are not allowed");
  }

  // If the hostname is already an IP literal, validate it directly.
  const literalFamily = isIP(hostname);
  if (literalFamily !== 0) {
    if (isBlockedIp(hostname)) {
      throw new Error("Private or reserved IP addresses are not allowed");
    }
    return;
  }

  // Reject decimal/octal/hex single-integer IP encodings (e.g. 2130706433,
  // 0x7f000001, 0177.0.0.1) — these are not valid DNS names. A hostname with no
  // alphabetic character and only digits/dots/hex prefixes is an encoded IP.
  if (/^(0x[0-9a-f]+|0[0-7]*|\d+)(\.(0x[0-9a-f]+|0[0-7]*|\d+))*$/.test(hostname)) {
    throw new Error("Numeric-encoded IP addresses are not allowed");
  }

  // Resolve the hostname and validate EVERY resolved address. fetch() may pick
  // any of them, so a single private result must block the whole request.
  let resolved: { address: string; family: number }[];
  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new Error("Could not resolve hostname");
  }

  if (resolved.length === 0) {
    throw new Error("Could not resolve hostname");
  }

  for (const { address } of resolved) {
    if (isBlockedIp(address)) {
      throw new Error("Hostname resolves to a private or reserved IP address");
    }
  }
}

/**
 * Scrape data from a URL using Claude's vision and analysis capabilities
 * Returns structured data that can be formatted for various output types
 */
export async function scrapeUrl(url: string): Promise<ScrapedItem[]> {
  try {
    // Fetch the URL content with MANUAL redirect handling: validate the target
    // before each hop so a 3xx cannot bounce into an internal/metadata target.
    let currentUrl = url;
    let response: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // Re-validate (DNS-resolve + IP guard) every hop, including the first.
      await validateUrlForScraping(currentUrl);

      const hopResponse = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      // Follow 3xx redirects ourselves, re-validating the Location target.
      if (hopResponse.status >= 300 && hopResponse.status < 400) {
        const location = hopResponse.headers.get("location");
        if (!location) {
          throw new Error(`Redirect response missing Location header`);
        }
        if (hop === MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }
        // Resolve relative redirects against the current URL.
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      response = hopResponse;
      break;
    }

    if (!response) {
      throw new Error("Too many redirects");
    }

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
