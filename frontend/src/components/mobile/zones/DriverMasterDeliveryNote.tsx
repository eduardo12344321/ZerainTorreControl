import React, { useState, useEffect } from 'react';
import { SignaturePad } from '../ui/SignaturePad';

// --- DATA CONSTANTS ---
const VEHICLES = [
    { value: '2187 MRK', label: '2187 MRK - Camión 3 Ejes' },
    { value: '9216 FTR', label: '9216 FTR - Camión 2 Ejes 18Tn' },
    { value: '5721 CWD', label: '5721 CWD - Furgoneta' },
    { value: '4055 JMY', label: '4055 JMY - Camión 3 Ejes' },
    { value: '9168 FHJ', label: '9168 FHJ - Grúa Gran T. (26m)' },
    { value: '6314 KGS', label: '6314 KGS - Camión 2 Ejes 18Tn' },
    { value: '8292 LWM', label: '8292 LWM - Camión 2 Ejes 18Tn' },
    { value: '5033 KLT', label: '5033 KLT - Camión Pluma' },
    { value: '9177 FTR', label: '9177 FTR - Camión Grúa' },
];

const CLIENTS = [
    { value: 'LINAMAR', label: 'LINAMAR TOOLING (02391)' },
    { value: 'MICHELIN', label: 'MICHELIN' },
    { value: 'ARATZ', label: 'ARATZ GROUP (02415)' },
    { value: 'NOPIN', label: 'NOPIN ALAVESA' },
    { value: 'ALQUILERES', label: 'ALQUILERES DE ALAVA (01864)' },
    { value: 'UTIMESA', label: 'UTIMESA (00401)' },
    { value: 'HAMAR', label: 'HAMAR (01109)' },
    { value: 'PATURPAT', label: 'PATURPAT (02347)' },
    { value: 'OTRO', label: 'Otro...' },
];

const SERVICE_TYPES = [
    { label: 'Furgoneta', value: 'VAN' },
    { label: 'Camión 2 Ejes', value: 'TRUCK_2AXIS' },
    { label: 'Basculante', value: 'DUMP_TRUCK' },
    { label: 'Plataforma', value: 'PLATFORM' },
    { label: 'Camión 3 Ejes', value: 'TRUCK_3AXIS' },
    { label: 'Camión 4x4', value: 'TRUCK_4X4' },
    { label: 'Tráiler', value: 'TRAILER' },
    { label: 'Camión 2 Ejes-Grúa', value: 'CRANE_2AXIS' },
    { label: 'Camión 3 Ejes-Grúa', value: 'CRANE_3AXIS' },
    { label: 'Camión 4x4-Grúa', value: 'CRANE_4X4' },
    { label: 'Tráiler-Grúa', value: 'CRANE_TRAILER' },
    { label: 'Otro', value: 'OTHER' },
];

const COMPLEMENTS = [
    { label: 'Transpaleta', value: 'PALLET_JACK' },
    { label: 'Cubo Hormigón', value: 'CONCRETE_BUCKET' },
    { label: 'Jib', value: 'JIB' },
    { label: 'Cesta', value: 'BASKET' },
    { label: 'Pinza', value: 'CLAMP' },
    { label: 'Caballete', value: 'EASEL' },
    { label: 'Desplazamiento', value: 'DISPLACEMENT' },
    { label: 'Tte. Especial', value: 'SPECIAL_TRANSPORT' },
    { label: 'Coche Piloto', value: 'PILOT_CAR' },
    { label: 'Peaje', value: 'TOLL' },
    { label: 'Pago Tasas', value: 'TAXES' },
    { label: 'Otro', value: 'OTHER' },
];

const BILLING_CONCEPTS = [
    { value: 'HORAS_CAMION', label: 'Horas Camión' },
    { value: 'HORAS_GRUA', label: 'Horas Grúa' },
    { value: 'KM', label: 'Kilometraje' },
    { value: 'PERMISO', label: 'Permiso Especial' },
    { value: 'DIETA', label: 'Dieta' },
    { value: 'SALIDA', label: 'Salida Base' },
    { value: 'OTRO', label: 'Otro (Escribir)...' },
];


