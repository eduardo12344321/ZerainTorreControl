import React, { useState, useEffect } from 'react';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { LocationAutocomplete } from '../ui/LocationAutocomplete';
import { useGlobalContext } from '../../context/GlobalContext';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: 42.4667,
    lng: -2.45,
};

interface RouteCache {
    route_key: string;
    origin_full: string;
    dest_full: string;
    distance_km: number;
    duration_mins: number;
    last_updated: string;
}

export const RouteOptimizationPage: React.FC = () => {
    const { apiFetch } = useGlobalContext();

    // Calculator State
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [truckFactor, setTruckFactor] = useState(true);
    const [routeData, setRouteData] = useState<any>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [calculating, setCalculating] = useState(false);

    // Intelligence Data State
    const [cache, setCache] = useState<RouteCache[]>([]);
    const [custLocs, setCustLocs] = useState<string[]>([]);

    // Fetch Intelligence Data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [cacheRes, custRes] = await Promise.all([
                    apiFetch('/admin/route-cache'),
                    apiFetch('/customers')
                ]);
                if (cacheRes.ok) setCache(await cacheRes.json());
                if (custRes.ok) {
                    const customers = await custRes.json();
                    const locs = customers.flatMap((c: any) => [
                        c.billing_address,
                        ...(c.locations || [])
                    ]).filter((l: string) => l && l.includes('España'));
                    setCustLocs(locs);
                }
            } catch (e) { console.error(e) }
        };
        loadData();
    }, []);

    // Unique Locations for the list
    const knownLocations = Array.from(new Set([
        ...cache.flatMap(r => [r.origin_full, r.dest_full]),
        ...custLocs
    ]));

    const handleCalculate = async () => {
        if (!origin || !destination) return;
        setCalculating(true);
        setRouteData(null);
        setDirections(null);

        try {
            // 1. Backend Data
            const res = await apiFetch(`/maps/calculate-route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
            if (res.ok) {
                const data = await res.json();
                setRouteData(data); // Backend stores/returns truck time (x1.4)

                // Refresh cache list after new calculation
                const cacheRes = await apiFetch('/admin/route-cache');
                if (cacheRes.ok) setCache(await cacheRes.json());

                // 2. Visuals from Frontend Google Maps SDK
                const directionsService = new google.maps.DirectionsService();
                directionsService.route({
                    origin: origin,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                }, (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        setDirections(result);
                    }
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCalculating(false);
        }
    };

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden bg-slate-50">

            {/* TOP SECTION: Calculator & Map (Fixed Height) */}
            <div className="flex h-[500px] shrink-0 border-b border-gray-200 bg-white">
                {/* Map Area */}
                <div className="w-[60%] h-full bg-gray-100 relative border-r border-gray-200">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        zoom={9}
                        center={center}
                        options={{ disableDefaultUI: true, zoomControl: true }}
                    >
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 6 }
                                }}
                            />
                        )}
                    </GoogleMap>
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-gray-200 z-10">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Visualización</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="font-bold text-gray-800 text-sm">Mapa en Vivo</span>
                        </div>
                    </div>
                </div>

                {/* Controls Area */}
                <div className="w-[40%] p-8 overflow-y-auto flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-black text-gray-900">Calculadora</h1>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Modo Presupuesto</span>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Origen</label>
                            <LocationAutocomplete
                                placeholder="Ciudad o dirección..."
                                value={origin}
                                onChange={setOrigin}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destino</label>
                            <LocationAutocomplete
                                placeholder="Ciudad o dirección..."
                                value={destination}
                                onChange={setDestination}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                            />
                        </div>

                        {/* Truck Factor Switch */}
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <div className="text-sm font-bold text-gray-800">Factor Camión</div>
                                <div className="text-xs text-gray-500">Aplica +40% al tiempo (x1.4)</div>
                            </div>
                            <button
                                onClick={() => setTruckFactor(!truckFactor)}
                                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 focus:outline-none ${truckFactor ? 'bg-blue-600 shadow-blue-200' : 'bg-gray-300'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-[10px] font-bold ${truckFactor ? 'translate-x-6 text-blue-600' : 'text-gray-400'}`}>
                                    {truckFactor ? 'ON' : 'OFF'}
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={handleCalculate}
                            disabled={calculating || !origin || !destination}
                            className={`w-full py-4 rounded-xl font-black text-white shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-3 ${calculating ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black hover:shadow-2xl'
                                }`}
                        >
                            {calculating ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    <span>Calculando...</span>
                                </>
                            ) : (
                                <>
                                    <span>🚀 Calcular Ruta</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results Card */}
                    {routeData && (
                        <div className="mt-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl animate-in slide-in-from-bottom-4">
                            <h3 className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-4 border-b border-blue-500/30 pb-2">Resultados Oficiales</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="text-blue-100 text-xs font-medium mb-1">Distancia</div>
                                    <div className="text-3xl font-black tracking-tight">{routeData.distance_km} <span className="text-lg font-bold text-blue-300">km</span></div>
                                </div>
                                <div className="relative">
                                    <div className="text-blue-100 text-xs font-medium mb-1">Tiempo {truckFactor ? '(Camión)' : '(Coche)'}</div>
                                    <div className="text-3xl font-black tracking-tight relative z-10">
                                        {truckFactor
                                            ? routeData.duration_mins
                                            : Math.round(routeData.duration_mins / 1.4)
                                        }
                                        <span className="text-lg font-bold text-blue-300"> min</span>
                                    </div>
                                    {/* Decoration */}
                                    <div className="absolute -right-2 -bottom-2 text-6xl opacity-10">⏱️</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM SECTION: Intelligence (Auto-Scroll) */}
            <div className="flex-grow p-8 overflow-y-auto grid grid-cols-12 gap-8 bg-slate-50">

                {/* Cached Routes Table */}
                <div className="col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[400px]">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-3xl">
                        <div>
                            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                                <span className="text-xl">🧠</span> Base de Conocimiento
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">Rutas cacheadas y optimizadas para evitar costes de API.</p>
                        </div>
                        <span className="text-xs font-black bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-100">{cache.length} Rutas</span>
                    </div>
                    <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                            <thead>
                                <tr className="text-gray-400 text-[10px] font-black uppercase tracking-wider">
                                    <th className="p-3 pl-4">Ruta (Origen → Destino)</th>
                                    <th className="p-3 w-32">Distancia</th>
                                    <th className="p-3 w-32">Tiempo Est.</th>
                                    <th className="p-3 w-20 text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cache.map((route, i) => (
                                    <tr key={i} className="bg-white hover:bg-blue-50 transition-all cursor-pointer group rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-transparent hover:border-blue-100"
                                        onClick={() => {
                                            setOrigin(route.origin_full);
                                            setDestination(route.dest_full);
                                        }}
                                    >
                                        <td className="p-3 pl-4 rounded-l-xl">
                                            <div className="flex items-center gap-2 text-gray-700 font-bold">
                                                <span className="truncate max-w-[200px]" title={route.origin_full}>{route.origin_full.split(',')[0]}</span>
                                                <span className="text-gray-300">➜</span>
                                                <span className="truncate max-w-[200px]" title={route.dest_full}>{route.dest_full.split(',')[0]}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 truncate max-w-[400px]">{route.origin_full} - {route.dest_full}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-black text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs">{route.distance_km} km</span>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-bold text-blue-600">{route.duration_mins} min</span>
                                        </td>
                                        <td className="p-3 text-right rounded-r-xl">
                                            <span className="opacity-0 group-hover:opacity-100 text-blue-500 font-bold text-xs">Cargar ⤴</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {cache.length === 0 && (
                            <div className="text-center py-20 text-gray-400 italic">
                                No hay rutas guardadas. Realiza cálculos para poblar la base de datos.
                            </div>
                        )}
                    </div>
                </div>

                {/* Known Locations List */}
                <div className="col-span-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[400px]">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-3xl">
                        <div>
                            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                                <span className="text-xl">📍</span> Puntos Frecuentes
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">Direcciones verificadas.</p>
                        </div>
                        <span className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">{knownLocations.length} Ops</span>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-200">
                        {knownLocations.sort().map((loc, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer group border border-transparent hover:border-slate-100 transition-all"
                                onClick={() => !origin ? setOrigin(loc) : setDestination(loc)}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    📍
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="text-xs font-bold text-gray-700 truncate group-hover:text-blue-700">{loc.split(',')[0]}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{loc}</div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-500 bg-white px-2 py-1 rounded shadow-sm">
                                    Usar
                                </div>
                            </div>
                        ))}
                        {knownLocations.length === 0 && (
                            <div className="text-center py-10 text-gray-400 italic font-medium text-xs">
                                No hay direcciones registradas.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
