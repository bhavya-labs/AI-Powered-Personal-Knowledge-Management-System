import { useState } from "react";
import { Upload, FileText, Trash2, Calendar, Eye, FileUp, Database, ArrowRight } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "../config";

function UploadSection({ documents = [], onRegistryUpdate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeInspectorDoc, setActiveInspectorDoc] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setUploadStatus("");
    } else {
      alert("Only PDF documents are supported.");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setUploadStatus("");
      } else {
        alert("Only PDF documents are supported.");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select or drop a PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const savedEngine = localStorage.getItem("mindmesh_engine") || "local";
    const savedKey = localStorage.getItem("mindmesh_gemini_key") || "";
    
    const headers = {};
    if (savedEngine === "gemini" && savedKey) {
      headers["X-Gemini-API-Key"] = savedKey;
    }

    try {
      setLoading(true);
      setUploadStatus("Processing & Indexing PDF...");

      const response = await axios.post(
        `${getApiBaseUrl()}/upload`,
        formData,
        { headers }
      );

      setUploadStatus("Document indexed successfully!");
      setSelectedFile(null);
      
      // Update parent registry list
      if (onRegistryUpdate) {
        onRegistryUpdate();
      }

      // Automatically inspect the newly uploaded doc
      setActiveInspectorDoc({
        filename: response.data.filename,
        summary: response.data.summary,
        text_preview: response.data.text_preview,
        pages: response.data.pages,
        size: response.data.size
      });
      
    } catch (error) {
      console.error(error);
      setUploadStatus("Upload or Indexing Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId, filename, e) => {
    e.stopPropagation(); // Stop from selecting row
    if (!window.confirm(`Are you sure you want to delete and re-index without: ${filename}?`)) {
      return;
    }

    try {
      await axios.delete(`${getApiBaseUrl()}/documents/${docId}`);
      if (activeInspectorDoc && activeInspectorDoc.doc_id === docId) {
        setActiveInspectorDoc(null);
      }
      if (onRegistryUpdate) {
        onRegistryUpdate();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Error deleting document");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Upload Zone & Document List (left columns) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Upload Zone */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6">
          <h3 className="text-xl font-bold font-display text-white mb-4">
            Upload Documents
          </h3>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 relative ${
              dragActive 
                ? "border-blue-500 bg-blue-500/5" 
                : selectedFile 
                  ? "border-emerald-500/60 bg-emerald-500/5" 
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              id="file-upload-input"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center justify-center space-y-3">
              <div className={`p-3 rounded-full ${selectedFile ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}>
                {selectedFile ? <FileText size={28} /> : <Upload size={28} />}
              </div>
              
              <div>
                <span className="text-sm font-semibold text-white block">
                  {selectedFile ? selectedFile.name : "Choose a PDF file or drag it here"}
                </span>
                <span className="text-xs text-zinc-500 mt-1 block">
                  {selectedFile ? formatBytes(selectedFile.size) : "Standard PDFs up to 50MB"}
                </span>
              </div>
            </label>

            {selectedFile && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={loading}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <FileUp size={14} />
                  )}
                  {loading ? "Indexing..." : "Start Vector Indexing"}
                </button>
              </div>
            )}
          </div>

          {uploadStatus && (
            <p className={`text-xs mt-3 text-center ${uploadStatus.includes("Failed") ? "text-red-400" : "text-zinc-400 animate-pulse"}`}>
              {uploadStatus}
            </p>
          )}
        </div>

        {/* Document Registry Table */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Document Registry
            </h3>
            <span className="text-xs text-zinc-500">{documents.length} Files Indexed</span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 border border-zinc-800/50 rounded-xl bg-zinc-950/20">
              <FileText className="mx-auto text-zinc-600 mb-3" size={32} />
              <p className="text-sm text-zinc-400 font-medium">No documents uploaded yet</p>
              <p className="text-xs text-zinc-500 mt-1">Upload a PDF above to construct the vector database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 text-zinc-500 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Filename</th>
                    <th className="pb-3">Pages</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Uploaded</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {documents.map((doc) => (
                    <tr
                      key={doc.doc_id}
                      onClick={() => setActiveInspectorDoc(doc)}
                      className={`hover:bg-zinc-800/25 cursor-pointer transition-colors group ${
                        activeInspectorDoc && activeInspectorDoc.doc_id === doc.doc_id 
                          ? "bg-zinc-800/30" 
                          : ""
                      }`}
                    >
                      <td className="py-3 pl-2 font-medium text-white group-hover:text-blue-400 transition-colors flex items-center gap-2 max-w-[180px] md:max-w-[240px] truncate">
                        <FileText size={14} className="text-zinc-500 shrink-0" />
                        <span className="truncate">{doc.filename}</span>
                      </td>
                      <td className="py-3 text-zinc-400">{doc.pages} pgs</td>
                      <td className="py-3 text-zinc-400">{formatBytes(doc.size)}</td>
                      <td className="py-3 text-zinc-500 flex items-center gap-1">
                        <Calendar size={12} className="shrink-0" />
                        <span className="truncate">{formatDate(doc.uploaded_at)}</span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInspectorDoc(doc);
                            }}
                            className="p-1 text-zinc-400 hover:text-white bg-zinc-800/40 rounded border border-zinc-800 hover:border-zinc-700 transition"
                            title="Inspect Summary"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(doc.doc_id, doc.filename, e)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20 transition"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Document Inspector Panel (right column) */}
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 h-fit min-h-[400px] flex flex-col">
        <h3 className="text-lg font-bold font-display text-white mb-4 pb-3 border-b border-zinc-850">
          Document Details
        </h3>

        {activeInspectorDoc ? (
          <div className="space-y-5 flex-1 flex flex-col animate-fade-in">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Filename</span>
              <h4 className="text-sm font-semibold text-white mt-1 break-words">
                {activeInspectorDoc.filename}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-zinc-500 uppercase">Pages</span>
                <span className="text-xs font-semibold text-zinc-300 block mt-0.5">
                  {activeInspectorDoc.pages}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase">Size</span>
                <span className="text-xs font-semibold text-zinc-300 block mt-0.5">
                  {formatBytes(activeInspectorDoc.size)}
                </span>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 flex-1 overflow-y-auto max-h-[220px]">
              <span className="text-xs text-zinc-400 font-bold block mb-2">AI-Generated Summary</span>
              <p className="text-xs text-zinc-300 leading-6 whitespace-pre-wrap">
                {activeInspectorDoc.summary}
              </p>
            </div>

            {/* Text Preview */}
            {activeInspectorDoc.text_preview && (
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 overflow-y-auto max-h-[150px]">
                <span className="text-xs text-zinc-400 font-bold block mb-2">Content Preview</span>
                <p className="text-[11px] text-zinc-500 font-mono leading-5 whitespace-pre-wrap">
                  {activeInspectorDoc.text_preview}...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <Eye className="text-zinc-650 mb-3" size={36} />
            <p className="text-xs font-medium text-zinc-400">Inspector Panel</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[180px] leading-relaxed">
              Select any document in the table to view its page details, size statistics, and AI summary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadSection;