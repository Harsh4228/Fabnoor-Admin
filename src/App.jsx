import React, { useEffect, useState, useRef } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { backendUrl } from "./constants";
import Add from "./pages/Add";
import List from "./pages/List";
import Orders from "./pages/Order";
import Users from "./pages/Users";

import Login from "./components/Login";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReelsAdmin from "./pages/ReelsAdmin";
import GlobalDiscount from "./pages/GlobalDiscount";
import ScrollToTop from "./components/ScrollToTop";
import Category from "./pages/Category";
import HeroImages from "./pages/HeroImages";
import PageImages from "./pages/PageImages";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import SignupRequests from "./pages/SignupRequests";
import WhatsAppBroadcast from "./pages/WhatsAppBroadcast";
import WhatsAppChat from "./pages/WhatsAppChat";

const WA_GREEN = "#22c55e";

const WAToast = ({ name, mobile, body, onClick }) => (
  <div className="flex items-start gap-3 cursor-pointer" onClick={onClick}>
    <div
      style={{ background: WA_GREEN }}
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
    >
      WA
    </div>
    <div className="min-w-0">
      <p className="font-bold text-slate-800 text-sm leading-tight">
        {name || mobile}
      </p>
      {name && <p className="text-[11px] text-slate-400 font-mono">{mobile}</p>}
      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{body || "New message"}</p>
      <p className="text-[10px] text-green-600 font-semibold mt-1">Click to open chat →</p>
    </div>
  </div>
);

const AppInner = ({ token, setToken }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [waUnread, setWaUnread] = useState(0);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Reset unread badge when on the chat page
  useEffect(() => {
    if (location.pathname === "/whatsapp-chat") {
      setWaUnread(0);
    }
  }, [location.pathname]);

  // Fetch initial unread count from existing conversations
  useEffect(() => {
    if (!token) return;
    fetch(`${backendUrl}/api/whatsapp/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const total = data.conversations.reduce(
            (sum, c) => sum + (c.unreadCount || 0),
            0
          );
          setWaUnread(total);
        }
      })
      .catch(() => {});
  }, [token]);

  // Global socket — always-on, shows toast + badge on any page
  useEffect(() => {
    if (!token) return;
    const socket = io(backendUrl, { transports: ["websocket", "polling"] });

    socket.on("whatsapp:new-message", ({ message, mobile, unreadCount }) => {
      if (message?.direction !== "in") return;

      // Increment badge only when not on the chat page
      if (pathnameRef.current !== "/whatsapp-chat") {
        setWaUnread((prev) => prev + 1);
      }

      // Always show toast
      toast(
        <WAToast
          name={message?.senderName || ""}
          mobile={mobile}
          body={message?.body}
          onClick={() => navigate("/whatsapp-chat")}
        />,
        {
          autoClose: 7000,
          icon: false,
          style: { borderLeft: `4px solid ${WA_GREEN}`, padding: "10px" },
        }
      );
    });

    return () => socket.disconnect();
  }, [token, navigate]);

  return (
    <div className="bg-slate-50 min-h-screen">
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      {token === "" ? (
        <Login setToken={setToken} />
      ) : (
        <div className="flex h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Sidebar waUnread={waUnread} />
          </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Navbar setToken={setToken} />

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
              <div className="max-w-[1600px] mx-auto">
                <Routes>
                  <Route path="/" element={<Dashboard token={token} />} />
                  <Route path="/dashboard" element={<Dashboard token={token} />} />
                  <Route path="/add" element={<Add token={token} />} />
                  <Route path="/list" element={<List token={token} />} />
                  <Route path="/orders" element={<Orders token={token} />} />
                  <Route path="/users" element={<Users token={token} />} />
                  <Route path="/signup-requests" element={<SignupRequests token={token} />} />
                  <Route path="/reels" element={<ReelsAdmin token={token} />} />
                  <Route path="/discount" element={<GlobalDiscount token={token} />} />
                  <Route path="/category" element={<Category token={token} />} />
                  <Route path="/hero" element={<HeroImages token={token} />} />
                  <Route path="/page-images" element={<PageImages token={token} />} />
                  <Route path="/reports" element={<Reports token={token} />} />
                  <Route path="/whatsapp" element={<WhatsAppBroadcast token={token} />} />
                  <Route path="/whatsapp-chat" element={<WhatsAppChat token={token} />} />
                  <Route path="*" element={<Dashboard token={token} />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [token, setToken] = useState(
    localStorage.getItem("token") ? localStorage.getItem("token") : ""
  );

  useEffect(() => {
    localStorage.setItem("token", token);
  }, [token]);

  return <AppInner token={token} setToken={setToken} />;
};

export default App;
