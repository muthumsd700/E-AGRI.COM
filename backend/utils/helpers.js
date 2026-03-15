/**
 * E-Agri Commerce Platform — Backend Utilities
 * Shared helper functions used across routes.
 */

/**
 * Formats a MongoDB address sub-document into a human-readable string.
 * @param {Object|string} addr - Address object or string
 * @returns {string}
 */
function formatAddress(addr) {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [];
    if (addr.houseStreet) parts.push(addr.houseStreet);
    if (addr.addressLine) parts.push(addr.addressLine);
    if (addr.city)        parts.push(addr.city);
    if (addr.state)       parts.push(addr.state);
    if (addr.pincode)     parts.push(addr.pincode);
    return parts.filter(Boolean).join(', ');
}

/**
 * Sends a standardised JSON error response.
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 */
function sendError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/**
 * Sends a standardised JSON success response.
 * @param {Object} res - Express response object
 * @param {Object} data - Data to send
 * @param {number} [status=200] - HTTP status code
 */
function sendSuccess(res, data, status = 200) {
    return res.status(status).json({ success: true, ...data });
}

/**
 * Safely parses an integer, returning a default value on failure.
 * @param {*} value
 * @param {number} defaultVal
 * @returns {number}
 */
function safeInt(value, defaultVal = 0) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Safely parses a float, returning a default value on failure.
 * @param {*} value
 * @param {number} defaultVal
 * @returns {number}
 */
function safeFloat(value, defaultVal = 0) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultVal : parsed;
}

module.exports = {
    formatAddress,
    sendError,
    sendSuccess,
    safeInt,
    safeFloat
};
