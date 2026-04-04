import { NextRequest, NextResponse } from "next/server";
import { formatOutput, getMimeType, getFileExtension } from "@/lib/formatter";
import type { OutputFormat, ScrapedItem } from "@/lib/formatter";
import { getClientIP, isRateLimited, getRateLimitInfo } from "@/lib/rate-limit";

interface GenerateRequest {
  items: ScrapedItem[];
  format: OutputFormat;
  filename?: string;
  templateFile?: {
    name: string;
    content: string;
  };
}

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
    const body: GenerateRequest = await request.json();
    const { items, format, filename, templateFile } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!format || !["json", "csv", "xml"].includes(format)) {
      return NextResponse.json(
        { error: "Valid format (json, csv, xml) is required" },
        { status: 400 }
      );
    }

    // Format the output with template file
    let content = formatOutput(items, format, templateFile);

    // If template file was provided, add metadata info
    if (templateFile) {
      const info = `\n\n/* Generated using template: ${templateFile.name} */`;
      if (format !== "json") {
        // For CSV and XML, add as comment
        content += info;
      }
    }

    const mimeType = getMimeType(format);
    const extension = getFileExtension(format);
    const defaultFilename = `scraped_data_${Date.now()}${extension}`;
    const finalFilename = filename || defaultFilename;

    // Get updated rate limit info
    const updatedRateLimitInfo = getRateLimitInfo(clientIP);

    // Return as downloadable file
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
        "Content-Length": content.length.toString(),
        "X-RateLimit-Limit": updatedRateLimitInfo.limit.toString(),
        "X-RateLimit-Remaining": updatedRateLimitInfo.remaining.toString(),
        "X-RateLimit-Reset": new Date(updatedRateLimitInfo.resetTime).toISOString(),
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
