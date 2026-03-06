import React, { useState, useEffect } from 'react';
import type { Driver, DriverStatus } from '../../types';

interface DriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    driver?: Driver | null; // If null, mode is CREATE
    onConfirm: (driver: Driver) => void;
}

export const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, driver, onConfirm }) => {
    const isEditing = !!driver;
    const [formData, setFormData] = useState<Partial<Driver>>({
        status: 'WORKING',
        is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (driver) {
                setFormData({ ...driver });
            } else {
                setFormData({
                    id: `d-${Date.now()}`,
                    name: '',
                    status: 'WORKING',
                    is_active: true,
                    stats: { extra_hours_month: 0, extra_hours_today: 0, diets_month: 0, diets_today: 0 },
                    logs: []
                });
            }
        }
    }, [isOpen, driver]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(formData as Driver);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span>{isEditing ? '✏️' : '➕'}</span> {isEditing ? 'Editar Trabajador' : 'Nuevo Trabajador'}
                    </h2>
                    <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors text-white">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Ej: Juan Pérez"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI / NIE</label>
                            <input
                                type="text"
                                value={formData.dni || ''}
                                onChange={e => setFormData(prev => ({ ...prev, dni: e.target.value.toUpperCase() }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                                placeholder="12345678A"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isEditing ? 'Nueva Contraseña' : 'Contraseña'}</label>
                            <input
                                type="password"
                                value={formData.password || ''}
                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder={isEditing ? 'Sin cambios' : 'Contraseña inicial'}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                            <select
                                value={formData.status || 'WORKING'}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as DriverStatus }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="WORKING">🟢 Trabajando</option>
                                <option value="RESTING">⚪ Descansando</option>
                                <option value="SICK">🔴 Baja Médica</option>
                                <option value="VACATION">🟣 Vacaciones</option>
                            </select>
                        </div>
                        <div className="flex items-end mb-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active || false}
                                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-gray-700">Cuenta Activa</span>
                            </label>
                        </div>
                    </div>



                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-transform active:scale-95"
                        >
                            {isEditing ? 'Guardar Cambios' : 'Crear Trabajador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
