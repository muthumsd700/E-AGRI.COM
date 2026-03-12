/**
 * E-Agri Commerce - Settings Module
 * Connected to backend API. Profile, address, password sync with server.
 * Language, theme, notifications, privacy, payment remain in localStorage (client prefs).
 */

(function () {
    'use strict';

    const API_BASE = window.EAGRI_API_BASE || 'http://localhost:5000';
    const STORAGE_KEYS = {
        USER: 'eagriUser',
        SETTINGS: 'eagriSettings',
    };

    const DEFAULT_SETTINGS = {
        language: 'en',
        theme: 'system',
        notificationsEmail: true,
        notificationsOrders: true,
        notificationsPromos: false,
        notificationsDelivery: true,
        privacyVisibility: 'public',
        privacyContactConsumers: true,
        privacyRecommendations: true,
        security2FA: false,
        paymentMethods: [],
    };

    /** Cached profile from API (name, email, role, phone, address, addresses, defaultAddressId, profilePhoto) */
    let currentUser = null;

    // ---------- Validation ----------
    function validatePhone(phone) {
        const clean = phone.replace(/\D/g, '');
        return clean.length === 10;
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validateUPI(upi) {
        const re = /^[^\s@]+@[^\s@]+$/;
        return re.test(upi);
    }

    function validateCardNumber(number) {
        const clean = number.replace(/\D/g, '');
        return clean.length >= 12 && clean.length <= 19;
    }

    function validatePincode(pincode) {
        return /^\d{6}$/.test(pincode);
    }

    // ---------- API ----------
    function getToken() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.USER);
            const user = raw ? JSON.parse(raw) : null;
            return user && user.token ? user.token : null;
        } catch (_) { return null; }
    }

    function syncUserToStorage(user) {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
            ...existing,
            token: existing.token,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address,
            addresses: user.addresses || existing.addresses || [],
            defaultAddressId: user.defaultAddressId || existing.defaultAddressId || '',
            profilePhoto: user.profilePhoto || existing.profilePhoto || '',
        }));
    }

    async function apiFetchProfile() {
        const token = getToken();
        if (!token) {
            // Fallback to local storage if no token
            const user = getStoredUser();
            currentUser = user;
            try { window.dispatchEvent(new CustomEvent('eagri-profile-loaded', { detail: { user } })); } catch (_) {}
            return user;
        }
        
        try {
            const res = await fetch(API_BASE + '/api/profile/profile', {
                headers: { 'x-auth-token': token },
            });
            
            if (!res.ok) {
                // Ignore API 401 in pure frontend context, fallback to localStorage
                console.warn('Profile API failed, falling back to local user data');
                const user = getStoredUser();
                currentUser = user;
                try { window.dispatchEvent(new CustomEvent('eagri-profile-loaded', { detail: { user } })); } catch (_) {}
                return user;
            }
            
            const user = await res.json();
            if (!user.addresses && user.address && user.address.city) {
                user.addresses = [{
                    id: 'addr_legacy',
                    fullName: user.name,
                    phone: user.phone,
                    addressLine: user.address.houseStreet || '',
                    city: user.address.city,
                    state: user.address.state || '',
                    pincode: user.address.pincode || '',
                }];
                user.defaultAddressId = user.addresses[0].id;
            }
            user.addresses = user.addresses || [];
            currentUser = user;
            syncUserToStorage(user);
            try {
                window.dispatchEvent(new CustomEvent('eagri-profile-loaded', { detail: { user } }));
            } catch (_) {}
            return user;
        } catch (e) {
            console.warn('Profile API failed, falling back to local user data', e);
            const user = getStoredUser();
            currentUser = user;
            try { window.dispatchEvent(new CustomEvent('eagri-profile-loaded', { detail: { user } })); } catch (_) {}
            return user;
        }
    }

    async function apiUpdateProfile(payload) {
        const token = getToken();
        
        // Always update local storage first/fallback
        currentUser = { ...getStoredUser(), ...payload };
        syncUserToStorage(currentUser);
        
        if (!token) {
            return currentUser;
        }
        
        try {
            const res = await fetch(API_BASE + '/api/profile/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.name || data.phone || data.profilePhoto) {
                    currentUser = { ...currentUser, ...data };
                    syncUserToStorage(currentUser);
                }
                return data;
            }
        } catch (e) {
            console.warn('Profile API update failed, local storage was updated', e);
        }
        return currentUser;
    }

    async function apiUpdatePassword(currentPassword, newPassword) {
        const token = getToken();
        if (!token) return;
        const res = await fetch(API_BASE + '/api/profile/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Password update failed');
    }

    // ---------- Storage (client-only settings) ----------
    function getStoredUser() {
        if (currentUser) return currentUser;
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.USER);
            return raw ? JSON.parse(raw) : {};
        } catch (_) {}
        return {};
    }

    function getStoredSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
        } catch (_) {}
        return { ...DEFAULT_SETTINGS };
    }

    function setStoredSettings(data) {
        const current = getStoredSettings();
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...data }));
    }

    function getDefaultAddressId() {
        return (currentUser && currentUser.defaultAddressId) || null;
    }

    function setDefaultAddressId(id) {
        if (!currentUser) return;
        currentUser.defaultAddressId = id || '';
    }

    // ---------- Toast ----------
    function toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.setAttribute('role', 'alert');
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(1rem)';
            el.style.transition = 'opacity 0.2s, transform 0.2s';
            setTimeout(() => el.remove(), 200);
        }, 3000);
    }

    // ---------- Modal ----------
    function confirmModal(message, onConfirm) {
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');
        if (!overlay || !msgEl) return;

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        title.textContent = 'Confirm';
        msgEl.textContent = message;
        confirmBtn.textContent = 'Confirm';

        function close() {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            cancelBtn.removeEventListener('click', close);
            confirmBtn.removeEventListener('click', handleConfirm);
        }

        function handleConfirm() {
            if (typeof onConfirm === 'function') onConfirm();
            close();
        }

        cancelBtn.addEventListener('click', close);
        confirmBtn.addEventListener('click', handleConfirm);
    }

    // ---------- i18n ----------
    // Translations have been moved to app.js for global access
    
    function getLang() {
        const settings = getStoredSettings();
        return (settings.language || 'en');
    }

    // Call the global function
    function applyTranslations() {
        if (window.EAgri && typeof window.EAgri.applyLanguage === 'function') {
            window.EAgri.applyLanguage();
        }
    }

    // ---------- Theme ----------
    function applyTheme() {
        if (window.EAgri && typeof window.EAgri.applyTheme === 'function') {
            window.EAgri.applyTheme();
        }
    }

    function initTheme() {
        applyTheme();
        try {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = function () {
                const s = getStoredSettings();
                if (s.theme === 'system') applyTheme();
            };
            if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
            else if (typeof mq.addListener === 'function') mq.addListener(handler);
        } catch (_) {}
    }

    // ---------- Role ----------
    function getRole() {
        const user = getStoredUser();
        const role = (user.role || '').toLowerCase();
        return role === 'farmer' ? 'farmer' : 'consumer';
    }

    function applyRoleUI() {
        const role = getRole();
        // Elements explicitly marked as farmer-only or consumer-only
        document.querySelectorAll('[data-role-only="farmer"]').forEach(function (el) {
            el.style.display = role === 'farmer' ? '' : 'none';
        });
        document.querySelectorAll('[data-role-only="consumer"]').forEach(function (el) {
            el.style.display = role === 'consumer' ? '' : 'none';
        });

        // Role-based settings navigation / sections
        applyRoleSettings(role);
    }

    function applyRoleSettings(role) {
        const farmerSections = ['profile', 'address', 'products', 'payment', 'notifications', 'privacy', 'language'];
        const consumerSections = ['profile', 'address', 'orders', 'cart', 'notifications', 'privacy', 'language', 'payment'];
        const visible = (role === 'farmer') ? farmerSections : consumerSections;

        // Show only relevant nav items
        document.querySelectorAll('.settings-nav-item[data-section]').forEach(function (el) {
            const id = el.getAttribute('data-section');
            el.style.display = visible.indexOf(id) !== -1 ? '' : 'none';
        });

        // Update labels based on role
        const addressNav = document.querySelector('.settings-nav-item[data-section="address"] span[data-i18n="nav_address"]');
        if (addressNav) {
            addressNav.textContent = role === 'farmer' ? 'Farm Address' : 'Delivery Address';
        }
        const addressTitle = document.querySelector('#content-address [data-i18n="address_title"]');
        const addressSubtitle = document.querySelector('#content-address [data-i18n="address_subtitle"]');
        if (addressTitle) {
            addressTitle.textContent = role === 'farmer' ? 'Farm Address' : 'Delivery Address';
        }
        if (addressSubtitle) {
            addressSubtitle.textContent = role === 'farmer'
                ? 'Manage the primary address for your farm deliveries.'
                : 'Manage your saved delivery addresses.';
        }

        const paymentNav = document.querySelector('.settings-nav-item[data-section="payment"] span[data-i18n="nav_payment"]');
        if (paymentNav) {
            paymentNav.textContent = role === 'farmer' ? 'Bank / Payment Details' : 'Payment Methods';
        }
        const paymentTitle = document.querySelector('#content-payment [data-i18n="payment_title"]');
        if (paymentTitle) {
            paymentTitle.textContent = role === 'farmer' ? 'Bank & Payment Details' : 'Payment Methods';
        }

        const privacyNav = document.querySelector('.settings-nav-item[data-section="privacy"] span[data-i18n="nav_privacy"]');
        if (privacyNav) {
            privacyNav.textContent = 'Privacy & Security';
        }

        // Ensure we start on a visible section
        const current = document.querySelector('.settings-nav-item.active[data-section]');
        const currentId = current ? current.getAttribute('data-section') : null;
        const target = visible.indexOf(currentId) !== -1 ? currentId : visible[0];
        if (target) {
            showSection(target);
        }
    }

    // ---------- Sidebar & Navigation ----------
    function setSidebarOpen(isOpen) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebar-toggle');
        if (!sidebar) return;
        const open = !!isOpen;
        sidebar.classList.toggle('open', open);
        if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && window.innerWidth < 1024) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }
    }

    function showSection(sectionId) {
        document.querySelectorAll('.settings-section').forEach(function (el) {
            el.classList.toggle('hidden', el.id !== 'content-' + sectionId);
        });
        document.querySelectorAll('.settings-nav-item').forEach(function (el) {
            const isActive = el.getAttribute('data-section') === sectionId;
            el.classList.toggle('active', isActive);
            el.setAttribute('aria-current', isActive ? 'page' : null);
        });
        // Update breadcrumb
        const breadcrumbEl = document.getElementById('breadcrumb-current');
        if (breadcrumbEl) {
            const sectionNames = {
                profile: 'Profile',
                account: 'Account',
                address: 'Address',
                language: 'Language',
                appearance: 'Appearance',
                notifications: 'Notifications',
                privacy: 'Privacy',
                security: 'Security',
                payment: 'Payment Methods'
            };
            breadcrumbEl.textContent = sectionNames[sectionId] || 'Settings';
        }
        setSidebarOpen(false);
    }

    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');

        document.querySelectorAll('.settings-nav-item[data-section]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showSection(btn.getAttribute('data-section'));
            });
        });
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.addEventListener('click', function () {
                if (!sidebar) return;
                const isOpen = sidebar.classList.contains('open');
                setSidebarOpen(!isOpen);
            });
        }
        const closeBtn = document.getElementById('sidebar-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '../pages/home_landing.html';
                }
            });
        }
        document.getElementById('logout-link')?.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem(STORAGE_KEYS.USER);
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);
            window.location.href = '../pages/login.html';
        });
        document.querySelectorAll('a[href^="#content-"]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                const id = a.getAttribute('href').replace('#content-', '');
                if (id) showSection(id);
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        });

        document.addEventListener('click', function (e) {
            if (!sidebar || !sidebar.classList.contains('open')) return;
            if (sidebar.contains(e.target) || (toggleBtn && toggleBtn.contains(e.target))) return;
            setSidebarOpen(false);
        });
    }

    // ---------- Profile ----------
    function renderProfile() {
        const user = getStoredUser();
        const name = user.name || 'User';
        const roleRaw = (user.role || 'consumer').toLowerCase();
        const role = roleRaw === 'farmer' ? 'Farmer' : 'Consumer';
        const email = user.email || '';
        const phone = user.phone || '';
        const farmerProfile = (window.EAgri && typeof window.EAgri.getFarmerProfile === 'function')
            ? window.EAgri.getFarmerProfile()
            : null;

        document.getElementById('profile-display-name').textContent = name;
        document.getElementById('profile-display-role').textContent = role;
        document.getElementById('profile-display-email').textContent = email;
        document.getElementById('profile-name').value = name;
        document.getElementById('profile-phone').value = phone;
        document.getElementById('profile-email').value = email;
        document.getElementById('profile-role-badge').textContent = role;

        const expInput = document.getElementById('profile-experience');
        const farmSizeInput = document.getElementById('profile-farm-size');
        if (expInput) {
            expInput.value = farmerProfile && typeof farmerProfile.experience === 'string'
                ? farmerProfile.experience
                : '';
        }
        if (farmSizeInput) {
            farmSizeInput.value = farmerProfile && typeof farmerProfile.farmSize === 'string'
                ? farmerProfile.farmSize
                : '';
        }

        const initials = name.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
        const avatarContainer = document.getElementById('profile-avatar');
        const img = document.getElementById('profile-photo-img');
        const initEl = document.getElementById('profile-initials');

        if (user.profilePhoto) {
            if (img) {
                img.src = user.profilePhoto;
                img.classList.remove('hidden');
            }
            if (initEl) initEl.classList.add('hidden');
            if (avatarContainer) avatarContainer.classList.remove('hidden');
        } else {
            if (avatarContainer) avatarContainer.classList.add('hidden');
        }
    }

    function initProfile() {
        renderProfile();
        document.getElementById('form-profile')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('profile-name').value.trim();
            const phone = document.getElementById('profile-phone').value.trim();
            const experienceInput = document.getElementById('profile-experience');
            const farmSizeInput = document.getElementById('profile-farm-size');
            const experience = experienceInput ? experienceInput.value.trim() : '';
            const farmSize = farmSizeInput ? farmSizeInput.value.trim() : '';

            // Validation
            if (!name) {
                toast('Name is required.', 'error');
                return;
            }
            if (!validatePhone(phone)) {
                toast('Phone must be 10 digits.', 'error');
                return;
            }

            // Loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                await apiUpdateProfile({ name, phone });
                if (window.EAgri && typeof window.EAgri.setFarmerProfile === 'function') {
                    const update = {};
                    if (experience) update.experience = experience;
                    if (farmSize) update.farmSize = farmSize;
                    if (Object.keys(update).length) {
                        window.EAgri.setFarmerProfile(update);
                    }
                }
                renderProfile();
                toast('Profile saved.', 'success');
            } catch (err) {
                toast(err.message || 'Failed to save profile.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
        document.getElementById('profile-photo-input')?.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Basic validation
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast('File size too large. Max 5MB.', 'error');
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast('Please select an image file.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = async function () {
                // Loading state
                const uploadBtn = document.querySelector('.profile-photo-upload-btn');
                if (uploadBtn) {
                    uploadBtn.disabled = true;
                    uploadBtn.textContent = 'Uploading...';
                }

                try {
                    await apiUpdateProfile({ profilePhoto: reader.result });
                    renderProfile();
                    toast('Profile photo updated.', 'success');
                } catch (err) {
                    toast(err.message || 'Failed to update photo.', 'error');
                } finally {
                    if (uploadBtn) {
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = 'Upload Photo';
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // ---------- Account ----------
    function renderAccount() {
        const user = getStoredUser();
        document.getElementById('account-name').textContent = user.name || '—';
        document.getElementById('account-email').textContent = user.email || '—';
        document.getElementById('account-phone').textContent = user.phone || '—';
        document.getElementById('account-role').textContent = user.role || '—';
    }

    function initAccount() {
        renderAccount();
        document.getElementById('form-account-password')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const current = document.getElementById('account-current-password').value;
            const newPw = document.getElementById('account-new-password').value;
            const confirm = document.getElementById('account-confirm-password').value;

            // Validation
            if (!current) {
                toast('Current password is required.', 'error');
                return;
            }
            if (newPw.length < 6) {
                toast('New password must be at least 6 characters.', 'error');
                return;
            }
            if (newPw !== confirm) {
                toast('Passwords do not match.', 'error');
                return;
            }

            // Loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            try {
                await apiUpdatePassword(current, newPw);
                document.getElementById('form-account-password').reset();
                toast('Password updated.', 'success');
            } catch (err) {
                toast(err.message || 'Failed to update password.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
        document.getElementById('btn-delete-account')?.addEventListener('click', function () {
            confirmModal('Are you sure you want to delete your account? All data will be removed. This cannot be undone.', function () {
                localStorage.removeItem(STORAGE_KEYS.USER);
                localStorage.removeItem(STORAGE_KEYS.SETTINGS);
                toast('Account deleted.', 'info');
                setTimeout(function () {
                    window.location.href = '../pages/login.html';
                }, 500);
            });
        });
    }

    // ---------- Address ----------
    function getAddresses() {
        return (currentUser && currentUser.addresses ? currentUser.addresses : []).slice();
    }

    async function saveAddressesToApi(list, defaultId) {
        if (!currentUser) return;
        await apiUpdateProfile({
            addresses: list,
            defaultAddressId: defaultId || (list[0] ? list[0].id : ''),
        });
        currentUser.addresses = list;
        currentUser.defaultAddressId = defaultId || (list[0] ? list[0].id : '');
    }

    function renderAddressList() {
        const list = getAddresses();
        const defaultId = getDefaultAddressId();
        const container = document.getElementById('address-list');
        if (!container) return;
        if (list.length === 0) {
            container.innerHTML = '<p class="text-text-tertiary text-sm" data-i18n="address_none">No addresses saved yet.</p>';
            applyTranslations();
            return;
        }
        container.innerHTML = list.map(function (addr) {
            const isDefault = addr.id === defaultId;
            const line = [addr.addressLine, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
            return (
                '<div class="address-card ' + (isDefault ? 'default' : '') + '" data-address-id="' + addr.id + '">' +
                (isDefault ? '<span class="text-xs font-medium text-primary mb-1" data-i18n="address_default">Default</span>' : '') +
                '<p class="font-medium">' + escapeHtml(addr.fullName || '') + ' · ' + escapeHtml(addr.phone || '') + '</p>' +
                '<p class="text-sm text-text-secondary mt-1">' + escapeHtml(line) + '</p>' +
                '<div class="flex gap-2 mt-3">' +
                '<button type="button" class="address-edit-btn text-sm text-primary hover:underline" data-id="' + addr.id + '" aria-label="Edit address for ' + escapeHtml(addr.fullName) + '">Edit</button>' +
                '<button type="button" class="address-delete-btn text-sm text-error hover:underline" data-id="' + addr.id + '" aria-label="Delete address for ' + escapeHtml(addr.fullName) + '">Delete</button>' +
                (isDefault ? '' : '<button type="button" class="address-default-btn text-sm text-primary hover:underline" data-id="' + addr.id + '" aria-label="Set as default address for ' + escapeHtml(addr.fullName) + '">Set as default</button>') +
                '</div></div>'
            );
        }).join('');
        container.querySelectorAll('.address-edit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { startEditAddress(btn.getAttribute('data-id')); });
        });
        container.querySelectorAll('.address-delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { deleteAddress(btn.getAttribute('data-id')); });
        });
        container.querySelectorAll('.address-default-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { setDefaultAddress(btn.getAttribute('data-id')); });
        });
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function startEditAddress(id) {
        const list = getAddresses();
        const addr = list.find(function (a) { return a.id === id; });
        if (!addr) return;
        document.getElementById('address-edit-id').value = id;
        document.getElementById('address-fullname').value = addr.fullName || '';
        document.getElementById('address-phone').value = addr.phone || '';
        document.getElementById('address-line').value = addr.addressLine || '';
        document.getElementById('address-city').value = addr.city || '';
        document.getElementById('address-state').value = addr.state || '';
        document.getElementById('address-pincode').value = addr.pincode || '';
        document.getElementById('address-submit-btn').textContent = document.querySelector('[data-i18n="address_save"]')?.textContent || 'Update';
        document.getElementById('address-cancel-edit').classList.remove('hidden');
    }

    function deleteAddress(id) {
        confirmModal('Delete this address?', async function () {
            let list = getAddresses().filter(function (a) { return a.id !== id; });
            const newDefault = getDefaultAddressId() === id ? (list[0] ? list[0].id : null) : getDefaultAddressId();
            try {
                await saveAddressesToApi(list, newDefault);
                renderAddressList();
                toast('Address deleted.', 'success');
            } catch (err) {
                toast(err.message || 'Failed to delete address.', 'error');
            }
        });
    }

    function setDefaultAddress(id) {
        setDefaultAddressId(id);
        saveAddressesToApi(getAddresses(), id).then(function () {
            renderAddressList();
            toast('Default address updated.', 'success');
        }).catch(function (err) {
            toast(err.message || 'Failed to update.', 'error');
        });
    }

    function initAddress() {
        renderAddressList();
        document.getElementById('form-address')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const editId = document.getElementById('address-edit-id').value;
            const payload = {
                id: editId || 'addr_' + Date.now(),
                fullName: document.getElementById('address-fullname').value.trim(),
                phone: document.getElementById('address-phone').value.trim(),
                addressLine: document.getElementById('address-line').value.trim(),
                city: document.getElementById('address-city').value.trim(),
                state: document.getElementById('address-state').value.trim(),
                pincode: document.getElementById('address-pincode').value.trim(),
            };

            // Validation
            if (!payload.fullName) {
                toast('Full name is required.', 'error');
                return;
            }
            if (!validatePhone(payload.phone)) {
                toast('Phone must be 10 digits.', 'error');
                return;
            }
            if (!payload.addressLine) {
                toast('Address line is required.', 'error');
                return;
            }
            if (!payload.city) {
                toast('City is required.', 'error');
                return;
            }
            if (!payload.state) {
                toast('State is required.', 'error');
                return;
            }
            if (!validatePincode(payload.pincode)) {
                toast('Pincode must be 6 digits.', 'error');
                return;
            }

            let list = getAddresses();
            const idx = list.findIndex(function (a) { return a.id === payload.id; });
            if (idx >= 0) list[idx] = payload;
            else {
                if (list.length === 0) payload.id = payload.id || 'addr_' + Date.now();
                list.push(payload);
            }
            const defaultId = getDefaultAddressId() || (list[0] ? list[0].id : '');

            // Loading state
            const submitBtn = document.getElementById('address-submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                await saveAddressesToApi(list, defaultId || list[0].id);
                document.getElementById('form-address').reset();
                document.getElementById('address-edit-id').value = '';
                document.getElementById('address-cancel-edit').classList.add('hidden');
                document.getElementById('address-submit-btn').textContent = document.querySelector('[data-i18n="address_save"]')?.textContent || 'Save Address';
                renderAddressList();
                toast('Address saved.', 'success');
            } catch (err) {
                toast(err.message || 'Failed to save address.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
        document.getElementById('address-cancel-edit')?.addEventListener('click', function () {
            document.getElementById('form-address').reset();
            document.getElementById('address-edit-id').value = '';
            document.getElementById('address-cancel-edit').classList.add('hidden');
            document.getElementById('address-submit-btn').textContent = document.querySelector('[data-i18n="address_save"]')?.textContent || 'Save Address';
        });
    }

    // ---------- Language ----------
    function initLanguage() {
        const select = document.getElementById('language-select');
        if (!select) return;
        select.value = getLang();
        select.addEventListener('change', function () {
            const lang = select.value;
            setStoredSettings({ language: lang });
            applyTranslations();
            toast('Language updated.', 'success');
        });
    }

    // ---------- Appearance ----------
    function initAppearance() {
        const theme = getStoredSettings().theme || 'system';
        const radio = document.querySelector('input[name="theme"][value="' + theme + '"]');
        if (radio) radio.checked = true;
        document.querySelectorAll('input[name="theme"]').forEach(function (r) {
            r.addEventListener('change', function () {
                setStoredSettings({ theme: r.value });
                applyTheme();
                toast('Theme saved.', 'success');
            });
        });
    }

    // ---------- Toggles (Notifications, Privacy, Security 2FA) ----------
    function getToggleState(key) {
        const s = getStoredSettings();
        return !!s[key];
    }

    function setToggleState(key, value) {
        setStoredSettings({ [key]: value });
    }

    function renderToggles() {
        document.querySelectorAll('.toggle-btn[data-setting]').forEach(function (btn) {
            const key = btn.getAttribute('data-setting');
            const on = getToggleState(key);
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    }

    function initToggles() {
        renderToggles();
        document.querySelectorAll('.toggle-btn[data-setting]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const key = btn.getAttribute('data-setting');
                const next = !getToggleState(key);
                setToggleState(key, next);
                btn.setAttribute('aria-checked', next ? 'true' : 'false');
                toast('Setting saved.', 'success');
            });
        });
    }

    // ---------- Privacy (visibility select) ----------
    function initPrivacy() {
        const vis = document.getElementById('privacy-visibility');
        if (vis) {
            vis.value = getStoredSettings().privacyVisibility || 'public';
            vis.addEventListener('change', function () {
                setStoredSettings({ privacyVisibility: vis.value });
                toast('Privacy updated.', 'success');
            });
        }
    }

    // ---------- Security (activity placeholder) ----------
    function initSecurity() {
        const el = document.getElementById('security-activity-now');
        if (el) el.textContent = new Date().toLocaleString();
    }

    // ---------- Payment ----------
    function getPaymentMethods() {
        return (getStoredSettings().paymentMethods || []).slice();
    }

    function setPaymentMethods(list) {
        setStoredSettings({ paymentMethods: list });
    }

    function renderPaymentList() {
        const list = getPaymentMethods();
        const container = document.getElementById('payment-list');
        if (!container) return;
        if (list.length === 0) {
            container.innerHTML = '<p class="text-text-tertiary text-sm" data-i18n="payment_none">No payment methods saved.</p>';
            applyTranslations();
            return;
        }
        container.innerHTML = list.map(function (pm) {
            const label = pm.type === 'upi' ? 'UPI: ' + (pm.upiId || '') : 'Card ****' + (pm.lastFour || '');
            return '<div class="payment-card"><span class="font-medium">' + escapeHtml(label) + '</span><button type="button" class="payment-remove text-sm text-error hover:underline" data-id="' + pm.id + '" aria-label="Remove ' + (pm.type === 'upi' ? 'UPI' : 'card') + ' payment method">Remove</button></div>';
        }).join('');
        container.querySelectorAll('.payment-remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const list = getPaymentMethods().filter(function (p) { return p.id !== btn.getAttribute('data-id'); });
                setPaymentMethods(list);
                renderPaymentList();
                toast('Payment method removed.', 'success');
            });
        });
    }

    function initPayment() {
        document.querySelectorAll('input[name="payment-type"]').forEach(function (r) {
            r.addEventListener('change', function () {
                document.getElementById('payment-upi-fields').classList.toggle('hidden', r.value !== 'upi');
                document.getElementById('payment-card-fields').classList.toggle('hidden', r.value !== 'card');
            });
        });
        document.getElementById('form-payment')?.addEventListener('submit', function (e) {
            e.preventDefault();
            const type = document.querySelector('input[name="payment-type"]:checked')?.value || 'upi';
            const id = 'pay_' + Date.now();
            if (type === 'upi') {
                const upiId = document.getElementById('payment-upi').value.trim();
                if (!validateUPI(upiId)) {
                    toast('Enter valid UPI ID (e.g., name@upi).', 'error');
                    return;
                }
                setPaymentMethods(getPaymentMethods().concat([{ id, type: 'upi', upiId }]));
                document.getElementById('payment-upi').value = '';
            } else {
                const number = document.getElementById('payment-card-number').value.replace(/\s/g, '');
                const exp = document.getElementById('payment-card-exp').value;
                const cvv = document.getElementById('payment-card-cvv').value;
                if (!validateCardNumber(number)) {
                    toast('Enter valid card number (12-19 digits).', 'error');
                    return;
                }
                if (!exp || !/^\d{2}\/\d{2}$/.test(exp)) {
                    toast('Enter valid expiry date (MM/YY).', 'error');
                    return;
                }
                if (!cvv || cvv.length < 3) {
                    toast('Enter valid CVV.', 'error');
                    return;
                }
                setPaymentMethods(getPaymentMethods().concat([{ id, type: 'card', lastFour: number.slice(-4), exp, cvv: '***' }]));
                document.getElementById('payment-card-number').value = '';
                document.getElementById('payment-card-exp').value = '';
                document.getElementById('payment-card-cvv').value = '';
            }
            renderPaymentList();
            toast('Payment method saved.', 'success');
        });
        renderPaymentList();
    }

    // ---------- Export default address for Cart/Checkout ----------
    function getDefaultAddress() {
        const id = getDefaultAddressId();
        const list = getAddresses();
        if (id) return list.find(function (a) { return a.id === id; }) || list[0];
        return list[0] || null;
    }

    // Expose for cart/checkout pages to read
    window.EAgriSettings = {
        getStoredUser: getStoredUser,
        getStoredSettings: getStoredSettings,
        getAddresses: getAddresses,
        getDefaultAddress: getDefaultAddress,
        getDefaultAddressId: getDefaultAddressId,
    };

    // ---------- Init ----------
    async function init() {
        initTheme();
        applyTranslations();
        initSidebar();
        if (window.EAgri) {
            window.EAgri.initCartBadges();
            window.EAgri.initMobileMenu();
        }
        initLanguage();
        initAppearance();
        initToggles();
        initPrivacy();
        initSecurity();
        initPayment();

        const user = await apiFetchProfile();
        if (!user) return;

        applyRoleUI();
        initProfile();
        initAccount();
        initAddress();
        showSection('profile');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }
})();
