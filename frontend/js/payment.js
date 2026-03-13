// Payment Page Logic

let finalOrderAmount = 0;
let finalOrderId = 'ORDER_' + Math.floor(Math.random() * 1000000); 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load cart details from localStorage / app.js
    loadOrderSummary();

    // 2. Setup Form formatters (Card interactions)
    setupCardFormatting();
});

function loadOrderSummary() {
    // If there is an existing cart and app.js is loaded
    if (window.EAgri && window.EAgri.getCart) {
        const cart = window.EAgri.getCart();
        if (cart.length === 0) {
            alert('Your cart is empty. Redirecting to cart...');
            window.location.href = 'shopping_cart.html';
            return;
        }

        let subtotal = 0;
        cart.forEach(item => {
            subtotal += (item.price || 0) * (item.quantity || 1);
        });

        const delivery = subtotal > 500 ? 0 : 50;
        const gst = Math.round(subtotal * 0.05);
        const discount = subtotal > 400 ? 21 : 0;
        finalOrderAmount = subtotal + delivery + gst - discount;

        document.getElementById('summary-items-total').textContent = '₹' + subtotal;
        document.getElementById('summary-delivery-fee').textContent = delivery === 0 ? 'FREE' : '₹' + delivery;
        document.getElementById('summary-taxes').textContent = '₹' + gst;
        document.getElementById('summary-total').textContent = '₹' + finalOrderAmount;
        document.getElementById('pay-btn-amount').textContent = '₹' + finalOrderAmount;

        // Try getting address
        const cp = window.EAgri.getConsumerProfile();
        if (cp && cp.address) {
            document.getElementById('summary-address').textContent = cp.address;
        } else {
            document.getElementById('summary-address').textContent = 'Default Address';
        }
    } else {
        // Fallback dummy values just for UI display if app.js not loaded
        finalOrderAmount = 647;
        document.getElementById('summary-total').textContent = '₹647';
        document.getElementById('pay-btn-amount').textContent = '₹647';
        document.getElementById('summary-address').textContent = 'Tiruchirappalli, Tamil Nadu, India';
    }
}

function selectPaymentMode(mode) {
    // Update active UI classes
    document.querySelectorAll('.payment-option').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(`option-${mode}`).classList.add('active');

    // Select the correct radio button
    const radio = document.querySelector(`input[name="payment_mode"][value="${mode}"]`);
    if (radio) {
        radio.checked = true;
    }
}

function setupCardFormatting() {
    const cardInput = document.getElementById('card-number');
    const expiryInput = document.getElementById('card-expiry');
    const cvvInput = document.getElementById('card-cvv');
    const typeIconEl = document.getElementById('card-type-icon');

    if (!cardInput) return;

    cardInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        // Detect card type based on starting digits
        let iconUrl = '';
        if (val.startsWith('4')) {
            iconUrl = 'https://img.icons8.com/color/48/000000/visa.png';
        } else if (val.startsWith('5')) {
            iconUrl = 'https://img.icons8.com/color/48/000000/mastercard.png';
        } else if (val.startsWith('6')) { // RuPay / Discover
            iconUrl = 'https://img.icons8.com/color/48/000000/rupay.png';
        }
        
        if (iconUrl) {
            typeIconEl.innerHTML = `<img src="${iconUrl}" class="w-6 h-6 object-contain" alt="Card Type">`;
        } else {
            typeIconEl.innerHTML = '';
        }

        // Format: xxxx xxxx xxxx xxxx
        let formattedStr = val.substring(0, 16);
        formattedStr = formattedStr.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = formattedStr;
    });

    expiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 4);
        }
        e.target.value = val;
    });

    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    });
}

function validateCard() {
    const cardInput = document.getElementById('card-number');
    const val = cardInput.value.replace(/\D/g, '');
    if (val.length < 15) {
        document.getElementById('card-error').classList.remove('hidden');
        return false;
    }
    document.getElementById('card-error').classList.add('hidden');
    return true;
}

