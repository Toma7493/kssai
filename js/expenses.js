let expensesCategories = [
    '食材仕入れ', '包装資材・容器仕入れ', 'キッチン利用料・出店料', 
    '交通費', '駐車場代', '人件費', '広告宣伝費', '決済手数料', '通信費', '消耗品費', 'その他'
];

async function loadExpenses() {
    const expenses = await db.getAll('expenses');
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const expensesSection = document.getElementById('expenses');
    expensesSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">経費入力・履歴</h2>
        <div class="grid" style="grid-template-columns: 1fr 2fr;">
            <div class="card">
                <h3>新規経費登録</h3>
                <form id="expense-form" onsubmit="saveExpense(event)">
                    <div style="margin-bottom: 1rem;">
                        <label style="display:block; margin-bottom: 0.5rem;">発生日</label>
                        <input type="date" id="exp-date" required style="width:100%; padding:0.5rem;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display:block; margin-bottom: 0.5rem;">カテゴリー</label>
                        <select id="exp-category" required style="width:100%; padding:0.5rem;">
                            ${expensesCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display:block; margin-bottom: 0.5rem;">金額 (円)</label>
                        <input type="number" id="exp-amount" min="1" required style="width:100%; padding:0.5rem;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display:block; margin-bottom: 0.5rem;">支払済み</label>
                        <input type="checkbox" id="exp-paid" checked onchange="document.getElementById('exp-account-div').style.display = this.checked ? 'block' : 'none'">
                    </div>
                    <div id="exp-account-div" style="margin-bottom: 1rem;">
                        <label style="display:block; margin-bottom: 0.5rem;">支払元口座</label>
                        <select id="exp-account" style="width:100%; padding:0.5rem;">
                            <option value="現金">現金</option>
                            <option value="銀行A">銀行A</option>
                            <option value="個人の立替">個人の立替</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display:block; margin-bottom: 0.5rem;">内容・メモ</label>
                        <input type="text" id="exp-memo" style="width:100%; padding:0.5rem;">
                    </div>
                    <button type="submit" style="width:100%; padding: 1rem; background: var(--accent-red); color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">登録</button>
                </form>
            </div>
            
            <div class="card">
                <h3>経費履歴</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 0.5rem;">日付</th>
                            <th style="padding: 0.5rem;">カテゴリ</th>
                            <th style="padding: 0.5rem;">金額</th>
                            <th style="padding: 0.5rem;">状態</th>
                        </tr>
                    </thead>
                    <tbody id="expense-table-body">
                        ${expenses.map(e => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 0.5rem;">${e.date}</td>
                                <td style="padding: 0.5rem;">${e.category}</td>
                                <td style="padding: 0.5rem;">¥${e.amount.toLocaleString()}</td>
                                <td style="padding: 0.5rem;">${e.is_paid ? '支払済' : '<span style="color:var(--accent-red);">未払い</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Set today as default
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
}

async function saveExpense(e) {
    e.preventDefault();
    
    const is_paid = document.getElementById('exp-paid').checked;
    
    const expense = {
        id: 'e_' + Date.now(),
        date: document.getElementById('exp-date').value,
        category: document.getElementById('exp-category').value,
        amount: parseInt(document.getElementById('exp-amount').value),
        is_paid: is_paid,
        account: is_paid ? document.getElementById('exp-account').value : null,
        memo: document.getElementById('exp-memo').value,
        location: 'メインキッチン' // ToDo: support location logic
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
        alert('経費を登録しました。');
        loadExpenses();
    } catch (err) {
        console.error(err);
        alert('エラーが発生しました。');
    }
}
