import React from 'react';

interface InlineCalendarProps {
    selectedDate: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label: string;
}

export const InlineCalendar: React.FC<InlineCalendarProps> = ({ selectedDate, onChange, label }) => {
    const [viewDate, setViewDate] = React.useState(() => {
        return selectedDate ? new Date(selectedDate) : new Date();
    });

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const today = new Date(); // Keep for "isToday" checks

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: (firstDayOfMonth + 6) % 7 }, (_, i) => i); // Start on Monday

    const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const handleDateClick = (day: number) => {
        // Use the VIEW's month/year, but respect UTC/local string construction
        // NOTE: Date() constructor is local by default.
        const date = new Date(currentYear, currentMonth, day);
        // Tweak for timezone offsets if needed, but simple YYYY-MM-DD usually fine with local
        // let's ensure we pad correctly
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${dayStr}`;

        onChange(formatted);
    };

    const isSelected = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return selectedDate === dateStr;
    };

    const isToday = (day: number) => {
        return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    };

    const prevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const nextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">{label}</h4>

            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-4 px-2">
                <button
                    onClick={prevMonth}
                    type="button"
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-800 transition-colors"
                >
                    ◀
                </button>
                <span className="text-sm font-black text-gray-700 uppercase tracking-wider">
                    {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(viewDate)}
                </span>
                <button
                    onClick={nextMonth}
                    type="button"
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-800 transition-colors"
                >
                    ▶
                </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-1">
                {dayNames.map(d => (
                    <div key={d} className="text-[10px] font-bold text-gray-300 text-center py-1">{d}</div>
                ))}
                {blanks.map(b => (
                    <div key={`b-${b}`} className="p-3"></div>
                ))}
                {days.map(d => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => handleDateClick(d)}
                        className={`
                            h-10 w-10 flex items-center justify-center text-sm rounded-xl transition-all
                            ${isSelected(d)
                                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-100 scale-110' // Changed to blue/neutral default, parent can override via props if needed or keep standard
                                : isToday(d)
                                    ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100'
                                    : 'hover:bg-gray-50 text-gray-600'
                            }
                        `}

                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>

    );
};
