/* ==========================================================================
   PROJECTA — DEVELOPER PORTAL & DASHBOARD JAVASCRIPT
   Authorized Developer: lv.patell
   Password: aaru@2604
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Developer Authorized Credentials
  const DEV_USER = 'lv.patell';
  const DEV_PASS = 'aaru@2604';

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

  // --------------------------------------------------------------------------
  // 1. Authentication & Session Check
  // --------------------------------------------------------------------------
  const checkSession = () => {
    const isAuth = sessionStorage.getItem('projecta_dev_auth');
    if (isAuth === 'true') {
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

  // Handle Login Form Submit (Strict Verification: lv.patell / aaru@2604)
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const user = devUsernameInput.value.trim().toLowerCase();
      const pass = devPasswordInput.value.trim();

      loginBtn.classList.add('loading');
      loginBtn.disabled = true;

      setTimeout(() => {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;

        // Verify that ONLY lv.patell with password aaru@2604 can log in
        if (user === DEV_USER.toLowerCase() && pass === DEV_PASS) {
          sessionStorage.setItem('projecta_dev_auth', 'true');
          if (loginErrorAlert) loginErrorAlert.hidden = true;
          showDashboard();
        } else {
          if (loginErrorAlert) {
            loginErrorAlert.hidden = false;
            loginErrorAlert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Access Denied: Only user <strong>lv.patell</strong> with authorized password can log in.';
          }
          devPasswordInput.value = '';
          devPasswordInput.focus();
        }
      }, 350);
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of the Developer Portal?')) {
        sessionStorage.removeItem('projecta_dev_auth');
        showLogin();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. Data Retrieval & Management (LocalStorage)
  // --------------------------------------------------------------------------
  const getOrders = () => {
    try {
      const stored = localStorage.getItem('projecta_orders');
      if (!stored) {
        // Seed default realistic sample orders so dashboard graphics render nicely
        const sampleOrders = [
          {
            id: 'ORD-1082',
            studentName: 'Hardik Vaghela',
            phone: '9825123456',
            email: 'hardik.v@gmail.com',
            department: 'Computer Engineering',
            topic: 'AI College Placement & Student Project Automation Portal with Python',
            status: 'In Progress',
            date: '18 Sep 2026',
            time: '11:15 AM',
            timestamp: Date.now() - 3600000
          },
          {
            id: 'ORD-1081',
            studentName: 'Pooja Parmar',
            phone: '9712345678',
            email: 'pooja.p@gmail.com',
            department: 'Information Technology (IT)',
            topic: 'Online Examination & Proctoring System with Face Recognition',
            status: 'New',
            date: '18 Sep 2026',
            time: '10:40 AM',
            timestamp: Date.now() - 7200000
          },
          {
            id: 'ORD-1080',
            studentName: 'Meet Patel',
            phone: '9898765432',
            email: 'meet.patel@gmail.com',
            department: 'Mechanical Engineering',
            topic: 'Automatic Pneumatic Bumper & Braking System Working Prototype Model',
            status: 'New',
            date: '17 Sep 2026',
            time: '04:20 PM',
            timestamp: Date.now() - 86400000
          },
          {
            id: 'ORD-1079',
            studentName: 'Bhavin Shah',
            phone: '9428012345',
            email: 'bhavin.s@gmail.com',
            department: 'Electrical Engineering',
            topic: 'IoT Smart Grid Power Theft Detection with Arduino & GSM Module',
            status: 'Completed',
            date: '16 Sep 2026',
            time: '02:10 PM',
            timestamp: Date.now() - 172800000
          },
          {
            id: 'ORD-1078',
            studentName: 'Chirag Dave',
            phone: '9909012345',
            email: 'chirag.d@gmail.com',
            department: 'Civil Engineering',
            topic: 'Structural Analysis of Earthquake Resistant High-Rise Frame',
            status: 'Completed',
            date: '15 Sep 2026',
            time: '05:45 PM',
            timestamp: Date.now() - 259200000
          }
        ];
        localStorage.setItem('projecta_orders', JSON.stringify(sampleOrders));
        return sampleOrders;
      }
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  };

  const saveOrders = (orders) => {
    localStorage.setItem('projecta_orders', JSON.stringify(orders));
  };

  const getVisits = () => {
    let visits = parseInt(localStorage.getItem('projecta_visits') || '0', 10);
    if (visits < 25) {
      visits = 54;
      localStorage.setItem('projecta_visits', '54');
    }
    return visits;
  };

  // --------------------------------------------------------------------------
  // 3. Render Dashboard, KPIs & Charts
  // --------------------------------------------------------------------------
  const renderDashboard = () => {
    const orders = getOrders();
    const visits = getVisits();

    // Calculate KPIs
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'New' || o.status === 'In Progress').length;
    const completedOrders = orders.filter(o => o.status === 'Completed').length;

    // Update KPI Card Numbers
    if (totalVisitsCount) totalVisitsCount.textContent = visits.toLocaleString('en-IN');
    if (totalOrdersCount) totalOrdersCount.textContent = totalOrders.toLocaleString('en-IN');
    if (pendingOrdersCount) pendingOrdersCount.textContent = pendingOrders.toLocaleString('en-IN');
    if (completedOrdersCount) completedOrdersCount.textContent = completedOrders.toLocaleString('en-IN');

    // Render Graphical Charts
    renderDepartmentChart(orders);
    renderTrendChart(visits, orders);

    // Render Orders Table
    renderOrdersTable();
  };

  // --------------------------------------------------------------------------
  // 4. Graphical Charts Rendering (Chart.js)
  // --------------------------------------------------------------------------
  const renderDepartmentChart = (orders) => {
    const ctx = document.getElementById('departmentChart')?.getContext('2d');
    if (!ctx) return;

    // Aggregate counts by department
    const deptCounts = {};
    orders.forEach(o => {
      const dept = o.department || 'Other';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const labels = Object.keys(deptCounts);
    const data = Object.values(deptCounts);

    const chartLabels = labels.length > 0 ? labels : ['Computer', 'IT', 'Mechanical', 'Civil', 'Electrical'];
    const chartData = data.length > 0 ? data : [2, 1, 1, 1, 1];

    const colors = [
      '#0066FF', '#00D2FF', '#10B981', '#F59E0B', 
      '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
    ];

    if (departmentChartInstance) {
      departmentChartInstance.destroy();
    }

    departmentChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: colors.slice(0, chartLabels.length),
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

    // Filter orders
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
          <tr data-order-id="${order.id}">
            <td><span class="order-id">${order.id || '#ORD'}</span></td>
            <td>
              <div style="font-weight: 600; color: #0f172a;">${order.date || 'Today'}</div>
              <small style="color: #64748b;">${order.time || ''}</small>
            </td>
            <td>
              <div class="student-info">
                <strong>${order.studentName || 'N/A'}</strong>
                <small><i class="fa-solid fa-phone" style="font-size: 0.75rem;"></i> ${order.phone || ''}</small><br>
                <small><i class="fa-regular fa-envelope" style="font-size: 0.75rem;"></i> ${order.email || ''}</small>
              </div>
            </td>
            <td>
              <span style="font-weight: 700; color: #0066ff;">${order.department || 'N/A'}</span>
            </td>
            <td>
              <div class="topic-box" title="${(order.topic || '').replace(/"/g, '&quot;')}">
                ${order.topic || 'No details provided'}
              </div>
            </td>
            <td>
              <select class="status-select ${statusClass}" onchange="window.updateOrderStatus('${order.id}', this.value)">
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
                <button type="button" class="btn-action-delete" onclick="window.deleteOrder('${order.id}')" title="Delete Order">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  };

  // Status Updater
  window.updateOrderStatus = (orderId, newStatus) => {
    const orders = getOrders();
    const target = orders.find(o => o.id === orderId);
    if (target) {
      target.status = newStatus;
      saveOrders(orders);
      renderDashboard();
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
    refreshDataBtn.addEventListener('click', () => {
      renderDashboard();
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
