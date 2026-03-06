import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';

interface AttendanceRecord {
    id: number;
    driver_id: string;
    type: 'IN' | 'OUT' | 'MEAL_IN' | 'MEAL_OUT';
    timestamp: string;
    approved: number; // Changed from boolean to number to match backend (-1, 0, 1)
}

interface AttendanceHistoryProps {
    driverId: string;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ driverId }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { apiFetch } = useGlobalContext();

    const fetchAttendance = async () => {
        try {
            const response = await apiFetch(`/drivers/${driverId}/attendance`);
            const data = await response.json();
            setRecords(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchAttendance();

        const interval = setInterval(fetchAttendance, 15000);
        return () => clearInterval(interval);
    }, [driverId]);

    const approveRecord = async (recordId: number) => {
        try {
            await apiFetch(`/attendance/${recordId}/approve`, { method: 'POST' });
            fetchAttendance();
        } catch (error) { console.error('Error approving:', error); }
    };

    const rejectRecord = async (recordId: number) => {
        try {
            await apiFetch(`/attendance/${recordId}/reject`, { method: 'POST' });
            fetchAttendance();
        } catch (error) { console.error('Error rejecting:', error); }
    };

    const groupedByDate = records.reduce((acc, record) => {
        const date = record.timestamp.split(' ')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    const formatTime = (timestamp: string) => {
        return timestamp.split(' ')[1]?.substring(0, 5) || '';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-20 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-gray-800">📊 Historial de Fichajes</h3>
                    <p className="text-xs text-gray-500">{records.length} registros totales</p>
                </div>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {Object.keys(groupedByDate).length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">Sin fichajes registrados</p>
                    </div>
                ) : (
                    Object.entries(groupedByDate)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, dayRecords]) => {
                            const inRecords = dayRecords.filter(r => r.type === 'IN');
                            const outRecords = dayRecords.filter(r => r.type === 'OUT');
                            const hasMultipleEntries = inRecords.length > 1 || outRecords.length > 1;

                            return (
                                <div key={date} className={`border rounded-lg p-3 ${hasMultipleEntries ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-700">{formatDate(date)}</span>
                                            {hasMultipleEntries && (
                                                <span className="text-[10px] px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-bold">
                                                    ⚠️ MÚLTIPLES REGISTROS
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        {dayRecords
                                            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                                            .map((record) => (
                                                <div
                                                    key={record.id}
                                                    className="flex justify-between items-center bg-white rounded-md p-2 border border-gray-200"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border shadow-sm flex items-center gap-1.5 ${record.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            record.type === 'OUT' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                record.type === 'MEAL_IN' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                            {record.type === 'IN' ? '▶️ IN' :
                                                                record.type === 'OUT' ? '⏹️ OUT' :
                                                                    record.type === 'MEAL_IN' ? '🍱 COMIDA IN' : '🍔 COMIDA OUT'}
                                                        </span>
                                                        <span className="text-sm font-mono font-black text-gray-800 tracking-tight">
                                                            {formatTime(record.timestamp)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {record.approved === 1 ? (
                                                            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">
                                                                ✅ APROBADO
                                                            </span>
                                                        ) : record.approved === -1 ? (
                                                            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                                                                ❌ RECHAZADO
                                                            </span>
                                                        ) : record.approved === 2 ? (
                                                            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold font-mono italic">
                                                                ✏️ MODIFICADO
                                                            </span>
                                                        ) : (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => approveRecord(record.id)}
                                                                    className="text-[10px] px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md font-bold transition-all active:scale-95"
                                                                >
                                                                    Sí
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectRecord(record.id)}
                                                                    className="text-[10px] px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md font-bold transition-all active:scale-95"
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
};
