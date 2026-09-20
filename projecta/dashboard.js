/* ==========================================================================
   PROJECTA — DEVELOPER PORTAL & DASHBOARD JAVASCRIPT
   Authentication: Credentials verified SERVER-SIDE via /api/login
   Visitor count: fetched from /api/visits (server-side, persistent)
   No credentials or hashes stored in this file.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // DOM Elements - Auth
  const authSection = document.getElementById('authSection');
  const dashboardWrapper = document.getElementById('dashboardWrapper');
  const loginForm = document.getElementById('loginForm');
  const devUsernameInput = document.getElementById('devUsername');
  const devPasswordInput = document.getElementById('devPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginErrorAlert = document.getElementById('loginErrorAlert');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const logoutBtn = document.getElementById('logoutBtn');

  // DOM Elements - Dashboard Controls
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  const loadDemoDataBtn = document.getElementById('loadDemoDataBtn');
  const emptyDemoBtn = document.getElementById('emptyDemoBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const clearAllOrdersBtn = document.getElementById('clearAllOrdersBtn');

  // KPI Elements
  const totalVisitsCount = document.getElementById('totalVisitsCount');
  const totalOrdersCount = document.getElementById('totalOrdersCount');
  const pendingOrdersCount = document.getElementById('pendingOrdersCount');
  const completedOrdersCount = document.getElementById('completedOrdersCount');

  // Table & Filter Elements
  const ordersTableBody = document.getElementById('ordersTableBody');
  const emptyOrdersState = document.getElementById('emptyOrdersState');
  const showingCountText = document.getElementById('showingCountText');
  const orderSearchInput = document.getElementById('orderSearchInput');
  const departmentFilterSelect = document.getElementById('departmentFilterSelect');
  const statusFilterSelect = document.getElementById('statusFilterSelect');

  // Chart instances
  let departmentChartInstance = null;
  let trendChartInstance = null;

  // Helper: escape HTML to prevent script injection from order data
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // --------------------------------------------------------------------------
  // 1. Authentication & Session Check
  // --------------------------------------------------------------------------
  const checkSession = () => {
    const token = sessionStorage.getItem('projecta_dev_token');
    if (token) {
      showDashboard();
    } else {
      showLogin();
    }
  };

  const showDashboard = () => {
    if (authSection) authSection.style.display = 'none';
    if (dashboardWrapper) dashboardWrapper.style.display = 'block';
    renderDashboard();
  };

  const showLogin = () => {
    if (dashboardWrapper) dashboardWrapper.style.display = 'none';
    if (authSection) authSection.style.display = 'flex';
    if (devUsernameInput) devUsernameInput.value = '';
    if (devPasswordInput) devPasswordInput.value = '';
    if (loginErrorAlert) loginErrorAlert.hidden = true;
    devUsernameInput?.focus();
  };

  // Password Visibility Toggle
  if (togglePasswordBtn && devPasswordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = devPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      devPasswordInput.setAttribute('type', type);
      togglePasswordIcon.className = type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
    });
  }

  // Handle Login Form Submit
  // Credentials are POSTed to the backend (/api/login) and verified server-side.
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userInput = devUsernameInput.value.trim();
      const passInput = devPasswordInput.value.trim();

      loginBtn.classList.add('loading');
      loginBtn.disabled = true;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: userInput, pass: passInput })
        });

        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;

        if (response.ok) {
          const data = await response.json();
          // Only the server-issued token is stored — not the password
          sessionStorage.setItem('projecta_dev_token', data.token);
          if (loginErrorAlert) loginErrorAlert.hidden = true;
          showDashboard();
        } else {
          if (loginErrorAlert) {
            loginErrorAlert.hidden = false;
            loginErrorAlert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Access Denied: Invalid username or password.';
          }
          devPasswordInput.value = '';
          devPasswordInput.focus();
        }
      } catch (err) {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        if (loginErrorAlert) {
          loginErrorAlert.hidden = false;
          loginErrorAlert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Cannot connect to server. Please try again in a moment.';
        }
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of the Developer Portal?')) {
        sessionStorage.removeItem('projecta_dev_token');
        sessionStorage.removeItem('projecta_dev_auth'); // legacy key cleanup
        showLogin();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. Data Retrieval & Management
  //    Orders: LocalStorage (unchanged)
  //    Visits: real global count from server API (/api/visits)
  // --------------------------------------------------------------------------
  const getOrders = () => {
    try {
      const stored = localStorage.getItem('projecta_orders');
      if (!stored) return [];
      const allOrders = JSON.parse(stored);
      // Remove any legacy demo/sample orders that may have been seeded previously
      const DEMO_IDS = ['ORD-1078', 'ORD-1079', 'ORD-1080', 'ORD-1081', 'ORD-1082'];
      const realOrders = allOrders.filter(o => !DEMO_IDS.includes(o.id));
      if (realOrders.length !== allOrders.length) {
        localStorage.setItem('projecta_orders', JSON.stringify(realOrders));
      }
      return realOrders;
    } catch (e) {
      return [];
    }
  };

  const saveOrders = (orders) => {
    localStorage.setItem('projecta_orders', JSON.stringify(orders));
  };

  let cachedVisits = null;

  // The counter must NEVER affect login/session. On any error we just keep
  // the last known value (or show a dash) and leave the user logged in.
  const fetchVisits = async () => {
    const token = sessionStorage.getItem('projecta_dev_token');
    try {
      const res = await fetch('/api/visits', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!res.ok) {
        console.warn('[ProjectA] /api/visits failed with status', res.status);
        return cachedVisits;
      }
      const data = await res.json();
      cachedVisits = Number(data.count) || 0;
      return cachedVisits;
    } catch (e) {
      console.warn('[ProjectA] /api/visits network error', e);
      return cachedVisits;
    }
  };

  // --------------------------------------------------------------------------
  // 3. Render Dashboard, KPIs & Charts
  // --------------------------------------------------------------------------
  const renderDashboard = async () => {
    const orders = getOrders();

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'New' || o.status === 'In Progress').length;
    const completedOrders = orders.filter(o => o.status === 'Completed').length;

    if (totalOrdersCount) totalOrdersCount.textContent = totalOrders.toLocaleString('en-IN');
    if (pendingOrdersCount) pendingOrdersCount.textContent = pendingOrders.toLocaleString('en-IN');
    if (completedOrdersCount) completedOrdersCount.textContent = completedOrders.toLocaleString('en-IN');
    if (totalVisitsCount) {
      totalVisitsCount.textContent = cachedVisits === null ? '…' : cachedVisits.toLocaleString('en-IN');
    }

    renderDepartmentChart(orders);
    renderTrendChart(cachedVisits ?? 0, orders);
    renderOrdersTable();

    // Real global visitor count from the server
    const visits = await fetchVisits();
    if (visits !== null) {
      if (totalVisitsCount) totalVisitsCount.textContent = visits.toLocaleString('en-IN');
      renderTrendChart(visits, orders);
    } else if (totalVisitsCount && cachedVisits === null) {
      totalVisitsCount.textContent = '—';
    }
  };

  // --------------------------------------------------------------------------
  // 4. Graphical Charts Rendering (Chart.js)
  // --------------------------------------------------------------------------
  const renderDepartmentChart = (orders) => {
    const ctx = document.getElementById('departmentChart')?.getContext('2d');
    if (!ctx) return;

    const deptCounts = {};
    orders.forEach(o => {
      const dept = o.department || 'Other';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const labels = Object.keys(deptCounts);
    const data = Object.values(deptCounts);

    const chartLabels = labels.length > 0 ? labels : ['No Orders Yet'];
    const chartData = data.length > 0 ? data : [1];
    const chartColors = data.length > 0 ? [
      '#0066FF', '#00D2FF', '#10B981', '#F59E0B',
      '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
    ] : ['#e2e8f0'];

    if (departmentChartInstance) {
      departmentChartInstance.destroy();
    }

    departmentChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: chartColors.slice(0, chartLabels.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { size: 11, family: 'Plus Jakarta Sans' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${context.raw} Orders`;
              }
            }
          }
        },
        cutout: '62%'
      }
    });
  };

  const renderTrendChart = (visits, orders) => {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;

    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Website Visits', 'Total Orders', 'In Progress', 'Completed Projects'],
        datasets: [{
          label: 'Count',
          data: [
            visits,
            orders.length,
            orders.filter(o => o.status === 'New' || o.status === 'In Progress').length,
            orders.filter(o => o.status === 'Completed').length
          ],
          backgroundColor: [
            'rgba(0, 102, 255, 0.85)',
            'rgba(0, 210, 255, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(16, 185, 129, 0.85)'
          ],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: { family: 'Plus Jakarta Sans' }
            },
            grid: {
              color: '#f1f5f9'
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' } }
          }
        }
      }
    });
  };

  // --------------------------------------------------------------------------
  // 5. Orders Table Rendering & Filtering
  // --------------------------------------------------------------------------
  const renderOrdersTable = () => {
    const allOrders = getOrders();
    const searchQuery = orderSearchInput?.value.toLowerCase().trim() || '';
    const deptFilter = departmentFilterSelect?.value || 'ALL';
    const statusFilter = statusFilterSelect?.value || 'ALL';

    const filteredOrders = allOrders.filter(order => {
      const matchesSearch =
        (order.studentName && order.studentName.toLowerCase().includes(searchQuery)) ||
        (order.phone && order.phone.includes(searchQuery)) ||
        (order.email && order.email.toLowerCase().includes(searchQuery)) ||
        (order.topic && order.topic.toLowerCase().includes(searchQuery)) ||
        (order.id && order.id.toLowerCase().includes(searchQuery));

      const matchesDept = deptFilter === 'ALL' || (order.department && order.department.includes(deptFilter));
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });

    if (showingCountText) {
      showingCountText.textContent = `Showing ${filteredOrders.length} of ${allOrders.length} orders`;
    }

    if (filteredOrders.length === 0) {
      if (ordersTableBody) ordersTableBody.innerHTML = '';
      if (emptyOrdersState) emptyOrdersState.style.display = 'block';
      return;
    }

    if (emptyOrdersState) emptyOrdersState.style.display = 'none';

    if (ordersTableBody) {
      ordersTableBody.innerHTML = filteredOrders.map(order => {
        let statusClass = 'status-new';
        if (order.status === 'In Progress') statusClass = 'status-progress';
        if (order.status === 'Completed') statusClass = 'status-completed';
        if (order.status === 'Cancelled') statusClass = 'status-cancelled';

        const rawPhone = order.phone ? order.phone.replace(/\D/g, '') : '';
        const phoneDigits = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
        const waLink = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(`Hello ${order.studentName}! Regarding your project order with ProjectA (${order.department}):`)}`;

        return `
          <tr data-order-id="${esc(order.id)}">
            <td><span class="order-id">${esc(order.id || '#ORD')}</span></td>
            <td>
              <div style="font-weight: 600; color: #0f172a;">${esc(order.date || 'Today')}</div>
              <small style="color: #64748b;">${esc(order.time || '')}</small>
            </td>
            <td>
              <div class="student-info">
                <strong>${esc(order.studentName || 'N/A')}</strong>
                <small><i class="fa-solid fa-phone" style="font-size: 0.75rem;"></i> ${esc(order.phone || '')}</small><br>
                <small><i class="fa-regular fa-envelope" style="font-size: 0.75rem;"></i> ${esc(order.email || '')}</small>
              </div>
            </td>
            <td>
              <span style="font-weight: 700; color: #0066ff;">${esc(order.department || 'N/A')}</span>
            </td>
            <td>
              <div class="topic-box" title="${esc(order.topic || '')}">
                ${esc(order.topic || 'No details provided')}
              </div>
            </td>
            <td>
              <select class="status-select ${statusClass}" onchange="window.updateOrderStatus('${esc(order.id)}', this.value)">
                <option value="New" ${order.status === 'New' ? 'selected' : ''}>New</option>
                <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
            <td>
              <div class="actions-wrap">
                <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn-action-wa" title="Chat with student on WhatsApp">
                  <i class="fa-brands fa-whatsapp"></i> Chat
                </a>
                <button type="button" class="btn-action-delete" onclick="window.deleteOrder('${esc(order.id)}')" title="Delete Order">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  };

  // Status Updater with WhatsApp notification to student
  window.updateOrderStatus = (orderId, newStatus) => {
    const orders = getOrders();
    const target = orders.find(o => o.id === orderId);
    if (target) {
      const prevStatus = target.status;
      target.status = newStatus;
      saveOrders(orders);
      renderDashboard();

      // Only notify student if status actually changed and student has a phone number
      if (newStatus !== prevStatus && target.phone) {
        const rawPhone = target.phone.replace(/\D/g, '');
        const phoneDigits = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
        const name = target.studentName || 'Student';
        const dept = target.department || 'your department';
        const id = target.id;

        let msg = '';
        if (newStatus === 'In Progress') {
          msg = `Hello ${name}! 🚀 Your college project order (${id} - ${dept}) is now *IN PROGRESS* at ProjectA. Our team has started working on it. We will keep you updated!\n\n— Team ProjectA`;
        } else if (newStatus === 'Completed') {
          msg = `Hello ${name}! 🎉 Great news! Your college project order (${id} - ${dept}) is *COMPLETED* at ProjectA and is ready for delivery. Please contact us to collect your project!\n\n— Team ProjectA`;
        } else if (newStatus === 'Cancelled') {
          msg = `Hello ${name}! ⚠️ Your college project order (${id}) at ProjectA has been *CANCELLED*. Please contact us at +91 97147 11897 or support.projecta@gmail.com for more details.\n\n— Team ProjectA`;
        }

        if (msg) {
          const waUrl = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank');
        }
      }
    }
  };

  // Delete Order
  window.deleteOrder = (orderId) => {
    if (confirm(`Delete project order ${orderId}?`)) {
      let orders = getOrders();
      orders = orders.filter(o => o.id !== orderId);
      saveOrders(orders);
      renderDashboard();
    }
  };

  // Search & Filter Listeners
  if (orderSearchInput) orderSearchInput.addEventListener('input', renderOrdersTable);
  if (departmentFilterSelect) departmentFilterSelect.addEventListener('change', renderOrdersTable);
  if (statusFilterSelect) statusFilterSelect.addEventListener('change', renderOrdersTable);

  // Refresh Button
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', async () => {
      await renderDashboard();
      alert('Dashboard refreshed with latest data!');
    });
  }

  // Load Sample Demo Data
  const loadDemoOrders = () => {
    localStorage.removeItem('projecta_orders');
    getOrders();
    renderDashboard();
    alert('Sample project orders and visits loaded successfully!');
  };

  if (loadDemoDataBtn) loadDemoDataBtn.addEventListener('click', loadDemoOrders);
  if (emptyDemoBtn) emptyDemoBtn.addEventListener('click', loadDemoOrders);

  // Clear All Orders
  if (clearAllOrdersBtn) {
    clearAllOrdersBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all project orders?')) {
        saveOrders([]);
        renderDashboard();
      }
    });
  }

  // Export Orders as CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const orders = getOrders();
      if (orders.length === 0) {
        alert('No orders available to export.');
        return;
      }

      let csvContent = 'Order ID,Date,Time,Student Name,Phone,Email,Department,Topic,Status\n';
      orders.forEach(o => {
        const cleanTopic = (o.topic || '').replace(/"/g, '""').replace(/\n/g, ' ');
        csvContent += `"${o.id}","${o.date}","${o.time}","${o.studentName}","${o.phone}","${o.email}","${o.department}","${cleanTopic}","${o.status}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ProjectA_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Initial Run
  checkSession();
});
