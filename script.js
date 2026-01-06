/***********************
 * TEXT NORMALIZATION
 ***********************/
function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i");
}

/***********************
 * STORAGE
 ***********************/
const STORAGE_KEY = "products";
const USERS_KEY = "dukkan_users";
const CURRENT_USER_KEY = "dukkan_current_user";
let products = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let selectedProductId = null;

// Migrate old products (add id if missing)
function migrateProducts() {
    let changed = false;
    products = products.map(p => {
        if (!p.id) {
            p.id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
            changed = true;
        }
        return p;
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}
migrateProducts();

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// helper: read File object as Data URL (base64)
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });
}

// small hash helper and random avatar generator (SVG data URI)
function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return h;
}
function generateRandomAvatar(seed) {
    // colors palette
    const colors = ['#EF9A9A','#F48FB1','#CE93D8','#9FA8DA','#81D4FA','#80DEEA','#A5D6A7','#E6EE9C','#FFCC80','#BCAAA4'];
    const s = (seed || Math.random().toString(36));
    const idx = Math.abs(hashCode(s + Date.now().toString())) % colors.length;
    const bg = colors[idx];
    const initial = (s && String(s)[0]) ? String(s)[0].toUpperCase() : '?';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' fill='${bg}' rx='20'/><text x='50%' y='50%' font-size='96' dy='.35em' text-anchor='middle' fill='white' font-family='Arial,Helvetica,sans-serif'>${initial}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/***********************
 * RENDER
 ***********************/
function renderProducts(list) {
    const container = document.getElementById("productsList");
    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = "<p>Ürün yok</p>";
        updateStats();
        updateCriticalList();
        return;
    }

    list.forEach((p) => {
        const isCritical = Number(p.quantity) < 5;
        const div = document.createElement("div");
        div.className = "product" + (selectedProductId === p.id ? " selected" : "");
        div.dataset.id = p.id;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${p.name}</strong>
                <span class="badge ${isCritical ? 'crit-badge' : 'ok-badge'}">${isCritical ? t('critical.label') : t('ok.label')}</span>
            </div>
            Kategori: ${p.category}<br>
            Miktar: ${p.quantity}<br>
            Fiyat: ₺${p.price}<br><br>
            <button class="btn btn-danger" data-id="${p.id}">❌ Sil</button>
        `;
        // select on click (but avoid clicks on the delete button)
        div.addEventListener('click', (ev) => {
            if (ev.target && ev.target.tagName.toLowerCase() === 'button') return;
            selectProduct(p.id);
        });
        // delete button handler
        div.querySelector('button').addEventListener('click', (ev) => {
            ev.stopPropagation();
            deleteProductById(p.id);
        });
        container.appendChild(div);
    });

    updateStats();
    updateCriticalList();
} 

/***********************
 * STATS
 ***********************/
function updateStats() {
    const totalProductsEl = document.getElementById('totalProducts');
    const totalStockEl = document.getElementById('totalStock');
    const totalValueEl = document.getElementById('totalValue');

    if (totalProductsEl) totalProductsEl.textContent = products.length;
    const totalStock = products.reduce((s, p) => s + Number(p.quantity || 0), 0);
    if (totalStockEl) totalStockEl.textContent = totalStock;
    const totalValue = products.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.price || 0)), 0);
    if (totalValueEl) totalValueEl.textContent = '₺' + totalValue.toFixed(2);
}

function updateProductFormState() {
    const user = getCurrentUser();
    const fields = ['productName','productCategory','productQuantity','productPrice','productDescription'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !user;
    });
    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = !user;
    const note = document.getElementById('productLockNote');
    if (note) note.style.display = user ? 'none' : 'block';
} 

function updateCriticalList() {
    const el = document.getElementById('criticalList');
    if (!el) return;
    el.innerHTML = '';
    if (!products || products.length === 0) {
        el.innerHTML = `<p class="empty-message">${t('critical.none')}</p>`;
        return;
    }
    // show critical items first
    const list = [...products].sort((a,b) => (Number(b.quantity < 5) - Number(a.quantity < 5)));
    list.forEach(p => {
        const isCritical = Number(p.quantity) < 5;
        const item = document.createElement('div');
        item.className = 'critical-item' + (isCritical ? ' critical' : ' ok');
        item.dataset.id = p.id;
        item.innerHTML = `<strong>${p.name}</strong> <small style="opacity:.9">(${p.quantity})</small>`;
        item.addEventListener('click', () => selectProduct(p.id));
        el.appendChild(item);
    });
}

/***********************
 * SELECTION
 ***********************/
function selectProduct(id) {
    if (selectedProductId === id) {
        selectedProductId = null;
    } else {
        selectedProductId = id;
    }
    // re-render current filtered view (respect search/filter inputs)
    filterProducts();
}

/***********************
 * ADD PRODUCT
 ***********************/
const productForm = document.getElementById("productForm");
if (productForm) {
    productForm.addEventListener("submit", e => {
        e.preventDefault();

        const product = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
            name: document.getElementById("productName").value.trim(),
            category: document.getElementById("productCategory").value,
            quantity: Number(document.getElementById("productQuantity").value) || 0,
            price: Number(document.getElementById("productPrice").value) || 0
        };

        products.push(product);
        saveProducts();
        renderProducts(products);
        e.target.reset();
    });
}

/***********************
 * DELETE / DELETE BY ID
 ***********************/
function deleteProductById(id) {
    if (!confirm(t('confirm_delete_product'))) return;
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return;
    products.splice(idx, 1);
    if (selectedProductId === id) selectedProductId = null;
    saveProducts();
    filterProducts();
    alert(t('product_deleted'));
}

/***********************
 * DELETE ALL
 ***********************/
const deleteAllBtn = document.getElementById("deleteAllBtn");
if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", () => {
        if (!confirm(t('delete_all_confirm'))) return;
        products = [];
        selectedProductId = null;
        localStorage.removeItem(STORAGE_KEY);
        renderProducts(products);
    });
}

/***********************
 * CLEAR removed per request
 ***********************/

/***********************
 * SEARCH + FILTER
 ***********************/
function filterProducts() {
    const si = document.getElementById("searchInput");
    const fc = document.getElementById("filterCategory");
    const search = si ? normalizeText(si.value) : "";
    const cat = fc ? fc.value : "";

    const filtered = products.filter(p => {
        const name = normalizeText(p.name);
        return name.includes(search) && (cat === "" || p.category === cat);
    });

    renderProducts(filtered);
}

const searchInputEl = document.getElementById("searchInput");
if (searchInputEl) searchInputEl.addEventListener("input", filterProducts);
const filterCategoryEl = document.getElementById("filterCategory");
if (filterCategoryEl) filterCategoryEl.addEventListener("change", filterProducts);

/***********************
 * AUTH (SIGNUP / LOGIN)
 ***********************/
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}
function saveUsers(u) {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

// Signup handler (if page has signup form)
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('suUsername').value.trim();
        const password = document.getElementById('suPassword').value;
        const display = document.getElementById('suDisplay').value.trim() || username;
        if (!username || !password) {
            alert(t('username_password_required'));
            return;
        }
        const users = getUsers();
        if (users.some(u => u.username === username)) {
            alert(t('signup_user_taken'));
            return;
        }
        // handle avatar file if provided
        const avatarInput = document.getElementById('suAvatar');
        let avatarData = null;
        if (avatarInput && avatarInput.files && avatarInput.files[0]) {
            try {
                avatarData = await readFileAsDataURL(avatarInput.files[0]);
            } catch (err) {
                console.warn('Avatar load failed', err);
            }
        }
        // if no avatar uploaded, generate and persist a random one
        if (!avatarData) {
            avatarData = generateRandomAvatar(username || Math.random().toString(36));
        }
        const address = document.getElementById('suAddress') ? document.getElementById('suAddress').value.trim() : '';
        const newUser = {username, password, display};
        if (avatarData) newUser.avatar = avatarData;
        if (address) newUser.address = address;
        users.push(newUser);
        saveUsers(users);
        localStorage.setItem(CURRENT_USER_KEY, username);
        // set default package
        if (!localStorage.getItem('dukkan_package')) {
            localStorage.setItem('dukkan_package', JSON.stringify({name: 'Ücretsiz', limit: 100}));
        }
        window.location.href = 'index.html';
    });
}

// signup avatar preview setup
const suAvatarInput = document.getElementById('suAvatar');
const suAvatarPreview = document.getElementById('suAvatarPreview');
if (suAvatarInput && suAvatarPreview) {
    suAvatarInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) suAvatarPreview.src = URL.createObjectURL(f);
        else suAvatarPreview.src = '';
    });
}

// Login handler (if page has login form)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('liUsername').value.trim();
        const password = document.getElementById('liPassword').value;
        const remember = document.getElementById('liRemember') && document.getElementById('liRemember').checked;
        const users = getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            alert(t('login_wrong'));
            return;
        }
        // set current user (if remember, we keep it; otherwise still store — simple app)
        localStorage.setItem(CURRENT_USER_KEY, username);
        const temp = localStorage.getItem('dukkan_temp_action');
        if (temp === 'buy') {
            localStorage.removeItem('dukkan_temp_action');
            window.location.href = 'subscription.html';
        } else {
            window.location.href = 'index.html';
        }
    });
}

function getCurrentUser() {
    const u = localStorage.getItem(CURRENT_USER_KEY);
    if (!u) return null;
    const users = getUsers();
    return users.find(x => x.username === u) || {username: u, display: u};
}

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'index.html';
}

// TRANSLATIONS: simple key-value map for a few UI strings
const TRANSLATIONS = {
    tr: {
        'nav.title': '🏪 Dükkan Mal Takip Sistemi',
        'nav.subtitle': 'Envanterinizi Kolayca Yönetin',
        'nav.login': 'Giriş Yap',
        'nav.signup': 'Katıl',
        'nav.subs': 'Abonelikler',
        'nav.settings': 'Ayarlar',
        'nav.home': '← Ana Sayfaya Dön',
        'nav.subLabel': 'Abonelik:',
        'nav.weekly': 'Haftalık Kalan:',
        'lang.tr': 'Türkçe',
        'lang.en': 'English',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'products.add': 'Yeni Ürün Ekle',
        'products.login_required': 'Ürün eklemek için giriş yapın veya kayıt olun',
        'products.add_requires_login': 'Lütfen ürün eklemek için giriş yapın',
        'login.title': '🔐 Giriş Yap',
        'login.subtitle': 'Hesabınıza giriş yapın',
        'signup.title': '📝 Yeni Hesap Oluştur',
        'signup.subtitle': 'Ücretsiz pakete başlayın',
        'btn.login': 'Giriş Yap',
        'btn.signup': 'Hesap Oluştur',
        'settings.title': '⚙️ Ayarlar',
        'settings.subtitle': 'Hesap bilgilerinizi güncelleyin',
        'settings.account': 'Hesap',
        'settings.language': 'Dil',
        'settings.userLabel': 'Kullanıcı:',
        'settings.accountNote': 'Giriş yapmadan sadece görüntülenen ismi değiştiremezsiniz. Lütfen giriş yapın.',
        'settings.displayLabel': 'Görünen İsim',
        'settings.passwordLabel': 'Yeni Şifre (isteğe bağlı)',
        'settings.addressLabel': 'Dükkan Adresi',
        'settings.addressPlaceholder': 'Dükkan adresinizi girin',
        'settings.avatarLabel': 'Profil Resmi',
        'remove_avatar': 'Resmi Kaldır',
        'settings.interface': 'Arayüz',
        'settings.interfaceNote': 'Ayarlarınızı kişiselleştirin (Karanlık tema yok — siyah yapma isteğine göre açık tutuldu).',
        'settings.themeLabel': 'Temayı Seç',
        'theme.light': 'Açık (varsayılan)',
        'theme.soft': 'Yumuşak',
        'theme.dark': 'Koyu',
        'save': 'Kaydet',
        'settings_saved': 'Ayarlar kaydedildi',
        'account_saved': 'Hesap ayarları kaydedildi',
        'confirm_delete_product': 'Bu ürünü silmek istiyor musunuz?',
        'delete_all_confirm': 'Tüm ürünler silinsin mi?',
        'product_deleted': 'Ürün silindi',
        'critical.title': 'Kritik',
        'critical.none': 'Kritik ürün yok',
        'critical.label': 'Kritik',
        'ok.label': 'Tamam',
        'login_wrong': 'Kullanıcı adı veya şifre yanlış',
        'signup_user_taken': 'Bu kullanıcı adı zaten alınmış',
        'username_password_required': 'Kullanıcı adı ve şifre gerekli',
        'account_changes_require_login': 'Hesap değişiklikleri için giriş yapın',
        'greeting': 'Hoşgeldiniz,',
        'logout': 'Çıkış'
    },
    en: {
        'nav.title': '🏪 Shop Inventory',
        'nav.subtitle': 'Manage your inventory easily',
        'nav.login': 'Login',
        'nav.signup': 'Sign Up',
        'nav.subs': 'Subscriptions',
        'nav.settings': 'Settings',
        'nav.home': '← Back to Home',
        'nav.subLabel': 'Subscription:',
        'nav.weekly': 'Weekly Remaining:',
        'lang.tr': 'Türkçe',
        'lang.en': 'English',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'products.add': 'Add New Product',
        'products.login_required': 'Sign in or sign up to add products',
        'products.add_requires_login': 'Please sign in to add a product',
        'login.title': '🔐 Login',
        'login.subtitle': 'Sign in to your account',
        'signup.title': '📝 Create Account',
        'signup.subtitle': 'Start with the free plan',
        'btn.login': 'Login',
        'btn.signup': 'Create Account',
        'settings.title': '⚙️ Settings',
        'settings.subtitle': 'Update your account',
        'settings.account': 'Account',
        'settings.language': 'Language',
        'settings.userLabel': 'User:',
        'settings.accountNote': 'You must be signed in to change display name.',
        'settings.displayLabel': 'Display Name',
        'settings.passwordLabel': 'New Password (optional)',
        'settings.addressLabel': 'Store Address',
        'settings.addressPlaceholder': 'Enter store address',
        'settings.avatarLabel': 'Profile Image',
        'remove_avatar': 'Remove Image',
        'settings.interface': 'Interface',
        'settings.interfaceNote': 'Customize your interface (no dark/black theme).',
        'settings.themeLabel': 'Choose theme',
        'theme.light': 'Light (default)',
        'theme.dark': 'Dark',
        'save': 'Save',
        'settings_saved': 'Settings saved',
        'account_saved': 'Account settings saved',
        'confirm_delete_product': 'Are you sure you want to delete this product?',
        'delete_all_confirm': 'Delete ALL products?',
        'product_deleted': 'Product deleted',
        'critical.title': 'Critical',
        'critical.none': 'No critical products',
        'critical.label': 'Critical',
        'ok.label': 'OK',
        'login_wrong': 'Username or password is incorrect',
        'signup_user_taken': 'That username is already taken',
        'username_password_required': 'Username and password are required',
        'account_changes_require_login': 'Please sign in to change account settings',
        'greeting': 'Welcome,',
        'logout': 'Logout'
    },
    es: {
        'nav.title': '🏪 Inventario de Tienda',
        'nav.subtitle': 'Administra tu inventario fácilmente',
        'nav.login': 'Iniciar Sesión',
        'nav.signup': 'Registrarse',
        'nav.subs': 'Suscripciones',
        'nav.settings': 'Ajustes',
        'nav.home': '← Volver al Inicio',
        'nav.subLabel': 'Suscripción:',
        'nav.weekly': 'Restante Semanal:',
        'lang.tr': 'Türkçe',
        'lang.en': 'English',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'products.add': 'Agregar Producto',
        'products.login_required': 'Inicie sesión o regístrese para agregar productos',
        'products.add_requires_login': 'Por favor, inicie sesión para agregar un producto',
        'login.title': '🔐 Iniciar Sesión',
        'login.subtitle': 'Ingrese a su cuenta',
        'signup.title': '📝 Crear Cuenta',
        'signup.subtitle': 'Comience con el plan gratuito',
        'btn.login': 'Ingresar',
        'btn.signup': 'Crear Cuenta',
        'settings.title': '⚙️ Ajustes',
        'settings.subtitle': 'Actualiza tu cuenta',
        'settings.account': 'Cuenta',
        'settings.language': 'Idioma',
        'settings.userLabel': 'Usuario:',
        'settings.accountNote': 'Debe iniciar sesión para cambiar el nombre visible.',
        'settings.displayLabel': 'Nombre Visible',
        'settings.passwordLabel': 'Nueva Contraseña (opcional)',
        'settings.addressLabel': 'Dirección de la tienda',
        'settings.addressPlaceholder': 'Introduce la dirección de la tienda',
        'settings.avatarLabel': 'Imagen de Perfil',
        'remove_avatar': 'Eliminar imagen',
        'settings.interface': 'Interfaz',
        'settings.interfaceNote': 'Personaliza tu interfaz (sin tema negro).',
        'settings.themeLabel': 'Seleccionar tema',
        'theme.light': 'Claro (predeterminado)',
        'theme.dark': 'Oscuro',
        'save': 'Guardar',
        'settings_saved': 'Ajustes guardados',
        'account_saved': 'Ajustes de cuenta guardados',
        'confirm_delete_product': '¿Seguro que quieres eliminar este producto?',
        'delete_all_confirm': '¿Eliminar TODOS los productos?',
        'product_deleted': 'Producto eliminado',
        'critical.title': 'Crítico',
        'critical.none': 'No hay productos críticos',
        'critical.label': 'Crítico',
        'ok.label': 'Bien',
        'login_wrong': 'Usuario o contraseña incorrectos',
        'signup_user_taken': 'Ese nombre de usuario ya existe',
        'username_password_required': 'Usuario y contraseña requeridos',
        'account_changes_require_login': 'Inicie sesión para cambiar la cuenta',
        'greeting': 'Bienvenido,',
        'logout': 'Cerrar Sesión'
    },
    fr: {
        'nav.title': '🏪 Gestion de Stock',
        'nav.subtitle': 'Gérez votre inventaire facilement',
        'nav.login': 'Connexion',
        'nav.signup': 'S’inscrire',
        'nav.subs': 'Abonnements',
        'nav.settings': 'Paramètres',
        'nav.home': '← Retour à l’accueil',
        'nav.subLabel': 'Abonnement:',
        'nav.weekly': 'Restant Hebdomadaire:',
        'lang.tr': 'Türkçe',
        'lang.en': 'English',
        'lang.es': 'Español',
        'lang.fr': 'Français',
        'products.add': 'Ajouter un produit',
        'products.login_required': 'Connectez-vous ou inscrivez-vous pour ajouter des produits',
        'products.add_requires_login': 'Veuillez vous connecter pour ajouter un produit',
        'login.title': '🔐 Connexion',
        'login.subtitle': 'Connectez-vous à votre compte',
        'signup.title': '📝 Créer un compte',
        'signup.subtitle': 'Commencez avec le forfait gratuit',
        'btn.login': 'Connexion',
        'btn.signup': 'Créer un compte',
        'settings.title': '⚙️ Paramètres',
        'settings.subtitle': 'Mettez à jour votre compte',
        'settings.account': 'Compte',
        'settings.language': 'Langue',
        'settings.userLabel': 'Utilisateur:',
        'settings.accountNote': 'Vous devez être connecté pour changer le nom affiché.',
        'settings.displayLabel': "Nom d'affichage",
        'settings.passwordLabel': 'Nouveau mot de passe (optionnel)',
        'settings.addressLabel': 'Adresse du magasin',
        'settings.addressPlaceholder': 'Entrez l\'adresse du magasin',
        'settings.avatarLabel': 'Image de profil',
        'remove_avatar': 'Supprimer l\'image',
        'settings.interface': 'Interface',
        'settings.interfaceNote': "Personnalisez l'interface (pas de thème noir).",
        'settings.themeLabel': 'Choisir le thème',
        'theme.light': 'Clair (par défaut)',
        'theme.dark': 'Sombre',
        'save': 'Enregistrer',
        'settings_saved': 'Paramètres enregistrés',
        'account_saved': 'Paramètres du compte enregistrés',
        'confirm_delete_product': 'Voulez-vous vraiment supprimer ce produit ?',
        'delete_all_confirm': 'Supprimer TOUS les produits ?',
        'product_deleted': 'Produit supprimé',
        'critical.title': 'Critique',
        'critical.none': 'Aucun produit critique',
        'critical.label': 'Critique',
        'ok.label': 'OK',
        'login_wrong': 'Nom d’utilisateur ou mot de passe incorrect',
        'signup_user_taken': 'Ce nom d’utilisateur est déjà pris',
        'username_password_required': 'Nom d’utilisateur et mot de passe requis',
        'account_changes_require_login': 'Veuillez vous connecter pour modifier le compte',
        'greeting': 'Bienvenue,',
        'logout': 'Déconnexion'
    }
};

function t(key) {
    const settings = JSON.parse(localStorage.getItem('dukkan_settings') || '{}');
    const lang = settings.language || 'tr';
    const tr = TRANSLATIONS[lang] || TRANSLATIONS['tr'];
    return (tr && tr[key]) ? tr[key] : key;
}

function applyTranslations() {
    const settings = JSON.parse(localStorage.getItem('dukkan_settings') || '{}');
    const lang = settings.language || 'tr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const txt = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS['tr'][key] || el.textContent;
        // if it's an <option> or input placeholder, set appropriately
        if (el.tagName.toLowerCase() === 'option') el.textContent = txt;
        else if (el.tagName.toLowerCase() === 'input' && el.type === 'text') el.placeholder = txt;
        else el.textContent = txt;
    });
}

function applyTheme() {
    const settings = JSON.parse(localStorage.getItem('dukkan_settings') || '{}');
    const theme = settings.theme || 'light';
    document.body.classList.remove('theme-soft');
    document.body.classList.remove('theme-dark');
    // apply either dark or leave light (default)
    if (theme === 'dark') document.body.classList.add('theme-dark');
}

function updateAuthUI() {
    const authActions = document.querySelector('.auth-actions');
    if (!authActions) return;
    const user = getCurrentUser();
    if (user) {
        // ensure user has an avatar; if not, persist a generated one so it's stable
        if (!user.avatar) {
            const users = getUsers();
            const idx = users.findIndex(u => u.username === user.username);
            const gen = generateRandomAvatar(user.username || Math.random().toString(36));
            if (idx !== -1) { users[idx].avatar = gen; saveUsers(users); user.avatar = gen; }
            else { user.avatar = gen; }
        }
        authActions.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${user.avatar}" class="auth-avatar">
                <div style="display:flex; flex-direction:column;">
                    <span>${t('greeting')} <strong>${user.display || user.username}</strong></span>
                    ${user.address ? `<small style="color:#666;">${user.address}</small>` : ''}
                </div>
                <button id="logoutBtn" class="btn btn-clear">${t('logout')}</button>
                <a href="subscription.html" class="btn btn-clear">${t('nav.subs')}</a>
                <a href="settings.html" class="btn btn-clear">${t('nav.settings')}</a>
            </div>
        `;
        const lb = document.getElementById('logoutBtn');
        if (lb) lb.addEventListener('click', logout);
    } else {
        // ensure the logged-out labels are translated in DOM too (for static anchors)
        const loginLink = document.querySelector('a[href="login.html"]');
        const signupLink = document.querySelector('a[href="signup.html"]');
        const subsLink = document.querySelector('a[href="subscription.html"]');
        const settingsLink = document.querySelector('a[href="settings.html"]');
        if (loginLink) loginLink.textContent = t('nav.login');
        if (signupLink) signupLink.textContent = t('nav.signup');
        if (subsLink) subsLink.textContent = t('nav.subs');
        if (settingsLink) settingsLink.textContent = t('nav.settings');
    }
    // keep product form state in sync with auth
    if (typeof updateProductFormState === 'function') updateProductFormState();
}

// SETTINGS handler (account save)
const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        // we handle account saves via saveAccount button; prevent default to be safe
        e.preventDefault();
    });
}
const saveAccountBtn = document.getElementById('saveAccount');
if (saveAccountBtn) {
    saveAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user) {
            alert(t('account_changes_require_login'));
            return;
        }
        const display = document.getElementById('setDisplay').value.trim();
        const newPass = document.getElementById('setPassword').value;
        const users = getUsers();
        const idx = users.findIndex(u => u.username === user.username);
        if (idx === -1) return;
        if (display) users[idx].display = display;
        if (newPass) users[idx].password = newPass;
        saveUsers(users);
        alert(t('account_saved'));
        updateAuthUI();
    });
}

// Global save button (saves interface + account if available)
const globalSaveBtn = document.getElementById('globalSave');
if (globalSaveBtn) {
    globalSaveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // save interface/language
        const langEl = document.getElementById('uiLanguage');
        const themeEl = document.getElementById('uiTheme');
        const lang = langEl ? langEl.value : (JSON.parse(localStorage.getItem('dukkan_settings')||'{}').language || 'tr');
        const theme = themeEl ? themeEl.value : (JSON.parse(localStorage.getItem('dukkan_settings')||'{}').theme || 'light');
        const settings = { language: lang, theme };
        localStorage.setItem('dukkan_settings', JSON.stringify(settings));
        applyTranslations();
        applyTheme();
        updateAuthUI();

        // attempt to save account changes if user is logged in
        const user = getCurrentUser();
        let accountChanged = false;
        if (user) {
            const displayEl = document.getElementById('setDisplay');
            const passEl = document.getElementById('setPassword');
            const avatarInput = document.getElementById('setAvatar');
            const avatarPreview = document.getElementById('setAvatarPreview');
            const display = displayEl ? displayEl.value.trim() : '';
            const newPass = passEl ? passEl.value : '';
            const users = getUsers();
            const idx = users.findIndex(u => u.username === user.username);
            if (idx !== -1) {
                if (display) { users[idx].display = display; accountChanged = true; }
                if (newPass) { users[idx].password = newPass; accountChanged = true; }
                // address
                const setAddress = document.getElementById('setAddress');
                if (setAddress) {
                    const newAddr = setAddress.value.trim();
                    if (newAddr !== (users[idx].address || '')) { users[idx].address = newAddr; accountChanged = true; }
                }
                // handle avatar changes: remove flag or file
                if (avatarPreview && avatarPreview.dataset && avatarPreview.dataset.remove === '1') {
                    // instead of leaving it empty, assign a new random avatar and persist
                    users[idx].avatar = generateRandomAvatar(users[idx].username || Math.random().toString(36));
                    accountChanged = true;
                } else if (avatarInput && avatarInput.files && avatarInput.files[0]) {
                    try {
                        const data = await readFileAsDataURL(avatarInput.files[0]);
                        users[idx].avatar = data;
                        accountChanged = true;
                    } catch (err) { console.warn('avatar save failed', err); }
                }
                if (accountChanged) {
                    saveUsers(users);
                    // clear password field after saving
                    if (passEl) passEl.value = '';
                    updateAuthUI();
                }
            }
        }

        // final notification
        if (accountChanged) alert(t('account_saved'));
        else alert(t('settings_saved'));
    });
}

// load package info on index header if present
function loadPackageHeader() {
    const pkg = localStorage.getItem('dukkan_package');
    if (!pkg) return;
    try {
        const p = JSON.parse(pkg);
        const el = document.getElementById('currentPackage');
        const rem = document.getElementById('weeklyRemaining');
        if (el) el.textContent = p.name || 'Ücretsiz';
        if (rem) {
            if (p.limit === 'unlimited') rem.textContent = '∞';
            else rem.textContent = p.limit || '100';
        }
    } catch (e) {}
}

/***********************
 * INIT
 ***********************/
applyTranslations();
applyTheme();
updateAuthUI();
loadPackageHeader();
renderProducts(products);

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    applyTheme();
});
