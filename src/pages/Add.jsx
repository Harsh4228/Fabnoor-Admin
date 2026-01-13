import React, { useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";

const SIZES = ["S", "M", "L", "XL", "XXL"];

// SAFE KEY (must match backend)
const getKey = (value) =>
  value.trim().toLowerCase().replace(/\s+/g, "_");

const Add = ({ token }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [bestseller, setBestseller] = useState(false);
  const [variants, setVariants] = useState([]);

  /* ================= VARIANT HELPERS ================= */

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { color: "", type: "", images: [], sizes: [] },
    ]);
  };

  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const handleImages = (index, files) => {
    const updated = [...variants];
    updated[index].images = Array.from(files);
    setVariants(updated);
  };

  const toggleSize = (vIndex, size) => {
    const updated = [...variants];
    const sizes = updated[vIndex].sizes;

    const exists = sizes.find((s) => s.size === size);
    if (exists) {
      updated[vIndex].sizes = sizes.filter((s) => s.size !== size);
    } else {
      updated[vIndex].sizes.push({
        size,
        price: 0,
        stock: 0,
      });
    }

    setVariants(updated);
  };

  const updateSizeField = (vIndex, size, field, value) => {
    const updated = [...variants];
    const sizeObj = updated[vIndex].sizes.find((s) => s.size === size);
    if (!sizeObj) return;

    sizeObj[field] = Number(value);
    setVariants(updated);
  };

  /* ================= VALIDATION ================= */

  const validateForm = () => {
    if (!name || !description || !category || !subCategory) {
      toast.error("All basic fields are required");
      return false;
    }

    if (!variants.length) {
      toast.error("At least one variant is required");
      return false;
    }

    for (let v of variants) {
      if (!v.color || !v.type) {
        toast.error("Variant color and type are required");
        return false;
      }

      if (!v.images.length) {
        toast.error(`Images required for ${v.color}`);
        return false;
      }

      if (!v.sizes.length) {
        toast.error(`Select at least one size for ${v.color}`);
        return false;
      }

      for (let s of v.sizes) {
        if (s.price <= 0) {
          toast.error(`Invalid price for ${v.color} - ${s.size}`);
          return false;
        }
        if (s.stock < 0) {
          toast.error(`Invalid stock for ${v.color} - ${s.size}`);
          return false;
        }
      }
    }

    return true;
  };

  /* ================= SUBMIT ================= */

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("subCategory", subCategory);
      formData.append("bestseller", bestseller);

      // Variants JSON (NO images here)
      formData.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            color: v.color,
            type: v.type,
            sizes: v.sizes,
          }))
        )
      );

      // Images (dynamic keys)
      variants.forEach((variant) => {
        const key = `${getKey(variant.color)}_${getKey(
          variant.type
        )}_images`;

        variant.images.forEach((file) => {
          formData.append(key, file);
        });
      });

      const authToken = token || localStorage.getItem("token");

      const res = await axios.post(
        `${backendUrl}/api/product/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (res.data.success) {
        toast.success("Product added successfully");

        // RESET FORM
        setName("");
        setDescription("");
        setCategory("");
        setSubCategory("");
        setBestseller(false);
        setVariants([]);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow-2xl rounded-3xl p-6 md:p-10">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Add New Product</h2>
            <p className="text-gray-500">Fill in the details to add a product to your store</p>
          </div>

          <div onSubmit={onSubmitHandler} className="space-y-8">
            
            {/* Basic Info Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                  <input
                    placeholder="Enter product name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter product description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all min-h-[100px] resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <input
                      placeholder="e.g., Men, Women, Kids"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sub Category</label>
                    <input
                      placeholder="e.g., Topwear, Bottomwear"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Variants Section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Product Variants
                </h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Variant
                </button>
              </div>

              {variants.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="font-semibold">No variants added yet</p>
                  <p className="text-sm">Click "Add Variant" to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {variants.map((variant, vIndex) => (
                    <div key={vIndex} className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">Variant #{vIndex + 1}</h4>
                        <button
                          type="button"
                          onClick={() => setVariants(variants.filter((_, i) => i !== vIndex))}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                          <input
                            placeholder="e.g., Red, Blue, Black"
                            value={variant.color}
                            onChange={(e) => updateVariant(vIndex, "color", e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Type/Material</label>
                          <input
                            placeholder="e.g., Cotton, Silk, Polyester"
                            value={variant.type}
                            onChange={(e) => updateVariant(vIndex, "type", e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Images</label>
                        <input
                          type="file"
                          multiple
                          disabled={!variant.color || !variant.type}
                          onChange={(e) => handleImages(vIndex, e.target.files)}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {variant.images.length > 0 && (
                          <p className="text-sm text-green-600 mt-2 font-semibold">{variant.images.length} image(s) selected</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Available Sizes</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {SIZES.map((size) => {
                            const selected = variant.sizes.find((s) => s.size === size);
                            return (
                              <div key={size} className="bg-gray-50 p-3 rounded-xl border-2 border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => toggleSize(vIndex, size)}
                                  className={`w-full py-2 rounded-lg font-bold transition-all ${
                                    selected
                                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                                      : "bg-white border-2 border-gray-300 text-gray-600 hover:border-purple-400"
                                  }`}
                                >
                                  {size}
                                </button>

                                {selected && (
                                  <div className="space-y-2 mt-3">
                                    <input
                                      type="number"
                                      placeholder="Price"
                                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-purple-500"
                                      min="1"
                                      onChange={(e) =>
                                        updateSizeField(vIndex, size, "price", e.target.value)
                                      }
                                    />
                                    <input
                                      type="number"
                                      placeholder="Stock"
                                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-purple-500"
                                      min="0"
                                      onChange={(e) =>
                                        updateSizeField(vIndex, size, "stock", e.target.value)
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Options */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-2xl border border-green-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bestseller}
                  onChange={() => setBestseller(!bestseller)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-4 focus:ring-green-100 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">Mark as Bestseller</span>
                  <p className="text-sm text-gray-500">This product will be featured in the bestseller section</p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              onClick={onSubmitHandler}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0 transition-all"
            >
              ADD PRODUCT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Add;