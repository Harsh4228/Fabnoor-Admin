import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";
import html2pdf from "html2pdf.js";
import { formatNumber } from "../utils/price";
import { useLocation } from "react-router-dom";

/* ================= CONFIG ================= */
const STATUS_TABS = [
  "Order Placed",
  "Dispatched",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];
const PAGE_SIZE = 6;

const Order = ({ token }) => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState(
    STATUS_TABS.includes(location.state?.status) ? location.state.status : "Order Placed"
  );
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [paymentUpdating, setPaymentUpdating] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [cancelModal, setCancelModal] = useState({ show: false, orderId: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [adminProfile, setAdminProfile] = useState(null); // ✅ hold admin profile for return address

  /* ================= FETCH ADMIN PROFILE ================= */
  const fetchAdminProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${backendUrl}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAdminProfile(res.data.user);
      }
    } catch (error) {
      console.error("Failed to fetch admin profile for shipping slip:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  /* ================= FETCH ORDERS ================= */
  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/order/list`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        const list = Array.isArray(res.data.orders) ? res.data.orders : [];
        // backend already returns newest-first; preserve that order so newest appears first
        setOrders(list);
      } else {
        toast.error(res.data.message || "Failed to fetch orders");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (orderId, status) => {
    setStatusUpdating(orderId);
    try {
      const res = await axios.post(
        `${backendUrl}/api/order/status`,
        { orderId, status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        // Optimistically update local lists so UI reflects change immediately
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status } : o))
        );
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, status }));
        }

        toast.success(`Order marked as ${status}`);
        // fetch fresh data in background to keep everything in sync
        fetchOrders();
      } else {
        toast.error(res.data.message || "Failed to update status");
      }
    } catch (error) {
      // Refresh list to sync state — server may have partially succeeded
      await fetchOrders();
      toast.error("Failed to update status (server error). List refreshed.");
      console.error("Update status error:", error);
    } finally {
      setStatusUpdating(null);
    }
  };

  /* ================= UPDATE PAYMENT ================= */
  const updatePayment = async (orderId, payment) => {
    setPaymentUpdating(orderId);
    try {
      const res = await axios.post(
        `${backendUrl}/api/order/paymentstatus`,
        { orderId, payment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        toast.success(payment ? "Payment marked as Paid" : "Payment marked as Unpaid");
        fetchOrders();
      } else {
        toast.error(res.data.message || "Failed to update payment");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setPaymentUpdating(null);
    }
  };

  /* ================= DOWNLOAD SHIPPING SLIP (WAYBILL) ================= */
  const downloadInvoice = async (orderId) => {
    try {
      const element = document.getElementById("shipping-slip-content");
      if (!element) {
        toast.error("Could not find shipping slip layout.");
        return;
      }

      // Temporarily reveal it to take the snapshot
      element.style.display = "block";

      const opt = {
        margin: 0,
        filename: `invoice-${(orders.find(o => o._id === orderId)?.orderNumber) || orderId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: [148, 210], orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();

      // Hide it again
      element.style.display = "none";

    } catch (err) {
      toast.error(err.message || "Failed to download slip");
      const element = document.getElementById("shipping-slip-content");
      if (element) {
        element.style.display = "none";
      }
    }
  };
  /* ================= FILTER + PAGINATION ================= */
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = order.status === activeStatus;
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      order.address?.fullName?.toLowerCase().includes(searchLower) ||
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order._id?.toLowerCase().includes(searchLower) ||
      order.address?.phone?.includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  const paginatedOrders = filteredOrders.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => setPage(1), [activeStatus, searchTerm]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, activeStatus]);

  /* ================= NEXT ACTIONS FOR STATUS TRANSITIONS ================= */
  const getNextActions = (status) => {
    switch (status) {
      case "Order Placed":
        return [
          { label: "Dispatch", status: "Dispatched", color: "from-indigo-500 to-indigo-600" },
          { label: "Cancel", status: "Cancelled", color: "from-red-500 to-red-600" },
        ];
      case "Dispatched":
        return [
          { label: "Out for Delivery", status: "Out for Delivery", color: "from-yellow-500 to-yellow-600" },
          { label: "Cancel", status: "Cancelled", color: "from-red-500 to-red-600" },
        ];
      case "Out for Delivery":
        return [
          { label: "Mark Delivered", status: "Delivered", color: "from-green-500 to-green-600" },
          { label: "Cancel", status: "Cancelled", color: "from-red-500 to-red-600" },
        ];
      default:
        return [];
    }
  };

  /* ================= SAFE ADDRESS ================= */
  const getAddressText = (order) => {
    const a = order?.address || {};
    const addressLine = a.addressLine || "";
    const city = a.city || "";
    const state = a.state || "";
    const pincode = a.pincode || "";
    return `${addressLine}, ${city}, ${state} - ${pincode}`;
  };

  const getOrderDate = (order) => {
    const d = order?.createdAt || order?.date || order?.updatedAt;
    if (!d) return "N/A";
    return new Date(d).toLocaleString();
  };

  return (
    <div className="fade-in">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Order Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track and manage customer orders across all stages</p>
        </div>

        {/* Search Bar - Integrated in header area */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Status Filters - Compact Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-100/50 p-1 rounded-xl w-fit border border-slate-200">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeStatus === status
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* ================= ORDER LIST ================= */}
      {paginatedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
          <svg
            className="w-24 h-24 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-xl font-semibold text-gray-400">No orders found</p>
          <p className="text-gray-400 mt-2">
            Orders with "{activeStatus}" status will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {paginatedOrders.map((order) => {
            const paymentLocked = order.status === "Cancelled";
            const actions = getNextActions(order.status);

            return (
              <div
                key={order._id}
                onClick={() => {
                  setSelectedOrder(order);
                  setShowRaw(false);
                }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  {/* LEFT - Customer & Logistics Info */}
                  <div className="p-4 flex gap-4 items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <img
                          src={assets.parcel_icon}
                          alt="parcel"
                          className="w-6 h-6 invert brightness-0"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-base text-slate-900 truncate">
                          {order?.address?.fullName || "Anonymous Buyer"}
                        </h3>
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">
                          ID: {(order.orderNumber || order._id).slice(-6)}
                        </span>
                      </div>

                      <div className="space-y-1 text-[12px] font-bold text-slate-500">
                        <p className="flex items-center gap-2 truncate">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {getAddressText(order)}
                        </p>
                        <p className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {order?.address?.phone || "NO CONTACT"}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${order.status === "Delivered" ? "bg-green-50 text-green-600 border-green-100" : order.status === "Cancelled" ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>
                          {order.status}
                        </span>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                          {getOrderDate(order)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT - Economic Integrity & Actions */}
                  <div
                    className="p-4 bg-slate-50/50 flex flex-col justify-between gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Valuation</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">
                          {currency}{formatNumber(order.amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${order.payment ? "text-green-600" : "text-red-500"}`}>
                          {order.payment ? "VALIDATED" : "AWAITING"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={paymentLocked || paymentUpdating === order._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePayment(order._id, !order.payment);
                        }}
                        className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${paymentLocked || paymentUpdating === order._id
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-sm active:scale-95"
                          }`}
                      >
                        {paymentUpdating === order._id ? "..." : "PAYMENT"}
                      </button>

                      {actions.length > 0 && actions.map((a) => (
                        <button
                          key={a.status}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (a.label === 'Cancel') {
                              setCancelModal({ show: true, orderId: order._id });
                            } else {
                              updateStatus(order._id, a.status);
                            }
                          }}
                          disabled={statusUpdating === order._id}
                          className={`bg-slate-900 text-white py-2 px-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-slate-800 active:scale-95 transition-all ${statusUpdating === order._id ? 'opacity-50 cursor-wait' : ''} ${a.label === 'Cancel' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        >
                          {statusUpdating === order._id ? '...' : a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      )
      }

      {/* ================= PAGINATION ================= */}
      {
        totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-12 pb-10">
            <button
              disabled={page === 1}
              onClick={() => {
                setPage(page - 1);
                const main = document.querySelector('main');
                if (main) main.scrollTo({ top: 0, behavior: 'instant' });
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg border border-slate-800">
              Phase {page} <span className="text-slate-500 mx-1">/</span> {totalPages}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => {
                setPage(page + 1);
                const main = document.querySelector('main');
                if (main) main.scrollTo({ top: 0, behavior: 'instant' });
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )
      }

      {/* --- ORDER DETAILS MODAL --- */}
      {
        selectedOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
            <div
              id="order-invoice-content"
              className="bg-white w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-500 text-[10px] font-black uppercase tracking-widest rounded">Official Order</span>
                    <h3 className="text-xl font-bold tracking-tight">
                      {selectedOrder.orderNumber || selectedOrder._id}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs">
                    <p className="flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {selectedOrder.userId?.name || selectedOrder?.address?.fullName || "Guest Customer"}
                    </p>
                    <p className="flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {getOrderDate(selectedOrder)}
                    </p>
                  </div>
                </div>

                <div id="order-invoice-actions" className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadInvoice(selectedOrder._id);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-bold transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    DOWNLOAD SLIP
                  </button>

                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                {/* TIMELINE / STEPPER */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto overflow-x-auto no-scrollbar pb-2">
                    {STATUS_TABS.map((s, idx) => {
                      const statusIndex = STATUS_TABS.indexOf(selectedOrder.status);
                      const isDone = statusIndex >= idx;
                      const isCurrent = selectedOrder.status === s;
                      const isCancelled = selectedOrder.status === "Cancelled" && s === "Cancelled";

                      return (
                        <div key={s} className="flex flex-col items-center min-w-[100px] flex-1 relative">
                          {/* Line connector */}
                          {idx !== 0 && (
                            <div className={`absolute left-[-50%] top-4 w-full h-[2px] -translate-y-1/2 z-0 ${statusIndex >= idx ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                          )}

                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] z-10 transition-all duration-300 shadow-sm ${isCancelled ? 'bg-red-600 text-white ring-4 ring-red-100' :
                            isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' :
                              isDone ? 'bg-blue-600 text-white' :
                                'bg-white text-slate-400 border border-slate-200'
                            }`}>
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider mt-3 text-center whitespace-nowrap ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                            {s}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* INFO CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Financial Summary */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">₹</div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Payment History</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-slate-500 text-xs font-medium">Total Amount Payable</p>
                        <p className="text-2xl font-black text-slate-900">{currency}{formatNumber(selectedOrder.amount)}</p>
                      </div>
                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Method</span>
                          <span className="font-bold text-slate-700 uppercase tracking-tighter">{selectedOrder.paymentMethod || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Clearance</span>
                          <span className={`font-black px-2 py-0.5 rounded ${selectedOrder.payment ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {selectedOrder.payment ? "DEPOSITED" : "PENDING"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Identity */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Customer Identity</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="font-bold text-slate-900 text-sm truncate">{selectedOrder?.userId?.name || selectedOrder?.address?.fullName || "Guest"}</p>
                      <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                        <p className="flex items-center gap-2"><span className="text-slate-300">✉️</span> {selectedOrder?.userId?.email || "No email provided"}</p>
                        <p className="flex items-center gap-2"><span className="text-slate-300">📞</span> {selectedOrder?.address?.phone || "No phone"}</p>
                        {selectedOrder?.userId?.shopName && (
                          <p className="flex items-center gap-2"><span className="text-slate-300">🏪</span> {selectedOrder.userId.shopName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logistics */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Logistics Destination</h4>
                    </div>
                    <div className="text-xs text-slate-600 font-medium leading-relaxed">
                      <p className="font-bold text-slate-900 mb-1">{selectedOrder?.address?.fullName}</p>
                      <p>{selectedOrder?.address?.addressLine}</p>
                      <p>{selectedOrder?.address?.city}, {selectedOrder?.address?.state}</p>
                      <p className="text-slate-900 font-bold mt-1">{selectedOrder?.address?.pincode}</p>
                    </div>
                  </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Itemized Manifest</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                          <th className="px-4 py-3 text-left">SKU / Catalog Entry</th>
                          <th className="px-4 py-3 text-center">Attributes</th>
                          <th className="px-4 py-3 text-center">Configuration</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Unit Price</th>
                          <th className="px-4 py-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedOrder.items || []).map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 text-xs">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{item.name}</span>
                                <span className="mt-1 inline-block w-fit px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-mono font-black uppercase tracking-widest rounded leading-none">
                                  {item.code || "NO-SKU"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase border border-slate-200">
                                {item.color || "Default"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-wrap justify-center gap-1">
                                {Array.isArray(item.size) ? (
                                  item.size.map(s => (
                                    <span key={s} className="px-1 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded border border-blue-100">
                                      {s}
                                    </span>
                                  ))
                                ) : (
                                  <span className="px-1 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded border border-blue-100">
                                    {item.size || "-"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-black text-slate-900">{item.quantity}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium text-slate-400">{currency}{item.price}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-black text-blue-600">{currency}{formatNumber(Number(item.price) * Number(item.quantity))}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      }

      {/* ================= CANCEL CONFIRMATION MODAL ================= */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-hidden">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Are you sure?</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">Do you really want to cancel this order? This action cannot be undone.</p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setCancelModal({ show: false, orderId: null })}
                className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors"
              >
                No, Keep
              </button>
              <button
                onClick={() => {
                  updateStatus(cancelModal.orderId, "Cancelled");
                  setCancelModal({ show: false, orderId: null });
                }}
                className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= HIDDEN INVOICE (BILL) FOR PDF ================= */}
      {
        selectedOrder && (
          <div style={{ display: "none" }}>
            <div id="shipping-slip-content" style={{ width: "520px", margin: "0 auto", background: "white", fontFamily: "Arial, sans-serif", color: "#000", boxSizing: "border-box", padding: "18px 20px", border: "2px solid #000" }}>

              {/* ── HEADER ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "8px" }}>
                <div style={{ width: "80px" }} />
                <div style={{ textAlign: "center" }}>
                  <img src={assets.logo} alt="FabNoor" style={{ height: "44px", objectFit: "contain", display: "block", margin: "0 auto" }} />
                  <div style={{ fontSize: "9px", color: "#555", marginTop: "3px" }}>fabnoor.com &nbsp;|&nbsp; The Princess Look</div>
                </div>
                <div style={{ width: "80px" }} />
              </div>

              {/* ── SHIP TO / RETURN TO ── */}
              <div style={{ display: "flex", gap: "0", borderBottom: "1.5px solid #000", marginBottom: "0" }}>
                <div style={{ flex: "1", padding: "6px 8px", borderRight: "1.5px solid #000", fontSize: "10px", lineHeight: "1.6" }}>
                  <div style={{ fontWeight: "800", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>Ship To (Customer Address):</div>
                  <div style={{ fontWeight: "700", fontSize: "11px", textTransform: "capitalize" }}>{selectedOrder?.address?.fullName || "Customer"}</div>
                  <div style={{ textTransform: "capitalize" }}>{selectedOrder?.address?.addressLine}</div>
                  <div style={{ textTransform: "capitalize" }}>{selectedOrder?.address?.city}, {selectedOrder?.address?.state} – {selectedOrder?.address?.pincode}</div>
                  <div style={{ fontWeight: "700" }}>Ph: {selectedOrder?.address?.phone}</div>
                </div>
                <div style={{ flex: "1", padding: "6px 8px", fontSize: "10px", lineHeight: "1.6" }}>
                  <div style={{ fontWeight: "800", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>If Undelivered, Return To:</div>
                  <div style={{ fontWeight: "700", fontSize: "11px" }}>{adminProfile?.shopName || "FabNoor"}</div>
                  {adminProfile?.address?.street && <div>{adminProfile.address.street}</div>}
                  <div>{[adminProfile?.address?.city, adminProfile?.address?.state, adminProfile?.address?.zipcode].filter(Boolean).join(", ")}</div>
                  <div style={{ color: "#888" }}>fabnoor.com</div>
                </div>
              </div>

              {/* ── ORDER META ── */}
              <div style={{ display: "flex", borderBottom: "1.5px solid #000", fontSize: "9.5px" }}>
                <div style={{ flex: "1", padding: "4px 8px", borderRight: "1px solid #000" }}>
                  <span style={{ fontWeight: "700" }}>Order ID:</span> {selectedOrder.orderNumber || selectedOrder._id}
                </div>
                <div style={{ flex: "0 0 auto", padding: "4px 8px", borderRight: "1px solid #000" }}>
                  <span style={{ fontWeight: "700" }}>Date:</span> {getOrderDate(selectedOrder).split(",")[0]}
                </div>
                <div style={{ flex: "0 0 auto", padding: "4px 8px" }}>
                  <span style={{ fontWeight: "700" }}>Payment:</span>{" "}
                  <span style={{ fontWeight: "800", color: selectedOrder.payment ? "#16a34a" : "#dc2626" }}>
                    {selectedOrder.payment ? "PAID" : "COD"}
                  </span>
                </div>
              </div>

              {/* ── PRODUCT TABLE ── */}
              {(() => {
                const items = selectedOrder.items || [];
                const totalSets = items.reduce((s, item) => s + Number(item.quantity), 0);
                const totalPcsAll = items.reduce((s, item) => {
                  const sizeArr = Array.isArray(item.size) ? item.size.filter(Boolean) : [item.size].filter(Boolean);
                  const pcsPerSet = sizeArr.length > 1 ? sizeArr.length : 1;
                  return s + Number(item.quantity) * pcsPerSet;
                }, 0);
                const grandTotal = selectedOrder.amount || items.reduce((s, item) => s + Number(item.price) * Number(item.quantity), 0);
                const multiRow = true; // always show totals footer
                return (
                  <div style={{ borderBottom: "1.5px solid #000" }}>
                    <div style={{ background: "#eee", padding: "4px 8px", fontSize: "9px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1.5px", textAlign: "center", borderBottom: "1px solid #000" }}>
                      Product Details
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                      <thead>
                        <tr style={{ background: "#f7f7f7", borderBottom: "1px solid #000" }}>
                          <th style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ccc", width: "5%" }}>No.</th>
                          <th style={{ padding: "4px 6px", textAlign: "left", borderRight: "1px solid #ccc", width: "20%" }}>SKU</th>
                          <th style={{ padding: "4px 6px", textAlign: "left", borderRight: "1px solid #ccc", width: "14%" }}>Color</th>
                          <th style={{ padding: "4px 6px", textAlign: "left", borderRight: "1px solid #ccc", width: "18%" }}>Size</th>
                          <th style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ccc", width: "9%" }}>Qty<br />(Set)</th>
                          <th style={{ padding: "4px 6px", textAlign: "right", borderRight: "1px solid #ccc", width: "12%" }}>Rate/Pc<br />(₹)</th>
                          <th style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ccc", width: "9%" }}>Qty<br />(Pcs)</th>
                          <th style={{ padding: "4px 6px", textAlign: "right", width: "13%" }}>Total<br />(₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const sizeArr = Array.isArray(item.size) ? item.size.filter(Boolean) : [item.size].filter(Boolean);
                          const sizeDisplay = sizeArr.length > 1 ? `${sizeArr[0]} to ${sizeArr[sizeArr.length - 1]}` : sizeArr[0] || "–";
                          const pcsPerSet = sizeArr.length > 1 ? sizeArr.length : 1;
                          const totalPcs = Number(item.quantity) * pcsPerSet;
                          // Rate per piece = set price ÷ pieces per set
                          const ratePerPc = pcsPerSet > 1 ? Number(item.price) / pcsPerSet : Number(item.price);
                          const lineTotal = Number(item.price) * Number(item.quantity);
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                              <td style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ddd", fontWeight: "700" }}>{i + 1}</td>
                              <td style={{ padding: "4px 6px", borderRight: "1px solid #ddd", fontFamily: "Courier New, monospace", fontWeight: "700", fontSize: "9.5px" }}>{item.code || "N/A"}</td>
                              <td style={{ padding: "4px 6px", borderRight: "1px solid #ddd", textTransform: "capitalize" }}>{item.color || "–"}</td>
                              <td style={{ padding: "4px 6px", borderRight: "1px solid #ddd", fontWeight: "600" }}>{sizeDisplay}</td>
                              <td style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ddd", fontWeight: "700" }}>{item.quantity}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right", borderRight: "1px solid #ddd" }}>₹{ratePerPc.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                              <td style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ddd" }}>{totalPcs}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: "700" }}>₹{lineTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* ── TOTALS ROW (only when >1 product) ── */}
                      {multiRow && (
                        <tfoot>
                          <tr style={{ borderTop: "1.5px solid #000", background: "#f0f0f0", fontWeight: "800", fontSize: "10px" }}>
                            <td colSpan="4" style={{ padding: "4px 6px", borderRight: "1px solid #ccc", textAlign: "right", letterSpacing: "0.5px" }}>TOTAL</td>
                            <td style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ccc" }}>{totalSets}</td>
                            <td style={{ borderRight: "1px solid #ccc" }}></td>
                            <td style={{ padding: "4px 5px", textAlign: "center", borderRight: "1px solid #ccc" }}>{totalPcsAll}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", color: "#e91e63" }}>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                );
              })()}

              {/* ── NOTE ── */}
              <div style={{ padding: "7px 10px", fontSize: "9px", lineHeight: "1.7", color: "#444", borderBottom: "1.5px solid #000" }}>
                <div>• Returns accepted as per Terms &amp; Conditions.</div>
                <div>• For queries: fabnoor.com</div>
              </div>

              {/* ── FOOTER STRIP ── */}
              <div style={{ borderTop: "2px solid #e91e63", marginTop: "8px", paddingTop: "6px", textAlign: "center", fontSize: "9px", color: "#aaa" }}>
                <strong style={{ color: "#e91e63" }}>FabNoor</strong>&nbsp;•&nbsp;fabnoor.com&nbsp;•&nbsp;The Princess Look
              </div>

            </div>
          </div>
        )
      }

    </div >
  );
};

export default Order;
