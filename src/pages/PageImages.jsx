import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../constants";

/* ================= CONFIRM MODAL ================= */
const ConfirmModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-800 text-base">Remove Image?</p>
        <p className="text-sm text-slate-500 mt-1">This will permanently delete the image and cannot be undone.</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all shadow-md">
          Remove
        </button>
      </div>
    </div>
  </div>
);

/* ================= SECTION (one per page: about / contact) ================= */
const PageSection = ({ page, label, token }) => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const fileRef = useRef(null);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchImage = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/page-images?page=${page}`);
      if (data.success) setImage(data.images.length > 0 ? data.images[0] : null);
    } catch {
      toast.error(`Failed to load ${label} image`);
    }
  };

  useEffect(() => { fetchImage(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("page", page);
      const { data } = await axios.post(`${backendUrl}/api/page-images/add`, fd, authHeader);
      if (data.success) {
        toast.success(`${label} image updated`);
        fetchImage();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      const { data } = await axios.post(`${backendUrl}/api/page-images/remove`, { id }, authHeader);
      if (data.success) {
        toast.success("Image removed");
        setImage(null);
      } else {
        toast.error(data.message || "Failed to remove");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.split(".").pop().split("?")[0] || "jpg";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${page}-photo.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div>
      {confirmId && (
        <ConfirmModal
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{label} Page</h3>
          <p className="text-xs text-slate-500 mt-0.5">Photo displayed on the {label.toLowerCase()} page</p>
        </div>

        <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-sm transition-all
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
              {image ? "Replace Image" : "Add Image"}
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* Image card or empty state */}
      {!image ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No image yet</p>
          <p className="text-sm text-slate-400 mt-1">Click &quot;Add Image&quot; above to upload a photo</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all max-w-md">
          {/* Image preview */}
          <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
            <img src={image.url} alt={`${label} page photo`} className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {label}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-end gap-2 p-3">
            {/* Download */}
            <button
              onClick={() => handleDownload(image.url)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-all"
              title="Download image"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Remove */}
            <button
              onClick={() => setConfirmId(image._id)}
              disabled={deletingId === image._id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
            >
              {deletingId === image._id ? (
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
      )}
    </div>
  );
};

/* ================= MAIN PAGE ================= */
const PageImages = ({ token }) => {
  return (
    <div className="fade-in space-y-10">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Page Images</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage photos displayed on the About Us and Contact pages
        </p>
      </div>

      <PageSection page="about"   label="About Us" token={token} />
      <PageSection page="contact" label="Contact"  token={token} />
    </div>
  );
};

export default PageImages;
