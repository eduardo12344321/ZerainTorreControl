import React, { useState, useEffect, useRef } from 'react';

interface Suggestion {
    display_name: string;
    lat: string;
    lon: string;
}

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (value: string) => void;
    onEnter?: () => void;
    placeholder?: string;
    className?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    onEnter,
    placeholder = "Buscar dirección...",
    className
}) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (value.length > 2 && showSuggestions) {
                searchAddress(value);
            } else if (value.length <= 2) {
                setSuggestions([]);
            }
        }, 800); // 800ms debounce to be polite to Nominatim

        return () => clearTimeout(timeoutId);
    }, [value, showSuggestions]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const searchAddress = async (query: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=es`
            );
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error("Error fetching addresses:", error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (suggestion: Suggestion) => {
        onChange(suggestion.display_name);
        setShowSuggestions(false);
        if (onSelect) onSelect(suggestion.display_name);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setShowSuggestions(false);
            if (onEnter) onEnter();
        }
    };

    return (
        <div ref={wrapperRef} className="relative flex-grow">
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => value.length > 2 && setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={className}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-100 mt-1 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                    <li className="px-3 py-1 bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                        Sugerencias (OpenStreetMap)
                    </li>
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
                        >
                            {suggestion.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
