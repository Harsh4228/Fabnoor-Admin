import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";

const GlobalDiscount = ({ token }) => {
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const fetchGlobalDiscount = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/discount/get`);
            if (res.data.success) {
                setDiscountPercentage(res.data.globalDiscount.discountPercentage);
                setIsActive(res.data.globalDiscount.isActive);
            }
        } catch (err) {
            console.error("Fetch discount error:", err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchGlobalDiscount();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(
                `${backendUrl}/api/discount/update`,
                { discountPercentage, isActive },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                toast.success("Global discount updated successfully");
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-2xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Global Store Discount</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Apply a store-wide discount that overrides all individual product discounts.
                </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="admin-card overflow-hidden">
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Pricing Control Hub</h3>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {isActive ? '● System Active' : '○ System Idle'}
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Status Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Master Switch</p>
                                    <p className="text-[11px] text-slate-500">Enable or disable store-wide discounts</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => setIsActive(!isActive)}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Percentage Input */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Discount Percentage (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Enter percentage..."
                                    value={discountPercentage}
                                    onChange={(e) => setDiscountPercentage(e.target.value)}
                                    className="w-full pl-6 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-2xl text-slate-900"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium italic ml-1">
                                * When active, this percentage will be subtracted from the price of ALL products in the catalog.
                            </p>
                        </div>

                        {/* Warning Box */}
                        {isActive && (
                            <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="text-xs font-bold text-amber-800 uppercase">Attention Required</p>
                                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                                            Individual product discounts (e.g. 10% on a specific item) will be <b>ignored</b> while the Global Discount is active. The system will favor this global configuration.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-1'}`}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            UPDATING SYSTEM...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Apply Pricing Policy
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default GlobalDiscount;
