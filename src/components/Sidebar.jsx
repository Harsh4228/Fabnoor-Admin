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
        className='md:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-br from-gray-800 to-gray-900 text-white p-4 rounded-full shadow-2xl hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300'
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
        <div className='p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white'>
          <div className='flex items-center justify-between'>
            <h2 className='font-bold text-xl text-gray-800'>Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
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
              `flex items-center gap-4 border border-gray-200 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
              }`
            }
            to="/add"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.add_icon} alt="Add" />
            <p className="font-semibold">Add Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border border-gray-200 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
              }`
            }
            to="/list"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.order_icon} alt="List" />
            <p className="font-semibold">List Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border border-gray-200 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
              }`
            }
            to="/orders"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.order_icon} alt="Orders" />
            <p className="font-semibold">Orders</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border border-gray-200 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
              }`
            }
            to="/reels"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.reel_icon} alt="Reels" />
            <p className="font-semibold">ReelsAdmin</p>
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-4 border border-gray-200 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
              }`
            }
            to="/users"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img className="w-6 h-6 group-hover:scale-110 transition-transform" src={assets.profile_icon || assets.order_icon} alt="Users" />
            <p className="font-semibold">Users</p>
          </NavLink>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[18%] min-w-[240px] min-h-screen border-r-2 border-gray-200 bg-gradient-to-b from-gray-50 to-white shadow-sm">
        <div className="flex flex-col gap-4 pt-8 pl-[20%] pr-4 text-[15px] sticky top-20">

          <div className='mb-2'>
            <h3 className='text-xs font-bold text-gray-400 uppercase tracking-wider px-3'>Navigation</h3>
          </div>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-gray-300 border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:pl-5'
              }`
            }
            to="/add"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10"
              src={assets.add_icon}
              alt="Add"
            />
            <p className="hidden lg:block font-semibold relative z-10">Add Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-gray-300 border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:pl-5'
              }`
            }
            to="/list"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10"
              src={assets.order_icon}
              alt="List"
            />
            <p className="hidden lg:block font-semibold relative z-10">List Items</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-gray-300 border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:pl-5'
              }`
            }
            to="/orders"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10"
              src={assets.order_icon}
              alt="Orders"
            />
            <p className="hidden lg:block font-semibold relative z-10">Orders</p>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-gray-300 border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:pl-5'
              }`
            }
            to="/reels"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10"
              src={assets.reel_icon}
              alt="Reels"
            />
            <p className="hidden lg:block font-semibold relative z-10">ReelsAdmin</p>
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 border border-gray-300 border-r-0 px-4 py-3.5 rounded-l-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-lg border-transparent'
                : 'hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:pl-5'
              }`
            }
            to="/users"
          >
            <img
              className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10"
              src={assets.profile_icon || assets.order_icon}
              alt="Users"
            />
            <p className="hidden lg:block font-semibold relative z-10">Users</p>
          </NavLink>
        </div>
      </div>
    </>
  );
};

export default Sidebar;