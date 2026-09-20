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
