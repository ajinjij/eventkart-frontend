// ---- Configure this to point at your deployed backend ----
const API_BASE = "https://fearless-optimism-production-9884.up.railway.app/api";

// ---- Session helpers ----
function getToken() { return localStorage.getItem("ek_token"); }
function getUser() {
  const raw = localStorage.getItem("ek_user");
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem("ek_token", token);
  localStorage.setItem("ek_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("ek_token");
  localStorage.removeItem("ek_user");
}

// ---- Core fetch wrapper ----
async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error("Could not reach the backend. Check API_BASE in assets/api.js and that the server is running.");
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const message =
      (data && data.error && (typeof data.error === "string" ? data.error : JSON.stringify(data.error))) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---- Flipkart-style header, rendered into <div id="site-nav"> ----
async function renderNav(activePage) {
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  const user = getUser();

  let cartCount = 0;
  let wishlistCount = 0;
  if (user && user.role === "CUSTOMER") {
    try {
      const cart = await apiFetch("/cart");
      cartCount = cart.items.length;
    } catch (e) { /* not logged in yet or backend unreachable */ }
    try {
      const wishlist = await apiFetch("/wishlist");
      wishlistCount = wishlist.length;
    } catch (e) { /* ignore */ }
  }

  const searchHtml = activePage === "browse"
    ? "" // homepage renders its own search bar in the hero, avoid duplicating it
    : `<div class="header-search"><input id="nav-search-input" type="text" placeholder="Search for packages, vendors..."><button onclick="navSearch()">🔍</button></div>`;

  let rightLinks = "";
  if (user && user.role === "VENDOR") {
    rightLinks += `<a href="vendor-dashboard.html">📦 My packages</a>`;
  }
  if (user && user.role === "ADMIN") {
    rightLinks += `<a href="admin.html">⚙️ Admin dashboard</a>`;
  }
  if (user && user.role === "CUSTOMER") {
    rightLinks += `<a href="wishlist.html" class="icon-badge">♥ Wishlist${wishlistCount ? `<span class="count">${wishlistCount}</span>` : ""}</a>`;
    rightLinks += `<a href="cart.html" class="icon-badge">🛒 Cart${cartCount ? `<span class="count">${cartCount}</span>` : ""}</a>`;
    rightLinks += `<a href="bookings.html">My Orders</a>`;
  }
  rightLinks += user
    ? `<button id="logout-btn">${user.name} · Logout</button>`
    : `<a href="auth.html" class="btn-login">Login</a>`;

  nav.innerHTML = `
    <div class="logo-block">
      <a href="index.html" class="logo">eventkart</a>
      <span class="logo-tag">Explore & book</span>
    </div>
    ${searchHtml}
    <div class="header-actions">${rightLinks}</div>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => { clearSession(); window.location.href = "index.html"; };
  }
}

function navSearch() {
  const val = document.getElementById("nav-search-input").value.trim();
  window.location.href = `index.html${val ? "?search=" + encodeURIComponent(val) : ""}`;
}

// ---- Money / rating helpers ----
function formatMoney(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

function priceRowHtml(pkg) {
  if (pkg.originalPrice && pkg.originalPrice > pkg.price) {
    const off = Math.round(100 - (pkg.price / pkg.originalPrice) * 100);
    return `<div class="price-row">
      <span class="price">${formatMoney(pkg.price)}</span>
      <span class="original">${formatMoney(pkg.originalPrice)}</span>
      <span class="discount">${off}% off</span>
    </div>`;
  }
  return `<div class="price-row"><span class="price">${formatMoney(pkg.price)}</span></div>`;
}

// ---- Wishlist toggle, used on product cards across pages ----
async function toggleWishlist(packageId, heartEl) {
  const user = getUser();
  if (!user) { window.location.href = "auth.html"; return; }
  if (user.role !== "CUSTOMER") { alert("Only customer accounts have a wishlist."); return; }

  const isActive = heartEl.classList.contains("active");
  try {
    if (isActive) {
      await apiFetch(`/wishlist/${packageId}`, { method: "DELETE" });
      heartEl.classList.remove("active");
    } else {
      await apiFetch("/wishlist", { method: "POST", body: JSON.stringify({ packageId }) });
      heartEl.classList.add("active");
    }
  } catch (err) {
    alert(err.message);
  }
}

// ---- Guards ----
function requireLogin(redirectTo = "auth.html") {
  if (!getUser()) { window.location.href = redirectTo; return null; }
  return getUser();
}
function requireRole(role, redirectTo = "index.html") {
  const user = getUser();
  if (!user || user.role !== role) { window.location.href = redirectTo; return null; }
  return user;
}
