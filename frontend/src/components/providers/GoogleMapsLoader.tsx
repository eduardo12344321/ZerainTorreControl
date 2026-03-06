import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export const GoogleMapsLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
    });

    if (loadError) {
        console.error("Google Maps Load Error:", loadError);
        // Fallback or show error? For now, render children so at least the UI works
        return <>{children}</>;
    }

    if (!isLoaded) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Iniciando Cartografía...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
