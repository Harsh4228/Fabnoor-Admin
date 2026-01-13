import axios from 'axios';
import React, { useState } from 'react';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';

const Login = ({ setToken }) => { 

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            const response = await axios.post(backendUrl + '/api/user/admin',{email, password});
            if (response.data.success){
                setToken(response.data.token);
            }else{
                toast.error(response.data.message);
            }

        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center w-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 px-4'>
            <div className='bg-white shadow-2xl rounded-3xl px-8 py-10 w-full max-w-md border border-gray-100 transform transition-all hover:scale-[1.01]'>
                
                {/* Header Section */}
                <div className='text-center mb-8'>
                    <div className='w-20 h-20 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-xl'>
                        <svg className='w-10 h-10 text-white' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2 tracking-tight'>Admin Panel</h1>
                    <p className='text-gray-500 text-sm font-medium'>Sign in to manage your store</p>
                </div>

                {/* Form Section */}
                <form onSubmit={onSubmitHandler} className='space-y-6'>
                    
                    {/* Email Field */}
                    <div className='group'>
                        <label className='text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2'>
                            <svg className='w-4 h-4 text-gray-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            Email Address
                        </label>
                        <input 
                            onChange={(e)=>setEmail(e.target.value)} 
                            value={email} 
                            className='rounded-xl w-full px-4 py-3.5 border-2 border-gray-200 outline-none focus:border-gray-800 focus:ring-4 focus:ring-gray-100 transition-all duration-300 text-gray-700 placeholder:text-gray-400' 
                            type="email" 
                            placeholder='admin@example.com' 
                            required 
                        />
                    </div>

                    {/* Password Field */}
                    <div className='group'>
                        <label className='text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2'>
                            <svg className='w-4 h-4 text-gray-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Password
                        </label>
                        <input 
                            onChange={(e)=>setPassword(e.target.value)} 
                            value={password} 
                            className='rounded-xl w-full px-4 py-3.5 border-2 border-gray-200 outline-none focus:border-gray-800 focus:ring-4 focus:ring-gray-100 transition-all duration-300 text-gray-700 placeholder:text-gray-400' 
                            type="password" 
                            placeholder='Enter your password' 
                            required 
                        />
                    </div>

                    {/* Submit Button */}
                    <button 
                        className='mt-8 w-full py-4 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300 text-base tracking-wide hover:from-gray-800 hover:via-gray-700 hover:to-gray-600'
                        type='submit'
                    >
                        Sign In
                    </button>
                </form>

                {/* Footer */}
                <div className='mt-8 text-center'>
                    <p className='text-sm text-gray-500'>
                        Secure admin access • Protected by encryption
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login