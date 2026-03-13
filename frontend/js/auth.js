/**
 * E-Agri Commerce - Shared Auth, Validation, & Navigation
 * Included on every page.
 */
(function () {
    'use strict';

    var USER_KEY = 'eagriUser';

    // --- Core user retrieval ---
    function getUser() {
        try {
            var raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    // --- Role-based Navigation & Auth Toggles ---
    function applyRoleNav() {
        var user = getUser();
        var role = user ? user.role : null; // 'farmer' | 'consumer' | null

        // Dashboard links based on role
        var roleElements = document.querySelectorAll('[data-role]');
        for (var i = 0; i < roleElements.length; i++) {
            var el = roleElements[i];
            var elRole = el.getAttribute('data-role');
            if (!role) {
                el.style.display = 'none';
            } else if (elRole === role) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        }

        // Login / User Info toggle
        var loginBtns = document.querySelectorAll('.auth-login-btn');
        var userInfos = document.querySelectorAll('.auth-user-info');

        for (var j = 0; j < loginBtns.length; j++) {
            loginBtns[j].style.display = user ? 'none' : '';
        }
        for (var k = 0; k < userInfos.length; k++) {
            if (user) {
                userInfos[k].style.display = '';
                var nameEl = userInfos[k].querySelector('.auth-user-name');
                if (nameEl) nameEl.textContent = user.name || 'User';
            } else {
                userInfos[k].style.display = 'none';
            }
        }

        // Logout buttons
        var logoutBtns = document.querySelectorAll('.auth-logout-btn');
        for (var l = 0; l < logoutBtns.length; l++) {
            logoutBtns[l].addEventListener('click', function (e) {
                e.preventDefault();
                localStorage.removeItem(USER_KEY);
                sessionStorage.removeItem(USER_KEY); // Clear both
                window.location.href = 'login.html';
            });
        }
    }

    // --- Global Mobile Menu Handler ---
    function initMobileMenu() {
        var btn = document.getElementById('mobile-menu-btn');
        var menu = document.getElementById('mobile-menu');
        if (!btn || !menu) return;

        btn.addEventListener('click', function() {
            menu.classList.toggle('hidden');
        });

        document.addEventListener('click', function(e) {
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }

    // --- Shared EAgriAuth Namespace ---
    window.EAgriAuth = {
        // Validation Utilities
        isValidEmail: function(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        isValidIndianPhone: function(phone) {
            var digits = phone.replace(/[\s\-+]/g, '');
            if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
            return /^[6-9][0-9]{9}$/.test(digits);
        },
        calculatePasswordStrength: function(pw) {
            var score = 0;
            if (pw.length >= 8) score++;
            if (/[A-Z]/.test(pw)) score++;
            if (/[0-9]/.test(pw)) score++;
            if (/[^A-Za-z0-9]/.test(pw)) score++;
            return pw.length === 0 ? 0 : Math.max(1, score);
        },

        // UI Utilities
        setLoadingState: function(btn, isLoading, defaultText) {
            if (!btn) return;
            if (isLoading) {
                btn.disabled = true;
                btn.innerHTML = '<span class="btn-spinner"></span> ' + (defaultText === 'Login' ? 'Logging in...' : 'Creating account...');
            } else {
                btn.disabled = false;
                btn.textContent = defaultText;
            }
        },
        setRedirectingState: function(btn) {
            if (!btn) return;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-spinner"></span> Redirecting...';
            btn.classList.add('bg-secondary', 'border-secondary', 'text-white');
            btn.classList.remove('bg-primary');
        },
        togglePasswordVisibility: function(btn, targetInput) {
            if (!btn || !targetInput) return;
            var isText = targetInput.type === 'text';
            targetInput.type = isText ? 'password' : 'text';
            btn.style.color = isText ? '#6b7280' : '#2D5016';
        },
        showFieldError: function(errId, msg) {
            var el = document.getElementById(errId);
            if (el) el.textContent = msg;
        },
        clearFieldError: function(errId) {
            var el = document.getElementById(errId);
            if (el) el.textContent = '';
        },
        showFormError: function(formErrId, msg) {
            var el = document.getElementById(formErrId);
            if (el) {
                el.textContent = msg;
                el.style.display = 'block';
            }
        },
        clearFormError: function(formErrId) {
            var el = document.getElementById(formErrId);
            if (el) el.style.display = 'none';
        },

        // Auth Storage 
        // rememberMe defaults to false if not provided
        saveSession: function(userObj, token, rememberMe) {
            var data = JSON.stringify({
                name: userObj.name,
                email: userObj.email,
                role: userObj.role,
                phone: userObj.phone,
                experience: userObj.experience,
                farmSize: userObj.farmSize,
                token: token
            });
            if (rememberMe) {
                localStorage.setItem(USER_KEY, data);
                sessionStorage.removeItem(USER_KEY);
            } else {
                sessionStorage.setItem(USER_KEY, data);
            }
        }
    };

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            applyRoleNav();
            initMobileMenu();
        });
    } else {
        applyRoleNav();
        initMobileMenu();
    }
})();

