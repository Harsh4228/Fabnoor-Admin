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
      updated.variants[vIndex].newImages = Array.from(files);
      return updated;
    });
  };

  /* ================= SUBMIT ================= */
  const submitEdit = async () => {
    try {
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              All Products
            </h2>
            <p className="text-gray-500">Manage your product inventory</p>
          </div>
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Stock
          </button>
        </div>

        {/* PRODUCT LIST */}
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <p className="text-xl font-semibold text-gray-400">
              No products found
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-[120px_1fr_150px_200px] gap-4 p-6 bg-gradient-to-r from-gray-800 to-gray-700 text-white font-semibold">
              <div>Image</div>
              <div>Product Details</div>
              <div>Price</div>
              <div className="text-center">Actions</div>
            </div>

            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div
                  key={p._id}
                  className="grid grid-cols-1 md:grid-cols-[120px_1fr_150px_200px] gap-4 p-4 md:p-6 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setViewProduct(p)}
                >
                  {/* Image */}
                  <div className="flex justify-center md:justify-start">
                    <img
                      src={p.variants?.[0]?.images?.[0]}
                      className="w-24 h-24 md:w-20 md:h-20 object-cover rounded-2xl shadow-md border-2 border-gray-100"
                      alt=""
                    />
                  </div>

                  {/* Details */}
                  <div className="text-center md:text-left">
                    <p className="font-bold text-lg text-gray-900 mb-1">
                      {p.name}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-2">
                      <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {p.category}
                      </span>
                      <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {p.subCategory}
                      </span>
                      {p.bestseller && (
                        <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                          ⭐ Bestseller
                        </span>
                      )}
                    </div>
                    {/* Per-variant stock — admin only */}
                    <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                      {(p.variants || []).map((v, i) => {
                        const stock = Number(v.stock || 0);
                        const label = `${v.color}${v.fabric || v.type ? ` / ${v.fabric || v.type}` : ""}`;
                        const badgeClass = stock === 0
                          ? "bg-red-100 text-red-700"
                          : stock < 6
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700";
                        return (
                          <span key={v.code || i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>
                            {label}: {stock === 0 ? "Out" : stock}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-center md:text-left">
                    <p className="text-2xl font-bold text-gray-900">
                      {currency}
                      {Math.min(...(p.variants || []).map((v) => v.price || 0))}
                    </p>
                    <p className="text-sm text-gray-500">Starting from</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="flex-1 md:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                      onClick={(e) => { e.stopPropagation(); setViewProduct(p); }}
                    >
                      View
                    </button>
                    <button
                      className="flex-1 md:flex-none bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                      onClick={(e) => { e.stopPropagation(); setEditProduct(deepClone(p)); }}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 md:flex-none bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                      onClick={(e) => { e.stopPropagation(); removeProduct(p._id); }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= VIEW MODAL ================= */}
        {viewProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white max-w-4xl w-full rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-3xl z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{viewProduct.name}</h2>
                  <div className="flex gap-2 mt-1">
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-semibold">{viewProduct.category}</span>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-semibold">{viewProduct.subCategory}</span>
                    {viewProduct.bestseller && <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">⭐ Bestseller</span>}
                  </div>
                </div>
                <button onClick={() => setViewProduct(null)} className="text-white hover:text-red-200 text-2xl font-bold transition-colors">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-gray-700 leading-relaxed">{viewProduct.description || "No description provided."}</p>
                </div>

                {/* Variants */}
                <div>
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Variants ({viewProduct.variants?.length || 0})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(viewProduct.variants || []).map((v, i) => {
                      const stock = Number(v.stock || 0);
                      const fabricLabel = v.fabric || v.type || "";
                      const setPrice = Number(v.price || 0) * (v.sizes?.length || 1);
                      const stockBadge = stock === 0
                        ? "bg-red-100 text-red-700"
                        : stock < 6
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700";
                      return (
                        <div key={v.code || i} className="border-2 border-gray-100 rounded-2xl p-4 hover:border-emerald-200 transition-colors">
                          {/* Images row */}
                          <div className="flex gap-2 mb-3 overflow-x-auto">
                            {(v.images || []).map((img, ii) => (
                              <img key={ii} src={img} className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0" alt="" />
                            ))}
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <p className="text-gray-400 text-xs">Color</p>
                              <p className="font-semibold text-gray-800">{v.color || "—"}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Fabric</p>
                              <p className="font-semibold text-gray-800">{fabricLabel || "—"}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Code / SKU</p>
                              <p className="font-mono font-semibold text-gray-800 text-xs">{v.code || "—"}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Stock</p>
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${stockBadge}`}>
                                {stock === 0 ? "Out of Stock" : stock < 6 ? `Low (${stock})` : stock}
                              </span>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Price / piece</p>
                              <p className="font-bold text-gray-900">{currency}{v.price || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Set Price</p>
                              <p className="font-bold text-emerald-600">{currency}{formatNumber(setPrice)}</p>
                            </div>
                          </div>

                          {/* Sizes */}
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Sizes in Set</p>
                            <div className="flex gap-1 flex-wrap">
                              {(v.sizes || []).map((s) => (
                                <span key={s} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold">{s}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setViewProduct(null); setEditProduct(deepClone(viewProduct)); }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-2xl font-bold"
                  >
                    Edit This Product
                  </button>
                  <button
                    onClick={() => setViewProduct(null)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= EDIT MODAL ================= */}
        {editProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white max-w-6xl w-full rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6 rounded-t-3xl z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Edit Product</h2>
                  <button
                    onClick={() => setEditProduct(null)}
                    className="text-white hover:text-red-300 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* BASIC INFO */}
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">
                    Basic Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name</label>
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition"
                        value={editProduct.name}
                        onChange={(e) => updateBasic("name", e.target.value)}
                        placeholder="Product Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none min-h-[100px] resize-none focus:border-blue-500 transition"
                        value={editProduct.description}
                        onChange={(e) =>
                          updateBasic("description", e.target.value)
                        }
                        placeholder="Description"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                        <input
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition"
                          value={editProduct.category}
                          onChange={(e) => updateBasic("category", e.target.value)}
                          placeholder="Category"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Sub Category</label>
                        <input
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition"
                          value={editProduct.subCategory}
                          onChange={(e) =>
                            updateBasic("subCategory", e.target.value)
                          }
                          placeholder="Sub Category"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editProduct.bestseller}
                        onChange={(e) =>
                          updateBasic("bestseller", e.target.checked)
                        }
                      />
                      <span className="font-semibold text-gray-700">
                        Mark as Bestseller
                      </span>
                    </label>
                  </div>
                </div>

                {/* VARIANTS */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">
                      Product Variants (Wholesale)
                    </h3>
                    <button
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg"
                      onClick={addVariant}
                    >
                      + Add Variant
                    </button>
                  </div>

                  {editProduct.variants.map((v, vIndex) => (
                    <div
                      key={vIndex}
                      className="bg-purple-50 p-6 rounded-2xl border border-purple-100"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">
                          Variant #{vIndex + 1}
                        </h4>
                        <button
                          className="text-red-600 font-semibold"
                          onClick={() => removeVariant(vIndex)}
                        >
                          Remove Variant
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
                          <input
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition"
                            value={v.color}
                            onChange={(e) =>
                              updateVariantField(vIndex, "color", e.target.value)
                            }
                            placeholder="e.g. Red, Blue"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Fabric / Material</label>
                          <input
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition"
                            value={v.fabric || v.type || ""}
                            onChange={(e) =>
                              updateVariantField(vIndex, "fabric", e.target.value)
                            }
                            placeholder="e.g. Cotton, Silk"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Variant Code</label>
                          <input
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition"
                            value={v.code || ""}
                            onChange={(e) =>
                              updateVariantField(vIndex, "code", e.target.value)
                            }
                            placeholder="SKU or code"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Price (per-piece)</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition"
                            value={v.price}
                            onChange={(e) =>
                              updateVariantField(vIndex, "price", e.target.value)
                            }
                            placeholder="Enter price"
                          />
                          {v.price && v.sizes?.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Set price: ₹{formatNumber(Number(v.price) * v.sizes.length)}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Stock</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition"
                            value={v.stock}
                            onChange={(e) =>
                              updateVariantField(vIndex, "stock", e.target.value)
                            }
                            placeholder="Enter stock"
                          />
                        </div>
                      </div>

                      {/* Images */}
                      <div className="mb-4">
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                          Add Images (Optional)
                        </label>
                        <input
                          type="file"
                          multiple
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer"
                          onChange={(e) => handleImages(vIndex, e.target.files)}
                        />
                      </div>

                      {/* Sizes */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-3">
                          Sizes
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {SIZES.map((size) => {
                            const selected = (v.sizes || []).includes(size);
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(vIndex, size)}
                                className={`py-2 rounded-xl font-bold border-2 transition-all ${selected
                                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent"
                                  : "bg-white border-gray-300 text-gray-600 hover:border-purple-400"
                                  }`}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setEditProduct(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-xl"
                    onClick={submitEdit}
                  >
                    Update Product
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

export default List;
