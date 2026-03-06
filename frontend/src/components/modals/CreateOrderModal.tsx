import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import { Avatar } from '../ui/Avatar';
import { LocationAutocomplete } from '../ui/LocationAutocomplete';
import { CustomerAutocomplete } from '../ui/CustomerAutocomplete';
import { RouteMap } from '../ui/RouteMap';
import type { Customer, Truck, Order } from '../../types';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (orderData: any) => void;
    initialClientName?: string;
    initialOrder?: Order | null;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onConfirm, initialClientName, initialOrder }) => {
    const { trucks, drivers, customers, orders } = useGlobalContext();
    const [clientName, setClientName] = useState('');
    const [description, setDescription] = useState('');
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [weight, setWeight] = useState<number | undefined>(initialOrder?.load_weight);
    const [length, setLength] = useState<number | undefined>(initialOrder?.load_length);
    const [prepDuration, setPrepDuration] = useState<number>(initialOrder?.prep_duration_minutes || 0);
    const [drivingDuration, setDrivingDuration] = useState<number>(initialOrder?.driving_duration_minutes || 0);
    const [workDuration, setWorkDuration] = useState<number>(initialOrder?.work_duration_minutes || 60);
    const [requiresCrane, setRequiresCrane] = useState<boolean>(false);
    const [requiresJib, setRequiresJib] = useState<boolean>(initialOrder?.requires_jib || false);
    const [requiresBoxBody, setRequiresBoxBody] = useState<boolean>(initialOrder?.requires_box_body || false);
    const [selectedTruckId, setSelectedTruckId] = useState<string>('');
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [distanceKm, setDistanceKm] = useState<number | undefined>(initialOrder?.driving_distance_km || initialOrder?.km);
    const [kmToOrigin, setKmToOrigin] = useState<number | undefined>(initialOrder?.prep_distance_km || initialOrder?.km_to_origin);

    const DEFAULT_BASE_ADDRESS = 'Jundiz, Vitoria-Gasteiz';
    const [previousLocation, setPreviousLocation] = useState<string>(initialOrder?.previous_location || DEFAULT_BASE_ADDRESS);
    const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);

    // ... items state and others ...

    // New Date/Time states
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialOrder) {
                // Edit Mode
                setClientName(initialOrder.client_name || '');
                // Clean description if it contains ACCESORIOS:
                const rawDesc = initialOrder.description || '';
                const cleanedDesc = rawDesc.split('ACCESORIOS:')[0].trim();
                setDescription(cleanedDesc);
                setOrigin(initialOrder.origin_address || '');
                setDestination(initialOrder.destination_address || '');
                setPrepDuration(initialOrder.prep_duration_minutes || 0);
                setDrivingDuration(initialOrder.driving_duration_minutes || 0);
                setWorkDuration(initialOrder.work_duration_minutes || 60);
                setWeight(initialOrder.load_weight || undefined);
                setLength(initialOrder.load_length || undefined);
                setDistanceKm(initialOrder.km || 0);
                setKmToOrigin(initialOrder.km_to_origin || 0);
                setPreviousLocation(initialOrder.previous_location || DEFAULT_BASE_ADDRESS);
                setRequiresCrane(!!initialOrder.requires_crane);
                setRequiresJib(!!initialOrder.requires_jib);
                setRequiresBoxBody(!!initialOrder.requires_box_body);
                setSelectedTruckId(initialOrder.truck_id || '');
                setSelectedDriverId(initialOrder.driver_id || '');
                setSelectedAccessories(initialOrder.accessories || []);

                // Parse scheduled_start
                if (initialOrder.scheduled_start) {
                    const dateObj = new Date(initialOrder.scheduled_start);
                    if (!isNaN(dateObj.getTime())) {
                        setScheduledDate(dateObj.toISOString().split('T')[0]); // YYYY-MM-DD
                        setScheduledTime(dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
                    }
                } else {
                    setScheduledDate('');
                    setScheduledTime('');
                }
            } else {
                // Create Mode
                setClientName(initialClientName || '');
                setDescription('');
                setOrigin('');
                setDestination('');
                setWeight(undefined);
                setLength(undefined);
                setPrepDuration(0);
                setDrivingDuration(0);
                setWorkDuration(60);
                setRequiresCrane(false);
                setRequiresJib(false);
                setRequiresBoxBody(false);
                setSelectedTruckId('');
                setSelectedDriverId('');
                setSelectedAccessories([]);
                setDistanceKm(0);
                setKmToOrigin(0);
                setPreviousLocation(DEFAULT_BASE_ADDRESS);
                setScheduledDate('');
                setScheduledTime('');
            }
        }
    }, [isOpen, initialOrder, initialClientName]);
    const [showRouteMap] = useState(true); // Control route line visibility
    const { apiFetch } = useGlobalContext();

    // Voice & AI States
    const { isRecording, audioBlob, startRecording, stopRecording } = useVoiceRecorder();
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFreeSelection, setIsFreeSelection] = useState(() => {
        return localStorage.getItem('zerain_free_mode') === 'true';
    });

    // Persist free mode
    useEffect(() => {
        localStorage.setItem('zerain_free_mode', String(isFreeSelection));
    }, [isFreeSelection]);
    const [showOverloadWarning, setShowOverloadWarning] = useState(false);

    // Find the selected customer to get their locations
    const selectedCustomer = (customers || []).find(c => c && c.name === clientName);

    // Get habitual locations from profile
    const habitualLocations = selectedCustomer?.locations || [];

    // Get historical locations for this client from past orders
    const historyLocations = (orders || [])
        .filter(o => o && (o.client_name === clientName || (selectedCustomer && o.client_id === selectedCustomer.id)))
        .reduce((acc: string[], o) => {
            if (o.origin_address && !acc.includes(o.origin_address)) acc.push(o.origin_address);
            if (o.destination_address && !acc.includes(o.destination_address)) acc.push(o.destination_address);
            return acc;
        }, []);

    // Unified filters removed for direct state

    const accessoriesOptions = [
        { id: 'cemento', label: 'Cemento 🧱', icon: '📦' },
        { id: 'cristales', label: 'Cristales 🪟', icon: '💎' },
        { id: 'soporte', label: 'Soporte incl. 📐', icon: '📐' },
        { id: 'palet', label: 'Palet 🪵', icon: '🪵' },
    ];

    const toggleAccessory = (id: string) => {
        setSelectedAccessories(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    // Helper compatibility check
    const isTruckCompatible = (truck: Truck) => {
        const truckMaxWeightKg = (truck.max_weight || 0) * 1000;
        const truckMaxLengthM = truck.max_length || 0;

        if (truckMaxWeightKg > 0 && (weight || 0) > truckMaxWeightKg) return false;
        if (truckMaxLengthM > 0 && (length || 0) > truckMaxLengthM) return false;
        return true;
    };

    // Filter trucks based on compatibility AND user filters
    const filteredTrucks = (trucks || []).filter(truck => {
        // In Free Selection mode, we show all trucks but highlight issues
        if (isFreeSelection) return true;

        // Base compatibility
        if (!isTruckCompatible(truck)) return false;

        // User filters
        if (requiresBoxBody && !truck.is_box_body) return false;
        if (requiresJib && !truck.has_jib) return false;
        if (requiresCrane && !truck.has_crane) return false;

        return true;
    }).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    // Automatic route calculation (Advanced: Prep C + Driving A)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (origin && destination && origin.length > 2 && destination.length > 2) {
                setIsCalculatingRoute(true);
                try {
                    // Call the new advanced endpoint
                    // Pass scheduledDate so backend can find the previous order on that day
                    const dateParam = scheduledDate ? `&date=${scheduledDate}` : '';
                    const startLocParam = previousLocation ? `&start_location=${encodeURIComponent(previousLocation)}` : '';
                    const url = `/maps/calculate-order-times?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${selectedTruckId ? `&truck_id=${selectedTruckId}` : ''}${dateParam}${startLocParam}`;

                    const res = await apiFetch(url);

                    if (res.ok) {
                        const data = await res.json();
                        setDrivingDuration(data.driving_mins);
                        setPrepDuration(data.prep_mins);
                        setDistanceKm(data.distance_km);
                        setKmToOrigin(data.km_to_origin);
                    } else {
                        const errData = await res.json();
                        console.error("Maps Error:", errData.detail);
                    }
                } catch (err) {
                    console.error("Error calculating route", err);
                } finally {
                    setIsCalculatingRoute(false);
                }
            } else {
                setIsCalculatingRoute(false);
            }
        }, 600); // Reduced to 600ms for faster feedback

        return () => clearTimeout(timer);
    }, [origin, destination, previousLocation, selectedTruckId, scheduledDate, apiFetch]);

    // Auto-process once recording is finished
    useEffect(() => {
        if (audioBlob) {
            processAudio(audioBlob);
        }
    }, [audioBlob]);

    if (!isOpen) return null;

    const handleVoiceToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const processAudio = async (blob: Blob) => {
        setIsAiProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', blob, 'order_voice.webm');

            const res = await apiFetch('/ai/voice/parse-order', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const filledFields = [];

                const canonicalizeAddress = async (addr: string) => {
                    if (!addr || addr.length < 5) return addr;
                    try {
                        const cres = await apiFetch(`/maps/geocode?address=${encodeURIComponent(addr)}`);
                        if (cres.ok) {
                            const cdata = await cres.json();
                            return cdata.formatted_address || addr;
                        }
                    } catch (e) { console.error("Geocoding AI address failed", e); }
                    return addr;
                };

                if (data.client_name) {
                    setClientName(data.client_name);
                    filledFields.push('Cliente');
                }
                if (data.origin_address) {
                    const cleanAddr = await canonicalizeAddress(data.origin_address);
                    setOrigin(cleanAddr);
                    filledFields.push('Origen');
                }
                if (data.destination_address) {
                    const cleanAddr = await canonicalizeAddress(data.destination_address);
                    setDestination(cleanAddr);
                    filledFields.push('Destino');
                }
                if (data.load_weight) {
                    setWeight(Number(data.load_weight));
                    filledFields.push('Peso');
                }
                if (data.load_length) {
                    setLength(Number(data.load_length));
                    filledFields.push('Largo');
                }

                // MERGE DESCRIPTION (Avoid overwriting)
                if (data.description) {
                    const cleanNew = data.description.trim();
                    setDescription(prev => {
                        if (!prev) return cleanNew;
                        if (prev.includes(cleanNew)) return prev;
                        return `${prev}. ${cleanNew}`;
                    });
                    filledFields.push('Descripción (Añadida)');
                }

                // HANDLE INTERNAL NOTES
                if (data.internal_notes) {
                    const cleanNote = data.internal_notes.trim();
                    setDescription(prev => {
                        if (!prev) return cleanNote;
                        if (prev.includes(cleanNote)) return prev;
                        return `${prev}\n[Nota IA]: ${cleanNote}`;
                    });
                }

                // HANDLE ACCESSORIES (Merge)
                if (data.accessories && Array.isArray(data.accessories)) {
                    setSelectedAccessories(prev => {
                        const next = [...prev];
                        data.accessories.forEach((accId: string) => {
                            if (!next.includes(accId)) next.push(accId);
                        });
                        return next;
                    });
                    filledFields.push(`Accesorios: ${data.accessories.join(', ')}`);
                }

                if (data.requires_crane !== null && data.requires_crane !== undefined) {
                    setRequiresCrane(!!data.requires_crane);
                    if (data.requires_crane) filledFields.push('Grúa');
                }

                if (data.truck_id) {
                    // We check if it exists in our list to be safe.
                    const truckExists = trucks.some(t => t.id === data.truck_id);
                    if (truckExists) {
                        setSelectedTruckId(data.truck_id);
                        filledFields.push('Camión');
                    }
                }

                if (data.driver_id) {
                    setSelectedDriverId(data.driver_id);
                    filledFields.push('Conductor');
                }

                if (data.accessories && data.accessories.includes('jib')) {
                    setRequiresJib(true);
                    filledFields.push('JIB');
                }

                if (data.schedule_suggestion) {
                    // Try to parse prediction: "2023-10-27" or ISO
                    const suggestedDate = new Date(data.schedule_suggestion);
                    if (!isNaN(suggestedDate.getTime())) {
                        setScheduledDate(suggestedDate.toISOString().split('T')[0]);
                        setScheduledTime(suggestedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
                        filledFields.push('Fecha/Hora');
                    } else {
                        setDescription(prev => `${prev}\n\n[IA: Fecha sugerida: ${data.schedule_suggestion}]`);
                        filledFields.push('Fecha Sugerida (Texto)');
                    }
                }

                // Trigger route calculation manually after AI fill (via useEffect dependency on origin/dest)

                alert(`✨ Pedido vitaminado por IA.\n\nCampos rellenados:\n- ${filledFields.join('\n- ')}`);
            } else {
                alert("Error al procesar el audio con IA.");
            }
        } catch (err) {
            console.error("AI Voice Error:", err);
            alert("No se pudo conectar con el servicio de IA.");
        } finally {
            setIsAiProcessing(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent, skipWarning = false) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            // Final compatibility check before submit
            if (selectedTruckId && !skipWarning) {
                const truck = trucks.find(t => t.id === selectedTruckId);
                if (truck && !isTruckCompatible(truck)) {
                    if (!isFreeSelection) {
                        alert(`⚠️ El camión ${truck.plate} no es compatible con la carga. Por favor, selecciona otro camión.`);
                        setIsSubmitting(false);
                        return;
                    } else {
                        // User is in free mode, show the big red warning first
                        setShowOverloadWarning(true);
                        setIsSubmitting(false);
                        return;
                    }
                }
            }
            // User request: Don't combine accessories in the description/notes field
            // Odoo already stores them in a separate note line, so we keep them clean here.
            const finalDescription = description || 'Sin descripción';

            // Construct scheduled_start
            let finalScheduledStart = initialOrder?.scheduled_start;
            if (scheduledDate) {
                finalScheduledStart = scheduledDate;
                if (scheduledTime) {
                    finalScheduledStart += ` ${scheduledTime}:00`;
                } else {
                    // Default to 08:00 if date is set but time is not (handled by backend or here)
                    // Let's send 08:00 explicitly if backend expects it
                    finalScheduledStart += ` 08:00:00`;
                }
            }

            await onConfirm({
                id: initialOrder?.id,
                odoo_id: initialOrder?.odoo_id,
                client_id: selectedCustomer?.id || initialOrder?.client_id || 'unknown',
                client_name: clientName,
                description: finalDescription || 'Sin descripción',
                origin_address: origin,
                destination_address: destination,
                load_weight: weight,
                load_length: length,
                requires_crane: requiresCrane,
                requires_jib: requiresJib,
                requires_box_body: requiresBoxBody,
                prep_duration_minutes: prepDuration,
                driving_duration_minutes: drivingDuration,
                work_duration_minutes: workDuration,
                truck_id: selectedTruckId || undefined,
                driver_id: selectedDriverId || undefined,
                accessories: selectedAccessories,
                km: distanceKm,
                km_to_origin: kmToOrigin,
                previous_location: previousLocation,
                status: initialOrder ? initialOrder.status : 'DRAFT',
                scheduled_start: finalScheduledStart
            });
            onClose();
        } catch (error) {
            console.error("Submission error", error);
        } finally {
            setIsSubmitting(false);
            setShowOverloadWarning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white text-gray-900 w-full max-w-[95vw] max-h-[98vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="font-black text-lg flex items-center gap-2">
                            <span className="bg-white/20 p-1.5 rounded-lg text-sm">{initialOrder ? '✏️' : '📦'}</span>
                            {initialOrder ? 'ACTUALIZAR PEDIDO' : 'CREAR PEDIDO'}
                        </h2>

                        {/* THE "WITHOUT LIMITS" BUTTON */}
                        <button
                            type="button"
                            onClick={() => setIsFreeSelection(!isFreeSelection)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase transition-all
                                ${isFreeSelection
                                    ? 'bg-red-600 border-white text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                                    : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                                }
                            `}
                        >
                            <span>{isFreeSelection ? '⚠️' : '⚡'}</span>
                            <span>{isFreeSelection ? 'MODO LIBRE ACTIVADO' : 'ACTIVAR MODO LIBRE'}</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2 transition-colors">✕</button>
                </div>

                {isSubmitting && (
                    <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                {initialOrder ? 'Actualizando Pedido...' : 'Creando Pedido...'}
                            </span>
                        </div>
                    </div>
                )}

                {/* OVERLOAD RED WARNING OVERLAY */}
                {showOverloadWarning && (
                    <div className="absolute inset-0 z-[110] bg-red-600/95 flex items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-300">
                        <div className="max-w-md flex flex-col items-center gap-6">
                            <span className="text-8xl">🚨</span>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black uppercase tracking-tighter">AVISO DE EXCESO</h3>
                                <p className="text-lg font-medium opacity-90 leading-tight">
                                    El cargamento supera el peso o largo máximo permitido para este camión.
                                </p>
                            </div>
                            <div className="flex gap-4 w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowOverloadWarning(false)}
                                    className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 rounded-2xl font-black text-sm uppercase transition-all"
                                >
                                    Revisar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSubmit(undefined, true);
                                    }}
                                    className="flex-1 px-6 py-4 bg-white text-red-600 hover:bg-red-50 rounded-2xl font-black text-sm uppercase shadow-xl transition-all active:scale-95"
                                >
                                    Confirmar anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-3 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-200 bg-gray-50/50">
                    <form
                        id="createOrderForm"
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 xl:grid-cols-12 gap-3 h-full"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                                e.preventDefault();
                            }
                        }}
                    >
                        {/* LEFT COLUMN: Inputs + Resources (8/12) */}
                        <div className="xl:col-span-8 space-y-3 flex flex-col h-full overflow-y-auto pr-1">
                            {/* Integrated Spec Block */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-3 space-y-3 border-b border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Cliente y Carga</h3>

                                        {/* Small Voice Trigger */}
                                        <button
                                            type="button"
                                            onClick={handleVoiceToggle}
                                            disabled={isAiProcessing}
                                            className={`
                                                flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[9px] font-black
                                                ${isRecording ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}
                                                ${isAiProcessing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                                            `}
                                        >
                                            <span>{isAiProcessing ? '⏳' : isRecording ? '🛑' : '🎙️'}</span>
                                            <span>{isAiProcessing ? 'IA...' : isRecording ? 'STOP' : 'DICTAR'}</span>
                                        </button>
                                    </div>
                                    {/* Split Client Section into 2 Columns */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* LEFT SUB-COLUMN: Inputs */}
                                        <div className="space-y-3">
                                            <div>
                                                <CustomerAutocomplete
                                                    value={clientName}
                                                    onChange={(val: Customer | { name: string; id: string }) => setClientName(val.name)}
                                                />
                                            </div>

                                            {/* Date and Time Inputs */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1">Fecha Prevista</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-sm font-black outline-none"
                                                        value={scheduledDate}
                                                        onChange={e => setScheduledDate(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1">Hora Inicio</label>
                                                    <input
                                                        type="time"
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-sm font-black outline-none"
                                                        value={scheduledTime}
                                                        onChange={e => setScheduledTime(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1">Peso (Kg)</label>
                                                    <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-sm font-black outline-none" value={weight || ''} onChange={e => setWeight(Number(e.target.value))} placeholder="0" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1">Largo (m)</label>
                                                    <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-sm font-black outline-none" value={length || ''} onChange={e => setLength(Number(e.target.value))} placeholder="0" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT SUB-COLUMN: Service Notes */}
                                        <div className="flex flex-col h-full">
                                            <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase mb-1">
                                                <span>📝</span> Notas del Servicio
                                            </label>
                                            <textarea
                                                className="w-full border border-gray-200 rounded-xl p-3 text-sm flex-grow outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-inner bg-gray-50"
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                placeholder="Añade instrucciones específicas..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 pb-12 space-y-4 bg-gray-50/50 relative z-[20]">
                                    <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Planificación de Ruta</h3>
                                    <LocationAutocomplete
                                        label="Viene de"
                                        value={previousLocation}
                                        onChange={setPreviousLocation}
                                        placeholder="Punto anterior..."
                                        habitualLocations={habitualLocations}
                                        historyLocations={historyLocations}
                                    />
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold px-1">
                                        <span className="bg-gray-200 w-4 h-px inline-block"></span>
                                        <span>RUTA PRINCIPAL</span>
                                        <span className="bg-gray-200 flex-grow h-px inline-block"></span>
                                    </div>
                                    <LocationAutocomplete
                                        label="Origen"
                                        value={origin}
                                        onChange={setOrigin}
                                        placeholder="Carga..."
                                        habitualLocations={habitualLocations}
                                        historyLocations={historyLocations}
                                    />
                                    <LocationAutocomplete
                                        label="Destino"
                                        value={destination}
                                        onChange={setDestination}
                                        placeholder="Descarga..."
                                        habitualLocations={habitualLocations}
                                        historyLocations={historyLocations}
                                    />
                                    {/* Spacer for 2 lines of extra height */}
                                    <div className="h-6"></div>
                                </div>


                            </div>

                            {/* Time Breakdown & Map - MOVED TO LEFT COLUMN */}
                            {/* 2. Resources Block (Trucks & Accessories) */}
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 h-[500px]">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestión de Recursos</h3>
                                </div>

                                {/* Truck Filters - Compact */}
                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${requiresBoxBody ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={requiresBoxBody}
                                                onChange={e => {
                                                    const val = e.target.checked;
                                                    setRequiresBoxBody(val);
                                                    if (val) {
                                                        setRequiresJib(false);
                                                        setRequiresCrane(false);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <span className="text-[10px] font-black uppercase">Caja 📦</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${requiresJib ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={requiresJib}
                                                onChange={e => {
                                                    const val = e.target.checked;
                                                    setRequiresJib(val);
                                                    if (val) {
                                                        setRequiresBoxBody(false);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <span className="text-[10px] font-black uppercase">JIB 🏗️</span>
                                        </label>
                                        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${requiresCrane ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={requiresCrane}
                                                onChange={e => {
                                                    const val = e.target.checked;
                                                    setRequiresCrane(val);
                                                    if (val) {
                                                        setRequiresBoxBody(false);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <span className="text-[10px] font-black uppercase">Grúa 🏗️</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Accessories */}
                                <div className="flex flex-wrap gap-2">
                                    {accessoriesOptions.map(acc => (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => toggleAccessory(acc.id)}
                                            className={`
                                                px-2 py-1 rounded-lg border-2 text-[10px] font-black uppercase transition-all flex items-center gap-1.5
                                                ${selectedAccessories.includes(acc.id)
                                                    ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                                    : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                                                }
                                            `}
                                        >
                                            <span className="text-xs">{acc.icon}</span>
                                            {acc.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-4 flex-1 min-h-0">
                                    {/* Truck Selector */}
                                    <div className="flex-[2] flex flex-col min-h-0 bg-gray-50/50 rounded-lg p-2 border border-gray-100">
                                        <label className="flex items-center justify-between text-sm font-black text-gray-500 uppercase mb-2 px-1">
                                            <span className="flex items-center gap-2"><span>🚛</span> Camiones</span>
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{filteredTrucks.length} compatibles</span>
                                        </label>

                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 content-start">
                                            {filteredTrucks.map(truck => {
                                                return (
                                                    <button
                                                        key={truck.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTruckId(truck.id === selectedTruckId ? '' : truck.id);
                                                        }}
                                                        className={`
                                                        p-1.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group relative min-h-[85px]
                                                        ${selectedTruckId === truck.id
                                                                ? (isTruckCompatible(truck) ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-100' : 'border-red-600 bg-red-50 shadow-md ring-2 ring-red-100')
                                                                : (!isTruckCompatible(truck) ? 'border-red-200 bg-red-50/30' : 'border-transparent bg-white hover:border-gray-200 hover:shadow-sm')
                                                            }
                                                    `}
                                                    >
                                                        {/* Status Badges */}
                                                        <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
                                                            {truck.has_jib && <span className="text-[7px] bg-purple-600 text-white px-1 rounded-sm font-black shadow-sm">JIB</span>}
                                                            {truck.is_box_body && <span className="text-[7px] bg-blue-600 text-white px-1 rounded-sm font-black shadow-sm">BOX</span>}
                                                        </div>

                                                        <div className="w-full flex justify-center pt-1 animate-in zoom-in duration-300">
                                                            {/* PLATE UI */}
                                                            <div className={`w-full max-w-[65px] bg-white border-2 rounded-sm py-1 flex items-center justify-center relative shadow-sm ${!isTruckCompatible(truck) ? 'border-red-600' : 'border-gray-900'}`}>
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${!isTruckCompatible(truck) ? 'bg-red-600' : 'bg-blue-800'}`}></div>
                                                                <span className="text-[10px] font-black text-gray-900 tracking-tight font-mono">
                                                                    {truck.plate || 'S/M'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-center text-center w-full mt-auto">
                                                            <span className="text-[10px] font-black text-gray-700 uppercase leading-none truncate w-full px-1 mb-0.5">{truck.alias || 'Camión'}</span>
                                                            <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-2 rounded-full border border-blue-200">
                                                                {(truck.max_weight || 0) > 500 ? (truck.max_weight || 0) / 1000 : (truck.max_weight || 0)}T
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Driver Selector */}
                                    <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 rounded-lg p-2 border border-gray-100">
                                        <label className="flex items-center justify-between text-sm font-black text-gray-500 uppercase px-2 mb-2">
                                            <span className="flex items-center gap-2"><span>👨‍✈️</span> Conductores</span>
                                        </label>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
                                            {(drivers || []).filter(d => d.is_active).map(driver => (
                                                <button
                                                    key={driver.id}
                                                    type="button"
                                                    onClick={() => setSelectedDriverId(driver.id === selectedDriverId ? '' : driver.id)}
                                                    className={`
                                                        p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 shadow-sm min-h-[75px]
                                                        ${selectedDriverId === driver.id
                                                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100 shadow-md'
                                                            : 'border-transparent bg-white hover:border-gray-200'
                                                        }
                                                    `}
                                                >
                                                    <Avatar fallback={driver.name?.[0] || 'C'} size="sm" />
                                                    <span className="text-[9px] font-bold text-gray-700 text-center leading-tight line-clamp-2">{driver.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* RIGHT COLUMN (Map & Times) - Takes 4/12 columns */}
                        <div className="xl:col-span-4 space-y-3 flex flex-col h-full">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestión de Recursos y Tiempos</h3>
                            </div>

                            {/* TIMES SECTION */}
                            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 space-y-2">
                                <h3 className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1">⏱️ Tiempos (min)</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase block">Prep (Vacío)</label>
                                        <input type="number" className="w-full bg-white border border-orange-200 rounded-lg p-1.5 text-center font-black text-xs outline-none" value={prepDuration || ''} onChange={e => setPrepDuration(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase block">Conducción</label>
                                        <input type="number" className="w-full bg-white border border-orange-200 rounded-lg p-1.5 text-center font-black text-xs outline-none" value={drivingDuration || ''} onChange={e => setDrivingDuration(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase block">Trabajo</label>
                                        <input type="number" className="w-full bg-white border border-orange-200 rounded-lg p-1.5 text-center font-black text-xs outline-none" value={workDuration || ''} onChange={e => setWorkDuration(Number(e.target.value))} />
                                    </div>
                                </div>
                            </div>

                            {/* DISTANCES SECTION */}
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                                <h3 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">📏 Distancias (km)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase block">Llegada (Vacío)</label>
                                        <input type="number" className="w-full bg-white border border-blue-200 rounded-lg p-1.5 text-center font-black text-xs outline-none" value={kmToOrigin || ''} onChange={e => setKmToOrigin(Number(e.target.value))} />
                                        <div className="flex flex-col">
                                            <p className="text-[10px] text-gray-500 font-bold leading-tight">Desde ubicación anterior o base</p>
                                            <p className="text-[10px] text-blue-600 font-black truncate" title={`${initialOrder?.previous_location || 'Base (Jundiz)'} ➝ ${origin}`}>
                                                ({initialOrder?.previous_location || 'Base (Jundiz)'} ➝ {origin || '...'})
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase block">Trayecto (Cargado)</label>
                                        <input type="number" className="w-full bg-white border border-blue-200 rounded-lg p-1.5 text-center font-black text-xs outline-none" value={distanceKm || ''} onChange={e => setDistanceKm(Number(e.target.value))} />
                                        <div className="flex flex-col">
                                            <p className="text-[10px] text-gray-500 font-bold leading-tight">Desde origen a destino</p>
                                            <p className="text-[10px] text-blue-600 font-black truncate" title={`${origin} ➝ ${destination}`}>
                                                ({origin || '...'} ➝ {destination || '...'})
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative flex-grow min-h-[400px]">
                                {isCalculatingRoute && (
                                    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-white/70">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                                <div className="absolute inset-0 h-full w-full">
                                    <RouteMap
                                        origin={origin}
                                        destination={destination}
                                        previousLocation={previousLocation}
                                        showRoute={showRouteMap}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer - Compact */}
                <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-3 py-1 text-gray-500 hover:bg-gray-200 rounded text-[10px] font-bold">Cancelar</button>
                    <button
                        type="submit"
                        form="createOrderForm"
                        disabled={isSubmitting}
                        className={`px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-sm shadow-md transition-all active:scale-95 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'GUARDANDO...' : (initialOrder ? 'ACTUALIZAR' : 'CREAR PEDIDO')}
                    </button>
                </div>
            </div>
        </div>
    );
};
