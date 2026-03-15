# E-Agri Commerce Platform

A full-stack farm-to-consumer e-commerce platform connecting Indian farmers directly with consumers for fresh agricultural produce.

> **Stack:** Node.js · Express.js · MongoDB · Vanilla JS · Tailwind CSS

---

## 📁 Project Structure

```
e-agri-commerce-platform/
├── backend/                    # Node.js + Express API server
│   ├── config/
│   │   └── constants.js        # Shared config constants (JWT secret)
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── models/                 # Mongoose data models
│   │   ├── User.js             # Farmer & consumer accounts
│   │   ├── Product.js          # Product listings
│   │   ├── Order.js            # Orders placed by consumers
│   │   ├── Review.js           # Product reviews
│   │   └── Payment.js          # Razorpay payment records
│   ├── routes/                 # Express route handlers
│   │   ├── auth.js             # POST /api/auth/register|login
│   │   ├── forgot-password.js  # POST /api/auth/forgot-password|verify-otp|reset-password
│   │   ├── profile.js          # GET|PUT /api/profile/profile|password|wishlist
│   │   ├── products.js         # CRUD /api/products
│   │   ├── orders.js           # CRUD /api/orders
│   │   ├── payment.js          # POST /api/payment/create-order|verify-payment
│   │   ├── consumers.js        # GET|PUT /api/consumers/me
│   │   ├── farmers.js          # GET /api/farmers/:id
│   │   └── recommendations.js  # GET /api/recommendations
│   ├── tests/
│   │   ├── test_api.js         # Quick API smoke test (register endpoint)
│   │   └── test_db.js          # MongoDB connection & user listing
│   └── server.js               # App entry point
│
├── frontend/                   # Static frontend (served by Express)
│   ├── css/
│   │   ├── main.css            # Compiled Tailwind CSS (do not edit directly)
│   │   ├── settings.css        # Additional settings page styles
│   │   └── tailwind.css        # Tailwind source (input for compilation)
│   ├── js/
│   │   ├── app.js              # Central app layer (cart, products, user, API calls)
│   │   ├── auth.js             # Auth state, role-based nav, session management
│   │   ├── utils.js            # Shared utilities (apiRequest, showToast, getAuthToken)
│   │   ├── product_details.js  # Product details page logic
│   │   ├── settings.js         # Settings page logic
│   │   ├── payment.js          # Payment page logic (Razorpay integration)
│   │   └── admin.js            # Admin dashboard logic
│   ├── pages/                  # HTML pages
│   │   ├── home_landing.html       # Home page with hero & featured products
│   │   ├── product_catalog.html    # Browse & filter all products
│   │   ├── product_details.html    # Single product view with reviews
│   │   ├── shopping_cart.html      # Cart management & checkout
│   │   ├── payment.html            # Payment flow (Razorpay)
│   │   ├── farmer_dashboard.html   # Farmer product management & earnings
│   │   ├── consumer_dashboard.html # Consumer orders & profile
│   │   ├── admin_dashboard.html    # Admin panel (user/product management)
│   │   ├── settings.html           # Profile, address, security, preferences
│   │   ├── login.html              # Login (farmer / consumer)
│   │   ├── register.html           # Registration (farmer / consumer)
│   │   └── forgot_password.html    # OTP-based password reset
│   ├── index.html              # Entry point (auto-redirects to home_landing.html)
│   └── manifest.json           # PWA manifest
│
├── .env                        # ⚠️  Local secrets — never commit (gitignored)
├── .env.example                # ✅ Template for required environment variables
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **MongoDB** v6+ running locally (or a cloud URI from [MongoDB Atlas](https://cloud.mongodb.com))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
# Copy the example file and fill in your values
copy .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/eagri_platform
JWT_SECRET=replace_with_a_strong_random_string
```

### 3. Start the server

```bash
npm run dev
# or
node backend/server.js
```

The server starts at **http://localhost:5000** and serves both the API and the frontend.

---

## 🌐 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user (farmer/consumer) |
| POST | `/api/auth/login` | — | Login and receive JWT token |
| POST | `/api/auth/forgot-password` | — | Send OTP for password reset |
| POST | `/api/auth/verify-otp` | — | Verify OTP and get reset token |
| POST | `/api/auth/reset-password` | — | Set a new password |
| GET | `/api/profile/profile` | ✅ | Get authenticated user's profile |
| PUT | `/api/profile/profile` | ✅ | Update profile (name, phone, address) |
| PUT | `/api/profile/password` | ✅ | Change password |
| GET | `/api/products` | — | List all products |
| GET | `/api/products/:id` | — | Get single product with farmer info |
| POST | `/api/products` | ✅ Farmer | Add a new product |
| PUT | `/api/products/:id` | ✅ Farmer | Update own product |
| DELETE | `/api/products/:id` | ✅ Farmer | Delete own product |
| GET | `/api/products/:id/reviews` | — | Get reviews for a product |
| POST | `/api/products/:id/reviews` | ✅ | Submit a review |
| GET | `/api/orders/my` | ✅ | Consumer — get own orders |
| GET | `/api/orders/received` | ✅ Farmer | Farmer — get received orders |
| POST | `/api/orders` | ✅ | Place a new order |
| GET | `/api/recommendations` | ✅ | Personalized product recommendations |
| POST | `/api/payment/create-order` | — | Create Razorpay payment order |
| POST | `/api/payment/verify-payment` | — | Verify Razorpay payment signature |
| GET | `/api/health` | — | Server health check |

> All protected routes require `x-auth-token: <JWT>` in the request header.

---

## ⚙️ npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `node backend/server.js` | Start the backend server |
| `npm start` | `node backend/server.js` | Production start |
| `npm run build:css` | Tailwind compile | Rebuild compiled CSS |
| `npm run watch:css` | Tailwind watch | Auto-rebuild CSS on change |
| `npm run server` | `node backend/server.js` | Alias for dev |

---

## 🔑 Authentication

- JWT tokens are returned on login/register and stored in the browser (`localStorage` or `sessionStorage`).
- All protected API routes expect the token in the `x-auth-token` header.
- Tokens expire after **5 days**.

---

## 🏗️ Key Design Decisions

- **Monorepo** — frontend and backend share a single `package.json` and `node_modules`.
- **Express serves frontend** — `express.static` serves `frontend/` so no separate web server is needed in development.
- **LocalStorage fallback** — All API operations gracefully fall back to `localStorage` if the server is unreachable, ensuring the UI remains functional offline.
- **Farmer isolation** — Products are scoped by `farmerId`; a farmer can only edit/delete their own products.

---

## 🛠️ Development Utilities

```bash
# Test the database connection and list users:
node backend/tests/test_db.js

# Quick API smoke test (register endpoint):
node backend/tests/test_api.js
```

---

## 📄 License

MIT
