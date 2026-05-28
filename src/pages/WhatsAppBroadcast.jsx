import React, { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";

const TEMPLATES = [
  {
    label: "Welcome Offer",
    value: "fabnoor_welcome_offer",
    hasImage: true,
    preview: "Hi {{customer_name}}, Welcome to Fabnoor! Explore our latest wholesale collection and get exclusive deals. Shop now!",
  },
  {
    label: "Hello World (Test)",
    value: "hello_world",
    hasImage: false,
    preview: "Hello World! This is a test message from WhatsApp Business API.",
  },
];

const WA_SVG = (cls = "w-5 h-5") => (
  <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.02-.956-.263-.089-.454-.134-.644.15-.19.283-.735.956-.9 1.144-.165.188-.331.21-.628.061-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.644-1.554-.882-2.126-.231-.555-.465-.48-.644-.488-.166-.008-.356-.01-.546-.01-.19 0-.5-.072-.761.21-.261.282-1.001.978-1.001 2.388 0 1.41 1.026 2.774 1.17 2.962.143.188 2.019 3.084 4.889 4.326.682.296 1.214.473 1.629.605.685.217 1.307.186 1.802.113.551-.082 1.758-.719 2.007-1.413.25-.694.25-1.289.175-1.413-.075-.124-.271-.197-.568-.346z" />
    <path d="M12.004 0C5.378 0 0 5.378 0 12.004c0 2.112.547 4.178 1.585 6.002L0 24l6.166-1.618a11.94 11.94 0 005.838 1.518c6.626 0 12.004-5.378 12.004-12.004S18.63 0 12.004 0zm0 21.944a9.9 9.9 0 01-5.056-1.388l-.362-.216-3.758.985 1.002-3.663-.238-.378a9.904 9.904 0 01-1.521-5.28c0-5.478 4.456-9.934 9.934-9.934 5.478 0 9.934 4.456 9.934 9.934 0 5.478-4.456 9.934-9.934 9.934z" />
  </svg>
);

const Spinner = ({ cls = "w-5 h-5" }) => (
  <svg className={`animate-spin ${cls}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const deduplicate = (list) => {
  const seen = new Set();
  return list.filter((c) => {
    const key = c.mobile?.replace(/[^0-9]/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const WhatsAppBroadcast = ({ token }) => {
  // Input state
  const [activeTab, setActiveTab] = useState("manual");
  const [manualInput, setManualInput] = useState("");
  const [excelContacts, setExcelContacts] = useState([]);
  const [templateName, setTemplateName] = useState("fabnoor_welcome_offer");

  // DB customers tab
  const [dbContacts, setDbContacts] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbSearch, setDbSearch] = useState("");
  const [selectedDb, setSelectedDb] = useState(new Set());

  // Broadcast state
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [logDetails, setLogDetails] = useState({});
  const [logDetailLoading, setLogDetailLoading] = useState(null);

  const fileRef = useRef(null);
  const selectedTemplate = TEMPLATES.find((t) => t.value === templateName) || TEMPLATES[0];

  /* ── Compute contact lists ────────────────────────────── */
  const parseManualInput = () => {
    return manualInput
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return parts.length >= 2
          ? { name: parts[0], mobile: parts[1] }
          : { name: "", mobile: parts[0] };
      })
      .filter((c) => c.mobile);
  };

  const getRawList = () => {
    if (activeTab === "manual") return parseManualInput();
    if (activeTab === "excel") return excelContacts;
    if (activeTab === "db") return dbContacts.filter((c) => selectedDb.has(c.mobile));
    return [];
  };

  const rawList = getRawList();
  const previewList = deduplicate(rawList);
  const dupCount = rawList.length - previewList.length;

  /* ── Load customers from DB ───────────────────────────── */
  const loadDbCustomers = async () => {
    setDbLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDbContacts(data.contacts);
        setSelectedDb(new Set(data.contacts.map((c) => c.mobile)));
        setDbLoaded(true);
        toast.success(`${data.contacts.length} customers loaded`);
      } else {
        toast.error(data.message || "Failed to load customers");
      }
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setDbLoading(false);
    }
  };

  /* ── Load broadcast history ───────────────────────────── */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setHistory(data.logs);
    } catch {
      // silent fail for history
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /* ── Excel / CSV upload ───────────────────────────────── */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const firstCell = String(rows[0]?.[0] || "").toLowerCase();
        const startRow = firstCell.includes("name") ? 1 : 0;
        const parsed = rows
          .slice(startRow)
          .map((row) => ({ name: String(row[0] || "").trim(), mobile: String(row[1] || "").trim() }))
          .filter((c) => c.mobile);
        setExcelContacts(parsed);
        toast.success(`${parsed.length} contacts loaded`);
      } catch {
        toast.error("Failed to parse file. Use Name, Mobile columns.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Name", "Mobile"], ["Rahul Shah", "9979624404"], ["Priya Mehta", "9876543210"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "fabnoor_contacts_sample.xlsx");
  };

  /* ── Send broadcast (SSE streaming) ──────────────────── */
  const handleSend = async (retryList = null) => {
    const list = retryList || previewList;
    if (!list.length) {
      toast.error("No valid contacts to send");
      return;
    }

    setSending(true);
    setResults(null);
    setProgress({ current: 0, total: list.length, currentContact: "", lastStatus: null });

    try {
      const response = await fetch(`${backendUrl}/api/whatsapp/broadcast-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contacts: list, templateName }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setProgress({
                current: event.progress,
                total: event.total,
                currentContact: event.contact || "",
                lastStatus: event.status,
              });
            } else if (event.type === "done") {
              setResults(event.results);
              toast.success(
                `Done! ${event.results.sent.length} sent, ${event.results.failed.length} failed`
              );
              loadHistory();
            } else if (event.type === "error") {
              toast.error(event.message || "Broadcast failed");
            }
          } catch {
            // skip malformed event lines
          }
        }
      }
    } catch (err) {
      toast.error(err.message || "Server error");
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  /* ── Retry failed contacts ────────────────────────────── */
  const handleRetry = () => {
    if (!results?.failed?.length) return;
    const retryList = results.failed.map((f) => ({ name: f.name, mobile: f.mobile }));
    setResults(null);
    handleSend(retryList);
  };

  /* ── Load history row detail ─────────────────────────── */
  const loadLogDetail = async (id) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
      return;
    }
    setExpandedLogId(id);
    if (logDetails[id]) return;
    setLogDetailLoading(id);
    try {
      const res = await fetch(`${backendUrl}/api/whatsapp/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogDetails((prev) => ({ ...prev, [id]: data.log }));
      }
    } catch {
      toast.error("Failed to load broadcast details");
    } finally {
      setLogDetailLoading(null);
    }
  };

  /* ── Export history detail ────────────────────────────── */
  const exportHistoryDetail = (log, type) => {
    const data = type === "sent" ? log.sent : log.failed;
    const ws = XLSX.utils.json_to_sheet(
      data.map((r) => ({
        Name: r.name,
        Mobile: r.mobile,
        ...(type === "failed" ? { Error: r.error } : {}),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "sent" ? "Sent" : "Failed");
    XLSX.writeFile(
      wb,
      `history_${type}_${new Date(log.createdAt).toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`
    );
  };

  /* ── Export results ───────────────────────────────────── */
  const exportResults = (type) => {
    const data = type === "sent" ? results.sent : results.failed;
    const ws = XLSX.utils.json_to_sheet(
      data.map((r) => ({
        Name: r.name,
        Mobile: r.mobile,
        ...(type === "failed" ? { Error: r.error } : {}),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "sent" ? "Sent" : "Failed");
    XLSX.writeFile(wb, `broadcast_${type}_${Date.now()}.xlsx`);
  };

  /* ── DB tab helpers ───────────────────────────────────── */
  const filteredDbContacts = dbContacts.filter(
    (c) =>
      !dbSearch ||
      c.name.toLowerCase().includes(dbSearch.toLowerCase()) ||
      c.mobile.includes(dbSearch)
  );

  const toggleDbContact = (mobile) => {
    setSelectedDb((prev) => {
      const next = new Set(prev);
      if (next.has(mobile)) next.delete(mobile);
      else next.add(mobile);
      return next;
    });
  };

  const toggleAllDb = () => {
    setSelectedDb(
      selectedDb.size === dbContacts.length
        ? new Set()
        : new Set(dbContacts.map((c) => c.mobile))
    );
  };

  const progressPct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 text-white">
          {WA_SVG()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">WhatsApp Broadcast</h1>
          <p className="text-sm text-slate-500">Send bulk WhatsApp messages to customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left column ── */}
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
                <option key={t.value} value={t.value}>
                  {t.label} ({t.value})
                </option>
              ))}
            </select>
          </div>

          {/* Input tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { id: "manual", label: "Manual Entry" },
                { id: "excel", label: "Import Excel / CSV" },
                { id: "db", label: "From Database" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Manual entry */}
            {activeTab === "manual" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Enter Contacts (one per line)
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  Format:{" "}
                  <span className="font-mono bg-slate-100 px-1 rounded">Name, Mobile</span> or just{" "}
                  <span className="font-mono bg-slate-100 px-1 rounded">Mobile</span>
                </p>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={8}
                  placeholder={"Rahul Shah, 9979624404\nPriya Mehta, 9876543210\n9812345678"}
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
                      Upload Excel or CSV
                    </label>
                    <p className="text-xs text-slate-400 mt-1">
                      Columns:{" "}
                      <span className="font-mono bg-slate-100 px-1 rounded">Name</span> and{" "}
                      <span className="font-mono bg-slate-100 px-1 rounded">Mobile</span>
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
                  {excelContacts.length > 0 ? (
                    <p className="text-sm font-semibold text-green-600">
                      {excelContacts.length} contacts loaded — click to replace
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-500">Click to upload .xlsx or .csv</p>
                      <p className="text-xs text-slate-400 mt-1">Max 1000 contacts per broadcast</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                {excelContacts.length > 0 && (
                  <button onClick={() => setExcelContacts([])} className="mt-2 text-xs text-red-500 hover:underline">
                    Clear contacts
                  </button>
                )}
              </div>
            )}

            {/* From Database */}
            {activeTab === "db" && (
              <div>
                {!dbLoaded ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 mb-4">
                      Load all registered customers directly from the database
                    </p>
                    <button
                      onClick={loadDbCustomers}
                      disabled={dbLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all inline-flex items-center gap-2"
                    >
                      {dbLoading ? (
                        <><Spinner cls="w-4 h-4" />Loading...</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M9 11l3 3 3-3M12 3v11" />
                          </svg>
                          Load Customers
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={dbSearch}
                        onChange={(e) => setDbSearch(e.target.value)}
                        placeholder="Search name or mobile..."
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={toggleAllDb}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
                      >
                        {selectedDb.size === dbContacts.length ? "Deselect All" : "Select All"}
                      </button>
                      <button
                        onClick={() => { setDbLoaded(false); setDbContacts([]); setSelectedDb(new Set()); setDbSearch(""); }}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1"
                      >
                        Reload
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mb-2 font-medium">
                      {selectedDb.size} of {dbContacts.length} selected
                    </p>

                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {filteredDbContacts.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No contacts found</p>
                      ) : (
                        filteredDbContacts.map((c, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDb.has(c.mobile)}
                              onChange={() => toggleDbContact(c.mobile)}
                              className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                              <p className="text-xs font-mono text-slate-400">{c.mobile}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Duplicate notice */}
          {dupCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {dupCount} duplicate number{dupCount > 1 ? "s" : ""} removed automatically
            </div>
          )}

          {/* Progress bar */}
          {sending && progress && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Sending messages...</p>
                <p className="text-sm font-bold text-blue-600">
                  {progress.current}/{progress.total}
                </p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 truncate max-w-[70%]">
                  {progress.currentContact
                    ? `Sending to: ${progress.currentContact}`
                    : "Starting..."}
                </p>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    progress.lastStatus === "sent"
                      ? "bg-green-100 text-green-700"
                      : progress.lastStatus === "failed"
                      ? "bg-red-100 text-red-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {progressPct}%
                </span>
              </div>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={sending || previewList.length === 0}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md shadow-green-900/20 transition-all flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Spinner />
                Sending {progress?.current || 0}/{progress?.total || previewList.length}...
              </>
            ) : (
              <>
                {WA_SVG()}
                Send to {previewList.length} Contact{previewList.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Template preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Template Preview
            </h3>
            <div className="bg-[#ece5dd] rounded-xl p-4 min-h-[120px]">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-[260px]">
                {selectedTemplate.hasImage && (
                  <div className="bg-slate-200 h-28 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-[13px] text-slate-800 leading-relaxed">
                    {selectedTemplate.preview.replace("{{customer_name}}", "Customer Name")}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 text-right">12:00 PM ✓✓</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Preview ({previewList.length} contacts)
            </h3>
            {previewList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No contacts yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {previewList.slice(0, 50).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {(c.name || c.mobile).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {c.name && (
                        <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>
                      )}
                      <p className="text-xs text-slate-400 font-mono">{c.mobile}</p>
                    </div>
                  </div>
                ))}
                {previewList.length > 50 && (
                  <p className="text-xs text-slate-400 text-center pt-2">
                    +{previewList.length - 50} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
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
              {results.failed.length > 0 && (
                <button
                  onClick={handleRetry}
                  className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-all"
                >
                  Retry Failed
                </button>
              )}
            </div>
          </div>

          {/* Sent table */}
          {results.sent.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <h3 className="font-bold text-slate-700 text-sm">
                    Successfully Sent ({results.sent.length})
                  </h3>
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
                  <h3 className="font-bold text-slate-700 text-sm">
                    Failed ({results.failed.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-semibold transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry All Failed
                  </button>
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

      {/* ── Broadcast History ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-slate-700 text-sm">Broadcast History</h3>
            {history.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                {history.length}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${historyOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {historyOpen && (
          <div className="border-t border-slate-100">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner cls="w-5 h-5 text-slate-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No broadcasts yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map((log, i) => {
                  const rate = log.total > 0 ? Math.round((log.sentCount / log.total) * 100) : 0;
                  const isExpanded = expandedLogId === log._id;
                  const detail = logDetails[log._id];
                  const isDetailLoading = logDetailLoading === log._id;

                  return (
                    <div key={log._id || i}>
                      {/* Summary row */}
                      <div
                        className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-all"
                        onClick={() => loadLogDetail(log._id)}
                      >
                        {/* Date */}
                        <div className="col-span-3">
                          <p className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>

                        {/* Template */}
                        <div className="col-span-3">
                          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {log.templateName}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="col-span-4 flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-700">{log.total}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-green-600">{log.sentCount}</p>
                            <p className="text-[10px] text-green-500 uppercase tracking-wider">Sent</p>
                          </div>
                          {log.failedCount > 0 && (
                            <div className="text-center">
                              <p className="text-sm font-bold text-red-500">{log.failedCount}</p>
                              <p className="text-[10px] text-red-400 uppercase tracking-wider">Failed</p>
                            </div>
                          )}
                        </div>

                        {/* Rate + expand arrow */}
                        <div className="col-span-2 flex items-center justify-end gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">{rate}%</span>
                          </div>
                          {isDetailLoading ? (
                            <Spinner cls="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <svg
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-4">
                          {isDetailLoading || !detail ? (
                            <div className="flex items-center justify-center py-6">
                              <Spinner cls="w-5 h-5 text-slate-400" />
                            </div>
                          ) : (
                            <>
                              {/* Sent contacts */}
                              {detail.sent?.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <span className="text-xs font-bold text-slate-600">
                                        Sent — {detail.sent.length} contacts
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => exportHistoryDetail(detail, "sent")}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-all"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Export
                                    </button>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">#</th>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {detail.sent.map((r, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-2 font-medium text-slate-700">{r.name || "—"}</td>
                                            <td className="px-4 py-2 font-mono text-slate-500">{r.mobile}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Failed contacts */}
                              {detail.failed?.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-red-500" />
                                      <span className="text-xs font-bold text-slate-600">
                                        Failed — {detail.failed.length} contacts
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => exportHistoryDetail(detail, "failed")}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-all"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      Export
                                    </button>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">#</th>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                                          <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Error</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {detail.failed.map((r, idx) => (
                                          <tr key={idx} className="hover:bg-red-50/30">
                                            <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-2 font-medium text-slate-700">{r.name || "—"}</td>
                                            <td className="px-4 py-2 font-mono text-slate-500">{r.mobile}</td>
                                            <td className="px-4 py-2 text-red-500">{r.error}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppBroadcast;
