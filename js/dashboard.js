let dashboardPeriod = 'today';
let dashboardLocation = 'すべて';

async function loadDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    
    // Fetch data
    const sales = await db.getAll('sales');
    const expenses = await db.getAll('expenses');
    const transactions = await db.getAll('transactions');
    const settings = await db.getAll('settings');
    
    const taxRateObj = settings.find(s => s.id === 'tax_rate') || { value: 20 };
    const taxRate = parseFloat(taxRateObj.value) / 100;
    
    // Filter out refunded
    let validSales = sales.filter(s => !s.refunded);
    let validExpenses = expenses;
    
    // Period & Location Filtering
    const todayStr = new Date().toLocaleDateString('sv-SE').split('T')[0]; // YYYY-MM-DD
    const monthStr = todayStr.substring(0, 7); // YYYY-MM
    
    let filteredSales = validSales;
    let filteredExpenses = validExpenses;
    
    if (dashboardLocation !== 'すべて') {
        filteredSales = filteredSales.filter(s => s.location === dashboardLocation);
        filteredExpenses = filteredExpenses.filter(e => e.location === dashboardLocation);
    }
    
    if (dashboardPeriod === 'today') {
        filteredSales = filteredSales.filter(s => s.date.startsWith(todayStr));
        filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(todayStr));
    } else if (dashboardPeriod === 'month') {
        filteredSales = filteredSales.filter(s => s.date.startsWith(monthStr));
        filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(monthStr));
    }
    
    // Metrics
    const salesAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const expensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = salesAmount - expensesAmount;
    
    const avgTicket = filteredSales.length > 0 ? Math.floor(salesAmount / filteredSales.length) : 0;
    
    // Funds & Tax Reserve (All-time, ignores period filter for accurate balance)
    const currentFunds = transactions.reduce((sum, t) => {
        if (t.type === '売上' || t.type === '振替入金' || t.type === '自己資金') return sum + t.amount;
        if (t.type === '経費' || t.type === '振替出金' || t.type === '税金' || t.type === '生活費') return sum - t.amount;
        return sum;
    }, 0);
    
    // Total profit for tax calculation (all-time)
    const totalSalesAll = validSales.reduce((sum, s) => sum + s.total, 0);
    const totalExpensesAll = expenses.reduce((sum, e) => sum + e.amount, 0);
    const allTimeProfit = Math.max(0, totalSalesAll - totalExpensesAll);
    const taxReserve = Math.floor(allTimeProfit * taxRate);
    const availableFunds = currentFunds - taxReserve;
    
    // Top 5 products
    const saleItems = await db.getAll('sale_items');
    // Filter saleItems by filteredSales
    const filteredSaleIds = new Set(filteredSales.map(s => s.id));
    const filteredSaleItems = saleItems.filter(si => filteredSaleIds.has(si.sale_id));
    
    const productCounts = {};
    filteredSaleItems.forEach(si => {
        const qty = si.quantity - si.refunded_quantity;
        if (qty > 0) {
            if (!productCounts[si.name]) productCounts[si.name] = 0;
            productCounts[si.name] += qty;
        }
    });
    
    const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
        
    const locations = ['すべて', ...new Set(validSales.map(s => s.location))];
    
    dashboardSection.innerHTML = `
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <select id="dash-period" style="flex:1; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 1rem;">
                <option value="today" ${dashboardPeriod === 'today' ? 'selected' : ''}>今日</option>
                <option value="month" ${dashboardPeriod === 'month' ? 'selected' : ''}>今月</option>
                <option value="all" ${dashboardPeriod === 'all' ? 'selected' : ''}>全期間</option>
            </select>
            <select id="dash-location" style="flex:1; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 1rem;">
                ${locations.map(l => `<option value="${l}" ${dashboardLocation === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
        
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <span style="color:#666;">売上</span>
                <span style="font-weight:bold; font-size:1.2rem;">¥${salesAmount.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <span style="color:#666;">経費</span>
                <span style="color:var(--accent-red); font-weight:bold;">-¥${expensesAmount.toLocaleString()}</span>
            </div>
            <hr style="border:0; border-top:1px solid #eee; margin:0.5rem 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold;">管理上の利益</span>
                <span style="font-weight:bold; font-size:1.5rem; color:${profit < 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">¥${profit.toLocaleString()}</span>
            </div>
        </div>
        
        <div class="grid grid-cols-2" style="margin-bottom: 1rem;">
            <div class="card metric-card" style="margin-bottom:0;">
                <h3>会計件数</h3>
                <div class="value" style="font-size:1.3rem;">${filteredSales.length} 件</div>
            </div>
            <div class="card metric-card" style="margin-bottom:0;">
                <h3>平均客単価</h3>
                <div class="value" style="font-size:1.3rem;">¥${avgTicket.toLocaleString()}</div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 1rem;">
            <h3>売上推移 (最近7件)</h3>
            <canvas id="salesChart" height="150"></canvas>
        </div>
        
        <div class="card" style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem;">売れ筋トップ5</h3>
            ${topProducts.length === 0 ? '<p style="color:#888;">データがありません</p>' : ''}
            ${topProducts.map((p, i) => `
                <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span>${i+1}. ${p[0]}</span>
                    <span style="font-weight:bold;">${p[1]}点</span>
                </div>
            `).join('')}
        </div>
        
        <div class="card" style="margin-bottom: 1rem; background: #fff5f5; border: 1px solid #ffcccc;">
            <h3 style="margin-bottom: 1rem; color: var(--accent-red);">資金と税金の目安</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <span style="color:#666;">現預金残高</span>
                <span style="font-weight:bold;">¥${currentFunds.toLocaleString()}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <span style="color:#666;">納税積立目安 (${taxRateObj.value}%)</span>
                <span style="color:var(--accent-red); font-weight:bold;">-¥${taxReserve.toLocaleString()}</span>
            </div>
            <hr style="border:0; border-top:1px dashed #ffcccc; margin:0.5rem 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold;">利用可能額</span>
                <span style="font-weight:bold; font-size:1.3rem; color:var(--accent-red);">¥${availableFunds.toLocaleString()}</span>
            </div>
            <p style="font-size:0.8rem; color:#888; margin-top:0.5rem;">※全期間を通した試算です。</p>
        </div>
    `;
    
    // Draw chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    const recentSalesForChart = [...filteredSales].slice(-7);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: recentSalesForChart.map(s => new Date(s.date).toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'})),
            datasets: [{
                label: '売上金額',
                data: recentSalesForChart.map(s => s.total),
                backgroundColor: 'rgba(74, 93, 35, 0.6)',
                borderColor: 'rgba(74, 93, 35, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Event Listeners for filters
    document.getElementById('dash-period').addEventListener('change', (e) => {
        dashboardPeriod = e.target.value;
        loadDashboard();
    });
    document.getElementById('dash-location').addEventListener('change', (e) => {
        dashboardLocation = e.target.value;
        loadDashboard();
    });
}
