import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl, currency } from "../App";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";

/* ================= CONFIG ================= */
const STATUS_TABS = ["Order Placed", "Delivered", "Cancelled"];
const PAGE_SIZE = 6;

const Order = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Order Placed");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  /* ================= FETCH ORDERS ================= */
  const fetchOrders = async () => {
    if (!token) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/order/list`,
        {},
        { headers:{
          Authorization: `Bearer ${token}`
        }}
      );

      if (res.data.success) {
        setOrders(res.data.orders.reverse());
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (orderId, status) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/order/status`,
        { orderId, status },
        { headers: { 
          Authorization: `Bearer ${token}`
         } }
      );

      if (res.data.success) {
        toast.success(
          status === "Delivered"
            ? "Order marked as Delivered"
            : "Order Cancelled"
        );
        fetchOrders();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  /* ================= UPDATE PAYMENT ================= */
  const updatePayment = async (orderId, payment) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/order/paymentstatus`,
        { orderId, payment },
        { headers: { 
          Authorization: `Bearer ${token}`
        } }
      );

      if (res.data.success) {
        toast.success(
          payment ? "Payment marked as Paid" : "Payment marked as Unpaid"
        );
        fetchOrders();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  /* ================= FILTER + PAGINATION ================= */
  const filteredOrders = orders.filter(
    (order) => order.status === activeStatus
  );

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
    return "text-blue-600";
  };

  return (
    <div className="px-4 py-6 md:px-10 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Admin Orders
      </h2>

      {/* ================= STATUS TABS ================= */}
      <div className="flex justify-center gap-4 mb-8">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            className={`px-5 py-2 rounded-full font-semibold border ${
              activeStatus === status
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* ================= ORDER LIST ================= */}
      {paginatedOrders.length === 0 ? (
        <p className="text-center text-gray-500">No orders found</p>
      ) : (
        <div className="space-y-6">
          {paginatedOrders.map((order) => {
            const paymentLocked = order.status === "Cancelled";

            return (
              <div
                key={order._id}
                onClick={() => {
                  setSelectedOrder(order);
                  setShowRaw(false);
                }}
                className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 cursor-pointer hover:bg-gray-50"
              >
                {/* LEFT */}
                <div className="flex gap-4 md:w-2/3">
                  <img
                    src={assets.parcel_icon}
                    alt="parcel"
                    className="w-14 h-14"
                  />

                  <div>
                    <p className="font-semibold text-lg">
                      {order.address.fullName}
                    </p>

                    <p className="text-sm text-gray-600">
                      {order.address.addressLine},{" "}
                      {order.address.city},{" "}
                      {order.address.state} -{" "}
                      {order.address.pincode}
                    </p>

                    <p className="text-sm mt-1">
                      📞 {order.address.phone}
                    </p>

                    <p
                      className={`mt-2 font-semibold ${statusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </p>
                  </div>
                </div>

                {/* RIGHT */}
                <div
                  className="md:w-1/3 space-y-3 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-lg font-bold">
                    {currency}{order.amount}
                  </p>

                  <p>
                    <b>Payment:</b>{" "}
                    <span
                      className={
                        order.payment
                          ? "text-green-600 font-bold"
                          : "text-red-500 font-bold"
                      }
                    >
                      {order.payment ? "Paid" : "Unpaid"}
                    </span>
                  </p>

                  <button
                    disabled={paymentLocked}
                    onClick={() =>
                      updatePayment(order._id, !order.payment)
                    }
                    className={`w-full py-2 rounded ${
                      paymentLocked
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-purple-600 text-white"
                    }`}
                  >
                    Toggle Payment
                  </button>

                  {order.status === "Order Placed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateStatus(order._id, "Delivered")
                        }
                        className="flex-1 bg-green-600 text-white py-2 rounded"
                      >
                        Deliver
                      </button>
                      <button
                        onClick={() =>
                          updateStatus(order._id, "Cancelled")
                        }
                        className="flex-1 bg-red-600 text-white py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border rounded"
          >
            Prev
          </button>
          <span className="font-semibold">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border rounded"
          >
            Next
          </button>
        </div>
      )}

      {/* ================= ORDER DETAIL MODAL ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-4xl rounded-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="text-2xl font-bold">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-red-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {/* ORDER SUMMARY */}
            <section className="mb-4">
              <h4 className="font-semibold text-lg mb-2">Order Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><b>Order ID:</b> {selectedOrder._id}</p>
                <p><b>Date:</b> {new Date(selectedOrder.date).toLocaleString()}</p>
                <p><b>Status:</b> {selectedOrder.status}</p>
                <p><b>Payment:</b> {selectedOrder.payment ? "Paid" : "Unpaid"}</p>
                <p><b>Method:</b> {selectedOrder.paymentMethod}</p>
                <p className="font-bold">
                  Amount: {currency}{selectedOrder.amount}
                </p>
              </div>
            </section>

            {/* CUSTOMER */}
            <section className="mb-4">
              <h4 className="font-semibold text-lg mb-2">Customer</h4>
              <p><b>Name:</b> {selectedOrder.address.fullName}</p>
              <p><b>Phone:</b> {selectedOrder.address.phone}</p>
            </section>

            {/* ADDRESS */}
            <section className="mb-4">
              <h4 className="font-semibold text-lg mb-2">Shipping Address</h4>
              <p>{selectedOrder.address.street}</p>
              <p>
                {selectedOrder.address.city}, {selectedOrder.address.state}
              </p>
              <p>
                {selectedOrder.address.country} - {selectedOrder.address.pinCode}
              </p>
            </section>

            {/* ITEMS */}
            <section className="mb-4">
              <h4 className="font-semibold text-lg mb-2">Items</h4>
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Product</th>
                      <th className="border px-2 py-1">Color</th>
                      <th className="border px-2 py-1">Size</th>
                      <th className="border px-2 py-1">Qty</th>
                      <th className="border px-2 py-1">Price</th>
                      <th className="border px-2 py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1">{item.name}</td>
                        <td className="border px-2 py-1">{item.color}</td>
                        <td className="border px-2 py-1">{item.size}</td>
                        <td className="border px-2 py-1">{item.quantity}</td>
                        <td className="border px-2 py-1">
                          {currency}{item.price}
                        </td>
                        <td className="border px-2 py-1 font-semibold">
                          {currency}{item.price * item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* RAW JSON */}
            <section className="mt-4">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-blue-600 underline"
              >
                {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
              </button>

              {showRaw && (
                <pre className="mt-3 bg-black text-green-400 text-xs p-4 rounded overflow-x-auto">
                  {JSON.stringify(selectedOrder, null, 2)}
                </pre>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default Order;
