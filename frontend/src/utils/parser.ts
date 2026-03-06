export interface ParsedOrder {
    client_name?: string;
    origin_address?: string;
    destination_address?: string;
    estimated_duration?: number;
    description?: string;
    load_weight?: number;
}

export const parseOrderText = (text: string): ParsedOrder => {
    const result: ParsedOrder = {};
    if (!text) return result;
    const lower = text.toLowerCase();

    // 1. Detect Client (Basic Heuristics based on "para X", "de X", "cliente X")
    const clientMatch = text.match(/(?:para|de|cliente)\s+([A-ZÁÉÍÓÚ][a-z0-9\s]+?)(?:\s+(?:a|en|por|con|de\s+nuevo)|$)/i);
    if (clientMatch) {
        result.client_name = clientMatch[1].trim();
    }

    // 2. Detect Weight (kg, toneladas)
    const weightMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos|toneladas|tns)/);
    if (weightMatch) {
        let val = parseFloat(weightMatch[1].replace(',', '.'));
        if (lower.includes('toneladas') || lower.includes('tns')) {
            val *= 1000;
        }
        result.load_weight = val;
    }

    // 3. Detect Locations (from ... to ...)
    // "de [Origin] a [Dest]"
    const routeMatch = text.match(/de\s+(.+?)\s+a\s+(.+?)(?:\s+Con|\s+Mañana|\s+El|\s+Por|\.|$)/i);
    if (routeMatch) {
        result.origin_address = routeMatch[1].trim();
        result.destination_address = routeMatch[2].trim();
    }

    // 4. Detect Duration? (Difficult without explicit "during X hours")
    // Default to 60 if not found, or maybe look for "X horas"
    const durationMatch = lower.match(/(\d+)\s*(?:horas|h)/);
    if (durationMatch) {
        result.estimated_duration = parseInt(durationMatch[1]) * 60;
    }

    // Capture original text as description if no specific desc structure
    result.description = text;

    return result;
};
