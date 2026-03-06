import React, { useState, useEffect } from 'react';
import type { Order } from '../../types';

interface DeleteOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    order: Order | null;
}

export const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({ isOpen, onClose, onConfirm, order }) => {
    const [confirmText, setConfirmText] = useState('');
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConfirmText('');
            setIsValid(false);
        }
    }, [isOpen]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setConfirmText(val);
        setIsValid(val === 'BORRAR');
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl shadow-sm">
                        🗑️
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-red-700">Eliminar Pedido</h2>
                        <p className="text-sm text-red-500">Esta acción es irreversible</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto text-gray-400 hover:text-red-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700">
                        <p className="font-bold mb-1">Estás a punto de eliminar:</p>
                        <p className="font-mono text-gray-500">ID: {order.display_id}</p>
                        <p className="italic">{order.description}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Escribe "BORRAR" para confirmar
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={handleInput}
                            placeholder="BORRAR"
                            className="w-full px-4 py-3 border-2 border-red-200 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none font-bold text-red-600 placeholder:text-red-200 transition-all uppercase"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isValid}
                        className={`px-6 py-2 rounded-lg font-black tracking-wide shadow-lg transition-all flex items-center gap-2 ${isValid
                            ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 scale-100'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed scale-95 opacity-50'
                            }`}
                    >
                        <span>🗑️</span> ELIMINAR
                    </button>
                </div>
            </div>
        </div>
    );
};
