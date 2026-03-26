import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";

/* â”€â”€ number helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n);
const today    = () => new Date().toISOString().split("T")[0];
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; };

const PAYMENT_METHODS = ["All", "COD", "Razorpay", "Stripe", "UPI", "Card", "WhatsApp"];

/* â”€â”€ CSV export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const downloadCSV = (rows, filename = "delivered-report.csv") => {
  if (!rows.length) return;
  const headers = [
    "Order #", "Order Date", "Customer", "Shop Name", "Phone", "Email",
    "City", "State", "Address", "Pincode",
    "Product", "Color", "Fabric", "Sizes", "Qty", "Unit Price (â‚¹)",
    "Line Total (â‚¹)", "Order Total (â‚¹)", "Payment Method", "Payment Status",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.map(esc).join(","),
    ...rows.map((r) =>
      [r.orderNumber,r.orderDate,r.customerName,r.shopName,r.phone,r.email,
       r.city,r.state,r.addressLine,r.pincode,r.productName,r.color,r.fabric,
       r.sizes,r.quantity,r.unitPrice,r.lineTotal,r.orderTotal,r.paymentMethod,r.paymentStatus]
      .map(esc).join(",")
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* â”€â”€ Custom dropdown â€” matches List.jsx FilterSelect â”€â”€â”€ */
const FilterSelect = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
          open
            ? "bg-white border-blue-500 ring-2 ring-blue-500/10 text-slate-800"
            : value && value !== "All" && value !== ""
            ? "bg-blue-50 border-blue-300 text-blue-700"
            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180 text-blue-500" : "text-slate-400"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <ul className="py-1 max-h-52 overflow-y-auto">
            {options.map((o) => (
              <li key={o.value}>
                <button type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm font-semibold transition-colors ${
                    value === o.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/* â”€â”€ Stat card â€” matches Dashboard StatCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const StatCard = ({ label, value, sub, icon, iconBg }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </div>
);

/* â”€â”€ Label for filter fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const FL = ({ children }) => (
  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 mb-1.5">{children}</p>
);

/* â”€â”€ Shared input style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal";

/* ── Fully custom Date Picker ──────────────────────────────────── */
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const DatePicker = ({ value, onChange, placeholder = "Select date" }) => {
  const [open, setOpen]           = useState(false);
  const [view, setView]           = useState("calendar"); // "calendar" | "month" | "year"
  const [viewYear, setViewYear]   = useState(() => value ? parseInt(value.split("-")[0]) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : new Date().getMonth());
  const ref = useRef(null);

  const yearStart = Math.floor(viewYear / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setView("calendar");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.split("-")[0]));
      setViewMonth(parseInt(value.split("-")[1]) - 1);
    }
  }, [value]);

  const display = () => {
    if (!value) return placeholder;
    const [y, m, d] = value.split("-");
    return `${d} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev     = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--)  cells.push({ d: daysInPrev - i, cur: false });
  for (let i = 1; i <= daysInMonth; i++)           cells.push({ d: i, cur: true });
  while (cells.length < 42)                        cells.push({ d: cells.length - firstDayOfWeek - daysInMonth + 1, cur: false });

  const select = (d, cur) => {
    if (!cur) return;
    const m = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${viewYear}-${m}-${dd}`);
    setOpen(false);
    setView("calendar");
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (d, cur) => {
    if (!cur || !value) return false;
    const [y, m, day] = value.split("-").map(Number);
    return y === viewYear && m - 1 === viewMonth && day === d;
  };
  const isToday = (d, cur) => {
    if (!cur) return false;
    const n = new Date();
    return n.getFullYear() === viewYear && n.getMonth() === viewMonth && n.getDate() === d;
  };

  const hasValue = !!value;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 pl-3 pr-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
          open
            ? "bg-white border-blue-500 ring-2 ring-blue-500/10 text-slate-800"
            : hasValue
            ? "bg-blue-50 border-blue-300 text-blue-700"
            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${open || hasValue ? "text-blue-500" : "text-slate-400"}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{display()}</span>
        </span>
        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180 text-blue-500" : "text-slate-400"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: "256px" }}>

          {view === "year" ? (
            <>
              {/* Year range nav */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
                <button type="button" onClick={() => setViewYear(y => y - 12)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-black text-slate-800 tracking-tight">
                  {yearStart}&ndash;{yearStart + 11}
                </span>
                <button type="button" onClick={() => setViewYear(y => y + 12)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {/* Year grid — selecting a year goes to month picker */}
              <div className="grid grid-cols-3 gap-1.5 p-3">
                {years.map(y => (
                  <button key={y} type="button"
                    onClick={() => { setViewYear(y); setView("month"); }}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                      y === viewYear
                        ? "bg-slate-900 text-white shadow-sm"
                        : y === new Date().getFullYear()
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </>

          ) : view === "month" ? (
            <>
              {/* Month picker header */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
                <button type="button" onClick={() => setViewYear(y => y - 1)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button type="button" onClick={() => setView("year")}
                  className="text-sm font-black text-slate-800 tracking-tight hover:text-blue-600 transition-colors px-2 py-0.5 rounded-lg hover:bg-blue-50">
                  {viewYear}
                </button>
                <button type="button" onClick={() => setViewYear(y => y + 1)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-3 gap-1.5 p-3">
                {MONTHS_SHORT.map((m, i) => (
                  <button key={m} type="button"
                    onClick={() => { setViewMonth(i); setView("calendar"); }}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                      i === viewMonth
                        ? "bg-slate-900 text-white shadow-sm"
                        : i === new Date().getMonth() && viewYear === new Date().getFullYear()
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>

          ) : (
            <>
              {/* Month nav */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
                <button type="button" onClick={prevMonth}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* Clickable month → month picker, clickable year → year picker */}
                <button type="button" onClick={() => setView("month")}
                  className="text-sm font-black text-slate-800 tracking-tight hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-blue-50">
                  {MONTHS_FULL[viewMonth]}
                </button>
                <button type="button" onClick={() => setView("year")}
                  className="text-sm font-black text-slate-800 tracking-tight hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-blue-50">
                  {viewYear}
                </button>
                <button type="button" onClick={nextMonth}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-3 pt-3 pb-1 gap-0.5">
                {DAY_LABELS.map(d => (
                  <span key={d} className="text-center text-[10px] font-black text-slate-400 uppercase leading-none py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
                {cells.map((cell, i) => (
                  <button key={i} type="button"
                    onClick={() => select(cell.d, cell.cur)}
                    className={`w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      !cell.cur
                        ? "text-slate-200 cursor-default"
                        : isSelected(cell.d, cell.cur)
                        ? "bg-slate-900 text-white shadow-sm"
                        : isToday(cell.d, cell.cur)
                        ? "bg-blue-50 text-blue-700 font-black ring-1 ring-blue-300"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {cell.d}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Clear */}
          {value && (
            <div className="border-t border-slate-100 px-3 pb-3 pt-1">
              <button type="button"
                onClick={() => { onChange(""); setOpen(false); setView("calendar"); }}
                className="w-full text-xs font-bold text-slate-400 hover:text-red-500 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* */
const Reports = ({ token }) => {
  /* filter */
  const [fromDate,       setFromDate]       = useState(monthAgo());
  const [toDate,         setToDate]         = useState(today());
  const [paymentFilter,  setPaymentFilter]  = useState("All");
  const [stateFilter,    setStateFilter]    = useState("All");
  const [citySearch,     setCitySearch]     = useState("");
  const [search,         setSearch]         = useState("");
  const [searchInput,    setSearchInput]    = useState("");

  /* data */
  const [rows,       setRows]       = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [states,     setStates]     = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [page,       setPage]       = useState(1);
  const limit = 50;

  /* sort */
  const [sortKey, setSortKey] = useState("orderDate");
  const [sortDir, setSortDir] = useState("desc");

  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef(null);

  /* â”€â”€ fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const fetchReport = useCallback(async (pg = 1) => {
    setLoading(true); setError(false);
    try {
      const params = { page: pg, limit };
      if (fromDate)                  params.from          = fromDate;
      if (toDate)                    params.to            = toDate;
      if (paymentFilter !== "All")   params.paymentMethod = paymentFilter;
      if (stateFilter   !== "All")   params.state         = stateFilter;
      if (citySearch.trim())         params.city          = citySearch.trim();
      if (search.trim())             params.search        = search.trim();

      const { data } = await axios.get(`${backendUrl}/api/order/report`, {
        params, headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setRows(data.rows); setSummary(data.summary);
        setStates(data.states || []); setTotalCount(data.totalCount || 0);
        setPage(pg);
      } else setError(true);
    } catch { setError(true); }
    finally  { setLoading(false); }
  }, [token, fromDate, toDate, paymentFilter, stateFilter, citySearch, search]);

  useEffect(() => { fetchReport(1); }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromDate, toDate, paymentFilter, stateFilter, citySearch, search]);

  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 450);
  };

  /* â”€â”€ export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { exportAll: "true" };
      if (fromDate)                  params.from          = fromDate;
      if (toDate)                    params.to            = toDate;
      if (paymentFilter !== "All")   params.paymentMethod = paymentFilter;
      if (stateFilter   !== "All")   params.state         = stateFilter;
      if (citySearch.trim())         params.city          = citySearch.trim();
      if (search.trim())             params.search        = search.trim();
      const { data } = await axios.get(`${backendUrl}/api/order/report`, {
        params, headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) downloadCSV(data.rows, `delivered-report-${fromDate}-to-${toDate}.csv`);
    } finally { setExporting(false); }
  };

  /* â”€â”€ sort â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };
  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
    if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const Th = ({ label, k, cls = "" }) => (
    <th onClick={() => handleSort(k)}
      className={`px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap hover:text-slate-700 transition-colors ${cls}`}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`transition-colors ${sortKey === k ? "text-blue-500" : "text-slate-300"}`}>
          {sortKey === k ? (sortDir === "asc" ? "â†‘" : "â†“") : "â†•"}
        </span>
      </span>
    </th>
  );

  const clearFilters = () => {
    setFromDate(monthAgo()); setToDate(today());
    setPaymentFilter("All"); setStateFilter("All");
    setCitySearch(""); setSearch(""); setSearchInput("");
  };

  const totalPages = Math.ceil(totalCount / limit);
  const hasFilters = paymentFilter !== "All" || stateFilter !== "All" || citySearch.trim() || search.trim();

  /* payment method options for FilterSelect */
  const pmOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));
  const stateOptions = [
    { value: "All", label: "All States" },
    ...states.map((s) => ({ value: s, label: s })),
  ];

  /* â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="space-y-6">

      {/* â”€â”€ PAGE HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Delivered Report</h2>
          <p className="text-sm text-slate-500 mt-0.5">Full line-item breakdown of every delivered order</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReport(page)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !rows.length}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
          >
            {exporting
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            }
            {exporting ? "Exportingâ€¦" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* â”€â”€ FILTERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {/* section header */}
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1 h-5 bg-blue-600 rounded-full" />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Filters</p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2.5 py-1 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Row 1: date range + payment */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 mb-5">
          <div>
            <FL>From</FL>
            <DatePicker value={fromDate} onChange={setFromDate} label="Select date" />
          </div>
          <div>
            <FL>To</FL>
            <DatePicker value={toDate} onChange={setToDate} label="Select date" />
          </div>
          <div>
            <FL>Payment</FL>
            <FilterSelect
              value={paymentFilter}
              onChange={setPaymentFilter}
              options={pmOptions}
              placeholder="All Methods"
            />
          </div>
        </div>

        {/* Row 2: state + city + search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
          <div>
            <FL>State</FL>
            <FilterSelect
              value={stateFilter}
              onChange={setStateFilter}
              options={stateOptions}
              placeholder="All States"
            />
          </div>
          <div>
            <FL>City</FL>
            <input
              type="text"
              placeholder="Search city..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className={inputCls}
            />
          </div>
          {/* Search */}
          <div>
            <FL>Search</FL>
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Order, customer or product..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ SUMMARY CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="Delivered Orders"
            value={fmtNum(summary.totalOrders)}
            iconBg="bg-emerald-50 text-emerald-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Total Revenue"
            value={fmt(summary.totalRevenue)}
            iconBg="bg-blue-50 text-blue-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Avg Order Value"
            value={fmt(summary.avgOrderValue)}
            iconBg="bg-violet-50 text-violet-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
          <StatCard
            label="Items Sold"
            value={fmtNum(summary.totalItems)}
            iconBg="bg-amber-50 text-amber-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
          />
          <StatCard
            label="Unique Customers"
            value={fmtNum(summary.uniqueCustomers)}
            iconBg="bg-rose-50 text-rose-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </div>
      )}

      {/* â”€â”€ ERROR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-black text-slate-700">Could not load report</p>
            <p className="text-xs text-slate-400 mt-1">Check the backend is running and you are logged in</p>
          </div>
          <button onClick={() => fetchReport(1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      )}

      {/* â”€â”€ TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* table toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-900 rounded-full" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                {loading ? "Loadingâ€¦" : `${fmtNum(totalCount)} line items`}
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              Page {page} / {totalPages || 1}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400 font-semibold">No delivered orders match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <Th label="Order #"     k="orderNumber"   cls="pl-5 text-white" />
                    <Th label="Date"        k="orderDate"     cls="text-white" />
                    <Th label="Customer"    k="customerName"  cls="text-white" />
                    <Th label="Shop"        k="shopName"      cls="text-white" />
                    <Th label="Phone"       k="phone"         cls="text-white" />
                    <Th label="City"        k="city"          cls="text-white" />
                    <Th label="State"       k="state"         cls="text-white" />
                    <Th label="Product"     k="productName"   cls="text-white" />
                    <Th label="Color"       k="color"         cls="text-white" />
                    <Th label="Fabric"      k="fabric"        cls="text-white" />
                    <Th label="Sizes"       k="sizes"         cls="text-white" />
                    <Th label="Qty"         k="quantity"      cls="text-white" />
                    <Th label="Unit â‚¹"      k="unitPrice"     cls="text-white" />
                    <Th label="Line Total"  k="lineTotal"     cls="text-white" />
                    <Th label="Order Total" k="orderTotal"    cls="text-white" />
                    <Th label="Payment"     k="paymentMethod" cls="text-white" />
                    <Th label="Paid?"       k="paymentStatus" cls="pr-5 text-white" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sorted.map((r, i) => (
                    <tr key={`${r.orderId}-${i}`} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-3 py-3 pl-5 font-mono text-xs text-blue-700 font-black whitespace-nowrap">
                        {r.orderNumber}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap font-semibold">{r.orderDate}</td>
                      <td className="px-3 py-3 font-black text-slate-800 whitespace-nowrap max-w-[140px] truncate text-xs" title={r.customerName}>
                        {r.customerName}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap max-w-[120px] truncate" title={r.shopName}>
                        {r.shopName}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap font-medium">{r.phone}</td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap font-semibold">{r.city}</td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap font-semibold">{r.state}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800 max-w-[180px] truncate text-xs" title={r.productName}>
                        {r.productName}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full border border-slate-200 flex-shrink-0"
                            style={{ background: r.color?.toLowerCase() === "â€”" ? "#e2e8f0" : r.color }} />
                          <span className="text-xs text-slate-600 capitalize font-medium">{r.color}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 capitalize font-medium">{r.fabric}</td>
                      <td className="px-3 py-3 text-xs text-slate-600 font-medium">{r.sizes || "â€”"}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-black">
                          {r.quantity}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-bold text-slate-600 whitespace-nowrap">
                        {fmt(r.unitPrice)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-black text-slate-900 whitespace-nowrap">
                        {fmt(r.lineTotal)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-black text-emerald-700 whitespace-nowrap">
                        {fmt(r.orderTotal)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-black ${
                          r.paymentMethod === "COD"
                            ? "bg-amber-100 text-amber-700"
                            : r.paymentMethod === "WhatsApp"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {r.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 py-3 pr-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black ${
                          r.paymentStatus === "Paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.paymentStatus === "Paid" ? "bg-emerald-500" : "bg-red-400"}`} />
                          {r.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* footer totals */}
                <tfoot className="bg-slate-900">
                  <tr>
                    <td colSpan={11} className="px-3 py-3 pl-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Page totals
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-700 text-white rounded-lg text-xs font-black">
                        {sorted.reduce((s, r) => s + r.quantity, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-slate-500">â€”</td>
                    <td className="px-3 py-3 text-right text-xs font-black text-white whitespace-nowrap">
                      {fmt(sorted.reduce((s, r) => s + r.lineTotal, 0))}
                    </td>
                    <td colSpan={3} className="pr-5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
              <button onClick={() => fetchReport(page - 1)} disabled={page <= 1 || loading}
                className="flex items-center gap-2 px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 hover:border-slate-300 rounded-xl transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pg;
                  if (totalPages <= 7) pg = i + 1;
                  else if (page <= 4) pg = i + 1;
                  else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                  else pg = page - 3 + i;
                  return (
                    <button key={pg} onClick={() => fetchReport(pg)} disabled={loading}
                      className={`w-8 h-8 text-xs font-black rounded-xl transition-all ${
                        pg === page
                          ? "bg-slate-900 text-white shadow-md"
                          : "text-slate-500 hover:bg-slate-100 border border-slate-200"
                      }`}>
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => fetchReport(page + 1)} disabled={page >= totalPages || loading}
                className="flex items-center gap-2 px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 hover:border-slate-300 rounded-xl transition-all">
                Next
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;


