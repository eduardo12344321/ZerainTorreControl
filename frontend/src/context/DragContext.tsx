import React, { createContext, useContext, useState } from 'react';
import type { Order } from '../types';

interface DragState {
    draggedOrder: Order | null;
    setDraggedOrder: (order: Order | null) => void;
    draggedDriver: string | null;
    setDraggedDriver: (driverId: string | null) => void;
}

const DragContext = createContext<DragState | undefined>(undefined);

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
    const [draggedDriver, setDraggedDriver] = useState<string | null>(null);

    return (
        <DragContext.Provider value={{ draggedOrder, setDraggedOrder, draggedDriver, setDraggedDriver }}>
            {children}
        </DragContext.Provider>
    );
};

export const useDragContext = () => {
    const context = useContext(DragContext);
    if (!context) {
        throw new Error('useDragContext must be used within a DragProvider');
    }
    return context;
};
