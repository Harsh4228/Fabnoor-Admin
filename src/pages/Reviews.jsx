import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const StarDisplay = ({ rating, size = "text-sm" }) => (
    <div className={`flex gap-0.5 ${size}`}>
        {[1, 2, 3, 4, 5].map((s) => (
            <svg
                key={s}
                className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-current" : "text-slate-200"}`}
                viewBox="0 0 20 20"
            >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

const Reviews = ({ token }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null); // productId
    const [filterVariant, setFilterVariant] = useState({}); // { [productId]: variantKey }
    const [deletingId, setDeletingId] = useState(null);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${backendUrl}/api/review/admin/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setProducts(res.data.products || []);
            }
        } catch (err) {
            toast.error("Failed to load reviews");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [token]);

    const handleDelete = async (productId, reviewId) => {
        if (!window.confirm("Delete this review? This cannot be undone.")) return;
        setDeletingId(reviewId);
        try {
            const res = await axios.delete(
                `${backendUrl}/api/review/admin/${productId}/${reviewId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                toast.success("Review deleted");
                fetchReviews();
            } else {
                toast.error(res.data.message || "Failed to delete");
            }
        } catch (err) {
            toast.error("Error deleting review");
        } finally {
            setDeletingId(null);
        }
    };

    // Group reviews by variant for a product
    const groupByVariant = (reviews) => {
        const groups = {};
        for (const r of reviews) {
            const key = r.variantCode || r.variantColor || "General";
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        }
        return groups;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading reviews...</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Reviews</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {products.length} product{products.length !== 1 ? "s" : ""} with customer feedback
                    </p>
                </div>
                <button
                    onClick={fetchReviews}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                </button>
            </div>

            {products.length === 0 ? (
                <div className="admin-card p-20 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </div>
                    <p className="font-bold text-lg text-slate-600">No Reviews to Display</p>
                    <p className="text-sm mt-1">Customer feedback will appear here once submitted</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.map((product) => {
                        const isOpen = expanded === product._id;
                        const grouped = groupByVariant(product.reviews);
                        const variantKeys = Object.keys(grouped);
                        const activeVariant = filterVariant[product._id] || "all";
                        const filteredReviews =
                            activeVariant === "all"
                                ? product.reviews
                                : (grouped[activeVariant] || []);

                        return (
                            <div key={product._id} className="admin-card">
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpanded(isOpen ? null : product._id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100">
                                            {product.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">{product.name}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-700">{product.avgRating?.toFixed(1) || "5.0"}</span>
                                                    <StarDisplay rating={Math.round(product.avgRating || 5)} />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 border-l border-slate-200 pl-3 uppercase tracking-wider">
                                                    {product.total} {product.total === 1 ? 'Review' : 'Reviews'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight transition-all ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {isOpen ? 'Viewing' : 'View'}
                                        </div>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-slate-100 bg-slate-50/30 p-5 fade-in">
                                        {/* Variant Filters */}
                                        {variantKeys.length > 1 && (
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                <button
                                                    onClick={() => setFilterVariant(p => ({ ...p, [product._id]: "all" }))}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border ${activeVariant === "all"
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                                        }`}
                                                >
                                                    All ({product.total})
                                                </button>
                                                {variantKeys.map(vk => (
                                                    <button
                                                        key={vk}
                                                        onClick={() => setFilterVariant(p => ({ ...p, [product._id]: vk }))}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border ${activeVariant === vk
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                                            }`}
                                                    >
                                                        {vk} ({grouped[vk].length})
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Review List */}
                                        <div className="space-y-3">
                                            {filteredReviews
                                                .slice()
                                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                                .map((review) => (
                                                    <div key={review._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative group/item">
                                                        <button
                                                            onClick={() => handleDelete(product._id, review._id)}
                                                            disabled={deletingId === review._id}
                                                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/item:opacity-100 disabled:opacity-50"
                                                            title="Delete Review"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>

                                                        <div className="flex gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                                {(review.userName || "U")[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">{review.userName || "Anonymous Guest"}</p>
                                                                        <div className="flex items-center gap-3 mt-0.5">
                                                                            <StarDisplay rating={review.rating} />
                                                                            {(review.variantCode || review.variantColor) && (
                                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                                                    {review.variantColor}{review.variantCode ? ` [${review.variantCode}]` : ""}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                                                                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                            year: "numeric"
                                                                        })}
                                                                    </span>
                                                                </div>

                                                                {review.comment && (
                                                                    <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-3 py-1">
                                                                        "{review.comment}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Reviews;
