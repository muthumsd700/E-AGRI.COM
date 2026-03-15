/**
 * Enhanced Product Details Page - Advanced E-commerce Features
 * Integrates real backend APIs, image gallery, related products, and advanced functionality
 * Similar to Amazon/Flipkart product pages
 */

class EnhancedProductDetails {
    constructor() {
        this.productId = this.getProductIdFromURL();
        this.product = null;
        this.reviews = [];
        this.farmingDetails = null;
        this.relatedProducts = [];
        this.productImages = [];
        this.currentUser = null;
        this.selectedQuantity = 1;
        this.selectedRating = 0;
        this.selectedImageIndex = 0;
        
        this.init();
    }

    init() {
        this.showLoadingState();
        this.loadCurrentUser();
        this.setupEventListeners();
        this.loadProductData();
        this.initializeImageGallery();
        this.initializeQuantityPriceCalculator();
        this.initializeShareButtons();
        this.initializeShippingCalculator();
        this.initializeFAQ();
        this.initializeNutritionalInfo();
    }

    getProductIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        return id; // Return the ID as-is - it could be MongoDB ObjectId or regular ID
    }

    // LOADING STATES
    showLoadingState() {
        document.getElementById('loading-skeleton').style.display = 'block';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('product-content').style.display = 'none';
    }

    showErrorState(message = 'Product not found') {
        document.getElementById('loading-skeleton').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('product-content').style.display = 'none';
    }

    showProductContent() {
        document.getElementById('loading-skeleton').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('product-content').style.display = 'block';
    }

    // USER AUTHENTICATION
    loadCurrentUser() {
        try {
            const userData = localStorage.getItem('eagriUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.updateAuthUI();
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }

    updateAuthUI() {
        const loginBtns = document.querySelectorAll('.auth-login-btn');
        const userInfo = document.querySelectorAll('.auth-user-info');
        const userNameEls = document.querySelectorAll('.auth-user-name');

        if (this.currentUser) {
            loginBtns.forEach(btn => btn.style.display = 'none');
            userInfo.forEach(el => el.style.display = 'flex');
            userNameEls.forEach(el => el.textContent = this.currentUser.name);
        } else {
            loginBtns.forEach(btn => btn.style.display = 'block');
            userInfo.forEach(el => el.style.display = 'none');
        }

        // Hide/show role-based navigation
        document.querySelectorAll('[data-role]').forEach(el => {
            const role = el.getAttribute('data-role');
            el.style.display = this.currentUser?.role === role ? 'block' : 'none';
        });
    }

    // API CALLS
    async loadProductData() {
        try {
            // Load product details
            this.product = await this.fetchProduct();
            
            if (!this.product) {
                this.showErrorState();
                return;
            }

            // Load all related data in parallel
            const [reviews, farmingDetails, relatedProducts, productImages] = await Promise.all([
                this.fetchProductReviews(),
                this.fetchFarmingDetails(),
                this.fetchRelatedProducts(),
                this.fetchProductImages()
            ]);

            this.reviews = reviews || [];
            this.farmingDetails = farmingDetails;
            this.relatedProducts = relatedProducts || [];
            this.productImages = productImages || [this.product.image];

            // Render everything
            this.renderProductDetails();
            this.renderImageGallery();
            this.showProductContent();

        } catch (error) {
            console.error('Error loading product data:', error);
            this.showErrorState();
        }
    }

    async fetchProduct() {
        const API_BASE = window.EAgriUtils ? window.EAgriUtils.getApiBase() :
                       ((window.location.protocol === 'file:' || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) ? 'http://localhost:5000' : '');
        try {
            // Fetch single product from backend (populated with farmer info)
            const response = await fetch(`${API_BASE}/api/products/${this.productId}`);
            if (response.ok) {
                const data = await response.json();
                // API returns { success, product } for single product endpoint
                return data.product || data;
            }
        } catch (error) {
            console.warn('API fetch failed, trying localStorage:', error);
        }

        // Fallback to localStorage (from farmer dashboard)
        const products = JSON.parse(localStorage.getItem('eagriProducts') || '[]');
        const product = products.find(p => p.id == this.productId || p._id == this.productId);
        return product || this.getSampleProduct();
    }

    async fetchProductReviews() {
        const API_BASE = window.EAgriUtils ? window.EAgriUtils.getApiBase() :
                       ((window.location.protocol === 'file:' || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) ? 'http://localhost:5000' : '');
        // Show loading state in reviews section
        const reviewsList = document.getElementById('reviews-list');
        if (reviewsList) {
            reviewsList.innerHTML = `
                <div class="col-span-full flex justify-center py-8">
                    <div class="flex flex-col items-center gap-3 text-text-secondary">
                        <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        <span>Loading reviews...</span>
                    </div>
                </div>`;
        }
        try {
            const response = await fetch(`${API_BASE}/api/products/${this.productId}/reviews`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Store aggregate data for use in renderRatingSummary
                    this.avgRating = data.avgRating;
                    this.totalReviews = data.totalReviews;
                    return data.reviews.map(review => ({
                        id: review._id,
                        userName: review.userName,
                        rating: review.rating,
                        comment: review.comment,
                        date: review.createdAt,
                        verified: true,
                        helpful: 0
                    }));
                }
            }
        } catch (error) {
            console.warn('Reviews API fetch failed:', error);
        }
        // Return empty array on error — do not pollute with fake data
        return [];
    }

    async fetchFarmingDetails() {
        // Simulate API call - replace with real endpoint
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    farmingMethod: "Organic",
                    harvestDate: "2024-03-08",
                    farmLocation: "Nashik, Maharashtra",
                    pesticideUsage: "No chemical pesticides used",
                    storageMethod: "Cold storage at 4°C",
                    soilType: "Red soil with organic compost",
                    waterSource: "Drip irrigation with filtered water",
                    certification: "Organic Certified by IFOAM",
                    seasonalInfo: "Grown during winter season for optimal flavor",
                    harvestTechnique: "Hand-picked at peak ripeness",
                    postHarvestTreatment: "Natural ripening, no artificial ripening agents"
                });
            }, 500);
        });
    }

    async fetchRelatedProducts() {
        try {
            // Try to fetch all products from backend API
            const API_BASE = window.EAgriUtils ? window.EAgriUtils.getApiBase() : 
                           ((window.location.protocol === 'file:' || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) ? 'http://localhost:5000' : '');
            const response = await fetch(`${API_BASE}/api/products`);
            if (response.ok) {
                const data = await response.json();
                // API returns { success, products } OR just the array
                const allProducts = Array.isArray(data) ? data : (data.products || []);
                
                if (Array.isArray(allProducts)) {
                    const related = allProducts
                        .filter(p => {
                            const pId = p._id || p.id;
                            const currentId = this.productId;
                            return p.category === this.product?.category && pId != currentId;
                        })
                        .slice(0, 4);
                    
                    if (related.length > 0) {
                        return related;
                    }
                }
            }
        } catch (error) {
            console.warn('Related products API fetch failed, trying localStorage:', error);
        }
        
        // Fallback to localStorage
        return new Promise((resolve) => {
            setTimeout(() => {
                const storageData = localStorage.getItem('eagriProducts');
                const allProducts = JSON.parse(storageData || '[]');
                
                if (Array.isArray(allProducts)) {
                    const related = allProducts
                        .filter(p => {
                            const pId = p.id || p._id;
                            const currentId = this.productId;
                            return p.category === this.product?.category && pId != currentId;
                        })
                        .slice(0, 4);
                    
                    if (related.length > 0) {
                        resolve(related);
                        return;
                    }
                }
                
                // Fallback to sample related products
                resolve(this.getSampleRelatedProducts());
            }, 700);
        });
    }

    async fetchProductImages() {
        // Simulate API call - replace with real endpoint
        return new Promise((resolve) => {
            setTimeout(() => {
                // Single product image
                resolve([
                    this.product?.image || this.getDefaultProductImage()
                ]);
            }, 400);
        });
    }

    // IMAGE GALLERY
    initializeImageGallery() {
        // Image zoom functionality
        const mainImage = document.getElementById('main-product-image');
        if (mainImage) {
            mainImage.addEventListener('mouseenter', (e) => this.showImageZoom(e));
            mainImage.addEventListener('mouseleave', () => this.hideImageZoom());
            mainImage.addEventListener('mousemove', (e) => this.updateImageZoom(e));
        }
    }

    renderImageGallery() {
        const imageContainer = document.querySelector('.product-img-wrap');
        if (!imageContainer || this.productImages.length <= 1) return;

        // Add thumbnail gallery below main image
        const thumbnailsHTML = `
            <div class="flex gap-2 mt-4 overflow-x-auto pb-2">
                ${this.productImages.map((img, index) => `
                    <button 
                        class="thumbnail-btn flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            index === 0 ? 'border-primary' : 'border-border'
                        }"
                        onclick="productDetails.selectImage(${index})"
                        data-index="${index}"
                    >
                        <img src="${img}" alt="Product image ${index + 1}" 
                             class="w-full h-full object-cover hover:scale-110 transition-transform"
                             loading="lazy">
                    </button>
                `).join('')}
            </div>
        `;

        imageContainer.insertAdjacentHTML('afterend', thumbnailsHTML);
    }

    selectImage(index) {
        this.selectedImageIndex = index;
        const mainImage = document.getElementById('main-product-image');
        if (mainImage && this.productImages[index]) {
            mainImage.src = this.productImages[index];
        }

        // Update thumbnail borders
        document.querySelectorAll('.thumbnail-btn').forEach((btn, i) => {
            if (i === index) {
                btn.classList.add('border-primary');
                btn.classList.remove('border-border');
            } else {
                btn.classList.add('border-border');
                btn.classList.remove('border-primary');
            }
        });
    }

    showImageZoom(e) {
        const mainImage = e.target;
        const rect = mainImage.getBoundingClientRect();
        
        // Create zoom lens
        const lens = document.createElement('div');
        lens.id = 'zoom-lens';
        lens.className = 'absolute w-32 h-32 border-2 border-primary pointer-events-none bg-white/20';
        lens.style.display = 'none';
        mainImage.parentElement.appendChild(lens);

        // Create zoom result
        const result = document.createElement('div');
        result.id = 'zoom-result';
        result.className = 'absolute top-0 right-full w-96 h-96 border-2 border-primary bg-white shadow-2xl pointer-events-none overflow-hidden';
        result.style.display = 'none';
        result.style.marginRight = '20px';
        mainImage.parentElement.appendChild(result);

        const resultImage = document.createElement('img');
        resultImage.src = mainImage.src;
        resultImage.className = 'absolute';
        result.appendChild(resultImage);

        lens.style.display = 'block';
        result.style.display = 'block';
    }

    updateImageZoom(e) {
        const lens = document.getElementById('zoom-lens');
        const result = document.getElementById('zoom-result');
        const resultImage = result?.querySelector('img');
        
        if (!lens || !result || !resultImage) return;

        const mainImage = e.target;
        const rect = mainImage.getBoundingClientRect();
        
        let x = e.clientX - rect.left - lens.offsetWidth / 2;
        let y = e.clientY - rect.top - lens.offsetHeight / 2;
        
        x = Math.max(0, Math.min(x, rect.width - lens.offsetWidth));
        y = Math.max(0, Math.min(y, rect.height - lens.offsetHeight));
        
        lens.style.left = x + 'px';
        lens.style.top = y + 'px';
        
        const fx = resultImage.offsetWidth / lens.offsetWidth;
        const fy = resultImage.offsetHeight / lens.offsetHeight;
        
        resultImage.style.left = -x * fx + 'px';
        resultImage.style.top = -y * fy + 'px';
    }

    hideImageZoom() {
        const lens = document.getElementById('zoom-lens');
        const result = document.getElementById('zoom-result');
        if (lens) lens.remove();
        if (result) result.remove();
    }

    // QUANTITY PRICE CALCULATOR
    initializeQuantityPriceCalculator() {
        // This will be enhanced in the updateQuantitySelector method
    }

    // SHARE BUTTONS
    initializeShareButtons() {
        const shareContainer = document.createElement('div');
        shareContainer.className = 'flex items-center gap-3 mt-6';
        shareContainer.innerHTML = `
            <span class="text-text-secondary font-medium">Share:</span>
            <button onclick="productDetails.shareOnWhatsApp()" class="w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
            </button>
            <button onclick="productDetails.shareOnFacebook()" class="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </button>
            <button onclick="productDetails.copyProductLink()" class="w-10 h-10 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
            </button>
        `;

        // Add share buttons after the action buttons
        const actionButtons = document.querySelector('.flex.flex-col.sm\\:flex-row.gap-4.pt-4');
        if (actionButtons) {
            actionButtons.insertAdjacentHTML('afterend', shareContainer.outerHTML);
        }
    }

    shareOnWhatsApp() {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Check out this ${this.product?.name} on E-Agri Commerce!`);
        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    }

    shareOnFacebook() {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    }

    copyProductLink() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            this.showNotification('Product link copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy link', 'error');
        });
    }

    // SHIPPING CALCULATOR
    initializeShippingCalculator() {
        const shippingSection = document.createElement('section');
        shippingSection.className = 'py-12 bg-background';
        shippingSection.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="card max-w-2xl mx-auto">
                    <h3 class="text-2xl font-heading font-bold text-primary mb-6">Check Delivery</h3>
                    <div class="flex gap-3">
                        <input type="text" id="pincode-input" placeholder="Enter your pincode" 
                               class="input flex-1" maxlength="6">
                        <button onclick="productDetails.checkDelivery()" 
                                class="btn btn-primary px-6 py-2 h-auto">Check</button>
                    </div>
                    <div id="delivery-result" class="mt-4"></div>
                </div>
            </div>
        `;

        // Insert before footer
        const footer = document.querySelector('footer');
        footer.parentNode.insertBefore(shippingSection, footer);
    }

    checkDelivery() {
        const pincodeInput = document.getElementById('pincode-input');
        const resultDiv = document.getElementById('delivery-result');
        const pincode = pincodeInput.value.trim();

        if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
            resultDiv.innerHTML = '<p class="text-error">Please enter a valid 6-digit pincode</p>';
            return;
        }

        // Simulate delivery check
        resultDiv.innerHTML = '<div class="flex items-center gap-2"><div class="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div><span>Checking delivery...</span></div>';

        setTimeout(() => {
            const isDeliverable = Math.random() > 0.2; // 80% chance of delivery
            const deliveryDays = Math.floor(Math.random() * 3) + 2; // 2-4 days
            const shippingCost = pincode.startsWith('4') ? 0 : 40; // Free for Maharashtra pincodes

            if (isDeliverable) {
                resultDiv.innerHTML = `
                    <div class="bg-success/10 border border-success/20 rounded-lg p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <svg class="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <span class="font-semibold text-success">Delivery Available</span>
                        </div>
                        <p class="text-text-secondary">Estimated delivery: ${deliveryDays} business days</p>
                        <p class="text-text-secondary">Shipping cost: ${shippingCost === 0 ? 'FREE' : '₹' + shippingCost}</p>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="bg-error/10 border border-error/20 rounded-lg p-4">
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                            <span class="font-semibold text-error">Delivery Not Available</span>
                        </div>
                        <p class="text-text-secondary">Sorry, we don't deliver to this pincode yet</p>
                    </div>
                `;
            }
        }, 1000);
    }

    // FAQ SECTION
    initializeFAQ() {
        const faqSection = document.createElement('section');
        faqSection.className = 'py-12 bg-surface border-y border-border';
        faqSection.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-3xl font-heading font-bold text-primary mb-8 text-center">Frequently Asked Questions</h2>
                <div class="max-w-3xl mx-auto space-y-4">
                    <div class="faq-item">
                        <button onclick="productDetails.toggleFAQ(this)" class="w-full text-left p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div class="flex justify-between items-center">
                                <h4 class="font-semibold text-primary">Is this product organic?</h4>
                                <svg class="w-5 h-5 text-text-secondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </button>
                        <div class="faq-content hidden p-4 text-text-secondary">
                            ${this.product?.farmingMethod === 'organic' ? 
                                'Yes, this product is certified organic and grown without chemical pesticides or fertilizers.' : 
                                'This product is grown using conventional farming methods with quality controls.'}
                        </div>
                    </div>
                    <div class="faq-item">
                        <button onclick="productDetails.toggleFAQ(this)" class="w-full text-left p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div class="flex justify-between items-center">
                                <h4 class="font-semibold text-primary">How long does delivery take?</h4>
                                <svg class="w-5 h-5 text-text-secondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </button>
                        <div class="faq-content hidden p-4 text-text-secondary">
                            Delivery typically takes 2-4 business days depending on your location. Orders are processed within 24 hours.
                        </div>
                    </div>
                    <div class="faq-item">
                        <button onclick="productDetails.toggleFAQ(this)" class="w-full text-left p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div class="flex justify-between items-center">
                                <h4 class="font-semibold text-primary">What is the return policy?</h4>
                                <svg class="w-5 h-5 text-text-secondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </button>
                        <div class="faq-content hidden p-4 text-text-secondary">
                            We offer 100% satisfaction guarantee. If you're not satisfied with the quality, you can return the product within 24 hours of delivery for a full refund.
                        </div>
                    </div>
                    <div class="faq-item">
                        <button onclick="productDetails.toggleFAQ(this)" class="w-full text-left p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div class="flex justify-between items-center">
                                <h4 class="font-semibold text-primary">How should I store this product?</h4>
                                <svg class="w-5 h-5 text-text-secondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </button>
                        <div class="faq-content hidden p-4 text-text-secondary">
                            Store in a cool, dry place. For maximum freshness, refrigerate after opening and consume within 5-7 days.
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert before footer
        const footer = document.querySelector('footer');
        footer.parentNode.insertBefore(faqSection, footer);
    }

    toggleFAQ(button) {
        const content = button.nextElementSibling;
        const icon = button.querySelector('svg');
        
        content.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    }

    // NUTRITIONAL INFORMATION
    initializeNutritionalInfo() {
        if (this.product?.category !== 'vegetables' && this.product?.category !== 'fruits') return;

        const nutritionSection = document.createElement('section');
        nutritionSection.className = 'py-12 bg-background';
        nutritionSection.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="card max-w-2xl mx-auto">
                    <button onclick="productDetails.toggleNutrition()" class="w-full text-left p-6">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl font-heading font-bold text-primary">Nutritional Information</h3>
                            <svg id="nutrition-toggle-icon" class="w-6 h-6 text-text-secondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                    </button>
                    <div id="nutrition-content" class="hidden px-6 pb-6">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div class="bg-primary/5 rounded-lg p-4">
                                <p class="text-2xl font-bold text-primary">25</p>
                                <p class="text-sm text-text-secondary">Calories</p>
                            </div>
                            <div class="bg-primary/5 rounded-lg p-4">
                                <p class="text-2xl font-bold text-primary">1.3g</p>
                                <p class="text-sm text-text-secondary">Protein</p>
                            </div>
                            <div class="bg-primary/5 rounded-lg p-4">
                                <p class="text-2xl font-bold text-primary">5.7g</p>
                                <p class="text-sm text-text-secondary">Carbs</p>
                            </div>
                            <div class="bg-primary/5 rounded-lg p-4">
                                <p class="text-2xl font-bold text-primary">0.2g</p>
                                <p class="text-sm text-text-secondary">Fat</p>
                            </div>
                        </div>
                        <div class="mt-6 space-y-2">
                            <div class="flex justify-between py-2 border-b border-border">
                                <span class="text-text-secondary">Vitamin C</span>
                                <span class="font-medium text-primary">23% DV</span>
                            </div>
                            <div class="flex justify-between py-2 border-b border-border">
                                <span class="text-text-secondary">Potassium</span>
                                <span class="font-medium text-primary">8% DV</span>
                            </div>
                            <div class="flex justify-between py-2 border-b border-border">
                                <span class="text-text-secondary">Fiber</span>
                                <span class="font-medium text-primary">7% DV</span>
                            </div>
                            <div class="flex justify-between py-2">
                                <span class="text-text-secondary">Vitamin A</span>
                                <span class="font-medium text-primary">15% DV</span>
                            </div>
                        </div>
                        <p class="text-sm text-text-tertiary mt-4">*Percent Daily Values are based on a 2000 calorie diet</p>
                    </div>
                </div>
            </div>
        `;

        // Insert before footer
        const footer = document.querySelector('footer');
        footer.parentNode.insertBefore(nutritionSection, footer);
    }

    toggleNutrition() {
        const content = document.getElementById('nutrition-content');
        const icon = document.getElementById('nutrition-toggle-icon');
        
        content.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    }

    // RENDER METHODS
    renderProductDetails() {
        this.renderProductInfo();
        this.renderFarmerInfo();
        this.renderFarmingDetails();
        this.renderReviews();
        // this.renderRelatedProducts();
        this.updateStockStatus();
        this.updateWishlistButton();
    }

    renderProductInfo() {
        if (!this.product) return;

        // Handle both MongoDB _id and localStorage id
        const productId = this.product._id || this.product.id;

        // Update breadcrumb
        document.getElementById('breadcrumb-category').textContent = 
            this.product.category ? this.formatCategory(this.product.category) : 'Category';
        document.getElementById('breadcrumb-name').textContent = this.product.name;

        // Update product details
        document.getElementById('product-title').textContent = this.product.name;
        document.getElementById('product-price').textContent = `₹${this.product.price}`;
        document.getElementById('product-description').textContent = 
            this.product.description || 'Fresh agricultural produce directly from the farm.';
        
        // Update main image
        const mainImage = document.getElementById('main-product-image');
        if (this.productImages.length > 0) {
            mainImage.src = this.productImages[0];
        }
        mainImage.alt = this.product.name;

        // Update rating summary
        this.renderRatingSummary();

        // Update product features
        this.renderProductFeatures();

        // Update quantity selector with price tiers
        this.updateQuantitySelector();

        // Update badge
        this.updateProductBadge();

        // Update total price
        this.updateTotalPrice();
    }

    renderRatingSummary() {
        const starsDisplay = document.getElementById('stars-display');
        const reviewCountLabel = document.getElementById('review-count-label');

        // Prefer server-computed values, fall back to client-side calculation
        const count = this.totalReviews !== undefined ? this.totalReviews : this.reviews.length;
        const avg = this.avgRating !== undefined ? this.avgRating : this.calculateAverageRating();

        if (count > 0) {
            starsDisplay.innerHTML = this.renderStars(avg, true);
            reviewCountLabel.textContent = `${count} review${count > 1 ? 's' : ''} · avg ${avg}★`;
        } else {
            starsDisplay.innerHTML = this.renderStars(0, true);
            reviewCountLabel.textContent = 'No reviews yet';
        }
    }

    renderProductFeatures() {
        const featuresContainer = document.getElementById('product-features');
        const features = [];
        const farmingData = this.product.farmingDetails || {};
        const isOrganic = farmingData.organicCertified || 
                         this.product.farmingMethod === 'organic' ||
                         farmingData.method === 'organic';

        if (isOrganic) {
            features.push({ icon: '🌱', text: '100% Organic' });
        }
        
        if (this.product.category === 'vegetables' || this.product.category === 'fruits') {
            features.push({ icon: '🥗', text: 'Farm Fresh' });
        }
        
        features.push({ icon: '🚚', text: 'Fast Delivery' });
        features.push({ icon: '✅', text: 'Quality Assured' });

        featuresContainer.innerHTML = features.map(feature => `
            <div class="flex items-center gap-2 text-text-secondary">
                <span class="text-xl">${feature.icon}</span>
                <span>${feature.text}</span>
            </div>
        `).join('');
    }

    renderFarmerInfo() {
        if (!this.product) return;

        // Show loading skeleton in farmer section
        const farmerPhoto = document.getElementById('farmer-photo');
        const farmerName = document.getElementById('farmer-name');
        const farmerLocation = document.getElementById('farmer-location');
        const farmerTagline = document.getElementById('farmer-tagline');
        const farmerExperience = document.getElementById('farmer-experience');
        const farmSize = document.getElementById('farmer-farm-size');
        const customersServed = document.getElementById('farmer-customers');

        // Show skeleton loaders
        [farmerName, farmerLocation, farmerTagline, farmerExperience, farmSize, customersServed].forEach(el => {
            if (el) el.textContent = '...';
        });

        // Get farmerId from the product (could be populated object or bare ID)
        const farmerId = this.product.farmerId?._id || this.product.farmerId;

        if (!farmerId) {
            this._renderFarmerFallback(this.product);
            return;
        }

        const API_BASE = window.EAgriUtils ? window.EAgriUtils.getApiBase() :
                       ((window.location.protocol === 'file:' || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) ? 'http://localhost:5000' : '');

        fetch(`${API_BASE}/api/farmers/${farmerId}`)
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => {
                if (!data.success) throw new Error('Farmer fetch failed');
                const farmer = data.farmer;

                if (farmerName) farmerName.textContent = farmer.name || 'Local Farmer';
                if (farmerLocation) farmerLocation.textContent = farmer.location || this.product.location || 'India';
                if (farmerTagline) farmerTagline.textContent = `Passionate farmer committed to providing the freshest produce directly to consumers.`;
                if (farmerExperience) farmerExperience.textContent = farmer.experience ? `${farmer.experience} yrs` : '—';
                if (farmSize) farmSize.textContent = farmer.farmSize || '—';
                if (customersServed) customersServed.textContent = '500+';

                // Update profile photo
                if (farmer.profilePhoto && farmerPhoto) {
                    farmerPhoto.innerHTML = `<img src="${farmer.profilePhoto}" alt="${farmer.name}" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.innerHTML='<svg class=\'w-16 h-16 text-primary/40\' fill=\'currentColor\' viewBox=\'0 0 20 20\'><path fill-rule=\'evenodd\' d=\'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z\' clip-rule=\'evenodd\'/></svg>'"`;
                }
            })
            .catch(err => {
                console.warn('Could not load farmer info:', err);
                this._renderFarmerFallback(this.product);
            });
    }

    _renderFarmerFallback(product) {
        // Fallback: use data already embedded in the populated product
        const embedded = product.farmerId;
        const farmerName = document.getElementById('farmer-name');
        const farmerLocation = document.getElementById('farmer-location');
        const farmerTagline = document.getElementById('farmer-tagline');
        const farmerExperience = document.getElementById('farmer-experience');
        const farmSize = document.getElementById('farmer-farm-size');
        const customersServed = document.getElementById('farmer-customers');

        if (farmerName) farmerName.textContent = embedded?.name || product.farmerName || 'Local Farmer';
        if (farmerLocation) farmerLocation.textContent = product.location || 'India';
        if (farmerTagline) farmerTagline.textContent = 'Farmer committed to providing the freshest produce directly to consumers.';
        if (farmerExperience) farmerExperience.textContent = embedded?.experience || '—';
        if (farmSize) farmSize.textContent = embedded?.farmSize || '—';
        if (customersServed) customersServed.textContent = '500+';
    }

    renderFarmingDetails() {
        const grid = document.getElementById('farming-details-grid');
        
        // Handle farming details from MongoDB or localStorage
        const farmingData = this.product.farmingDetails || {};
        
        if (!farmingData.method && !this.product.farmingMethod) {
            grid.innerHTML = '<p class="text-text-secondary col-span-full text-center">Farming details not available</p>';
            return;
        }

        const details = [
            { label: 'Farming Method', value: farmingData.method || this.product.farmingMethod || 'Conventional', icon: '🌾' },
            { label: 'Harvest Date', value: this.formatDate(farmingData.harvestDate) || 'Recent', icon: '📅' },
            { label: 'Farm Location', value: farmingData.location || this.product.location || 'India', icon: '📍' },
            { label: 'Pesticide Usage', value: farmingData.pesticideUsage || 'Standard farming practices', icon: '🚫' },
            { label: 'Storage Method', value: farmingData.storageMethod || 'Optimal storage conditions', icon: '❄️' },
            { label: 'Certification', value: farmingData.certification || (farmingData.organicCertified ? 'Organic Certified' : 'Quality Assured'), icon: '🏆' },
            { label: 'Soil Type', value: farmingData.soilType || 'Fertile agricultural soil', icon: '🌱' },
            { label: 'Water Source', value: farmingData.waterSource || 'Clean irrigation water', icon: '💧' },
            { label: 'Harvest Technique', value: farmingData.harvestTechnique || 'Hand-picked with care', icon: '🤲' }
        ];

        grid.innerHTML = details.map(detail => `
            <div class="card p-6">
                <div class="flex items-start gap-4">
                    <span class="text-2xl">${detail.icon}</span>
                    <div>
                        <h4 class="font-semibold text-primary mb-1">${detail.label}</h4>
                        <p class="text-text-secondary">${detail.value}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderReviews() {
        const reviewsList = document.getElementById('reviews-list');
        const reviewsSubtitle = document.getElementById('reviews-subtitle');
        const writeReviewBtn = document.getElementById('write-review-btn');

        if (this.reviews.length === 0) {
            reviewsSubtitle.textContent = 'Be the first to review this product';
            reviewsList.innerHTML = '<p class="text-text-secondary col-span-full text-center">No reviews yet. Be the first to share your experience!</p>';
            writeReviewBtn.style.display = 'inline-flex';
        } else {
            reviewsSubtitle.textContent = `${this.reviews.length} review${this.reviews.length > 1 ? 's' : ''}`;
            reviewsList.innerHTML = this.reviews.map(review => this.renderReviewCard(review)).join('');
            writeReviewBtn.style.display = 'inline-flex';
        }
    }

    renderReviewCard(review) {
        return `
            <div class="card p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span class="text-lg font-bold text-primary">${review.userName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h4 class="font-semibold text-primary">${review.userName}</h4>
                            ${this.renderStars(review.rating, true)}
                            ${review.verified ? '<span class="bg-success/10 text-success text-xs px-2 py-1 rounded-full">Verified Purchase</span>' : ''}
                        </div>
                        <p class="text-text-secondary mb-2">${review.comment}</p>
                        <div class="flex items-center justify-between">
                            <p class="text-text-tertiary text-sm">${this.formatDate(review.date)}</p>
                            <div class="flex items-center gap-3">
                                <button onclick="productDetails.markReviewHelpful(${review.id})" class="text-sm text-text-secondary hover:text-primary">
                                    👍 Helpful (${review.helpful || 0})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    markReviewHelpful(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (review) {
            review.helpful = (review.helpful || 0) + 1;
            this.renderReviews();
            this.showNotification('Marked as helpful!', 'success');
        }
    }

    renderRelatedProducts() {
        if (this.relatedProducts.length === 0) return;

        // Create related products section
        const relatedSection = document.createElement('section');
        relatedSection.className = 'py-12 bg-surface border-y border-border';
        relatedSection.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-3xl font-heading font-bold text-primary mb-8 text-center">Related Products</h2>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${this.relatedProducts.map(product => this.renderRelatedProductCard(product)).join('')}
                </div>
            </div>
        `;

        // Insert before footer
        const footer = document.querySelector('footer');
        footer.parentNode.insertBefore(relatedSection, footer);
    }

    renderRelatedProductCard(product) {
        return `
            <div class="card group cursor-pointer" onclick="window.location.href='product_details.html?id=${product.id}'">
                <div class="relative overflow-hidden rounded-xl mb-4">
                    <img src="${product.image || this.getDefaultProductImage()}" alt="${product.name}" 
                         class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" 
                         loading="lazy" onerror="this.src='${this.getDefaultProductImage()}';">
                    ${this.getProductBadge(product)}
                </div>
                <h3 class="text-lg font-heading font-semibold text-primary mb-2">${product.name}</h3>
                <div class="flex items-center justify-between mb-3">
                    <p class="text-xl font-bold text-primary">₹${product.price}<span class="text-sm font-normal text-text-secondary">/kg</span></p>
                    <div class="flex items-center gap-1">
                        ${this.renderStars(product.rating || 4.5, false)}
                    </div>
                </div>
                <div class="flex items-center gap-2 text-sm text-text-tertiary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>${product.farmer || 'Local Farmer'}</span>
                </div>
            </div>
        `;
    }

    // STOCK AND PRICING
    updateStockStatus() {
        if (!this.product) return;

        const stockStatus = document.getElementById('stock-status');
        const quantityAvailable = document.getElementById('quantity-available');
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        const quantityInput = document.getElementById('quantity-input');

        const quantity = this.product.stock !== undefined ? this.product.stock : (this.product.quantity || 0);

        if (quantity === 0) {
            stockStatus.textContent = 'Out of Stock';
            stockStatus.className = 'text-error font-semibold';
            quantityAvailable.textContent = 'Out of Stock';
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'Out of Stock';
            quantityInput.disabled = true;
        } else if (quantity <= 10) {
            stockStatus.textContent = `Only ${quantity} left`;
            stockStatus.className = 'text-warning font-semibold';
            quantityAvailable.textContent = `Available: ${quantity} kg`;
            quantityInput.max = quantity;
        } else {
            stockStatus.textContent = 'In Stock';
            stockStatus.className = 'text-success font-semibold';
            quantityAvailable.textContent = `Available: ${quantity} kg`;
            quantityInput.max = Math.min(quantity, 50);
        }
    }

    updateQuantitySelector() {
        const quantityInput = document.getElementById('quantity-input');
        const decreaseBtn = document.getElementById('decrease-qty');
        const increaseBtn = document.getElementById('increase-qty');

        quantityInput.value = this.selectedQuantity;

        decreaseBtn.addEventListener('click', () => {
            if (this.selectedQuantity > 1) {
                this.selectedQuantity--;
                quantityInput.value = this.selectedQuantity;
                this.updateTotalPrice();
            }
        });

        increaseBtn.addEventListener('click', () => {
            const max = parseInt(quantityInput.max);
            if (this.selectedQuantity < max) {
                this.selectedQuantity++;
                quantityInput.value = this.selectedQuantity;
                this.updateTotalPrice();
            }
        });

        quantityInput.addEventListener('change', (e) => {
            let value = parseInt(e.target.value);
            const max = parseInt(quantityInput.max);
            if (isNaN(value) || value < 1) value = 1;
            if (value > max) value = max;
            this.selectedQuantity = value;
            quantityInput.value = value;
            this.updateTotalPrice();
        });
    }

    updateTotalPrice() {
        if (!this.product) return;
        
        const totalPriceEl = document.getElementById('total-price');
        const basePrice = this.product.price;
        let totalPrice = basePrice * this.selectedQuantity;

        // Apply quantity discounts
        if (this.selectedQuantity >= 6 && this.selectedQuantity <= 10) {
            totalPrice = basePrice * 0.9 * this.selectedQuantity; // 10% discount
        } else if (this.selectedQuantity > 10) {
            totalPrice = basePrice * 0.85 * this.selectedQuantity; // 15% discount
        }

        // Show price tier information
        let priceInfo = `Total: ₹${totalPrice}`;
        if (this.selectedQuantity >= 6 && this.selectedQuantity <= 10) {
            priceInfo += ` <span class="text-sm text-success">(10% discount applied)</span>`;
        } else if (this.selectedQuantity > 10) {
            priceInfo += ` <span class="text-sm text-success">(15% discount applied)</span>`;
        }

        totalPriceEl.innerHTML = priceInfo;

        // Update price tier display
        this.updatePriceTiers();
    }

    updatePriceTiers() {
        const container = document.querySelector('.flex.flex-col.gap-2');
        if (!container) return;

        const priceTierInfo = document.createElement('div');
        priceTierInfo.className = 'text-sm text-text-tertiary mt-2';
        priceTierInfo.innerHTML = `
            <div class="space-y-1">
                <div class="flex justify-between">
                    <span>1-5 kg:</span>
                    <span>₹${this.product.price}/kg</span>
                </div>
                <div class="flex justify-between">
                    <span>6-10 kg:</span>
                    <span>₹${(this.product.price * 0.9).toFixed(0)}/kg (10% off)</span>
                </div>
                <div class="flex justify-between">
                    <span>11+ kg:</span>
                    <span>₹${(this.product.price * 0.85).toFixed(0)}/kg (15% off)</span>
                </div>
            </div>
        `;

        // Add after quantity selector
        const quantitySection = document.querySelector('.space-y-3:has(#quantity-input)');
        if (quantitySection && !quantitySection.querySelector('.text-sm.text-text-tertiary.mt-2')) {
            quantitySection.appendChild(priceTierInfo);
        }
    }

    // WISHLIST FUNCTIONALITY
    updateWishlistButton() {
        if (!this.currentUser) return;

        const wishlistBtn = document.getElementById('wishlist-btn');
        const wishlist = JSON.parse(localStorage.getItem('eagriWishlist') || '[]');
        const isInWishlist = wishlist.includes(this.productId);

        if (isInWishlist) {
            wishlistBtn.classList.add('active');
            wishlistBtn.setAttribute('aria-label', 'Remove from wishlist');
        } else {
            wishlistBtn.classList.remove('active');
            wishlistBtn.setAttribute('aria-label', 'Add to wishlist');
        }
    }

    async toggleWishlist() {
        if (!this.currentUser) {
            this.showNotification('Please login to add items to wishlist', 'info');
            return;
        }

        try {
            const wishlist = JSON.parse(localStorage.getItem('eagriWishlist') || '[]');
            const index = wishlist.indexOf(this.productId);

            if (index > -1) {
                wishlist.splice(index, 1);
                this.showNotification('Removed from wishlist', 'success');
            } else {
                wishlist.push(this.productId);
                this.showNotification('Added to wishlist', 'success');
                
                // Simulate API call
                await this.postToWishlistAPI();
            }

            localStorage.setItem('eagriWishlist', JSON.stringify(wishlist));
            this.updateWishlistButton();
        } catch (error) {
            console.error('Error updating wishlist:', error);
            this.showNotification('Error updating wishlist', 'error');
        }
    }

    async postToWishlistAPI() {
        // Simulate API call - replace with real endpoint
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Wishlist API call:', { userId: this.currentUser.id, productId: this.productId });
                resolve();
            }, 300);
        });
    }

    // SHOPPING CART
    async addToCart() {
        if (!this.currentUser) {
            this.showNotification('Please login to add items to cart', 'info');
            return;
        }

        if (!this.product || this.product.quantity === 0) {
            this.showNotification('Product is out of stock', 'error');
            return;
        }

        try {
            const cart = JSON.parse(localStorage.getItem('eagriCart') || '[]');
            const existingItem = cart.find(item => item.productId === this.productId);

            if (existingItem) {
                existingItem.quantity += this.selectedQuantity;
            } else {
                cart.push({
                    productId: this.productId,
                    quantity: this.selectedQuantity,
                    addedAt: new Date().toISOString()
                });
            }

            localStorage.setItem('eagriCart', JSON.stringify(cart));
            this.updateCartCount();
            this.showNotification(`Added ${this.selectedQuantity}kg to cart`, 'success');
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Error adding to cart', 'error');
        }
    }

    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('eagriCart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        document.querySelectorAll('#cart-count-desktop').forEach(el => {
            el.textContent = totalItems;
        });
    }

    // REVIEW SYSTEM
    setupReviewForm() {
        const writeReviewBtn = document.getElementById('write-review-btn');
        const reviewFormContainer = document.getElementById('review-form-container');
        const cancelReviewBtn = document.getElementById('cancel-review-btn');
        const submitReviewBtn = document.getElementById('submit-review-btn');
        const starButtons = document.querySelectorAll('#star-rating-input .star-btn');

        writeReviewBtn.addEventListener('click', () => {
            if (!this.currentUser) {
                this.showNotification('Please login to write a review', 'info');
                return;
            }
            reviewFormContainer.style.display = 'block';
            writeReviewBtn.style.display = 'none';
        });

        cancelReviewBtn.addEventListener('click', () => {
            reviewFormContainer.style.display = 'none';
            writeReviewBtn.style.display = 'inline-flex';
            this.resetReviewForm();
        });

        starButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedRating = parseInt(btn.dataset.rating);
                this.updateStarRating();
            });
        });

        submitReviewBtn.addEventListener('click', () => this.submitReview());
    }

    updateStarRating() {
        const starButtons = document.querySelectorAll('#star-rating-input .star-btn');
        starButtons.forEach((btn, index) => {
            if (index < this.selectedRating) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    resetReviewForm() {
        this.selectedRating = 0;
        document.getElementById('review-comment').value = '';
        this.updateStarRating();
    }

    async submitReview() {
        if (!this.currentUser) {
            this.showNotification('Please login to submit a review', 'info');
            return;
        }

        const comment = document.getElementById('review-comment').value.trim();
        
        if (this.selectedRating === 0) {
            this.showNotification('Please select a rating', 'error');
            return;
        }

        if (comment.length < 10) {
            this.showNotification('Review must be at least 10 characters long', 'error');
            return;
        }

        try {
            const reviewData = {
                rating: this.selectedRating,
                comment: comment
            };

            const response = await this.postReviewAPI(reviewData);
            
            if (response && response.review) {
                const newReview = {
                    id: response.review._id,
                    userName: response.review.userName,
                    rating: response.review.rating,
                    comment: response.review.comment,
                    date: response.review.createdAt,
                    verified: true,
                    helpful: 0
                };
                
                // Add to local reviews
                this.reviews.unshift(newReview);
                if (this.totalReviews !== undefined) {
                    this.totalReviews += 1;
                }
                const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
                this.avgRating = parseFloat((sum / this.reviews.length).toFixed(1));
                
                this.renderReviews();
                this.renderRatingSummary();
            }

            // Hide form
            document.getElementById('review-form-container').style.display = 'none';
            document.getElementById('write-review-btn').style.display = 'inline-flex';
            this.resetReviewForm();

            this.showNotification('Review submitted successfully!', 'success');
        } catch (error) {
            console.error('Error submitting review:', error);
            this.showNotification(error.message || 'Error submitting review', 'error');
        }
    }

    async postReviewAPI(review) {
        const API_BASE = window.EAgriUtils ? window.EAgriUtils.getApiBase() :
                       ((window.location.protocol === 'file:' || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) ? 'http://localhost:5000' : '');
        
        const userDataStr = localStorage.getItem('eagriUser') || sessionStorage.getItem('eagriUser');
        let token = null;
        if (userDataStr) {
            try {
                token = JSON.parse(userDataStr).token;
            } catch(e) {}
        }

        const response = await fetch(`${API_BASE}/api/products/${this.productId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'x-auth-token': token } : {})
            },
            body: JSON.stringify({
                rating: review.rating,
                comment: review.comment
            })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to submit review');
        }
        return response.json();
    }

    // BUY NOW
    async buyNow() {
        if (!this.currentUser) {
            this.showNotification('Please login to buy now', 'info');
            return;
        }
        if (!this.product || (this.product.stock !== undefined ? this.product.stock : this.product.quantity) === 0) {
            this.showNotification('Product is out of stock', 'error');
            return;
        }
        try {
            await this.addToCart();
            // Small delay so the user sees the cart-added notification before redirect
            setTimeout(() => {
                window.location.href = 'shopping_cart.html';
            }, 600);
        } catch (error) {
            console.error('Buy Now error:', error);
            this.showNotification('Something went wrong. Please try again.', 'error');
        }
    }

    // EVENT LISTENERS
    setupEventListeners() {
        // Wishlist button
        document.getElementById('wishlist-btn')?.addEventListener('click', () => this.toggleWishlist());

        // Add to cart button
        document.getElementById('add-to-cart-btn')?.addEventListener('click', () => this.addToCart());

        // Buy Now button
        document.getElementById('buy-now-btn')?.addEventListener('click', () => this.buyNow());

        // Review form
        this.setupReviewForm();

        // Mobile menu
        this.setupMobileMenu();

        // Auth buttons
        this.setupAuthButtons();
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    setupAuthButtons() {
        // Logout button
        document.querySelectorAll('.auth-logout-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                localStorage.removeItem('eagriUser');
                this.currentUser = null;
                this.updateAuthUI();
                this.showNotification('Logged out successfully', 'success');
            });
        });
    }

    // UTILITY METHODS
    calculateAverageRating() {
        if (this.reviews.length === 0) return 0;
        const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
        return (sum / this.reviews.length).toFixed(1);
    }

    renderStars(rating, displayNumber = false) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<span class="star-display">★</span>';
        }
        if (hasHalfStar) {
            stars += '<span class="star-display">☆</span>';
        }
        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            stars += '<span class="star-display" style="opacity: 0.3">★</span>';
        }

        if (displayNumber) {
            stars += `<span class="ml-2 text-text-secondary">${rating}</span>`;
        }

        return stars;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatCategory(category) {
        return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Category';
    }

    updateProductBadge() {
        const badge = document.getElementById('product-badge');
        const farmingData = this.product.farmingDetails || {};
        const isOrganic = farmingData.organicCertified || 
                         this.product.farmingMethod === 'organic' ||
                         farmingData.method === 'organic';
        
        if (isOrganic) {
            badge.style.display = 'block';
            badge.innerHTML = `
                <svg class="w-5 h-5 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Certified Organic
            `;
        } else {
            badge.style.display = 'none';
        }
    }

    getProductBadge(product) {
        if (product.farmingMethod === 'organic') {
            return '<div class="absolute top-3 right-3 bg-success text-on-success text-xs font-bold px-3 py-1 rounded-full">Organic</div>';
        }
        return '';
    }

    getDefaultProductImage() {
        return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 fill=%22%23e5e7eb%22%3E%3Crect width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E';
    }

    getSampleProduct() {
        return {
            id: this.productId || 1,
            name: 'Fresh Organic Tomatoes',
            category: 'vegetables',
            price: 40,
            quantity: 250,
            farmingMethod: 'organic',
            description: 'Premium quality organic tomatoes grown without chemical pesticides or fertilizers. Perfect for salads, cooking, and sauces.',
            image: 'https://img.rocket.new/generatedImages/rocket_gen_img_154d057fc-1768188622301.png',
            farmer: 'Ramesh Kumar',
            location: 'Nashik, Maharashtra',
            rating: 4.8
        };
    }

    getSampleRelatedProducts() {
        return [
            {
                id: 2,
                name: 'Fresh Red Onions',
                category: 'vegetables',
                price: 35,
                farmingMethod: 'conventional',
                image: 'https://images.unsplash.com/photo-1709207515161-6b1ca1006724',
                farmer: 'Suresh Patil',
                location: 'Karnataka',
                rating: 4.6
            },
            {
                id: 3,
                name: 'Organic Carrots',
                category: 'vegetables',
                price: 45,
                farmingMethod: 'organic',
                image: 'https://images.unsplash.com/photo-1592745267052-76012c42429b',
                farmer: 'Anita Sharma',
                location: 'Punjab',
                rating: 4.7
            },
            {
                id: 4,
                name: 'Fresh Potatoes',
                category: 'vegetables',
                price: 25,
                farmingMethod: 'conventional',
                image: 'https://images.unsplash.com/photo-1518977621116-3d3598446f03',
                farmer: 'Vijay Kumar',
                location: 'Uttar Pradesh',
                rating: 4.5
            }
        ];
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-error' : 'bg-info';
        notification.className = `fixed top-4 right-4 ${bgColor} text-on-primary px-6 py-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the page when DOM is loaded
let productDetails;
document.addEventListener('DOMContentLoaded', () => {
    productDetails = new EnhancedProductDetails();
});
