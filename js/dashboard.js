async function loadDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    
    // Fetch data
    const sales = await db.getAll('sales');
    const expenses = await db.getAll('expenses');
    const transactions = await db.getAll('transactions');
    
    // Filter out refunded sales for basic stats
    const validSales = sales.filter(s => !s.refunded);
    
    // Metrics calculations
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = validSales.filter(s => s.date.startsWith(todayStr));
    
    const todaySalesAmount = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalSalesAmount = validSales.reduce((sum, s) => sum + s.total, 0);
    
    const totalExpensesAmount = expenses.filter(e => e.is_paid).reduce((sum, e) => sum + e.amount, 0);
    const unpaidExpenses = expenses.filter(e => !e.is_paid).reduce((sum, e) => sum + e.amount, 0);
    
    const profit = totalSalesAmount - totalExpensesAmount; // Simple management profit
    
    const avgTicket = validSales.length > 0 ? Math.floor(totalSalesAmount / validSales.length) : 0;
    
    // Calculate cash/funds
    const currentFunds = transactions.reduce((sum, t) => {
        if (t.type === '売上' || t.type === '振替入金' || t.type === '自己資金') return sum + t.amount;
        if (t.type === '経費' || t.type === '振替出金' || t.type === '税金' || t.type === '生活費') return sum - t.amount;
        return sum;
    }, 0);
    
    // Cacheless uncollected
    const cashSalesAmount = validSales.filter(s => s.method === '現金').reduce((sum, s) => sum + s.total, 0);
    const cachelessAmount = totalSalesAmount - cashSalesAmount;
    
    dashboardSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">ダッシュボード</h2>
        <div class="grid grid-cols-3">
            <div class="card metric-card">
                <h3>本日の売上</h3>
                <div class="value">¥${todaySalesAmount.toLocaleString()}</div>
                <div style="font-size: 0.9rem; color: #666;">${todaySales.length} 件</div>
            </div>
            <div class="card metric-card">
                <h3>今月の売上</h3>
                <div class="value">¥${totalSalesAmount.toLocaleString()}</div>
                <div style="font-size: 0.9rem; color: #666;">平均単価 ¥${avgTicket.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>管理上の利益 (全期間)</h3>
                <div class="value ${profit < 0 ? 'negative' : ''}">¥${profit.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>現預金残高</h3>
                <div class="value">¥${currentFunds.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>キャッシュレス未入金額</h3>
                <div class="value" style="color: var(--accent-mustard);">¥${cachelessAmount.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>未払い経費</h3>
                <div class="value" style="color: var(--accent-red);">¥${unpaidExpenses.toLocaleString()}</div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 1.5rem;">
            <h3>売上推移 (最近7件)</h3>
            <canvas id="salesChart" height="100"></canvas>
        </div>
    `;
    
    // Draw chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    const recentSales = validSales.slice(-7);
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: recentSales.map(s => new Date(s.date).toLocaleDateString()),
            datasets: [{
                label: '売上金額',
                data: recentSales.map(s => s.total),
                backgroundColor: 'rgba(74, 93, 35, 0.6)',
                borderColor: 'rgba(74, 93, 35, 1)',
                borderWidth: 1
            }]
        }
    });
}
