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
    <div className="p-4 bg-gray-50 min-h-screen">
      <h2 className="text-xl font-bold mb-4">All Products</h2>

      {/* PRODUCT LIST */}
      <div className="bg-white rounded shadow">
        {products.map((p) => (
          <div
            key={p._id}
            className="grid grid-cols-[1fr_3fr_1fr_2fr] gap-3 p-3 border-b items-center"
          >
            <img
              src={p.variants?.[0]?.images?.[0]}
              className="w-20 h-20 object-cover rounded"
              alt=""
            />
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm">{p.category}</p>
            </div>
            <p>
              {currency}
              {Math.min(
                ...p.variants.flatMap((v) =>
                  v.sizes.map((s) => s.price)
                )
              )}
            </p>
            <div className="flex gap-2">
              <button
                className="bg-yellow-100 px-3 py-1 rounded"
                onClick={() => setEditProduct(deepClone(p))}
              >
                Edit
              </button>
              <button
                className="bg-red-100 px-3 py-1 rounded"
                onClick={() => removeProduct(p._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white max-w-5xl w-full p-6 rounded max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>

            {/* BASIC INFO */}
            <label className="block text-sm font-semibold">Product Name</label>
            <input
              className="border p-2 w-full mb-2"
              value={editProduct.name}
              onChange={(e) => updateBasic("name", e.target.value)}
            />

            <label className="block text-sm font-semibold">
              Description
            </label>
            <textarea
              className="border p-2 w-full mb-3"
              value={editProduct.description}
              onChange={(e) =>
                updateBasic("description", e.target.value)
              }
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm font-semibold">Category</label>
                <input
                  className="border p-2 w-full"
                  value={editProduct.category}
                  onChange={(e) =>
                    updateBasic("category", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold">
                  Sub Category
                </label>
                <input
                  className="border p-2 w-full"
                  value={editProduct.subCategory}
                  onChange={(e) =>
                    updateBasic("subCategory", e.target.value)
                  }
                />
              </div>
            </div>

            <label className="flex gap-2 mb-4">
              <input
                type="checkbox"
                checked={editProduct.bestseller}
                onChange={(e) =>
                  updateBasic("bestseller", e.target.checked)
                }
              />
              Bestseller
            </label>

            {/* VARIANTS */}
            {editProduct.variants.map((v, vIndex) => (
              <div
                key={vIndex}
                className="border p-4 mb-4 rounded bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="text-sm font-semibold">
                      Color
                    </label>
                    <input
                      className="border p-2 w-full"
                      value={v.color}
                      onChange={(e) =>
                        updateVariantField(
                          vIndex,
                          "color",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Type
                    </label>
                    <input
                      className="border p-2 w-full"
                      value={v.type}
                      onChange={(e) =>
                        updateVariantField(
                          vIndex,
                          "type",
                          e.target.value
                        )
                      }
                      placeholder="Cotton / Silk / Matte"
                    />
                  </div>
                </div>

                <label className="text-sm font-semibold">
                  Add Images
                </label>
                <input
                  type="file"
                  multiple
                  className="mb-3"
                  onChange={(e) =>
                    handleImages(vIndex, e.target.files)
                  }
                />

                <label className="text-sm font-semibold block mb-2">
                  Sizes
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {v.sizes.map((s, sIndex) => (
                    <div key={sIndex} className="border p-2 bg-white">
                      <p className="font-semibold">{s.size}</p>
                      <input
                        type="number"
                        value={s.price}
                        onChange={(e) =>
                          updateSize(
                            vIndex,
                            sIndex,
                            "price",
                            e.target.value
                          )
                        }
                        className="border p-1 w-full mb-1"
                        placeholder="Price"
                      />
                      <input
                        type="number"
                        value={s.stock}
                        onChange={(e) =>
                          updateSize(
                            vIndex,
                            sIndex,
                            "stock",
                            e.target.value
                          )
                        }
                        className="border p-1 w-full"
                        placeholder="Stock"
                      />
                      <button
                        className="text-red-500 text-sm mt-1"
                        onClick={() =>
                          removeSize(vIndex, sIndex)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-2 flex-wrap">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      className="border px-2 py-1 rounded"
                      onClick={() => addSize(vIndex, s)}
                    >
                      + {s}
                    </button>
                  ))}
                </div>

                <button
                  className="text-red-600 text-sm mt-3"
                  onClick={() => removeVariant(vIndex)}
                >
                  Remove Variant
                </button>
              </div>
            ))}

            <button
              className="border px-4 py-2 mb-4"
              onClick={addVariant}
            >
              + Add Variant
            </button>

            <div className="flex justify-end gap-3">
              <button onClick={() => setEditProduct(null)}>
                Cancel
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={submitEdit}
              >
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
