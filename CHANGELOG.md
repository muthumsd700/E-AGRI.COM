# Changelog

All notable changes to E-Agri Commerce Platform are documented here.

---

## [Unreleased]

### Changed
- Restructured project for production readiness
- Fixed critical backend bugs in `orders.js` (wrong schema field names: `stock`→`quantity`, `farmer`→`farmerId`)
- Fixed `recommendations.js` — all 5 wrong field references corrected (feature was entirely non-functional)
- Fixed `orders.js` status update — admin role check now queries DB (JWT doesn't carry role)
- Fixed `payment.js` — lazy Razorpay initialization prevents server crash when keys aren't configured
- Fixed `utils.js` `getAuthToken()` to check both `localStorage` and `sessionStorage`
- Fixed `test_db.js` — broken `require` path corrected
- Updated `package.json` `main` entry to `backend/server.js`
- Rewrote `README.md` with accurate structure, API reference table, and setup guide
- Expanded `.gitignore` to cover logs, OS files, IDE files, and temp files
- Added `.env.example` to document required environment variables
- Added `backend/utils/helpers.js` for shared utility functions
- Deleted 8 debug/junk files from root and backend directory
- Removed empty `frontend/public/` placeholder directory
- Updated `frontend/manifest.json` with correct app name and brand colours
