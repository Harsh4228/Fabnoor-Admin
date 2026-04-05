import React, { useState } from "react";
import { NavLink } from "react-router-dom";

/* ── SVG icon components ──────────────────────────────────── */
const Icon = ({ d, d2 }) => (
  <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d2} />}
  </svg>
);

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  add:      "M12 4v16m8-8H4",
  list:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  orders:   "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  reels:    "M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z",
  category: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  hero:     "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  pageimg:  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  discount:    "M7 7h.01M17 17h.01M7 17L17 7M6 6m0 0a1 1 0 100 2 1 1 0 000-2zm11 11a1 1 0 100 2 1 1 0 000-2z",
  users:       "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  report:      "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  signupreq:   "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
};

const NAV = [
  { section: "Overview" },
  { to: "/dashboard", icon: ICONS.dashboard, label: "Dashboard" },
  { section: "Products" },
  { to: "/add",      icon: ICONS.add,      label: "Add Product" },
  { to: "/list",     icon: ICONS.list,     label: "Products" },
  { section: "Store" },
  { to: "/orders",   icon: ICONS.orders,   label: "Orders" },
  { to: "/category", icon: ICONS.category, label: "Categories" },
  { to: "/hero",        icon: ICONS.hero,     label: "Hero Slides" },
  { to: "/page-images", icon: ICONS.pageimg,  label: "Page Images" },
  { to: "/reels",       icon: ICONS.reels,    label: "Reels" },
  { section: "Settings" },
  { to: "/discount",        icon: ICONS.discount,   label: "Global Discount" },
  { to: "/users",           icon: ICONS.users,      label: "Users" },
  { to: "/signup-requests", icon: ICONS.signupreq,  label: "Signup Requests" },
  { to: "/reports",         icon: ICONS.report,     label: "Reports" },
];

/* ── Shared nav-link renderer ─────────────────────────────── */
const NavItem = ({ item, onClick }) => (
  <NavLink
    to={item.to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
        isActive
          ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`
    }
  >
    {({ isActive }) => (
      <>
        <span className={`transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}>
          <Icon d={item.icon} />
        </span>
        <span className="text-[13.5px] font-medium leading-none">{item.label}</span>
      </>
    )}
  </NavLink>
);

/* ── Section label ────────────────────────────────────────── */
const SectionLabel = ({ label }) => (
  <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-[0.18em] select-none">
    {label}
  </p>
);

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const navContent = (
    <nav className="flex flex-col px-3 pb-4 flex-1 overflow-y-auto">
      {NAV.map((item, i) =>
        item.section ? (
          <SectionLabel key={i} label={item.section} />
        ) : (
          <NavItem key={item.to} item={item} onClick={close} />
        )
      )}
    </nav>
  );

  return (
    <>
      {/* ── Mobile hamburger (top-left, inside header area) ── */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Mobile overlay ─────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={close}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-white font-bold text-sm tracking-tight">Fabnoor Admin</span>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
        <div className="px-5 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-500 font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* ── Desktop sidebar ────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 h-full bg-slate-900 flex-shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-none">Fabnoor</p>
            <p className="text-slate-500 text-[10px] font-medium mt-0.5 tracking-wider uppercase">Admin Panel</p>
          </div>
        </div>

        {navContent}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-semibold">System Online</span>
          </div>
          <p className="text-[10px] text-slate-600">v2.1.0-fabnoor-admin</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
