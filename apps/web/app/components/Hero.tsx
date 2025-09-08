import React from 'react';
import Link from 'next/link';

const Hero = () => {
    return (
        <section className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-6xl font-medium text-black leading-tight mb-4 font-dm-sans tracking-tighter">
                    Turn <span className="italic font-instrument-serif tracking-normal">Market Volatility</span> into <br /> Opportunity with 100xness
                </h1>

                <p className="text-sm md:text-md text-black mb-4 max-w-3xl mx-auto leading-relaxed font-ibm-plex-mono">
                    Step into the world of limitless opportunities with a trusted broker.
                    A global reach to give you the confidence to trade smarter and scale faster.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                    <Link 
                        href="/register"
                        className="bg-black text-white px-8 py-2 rounded-4xl hover:bg-gray-800 transition-colors font-dm-sans font-medium text-lg w-full sm:w-auto border-2 border-black cursor-pointer text-center"
                    >
                        Let&apos;s trade
                    </Link>
                    <Link 
                        href="/marketplace"
                        className="border-2 border-black text-black bg-white px-8 py-2 rounded-4xl hover:bg-gray-50 transition-colors font-dm-sans font-medium text-lg w-full sm:w-auto cursor-pointer text-center"
                    >
                        Marketplace
                    </Link>
                </div>
            </div>
        </section >
    );
};

export default Hero;