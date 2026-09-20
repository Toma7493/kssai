let db;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        db = await initDB();
        await populateInitialData(db);
        
        setupNavigation();
        loadPOSProducts();
        
        // 初回画面表示
        showSection('pos');
    } catch (e) {
        console.error("DB Initialization error", e);
        alert("データベースの初期化に失敗しました。");
    }
});

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            showSection(target);
            
            navBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

function showSection(id) {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // 特定画面表示時のリロード処理
    if (id === 'pos') loadPOSProducts();
    if (id === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
    if (id === 'history' && typeof loadHistory === 'function') loadHistory();
    if (id === 'expenses' && typeof loadExpenses === 'function') loadExpenses();
    if (id === 'products' && typeof loadProducts === 'function') loadProducts();
    if (id === 'analytics' && typeof loadAnalytics === 'function') loadAnalytics();
    if (id === 'funds' && typeof loadFunds === 'function') loadFunds();
    if (id === 'settings' && typeof loadSettings === 'function') loadSettings();
}

// --- POS Logic ---
let cart = [];
let currentProducts = [];

async function loadPOSProducts() {
    currentProducts = await db.getAllFromIndex('products', 'order');
    const posSection = document.getElementById('pos');
    posSection.innerHTML = `
        <div class="pos-container" style="display: flex; gap: 2rem;">
            <div class="product-selection" style="flex: 2;">
                <h2>商品選択</h2>
                <input type="text" id="pos-search" placeholder="商品名を検索..." style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: 4px;">
                <div id="pos-categories" style="margin-bottom: 1rem;">
                    <!-- Categories will be added here -->
                </div>
                <div id="pos-product-grid" class="grid grid-cols-3">
                    <!-- Products will be added here -->
                </div>
            </div>
            <div class="cart-section" style="flex: 1; background: var(--card-bg); padding: 1rem; border-radius: var(--radius); box-shadow: var(--shadow);">
                <h2>現在の注文</h2>
                <div id="cart-items" style="min-height: 200px; margin-bottom: 1rem;"></div>
                <div class="cart-total" style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
                    合計: ¥<span id="cart-total-amount">0</span>
                </div>
                <div>
                    <label>容器数: <input type="number" id="cart-containers" value="0" min="0" style="width: 60px;"></label>
                </div>
                <div style="margin-top: 1rem;">
                    <button onclick="checkout()" style="width: 100%; padding: 1rem; background: var(--accent-red); color: white; border: none; border-radius: 4px; font-size: 1.2rem; cursor: pointer;">会計へ進む</button>
                </div>
            </div>
        </div>
    `;
    
    renderPOSProducts(currentProducts);
    
    document.getElementById('pos-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = currentProducts.filter(p => p.name.toLowerCase().includes(query) && p.active);
        renderPOSProducts(filtered);
    });

    document.getElementById('cart-containers').addEventListener('change', updateCartTotal);
}

function renderPOSProducts(products) {
    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = '';
    
    products.filter(p => p.active).forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'product-btn';
        btn.style.cssText = 'padding: 1rem; border: 1px solid var(--border-color); background: #fff; border-radius: 4px; cursor: pointer; text-align: left; transition: background 0.2s;';
        btn.innerHTML = `
            <div style="font-weight: bold;">${p.name}</div>
            <div style="color: var(--accent-green);">¥${p.price.toLocaleString()}</div>
        `;
        btn.onclick = () => addToCart(p);
        grid.appendChild(btn);
    });
}

function addToCart(product) {
    // Check if it requires topping selection
    if (product.toppingsType && product.toppingsType !== 'none') {
        openToppingModal(product);
    } else {
        addCartItem(product, []);
    }
}

