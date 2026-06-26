import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, set, get, push, remove, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBG9bjkl2SMP5sxU6b_7168AkbyinRwVFg",
    authDomain: "sanitory-c8707.firebaseapp.com",
    projectId: "sanitory-c8707",
    storageBucket: "sanitory-c8707.firebasestorage.app",
    messagingSenderId: "838211662312",
    appId: "1:838211662312:web:8602e5e77721a87925345d",
    measurementId: "G-3P1XKTYBHZ",
    databaseURL: "https://sanitory-c8707-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let cart = [];
let currentCategory = null;
let isAdminAuthorized = false;
let logoDataUrl = null;

// ==================== LOADING SCREEN ====================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            document.getElementById('app').classList.remove('hidden');
            initAnimations();
            loadFirebaseData();
        }, 800);
    }, 2200);
});

// ==================== INIT ====================
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
    createParticles();
    loadCartFromStorage();
}

function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 8 + 3}px;
            height: ${Math.random() * 8 + 3}px;
            background: rgba(30, 136, 229, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 4 + 3}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        container.appendChild(particle);
    }
}

// ==================== FIREBASE DATA ====================
async function loadFirebaseData() {
    try {
        const companySnap = await get(ref(db, 'company'));
        if (companySnap.exists()) {
            const data = companySnap.val();
            if (data.name) {
                document.getElementById('nav-company-name').textContent = data.name;
                document.title = data.name + ' - Premium Sanitary Solutions';
            }
            if (data.logo) {
                document.getElementById('nav-logo').src = data.logo;
                logoDataUrl = data.logo;
            }
        }

        const aboutSnap = await get(ref(db, 'about'));
        if (aboutSnap.exists()) {
            const aboutData = aboutSnap.val();
            document.getElementById('about-text-content').innerHTML = aboutData.content || '';
            document.getElementById('hero-about-text').textContent = aboutData.heroText || document.getElementById('hero-about-text').textContent;
            if (aboutData.image) {
                document.getElementById('about-page-image').src = aboutData.image;
            }
        }

        loadCategories();
        loadProducts();
        loadFooterFromFirebase();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadCategories() {
    try {
        const snap = await get(ref(db, 'categories'));
        const grid = document.getElementById('categories-grid');
        grid.innerHTML = '';

        if (snap.exists()) {
            const data = snap.val();
            Object.entries(data).forEach(([key, cat]) => {
                const card = document.createElement('div');
                card.className = 'category-card animate-in';
                card.onclick = () => showProducts(key, cat.name);
                card.innerHTML = `
                    <img src="${cat.image}" alt="${cat.name}" class="category-card-img">
                    <div class="category-card-info">
                        <h3>${cat.name}</h3>
                        <p>Explore our ${cat.name.toLowerCase()} collection</p>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<p style="text-align:center; color:#777; grid-column:1/-1; padding:40px;">No categories yet. Add some from the admin panel!</p>';
        }

        // Update admin category select
        updateCategorySelect();
        reobserveAnimations();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadProducts(categoryKey = null) {
    try {
        const snap = await get(ref(db, 'products'));
        const grid = document.getElementById('products-grid');

        if (categoryKey) {
            grid.innerHTML = '';
            if (snap.exists()) {
                const data = snap.val();
                let found = false;
                Object.entries(data).forEach(([key, prod]) => {
                    if (prod.category === categoryKey) {
                        found = true;
                        const card = createProductCard(key, prod);
                        grid.appendChild(card);
                    }
                });
                if (!found) {
                    grid.innerHTML = '<p style="text-align:center; color:#777; grid-column:1/-1; padding:40px;">No products in this category yet.</p>';
                }
            } else {
                grid.innerHTML = '<p style="text-align:center; color:#777; grid-column:1/-1; padding:40px;">No products available yet.</p>';
            }
        }

        reobserveAnimations();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createProductCard(key, prod) {
    const card = document.createElement('div');
    card.className = 'product-card animate-in';
    const inCart = cart.some(item => item.key === key);
    card.innerHTML = `
        <img src="${prod.image}" alt="${prod.name}" class="product-card-img">
        <div class="product-card-info">
            <h3>${prod.name}</h3>
            <p>${prod.description}</p>
            <div class="product-price">₹${prod.price}</div>
            <button class="btn ${inCart ? 'btn-outline' : 'btn-primary'} full-width" onclick="addToCart('${key}')" ${inCart ? 'disabled' : ''}>
                <i class="fas fa-${inCart ? 'check' : 'cart-plus'}"></i> ${inCart ? 'Added to Cart' : 'Add to Cart'}
            </button>
        </div>
    `;
    return card;
}

// Update admin category list
async function updateAdminCategoriesList() {
    try {
        const snap = await get(ref(db, 'categories'));
        const list = document.getElementById('admin-categories-list');
        list.innerHTML = '';

        if (snap.exists()) {
            const data = snap.val();
            Object.entries(data).forEach(([key, cat]) => {
                const item = document.createElement('div');
                item.className = 'admin-list-item';
                item.innerHTML = `
                    <img src="${cat.image}" alt="${cat.name}">
                    <div class="admin-list-item-info">
                        <h4>${cat.name}</h4>
                    </div>
                    <div class="admin-list-item-actions">
                        <button class="btn-edit" onclick="editCategory('${key}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-delete" onclick="deleteCategory('${key}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                `;
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<p style="color:#777;">No categories added yet.</p>';
        }
    } catch (error) {
        console.error('Error loading admin categories:', error);
    }
}

// Update admin products list
async function updateAdminProductsList() {
    try {
        const snap = await get(ref(db, 'products'));
        const list = document.getElementById('admin-products-list');
        list.innerHTML = '';

        if (snap.exists()) {
            const data = snap.val();
            Object.entries(data).forEach(([key, prod]) => {
                const item = document.createElement('div');
                item.className = 'admin-list-item';
                item.innerHTML = `
                    <img src="${prod.image}" alt="${prod.name}">
                    <div class="admin-list-item-info">
                        <h4>${prod.name}</h4>
                        <p>₹${prod.price} &bull; ${prod.description.substring(0, 50)}...</p>
                    </div>
                    <div class="admin-list-item-actions">
                        <button class="btn-edit" onclick="editProduct('${key}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn-delete" onclick="deleteProduct('${key}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                `;
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<p style="color:#777;">No products added yet.</p>';
        }
    } catch (error) {
        console.error('Error loading admin products:', error);
    }
}

function updateCategorySelect() {
    const select = document.getElementById('admin-product-category');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Select Category</option>';

    get(ref(db, 'categories')).then(snap => {
        if (snap.exists()) {
            Object.entries(snap.val()).forEach(([key, cat]) => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = cat.name;
                select.appendChild(opt);
            });
            if (current) select.value = current;
        }
    });
}

function reobserveAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-in:not(.visible)').forEach(el => observer.observe(el));
}

// ==================== NAVIGATION ====================
function showNormalNav() {
    document.getElementById('nav-links').classList.remove('hidden');
    document.getElementById('nav-links').style.display = '';
    document.getElementById('admin-logout-btn').classList.add('hidden');
    document.getElementById('mobile-menu').classList.remove('show');
    document.getElementById('site-footer').classList.remove('hidden');
}

function showAdminNav() {
    document.getElementById('nav-links').classList.add('hidden');
    document.getElementById('nav-links').style.display = 'none';
    document.getElementById('admin-logout-btn').classList.remove('hidden');
    document.getElementById('mobile-menu').classList.remove('show');
    document.getElementById('mobile-menu').classList.add('hidden');
}

window.showSection = function(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('admin-section').classList.add('hidden');
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (navLink) navLink.classList.add('active');

    showNormalNav();
    window.scrollTo(0, 0);
    setTimeout(reobserveAnimations, 100);
};

window.showProducts = function(categoryKey, categoryName) {
    currentCategory = categoryKey;
    document.getElementById('current-category-name').textContent = categoryName;
    document.getElementById('products-title').textContent = categoryName;
    loadProducts(categoryKey);
    showSection('products');
};

window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.remove('hidden');
    menu.classList.toggle('show');
};

// ==================== MODALS ====================
window.openModal = function(id) {
    document.getElementById(id).classList.add('show');
};

window.closeModal = function(id) {
    document.getElementById(id).classList.remove('show');
};

// ==================== CART ====================
function saveCartToStorage() {
    localStorage.setItem('hindlux_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('hindlux_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

window.addToCart = async function(productKey) {
    const existing = cart.find(item => item.key === productKey);
    if (existing) {
        showToast('Already in cart');
        return;
    }

    try {
        const snap = await get(ref(db, `products/${productKey}`));
        if (snap.exists()) {
            const prod = snap.val();
            cart.push({
                key: productKey,
                name: prod.name,
                description: prod.description,
                price: prod.price,
                image: prod.image
            });
            saveCartToStorage();
            updateCartUI();
            showToast(`${prod.name} added to cart`);
            if (currentCategory) loadProducts(currentCategory);
        }
    } catch (error) {
        console.error('Add to cart error:', error);
    }
};

window.removeFromCart = function(index) {
    const name = cart[index].name;
    cart.splice(index, 1);
    saveCartToStorage();
    updateCartUI();
    showToast(`${name} removed from cart`);
    if (currentCategory) loadProducts(currentCategory);
};

function updateCartUI() {
    const count = cart.length;
    const badge = document.getElementById('cart-count');
    const cartEmpty = document.getElementById('cart-empty');
    const cartContent = document.getElementById('cart-content');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total-price');

    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (count === 0) {
        cartEmpty.classList.remove('hidden');
        cartContent.classList.add('hidden');
        return;
    }

    cartEmpty.classList.add('hidden');
    cartContent.classList.remove('hidden');

    cartItems.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.description.substring(0, 80)}...</p>
            </div>
            <div class="cart-item-price">₹${item.price}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        cartItems.appendChild(itemEl);
    });

    cartTotal.textContent = `₹${total}`;
}

window.checkoutWhatsApp = async function() {
    if (cart.length === 0) {
        showToast('Your cart is empty');
        return;
    }

    let message = `🛒 *New Order from Hindlux*%0A%0A`;
    message += `📦 *Products:*%0A`;

    let total = 0;
    cart.forEach((item, i) => {
        total += item.price;
        message += `${i + 1}. ${item.name} - ₹${item.price}%0A`;
        message += `   _${item.description.substring(0, 60)}..._%0A`;
    });

    message += `%0A💰 *Total: ₹${total}*%0A%0A`;
    message += `_Sent from Hindlux E-Commerce App_`;

    window.open(`https://wa.me/918086438990?text=${message}`, '_blank');

    cart = [];
    saveCartToStorage();
    updateCartUI();
    showToast('Order placed successfully!');
};

// ==================== ADMIN OTP ====================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        if (isAdminAuthorized) {
            showAdminSection();
        } else {
            openModal('admin-auth-modal');
        }
    }
});

