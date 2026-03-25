import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";
import { formatNumber } from "../utils/price";

const SIZES = [
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "Free Size",
];

// SAFE KEY (must match backend)
const getKey = (value) => value.trim().toLowerCase().replace(/\s+/g, "_");

const Add = ({ token }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState([]); // Array of strings
  const [subCategory, setSubCategory] = useState([]); // Array of strings
  const [bestseller, setBestseller] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Managed category data
  const [categoriesData, setCategoriesData] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/category/list`);
        if (res.data.success) {
          setCategoriesData(res.data.categories || []);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // ✅ Wholesale variants: price & stock at variant level
  const [variants, setVariants] = useState([]);

  /* ================= VARIANT HELPERS ================= */

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        color: "",
        fabric: "",
        code: "",
        images: [],
        sizes: [],
        price: "",
        stock: "",
        allowedSizeCount: "",
      },
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
    if (!name || !description) {
      toast.error("Name and description are required");
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
        toast.error(
          `Please specify the 'Number of Sizes' for ${v.color || "the variant"}`,
        );
        return false;
      }

      if (v.allowedSizeCount === "All" && v.sizes.length !== SIZES.length) {
        toast.error(
          `You selected 'All' sizes for ${v.color} but some are missing.`,
        );
        return false;
      }

      if (
        v.allowedSizeCount !== "All" &&
        v.sizes.length !== Number(v.allowedSizeCount)
      ) {
        toast.error(
          `You must select exactly ${v.allowedSizeCount} size(s) for ${v.color}`,
        );
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

    setLoading(true);
    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", JSON.stringify(category));
      formData.append("subCategory", JSON.stringify(subCategory));
      formData.append("bestseller", bestseller);
      formData.append("discount", discount);

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
          })),
        ),
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
        setName("");
        setDescription("");
        setCategory([]);
        setSubCategory([]);
        setBestseller(false);
        setDiscount(0);
        setVariants([]);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="fade-in">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Add New Product
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create a new entry in your product catalog
          </p>
        </div>
      </div>

      <form onSubmit={onSubmitHandler} className="space-y-6">
        {/* Basic Information Section */}
        <div className="admin-card">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Basic Information
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g., Premium Cotton Kurta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1.5">
                Description
              </label>
              <textarea
                placeholder="Enter detailed product description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[100px] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-2">
                  Categories (Select one or more)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-3 border-2 border-slate-100 rounded-xl bg-slate-50/50">
                  {categoriesData.map((c) => (
                    <label 
                      key={c._id} 
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${category.includes(c.name) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-white border-transparent text-slate-600'}`}
                    >
                      <input
                        type="checkbox"
                        checked={category.includes(c.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCategory(prev => [...prev, c.name]);
                          } else {
                            setCategory(prev => prev.filter(cat => cat !== c.name));
                            // Also remove subcategories that belong ONLY to this category
                            const otherSelectedCats = category.filter(cat => cat !== c.name);
                            const otherCatsSubCategories = categoriesData
                              .filter(cat => otherSelectedCats.includes(cat.name))
                              .flatMap(cat => cat.subCategories);
                            
                            setSubCategory(prev => prev.filter(sc => otherCatsSubCategories.includes(sc)));
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold uppercase">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-2">
                  Sub Categories (Select one or more)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-3 border-2 border-slate-100 rounded-xl bg-slate-50/50">
                  {category.length === 0 ? (
                    <div className="col-span-2 text-center py-4 text-slate-400 text-[10px] font-bold uppercase">
                      Select a category first
                    </div>
                  ) : (
                    categoriesData
                      .filter(c => category.includes(c.name))
                      .flatMap(c => c.subCategories)
                      .filter((value, index, self) => self.indexOf(value) === index) // Unique
                      .map((sc, i) => (
                        <label 
                          key={i} 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${subCategory.includes(sc) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-white border-transparent text-slate-600'}`}
                        >
                          <input
                            type="checkbox"
                            checked={subCategory.includes(sc)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSubCategory(prev => [...prev, sc]);
                              } else {
                                setSubCategory(prev => prev.filter(sub => sub !== sc));
                              }
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold uppercase">{sc}</span>
                        </label>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="admin-card">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Product Variants (Wholesale)
            </h3>
            <button
              type="button"
              onClick={addVariant}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Variant
            </button>
          </div>

          <div className="p-6">
            {variants.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-sm font-medium">No variants added yet</p>
                <p className="text-[11px] mt-1">
                  At least one variant is required to create a product
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {variants.map((variant, vIndex) => (
                  <div
                    key={vIndex}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/30 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeVariant(vIndex)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Color
                        </label>
                        <input
                          placeholder="e.g., Ruby Red"
                          value={variant.color}
                          onChange={(e) =>
                            updateVariant(vIndex, "color", e.target.value)
                          }
                          className="w-full bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Fabric
                        </label>
                        <input
                          placeholder="e.g., Pure Cotton"
                          value={variant.fabric}
                          onChange={(e) =>
                            updateVariant(vIndex, "fabric", e.target.value)
                          }
                          className="w-full bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Variant Code
                        </label>
                        <input
                          placeholder="SKU-XXXX"
                          value={variant.code}
                          onChange={(e) =>
                            updateVariant(vIndex, "code", e.target.value)
                          }
                          className="w-full bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Price (Wholesale per-piece)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={variant.price}
                            onChange={(e) =>
                              updateVariant(vIndex, "price", e.target.value)
                            }
                            className="w-full pl-7 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Initial Stock
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(vIndex, "stock", e.target.value)
                          }
                          className="w-full bg-white"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Images
                      </label>
                      <input
                        type="file"
                        multiple
                        disabled={!variant.color || !variant.fabric}
                        onChange={(e) => handleImages(vIndex, e.target.files)}
                        className="w-full bg-white py-4 border-dashed border-2 text-center text-xs text-slate-500 hover:border-blue-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {variant.images.length > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-green-600 uppercase tracking-tight">
                          ✓ {variant.images.length} Image(s) Attached
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Available Sizes
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Count:
                          </span>
                          <select
                            value={variant.allowedSizeCount || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...variants];
                              updated[vIndex].allowedSizeCount = val;
                              if (val === "All") {
                                updated[vIndex].sizes = [...SIZES];
                              } else if (val) {
                                const currentSizes = updated[vIndex].sizes;
                                if (currentSizes.length > Number(val)) {
                                  updated[vIndex].sizes = currentSizes.slice(
                                    0,
                                    Number(val),
                                  );
                                }
                              } else {
                                updated[vIndex].sizes = [];
                              }
                              setVariants(updated);
                            }}
                            className="text-[10px] py-1 h-auto bg-white"
                          >
                            <option value="">Select...</option>
                            {[...Array(SIZES.length).keys()].map((i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}
                              </option>
                            ))}
                            <option value="All">All ({SIZES.length})</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SIZES.map((size) => {
                          const isSelected = variant.sizes.includes(size);
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleSize(vIndex, size)}
                              className={`px-3 py-1 rounded text-[10px] font-bold transition-all border ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
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
        </div>

        {/* Promotion Section */}
        <div className="admin-card">
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${bestseller ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Mark as Bestseller
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Feature this product in the premium bestseller section
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bestseller}
                onChange={() => setBestseller(!bestseller)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>

            <div className="flex items-center gap-3 border-l md:pl-6 border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <span className="font-black text-xs">%</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Product Discount
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-20 py-1 text-xs"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    % OFF
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 hover:shadow-lg transform active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              UPDATING CATALOG...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              PUBLISH PRODUCT
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Add;
