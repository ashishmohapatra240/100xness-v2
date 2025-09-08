"use client";
import React from "react";

interface IntervalSelectorProps {
    selectedInterval: string;
    onIntervalChange: (interval: string) => void;
    className?: string;
}

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
    selectedInterval,
    onIntervalChange,
    className = "",
}) => {
    const intervals = [
        { value: "5m", label: "5m" },
        { value: "30m", label: "30m" },
        { value: "1h", label: "1h" },
        { value: "1d", label: "1d" },
    ];

    return (
        <div className={`inline-flex rounded-lg bg-gray-100 p-1 border border-gray-300 ${className}`}>
            {intervals.map((interval) => (
                <button
                    key={interval.value}
                    onClick={() => onIntervalChange(interval.value)}
                    className={`
            px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all duration-200 ease-in-out
            ${selectedInterval === interval.value
                            ? "bg-black text-white shadow-lg transform scale-105"
                            : "text-gray-600 hover:text-black hover:bg-gray-200 active:scale-95"
                        }
          `}
                >
                    {interval.label}
                </button>
            ))}
        </div>
    );
};

export default IntervalSelector;
