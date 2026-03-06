import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config';

interface Product {
    id: number;
    name: string;
    list_price: number;
    type: 'consu' | 'service' | 'product';
    default_code: string | false;
    description_sale: string | false;
}

export const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE}/odoo/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("DEBUG: Productos recibidos de Odoo:", data);
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeLabel = (type: Product['type']) => {
        const labels = {
            consu: { label: 'Consumible', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '📦' },
            service: { label: 'Servicio', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '⚡' },
            product: { label: 'Producto', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: '🏭' },
        };
        return labels[type] || { label: type, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '❓' };
    };

    const filteredProducts = products.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const codeMatch = p.default_code && typeof p.default_code === 'string'
            ? p.default_code.toLowerCase().includes(searchTerm.toLowerCase())
            : false;
        return nameMatch || codeMatch;
    });

    return (
        <div className="flex-grow p-6 bg-gray-50 overflow-y-auto scrollbar-hide">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-gray-800 tracking-tight flex items-center gap-4">
                            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">🏷️</span>
                            Catálogo de Productos
                        </h1>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            Consulta los servicios y productos facturables registrados en Odoo
                        </p>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar producto o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-80 px-5 py-3 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all bg-white"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-bold animate-pulse">Cargando catálogo...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
                        <span className="text-6xl mb-6 block opacity-20">🔎</span>
                        <h3 className="text-xl font-bold text-gray-400">No se han encontrado productos</h3>
                        <p className="text-sm text-gray-300 mt-2">Prueba con otros términos de búsqueda</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-hide">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">PVP Base</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredProducts.map(product => {
                                        const typeInfo = getTypeLabel(product.type);
                                        const price = typeof product.list_price === 'number' ? product.list_price : 0;
                                        return (
                                            <tr key={product.id} className="hover:bg-blue-50/40 transition-colors group">
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${typeInfo.color}`}>
                                                        {typeInfo.icon} {typeInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    {product.default_code && typeof product.default_code === 'string' ? (
                                                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">
                                                            {product.default_code}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-300 italic">Sin ref.</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div>
                                                        <div className="text-sm font-black text-gray-800 group-hover:text-blue-600 transition-all leading-tight">
                                                            {product.name || 'Sin nombre'}
                                                        </div>
                                                        {product.description_sale && typeof product.description_sale === 'string' && (
                                                            <div className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-1">
                                                                {product.description_sale}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap text-right text-base">
                                                    <span className="font-black text-gray-900 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 group-hover:bg-white group-hover:border-blue-200 transition-all shadow-sm">
                                                        {price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
