async function loadFunds() {
    const fundsSection = document.getElementById('funds');
    const transactions = await db.getAll('transactions');
    const settings = await db.getAll('settings');
    const taxRateSetting = settings.find(s => s.key === 'tax_rate');
    const taxRate = taxRateSetting ? taxRateSetting.value : 0;
    
    let cash = 0;
    let bank = 0;
    let other = 0;
    
    transactions.forEach(t => {
        let amount = t.amount;
        if (t.type === '経費' || t.type === '振替出金' || t.type === '税金' || t.type === '生活費') amount = -amount;
        
        if (t.account === '現金') cash += amount;
        else if (t.account === '銀行A') bank += amount;
        else other += amount;
    });
    
    const totalFunds = cash + bank + other;
    
    // Profit for tax (simplistic)
    const sales = await db.getAll('sales');
    const validSales = sales.filter(s => !s.refunded);
    const expenses = await db.getAll('expenses');
    const profit = validSales.reduce((s, x) => s + x.total, 0) - expenses.filter(e => e.is_paid).reduce((s, x) => s + x.amount, 0);
    
    let taxReserve = 0;
    if (profit > 0 && taxRate > 0) {
        taxReserve = Math.floor(profit * taxRate);
    }
    
    const usableFunds = totalFunds - taxReserve;
    
    fundsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">資金・税金</h2>
        
        <div class="grid grid-cols-3">
            <div class="card metric-card">
                <h3>現預金残高 (全体)</h3>
                <div class="value">¥${totalFunds.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>納税準備金 (目安)</h3>
                <div class="value" style="color: var(--accent-red);">¥${taxReserve.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>利用可能額 (目安)</h3>
                <div class="value" style="color: var(--accent-green);">¥${usableFunds.toLocaleString()}</div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 1.5rem;">
            <h3>口座別残高</h3>
            <ul>
                <li>現金: ¥${cash.toLocaleString()}</li>
                <li>銀行A: ¥${bank.toLocaleString()}</li>
                <li>その他: ¥${other.toLocaleString()}</li>
            </ul>
        </div>
    `;
}

async function loadSettings() {
    const settingsSection = document.getElementById('settings');
    const settings = await db.getAll('settings');
    const taxRateSetting = settings.find(s => s.key === 'tax_rate');
    const taxRate = taxRateSetting ? taxRateSetting.value : 0;
    
    settingsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">設定・データ管理</h2>
        
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3>システム設定</h3>
            <div style="margin-top: 1rem;">
                <label style="display:block; margin-bottom: 0.5rem;">納税用積立率 (0.0〜1.0)</label>
                <input type="number" id="set-taxrate" step="0.01" min="0" max="1" value="${taxRate}" style="padding: 0.5rem;">
                <button onclick="saveTaxRate()" style="padding: 0.5rem 1rem; margin-left: 1rem; background: var(--accent-green); color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
            </div>
        </div>
        
        <div class="card">
            <h3>データエクスポート・バックアップ</h3>
            <p style="margin-bottom: 1rem; color: #666;">
                ※このアプリのデータは現在ご使用のブラウザ内部(IndexedDB)にのみ保存されています。
                端末間で自動同期はされません。定期的にJSONでバックアップしてください。
            </p>
            <button onclick="exportJSON()" style="padding: 0.5rem 1rem; background: var(--text-color); color: white; border: none; border-radius: 4px; cursor: pointer;">全データをJSONでエクスポート</button>
        </div>
    `;
}

async function saveTaxRate() {
    const rate = parseFloat(document.getElementById('set-taxrate').value) || 0;
    await db.put('settings', { key: 'tax_rate', value: rate });
    alert('設定を保存しました。');
}

async function exportJSON() {
    try {
        const data = {
            products: await db.getAll('products'),
            toppings: await db.getAll('toppings'),
            sales: await db.getAll('sales'),
            sale_items: await db.getAll('sale_items'),
            expenses: await db.getAll('expenses'),
            transactions: await db.getAll('transactions'),
            settings: await db.getAll('settings')
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nameless_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("エクスポートに失敗しました。");
        console.error(e);
    }
}
