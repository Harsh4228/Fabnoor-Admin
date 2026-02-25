import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const StarDisplay = ({ rating, size = "text-base" }) => (
    <div className={`flex gap-0.5 ${size}`}>
        {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= rating ? "text-yellow-400" : "text-gray-200"}>
                ★
            </span>
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
            <div className="flex items-center justify-center min-h-64">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Product Reviews</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {products.length} product{products.length !== 1 ? "s" : ""} with reviews
                    </p>
                </div>
                <button
                    onClick={fetchReviews}
                    className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                >
                    ↺ Refresh
                </button>
            </div>

            {products.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl">
                    <p className="text-4xl mb-3">⭐</p>
                    <p className="text-gray-500">No product reviews yet.</p>
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
                            <div
                                key={product._id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                            >
                                {/* Product header row */}
                                <button
                                    onClick={() => setExpanded(isOpen ? null : product._id)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-lg font-bold text-pink-500">
                                            {product.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{product.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <StarDisplay rating={Math.round(product.avgRating)} />
                                                <span className="text-sm font-medium text-gray-700">{product.avgRating}</span>
                                                <span className="text-xs text-gray-400">
                                                    ({product.total} review{product.total !== 1 ? "s" : ""})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                                        ▼
                                    </span>
                                </button>

                                {/* Expanded review panel */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 px-5 py-4">
                                        {/* Variant filter tabs */}
                                        {variantKeys.length > 1 && (
                                            <div className="flex gap-2 flex-wrap mb-4">
                                                <button
                                                    onClick={() =>
                                                        setFilterVariant((p) => ({ ...p, [product._id]: "all" }))
                                                    }
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${activeVariant === "all"
                                                            ? "bg-pink-500 text-white"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                        }`}
                                                >
                                                    All ({product.total})
                                                </button>
                                                {variantKeys.map((vk) => (
                                                    <button
                                                        key={vk}
                                                        onClick={() =>
                                                            setFilterVariant((p) => ({ ...p, [product._id]: vk }))
                                                        }
                                                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${activeVariant === vk
                                                                ? "bg-pink-500 text-white"
                                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                    >
                                                        {vk} ({grouped[vk].length})
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Review list */}
                                        <div className="space-y-3">
                                            {filteredReviews
                                                .slice()
                                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                                .map((review) => (
                                                    <div
                                                        key={review._id}
                                                        className="bg-gray-50 rounded-xl p-4 flex gap-3"
                                                    >
                                                        {/* Avatar */}
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
                                                            {(review.userName || "A")[0].toUpperCase()}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="font-semibold text-sm text-gray-800">
                                                                        {review.userName || "Anonymous"}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <StarDisplay rating={review.rating} size="text-sm" />
                                                                        {(review.variantCode || review.variantColor) && (
                                                                            <span className="text-xs text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
                                                                                {review.variantColor}
                                                                                {review.variantCode ? ` (${review.variantCode})` : ""}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <span className="text-xs text-gray-400">
                                                                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                            year: "numeric",
                                                                        })}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleDelete(product._id, review._id)}
                                                                        disabled={deletingId === review._id}
                                                                        className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2 py-0.5 rounded-full transition disabled:opacity-50"
                                                                    >
                                                                        {deletingId === review._id ? "..." : "Delete"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {review.comment && (
                                                                <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">
                                                                    {review.comment}
                                                                </p>
                                                            )}
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
