// ---- Configure this to point at your deployed backend ----
const API_BASE = "https://fearless-optimism-production-9884.up.railway.app/api";

// ---- Language toggle (English / Malayalam) ----
// Covers the nav, homepage hero and category names — the highest-traffic
// surfaces — rather than every string on every page. Falls back to English
// for anything not in the dictionary.
const TRANSLATIONS = {
  en: {
    vendorLogin: "Vendor Login", myPackages: "📦 My Packages",
    searchPlaceholder: "Search for event services, vendors and more",
    wishlist: "Wishlist", cart: "Cart", myOrders: "My Orders",
    login: "Login", logout: "Logout", allKerala: "All Kerala",
    heroHeadline: "Plan the day. Skip the guesswork.",
    heroSubtext: "Compare verified event partners and book securely — payment held in escrow until your event is delivered.",
    searchButton: "Search", searchInputPlaceholder: "Search packages, e.g. 'photography'",
    planWithAi: "✨ Plan my event with AI",
    planWithAiSub: "Get a checklist, budget split and matching vendors in one go",
    browseAll: "Browse all services with filters",
  },
  ml: {
    vendorLogin: "വെണ്ടർ ലോഗിൻ", myPackages: "📦 എന്റെ പാക്കേജുകൾ",
    searchPlaceholder: "ഇവന്റ് സേവനങ്ങൾ, വെണ്ടർമാർ എന്നിവ തിരയുക",
    wishlist: "വിഷ്‌ലിസ്റ്റ്", cart: "കാർട്ട്", myOrders: "എന്റെ ഓർഡറുകൾ",
    login: "ലോഗിൻ", logout: "ലോഗ്ഔട്ട്", allKerala: "എല്ലാ കേരളവും",
    heroHeadline: "ദിവസം പ്ലാൻ ചെയ്യൂ. ആശങ്കകൾ ഒഴിവാക്കൂ.",
    heroSubtext: "വെരിഫൈഡ് ഇവന്റ് പാർട്‌ണർമാരെ താരതമ്യം ചെയ്ത് സുരക്ഷിതമായി ബുക്ക് ചെയ്യൂ — നിങ്ങളുടെ ഇവന്റ് പൂർത്തിയാകുന്നത് വരെ പേയ്‌മെന്റ് എസ്‌ക്രോയിൽ സൂക്ഷിക്കും.",
    searchButton: "തിരയുക", searchInputPlaceholder: "പാക്കേജുകൾ തിരയുക, ഉദാ. 'photography'",
    planWithAi: "✨ AI ഉപയോഗിച്ച് എന്റെ ഇവന്റ് പ്ലാൻ ചെയ്യൂ",
    planWithAiSub: "ഒറ്റയടിക്ക് ഒരു ചെക്ക്‌ലിസ്റ്റ്, ബജറ്റ് വിഭജനം, യോജിക്കുന്ന വെണ്ടർമാർ എന്നിവ നേടൂ",
    browseAll: "ഫിൽട്ടറുകൾക്കൊപ്പം എല്ലാ സേവനങ്ങളും ബ്രൗസ് ചെയ്യൂ",
  },
};
const CATEGORY_LABELS_ML = {
  event: "ഇവന്റ്", birthday: "ബർത്ത്ഡേ", transportation: "ട്രാൻസ്പോർട്ടേഷൻ",
  corporate: "കോർപ്പറേറ്റ് ഇവന്റ്", "local-event": "ലോക്കൽ ഇവന്റ്",
  photography: "ഫോട്ടോഗ്രഫി", "gift-hampers": "ഗിഫ്റ്റ് ഹാമ്പറുകൾ", "surprise-gift": "സർപ്രൈസ് ഗിഫ്റ്റ്",
};

function getLang() { return localStorage.getItem("ek_lang") || "en"; }
function setLang(lang) { localStorage.setItem("ek_lang", lang); window.location.reload(); }
function t(key) { return (TRANSLATIONS[getLang()] && TRANSLATIONS[getLang()][key]) || TRANSLATIONS.en[key] || key; }
function categoryLabel(value) {
  if (getLang() === "ml" && CATEGORY_LABELS_ML[value]) return CATEGORY_LABELS_ML[value];
  const cat = CATEGORIES.find(c => c.value === value);
  return cat ? cat.label : value;
}

