// idb library is loaded via CDN globally
const DB_NAME = 'NamelessShopDB';
const DB_VERSION = 1;

async function initDB() {
    return window.idb.openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Products
            if (!db.objectStoreNames.contains('products')) {
                const store = db.createObjectStore('products', { keyPath: 'id' });
                store.createIndex('category', 'category');
                store.createIndex('order', 'order');
            }
            // Toppings
            if (!db.objectStoreNames.contains('toppings')) {
                db.createObjectStore('toppings', { keyPath: 'id' });
            }
            // Sales
            if (!db.objectStoreNames.contains('sales')) {
                const store = db.createObjectStore('sales', { keyPath: 'id' });
                store.createIndex('date', 'date');
                store.createIndex('location', 'location');
            }
            // Sale Items
            if (!db.objectStoreNames.contains('sale_items')) {
                const store = db.createObjectStore('sale_items', { keyPath: 'id' });
                store.createIndex('sale_id', 'sale_id');
                store.createIndex('product_id', 'product_id');
            }
            // Expenses
            if (!db.objectStoreNames.contains('expenses')) {
                const store = db.createObjectStore('expenses', { keyPath: 'id' });
                store.createIndex('date', 'date');
                store.createIndex('category', 'category');
            }
            // Transactions (Funds)
            if (!db.objectStoreNames.contains('transactions')) {
                const store = db.createObjectStore('transactions', { keyPath: 'id' });
                store.createIndex('date', 'date');
            }
            // Settings
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        }
    });
}

// Initial Data Population
async function populateInitialData(db) {
    const tx = db.transaction(['products', 'toppings', 'settings'], 'readwrite');
    
    // Check if products exist
    const count = await tx.objectStore('products').count();
    if (count > 0) return;

    const initialProducts = [
        { id: 'p1', name: 'チーズバーガー', price: 1350, cost: null, category: 'バーガー', toppingsType: 'burger', active: true, order: 1 },
        { id: 'p2', name: 'テリヤキバーガー', price: 1300, cost: null, category: 'バーガー', toppingsType: 'burger', active: true, order: 2 },
        { id: 'p3', name: 'BBQバーガー', price: 1400, cost: null, category: 'バーガー', toppingsType: 'burger', active: true, order: 3 },
        { id: 'p4', name: 'カルニタス', price: 600, unit: '1P', cost: null, category: 'タコス', toppingsType: 'tacos', active: true, order: 4 },
        { id: 'p5', name: 'ファヒータ', price: 600, unit: '1P', cost: null, category: 'タコス', toppingsType: 'tacos', active: true, order: 5 },
        { id: 'p6', name: 'セビーチェ', price: 600, unit: '1P', cost: null, category: 'タコス', toppingsType: 'tacos', active: true, order: 6 },
        { id: 'p7', name: 'ケサビリア', price: 650, unit: '1P', cost: null, category: 'タコス', toppingsType: 'tacos', active: true, order: 7 },
        { id: 'p8', name: 'タコサラダ', price: 900, cost: null, category: 'サラダ・サイド', toppingsType: 'none', active: true, order: 8 },
        { id: 'p9', name: 'ワカモレクリームチーズ ～セビーチェのせ～', price: 700, cost: null, category: 'サラダ・サイド', toppingsType: 'none', active: true, order: 9 },
        { id: 'p10', name: 'チップス', price: 500, cost: null, category: 'サラダ・サイド', toppingsType: 'chips', active: true, order: 10 },
        { id: 'p11', name: 'アイスコーヒー', price: 350, cost: null, category: 'ドリンク', toppingsType: 'none', active: true, order: 11 },
        { id: 'p12', name: 'コーラ', price: 350, cost: null, category: 'ドリンク', toppingsType: 'none', active: true, order: 12 },
        { id: 'p13', name: 'オレンジジュース', price: 350, cost: null, category: 'ドリンク', toppingsType: 'none', active: true, order: 13 },
        { id: 'p14', name: 'アップルジュース', price: 350, cost: null, category: 'ドリンク', toppingsType: 'none', active: true, order: 14 },
        { id: 'p15', name: 'バドワイザー', price: 600, cost: null, category: 'アルコール', toppingsType: 'none', active: true, order: 15 },
        { id: 'p16', name: 'ハイボール', price: 500, cost: null, category: 'アルコール', toppingsType: 'none', active: true, order: 16 }
    ];

    const initialToppings = [
        // Burger toppings
        { id: 'tb1', name: 'ハラペーニョ', price: 100, type: 'burger' },
        { id: 'tb2', name: 'チーズ', price: 200, type: 'burger' },
        { id: 'tb3', name: 'パティ（肉）', price: 400, type: 'burger' },
        { id: 'tb4', name: 'アボカド', price: 200, type: 'burger' },
        { id: 'tb5', name: '目玉焼き', price: 150, type: 'burger' },
        { id: 'tb6', name: 'プルドポーク', price: 300, type: 'burger' },
        { id: 'tb7', name: 'トマト', price: 100, type: 'burger' },
        // Tacos toppings
        { id: 'tt1', name: 'クリームチーズ', price: 100, type: 'tacos' },
        { id: 'tt2', name: 'パクチー', price: 100, type: 'tacos' },
        { id: 'tt3', name: 'ハラペーニョ', price: 100, type: 'tacos' },
        { id: 'tt4', name: '肉', price: 100, type: 'tacos' },
        { id: 'tt5', name: 'ワカモレ', price: 100, type: 'tacos' },
        // Special Sets/Options
        { id: 'ts1', name: 'サラダセット', price: 50, type: 'tacos_set' }
    ];

    for (const p of initialProducts) {
        tx.objectStore('products').put(p);
    }
    for (const t of initialToppings) {
        tx.objectStore('toppings').put(t);
    }
    
    // Default Settings
    tx.objectStore('settings').put({ key: 'locations', value: ['メインキッチン', 'イベントA'] });
    tx.objectStore('settings').put({ key: 'tax_rate', value: 0 }); // 納税用の積立率（例：0.1）

    await tx.done;
}

