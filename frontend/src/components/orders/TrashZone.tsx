import React, { useState } from 'react';
import { useDragContext } from '../../context/DragContext';
import { OrderCard } from '../timeline/OrderCard';
import type { Order } from '../../types';

interface TrashZoneProps {
    orders: Order[];
    onOrderUpdate: (order: Order) => void;
    onOrderDelete: (orderId: string) => void;
}

export const TrashZone: React.FC<TrashZoneProps> = ({ orders, onOrderUpdate, onOrderDelete }) => {
    const { setDraggedOrder } = useDragContext();
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0: Idle, 1: Confirm, 2: Type
    const [inputValue, setInputValue] = useState('');

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'ORDER') {
                const orderId = data.orderId;

                const order = orders.find(o => o.id === orderId);
                if (order) {
                    onOrderUpdate({ ...order, status: 'CANCELLED', truck_id: null, driver_id: null });
                }

                setDraggedOrder(null);
            }
        } catch (err) {
            console.error('Trash drop error', err);
        }
    };

    const initiateDelete = (orderId: string) => {
        setOrderToDelete(orderId);
        setDeleteStep(1);
        setInputValue('');
    };

    const confirmDelete = () => {
        if (deleteStep === 1) {
            setDeleteStep(2);
        } else if (deleteStep === 2) {
            if (inputValue.toUpperCase() === 'BORRAR' && orderToDelete) {
                // Permanently Delete (API Call)
                onOrderDelete(orderToDelete);
                resetDelete();
            }
        }
    };

    const resetDelete = () => {
        setOrderToDelete(null);
        setDeleteStep(0);
        setInputValue('');
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 p-2 border-b border-gray-200 font-bold text-xs text-gray-600 flex justify-between items-center">
                <span>PAPELERA ({cancelledOrders.length})</span>
                {/* Trash Icon */}
                <span>🗑️</span>
            </div>

            <div
                className={`flex-grow p-2 overflow-y-auto transition-colors duration-200 ${deleteStep > 0 ? 'bg-red-50' : 'bg-gray-50'}`}
                onDragOver={e => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-red-100');
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={e => {
                    e.currentTarget.classList.remove('bg-red-100');
                }}
                onDrop={e => {
                    e.currentTarget.classList.remove('bg-red-100');
                    handleDrop(e);
                }}
            >
                {/* Delete Modal / Overlay inside the trash area */}
                {deleteStep > 0 && orderToDelete && (
                    <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-4 text-center">
                        <h3 className="text-red-600 font-bold mb-2">
                            {deleteStep === 1 ? '¿ELIMINAR DEFINITIVAMENTE?' : 'ESCRIBE "BORRAR"'}
                        </h3>

                        {deleteStep === 2 && (
                            <input
                                type="text"
                                className="border border-gray-300 rounded p-1 text-sm mb-2 w-full max-w-[120px]"
                                placeholder="BORRAR"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                            />
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={resetDelete}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteStep === 2 && inputValue.toUpperCase() !== 'BORRAR'}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteStep === 1 ? 'Sí, seguro' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                )}

                {/* List of Cancelled Orders */}
                <div className="space-y-2 relative">
                    {cancelledOrders.length === 0 && (
                        <div className="text-center text-gray-400 text-xs py-4 italic">
                            Arrastra aquí para eliminar
                        </div>
                    )}
                    {cancelledOrders.map(order => (
                        <div key={order.id} className="relative group">
                            <OrderCard
                                order={order}
                                variant="inbox"
                                pixelsPerHour={60}
                            />
                            {/* Delete Button on Hover */}
                            <button
                                onClick={() => initiateDelete(order.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                                title="Eliminar permanentemente"
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
