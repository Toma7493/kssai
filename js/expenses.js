let expensesCategories = [
    '食材仕入れ', '包装資材・容器仕入れ', 'キッチン利用料・出店料', 
    '交通費', '駐車場代', '人件費', '広告宣伝費', '決済手数料', '通信費', '消耗品費', 'その他'
];

async function loadExpenses() {
    const expenses = await db.getAll('expenses');
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const expensesSection = document.getElementById('expenses');
    expensesSection.innerHTML = `
        <h2 style="margin-bottom: 1rem;">経費入力</h2>
        <div class="card" style="margin-bottom: 2rem;">
            <form id="expense-form" onsubmit="saveExpense(event)">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom: 0.5rem; font-weight: bold;">金額 (円)</label>
                    <input type="number" id="exp-amount" min="1" required style="width:100%; padding: 1rem; font-size: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px;" placeholder="0">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom: 0.5rem; font-weight: bold;">カテゴリー</label>
                    <select id="exp-category" required style="width:100%; padding: 1rem; font-size: 1.1rem; border: 1px solid var(--border-color); border-radius: 8px;">
                        ${expensesCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                
                <details style="margin-bottom: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem 1rem;">
                    <summary style="font-weight: bold; padding: 0.5rem 0; cursor: pointer;">詳細設定 (日付・支払元・メモ)</summary>
                    <div style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <div style="margin-bottom: 1rem;">
                            <label style="display:block; margin-bottom: 0.5rem;">発生日</label>
                            <input type="date" id="exp-date" required style="width:100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;">
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="display:flex; align-items:center; font-weight:bold; font-size:1.1rem;">
                                <input type="checkbox" id="exp-paid" checked onchange="document.getElementById('exp-account-div').style.display = this.checked ? 'block' : 'none'" style="width: 24px; height: 24px; margin-right: 0.5rem;">
                                支払済み
                            </label>
                        </div>
                        
                        <div id="exp-account-div" style="margin-bottom: 1rem;">
                            <label style="display:block; margin-bottom: 0.5rem;">支払元口座</label>
                            <select id="exp-account" style="width:100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;">
                                <option value="現金">現金</option>
                                <option value="銀行A">銀行A</option>
                                <option value="個人の立替">個人の立替</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="display:block; margin-bottom: 0.5rem;">内容・メモ</label>
                            <input type="text" id="exp-memo" placeholder="購入した店舗名など" style="width:100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;">
                        </div>
                    </div>
                </details>
                
                <button type="submit" class="btn-primary">経費を保存</button>
            </form>
        </div>
        
        <h2 style="margin-bottom: 1rem;">経費履歴 (最近20件)</h2>
        <div>
            ${expenses.slice(0, 20).map(e => `
                <div class="card" style="margin-bottom: 0.5rem; padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #666; font-size: 0.9rem;">${e.date}</span>
                        ${e.is_paid ? '<span style="color:var(--text-color); font-size: 0.9rem;">支払済</span>' : '<span style="color:var(--accent-red); font-size: 0.9rem; font-weight:bold;">未払い</span>'}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 1.1rem;">${e.category}</span>
                        <span style="font-weight: bold; font-size: 1.2rem; color: var(--accent-red);">¥${e.amount.toLocaleString()}</span>
                    </div>
                    ${e.memo ? `<div style="font-size: 0.9rem; margin-top: 0.5rem; color: #555;">${e.memo}</div>` : ''}
                </div>
            `).join('')}
            ${expenses.length === 0 ? '<p style="color:#888;">経費データがありません</p>' : ''}
        </div>
    `;
    
    // Set today as default
    const todayStr = new Date().toLocaleDateString('sv-SE').split('T')[0]; // YYYY-MM-DD local time
    document.getElementById('exp-date').value = todayStr;
}

async function saveExpense(e) {
    e.preventDefault();
    
    const is_paid = document.getElementById('exp-paid').checked;
    
    const locName = document.getElementById('current-location-display') 
                    ? document.getElementById('current-location-display').innerText 
                    : 'メインキッチン';
                    
    const expense = {
        id: 'e_' + Date.now(),
        date: document.getElementById('exp-date').value,
        category: document.getElementById('exp-category').value,
        amount: parseInt(document.getElementById('exp-amount').value),
        is_paid: is_paid,
        account: is_paid ? document.getElementById('exp-account').value : null,
        memo: document.getElementById('exp-memo').value,
        location: locName
    };
    
    try {
        const tx = db.transaction(['expenses', 'transactions'], 'readwrite');
        tx.objectStore('expenses').put(expense);
        
        if (is_paid) {
            tx.objectStore('transactions').put({
                id: 'tx_exp_' + Date.now(),
                date: new Date().toISOString(),
                type: '経費',
                amount: expense.amount,
                account: expense.account,
                ref_id: expense.id,
                memo: expense.memo
            });
        }
        
        await tx.done;
        // alert('経費を登録しました。'); // Removed alert to make it faster to save
        loadExpenses();
    } catch (err) {
        console.error(err);
        alert('エラーが発生しました。');
    }
}
