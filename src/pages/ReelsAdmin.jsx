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
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reels</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showUpload ? "Close" : "Add Reel"}
        </button>
      </div>

      {/* ================= UPLOAD PANEL ================= */}
      {showUpload && (
        <div className="border p-4 rounded mb-6 space-y-3 bg-gray-50">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files[0])}
          />

          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="border p-2 w-full rounded"
          />

          <button
            onClick={uploadReel}
            disabled={uploading}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {/* ================= REELS LIST ================= */}
      {reels.length === 0 ? (
        <p className="text-gray-500">No reels found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reels.map((reel) => (
            <div key={reel._id} className="relative border rounded p-2">
              <video
                src={reel.videoUrl}
                controls
                className="w-full rounded"
              />

              {reel.caption && (
                <p className="text-sm mt-2">{reel.caption}</p>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Likes: {reel.likes?.length || 0}
              </p>

              <button
                onClick={() => deleteReel(reel._id)}
                className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReelsAdmin;
