import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './elite.css';
import type { Vehicle } from './types';

// Fix Leaflet default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

// ─── Constants ───────────────────────────────────────────────────────────────
const BASE_COORDS = { lat: 42.8354, lon: -2.7332 };
const BASE_RADIUS_M = 1000;

// 14 visually distinct colors — one per truck, no repeats
const TRUCK_COLORS = [
    '#00E5FF', // cyan
    '#FF6D00', // deep orange
    '#00C853', // green
    '#D500F9', // purple
    '#FFD600', // yellow
    '#2979FF', // blue
    '#FF4081', // pink
    '#76FF03', // lime
    '#FF6E40', // orange-red
    '#40C4FF', // light blue
    '#EEFF41', // yellow-green
    '#FF1744', // red
    '#18FFFF', // aqua
    '#B2FF59', // light lime
];

// Assign colors by stable index (sorted plates → same color every session)
const buildColorMap = (plates: string[]): Record<string, string> => {
    const sorted = [...plates].sort();
    const map: Record<string, string> = {};
    sorted.forEach((plate, i) => {
        map[plate] = TRUCK_COLORS[i % TRUCK_COLORS.length];
    });
    return map;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const haversineM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
};

const isAtBase = (lat: number, lon: number) =>
    haversineM(lat, lon, BASE_COORDS.lat, BASE_COORDS.lon) < BASE_RADIUS_M;

const getEffectiveStatus = (vehicle: Vehicle): string => {
    if (!vehicle.last_pos) return 'Unknown';
    if (isAtBase(vehicle.last_pos.latitude, vehicle.last_pos.longitude)) return 'Base';

    // Check if crane is active
    if (vehicle.has_crane && vehicle.status === 'Work') return 'Crane';

    if (vehicle.last_pos.speed >= 3) return 'Drive';
    if (vehicle.last_pos.speed < 3) return 'Stop';
    return vehicle.status;
};

const STATUS_CONFIG: Record<string, { label: string; icon: string; border: string; bg: string; glow: string }> = {
    Drive: { label: 'En Marcha', icon: '🚚', border: '#22c55e', bg: 'rgba(21, 128, 61, 0.95)', glow: '0 0 15px rgba(22,163,74,0.4)' }, // Green
    Stop: { label: 'Detenido', icon: '🛑', border: '#ef4444', bg: 'rgba(185, 28, 28, 0.95)', glow: '0 0 15px rgba(220,38,38,0.4)' }, // Red
    Base: { label: 'En Base', icon: '🏠', border: '#475569', bg: 'rgba(0, 0, 0, 0.95)', glow: '0 0 10px rgba(0,0,0,0.8)' }, // Black
    Crane: { label: 'Grúa Activa', icon: '🏗️', border: '#a855f7', bg: 'rgba(126, 34, 206, 0.95)', glow: '0 0 15px rgba(168,85,247,0.4)' }, // Purple
    Work: { label: 'Trabajando', icon: '🔨', border: '#f97316', bg: 'rgba(194, 65, 12, 0.95)', glow: '0 0 15px rgba(234,88,12,0.4)' }, // Orange
    Unknown: { label: 'Sin Conexión', icon: '❓', border: '#334155', bg: 'rgba(30, 41, 59, 0.9)', glow: 'none' }, // Gray
    Sleep: { label: 'Descanso', icon: '💤', border: '#475569', bg: '#0f172a', glow: 'none' }
};

// ─── Stop Timer ──────────────────────────────────────────────────────────────
const StopTimer: React.FC<{ since?: string }> = ({ since }) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const update = () => {
            if (!since) return;
            const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
        };
        update();
        const t = setInterval(update, 30000);
        return () => clearInterval(t);
    }, [since]);
    return <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 800, background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>⏱ {elapsed}</span>;
};

