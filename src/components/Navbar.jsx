import React, { useState } from 'react';
import { assets } from '../assets/assets';
import ConfirmModal from './ConfirmModal';

const Navbar = ({ setToken }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setToken("");
  };
  return (
    <header className='bg-white border-b border-slate-200 py-2.5 px-4 md:px-6 flex items-center justify-between flex-shrink-0 z-40'>
      {/* Brand / Title section */}
      <div className='flex items-center gap-3'>
        <div className='md:hidden'>
          {/* Mobile menu toggle button placeholder if needed elsewhere */}
        </div>
        <img
          className='w-24 sm:w-28 h-auto object-contain'
          src={'/logo.png'}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = assets.logo;
          }}
          alt="Fabnoor Admin"
        />
        <div className='hidden sm:block h-6 w-[1.5px] bg-slate-200 mx-2'></div>
        <p className='hidden sm:block text-slate-500 text-xs font-semibold tracking-widest uppercase'>Admin Panel</p>
      </div>

      {/* Action Section */}
      <div className='flex items-center gap-4'>
        <button
          onClick={() => setShowLogoutModal(true)}
          className='inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 transition-all duration-200 hover:text-red-600 hover:border-red-200'
        >
          <svg
            className='w-4 h-4'
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
          <span>Sign Out</span>
        </button>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        title="Logout"
        message="Are you sure you want to sign out from the admin dashboard?"
        onConfirm={() => { handleLogout(); setShowLogoutModal(false); }}
        onCancel={() => setShowLogoutModal(false)}
        confirmText="Sign Out"
        cancelText="Stay logged in"
      />
    </header>
  )
}

export default Navbar