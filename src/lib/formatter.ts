export type OutputFormat = "json" | "csv" | "xml";
export type ScrapedItem = Record<string, unknown>;

export interface TemplateFile {
  name: string;
  content: string;
}

/**
 * Parse template file based on its format
 */
function parseTemplate(templateFile: TemplateFile): any {
  try {
    const extension = templateFile.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'json':
        return JSON.parse(templateFile.content);
      case 'csv':
        // For CSV templates, extract headers from first line
        const lines = templateFile.content.trim().split('\n');
        return lines[0]?.split(',').map(h => h.trim()) || [];
      case 'xml':
        // For XML templates, just store as is for structure reference
        return templateFile.content;
      default:
        return null;
    }
  } catch (error) {
    console.warn('Failed to parse template file:', error);
    return null;
  }
}

/**
 * Map scraped data to template structure for JSON
 */
function mapToTemplate(items: ScrapedItem[], template: any): ScrapedItem[] {
  if (!template || typeof template !== 'object') {
    return items;
  }

  // If template is an array, use first item as structure
  const structure = Array.isArray(template) && template.length > 0
    ? template[0]
    : template;

  return items.map(item => {
    const mapped: ScrapedItem = {};

    // Map template fields to scraped data
    for (const [templateKey, templateValue] of Object.entries(structure)) {
      // Try to find matching field in scraped data (case-insensitive)
      const scrapedKey = Object.keys(item).find(key =>
        key.toLowerCase() === templateKey.toLowerCase()
      );

      if (scrapedKey) {
        mapped[templateKey] = item[scrapedKey];
      } else {
        // Use default value from template or empty string
        mapped[templateKey] = templateValue || '';
      }
    }

    return mapped;
  });
}

/**
 * Convert scraped items to JSON format
 */
function formatAsJson(items: ScrapedItem[], templateFile?: TemplateFile): string {
  let dataToFormat = items;

  if (templateFile) {
    const template = parseTemplate(templateFile);
    if (template) {
      dataToFormat = mapToTemplate(items, template);
    }
  }

  return JSON.stringify(dataToFormat, null, 2);
}

/**
 * Convert scraped items to CSV format
 */
function formatAsCsv(items: ScrapedItem[], templateFile?: TemplateFile): string {
  if (items.length === 0) return "";

  let keys: string[];

  // If template file is provided and it's a CSV, use template headers
  if (templateFile) {
    const template = parseTemplate(templateFile);
    if (Array.isArray(template) && template.length > 0) {
      keys = template;
    } else {
      // Fallback to scraped data keys
      keys = Array.from(
        new Set(items.flatMap((item) => Object.keys(item)))
      );
    }
  } else {
    // Get all unique keys from all items
    keys = Array.from(
      new Set(items.flatMap((item) => Object.keys(item)))
    );
  }

  // Create header row
  const header = keys.join(",");

  // Create data rows, escaping commas and quotes
  const rows = items.map((item) => {
    return keys
      .map((key) => {
        const value = item[key] ?? "";
        const stringValue = String(value);

        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * Convert scraped items to XML format
 */
function formatAsXml(items: ScrapedItem[], templateFile?: TemplateFile): string {
  const escapeXml = (str: string): string => {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n';

  for (const item of items) {
    xml += "  <item>\n";
    for (const [key, value] of Object.entries(item)) {
      const safeKey = escapeXml(key);
      const safeValue = escapeXml(String(value));
      xml += `    <${safeKey}>${safeValue}</${safeKey}>\n`;
    }
    xml += "  </item>\n";
  }

  xml += "</items>";
  return xml;
}

/**
 * Format scraped items according to specified output format
 */
export function formatOutput(
  items: ScrapedItem[],
  format: OutputFormat,
  templateFile?: TemplateFile
): string {
  switch (format) {
    case "json":
      return formatAsJson(items, templateFile);
    case "csv":
      return formatAsCsv(items, templateFile);
    case "xml":
      return formatAsXml(items, templateFile);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: OutputFormat): string {
  switch (format) {
    case "json":
      return ".json";
    case "csv":
      return ".csv";
    case "xml":
      return ".xml";
    default:
      return ".txt";
  }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: OutputFormat): string {
  switch (format) {
    case "json":
      return "application/json";
    case "csv":
      return "text/csv";
    case "xml":
      return "application/xml";
    default:
      return "text/plain";
  }
}
