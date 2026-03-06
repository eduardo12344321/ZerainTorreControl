import React from 'react';

interface LocationChipsProps {
    locations: string[];
    onSelect: (location: string) => void;
    label?: string;
}

export const LocationChips: React.FC<LocationChipsProps> = ({
    locations,
    onSelect,
    label
}) => {
    if (!locations || locations.length === 0) return null;

    return (
        <div className="mt-2">
            {label && (
                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block tracking-wider">
                    {label}
                </label>
            )}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
                {locations.map((loc, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => onSelect(loc)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors whitespace-nowrap flex items-center gap-1.5 border border-blue-100 shadow-sm hover:shadow"
                        title={loc}
                    >
                        <span className="text-sm">📍</span>
                        <span>{loc.length > 40 ? loc.substring(0, 40) + '...' : loc}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
