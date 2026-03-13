/**
 * E-Agri Commerce - Central App Layer
 * Shared state: cart, products, user. Works across all pages.
 */
(function () {
  'use strict';

  const CART_KEY = 'eagri_cart';
  const FARMER_PRODUCTS_KEY = 'farmer_dashboard_products';
  const USER_KEY = 'eagriUser';
  const SETTINGS_KEY = 'eagriSettings';
  const CONSUMER_PROFILE_KEY = 'eagriConsumerProfile';
  const FARMER_PROFILE_KEY = 'eagriFarmerProfile';
  const ORDERS_KEY = 'eagri_orders';
  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400&auto=format&fit=crop';
  const API_BASE = 'http://localhost:5000';

  // Sample products (fallback when no farmer products)
  const SAMPLE_PRODUCTS = [
  ];

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const val = JSON.parse(raw);
      return val !== null && val !== undefined ? val : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  // Apply theme across ALL pages (Flipkart-like consistent UI)
  // Theme is stored in localStorage under `eagriSettings.theme` as: 'light' | 'dark' | 'system'
  function applyThemeFromSettings() {
    const settings = readJSON(SETTINGS_KEY, {});
    const pref = settings && settings.theme ? settings.theme : 'light';
    let mode = pref;
    if (pref === 'system' && typeof window.matchMedia === 'function') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.toggle('theme-dark', mode === 'dark');
  }

  // ---------- Translations & i18n ----------
  const translations = {
    // Navigation
    nav_home: { en: 'Home', ta: 'முகப்பு', hi: 'होम' },
    nav_products: { en: 'Products', ta: 'தயாரிப்புகள்', hi: 'उत्पाद' },
    nav_farmer_dashboard: { en: 'Farmer Dashboard', ta: 'விவசாயி டாஷ்போர்டு', hi: 'किसान डैशबोर्ड' },
    nav_consumer_dashboard: { en: 'Consumer Dashboard', ta: 'நுகர்வோர் டாஷ்போர்டு', hi: 'उपभोक्ता डैशबोर्ड' },
    nav_cart: { en: 'Cart', ta: 'வண்டி', hi: 'कार्ट' },
    nav_settings: { en: 'Settings', ta: 'அமைப்புகள்', hi: 'सेटिंग्स' },
    nav_login: { en: 'Login', ta: 'உள்நுழைக', hi: 'लॉग इन' },
    nav_logout: { en: 'Logout', ta: 'வெளியேறு', hi: 'लॉग आउट' },
    
    // Settings Navigation
    nav_profile: { en: 'Profile', ta: 'சுயவிவரம்', hi: 'प्रोफ़ाइल' },
    nav_account: { en: 'Account', ta: 'கணக்கு', hi: 'खाता' },
    nav_address: { en: 'Address', ta: 'முகவரி', hi: 'पता' },
    nav_language: { en: 'Language', ta: 'மொழி', hi: 'भाषा' },
    nav_appearance: { en: 'Appearance', ta: 'தோற்றம்', hi: 'दिखावट' },
    nav_notifications: { en: 'Notifications', ta: 'அறிவிப்புகள்', hi: 'सूचनाएं' },
    nav_privacy: { en: 'Privacy', ta: 'தனியுரிமை', hi: 'गोपनीयता' },
    nav_security: { en: 'Security', ta: 'பாதுகாப்பு', hi: 'सुरक्षा' },
    nav_payment: { en: 'Payment Methods', ta: 'பணம் செலுத்தும் முறைகள்', hi: 'भुगतान के तरीके' },
    
    // Profile
    profile_title: { en: 'Profile Settings', ta: 'சுயவிவர அமைப்புகள்', hi: 'प्रोफ़ाइल सेटिंग्स' },
    profile_subtitle: { en: 'Manage your profile information', ta: 'உங்கள் சுயவிவர தகவலை நிர்வகிக்கவும்', hi: 'अपनी प्रोफ़ाइल जानकारी प्रबंधित करें' },
    profile_name: { en: 'Full Name', ta: 'முழு பெயர்', hi: 'पूरा नाम' },
    profile_phone: { en: 'Phone Number', ta: 'தொலைபேசி எண்', hi: 'फ़ोन नंबर' },
    profile_email: { en: 'Email', ta: 'மின்னஞ்சல்', hi: 'ईमेल' },
    profile_role: { en: 'Role', ta: 'பங்கு', hi: 'भूमिका' },
    profile_save: { en: 'Save Changes', ta: 'மாற்றங்களை சேமிக்கவும்', hi: 'परिवर्तन सहेजें' },
    
    // Account
    account_title: { en: 'Account Settings', ta: 'கணக்கு அமைப்புகள்', hi: 'खाता सेटिंग्स' },
    account_subtitle: { en: 'Manage your account and security', ta: 'உங்கள் கணக்கு மற்றும் பாதுகாப்பை நிர்வகிக்கவும்', hi: 'अपने खाते और सुरक्षा को प्रबंधित करें' },
    account_details: { en: 'Account Details', ta: 'கணக்கு விவரங்கள்', hi: 'खाता विवरण' },
    account_password: { en: 'Change Password', ta: 'கடவுச்சொல்லை மாற்று', hi: 'पासवर्ड बदलें' },
    account_current_pw: { en: 'Current Password', ta: 'தற்போதைய கடவுச்சொல்', hi: 'वर्तमान पासवर्ड' },
    account_new_pw: { en: 'New Password', ta: 'புதிய கடவுச்சொல்', hi: 'नया पासवर्ड' },
    account_confirm_pw: { en: 'Confirm Password', ta: 'கடவுச்சொல்லை உறுதிப்படுத்து', hi: 'पासवर्ड की पुष्टि करें' },
    account_update_pw: { en: 'Update Password', ta: 'கடவுச்சொல்லைப் புதுப்பிக்கவும்', hi: 'पासवर्ड अपडेट करें' },
    account_danger: { en: 'Danger Zone', ta: 'அபாய மண்டலம்', hi: 'खतरा क्षेत्र' },
    account_delete_warning: { en: 'Deleting your account will remove all data. This cannot be undone.', ta: 'உங்கள் கணக்கை நீக்குவது அனைத்து தரவையும் அகற்றும். இதை மாற்ற முடியாது.', hi: 'अपना खाता हटाने से सभी डेटा हट जाएगा। इसे पूर्ववत नहीं किया जा सकता।' },
    account_delete_btn: { en: 'Delete Account', ta: 'கணக்கை நீக்கு', hi: 'खाता हटाएं' },
    
    // Address
    address_title: { en: 'Address Settings', ta: 'முகவரி அமைப்புகள்', hi: 'पता सेटिंग्स' },
    address_subtitle: { en: 'Manage delivery addresses', ta: 'டெலிவரி முகவரிகளை நிர்வகிக்கவும்', hi: 'डिलीवरी पते प्रबंधित करें' },
    address_add: { en: 'Add New Address', ta: 'புதிய முகவரியைச் சேர்', hi: 'नया पता जोड़ें' },
    address_fullname: { en: 'Full Name', ta: 'முழு பெயர்', hi: 'पूरा नाम' },
    address_line: { en: 'Address Line', ta: 'முகவரி வரி', hi: 'पता पंक्ति' },
    address_city: { en: 'City', ta: 'நகரம்', hi: 'शहर' },
    address_state: { en: 'State', ta: 'மாநிலம்', hi: 'राज्य' },
    address_pincode: { en: 'Pincode', ta: 'அஞ்சல் குறியீடு', hi: 'पिन कोड' },
    address_save: { en: 'Save Address', ta: 'முகவரியை சேமிக்கவும்', hi: 'पता सहेजें' },
    address_cancel: { en: 'Cancel', ta: 'ரத்து', hi: 'रद्द करें' },
    address_saved: { en: 'Saved Addresses', ta: 'சேமிக்கப்பட்ட முகவரிகள்', hi: 'सहेजे गए पते' },
    address_none: { en: 'No addresses saved yet.', ta: 'இன்னும் முகவரிகள் சேமிக்கப்படவில்லை.', hi: 'अभी तक कोई पता सहेजा नहीं गया।' },
    address_default: { en: 'Default', ta: 'இயல்புநிலை', hi: 'डिफ़ॉल्ट' },
    address_edit: { en: 'Edit', ta: 'திருத்து', hi: 'संपादित करें' },
    address_delete: { en: 'Delete', ta: 'நீக்கு', hi: 'हटाएं' },
    
    // Language
    language_title: { en: 'Language Settings', ta: 'மொழி அமைப்புகள்', hi: 'भाषा सेटिंग्स' },
    language_subtitle: { en: 'Choose your preferred language', ta: 'உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்', hi: 'अपनी पसंदीदा भाषा चुनें' },
    language_select: { en: 'Language', ta: 'மொழி', hi: 'भाषा' },
    language_note: { en: 'UI text will update according to your selection. Preference is saved locally.', ta: 'உங்கள் தேர்வுக்கு ஏற்ப UI உரை புதுப்பிக்கப்படும்.', hi: 'आपके चयन के अनुसार UI टेक्स्ट अपडेट होगा।' },
    lang_en: { en: 'English', ta: 'ஆங்கிலம்', hi: 'अंग्रेज़ी' },
    lang_ta: { en: 'Tamil', ta: 'தமிழ்', hi: 'तमिल' },
    lang_hi: { en: 'Hindi', ta: 'இந்தி', hi: 'हिंदी' },
    
    // Appearance
    appearance_title: { en: 'Appearance', ta: 'தோற்றம்', hi: 'दिखावट' },
    appearance_subtitle: { en: 'Choose theme', ta: 'தீம் தேர்ந்தெடு', hi: 'थीम चुनें' },
    theme_light: { en: 'Light Mode', ta: 'வெளிச்ச முறை', hi: 'लाइट मोड' },
    theme_dark: { en: 'Dark Mode', ta: 'இருண்ட முறை', hi: 'डार्क मोड' },
    theme_system: { en: 'System', ta: 'கணினி', hi: 'सिस्टम' },
    
    // Notifications
    notifications_title: { en: 'Notification Settings', ta: 'அறிவிப்பு அமைப்புகள்', hi: 'सूचना सेटिंग्स' },
    notifications_subtitle: { en: 'Choose what you want to be notified about', ta: 'எதைப் பற்றி அறிவிக்க விரும்புகிறீர்கள் என்பதைத் தேர்ந்தெடுக்கவும்', hi: 'चुनें कि आप किस बारे में सूचित होना चाहते हैं' },
    notif_email: { en: 'Email Notifications', ta: 'மின்னஞ்சல் அறிவிப்புகள்', hi: 'ईमेल सूचनाएं' },
    notif_email_desc: { en: 'Receive emails for important updates', ta: 'முக்கியமான புதுப்பிப்புகளுக்கான மின்னஞ்சல்கள்', hi: 'महत्वपूर्ण अपडेट के लिए ईमेल प्राप्त करें' },
    notif_orders: { en: 'Order Updates', ta: 'ஆர்டர் புதுப்பிப்புகள்', hi: 'ऑर्डर अपडेट' },
    notif_orders_desc: { en: 'Updates on order status', ta: 'ஆர்டர் நிலை புதுப்பிப்புகள்', hi: 'ऑर्डर स्थिति अपडेट' },
    notif_promos: { en: 'Promotions', ta: 'விளம்பரங்கள்', hi: 'प्रचार' },
    notif_promos_desc: { en: 'Offers and discounts', ta: 'சலுகைகள் மற்றும் தள்ளுபடிகள்', hi: 'ऑफ़र और छूट' },
    notif_delivery: { en: 'Delivery Updates', ta: 'டெலிவரி புதுப்பிப்புகள்', hi: 'डिलीवरी अपडेट' },
    notif_delivery_desc: { en: 'Delivery status and tracking', ta: 'டெலிவரி நிலை மற்றும் கண்காணிப்பு', hi: 'डिलीवरी स्थिति और ट्रैकिंग' },
    
    // Privacy
    privacy_title: { en: 'Privacy Settings', ta: 'தனியுரிமை அமைப்புகள்', hi: 'गोपनीयता सेटिंग्स' },
    privacy_subtitle: { en: 'Control your visibility and preferences', ta: 'உங்கள் தெரிவுநிலை மற்றும் விருப்பங்களைக் கட்டுப்படுத்தவும்', hi: 'अपनी दृश्यता और प्राथमिकताएं नियंत्रित करें' },
    privacy_visibility: { en: 'Profile visibility', ta: 'சுயவிவர தெரிவுநிலை', hi: 'प्रोफ़ाइल दृश्यता' },
    privacy_visibility_desc: { en: 'Public / Private', ta: 'பொது / தனிப்பட்ட', hi: 'सार्वजनिक / निजी' },
    privacy_public: { en: 'Public', ta: 'பொது', hi: 'सार्वजनिक' },
    privacy_private: { en: 'Private', ta: 'தனிப்பட்ட', hi: 'निजी' },
    privacy_contact: { en: 'Allow contact from consumers', ta: 'நுகர்வோரிடமிருந்து தொடர்பை அனுமதிக்கவும்', hi: 'उपभोक्ताओं से संपर्क की अनुमति दें' },
    privacy_contact_desc: { en: 'Let consumers message you', ta: 'நுகர்வோர் உங்களுக்கு செய்தி அனுப்ப அனுமதிக்கவும்', hi: 'उपभोक्ताओं को आपको संदेश भेजने दें' },
    privacy_recommend: { en: 'Allow product recommendations', ta: 'தயாரிப்பு பரிந்துரைகளை அனுமதிக்கவும்', hi: 'उत्पाद सिफारिशों की अनुमति दें' },
    privacy_recommend_desc: { en: 'Personalized suggestions', ta: 'தனிப்பயனாக்கப்பட்ட பரிந்துரைகள்', hi: 'व्यक्तिगत सुझाव' },
    
    // Security
    security_title: { en: 'Security', ta: 'பாதுகாப்பு', hi: 'सुरक्षा' },
    security_subtitle: { en: 'Secure your account', ta: 'உங்கள் கணக்கைப் பாதுகாக்கவும்', hi: 'अपने खाते को सुरक्षित करें' },
    security_password: { en: 'Change Password', ta: 'கடவுச்சொல்லை மாற்று', hi: 'पासवर्ड बदलें' },
    security_password_desc: { en: 'Use the Account section to update your password.', ta: 'உங்கள் கடவுச்சொல்லைப் புதுப்பிக்க கணக்கு பிரிவைப் பயன்படுத்தவும்.', hi: 'अपना पासवर्ड अपडेट करने के लिए खाता अनुभाग का उपयोग करें।' },
    security_go_account: { en: 'Go to Account →', ta: 'கணக்குக்குச் செல் →', hi: 'खाते पर जाएं →' },
    security_2fa: { en: 'Two-Factor Authentication', ta: 'இரண்டு காரணி அங்கீகாரம்', hi: 'दो-कारक प्रमाणीकरण' },
    security_2fa_desc: { en: 'Add an extra layer of security (UI simulation)', ta: 'கூடுதல் பாதுகாப்பு சேர்த்தல் (UI சிமுலேஷன்)', hi: 'अतिरिक्त सुरक्षा जोड़ें (UI सिमुलेशन)' },
    security_activity: { en: 'Login Activity', ta: 'உள்நுழைவு செயல்பாடு', hi: 'लॉगिन गतिविधि' },
    security_activity_now: { en: 'Current session', ta: 'தற்போதைய அமர்வு', hi: 'वर्तमान सत्र' },
    security_activity_note: { en: 'Recent logins will appear here when connected to a backend.', ta: 'பின்னணியுடன் இணைக்கும்போது சமீபத்திய உள்நுழைவுகள் இங்கே தோன்றும்.', hi: 'बैकएंड से कनेक्ट होने पर हाल के लॉगिन यहां दिखाई देंगे।' },
    
    // Payment
    payment_title: { en: 'Payment Methods', ta: 'பணம் செலுத்தும் முறைகள்', hi: 'भुगतान के तरीके' },
    payment_subtitle: { en: 'Manage saved payment options', ta: 'சேமிக்கப்பட்ட பணம் செலுத்தும் விருப்பங்களை நிர்வகிக்கவும்', hi: 'सहेजे गए भुगतान विकल्प प्रबंधित करें' },
    payment_add: { en: 'Add Payment Method', ta: 'பணம் செலுத்தும் முறையைச் சேர்', hi: 'भुगतान विधि जोड़ें' },
    payment_type: { en: 'Type', ta: 'வகை', hi: 'प्रकार' },
    payment_upi: { en: 'UPI ID', ta: 'UPI ஐடி', hi: 'UPI ID' },
    payment_card: { en: 'Debit/Credit Card', ta: 'டெபிட்/கிரெடிட் கார்டு', hi: 'डेबिट/क्रेडिट कार्ड' },
    payment_save: { en: 'Save', ta: 'சேமிக்கவும்', hi: 'सहेजें' },
    payment_saved: { en: 'Saved Methods', ta: 'சேமிக்கப்பட்ட முறைகள்', hi: 'सहेजे गए तरीके' },
    payment_none: { en: 'No payment methods saved.', ta: 'பணம் செலுத்தும் முறைகள் சேமிக்கப்படவில்லை.', hi: 'कोई भुगतान विधि सहेजी नहीं गई।' },
  };

  function applyLanguageFromSettings() {
    const settings = readJSON(SETTINGS_KEY, {});
    const lang = settings && settings.language ? settings.language : 'en';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      const t = translations[key];
      if (t && t[lang]) {
        // If it's an input element with placeholder, update placeholder instead
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
          el.placeholder = t[lang];
        } else {
          el.textContent = t[lang];
        }
      }
    });

    var sel = document.getElementById('language-select');
    if (sel) {
      [].slice.call(sel.options).forEach(function (opt) {
        var key = { en: 'lang_en', ta: 'lang_ta', hi: 'lang_hi' }[opt.value];
        if (key && translations[key] && translations[key][lang]) opt.textContent = translations[key][lang];
      });
    }
    document.documentElement.lang = lang === 'ta' ? 'ta' : lang === 'hi' ? 'hi' : 'en';
  }

  // Run immediately (before most rendering)
  applyThemeFromSettings();
  
  // Wait for DOM completely loaded to apply translations
  document.addEventListener('DOMContentLoaded', applyLanguageFromSettings);

  // If user chose System, follow OS theme changes
  // Also listen for localStorage theme/lang changes synchronously
  try {
    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = function () {
        const settings = readJSON(SETTINGS_KEY, {});
        if (settings && settings.theme === 'system') applyThemeFromSettings();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
      else if (typeof mq.addListener === 'function') mq.addListener(handler);
    }
    
    // Global sync across tabs (if settings is updated on another tab, it syncs instantly)
    window.addEventListener('storage', function(e) {
      if (e.key === SETTINGS_KEY) {
        applyThemeFromSettings();
        applyLanguageFromSettings();
      }
    });
  } catch (_) {}

  function getAuthToken() {
    try {
      // Token is stored inside the eagriUser JSON object as eagriUser.token
      const raw = localStorage.getItem('eagriUser');
      if (!raw) return '';
      const user = JSON.parse(raw);
      return (user && user.token) ? user.token : '';
    } catch (_) {
      return '';
    }
  }

  function generateId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  // Lightweight toast helper usable across pages (no CSS dependency required)
  function showToast(message, type) {
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

  const EAgri = {
    getCart() {
      const items = readJSON(CART_KEY, []);
      return Array.isArray(items) ? items : [];
    },

    addToCart(product, qty) {
      if (!product || !product.id) return false;
      const cart = this.getCart();
      const q = Math.max(1, parseInt(qty, 10) || 1);
      const existing = cart.find((i) => i.id === product.id);
      if (existing) {
        existing.quantity = Math.min((existing.quantity || 0) + q, product.stock || 999);
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price) || 0,
          quantity: q,
          image: product.image || FALLBACK_IMG,
          farmer: product.farmer || 'Farmer',
          farmerId: product.farmerId || '',
          stock: product.stock || 999,
        });
      }
      writeJSON(CART_KEY, cart);
      this.notifyCartChange();
      return true;
    },

    removeFromCart(id) {
      const cart = this.getCart().filter((i) => i.id !== id);
      writeJSON(CART_KEY, cart);
      this.notifyCartChange();
    },

    clearCart() {
      writeJSON(CART_KEY, []);
      this.notifyCartChange();
    },

    updateCartItemQty(id, qty) {
      const cart = this.getCart();
      const item = cart.find((i) => i.id === id);
      if (!item) return;
      const q = Math.max(1, Math.min(parseInt(qty, 10) || 1, item.stock || 999));
      item.quantity = q;
      writeJSON(CART_KEY, cart);
      this.notifyCartChange();
    },

    getCartCount() {
      return this.getCart().reduce((sum, i) => sum + (i.quantity || 0), 0);
    },

    getCartSubtotal() {
      return this.getCart().reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
    },

    notifyCartChange() {
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('eagri-cart-change'));
      }
    },

    // Fetch ALL products from MongoDB (public, shown on home/catalog pages)
    async getProducts() {
      try {
        const res = await fetch(API_BASE + '/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const products = await res.json();
        return products.map((p) => ({
          id: p._id || p.id,
          name: p.name || 'Product',
          price: parseFloat(p.price) || 0,
          stock: parseInt(p.stock, 10) || 0,
          image: p.image || FALLBACK_IMG,
          category: p.category || 'General',
          description: p.description || '',
          farmer: p.farmerName || (p.farmer && p.farmer.name) || 'Farmer',
          farmerId: p.farmerId || (p.farmer && (p.farmer._id || p.farmer.id)) || '',
          farmerLocation: p.farmerLocation || '',
        }));
      } catch (_) {
        // Fallback: return localStorage products if API unavailable
        const farmerList = Array.isArray(readJSON(FARMER_PRODUCTS_KEY, [])) ? readJSON(FARMER_PRODUCTS_KEY, []) : [];
        return farmerList.map((p, idx) => ({
          id: p.id || 'fd_' + idx,
          name: p.name || 'Product',
          price: parseFloat(p.price) || 0,
          stock: parseInt(p.stock, 10) || 0,
          image: p.image || FALLBACK_IMG,
          category: p.category || 'General',
          description: p.description || '',
          farmer: p.farmer || 'Farmer',
          farmerLocation: '',
        }));
      }
    },

    // Add product via API (farmers only)
    async addFarmerProduct(product) {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(API_BASE + '/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(product),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add product');
      return data;
    },

    // Delete product via API (farmer who owns it only)
    async removeFarmerProduct(id) {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(API_BASE + '/api/products/' + id, {
        method: 'DELETE',
        headers: { 'x-auth-token': token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete product');
      return data;
    },

    // Update product via API (farmer who owns it only)
    async updateFarmerProduct(id, updates) {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(API_BASE + '/api/products/' + id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update product');
      return data;
    },

    // Get only THIS farmer's products from MongoDB
    async getFarmerProducts() {
      const token = getAuthToken();
      if (!token) return [];
      try {
        const res = await fetch(API_BASE + '/api/products/my', {
          headers: { 'x-auth-token': token },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to fetch your products');
        }
        const products = await res.json();
        return products.map((p) => ({
          id: p._id || p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          image: p.image || FALLBACK_IMG,
          category: p.category || '',
          description: p.description || '',
          availability: p.availability !== false,
        }));
      } catch (err) {
        console.error('getFarmerProducts error:', err);
        throw err;
      }
    },

    getUser() {
      return readJSON(USER_KEY, null);
    },

    setUser(user) {
      writeJSON(USER_KEY, user);
    },

    getConsumerProfile() {
      const user = this.getUser();
      const ext = readJSON(CONSUMER_PROFILE_KEY, {});

      let resolvedAddress;
      if (Object.prototype.hasOwnProperty.call(ext, 'address')) {
        resolvedAddress = ext.address;
      } else if (user && user.address) {
        if (typeof user.address === 'string') {
          resolvedAddress = user.address;
        } else if (typeof user.address === 'object') {
          const a = user.address;
          const parts = [a.houseStreet, a.city, a.state, a.pincode].filter(Boolean);
          if (parts.length) resolvedAddress = parts.join(', ');
        }
      }
      if (!resolvedAddress) {
        resolvedAddress = '';
      }

      return {
        name: ext.name ?? user?.name ?? 'Consumer',
        email: ext.email ?? user?.email ?? '',
        phone: ext.phone ?? '+91 98765 43210',
        address: resolvedAddress,
        organicOnly: ext.organicOnly !== false,
        vegetarian: !!ext.vegetarian,
        glutenFree: !!ext.glutenFree,
        memberSince: ext.memberSince ?? new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      };
    },

    setConsumerProfile(profile) {
      const ext = readJSON(CONSUMER_PROFILE_KEY, {});
      writeJSON(CONSUMER_PROFILE_KEY, { ...ext, ...profile });
    },

    getFarmerProfile() {
      const user = this.getUser();
      const ext = readJSON(FARMER_PROFILE_KEY, {}) || {};

      const addr = user && user.address ? user.address : null;
      let locationFromUser = null;
      if (addr && (addr.city || addr.state)) {
        const city = addr.city || '';
        const state = addr.state || '';
        const parts = [city, state].filter(Boolean);
        if (parts.length) locationFromUser = parts.join(', ');
      }

      let locationFromExt = null;
      let shouldMigrateLocation = false;
      if (Object.prototype.hasOwnProperty.call(ext, 'location')) {
        const rawLoc = ext.location;
        if (typeof rawLoc === 'string') {
          const trimmed = rawLoc.trim();
          if (trimmed) locationFromExt = trimmed;
        } else if (rawLoc && typeof rawLoc === 'object') {
          const city = rawLoc.city || rawLoc.taluk || rawLoc.district || '';
          const state = rawLoc.state || rawLoc.province || '';
          const parts = [city, state].filter(Boolean);
          if (parts.length) {
            locationFromExt = parts.join(', ');
          }
          shouldMigrateLocation = true;
        } else {
          shouldMigrateLocation = true;
        }
      }

      const location = locationFromExt || locationFromUser || 'Nashik, Maharashtra';

      if (shouldMigrateLocation && locationFromExt && typeof this.setFarmerProfile === 'function') {
        this.setFarmerProfile({ location });
      }

      const imageFromUser = user && typeof user.profilePhoto === 'string' && user.profilePhoto.trim()
        ? user.profilePhoto
        : null;

      return {
        // prefer settings-synced user details, fall back to any legacy ext overrides
        name: user?.name ?? ext.name ?? 'Farmer',
        email: user?.email ?? ext.email ?? '',
        location,
        phone: user?.phone ?? ext.phone ?? '+91 98765 43210',
        experience: ext.experience ?? '12 years',
        farmSize: ext.farmSize ?? '8 acres',
        image: imageFromUser || ext.image || 'https://images.unsplash.com/photo-1598875706250-21faaf804361?q=80&w=1200&auto=format&fit=crop',
        tagline: ext.tagline ?? 'Organic Vegetables Farmer',
      };
    },

    setFarmerProfile(profile) {
      const ext = readJSON(FARMER_PROFILE_KEY, {});
      writeJSON(FARMER_PROFILE_KEY, { ...ext, ...profile });
    },

    // ---------- Order Management (Local Storage) ----------
    async placeOrder(cartItems, deliveryAddress, paymentMethod) {
      const user = this.getUser();
      if (!user) throw new Error('Not authenticated');
      
      let totalAmount = 0;
      const items = cartItems.map(i => {
        totalAmount += (parseFloat(i.price) || 0) * (parseInt(i.quantity, 10) || 1);
        return {
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          farmerId: i.farmerId || i.farmer
        };
      });
      
      const orderData = {
        _id: "ORD" + Date.now(),
        consumerId: user.id || user._id,
        createdAt: new Date().toISOString(),
        status: "pending",
        items: items,
        totalAmount: totalAmount,
        shippingAddress: deliveryAddress,
        paymentMethod: paymentMethod || 'cod',
        timeline: [
          { status: 'pending', label: 'Order Placed', time: new Date().toISOString(), completed: true }
        ]
      };
      
      this.saveOrder(orderData);
      this.clearCart();
      return orderData;
    },

    saveOrder(orderData) {
      const user = this.getUser();
      if (!user) return false;
      const orders = readJSON('eagriOrders', []);
      orders.push(orderData);
      writeJSON('eagriOrders', orders);
      return true;
    },

    async getConsumerOrders() {
      const user = this.getUser();
      if (!user) return [];
      const userId = user.id || user._id;
      const orders = readJSON('eagriOrders', []);
      return orders
        .filter(o => o.consumerId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async getFarmerOrders() {
      const token = getAuthToken();
      if (!token) return [];
      try {
        const res = await fetch(API_BASE + '/api/orders/received', {
          headers: { 'x-auth-token': token },
        });
        if (!res.ok) return [];
        const orders = await res.json();
        // Backend /received returns items specifically for this farmer
        return orders.map(o => ({
          id: o._id,
          items: o.items,
          total: o.totalAmount, // Map totalAmount to total for UI compatibility
          deliveryStatus: o.status,
          paymentStatus: o.paymentStatus || (o.paymentMethod === 'cod' ? 'Pending' : 'Paid'),
          createdAt: o.createdAt
        }));
      } catch (_) {
        // Fallback to LocalStorage if API fails
        const orders = readJSON('eagriOrders', []);
        return orders.map(o => ({
          id: o._id || o.id,
          items: o.items,
          total: o.totalAmount,
          deliveryStatus: o.status,
          paymentStatus: o.paymentStatus || (o.paymentMethod === 'cod' ? 'Pending' : 'Paid'),
          createdAt: o.createdAt
        }));
      }
    },

    async updateOrderStatus(orderId, status) {
      // 1. Try to update via API if token exists
      const token = getAuthToken();
      if (token) {
        try {
          const res = await fetch(API_BASE + '/api/orders/' + orderId + '/status', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token,
            },
            body: JSON.stringify({ status }),
          });
          if (res.ok) {
            const data = await res.json();
            return data;
          }
        } catch (e) {
          console.warn('API update failed, trying localStorage...', e);
        }
      }

      // 2. Fallback to LocalStorage (eagriOrders)
      const orders = readJSON('eagriOrders', []);
      const orderIdx = orders.findIndex(o => (o._id === orderId || o.id === orderId));
      if (orderIdx > -1) {
        orders[orderIdx].status = status;
        
        // Add to timeline
        if (!orders[orderIdx].timeline) orders[orderIdx].timeline = [];
        const labelMap = {
          'pending': 'Order Placed',
          'confirmed': 'Order Confirmed',
          'packed': 'Packed',
          'shipped': 'Shipped',
          'out_for_delivery': 'Out for Delivery',
          'delivered': 'Delivered'
        };
        
        // Only add if not already there or if status changed
        const exists = orders[orderIdx].timeline.find(t => t.status === status);
        if (!exists) {
          orders[orderIdx].timeline.push({
            status: status,
            label: labelMap[status] || status,
            time: new Date().toISOString(),
            completed: true
          });
        }
        
        writeJSON('eagriOrders', orders);
        return { success: true, status };
      }
      
      throw new Error('Order not found');
    },

    // Tracking Utilities
    getOrderTrackingConfig(status) {
      const configs = {
        'pending': { progress: '10%', color: 'yellow', label: 'Pending' },
        'confirmed': { progress: '25%', color: 'blue', label: 'Confirmed' },
        'packed': { progress: '40%', color: 'blue', label: 'Packed' },
        'shipped': { progress: '60%', color: 'purple', label: 'Shipped' },
        'out_for_delivery': { progress: '85%', color: 'orange', label: 'Out for Delivery' },
        'delivered': { progress: '100%', color: 'green', label: 'Delivered' }
      };
      return configs[status] || configs['pending'];
    },

    getStatusColorClass(status) {
      const colors = {
        'pending': 'bg-warning-light/20 text-warning-dark',
        'confirmed': 'bg-info-light/20 text-info-dark',
        'packed': 'bg-info-light/20 text-info-dark',
        'shipped': 'bg-purple-100 text-purple-700',
        'out_for_delivery': 'bg-orange-100 text-orange-700',
        'delivered': 'bg-success-light/20 text-success-dark'
      };
      return colors[status] || 'bg-surface-elevated text-text-secondary';
    },

    getOrderTimelineSteps(order) {
      const stages = [
        { status: 'pending', label: 'Order Placed' },
        { status: 'confirmed', label: 'Order Confirmed' },
        { status: 'packed', label: 'Packed' },
        { status: 'shipped', label: 'Shipped' },
        { status: 'out_for_delivery', label: 'Out for Delivery' },
        { status: 'delivered', label: 'Delivered' }
      ];
      
      const timeline = order.timeline || [];
      return stages.map(stage => {
        const history = timeline.find(h => h.status === stage.status);
        return {
          ...stage,
          completed: !!history,
          time: history ? this.formatDate(history.time) : null
        };
      });
    },

    initCartBadges() {
      const update = () => {
        const count = this.getCartCount();
        document.querySelectorAll('#cart-count-desktop, #cart-count-mobile, [data-cart-count]').forEach((el) => {
          if (el) el.textContent = String(count);
        });
      };
      update();
      window.addEventListener('eagri-cart-change', update);
    },

    initMobileMenu() {
      const btn = document.getElementById('mobile-menu-btn');
      const menu = document.getElementById('mobile-menu');
      if (!btn || !menu) return;
      btn.addEventListener('click', () => menu.classList.toggle('hidden'));
      document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add('hidden');
      });
    },

    formatDate(iso) {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return iso;
      }
    },

    escapeHtml(s) {
      if (s == null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    toast(message, type) {
      showToast(message, type);
    },

    // ---------- Product Details ----------
    async getProductById(productId) {
      try {
        const res = await fetch(API_BASE + '/api/products/' + productId);
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error('Failed to fetch product');
        }
        const p = await res.json();
        return {
          id: p._id || p.id,
          name: p.name || 'Product',
          price: parseFloat(p.price) || 0,
          stock: parseInt(p.stock, 10) || 0,
          image: p.image || FALLBACK_IMG,
          category: p.category || 'General',
          description: p.description || '',
          farmer: p.farmerName || (p.farmer && p.farmer.name) || 'Farmer',
          farmerId: p.farmerId || (p.farmer && (p.farmer._id || p.farmer.id)) || '',
          farmerLocation: p.farmerLocation || '',
          farmingDetails: p.farmingDetails || {},
          reviews: p.reviews || [],
          availability: p.availability !== false,
        };
      } catch (err) {
        console.error('getProductById error:', err);
        // Fallback: try from getProducts list
        const all = await this.getProducts();
        return all.find(p => p.id === productId) || null;
      }
    },

    // ---------- Reviews ----------
    async submitReview(productId, rating, comment) {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated. Please log in to submit a review.');
      const res = await fetch(API_BASE + '/api/products/' + productId + '/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');
      return data;
    },

    // ---------- Wishlist ----------
    async getWishlist() {
      const token = getAuthToken();
      if (!token) return [];
      try {
        const res = await fetch(API_BASE + '/api/profile/wishlist', {
          headers: { 'x-auth-token': token },
        });
        if (!res.ok) return [];
        return await res.json();
      } catch (_) {
        return [];
      }
    },

    async toggleWishlist(productId) {
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated. Please log in.');
      const res = await fetch(API_BASE + '/api/profile/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update wishlist');
      return data;
    },

    async isInWishlist(productId) {
      const wishlist = await this.getWishlist();
      return wishlist.some(w => (w.productId === productId || (w.productId && w.productId.toString() === productId)));
    },

    applyTheme: applyThemeFromSettings,
    applyLanguage: applyLanguageFromSettings,
  };

  window.EAgri = EAgri;
})();
