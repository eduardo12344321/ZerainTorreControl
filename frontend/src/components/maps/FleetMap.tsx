import React, { useState } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, DirectionsRenderer, Polyline } from '@react-google-maps/api';
import { useGlobalContext } from '../../context/GlobalContext';
import type { Truck } from '../../types';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: 43.15, // Centrado en Euskadi (aprox Durango/Eibar para cubrir las 3 capitales)
    lng: -2.60,
};

interface FleetMapProps {
    className?: string;
    style?: React.CSSProperties;
}

export const FleetMap: React.FC<FleetMapProps> = ({ className, style }) => {
    const { trucks, orders } = useGlobalContext();
    const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
    const [directionsCache, setDirectionsCache] = useState<Record<string, google.maps.DirectionsResult>>({});

    // Filter relevant orders
    const activeOrders = orders.filter(o => o.status === 'IN_PROGRESS' && o.truck_id);
    const nextOrders = orders.filter(o => o.status === 'PLANNED' && o.truck_id);

    // Helper to fetch directions (Fallback if no polyline stored)
    const fetchRoute = (id: string, origin: string, destination: string) => {
        if (directionsCache[id]) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                setDirectionsCache(prev => ({ ...prev, [id]: result }));
            }
        });
    };

    // Trigger route fetching only if polyline is missing
    if (activeOrders.length > 0 || nextOrders.length > 0) {
        [...activeOrders, ...nextOrders].forEach(o => {
            if (!o.route_polyline && o.origin_address && o.destination_address) {
                fetchRoute(o.id, o.origin_address, o.destination_address);
            }
        });
    }

    // Helper to decode polyline - using the Google Maps geometry library which comes with the API
    const decodePolyline = (encoded: string) => {
        if (!window.google || !window.google.maps || !window.google.maps.geometry) return [];
        return window.google.maps.geometry.encoding.decodePath(encoded);
    };

    return (
        <div className={`w-full h-full relative ${className || ''}`} style={style}>
            <GoogleMap
                id="fleet-map"
                mapContainerStyle={mapContainerStyle}
                zoom={10}
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
                {/* 1. RENDER ROUTES */}

                {/* Next Routes (Grey/Dashed) */}
                {nextOrders.map(o => {
                    if (o.route_polyline) {
                        return (
                            <Polyline
                                key={`route-poly-${o.id}`}
                                path={decodePolyline(o.route_polyline)}
                                options={{
                                    strokeColor: '#9ca3af',
                                    strokeOpacity: 0.6,
                                    strokeWeight: 4,
                                    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 }, offset: '0', repeat: '10px' }]
                                }}
                            />
                        );
                    }
                    return directionsCache[o.id] && (
                        <DirectionsRenderer
                            key={`route-dir-${o.id}`}
                            options={{
                                directions: directionsCache[o.id],
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: '#9ca3af',
                                    strokeOpacity: 0.6,
                                    strokeWeight: 4,
                                    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 }, offset: '0', repeat: '10px' }]
                                },
                                preserveViewport: true
                            }}
                        />
                    );
                })}

                {/* Active Routes (Blue/Solid) */}
                {activeOrders.map(o => {
                    if (o.route_polyline) {
                        return (
                            <Polyline
                                key={`route-poly-${o.id}`}
                                path={decodePolyline(o.route_polyline)}
                                options={{
                                    strokeColor: '#2563eb',
                                    strokeOpacity: 0.8,
                                    strokeWeight: 6,
                                }}
                            />
                        );
                    }
                    return directionsCache[o.id] && (
                        <DirectionsRenderer
                            key={`route-dir-${o.id}`}
                            options={{
                                directions: directionsCache[o.id],
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: '#2563eb',
                                    strokeOpacity: 0.8,
                                    strokeWeight: 6,
                                },
                                preserveViewport: true
                            }}
                        />
                    );
                })}


                {/* 2. RENDER TRUCKS */}
                {trucks.map(truck => (
                    truck.last_location && (
                        <MarkerF
                            key={truck.id}
                            position={{ lat: truck.last_location.lat, lng: truck.last_location.lng }}
                            onClick={() => setSelectedTruck(truck)}
                            label={{
                                text: truck.plate,
                                // BIGGER FONT: text-sm (vs text-[8px]), py-1, more noticeable
                                className: "bg-white border-2 border-gray-800 text-sm font-black text-gray-900 rounded-md px-2 py-1 shadow-2xl -mt-12 tracking-wider",
                            }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 10, // Slightly bigger circle
                                fillColor: truck.status === 'AVAILABLE' ? '#10b981' : truck.status === 'BUSY' ? '#2563eb' : '#ef4444',
                                fillOpacity: 1,
                                strokeColor: '#fff',
                                strokeWeight: 2,
                            }}
                            zIndex={100} // Keep on top
                        />
                    )
                ))}

                {selectedTruck && selectedTruck.last_location && (
                    <InfoWindowF
                        position={{ lat: selectedTruck.last_location.lat, lng: selectedTruck.last_location.lng }}
                        onCloseClick={() => setSelectedTruck(null)}
                        zIndex={200}
                    >
                        <div className="p-2 min-w-[150px]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedTruck.color || '#ccc' }}></div>
                                <h4 className="font-black text-base">{selectedTruck.plate}</h4>
                            </div>
                            <p className="text-xs font-bold text-gray-500 mb-1">{selectedTruck.alias || selectedTruck.category}</p>

                            {/* Show Active Order Info in Window if available */}
                            {orders.find(o => o.truck_id === selectedTruck.id && o.status === 'IN_PROGRESS') && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-[10px] font-bold text-blue-500 uppercase block">En Curso</span>
                                    <span className="text-xs block">{orders.find(o => o.truck_id === selectedTruck.id && o.status === 'IN_PROGRESS')?.client_name}</span>
                                </div>
                            )}
                        </div>
                    </InfoWindowF>
                )}
            </GoogleMap>
        </div>
    );
};
