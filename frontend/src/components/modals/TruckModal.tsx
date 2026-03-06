import React, { useState, useEffect } from 'react';
import type { Truck } from '../../types';
import { useGlobalContext } from '../../context/GlobalContext';

interface TruckModalProps {
    isOpen: boolean;
    onClose: () => void;
    truck?: Truck | null; // If null, mode is CREATE
    onConfirm: (truck: Truck) => void;
}

export const TruckModal: React.FC<TruckModalProps> = ({ isOpen, onClose, truck, onConfirm }) => {
    const { drivers, trucks } = useGlobalContext();
    const isEditing = !!truck;
    const [formData, setFormData] = useState<Partial<Truck>>({
        display_order: 1,
        status: 'AVAILABLE',
        has_crane: true,
        color: '#3b82f6'
    });

    useEffect(() => {
        if (isOpen) {
            if (truck) {
                setFormData({ ...truck });
            } else {
                setFormData({
                    id: `t-${Date.now()}`,
                    alias: '',
                    plate: '',
                    display_order: trucks.length + 1,
                    status: 'AVAILABLE',
                    axles: 3,
                    max_weight: 12000,
                    max_length: 6.5,
                    color: '#3b82f6',
                    has_crane: true,
                    has_jib: false,
                    is_box_body: false,
                    itv_expiration: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
                    next_maintenance: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString()
                });
            }
        }
    }, [isOpen, truck]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(formData as Truck);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span>{isEditing ? '✏️' : '🚛'}</span>
                        {isEditing ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                    </h2>
                    <button onClick={onClose} className="hover:bg-blue-700 p-2 rounded-lg transition-colors text-white">
                        <span className="text-xl">✕</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Matrícula</label>
                            <input
                                type="text"
                                value={formData.plate || ''}
                                onChange={e => setFormData(prev => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-mono text-lg uppercase focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="0000-BBB"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Color Corporativo</label>
                            <div className="flex gap-3">
                                <input
                                    type="color"
                                    value={formData.color || '#3b82f6'}
                                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    className="h-12 w-16 border-2 border-gray-100 rounded-xl cursor-pointer p-1"
                                />
                                <input
                                    type="text"
                                    value={formData.color || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 font-mono text-sm uppercase focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Alias / Nombre del Camión</label>
                        <input
                            type="text"
                            value={formData.alias || ''}
                            onChange={e => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="Ej: Volvo FH16 - El Gigante"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nº Orden (1-11)</label>
                        <input
                            type="number"
                            min="1"
                            max="99"
                            value={formData.display_order || 0}
                            onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Carga Máx (kg)</label>
                            <input
                                type="number"
                                value={formData.max_weight || 0}
                                onChange={e => setFormData(prev => ({ ...prev, max_weight: parseInt(e.target.value) }))}
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Largo Plataforma (m)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.max_length || 0}
                                onChange={e => setFormData(prev => ({ ...prev, max_length: parseFloat(e.target.value) }))}
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Próxima ITV</label>
                            <input
                                type="date"
                                value={formData.itv_expiration ? formData.itv_expiration.split('T')[0] : ''}
                                onChange={e => setFormData(prev => ({ ...prev, itv_expiration: e.target.value }))}
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none font-bold text-gray-700 bg-gray-50"
                            />
                            <div className="flex gap-2 mt-2">
                                {[
                                    { label: '+6M', months: 6 },
                                    { label: '+1A', months: 12 },
                                    { label: '+2A', months: 24 },
                                ].map(opt => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => {
                                            const current = formData.itv_expiration
                                                ? new Date(formData.itv_expiration)
                                                : new Date();
                                            current.setMonth(current.getMonth() + opt.months);
                                            setFormData(prev => ({
                                                ...prev,
                                                itv_expiration: current.toISOString().split('T')[0]
                                            }));
                                        }}
                                        className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 hover:bg-blue-100"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mantenimiento (Texto)</label>
                            <input
                                type="text"
                                value={formData.next_maintenance || ''}
                                onChange={e => setFormData(prev => ({ ...prev, next_maintenance: e.target.value }))}
                                placeholder="Ej: 2023-12-01 o Rango"
                                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none font-bold text-gray-700 bg-gray-50"
                            />
                        </div>
                    </div>


                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Conductor Habitual (Asignación Fija)</label>
                        <select
                            value={formData.default_driver_id || ''}
                            onChange={e => setFormData(prev => ({ ...prev, default_driver_id: e.target.value }))}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors font-bold text-gray-700 bg-gray-50"
                        >
                            <option value="">👤 --- Sin conductor asignado ---</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border-2 border-blue-100">
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Equipamiento Especial</label>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.has_crane || false}
                                onChange={e => setFormData(prev => ({ ...prev, has_crane: e.target.checked }))}
                                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                id="hasCrane"
                            />
                            <label htmlFor="hasCrane" className="text-sm font-bold text-blue-800 cursor-pointer">🏗️ Grúa Autocargante</label>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.has_jib || false}
                                onChange={e => setFormData(prev => ({ ...prev, has_jib: e.target.checked }))}
                                className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                id="hasJib"
                            />
                            <label htmlFor="hasJib" className="text-sm font-bold text-purple-800 cursor-pointer">⚓ Extensión JIB</label>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_box_body || false}
                                onChange={e => setFormData(prev => ({ ...prev, is_box_body: e.target.checked }))}
                                className="h-5 w-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                                id="isBoxBody"
                            />
                            <label htmlFor="isBoxBody" className="text-sm font-bold text-green-800 cursor-pointer">📦 Caja Cerrada / Paquetería</label>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-xl shadow-blue-200 transition-all active:scale-95"
                        >
                            {isEditing ? 'Actualizar Vehículo' : 'Registrar Vehículo'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};
