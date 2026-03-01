import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { assets } from '../assets/assets.js';

const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className='md:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300'
      >
        {isMobileMenuOpen ? (
          <svg className='w-6 h-6' fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className='w-6 h-6' fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className='md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300'
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed left-0 top-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className='p-6 border-b border-gray-200 bg-gray-50'>
          <div className='flex items-center justify-between'>
            <h2 className='font-bold text-xl text-gray-800'>Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className='p-2 hover:bg-gray-200 rounded-lg transition-colors'
            >
              <svg className='w-5 h-5 text-gray-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className='flex flex-col gap-3 p-5'>
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-bold'
                : 'border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
              }`
            }
            to="/add"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.add_icon} alt="Add" />
            <p>Add Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-bold'
                : 'border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
              }`
            }
            to="/list"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.order_icon} alt="List" />
            <p>List Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-bold'
                : 'border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
              }`
            }
            to="/orders"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.order_icon} alt="Orders" />
            <p>Orders</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-bold'
                : 'border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
              }`
            }
            to="/reels"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.order_icon} alt="Reels" />
            <p>ReelsAdmin</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm font-bold'
                : 'border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
              }`
            }
            to="/users"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.parcel_icon} alt="Users" />
            <p>Users</p>
          </NavLink>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[18%] min-w-[240px] min-h-screen border-r border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 pt-8 pl-[20%] pr-4 text-[15px] sticky top-20">

          <div className='mb-2'>
            <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wider px-3'>Navigation</h3>
          </div>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm font-bold'
                : 'hover:bg-gray-50 border-transparent text-gray-700'
              }`
            }
            to="/add"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10 opacity-70"
              src={assets.add_icon}
              alt="Add"
            />
            <p className="block font-medium relative z-10">Add Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm font-bold'
                : 'hover:bg-gray-50 border-transparent text-gray-700'
              }`
            }
            to="/list"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10 opacity-70"
              src={assets.order_icon}
              alt="List"
            />
            <p className="block font-medium relative z-10">List Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm font-bold'
                : 'hover:bg-gray-50 border-transparent text-gray-700'
              }`
            }
            to="/orders"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10 opacity-70"
              src={assets.order_icon}
              alt="Orders"
            />
            <p className="block font-medium relative z-10">Orders</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm font-bold'
                : 'hover:bg-gray-50 border-transparent text-gray-700'
              }`
            }
            to="/reels"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10 opacity-70"
              src={assets.order_icon}
              alt="Reels"
            />
            <p className="block font-medium relative z-10">ReelsAdmin</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm font-bold'
                : 'hover:bg-gray-50 border-transparent text-gray-700'
              }`
            }
            to="/users"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10 opacity-70"
              src={assets.parcel_icon}
              alt="Users"
            />
            <p className="block font-medium relative z-10">Users</p>
          </NavLink>
        </div>
      </div>
    </>
  );
};

export default Sidebar;