import React, { useState, useEffect } from 'react';
import {
    Wand2,
    Save,
    Info,
    CheckCircle2,
    AlertCircle,
    BrainCircuit,
    Eye,
    Settings2
} from 'lucide-react';

interface AIPrompt {
    id: string;
    name: string;
    prompt: string;
    description: string;
    updated_at: string;
}

const AIPromptsPage: React.FC = () => {
    const [prompts, setPrompts] = useState<AIPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/v1/ai/prompts`;
            console.log('🔍 Fetching prompts from:', apiUrl);
            console.log('🔑 Token:', token ? 'Present' : 'Missing');

            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 Response status:', res.status, res.statusText);

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Prompts received:', data.length, data);
                setPrompts(data);
                if (data.length > 0 && !selectedPrompt) {
                    setSelectedPrompt(data[0]);
                    setEditContent(data[0].prompt);
                }
            } else {
                const errorText = await res.text();
                console.error('❌ API Error:', res.status, errorText);
            }
        } catch (err) {
            console.error("❌ Error fetching prompts:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (p: AIPrompt) => {
        setSelectedPrompt(p);
        setEditContent(p.prompt);
        setMessage(null);
    };

    const handleSave = async () => {
        if (!selectedPrompt) return;

        try {
            setIsSaving(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ai/prompts/${selectedPrompt.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: editContent,
                    name: selectedPrompt.name,
                    description: selectedPrompt.description
                })
            });

            if (res.ok) {
                setMessage({ text: 'Prompt guardado correctamente', type: 'success' });
                // Update local state
                setPrompts(prev => prev.map(p => p.id === selectedPrompt.id ? { ...p, prompt: editContent } : p));
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ text: 'Error al guardar el prompt', type: 'error' });
            }
        } catch {
            setMessage({ text: 'Error de conexión', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col gap-6 bg-[#0f172a] text-white overflow-hidden">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BrainCircuit className="text-blue-400 w-8 h-8" />
                        Configuración de Agentes IA
                    </h1>
                    <p className="text-slate-400 mt-1">Personaliza las instrucciones y el comportamiento de la inteligencia artificial de Zerain.</p>
                </div>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
                {/* Sidebar - Prompt List */}
                <div className="w-1/3 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center gap-2 font-semibold">
                        <Settings2 className="w-4 h-4 text-blue-400" />
                        Prompts Disponibles
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {prompts.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleSelect(p)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${selectedPrompt?.id === p.id
                                    ? 'bg-blue-600/20 border border-blue-500/50 shadow-lg shadow-blue-900/10'
                                    : 'hover:bg-slate-800 border border-transparent'
                                    }`}
                            >
                                <div className="font-bold flex items-center justify-between">
                                    <span className={selectedPrompt?.id === p.id ? 'text-blue-200' : 'text-slate-200'}>{p.name}</span>
                                    <Wand2 className={`w-4 h-4 ${selectedPrompt?.id === p.id ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                </div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
                    {selectedPrompt ? (
                        <>
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600/20 rounded-lg">
                                        <Eye className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg">{selectedPrompt.name}</h2>
                                        <span className="text-xs text-slate-500 italic">ID: {selectedPrompt.id}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {message && (
                                        <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                            }`}>
                                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                            {message.text}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all"
                                    >
                                        <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-500/5 border-b border-slate-800 flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-400 italic">
                                    {selectedPrompt.description}
                                    <span className="block mt-1 text-slate-500">Nota: Los cambios afectarán inmediatamente a todas las peticiones futuras a este agente.</span>
                                </p>
                            </div>

                            <div className="flex-1 relative p-4 bg-[#0a0f1d]">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full h-full bg-transparent text-slate-300 font-mono text-sm leading-relaxed outline-none resize-none p-4 focus:ring-1 ring-blue-500/30 rounded-lg transition-all"
                                    placeholder="Escribe el prompt aquí..."
                                    spellCheck={false}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-4 h-full">
                            <BrainCircuit className="w-16 h-16 opacity-10" />
                            <p>Selecciona un agente de la lista para ver y editar su comportamiento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIPromptsPage;
