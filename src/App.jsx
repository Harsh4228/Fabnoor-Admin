import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { Routes, Route } from "react-router-dom";
import Add from "./pages/Add";
import List from "./pages/List";
import Orders from "./pages/Order";
import Users from "./pages/Users";
import Login from "./components/Login";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ReelsAdmin from "./pages/ReelsAdmin";
import GlobalDiscount from "./pages/GlobalDiscount";
import ScrollToTop from "./components/ScrollToTop";

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : "");

  useEffect(() => {
    localStorage.setItem('token', token);
  }, [token])


  return (
    <div className="bg-slate-50 min-h-screen">
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      {token === ""
        ? <Login setToken={setToken} />
        : <div className="flex h-screen overflow-hidden">
          {/* Standard Fixed Sidebar */}
          <div className="flex-shrink-0">
            <Sidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Navbar setToken={setToken} />

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
              <div className="max-w-[1600px] mx-auto">
                <Routes>
                  <Route path="/add" element={<Add token={token} />} />
                  <Route path="/list" element={<List token={token} />} />
                  <Route path="/orders" element={<Orders token={token} />} />
                  <Route path="/users" element={<Users token={token} />} />
                  <Route path="/reels" element={<ReelsAdmin token={token} />} />
                  <Route path="/discount" element={<GlobalDiscount token={token} />} />
                  <Route path="*" element={<List token={token} />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      }
    </div>
  )
}

export default App;
