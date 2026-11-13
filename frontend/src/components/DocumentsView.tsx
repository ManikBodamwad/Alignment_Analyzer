import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { DocumentItem } from "../types";
import { DocumentIcon, SearchIcon, SparklesIcon } from "./icons";

const DOCUMENT_CATEGORIES = [
  "Annual Report / 10-K & Proxy",
  "Corporate Governance Guidelines",
  "Privacy & Data Protection Policy",
  "Community Standards & Safety Policy",
  "Transparency Report",
  "Advertising & Brand Safety Policy",
  "Creator Monetization Policy",
  "AI Governance Policy",
  "Employee & Workplace Policy",
  "Regulatory & Independent Report",
  "ESG & Sustainability Report",
];

export function DocumentsView(props: {
  companyId: number;
  assessmentPeriodId: number;
  fiscalYear: string;
  documents: DocumentItem[];
  onRefresh: () => void;
  onRunAnalysis: () => void;
}) {
  const {
    companyId,
    assessmentPeriodId,
    fiscalYear,
    documents,
    onRefresh,
    onRunAnalysis,
  } = props;

  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [docFy, setDocFy] = useState(fiscalYear || "FY2025");
  const [pubDate, setPubDate] = useState("2025-02-20");
  const [sourceUrl, setSourceUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [selectedDocDetails, setSelectedDocDetails] = useState<any | null>(null);
  const [ragQuery, setRagQuery] = useState("");
  const [ragCategoryFilter, setRagCategoryFilter] = useState("");
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [searchingRag, setSearchingRag] = useState(false);

  const handleFileUpload = async (ev: Event) => {
    ev.preventDefault();
    const formEl = ev.target as HTMLFormElement;
    const fileInput = formEl.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setUploadStatus("Error: Please select one or more files to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("company_id", String(companyId));
    formData.append("assessment_period_id", String(assessmentPeriodId));
    formData.append("category", category);
    formData.append("financial_year", docFy);
    formData.append("publication_date", pubDate);
    formData.append("source_url", sourceUrl);
    if (customTitle.trim()) {
      formData.append("title", customTitle.trim());
    }
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append("files", fileInput.files[i]);
    }

    try {
      setUploading(true);
      setUploadStatus("Extracting text, sanitizing, chunking & indexing vectors...");
      await api.uploadDocumentsForm(formData);
      setUploadStatus(
        "Successfully ingested and indexed document(s). Click 'Re-Run Diagnostic Analysis' to update alignment scores."
      );
      setCustomTitle("");
      fileInput.value = "";
      onRefresh();
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const inspectDoc = async (docId: number) => {
    const details = await api.getDocumentDetails(docId);
    setSelectedDocDetails(details);
  };

  const handleArchiveDoc = async (docId: number) => {
    await api.archiveDocument(docId);
    if (selectedDocDetails && selectedDocDetails.id === docId) {
      setSelectedDocDetails(null);
    }
    onRefresh();
  };

  const handleSearchRag = async (ev: Event) => {
    ev.preventDefault();
    if (!ragQuery.trim()) return;
    setSearchingRag(true);
    try {
      const res = await api.searchChunks(
        ragQuery,
        companyId,
        assessmentPeriodId,
        ragCategoryFilter || undefined
      );
      setRagResults(res);
    } finally {
      setSearchingRag(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1d1d1f]">
      {/* Upload Panel */}
      <div className="apple-card p-6 stagger-1 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-[#0071e3] flex items-center justify-center shrink-0">
                <DocumentIcon className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">
                Document Ingestion &amp; Metadata-Aware Indexing Pipeline
              </h2>
            </div>
            <p className="text-xs text-[#86868b] mt-1">
              Supported formats: <strong className="text-[#0071e3]">PDF, DOCX, TXT, CSV, XLSX, PPTX</strong> (with heading-preserving chunker and prompt-injection defense)
            </p>
          </div>
          <button
            onClick={onRunAnalysis}
            className="apple-btn-primary shrink-0"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Re-Run Diagnostic Analysis</span>
          </button>
        </div>

        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Select File(s) (Multiple Allowed)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx,.md"
                className="w-full text-xs text-[#515154] border border-black/10 rounded-xl p-2 bg-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Document Category
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-medium focus:outline-none focus:border-[#0071e3] focus:bg-white"
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onInput={(e: any) => setCustomTitle(e.target.value)}
                placeholder="e.g., FY2025 Form 10-K Governance Excerpt"
                className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Financial Year
              </label>
              <input
                type="text"
                value={docFy}
                onInput={(e: any) => setDocFy(e.target.value)}
                className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Publication Date
              </label>
              <input
                type="date"
                value={pubDate}
                onInput={(e: any) => setPubDate(e.target.value)}
                className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Source URL (Optional)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onInput={(e: any) => setSourceUrl(e.target.value)}
                placeholder="https://investor..."
                className="w-full text-xs border border-black/10 rounded-xl p-2.5 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={uploading}
                className="apple-btn-primary w-full"
              >
                {uploading ? "Processing Pipeline..." : "Upload & Index Documents"}
              </button>
            </div>
          </div>
        </form>

        {uploadStatus ? (
          <div className="p-3.5 rounded-xl bg-[#e8f2fe] border border-[#b3d7ff] text-xs text-[#0066cc] font-medium">
            {uploadStatus}
          </div>
        ) : null}
      </div>

      {/* Uploaded Documents Repository Table */}
      <div className="apple-card overflow-hidden stagger-2">
        <div className="p-5 border-b border-black/8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-sm font-bold text-[#1d1d1f]">
            Indexed Assessment Documents ({documents.length})
          </h3>
          <span className="text-xs text-[#86868b]">
            Source documents preserved with immutable coordinates
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f5f5f7] text-[#86868b] border-b border-black/8">
                <th className="p-3.5 font-bold">ID &amp; Title</th>
                <th className="p-3.5 font-bold">Category</th>
                <th className="p-3.5 font-bold">FY / Pub Date</th>
                <th className="p-3.5 font-bold">Format</th>
                <th className="p-3.5 font-bold">Chunks</th>
                <th className="p-3.5 font-bold">Status &amp; Security</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-black/[0.02] transition">
                  <td className="p-3.5 font-semibold text-[#1d1d1f]">
                    <div>
                      #{doc.id} — {doc.title}
                    </div>
                    {doc.source_url ? (
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0071e3] hover:underline font-normal break-all"
                      >
                        {doc.source_url}
                      </a>
                    ) : null}
                  </td>
                  <td className="p-3.5 text-[#515154]">{doc.category}</td>
                  <td className="p-3.5 text-[#86868b] font-mono whitespace-nowrap">
                    {doc.financial_year} • {doc.publication_date || "N/A"}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] font-mono font-bold text-[#1d1d1f] border border-black/10">
                      {doc.file_type}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-[#0071e3] font-mono whitespace-nowrap">
                    {doc.chunk_count} chunks
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          doc.processing_status === "completed"
                            ? "bg-[#eaf8ee] text-[#1d7334] border-[#a3e4b7]"
                            : "bg-[#fdeef0] text-[#c9182b] border-[#f9abb4]"
                        }`}
                      >
                        {doc.processing_status}
                      </span>
                      {doc.prompt_injection_flag ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#fff7e6] text-[#b25e00] border border-[#ffd580] text-[10px] font-bold">
                          Injection Neutralized
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#1d7334] font-semibold">
                          Clean Source
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => inspectDoc(doc.id)}
                        className="px-3 py-1.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] font-semibold hover:bg-[#d6e9fd] transition"
                      >
                        Inspect Chunks
                      </button>
                      <button
                        onClick={() => handleArchiveDoc(doc.id)}
                        className="px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[#515154] hover:bg-[#fdeef0] hover:text-[#c9182b] border border-black/10 transition font-semibold"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Document Chunk Inspector */}
      {selectedDocDetails ? (
        <div className="apple-card p-6 border-[#0071e3]/30 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/8 pb-3">
            <div>
              <h4 className="text-sm font-bold text-[#0071e3]">
                Metadata-Aware Chunk Inspector: {selectedDocDetails.title}
              </h4>
              <p className="text-xs text-[#86868b] mt-0.5">
                Preserving Page Numbers, Section Headings, Financial Year (
                {selectedDocDetails.financial_year}), and Vector Embeddings
              </p>
            </div>
            <button
              onClick={() => setSelectedDocDetails(null)}
              className="apple-btn-secondary self-start sm:self-auto"
            >
              Close Inspector
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {(selectedDocDetails.chunks || []).map((ch: any) => (
              <div
                key={ch.id}
                className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[#0071e3] font-bold">
                  <span>
                    Chunk #{ch.chunk_index + 1} • Page {ch.page_number}
                  </span>
                  <span className="text-[11px] text-[#86868b] font-mono">
                    {ch.token_count} tokens
                  </span>
                </div>
                <div className="font-semibold text-[#1d1d1f]">
                  Section: {ch.section_heading}
                </div>
                <p className="text-[#515154] leading-relaxed whitespace-pre-wrap">
                  {ch.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Vector RAG Search Tester */}
      <div className="apple-card p-6 space-y-4 stagger-3">
        <div>
          <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-[#0071e3]" />
            <span>Knowledge Base Vector RAG Retrieval &amp; Metadata Filter</span>
          </h3>
          <p className="text-xs text-[#86868b] mt-0.5">
            Query the vector index directly with metadata filtering by category and assessment period
          </p>
        </div>
        <form onSubmit={handleSearchRag} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={ragQuery}
            onInput={(e: any) => setRagQuery(e.target.value)}
            placeholder="Search organizational mechanisms (e.g., 'dual-class voting', 'teen safety', 'privacy committee')..."
            className="flex-1 text-xs border border-black/10 rounded-xl px-3.5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white"
          />
          <select
            value={ragCategoryFilter}
            onChange={(e: any) => setRagCategoryFilter(e.target.value)}
            className="text-xs border border-black/10 rounded-xl px-3.5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] font-medium focus:outline-none focus:border-[#0071e3] focus:bg-white"
          >
            <option value="">All Document Categories</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={searchingRag}
            className="apple-btn-primary shrink-0"
          >
            {searchingRag ? "Searching..." : "Retrieve Vector Chunks"}
          </button>
        </form>

        {ragResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {ragResults.map((r) => (
              <div
                key={r.chunk_id}
                className="p-4 rounded-2xl bg-[#fbfbfd] border border-black/8 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-bold text-[#1d1d1f] gap-2">
                  <span>
                    Page {r.page_number} — {r.section_heading}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e8f2fe] text-[#0066cc] border border-[#b3d7ff] font-mono shrink-0">
                    {(r.similarity_score * 100).toFixed(1)}% Match
                  </span>
                </div>
                <div className="text-[11px] text-[#86868b]">
                  Category: {r.document_category} | FY: {r.financial_year}
                </div>
                <p className="text-[#515154] leading-relaxed mt-1">{r.content}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