// ─── Speed Gauge ─────────────────────────────────────────────────────────────
const SpeedGauge: React.FC<{ speed: number }> = ({ speed }) => {
    const max = 120;
    const pct = Math.min(speed / max, 1);
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ - pct * circ;
    const color = speed > 90 ? '#ef4444' : speed > 70 ? '#fbbf24' : '#fff';
    return (
        <div style={{ position: 'relative', width: 54, height: 54 }}>
            <svg width={54} height={54} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={27} cy={27} r={23} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={5} />
                <circle cx={27} cy={27} r={23} fill="none" stroke={color} strokeWidth={6}
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 6px ${color})` }} />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{Math.round(speed)}</div>
                <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase' }}>km/h</div>
            </div>
        </div>
    );
};

// ─── HUD Truck Card ───────────────────────────────────────────────────────────
interface TruckCardProps {
    vehicle: Vehicle;
    color: string;
    side: 'left' | 'right' | 'top';
    cardRef?: React.RefCallback<HTMLDivElement>;
}

const TruckCard: React.FC<TruckCardProps> = ({ vehicle, color, side, cardRef }) => {
    const effectiveStatus = getEffectiveStatus(vehicle);
    const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.Unknown;
    const speed = vehicle.last_pos?.speed ?? 0;

    const cardBg = cfg.bg;
    const textColor = '#ffffff';
    const subColor = 'rgba(255,255,255,0.7)';

    return (
        <div ref={cardRef} style={{
            background: cardBg,
            border: `2px solid ${cfg.border}`,
            borderLeft: side === 'right' ? `2px solid ${cfg.border}` : `5px solid ${color}`,
            borderRight: side === 'right' ? `5px solid ${color}` : `2px solid ${cfg.border}`,
            borderRadius: 12,
            padding: '8px 12px',
            boxShadow: cfg.glow !== 'none' ? cfg.glow : '0 10px 30px rgba(0, 0, 0, 0.6)',
            width: side === 'top' ? 160 : 180,
            backdropFilter: 'blur(12px)',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: textColor, letterSpacing: '0.5px' }}>{vehicle.plate}</span>
                </div>
                <span style={{ fontSize: '1rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{cfg.icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {speed > 0 || vehicle.last_pos ? <SpeedGauge speed={speed} /> : <div style={{ width: 54 }}></div>}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: '#fff', opacity: 0.9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
                        {cfg.label}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: textColor, fontWeight: 800 }}>
                        {vehicle.daily_km} <span style={{ fontSize: '0.65rem', color: subColor, fontWeight: 400 }}>km</span>
                    </div>
                    {effectiveStatus === 'Stop' && vehicle.last_pos && <StopTimer since={vehicle.last_pos.timestamp} />}
                </div>
            </div>
        </div>
    );
};

// ... (VehicleMarker logic ...)
// ─── Map Vehicle Marker ───────────────────────────────────────────────────────
interface VehicleMarkerProps {
    vehicle: Vehicle;
    trail: [number, number][];
    color: string;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({ vehicle, trail, color }) => {
    if (!vehicle.last_pos) return null;
    const pos: [number, number] = [vehicle.last_pos.latitude, vehicle.last_pos.longitude];
    const course = vehicle.last_pos.course ?? 0;
    const speed = vehicle.last_pos.speed ?? 0;

    const markerIcon = new L.DivIcon({
        className: '',
        html: `<div style="
            position:relative;width:32px;height:32px;
            background:${color};border-radius:50%;
            border:3px solid white;
            box-shadow:0 0 20px ${color}, 0 4px 10px rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
            transition: all 0.5s ease;
        ">
            ${speed > 1 ? `<div style="
                position:absolute;top:-16px;left:50%;
                transform:translateX(-50%) rotate(${course}deg);
                width:0;height:0;
                border-left:8px solid transparent;
                border-right:8px solid transparent;
                border-bottom:16px solid white;
                filter:drop-shadow(0 0 6px ${color});
            "></div>` : ''}
            <div style="width:7px;height:7px;background:white;border-radius:50%;"></div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    return (
        <>
            {trail.length > 1 && (
                <Polyline
                    positions={trail}
                    pathOptions={{ color, weight: 4, opacity: 0.8 }}
                />
            )}
            <Marker position={pos} icon={markerIcon} />
        </>
    );
};

// ─── Leader Lines (SVG overlay inside map) ────────────────────────────────────
interface LeaderLinesProps {
    vehicles: Vehicle[];
    colors: Record<string, string>;
    cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    mapContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}

