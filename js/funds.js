let accountsReceivable = 0;

async function loadFunds() {
    const fundsSection = document.getElementById('funds');
    const transactions = await db.getAll('transactions');
    
    let cash = 0;
    let bank = 0;
    let other = 0;
    accountsReceivable = 0;
    
    transactions.forEach(t => {
        let amount = t.amount;
        if (t.type === '経費' || t.type === '振替出金' || t.type === '税金' || t.type === '生活費') amount = -amount;
        
        if (t.account === '現金') cash += amount;
        else if (t.account === '銀行A') bank += amount;
        else if (t.account === '未入金') accountsReceivable += amount;
        else other += amount;
    });
    
    const totalFunds = cash + bank + other; // 現預金には未入金を含めない
    
    const jstNow = getJSTDate(new Date().toISOString());
    const currentYearStr = formatYMD(jstNow).substring(0, 4);
    const taxData = await calculateTaxReserve(db, currentYearStr);
    
    const usableFunds = totalFunds - taxData.remainingReserve;
    
    fundsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">資金・税金</h2>
        
        <div class="grid grid-cols-3" style="margin-bottom: 1.5rem;">
            <div class="card metric-card">
                <h3>現預金残高 (全体)</h3>
                <div class="value">¥${totalFunds.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#888; margin-top:0.2rem;">※未入金除く</div>
            </div>
            <div class="card metric-card">
                <h3>納税準備金 (${currentYearStr}年分目安)</h3>
                <div class="value" style="color: var(--accent-red);">¥${taxData.remainingReserve.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#888; margin-top:0.2rem;">税率: ${taxData.taxRateStr}</div>
            </div>
            <div class="card metric-card">
                <h3>利用可能額 (全体)</h3>
                <div class="value" style="color: var(--accent-green);">¥${usableFunds.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#888; margin-top:0.2rem;">現預金 - 納税準備</div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3>口座別残高</h3>
            <ul>
                <li>現金: ¥${cash.toLocaleString()}</li>
                <li>銀行A: ¥${bank.toLocaleString()}</li>
                <li>その他: ¥${other.toLocaleString()}</li>
            </ul>
        </div>
        
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>未入金 (カード・QR等売掛金) 残高</h3>
                <button onclick="openDepositModal()" class="btn-primary" style="padding: 0.5rem 1rem; width: auto;" ${accountsReceivable <= 0 ? 'disabled' : ''}>入金を処理する</button>
            </div>
            <div style="font-size: 2rem; font-weight: bold; margin-top: 0.5rem;">¥${accountsReceivable.toLocaleString()}</div>
        </div>
    `;
}

function openDepositModal() {
    const overlay = document.createElement('div');
    overlay.className = 'slide-panel-overlay';
    
    overlay.innerHTML = `
        <div class="slide-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.2rem;">未入金の入金処理</h3>
                <button id="dep-cancel" style="background:none; border:none; font-size: 1.5rem; color: #888;">✕</button>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                未入金残高: <strong style="font-size: 1.2rem;">¥${accountsReceivable.toLocaleString()}</strong>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">対象となる未入金額 (減らす額)</label>
                <input type="number" id="dep-target" value="${accountsReceivable}" max="${accountsReceivable}" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem;">
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">決済手数料など (経費)</label>
                <input type="number" id="dep-fee" value="0" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem;">
            </div>
            
            <div style="margin-bottom: 1.5rem; background: #f9f9f9; padding: 1rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem;">
                    <span>銀行への実際の入金額</span>
                    <span id="dep-actual" style="color: var(--accent-green);">¥${accountsReceivable.toLocaleString()}</span>
                </div>
            </div>
            
            <button id="dep-submit" class="btn-primary">入金を記録</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const targetInput = document.getElementById('dep-target');
    const feeInput = document.getElementById('dep-fee');
    const actualDisplay = document.getElementById('dep-actual');
    
    const updateActual = () => {
        let target = parseInt(targetInput.value) || 0;
        let fee = parseInt(feeInput.value) || 0;
        let actual = target - fee;
        actualDisplay.innerText = "¥" + actual.toLocaleString();
        if (actual < 0) actualDisplay.style.color = "var(--accent-red)";
        else actualDisplay.style.color = "var(--accent-green)";
    };
    
    targetInput.addEventListener('input', updateActual);
    feeInput.addEventListener('input', updateActual);
    
    document.getElementById('dep-cancel').onclick = () => document.body.removeChild(overlay);
    
    document.getElementById('dep-submit').onclick = async () => {
        const btnSubmit = document.getElementById('dep-submit');
        if (btnSubmit.disabled) return;
        
        let target = parseInt(targetInput.value) || 0;
        let fee = parseInt(feeInput.value) || 0;
        let actual = target - fee;
        
        if (target <= 0 || target > accountsReceivable) {
            alert("対象額は1円から未入金残高の範囲内で入力してください。");
            return;
        }
        if (actual < 0) {
            alert("手数料が対象額を上回っています。");
            return;
        }
        
        btnSubmit.disabled = true;
        btnSubmit.innerText = "処理中...";
        
        try {
            const tx = db.transaction(['transactions', 'expenses'], 'readwrite');
            
            // 1. 未入金から減らす
            tx.objectStore('transactions').put({
                id: 'tx_dep_out_' + Date.now(),
                date: new Date().toISOString(),
                type: '振替出金',
                amount: target,
                account: '未入金',
                memo: '決済入金消込'
            });
            
            // 2. 銀行に満額入ったと仮定して増やす
            tx.objectStore('transactions').put({
                id: 'tx_dep_in_' + Date.now(),
                date: new Date().toISOString(),
                type: '振替入金',
                amount: target,
                account: '銀行A',
                memo: '決済入金消込'
            });
            
            // 3. 手数料があれば銀行から経費として支払ったとして記録
            if (fee > 0) {
                // 利益計算用
                tx.objectStore('expenses').put({
                    id: 'exp_fee_' + Date.now(),
                    date: formatYMD(getJSTDate(new Date().toISOString())),
                    amount: fee,
                    category: '支払手数料',
                    memo: '決済手数料',
                    is_paid: true
                });
                // 資金計算用
                tx.objectStore('transactions').put({
                    id: 'tx_fee_' + Date.now(),
                    date: new Date().toISOString(),
                    type: '経費',
                    amount: fee,
                    account: '銀行A',
                    memo: '決済手数料'
                });
            }
            
            await tx.done;
            alert('入金処理が完了しました。');
            document.body.removeChild(overlay);
            loadFunds();
        } catch (e) {
            console.error(e);
            alert("処理に失敗しました。");
            btnSubmit.disabled = false;
            btnSubmit.innerText = "入金を記録";
        }
    };
}


async function loadSettings() {
    const settingsSection = document.getElementById('settings');
    const settings = await db.getAll('settings');
    const taxRateSetting = settings.find(s => s.key === 'tax_rate');
    const taxConfSetting = settings.find(s => s.key === 'tax_rate_configured');
    
    let taxRateVal = '';
    if (taxRateSetting && taxRateSetting.value !== '') {
        let num = parseFloat(taxRateSetting.value);
        if (!isNaN(num)) {
             if (num > 0 && num <= 1) taxRateVal = (num * 100);
             else taxRateVal = num;
        }
    }
    const isConf = taxConfSetting ? taxConfSetting.value : false;
    
    settingsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">設定・データ管理</h2>
        
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3>システム設定</h3>
            <div style="margin-top: 1rem;">
                <label style="display:block; margin-bottom: 0.5rem;">納税用積立率 (%)</label>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.5rem;">
                    <input type="number" id="set-taxrate" step="1" min="0" max="100" value="${taxRateVal}" placeholder="例: 20" style="padding: 0.5rem; width:100px;">
                    <span>%</span>
                    <button id="btn-save-tax" onclick="saveTaxRate()" class="btn-primary" style="padding: 0.5rem 1rem; width: auto; margin-left: 1rem;">保存</button>
                </div>
                <label style="display:flex; align-items:center; font-size: 0.9rem; color: #666;">
                    <input type="checkbox" id="set-tax-zero" ${isConf && taxRateVal === 0 ? 'checked' : ''} style="margin-right: 0.5rem;">
                    意図的に0%として設定する
                </label>
            </div>
        </div>
        
        <div class="card">
            <h3>データエクスポート・バックアップ</h3>
            <p style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">
                ※このアプリのデータはブラウザ内部(IndexedDB)にのみ保存されています。<br>
                外部サーバーへの送信や端末間同期は行われません。定期的にバックアップしてください。
            </p>
            <div style="display:flex; gap: 1rem; flex-wrap: wrap;">
                <button onclick="exportJSON()" class="btn-secondary" style="padding: 0.5rem 1rem; width:auto;">JSONエクスポート</button>
                <label class="btn-primary" style="padding: 0.5rem 1rem; width:auto; cursor:pointer; text-align:center;">
                    JSON復元
                    <input type="file" id="file-import" accept=".json" style="display:none;" onchange="handleJSONImport(event)">
                </label>
            </div>
        </div>
    `;
}

async function saveTaxRate() {
    const btn = document.getElementById('btn-save-tax');
    if (btn.disabled) return;
    
    const inputVal = document.getElementById('set-taxrate').value;
    const isZeroConf = document.getElementById('set-tax-zero').checked;
    
    if (inputVal === '' && !isZeroConf) {
        alert('数値を入力するか、「意図的に0%として設定する」にチェックを入れてください。');
        return;
    }
    
    let rate = parseFloat(inputVal);
    if (isZeroConf) {
        rate = 0;
    } else {
        if (isNaN(rate) || rate < 0 || rate > 100) {
            alert('積立率は 0 から 100 の間で入力してください。');
            return;
        }
    }
    
    btn.disabled = true;
    try {
        await db.put('settings', { key: 'tax_rate', value: rate });
        await db.put('settings', { key: 'tax_rate_configured', value: true });
        alert('設定を保存しました。');
        loadSettings();
    } catch(e) {
        console.error(e);
        alert('保存に失敗しました。');
    } finally {
        btn.disabled = false;
    }
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

async function handleJSONImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('データを復元しますか？既存データと重複しないIDは追加され、同じIDは上書きされます。')) {
        event.target.value = ''; // Reset
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const success = await importJSON(db, content);
        if (success) {
            alert('データの復元が完了しました。');
            window.location.reload();
        } else {
            alert('データの復元に失敗しました。ファイル形式が正しいか確認してください。');
        }
    };
    reader.readAsText(file);
}