export const DriverMasterDeliveryNote: React.FC = () => {
    // --- STATE ---
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedClient, setSelectedClient] = useState('');

    // Origin/Dest
    const [originName, setOriginName] = useState('');
    const [loadDate, setLoadDate] = useState(new Date().toISOString().split('T')[0]);
    const [destName, setDestName] = useState('');
    const [unloadDate, setUnloadDate] = useState(new Date().toISOString().split('T')[0]);

    // Service & Specs
    const [serviceType, setServiceType] = useState<string | null>(null);
    const [selectedChips, setSelectedChips] = useState<string[]>([]);
    const [heightRange, setHeightRange] = useState<string | null>(null);
    const [weightRange, setWeightRange] = useState<string | null>(null);

    // Times
    const [timeStartBase, setTimeStartBase] = useState('');
    const [timeArriveSite, setTimeArriveSite] = useState('');
    const [timeDepartSite, setTimeDepartSite] = useState('');
    const [timeEndBase, setTimeEndBase] = useState('');
    const [totalHours, setTotalHours] = useState('');

    // Billing Lines
    const [billingLines, setBillingLines] = useState([{ id: 1, concept: 'HORAS_CAMION', manual: '', qty: '', price: '' }]);

    const addBillingRow = () => {
        setBillingLines([...billingLines, { id: Date.now(), concept: 'HORAS_CAMION', manual: '', qty: '', price: '' }]);
    };

    const updateLine = (id: number, field: string, value: string) => {
        setBillingLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    // Auto-calc hours (simple diff for demo)
    useEffect(() => {
        if (timeStartBase && timeEndBase) {
            const start = new Date(`2000-01-01T${timeStartBase}`);
            const end = new Date(`2000-01-01T${timeEndBase}`);
            if (end > start) {
                const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                setTotalHours(diff.toFixed(2));
            }
        }
    }, [timeStartBase, timeEndBase]);

    // --- UI HELPERS ---
    const Label = ({ children }: any) => <label className="block font-bold text-xs mb-2 text-gray-500 uppercase tracking-wide">{children}</label>;

    // Updated OptionBtn for tighter grid
    const OptionBtn = ({ label, val, active, onClick }: any) => (
        <div
            onClick={() => onClick(val)}
            className={`cursor-pointer border rounded-lg p-2 text-center transition-all min-h-[50px] flex items-center justify-center active:scale-95 text-[9px] font-bold uppercase ${active ? 'bg-[#004481] border-[#004481] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
            {label}
        </div>
    );

    const Chip = ({ label, active, onClick }: any) => (
        <div
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border select-none text-center ${active ? 'bg-[#f4b400] text-black border-[#d39e00] shadow-sm' : 'bg-[#e9ecef] text-gray-600 border-transparent hover:bg-gray-200'}`}
        >
            {label}
        </div>
    );

    const RangeBtn = ({ label, active, onClick }: any) => (
        <div
            onClick={onClick}
            className={`inline-block px-3 py-2 border rounded-lg text-[10px] font-bold min-w-[70px] text-center cursor-pointer transition-colors whitespace-nowrap active:scale-95 ${active ? 'bg-[#004481] text-white border-[#004481]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
            {label}
        </div>
    );


    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-28 px-4 pt-4">

            {/* 1. GENERAL & ENTITIES */}
            <div className="bg-white rounded-xl p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-4">
                <h3 className="text-[#004481] text-xs font-extrabold uppercase border-b-2 border-gray-100 pb-2 mb-4 tracking-wide flex items-center gap-2">
                    <span className="text-lg">🚛</span> Datos del Servicio
                </h3>

                <Label>Vehículo</Label>
                <select
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 mb-4 text-xs font-bold text-gray-700 outline-none"
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                >
                    <option value="">-- Selecciona Vehículo --</option>
                    {VEHICLES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>

                <Label>Cliente</Label>
                <select
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 mb-4 text-xs font-bold text-gray-700 outline-none"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                >
                    <option value="">-- Selecciona Cliente --</option>
                    {CLIENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                        <Label>Cargador (Origen)</Label>
                        <input type="text" placeholder="Nombre/Lugar" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold mb-2" value={originName} onChange={e => setOriginName(e.target.value)} />
                        <input type="date" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600" value={loadDate} onChange={e => setLoadDate(e.target.value)} />
                    </div>
                    <div>
                        <Label>Consignatario (Destino)</Label>
                        <input type="text" placeholder="Nombre/Lugar" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold mb-2" value={destName} onChange={e => setDestName(e.target.value)} />
                        <input type="date" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600" value={unloadDate} onChange={e => setUnloadDate(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* 2. TIPO DE SERVICIO & EXTRAS */}
            <div className="bg-white rounded-xl p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-4">
                <h3 className="text-[#004481] text-xs font-extrabold uppercase border-b-2 border-gray-100 pb-2 mb-4 tracking-wide flex items-center gap-2">
                    <span className="text-lg">🏗️</span> Detalle Técnico
                </h3>

                <Label>Tipo de Servicio</Label>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {SERVICE_TYPES.map(t => (
                        <OptionBtn key={t.value} label={t.label} val={t.value} active={serviceType === t.value} onClick={setServiceType} />
                    ))}
                </div>

                <Label>Complementos</Label>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {COMPLEMENTS.map(chip => (
                        <Chip
                            key={chip.value}
                            label={chip.label}
                            active={selectedChips.includes(chip.value)}
                            onClick={() => {
                                if (selectedChips.includes(chip.value)) setSelectedChips(prev => prev.filter(c => c !== chip.value));
                                else setSelectedChips(prev => [...prev, chip.value]);
                            }}
                        />
                    ))}
                </div>

                <Label>Altura (Mts)</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                    {['Hasta 12m', 'Hasta 18m', 'Hasta 21m', 'Hasta 26m', 'Hasta 29m', 'Hasta 32m'].map(h => (
                        <RangeBtn key={h} label={h} active={heightRange === h} onClick={() => setHeightRange(h)} />
                    ))}
                </div>

                <Label>Carga (Tn)</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['< 2 Tn', '< 3.5 Tn', '< 4 Tn', '< 5.5 Tn', '< 8 Tn'].map(w => (
                        <RangeBtn key={w} label={w} active={weightRange === w} onClick={() => setWeightRange(w)} />
                    ))}
                </div>
            </div>

            {/* 3. TIEMPOS */}
            <div className="bg-white rounded-xl p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-4">
                <h3 className="text-[#004481] text-xs font-extrabold uppercase border-b-2 border-gray-100 pb-2 mb-4 tracking-wide flex items-center gap-2">
                    <span className="text-lg">⏱️</span> Tiempos
                </h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
                    <div>
                        <Label>Salida Base</Label>
                        <input type="time" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-mono font-bold text-sm" value={timeStartBase} onChange={e => setTimeStartBase(e.target.value)} />
                    </div>
                    <div>
                        <Label>Llegada Obra</Label>
                        <input type="time" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-mono font-bold text-sm" value={timeArriveSite} onChange={e => setTimeArriveSite(e.target.value)} />
                    </div>
                    <div>
                        <Label>Salida Obra</Label>
                        <input type="time" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-mono font-bold text-sm" value={timeDepartSite} onChange={e => setTimeDepartSite(e.target.value)} />
                    </div>
                    <div>
                        <Label>Llegada Base</Label>
                        <input type="time" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-mono font-bold text-sm" value={timeEndBase} onChange={e => setTimeEndBase(e.target.value)} />
                    </div>
                </div>

                <div className="bg-[#f0f9ff] rounded-lg p-3 border border-blue-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-900 uppercase">Total Horas</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="w-20 text-right font-black text-xl bg-transparent text-blue-900 outline-none"
                            value={totalHours}
                            placeholder="0.00"
                            onChange={e => setTotalHours(e.target.value)}
                        />
                        <span className="text-xs font-bold text-blue-400">h</span>
                    </div>
                </div>
            </div>

            {/* 4. FACTURACIÓN */}
            <div className="bg-white rounded-xl p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-4 border border-[#004481]">
                <h3 className="text-black text-xs font-extrabold border-b border-gray-100 pb-2 mb-1 tracking-tight flex items-center gap-2">
                    <span>💰</span> Desglose Facturación
                </h3>
                <p className="text-[10px] text-gray-400 mb-4 italic">Conceptos imputables al cliente</p>

                <table className="w-full text-xs mb-4 border-separate border-spacing-y-1">
                    <thead>
                        <tr className="text-gray-400">
                            <th className="text-left font-normal pl-2 w-1/2">Concepto</th>
                            <th className="text-center font-normal w-1/4">Cant.</th>
                            <th className="text-center font-normal w-1/4">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {billingLines.map((line) => (
                            <tr key={line.id}>
                                <td className="bg-[#f8f9fa] border-y border-l border-gray-100 rounded-l-lg p-1">
                                    {line.concept === 'OTRO' ? (
                                        <input
                                            type="text"
                                            placeholder="Describe..."
                                            className="w-full bg-white border border-gray-200 p-2 rounded outline-none text-xs"
                                            autoFocus
                                            value={line.manual}
                                            onChange={(e) => updateLine(line.id, 'manual', e.target.value)}
                                        />
                                    ) : (
                                        <select
                                            className="w-full bg-transparent border-none p-2 font-bold text-[#004481] outline-none text-xs appearance-none"
                                            value={line.concept}
                                            onChange={(e) => updateLine(line.id, 'concept', e.target.value)}
                                        >
                                            {BILLING_CONCEPTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    )}
                                </td>
                                <td className="bg-[#f8f9fa] border-y border-gray-100 p-1">
                                    <input
                                        type="number"
                                        placeholder="1"
                                        className="w-full bg-white text-center p-2 rounded border border-gray-200 outline-none font-medium"
                                        value={line.qty}
                                        onChange={(e) => updateLine(line.id, 'qty', e.target.value)}
                                    />
                                </td>
                                <td className="bg-[#f8f9fa] border-y border-r border-gray-100 rounded-r-lg p-1">
                                    <input
                                        type="number"
                                        placeholder="€"
                                        className="w-full bg-white text-center p-2 rounded border border-gray-200 outline-none font-medium"
                                        value={line.price}
                                        onChange={(e) => updateLine(line.id, 'price', e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addBillingRow} className="w-full py-3 bg-[#eef6fc] text-[#004481] font-bold text-xs rounded-lg active:scale-[0.98] transition-colors hover:bg-blue-50">
                    + AÑADIR LÍNEA
                </button>
            </div>

            {/* 5. FIRMA */}
            <div className="bg-white rounded-xl p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-8">
                <h3 className="text-[#004481] text-xs font-extrabold uppercase border-b-2 border-gray-100 pb-2 mb-4 tracking-wide">Conformidad Cliente</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg h-40 mb-2 relative overflow-hidden bg-gray-50/50">
                    <SignaturePad
                        onSave={(data) => console.log('Signed', data)}
                        onClear={() => console.log('Cleared')}
                    />
                </div>
            </div>

            <button
                onClick={() => alert("¡Albarán enviado correctamente!")}
                className="w-full bg-[#004481] text-white font-black py-4 rounded-xl text-sm shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
                <i className="fas fa-paper-plane"></i> FINALIZAR ALBARÁN
            </button>

        </div>
    );
};
