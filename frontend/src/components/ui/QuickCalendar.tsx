import React from 'react';

interface QuickCalendarProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
}

export const QuickCalendar: React.FC<QuickCalendarProps> = ({ selectedDate, onDateChange }) => {
    // Generate days range: -3 to +10 from today
    const getRangeDays = () => {
        const today = new Date();
        const days = [];
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        for (let i = -3; i <= 10; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            days.push({
                name: dayNames[date.getDay()],
                fullDate: date.toLocaleDateString('sv-SE'),
                dayNumber: date.getDate(),
                isToday: date.toLocaleDateString('sv-SE') === new Date().toLocaleDateString('sv-SE')
            });
        }
        return days;
    };

    const weekDays = getRangeDays();

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex items-center p-3 gap-3 h-20 overflow-x-auto mb-2 custom-scrollbar no-scrollbar">
            <div className="flex flex-col border-r border-gray-100 pr-6 min-w-max mr-2 shrink-0">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest text-left">Calendario</span>
                <span className="text-[10px] text-gray-400 uppercase text-left font-bold">Rápido</span>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {weekDays.map(day => {
                    const isActive = selectedDate === day.fullDate;
                    const isToday = day.isToday;
                    return (
                        <button
                            key={day.fullDate}
                            onClick={() => onDateChange(day.fullDate)}
                            className={`
                                flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded-xl border-2 transition-all active:scale-95 relative shrink-0
                                ${isActive
                                    ? 'bg-blue-600 border-blue-700 text-white shadow-lg scale-105 z-10'
                                    : isToday
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:border-emerald-500 shadow-sm'
                                        : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                                }
                            `}
                        >
                            <span className={`text-[8px] font-black uppercase leading-none mb-1 ${isActive ? 'opacity-70' : isToday ? 'text-emerald-500' : 'opacity-70'}`}>
                                {day.name}
                            </span>
                            <span className="text-xs font-black tracking-tighter">{day.dayNumber}</span>
                            {isToday && !isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
