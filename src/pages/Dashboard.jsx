import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";
import { formatNumber } from "../utils/price";
import { useNavigate } from "react-router-dom";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const StatCard = ({ label, value, sub, icon, color, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </div>
);

const MiniBar = ({ value, max, color }) => (
  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }}
    />
  </div>
);

const Dashboard = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/order/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const revenueGrowth = stats.lastMonthRevenue
    ? (((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100).toFixed(1)
    : null;

  const orderGrowth = stats.lastMonthOrders
    ? (((stats.monthOrders - stats.lastMonthOrders) / stats.lastMonthOrders) * 100).toFixed(1)
    : null;

  const maxChartRevenue = Math.max(...(stats.monthlyChart?.map((m) => m.revenue) || [1]), 1);

  const orderStatusList = [
    { label: "Order Placed",     value: stats.pendingOrders,          barColor: "bg-amber-400",   cardBg: "bg-amber-50",   cardText: "text-amber-700",   status: "Order Placed" },
    { label: "Dispatched",       value: stats.dispatchedOrders,       barColor: "bg-blue-400",    cardBg: "bg-blue-50",    cardText: "text-blue-700",    status: "Dispatched" },
    { label: "Out for Delivery", value: stats.outForDeliveryOrders,   barColor: "bg-indigo-400",  cardBg: "bg-indigo-50",  cardText: "text-indigo-700",  status: "Out for Delivery" },
    { label: "Delivered",        value: stats.deliveredOrders,        barColor: "bg-emerald-400", cardBg: "bg-emerald-50", cardText: "text-emerald-700", status: "Delivered" },
    { label: "Cancelled",        value: stats.cancelledOrders,        barColor: "bg-red-400",     cardBg: "bg-red-50",     cardText: "text-red-700",     status: "Cancelled" },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Business overview at a glance</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ===== TOP STAT CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`${currency}${formatNumber(stats.totalRevenue)}`}
          sub={revenueGrowth !== null ? `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}% vs last month` : "All time"}
          color="bg-emerald-50 text-emerald-600"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          sub={`${stats.todayOrders} today · ${stats.monthOrders} this month`}
          color="bg-blue-50 text-blue-600"
          onClick={() => navigate("/orders")}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Products"
          value={stats.totalProducts}
          sub={`${stats.lowStockProducts?.length || 0} low stock`}
          color="bg-violet-50 text-violet-600"
          onClick={() => navigate("/list")}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          label="Customers"
          value={stats.totalUsers}
          sub="Registered users"
          color="bg-pink-50 text-pink-600"
          onClick={() => navigate("/users")}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      {/* ===== ORDER STATUS CARDS (all 5 statuses, each clickable) ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {orderStatusList.map((s) => (
          <div
            key={s.label}
            onClick={() => navigate("/orders", { state: { status: s.status } })}
            className={`${s.cardBg} rounded-2xl border border-white shadow-sm p-4 flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest ${s.cardText} opacity-70`}>{s.label}</p>
            <p className={`text-3xl font-black ${s.cardText}`}>{s.value}</p>
            <p className={`text-[10px] font-semibold ${s.cardText} opacity-50`}>View orders →</p>
          </div>
        ))}
      </div>

      {/* ===== MIDDLE ROW: Revenue Chart + Order Status ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue bar chart (last 6 months) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-slate-800 text-sm">Revenue Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months (delivered orders)</p>
            </div>
          </div>
          {stats.monthlyChart?.length > 0 ? (
            <div className="flex items-end gap-3 h-36">
              {stats.monthlyChart.map((m, i) => {
                const heightPct = Math.max(4, Math.round((m.revenue / maxChartRevenue) * 100));
                const label = MONTH_NAMES[(m._id.month - 1) % 12];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full" style={{ height: "100px" }}>
                      <div
                        className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg group-hover:bg-blue-600 transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${currency}${formatNumber(m.revenue)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-800 text-sm mb-5">Order Status</h3>
          <div className="space-y-4">
            {orderStatusList.map((s) => (
              <div
                key={s.label}
                onClick={() => navigate("/orders", { state: { status: s.status } })}
                className="cursor-pointer hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600">{s.label}</span>
                  <span className="text-xs font-black text-slate-800">{s.value}</span>
                </div>
                <MiniBar value={s.value} max={stats.totalOrders} color={s.barColor} />
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate("/orders")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All Orders →
            </button>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM ROW: Recent Orders + Low Stock ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">Recent Orders</h3>
            <button onClick={() => navigate("/orders")} className="text-xs font-bold text-blue-600 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentOrders?.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">No orders yet</p>
            )}
            {stats.recentOrders?.map((order) => {
              const statusColors = {
                "Order Placed": "bg-amber-100 text-amber-700",
                Dispatched: "bg-blue-100 text-blue-700",
                "Out for Delivery": "bg-indigo-100 text-indigo-700",
                Delivered: "bg-emerald-100 text-emerald-700",
                Cancelled: "bg-red-100 text-red-700",
              };
              const sc = statusColors[order.status] || "bg-slate-100 text-slate-600";
              return (
                <div key={order._id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {order.userId?.name || order.address?.firstName || "Customer"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-xs font-black text-slate-700">{currency}{formatNumber(order.amount)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc}`}>{order.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low stock products */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">Low Stock Alert</h3>
            <button onClick={() => navigate("/list")} className="text-xs font-bold text-blue-600 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.lowStockProducts?.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">All products well-stocked 🎉</p>
            )}
            {stats.lowStockProducts?.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <img
                  src={p.variants?.images?.[0] || ""}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-slate-100 flex-shrink-0 bg-slate-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-400">{p.variants?.color}</p>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                  p.variants?.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {p.variants?.stock === 0 ? "Out" : `${p.variants?.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
