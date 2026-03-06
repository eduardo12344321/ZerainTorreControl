import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

interface RouteMapProps {
    origin: string;
    destination: string;
    previousLocation?: string; // Optional: where the truck comes from
    showRoute?: boolean;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: 43.15, // Centered in Euskadi
    lng: -2.60,
};

export const RouteMap: React.FC<RouteMapProps> = ({ origin, destination, previousLocation, showRoute = true }) => {
    const [mainResponse, setMainResponse] = useState<google.maps.DirectionsResult | null>(null);
    const [arrivalResponse, setArrivalResponse] = useState<google.maps.DirectionsResult | null>(null);

    const mainCallback = useCallback((res: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (res !== null && status === 'OK') {
            setMainResponse(res);
        }
    }, []);

    const arrivalCallback = useCallback((res: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (res !== null && status === 'OK') {
            setArrivalResponse(res);
        }
    }, []);

    useEffect(() => {
        setMainResponse(null);
        setArrivalResponse(null);
    }, [origin, destination, previousLocation]);

    return (
        <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
            <GoogleMap
                id="route-map"
                mapContainerStyle={mapContainerStyle}
                zoom={9}
                center={center}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    styles: [
                        { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#e9e9e9" }] },
                        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] }
                    ]
                }}
            >
                {/* 1. Main Route (Origin -> Destination) */}
                {showRoute && origin && destination && !mainResponse && (
                    <DirectionsService
                        options={{
                            destination: destination,
                            origin: origin,
                            travelMode: google.maps.TravelMode.DRIVING
                        }}
                        callback={mainCallback}
                    />
                )}

                {showRoute && mainResponse && (
                    <DirectionsRenderer
                        options={{
                            directions: mainResponse,
                            suppressMarkers: false,
                            polylineOptions: {
                                strokeColor: '#2563eb', // Blue
                                strokeWeight: 6,
                                strokeOpacity: 0.9
                            }
                        }}
                    />
                )}

                {/* 2. Arrival Route (Previous Location -> Origin) */}
                {showRoute && previousLocation && origin && !arrivalResponse && (
                    <DirectionsService
                        options={{
                            destination: origin,
                            origin: previousLocation,
                            travelMode: google.maps.TravelMode.DRIVING
                        }}
                        callback={arrivalCallback}
                    />
                )}

                {showRoute && arrivalResponse && (
                    <DirectionsRenderer
                        options={{
                            directions: arrivalResponse,
                            suppressMarkers: true, // Don't show redundant markers for arrival
                            polylineOptions: {
                                strokeColor: '#ec4899', // Pink
                                strokeWeight: 4,
                                strokeOpacity: 0.6,
                                icons: [{
                                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                                    offset: '0',
                                    repeat: '10px'
                                }]
                            }
                        }}
                    />
                )}
            </GoogleMap>

            {!origin && !destination && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50/80 backdrop-blur-sm">
                    <span className="text-4xl mb-2">🗺️</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Introduce direcciones para ver la ruta</p>
                </div>
            )}
        </div>
    );
};
