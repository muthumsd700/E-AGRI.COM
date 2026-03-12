/**
 * E-Agri Commerce - Admin Dashboard Frontend
 * Handles:
 * - Admin-only access checks
 * - Fetching summary metrics, users, and products
 * - Toggling user/product status
 */
(function () {
    'use strict';

    var USER_KEY = 'eagriUser';

    function getCurrentUser() {
        try {
            var raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function ensureAdminOrRedirect() {
        var user = getCurrentUser();
        if (!user || !user.token || user.role !== 'admin') {
            window.location.href = 'login.html';
            return null;
        }
        return user;
    }

    function getApiBase() {
        var isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        var sameOriginApi = isHttp && window.location.port === '5000';
        if (sameOriginApi) {
            return window.location.origin;
        }
        return window.EAGRI_API_BASE || 'http://localhost:5000';
    }

    function formatDate(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso);
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (_) {
            return iso;
        }
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = String(value);
    }

    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showSummaryStatus(msg, isError) {
        var el = document.getElementById('admin-summary-status');
        if (!el) return;
        el.textContent = msg || '';
        if (isError) {
            el.classList.add('text-warning');
        } else {
            el.classList.remove('text-warning');
        }
    }

    function renderRecentLists(summary) {
        var ordersContainer = document.getElementById('recent-orders-list');
        var usersContainer = document.getElementById('recent-users-list');

        if (ordersContainer) {
            var orders = Array.isArray(summary.recentOrders) ? summary.recentOrders : [];
            if (!orders.length) {
                ordersContainer.innerHTML = '<li class="text-text-tertiary text-sm">No recent orders found.</li>';
            } else {
                ordersContainer.innerHTML = orders.map(function (o) {
                    var status = esc(o.status || 'Placed');
                    var statusClass =
                        status === 'Delivered' ? 'bg-success/10 text-success' :
                            status === 'Shipped' ? 'bg-info/10 text-info' :
                                'bg-warning/10 text-warning';
                    return (
                        '<li class="flex justify-between items-center border-b border-border pb-2 last:border-b-0">' +
                        '<div class="min-w-0">' +
                        '<p class="font-medium text-text-primary text-sm truncate">Order ' + esc(o.id || '') + '</p>' +
                        '<p class="text-xs text-text-tertiary mt-0.5 truncate">' +
                        esc(o.consumerName || o.userName || '') + ' · ' + esc(o.total ? ('₹' + o.total) : '') +
                        '</p>' +
                        '</div>' +
                        '<div class="text-right ml-4">' +
                        '<p class="text-xs text-text-tertiary mb-1 whitespace-nowrap">' + esc(formatDate(o.createdAt)) + '</p>' +
                        '<span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ' + statusClass + '">' +
                        esc(status) +
                        '</span>' +
                        '</div>' +
                        '</li>'
                    );
                }).join('');
            }
        }

        if (usersContainer) {
            var users = Array.isArray(summary.recentUsers) ? summary.recentUsers : [];
            if (!users.length) {
                usersContainer.innerHTML = '<li class="text-text-tertiary text-sm">No recent signups found.</li>';
            } else {
                usersContainer.innerHTML = users.map(function (u) {
                    return (
                        '<li class="flex justify-between items-center border-b border-border pb-2 last:border-b-0">' +
                        '<div class="min-w-0">' +
                        '<p class="font-medium text-text-primary text-sm truncate">' + esc(u.name || '') + '</p>' +
                        '<p class="text-xs text-text-tertiary mt-0.5 truncate">' +
                        esc(u.email || '') +
                        '</p>' +
                        '</div>' +
                        '<div class="text-right ml-4">' +
                        '<p class="text-xs text-text-secondary mb-1 capitalize">' + esc(u.role || '') + '</p>' +
                        '<p class="text-xs text-text-tertiary">' + esc(formatDate(u.createdAt)) + '</p>' +
                        '</div>' +
                        '</li>'
                    );
                }).join('');
            }
        }
    }

    function fetchSummary(apiBase, token) {
        showSummaryStatus('Loading summary…', false);
        return fetch(apiBase + '/api/admin/summary', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('Failed to load admin summary');
                }
                return res.json();
            })
            .then(function (data) {
                var s = data || {};
                setText('summary-total-users', s.totalUsers != null ? s.totalUsers : '0');
                setText('summary-total-products', s.totalProducts != null ? s.totalProducts : '0');
                setText('summary-total-orders', s.totalOrders != null ? s.totalOrders : '0');
                setText('summary-active-farmers', s.activeFarmers != null ? s.activeFarmers : '0');
                setText('summary-active-consumers', s.activeConsumers != null ? s.activeConsumers : '0');
                setText('summary-inactive-products', s.inactiveProducts != null ? s.inactiveProducts : '0');
                renderRecentLists(s);
                showSummaryStatus('Summary updated just now.', false);
            })
            .catch(function (err) {
                console.error('Admin summary error:', err);
                showSummaryStatus('Unable to load summary. Please try again.', true);
            });
    }

    function renderUsersTable(users) {
        var tbody = document.getElementById('admin-users-body');
        if (!tbody) return;

        if (!Array.isArray(users) || !users.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-text-tertiary">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(function (u) {
            var status = (u.status || (u.isActive === false ? 'inactive' : 'active')).toLowerCase();
            var isActive = status === 'active';
            var statusClass = isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning';
            var joined = formatDate(u.createdAt);
            return (
                '<tr data-user-id="' + esc(u._id || u.id || '') + '" data-user-role="' + esc(u.role || '') +
                '" data-user-status="' + esc(status) + '">' +
                '<td class="whitespace-nowrap">' + esc(u.name || '') + '</td>' +
                '<td class="whitespace-nowrap">' + esc(u.email || '') + '</td>' +
                '<td class="capitalize">' + esc(u.role || '') + '</td>' +
                '<td>' +
                '<span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ' + statusClass + '">' +
                (isActive ? 'Active' : 'Inactive') +
                '</span>' +
                '</td>' +
                '<td class="whitespace-nowrap text-text-tertiary text-xs">' + esc(joined) + '</td>' +
                '<td>' +
                '<button type="button" class="btn btn-outline btn-sm toggle-user-status-btn" ' +
                'data-id="' + esc(u._id || u.id || '') + '" data-status="' + esc(status) + '">' +
                (isActive ? 'Deactivate' : 'Activate') +
                '</button>' +
                '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function fetchUsers(apiBase, token, filters) {
        var tbody = document.getElementById('admin-users-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-text-tertiary">Loading users…</td></tr>';
        }

        var url = apiBase + '/api/admin/users';
        var params = [];
        if (filters.role) params.push('role=' + encodeURIComponent(filters.role));
        if (filters.status) params.push('status=' + encodeURIComponent(filters.status));
        if (params.length) url += '?' + params.join('&');

        return fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('Failed to load users');
                }
                return res.json();
            })
            .then(function (data) {
                var list = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
                renderUsersTable(list);
            })
            .catch(function (err) {
                console.error('Admin users error:', err);
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-error">Unable to load users.</td></tr>';
                }
            });
    }

    function renderProductsTable(products) {
        var tbody = document.getElementById('admin-products-body');
        if (!tbody) return;

        if (!Array.isArray(products) || !products.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-text-tertiary">No products found.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(function (p) {
            var status = (p.status || (p.isActive === false ? 'inactive' : 'active')).toLowerCase();
            var isActive = status === 'active';
            var statusClass = isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning';
            var created = formatDate(p.createdAt);
            var farmerName = (p.farmer && (p.farmer.name || p.farmerName)) || p.farmerName || '';
            return (
                '<tr data-product-id="' + esc(p._id || p.id || '') + '" data-product-status="' + esc(status) + '">' +
                '<td class="whitespace-nowrap">' + esc(p.name || '') + '</td>' +
                '<td class="whitespace-nowrap">' + esc(farmerName) + '</td>' +
                '<td class="whitespace-nowrap">' + esc(p.category || '') + '</td>' +
                '<td class="whitespace-nowrap">₹' + esc(p.price != null ? p.price : '') + '</td>' +
                '<td>' +
                '<span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ' + statusClass + '">' +
                (isActive ? 'Active' : 'Inactive') +
                '</span>' +
                '</td>' +
                '<td class="whitespace-nowrap text-text-tertiary text-xs">' + esc(created) + '</td>' +
                '<td>' +
                '<button type="button" class="btn btn-outline btn-sm toggle-product-status-btn" ' +
                'data-id="' + esc(p._id || p.id || '') + '" data-status="' + esc(status) + '">' +
                (isActive ? 'Deactivate' : 'Activate') +
                '</button>' +
                '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function fetchProducts(apiBase, token, filters) {
        var tbody = document.getElementById('admin-products-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-text-tertiary">Loading products…</td></tr>';
        }

        var url = apiBase + '/api/admin/products';
        var params = [];
        if (filters.status) params.push('status=' + encodeURIComponent(filters.status));
        if (params.length) url += '?' + params.join('&');

        return fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('Failed to load products');
                }
                return res.json();
            })
            .then(function (data) {
                var list = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);
                renderProductsTable(list);
            })
            .catch(function (err) {
                console.error('Admin products error:', err);
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-error">Unable to load products.</td></tr>';
                }
            });
    }

    function toggleUserStatus(apiBase, token, id, currentStatus) {
        if (!id) return;
        var newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        return fetch(apiBase + '/api/admin/users/' + encodeURIComponent(id) + '/status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ status: newStatus })
        })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    if (!res.ok) {
                        throw new Error(data.message || 'Failed to update user status');
                    }
                    return data;
                });
            })
            .then(function () {
                var row = document.querySelector('tr[data-user-id="' + CSS.escape(id) + '"]');
                if (!row) return;
                row.setAttribute('data-user-status', newStatus);
                var badge = row.querySelector('td:nth-child(4) span');
                var btn = row.querySelector('.toggle-user-status-btn');
                if (badge) {
                    badge.textContent = newStatus === 'active' ? 'Active' : 'Inactive';
                    badge.className = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ' +
                        (newStatus === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning');
                }
                if (btn) {
                    btn.textContent = newStatus === 'active' ? 'Deactivate' : 'Activate';
                    btn.setAttribute('data-status', newStatus);
                }
            })
            .catch(function (err) {
                console.error('Toggle user status error:', err);
                alert(err.message || 'Unable to update user status.');
            });
    }

    function toggleProductStatus(apiBase, token, id, currentStatus) {
        if (!id) return;
        var newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        return fetch(apiBase + '/api/admin/products/' + encodeURIComponent(id) + '/status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ status: newStatus })
        })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    if (!res.ok) {
                        throw new Error(data.message || 'Failed to update product status');
                    }
                    return data;
                });
            })
            .then(function () {
                var row = document.querySelector('tr[data-product-id="' + CSS.escape(id) + '"]');
                if (!row) return;
                row.setAttribute('data-product-status', newStatus);
                var badge = row.querySelector('td:nth-child(5) span');
                var btn = row.querySelector('.toggle-product-status-btn');
                if (badge) {
                    badge.textContent = newStatus === 'active' ? 'Active' : 'Inactive';
                    badge.className = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ' +
                        (newStatus === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning');
                }
                if (btn) {
                    btn.textContent = newStatus === 'active' ? 'Deactivate' : 'Activate';
                    btn.setAttribute('data-status', newStatus);
                }
            })
            .catch(function (err) {
                console.error('Toggle product status error:', err);
                alert(err.message || 'Unable to update product status.');
            });
    }

    function initAdminTabs() {
        var tabButtons = document.querySelectorAll('[data-admin-tab]');
        var usersSection = document.getElementById('admin-users-section');
        var productsSection = document.getElementById('admin-products-section');
        if (!tabButtons.length || !usersSection || !productsSection) return;

        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var target = btn.getAttribute('data-admin-tab');
                tabButtons.forEach(function (b) {
                    b.classList.remove('active', 'text-primary', 'border-primary', 'border-b-2');
                    b.classList.add('text-text-secondary', 'border-transparent');
                });
                btn.classList.add('active', 'text-primary', 'border-primary', 'border-b-2');
                btn.classList.remove('text-text-secondary', 'border-transparent');

                if (target === 'users') {
                    usersSection.classList.remove('hidden');
                    productsSection.classList.add('hidden');
                } else {
                    productsSection.classList.remove('hidden');
                    usersSection.classList.add('hidden');
                }
            });
        });
    }

    function attachFiltersAndActions(apiBase, token) {
        var userRoleFilter = document.getElementById('user-role-filter');
        var userStatusFilter = document.getElementById('user-status-filter');
        var productStatusFilter = document.getElementById('product-status-filter');
        var refreshUsersBtn = document.getElementById('refresh-users-btn');
        var refreshProductsBtn = document.getElementById('refresh-products-btn');
        var refreshSummaryBtn = document.getElementById('refresh-summary-btn');

        function reloadUsers() {
            fetchUsers(apiBase, token, {
                role: userRoleFilter ? userRoleFilter.value : '',
                status: userStatusFilter ? userStatusFilter.value : ''
            });
        }

        function reloadProducts() {
            fetchProducts(apiBase, token, {
                status: productStatusFilter ? productStatusFilter.value : ''
            });
        }

        if (userRoleFilter) userRoleFilter.addEventListener('change', reloadUsers);
        if (userStatusFilter) userStatusFilter.addEventListener('change', reloadUsers);
        if (productStatusFilter) productStatusFilter.addEventListener('change', reloadProducts);
        if (refreshUsersBtn) refreshUsersBtn.addEventListener('click', reloadUsers);
        if (refreshProductsBtn) refreshProductsBtn.addEventListener('click', reloadProducts);
        if (refreshSummaryBtn) refreshSummaryBtn.addEventListener('click', function () {
            fetchSummary(apiBase, token);
        });

        var usersTable = document.getElementById('admin-users-section');
        if (usersTable) {
            usersTable.addEventListener('click', function (e) {
                var btn = e.target.closest('.toggle-user-status-btn');
                if (!btn) return;
                var id = btn.getAttribute('data-id');
                var status = btn.getAttribute('data-status') || 'active';
                toggleUserStatus(apiBase, token, id, status);
            });
        }

        var productsTable = document.getElementById('admin-products-section');
        if (productsTable) {
            productsTable.addEventListener('click', function (e) {
                var btn = e.target.closest('.toggle-product-status-btn');
                if (!btn) return;
                var id = btn.getAttribute('data-id');
                var status = btn.getAttribute('data-status') || 'active';
                toggleProductStatus(apiBase, token, id, status);
            });
        }

        // initial loads
        reloadUsers();
        reloadProducts();
    }

    function init() {
        var user = ensureAdminOrRedirect();
        if (!user) return;

        var apiBase = getApiBase();

        try {
            if (window.EAgri) {
                window.EAgri.initMobileMenu();
            }
        } catch (_) { }

        initAdminTabs();
        fetchSummary(apiBase, user.token);
        attachFiltersAndActions(apiBase, user.token);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

