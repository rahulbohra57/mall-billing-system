document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  const token = getToken();
  if (!token) { window.location.href = '/'; return; }

  const user = getUser();
  if (!user) { clearAuth(); window.location.href = '/'; return; }

  // Populate navbar
  document.getElementById('user-name').textContent = user.name;
  const roleBadge = document.getElementById('user-role');
  roleBadge.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  roleBadge.className = `role-badge ${user.role}`;

  // Tab elements
  const tabManager  = document.getElementById('tab-manager');
  const tabEmployee = document.getElementById('tab-employee');
  const panelMgr    = document.getElementById('manager-panel');
  const panelEmp    = document.getElementById('employee-panel');
  const tabBar      = document.getElementById('tab-bar');

  function showTab(tab) {
    if (tab === 'manager') {
      tabManager.classList.add('active');
      tabEmployee.classList.remove('active');
      panelMgr.classList.remove('hidden');
      panelEmp.classList.add('hidden');
    } else {
      tabEmployee.classList.add('active');
      tabManager.classList.remove('active');
      panelEmp.classList.remove('hidden');
      panelMgr.classList.add('hidden');
    }
  }

  // Role-based setup
  if (user.role === 'manager') {
    tabManager.classList.remove('hidden');
    showTab('manager');
    tabManager.addEventListener('click', () => showTab('manager'));
    tabEmployee.addEventListener('click', () => showTab('employee'));
    initManager();
  } else {
    // Cashier: hide tab bar and show only employee panel
    tabBar.classList.add('hidden');
    showTab('employee');
  }

  // Always init employee panel
  initEmployee();

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth();
    window.location.href = '/';
  });
});
