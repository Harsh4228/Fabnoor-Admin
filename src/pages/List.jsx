import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl, currency } from "../App";
import { toast } from "react-toastify";

const SIZES = ["S", "M", "L", "XL", "XXL"];

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const getKey = (v) => v.trim().toLowerCase().replace(/\s+/g, "_");

const List = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);

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
        ...p.variants,
        { color: "", type: "", images: [], sizes: [] },
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

  /* ================= SIZE ================= */
  const addSize = (vIndex, size) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      const exists = updated.variants[vIndex].sizes.find(
        (s) => s.size === size
      );
      if (exists) return updated;

      updated.variants[vIndex].sizes.push({
        size,
        price: 0,
        stock: 0,
      });
      return updated;
    });
  };

  const removeSize = (vIndex, sIndex) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      updated.variants[vIndex].sizes.splice(sIndex, 1);
      return updated;
    });
  };

  const updateSize = (vIndex, sIndex, field, value) => {
    setEditProduct((p) => {
      const updated = deepClone(p);
      updated.variants[vIndex].sizes[sIndex][field] = Number(value);
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
      const fd = new FormData();

      fd.append("id", editProduct._id);
      fd.append("name", editProduct.name);
      fd.append("description", editProduct.description);
      fd.append("category", editProduct.category);
      fd.append("subCategory", editProduct.subCategory);
      fd.append("bestseller", editProduct.bestseller);

      const payload = editProduct.variants.map((v) => ({
        color: v.color,
        type: v.type,
        sizes: v.sizes,
        existingImages: v.images,
      }));

      fd.append("variants", JSON.stringify(payload));

      editProduct.variants.forEach((v) => {
        if (v.newImages?.length) {
          const key = `${getKey(v.color)}_${getKey(v.type)}_images`;
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
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">All Products</h2>
          <p className="text-gray-500">Manage your product inventory</p>
        </div>

        {/* PRODUCT LIST */}
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xl font-semibold text-gray-400">No products found</p>
            <p className="text-gray-400 mt-2">Start by adding your first product</p>
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

            {/* Products */}
            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div
                  key={p._id}
                  className="grid grid-cols-1 md:grid-cols-[120px_1fr_150px_200px] gap-4 p-4 md:p-6 items-center hover:bg-gray-50 transition-colors"
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
                    <p className="font-bold text-lg text-gray-900 mb-1">{p.name}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
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
                  </div>

                  {/* Price */}
                  <div className="text-center md:text-left">
                    <p className="text-2xl font-bold text-gray-900">
                      {currency}
                      {Math.min(
                        ...p.variants.flatMap((v) =>
                          v.sizes.map((s) => s.price)
                        )
                      )}
                    </p>
                    <p className="text-sm text-gray-500">Starting from</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-center">
                    <button
                      className="flex-1 md:flex-none bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                      onClick={() => setEditProduct(deepClone(p))}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 md:flex-none bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                      onClick={() => removeProduct(p._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* BASIC INFO */}
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                        value={editProduct.name}
                        onChange={(e) => updateBasic("name", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all min-h-[100px] resize-none"
                        value={editProduct.description}
                        onChange={(e) => updateBasic("description", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Category</label>
                        <input
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                          value={editProduct.category}
                          onChange={(e) => updateBasic("category", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Sub Category</label>
                        <input
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                          value={editProduct.subCategory}
                          onChange={(e) => updateBasic("subCategory", e.target.value)}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editProduct.bestseller}
                        onChange={(e) => updateBasic("bestseller", e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-4 focus:ring-blue-100"
                      />
                      <span className="font-semibold text-gray-700">Mark as Bestseller</span>
                    </label>
                  </div>
                </div>

                {/* VARIANTS */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">Product Variants</h3>
                    <button
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
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
                        <h4 className="font-bold text-gray-700">Variant #{vIndex + 1}</h4>
                        <button
                          className="text-red-600 font-semibold hover:text-red-800 transition-colors"
                          onClick={() => removeVariant(vIndex)}
                        >
                          Remove Variant
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-700 block mb-2">Color</label>
                          <input
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                            value={v.color}
                            onChange={(e) => updateVariantField(vIndex, "color", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-gray-700 block mb-2">Type</label>
                          <input
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                            value={v.type}
                            onChange={(e) => updateVariantField(vIndex, "type", e.target.value)}
                            placeholder="Cotton / Silk / Matte"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-sm font-semibold text-gray-700 block mb-2">Add Images</label>
                        <input
                          type="file"
                          multiple
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 transition-all"
                          onChange={(e) => handleImages(vIndex, e.target.files)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-3">Sizes</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                          {v.sizes.map((s, sIndex) => (
                            <div key={sIndex} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                              <p className="font-bold text-gray-800 mb-2 text-center">{s.size}</p>
                              <input
                                type="number"
                                value={s.price}
                                onChange={(e) => updateSize(vIndex, sIndex, "price", e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg mb-2 outline-none focus:border-purple-500 text-sm"
                                placeholder="Price"
                              />
                              <input
                                type="number"
                                value={s.stock}
                                onChange={(e) => updateSize(vIndex, sIndex, "stock", e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg mb-2 outline-none focus:border-purple-500 text-sm"
                                placeholder="Stock"
                              />
                              <button
                                className="w-full text-red-500 font-semibold text-sm hover:text-red-700 transition-colors"
                                onClick={() => removeSize(vIndex, sIndex)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {SIZES.map((s) => (
                            <button
                              key={s}
                              className="px-4 py-2 border-2 border-purple-300 rounded-lg hover:bg-purple-100 transition-colors font-semibold text-sm"
                              onClick={() => addSize(vIndex, s)}
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setEditProduct(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
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