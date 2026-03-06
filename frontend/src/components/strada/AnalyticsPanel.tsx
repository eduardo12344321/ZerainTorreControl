import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SpeedChart, MileageChart, CraneTimeline, TachographBar } from './Charts';
import './elite.css';
import type { Vehicle, VehicleData, OdometerPoint } from './types';

import { API_BASE as GLOBAL_API_BASE } from '../../config';
const API_BASE = `${GLOBAL_API_BASE.replace('/v1', '')}/strada`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const durationMin = (begin: string, end: string, dayStr?: string) => {
    if (!begin || !end) return 0;
    let startMs = new Date(begin).getTime();
    let endMs = new Date(end).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;
    // Clamp to the selected day if provided
    if (dayStr) {
        const dayStart = new Date(dayStr + 'T00:00:00').getTime();
        const dayEnd = new Date(dayStr + 'T23:59:59').getTime();
        startMs = Math.max(startMs, dayStart);
        endMs = Math.min(endMs, dayEnd);
        if (endMs <= startMs) return 0;
    }
    // Hard cap: no single activity can exceed 24h
    const raw = (endMs - startMs) / 60000;
    return Math.max(0, Math.min(raw, 1440));
};

const fmtDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getDayName = (dateStr: string) => {
    const jours = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(dateStr + 'T12:00:00'); // Midday to avoid timezone shifts
    return jours[date.getDay()];
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: string; label: string; value: string; color: string; sub?: string }> = ({ icon, label, value, color, sub }) => (
    <div style={{
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33`,
        borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 100,
    }}>
        <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
        <div style={{ fontSize: '0.65rem', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 1 }}>{sub}</div>}
    </div>
);

// ─── Infraction Row ───────────────────────────────────────────────────────────
const InfractionRow: React.FC<{ type: string; timestamp: string; value: number }> = ({ type, timestamp, value }) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 10px', background: 'rgba(239,68,68,0.08)',
        borderLeft: '3px solid #ef4444', borderRadius: 6, marginBottom: 4,
    }}>
        <div>
            <div style={{ fontSize: '0.8rem', color: '#e6f1ff', fontWeight: 600 }}>⚠️ {type}</div>
            <div style={{ fontSize: '0.65rem', color: '#8892b0' }}>{new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700 }}>{Math.round(value)} km/h</div>
    </div>
);

// ─── Route Map ────────────────────────────────────────────────────────────────
const RouteMap: React.FC<{ route: { latitude: number; longitude: number; timestamp: string }[], totalKm: number }> = ({ route, totalKm }) => {
    if (route.length < 2) return null;

    const positions: [number, number][] = route.map(p => [p.latitude, p.longitude]);
    const start = positions[0];
    const end = positions[positions.length - 1];
    const bounds = L.latLngBounds(positions);

    const startIcon = new L.DivIcon({
        className: '',
        html: `<div style="width:12px;height:12px;background:#10b981;border-radius:50%;border:2px solid white;box-shadow:0 0 8px #10b981"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6],
    });
    const endIcon = new L.DivIcon({
        className: '',
        html: `<div style="width:12px;height:12px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 0 8px #ef4444"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6],
    });

    const ArrowIcon = (course: number) => new L.DivIcon({
        className: '',
        html: `<div style="transform: rotate(${course}deg); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 8px solid #ffffff; filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.5)); opacity: 1;"></div>`,
        iconSize: [8, 8], iconAnchor: [4, 4],
    });

    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 600, color: '#e6f1ff', marginBottom: 12, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🗺️ Ruta del día</span>
                <span style={{ background: '#3b82f6', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🏁 {totalKm} km
                </span>
            </div>
            <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                <MapContainer bounds={bounds} scrollWheelZoom style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    {/* Normal OSM Layer with max precision, light theme */}
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    <Polyline positions={positions} pathOptions={{ color: '#8b5cf6', weight: 5, opacity: 1 }} />

                    {/* Direction arrows */}
                    {route.map((p, idx) => {
                        // Render arrow every 5 points to keep it clean, plus start and end
                        if (idx % 5 === 0 && idx !== 0 && idx !== route.length - 1) {
                            return <Marker key={idx} position={[p.latitude, p.longitude] as [number, number]} icon={ArrowIcon((p as any).course || 0)} />;
                        }
                        return null;
                    })}

                    <Marker position={start} icon={startIcon} />
                    <Marker position={end} icon={endIcon} />
                </MapContainer>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.7rem', color: '#8892b0' }}>
                <span>🟢 Inicio: {new Date(route[0].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>🔴 Último: {new Date(route[route.length - 1].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>📍 {route.length} puntos GPS</span>
            </div>
        </div>
    );
};

// ─── Reverse Geocoding Label ──────────────────────────────────────────────────
const NominatimLocation: React.FC<{ lat: number; lng: number; fallback: string }> = ({ lat, lng, fallback }) => {
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        if (!lat || !lng) return;
        const cacheKey = `geo_${lat.toFixed(4)}_${lng.toFixed(4)}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            setAddress(cached);
            return;
        }

        // Delay slightly to prevent slamming Nominatim instantly unconditionally
        const timer = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
                headers: { 'Accept-Language': 'es-ES,es;q=0.9' }
            })
                .then(r => r.json())
                .then(data => {
                    if (data && data.address) {
                        const parts = [];
                        if (data.address.road) parts.push(data.address.road);
                        const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
                        if (city) parts.push(city);
                        const str = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || fallback;
                        setAddress(str);
                        sessionStorage.setItem(cacheKey, str);
                    } else {
                        setAddress(fallback);
                    }
                })
                .catch(e => {
                    console.error('Geocode error:', e);
                    setAddress(fallback);
                });
        }, 300);

        return () => clearTimeout(timer);
    }, [lat, lng, fallback]);

    return <>{address || fallback}</>;
};

// ─── Analytics Panel ──────────────────────────────────────────────────────────
interface AnalyticsPanelProps {
    fleet: Vehicle[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ fleet }) => {
    const [selectedPlate, setSelectedPlate] = useState<string>('');
    const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [odometerData, setOdometerData] = useState<OdometerPoint[]>([]);
    const [localFleet, setLocalFleet] = useState<Vehicle[]>([]);
    const [dayStats, setDayStats] = useState<any[]>([]);

    const effectiveFleet = fleet.length > 0 ? fleet : localFleet;

    useEffect(() => {
        // Fetch stats for the sidebar to show exact km on the selected date
        fetch(`${API_BASE}/fleet/stats?range=day&start_date=${selectedDate}`)
            .then(r => r.json())
            .then(data => setDayStats(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, [selectedDate]);

    useEffect(() => {
        if (fleet.length === 0) {
            fetch(`${API_BASE}/fleet/status?date=${selectedDate}`)
                .then(r => r.json())
                .then(data => setLocalFleet(Array.isArray(data) ? data : []))
                .catch(console.error);
        }
    }, [fleet.length, selectedDate]);

    useEffect(() => {
        if (effectiveFleet.length > 0 && !selectedPlate) {
            setSelectedPlate(effectiveFleet[0].plate);
        }
    }, [effectiveFleet.length, selectedPlate]);

    useEffect(() => {
        if (!selectedPlate) return;
        setLoading(true);

        if (selectedPlate === 'ALL') {
            // Aggregate fetch for ALL
            fetch(`${API_BASE}/fleet/stats?range=day&start_date=${selectedDate}`)
                .then(r => r.json())
                .then(data => {
                    const validData = Array.isArray(data) ? data : [];
                    // Manual aggregation
                    const totalKm = validData.reduce((acc: number, v: any) => acc + (v.km || 0), 0);
                    const totalDrive = validData.reduce((acc: number, v: any) => acc + (v.drive_hours || 0) * 60, 0);
                    const totalCrane = validData.reduce((acc: number, v: any) => acc + (v.crane_hours || 0) * 60, 0);
                    const totalRest = validData.reduce((acc: number, v: any) => acc + (v.rest_hours || 0) * 60, 0);
                    const totalInfractions = validData.reduce((acc: number, v: any) => acc + (v.alerts || 0), 0);

                    // Override with aggregated values for display
                    // We mock a single vehicle object with the totals
                    const mockVehicle: any = {
                        plate: 'ALL',
                        model: 'FLOTA COMPLETA',
                        has_crane: 1, // To show crane card
                        activities: [],
                        crane_events: [],
                        infractions: new Array(totalInfractions).fill({}),
                        route: []
                    };
                    setVehicleData(mockVehicle);

                    // We need to manually set the detailed stats that usually come from calculations
                    // But calculations are done in render based on vehicleData...
                    // To avoid refactoring the whole render logic, we'll store totals in a ref or separate state?
                    // Actually, let's just use the `vehicleData` state to hold the 'ALL' mode flag and calculated values
                    // But wait, the render calculates: const driveMin = vehicleData?.activities...
                    // So we need to fake the activities to sum up to the total duration
                    // Or better: Change the render logic to use pre-calculated values if selectedPlate === 'ALL'

                    // Let's store these totals in a temporary object attached to vehicleData
                    mockVehicle._aggregates = {
                        driveMin: totalDrive || 0,
                        restMin: totalRest || 0,
                        craneMin: totalCrane || 0,
                        totalKm: totalKm || 0
                    };

                    setVehicleData(mockVehicle); // Update vehicleData with aggregates
                    setLoading(false);
                })
                .catch((e) => {
                    console.error(e);
                    setVehicleData(null);
                    setLoading(false);
                });
            setOdometerData([]); // No timeline for ALL
            return;
        }

        Promise.all([
            fetch(`${API_BASE}/vehicle/${selectedPlate}/details?date=${selectedDate}`).then(r => r.json()),
            fetch(`${API_BASE}/vehicle/${selectedPlate}/odometer-timeline?date=${selectedDate}`).then(r => r.json()),
        ]).then(([details, odometer]) => {
            if (!details) {
                setVehicleData(null);
                setOdometerData([]);
                return;
            }

            // DATA CLEANING: Fix ghost crane events during movement
            // If vehicle has a speed > 15km/h during a crane event, that crane event is likely a sensor glitch (or boom not stowed, but we visualize it as glitch for now if user requests correction)
            if (details.crane_events && details.route) {
                // Determine high-speed intervals
                const movingIntervals = details.route
                    .filter((p: any) => p.speed > 15)
                    .map((p: any) => new Date(p.timestamp).getTime());

                // Filter crane events that heavily overlap with high speed
                details.crane_events = details.crane_events.filter((ev: any) => {
                    const start = new Date(ev.begin).getTime();
                    const end = new Date(ev.end).getTime();
                    // Check if any moving point falls inside this event
                    const hasMovement = movingIntervals.some((t: number) => t >= start && t <= end);
                    // If moving, discard (or maybe split, but discard is safer for "ghosts")
                    return !hasMovement;
                });
            }

            setVehicleData(details || null);
            setOdometerData(odometer || []);
        }).catch((e) => {
            console.error(e);
            setVehicleData(null);
            setOdometerData([]);
        }).finally(() => setLoading(false));
    }, [selectedPlate, selectedDate]);

    const selectedVehicle = effectiveFleet.find(v => v.plate === selectedPlate);

    // Computed stats — all scoped to selectedDate (clamped + capped per activity)
    // If 'ALL', use the pre-calculated aggregates
    let driveMin = 0, restMin = 0, craneMin = 0, totalKm = 0;

    if (selectedPlate === 'ALL' && (vehicleData as any)?._aggregates) {
        const agg = (vehicleData as any)._aggregates;
        driveMin = agg.driveMin;
        restMin = agg.restMin;
        craneMin = agg.craneMin;
        totalKm = Math.round(agg.totalKm);
    } else {
        driveMin = vehicleData?.activities?.filter(a => a.type === 'Drive')
            .reduce((s, a) => s + durationMin(a.begin, a.end, selectedDate), 0) ?? 0;
        restMin = vehicleData?.activities?.filter(a => a.type === 'Sleep')
            .reduce((s, a) => s + durationMin(a.begin, a.end, selectedDate), 0) ?? 0;
        craneMin = vehicleData?.crane_events
            ?.reduce((s, e) => s + durationMin(e.begin, e.end, selectedDate), 0) ?? 0;
        totalKm = odometerData.length > 0 ? Math.round(odometerData[odometerData.length - 1].km) : 0;
    }

    let globalMinTime: number | undefined;
    let globalMaxTime: number | undefined;

    if (vehicleData) {
        let minT = Infinity;
        let maxT = -Infinity;

        if (vehicleData.activities && vehicleData.activities.length > 0) {
            for (const act of vehicleData.activities) {
                if (act.type !== 'Sleep') {
                    minT = Math.min(minT, new Date(act.begin).getTime());
                    maxT = Math.max(maxT, new Date(act.end).getTime());
                }
            }
        }
        if (vehicleData.crane_events && vehicleData.crane_events.length > 0) {
            for (const ev of vehicleData.crane_events) {
                minT = Math.min(minT, new Date(ev.begin).getTime());
                maxT = Math.max(maxT, new Date(ev.end).getTime());
            }
        }

        // Si no hay actividad, cogemos el primer punto de la ruta
        if (minT === Infinity && vehicleData.route && vehicleData.route.length > 0) {
            minT = Math.min(minT, new Date(vehicleData.route[0].timestamp).getTime());
        }

        // El maxT que siempre cubra el último punto de la ruta y la última actividad
        if (vehicleData.route && vehicleData.route.length > 0) {
            maxT = Math.max(maxT, new Date(vehicleData.route[vehicleData.route.length - 1].timestamp).getTime());
        }

        // Añadir margen de 5 minutos por la izquierda y derecha para que las gráficas respiren
        if (minT !== Infinity && maxT !== -Infinity) {
            globalMinTime = minT - (5 * 60 * 1000);
            globalMaxTime = maxT + (5 * 60 * 1000);
        }
    }

    const speedData = vehicleData?.route ? vehicleData.route
        .filter((p: any) => {
            if (globalMinTime && globalMaxTime) {
                const t = new Date(p.timestamp).getTime();
                return t >= globalMinTime && t <= globalMaxTime;
            }
            return true;
        })
        .map((p: any) => ({
            time: new Date(p.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(p.timestamp).getTime(),
            speed: Math.round(p.speed),
        })) : [];

    // Odometer data needs timestamps too
    const odometerDataWithTimestamp = odometerData
        .filter((d: any) => {
            if (globalMinTime && globalMaxTime) {
                const t = new Date(`${selectedDate}T${d.time}:00`).getTime();
                return t >= globalMinTime && t <= globalMaxTime;
            }
            return true;
        })
        .map((d: any) => ({
            ...d,
            timestamp: new Date(`${selectedDate}T${d.time}:00`).getTime()
        }));

    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate >= today;

    // Date label for KPI cards
    const isYesterday = (() => {
        const y = new Date(); y.setDate(y.getDate() - 1);
        return selectedDate === y.toISOString().split('T')[0];
    })();
    const dateLabel = isToday ? 'hoy' : isYesterday ? 'ayer' : selectedDate;

    return (
        <div style={{ display: 'flex', height: '100%', background: '#0a0e1a' }}>
            {/* Sidebar: Vehicle Selector */}
            <div style={{ width: 220, background: '#1a1f35', borderRight: '1px solid rgba(255,255,255,0.08)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                    Vehículo
                </div>
                <select
                    value={selectedPlate}
                    onChange={e => setSelectedPlate(e.target.value)}
                    style={{
                        width: '100%', background: '#0a0e1a', border: '1px solid #3b82f6',
                        borderRadius: 6, padding: '6px 8px', color: '#e6f1ff',
                        fontSize: '0.85rem', marginBottom: 12, cursor: 'pointer',
                    }}
                >
                    <option value="ALL">TODOS (Flota)</option>
                    {effectiveFleet.map(v => (
                        <option key={v.plate} value={v.plate}>
                            {v.plate} {v.has_crane ? '🏗️' : ''}
                        </option>
                    ))}
                </select>

                {effectiveFleet.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', marginTop: 20 }}>Cargando vehículos...</div>
                ) : effectiveFleet.map(v => {
                    const stat = (Array.isArray(dayStats) ? dayStats : []).find(s => s.plate === v.plate);
                    const displayKm = stat ? stat.km : v.daily_km;
                    const displayAlerts = stat ? stat.alerts : v.alerts_today;

                    return (
                        <div
                            key={v.plate}
                            onClick={() => setSelectedPlate(v.plate)}
                            style={{
                                padding: '8px 10px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                                border: selectedPlate === v.plate ? '1px solid #3b82f6' :
                                    (displayKm === 0 ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.06)'),
                                background: selectedPlate === v.plate ? 'rgba(59,130,246,0.12)' :
                                    (displayKm === 0 ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.03)'),
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e6f1ff' }}>
                                    {v.plate} {v.has_crane ? '🏗️' : ''}
                                </span>
                                {displayAlerts > 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>⚠️{displayAlerts}</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#8892b0', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{displayKm} km</span>
                                {stat?.crane_hours > 0 && (
                                    <span style={{ color: '#f97316', fontWeight: 600 }}>Grúa: {fmtDuration(Math.round(stat.crane_hours * 60))}</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {/* Top bar: plate + date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3b82f6' }}>
                            {selectedPlate} {selectedVehicle?.has_crane ? '🏗️' : ''}
                        </div>
                    </div>
                    {/* Date selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => {
                            const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} style={{ background: '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>◀</button>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                                {getDayName(selectedDate)}
                            </div>
                            <input type="date" value={selectedDate} max={today}
                                onChange={e => setSelectedDate(e.target.value)}
                                style={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#e6f1ff', fontSize: '0.85rem' }} />
                        </div>

                        <button onClick={() => {
                            if (!isToday) {
                                const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }
                        }} disabled={isToday} style={{ background: isToday ? '#334155' : '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', cursor: isToday ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: isToday ? 0.5 : 1 }}>▶</button>
                    </div>
                </div>

                {/* KPI Cards — all scoped to selectedDate */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                    <StatCard icon="📍" label="Kilómetros" value={`${totalKm} km`} color="#10b981" sub={dateLabel} />
                    <StatCard icon="🚗" label="Conducción" value={fmtDuration(driveMin)} color="#3b82f6" sub={dateLabel} />
                    <StatCard icon="💤" label="Descanso" value={fmtDuration(restMin)} color="#8892b0" sub={dateLabel} />
                    {selectedPlate === 'ALL' || selectedVehicle?.has_crane ? <StatCard icon="🏗️" label="Grúa" value={fmtDuration(craneMin)} color="#f97316" sub={dateLabel} /> : null}
                    {(vehicleData?.infractions?.length ?? 0) > 0 && (
                        <StatCard icon="⚠️" label="Multas" value={`${vehicleData!.infractions.length}`} color="#ef4444" sub={dateLabel} />
                    )}
                </div>

                {selectedPlate === 'ALL' && !loading && (
                    <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: '#8892b0' }}>
                        Selecciona un vehículo específico para ver rutas y detalles.
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#8892b0' }}>Cargando datos...</div>
                ) : (
                    <>
                        {speedData.length > 0 && <SpeedChart data={speedData} craneEvents={vehicleData?.crane_events} domain={globalMinTime && globalMaxTime ? [globalMinTime, globalMaxTime] : undefined} />}

                        {/* Crane timeline + synchronized area chart (MOVED UP) */}
                        {selectedVehicle?.has_crane && vehicleData?.crane_events && vehicleData.crane_events.length > 0 && (
                            <>
                                {(() => {
                                    // 1. Group events into stops (30 min threshold)
                                    const events = [...vehicleData.crane_events].sort((a, b) => new Date(a.begin).getTime() - new Date(b.begin).getTime());
                                    const stops: { start: string; end: string; events: any[] }[] = [];
                                    let currentStop = { start: events[0].begin, end: events[0].end, events: [events[0]] };

                                    for (let i = 1; i < events.length; i++) {
                                        const ev = events[i];
                                        const gapMin = (new Date(ev.begin).getTime() - new Date(currentStop.end).getTime()) / 60000;

                                        if (gapMin <= 30) { // Same stop
                                            currentStop.end = new Date(ev.end).getTime() > new Date(currentStop.end).getTime() ? ev.end : currentStop.end;
                                            currentStop.events.push(ev);
                                        } else { // New stop
                                            stops.push(currentStop);
                                            currentStop = { start: ev.begin, end: ev.end, events: [ev] };
                                        }
                                    }
                                    stops.push(currentStop);

                                    return (
                                        <>
                                            <CraneTimeline events={vehicleData.crane_events} domain={globalMinTime && globalMaxTime ? [globalMinTime, globalMaxTime] : undefined} />

                                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 16 }}>
                                                <div style={{ fontWeight: 600, color: '#f97316', marginBottom: 12, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: '1.2rem' }}>📝</span> Resumen de Operaciones (Grúa por Parada)
                                                </div>
                                                <div style={{ display: 'grid', gap: 10 }}>
                                                    {stops.map((stop, i) => {
                                                        const start = new Date(stop.start);
                                                        const end = new Date(stop.end);
                                                        const totalWindowMin = (end.getTime() - start.getTime()) / 60000;
                                                        const realEngineMin = stop.events.reduce((acc, e) => acc + ((new Date(e.end).getTime() - new Date(e.begin).getTime()) / 60000), 0);

                                                        return (
                                                            <div key={i} style={{
                                                                background: 'rgba(249, 115, 22, 0.1)', borderLeft: '4px solid #f97316',
                                                                padding: '10px 14px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                                                            }}>
                                                                <div>
                                                                    <div style={{ color: '#e6f1ff', fontWeight: 600, fontSize: '0.85rem' }}>
                                                                        {(() => {
                                                                            let lat: number | undefined;
                                                                            let lng: number | undefined;
                                                                            if (vehicleData.route && vehicleData.route.length > 0) {
                                                                                const targetMs = start.getTime();
                                                                                let minDiff = Infinity;
                                                                                for (const pt of vehicleData.route) {
                                                                                    const diff = Math.abs(new Date(pt.timestamp).getTime() - targetMs);
                                                                                    if (diff < minDiff && diff < 3600000) { // Max 1h difference
                                                                                        minDiff = diff;
                                                                                        lat = pt.latitude;
                                                                                        lng = pt.longitude;
                                                                                    }
                                                                                }
                                                                            }
                                                                            return (lat && lng)
                                                                                ? <NominatimLocation lat={lat} lng={lng} fallback={`Parada ${i + 1}`} />
                                                                                : `Parada ${i + 1}`;
                                                                        })()}
                                                                    </div>
                                                                    <div style={{ color: '#8892b0', fontSize: '0.75rem', marginTop: 2 }}>
                                                                        {start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', gap: 20 }}>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ color: '#8892b0', fontSize: '0.65rem', textTransform: 'uppercase' }}>Tiempo Total (Est.)</div>
                                                                        <div style={{ color: '#e6f1ff', fontWeight: 700, fontSize: '0.9rem' }}>{fmtDuration(Math.round(totalWindowMin))}</div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ color: '#8892b0', fontSize: '0.65rem', textTransform: 'uppercase' }}>Uso Real (Grúa)</div>
                                                                        <div style={{ color: '#f97316', fontWeight: 700, fontSize: '0.9rem' }}>{fmtDuration(Math.round(realEngineMin))}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </>
                        )}

                        {vehicleData?.activities && vehicleData.activities.length > 0 && (
                            <TachographBar activities={vehicleData.activities} domain={globalMinTime && globalMaxTime ? [globalMinTime, globalMaxTime] : undefined} />
                        )}
                        {odometerDataWithTimestamp.length > 0 && <MileageChart data={odometerDataWithTimestamp} domain={globalMinTime && globalMaxTime ? [globalMinTime, globalMaxTime] : undefined} />}

                        {/* Route map */}
                        {vehicleData?.route && vehicleData.route.length > 1 && (
                            <RouteMap route={vehicleData.route} totalKm={totalKm} />
                        )}

                        {/* Infractions */}
                        {vehicleData?.infractions && vehicleData.infractions.length > 0 && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginTop: 16 }}>
                                <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 10, fontSize: '0.9rem' }}>
                                    ⚠️ Infracciones del día ({vehicleData.infractions.length})
                                </div>
                                {vehicleData.infractions.map((inf, i) => (
                                    <InfractionRow key={i} type={inf.type} timestamp={inf.timestamp} value={inf.value} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AnalyticsPanel;
