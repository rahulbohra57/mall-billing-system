// Central API layer — all requests go through apiFetch
async function apiFetch(method, path, body = null) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

// Auth
async function apiRegister(name, email, password, role) {
  return apiFetch('POST', '/auth/register', { name, email, password, role });
}

// Products
async function apiAddProduct(payload) {
  return apiFetch('POST', '/products/add', payload);
}

async function apiUpdateProduct(productId, payload) {
  return apiFetch('PUT', `/products/${productId}`, payload);
}

async function apiGetAllProducts() {
  return apiFetch('GET', '/products/all');
}

async function apiGetProductByBarcode(barcode) {
  return apiFetch('GET', `/products/barcode/${encodeURIComponent(barcode)}`);
}

// Billing
async function apiCheckout(cashierId, cart) {
  return apiFetch('POST', '/billing/checkout', { cashier_id: cashierId, cart });
}

async function apiGetBill(billId) {
  return apiFetch('GET', `/billing/${billId}`);
}

async function apiListBills() {
  return apiFetch('GET', '/billing/');
}