async function openToppingModal(product) {
    const allToppings = await db.getAll('toppings');
    let validToppings = [];
    
    if (product.toppingsType === 'chips') {
        // 特別処理：チップスはサルサかワカモレの選択
        validToppings = [
            { id: 'c_salsa', name: 'サルサソース', price: 0 },
            { id: 'c_guaca', name: 'ワカモレ', price: 0 }
        ];
    } else {
        validToppings = allToppings.filter(t => t.type === product.toppingsType || (product.category === 'タコス' && t.type === 'tacos_set'));
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    
    let toppingsHtml = validToppings.map(t => {
        if (product.toppingsType === 'chips') {
            return `<div><label><input type="radio" name="chips_sauce" value="${t.id}" data-name="${t.name}" data-price="${t.price}"> ${t.name}</label></div>`;
        } else {
            return `<div><label><input type="checkbox" class="topping-check" value="${t.id}" data-name="${t.name}" data-price="${t.price}"> ${t.name} (+¥${t.price})</label></div>`;
        }
    }).join('');
    
    modal.innerHTML = `
        <div style="background: #fff; padding: 2rem; border-radius: var(--radius); width: 400px; max-width: 90%;">
            <h3>${product.name} のカスタマイズ</h3>
            <div style="margin: 1rem 0;">
                ${toppingsHtml}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 1rem;">
                <button id="modal-cancel" style="padding: 0.5rem 1rem;">キャンセル</button>
                <button id="modal-add" style="padding: 0.5rem 1rem; background: var(--accent-red); color: white; border: none; border-radius: 4px;">追加</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('modal-cancel').onclick = () => {
        document.body.removeChild(modal);
    };
    
    document.getElementById('modal-add').onclick = () => {
        const selectedToppings = [];
        if (product.toppingsType === 'chips') {
            const checked = modal.querySelector('input[name="chips_sauce"]:checked');
            if (!checked) {
                alert("ソースを選択してください。");
                return;
            }
            selectedToppings.push({
                id: checked.value,
                name: checked.getAttribute('data-name'),
                price: parseInt(checked.getAttribute('data-price'))
            });
        } else {
            const checks = modal.querySelectorAll('.topping-check:checked');
            checks.forEach(c => {
                selectedToppings.push({
                    id: c.value,
                    name: c.getAttribute('data-name'),
                    price: parseInt(c.getAttribute('data-price'))
                });
            });
        }
        
        addCartItem(product, selectedToppings);
        document.body.removeChild(modal);
    };
}

function addCartItem(product, toppings) {
    // Generate unique ID for cart item
    const cartItemId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    
    cart.push({
        cartItemId,
        product: { ...product }, // clone to allow individual price edit
        toppings,
        quantity: 1
    });
    
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    
    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);';
        
        const toppingText = item.toppings.length > 0 
            ? `<div style="font-size: 0.8rem; color: #666; margin-left: 1rem;">+ ${item.toppings.map(t => t.name).join(', ')}</div>` 
            : '';
            
        itemDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: bold;">
                    ${item.product.name}
                    ${toppingText}
                </div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color: var(--accent-red); cursor: pointer;">✕</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <div>
                    ¥<input type="number" value="${item.product.price}" onchange="updateCartItemPrice(${index}, this.value)" style="width: 60px;">
                </div>
                <div>
                    <button onclick="updateCartItemQuantity(${index}, -1)">-</button>
                    <span style="margin: 0 0.5rem;">${item.quantity}</span>
                    <button onclick="updateCartItemQuantity(${index}, 1)">+</button>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
    
    updateCartTotal();
}

function updateCartItemPrice(index, newPrice) {
    cart[index].product.price = parseInt(newPrice) || 0;
    updateCartTotal();
}

function updateCartItemQuantity(index, change) {
    const newQ = cart[index].quantity + change;
    if (newQ > 0) {
        cart[index].quantity = newQ;
        renderCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function updateCartTotal() {
    let total = 0;
    cart.forEach(item => {
        let itemTotal = item.product.price;
        item.toppings.forEach(t => itemTotal += t.price);
        total += itemTotal * item.quantity;
    });
    
    const containerEl = document.getElementById('cart-containers');
    const containerCount = containerEl ? parseInt(containerEl.value) || 0 : 0;
    total += containerCount * 80;
    
    const totalEl = document.getElementById('cart-total-amount');
    if (totalEl) totalEl.innerText = total.toLocaleString();
    return total;
}

async function checkout() {
    if (cart.length === 0) {
        alert("カートが空です。");
        return;
    }
    
    const total = updateCartTotal();
    
    const method = prompt("支払方法を入力してください (現金/クレジットカード/QR/その他):", "現金");
    if (!method) return; // Cancel
    
    let discount = 0;
    const discountStr = prompt("値引き額があれば入力してください:", "0");
    if (discountStr !== null) discount = parseInt(discountStr) || 0;
    
    let finalTotal = total - discount;
    if (finalTotal < 0) finalTotal = 0;

    let memo = prompt("メモがあれば入力してください:", "");

    const containerCount = parseInt(document.getElementById('cart-containers').value) || 0;
    
    const sale = {
        id: 's_' + Date.now(),
        date: new Date().toISOString(),
        location: 'メインキッチン', // ToDo: Location selector
        method,
        discount,
        total: finalTotal,
        containerCount,
        containerTotal: containerCount * 80,
        memo,
        refunded: false
    };
    
    const saleItems = [];
    cart.forEach(item => {
        saleItems.push({
            id: 'si_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            sale_id: sale.id,
            product_id: item.product.id,
            name: item.product.name,
            unit_price: item.product.price,
            cost: item.product.cost,
            quantity: item.quantity,
            toppings: item.toppings, // Array of {id, name, price}
            refunded_quantity: 0
        });
    });

    try {
        const tx = db.transaction(['sales', 'sale_items', 'transactions'], 'readwrite');
        tx.objectStore('sales').put(sale);
        
        saleItems.forEach(si => tx.objectStore('sale_items').put(si));
        
        // Transaction for cash
        if (method === '現金') {
            tx.objectStore('transactions').put({
                id: 'tx_' + Date.now(),
                date: sale.date,
                type: '売上',
                amount: finalTotal,
                account: '現金',
                ref_id: sale.id
            });
        }
        // Cacheless are managed as uncollected until transferred.
        
        await tx.done;
        
        alert(`会計を完了しました。\n合計: ¥${finalTotal.toLocaleString()}`);
        cart = [];
        document.getElementById('cart-containers').value = 0;
        renderCart();
    } catch (e) {
        console.error("Checkout failed", e);
        alert("会計の保存に失敗しました。");
    }
}


