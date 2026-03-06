import React, { useState, useEffect } from 'react';
import type { Customer, CustomerContact } from '../../types';
import { AddressAutocomplete } from '../ui/AddressAutocomplete';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onConfirm: (customer: Customer) => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ isOpen, onClose, customer, onConfirm }) => {
    const [formData, setFormData] = useState<Partial<Customer>>({
        name: '',
        nif: '',
        phone: '',
        email: '',
        billing_address: '',
        postal_code: '',
        city: '',
        province: '',
        country: '',
        payment_method: '',
        locations: [],
        notes: '',
        contacts: []
    });
    const [newLocation, setNewLocation] = useState('');
    const [newContact, setNewContact] = useState<CustomerContact>({ name: '', role: '', phone: '', email: '' });
    const [isAILoading, setIsAILoading] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({ ...customer });
        } else {
            setFormData({
                name: '',
                nif: '',
                phone: '',
                email: '',
                billing_address: '',
                postal_code: '',
                city: '',
                province: '',
                country: '',
                payment_method: '',
                locations: [],
                notes: '',
                contacts: []
            });
        }
    }, [customer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCustomer = {
            id: customer?.id || `c-${Date.now()}`,
            display_id: formData.display_id || 0, // context handles new ID if still 0
            name: formData.name || 'Nuevo Cliente',
            nif: formData.nif,
            phone: formData.phone,
            email: formData.email,
            billing_address: formData.billing_address,
            postal_code: formData.postal_code,
            city: formData.city,
            province: formData.province,
            country: formData.country,
            payment_method: formData.payment_method,
            locations: formData.locations || [],
            notes: formData.notes,
            contacts: formData.contacts || []
        } as Customer;
        onConfirm(finalCustomer);
        onClose();
    };

    const addLocation = (loc?: string) => {
        const valueToAdd = loc || newLocation;
        if (valueToAdd.trim()) {
            setFormData(prev => ({
                ...prev,
                locations: [...(prev.locations || []), valueToAdd.trim()]
            }));
            setNewLocation('');
        }
    };

    const removeLocation = (index: number) => {
        setFormData(prev => ({
            ...prev,
            locations: (prev.locations || []).filter((_, i) => i !== index)
        }));
    };

    const addContact = () => {
        if (newContact.name.trim()) {
            setFormData(prev => ({
                ...prev,
                contacts: [...(prev.contacts || []), newContact]
            }));
            setNewContact({ name: '', role: '', phone: '', email: '' });
        }
    };

    const removeContact = (index: number) => {
        setFormData(prev => ({
            ...prev,
            contacts: (prev.contacts || []).filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-blue-600 p-5 flex justify-between items-center text-white shrink-0">
                    <h2 className="text-xl font-black flex items-center gap-3">
                        <span>{customer ? '✏️' : '✨'}</span>
                        {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">CÓDIGO / ID</label>
                                <input
                                    type="number"
                                    value={formData.display_id || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, display_id: Number(e.target.value) }))}
                                    placeholder="Ej: 1042"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-blue-600"
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                                    <span>Nombre de Empresa / Particular</span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!formData.name || formData.name.length < 3) {
                                                alert("Introduce al menos 3 letras del nombre para investigar.");
                                                return;
                                            }
                                            setIsAILoading(true);
                                            try {
                                                // We use a dedicated endpoint or reuse the expert one
                                                // Since we might not have a customer ID yet (creating), 
                                                // we need an endpoint that takes a NAME and returns INTEL.
                                                // Let's call the expert one if ID exists, or a new 'search-intel' one.
                                                const url = customer?.id
                                                    ? `/api/v1/odoo/customers/${customer.id}/enrich-expert`
                                                    : `/api/v1/odoo/customers/search-intel?name=${encodeURIComponent(formData.name)}`;

                                                // In this environment, we usually have a global apiFetch or similar.
                                                // I'll assume we can use fetch with the right base or pass it down.
                                                // For now, I'll use a fetch call that matches the project patterns.
                                                const res = await fetch(url, {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                                });
                                                const data = await res.json();

                                                if (res.ok) {
                                                    const intel = data.intel || data;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        nif: prev.nif || intel.suggested_nif,
                                                        phone: prev.phone || intel.suggested_phone,
                                                        email: prev.email || intel.suggested_email,
                                                        postal_code: prev.postal_code || intel.suggested_zip,
                                                        city: prev.city || intel.suggested_city,
                                                        province: prev.province || intel.suggested_province,
                                                        country: prev.country || intel.suggested_country,
                                                        notes: (prev.notes || '') + (prev.notes ? '\n\n' : '') +
                                                            `-- [INVESTIGACION IA] --\nActividad: ${intel.activity}\nUso de grúas: ${intel.how_to_help}\nFiabilidad: ${intel.reliability_score}/10`
                                                    }));
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setIsAILoading(false);
                                            }
                                        }}
                                        disabled={isAILoading}
                                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded transition-all flex items-center gap-1 ${isAILoading ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                                    >
                                        <span>{isAILoading ? '⏳' : '✨'}</span>
                                        {isAILoading ? 'Analizando...' : 'Autocompletar con IA'}
                                    </button>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ej: Construcciones Zerain SL"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Teléfono Principal</label>
                                <input
                                    type="text"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="94..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Principal</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="contacto@..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* SYNERGY FIELDS */}
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-blue-500 text-xs font-black uppercase tracking-widest">Datos Facturación (Synergy)</span>
                                <div className="h-px bg-blue-100 flex-grow"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">NIF / CIF</label>
                                    <input
                                        type="text"
                                        value={formData.nif || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, nif: e.target.value }))}
                                        placeholder="B-12345678"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Forma de Pago</label>
                                    <input
                                        type="text"
                                        value={formData.payment_method || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                                        placeholder="Ej: Giro 60 días"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Dirección Fiscal</label>
                                <input
                                    type="text"
                                    value={formData.billing_address || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, billing_address: e.target.value }))}
                                    placeholder="Calle, Número, Piso..."
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm mb-2"
                                />
                                <div className="grid grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        value={formData.postal_code || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                                        placeholder="CP"
                                        className="col-span-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={formData.city || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                        placeholder="Ciudad"
                                        className="col-span-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <input
                                        type="text"
                                        value={formData.province || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, province: e.target.value }))}
                                        placeholder="Provincia"
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={formData.country || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                        placeholder="País"
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ubicaciones Habituales (📍)</label>
                            <div className="flex gap-2 mb-3">
                                <AddressAutocomplete
                                    value={newLocation}
                                    onChange={setNewLocation}
                                    onSelect={(val) => addLocation(val)}
                                    onEnter={() => addLocation()}
                                    placeholder="Buscar dirección (Google-style)..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => addLocation()}
                                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {formData.locations?.map((loc, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-gray-200">
                                        {loc}
                                        <button
                                            type="button"
                                            onClick={() => removeLocation(i)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contactos Adicionales (Jefes de Obra, RRHH...)</label>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={newContact.name}
                                        onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nombre (Ej: Iñigo)"
                                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <input
                                        type="text"
                                        value={newContact.role || ''}
                                        onChange={e => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                                        placeholder="Cargo (Ej: Jefe de Obra)"
                                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <input
                                        type="text"
                                        value={newContact.phone || ''}
                                        onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Teléfono"
                                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <input
                                        type="email"
                                        value={newContact.email || ''}
                                        onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addContact}
                                    className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                                >
                                    + AÑADIR CONTACTO
                                </button>
                            </div>

                            <div className="space-y-2">
                                {formData.contacts?.map((contact, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-sm">{contact.name} <span className="text-gray-400 font-normal text-xs">({contact.role || 'Sin cargo'})</span></span>
                                            <span className="text-xs text-gray-500">{contact.phone} • {contact.email}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeContact(i)}
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                {(!formData.contacts || formData.contacts.length === 0) && (
                                    <div className="text-center text-gray-400 text-xs italic py-2">
                                        No hay contactos adicionales
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notas / Detalles facturación</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Condiciones especiales, horarios de carga..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all text-sm h-24 resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-lg shadow-blue-200 transition-all transform hover:scale-105 active:scale-95"
                        >
                            {customer ? 'Guardar Cambios' : 'Crear Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
