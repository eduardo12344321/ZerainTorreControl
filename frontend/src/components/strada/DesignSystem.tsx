import React, { useState } from 'react';
import './elite.css';
import type { Vehicle } from './types';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', hover = true, style, onClick }) => {
    return (
        <div
            className={`glass-panel ${hover ? '' : 'no-hover'} ${className}`}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

interface BadgeProps {
    type: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type, children, icon }) => {
    const badgeClass = `badge badge-${type}`;

    return (
        <span className={badgeClass}>
            {icon && <span>{icon}</span>}
            {children}
        </span>
    );
};

interface GaugeProps {
    value: number;
    max?: number;
    label?: string;
    size?: number;
}

export const Gauge: React.FC<GaugeProps> = ({ value, max = 120, label = 'km/h', size = 80 }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 32; // radio = 32
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (value > 90) return 'var(--ruby-red)';
        if (value > 70) return 'var(--sunset-orange)';
        return 'var(--electric-blue)';
    };

    return (
        <div className="gauge-container" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="gauge-circle">
                <circle
                    className="gauge-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r="32"
                />
                <circle
                    className="gauge-progress"
                    cx={size / 2}
                    cy={size / 2}
                    r="32"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ stroke: getColor() }}
                />
            </svg>
            <div className="gauge-value">{Math.round(value)}</div>
            <div className="gauge-label">{label}</div>
        </div>
    );
};

const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
        'Drive': 'Conduciendo',
        'Sleep': 'Descanso',
        'Work': 'Trabajando',
        'Waiting': 'Espera',
        'Unknown': 'Desconocido'
    };
    return translations[status] || status;
};

interface FloatingTelemetryProps {
    vehicle: Vehicle;
}

export const FloatingTelemetry: React.FC<FloatingTelemetryProps> = ({ vehicle }) => {
    const { plate, last_pos, status, alerts_today, daily_km = 0 } = vehicle;
    const [showTooltip, setShowTooltip] = useState(false);

    const getStatusIcon = () => {
        switch (status) {
            case 'Drive': return '🚗';
            case 'Sleep': return '🛑';
            case 'Work': return '🏗️';
            case 'Waiting': return '⏸️';
            default: return '❓';
        }
    };

    const getStatusType = () => {
        switch (status) {
            case 'Drive': return 'driving';
            case 'Sleep': return 'resting';
            case 'Work': return 'crane';
            case 'Waiting': return 'working';
            default: return 'resting';
        }
    };

    return (
        <div className="telemetry-bubble animate-fade-in" style={{ width: '200px' }}>
            <div className="telemetry-header">
                <span className="telemetry-plate">{plate}</span>
                <Badge type={getStatusType()} icon={getStatusIcon()}>
                    {translateStatus(status)}
                </Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0' }}>
                <Gauge value={last_pos?.speed || 0} size={70} />
            </div>

            <div className="telemetry-stats">
                <div className="telemetry-stat">
                    <div className="telemetry-stat-value">{daily_km}</div>
                    <div className="telemetry-stat-label">KM Hoy</div>
                </div>

                {alerts_today > 0 && (
                    <div
                        className="telemetry-stat"
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <Badge type="alert">⚠️ {alerts_today}</Badge>
                        <div className="telemetry-stat-label">Alertas</div>

                        {showTooltip && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginBottom: '8px',
                                background: 'var(--glass-surface)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                fontSize: '0.7rem',
                                whiteSpace: 'nowrap',
                                zIndex: 10000,
                                boxShadow: 'var(--shadow-glass)'
                            }}>
                                <div style={{ color: 'var(--ruby-red)', fontWeight: 600 }}>
                                    Exceso de velocidad
                                </div>
                                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Ver panel inferior para detalles
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => {
    return (
        <button
            className={`tab-button ${active ? 'active' : ''}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

interface SevereInfractionsPanelProps {
    fleet: Vehicle[];
}

export const SevereInfractionsPanel: React.FC<SevereInfractionsPanelProps> = ({ fleet }) => {
    const [expanded, setExpanded] = useState(false);

    // Agrupar infracciones por vehículo
    const vehiclesWithAlerts = fleet.filter(v => v.alerts_today > 0);

    if (vehiclesWithAlerts.length === 0) return null;

    return (
        <div
            className="glass-panel"
            style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
            }}
            onClick={() => setExpanded(!expanded)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--ruby-red)' }}>
                            Infracciones Detectadas Hoy
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {vehiclesWithAlerts.length} vehículo{vehiclesWithAlerts.length > 1 ? 's' : ''} con alertas
                        </div>
                    </div>
                </div>
                <span style={{ color: 'var(--text-dim)' }}>
                    {expanded ? '▼' : '▶'}
                </span>
            </div>

            {expanded && (
                <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    {vehiclesWithAlerts.map(vehicle => (
                        <div
                            key={vehicle.plate}
                            className="glass-panel-sm"
                            style={{ padding: '0.5rem', borderLeft: '3px solid var(--ruby-red)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                    {vehicle.plate}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--ruby-red)' }}>
                                    {vehicle.alerts_today} exceso{vehicle.alerts_today > 1 ? 's' : ''} de velocidad
                                </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Se ha superado el límite de velocidad durante aproximadamente {Math.ceil(vehicle.alerts_today * 0.5)} min
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