// Mobile: Long press on logo (3 seconds) to open admin
let logoPressTimer = null;
const navLogo = document.getElementById('nav-logo');
if (navLogo) {
    navLogo.addEventListener('touchstart', function(e) {
        logoPressTimer = setTimeout(() => {
            if (isAdminAuthorized) {
                showAdminSection();
            } else {
                openModal('admin-auth-modal');
            }
        }, 3000);
    });
    navLogo.addEventListener('touchend', function() {
        clearTimeout(logoPressTimer);
    });
    navLogo.addEventListener('touchmove', function() {
        clearTimeout(logoPressTimer);
    });
}

// Also allow long press on footer admin link
document.addEventListener('DOMContentLoaded', function() {
    const footerAdmin = document.getElementById('footer-admin-link');
    if (footerAdmin) {
        footerAdmin.addEventListener('click', function() {
            if (isAdminAuthorized) {
                showAdminSection();
            } else {
                openModal('admin-auth-modal');
            }
        });
    }
});

window.sendOTP = async function() {
    const btn = document.getElementById('send-otp-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    showOTPMessage('Sending OTP...', 'success');

    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('otp-step-1').classList.add('hidden');
            document.getElementById('otp-step-2').classList.remove('hidden');
            showOTPMessage('OTP sent to registered email', 'success');
        } else {
            showOTPMessage(data.message || 'Failed to send OTP. Try again.', 'error');
        }
    } catch (error) {
        console.error('OTP send error:', error);
        showOTPMessage('Cannot connect to server. Make sure the server is running.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Authorization OTP';
};

window.verifyOTP = async function() {
    const otp = document.getElementById('otp-input').value.trim();

    if (otp.length !== 6) {
        showOTPMessage('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });
        const data = await response.json();

        if (data.success) {
            isAdminAuthorized = true;
            closeModal('admin-auth-modal');
            showAdminSection();
            showToast('Admin authorized successfully!');
        } else {
            showOTPMessage(data.message || 'Invalid OTP', 'error');
        }
    } catch (error) {
        console.error('OTP verify error:', error);
        showOTPMessage('Cannot connect to server. Make sure the server is running.', 'error');
    }
};

function showOTPMessage(msg, type) {
    const el = document.getElementById('otp-message');
    el.textContent = msg;
    el.className = `otp-message ${type}`;
    el.classList.remove('hidden');
}

function showAdminSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('admin-section').classList.remove('hidden');
    document.getElementById('admin-section').classList.add('active');
    document.getElementById('site-footer').classList.add('hidden');
    showAdminNav();
    window.scrollTo(0, 0);
    loadAdminData();
}

window.adminLogout = function() {
    isAdminAuthorized = false;
    showSection('landing');
    showToast('Logged out from admin');
};

async function loadAdminData() {
    // Load company details
    const companySnap = await get(ref(db, 'company'));
    if (companySnap.exists()) {
        const data = companySnap.val();
        document.getElementById('admin-company-name').value = data.name || '';
        if (data.logo) {
            document.getElementById('admin-logo-preview').src = data.logo;
            document.getElementById('admin-logo-preview').classList.remove('hidden');
            logoDataUrl = data.logo;
        }
    }

    // Load about content
    const aboutSnap = await get(ref(db, 'about'));
    if (aboutSnap.exists()) {
        const aboutData = aboutSnap.val();
        document.getElementById('admin-about-content').value = aboutData.content || '';
        if (aboutData.image) {
            document.getElementById('admin-about-preview').src = aboutData.image;
            document.getElementById('admin-about-preview').classList.remove('hidden');
        }
    }

    // Load about image on main page
    const aboutPageSnap = await get(ref(db, 'about'));
    if (aboutPageSnap.exists() && aboutPageSnap.val().image) {
        document.getElementById('about-page-image').src = aboutPageSnap.val().image;
    }

    updateCategorySelect();
    updateAdminCategoriesList();
    updateAdminProductsList();
    loadFooterToAdmin();
}

window.switchAdminTab = function(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'categories-admin') updateAdminCategoriesList();
    if (tabName === 'products-admin') {
        updateCategorySelect();
        updateAdminProductsList();
    }
};

