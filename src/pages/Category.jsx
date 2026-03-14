import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../constants";
import { toast } from "react-toastify";
import {
  FaTrash,
  FaPlus,
  FaEdit,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

const Category = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySequence, setNewCategorySequence] = useState(0);

  const [isEditing, setIsEditing] = useState(null); // id of category being edited
  const [editName, setEditName] = useState("");
  const [editSequence, setEditSequence] = useState(0);

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/category/list`);
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/add`,
        { name: newCategoryName, sequence: newCategorySequence },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        toast.success("Category added");
        setNewCategoryName("");
        setNewCategorySequence(0);
        setShowAddCategory(false);
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add category");
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/update`,
        { id: isEditing, name: editName, sequence: editSequence },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        toast.success("Category updated");
        setIsEditing(null);
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/remove`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        toast.success("Category removed");
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove category");
    }
  };

  const handleAddSubCategory = async (categoryId) => {
    if (!newSubCategoryName.trim()) return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/add-subcategory`,
        { categoryId, subCategoryName: newSubCategoryName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        toast.success("Subcategory added");
        setNewSubCategoryName("");
        fetchCategories();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add subcategory");
    }
  };

  const handleDeleteSubCategory = async (categoryId, subCategoryName) => {
    if (
      !window.confirm(`Are you sure you want to delete "${subCategoryName}"?`)
    )
      return;

    try {
      const res = await axios.post(
        `${backendUrl}/api/category/remove-subcategory`,
        { categoryId, subCategoryName },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        toast.success("Subcategory removed");
        fetchCategories();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to remove subcategory",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Category Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage product categories and their nested subcategories.
          </p>
        </div>
        <button
          onClick={() => setShowAddCategory(!showAddCategory)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <FaPlus /> {showAddCategory ? "Close" : "Add New Category"}
        </button>
      </div>

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="admin-card p-6 mb-8 border-2 border-slate-900 bg-white animate-premium-slide">
          <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Category name (e.g. Clothing)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-slate-900 transition-all font-bold"
              autoFocus
            />
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Seq"
                title="Sequence Number"
                value={newCategorySequence}
                onChange={(e) => setNewCategorySequence(e.target.value)}
                className="w-24 px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-slate-900 transition-all font-bold"
              />
              <button
                type="submit"
                className="bg-slate-900 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">
              No categories found. Start by adding one!
            </p>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat._id}
              className="admin-card overflow-hidden transition-all duration-300"
            >
              <div
                className={`px-6 py-4 flex items-center justify-between cursor-pointer group ${expandedCategory === cat._id ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === cat._id ? null : cat._id,
                  )
                }
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${expandedCategory === cat._id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"}`}
                  >
                    {cat.sequence || 0}
                  </div>
                  <div>
                    {isEditing === cat._id ? (
                      <form onClick={e => e.stopPropagation()} onSubmit={handleUpdateCategory} className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-bold text-sm w-32"
                          autoFocus
                        />
                        <input 
                          type="number"
                          value={editSequence}
                          onChange={e => setEditSequence(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-bold text-sm w-16"
                        />
                        <button type="submit" className="text-emerald-500 hover:text-emerald-400 font-black text-[10px] uppercase">Save</button>
                        <button type="button" onClick={() => setIsEditing(null)} className="text-rose-500 hover:text-rose-400 font-black text-[10px] uppercase">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <p className="font-black uppercase tracking-tight text-sm">
                          {cat.name}
                        </p>
                        <p
                          className={`text-[10px] uppercase font-bold tracking-widest ${expandedCategory === cat._id ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {cat.subCategories.length} Subcategories
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(cat._id);
                      setEditName(cat.name);
                      setEditSequence(cat.sequence || 0);
                    }}
                    className={`p-2 rounded-lg transition-all ${expandedCategory === cat._id ? "hover:bg-slate-700 text-white/50 hover:text-white" : "text-slate-300 hover:text-slate-600 hover:bg-slate-100"}`}
                    title="Edit Category"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat._id);
                    }}
                    className={`p-2 rounded-lg transition-all ${expandedCategory === cat._id ? "hover:bg-red-500 text-white/50 hover:text-white" : "text-slate-300 hover:text-red-500 hover:bg-red-50"}`}
                    title="Delete Category"
                  >
                    <FaTrash size={14} />
                  </button>
                  <div
                    className={
                      expandedCategory === cat._id
                        ? "text-white"
                        : "text-slate-300 group-hover:text-slate-900"
                    }
                  >
                    {expandedCategory === cat._id ? (
                      <FaChevronUp size={12} />
                    ) : (
                      <FaChevronDown size={12} />
                    )}
                  </div>
                </div>
              </div>

              {expandedCategory === cat._id && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
                      Add New Sub-Category
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Subcategory name (e.g. Premium Saree)"
                        value={newSubCategoryName}
                        onChange={(e) => setNewSubCategoryName(e.target.value)}
                        className="flex-1 px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 transition-all"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddSubCategory(cat._id)
                        }
                      />
                      <button
                        onClick={() => handleAddSubCategory(cat._id)}
                        className="bg-slate-900 text-white px-5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cat.subCategories.length === 0 ? (
                      <p className="col-span-full text-center py-4 text-xs text-slate-400 font-medium italic">
                        No subcategories assigned yet.
                      </p>
                    ) : (
                      cat.subCategories.map((sub, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl group/item"
                        >
                          <span className="text-xs font-bold text-slate-700 capitalize">
                            {sub}
                          </span>
                          <button
                            onClick={() =>
                              handleDeleteSubCategory(cat._id, sub)
                            }
                            className="text-slate-300 hover:text-red-500 p-1.5 opacity-0 group-hover/item:opacity-100 transition-all"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Category;
