import { useState, useCallback } from "react";
import type { OutputFormat, ScrapedItem } from "@/lib/formatter";

interface ScrapeState {
  loading: boolean;
  error: string | null;
  preview: ScrapedItem[] | null;
  isConfirmed: boolean;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  } | null;
}

export function useScraper() {
  const [state, setState] = useState<ScrapeState>({
    loading: false,
    error: null,
    preview: null,
    isConfirmed: false,
    fileInfo: null,
  });

  const scrape = useCallback(
    async (url: string, format: OutputFormat, file?: File) => {
      setState({ loading: true, error: null, preview: null, isConfirmed: false });

      try {
        const formData = new FormData();
        formData.append("url", url);
        formData.append("format", format);
        if (file) {
          formData.append("file", file);
        }

        const response = await fetch("/api/scrape", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Scraping failed");
        }

        const data = await response.json();
        setState({
          loading: false,
          error: null,
          preview: data.preview,
          isConfirmed: false,
          fileInfo: data.fileInfo,
        });

        return data.preview;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setState({
          loading: false,
          error: message,
          preview: null,
          isConfirmed: false,
          fileInfo: null,
        });
        throw error;
      }
    },
    []
  );

  const confirm = useCallback(() => {
    setState((prev) => ({ ...prev, isConfirmed: true }));
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      preview: null,
      isConfirmed: false,
      fileInfo: null,
    });
  }, []);

  const downloadFile = useCallback(
    async (filename?: string, format?: OutputFormat, templateFile?: File) => {
      if (!state.preview) {
        throw new Error("No preview data available");
      }

      try {
        // Prepare template file if provided
        let templateFileData = undefined;
        if (templateFile) {
          templateFileData = {
            name: templateFile.name,
            content: await templateFile.text(),
          };
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: state.preview,
            format: format || "json",
            filename,
            templateFile: templateFileData,
          }),
        });

        if (!response.ok) {
          throw new Error("File generation failed");
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          filename ||
          `scraped_data_${Date.now()}.${format === "xml" ? "xml" : format === "csv" ? "csv" : "json"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Download failed";
        setState((prev) => ({ ...prev, error: message }));
        throw error;
      }
    },
    [state.preview]
  );

  return {
    ...state,
    scrape,
    confirm,
    reset,
    downloadFile,
  };
}
