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
    <form
      onSubmit={onSubmitHandler}
      className="max-w-4xl mx-auto p-6 bg-white shadow rounded flex flex-col gap-4"
    >
      <h2 className="text-xl font-bold">Add Product</h2>

      <input
        placeholder="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded"
        required
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 rounded"
        required
      />

      <div className="flex gap-4">
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          placeholder="Sub Category"
          value={subCategory}
          onChange={(e) => setSubCategory(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      {/* VARIANTS */}
      <div className="border p-4 rounded">
        <div className="flex justify-between mb-2">
          <h3 className="font-semibold">Variants</h3>
          <button
            type="button"
            onClick={addVariant}
            className="text-blue-600"
          >
            + Add Variant
          </button>
        </div>

        {variants.map((variant, vIndex) => (
          <div key={vIndex} className="border p-3 mb-4 rounded space-y-3">
            <input
              placeholder="Color"
              value={variant.color}
              onChange={(e) =>
                updateVariant(vIndex, "color", e.target.value)
              }
              className="border p-2 rounded w-full"
            />

            <input
              placeholder="Type"
              value={variant.type}
              onChange={(e) =>
                updateVariant(vIndex, "type", e.target.value)
              }
              className="border p-2 rounded w-full"
            />

            <input
              type="file"
              multiple
              disabled={!variant.color || !variant.type}
              onChange={(e) => handleImages(vIndex, e.target.files)}
            />

            <div className="flex gap-3 flex-wrap">
              {SIZES.map((size) => {
                const selected = variant.sizes.find(
                  (s) => s.size === size
                );
                return (
                  <div key={size} className="border p-2 rounded w-32">
                    <button
                      type="button"
                      onClick={() => toggleSize(vIndex, size)}
                      className={`w-full ${
                        selected
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {size}
                    </button>

                    {selected && (
                      <>
                        <input
                          type="number"
                          placeholder="Price"
                          className="border w-full p-1 mt-1"
                          min="1"
                          onChange={(e) =>
                            updateSizeField(
                              vIndex,
                              size,
                              "price",
                              e.target.value
                            )
                          }
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          className="border w-full p-1 mt-1"
                          min="0"
                          onChange={(e) =>
                            updateSizeField(
                              vIndex,
                              size,
                              "stock",
                              e.target.value
                            )
                          }
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <label className="flex gap-2 items-center">
        <input
          type="checkbox"
          checked={bestseller}
          onChange={() => setBestseller(!bestseller)}
        />
        Bestseller
      </label>

      <button className="bg-blue-600 text-white py-3 rounded">
        ADD PRODUCT
      </button>
    </form>
  );
};

export default Add;
