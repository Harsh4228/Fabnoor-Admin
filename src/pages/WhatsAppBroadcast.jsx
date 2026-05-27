import React, { useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";

const TEMPLATES = [
  { label: "Welcome Offer", value: "fabnoor_welcome_offer" },
  { label: "Hello World (Test)", value: "hello_world" },
];

const WhatsAppBroadcast = ({ token }) => {
  const [contacts, setContacts] = useState([]);
  const [manualInput, setManualInput] = useState("");
  const [templateName, setTemplateName] = useState("fabnoor_welcome_offer");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("manual");
  const fileRef = useRef(null);

  /* ── Parse manual input ─────────────────────────────── */
  const parseManualInput = () => {
    const lines = manualInput.trim().split("\n").filter(Boolean);
    const parsed = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        return { name: parts[0], mobile: parts[1] };
      }
      return { name: "", mobile: parts[0] };
    });
    return parsed.filter((c) => c.mobile);
  };

  /* ── Parse Excel / CSV file ─────────────────────────── */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Skip header row if first cell looks like a header
        const startRow = typeof rows[0]?.[0] === "string" &&
          isNaN(rows[0]?.[0]) &&
          rows[0]?.[0]?.toLowerCase().includes("name") ? 1 : 0;

        const parsed = rows
          .slice(startRow)
          .map((row) => ({
            name: String(row[0] || "").trim(),
            mobile: String(row[1] || "").trim(),
          }))
          .filter((c) => c.mobile);

        setContacts(parsed);
        toast.success(`${parsed.length} contacts loaded from file`);
      } catch {
        toast.error("Failed to parse file. Use Name, Mobile columns.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  /* ── Download sample Excel ──────────────────────────── */
  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Mobile"],
      ["Rahul Shah", "9979624404"],
      ["Priya Mehta", "9876543210"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "fabnoor_contacts_sample.xlsx");
  };

  /* ── Send broadcast ─────────────────────────────────── */
  const handleSend = async () => {
    const list = activeTab === "manual" ? parseManualInput() : contacts;

    if (!list.length) {
      toast.error("No valid contacts to send");
      return;
    }

    setSending(true);
    setResults(null);

    try {
      const res = await axios.post(
        `${backendUrl}/api/whatsapp/broadcast`,
        { contacts: list, templateName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setResults(res.data.results);
        toast.success(`Broadcast complete! ${res.data.results.sent.length} sent, ${res.data.results.failed.length} failed`);
      } else {
        toast.error(res.data.message || "Broadcast failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error");
    } finally {
      setSending(false);
    }
  };

  /* ── Export results as CSV ──────────────────────────── */
  const exportResults = (type) => {
    const data = type === "sent" ? results.sent : results.failed;
    const ws = XLSX.utils.json_to_sheet(
      data.map((r) => ({ Name: r.name, Mobile: r.mobile, ...(type === "failed" ? { Error: r.error } : {}) }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "sent" ? "Sent" : "Failed");
    XLSX.writeFile(wb, `broadcast_${type}_${Date.now()}.xlsx`);
  };

  const previewList = activeTab === "manual" ? parseManualInput() : contacts;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.02-.956-.263-.089-.454-.134-.644.15-.19.283-.735.956-.9 1.144-.165.188-.331.21-.628.061-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.644-1.554-.882-2.126-.231-.555-.465-.48-.644-.488-.166-.008-.356-.01-.546-.01-.19 0-.5-.072-.761.21-.261.282-1.001.978-1.001 2.388 0 1.41 1.026 2.774 1.17 2.962.143.188 2.019 3.084 4.889 4.326.682.296 1.214.473 1.629.605.685.217 1.307.186 1.802.113.551-.082 1.758-.719 2.007-1.413.25-.694.25-1.289.175-1.413-.075-.124-.271-.197-.568-.346z" />
            <path d="M12.004 0C5.378 0 0 5.378 0 12.004c0 2.112.547 4.178 1.585 6.002L0 24l6.166-1.618a11.94 11.94 0 0 0 5.838 1.518c6.626 0 12.004-5.378 12.004-12.004S18.63 0 12.004 0zm0 21.944a9.9 9.9 0 0 1-5.056-1.388l-.362-.216-3.758.985 1.002-3.663-.238-.378a9.904 9.904 0 0 1-1.521-5.28c0-5.478 4.456-9.934 9.934-9.934 5.478 0 9.934 4.456 9.934 9.934 0 5.478-4.456 9.934-9.934 9.934z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">WhatsApp Broadcast</h1>
          <p className="text-sm text-slate-500">Send bulk WhatsApp messages to customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Input Section ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Template selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Select Template
            </label>
            <select
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
              ))}
            </select>
          </div>

          {/* Input method tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "manual"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setActiveTab("excel")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "excel"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Import Excel / CSV
              </button>
            </div>

            {/* Manual entry */}
            {activeTab === "manual" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Enter Contacts (one per line)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Format: <span className="font-mono bg-slate-100 px-1 rounded">Name, Mobile</span> or just <span className="font-mono bg-slate-100 px-1 rounded">Mobile</span>
                </p>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={8}
                  placeholder={`Rahul Shah, 9979624404\nPriya Mehta, 9876543210\n9812345678`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            )}

            {/* Excel import */}
            {activeTab === "excel" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Upload Excel or CSV File
                    </label>
                    <p className="text-xs text-slate-400 mt-1">
                      Columns required: <span className="font-mono bg-slate-100 px-1 rounded">Name</span> and <span className="font-mono bg-slate-100 px-1 rounded">Mobile</span>
                    </p>
                  </div>
                  <button
                    onClick={downloadSample}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Sample File
                  </button>
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-blue-50/50"
                >
                  <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {contacts.length > 0 ? (
                    <p className="text-sm font-semibold text-green-600">{contacts.length} contacts loaded</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-500">Click to upload .xlsx or .csv</p>
                      <p className="text-xs text-slate-400 mt-1">Max 1000 contacts per broadcast</p>
                    </>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {contacts.length > 0 && (
                  <button
                    onClick={() => setContacts([])}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Clear contacts
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || previewList.length === 0}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-green-900/20 transition-all flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending to {previewList.length} contacts...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.02-.956-.263-.089-.454-.134-.644.15-.19.283-.735.956-.9 1.144-.165.188-.331.21-.628.061-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.644-1.554-.882-2.126-.231-.555-.465-.48-.644-.488-.166-.008-.356-.01-.546-.01-.19 0-.5-.072-.761.21-.261.282-1.001.978-1.001 2.388 0 1.41 1.026 2.774 1.17 2.962.143.188 2.019 3.084 4.889 4.326.682.296 1.214.473 1.629.605.685.217 1.307.186 1.802.113.551-.082 1.758-.719 2.007-1.413.25-.694.25-1.289.175-1.413-.075-.124-.271-.197-.568-.346z" />
                  <path d="M12.004 0C5.378 0 0 5.378 0 12.004c0 2.112.547 4.178 1.585 6.002L0 24l6.166-1.618a11.94 11.94 0 0 0 5.838 1.518c6.626 0 12.004-5.378 12.004-12.004S18.63 0 12.004 0zm0 21.944a9.9 9.9 0 0 1-5.056-1.388l-.362-.216-3.758.985 1.002-3.663-.238-.378a9.904 9.904 0 0 1-1.521-5.28c0-5.478 4.456-9.934 9.934-9.934 5.478 0 9.934 4.456 9.934 9.934 0 5.478-4.456 9.934-9.934 9.934z" />
                </svg>
                Send to {previewList.length} Contacts
              </>
            )}
          </button>
        </div>

        {/* ── Right: Preview & Results ── */}
        <div className="space-y-5">
          {/* Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Preview ({previewList.length} contacts)
            </h3>
            {previewList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No contacts yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {previewList.slice(0, 50).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {(c.name || c.mobile).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {c.name && <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>}
                      <p className="text-xs text-slate-400 font-mono">{c.mobile}</p>
                    </div>
                  </div>
                ))}
                {previewList.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-2">+{previewList.length - 50} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results Section ── */}
      {results && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-slate-800">{results.total}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Total</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5 text-center">
              <p className="text-3xl font-bold text-green-600">{results.sent.length}</p>
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider mt-1">Sent</p>
            </div>
            <div className="bg-white rounded-2xl border border-red-200 p-5 text-center">
              <p className="text-3xl font-bold text-red-500">{results.failed.length}</p>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mt-1">Failed</p>
            </div>
          </div>

          {/* Success table */}
          {results.sent.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <h3 className="font-bold text-slate-700 text-sm">Successfully Sent ({results.sent.length})</h3>
                </div>
                <button
                  onClick={() => exportResults("sent")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.sent.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-700">{r.name || "—"}</td>
                        <td className="px-5 py-3 font-mono text-slate-500">{r.mobile}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed table */}
          {results.failed.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <h3 className="font-bold text-slate-700 text-sm">Failed ({results.failed.length})</h3>
                </div>
                <button
                  onClick={() => exportResults("failed")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.failed.map((r, i) => (
                      <tr key={i} className="hover:bg-red-50/30">
                        <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-700">{r.name || "—"}</td>
                        <td className="px-5 py-3 font-mono text-slate-500">{r.mobile}</td>
                        <td className="px-5 py-3 text-red-500 text-xs">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppBroadcast;
