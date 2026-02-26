import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";
import html2pdf from "html2pdf.js";

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
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Order Placed");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
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
        margin: 0.2, // smaller margins for waybill
        filename: `shipping-slip-${(orders.find(o => o._id === orderId)?.orderNumber) || orderId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        // Use A5 landscape or a custom thermal label size. A5 landscape is close to 4x6 labels but printable on A4.
        jsPDF: { unit: 'in', format: 'a5', orientation: 'landscape' }
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
  const filteredOrders = orders.filter((order) => order.status === activeStatus);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  const paginatedOrders = filteredOrders.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => setPage(1), [activeStatus]);

  /* ================= STATUS COLOR ================= */
  const statusColor = (status) => {
    if (status === "Delivered") return "text-green-600";
    if (status === "Cancelled") return "text-red-600";
    if (status === "Dispatched") return "text-amber-600";
    if (status === "Out for Delivery") return "text-orange-600";
    return "text-blue-600";
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Admin Orders
          </h2>
          <p className="text-gray-500">Manage and track all customer orders</p>
        </div>

        {/* ================= STATUS TABS ================= */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-8">
          {STATUS_TABS.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-5 md:px-8 py-3 rounded-2xl font-bold border-2 transition-all transform hover:scale-105 ${activeStatus === status
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl border-transparent"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 shadow-md"
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
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row gap-6 p-6">
                    {/* LEFT - Customer Info */}
                    <div className="flex gap-4 md:flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <img
                            src={assets.parcel_icon}
                            alt="parcel"
                            className="w-10 h-10"
                          />
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="font-bold text-xl text-gray-900 mb-2">
                          {order?.address?.fullName || "Customer"}
                        </p>

                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {getAddressText(order)}
                          </p>

                          <p className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {order?.address?.phone || "N/A"}
                          </p>
                        </div>

                        <div className="mt-3">
                          <span
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${order.status === "Delivered"
                              ? "bg-green-100 text-green-700"
                              : order.status === "Cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                              }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT - Actions */}
                    <div
                      className="md:w-1/3 space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-2xl border border-blue-100">
                        <p className="text-3xl font-bold text-gray-900">
                          {currency}
                          {order.amount}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Total Amount</p>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-semibold text-gray-700">
                          Payment Status:
                        </span>
                        <span
                          className={`font-bold ${order.payment ? "text-green-600" : "text-red-500"
                            }`}
                        >
                          {order.payment ? "✓ Paid" : "✗ Unpaid"}
                        </span>
                      </div>

                      <button
                        disabled={paymentLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePayment(order._id, !order.payment);
                        }}
                        className={`w-full py-3 rounded-xl font-semibold transition-all ${paymentLocked
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          }`}
                      >
                        Toggle Payment
                      </button>

                      {actions.length > 0 && (
                        <div className="flex gap-2">
                          {actions.map((a) => (
                            <button
                              key={a.status}
                              onClick={() => updateStatus(order._id, a.status)}
                              disabled={statusUpdating === order._id}
                              className={`flex-1 ${statusUpdating === order._id ? 'opacity-60 cursor-wait' : ''} bg-gradient-to-r ${a.color} text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
                            >
                              {statusUpdating === order._id ? 'Please wait...' : a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= PAGINATION ================= */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              Previous
            </button>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500 hover:text-blue-600 transition-all"
            >
              Next
            </button>
          </div>
        )}

        {/* --- ORDER DETAILS MODAL --- */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
            <div id="order-invoice-content" className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative transform transition-all duration-300 scale-100">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl z-10 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Order Details</h3>
                    <p className="text-sm text-blue-100 mt-1">
                      Order No: {selectedOrder.orderNumber || selectedOrder._id}
                    </p>
                    <p className="text-sm text-blue-100 mt-1">
                      Customer: {selectedOrder.userId?.name || selectedOrder?.address?.fullName || "Customer"} • {selectedOrder.userId?.email || "-"}
                    </p>
                  </div>
                  <div id="order-invoice-actions" className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadInvoice(selectedOrder._id); }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-sm"
                    >
                      Download Slip
                    </button>

                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* TIMELINE */}
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    {STATUS_TABS.map((s, idx) => {
                      const done = STATUS_TABS.indexOf(selectedOrder.status) >= idx;
                      const isActive = selectedOrder.status === s;

                      return (
                        <div key={s} className="flex-1 text-center">
                          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {done ? '✓' : idx + 1}
                          </div>
                          <div className={`text-xs mt-2 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                            {s}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* ORDER SUMMARY */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-lg mb-4 text-gray-800">
                    Order Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold">{getOrderDate(selectedOrder)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`font-semibold ${statusColor(
                          selectedOrder.status
                        )}`}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span
                        className={`font-semibold ${selectedOrder.payment ? "text-green-600" : "text-red-600"
                          }`}
                      >
                        {selectedOrder.payment ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold">
                        {selectedOrder.paymentMethod || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between md:col-span-2">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-xl text-blue-600">
                        {currency}
                        {selectedOrder.amount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CUSTOMER DETAILS */}
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <h4 className="font-bold text-lg mb-3 text-gray-800">
                      Customer Profile
                    </h4>
                    <div className="text-sm space-y-2 text-gray-700">
                      <p><span className="font-semibold text-indigo-900">Name:</span> {selectedOrder?.userId?.name || selectedOrder?.address?.fullName || "Guest"}</p>
                      <p><span className="font-semibold text-indigo-900">Email:</span> {selectedOrder?.userId?.email || "N/A"}</p>
                      <p><span className="font-semibold text-indigo-900">Profile Mobile:</span> {selectedOrder?.userId?.mobile || "N/A"}</p>
                      {selectedOrder?.userId?.shopName && (
                        <p><span className="font-semibold text-indigo-900">Shop Name:</span> {selectedOrder.userId.shopName}</p>
                      )}
                      {selectedOrder?.userId?.dob && (
                        <p><span className="font-semibold text-indigo-900">DOB:</span> {selectedOrder.userId.dob}</p>
                      )}
                      {selectedOrder?.userId?.gender && (
                        <p><span className="font-semibold text-indigo-900">Gender:</span> {selectedOrder.userId.gender}</p>
                      )}

                      {/* Show saved profile address if we populated it via userId */}
                      {selectedOrder?.userId?.address?.city && (
                        <div className="mt-3 bg-white/50 p-3 rounded border border-indigo-100/50">
                          <p className="font-semibold text-indigo-900 text-xs uppercase tracking-wide mb-1">Saved User Address:</p>
                          <p className="text-xs">{selectedOrder.userId.address.street}</p>
                          <p className="text-xs">{selectedOrder.userId.address.city}, {selectedOrder.userId.address.state}</p>
                          <p className="text-xs">{selectedOrder.userId.address.country} - {selectedOrder.userId.address.zipcode}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SHIPPING ADDRESS */}
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                    <h4 className="font-bold text-lg mb-3 text-gray-800">
                      Shipping Address For This Order
                    </h4>
                    <div className="text-sm space-y-1 text-gray-700">
                      <p className="font-semibold text-orange-900 mb-1">{selectedOrder?.address?.fullName || "N/A"}</p>
                      <p>{selectedOrder?.address?.addressLine || "N/A"}</p>
                      <p>
                        {selectedOrder?.address?.city || ""},{" "}
                        {selectedOrder?.address?.state || ""}
                      </p>
                      <p>
                        {selectedOrder?.address?.country || ""} -{" "}
                        {selectedOrder?.address?.pincode || ""}
                      </p>
                      <p className="mt-2 font-medium text-orange-900">Contact: {selectedOrder?.address?.phone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* ITEMS */}
                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                  <h4 className="font-bold text-lg mb-4 text-gray-800">
                    Order Items
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                          <th className="px-4 py-3 text-left rounded-tl-xl">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left">Color</th>
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-center">Size</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Price</th>
                          <th className="px-4 py-3 text-right rounded-tr-xl">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {(selectedOrder.items || []).map((item, i) => (
                          <tr
                            key={i}
                            className="border-b border-purple-100 hover:bg-purple-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-semibold">{item.name}</td>
                            <td className="px-4 py-3">{item.color}</td>
                            <td className="px-4 py-3">{item.code || "-"}</td>
                            <td className="px-4 py-3 text-center">{item.size}</td>
                            <td className="px-4 py-3 text-center font-semibold">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {currency}
                              {item.price}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-purple-600">
                              {currency}
                              {Number(item.price) * Number(item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RAW JSON */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-blue-600 font-semibold hover:text-blue-800 transition-colors flex items-center gap-2"
                  >
                    {showRaw ? "Hide Raw JSON Data" : "Show Raw JSON Data"}
                  </button>

                  {showRaw && (
                    <pre className="mt-4 bg-gray-900 text-green-400 text-xs p-6 rounded-xl overflow-x-auto font-mono shadow-inner">
                      {JSON.stringify(selectedOrder, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ================= HIDDEN SHIPPING SLIP (WAYBILL) FOR PDF ================= */}
        {selectedOrder && (
          <div style={{ display: "none" }}>
            {/* The scale and fixed width helps html2pdf render a consistent thermal label shape regardless of responsive screen sizes. w-[800px] was causing overflow, changed to w-[700px] or max-w-full */}
            <div id="shipping-slip-content" className="bg-white p-6 m-0 w-[750px] text-black font-sans box-border" style={{ letterSpacing: "0.5px" }}>

              {/* BRANDING / HEADER ZONE */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div className="w-1/2">
                  <h1 className="text-3xl font-black uppercase tracking-tighter">FABNOOR</h1>
                  <p className="text-sm font-bold tracking-widest uppercase mt-1">Shipping Waybill</p>
                </div>
                <div className="w-1/2 text-right flex flex-col items-end">
                  {/* Fake Barcode */}
                  <div className="font-mono text-2xl md:text-3xl lg:text-4xl tracking-widest mt-1 mb-2 text-black px-2 py-2 border-t-4 border-b-4 border-black w-full text-center" style={{ wordBreak: 'break-all', lineHeight: '1.2' }}>
                    *{selectedOrder.orderNumber || selectedOrder._id.toString().slice(-6)}*
                  </div>
                  <p className="font-bold text-sm">Order: {selectedOrder.orderNumber || selectedOrder._id}</p>
                  <p className="text-xs text-gray-600">Date: {getOrderDate(selectedOrder).split(',')[0]}</p>
                </div>
              </div>

              {/* PAYMENT & ROUTING ZONE */}
              <div className="flex bg-gray-100 border border-black mb-4">
                <div className="flex-1 p-3 text-center border-r border-black">
                  <p className="text-xs uppercase font-bold text-gray-500 mb-1">Payment Method</p>
                  <p className="text-lg font-black uppercase">{selectedOrder.paymentMethod}</p>
                </div>
                <div className="flex-1 p-3 text-center flex items-center justify-center">
                  <p className="text-sm font-bold uppercase tracking-widest">NO CASH TO BE COLLECTED</p>
                </div>
              </div>

              {/* ADDRESS ZONE (TO & FROM) */}
              <div className="grid grid-cols-2 gap-6 mb-6">

                {/* SHIP TO */}
                <div className="border border-black p-4 relative">
                  <div className="absolute -top-3 left-3 bg-white px-2 text-xs font-black uppercase">Deliver To</div>
                  <p className="font-black text-lg mb-2">{selectedOrder.address?.fullName || "Customer"}</p>
                  <div className="text-sm font-medium leading-relaxed">
                    <p>{selectedOrder.address?.addressLine || ""}</p>
                    <p>{selectedOrder.address?.city || ""}, {selectedOrder.address?.state || ""}</p>
                    <p className="font-bold text-base mt-1">{selectedOrder.address?.country || ""} - {selectedOrder.address?.pincode || ""}</p>
                    <p className="mt-3 font-bold border-t border-gray-300 pt-2">Phone: {selectedOrder.address?.phone || "N/A"}</p>
                  </div>
                </div>

                {/* RETURN TO */}
                <div className="border border-black p-4 relative bg-gray-50">
                  <div className="absolute -top-3 left-3 bg-gray-50 px-2 text-xs font-bold uppercase text-gray-600">Return Address (If Undelivered)</div>

                  {adminProfile?.shopName ? (
                    <p className="font-black text-md mb-2">{adminProfile.shopName}</p>
                  ) : (
                    <p className="font-black text-md mb-2">FABNOOR RETURNS</p>
                  )}

                  <div className="text-sm text-gray-700 leading-relaxed">
                    {adminProfile?.name && <p>Attn: {adminProfile.name}</p>}

                    {adminProfile?.address?.street ? (
                      <>
                        <p>{adminProfile.address.street}</p>
                        <p>{adminProfile.address.city}, {adminProfile.address.state}</p>
                        <p>{adminProfile.address.country} - {adminProfile.address.zipcode}</p>
                      </>
                    ) : (
                      <p className="italic text-gray-500 mt-2">No return address configured in admin profile.</p>
                    )}

                    {adminProfile?.mobile && (
                      <p className="mt-2 font-semibold">Phone: {adminProfile.mobile}</p>
                    )}
                  </div>
                </div>

              </div>

              {/* PRODUCT DETAILS (NO PRICES) */}
              <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-4">
                <p className="text-xs uppercase font-bold text-gray-500 mb-2 tracking-widest">Contents Declaration</p>
                <table className="w-full text-sm text-left border border-gray-300">
                  <thead className="bg-gray-100 border-b border-gray-300 uppercase text-xs">
                    <tr>
                      <th className="p-2 border-r border-gray-300 w-12 text-center">Qty</th>
                      <th className="p-2 border-r border-gray-300">Item Description</th>
                      <th className="p-2 border-r border-gray-300 w-24">SKU / Code</th>
                      <th className="p-2 w-32">Variant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder?.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 border-r border-gray-300 text-center font-bold text-lg">{item.quantity}</td>
                        <td className="p-2 border-r border-gray-300 font-semibold">{item.name}</td>
                        <td className="p-2 border-r border-gray-300 font-mono text-xs">{item.code || "N/A"}</td>
                        <td className="p-2 text-xs">
                          <div>{item.color ? `Color: ${item.color}` : ''}</div>
                          <div>{item.size ? `Size: ${item.size}` : ''}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 text-center text-xs text-gray-400 uppercase font-semibold">
                This is a computer-generated document. No signature is required.
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Order;
