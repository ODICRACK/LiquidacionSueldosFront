import api from '../services/api';

// Descarga el recibo PDF y lo abre en una pestaña nueva.
// Se usa axios para enviar el token de autorización (window.open no puede).
export const abrirReciboPDF = async (liquidacionId) => {
    try {
        const response = await api.get(`/liquidaciones/${liquidacionId}/pdf`, {
            responseType: 'blob'
        });

        const file = new Blob([response.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
    } catch {
        alert('Error al generar el documento PDF.');
    }
};
