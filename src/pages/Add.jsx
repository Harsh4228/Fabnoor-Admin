import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";
import { formatNumber } from "../utils/price";

const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL", "7XL", "Free Size"];

// SAFE KEY (must match backend)
const getKey = (value) => value.trim().toLowerCase().replace(/\s+/g, "_");

const Add = ({ token }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [bestseller, setBestseller] = useState(false);

  // Auto-complete data
  const [existingCategories, setExistingCategories] = useState([]);
  const [existingSubCategories, setExistingSubCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/product/list`);
        if (res.data.success) {
          const products = res.data.products || [];
          // Extract unique categories and subcategories
          const uniqueCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];
          const uniqueSubCategories = [...new Set(products.map((p) => p.subCategory).filter(Boolean))];
          setExistingCategories(uniqueCategories);
          setExistingSubCategories(uniqueSubCategories);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchProducts();
  }, []);

  // ✅ Wholesale variants: price & stock at variant level
  const [variants, setVariants] = useState([]);

  /* ================= VARIANT HELPERS ================= */

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { color: "", fabric: "", code: "", images: [], sizes: [], price: "", stock: "", allowedSizeCount: "" },
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

  // ✅ sizes are now strings only
  const toggleSize = (vIndex, size) => {
    const updated = [...variants];
    const variant = updated[vIndex];
    let sizes = [...variant.sizes];

    if (sizes.includes(size)) {
      sizes = sizes.filter((s) => s !== size);
      // If we deselect a size and it was previously "All", downgrade it to the exact number
      if (variant.allowedSizeCount === "All") {
        variant.allowedSizeCount = sizes.length.toString();
      }
    } else {
      const allowed = variant.allowedSizeCount;
      if (!allowed) {
        toast.info("Please select 'Number of Sizes' first.");
        return;
      }
      if (allowed !== "All" && sizes.length >= Number(allowed)) {
        toast.warning(`You can only select up to ${allowed} size(s).`);
        return;
      }
      sizes.push(size);
      if (sizes.length === SIZES.length) {
        variant.allowedSizeCount = "All";
      }
    }

    variant.sizes = sizes;
    setVariants(updated);
  };

  const removeVariant = (vIndex) => {
    setVariants((prev) => prev.filter((_, i) => i !== vIndex));
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
      if (!v.color || !v.fabric) {
        toast.error("Variant color and fabric are required");
        return false;
      }

      if (!v.code || !v.code.trim()) {
        toast.error(`Variant code is required for ${v.color || "(unknown)"}`);
        return false;
      }

      if (!v.images.length) {
        toast.error(`Images required for ${v.color}`);
        return false;
      }

      if (!v.allowedSizeCount) {
        toast.error(`Please specify the 'Number of Sizes' for ${v.color || "the variant"}`);
        return false;
      }

      if (v.allowedSizeCount === "All" && v.sizes.length !== SIZES.length) {
        toast.error(`You selected 'All' sizes for ${v.color} but some are missing.`);
        return false;
      }

      if (v.allowedSizeCount !== "All" && v.sizes.length !== Number(v.allowedSizeCount)) {
        toast.error(`You must select exactly ${v.allowedSizeCount} size(s) for ${v.color}`);
        return false;
      }

      if (!v.price || Number(v.price) <= 0) {
        toast.error(`Enter valid price for ${v.color}`);
        return false;
      }

      if (v.stock === "" || Number(v.stock) < 0) {
        toast.error(`Enter valid stock for ${v.color}`);
        return false;
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

      // ✅ Variants JSON (NO images here)
      formData.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            color: v.color,
            code: v.code,
            fabric: v.fabric,
            sizes: v.sizes, // ["S","M"]
            price: Number(v.price),
            stock: Number(v.stock || 0),
          }))
        )
      );

      // ✅ Images (dynamic keys)
      variants.forEach((variant) => {
        const key = `${getKey(variant.color)}_${getKey(variant.fabric)}_images`;
        variant.images.forEach((file) => {
          formData.append(key, file);
        });
      });

      const authToken = token || localStorage.getItem("token");

      const res = await axios.post(`${backendUrl}/api/product/add`, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Add New Product
            </h2>
            <p className="text-gray-500">
              Fill in the details to add a product to your store
            </p>
          </div>

          {/* ✅ Must be FORM */}
          <form onSubmit={onSubmitHandler} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Basic Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input
                    placeholder="Enter product name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      list="categories-list"
                      placeholder="e.g., Men, Women, Kids"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                      required
                    />
                    <datalist id="categories-list">
                      {existingCategories.map((c, i) => (
                        <option key={i} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sub Category
                    </label>
                    <input
                      list="subcategories-list"
                      placeholder="e.g., Topwear, Bottomwear"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                      required
                    />
                    <datalist id="subcategories-list">
                      {existingSubCategories.map((sc, i) => (
                        <option key={i} value={sc} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  Product Variants (Wholesale)
                </h3>

                <button
                  type="button"
                  onClick={addVariant}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  + Add Variant
                </button>
              </div>

              {variants.length === 0 ? (
                <p className="text-center py-10 text-gray-400 font-semibold">
                  No variants added yet
                </p>
              ) : (
                <div className="space-y-6">
                  {variants.map((variant, vIndex) => (
                    <div
                      key={vIndex}
                      className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-lg"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">
                          Variant #{vIndex + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeVariant(vIndex)}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Color
                          </label>
                          <input
                            placeholder="e.g., Red, Blue, Black"
                            value={variant.color}
                            onChange={(e) =>
                              updateVariant(vIndex, "color", e.target.value)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Fabric/Material
                          </label>
                          <input
                            placeholder="e.g., Cotton, Silk, Polyester"
                            value={variant.fabric}
                            onChange={(e) =>
                              updateVariant(vIndex, "fabric", e.target.value)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Variant Code
                          </label>
                          <input
                            placeholder="SKU or code"
                            value={variant.code}
                            onChange={(e) =>
                              updateVariant(vIndex, "code", e.target.value)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* ✅ Price & Stock at variant level */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Variant Price (per-piece wholesale)
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter price"
                            value={variant.price}
                            onChange={(e) =>
                              updateVariant(vIndex, "price", e.target.value)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                          {variant.price && variant.sizes?.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Set price: ₹{formatNumber(
                                Number(variant.price) * variant.sizes.length
                              )}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Variant Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Enter stock"
                            value={variant.stock}
                            onChange={(e) =>
                              updateVariant(vIndex, "stock", e.target.value)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Images */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Upload Images
                        </label>
                        <input
                          type="file"
                          multiple
                          disabled={!variant.color || !variant.fabric}
                          onChange={(e) =>
                            handleImages(vIndex, e.target.files)
                          }
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {variant.images.length > 0 && (
                          <p className="text-sm text-green-600 mt-2 font-semibold">
                            {variant.images.length} image(s) selected
                          </p>
                        )}
                      </div>

                      {/* Sizes */}
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                          <label className="block text-sm font-semibold text-gray-700">
                            Available Sizes
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                              Number of Sizes:
                            </label>
                            <select
                              value={variant.allowedSizeCount || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...variants];
                                updated[vIndex].allowedSizeCount = val;

                                if (val === "All") {
                                  updated[vIndex].sizes = [...SIZES];
                                } else if (val) {
                                  // Trim sizes if they currently exceed the new limit
                                  const currentSizes = updated[vIndex].sizes;
                                  if (currentSizes.length > Number(val)) {
                                    updated[vIndex].sizes = currentSizes.slice(0, Number(val));
                                  }
                                } else {
                                  updated[vIndex].sizes = [];
                                }
                                setVariants(updated);
                              }}
                              className="px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all bg-white"
                            >
                              <option value="">Select...</option>
                              {[...Array(SIZES.length).keys()].map(i => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                              <option value="All">All ({SIZES.length})</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                          {SIZES.map((size) => {
                            const selected = variant.sizes.includes(size);

                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(vIndex, size)}
                                className={`py-2 rounded-xl font-bold transition-all border-2 ${selected
                                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md"
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
              )}
            </div>

            {/* Bestseller */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-2xl border border-green-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bestseller}
                  onChange={() => setBestseller(!bestseller)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-4 focus:ring-green-100 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                    Mark as Bestseller
                  </span>
                  <p className="text-sm text-gray-500">
                    This product will be featured in the bestseller section
                  </p>
                </div>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0 transition-all"
            >
              ADD PRODUCT
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Add;
