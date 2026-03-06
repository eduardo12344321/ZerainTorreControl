// src/utils/routing.ts

// Mock function to calculate travel time between two locations
// In a real app, this would call Google Maps Distance Matrix API
export const calculateTravelTime = (origin: string, destination: string): number => {
    if (!origin || !destination) return 15; // Default fallback

    // Normalize strings for rough matching
    const from = origin.toLowerCase();
    const to = destination.toLowerCase();

    // 1. Same city/area = short trip (15 mins)
    if (from === to) return 15;

    // 2. Mock distances from Base (Jundiz/Vitoria pattern)
    if (from.includes("jundiz") || from.includes("base")) {
        if (to.includes("bilbao")) return 45;
        if (to.includes("donostia") || to.includes("san sebastian")) return 60;
        if (to.includes("madrid")) return 240;
        return 20; // Default local
    }

    // 3. Inter-city logic mock
    if (from.includes("bilbao") && to.includes("donostia")) return 60;
    if (from.includes("madrid")) return 240;

    // 4. Default random-ish but deterministic based on string length
    const baseTime = 15;
    const variance = (from.length + to.length) % 4 * 10;
    const rawTime = baseTime + variance;

    // Truck factor: 1.4x (Trucks are slower than cars)
    return Math.round(rawTime * 1.4);
};

// New comprehensive routing mock
export const calculateRoute = (origin: string, destination: string): { duration: number, distance: number } => {
    if (!origin || !destination) return { duration: 0, distance: 0 };

    const duration = calculateTravelTime(origin, destination);

    // Mock distance based on duration (assuming avg speed of ~60km/h in mixed context, so 1km/min roughly)
    // Add some variance so it doesn't look too linear
    let distance = Math.round(duration * 0.8 * 10) / 10;

    // Adjust for specific mocks
    const from = origin.toLowerCase();
    const to = destination.toLowerCase();

    if (from.includes("jundiz") && to.includes("madrid")) distance = 350;
    if (from.includes("bilbao") && to.includes("donostia")) distance = 100;

    return { duration, distance };
};

export const BASE_LOCATION = "Jundiz, Vitoria-Gasteiz";
