import React from 'react';
import type { Driver } from '../../types';

interface DriverRowProps {
    driver: Driver;
    children?: React.ReactNode;
    onAddMeal?: (type: 'NORMAL' | 'SPECIAL') => void;
    onShiftUpdate?: (start: string, end: string) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({ driver, children, onAddMeal, onShiftUpdate }) => {
    const handleNameClick = () => {
        const start = prompt(`Hora inicio para ${driver.name}`, driver.shift_start || "08:00");
        if (start === null) return;
        const end = prompt(`Hora fin para ${driver.name}`, driver.shift_end || "18:00");
        if (end === null) return;

        if (onShiftUpdate) {
            onShiftUpdate(start, end);
        }
    };

    return (
        <div className="flex border-b border-gray-100 h-10 hover:bg-gray-50/80 transition-colors group">
            {/* Left Header: Driver Info */}
            <div className="w-56 flex-shrink-0 border-r border-gray-200 p-2 flex items-center justify-between bg-white z-10 sticky left-0 shadow-sm">
                <div className="flex items-center gap-2 min-w-0 cursor-pointer hover:text-blue-600 transition-colors" onClick={handleNameClick}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${driver.status === 'WORKING' ? 'bg-green-500' :
                        driver.status === 'RESTING' ? 'bg-blue-400' : 'bg-gray-300'
                        }`} />
                    <div className="flex flex-col gap-0 min-w-0">
                        <div className="text-[10px] font-black text-gray-700 truncate uppercase leading-tight">
                            {driver.name.split(' ')[0]}
                        </div>
                        <div className="text-[8px] font-bold text-gray-400 leading-tight">
                            {driver.shift_start || "08:00"}-{driver.shift_end || "18:00"}
                        </div>
                    </div>
                </div>

                {/* Quick Meal Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onAddMeal && onAddMeal('NORMAL')}
                        className="p-1 hover:bg-blue-50 rounded text-xs grayscale hover:grayscale-0 transition-all border border-transparent hover:border-blue-200"
                        title="Comida Normal (13:00 - 15:00)"
                    >
                        🍴
                    </button>
                    <button
                        onClick={() => onAddMeal && onAddMeal('SPECIAL')}
                        className="p-1 hover:bg-orange-50 rounded text-xs grayscale hover:grayscale-0 transition-all border border-transparent hover:border-orange-200"
                        title="Comida Especial (13:30 - 14:30)"
                    >
                        🍱
                    </button>
                </div>
            </div>

            {/* Right Content: The Timeline Area */}
            <div className="flex-grow relative bg-gray-50/30">
                {children}
            </div>
        </div>
    );
};
