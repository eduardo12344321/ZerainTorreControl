import { useState, useRef, useCallback } from 'react';

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            chunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.current.push(e.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setAudioBlob(null);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    return {
        isRecording,
        audioBlob,
        startRecording,
        stopRecording
    };
};
