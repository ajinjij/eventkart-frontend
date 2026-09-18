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

// ---- Site settings (admin-editable branding/copy) ----
let _siteSettings = null;
async function loadSiteSettings() {
  if (_siteSettings) return _siteSettings;
  try {
    _siteSettings = await apiFetch("/settings");
  } catch (e) {
    _siteSettings = {};
  }
  if (_siteSettings.accentColor) {
    document.documentElement.style.setProperty("--rose", _siteSettings.accentColor);
  }
  return _siteSettings;
}

// Escapes admin-authored text before it's dropped into innerHTML (homepage sections, etc.)
// so a stray "<" or "&" in a title/body can't break the page markup.
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Flipkart-style header, rendered into <div id="site-nav"> ----
async function renderNav(activePage) {
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  loadSiteSettings(); // fire and forget - applies accent color as soon as it loads, don't block the nav on it
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
    : `<div class="header-search"><input id="nav-search-input" type="text" placeholder="Search for event services, vendors and more"><button onclick="navSearch()">🔍</button></div>`;

  const vendorPillHtml = (user && user.role === "VENDOR")
    ? `<a href="vendor-dashboard.html" class="vendor-pill">📦 My Packages</a>`
    : `<a href="vendor-auth.html" class="vendor-pill">Vendor Login</a>`;

  const locationHtml = renderLocationPicker();

  let rightLinks = "";
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
    : `<a href="customer-auth.html" class="btn-login">Login</a>`;

  nav.innerHTML = `
    <div class="logo-block">
      <a href="index.html" class="logo" id="site-logo">Loomy<span class="logo-accent">box</span></a>
    </div>
    ${vendorPillHtml}
    ${searchHtml}
    ${locationHtml}
    <div class="header-actions">${rightLinks}</div>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => { clearSession(); window.location.href = "index.html"; };
  }

  const locationSelect = document.getElementById("header-location-select");
  if (locationSelect) {
    locationSelect.onchange = () => {
      localStorage.setItem("ek_district", locationSelect.value);
      // If we're already on the search page, re-run its filter immediately.
      if (typeof applyDistrictFilter === "function") applyDistrictFilter(locationSelect.value);
    };
  }

  // If the admin has set a custom site name in Settings, swap it in once it loads.
  // The default "Loomybox" keeps its two-tone pink/white styling; a custom name
  // renders as a single white wordmark (still on-brand with the pink tagline below it).
  loadSiteSettings().then(settings => {
    const logoEl = document.getElementById("site-logo");
    if (logoEl && settings.siteName && settings.siteName !== "Loomybox") {
      logoEl.textContent = settings.siteName;
    }
  });
}

// ---- Location picker (Flipkart-style "select location", simplified to a dropdown) ----
function renderLocationPicker() {
  const current = localStorage.getItem("ek_district") || "";
  const options = [`<option value="">All Kerala</option>`]
    .concat(KERALA_DISTRICTS.map(d => `<option value="${d}" ${d === current ? "selected" : ""}>${d}</option>`))
    .join("");
  return `<select class="header-location" id="header-location-select" title="Filter by district">${options}</select>`;
}

function navSearch() {
  const val = document.getElementById("nav-search-input").value.trim();
  const params = new URLSearchParams();
  if (val) params.set("search", val);
  window.location.href = `search.html${params.toString() ? "?" + params.toString() : ""}`;
}

// ---- Categories (single source of truth — used by the homepage icon row,
// the search page's filter sidebar, and the vendor signup category dropdown) ----
const CATEGORIES = [
  { value: "event", label: "Event" },
  { value: "birthday", label: "Birthday" },
  { value: "transportation", label: "Transportation" },
  { value: "corporate", label: "Corporate Event" },
  { value: "local-event", label: "Local Event" },
  { value: "photography", label: "Photography" },
  { value: "gift-hampers", label: "Gift Hampers" },
  { value: "surprise-gift", label: "Surprise Gift" },
];

// ---- Kerala districts — used for the location filter ----
const KERALA_DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam",
  "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram",
  "Kozhikode", "Wayanad", "Kannur", "Kasaragod",
];

// ---- Category icon illustrations (inline SVG, drawn in-house — no external images) ----
function categoryIconSvg(category) {
  const icons = {
    event: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="3"/><path d="M8 20h32"/><path d="M16 6v8M32 6v8"/></svg>`,
    birthday: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 12c8 0 14 6 14 14v10H10V26c0-8 6-14 14-14z"/><path d="M24 12V6M18 12c0-3 2-4 2-6M30 12c0-3-2-4-2-6"/><path d="M10 30h28"/></svg>`,
    transportation: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 28l3-10a4 4 0 0 1 4-3h18a4 4 0 0 1 4 3l3 10"/><rect x="6" y="28" width="36" height="8" rx="2"/><circle cx="14" cy="36" r="3"/><circle cx="34" cy="36" r="3"/></svg>`,
    corporate: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="18" width="32" height="20" rx="2"/><path d="M17 18v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4"/><path d="M8 27h32"/></svg>`,
    "local-event": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 44s14-14 14-24a14 14 0 0 0-28 0c0 10 14 24 14 24z"/><circle cx="24" cy="20" r="5"/></svg>`,
    photography: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="36" height="24" rx="3"/><path d="M18 14l2-4h8l2 4"/><circle cx="24" cy="26" r="7"/></svg>`,
    "gift-hampers": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="18" width="32" height="22" rx="2"/><path d="M8 26h32"/><path d="M24 18v22"/><path d="M24 18c-4-8-14-6-10 0M24 18c4-8 14-6 10 0"/></svg>`,
    "surprise-gift": `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="20" width="32" height="20" rx="2"/><path d="M8 27h32"/><path d="M24 20v20"/><path d="M24 20c-3-7-12-5-9 0M24 20c3-7 12-5 9 0"/><path d="M38 8l1.4 3.2L43 12.6l-3.6 1.4L38 17l-1.4-3.2L33 12.6l3.6-1.4z"/></svg>`,
    // kept for backward compatibility with packages created before the category list changed
    wedding: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="17" cy="26" r="9"/><circle cx="31" cy="26" r="9"/><path d="M20 13l4-6 4 6" stroke-linejoin="round"/></svg>`,
    other: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/></svg>`,
  };
  return icons[category] || icons.other;
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
  if (!user) { window.location.href = "customer-auth.html"; return; }
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
function requireLogin(redirectTo = "customer-auth.html") {
  if (!getUser()) { window.location.href = redirectTo; return null; }
  return getUser();
}
function requireRole(role, redirectTo = "index.html") {
  const user = getUser();
  if (!user || user.role !== role) { window.location.href = redirectTo; return null; }
  return user;
}