// --- Helper Functions (JST Timezone & Tax) ---

/**
 * Returns a new Date object representing the JST time of the given UTC ISO string.
 * This ensures that regardless of the browser's local timezone, 
 * the date is evaluated as Asia/Tokyo.
 */
function getJSTDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return new Date(); // fallback
    const jstString = d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour12: false });
    const [datePart, timePart] = jstString.split(', ');
    const [m, day, y] = datePart.split('/');
    const [h, min, s] = (timePart || '00:00:00').split(':');
    return new Date(y, m - 1, day, h, min, s);
}

/**
 * Format Date as YYYY-MM-DD
 */
function formatYMD(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Common tax and profit calculator
 */
async function calculateTaxReserve(dbInstance, targetYear = null) {
    const sales = await dbInstance.getAll('sales');
    const expenses = await dbInstance.getAll('expenses');
    const settings = await dbInstance.getAll('settings');
    
    const taxRateObj = settings.find(s => s.key === 'tax_rate') || { value: 0 };
    // UI might have saved it as 20 for 20%, or 0.2. Let's assume it's saved as decimal (e.g. 0.2) or empty string.
    let taxRate = 0;
    if (taxRateObj.value !== '' && !isNaN(taxRateObj.value)) {
        taxRate = parseFloat(taxRateObj.value);
        if (taxRate > 1) taxRate = taxRate / 100; // Just in case it was saved as 20 instead of 0.2
    }
    
    let validSales = sales.filter(s => !s.refunded);
    let allExpensesForProfit = expenses; 
    
    if (targetYear) {
        validSales = validSales.filter(s => formatYMD(getJSTDate(s.date)).startsWith(targetYear));
        allExpensesForProfit = allExpensesForProfit.filter(e => {
            // expenses date is stored as YYYY-MM-DD locally, but let's parse just in case
            return e.date.startsWith(targetYear);
        });
    }
    
    const totalSales = validSales.reduce((sum, s) => sum + s.total, 0);
    const totalExpenses = allExpensesForProfit.reduce((sum, e) => sum + e.amount, 0);
    const profit = Math.max(0, totalSales - totalExpenses);
    
    let reserve = 0;
    if (taxRateObj.value !== '') {
        reserve = Math.floor(profit * taxRate);
    }
    
    const transactions = await dbInstance.getAll('transactions');
    let taxPaid = 0;
    
    let targetTx = transactions;
    if (targetYear) {
        targetTx = targetTx.filter(t => {
            if (t.date.includes('T')) return formatYMD(getJSTDate(t.date)).startsWith(targetYear);
            return t.date.startsWith(targetYear);
        });
    }
    taxPaid = targetTx.filter(t => t.type === '税金').reduce((sum, t) => sum + t.amount, 0);
    
    let remainingReserve = Math.max(0, reserve - taxPaid);
    
    return {
        profit,
        taxRateStr: taxRateObj.value === '' ? '未設定' : (taxRate * 100).toFixed(0) + '%',
        totalReserveNeeded: reserve,
        taxPaid,
        remainingReserve
    };
}
