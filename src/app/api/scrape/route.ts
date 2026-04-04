import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl, validateScrapedData } from "@/lib/scraper";
import { getClientIP, isRateLimited, getRateLimitInfo } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitInfo = getRateLimitInfo(clientIP);

    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          details: `Maximum ${rateLimitInfo.limit} requests per hour allowed.`
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString()
          }
        }
      );
    }
    const formData = await request.formData();
    const url = formData.get("url") as string;
    const format = formData.get("format") as string;
    const file = formData.get("file") as File | null;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // If file is uploaded, read it
    let fileContent: string | null = null;
    if (file) {
      fileContent = await file.text();
    }

    // Scrape the URL
    const items = await scrapeUrl(url);

    // Validate scraped data
    if (!validateScrapedData(items)) {
      return NextResponse.json(
        { error: "Failed to extract valid data from URL" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      preview: items,
      count: items.length,
      fileInfo: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
      } : null,
      message: `Found ${items.length} items. Please review and confirm before generating the final file.`,
    });

    // Add rate limit headers to response
    const updatedRateLimitInfo = getRateLimitInfo(clientIP);
    response.headers.set('X-RateLimit-Limit', updatedRateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', updatedRateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(updatedRateLimitInfo.resetTime).toISOString());

    return response;
  } catch (error) {
    console.error("Scraping error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown scraping error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
