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
    tx.objectStore('settings').put({ key: 'tax_rate', value: '' }); // 納税用の積立率（例：20）未設定は空文字

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
async function calculateTaxReserve(dbInstance, targetYear = null, useAnnualProjection = false) {
    const sales = await dbInstance.getAll('sales');
    const expenses = await dbInstance.getAll('expenses');
    const settings = await dbInstance.getAll('settings');
    
    // Get Settings
    const getSet = (k, def) => {
        const s = settings.find(x => x.key === k);
        return s ? s.value : def;
    };

    const taxMode = getSet('tax_calc_mode', 'manual'); // 'manual' or 'auto'
    
    // --- Manual Calculation Setup ---
    const taxRateObj = settings.find(s => s.key === 'tax_rate');
    const isConfigured = getSet('tax_rate_configured', false);
    
    let manualTaxRate = 0;
    let manualTaxRateStr = '未設定';
    
    if (taxRateObj && taxRateObj.value !== '' && taxRateObj.value !== null) {
        let val = parseFloat(taxRateObj.value);
        if (!isNaN(val)) {
            if (val === 0 && !isConfigured) {
                manualTaxRateStr = '未設定';
            } else if (val > 0 && val <= 1) {
                manualTaxRate = val; 
                manualTaxRateStr = (val * 100).toFixed(0) + '%';
            } else if (val >= 0) {
                manualTaxRate = val / 100;
                manualTaxRateStr = val + '%';
            }
        }
    }
    
    // --- Auto Tax Config Setup ---
    const autoConfig = {
        businessType: getSet('tax_business_type', '個人事業主'),
        declarationType: getSet('tax_declaration', '青色申告'),
        blueDeduction: getSet('tax_blue_deduction', 650000),
        otherDeductions: getSet('tax_other_deductions', 480000),
        hasOtherIncome: getSet('tax_has_other_income', false),
        consumptionTaxType: getSet('tax_consumption', '免税'),
        estimatedExpenses: 0
    };
    
    let validSales = sales.filter(s => !s.refunded);
    let allExpensesForProfit = expenses; 
    
    if (targetYear) {
        validSales = validSales.filter(s => formatYMD(getJSTDate(s.date)).startsWith(targetYear));
        allExpensesForProfit = allExpensesForProfit.filter(e => {
            return e.date.startsWith(targetYear);
        });
    }
    
    const totalSales = validSales.reduce((sum, s) => sum + s.total, 0);
    const totalExpenses = allExpensesForProfit.reduce((sum, e) => sum + e.amount, 0);
    const actualProfit = Math.max(0, totalSales - totalExpenses);
    
    autoConfig.estimatedExpenses = totalExpenses;
    
    // Annual Projection Logic
    let projectedProfit = actualProfit;
    let projectedSales = totalSales;
    if (useAnnualProjection && targetYear) {
        const today = getJSTDate(new Date().toISOString());
        let daysPassed = 365;
        if (targetYear === String(today.getFullYear())) {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            daysPassed = Math.max(1, Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1);
        }
        
        if (daysPassed < 365) {
            projectedProfit = Math.floor(actualProfit * (365 / daysPassed));
            projectedSales = Math.floor(totalSales * (365 / daysPassed));
            autoConfig.estimatedExpenses = Math.floor(totalExpenses * (365 / daysPassed));
        }
    }
    
    // Manual calculation
    let manualReserve = 0;
    if (manualTaxRateStr !== '未設定') {
        manualReserve = Math.floor(projectedProfit * manualTaxRate);
    }
    
    // Auto Tax Simulation
    let autoSim = null;
    if (typeof simulateTaxes !== 'undefined') {
        autoSim = simulateTaxes(projectedProfit, autoConfig, targetYear || String(new Date().getFullYear()));
    }
    
    const reserveToUse = (taxMode === 'auto' && autoSim) ? autoSim.totalTax : manualReserve;
    
    // Tax Paid deduction
    const transactions = await dbInstance.getAll('transactions');
    let taxPaid = 0;
    
    if (targetYear) {
        taxPaid = transactions.filter(t => {
            if (t.type !== '税金') return false;
            // 優先的に tax_year を確認。無ければ過去データ用として date を見る
            if (t.tax_year) {
                return t.tax_year === targetYear;
            } else {
                if (t.date.includes('T')) return formatYMD(getJSTDate(t.date)).startsWith(targetYear);
                return t.date.startsWith(targetYear);
            }
        }).reduce((sum, t) => sum + t.amount, 0);
    } else {
        taxPaid = transactions.filter(t => t.type === '税金').reduce((sum, t) => sum + t.amount, 0);
    }
    
    let remainingReserve = Math.max(0, reserveToUse - taxPaid);
    
    return {
        profit: actualProfit,
        totalSales,
        totalExpenses,
        projectedProfit,
        projectedSales,
        taxMode, // 'manual' or 'auto'
        taxRateStr: manualTaxRateStr,
        totalReserveNeeded: reserveToUse,
        taxPaid,
        remainingReserve,
        autoSim,
        autoConfig,
        daysPassedCalc: useAnnualProjection
    };
}

// --- Data Migration & Import ---

async function migrateNonCashSales(dbInstance) {
    const sales = await dbInstance.getAll('sales');
    const transactions = await dbInstance.getAll('transactions');
    
    const tx = dbInstance.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    let migratedCount = 0;

    for (const sale of sales) {
        if (sale.method !== '現金' && !sale.refunded) {
            // Check if transaction exists for this sale
            const hasTx = transactions.some(t => t.ref_id === sale.id);
            if (!hasTx) {
                store.put({
                    id: 'tx_ar_' + sale.id, // Ensure uniqueness
                    date: sale.date, // Preserve original date
                    type: '売上',
                    amount: sale.total,
                    account: '未入金', // Accounts Receivable
                    ref_id: sale.id,
                    memo: 'データ移行: ' + sale.method
                });
                migratedCount++;
            }
        }
    }
    await tx.done;
    if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} non-cash sales to Accounts Receivable (未入金)`);
    }
}

async function importJSON(dbInstance, jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const stores = ['products', 'toppings', 'sales', 'sale_items', 'expenses', 'transactions', 'settings'];
        const tx = dbInstance.transaction(stores, 'readwrite');
        
        for (const storeName of stores) {
            if (data[storeName]) {
                const store = tx.objectStore(storeName);
                for (const item of data[storeName]) {
                    store.put(item); // Overwrites duplicates by ID
                }
            }
        }
        await tx.done;
        return true;
    } catch (e) {
        console.error("Import failed:", e);
        return false;
    }
}