// A small custom mark — an abstracted pandal arch (the decorated canopy
// structure used at Kerala weddings/functions) with a brass lamp-flame at its
// peak. Drawn in currentColor-friendly CSS vars so it follows the theme.
function logoMarkSvg() {
  return `<svg width="26" height="26" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="flex:0 0 auto">
    <path d="M4 34 C4 16 14 6 20 6 C26 6 36 16 36 34" stroke="var(--pink)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M20 2 C23 6 23 10.5 20 13.5 C17 10.5 17 6 20 2 Z" fill="var(--gold)"/>
  </svg>`;
}

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
    : `<div class="header-search"><input id="nav-search-input" type="text" placeholder="${t("searchPlaceholder")}"><button onclick="navSearch()">🔍</button></div>`;

  const vendorPillHtml = (user && user.role === "VENDOR")
    ? `<a href="vendor-dashboard.html" class="vendor-pill">${t("myPackages")}</a>`
    : `<a href="vendor-auth.html" class="vendor-pill">${t("vendorLogin")}</a>`;

  const locationHtml = renderLocationPicker();
  const langHtml = `<button id="lang-toggle" class="lang-toggle" title="Switch language">${getLang() === "en" ? "മലയാളം" : "English"}</button>`;

  let rightLinks = "";
  if (user && user.role === "ADMIN") {
    rightLinks += `<a href="admin.html">⚙️ Admin dashboard</a>`;
  }
  if (user && user.role === "CUSTOMER") {
    rightLinks += `<a href="wishlist.html" class="icon-badge">♥ ${t("wishlist")}${wishlistCount ? `<span class="count">${wishlistCount}</span>` : ""}</a>`;
    rightLinks += `<a href="cart.html" class="icon-badge">🛒 ${t("cart")}${cartCount ? `<span class="count">${cartCount}</span>` : ""}</a>`;
    rightLinks += `<a href="bookings.html">${t("myOrders")}</a>`;
  }
  rightLinks += user
    ? `<button id="logout-btn">${user.name} · ${t("logout")}</button>`
    : `<a href="customer-auth.html" class="btn-login">${t("login")}</a>`;

  nav.innerHTML = `
    <div class="logo-block">
      <a href="index.html" class="logo" id="site-logo">${logoMarkSvg()}<span class="logo-word">Loomybox</span></a>
    </div>
    ${vendorPillHtml}
    ${searchHtml}
    ${locationHtml}
    ${langHtml}
    <div class="header-actions">${rightLinks}</div>
  `;

  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) langBtn.onclick = () => setLang(getLang() === "en" ? "ml" : "en");

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

  // If the admin has set a custom site name in Settings, swap in just the
  // wordmark text once it loads — the mark icon stays untouched.
  loadSiteSettings().then(settings => {
    const wordEl = document.querySelector("#site-logo .logo-word");
    if (wordEl && settings.siteName && settings.siteName !== "Loomybox") {
      wordEl.textContent = settings.siteName;
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

// ==========================================================================
// Notification bell + AI support chat widget — injected automatically into
// every page that loads this script, so no per-page markup is needed.
// ==========================================================================

async function renderNotificationBell() {
  const user = getUser();
  if (!user) return;

  const actions = document.querySelector(".header-actions");
  if (!actions || document.getElementById("notif-bell")) return;

  const bell = document.createElement("div");
  bell.id = "notif-bell";
  bell.style.cssText = "position:relative;display:inline-block;cursor:pointer;margin-right:6px";
  bell.innerHTML = `🔔<span id="notif-count" class="count" style="display:none"></span>`;
  actions.prepend(bell);

  const panel = document.createElement("div");
  panel.id = "notif-panel";
  panel.style.cssText = "display:none;position:absolute;top:38px;right:0;width:320px;max-height:400px;overflow-y:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.12);z-index:50";
  bell.appendChild(panel);

  async function refreshCount() {
    try {
      const { count } = await apiFetch("/notifications/unread-count");
      const el = document.getElementById("notif-count");
      if (count > 0) { el.textContent = count; el.style.display = "inline-block"; }
      else { el.style.display = "none"; }
    } catch (e) { /* not logged in yet or backend unreachable */ }
  }

  async function loadPanel() {
    panel.innerHTML = `<div style="padding:14px;font-size:13px;color:var(--ink-soft)">Loading…</div>`;
    try {
      const notifs = await apiFetch("/notifications");
      if (!notifs.length) {
        panel.innerHTML = `<div style="padding:16px;font-size:13px;color:var(--ink-soft);text-align:center">No notifications yet</div>`;
        return;
      }
      panel.innerHTML = notifs.map(n => `
        <div class="notif-item" data-id="${n.id}" data-link="${n.link || ""}" style="padding:11px 14px;border-bottom:1px solid var(--line);font-size:13px;cursor:pointer;${n.read ? "opacity:.6" : "background:var(--pink-tint)"}">
          ${escapeHtml(n.message)}
          <div style="font-size:11px;color:var(--ink-soft);margin-top:3px">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
      `).join("");
      panel.querySelectorAll(".notif-item").forEach(item => {
        item.addEventListener("click", async () => {
          try { await apiFetch(`/notifications/${item.dataset.id}/read`, { method: "POST" }); } catch (e) {}
          if (item.dataset.link) window.location.href = item.dataset.link;
          refreshCount();
        });
      });
    } catch (e) {
      panel.innerHTML = `<div style="padding:14px;font-size:13px;color:var(--ink-soft)">Couldn't load notifications</div>`;
    }
  }

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = panel.style.display === "block";
    panel.style.display = isOpen ? "none" : "block";
    if (!isOpen) loadPanel();
  });
  document.addEventListener("click", () => { panel.style.display = "none"; });

  refreshCount();
  setInterval(refreshCount, 30000); // light polling — good enough without websockets
}

function renderSupportWidget() {
  if (document.getElementById("support-widget-btn")) return;

  const btn = document.createElement("button");
  btn.id = "support-widget-btn";
  btn.textContent = "💬";
  btn.title = "Chat with support";
  btn.style.cssText = "position:fixed;bottom:22px;right:22px;width:52px;height:52px;border-radius:50%;background:var(--pink);color:#fff;border:none;font-size:22px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.2);z-index:100";
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "support-widget-panel";
  panel.style.cssText = "display:none;position:fixed;bottom:84px;right:22px;width:320px;max-height:440px;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);z-index:100;flex-direction:column;overflow:hidden";
  panel.innerHTML = `
    <div style="background:var(--pink);color:#fff;padding:12px 14px;font-weight:600;font-size:14px">Loomybox Support</div>
    <div id="support-msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:13px;display:flex;flex-direction:column;gap:8px;max-height:300px"></div>
    <div style="display:flex;border-top:1px solid var(--line)">
      <input id="support-input" type="text" placeholder="Ask a question…" style="flex:1;border:none;padding:10px 12px;font-size:13px;outline:none">
      <button id="support-send" style="border:none;background:var(--pink);color:#fff;padding:0 16px;cursor:pointer">Send</button>
    </div>
  `;
  document.body.appendChild(panel);

  const history = [];
  function addBubble(role, text) {
    const el = document.createElement("div");
    el.style.cssText = role === "user"
      ? "align-self:flex-end;background:var(--pink);color:#fff;padding:8px 12px;border-radius:12px 12px 2px 12px;max-width:85%"
      : "align-self:flex-start;background:var(--pink-tint);padding:8px 12px;border-radius:12px 12px 12px 2px;max-width:85%";
    el.textContent = text;
    document.getElementById("support-msgs").appendChild(el);
    document.getElementById("support-msgs").scrollTop = 9999;
  }

  btn.addEventListener("click", () => {
    const isOpen = panel.style.display === "flex";
    panel.style.display = isOpen ? "none" : "flex";
    if (!isOpen && !history.length) {
      addBubble("assistant", "Hi! I can answer questions about how booking, payments and escrow work on Loomybox. What's up?");
    }
  });

  async function send() {
    const input = document.getElementById("support-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addBubble("user", text);
    history.push({ role: "user", content: text });
    const thinking = document.createElement("div");
    thinking.id = "support-thinking";
    thinking.style.cssText = "align-self:flex-start;color:var(--ink-soft);font-size:12px";
    thinking.textContent = "Typing…";
    document.getElementById("support-msgs").appendChild(thinking);

    try {
      const { reply } = await apiFetch("/assistant/support", { method: "POST", body: JSON.stringify({ message: text, history }) });
      thinking.remove();
      addBubble("assistant", reply);
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      thinking.remove();
      addBubble("assistant", "Sorry, I'm having trouble right now — please try again in a moment.");
    }
  }
  document.getElementById("support-send").addEventListener("click", send);
  document.getElementById("support-input").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
}

// Auto-inject on every page once the DOM (and renderNav, which builds
// .header-actions) has had a chance to run.
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { renderNotificationBell(); renderSupportWidget(); }, 300);
});