// ==================== ADMIN OPERATIONS ====================
window.previewLogo = function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            logoDataUrl = ev.target.result;
            const preview = document.getElementById('admin-logo-preview');
            preview.src = ev.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
};

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

window.saveCompanyDetails = async function(e) {
    e.preventDefault();
    const name = document.getElementById('admin-company-name').value.trim();

    if (!name) {
        showToast('Please enter company name');
        return;
    }

    try {
        const data = { name };
        if (logoDataUrl) data.logo = logoDataUrl;

        await set(ref(db, 'company'), data);
        document.getElementById('nav-company-name').textContent = name;
        document.getElementById('footer-company-name').textContent = name;
        if (logoDataUrl) document.getElementById('nav-logo').src = logoDataUrl;
        document.title = name + ' - Premium Sanitary Solutions';
        showToast('Company details saved!');
    } catch (error) {
        console.error('Error saving company:', error);
        showToast('Failed to save');
    }
};

window.addCategory = async function(e) {
    e.preventDefault();
    const name = document.getElementById('admin-category-name').value.trim();
    const imageFile = document.getElementById('admin-category-image').files[0];

    if (!name || !imageFile) {
        showToast('Please fill all fields');
        return;
    }

    try {
        const imageData = await readFileAsDataURL(imageFile);
        await push(ref(db, 'categories'), { name, image: imageData });
        loadCategories();
        updateAdminCategoriesList();
        document.getElementById('admin-category-name').value = '';
        document.getElementById('admin-category-image').value = '';
        showToast('Category added!');
    } catch (error) {
        console.error('Error adding category:', error);
        showToast('Failed to add category');
    }
};

