import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../constants";

const HeroImages = ({ token }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileRef = useRef(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  /* ================= FETCH ================= */
  const fetchImages = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/hero`);
      if (data.success) setImages(data.images);
    } catch (err) {
      toast.error("Failed to load hero images");
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  /* ================= UPLOAD ================= */
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const { data } = await axios.post(`${backendUrl}/api/hero/add`, fd, authHeader);
        if (!data.success) toast.error(data.message || "Upload failed");
      }
      toast.success(`${files.length} image(s) added`);
      fetchImages();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this hero image?")) return;
    setDeletingId(id);
    try {
      const { data } = await axios.post(`${backendUrl}/api/hero/remove`, { id }, authHeader);
      if (data.success) {
        toast.success("Image removed");
        setImages((prev) => prev.filter((img) => img._id !== id));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  /* ================= REORDER (move up/down) ================= */
  const move = async (index, direction) => {
    const newImages = [...images];
    const target = index + direction;
    if (target < 0 || target >= newImages.length) return;
    [newImages[index], newImages[target]] = [newImages[target], newImages[index]];
    setImages(newImages);
    try {
      await axios.post(
        `${backendUrl}/api/hero/reorder`,
        { ids: newImages.map((img) => img._id) },
        authHeader
      );
    } catch (err) {
      toast.error("Reorder failed");
      fetchImages();
    }
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hero Slideshow</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage the banner images shown on the homepage
          </p>
        </div>

        <label className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all
          ${uploading ? "bg-slate-200 text-slate-400 pointer-events-none" : "bg-slate-900 hover:bg-slate-700 text-white"}`}>
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Images
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {images.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No hero images yet</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Images" to upload banner slides</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {images.map((img, index) => (
            <div
              key={img._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all"
            >
              {/* Image preview */}
              <div className="relative aspect-[16/7] bg-slate-100 overflow-hidden">
                <img
                  src={img.url}
                  alt={`Hero slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Slide {index + 1}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-2 p-3">
                {/* Move up/down */}
                <div className="flex gap-1">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(img._id)}
                  disabled={deletingId === img._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                >
                  {deletingId === img._id ? (
                    <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroImages;
