// Auto-detect API base URL based on current host
// Production Cloud Run URL for Zerain Tower Control
const PROD_API_URL = "/api/v1";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? "http://localhost:8080/api/v1"
    : PROD_API_URL);

console.log("ZERAIN: Usando API en", API_BASE);