// ==========================================
// Razorpay Integration & Final Checkout
// ==========================================
async function processPayment(mode) {
    if (mode === 'card') {
        const isValid = validateCard();
        if(!isValid) return;
        if(!document.getElementById('card-form').checkValidity()) {
            document.getElementById('card-form').reportValidity();
            return;
        }
    } else if (mode === 'netbanking') {
        const bank = document.getElementById('bank-select').value;
        if (!bank) {
            alert("Please select a bank first.");
            return;
        }
    } else if (mode === 'upi') {
        const upi = document.getElementById('upi-id').value;
        if (!upi.includes('@')) {
            alert("Please enter a valid UPI ID (e.g., username@upi).");
            return;
        }
    }

    if (mode === 'cod') {
        // Direct order placement
        completeOrderPlacement('COD');
        return;
    }

    // --- Razorpay Real Integration Flow ---
    showLoader(true);

    try {
        // 1. Create Order via Node Endpoint
        const response = await fetch('/api/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: finalOrderAmount * 100, // paise
                currency: 'INR',
                orderId: finalOrderId
            })
        });

        const orderData = await response.json();

        if (!response.ok) {
            throw new Error(orderData.error || 'Failed to create Razorpay Order API. Please check server log.');
        }

        showLoader(false);

        // Get real user data for prefill
        const user = getCurrentUser();
        const prefillName = user?.name || 'EAgri Customer';
        const prefillEmail = user?.email || 'customer@example.com';
        const prefillPhone = user?.phone || '';

        // 2. Setup Razorpay Options
        const options = {
            "key": "dummy_key_id", // Replace with valid API KEY during production if needed, or fetched from backend if preferred. We expect local env setup.
            "amount": orderData.amount, 
            "currency": orderData.currency,
            "name": "E-Agri Commerce",
            "description": "Secure Order Payment",
            "image": "https://cdn.iconscout.com/icon/free/png-256/agriculture-1-105193.png",
            "order_id": orderData.id,
            "handler": async function (response) {
                // 3. Verify Payment
                await verifyPayment(response, orderData.id);
            },
            "prefill": {
                "name": prefillName,
                "email": prefillEmail,
                "contact": prefillPhone
            },
            "theme": {
                "color": "#2D5016" // primary green
            },
            "modal": {
                "ondismiss": function(){
                    console.log("Checkout form closed");
                }
            }
        };

        const rzp1 = new Razorpay(options);
        
        // Force razorpay prefill payment methods if possible (simulated, razorpay handles own UI, but we trigger it)
        rzp1.on('payment.failed', function (response){
            alert("Payment Failed - " + response.error.description);
        });

        rzp1.open();

    } catch (error) {
        showLoader(false);
        console.error("Payment error:", error);
        // Fallback for UI visualization offline testing
        if(confirm("Backend API is not fully running, or error occurred: " + error.message + ".\n\nDo you want to simulate a successful payment locally for testing?")) {
             completeOrderPlacement(mode);
        }
    }
}

// Helper to get current user from auth
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('eagriUser') || sessionStorage.getItem('eagriUser');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function getUserId() {
  const user = getCurrentUser();
  return user ? (user.id || user._id) : null;
}

async function verifyPayment(paymentResponse, rzpOrderId) {
    showLoader(true);
    try {
        const userId = getUserId();
        if (!userId) {
            showLoader(false);
            alert('Authentication error. Please login again.');
            return;
        }

        const verifyReq = await fetch('/api/payment/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                original_order_id: finalOrderId,
                amount: finalOrderAmount * 100, // paise back
                userId: userId
            })
        });

        const verifyData = await verifyReq.json();

        if (verifyData.success) {
            completeOrderPlacement('Online Paid via Razorpay');
        } else {
            throw new Error(verifyData.error || 'Verification failed');
        }

    } catch (e) {
        showLoader(false);
        alert('Payment Verification failed: ' + e.message);
    }
}

async function completeOrderPlacement(method) {
    try {
        // Show loading if not already shown
        showLoader(true);
        const loaderTitle = document.querySelector('#payment-loader h2');
        if (loaderTitle) loaderTitle.textContent = 'Saving Order...';

        // 1. Get cart and address
        if (window.EAgri) {
            const cartItems = window.EAgri.getCart();
            const cp = window.EAgri.getConsumerProfile();
            const address = cp.address || 'Standard Delivery';

            // 2. Persist to MongoDB
            const orderResult = await window.EAgri.placeOrder(cartItems, address, method);
            
            // 3. Clear cart (done inside placeOrder)
            // window.EAgri.clearCart(); // Already called in EAgri.placeOrder

            // 4. Update UI with real order ID from DB if available
            const displayId = orderResult._id || orderResult.id || finalOrderId;
            document.getElementById('success-order-id').textContent = '#' + displayId.slice(-6).toUpperCase();
        } else {
            document.getElementById('success-order-id').textContent = finalOrderId;
        }

        showLoader(false);

        // Show Success Modal
        const modal = document.getElementById('success-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        let countdown = 5;
        const timerEl = document.getElementById('redirect-timer');
        const interval = setInterval(() => {
            countdown--;
            if (timerEl) timerEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                window.location.href = 'consumer_dashboard.html';
            }
        }, 1000);
    } catch (err) {
        showLoader(false);
        console.error('Order placement failed:', err);
        alert('Order Confirmation Failed: ' + err.message + '. Please contact support.');
    }
}

function showLoader(show) {
    const loader = document.getElementById('payment-loader');
    if (show) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    } else {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
    }
}
