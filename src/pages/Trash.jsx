import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";
import { FaTrashRestore, FaTrashAlt, FaBoxOpen } from "react-icons/fa";

const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const TABS = [
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "orders", label: "Orders" },
  { key: "users", label: "Users" },
  { key: "reels", label: "Reels" },
  { key: "hero", label: "Hero Slides" },
  { key: "pageImages", label: "Page Images" },
  { key: "reviews", label: "Reviews" },
];

// Per-tab wiring: how to list / restore / permanently delete items, and how
// to render a readable summary for each item shape.
const TAB_CONFIG = {
  products: {
    list: async (token) => (await axios.get(`${backendUrl}/api/product/trash/list`, authHeaders(token))).data.products || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/product/trash/restore`, { id: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/product/trash/delete`, { id: item._id }, authHeaders(token)),
    render: (item) => ({
      title: item.name,
      subtitle: `${item.variants?.length || 0} variant(s)`,
      image: item.variants?.[0]?.images?.[0],
    }),
  },
  categories: {
    list: async (token) => (await axios.get(`${backendUrl}/api/category/trash/list`, authHeaders(token))).data.categories || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/category/trash/restore`, { id: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/category/trash/delete`, { id: item._id }, authHeaders(token)),
    render: (item) => ({
      title: item.originalName || item.name,
      subtitle: `${item.subCategories?.length || 0} subcategor${item.subCategories?.length === 1 ? "y" : "ies"}`,
    }),
  },
  orders: {
    list: async (token) => (await axios.get(`${backendUrl}/api/order/trash/list`, authHeaders(token))).data.orders || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/order/trash/restore`, { orderId: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/order/trash/delete`, { orderId: item._id }, authHeaders(token)),
    render: (item) => ({
      title: item.orderNumber || item._id,
      subtitle: `${item.userId?.name || "Unknown customer"} • ₹${item.amount}`,
    }),
  },
  users: {
    list: async (token) => (await axios.get(`${backendUrl}/api/user/admin/trash/list`, authHeaders(token))).data.users || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/user/admin/trash/restore`, { id: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/user/admin/trash/delete`, { id: item._id }, authHeaders(token)),
    render: (item) => ({
      title: item.name,
      subtitle: item.originalEmail || item.email,
    }),
  },
  reels: {
    list: async (token) => {
      const res = await axios.get(`${backendUrl}/api/reels/trash/list`, authHeaders(token));
      return Array.isArray(res.data) ? res.data : [];
    },
    restore: (token, item) => axios.post(`${backendUrl}/api/reels/trash/restore/${item._id}`, {}, authHeaders(token)),
    remove: (token, item) => axios.delete(`${backendUrl}/api/reels/trash/${item._id}`, authHeaders(token)),
    render: (item) => ({
      title: item.caption || "(no caption)",
      subtitle: item.videoUrl,
    }),
  },
  hero: {
    list: async (token) => (await axios.get(`${backendUrl}/api/hero/trash/list`, authHeaders(token))).data.images || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/hero/trash/restore`, { id: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/hero/trash/delete`, { id: item._id }, authHeaders(token)),
    render: (item) => ({ title: "Hero slide", image: item.url }),
  },
  pageImages: {
    list: async (token) => (await axios.get(`${backendUrl}/api/page-images/trash/list`, authHeaders(token))).data.images || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/page-images/trash/restore`, { id: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/page-images/trash/delete`, { id: item._id }, authHeaders(token)),
    render: (item) => ({ title: `${item.page} page image`, image: item.url }),
  },
  reviews: {
    list: async (token) => (await axios.get(`${backendUrl}/api/review/admin/trash/list`, authHeaders(token))).data.reviews || [],
    restore: (token, item) => axios.post(`${backendUrl}/api/review/admin/trash/restore`, { productId: item.productId, reviewId: item._id }, authHeaders(token)),
    remove: (token, item) => axios.post(`${backendUrl}/api/review/admin/trash/delete`, { productId: item.productId, reviewId: item._id }, authHeaders(token)),
    render: (item) => ({
      title: `${item.productName} — ${item.rating}★`,
      subtitle: item.comment || item.userName,
    }),
  },
};

const Trash = ({ token }) => {
  const [activeTab, setActiveTab] = useState("products");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchTab = useCallback(async (tab) => {
    setLoading(true);
    try {
      const data = await TAB_CONFIG[tab].list(token);
      setItems(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load deleted items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  const handleRestore = async (item) => {
    setBusyId(item._id);
    try {
      await TAB_CONFIG[activeTab].restore(token, item);
      toast.success("Restored successfully");
      fetchTab(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteForever = async (item) => {
    if (!window.confirm("Permanently delete this item? This cannot be undone.")) return;
    setBusyId(item._id);
    try {
      await TAB_CONFIG[activeTab].remove(token, item);
      toast.success("Permanently deleted");
      fetchTab(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Trash</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-2">
            <FaBoxOpen className="text-3xl" />
            <span>Nothing in the trash</span>
          </div>
        ) : (
          items.map((item) => {
            const { title, subtitle, image } = TAB_CONFIG[activeTab].render(item);
            return (
              <div key={item._id} className="flex items-center gap-3 p-3.5">
                {image ? (
                  <img src={image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-slate-100" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
                  {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
                  {item.deletedAt && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deleted {new Date(item.deletedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  disabled={busyId === item._id}
                  onClick={() => handleRestore(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <FaTrashRestore /> Restore
                </button>
                <button
                  disabled={busyId === item._id}
                  onClick={() => handleDeleteForever(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  <FaTrashAlt /> Delete Forever
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Trash;
