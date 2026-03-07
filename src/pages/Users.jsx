import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";
import { toast } from "react-toastify";
import { formatNumber } from "../utils/price";

const Users = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [makeAdminLoading, setMakeAdminLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Decode JWT token to get current logged in Admin ID
    const getLoggedInUserId = () => {
        try {
            if (!token) return null;
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload).id;
        } catch (e) {
            console.error("JWT Decode Error", e);
            return null;
        }
    };
    const loggedInAdminId = getLoggedInUserId();

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

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete user ${userName}? This action cannot be undone.`)) {
            return;
        }

        setDeleteLoading(true);
        try {
            const res = await axios.post(`${backendUrl}/api/user/admin/delete-user`,
                { id: userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                toast.success(res.data.message || "User deleted successfully");
                setSelectedUser(null);
                fetchData(); // Refresh list
            } else {
                toast.error(res.data.message || "Failed to delete user");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error deleting user");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleMakeAdmin = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to promote ${userName} to Admin? They will have full access to this panel.`)) {
            return;
        }

        setMakeAdminLoading(true);
        try {
            const res = await axios.post(`${backendUrl}/api/user/admin/make-admin`,
                { id: userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                toast.success(res.data.message || "User promoted successfully");

                if (userDetails?.user?._id === userId) {
                    setUserDetails(prev => ({
                        ...prev,
                        user: {
                            ...(prev?.user || {}),
                            role: 'admin'
                        }
                    }));
                }
                fetchData();
            } else {
                toast.error(res.data.message || "Failed to promote user");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error promoting user to admin");
        } finally {
            setMakeAdminLoading(false);
        }
    };

    const handleRemoveAdmin = async (userId, userName) => {
        if (userId === loggedInAdminId) {
            toast.error("You cannot revoke your own Admin privileges.");
            return;
        }

        if (!window.confirm(`Are you sure you want to revoke Admin access for ${userName}? They will lose all access to this panel.`)) {
            return;
        }

        setMakeAdminLoading(true);
        try {
            const res = await axios.post(`${backendUrl}/api/user/admin/remove-admin`,
                { id: userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                toast.success(res.data.message || "Admin access revoked successfully");

                if (userDetails?.user?._id === userId) {
                    setUserDetails(prev => ({
                        ...prev,
                        user: {
                            ...(prev?.user || {}),
                            role: 'user'
                        }
                    }));
                }
                fetchData();
            } else {
                toast.error(res.data.message || "Failed to revoke admin access");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Error revoking admin access");
        } finally {
            setMakeAdminLoading(false);
        }
    };

    return (
        <div className="fade-in">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage customers, shop profiles, and administrative access</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-80 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search users..."
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

                    <button
                        onClick={fetchData}
                        className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* USERS LIST */}
            <div className="admin-card">
                {loading ? (
                    <div className="p-20 flex justify-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : (() => {
                    const filteredUsers = users.filter((u) => {
                        const searchLower = searchTerm.toLowerCase();
                        return (
                            u.name?.toLowerCase().includes(searchLower) ||
                            u.email?.toLowerCase().includes(searchLower) ||
                            u.mobile?.includes(searchLower) ||
                            u.shopName?.toLowerCase().includes(searchLower)
                        );
                    });

                    if (filteredUsers.length === 0) {
                        return (
                            <div className="p-20 text-center text-slate-400">
                                <p className="font-medium text-lg mb-2">No users found</p>
                                <p className="text-sm">Try adjusting your search criteria</p>
                            </div>
                        );
                    }

                    return (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Profile</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Details</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Shop & Role</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Activity</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((u) => (
                                        <tr
                                            key={u._id}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            onClick={() => handleUserClick(u)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-inner border border-blue-100">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{u.name}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{u._id.slice(-8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-slate-700">✉️ {u.email}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">📞 {u.mobile}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-slate-700">{u.shopName || "Personal"}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${u.role === 'admin' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Joined</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {new Date(u.createdAt || (u._id.getTimestamp ? u._id.getTimestamp() : Date.now())).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {u.role === 'admin' ? (
                                                        u._id === loggedInAdminId ? (
                                                            <span className="text-[10px] font-bold px-3 py-1 bg-slate-100 text-slate-400 rounded-lg">YOU</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleRemoveAdmin(u._id, u.name)}
                                                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-[10px] font-bold transition-all"
                                                            >
                                                                REVOKE
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() => handleMakeAdmin(u._id, u.name)}
                                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 rounded-lg text-[10px] font-bold transition-all"
                                                        >
                                                            PROMOTE
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

                {/* ================= USER DETAILS MODAL ================= */}
                {selectedUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
                        <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-6 flex-shrink-0 relative overflow-hidden shadow-lg">
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex flex-shrink-0 items-center justify-center text-2xl font-black shadow-inner border border-white/5">
                                            {selectedUser.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-blue-500 text-[10px] font-black uppercase tracking-widest rounded">User Profile</span>
                                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">ID: {selectedUser._id.slice(-8)}</span>
                                            </div>
                                            <h2 className="text-2xl font-bold tracking-tight">{selectedUser.name}</h2>
                                            <p className="text-slate-400 text-sm font-medium mt-1">{selectedUser.email} • {selectedUser.mobile}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all">
                                        ✕
                                    </button>
                                </div>

                                {/* Tabs */}
                                {userDetails && (
                                    <div className="flex overflow-x-auto gap-4 mt-8 -mb-1 relative z-10 no-scrollbar">
                                        {[
                                            { id: 'profile', label: 'OVERVIEW' },
                                            { id: 'orders', label: `ORDERS (${userDetails.orders?.length || 0})` },
                                            { id: 'cart', label: `CART (${Object.keys(userDetails.user?.cartData || {}).length})` },
                                            { id: 'wishlist', label: `WISHLIST (${userDetails.user?.wishlist?.length || 0})` }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`px-2 py-3 font-black text-[10px] tracking-widest transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-400'
                                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-thin">
                                {detailsLoading ? (
                                    <div className="flex flex-col justify-center items-center h-64 gap-4">
                                        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving User Data...</p>
                                    </div>
                                ) : userDetails ? (
                                    <div className="animate-in fade-in duration-300">

                                        {/* TAB: PROFILE */}
                                        {activeTab === 'profile' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-8">
                                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                            </div>
                                                            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Primary Information</h3>
                                                        </div>
                                                        <div className="space-y-6">
                                                            <div>
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Business / Shop Identity</p>
                                                                <p className="font-bold text-slate-900 text-lg">{userDetails.user.shopName || "Personal Account"}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div>
                                                                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Access Level</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-slate-800 capitalize">{userDetails.user.role}</p>
                                                                        {userDetails.user.role === 'admin' && (
                                                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm border border-blue-200">Internal Staff</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Gender Identity</p>
                                                                    <p className="font-bold text-slate-800">{userDetails.user.gender || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Date of Birth</p>
                                                                <p className="font-bold text-slate-800">{userDetails.user.dob || 'Not registered'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                                            </div>
                                                            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Saved Logistics Entry</h3>
                                                        </div>
                                                        {userDetails.user.address?.street ? (
                                                            <div className="space-y-1.5 text-slate-700 text-xs font-medium leading-relaxed">
                                                                <p className="font-bold text-slate-900 border-b border-slate-50 pb-2 mb-2">{userDetails.user.address.street}</p>
                                                                <p>{userDetails.user.address.city}, {userDetails.user.address.state}</p>
                                                                <p className="text-slate-900 font-bold">{userDetails.user.address.zipcode}</p>
                                                                <p>{userDetails.user.address.country}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="h-24 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No primary address found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-8">
                                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100 4m0-4a2 2 0 110 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100 4m0-4a2 2 0 110 4m0-4v2m0-6V4" /></svg>
                                                            </div>
                                                            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Administrative Policy</h3>
                                                        </div>

                                                        {userDetails.user.role === 'admin' ? (
                                                            <div className="space-y-4">
                                                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                                                                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">🛡️ High Privilege Account</p>
                                                                </div>
                                                                {userDetails.user._id === loggedInAdminId ? (
                                                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Self-Modification Disabled</p>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleRemoveAdmin(userDetails.user._id, userDetails.user.name)}
                                                                        disabled={makeAdminLoading}
                                                                        className={`w-full font-black text-[11px] py-3.5 rounded-xl transition-all shadow-md uppercase tracking-widest border ${makeAdminLoading ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white border-red-200 text-red-600 hover:bg-red-50"
                                                                            }`}
                                                                    >
                                                                        {makeAdminLoading ? "Revoking..." : "Remove Staff Access"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">Warning: Promoting this user will grant full access to sensitive business logic, order management, and catalog indexing.</p>
                                                                <button
                                                                    onClick={() => handleMakeAdmin(userDetails.user._id, userDetails.user.name)}
                                                                    disabled={makeAdminLoading}
                                                                    className={`w-full font-black text-[11px] py-3.5 rounded-xl transition-all shadow-lg uppercase tracking-widest text-white ${makeAdminLoading ? "bg-blue-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
                                                                        }`}
                                                                >
                                                                    {makeAdminLoading ? "Synchronizing Policy..." : "Grant Administrator Access"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-red-50/20 p-6 rounded-2xl border border-red-100">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </div>
                                                            <h3 className="font-bold text-red-900 uppercase tracking-wider text-[10px]">Restricted Zone</h3>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteUser(userDetails.user._id, userDetails.user.name)}
                                                            disabled={deleteLoading}
                                                            className={`w-full font-black text-[10px] py-3.5 rounded-xl transition-colors uppercase tracking-widest border ${deleteLoading ? "bg-red-100 text-red-300 border-red-100 cursor-not-allowed" : "bg-white border-red-200 text-red-600 hover:bg-red-500 hover:text-white"
                                                                }`}
                                                        >
                                                            {deleteLoading ? "Permanently Erasing..." : "Purge User Profile"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB: ORDERS */}
                                        {activeTab === 'orders' && (
                                            <div className="space-y-6">
                                                {userDetails.orders?.length === 0 ? (
                                                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No order interactions recorded</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {userDetails.orders.map(order => (
                                                            <div
                                                                key={order._id}
                                                                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col md:flex-row gap-6 justify-between items-start md:items-center group"
                                                                onClick={() => setViewOrder(order)}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <span className="font-black text-slate-900 text-sm tracking-tight">{order.orderNumber || order._id.slice(-8).toUpperCase()}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                                'bg-blue-100 text-blue-700'
                                                                            }`}>
                                                                            {order.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                                                        <p className="flex items-center gap-1.5"><span className="text-slate-300">📅</span> {new Date(order.createdAt).toLocaleDateString()}</p>
                                                                        <p className="flex items-center gap-1.5"><span className="text-slate-300">📦</span> {order.items.length} Units</p>
                                                                        <p className="flex items-center gap-1.5"><span className="text-slate-300">💳</span> {order.paymentMethod} ({order.payment ? 'PAID' : 'PENDING'})</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex items-center gap-6">
                                                                    <p className="text-xl font-black text-slate-900">{currency}{formatNumber(order.amount)}</p>
                                                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                                                    </div>
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
                                                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active cart is hollow</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {Object.entries(userDetails.user.cartData).map(([cartKey, cartValue]) => {
                                                            let productId, color, type, code, sizeArr;
                                                            let totalQty = 0;

                                                            if (cartKey.includes("::")) {
                                                                const [pid, c, t, cd] = cartKey.split("::");
                                                                productId = pid;
                                                                color = decodeURIComponent(c || "");
                                                                type = decodeURIComponent(t || "");
                                                                code = cd !== undefined ? decodeURIComponent(cd) : "";
                                                                totalQty = Number(cartValue?.quantity || 0);
                                                            } else {
                                                                productId = cartKey;
                                                                color = "";
                                                                type = "";
                                                                code = "";
                                                                if (typeof cartValue === 'object' && cartValue !== null) {
                                                                    totalQty = Object.values(cartValue).reduce((acc, q) => acc + Number(q), 0);
                                                                    sizeArr = Object.entries(cartValue).filter(([s, q]) => Number(q) > 0).map(([s]) => s);
                                                                }
                                                            }

                                                            const product = getProductById(productId);
                                                            if (!product || totalQty <= 0) return null;

                                                            const variants = product.variants || [];
                                                            let matchedVariant = code ? variants.find(v => v.code === code) : null;
                                                            if (!matchedVariant) matchedVariant = variants.find(v => v.color === color && (v.type === type || v.fabric === type)) || variants[0];

                                                            const thumbnail = matchedVariant?.images?.[0] || product.variants?.[0]?.images?.[0] || '';

                                                            return (
                                                                <div
                                                                    key={cartKey}
                                                                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-400 transition-all group"
                                                                    onClick={() => setViewProduct(product)}
                                                                >
                                                                    <div className="relative flex-shrink-0">
                                                                        <img
                                                                            src={thumbnail}
                                                                            alt={product.name}
                                                                            className="w-20 h-20 object-cover rounded-xl shadow-sm border border-slate-100"
                                                                        />
                                                                        <div className="absolute -top-2 -right-2 bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg">
                                                                            {totalQty}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">{product.name}</p>
                                                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{color || 'Config-1'}</span>
                                                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{sizeArr ? sizeArr.join("/") : matchedVariant?.sizes?.join("/") || "SET"}</span>
                                                                        </div>
                                                                        <p className="text-[10px] font-black text-slate-900 mt-2 font-mono">
                                                                            {currency}{formatNumber(matchedVariant?.price || 0)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* TAB: WISHLIST */}
                                        {activeTab === 'wishlist' && (
                                            <div>
                                                {(!userDetails.user.wishlist || userDetails.user.wishlist.length === 0) ? (
                                                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Wishlist is void</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {userDetails.user.wishlist.map((item, index) => {
                                                            const productId = typeof item === 'string' ? item : item.productId;
                                                            const product = getProductById(productId);
                                                            if (!product) return null;

                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-400 transition-all group"
                                                                    onClick={() => setViewProduct(product)}
                                                                >
                                                                    <img
                                                                        src={product.variants?.[0]?.images?.[0] || ''}
                                                                        alt={product.name}
                                                                        className="w-20 h-20 object-cover rounded-xl shadow-sm border border-slate-100 flex-shrink-0"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">{product.name}</p>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{product.category}</p>
                                                                        <p className="text-[10px] font-black text-slate-900 mt-2 font-mono">
                                                                            ENTRY LIMIT: {currency}{formatNumber(Math.min(...(product.variants || []).map(v => v.price || 0)))}
                                                                        </p>
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
                                    <div className="text-center p-20 bg-white rounded-2xl border border-red-100">
                                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Protocol Deviation: Failed to synchronize details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= REUSED PRODUCT MODAL ================= */}
                {viewProduct && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
                        <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-6 shadow-lg z-10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">{viewProduct.name}</h2>
                                    <div className="flex gap-2 mt-1">
                                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{viewProduct.category}</span>
                                    </div>
                                </div>
                                <button onClick={() => setViewProduct(null)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all">✕</button>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-thin">
                                <div className="space-y-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                            </div>
                                            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Catalog Variants</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {(viewProduct.variants || []).map((v, i) => (
                                                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                                                        {(v.images || []).map((img, ii) => (
                                                            <img key={ii} src={img} className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0 shadow-sm" alt="" />
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Colorway</p>
                                                            <p className="font-bold text-slate-800 text-sm">{v.color}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Entry Price</p>
                                                            <p className="font-black text-blue-600 text-sm">{currency}{v.price}</p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Available Size Matrix</p>
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {(v.sizes || []).map(s => (
                                                                    <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black border border-slate-200">{s}</span>
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
                                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-xl"
                                    >
                                        TERMINATE VIEW
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= ORDER DETAILS SNAPSHOT ================= */}
                {viewOrder && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
                        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-6 shadow-lg z-10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-blue-500 text-[10px] font-black uppercase tracking-widest rounded">Snapshot View</span>
                                        <h2 className="text-lg font-bold tracking-tight">Order Reference</h2>
                                    </div>
                                    <p className="text-slate-400 text-xs font-bold font-mono tracking-tighter">{viewOrder.orderNumber || viewOrder._id}</p>
                                </div>
                                <button onClick={() => setViewOrder(null)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all">✕</button>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-thin">
                                <div className="space-y-8">
                                    {/* Order Basics */}
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-2 gap-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <svg className="w-16 h-16 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z" /></svg>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Processing Phase</p>
                                                <p className="font-black text-slate-900 text-sm mt-0.5">{viewOrder.status}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Payment Logic</p>
                                                <p className="font-bold text-slate-800 text-sm mt-0.5">{viewOrder.paymentMethod} {viewOrder.payment ? '(PAID)' : '(PENDING)'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-center">
                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Total Valuation</p>
                                            <p className="text-3xl font-black text-blue-600 tracking-tighter mt-1">{currency}{formatNumber(viewOrder.amount)}</p>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                            </div>
                                            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Acquisition Manifest</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {viewOrder.items.map((item, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 group">
                                                    <img src={item.image} className="w-20 h-20 object-cover rounded-xl shadow-sm border border-slate-100" alt="" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                                                        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                            <span>{item.color}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                            <span>QTY: {item.quantity}</span>
                                                        </div>
                                                        <div className="mt-2 flex gap-1 flex-wrap">
                                                            {item.size.map(s => (
                                                                <span key={s} className="bg-blue-50 px-2 py-0.5 rounded text-[9px] font-black text-blue-600 border border-blue-100">{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col justify-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Unit</p>
                                                        <p className="font-black text-slate-900">{currency}{formatNumber(item.price)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setViewOrder(null)}
                                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-xl uppercase tracking-widest text-[11px]"
                                    >
                                        TERMINATE SNAPSHOT
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Users;
