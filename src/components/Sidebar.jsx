import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { assets } from "../assets/assets.js";

const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl transition-all active:scale-95"
      >
        {isMobileMenuOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`md:hidden fixed left-0 top-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 border-b border-slate-100">
          <p className="font-bold text-lg text-slate-800 tracking-tight">
            Administration
          </p>
        </div>
        <div className="p-4 flex flex-col gap-1">
          {[
            { to: "/add", icon: assets.add_icon, label: "Add Items" },
            { to: "/list", icon: assets.order_icon, label: "List Items" },
            { to: "/orders", icon: assets.order_icon, label: "Orders" },
            { to: "/reels", icon: assets.order_icon, label: "Reels" },
            { to: "/category", icon: assets.parcel_icon, label: "Categories" },
            { to: "/hero", icon: assets.add_icon, label: "Hero Slides" },
            {
              to: "/discount",
              icon: assets.add_icon,
              label: "Global Discount",
            },
            { to: "/users", icon: assets.parcel_icon, label: "Users" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <img className="w-5 h-5 opacity-80" src={item.icon} alt="" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-slate-900 text-slate-300 flex-shrink-0">
        <div className="flex flex-col gap-1 p-4 h-full">
          <div className="px-4 mb-6 mt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Main Navigation
            </p>
          </div>

          {[
            { to: "/add", icon: assets.add_icon, label: "Add Items" },
            { to: "/list", icon: assets.order_icon, label: "List Items" },
            { to: "/orders", icon: assets.order_icon, label: "Orders" },
            { to: "/reels", icon: assets.order_icon, label: "Reels" },
            { to: "/category", icon: assets.parcel_icon, label: "Categories" },
            { to: "/hero", icon: assets.add_icon, label: "Hero Slides" },
            {
              to: "/discount",
              icon: assets.add_icon,
              label: "Global Discount",
            },
            { to: "/users", icon: assets.parcel_icon, label: "Users" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-medium"
                    : "hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <img
                className={`w-5 h-5 transition-all group-hover:scale-110 brightness-0 invert opacity-70`}
                src={item.icon}
                alt=""
              />
              <span className="text-[14px]">{item.label}</span>
            </NavLink>
          ))}

          {/* Spacer */}
          <div className="mt-auto p-4 bg-slate-800/50 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-xs font-semibold text-slate-400">
                System Online
              </p>
            </div>
            <p className="text-[10px] text-slate-500">v2.1.0-fabnoor-admin</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