window.editCategory = async function(key) {
    try {
        const snap = await get(ref(db, `categories/${key}`));
        if (snap.exists()) {
            const cat = snap.val();
            document.getElementById('edit-category-key').value = key;
            document.getElementById('edit-category-name').value = cat.name;
            const preview = document.getElementById('edit-category-preview');
            if (cat.image) {
                preview.src = cat.image;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
            document.getElementById('edit-category-image').value = '';
            openModal('edit-category-modal');
        }
    } catch (error) {
        console.error('Error editing category:', error);
    }
};

window.saveEditCategory = async function(e) {
    e.preventDefault();
    const key = document.getElementById('edit-category-key').value;
    const name = document.getElementById('edit-category-name').value.trim();
    const imageFile = document.getElementById('edit-category-image').files[0];

    if (!name) {
        showToast('Please enter category name');
        return;
    }

    try {
        const updates = { name };
        if (imageFile) {
            updates.image = await readFileAsDataURL(imageFile);
        }
        await update(ref(db, `categories/${key}`), updates);
        loadCategories();
        updateAdminCategoriesList();
        closeModal('edit-category-modal');
        showToast('Category updated!');
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('Failed to save');
    }
};

window.deleteCategory = async function(key) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
        await remove(ref(db, `categories/${key}`));
        loadCategories();
        updateAdminCategoriesList();
        showToast('Category deleted!');
    } catch (error) {
        console.error('Error deleting category:', error);
    }
};

