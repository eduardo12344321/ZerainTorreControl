import React, { useState, useEffect, useRef } from 'react';
import usePlacesAutocomplete from "use-places-autocomplete";
import { useGlobalContext } from '../../context/GlobalContext';

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    icon?: string;
    habitualLocations?: string[];
    historyLocations?: string[];
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
    value,
    onChange,
    placeholder,
    className = "",
    label,
    icon,
    habitualLocations = [],
    historyLocations = []
}) => {
    // Google Places Hook
    const {
        ready,
        value: googleValue,
        suggestions: { status: googleStatus, data: googleSuggestions },
        setValue: setGoogleValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: "es" },
        },
        debounce: 800, // Increased from 500ms to reduce API calls
        defaultValue: value,
        cache: 24 * 60 * 60,
        cacheKey: `places-${label || 'default'}`, // Unique key per instance
    });

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [osmSuggestions, setOsmSuggestions] = useState<any[]>([]);
    const [isOsmLoading, setIsOsmLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sessionActive = useRef(false);
    const { apiFetch } = useGlobalContext();

    // Force sync value from parent if it changes (e.g. AI or habitual chips)
    useEffect(() => {
        if (value !== googleValue && !showSuggestions) {
            setGoogleValue(value, false);
        }
    }, [value, googleValue, setGoogleValue, showSuggestions]);

    // Nominatim (OpenStreetMap) Fallback Fetcher
    // This ensures the user sees results even if Google Key is missing/invalid
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            // Trigger OSM if:
            // 1. Google is not ready (script not loaded)
            // 2. OR Google is ready but status is an error or zero results (and not empty which means it hasn't run)
            const isGoogleError = ready && googleStatus !== "OK" && googleStatus !== "" && googleStatus !== "ZERO_RESULTS";
            const shouldTriggerOsm = (!ready || isGoogleError) &&
                googleValue.length > 0 &&
                showSuggestions;

            if (shouldTriggerOsm) {
                setIsOsmLoading(true);
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(googleValue)}&addressdetails=1&limit=5&countrycodes=es`
                    );
                    const data = await response.json();
                    setOsmSuggestions(data);
                } catch (e) {
                    console.error("OSM Fallback error", e);
                } finally {
                    setIsOsmLoading(false);
                }
            } else if (googleValue.length === 0) {
                setOsmSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [googleValue, ready, googleStatus, showSuggestions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        // Only trigger autocomplete if 3+ characters to reduce API costs
        if (val.length >= 3) {
            setGoogleValue(val); // This triggers Google search
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }

        if (val.length === 0) {
            clearSuggestions();
        }

        // Track Google Session (Only once per typing session until selection)
        if (ready && val.length > 0 && !sessionActive.current) {
            sessionActive.current = true;
            apiFetch(`/maps/log-usage?service_type=MAPS_SUGGEST`, { method: 'POST' });
        }
    };

    const handleSelect = (val: string) => {
        setGoogleValue(val, false);
        onChange(val);
        clearSuggestions();
        setOsmSuggestions([]);
        setShowSuggestions(false);
        sessionActive.current = false;
    };

    const hasGoogleResults = googleStatus === "OK" && ready;
    const hasOsmResults = !ready && osmSuggestions.length > 0;

    // Filter local suggestions based on input
    const filteredHabitual = habitualLocations.filter(c =>
        c && (!googleValue || c.toLowerCase().includes((googleValue || '').toLowerCase()))
    );
    const filteredHistory = historyLocations.filter(c =>
        c && (!googleValue || c.toLowerCase().includes((googleValue || '').toLowerCase()))
    ).filter(h => h && !habitualLocations.includes(h));

    const isLoading = isOsmLoading;
    const hasAnyResults = hasGoogleResults || hasOsmResults || filteredHabitual.length > 0 || filteredHistory.length > 0;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase mb-1">
                    {icon && <span>{icon}</span>}
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={googleValue}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    autoComplete="off"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all font-medium pr-10"
                    placeholder={placeholder}
                />
                {(isLoading || (ready && googleStatus === "" && googleValue.length > 2)) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {showSuggestions && (hasAnyResults || isLoading) && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[300px] overflow-y-auto">
                    {/* Habitual Locations (📍) */}
                    {filteredHabitual.length > 0 && (
                        <>
                            <div className="bg-blue-50/50 px-4 py-1.5 text-[9px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-100/30">
                                Ubicaciones Habituales
                            </div>
                            {filteredHabitual.map((loc, idx) => (
                                <div
                                    key={`hab-${idx}`}
                                    onClick={() => handleSelect(loc)}
                                    className="px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <span className="text-blue-500 text-xs shrink-0">📍</span>
                                    <span className="font-bold text-gray-700">{loc}</span>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Google Suggestions */}
                    {hasGoogleResults && (
                        <>
                            <div className="bg-gray-50 px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                Sugerencias Google Maps
                            </div>
                            {googleSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.place_id}
                                    onClick={() => handleSelect(suggestion.description)}
                                    className="px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <span className="text-blue-400 text-xs shrink-0">🔍</span>
                                    <div className="flex flex-col leading-tight">
                                        <span className="font-medium text-gray-700">{suggestion.structured_formatting.main_text}</span>
                                        <span className="text-[10px] text-gray-400">{suggestion.structured_formatting.secondary_text}</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* OSM Fallback Suggestions */}
                    {hasOsmResults && (
                        <>
                            <div className="bg-gray-50 px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                Sugerencias Mapa (OSM)
                            </div>
                            {osmSuggestions.map((suggestion, idx) => (
                                <div
                                    key={`osm-${idx}`}
                                    onClick={() => handleSelect(suggestion.display_name)}
                                    className="px-4 py-3 text-xs hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <span className="text-gray-400 text-xs shrink-0">🗺️</span>
                                    <span className="font-medium text-gray-600 line-clamp-2">{suggestion.display_name}</span>
                                </div>
                            ))}
                        </>
                    )}

                    {/* History */}
                    {filteredHistory.length > 0 && (
                        <>
                            <div className="bg-gray-50 px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                Historial Reciente
                            </div>
                            {filteredHistory.map((loc, idx) => (
                                <div
                                    key={`hist-${idx}`}
                                    onClick={() => handleSelect(loc)}
                                    className="px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <span className="text-orange-400 text-xs shrink-0">🕒</span>
                                    <span className="font-medium text-gray-500 italic">{loc}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
