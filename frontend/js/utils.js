/**
 * E-Agri Commerce - Frontend Utilities
 * Shared utility functions for API calls and common operations
 */

// API Base URL detection - same logic as app.js
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:5000' : '';

/**
 * Get the API base URL for backend requests
 * @returns {string} The API base URL
 */
function getApiBase() {
    return API_BASE;
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/products')
 * @param {Object} options - Fetch options (method, headers, body)
 * @returns {Promise<Response>} Fetch response
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'x-auth-token': token })
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    return fetch(url, finalOptions);
}

/**
 * Get authentication token from localStorage
 * @returns {string} JWT token or empty string
 */
function getAuthToken() {
    try {
        const raw = localStorage.getItem('eagriUser');
        if (!raw) return '';
        const user = JSON.parse(raw);
        return (user && user.token) ? user.token : '';
    } catch (_) {
        return '';
    }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showToast(message, type = 'info') {
    try {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.bottom = '1.5rem';
            container.style.right = '1.5rem';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '0.5rem';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.textContent = message;
        el.style.pointerEvents = 'auto';
        el.style.padding = '0.75rem 1rem';
        el.style.borderRadius = '0.5rem';
        el.style.color = '#ffffff';
        el.style.fontSize = '0.875rem';
        el.style.fontWeight = '500';
        el.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3)';
        el.style.transition = 'opacity 0.2s, transform 0.2s';
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';

        const kind = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
        if (kind === 'success') el.style.background = '#059669';
        else if (kind === 'error') el.style.background = '#dc2626';
        else el.style.background = '#2563eb';

        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(0.75rem)';
            setTimeout(() => {
                el.remove();
            }, 220);
        }, 2600);
    } catch (_) {
        // Fallback
        if (type === 'error') {
            alert(message);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getApiBase, apiRequest, getAuthToken, showToast };
} else {
    // Browser global
    window.EAgriUtils = { getApiBase, apiRequest, getAuthToken, showToast };
}
