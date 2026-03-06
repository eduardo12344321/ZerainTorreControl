import React, { useState, useEffect, useRef } from 'react';
import { MapTower } from './MapTower';
import AnalyticsPanel from './AnalyticsPanel';
import FleetStats from './FleetStats';
import SystemStatus from './SystemStatus';
import type { Vehicle } from './types';
import './elite.css';

import { API_BASE as GLOBAL_API_BASE } from '../../config';
const API_BASE = `${GLOBAL_API_BASE.replace('/v1', '')}/strada`;

export const StradaView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'live' | 'analytics' | 'fleet' | 'status'>('live');

    useEffect(() => {
        const prev = document.title;
        document.title = 'Strada';
        return () => { document.title = prev; };
    }, []);
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
    const [loading, setLoading] = useState(true);
    const trailsLoadedRef = useRef<Set<string>>(new Set());

    const fetchFleet = async () => {
        try {
            const res = await fetch(`${API_BASE}/fleet/status`);
            const data = await res.json();
            setFleet(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (e) {
            console.error("Error fetching fleet:", e);
        }
    };

    const fetchTrail = async (plate: string) => {
        try {
            const res = await fetch(`${API_BASE}/vehicle/${plate}/trail`);
            const data = await res.json();
            setTrails(prev => ({ ...prev, [plate]: Array.isArray(data) ? data : [] }));
        } catch (e) {
            console.error(`Error fetching trail for ${plate}:`, e);
        }
    };

    // Fetch fleet every 60s (not 5s — too aggressive)
    useEffect(() => {
        fetchFleet();
        const interval = setInterval(fetchFleet, 60000);
        return () => clearInterval(interval);
    }, []);

    // Load trails for ALL vehicles once when fleet is first loaded
    useEffect(() => {
        if (fleet.length === 0) return;
        fleet.forEach(v => {
            if (!trailsLoadedRef.current.has(v.plate)) {
                trailsLoadedRef.current.add(v.plate);
                fetchTrail(v.plate);
            }
        });
    }, [fleet.length]);

    // Refresh trails every 60s to pick up new points
    useEffect(() => {
        const interval = setInterval(() => {
            fleet.forEach(v => fetchTrail(v.plate));
        }, 60000);
        return () => clearInterval(interval);
    }, [fleet]);

    const tabBtn = (id: 'live' | 'analytics' | 'fleet' | 'status', label: string) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                border: activeTab === id ? '1px solid #3b82f6' : '1px solid transparent',
                background: activeTab === id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: activeTab === id ? '#3b82f6' : '#8892b0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === id ? '0 0 15px rgba(59,130,246,0.3)' : 'none',
            }}
        >
            {label}
        </button>
    );

    return (
        <div className="strada-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0e1a', color: '#e6f1ff' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#1a1f35', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ZERAIN FLEET COMMAND
                    </h1>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {tabBtn('live', '🗺️ Mapa en Vivo')}
                        {tabBtn('analytics', '📊 Analítica')}
                        {tabBtn('fleet', '🏆 Flota')}
                        {tabBtn('status', '🖥️ Sistema')}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', color: '#8892b0' }}>
                    <span>📡 {fleet.length} unidades</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        <span>Online</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {loading && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#3b82f6', animation: 'pulse 1s infinite', zIndex: 9999 }} />}
                {activeTab === 'live' && <MapTower fleet={fleet} trails={trails} />}
                {activeTab === 'analytics' && <AnalyticsPanel fleet={fleet} />}
                {activeTab === 'fleet' && <FleetStats />}
                {activeTab === 'status' && <SystemStatus />}
            </div>
        </div>
    );
};
