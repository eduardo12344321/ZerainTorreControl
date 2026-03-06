import React, { useState, useEffect, useRef } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import type { Customer } from '../../types';

interface CustomerAutocompleteProps {
    value?: string; // Current client_id or client_name
    onChange: (customer: Customer | { name: string, id: string }) => void;
    className?: string;
    label?: string;
}

import { searchCustomer } from '../../utils/search';

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
    value,
    onChange,
    className = "",
    label
}) => {
    const { customers = [] } = useGlobalContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Customer[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial value hydration
    useEffect(() => {
        const found = (customers || []).find(c => c && (c.id === value || c.name === value));
        if (found) setSearchTerm(found.name || '');
        else if (value) setSearchTerm(value);
    }, [value, customers]);

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
        setSearchTerm(val);

        // If user is typing something that doesn't match, we still update parent
        // but it won't have a valid ID yet until selected.
        onChange({ name: val, id: 'unknown' });

        if (val.length > 0) {
            const normalizedVal = val.toLowerCase().trim();

            const filtered = (customers || [])
                .filter(c => c && searchCustomer(c, val))
                .sort((a, b) => {
                    const aName = (a.name || '').toLowerCase();
                    const bName = (b.name || '').toLowerCase();

                    // 0. Exact match (case insensitive)
                    if (aName === normalizedVal) return -1;
                    if (bName === normalizedVal) return 1;

                    // 1. Prioritize names starting with search term
                    const aStarts = aName.startsWith(normalizedVal);
                    const bStarts = bName.startsWith(normalizedVal);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;

                    // 2. Prioritize names containing the search term as a distinct word
                    const aWord = new RegExp(`\\b${normalizedVal}`).test(aName);
                    const bWord = new RegExp(`\\b${normalizedVal}`).test(bName);
                    if (aWord && !bWord) return -1;
                    if (!aWord && bWord) return 1;

                    // 3. Alphabetical fallback
                    return aName.localeCompare(bName);
                })
                .slice(0, 15); // Increased limit as requested for better visibility

            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelect = (customer: Customer) => {
        setSearchTerm(customer.name || '');
        onChange(customer);
        setShowSuggestions(false);
    };

    const isExisting = (customers || []).some(c => c && c.name && c.name.toLowerCase() === (searchTerm || '').toLowerCase());

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="flex items-center justify-between gap-2 text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">
                    <span>{label}</span>
                    {!isExisting && searchTerm.length > 3 && (
                        <span className="text-[9px] text-orange-500 animate-pulse font-bold normal-case">
                            ⚠️ No registrado. Créalo en "Clientes".
                        </span>
                    )}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
                    className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium ${isExisting ? 'text-blue-700' : 'text-gray-700'
                        }`}
                    placeholder="Buscar o escribir cliente..."
                />
                {isExisting && (
                    <span className="absolute right-3 top-2.5 text-blue-500 text-xs shadow-sm">✅</span>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Clientes Sugeridos
                    </div>
                    {suggestions.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => handleSelect(c)}
                            className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-colors"
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 group-hover:text-blue-700">{c.name}</span>
                                <span className="text-[10px] text-gray-500">{c.email || 'Sin email'}</span>
                            </div>
                            <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">↵</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
