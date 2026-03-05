let currentEditId = null;

function fmt(n) { return '₹' + Number(n).toFixed(2); }

async function loadInventory() {
  const tbody = document.querySelector('#inventory-table tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>Loading...</p></td></tr>';
  try {
    const products = await apiGetAllProducts();
    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No products yet. Add your first product above.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = products.map((p, i) => `
      <tr>
        <td><strong>${escHtml(p.name)}</strong></td>
        <td><code>${escHtml(p.barcode)}</code></td>
        <td>${fmt(p.price_per_unit)}</td>
        <td>${p.discount_percent || 0}%</td>
        <td><strong>${fmt(p.price)}</strong></td>
        <td>${p.quantity}</td>
        <td>${escHtml(p.category || '—')}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="fillEditForm(${i})">Edit</button>
        </td>
      </tr>
    `).join('');
    // store for edit access by index
    window._products = products;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="alert alert-error">${err.message}</div></td></tr>`;
  }
}

function fillEditForm(index) {
  const p = window._products[index];
  currentEditId = p.id;
  document.getElementById('edit-name').value          = p.name;
  document.getElementById('edit-barcode').value       = p.barcode;
  document.getElementById('edit-price').value         = p.price_per_unit;
  document.getElementById('edit-qty').value           = p.quantity;
  document.getElementById('edit-discount').value      = p.discount_percent || 0;
  document.getElementById('edit-category').value      = p.category || '';
  document.getElementById('edit-barcode-display').textContent = p.barcode;
  document.getElementById('edit-section').classList.remove('hidden');
  document.getElementById('edit-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleAddProduct(e) {
  e.preventDefault();
  const msgDiv = document.getElementById('add-msg');
  msgDiv.className = 'alert hidden';

  const name     = document.getElementById('add-name').value.trim();
  const barcode  = document.getElementById('add-barcode').value.trim();
  const price    = parseFloat(document.getElementById('add-price').value);
  const qty      = parseInt(document.getElementById('add-qty').value);
  const discount = parseFloat(document.getElementById('add-discount').value || 0);
  const category = document.getElementById('add-category').value.trim();

  if (!name || !barcode) { showMsg(msgDiv, 'error', 'Name and barcode are required.'); return; }
  if (isNaN(price) || price <= 0) { showMsg(msgDiv, 'error', 'Price must be greater than 0.'); return; }
  if (isNaN(qty) || qty < 0) { showMsg(msgDiv, 'error', 'Quantity must be 0 or more.'); return; }
  if (discount < 0 || discount > 100) { showMsg(msgDiv, 'error', 'Discount must be between 0 and 100.'); return; }

  try {
    await apiAddProduct({ name, barcode, price_per_unit: price, quantity: qty, discount_percent: discount, category: category || null });
    showMsg(msgDiv, 'success', 'Product added successfully.');
    e.target.reset();
    loadInventory();
  } catch (err) {
    showMsg(msgDiv, 'error', err.message);
  }
}

async function handleUpdateProduct(e) {
  e.preventDefault();
  if (!currentEditId) return;
  const msgDiv = document.getElementById('edit-msg');
  msgDiv.className = 'alert hidden';

  const payload = {
    name:             document.getElementById('edit-name').value.trim() || null,
    barcode:          document.getElementById('edit-barcode').value.trim() || null,
    price_per_unit:   parseFloat(document.getElementById('edit-price').value) || null,
    quantity:         parseInt(document.getElementById('edit-qty').value) ?? null,
    discount_percent: parseFloat(document.getElementById('edit-discount').value) ?? null,
    category:         document.getElementById('edit-category').value.trim() || null,
  };

  try {
    await apiUpdateProduct(currentEditId, payload);
    showMsg(msgDiv, 'success', 'Product updated successfully.');
    document.getElementById('edit-section').classList.add('hidden');
    currentEditId = null;
    loadInventory();
  } catch (err) {
    showMsg(msgDiv, 'error', err.message);
  }
}

async function handleDeleteProduct() {
  if (!currentEditId) return;
  const msgDiv = document.getElementById('edit-msg');
  if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
  try {
    await apiDeleteProduct(currentEditId);
    document.getElementById('edit-section').classList.add('hidden');
    currentEditId = null;
    loadInventory();
  } catch (err) {
    showMsg(msgDiv, 'error', err.message);
  }
}

function showMsg(el, type, msg) {
  el.textContent = msg;
  el.className = `alert alert-${type}`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function initManager() {
  document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
  document.getElementById('edit-product-form').addEventListener('submit', handleUpdateProduct);
  document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    document.getElementById('edit-section').classList.add('hidden');
    currentEditId = null;
  });
  document.getElementById('delete-product-btn').addEventListener('click', handleDeleteProduct);
  loadInventory();
}