const LeaderLinesInner: React.FC<LeaderLinesProps> = ({ vehicles, colors, cardRefs, mapContainerRef }) => {
    const map = useMap();
    const svgRef = useRef<SVGSVGElement>(null);
    const [lines, setLines] = useState<{ plate: string; color: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

    const updateLines = useCallback(() => {
        if (!mapContainerRef.current || !svgRef.current) return;
        const containerRect = mapContainerRef.current.getBoundingClientRect();

        const newLines: typeof lines = [];
        for (const v of vehicles) {
            if (!v.last_pos) continue;
            const cardEl = cardRefs.current[v.plate];
            if (!cardEl) continue;

            const pt = map.latLngToContainerPoint([v.last_pos.latitude, v.last_pos.longitude]);
            const cardRect = cardEl.getBoundingClientRect();

            const mx = pt.x;
            const my = pt.y;
            const cLeft = cardRect.left - containerRect.left;
            const cRight = cardRect.right - containerRect.left;
            const cTop = cardRect.top - containerRect.top;
            const cBottom = cardRect.bottom - containerRect.top;

            let x1, y1;
            const isLeftSide = cRight < containerRect.width / 3;
            const isRightSide = cLeft > (2 * containerRect.width) / 3;

            if (isLeftSide) {
                x1 = cRight;
                y1 = (my < cTop + (cBottom - cTop) / 2) ? cTop : cBottom;
            } else if (isRightSide) {
                x1 = cLeft;
                y1 = (my < cTop + (cBottom - cTop) / 2) ? cTop : cBottom;
            } else {
                x1 = cLeft + (cRight - cLeft) / 2;
                y1 = cBottom;
            }

            if (mx < -50 || mx > containerRect.width + 50 || my < -50 || my > containerRect.height + 50) continue;

            newLines.push({
                plate: v.plate,
                color: colors[v.plate] || '#fff',
                x1, y1,
                x2: mx, y2: my,
            });
        }
        setLines(newLines);
    }, [map, vehicles, colors, cardRefs, mapContainerRef]);

    useMapEvents({
        move: updateLines,
        zoom: updateLines,
        moveend: updateLines,
        zoomend: updateLines,
    });

    useEffect(() => {
        updateLines();
    }, [updateLines, vehicles]);

    if (!mapContainerRef.current) return null;

    return (
        <svg
            ref={svgRef}
            style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 1000,
            }}
        >
            <defs>
                {lines.map(l => (
                    <marker key={`arrow-${l.plate}`} id={`arrow-${l.plate}`}
                        markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <circle cx="3" cy="3" r="2.5" fill={l.color} opacity="0.9" />
                    </marker>
                ))}
            </defs>
            {lines.map(l => (
                <line
                    key={l.plate}
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke={l.color} // Use vehicle color
                    strokeWidth={3}
                    strokeOpacity={0.8}
                    strokeDasharray="4 4"
                    markerEnd={`url(#arrow-${l.plate})`}
                />
            ))}
        </svg>
    );
};

// ─── Map Layer Switcher ───────────────────────────────────────────────────────
const MAP_LAYERS = {
    voyager: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', name: 'Mapa', icon: '🗺️' },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', name: 'Oscuro', icon: '🌙' },
    light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', name: 'Claro', icon: '☀️' },
};

