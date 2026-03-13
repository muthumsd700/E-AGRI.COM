/**
 * E-Agri Commerce - Backend Configuration
 * Shared configuration constants
 */

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_for_eagri_platform';

module.exports = {
    JWT_SECRET
};
