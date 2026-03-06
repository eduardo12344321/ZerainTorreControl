import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import './elite.css';

import { API_BASE as GLOBAL_API_BASE } from '../../config';
const API_BASE = `${GLOBAL_API_BASE.replace('/v1', '')}/strada`;

const FleetStats: React.FC = () => {
    const [range, setRange] = useState('day');
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE}/fleet/stats?range=${range}&start_date=${currentDate}`)
            .then(r => r.json())
            .then(data => {
                setStats(data.sort((a: any, b: any) => b.km - a.km));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [range, currentDate]);

    const handlePrev = () => {
        const d = new Date(currentDate);
        if (range === 'day') d.setDate(d.getDate() - 1);
        else if (range === 'week') d.setDate(d.getDate() - 7);
        else if (range === 'month') d.setMonth(d.getMonth() - 1);
        else if (range === 'year') d.setFullYear(d.getFullYear() - 1);
        setCurrentDate(d.toISOString().split('T')[0]);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (range === 'day') d.setDate(d.getDate() + 1);
        else if (range === 'week') d.setDate(d.getDate() + 7);
        else if (range === 'month') d.setMonth(d.getMonth() + 1);
        else if (range === 'year') d.setFullYear(d.getFullYear() + 1);

        if (d > new Date()) {
            setCurrentDate(new Date().toISOString().split('T')[0]);
        } else {
            setCurrentDate(d.toISOString().split('T')[0]);
        }
    };

    const isToday = new Date(currentDate).toDateString() === new Date().toDateString();

    const getInputValue = () => {
        const d = new Date(currentDate);
        if (range === 'month') return currentDate.substring(0, 7); // YYYY-MM
        if (range === 'year') return currentDate.substring(0, 4); // YYYY
        if (range === 'week') {
            const target = new Date(d.valueOf());
            const dayNr = (d.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
            return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        }
        return currentDate;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val) return;

        if (range === 'month') {
            setCurrentDate(`${val}-01`);
        } else if (range === 'year') {
            setCurrentDate(`${val}-01-01`);
        } else if (range === 'week') {
            const parts = val.split('-W');
            if (parts.length === 2) {
                const y = parseInt(parts[0]);
                const w = parseInt(parts[1]);
                const simple = new Date(y, 0, 1 + (w - 1) * 7);
                const dow = simple.getDay();
                const ISOweekStart = simple;
                if (dow <= 4)
                    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
                else
                    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
                setCurrentDate(ISOweekStart.toISOString().split('T')[0]);
            }
        } else {
            setCurrentDate(val);
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto', background: '#0a0e1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
                <h2 style={{ color: '#e6f1ff', margin: 0 }}>📊 Estadísticas de Flota</h2>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
                        <button onClick={handlePrev} style={{ background: '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>◀</button>
                        <input
                            type={range === 'month' ? 'month' : range === 'week' ? 'week' : range === 'year' ? 'number' : 'date'}
                            value={getInputValue()}
                            max={range === 'day' ? new Date().toISOString().split('T')[0] : range === 'year' ? new Date().getFullYear().toString() : undefined}
                            onChange={handleInputChange}
                            style={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#e6f1ff', fontSize: '0.85rem' }}
                        />
                        <button onClick={handleNext} disabled={isToday} style={{ background: isToday ? '#334155' : '#3b82f6', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', cursor: isToday ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: isToday ? 0.5 : 1 }}>▶</button>
                    </div>

                    {['day', 'week', 'month', 'year'].map(r => (
                        <button
                            key={r}
                            onClick={() => { setRange(r); setCurrentDate(new Date().toISOString().split('T')[0]); }}
                            style={{
                                background: range === r ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 700,
                                textTransform: 'capitalize'
                            }}
                        >
                            {r === 'day' ? 'Hoy' : r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#8892b0' }}>Cargando datos de la flota...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

                    {/* Chart 1: KM (Separate axis) */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>📍 Kilómetros Totales</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="#8892b0" fontSize={12} unit=" km" />
                                <YAxis dataKey="plate" type="category" stroke="#e6f1ff" fontSize={11} width={70} fontWeight={700} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    formatter={(val: any) => [`${val} km`, 'Distancia']}
                                />
                                <Bar dataKey="km" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="KM">
                                    <LabelList dataKey="km" position="right" style={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart 2: Hours (Grouped) */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ color: '#3b82f6', marginBottom: '1rem' }}>⏱️ Horas de Actividad</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="plate" stroke="#e6f1ff" fontSize={11} fontWeight={700} />
                                <YAxis stroke="#8892b0" fontSize={12} unit=" h" />
                                <Tooltip
                                    contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    formatter={(val: any, name: any) => [`${val} h`, name === 'drive_hours' ? 'Conducción' : name === 'crane_hours' ? 'Grúa' : 'Descanso']}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Bar dataKey="drive_hours" name="Conducción" fill="#3b82f6" stackId="a" radius={[0, 0, 4, 4]}>
                                    <LabelList dataKey="drive_hours" position="center" style={{ fill: '#fff', fontSize: 9, fontWeight: 700 }} formatter={(v: any) => v > 0.5 ? `${v}h` : ''} />
                                </Bar>
                                <Bar dataKey="crane_hours" name="Grúa" fill="#f97316" stackId="a">
                                    <LabelList dataKey="crane_hours" position="center" style={{ fill: '#fff', fontSize: 9, fontWeight: 700 }} formatter={(v: any) => v > 0.5 ? `${v}h` : ''} />
                                </Bar>
                                <Bar dataKey="rest_hours" name="Descanso" fill="#64748b" stackId="a" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="rest_hours" position="center" style={{ fill: '#fff', fontSize: 9, fontWeight: 700 }} formatter={(v: any) => v > 0.5 ? `${v}h` : ''} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Data Table */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ background: 'rgba(255,255,255,0.05)', color: '#8892b0', textTransform: 'uppercase' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Matrícula</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>KM</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6' }}>Conducción</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#f97316' }}>Grúa</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>Descanso</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#ef4444' }}>Alertas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((row: any) => (
                                    <tr key={row.plate} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#e6f1ff' }}>{row.plate} {row.has_crane ? '🏗️' : ''}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>{row.km}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#e6f1ff' }}>{row.drive_hours}h</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: row.crane_hours > 0 ? '#f97316' : '#555' }}>{row.crane_hours}h</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>{row.rest_hours}h</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            {row.alerts > 0 ? <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{row.alerts}</span> : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetStats;
