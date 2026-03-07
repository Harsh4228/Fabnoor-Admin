import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../constants";

const ReelsAdmin = ({ token }) => {
  const [reels, setReels] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef(null);

  /* ================= AUTH HEADER ================= */
  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  /* ================= FETCH REELS (PUBLIC) ================= */
  const fetchReels = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/reels`);
      setReels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("FETCH REELS ERROR:", err);
      toast.error("Failed to load reels");
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  /* ================= UPLOAD REEL (ADMIN) ================= */
  const uploadReel = async () => {
    if (!token) return toast.error("Admin login required");
    if (!videoFile) return toast.error("Video file required");
    if (!videoFile.type.startsWith("video/")) {
      return toast.error("Only video files allowed");
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("video", videoFile);
      if (caption.trim()) formData.append("caption", caption.trim());

      await axios.post(
        `${backendUrl}/api/reels`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Reel uploaded");

      setVideoFile(null);
      setCaption("");
      setShowUpload(false);
      if (fileRef.current) fileRef.current.value = "";

      fetchReels();
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ================= DELETE REEL (ADMIN) ================= */
  const deleteReel = async (id) => {
    if (!token) return toast.error("Admin login required");

    if (!window.confirm("Delete this reel?")) return;

    try {
      await axios.delete(
        `${backendUrl}/api/reels/${id}`,
        authHeader
      );

      toast.success("Reel deleted");
      fetchReels();
    } catch (err) {
      console.error("DELETE ERROR:", err);
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="fade-in">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reels Management</h2>
          <p className="text-sm text-slate-500 mt-1">Upload and manage promotional video content</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-sm ${showUpload
              ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 shadow-lg"
              }`}
          >
            {showUpload ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Upload
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Reel
              </>
            )}
          </button>

          <button
            onClick={fetchReels}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="admin-card mb-8 max-w-2xl mx-auto border-blue-200 shadow-blue-100 shadow-xl">
          <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">New Video Upload</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Video Source File</label>
              <div className="relative group">
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer"
                />
                {!videoFile && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 group-hover:text-blue-500">
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="font-bold">Click or Drag video to upload</span>
                  </div>
                )}
              </div>
              {videoFile && (
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Selected: {videoFile.name}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Engagement Caption</label>
              <textarea
                placeholder="Write a catchy caption for this reel..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full min-h-[80px] text-sm resize-none"
              />
            </div>

            <button
              onClick={uploadReel}
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing Video...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                  </svg>
                  Publish Reel
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reels Grid */}
      {reels.length === 0 ? (
        <div className="admin-card p-20 text-center text-slate-400">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-bold text-lg text-slate-600">No Content Found</p>
          <p className="text-sm mt-1">Start by uploading your first promotional video</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reels.map((reel) => (
            <div key={reel._id} className="admin-card group hover:border-blue-300 transition-all transform hover:-translate-y-1">
              <div className="relative aspect-[9/16] bg-slate-900 border-b border-slate-100 overflow-hidden">
                <video
                  src={reel.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  onMouseOver={(e) => e.target.play()}
                  onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                  loop
                />

                {/* Control Overlays */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-12">
                  {reel.caption && (
                    <p className="text-xs text-white line-clamp-2 font-medium leading-relaxed">{reel.caption}</p>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <button
                    onClick={() => deleteReel(reel._id)}
                    className="bg-white/90 hover:bg-red-500 hover:text-white text-red-600 p-2 rounded-lg shadow-lg transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{reel.likes?.length || 0} Likes</span>
                </div>
                <div className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest rounded-md border border-blue-100">
                  Active
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReelsAdmin;