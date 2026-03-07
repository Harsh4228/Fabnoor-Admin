import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl, currency } from "../constants";
import { toast } from "react-toastify";
import { formatNumber } from "../utils/price";

const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL", "7XL", "Free Size"];

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const getKey = (v) => v.trim().toLowerCase().replace(/\s+/g, "_");

const List = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [viewReviews, setViewReviews] = useState(false);
  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewVariantFilter, setReviewVariantFilter] = useState("all");
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* ================= FETCH ================= */
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/product/list`);
      if (res.data.success) setProducts(res.data.products);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ================= DELETE ================= */
  const removeProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setDeleteLoadingId(id);
    try {
      await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Product deleted");
      fetchProducts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  /* ================= REVIEWS ================= */
  const fetchProductReviews = async (productId) => {
    setReviewsLoading(true);
    setProductReviews([]);
    setReviewVariantFilter("all");
    try {
      const res = await axios.get(`${backendUrl}/api/review/admin/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setProductReviews(res.data.reviews || []);
      }
    } catch (err) {
      toast.error("Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (productId, reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    setDeletingReviewId(reviewId);
    try {
      const res = await axios.delete(`${backendUrl}/api/review/admin/${productId}/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Review deleted");
        setProductReviews((prev) => prev.filter((r) => r._id !== reviewId));
      }
    } catch (err) {
      toast.error("Error deleting review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  /* ================= BASIC UPDATE ================= */
  const updateBasic = (field, value) => {
    setEditProduct((p) => ({ ...p, [field]: value }));
  };

  /* ================= VARIANT ================= */
  const addVariant = () => {
    setEditProduct((p) => ({
      ...p,
      variants: [
        ...(p.variants || []),
        { color: "", fabric: "", code: "", images: [], sizes: [], price: "", stock: "" },
      ],
    }));
  };

  const removeVariant = (vIndex) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      updated.variants.splice(vIndex, 1);
      return updated;
    });
  };

  const updateVariantField = (vIndex, field, value) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      updated.variants[vIndex][field] = value;
      return updated;
    });
  };

  /* ================= TOGGLE SIZE (WHOLESALE) ================= */
  const toggleSize = (vIndex, size) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      const currentSizes = updated.variants[vIndex].sizes || [];

      if (currentSizes.includes(size)) {
        updated.variants[vIndex].sizes = currentSizes.filter((s) => s !== size);
      } else {
        updated.variants[vIndex].sizes = [...currentSizes, size];
      }

      return updated;
    });
  };

  /* ================= IMAGES ================= */
  const handleImages = (vIndex, files) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      const newFiles = Array.from(files);
      const currentNewImages = updated.variants[vIndex].newImages || [];
      updated.variants[vIndex].newImages = [...currentNewImages, ...newFiles];
      return updated;
    });
  };

  const removeExistingImage = (vIndex, imgIndex) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      updated.variants[vIndex].images.splice(imgIndex, 1);
      return updated;
    });
  };

  const removeNewImage = (vIndex, imgIndex) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      updated.variants[vIndex].newImages.splice(imgIndex, 1);
      return updated;
    });
  };

  /* ================= SUBMIT ================= */
  const submitEdit = async () => {
    try {
      setEditLoading(true);
      // basic validation
      if (!editProduct.name || !editProduct.description) {
        toast.error("Name and description are required");
        return;
      }

      for (let v of editProduct.variants) {
        if (!v.color || !(v.fabric || v.type)) {
          toast.error("Variant color and fabric are required");
          return;
        }
        if (!v.code || !v.code.trim()) {
          toast.error(`Variant code is required for ${v.color || "(unknown)"}`);
          return;
        }
        if (!v.sizes || v.sizes.length === 0) {
          toast.error(`Select at least one size for ${v.color}`);
          return;
        }
        if (!v.images?.length && !v.newImages?.length) {
          toast.error(`At least one image is required for ${v.color}`);
          return;
        }
        if (!v.price || Number(v.price) <= 0) {
          toast.error(`Enter valid price for ${v.color}`);
          return;
        }
        if (v.stock === "" || Number(v.stock) < 0) {
          toast.error(`Enter valid stock for ${v.color}`);
          return;
        }
      }

      const fd = new FormData();

      fd.append("id", editProduct._id);
      fd.append("name", editProduct.name);
      fd.append("description", editProduct.description);
      fd.append("category", editProduct.category);
      fd.append("subCategory", editProduct.subCategory);
      fd.append("bestseller", editProduct.bestseller);

      // ✅ payload must match schema/controller
      const payload = editProduct.variants.map((v) => ({
        color: v.color,
        code: v.code,
        fabric: v.fabric || v.type || "",
        sizes: v.sizes,
        price: Number(v.price),
        stock: Number(v.stock || 0),
        existingImages: v.images,
      }));

      fd.append("variants", JSON.stringify(payload));

      // upload new images if any
      editProduct.variants.forEach((v) => {
        if (v.newImages?.length) {
          const fabricVal = v.fabric || v.type || "";
          const key = `${getKey(v.color)}_${getKey(fabricVal)}_images`;
          v.newImages.forEach((file) => fd.append(key, file));
        }
      });

      await axios.post(`${backendUrl}/api/product/edit`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Product updated successfully");
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h2>
          <p className="text-sm text-slate-500 mt-1">Manage inventory, variants, and product details</p>
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
              placeholder="Search products..."
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
            onClick={fetchProducts}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </button>
        </div>
      </div>

      {/* PRODUCT LIST */}
      {(() => {
        const filteredProducts = products.filter((p) => {
          const searchLower = searchTerm.toLowerCase();
          const matchesName = p.name?.toLowerCase().includes(searchLower);
          const matchesVariants = p.variants?.some(v =>
            v.code?.toLowerCase().includes(searchLower) ||
            (v.fabric || v.type || "").toLowerCase().includes(searchLower)
          );
          return matchesName || matchesVariants;
        });

        if (filteredProducts.length === 0) {
          return (
            <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
              <p className="text-xl font-semibold text-gray-400">
                {searchTerm ? `No results for "${searchTerm}"` : "No products found"}
              </p>
            </div>
          );
        }

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-[80px_1fr_120px_200px] gap-3 p-4 bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest shadow-inner">
              <div className="px-1">Identity</div>
              <div>Catalog Specifications</div>
              <div className="text-right">Valuation</div>
              <div className="text-center">Control Logic</div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <div
                  key={p._id}
                  className="grid grid-cols-1 md:grid-cols-[80px_1fr_120px_200px] gap-3 p-4 items-center hover:bg-slate-50/50 transition-all cursor-pointer group"
                  onClick={() => setViewProduct(p)}
                >
                  {/* Image */}
                  <div className="flex justify-center md:justify-start">
                    <div className="relative">
                      <img
                        src={p.variants?.[0]?.images?.[0]}
                        className="w-16 h-16 object-cover rounded-xl shadow-sm border border-slate-200 group-hover:border-blue-400 transition-colors"
                        alt=""
                      />
                      {p.bestseller && (
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-lg border-2 border-white">
                          ⭐
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {p.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-tighter border border-blue-100">{p.category}</span>
                    </div>

                    {/* Per-variant stock tracking */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {(p.variants || []).map((v, i) => {
                        const stock = Number(v.stock || 0);
                        const label = v.color;
                        const isLow = stock > 0 && stock < 6;
                        const isOut = stock === 0;

                        return (
                          <div
                            key={v.code || i}
                            title={`${v.fabric || v.type || ''} (${v.code || ''})`}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${isOut ? 'bg-red-50 text-red-700 border-red-100' :
                              isLow ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                          >
                            <span className={`w-1 h-1 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                            {label}: {isOut ? "EMPTY" : stock}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right md:pr-4">
                    <p className="text-xl font-black text-slate-900 tracking-tighter">
                      {currency}{formatNumber(Math.min(...(p.variants || []).map((v) => v.price || 0)))}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Floor Price</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl flex items-center justify-center transition-all shadow-sm group/btn"
                      onClick={(e) => { e.stopPropagation(); setViewProduct(p); }}
                      title="Quick View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                      onClick={(e) => { e.stopPropagation(); setEditProduct(deepClone(p)); }}
                    >
                      Modify
                    </button>
                    <button
                      className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all shadow-sm ${deleteLoadingId === p._id
                        ? "bg-slate-50 text-slate-300"
                        : "bg-white border border-red-100 text-red-400 hover:bg-red-500 hover:text-white"
                        }`}
                      onClick={(e) => { e.stopPropagation(); removeProduct(p._id); }}
                      disabled={deleteLoadingId === p._id}
                    >
                      {deleteLoadingId === p._id ? (
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ================= VIEW MODAL ================= */}
      {viewProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{viewProduct.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700">{viewProduct.category}</span>
                  <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700">{viewProduct.subCategory}</span>
                  {viewProduct.bestseller && (
                    <span className="bg-amber-500/20 text-amber-500 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                      ⭐ Bestseller
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {/* Description Section */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Product Description</h3>
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{viewProduct.description || "No description provided."}</p>
                </div>
              </section>

              {/* Items / Variants Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Item Specifications ({viewProduct.variants?.length || 0})</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(viewProduct.variants || []).map((v, i) => {
                    const stock = Number(v.stock || 0);
                    const setPrice = Number(v.price || 0) * (v.sizes?.length || 1);
                    const stockStatus = stock === 0 ? "OUT OF STOCK" : stock < 6 ? `LOW STOCK (${stock})` : "IN STOCK";
                    const stockColor = stock === 0 ? "text-red-600 bg-red-50 border-red-100" : stock < 6 ? "text-amber-600 bg-amber-50 border-amber-100" : "text-emerald-600 bg-emerald-50 border-emerald-100";

                    return (
                      <div key={v.code || i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Image Preview Header */}
                        <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar">
                          {(v.images || []).map((img, ii) => (
                            <div key={ii} className="relative flex-shrink-0">
                              <img src={img} className="w-14 h-14 object-cover rounded-lg border border-white shadow-sm" alt="" />
                            </div>
                          ))}
                        </div>

                        {/* Details Grid */}
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Color</p>
                              <p className="text-sm font-semibold text-slate-900">{v.color || "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Fabric</p>
                              <p className="text-sm font-semibold text-slate-900">{v.fabric || v.type || "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">SKU / Code</p>
                              <p className="text-[11px] font-mono font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{v.code || "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Availability</p>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${stockColor}`}>
                                {stockStatus}
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Price / Unit</p>
                              <p className="text-lg font-bold text-slate-900">{currency}{v.price || 0}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Set Value ({v.sizes?.length || 0} units)</p>
                              <p className="text-lg font-bold text-blue-600">{currency}{formatNumber(setPrice)}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Available Sizes</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {(v.sizes || []).slice().sort((a, b) => SIZES.indexOf(a) - SIZES.indexOf(b)).map((s) => (
                                <span key={s} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">{s}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Inline Reviews Trigger */}
              <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h4 className="font-bold text-lg">Customer Feedback</h4>
                  <p className="text-slate-400 text-sm mt-1">Review ratings and comments for this product</p>
                </div>
                <button
                  onClick={() => { setViewReviews(true); fetchProductReviews(viewProduct._id); }}
                  className="w-full sm:w-auto bg-white text-slate-900 px-6 py-2.5 rounded-lg font-bold hover:bg-slate-100 transition shadow-lg"
                >
                  View All Reviews
                </button>
              </div>

              {/* REVIEWS PANEL */}
              {viewReviews && (
                <div className="fade-in space-y-4 pt-4 border-t border-slate-100">
                  {reviewsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-slate-400 text-sm font-medium">Fetching reviews...</p>
                    </div>
                  ) : productReviews.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-4xl mb-4">⭐</p>
                      <p className="text-slate-500 font-medium">No customer reviews yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer Reviews</h3>
                        <button onClick={() => setViewReviews(false)} className="text-xs font-bold text-blue-600 hover:text-blue-700">HIDE</button>
                      </div>

                      {/* Variant filter tabs */}
                      {(() => {
                        const variantKeys = [...new Set(productReviews.map((r) => r.variantCode || r.variantColor || "General"))];
                        if (variantKeys.length <= 1) return null;
                        return (
                          <div className="flex gap-2 flex-wrap pb-4 overflow-x-auto no-scrollbar">
                            <button
                              onClick={() => setReviewVariantFilter("all")}
                              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${reviewVariantFilter === "all" ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                            >
                              ALL SAMPLES ({productReviews.length})
                            </button>
                            {variantKeys.map((vk) => (
                              <button
                                key={vk}
                                onClick={() => setReviewVariantFilter(vk)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${reviewVariantFilter === vk ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                              >
                                {vk.toUpperCase()} ({productReviews.filter((r) => (r.variantCode || r.variantColor || "General") === vk).length})
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="space-y-4">
                        {productReviews
                          .filter((r) => reviewVariantFilter === "all" || (r.variantCode || r.variantColor || "General") === reviewVariantFilter)
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                          .map((review) => (
                            <div key={review._id} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200">
                                    {(review.userName || "U")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-slate-900">{review.userName || "Anonymous Customer"}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <svg key={s} className={`w-3 h-3 ${s <= review.rating ? "text-amber-400 fill-current" : "text-slate-200 fill-current"}`} viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                        ))}
                                      </div>
                                      {(review.variantColor || review.variantCode) && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                          {review.variantColor.toUpperCase()}{review.variantCode ? ` [${review.variantCode}]` : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteReview(viewProduct._id, review._id)}
                                    disabled={deletingReviewId === review._id}
                                    className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition disabled:opacity-50"
                                  >
                                    {deletingReviewId === review._id ? "REMOVING..." : "DELETE"}
                                  </button>
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-slate-600 text-sm mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">{review.comment}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-3">
              <button
                onClick={() => { setViewProduct(null); setEditProduct(deepClone(viewProduct)); }}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit Catalog Entry
              </button>
              <button
                onClick={() => setViewProduct(null)}
                className="flex-1 bg-white text-slate-600 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {editProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white max-w-6xl w-full rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Edit Product Catalog</h2>
                <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-bold">Internal Entry: {editProduct._id}</p>
              </div>
              <button
                onClick={() => setEditProduct(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {/* BASIC INFO */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Primary Information</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Universal Product Name</label>
                    <input
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold"
                      value={editProduct.name}
                      onChange={(e) => updateBasic("name", e.target.value)}
                      placeholder="e.g., Premium Silk Saree"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Technical Description</label>
                    <textarea
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[120px] resize-none focus:bg-white focus:border-blue-500 transition-all text-sm leading-relaxed"
                      value={editProduct.description}
                      onChange={(e) => updateBasic("description", e.target.value)}
                      placeholder="Detailed specifications, features, and washing instructions..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Global Category</label>
                      <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm font-medium"
                        value={editProduct.category}
                        onChange={(e) => updateBasic("category", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Sub-Classification</label>
                      <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm font-medium"
                        value={editProduct.subCategory}
                        onChange={(e) => updateBasic("subCategory", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="inline-flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={editProduct.bestseller}
                          onChange={(e) => updateBasic("bestseller", e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                      <span className="font-bold text-slate-700 text-sm group-hover:text-slate-900 transition-colors">Catalog Highlight (Bestseller)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* VARIANTS */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Product Variants (Wholesale Units)</h3>
                  </div>
                  <button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2"
                    onClick={addVariant}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    APPEND NEW VARIANT
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {editProduct.variants.map((v, vIndex) => (
                    <div
                      key={vIndex}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative"
                    >
                      {/* Variant Header/Control */}
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                            {vIndex + 1}
                          </span>
                          <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                            {v.color ? `${v.color} - ${v.code || 'NO SKU'}` : 'New Variant Configuration'}
                          </h4>
                        </div>
                        <button
                          className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors"
                          onClick={() => removeVariant(vIndex)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="p-6 space-y-8">
                        {/* Meta Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Color Palette</label>
                            <input
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium text-sm"
                              value={v.color}
                              onChange={(e) => updateVariantField(vIndex, "color", e.target.value)}
                              placeholder="e.g. Royal Blue"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Material / Fabric</label>
                            <input
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium text-sm"
                              value={v.fabric || v.type || ""}
                              onChange={(e) => updateVariantField(vIndex, "fabric", e.target.value)}
                              placeholder="e.g. Pure Tissue Silk"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stock Keeping Unit (SKU)</label>
                            <input
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono text-sm"
                              value={v.code || ""}
                              onChange={(e) => updateVariantField(vIndex, "code", e.target.value)}
                              placeholder="e.g. SKU-12345"
                            />
                          </div>
                        </div>

                        {/* Inventory & Pricing */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Wholesale Price (Per Piece)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                              <input
                                type="number"
                                min="1"
                                className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-900"
                                value={v.price}
                                onChange={(e) => updateVariantField(vIndex, "price", e.target.value)}
                              />
                            </div>
                            {v.price && v.sizes?.length > 0 && (
                              <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-wider">
                                Estimated Set Value: {currency}{formatNumber(Number(v.price) * v.sizes.length)}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Inventory Stock (Sets)</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-900"
                              value={v.stock}
                              onChange={(e) => updateVariantField(vIndex, "stock", e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Image Management */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Asset Gallery</h5>
                            <div className="flex-1 h-[1px] bg-slate-100"></div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Existing */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Live Assets</p>
                              {v.images && v.images.length > 0 ? (
                                <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                                  {v.images.map((imgUrl, idx) => (
                                    <div key={idx} className="relative flex-shrink-0 group">
                                      <img src={imgUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-white shadow-sm" />
                                      <button
                                        type="button"
                                        onClick={() => removeExistingImage(vIndex, idx)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                      >✕</button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                                  <span className="text-[10px] font-bold text-slate-300">NO LIVE IMAGES</span>
                                </div>
                              )}
                            </div>

                            {/* Upload */}
                            <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-3">Staging for Upload</p>
                              <input
                                type="file"
                                multiple
                                id={`file-${vIndex}`}
                                className="hidden"
                                onChange={(e) => handleImages(vIndex, e.target.files)}
                              />
                              <label
                                htmlFor={`file-${vIndex}`}
                                className="w-full h-16 flex items-center justify-center border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors group mb-3"
                              >
                                <span className="text-[10px] font-black text-indigo-400 group-hover:text-indigo-600 uppercase tracking-widest">+ Click to Add Images</span>
                              </label>

                              {v.newImages && v.newImages.length > 0 && (
                                <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                                  {v.newImages.map((file, idx) => (
                                    <div key={idx} className="relative flex-shrink-0 group">
                                      <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 object-cover rounded-lg border border-white shadow-sm" />
                                      <button
                                        type="button"
                                        onClick={() => removeNewImage(vIndex, idx)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                      >✕</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SIZE MATRIX */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Wholesale Size Set Matrix</h5>
                            <div className="flex-1 h-[1px] bg-slate-100"></div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
                            {SIZES.map((size) => {
                              const selected = (v.sizes || []).includes(size);
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => toggleSize(vIndex, size)}
                                  className={`py-2 rounded-lg font-black text-[10px] border transition-all ${selected
                                    ? "bg-slate-900 text-white border-slate-900 shadow-sm transform scale-105"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                    }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-4">
              <button
                onClick={() => setEditProduct(null)}
                className="flex-1 bg-white text-slate-600 py-4 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition"
              >
                DISCARD CHANGES
              </button>
              <button
                className={`flex-[2] text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] ${editLoading ? "bg-slate-400 cursor-not-allowed shadow-none" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                onClick={submitEdit}
                disabled={editLoading}
              >
                {editLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    SYNCHRONIZING CATALOG...
                  </>
                ) : (
                  "FINALIZE & SAVE CHANGES"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