// ─── HUD Layout ───────────────────────────────────────────────────────────────
interface HUDOverlayProps {
    vehicles: Vehicle[];
    colors: Record<string, string>;
    cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

const HUDOverlay: React.FC<HUDOverlayProps> = ({ vehicles, colors, cardRefs }) => {
    // Show ALL vehicles, even those without GPS right now so they don't disappear.
    const mid = Math.ceil(vehicles.length / 2);
    const left = vehicles.slice(0, mid);
    const right = vehicles.slice(mid);

    const colStyle = (side: 'left' | 'right'): React.CSSProperties => ({
        position: 'absolute', top: 20, [side]: 12,
        zIndex: 1001, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'auto',
    });

    const setRef = (plate: string) => (el: HTMLDivElement | null) => {
        cardRefs.current[plate] = el;
    };

    return (
        <>
            <div style={colStyle('left')}>
                {left.map(v => <TruckCard key={v.plate} vehicle={v} color={colors[v.plate]} side="left" cardRef={setRef(v.plate)} />)}
            </div>
            <div style={colStyle('right')}>
                {right.map(v => <TruckCard key={v.plate} vehicle={v} color={colors[v.plate]} side="right" cardRef={setRef(v.plate)} />)}
            </div>
        </>
    );
};

// ─── Infractions Panel ────────────────────────────────────────────────────────
const InfractionsPanel: React.FC<{ fleet: Vehicle[] }> = ({ fleet }) => {
    const [expanded, setExpanded] = useState(false);
    const alerts = fleet.filter(v => v.alerts_today > 0);
    if (alerts.length === 0) return null;
    return (
        <div onClick={() => setExpanded(!expanded)} style={{
            background: 'rgba(11,14,20,0.95)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10,
            padding: '8px 14px', cursor: 'pointer',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                    ⚠️ {alerts.length} vehículo{alerts.length > 1 ? 's' : ''} con alertas hoy
                </span>
                <span style={{ color: '#64748b' }}>{expanded ? '▼' : '▶'}</span>
            </div>
            {expanded && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {alerts.map(v => (
                        <div key={v.plate} style={{ fontSize: '0.75rem', color: '#e6f1ff' }}>
                            <strong>{v.plate}</strong>: {v.alerts_today} exceso{v.alerts_today > 1 ? 's' : ''}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main MapTower ────────────────────────────────────────────────────────────
interface MapTowerProps {
    fleet: Vehicle[];
    trails?: Record<string, [number, number][]>;
}

export const MapTower: React.FC<MapTowerProps> = ({ fleet, trails = {} }) => {
    const [mapType, setMapType] = useState<keyof typeof MAP_LAYERS>('voyager');
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Unique color per plate — index-based, no collisions
    const colorMap = buildColorMap(fleet.map(v => v.plate));

    const vehiclesWithPos = fleet.filter(v => v.last_pos);

    return (
        <div ref={mapContainerRef} style={{ height: 'calc(100vh - 120px)', width: '100%', position: 'relative' }} className="strada-container">

            <MapContainer
                center={[43.0, -2.0]}
                zoom={8}
                scrollWheelZoom
                zoomControl={false}
                style={{ height: '100%', width: '100%', background: '#0b0e14' }}
            >
                <TileLayer url={MAP_LAYERS[mapType].url} />

                {vehiclesWithPos.map(v => (
                    <VehicleMarker
                        key={v.plate}
                        vehicle={v}
                        trail={trails[v.plate] || []}
                        color={colorMap[v.plate]}
                    />
                ))}

                {/* Leader lines — inside MapContainer to access useMap() */}
                <LeaderLinesInner
                    vehicles={vehiclesWithPos}
                    colors={colorMap}
                    cardRefs={cardRefs}
                    mapContainerRef={mapContainerRef}
                />
            </MapContainer>

            {/* HUD Truck Cards — outside MapContainer, absolute over map */}
            <HUDOverlay vehicles={fleet} colors={colorMap} cardRefs={cardRefs} />

            {/* Map type switcher */}
            <div style={{
                position: 'absolute', bottom: 60, right: 12, zIndex: 1002,
                display: 'flex', gap: 6,
                background: 'rgba(11,14,20,0.9)', padding: 6, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {(Object.entries(MAP_LAYERS) as [keyof typeof MAP_LAYERS, typeof MAP_LAYERS[keyof typeof MAP_LAYERS]][]).map(([key, layer]) => (
                    <button key={key} onClick={() => setMapType(key)} style={{
                        padding: '6px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                        background: mapType === key ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                        color: 'white', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                    }}>
                        {layer.icon} {layer.name}
                    </button>
                ))}
            </div>

            {/* Infractions panel */}
            <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 1001, width: '60%', maxWidth: 700, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8
            }}>
                <InfractionsPanel fleet={fleet} />

                {/* Visual Legend */}
                <div style={{
                    background: 'rgba(11,14,20,0.95)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    padding: '8px 14px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fff' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(0, 0, 0, 0.95)', border: '1px solid #475569' }}></div>
                        En Base (1km)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fff' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(21, 128, 61, 0.95)', border: '1px solid #22c55e' }}></div>
                        En Marcha
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fff' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(185, 28, 28, 0.95)', border: '1px solid #ef4444' }}></div>
                        Detenido
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fff' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(126, 34, 206, 0.95)', border: '1px solid #a855f7' }}></div>
                        Grúa Activa
                    </div>
                </div>
            </div>
        </div>
    );
};
