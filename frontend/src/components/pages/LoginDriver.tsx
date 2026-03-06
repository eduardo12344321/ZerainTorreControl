import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config';

export const LoginDriver: React.FC = () => {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState<any[]>([]);

    // In a real app, useGlobalContext would have a login function that updates state
    const [dni, setDni] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const fetchPublicDrivers = async () => {
            try {
                const res = await fetch(`${API_BASE}/auth/drivers-list`);
                if (res.ok) {
                    const data = await res.json();
                    setDrivers(data);
                }
            } catch (e) {
                console.error("Error fetching drivers list", e);
            }
        };
        fetchPublicDrivers();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', dni); // OAuth2 expects username, but we send JSON usually. Let's check backend.
            // Backend expects JSON { dni, password }

            const res = await fetch(`${API_BASE}/auth/driver/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni, password })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('driver_token', data.access_token);
                localStorage.setItem('driver_user', JSON.stringify(data.user_data));
                navigate('/driver-app');
            } else {
                alert("DNI o contraseña incorrectos");
            }
        } catch {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/30 mb-4">
                        🚛
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Zerain Driver</h1>
                    <p className="text-slate-400 text-sm mt-1">Selecciona tu usuario</p>
                </div>

                {/* Driver Grid Selection - Full List, Scrollable */}
                <div className="grid grid-cols-2 gap-3 mb-6 max-h-[40vh] overflow-y-auto pr-1">
                    {drivers.map(d => (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => { setDni(d.dni || ''); setPassword('1234'); }}
                            className={`p-4 rounded-xl border text-center transition-all relative overflow-hidden group ${dni === d.dni ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}
                        >
                            <div className="font-bold text-white text-sm truncate">{d.name}</div>
                            {/* DNI removed from display as requested */}

                            {dni === d.dni && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50 animate-pulse"></div>
                            )}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 block">DNI / NIE</label>
                        <input
                            type="text"
                            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-base font-bold outline-none focus:border-indigo-500 transition-colors uppercase placeholder:normal-case"
                            placeholder="Ej: 12345678A"
                            value={dni}
                            onChange={e => setDni(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 block">Contraseña</label>
                        <input
                            type="password"
                            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-base font-bold outline-none focus:border-indigo-500 transition-colors"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black text-base uppercase tracking-wide shadow-lg shadow-indigo-900/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Fichando...' : 'Iniciar Turno'}
                    </button>
                </form>

                <p className="text-center text-slate-600 text-[10px] mt-6">
                    ¿Problemas para entrar? Llama a oficina.
                </p>
            </div>
        </div>
    );
};
