import axios from "axios";

const API_URL = "http://localhost:4000/api"; // change if needed

export const uploadReel = async (formData) => {
  const token = localStorage.getItem("token");

  return axios.post(`${API_URL}/api/reels`, formData, {
    headers: {
      token: token,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getReels = async () => {
  return axios.get(`${API_URL}/api/reels`);
};

export const deleteReel = async (id) => {
  const token = localStorage.getItem("token");

  return axios.delete(`${API_URL}/api/reels/${id}`, {
    headers: { token },
  });
};
