import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";
import { toast } from "react-toastify";
import { formatNumber } from "../utils/price";

const Users = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // User details modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Product details modal state
    const [viewProduct, setViewProduct] = useState(null);

    // Order details modal state
    const [viewOrder, setViewOrder] = useState(null);

    // Active tab in User Details modal
    const [activeTab, setActiveTab] = useState("profile"); // profile, orders, cart, wishlist

    /* ================= FETCH DATA ================= */
    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users and products in parallel needed for display logic
            const [usersRes, productsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/user/admin/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${backendUrl}/api/product/list`)
            ]);

            if (usersRes.data.success) {
                setUsers(usersRes.data.users);
            } else {
                toast.error(usersRes.data.message || "Failed to fetch users");
            }

            if (productsRes.data.success) {
                setProducts(productsRes.data.products);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    /* ================= FETCH USER DETAILS ================= */
    const handleUserClick = async (user) => {
        setSelectedUser(user);
        setDetailsLoading(true);
        setActiveTab("profile");

        try {
            const res = await axios.get(`${backendUrl}/api/user/admin/user/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setUserDetails(res.data);
            } else {
                toast.error(res.data.message || "Failed to load user details");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error loading user details");
        } finally {
            setDetailsLoading(false);
        }
    };

    /* ================= HELPER FUNCTIONS ================= */
    const getProductById = (productId) => {
        return products.find(p => p._id === productId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            Registered Users
                        </h2>
                        <p className="text-gray-500">Manage customers and their details</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {/* USERS LIST */}
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                        <p className="text-xl font-semibold text-gray-400">
                            No users found
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        {/* Desktop Header */}
                        <div className="hidden md:grid md:grid-cols-[200px_1.5fr_1fr_1fr] gap-4 p-6 bg-gradient-to-r from-gray-800 to-gray-700 text-white font-semibold">
                            <div>Name</div>
                            <div>Contact Details</div>
                            <div>Shop / Role</div>
                            <div className="text-right">Joined</div>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {users.map((u) => (
                                <div
                                    key={u._id}
                                    className="grid grid-cols-1 md:grid-cols-[200px_1.5fr_1fr_1fr] gap-2 md:gap-4 p-4 md:p-6 items-center hover:bg-gray-50 transition-colors cursor-pointer group"
                                    onClick={() => handleUserClick(u)}
                                >
                                    <div className="font-bold text-lg text-gray-900 group-hover:text-purple-600 transition-colors">
                                        {u.name}
                                        {u.role === 'admin' && (
                                            <span className="ml-2 inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">Admin</span>
                                        )}
                                    </div>

                                    <div className="text-sm">
                                        <p className="text-gray-800 font-medium">✉️ {u.email}</p>
                                        <p className="text-gray-600 mt-1">📞 {u.mobile}</p>
                                    </div>

                                    <div className="text-sm">
                                        <p className="font-semibold text-gray-700">🏪 {u.shopName}</p>
                                        <p className="text-gray-500 mt-1">
                                            {u.address?.city ? `${u.address.city}, ${u.address.state || ''}` : "No address"}
                                        </p>
                                    </div>

                                    <div className="text-sm text-gray-500 md:text-right">
                                        {new Date(u._id.getTimestamp ? u._id.getTimestamp() : Date.now()).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ================= USER DETAILS MODAL ================= */}
                {selectedUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-40 p-2 sm:p-4">
                        <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[96vh]">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-6 rounded-t-3xl flex-shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-white/20 flex flex-shrink-0 items-center justify-center text-2xl font-bold shadow-inner">
                                            {selectedUser.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-bold">{selectedUser.name}</h2>
                                            <p className="text-purple-100 opacity-90">{selectedUser.email} | {selectedUser.mobile}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="text-white hover:bg-white/20 p-2 rounded-xl transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Tabs */}
                                {userDetails && (
                                    <div className="flex overflow-x-auto gap-2 mt-8 -mb-2 relative z-10 hide-scrollbar pb-2">
                                        {[
                                            { id: 'profile', label: 'Overview' },
                                            { id: 'orders', label: `Orders (${userDetails.orders?.length || 0})` },
                                            { id: 'cart', label: `Cart (${Object.keys(userDetails.user?.cartData || {}).length})` },
                                            { id: 'wishlist', label: `Wishlist (${userDetails.user?.wishlist?.length || 0})` }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                                        ? 'bg-white text-purple-700 shadow-md'
                                                        : 'bg-white/10 text-white hover:bg-white/20'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                                {detailsLoading ? (
                                    <div className="flex justify-center items-center h-40">
                                        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                                    </div>
                                ) : userDetails ? (
                                    <div className="animate-fade-in">

                                        {/* TAB: PROFILE */}
                                        {activeTab === 'profile' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Account Information</h3>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-gray-500 text-sm">Shop Name</p>
                                                            <p className="font-semibold text-gray-800 text-lg">{userDetails.user.shopName}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-gray-500 text-sm">Role</p>
                                                                <p className="font-semibold text-gray-800 capitalize">{userDetails.user.role}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500 text-sm">Gender</p>
                                                                <p className="font-semibold text-gray-800">{userDetails.user.gender || 'Not specified'}</p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-sm">Date of Birth</p>
                                                            <p className="font-semibold text-gray-800">{userDetails.user.dob || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Saved Address</h3>
                                                    {userDetails.user.address?.street ? (
                                                        <div className="space-y-2 text-gray-700">
                                                            <p className="font-medium">{userDetails.user.address.street}</p>
                                                            <p>{userDetails.user.address.city}, {userDetails.user.address.state}</p>
                                                            <p>{userDetails.user.address.zipcode}</p>
                                                            <p>{userDetails.user.address.country}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500 italic">No address provided.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB: ORDERS */}
                                        {activeTab === 'orders' && (
                                            <div>
                                                {userDetails.orders?.length === 0 ? (
                                                    <div className="text-center py-10">
                                                        <p className="text-gray-500">No orders placed by this user.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {userDetails.orders.map(order => (
                                                            <div
                                                                key={order._id}
                                                                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                                                                onClick={() => setViewOrder(order)}
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-bold text-gray-900">{order.orderNumber || order._id.slice(-6).toUpperCase()}</span>
                                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                                                order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-blue-100 text-blue-700'
                                                                            }`}>
                                                                            {order.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500">
                                                                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                        })}
                                                                    </p>
                                                                    <p className="text-sm text-gray-600 mt-2">
                                                                        {order.items.length} items • {order.paymentMethod} ({order.payment ? 'Paid' : 'Unpaid'})
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-bold text-gray-900">{currency}{formatNumber(order.amount)}</p>
                                                                    <button className="text-purple-600 text-sm font-semibold mt-2 hover:underline">View Details →</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* TAB: CART */}
                                        {activeTab === 'cart' && (
                                            <div>
                                                {Object.keys(userDetails.user.cartData || {}).length === 0 ? (
                                                    <div className="text-center py-10">
                                                        <p className="text-gray-500">Cart is empty.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                        {Object.entries(userDetails.user.cartData).map(([productId, sizesObj]) => {
                                                            const product = getProductById(productId);
                                                            if (!product) return null; // In case product was deleted

                                                            return Object.entries(sizesObj).map(([size, quantity]) => {
                                                                if (quantity <= 0) return null;

                                                                return (
                                                                    <div
                                                                        key={`${productId}_${size}`}
                                                                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-purple-300 transition-colors"
                                                                        onClick={() => setViewProduct(product)}
                                                                    >
                                                                        <img
                                                                            src={product.variants?.[0]?.images?.[0] || ''}
                                                                            alt={product.name}
                                                                            className="w-16 h-16 object-cover rounded-xl"
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                                                                            <div className="flex items-center justify-between mt-1">
                                                                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">Size: {size}</span>
                                                                                <span className="text-sm font-bold text-gray-900">Qty: {quantity}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* TAB: WISHLIST */}
                                        {activeTab === 'wishlist' && (
                                            <div>
                                                {(!userDetails.user.wishlist || userDetails.user.wishlist.length === 0) ? (
                                                    <div className="text-center py-10">
                                                        <p className="text-gray-500">Wishlist is empty.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                        {userDetails.user.wishlist.map((item, index) => {
                                                            // Assuming item structure handles backwards compatibility for string ids vs object
                                                            const productId = typeof item === 'string' ? item : item.productId;
                                                            const product = getProductById(productId);
                                                            if (!product) return null;

                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-pink-300 transition-colors group"
                                                                    onClick={() => setViewProduct(product)}
                                                                >
                                                                    <img
                                                                        src={product.variants?.[0]?.images?.[0] || ''}
                                                                        alt={product.name}
                                                                        className="w-16 h-16 object-cover rounded-xl"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold text-gray-800 truncate group-hover:text-pink-600 transition-colors">{product.name}</p>
                                                                        <div className="mt-1 flex items-center gap-2 text-xs font-semibold">
                                                                            {item.color && (
                                                                                <span className="text-gray-500">
                                                                                    Color: {item.color}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-gray-900">
                                                                                {currency}{Math.min(...(product.variants || []).map(v => v.price || 0))}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-red-500">Failed to load details.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= REUSED PRODUCT MODAL ================= */}
                {/* We can re-use the exact same modal structure from List.jsx for displaying a product */}
                {viewProduct && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                        <div className="bg-white max-w-4xl w-full rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
                            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-3xl z-10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">{viewProduct.name}</h2>
                                    <div className="flex gap-2 mt-1">
                                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">{viewProduct.category}</span>
                                    </div>
                                </div>
                                <button onClick={() => setViewProduct(null)} className="text-white hover:text-red-200 text-2xl font-bold">✕</button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Variants</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {(viewProduct.variants || []).map((v, i) => (
                                            <div key={i} className="border-2 border-gray-100 rounded-2xl p-4">
                                                <div className="flex gap-2 mb-3 overflow-x-auto">
                                                    {(v.images || []).map((img, ii) => (
                                                        <img key={ii} src={img} className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0" alt="" />
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div><p className="text-gray-400 text-xs">Color</p><p className="font-semibold">{v.color}</p></div>
                                                    <div><p className="text-gray-400 text-xs">Price</p><p className="font-bold">{currency}{v.price}</p></div>
                                                    <div>
                                                        <p className="text-gray-400 text-xs mt-1">Sizes (Set)</p>
                                                        <div className="flex gap-1 flex-wrap mt-0.5">
                                                            {(v.sizes || []).map(s => (
                                                                <span key={s} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewProduct(null)}
                                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition"
                                >
                                    Close Product
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= ORDER DETAILS MODAL ================= */}
                {viewOrder && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                        <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col">
                            <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-indigo-600 text-white p-6 rounded-t-3xl z-10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Order Details</h2>
                                    <p className="text-blue-100 text-sm">{viewOrder.orderNumber || viewOrder._id}</p>
                                </div>
                                <button onClick={() => setViewOrder(null)} className="text-white hover:text-red-200 text-2xl font-bold">✕</button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Order Basics */}
                                <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-500">Status</p>
                                        <p className="font-bold text-gray-900">{viewOrder.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Payment</p>
                                        <p className="font-bold text-gray-900">{viewOrder.paymentMethod} {viewOrder.payment ? '(Paid)' : '(Unpaid)'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Total Amount</p>
                                        <p className="text-xl font-bold text-gray-900">{currency}{formatNumber(viewOrder.amount)}</p>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Items Purchased</h3>
                                    <div className="space-y-4">
                                        {viewOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-4">
                                                <img src={item.image} className="w-20 h-20 object-cover rounded-xl shadow-sm border" alt="" />
                                                <div>
                                                    <p className="font-bold text-gray-900">{item.name}</p>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Color: {item.color} | Qty: {item.quantity}
                                                    </p>
                                                    <div className="mt-1 flex gap-1 flex-wrap">
                                                        {item.size.map(s => (
                                                            <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold text-gray-700">{s}</span>
                                                        ))}
                                                    </div>
                                                    <p className="font-bold text-gray-900 mt-1">{currency}{item.price}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewOrder(null)}
                                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition"
                                >
                                    Close Order
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Users;
