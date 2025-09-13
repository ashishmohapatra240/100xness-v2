import React from "react";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <a
            href="https://github.com/ashishmohapatra240/100xness-v2"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-yellow-500 text-yellow-600 bg-yellow-50 px-4 py-1.5 rounded-full hover:bg-yellow-100 transition-colors font-dm-sans font-medium text-sm flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                clipRule="evenodd"
              />
            </svg>
            Star on GitHub
          </a>
        </div>
        <h1 className="text-4xl md:text-6xl font-medium text-black leading-tight mb-4 font-dm-sans tracking-tighter">
          Turn{" "}
          <span className="italic font-instrument-serif tracking-normal">
            Market Volatility
          </span>{" "}
          into <br /> Opportunity with 100xness
        </h1>

        <p className="text-sm md:text-md text-black mb-4 max-w-3xl mx-auto leading-relaxed font-ibm-plex-mono">
          Step into the world of limitless opportunities with a trusted broker.
          A global reach to give you the confidence to trade smarter and scale
          faster.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
          <Link
            href="/marketplace"
            className="border-2 bg-black border-black text-white px-8 py-2 rounded-4xl hover:bg-gray-800 transition-colors font-dm-sans font-medium text-lg w-full sm:w-auto border-2 border-black cursor-pointer text-center"
          >
            Let&apos;s trade
          </Link>
          <Link
            href="/docs"
            className="border-2 border-black text-black bg-white px-8 py-2 rounded-4xl hover:bg-gray-50 transition-colors font-dm-sans font-medium text-lg w-full sm:w-auto cursor-pointer text-center"
          >
            Read Docs
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
