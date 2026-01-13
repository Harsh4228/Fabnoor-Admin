import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Reels Management</h2>
            <p className="text-gray-500">Upload and manage video content</p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all ${
              showUpload
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            }`}
          >
            {showUpload ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Reel
              </>
            )}
          </button>
        </div>

        {/* ================= UPLOAD PANEL ================= */}
        {showUpload && (
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-8 border border-gray-100">
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Upload New Reel</h3>
                <p className="text-gray-500 mt-2">Share engaging video content with your audience</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Video File</label>
                <div className="relative">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    className="w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:text-white file:font-semibold file:cursor-pointer hover:file:opacity-90"
                  />
                </div>
                {videoFile && (
                  <p className="mt-3 text-sm font-semibold text-green-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {videoFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Caption (Optional)</label>
                <textarea
                  placeholder="Add a caption to describe your reel..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all min-h-[100px] resize-none"
                />
              </div>

              <button
                onClick={uploadReel}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Reel
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= REELS LIST ================= */}
        {reels.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-xl font-semibold text-gray-400">No reels found</p>
            <p className="text-gray-400 mt-2">Upload your first reel to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reels.map((reel) => (
              <div
                key={reel._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 overflow-hidden group"
              >
                <div className="relative">
                  <video
                    src={reel.videoUrl}
                    controls
                    className="w-full aspect-video object-cover bg-black"
                  />
                  
                  <button
                    onClick={() => deleteReel(reel._id)}
                    className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-lg transform hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="p-5">
                  {reel.caption && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{reel.caption}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">{reel.likes?.length || 0}</span>
                    </div>

                    <div className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold">
                      REEL
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelsAdmin;