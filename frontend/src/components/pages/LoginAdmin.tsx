import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config';
import { GoogleLogin } from '@react-oauth/google';

export const LoginAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleData, setGoogleData] = useState<{ token: string; email: string } | null>(null);
    const [isFallbackMode, setIsFallbackMode] = useState(false);
    const [username, setUsername] = useState('admin');

    const handleStandardLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('admin_token', data.access_token);
                localStorage.setItem('admin_user', JSON.stringify(data.user_data));
                navigate('/');
            } else {
                const err = await res.json();
                alert(err.detail || "Error de login");
            }
        } catch {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    // Final Login (Double check)
    const handleDoubleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!googleData) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/admin/double-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_token: googleData.token,
                    password: password
                })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('admin_token', data.access_token);
                localStorage.setItem('admin_user', JSON.stringify(data.user_data));
                navigate('/');
            } else {
                const err = await res.json();
                alert(err.detail || "Contraseña incorrecta");
            }
        } catch {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        try {
            // Validate Google token and check email on backend before showing password field
            const res = await fetch(`${API_BASE}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });

            if (res.ok) {
                const data = await res.json();
                // Instead of logging in, we just "unlock" the password field
                // BUT wait, if we want double auth, we don't store the final token yet.
                // Re-using /auth/google logic to verify email existence.
                setGoogleData({
                    token: credentialResponse.credential,
                    email: data.user_data.username // In our logic username is email
                });
            } else {
                const errData = await res.json();
                alert(`Error Google Login: ${errData.detail || 'No autorizado'}`);
            }
        } catch {
            alert("Error de conexión con Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">
                        🏢
                    </div>
                    <h1 className="text-xl font-black">Torre de Control</h1>
                    <p className="text-slate-400 text-sm">Acceso Administrativo 2FA</p>
                </div>

                {!googleData && !isFallbackMode ? (
                    <div className="space-y-6">
                        <div className="text-center text-sm text-slate-500 mb-2">
                            Paso 1: Identifícate con tu cuenta autorizada de Google
                        </div>
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => alert('Error en autenticación de Google')}
                            />
                        </div>
                        <div className="text-center pt-4">
                            <button
                                onClick={() => setIsFallbackMode(true)}
                                className="text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                                ¿Problemas con Google? Usar contraseña clásica
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={isFallbackMode ? handleStandardLogin : handleDoubleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {isFallbackMode ? (
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Usuario</label>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="admin"
                                />
                            </div>
                        ) : (
                            <div className="bg-green-50 p-3 rounded-xl border border-green-100 mb-4 flex items-center gap-3">
                                <div className="text-xl">✅</div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-green-600">Google OK</div>
                                    <div className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{googleData?.email}</div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Contraseña</label>
                            <input
                                type="password"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setGoogleData(null); setIsFallbackMode(false); }}
                            className="w-full text-slate-400 text-[10px] uppercase font-bold hover:text-slate-600"
                        >
                            {isFallbackMode ? 'Volver a Google' : 'Cambiar cuenta de Google'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
