import React, { useState } from 'react';
import type { DailyRecord } from '../../types';

interface DailyRecordsGridProps {
    driverId: string;
    records?: DailyRecord[];
    selectedDate?: string;
    onDateSelect?: (date: string) => void;
}

export const DailyRecordsGrid: React.FC<DailyRecordsGridProps> = ({ records = [], selectedDate, onDateSelect }) => {
    // Current Month Logic (Mocked to current date context)
    // Month Navigation Logic
    const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    const nextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    // Generate days for the month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month, i + 1);
        return {
            dateStr: d.toISOString().split('T')[0],
            dayNum: i + 1,
            dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase()
        };
    });

    const getRecordForDate = (dateStr: string) => {
        return records.find(r => r.date === dateStr);
    };

    const getStatusColor = (record?: DailyRecord) => {
        if (!record) return 'bg-gray-50 border-gray-100 text-gray-300';
        if (record.status === 'PENDING') return 'bg-orange-50 border-orange-200 text-orange-700';
        if (record.status === 'APPROVED') return 'bg-green-50 border-green-200 text-green-700';
        if (record.status === 'MODIFIED') return 'bg-sky-50 border-sky-200 text-sky-700 font-bold italic';
        return 'bg-red-50 border-red-200 text-red-700';
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <div className="mb-2 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-[11px] uppercase tracking-tight">
                    <span>📅</span> Registro
                </h3>
                <div className="flex items-center gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors border border-gray-100"
                    >
                        <span className="text-[8px]">◀</span>
                    </button>
                    <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded shadow-sm min-w-[100px] text-center">
                        {currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors border border-gray-100"
                    >
                        <span className="text-[8px]">▶</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                    <div key={d} className="text-[8px] font-black text-gray-300 text-center py-1">{d}</div>
                ))}

                {/* Empty cells for first day padding could go here if we wanted strictly a calendar grid, 
                    but the original auto-fit approach is more flexible for "records". 
                    Let's stick to a compact 7-col grid for a real calendar feel. */}
                {Array.from({ length: new Date(year, month, 1).getDay() === 0 ? 6 : new Date(year, month, 1).getDay() - 1 }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-1"></div>
                ))}

                {days.map(day => {
                    const record = getRecordForDate(day.dateStr);
                    const hasOvertime = record && record.overtime_hours > 0;
                    const isSelected = selectedDate === day.dateStr;

                    return (
                        <div
                            key={day.dateStr}
                            onClick={() => onDateSelect?.(day.dateStr)}
                            className={`
                                relative p-1 rounded border flex flex-col items-center justify-center min-h-[38px] cursor-pointer transition-all hover:shadow-sm
                                ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30 font-black shadow-md z-10' : getStatusColor(record)}
                                ${!record && !isSelected ? 'hover:bg-gray-50' : ''}
                            `}
                        >
                            <span className={`text-[9px] leading-none ${isSelected ? 'text-blue-700' : 'font-black'}`}>{day.dayNum}</span>

                            {record && (
                                <div className={`text-[7px] font-mono font-bold mt-0.5 ${isSelected ? 'text-blue-600' : 'opacity-80'}`}>
                                    {record.regular_hours}
                                </div>
                            )}

                            {/* Extra Hours Badge - Smaller and closer */}
                            {(hasOvertime || record?.meal_in || record?.meal_out) && (
                                <div className={`absolute -top-1 -right-1 text-white text-[7px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm ${hasOvertime ? 'bg-indigo-600' : 'bg-orange-500'}`}>
                                    {hasOvertime ? record.overtime_hours : '🍱'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-2 flex gap-3 text-[8px] text-gray-400 justify-center border-t border-gray-50 pt-2">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-orange-200 rounded-sm"></div> Pend.</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-sky-200 rounded-sm"></div> Modif.</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-200 rounded-sm"></div> Aprob.</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-red-200 rounded-sm"></div> Rech.</div>
            </div>
        </div>
    );
};
