let cart = [];
let currentProduct = null;
let currentBillId = null;

function fmtPrice(n) { return '₹' + Number(n).toFixed(2); }
function esc(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function handleBarcodeSearch(e) {
  e.preventDefault();
  const barcode = document.getElementById('barcode-input').value.trim();
  const preview = document.getElementById('product-preview');
  const errDiv  = document.getElementById('search-error');

  preview.classList.add('hidden');
  errDiv.classList.add('hidden');
  currentProduct = null;

  if (!barcode) return;

  try {
    const product = await apiGetProductByBarcode(barcode);
    currentProduct = product;
    document.getElementById('preview-name').textContent    = product.name;
    document.getElementById('preview-barcode').textContent = product.barcode;
    document.getElementById('preview-price').textContent   = fmtPrice(product.price);
    document.getElementById('preview-stock').textContent   = `${product.quantity} in stock`;
    document.getElementById('preview-category').textContent = product.category || '';
    document.getElementById('qty-input').value = 1;
    document.getElementById('qty-input').max   = product.quantity;
    preview.classList.remove('hidden');
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.classList.remove('hidden');
  }
}

function handleAddToCart() {
  if (!currentProduct) return;
  const qty = parseInt(document.getElementById('qty-input').value);

  if (isNaN(qty) || qty <= 0) {
    alert('Enter a valid quantity.');
    return;
  }
  if (qty > currentProduct.quantity) {
    alert(`Only ${currentProduct.quantity} units in stock.`);
    return;
  }

  const existing = cart.find(i => i.product_id === currentProduct.id);
  if (existing) {
    const newQty = existing.quantity + qty;
    if (newQty > currentProduct.quantity) {
      alert(`Cannot add more than ${currentProduct.quantity} units total.`);
      return;
    }
    existing.quantity = newQty;
  } else {
    cart.push({
      product_id: currentProduct.id,
      name:       currentProduct.name,
      price:      currentProduct.price,
      quantity:   qty
    });
  }

  // Reset search
  document.getElementById('barcode-input').value = '';
  document.getElementById('product-preview').classList.add('hidden');
  document.getElementById('search-error').classList.add('hidden');
  currentProduct = null;
  renderCart();
}

function renderCart() {
  const tbody  = document.querySelector('#cart-table tbody');
  const total  = document.getElementById('cart-total-amount');
  const actDiv = document.getElementById('cart-actions');

  if (cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Cart is empty. Search for a product by barcode.</p></div></td></tr>';
    total.textContent = fmtPrice(0);
    actDiv.classList.add('hidden');
    return;
  }

  let grandTotal = 0;
  tbody.innerHTML = cart.map((item, idx) => {
    const subtotal = item.price * item.quantity;
    grandTotal += subtotal;
    return `
      <tr>
        <td><strong>${esc(item.name)}</strong></td>
        <td>${item.quantity}</td>
        <td>${fmtPrice(item.price)}</td>
        <td><strong>${fmtPrice(subtotal)}</strong></td>
        <td><button class="btn btn-danger btn-sm" onclick="removeFromCart(${idx})">Remove</button></td>
      </tr>
    `;
  }).join('');

  total.textContent = fmtPrice(grandTotal);
  actDiv.classList.remove('hidden');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

async function handleCheckout() {
  if (cart.length === 0) { alert('Cart is empty.'); return; }

  const user = getUser();
  const payload = {
    cashier_id: user.id,
    cart: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
  };

  const btn = document.getElementById('checkout-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const result = await apiCheckout(user.id, payload.cart);
    // Fetch full bill details for the modal
    const billData = await apiGetBill(result.bill_id);
    showBillModal(result.bill_id, billData.items, result.total);
    cart = [];
    renderCart();
  } catch (err) {
    alert('Checkout failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Final Bill';
  }
}

function showBillModal(billId, items, total) {
  currentBillId = billId;
  document.getElementById('modal-bill-id').textContent = billId;
  document.getElementById('modal-bill-date').textContent = new Date().toLocaleString();

  const tbody = document.querySelector('#bill-items-table tbody');
  tbody.innerHTML = (items || []).map(item => {
    const name = item.products ? esc(item.products.name) : 'Unknown';
    return `
      <tr>
        <td>${name}</td>
        <td>${item.quantity}</td>
        <td>${fmtPrice(item.price)}</td>
        <td><strong>${fmtPrice(item.subtotal)}</strong></td>
      </tr>
    `;
  }).join('');

  document.getElementById('modal-grand-total').textContent = fmtPrice(total);
  document.getElementById('bill-modal').classList.remove('hidden');
}

function closeBillModal() {
  document.getElementById('bill-modal').classList.add('hidden');
  currentBillId = null;
}

async function handleDownloadPdf() {
  if (!currentBillId) return;
  const btn = document.getElementById('download-pdf-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  try {
    await apiDownloadBillPdf(currentBillId);
  } catch (err) {
    alert('PDF download failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download PDF';
  }
}

function initEmployee() {
  document.getElementById('barcode-form').addEventListener('submit', handleBarcodeSearch);
  document.getElementById('add-to-cart-btn').addEventListener('click', handleAddToCart);
  document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
  document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
  document.getElementById('close-modal-btn').addEventListener('click', closeBillModal);
  document.getElementById('download-pdf-btn').addEventListener('click', handleDownloadPdf);
  // Close modal on overlay click
  document.getElementById('bill-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('bill-modal')) closeBillModal();
  });
  renderCart();
}