window.addProduct = async function(e) {
    e.preventDefault();
    const category = document.getElementById('admin-product-category').value;
    const name = document.getElementById('admin-product-name').value.trim();
    const description = document.getElementById('admin-product-desc').value.trim();
    const price = parseFloat(document.getElementById('admin-product-price').value);
    const imageFile = document.getElementById('admin-product-image').files[0];

    if (!category || !name || !description || isNaN(price) || !imageFile) {
        showToast('Please fill all fields');
        return;
    }

    try {
        const imageData = await readFileAsDataURL(imageFile);
        await push(ref(db, 'products'), {
            category,
            name,
            description,
            price,
            image: imageData
        });
        loadProducts();
        updateAdminProductsList();
        document.getElementById('admin-product-name').value = '';
        document.getElementById('admin-product-desc').value = '';
        document.getElementById('admin-product-price').value = '';
        document.getElementById('admin-product-image').value = '';
        showToast('Product added!');
    } catch (error) {
        console.error('Error adding product:', error);
        showToast('Failed to add product');
    }
};

window.editProduct = async function(key) {
    try {
        const snap = await get(ref(db, `products/${key}`));
        if (snap.exists()) {
            const prod = snap.val();
            document.getElementById('edit-product-key').value = key;
            document.getElementById('edit-product-name').value = prod.name;
            document.getElementById('edit-product-desc').value = prod.description;
            document.getElementById('edit-product-price').value = prod.price;
            const preview = document.getElementById('edit-product-preview');
            if (prod.image) {
                preview.src = prod.image;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
            document.getElementById('edit-product-image').value = '';
            openModal('edit-product-modal');
        }
    } catch (error) {
        console.error('Error editing product:', error);
    }
};

window.saveEditProduct = async function(e) {
    e.preventDefault();
    const key = document.getElementById('edit-product-key').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const description = document.getElementById('edit-product-desc').value.trim();
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const imageFile = document.getElementById('edit-product-image').files[0];

    if (!name || !description || isNaN(price)) {
        showToast('Please fill all fields');
        return;
    }

    try {
        const updates = { name, description, price };
        if (imageFile) {
            updates.image = await readFileAsDataURL(imageFile);
        }
        await update(ref(db, `products/${key}`), updates);
        if (currentCategory) loadProducts(currentCategory);
        updateAdminProductsList();
        closeModal('edit-product-modal');
        showToast('Product updated!');
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Failed to save');
    }
};

window.deleteProduct = async function(key) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await remove(ref(db, `products/${key}`));
        cart = cart.filter(item => item.key !== key);
        saveCartToStorage();
        updateCartUI();
        if (currentCategory) loadProducts(currentCategory);
        updateAdminProductsList();
        showToast('Product deleted!');
    } catch (error) {
        console.error('Error deleting product:', error);
    }
};

