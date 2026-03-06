import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableOrderProps {
    id: string;
    children: React.ReactNode;
}

export const DraggableOrder: React.FC<DraggableOrderProps> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999, // Always on top when dragging
        opacity: 0.9,
        scale: 1.05,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
            {children}
        </div>
    );
};
