import React, { useState } from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    resourceName: string; // E.g., "el vehículo 9216-FTR"
    confirmText?: string; // E.g., "ELIMINAR"
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    resourceName,
    confirmText = 'ELIMINAR'
}) => {
    const [input, setInput] = useState('');

    if (!isOpen) return null;

    const isConfirmed = input.trim().toUpperCase() === confirmText.toUpperCase();

    const handleConfirm = () => {
        if (isConfirmed) {
            onConfirm();
            onClose();
            setInput('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-bold">¿Eliminar Recurso?</h3>
                </div>

                <p className="text-gray-600 mb-4">
                    Estás a punto de eliminar <span className="font-bold text-gray-800">{resourceName}</span>.
                    Esta acción no se puede deshacer.
                </p>

                <div className="text-sm text-gray-500 mb-2">
                    Escribe <span className="font-mono font-bold select-all bg-gray-100 px-1 rounded">{confirmText}</span> para confirmar:
                </div>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 font-mono text-center uppercase tracking-widest focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-6"
                    placeholder={confirmText}
                    autoFocus
                />

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isConfirmed}
                        className={`px-4 py-2 rounded-lg font-bold text-white transition-colors ${isConfirmed
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        Eliminar Definitivamente
                    </button>
                </div>
            </div>
        </div>
    );
};