window.saveAboutContent = async function(e) {
    e.preventDefault();
    const content = document.getElementById('admin-about-content').value;
    const imageFile = document.getElementById('admin-about-image').files[0];

    try {
        const data = { content, heroText: document.getElementById('hero-about-text').textContent };
        if (imageFile) {
            data.image = await readFileAsDataURL(imageFile);
        }
        // Load existing about data to preserve image if not uploading new one
        if (!imageFile) {
            const aboutSnap = await get(ref(db, 'about'));
            if (aboutSnap.exists() && aboutSnap.val().image) {
                data.image = aboutSnap.val().image;
            }
        }
        await set(ref(db, 'about'), data);
        document.getElementById('about-text-content').innerHTML = content;
        if (data.image) {
            document.getElementById('about-page-image').src = data.image;
        }
        document.getElementById('admin-about-image').value = '';
        document.getElementById('admin-about-preview').classList.add('hidden');
        showToast('About content saved!');
    } catch (error) {
        console.error('Error saving about:', error);
        showToast('Failed to save');
    }
};

window.openEditAboutModal = async function() {
    try {
        const snap = await get(ref(db, 'about'));
        if (snap.exists()) {
            const data = snap.val();
            document.getElementById('edit-about-content').value = data.content || '';
            const preview = document.getElementById('edit-about-preview');
            if (data.image) {
                preview.src = data.image;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
            document.getElementById('edit-about-image').value = '';
        }
        openModal('edit-about-modal');
    } catch (error) {
        console.error('Error loading about:', error);
    }
};

window.saveEditAbout = async function(e) {
    e.preventDefault();
    const content = document.getElementById('edit-about-content').value;
    const imageFile = document.getElementById('edit-about-image').files[0];

    try {
        const data = { content, heroText: document.getElementById('hero-about-text').textContent };
        if (imageFile) {
            data.image = await readFileAsDataURL(imageFile);
        } else {
            const aboutSnap = await get(ref(db, 'about'));
            if (aboutSnap.exists() && aboutSnap.val().image) {
                data.image = aboutSnap.val().image;
            }
        }
        await set(ref(db, 'about'), data);
        document.getElementById('about-text-content').innerHTML = content;
        if (data.image) {
            document.getElementById('about-page-image').src = data.image;
        }
        document.getElementById('admin-about-content').value = content;
        if (data.image) {
            document.getElementById('admin-about-preview').src = data.image;
            document.getElementById('admin-about-preview').classList.remove('hidden');
        }
        closeModal('edit-about-modal');
        showToast('About content updated!');
    } catch (error) {
        console.error('Error saving about:', error);
        showToast('Failed to save');
    }
};

// ==================== FOOTER ====================
async function loadFooterFromFirebase() {
    try {
        const snap = await get(ref(db, 'footer'));
        if (snap.exists()) {
            const data = snap.val();
            if (data.name) document.getElementById('footer-company-name').textContent = data.name;
            if (data.desc) document.getElementById('footer-desc').textContent = data.desc;
            if (data.phone) document.getElementById('footer-phone').innerHTML = `<i class="fas fa-phone"></i> ${data.phone}`;
            if (data.email) document.getElementById('footer-email').innerHTML = `<i class="fas fa-envelope"></i> ${data.email}`;
            if (data.address) document.getElementById('footer-address').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${data.address}`;
            if (data.copyright) document.getElementById('footer-copyright').textContent = data.copyright;
        }
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

window.saveFooterContent = async function(e) {
    e.preventDefault();
    try {
        const data = {
            name: document.getElementById('admin-footer-name').value.trim(),
            desc: document.getElementById('admin-footer-desc').value.trim(),
            phone: document.getElementById('admin-footer-phone').value.trim(),
            email: document.getElementById('admin-footer-email').value.trim(),
            address: document.getElementById('admin-footer-address').value.trim(),
            copyright: document.getElementById('admin-footer-copyright').value.trim()
        };
        await set(ref(db, 'footer'), data);
        await loadFooterFromFirebase();
        showToast('Footer content saved!');
    } catch (error) {
        console.error('Error saving footer:', error);
        showToast('Failed to save footer');
    }
};

async function loadFooterToAdmin() {
    try {
        const snap = await get(ref(db, 'footer'));
        if (snap.exists()) {
            const data = snap.val();
            document.getElementById('admin-footer-name').value = data.name || '';
            document.getElementById('admin-footer-desc').value = data.desc || '';
            document.getElementById('admin-footer-phone').value = data.phone || '';
            document.getElementById('admin-footer-email').value = data.email || '';
            document.getElementById('admin-footer-address').value = data.address || '';
            document.getElementById('admin-footer-copyright').value = data.copyright || '';
        }
    } catch (error) {
        console.error('Error loading footer to admin:', error);
    }
};

// ==================== TOAST ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}
window.showToast = showToast;
