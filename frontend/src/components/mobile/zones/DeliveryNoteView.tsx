import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SignaturePad } from '../ui/SignaturePad';
import { useSync } from '../../../context/SyncContext';

interface DeliveryNoteViewProps {
    order: any;
    onClose: () => void;
    onConfirm: (data: any) => void;
}

export const DeliveryNoteView: React.FC<DeliveryNoteViewProps> = ({ order, onClose, onConfirm }) => {
    const { isOnline } = useSync();
    const [receiverName, setReceiverName] = useState('');
    const [signature, setSignature] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
    const [extraCharge, setExtraCharge] = useState('');

    const conceptPresets = [
        "Grúa Autocargante 30T",
        "Grúa Autocargante 50T",
        "Transporte Maquinaria",
        "Servicio Nocturno",
        "Km Adicionales",
        "Horas de Espera"
    ];

    const toggleConcept = (concept: string) => {
        setSelectedConcepts(prev =>
            prev.includes(concept) ? prev.filter(c => c !== concept) : [...prev, concept]
        );
    };

    const handleConfirm = () => {
        if (!receiverName) return alert('Por favor, indica quién recibe el material');
        if (!signature) return alert('Se requiere la firma del cliente');

        onConfirm({
            receiver_name: receiverName,
            signature,
            notes,
            concepts: selectedConcepts,
            extra_charge: extraCharge,
            finished_at: new Date().toISOString()
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center font-sans">
            <div className="bg-white rounded-t-[3rem] w-full max-h-[92vh] shadow-2xl relative overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex-shrink-0 bg-white p-6 border-b border-slate-50 relative">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Parte de Trabajo</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orden #{order.display_id} • {order.client_name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-grow min-h-0 overflow-y-auto p-6 space-y-8 pb-32">

                    {/* Receiver Info */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Receptor del Material / Servicio</label>
                        <input
                            type="text"
                            value={receiverName}
                            onChange={(e) => setReceiverName(e.target.value)}
                            placeholder="Nombre y Apellidos..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all placeholder:text-slate-200"
                        />
                    </div>

                    {/* Concept Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Conceptos Aplicados</label>
                        <div className="grid grid-cols-2 gap-3">
                            {conceptPresets.map(concept => (
                                <button
                                    key={concept}
                                    onClick={() => toggleConcept(concept)}
                                    className={`p-4 rounded-3xl border-2 transition-all text-left flex items-start gap-2 ${selectedConcepts.includes(concept)
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20'
                                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${selectedConcepts.includes(concept) ? 'border-lime-400 bg-lime-400' : 'border-slate-200'}`}>
                                        {selectedConcepts.includes(concept) && <span className="text-[8px] text-slate-900 font-bold">✓</span>}
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-tight leading-tight">{concept}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes & Extras Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Cargo Extra (€)</label>
                            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-2 border-2 border-slate-100 focus-within:border-slate-900 transition-all">
                                <input
                                    type="number"
                                    value={extraCharge}
                                    onChange={(e) => setExtraCharge(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-transparent border-none text-xl font-black text-slate-900 w-full p-0 focus:ring-0 placeholder:text-slate-200"
                                />
                                <span className="text-lg font-black text-slate-300">€</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Observaciones</label>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Incidencias, etc..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all placeholder:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma de Conformidad</label>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-lime-500 rounded-full"></span>
                                <span className="text-[9px] font-black uppercase text-slate-400">Verificada</span>
                            </div>
                        </div>
                        <SignaturePad
                            onSave={setSignature}
                            onClear={() => setSignature(null)}
                        />
                    </div>

                    {/* Offline Warning */}
                    {!isOnline && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                            <span className="text-2xl">📡</span>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-amber-900 uppercase">Sin Cobertura</p>
                                <p className="text-[9px] text-amber-700 font-bold leading-tight">El albarán se guardará localmente y se enviará al recuperar la señal.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Button */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50 z-10">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 border-t border-white/10"
                    >
                        Finalizar y Firmar 📋
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
