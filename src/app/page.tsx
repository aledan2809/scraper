"use client";

import { useState } from "react";
import type { OutputFormat, ScrapedItem } from "@/lib/formatter";

export default function Home() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("json");
  const [filename, setFilename] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScrapedItem[] | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      alert("Please enter a URL");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("url", url);
      formData.append("format", format);
      if (uploadedFile) {
        formData.append("file", uploadedFile);
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
      setPreview(data.preview);
      setIsConfirmed(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setPreview(null);
    setIsConfirmed(false);
  };

  const handleDownload = async () => {
    if (!preview) {
      setError("No preview data available");
      return;
    }
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: preview,
          format,
          filename,
          templateFile: uploadedFile ? {
            name: uploadedFile.name,
            content: await uploadedFile.text(),
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("File generation failed");
      }

      const blob = await response.blob();
      const url_download = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url_download;
      a.download =
        filename ||
        `scraped_data_${Date.now()}.${format === "xml" ? "xml" : format === "csv" ? "csv" : "json"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url_download);
      document.body.removeChild(a);
      
      reset();
      setUrl("");
      setFilename("");
      setUploadedFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Scrap-module
          </h1>
          <p className="text-gray-400 text-lg">
            Extract and export data from websites in multiple formats
          </p>
        </div>

        {/* Input Form */}
        {!preview && (
          <form onSubmit={handleScrape} className="bg-gray-800 rounded-lg p-8 shadow-2xl mb-8">
            <div className="mb-6">
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Website URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition placeholder-gray-500"
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="format" className="block text-sm font-medium mb-2">
                Output Format
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value as OutputFormat);
                  localStorage.setItem("selectedFormat", e.target.value);
                }}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition"
                disabled={loading}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xml">XML</option>
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="file" className="block text-sm font-medium mb-2">
                Upload Template File (Optional)
              </label>
              <input
                id="file"
                type="file"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition file:bg-blue-600 file:border-0 file:rounded file:px-4 file:py-2 file:text-white file:cursor-pointer"
                disabled={loading}
                accept=".json,.csv,.xml,.txt"
              />
              {uploadedFile && (
                <p className="text-sm text-green-400 mt-2">
                  ✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition duration-200"
            >
              {loading ? "Scraping..." : "Scrape Website"}
            </button>
          </form>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-8">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Preview Section */}
        {preview && preview.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">
              Preview - {preview.length} items found
            </h2>

            {/* Items Preview */}
            <div className="space-y-4 mb-8 max-h-96 overflow-y-auto">
              {preview.map((item, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="text-sm text-gray-300">
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key} className="mb-2">
                        <span className="font-semibold text-blue-400">{key}:</span>{" "}
                        <span className="text-gray-200 break-words">
                          {String(value).substring(0, 100)}
                          {String(value).length > 100 ? "..." : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Confirmation Section */}
            {!isConfirmed ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Please review the preview above. If everything looks correct, confirm to proceed with file generation.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={reset}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition duration-200"
                  >
                    Confirm & Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="filename" className="block text-sm font-medium mb-2">
                    Filename (optional)
                  </label>
                  <input
                    id="filename"
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder={`scraped_data_${Date.now()}`}
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition placeholder-gray-500"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={reset}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold transition duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-3 rounded-lg font-semibold transition duration-200"
                  >
                    Download {format.toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
