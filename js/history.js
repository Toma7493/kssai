let allSales = [];

async function loadHistory() {
    allSales = await db.getAll('sales');
    allSales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const historySection = document.getElementById('history');
    historySection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">売上履歴</h2>
        <div class="card">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 0.5rem;">日時</th>
                        <th style="padding: 0.5rem;">出店場所</th>
                        <th style="padding: 0.5rem;">金額</th>
                        <th style="padding: 0.5rem;">支払方法</th>
                        <th style="padding: 0.5rem;">状態</th>
                        <th style="padding: 0.5rem;">操作</th>
                    </tr>
                </thead>
                <tbody id="history-table-body">
                </tbody>
            </table>
        </div>
    `;
    
    renderHistoryTable();
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    allSales.forEach(sale => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        
        const dateStr = new Date(sale.date).toLocaleString('ja-JP');
        const statusStr = sale.refunded ? '<span style="color:var(--accent-red); font-weight:bold;">取消/返金</span>' : '正常';
        
        tr.innerHTML = `
            <td style="padding: 0.5rem;">${dateStr}</td>
            <td style="padding: 0.5rem;">${sale.location}</td>
            <td style="padding: 0.5rem;">¥${sale.total.toLocaleString()}</td>
            <td style="padding: 0.5rem;">${sale.method}</td>
            <td style="padding: 0.5rem;">${statusStr}</td>
            <td style="padding: 0.5rem;">
                <button onclick="viewSaleDetails('${sale.id}')" style="padding: 0.2rem 0.5rem; cursor: pointer;">詳細/取消</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function viewSaleDetails(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;
    
    const items = await db.getAllFromIndex('sale_items', 'sale_id');
    const saleItems = items.filter(i => i.sale_id === saleId);
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    
    let itemsHtml = saleItems.map(si => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>${si.name} x ${si.quantity} ${si.toppings.length > 0 ? '(+' + si.toppings.map(t=>t.name).join(',') + ')' : ''}</span>
            <span>¥${(si.unit_price * si.quantity + si.toppings.reduce((s,t)=>s+t.price,0)*si.quantity).toLocaleString()}</span>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div style="background: #fff; padding: 2rem; border-radius: var(--radius); width: 500px; max-width: 90%; max-height: 90vh; overflow-y: auto;">
            <h3>会計詳細</h3>
            <div style="margin: 1rem 0; color: #666; font-size: 0.9rem;">
                日時: ${new Date(sale.date).toLocaleString('ja-JP')}<br>
                場所: ${sale.location}<br>
                支払: ${sale.method}
            </div>
            <div style="margin: 1rem 0; padding: 1rem; background: #f9f9f9; border-radius: 4px;">
                ${itemsHtml}
                <hr style="margin: 0.5rem 0; border: none; border-top: 1px dashed #ccc;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                    <span>合計</span>
                    <span>¥${sale.total.toLocaleString()}</span>
                </div>
                ${sale.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; color: var(--accent-red);">
                    <span>値引き</span>
                    <span>-¥${sale.discount.toLocaleString()}</span>
                </div>` : ''}
                ${sale.containerCount > 0 ? `
                <div style="display: flex; justify-content: space-between;">
                    <span>容器代 (x${sale.containerCount})</span>
                    <span>¥${sale.containerTotal.toLocaleString()}</span>
                </div>` : ''}
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                ${!sale.refunded ? `<button id="btn-refund" style="padding: 0.5rem 1rem; background: var(--accent-red); color: white; border: none; border-radius: 4px; cursor: pointer;">全額取消・返金</button>` : ''}
                <button id="btn-close" style="padding: 0.5rem 1rem; cursor: pointer;">閉じる</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-close').onclick = () => document.body.removeChild(modal);
    
    const btnRefund = document.getElementById('btn-refund');
    if (btnRefund) {
        btnRefund.onclick = async () => {
            if (confirm('この会計を全額取消（返金）しますか？')) {
                try {
                    const tx = db.transaction(['sales', 'transactions'], 'readwrite');
                    
                    const saleStore = tx.objectStore('sales');
                    sale.refunded = true;
                    saleStore.put(sale);
                    
                    // Add refund transaction if cash
                    if (sale.method === '現金') {
                        tx.objectStore('transactions').put({
                            id: 'tx_refund_' + Date.now(),
                            date: new Date().toISOString(),
                            type: '経費', // or '返金' logic, but subtracts from cash
                            amount: sale.total,
                            account: '現金',
                            ref_id: sale.id,
                            memo: '売上取消'
                        });
                    }
                    
                    await tx.done;
                    alert('取消処理が完了しました。');
                    document.body.removeChild(modal);
                    loadHistory();
                } catch (e) {
                    console.error("Refund failed", e);
                    alert("取消処理に失敗しました。");
                }
            }
        };
    }
}
