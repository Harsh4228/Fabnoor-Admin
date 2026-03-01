import React, { useState } from 'react';
import { assets } from '../assets/assets';
import ConfirmModal from './ConfirmModal';

const Navbar = ({ setToken }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setToken("");
  };
  return (
    <div className='sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm'>
      <div className='flex items-center py-4 px-4 sm:px-6 md:px-8 lg:px-[4%] justify-between max-w-[1920px] mx-auto'>

        {/* Logo Section */}
        <div className='flex items-center gap-3'>
          <img
            className='w-[max(10%,80px)] sm:w-[max(12%,100px)] h-auto transition-transform hover:scale-105'
            src={'/logo.png'}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = assets.logo;
            }}
            alt="Logo"
          />
        </div>

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className='group relative bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 sm:px-8 sm:py-3 rounded-full text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center gap-2'
        >
          {/* Logout Icon */}
          <svg
            className='w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1'
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className='font-bold tracking-wide'>Logout</span>
        </button>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout from the admin panel?"
        onConfirm={() => { handleLogout(); setShowLogoutModal(false); }}
        onCancel={() => setShowLogoutModal(false)}
        confirmText="Yes, Logout"
        cancelText="Cancel"
      />
    </div>
  )
}

export default Navbar