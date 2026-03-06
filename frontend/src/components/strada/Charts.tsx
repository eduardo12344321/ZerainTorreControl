import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import './elite.css';
import type { Activity, CraneEvent } from './types';

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel-sm" style={{ padding: '0.75rem' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ margin: '0.25rem 0', color: entry.color, fontWeight: 600 }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

interface SpeedChartProps {
    data: { time: string; timestamp: number; speed: number }[];
    infractions?: any[];
    craneEvents?: CraneEvent[];
    domain?: [number, number];
}

export const SpeedChart: React.FC<SpeedChartProps> = ({ data, craneEvents, domain }) => {
    const enrichedData = data.map(point => {
        const hasInfraction = point.speed > 90;
        return {
            ...point,
            speedNormal: hasInfraction ? null : point.speed,
            speedInfraction: hasInfraction ? point.speed : null
        };
    });

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>📈 Velocidad en el Tiempo</h3>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={enrichedData} syncId="stradaTimeline" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--electric-blue)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--electric-blue)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="infractionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--ruby-red)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--ruby-red)" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={domain || ['dataMin', 'dataMax']}
                        tickFormatter={(tick) => new Date(tick).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis
                        width={40}
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '0.75rem' }}
                        label={{ value: 'km/h', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    <ReferenceLine
                        y={90}
                        stroke="var(--ruby-red)"
                        strokeDasharray="3 3"
                        strokeWidth={2}
                        label={{ value: 'Límite 90 km/h', fill: 'var(--ruby-red)', fontSize: 12 }}
                    />

                    <Area
                        type="monotone"
                        dataKey="speedNormal"
                        stroke="var(--electric-blue)"
                        strokeWidth={2}
                        fill="url(#speedGradient)"
                        dot={false}
                        name="Velocidad"
                    />

                    <Area
                        type="monotone"
                        dataKey="speedInfraction"
                        stroke="var(--ruby-red)"
                        strokeWidth={3}
                        fill="url(#infractionGradient)"
                        dot={false}
                        name="Exceso"
                    />

                    {/* Crane Overlay regions */}
                    {craneEvents?.map((ev: any, i: number) => (
                        <ReferenceArea
                            key={i}
                            x1={new Date(ev.begin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            x2={new Date(ev.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            fill="url(#infractionGradient)"
                            fillOpacity={0.15}
                        />
                    ))}

                    {/* Hacky legend entry for Crane */}
                    {craneEvents && craneEvents.length > 0 && (
                        <Area type="monotone" dataKey="none" stroke="none" fill="rgba(249, 115, 22, 0.2)" name="Uso Grúa" legendType="rect" />
                    )}

                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

interface MileageChartProps {
    data: { time: string; timestamp: number; km: number }[];
    domain?: [number, number];
}

export const MileageChart: React.FC<MileageChartProps> = ({ data, domain }) => {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>📊 Kilómetros Acumulados</h3>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} syncId="stradaTimeline" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="kmGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--emerald-glow)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--emerald-glow)" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={domain || ['dataMin', 'dataMax']}
                        tickFormatter={(tick) => new Date(tick).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis
                        width={40}
                        stroke="var(--text-secondary)"
                        style={{ fontSize: '0.75rem' }}
                        label={{ value: 'KM', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="km"
                        stroke="var(--emerald-glow)"
                        strokeWidth={2}
                        fill="url(#kmGradient)"
                        dot={false}
                        name="KM"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};


// ... (Utility functions like mergeCraneSessions)

const mergeCraneSessions = (events: CraneEvent[]) => {
    if (events.length === 0) return [];

    // Sort by beginning
    const sorted = [...events].sort((a, b) => new Date(a.begin).getTime() - new Date(b.begin).getTime());
    const merged: any[] = [];

    // Initial state
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const prevEnd = new Date(current.end).getTime();
        const nextStart = new Date(next.begin).getTime();

        // Gap in minutes
        const gap = (nextStart - prevEnd) / (1000 * 60);

        // If the gap is small (less than 5 minutes), merge them
        if (gap < 5) {
            // Only update end if the new event ends later
            const nextEnd = new Date(next.end).getTime();
            if (nextEnd > prevEnd) {
                current.end = next.end;
            }
        } else {
            // Significant gap, push previous and start new
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);
    return merged;
};

interface CraneTimelineProps {
    events: CraneEvent[];
    domain?: [number, number];
}

export const CraneTimeline: React.FC<CraneTimelineProps> = ({ events, domain }) => {
    const mergedEvents = mergeCraneSessions(events);

    const formatDuration = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}min` : `${m}min`;
    };

    const formatLocalTime = (timestamp: number | string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const effectiveDomain = domain || [
        new Date().setHours(0, 0, 0, 0),
        new Date().setHours(23, 59, 59, 999)
    ];
    const totalMs = Math.max(1, effectiveDomain[1] - effectiveDomain[0]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>🏗️ Cronograma de Grúa</h3>

            {mergedEvents.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                    No hay sesiones de grúa registradas hoy
                </p>
            ) : (
                <div style={{ marginLeft: '40px', marginRight: '10px' }}>
                    <div style={{ position: 'relative', height: '100px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {[0, 0.25, 0.5, 0.75, 1].map(f => (
                                <span key={f}>{formatLocalTime(effectiveDomain[0] + totalMs * f)}</span>
                            ))}
                        </div>

                        <div style={{ position: 'relative', height: '50px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {mergedEvents.map((ev, idx) => {
                                const tStart = new Date(ev.begin).getTime();
                                const tEnd = new Date(ev.end).getTime();
                                const duration = (tEnd - tStart) / (1000 * 60 * 60);

                                const clampedStart = Math.max(tStart, effectiveDomain[0]);
                                const clampedEnd = Math.min(tEnd, effectiveDomain[1]);
                                if (clampedEnd <= clampedStart) return null;

                                const left = ((clampedStart - effectiveDomain[0]) / totalMs) * 100;
                                const width = ((clampedEnd - clampedStart) / totalMs) * 100;
                                const startTime = formatLocalTime(ev.begin);
                                const endTime = formatLocalTime(ev.end);

                                return (
                                    <React.Fragment key={idx}>
                                        <div style={{
                                            position: 'absolute',
                                            left: `${left}%`,
                                            top: '-22px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: 'var(--sunset-orange)',
                                            whiteSpace: 'nowrap',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                            background: 'rgba(0,0,0,0.6)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            zIndex: 10
                                        }}>
                                            {formatDuration(duration)}
                                        </div>

                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                height: '100%',
                                                background: 'linear-gradient(135deg, var(--sunset-orange), var(--ruby-red))',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: 'white',
                                                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
                                                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                zIndex: 5
                                            }}
                                            title={`${startTime} - ${endTime} (${formatDuration(duration)})`}
                                        >
                                            {width > 8 && formatDuration(duration)}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface TachographBarProps {
    activities: Activity[];
    domain?: [number, number];
}

export const TachographBar: React.FC<TachographBarProps> = ({ activities, domain }) => {
    const getColor = (type: string) => {
        switch (type) {
            case 'Drive': return 'var(--emerald-glow)';
            case 'Work': return 'var(--sunset-orange)';
            case 'Waiting': return 'var(--electric-blue)';
            case 'Sleep': return 'var(--text-dim)';
            default: return 'var(--text-dim)';
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'Drive': return 'Conducción';
            case 'Work': return 'Trabajo';
            case 'Waiting': return 'Espera';
            case 'Sleep': return 'Descanso';
            default: return type;
        }
    };

    const calculateDuration = (begin: string, end: string) => {
        const start = new Date(begin).getTime();
        const finish = new Date(end).getTime();
        return (finish - start) / (1000 * 60 * 60);
    };

    const formatDuration = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const effectiveDomain = domain || [
        activities.length > 0 ? new Date(activities[0].begin).getTime() : 0,
        activities.length > 0 ? new Date(activities[activities.length - 1].end).getTime() : 1
    ];
    const totalMs = Math.max(1, effectiveDomain[1] - effectiveDomain[0]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>⏱️ Estado del Conductor</h3>

            <div style={{ marginLeft: '40px', marginRight: '10px' }}>
                <div style={{
                    display: 'flex', position: 'relative',
                    height: '50px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginBottom: '0.5rem',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {activities.map((act, idx) => {
                        const tStart = new Date(act.begin).getTime();
                        const tEnd = new Date(act.end).getTime();
                        const duration = (tEnd - tStart) / (1000 * 60 * 60);

                        const clampedStart = Math.max(tStart, effectiveDomain[0]);
                        const clampedEnd = Math.min(tEnd, effectiveDomain[1]);
                        if (clampedEnd <= clampedStart) return null;

                        const percentage = ((clampedEnd - clampedStart) / totalMs) * 100;
                        const leftOffset = ((clampedStart - effectiveDomain[0]) / totalMs) * 100;

                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    left: `${leftOffset}%`,
                                    width: `${percentage}%`,
                                    height: '100%',
                                    background: getColor(act.type),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    transition: 'filter 0.2s',
                                    cursor: 'pointer',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                    borderRight: idx < activities.length - 1 ? '1px solid rgba(0,0,0,0.3)' : 'none'
                                }}
                                title={`${getLabel(act.type)}: ${formatDuration(duration)} (${new Date(act.begin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(act.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`}
                            >
                                {percentage > 8 && formatDuration(duration)}
                            </div>
                        );
                    })}
                </div>

                {/* Timeline X-Axis */}
                {activities.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8892b0', fontSize: '0.65rem', marginBottom: '1.5rem', padding: '0 2px', marginTop: '-4px' }}>
                        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
                            const timeMs = effectiveDomain[0] + (totalMs * f);
                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ height: '4px', width: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '2px' }}></div>
                                    <span>{new Date(timeMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Drive', 'Work', 'Waiting', 'Sleep'].map(type => {
                        const total = activities
                            .filter(a => a.type === type)
                            .reduce((sum, a) => sum + calculateDuration(a.begin, a.end), 0);

                        if (total === 0) return null;

                        return (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '3px',
                                    background: getColor(type),
                                    boxShadow: `0 0 8px ${getColor(type)}`
                                }} />
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {getLabel(type)}: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(total)}</strong>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
