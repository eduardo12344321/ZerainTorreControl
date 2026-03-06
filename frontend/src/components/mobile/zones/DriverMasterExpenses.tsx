import React, { useState } from 'react';

const Card = ({ children, title }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_5px_rgba(0,0,0,0.05)] mb-4">
        {title && <h3 className="text-[#004481] text-xs font-extrabold uppercase border-b-2 border-gray-100 pb-3 mb-6 tracking-wide">{title}</h3>}
        {children}
    </div>
);

const OptionBtn = ({ icon, label, val, active, onClick }: any) => (
    <div
        onClick={() => onClick(val)}
        className={`cursor-pointer border rounded-xl p-4 text-center transition-all min-h-[90px] flex flex-col items-center justify-center active:scale-95 ${active ? 'bg-[#004481] border-[#004481] text-white shadow-xl translate-y-[-2px]' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
    >
        <i className={`fas ${icon} text-3xl mb-3 ${active ? 'text-white' : 'text-gray-300'}`}></i>
        <span className="text-[10px] font-bold uppercase leading-tight tracking-wider">{label}</span>
    </div>
);

export const DriverMasterExpenses: React.FC = () => {
    const [expenseType, setExpenseType] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 pt-4">

            <Card title="Subir Nuevo Gasto">

                {/* CAMERA BOX */}
                <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl p-8 text-center relative mb-8 group active:bg-gray-100 transition-colors cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 z-10 cursor-pointer" onChange={() => alert("✅ Foto subida correctamente")} />
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-2xl text-gray-300 group-hover:text-blue-500 transition-colors border border-gray-100">
                        <i className="fas fa-camera"></i>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Toca para abrir cámara</span>
                    <span className="text-[10px] text-gray-300 mt-1 block">La IA leerá el importe automáticamente</span>
                </div>

                {/* TYPE SELECTOR */}
                <label className="block font-bold text-xs mb-3 text-gray-400 uppercase tracking-wide px-1">Tipo de Gasto</label>
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <OptionBtn icon="fa-utensils" label="Dieta" val="DIET" active={expenseType === 'DIET'} onClick={setExpenseType} />
                    <OptionBtn icon="fa-road" label="Peaje" val="TOLL" active={expenseType === 'TOLL'} onClick={setExpenseType} />
                    <OptionBtn icon="fa-gas-pump" label="Gasoil" val="FUEL" active={expenseType === 'FUEL'} onClick={setExpenseType} />
                    <OptionBtn icon="fa-tools" label="Material" val="MATERIAL" active={expenseType === 'MATERIAL'} onClick={setExpenseType} />
                </div>

                {/* AMOUNT INPUT */}
                <label className="block font-bold text-xs mb-3 text-gray-400 uppercase tracking-wide px-1">Importe Total (€)</label>
                <div className="relative mb-8">
                    <input
                        type="number"
                        placeholder="0.00"
                        className="w-full text-center text-4xl font-black text-slate-800 bg-transparent border-b-2 border-gray-100 pb-2 focus:border-blue-500 outline-none transition-colors placeholder:text-gray-200"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <i className="fas fa-euro-sign absolute top-2 right-4 text-gray-200 text-xl"></i>
                </div>

                <button className="w-full bg-[#004481] hover:bg-[#003366] text-white font-black py-5 rounded-2xl text-sm shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    <i className="fas fa-check"></i> GUARDAR TICKET
                </button>

            </Card>

            {/* HISTORY PREVIEW (Visual filler) */}
            <div className="px-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 pl-2">Últimos Gastos</h3>
                <div className="space-y-3 opacity-60 grayscale hover:grayscale-0 transition-all">
                    <div className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500"><i className="fas fa-utensils"></i></div>
                            <div>
                                <div className="text-xs font-bold text-gray-700">Restaurante El Paso</div>
                                <div className="text-[10px] text-gray-400">Hace 2 horas</div>
                            </div>
                        </div>
                        <div className="font-black text-gray-800">14.50€</div>
                    </div>
                </div>
            </div>

        </div>
    );
};
