import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableActionProps {
    id: string;
    icon: string;
    label: string;
    color: string;
    onClick?: () => void;
}

export const DroppableAction: React.FC<DroppableActionProps> = ({ id, icon, label, color, onClick }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={`
                relative p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 h-32
                ${isOver
                    ? `bg-${color}-100 border-${color}-500 scale-105 shadow-xl ring-4 ring-${color}-200`
                    : `bg-gray-50 border-gray-200 hover:border-${color}-300 hover:bg-${color}-50`
                }
            `}
        >
            <span className={`text-4xl transition-transform duration-300 ${isOver ? 'scale-125 rotate-12' : 'group-hover:scale-110'}`}>
                {icon}
            </span>
            <span className={`text-xs font-black uppercase tracking-widest text-center ${isOver ? `text-${color}-700` : 'text-gray-400 group-hover:text-gray-600'}`}>
                {label}
            </span>

            {isOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl font-bold text-sm animate-pulse">
                    ¡SOLTAR AQUÍ!
                </div>
            )}
        </div>
    );
};
