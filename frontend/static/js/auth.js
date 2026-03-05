// Token & user helpers
function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || 'null'); }
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Login — sends as application/x-www-form-urlencoded (OAuth2 requirement)
async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name, role: data.role }));
}

// Login page init
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, skip login page
  if (getToken()) { window.location.href = '/app'; return; }

  const form    = document.getElementById('login-form');
  const errDiv  = document.getElementById('error-msg');
  const btn     = document.getElementById('login-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errDiv.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      await login(email, password);
      window.location.href = '/app';
    } catch (err) {
      errDiv.textContent = err.message;
      errDiv.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
});
