import type { Customer } from '../types';

export const normalizeText = (text: string): string => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remove accents
};

/**
 * Intelligent fuzzy search:
 * 1. Normalizes accents and case
 * 2. Splits query into words
 * 3. Ensures ALL words (in any order) are present in the target string
 */
export const fuzzyMatch = (target: string, query: string): boolean => {
    if (!query) return true;
    if (!target) return false;

    const normalizedTarget = normalizeText(target);
    const keywords = normalizeText(query).split(/\s+/).filter(Boolean);

    // Check if every keyword is found anywhere in the target
    return keywords.every(kw => normalizedTarget.includes(kw));
};

export const searchCustomer = (customer: Customer, term: string): boolean => {
    if (!term) return true;

    // Build unique search string from identity fields only (excluding geography)
    const searchParts = [
        customer.name,
        customer.display_id?.toString() || "",
        customer.nif || "",
        customer.email || "",
        customer.phone || "",
        customer.notes || "",
        ...(customer.contacts?.map(c => `${c.name} ${c.role} ${c.phone} ${c.email}`) || [])
    ];

    const fieldsToSearch = searchParts.filter(Boolean).join(" ");

    return fuzzyMatch(fieldsToSearch, term);
};
