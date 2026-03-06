import React, { useState, useEffect } from 'react';

import './elite.css';
const API_BASE = `${import.meta.env.VITE_API_BASE_URL.replace('/v1', '')}/strada`;

const SystemStatus: React.FC = () => {
    const [health, setHealth] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchHealth = () => {
        fetch(`${API_BASE}/system/health`)
            .then(r => r.json())
            .then(data => {
                setHealth(data);
                setLastUpdated(new Date());
            })
            .catch(console.error);
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    if (!health) return <div style={{ padding: 20, color: '#8892b0' }}>Cargando estado del sistema...</div>;

    const dbSizeColor = health.db_size_mb > 500 ? '#ef4444' : health.db_size_mb > 200 ? '#f59e0b' : '#10b981';
    const syncTime = health.last_sync ? new Date(health.last_sync) : null;
    const minerTime = health.last_miner_run ? new Date(health.last_miner_run) : null;
    const now = new Date();

    // Display seconds since last REAL miner activity, even if no new truck data came in
    const lastActiveTime = minerTime || syncTime || now;
    const secondsSinceActive = Math.floor((now.getTime() - lastActiveTime.getTime()) / 1000);
    const syncColor = secondsSinceActive > 900 ? '#ef4444' : secondsSinceActive > 300 ? '#f59e0b' : '#10b981';

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto', background: '#0a0e1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: '#e6f1ff', margin: 0 }}>🖥️ Estado del Sistema Strada</h2>
                <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>
                    Actualizado: {lastUpdated?.toLocaleTimeString()}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
                {/* DB Size */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>💾</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: dbSizeColor }}>{health.db_size_mb || 0} MB</div>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0', textTransform: 'uppercase' }}>Tamaño Base de Datos</div>
                </div>

                {/* API Sync */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔄</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: syncColor }}>Hace {secondsSinceActive} s</div>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0', textTransform: 'uppercase' }}>Última Actividad Miner</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 5 }}>Dato más reciente: {syncTime?.toLocaleString() || 'N/A'}</div>
                </div>

                {/* Vehicle Count */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>🚛</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{health.total_vehicles}</div>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0', textTransform: 'uppercase' }}>Vehículos Monitorizados</div>
                </div>

                {/* Total Rows */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>📊</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{health.total_positions ? (health.total_positions / 1000).toFixed(1) : 0}k</div>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0', textTransform: 'uppercase' }}>Puntos GPS Almacenados</div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px' }}>
                <h3 style={{ color: '#e6f1ff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.5rem' }}>📚</span> Resumen Histórico de Datos
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#8892b0', fontSize: '0.85rem', marginBottom: '5px' }}>Primer Registro</div>
                        <div style={{ color: '#e6f1ff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {health.first_record ? new Date(health.first_record).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#8892b0', fontSize: '0.85rem', marginBottom: '5px' }}>Años de Datos</div>
                        <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {health.first_record ? ((new Date().getTime() - new Date(health.first_record).getTime()) / (1000 * 3600 * 24 * 365)).toFixed(1) : 0} años
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#8892b0', fontSize: '0.85rem', marginBottom: '5px' }}>Total Tacografos</div>
                        <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {health.total_activities ? health.total_activities.toLocaleString() : 0} eventos
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#8892b0', fontSize: '0.85rem', marginBottom: '5px' }}>Total Puntos GPS</div>
                        <div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {health.total_positions ? health.total_positions.toLocaleString() : 0} pts
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ color: '#e6f1ff', marginBottom: '10px' }}>Estado de Conexión</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                    <span style={{ color: '#e6f1ff', fontWeight: 600 }}>API Strada Online</span>
                </div>
                <p style={{ color: '#8892b0', fontSize: '0.9rem', marginTop: 10 }}>
                    El sistema está funcionando correctamente. La sincronización se realiza cada 30 segundos (últimos 5 min) y el histórico se extrae en segundo plano.
                </p>
            </div>
        </div>
    );
};

export default SystemStatus;
