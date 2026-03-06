import React, { useState, useEffect } from 'react';
import type { Order, DeliveryNote, DeliveryNoteVehicleType, DeliveryNoteCraneHeight, DeliveryNoteLoadCapacity, DeliveryNoteBillingItem } from '../../types';

interface CreateDeliveryNoteModalProps {
    order?: Order | null;
    onClose: () => void;
    onSave: (note: DeliveryNote) => void;
}

const INITIAL_NOTE: Partial<DeliveryNote> = {
    albaran_number: '', // Auto-generated or manual
    date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_plate: '',
    client_name: '',
    client_code: '',
    client_address: '',
    shipper_name: 'ZERAIN TRANSPORTES', // Default
    shipper_address: 'Arriurdina, 22 - 01015 Vitoria-Gasteiz', // Default
    loading_date: new Date().toISOString().split('T')[0],
    consignee_name: '',
    consignee_address: '',
    unloading_date: new Date().toISOString().split('T')[0],
    service_concept: 'Transporte de mercancías',
    merchandise: '',
    weight_kg: 0,
    length_m: 0,
    vehicle_type: null,
    complements: [],
    crane_height: null,
    load_capacity: null,
    start_time: '08:00',
    arrival_time: '09:00',
    departure_time: '17:00',
    end_time: '18:00',
    total_hours: 0,
    observations: '',
    billing_items: []
};

// Available Options
const VEHICLE_TYPES: { value: DeliveryNoteVehicleType; label: string }[] = [
    { value: 'furgoneta', label: 'Furgoneta' },
    { value: 'camion_2_ejes', label: 'Camión 2 Ejes' },
    { value: 'basculante', label: 'Basculante' },
    { value: 'plataforma', label: 'Plataforma' },
    { value: 'camion_3_ejes', label: 'Camión 3 Ejes' },
    { value: 'camion_4x4', label: 'Camión 4 x 4' },
    { value: 'trailer', label: 'Tráiler' },
    { value: 'camion_2_ejes_grua', label: 'Camión 2 Ejes-Grúa' },
    { value: 'camion_3_ejes_grua', label: 'Camión 3 Ejes-Grúa' },
    { value: 'camion_4x4_grua', label: 'Camión 4 x 4-Grúa' },
    { value: 'trailer_grua', label: 'Tráiler-Grúa' },
];

const COMPLEMENTS = [
    'transpaleta', 'cubo_hormigon', 'jib', 'cesta', 'pinza',
    'caballete', 'desplazamiento', 'transporte_especial',
    'coche_piloto', 'peaje_autopistas', 'pago_tasas'
];

const CRANE_HEIGHTS: DeliveryNoteCraneHeight[] = [
    'hasta_12m', 'hasta_18m', 'hasta_21m', 'hasta_26m', 'hasta_29m', 'hasta_32m'
];

const LOAD_CAPACITIES: DeliveryNoteLoadCapacity[] = [
    'hasta_2tn', 'hasta_3_5tn', 'hasta_4tn', 'hasta_5_5tn', 'hasta_8tn'
];

