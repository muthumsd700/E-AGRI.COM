/**
 * Product Details Page — Dynamic Logic
 * Handles: loading states, product fetch, farming details, reviews, wishlist, error handling
 */
(function () {
    'use strict';
    const API_BASE = window.EAGRI_API_BASE || 'http://localhost:5000';
    const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='%23e5e7eb'%3E%3Crect width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='20'%3ENo Image%3C/text%3E%3C/svg%3E";

    let currentProduct = null;
    let selectedRating = 0;

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getProductId() {
        return new URLSearchParams(window.location.search).get('id');
    }

    // ── Stars HTML ──
    function starsHTML(rating, size) {
        const sz = size || '1.1rem';
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                html += `<span style="color:#f59e0b;font-size:${sz}">★</span>`;
            } else if (i - rating < 1 && i - rating > 0) {
                html += `<span style="color:#f59e0b;font-size:${sz}">★</span>`;
            } else {
                html += `<span style="color:#d1d5db;font-size:${sz}">★</span>`;
            }
        }
        return html;
    }

    // ── Show/Hide Sections ──
    function showLoading() {
        document.getElementById('loading-skeleton').style.display = '';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('product-content').style.display = 'none';
    }
    function showError() {
        document.getElementById('loading-skeleton').style.display = 'none';
        document.getElementById('error-state').style.display = '';
        document.getElementById('product-content').style.display = 'none';
        document.title = 'Product Not Found - E-Agri Commerce';
        console.error('Product not found or failed to load. Product ID:', getProductId());
    }
    function showContent() {
        document.getElementById('loading-skeleton').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('product-content').style.display = '';
    }

    // ── Check icon SVG ──
    function checkSVG() {
        return '<svg class="w-6 h-6 mt-0.5 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    }

    // ── Populate Product Info ──
    function renderProduct(product) {
        currentProduct = product;
        document.title = esc(product.name) + ' - E-Agri Commerce';

        // Breadcrumb
        const bc = document.getElementById('breadcrumb-category');
        if (bc) bc.textContent = product.category || 'Products';
        const bn = document.getElementById('breadcrumb-name');
        if (bn) bn.textContent = product.name || 'Product';

        // Image
        const img = document.getElementById('main-product-image');
        if (img) {
            img.src = product.image || PLACEHOLDER_IMG;
            img.alt = product.name || 'Product';
            img.setAttribute('loading', 'lazy');
        }

        // Badge
        const badge = document.getElementById('product-badge');
        if (badge) {
            const fd = product.farmingDetails || {};
            badge.style.display = fd.organicCertified ? '' : 'none';
        }

        // Stock
        const stockEl = document.getElementById('stock-status');
        if (stockEl) {
            const stock = parseInt(product.stock) || 0;
            if (stock > 0) {
                stockEl.innerHTML = '<span class="text-success font-semibold">In Stock (' + stock + ' kg available)</span>';
            } else {
                stockEl.innerHTML = '<span class="text-error font-semibold">Out of Stock</span>';
            }
        }

        // Title, Price, Description
        document.getElementById('product-title').textContent = product.name || 'Product';
        document.getElementById('product-price').textContent = '₹' + (product.price || 0);
        document.getElementById('product-description').textContent = product.description || 'No description available.';
        document.getElementById('quantity-available').textContent = 'Available: ' + (product.stock || 0) + ' kg';
        document.getElementById('quantity-input').max = product.stock || 50;

        // Product features
        const featuresEl = document.getElementById('product-features');
        if (featuresEl) {
            const fd = product.farmingDetails || {};
            const features = [
                { title: fd.organicCertified ? '100% Organic' : 'Quality Produce', sub: fd.organicCertified ? 'No pesticides or chemicals' : 'Farm fresh quality' },
                { title: 'Farm Fresh', sub: 'Harvested and shipped fresh' },
                { title: 'Grade A Quality', sub: 'Hand-sorted premium' },
                { title: 'Rich Nutrients', sub: 'High in vitamins & minerals' }
            ];
            featuresEl.innerHTML = features.map(f => `
                <div class="flex items-start gap-3">
                    ${checkSVG()}
                    <div><p class="font-medium text-text-primary">${esc(f.title)}</p><p class="text-sm text-text-tertiary">${esc(f.sub)}</p></div>
                </div>`).join('');
        }

        // Rating summary
        renderRatingSummary(product.reviews || []);

        // Farmer info
        renderFarmerInfo(product);

        // Farming details
        renderFarmingDetails(product);

        // Reviews
        renderReviews(product.reviews || []);

        // Disable add to cart if out of stock
        const addBtn = document.getElementById('add-to-cart-btn');
        if (addBtn && (parseInt(product.stock) || 0) <= 0) {
            addBtn.disabled = true;
            addBtn.textContent = 'Out of Stock';
            addBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // Update total price
        updateTotalPrice();
    }

    function renderRatingSummary(reviews) {
        const container = document.getElementById('stars-display');
        const label = document.getElementById('review-count-label');
        if (!container) return;
        if (!reviews || reviews.length === 0) {
            container.innerHTML = starsHTML(0);
            if (label) label.textContent = 'No reviews yet';
            return;
        }
        const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
        container.innerHTML = starsHTML(avg) + ' <span class="text-lg font-semibold text-text-primary ml-2">' + avg.toFixed(1) + '</span>';
        if (label) label.textContent = reviews.length + ' review' + (reviews.length !== 1 ? 's' : '');
    }

    function renderFarmerInfo(product) {
        let fp = null;
        if (window.EAgri && typeof window.EAgri.getFarmerProfile === 'function') {
            fp = window.EAgri.getFarmerProfile();
        }
        const el = (id) => document.getElementById(id);
        if (el('farmer-name')) el('farmer-name').textContent = (fp && fp.name && fp.name !== 'Farmer') ? fp.name : (product.farmer || 'Farmer');
        if (el('farmer-location')) el('farmer-location').textContent = fp?.location || product.farmerLocation || 'India';
        if (el('farmer-tagline') && fp?.tagline) el('farmer-tagline').textContent = fp.tagline;
        if (el('farmer-experience') && fp?.experience) {
            el('farmer-experience').textContent = fp.experience.toString().replace(/[^0-9+]/g, '') || fp.experience;
        }
        if (el('farmer-farm-size') && fp?.farmSize) {
            el('farmer-farm-size').textContent = fp.farmSize.toString().replace(/[^0-9+.]/g, '') || fp.farmSize;
        }
        if (el('farmer-customers')) el('farmer-customers').textContent = '500+';

        // Farmer photo
        const photoWrap = document.getElementById('farmer-photo');
        if (photoWrap && fp?.image) {
            photoWrap.innerHTML = `<img src="${esc(fp.image)}" alt="Farmer photo" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'">`;
        }
    }

    function renderFarmingDetails(product) {
        const grid = document.getElementById('farming-details-grid');
        if (!grid) return;
        const fd = product.farmingDetails || {};

        const methodItems = [];
        if (fd.organicCertified) methodItems.push('Certified organic farming');
        if (fd.method) methodItems.push(fd.method);
        if (!methodItems.length) methodItems.push('Standard farming methods', 'Natural compost fertilizers where possible', 'Efficient irrigation systems');

        const harvestItems = [];
        if (fd.harvestDate) harvestItems.push({ t: 'Harvest Date', d: fd.harvestDate });
        if (fd.location) harvestItems.push({ t: 'Farm Location', d: fd.location });
        if (!harvestItems.length) {
            harvestItems.push({ t: 'Harvest Timing', d: 'Depends on the specific product and season' });
            harvestItems.push({ t: 'Growing Period', d: 'Typical growing periods shown when available' });
        }

        grid.innerHTML = `
            <div class="card">
                <div class="bg-success/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                </div>
                <h3 class="text-xl font-heading font-semibold text-primary mb-3">Farming Method</h3>
                <ul class="space-y-2 text-text-secondary">
                    ${methodItems.map(m => `<li class="flex items-start gap-2">${checkSVG()}<span>${esc(m)}</span></li>`).join('')}
                </ul>
            </div>
            <div class="card">
                <div class="bg-warning/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-10 h-10 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <h3 class="text-xl font-heading font-semibold text-primary mb-3">Harvest Details</h3>
                <ul class="space-y-3 text-text-secondary">
                    ${harvestItems.map(h => `<li><p class="font-medium text-text-primary">${esc(h.t)}</p><p class="text-sm">${esc(h.d)}</p></li>`).join('')}
                </ul>
            </div>
            <div class="card">
                <div class="bg-info/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-10 h-10 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
                </div>
                <h3 class="text-xl font-heading font-semibold text-primary mb-3">Delivery Timeline</h3>
                <div class="space-y-4">
                    <div class="flex items-start gap-3"><div class="bg-success w-2 h-2 rounded-full mt-2"></div><div><p class="font-medium text-text-primary">Order Processing</p><p class="text-sm text-text-tertiary">Processed within a few hours</p></div></div>
                    <div class="flex items-start gap-3"><div class="bg-success w-2 h-2 rounded-full mt-2"></div><div><p class="font-medium text-text-primary">Quality Check & Pack</p><p class="text-sm text-text-tertiary">Checked and packed before dispatch</p></div></div>
                    <div class="flex items-start gap-3"><div class="bg-success w-2 h-2 rounded-full mt-2"></div><div><p class="font-medium text-text-primary">Delivery to You</p><p class="text-sm text-text-tertiary">24-48 hours depending on location</p></div></div>
                </div>
            </div>`;
    }

    // ── Reviews ──
    function renderReviews(reviews) {
        const list = document.getElementById('reviews-list');
        const subtitle = document.getElementById('reviews-subtitle');
        const writeBtn = document.getElementById('write-review-btn');

        // Show write review button if user is logged in
        const user = window.EAgri ? window.EAgri.getUser() : null;
        if (writeBtn && user) writeBtn.style.display = '';

        if (!list) return;
        if (!reviews || reviews.length === 0) {
            list.innerHTML = '<div class="col-span-2 text-center py-12 text-text-tertiary"><svg class="w-16 h-16 mx-auto mb-4 text-text-tertiary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg><p class="text-lg font-medium">No reviews yet</p><p class="text-sm">Be the first to share your experience!</p></div>';
            if (subtitle) subtitle.textContent = 'Be the first to review this product';
            return;
        }
        if (subtitle) subtitle.textContent = reviews.length + ' review' + (reviews.length !== 1 ? 's' : '') + ' from verified buyers';

        list.innerHTML = reviews.map(r => {
            const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            return `
            <div class="card">
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span class="text-lg font-bold text-primary">${esc((r.userName || 'U')[0].toUpperCase())}</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-text-primary">${esc(r.userName || 'Customer')}</h4>
                        <div class="flex items-center gap-2 mt-1">
                            <div class="flex items-center gap-0.5">${starsHTML(r.rating, '1rem')}</div>
                            <span class="text-sm text-text-tertiary">${esc(date)}</span>
                        </div>
                    </div>
                </div>
                <p class="text-text-secondary leading-relaxed mb-4">${esc(r.comment)}</p>
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                    <span class="text-sm text-success-dark font-medium">Verified Purchase</span>
                </div>
            </div>`;
        }).join('');
    }

    // ── Wishlist ──
    async function initWishlist(productId) {
        const btn = document.getElementById('wishlist-btn');
        if (!btn || !window.EAgri) return;
        const user = window.EAgri.getUser();
        if (!user) return;
        try {
            const inWishlist = await window.EAgri.isInWishlist(productId);
            if (inWishlist) btn.classList.add('active');
        } catch (_) {}

        btn.addEventListener('click', async () => {
            if (!window.EAgri.getUser()) {
                if (window.EAgri.toast) window.EAgri.toast('Please log in to add to wishlist.', 'error');
                return;
            }
            try {
                const result = await window.EAgri.toggleWishlist(productId);
                if (result.action === 'added') {
                    btn.classList.add('active');
                    if (window.EAgri.toast) window.EAgri.toast('Added to wishlist!', 'success');
                } else {
                    btn.classList.remove('active');
                    if (window.EAgri.toast) window.EAgri.toast('Removed from wishlist.', 'info');
                }
            } catch (err) {
                if (window.EAgri.toast) window.EAgri.toast(err.message, 'error');
            }
        });
    }

    // ── Review Form ──
    function initReviewForm(productId) {
        const writeBtn = document.getElementById('write-review-btn');
        const formContainer = document.getElementById('review-form-container');
        const submitBtn = document.getElementById('submit-review-btn');
        const cancelBtn = document.getElementById('cancel-review-btn');
        const starBtns = document.querySelectorAll('#star-rating-input .star-btn');

        if (writeBtn && formContainer) {
            writeBtn.addEventListener('click', () => {
                formContainer.style.display = '';
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        if (cancelBtn && formContainer) {
            cancelBtn.addEventListener('click', () => {
                formContainer.style.display = 'none';
                selectedRating = 0;
                document.getElementById('review-comment').value = '';
                starBtns.forEach(b => b.classList.remove('active'));
            });
        }

        // Star rating
        starBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedRating = parseInt(btn.dataset.rating);
                starBtns.forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.rating) <= selectedRating);
                });
            });
        });

        // Submit
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                if (!selectedRating) {
                    if (window.EAgri?.toast) window.EAgri.toast('Please select a rating.', 'error');
                    return;
                }
                const comment = document.getElementById('review-comment').value.trim();
                if (!comment) {
                    if (window.EAgri?.toast) window.EAgri.toast('Please write a review comment.', 'error');
                    return;
                }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
                try {
                    const reviews = await window.EAgri.submitReview(productId, selectedRating, comment);
                    renderReviews(reviews);
                    renderRatingSummary(reviews);
                    formContainer.style.display = 'none';
                    selectedRating = 0;
                    document.getElementById('review-comment').value = '';
                    starBtns.forEach(b => b.classList.remove('active'));
                    if (window.EAgri?.toast) window.EAgri.toast('Review submitted successfully!', 'success');
                } catch (err) {
                    if (window.EAgri?.toast) window.EAgri.toast(err.message, 'error');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Review';
                }
            });
        }
    }

    // ── Quantity & Cart ──
    function updateTotalPrice() {
        if (!currentProduct) return;
        const qty = parseInt(document.getElementById('quantity-input')?.value) || 1;
        const totalEl = document.getElementById('total-price');
        if (totalEl) totalEl.textContent = 'Total: ₹' + (currentProduct.price * qty);
    }

    function initQuantityAndCart() {
        const qtyInput = document.getElementById('quantity-input');
        const decBtn = document.getElementById('decrease-qty');
        const incBtn = document.getElementById('increase-qty');
        const cartBtn = document.getElementById('add-to-cart-btn');

        if (decBtn && qtyInput) {
            decBtn.addEventListener('click', () => {
                let qty = parseInt(qtyInput.value) || 1;
                qtyInput.value = Math.max(1, qty - 1);
                updateTotalPrice();
            });
        }
        if (incBtn && qtyInput) {
            incBtn.addEventListener('click', () => {
                let qty = parseInt(qtyInput.value) || 1;
                qtyInput.value = Math.min(parseInt(qtyInput.max) || 50, qty + 1);
                updateTotalPrice();
            });
        }
        if (qtyInput) {
            qtyInput.addEventListener('change', updateTotalPrice);
        }
        if (cartBtn && qtyInput) {
            cartBtn.addEventListener('click', async () => {
                if (!window.EAgri || !currentProduct) return;
                const qty = parseInt(qtyInput.value) || 1;
                const added = window.EAgri.addToCart(currentProduct, qty);
                if (added) {
                    if (window.EAgri.toast) window.EAgri.toast('Added to cart!', 'success');
                } else {
                    if (window.EAgri.toast) window.EAgri.toast('Failed to add to cart.', 'error');
                }
            });
        }
    }

    // ── Main Init ──
    document.addEventListener('DOMContentLoaded', async function () {
        showLoading();

        if (window.EAgri) {
            window.EAgri.initCartBadges();
            window.EAgri.initMobileMenu();
        }

        const productId = getProductId();

        try {
            let product = null;
            if (productId && window.EAgri) {
                product = await window.EAgri.getProductById(productId);
            } else if (window.EAgri) {
                const all = await window.EAgri.getProducts();
                product = all[0] || null;
            }

            if (!product) {
                showError();
                return;
            }

            renderProduct(product);
            showContent();

            // Init interactive features
            initQuantityAndCart();
            initWishlist(product.id);
            initReviewForm(product.id);

        } catch (err) {
            console.error('Error loading product details:', err);
            showError();
        }
    });
})();
