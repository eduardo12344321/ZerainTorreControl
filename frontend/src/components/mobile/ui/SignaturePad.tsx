import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Scale for high DPI
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.strokeStyle = '#0f172a'; // slate-900
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL('image/png'));
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onClear();
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative bg-slate-50 rounded-3xl border-2 border-slate-100 overflow-hidden touch-none h-48">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full cursor-crosshair"
                />
                {!isDrawing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <span className="text-sm font-black uppercase tracking-widest text-slate-400">Firma aquí</span>
                    </div>
                )}
            </div>
            <button
                type="button"
                onClick={clear}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
            >
                Borrar Firma
            </button>
        </div>
    );
};
