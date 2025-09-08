'use client';

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { registerMutation } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        try {
            await registerMutation.mutateAsync({ name, email, password });
            router.push('/');
        } catch (error) {
            console.error('Registration error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-2">
                    <h1 className="text-4xl md:text-5xl font-medium text-black leading-tight mb-4 font-dm-sans tracking-tighter">
                        Join <span className="italic font-instrument-serif tracking-normal">100xness</span>
                    </h1>
                    <p className="text-sm md:text-md text-black mb-4 leading-relaxed font-ibm-plex-mono">
                        Start your trading journey with limitless opportunities
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-black mb-2 font-dm-sans">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:border-gray-600 transition-colors font-dm-sans bg-white"
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-black mb-2 font-dm-sans">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:border-gray-600 transition-colors font-dm-sans bg-white"
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-black mb-2 font-dm-sans">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:border-gray-600 transition-colors font-dm-sans bg-white"
                            placeholder="Enter your password (min. 6 characters)"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-dm-sans font-medium text-lg border-2 border-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-black font-dm-sans">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium hover:text-gray-700 transition-colors underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-black hover:text-gray-700 transition-colors font-dm-sans underline"
                    >
                        ← Back to Home
                    </Link>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-600 font-dm-sans leading-relaxed">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
