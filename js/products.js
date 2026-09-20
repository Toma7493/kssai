async function loadProducts() {
    const products = await db.getAllFromIndex('products', 'order');
    
    const productsSection = document.getElementById('products');
    productsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">商品管理</h2>
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>商品一覧</h3>
                <button onclick="editProduct(null)" style="padding: 0.5rem 1rem; background: var(--accent-green); color: white; border: none; border-radius: 4px; cursor: pointer;">＋ 新規追加</button>
            </div>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 0.5rem;">商品名</th>
                        <th style="padding: 0.5rem;">カテゴリー</th>
                        <th style="padding: 0.5rem;">価格</th>
                        <th style="padding: 0.5rem;">参考原価</th>
                        <th style="padding: 0.5rem;">状態</th>
                        <th style="padding: 0.5rem;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr style="border-bottom: 1px solid var(--border-color); ${!p.active ? 'opacity: 0.5;' : ''}">
                            <td style="padding: 0.5rem;">${p.name}</td>
                            <td style="padding: 0.5rem;">${p.category}</td>
                            <td style="padding: 0.5rem;">¥${p.price.toLocaleString()}</td>
                            <td style="padding: 0.5rem;">${p.cost ? '¥'+p.cost.toLocaleString() : '未設定'}</td>
                            <td style="padding: 0.5rem;">${p.active ? '販売中' : '終了'}</td>
                            <td style="padding: 0.5rem;">
                                <button onclick="editProduct('${p.id}')" style="padding: 0.2rem 0.5rem; cursor: pointer;">編集</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function editProduct(id) {
    let p = {
        id: 'p_' + Date.now(),
        name: '', price: 0, cost: '', category: 'バーガー', toppingsType: 'none', active: true, order: 99
    };
    
    if (id) {
        p = await db.get('products', id);
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    
    modal.innerHTML = `
        <div style="background: #fff; padding: 2rem; border-radius: var(--radius); width: 400px; max-width: 90%;">
            <h3>${id ? '商品編集' : '新規追加'}</h3>
            <div style="margin-top: 1rem;">
                <label style="display:block; margin-bottom:0.5rem;">商品名</label>
                <input type="text" id="edit-p-name" value="${p.name}" style="width:100%; padding:0.5rem; margin-bottom: 1rem;">
                
                <label style="display:block; margin-bottom:0.5rem;">カテゴリー</label>
                <input type="text" id="edit-p-cat" value="${p.category}" style="width:100%; padding:0.5rem; margin-bottom: 1rem;">
                
                <label style="display:block; margin-bottom:0.5rem;">価格 (円)</label>
                <input type="number" id="edit-p-price" value="${p.price}" style="width:100%; padding:0.5rem; margin-bottom: 1rem;">
                
                <label style="display:block; margin-bottom:0.5rem;">参考原価 (円、空で未設定)</label>
                <input type="number" id="edit-p-cost" value="${p.cost || ''}" style="width:100%; padding:0.5rem; margin-bottom: 1rem;">
                
                <label style="display:block; margin-bottom:0.5rem;">トッピング種類</label>
                <select id="edit-p-top" style="width:100%; padding:0.5rem; margin-bottom: 1rem;">
                    <option value="none" ${p.toppingsType === 'none' ? 'selected' : ''}>なし</option>
                    <option value="burger" ${p.toppingsType === 'burger' ? 'selected' : ''}>バーガー用</option>
                    <option value="tacos" ${p.toppingsType === 'tacos' ? 'selected' : ''}>タコス用</option>
                    <option value="chips" ${p.toppingsType === 'chips' ? 'selected' : ''}>チップス用 (ソース選択)</option>
                </select>
                
                <label style="display:block; margin-bottom:0.5rem;">販売中</label>
                <input type="checkbox" id="edit-p-active" ${p.active ? 'checked' : ''} style="margin-bottom: 1rem;">
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
                <button id="edit-p-cancel" style="padding: 0.5rem 1rem;">キャンセル</button>
                <button id="edit-p-save" style="padding: 0.5rem 1rem; background: var(--accent-green); color: white; border: none; border-radius: 4px;">保存</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('edit-p-cancel').onclick = () => document.body.removeChild(modal);
    document.getElementById('edit-p-save').onclick = async () => {
        const costVal = document.getElementById('edit-p-cost').value;
        
        const updated = {
            id: p.id,
            name: document.getElementById('edit-p-name').value,
            category: document.getElementById('edit-p-cat').value,
            price: parseInt(document.getElementById('edit-p-price').value),
            cost: costVal ? parseInt(costVal) : null,
            toppingsType: document.getElementById('edit-p-top').value,
            active: document.getElementById('edit-p-active').checked,
            order: p.order
        };
        
        await db.put('products', updated);
        document.body.removeChild(modal);
        loadProducts();
        
        if(document.getElementById('pos').classList.contains('active')) {
            loadPOSProducts();
        }
    };
}
