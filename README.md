# E-Agri Commerce Platform

A frontend-only e-commerce platform connecting Indian farmers directly with consumers for fresh agricultural produce.

## Project Structure

```
d:\Project\
├── index.html          # Entry point (redirects to home)
├── page/
│   ├── home_landing.html      # Home page with hero, features, products
│   ├── product_catalog.html   # Browse all products
│   ├── product_details.html   # Product detail (supports ?id=)
│   ├── shopping_cart.html     # Cart with add/remove/quantity
│   ├── farmer_dashboard.html  # Add products, farmer profile
│   ├── consumer_dashboard.html# Consumer orders & profile
│   ├── login.html             # Login (farmer/consumer)
│   └── register.html          # Register (farmer/consumer)
├── css/
│   └── main.css        # Styles (Tailwind + custom)
├── js/
│   └── app.js          # Central app layer (cart, products, user)
└── public/
    └── dhws-data-injector.js  # Placeholder
```

## How to Run

### Frontend Only (static development)

1. Open `index.html` in a browser, or
2. Serve the project with a local server:
   ```bash
   npx serve .
   ```
   Then open `http://localhost:3000`

### Backend (API + database)

1. Install dependencies in the project root:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root (see template below) or set environment variables:
   ```text
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/eagri_platform
   JWT_SECRET=your_jwt_secret
   ```
3. Make sure a MongoDB instance is running locally (or use a cloud URI) matching `MONGO_URI`.
4. Start the server from the root:
   ```bash
   npm run server
   ```
   The backend will listen on `http://localhost:5000` by default. This same address also serves the frontend application, since the Express server has been configured to serve files from `frontend/`.

   You can hit the auth endpoints (`/api/auth/register`, `/api/auth/login`) or add additional routes. Open `http://localhost:5000` in a browser to interact with the UI.

   A helper script `backend/test_db.js` can be run to verify the database connection:
   ```bash
   node backend/test_db.js
   ```

   > **Note:** after reorganizing the repo the server binary lives in `backend/server.js`.


## Features

- **Shared state**: Cart, products, and user persist via `localStorage`
- **Product catalog**: Sample products + farmer-added products
- **Shopping cart**: Add/remove, change quantity, totals update
- **Farmer dashboard**: Add products with image URL; they appear in the catalog
- **Login/Register**: Stores user and redirects to farmer/consumer dashboard

## Data Layer (`js/app.js`)

- `EAgri.getCart()` / `addToCart()` / `removeFromCart()` / `updateCartItemQty()`
- `EAgri.getProducts()` - sample + farmer products
- `EAgri.addFarmerProduct()` / `getFarmerProducts()` / `removeFarmerProduct()`
- `EAgri.getUser()` / `setUser()`
- `EAgri.initCartBadges()` / `initMobileMenu()` - run on each page

## Development

- `npm run build:css` - Rebuild Tailwind CSS
- `npm run watch:css` - Watch and rebuild CSS
- `npm run dev` - Watch CSS