export const CreateDeliveryNoteModal: React.FC<CreateDeliveryNoteModalProps> = ({ order, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<DeliveryNote>>({ ...INITIAL_NOTE });
    const [newItem, setNewItem] = useState<Partial<DeliveryNoteBillingItem>>({ code: '', quantity: 1, price: 0 });

    // Pre-fill from Order
    useEffect(() => {
        if (order) {
            setFormData(prev => ({
                ...prev,
                order_id: order.id,
                albaran_number: String(Math.floor(Math.random() * 100000)).padStart(6, '0'), // Mock gen
                date: order.scheduled_start.split('T')[0],
                // driver_name: resolved from ID? (Keep empty for now)
                client_name: order.client_name || '',
                // client_code: ...,
                // client_address: ...,
                shipper_address: order.origin_address,
                consignee_address: order.destination_address,
                loading_date: order.scheduled_start.split('T')[0],
                unloading_date: order.scheduled_start.split('T')[0], // Assume same day
                service_concept: order.description,
                merchandise: (order.items || []).join(', '),
                weight_kg: order.load_weight || 0,
                length_m: order.load_length || 0,
                // Map vehicle type if possible

            }));
        }
    }, [order]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const toggleComplement = (comp: string) => {
        setFormData(prev => {
            const current = new Set(prev.complements || []);
            if (current.has(comp)) current.delete(comp);
            else current.add(comp);
            return { ...prev, complements: Array.from(current) };
        });
    };

    const addBillingItem = () => {
        if (!newItem.code || !newItem.quantity || newItem.price === undefined) return;
        const item: DeliveryNoteBillingItem = {
            code: newItem.code,
            quantity: newItem.quantity,
            price: newItem.price,
            amount: newItem.quantity * newItem.price
        };
        setFormData(prev => ({
            ...prev,
            billing_items: [...(prev.billing_items || []), item]
        }));
        setNewItem({ code: '', quantity: 1, price: 0 });
    };

    const removeBillingItem = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            billing_items: (prev.billing_items || []).filter((_, i) => i !== idx)
        }));
    };

    const handleSave = () => {
        // Validation could go here
        onSave(formData as DeliveryNote);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex justify-between items-center">
                    <div className="text-white">
                        <h2 className="text-xl font-black">Nuevo Albarán</h2>
                        <p className="text-xs text-green-100 mt-1">Creación manual o desde Orden #{order?.display_id}</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">✕</button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-12 gap-6">

                        {/* LEFT COLUMN: Data */}
                        <div className="col-span-8 space-y-6">

                            {/* Section 1: General Info */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                                    <span>📝</span> Datos Generales
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Nº Albarán</label>
                                        <input type="text" name="albaran_number" value={formData.albaran_number} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm font-bold bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Fecha</label>
                                        <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Orden Ref.</label>
                                        <input type="text" name="order_id" value={formData.order_id || ''} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50" readOnly />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Conductor</label>
                                        <input type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm" placeholder="Nombre completo" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Matrícula</label>
                                        <input type="text" name="vehicle_plate" value={formData.vehicle_plate} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm uppercase" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Participants */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                                    <span>👥</span> Participantes
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="font-bold text-gray-400 text-xs uppercase">Cliente Payador</div>
                                        <input type="text" name="client_name" value={formData.client_name} onChange={handleChange} placeholder="Nombre Cliente" className="w-full border rounded-lg p-2 text-sm" />
                                        <input type="text" name="client_address" value={formData.client_address} onChange={handleChange} placeholder="Dirección Cliente" className="w-full border rounded-lg p-2 text-sm" />
                                        <input type="text" name="client_code" value={formData.client_code} onChange={handleChange} placeholder="CIF / Código" className="w-full border rounded-lg p-2 text-sm" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="font-bold text-gray-400 text-xs uppercase">Cargador / Origen</div>
                                        <input type="text" name="shipper_name" value={formData.shipper_name} onChange={handleChange} placeholder="Nombre Cargador" className="w-full border rounded-lg p-2 text-sm" />
                                        <input type="text" name="shipper_address" value={formData.shipper_address} onChange={handleChange} placeholder="Dirección Carga" className="w-full border rounded-lg p-2 text-sm" />
                                        <input type="date" name="loading_date" value={formData.loading_date} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm" />
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="font-bold text-gray-400 text-xs uppercase">Consignatario / Destino</div>
                                            <input type="text" name="consignee_name" value={formData.consignee_name} onChange={handleChange} placeholder="Nombre Consignatario" className="w-full border rounded-lg p-2 text-sm" />
                                            <input type="text" name="consignee_address" value={formData.consignee_address} onChange={handleChange} placeholder="Dirección Descarga" className="w-full border rounded-lg p-2 text-sm" />
                                            <input type="date" name="unloading_date" value={formData.unloading_date} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Billing Items */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                                    <span>💰</span> Líneas de Facturación
                                </h3>
                                <div className="space-y-3 mb-4">
                                    {(formData.billing_items || []).map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center text-xs bg-gray-50 p-2 rounded-lg border border-gray-200">
                                            <span className="font-mono font-bold w-20">{item.code}</span>
                                            <span className="flex-grow text-center">{item.quantity} x {item.price}€</span>
                                            <span className="font-bold w-20 text-right">{item.amount.toFixed(2)}€</span>
                                            <button onClick={() => removeBillingItem(idx)} className="text-red-500 hover:text-red-700 px-2">✕</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 bg-blue-50 p-2 rounded-lg items-end">
                                    <div className="flex-grow">
                                        <label className="text-[10px] uppercase font-bold text-blue-800">Código</label>
                                        <input type="text" value={newItem.code} onChange={e => setNewItem({ ...newItem, code: e.target.value })} className="w-full border rounded p-1 text-sm" placeholder="Ej: H-GRUA" />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-[10px] uppercase font-bold text-blue-800">Cant.</label>
                                        <input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })} className="w-full border rounded p-1 text-sm text-center" />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] uppercase font-bold text-blue-800">Precio</label>
                                        <input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} className="w-full border rounded p-1 text-sm text-right" />
                                    </div>
                                    <button onClick={addBillingItem} className="bg-blue-600 text-white p-1 rounded font-bold w-20 text-xs h-8">
                                        + Añadir
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Service Specs */}
                        <div className="col-span-4 space-y-6">

                            {/* Service Content */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">📦 Carga</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Concepto Servicio</label>
                                        <textarea name="service_concept" value={formData.service_concept} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm" rows={2} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Mercancía</label>
                                        <input type="text" name="merchandise" value={formData.merchandise} onChange={handleChange} className="w-full border rounded-lg p-2 text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Peso (Kg)</label>
                                            <input type="number" name="weight_kg" value={formData.weight_kg} onChange={handleNumberChange} className="w-full border rounded-lg p-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Longitud (m)</label>
                                            <input type="number" name="length_m" value={formData.length_m} onChange={handleNumberChange} className="w-full border rounded-lg p-2 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Type */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-64 overflow-y-auto">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">🚛 Vehículo</h3>
                                <div className="space-y-2">
                                    {VEHICLE_TYPES.map(vt => (
                                        <label key={vt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input type="radio" name="vehicle_type" value={vt.value} checked={formData.vehicle_type === vt.value} onChange={handleChange} className="text-green-600" />
                                            <span className="text-xs text-gray-700">{vt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Complements */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">🔧 Extras</h3>
                                <div className="flex flex-wrap gap-2">
                                    {COMPLEMENTS.map(comp => (
                                        <button
                                            key={comp}
                                            onClick={() => toggleComplement(comp)}
                                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${(formData.complements || []).includes(comp)
                                                    ? 'bg-green-100 text-green-700 border-green-300'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}
                                        >
                                            {comp}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Crane Specs */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">📏 Grúa (Altura)</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {CRANE_HEIGHTS.map(h => (
                                        <label key={h} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="radio"
                                                name="crane_height"
                                                value={h}
                                                checked={formData.crane_height === h}
                                                onChange={handleChange}
                                                className="text-orange-600"
                                            />
                                            <span className="text-[10px] text-gray-700 font-bold">{h.replace('hasta_', 'Up ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Load Capacity */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">⚖️ Carga Máx.</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {LOAD_CAPACITIES.map(c => (
                                        <label key={c} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="radio"
                                                name="load_capacity"
                                                value={c}
                                                checked={formData.load_capacity === c}
                                                onChange={handleChange}
                                                className="text-purple-600"
                                            />
                                            <span className="text-[10px] text-gray-700 font-bold">{c.replace('hasta_', 'Max ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all transform hover:scale-105">
                        💾 Guardar Albarán
                    </button>
                </div>
            </div>
        </div>
    );
};
