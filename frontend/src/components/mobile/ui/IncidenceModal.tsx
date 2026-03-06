import React, { useState } from 'react';
import { API_BASE } from '../../../config';

interface IncidenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (incidents: string, photoUrl: string) => void;
    clientName: string;
}

export const IncidenceModal: React.FC<IncidenceModalProps> = ({ isOpen, onClose, onConfirm, clientName }) => {
    const [incidents, setIncidents] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [hasPhoto, setHasPhoto] = useState(false);
    const [aiData, setAiData] = useState<any>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_BASE}/ai/ocr/delivery-note`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAiData(data);
                setHasPhoto(true);
                // Si la IA detecta algo importante, lo añadimos a incidencias automáticamente o como nota
                if (data.description) {
                    setIncidents(prev => prev ? `${prev}\n\nNota IA: ${data.description}` : `Nota IA: ${data.description}`);
                }
            } else {
                alert("Error al procesar el albarán con IA.");
            }
        } catch (err) {
            console.error("OCR Error:", err);
            alert("Error de conexión con el servicio de IA.");
        } finally {
            setIsUploading(false);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-extrabold text-slate-800">Finalizar Servicio</h2>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">✕</button>
                </div>

                <div className="mb-6">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-lg font-bold text-slate-700">{clientName}</p>
                </div>

                <div className="space-y-6">
                    {/* Photo Upload Section */}
                    <div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoCapture}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                        />
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 italic">Albarán / Justificante</label>
                        <button
                            onClick={triggerFileSelect}
                            disabled={isUploading}
                            className={`w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${hasPhoto ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                                }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="flex gap-1 mb-2">
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Procesando con IA...</span>
                                </>
                            ) : hasPhoto ? (
                                <>
                                    <span className="text-3xl">✅</span>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Digitalizado con éxito</p>
                                        {aiData && (
                                            <p className="text-[9px] font-bold text-emerald-500 mt-1 uppercase">
                                                ID Albarán: {aiData.delivery_note_number || 'Detectado'} | Peso: {aiData.load_weight || '--'} Kg
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="text-3xl">📷</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Pulsar para escanear albarán</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Incidents Input */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 italic">Incidencias (opcional)</label>
                        <textarea
                            value={incidents}
                            onChange={(e) => setIncidents(e.target.value)}
                            placeholder="Escribe aquí si hubo algún problema, retraso o rotura..."
                            className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-3xl p-4 text-sm focus:border-indigo-500 focus:outline-none transition-all resize-none"
                        />
                    </div>

                    <button
                        onClick={() => onConfirm(incidents, hasPhoto ? 'simulated_url' : '')}
                        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <span>Confirmar Entrega</span>
                        <span className="text-lg">➡️</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
