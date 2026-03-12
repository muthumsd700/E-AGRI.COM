/**
 * E-Agri Commerce - Auth & Role-Based Navigation
 * Include this script on every page AFTER app.js.
 * Reads the logged-in user from localStorage ('eagriUser')
 * and shows/hides nav elements based on role.
 */
(function () {
    'use strict';

    var USER_KEY = 'eagriUser';

    function getUser() {
        try {
            var raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function applyRoleNav() {
        var user = getUser();
        var role = user ? user.role : null; // 'farmer' | 'consumer' | null

        // --- Show/hide dashboard links based on role ---
        var roleElements = document.querySelectorAll('[data-role]');
        for (var i = 0; i < roleElements.length; i++) {
            var el = roleElements[i];
            var elRole = el.getAttribute('data-role');
            if (!role) {
                // Not logged in: hide all role-specific elements
                el.style.display = 'none';
            } else if (elRole === role) {
                // Matches current role: show
                el.style.display = '';
            } else {
                // Different role: hide
                el.style.display = 'none';
            }
        }

        // --- Login / User Info toggle ---
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

        // --- Logout buttons ---
        var logoutBtns = document.querySelectorAll('.auth-logout-btn');
        for (var l = 0; l < logoutBtns.length; l++) {
            logoutBtns[l].addEventListener('click', function (e) {
                e.preventDefault();
                localStorage.removeItem(USER_KEY);
                window.location.href = 'login.html';
            });
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyRoleNav);
    } else {
        applyRoleNav();
    }
})();

