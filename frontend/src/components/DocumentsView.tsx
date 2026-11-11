import { api } from "../api";
import { h, useState } from "../lib/react-lite";
import { DocumentItem } from "../types";

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
        "Successfully ingested and indexed document(s). Click 'Run Full Diagnostic Analysis' to update alignment scores."
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
    <div className="space-y-6 text-white">
      {/* Upload Panel */}
      <div className="glass-card bg-slate-900/90 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-base font-bold text-white">
                Document Ingestion & Metadata-Aware Indexing Pipeline
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supported formats: <strong className="text-cyan-300">PDF, DOCX, TXT, CSV, XLSX, PPTX</strong>{" "}
              (with heading-preserving chunker and prompt-injection defense)
            </p>
          </div>
          <button
            onClick={onRunAnalysis}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition shrink-0"
          >
            Re-Run Diagnostic Analysis
          </button>
        </div>

        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select File(s) (Multiple Allowed)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx,.md"
                className="w-full text-xs text-slate-300 border border-slate-700 rounded-lg p-2 bg-slate-950 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Document Category
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white focus:outline-none"
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onInput={(e: any) => setCustomTitle(e.target.value)}
                placeholder="e.g., FY2025 Form 10-K Governance Excerpt"
                className="w-full text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Financial Year
              </label>
              <input
                type="text"
                value={docFy}
                onInput={(e: any) => setDocFy(e.target.value)}
                className="w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Publication Date
              </label>
              <input
                type="date"
                value={pubDate}
                onInput={(e: any) => setPubDate(e.target.value)}
                className="w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Source URL (Optional)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onInput={(e: any) => setSourceUrl(e.target.value)}
                placeholder="https://investor..."
                className="w-full text-xs border border-slate-700 rounded-lg p-2 bg-slate-950 text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/30"
              >
                {uploading ? "Processing Pipeline..." : "Upload & Index Documents"}
              </button>
            </div>
          </div>
        </form>

        {uploadStatus ? (
          <div className="mt-3 p-3 rounded-lg bg-violet-950/70 border border-violet-700/60 text-xs text-violet-200 font-medium">
            {uploadStatus}
          </div>
        ) : null}
      </div>

      {/* Uploaded Documents Repository Table */}
      <div className="glass-card bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Indexed Assessment Documents ({documents.length})
          </h3>
          <span className="text-xs text-slate-400">
            Source documents preserved with immutable coordinates
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3 font-bold">ID & Title</th>
                <th className="p-3 font-bold">Category</th>
                <th className="p-3 font-bold">FY / Pub Date</th>
                <th className="p-3 font-bold">Format</th>
                <th className="p-3 font-bold">Chunks</th>
                <th className="p-3 font-bold">Status & Security</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-slate-100">
                    <div>
                      #{doc.id} — {doc.title}
                    </div>
                    {doc.source_url ? (
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-cyan-400 hover:underline font-normal"
                      >
                        {doc.source_url}
                      </a>
                    ) : null}
                  </td>
                  <td className="p-3 text-slate-300">{doc.category}</td>
                  <td className="p-3 text-slate-400 font-mono">
                    {doc.financial_year} • {doc.publication_date || "N/A"}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-bold text-slate-300 border border-slate-700">
                      {doc.file_type}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-violet-300 font-mono">
                    {doc.chunk_count} chunks
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          doc.processing_status === "completed"
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                            : "bg-rose-950/60 text-rose-300 border border-rose-500/40"
                        }`}
                      >
                        {doc.processing_status}
                      </span>
                      {doc.prompt_injection_flag ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 text-[10px] font-bold">
                          Injection Neutralized
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400">
                          ✓ Clean Source
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => inspectDoc(doc.id)}
                      className="px-2.5 py-1 rounded bg-violet-950/70 text-violet-300 border border-violet-700/60 font-semibold hover:bg-violet-900/60"
                    >
                      Inspect Chunks
                    </button>
                    <button
                      onClick={() => handleArchiveDoc(doc.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:bg-rose-950 hover:text-rose-300 border border-slate-700"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Document Chunk Inspector */}
      {selectedDocDetails ? (
        <div className="glass-card bg-slate-950 p-5 rounded-xl border border-violet-800/80 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-violet-300">
                Metadata-Aware Chunk Inspector: {selectedDocDetails.title}
              </h4>
              <p className="text-xs text-slate-400">
                Preserving Page Numbers, Section Headings, Financial Year (
                {selectedDocDetails.financial_year}), and Vector Embeddings
              </p>
            </div>
            <button
              onClick={() => setSelectedDocDetails(null)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 border border-slate-700"
            >
              Close Inspector ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {(selectedDocDetails.chunks || []).map((ch: any) => (
              <div
                key={ch.id}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-violet-300 font-bold">
                  <span>
                    Chunk #{ch.chunk_index + 1} • Page {ch.page_number}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {ch.token_count} tokens
                  </span>
                </div>
                <div className="font-semibold text-cyan-300">
                  Section: {ch.section_heading}
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-serif">
                  {ch.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Vector RAG Search Tester */}
      <div className="glass-card bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">
            Knowledge Base Vector RAG Retrieval & Metadata Filter
          </h3>
          <p className="text-xs text-slate-400">
            Query the vector index directly with metadata filtering by category and assessment period
          </p>
        </div>
        <form onSubmit={handleSearchRag} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={ragQuery}
            onInput={(e: any) => setRagQuery(e.target.value)}
            placeholder="Search organizational mechanisms (e.g., 'dual-class voting', 'teen safety', 'privacy committee')..."
            className="flex-1 text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none"
          />
          <select
            value={ragCategoryFilter}
            onChange={(e: any) => setRagCategoryFilter(e.target.value)}
            className="text-xs border border-slate-700 rounded-lg p-2.5 bg-slate-950 text-white focus:outline-none"
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
            className="px-4 py-2.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 shadow-md shadow-violet-600/30"
          >
            {searchingRag ? "Searching..." : "Retrieve Vector Chunks"}
          </button>
        </form>

        {ragResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {ragResults.map((r) => (
              <div
                key={r.chunk_id}
                className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>
                    Page {r.page_number} — {r.section_heading}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 font-mono">
                    Similarity: {(r.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Category: {r.document_category} | FY: {r.financial_year}
                </div>
                <p className="text-slate-300 leading-relaxed mt-1 font-serif">{r.content}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
