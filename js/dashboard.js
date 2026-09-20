let dashboardPeriod = 'today';
let dashboardLocation = 'すべて';

async function loadDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    
    // Fetch data
    const sales = await db.getAll('sales');
    const expenses = await db.getAll('expenses');
    const transactions = await db.getAll('transactions');
    
    // Filter out refunded
    let validSales = sales.filter(s => !s.refunded);
    let validExpenses = expenses;
    
    // Period & Location Filtering using JST helper from db.js
    const jstNow = getJSTDate(new Date().toISOString());
    const todayStr = formatYMD(jstNow); // YYYY-MM-DD
    const monthStr = todayStr.substring(0, 7); // YYYY-MM
    const currentYearStr = todayStr.substring(0, 4);
    
    let filteredSales = validSales;
    let filteredExpenses = validExpenses;
    
    if (dashboardLocation !== 'すべて') {
        filteredSales = filteredSales.filter(s => s.location === dashboardLocation);
        filteredExpenses = filteredExpenses.filter(e => e.location === dashboardLocation);
    }
    
    if (dashboardPeriod === 'today') {
        filteredSales = filteredSales.filter(s => formatYMD(getJSTDate(s.date)) === todayStr);
        filteredExpenses = filteredExpenses.filter(e => e.date === todayStr);
    } else if (dashboardPeriod === 'month') {
        filteredSales = filteredSales.filter(s => formatYMD(getJSTDate(s.date)).startsWith(monthStr));
        filteredExpenses = filteredExpenses.filter(e => e.date.startsWith(monthStr));
    }
    
    // Metrics
    const salesAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const expensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = salesAmount - expensesAmount;
    
    const avgTicket = filteredSales.length > 0 ? Math.floor(salesAmount / filteredSales.length) : 0;
    
    // Funds & Tax Reserve
    const currentFunds = transactions.reduce((sum, t) => {
        if (t.type === '売上' || t.type === '振替入金' || t.type === '自己資金') return sum + t.amount;
        if (t.type === '経費' || t.type === '振替出金' || t.type === '税金' || t.type === '生活費') return sum - t.amount;
        return sum;
    }, 0);
    
    // Use the shared tax reserve logic for the current year
    const taxData = await calculateTaxReserve(db, currentYearStr);
    const availableFunds = currentFunds - taxData.remainingReserve;
    
    // Top 5 products by product_id
    const saleItems = await db.getAll('sale_items');
    const filteredSaleIds = new Set(filteredSales.map(s => s.id));
    const filteredSaleItems = saleItems.filter(si => filteredSaleIds.has(si.sale_id));
    
    const productStats = {};
    filteredSaleItems.forEach(si => {
        const qty = si.quantity - si.refunded_quantity;
        if (qty > 0) {
            if (!productStats[si.product_id]) productStats[si.product_id] = { name: si.name, qty: 0 };
            productStats[si.product_id].qty += qty;
        }
    });
    
    const topProducts = Object.values(productStats)
        .sort((a, b) => b.qty - a.qty)
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
                <h3>平均会計単価</h3>
                <div class="value" style="font-size:1.3rem;">¥${avgTicket.toLocaleString()}</div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem;">${dashboardPeriod === 'today' ? '時間帯別売上推移' : (dashboardPeriod === 'month' ? '日別売上推移' : '売上推移')}</h3>
            <div class="chart-container">
                <canvas id="salesChart"></canvas>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem;">売れ筋トップ5</h3>
            ${topProducts.length === 0 ? '<p style="color:#888;">データがありません</p>' : ''}
            ${topProducts.map((p, i) => `
                <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                    <span>${i+1}. ${p.name}</span>
                    <span style="font-weight:bold;">${p.qty}点</span>
                </div>
            `).join('')}
        </div>
        
        <div class="card" style="margin-bottom: 1rem; background: #fff5f5; border: 1px solid #ffcccc;">
            <h3 style="margin-bottom: 0.2rem; color: var(--accent-red);">${parseInt(currentYearStr)+1}年の納税に備える目安</h3>
            <div style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">${currentYearStr}年の所得に基づく概算</div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <span style="color:#666;">現預金残高</span>
                <span style="font-weight:bold;">¥${currentFunds.toLocaleString()}</span>
            </div>
            
            ${!taxData.isConfigured ? `
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; align-items:center;">
                    <span style="color:#666;">${taxData.taxMode === 'auto' ? '税額概算' : '設定率による取り置き目安'}</span>
                    <span style="color:#888; font-weight:bold;">— (設定が必要)</span>
                </div>
                <div style="text-align:right; margin-bottom: 0.5rem;">
                    <button onclick="showSection('funds')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; width:auto;">⚙️ 計算設定へ</button>
                </div>
            ` : `
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                    <span style="color:#666;">${taxData.taxMode === 'auto' ? '税額概算' : '設定率による取り置き目安'} (${taxData.taxMode === 'manual' ? taxData.taxRateStr : '自動'})</span>
                    <span style="color:var(--accent-red); font-weight:bold;">-¥${taxData.remainingReserve.toLocaleString()}</span>
                </div>
            `}
            
            <hr style="border:0; border-top:1px dashed #ffcccc; margin:0.5rem 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold;">利用可能額の目安</span>
                ${!taxData.isConfigured ? `
                    <span style="font-weight:bold; font-size:1.1rem; color:#888;">計算保留 (納税分未控除)</span>
                ` : `
                    <span style="font-weight:bold; font-size:1.3rem; color:var(--accent-red);">¥${availableFunds.toLocaleString()}</span>
                `}
            </div>
            <p style="font-size:0.8rem; color:#888; margin-top:0.5rem;">※未払い経費などの将来支払い見込みをすべて控除した金額ではありません。</p>
        </div>
    `;
    
    // Process Chart Data
    let chartLabels = [];
    let chartData = [];
    
    if (dashboardPeriod === 'today') {
        // Group by hour
        const hourData = {};
        for(let i=0; i<=23; i++) hourData[i] = 0;
        
        filteredSales.forEach(s => {
            const jst = getJSTDate(s.date);
            hourData[jst.getHours()] += s.total;
        });
        
        const currentHour = jstNow.getHours();
        let startHour = Math.max(0, currentHour - 11); // Show last 12 hours up to current, or 0 to current if early
        if (currentHour < 11) startHour = 0;
        
        for (let i = startHour; i <= Math.max(currentHour, startHour + 5); i++) {
            chartLabels.push(`${i}時`);
            chartData.push(hourData[i] || 0);
        }
    } else if (dashboardPeriod === 'month') {
        // Group by day for the current month
        const dayData = {};
        const daysInMonth = jstNow.getDate(); // Up to today
        for(let i=1; i<=daysInMonth; i++) dayData[i] = 0;
        
        filteredSales.forEach(s => {
            const jst = getJSTDate(s.date);
            dayData[jst.getDate()] += s.total;
        });
        
        for(let i=1; i<=daysInMonth; i++) {
            chartLabels.push(`${i}日`);
            chartData.push(dayData[i]);
        }
    } else {
        // All time: Group by Month for simplicity if many days, or by Day if few
        // Let's group by Month
        const monthMap = {};
        filteredSales.forEach(s => {
            const jst = getJSTDate(s.date);
            const m = formatYMD(jst).substring(0, 7); // YYYY-MM
            if (!monthMap[m]) monthMap[m] = 0;
            monthMap[m] += s.total;
        });
        const sortedMonths = Object.keys(monthMap).sort();
        sortedMonths.forEach(m => {
            const [y, mo] = m.split('-');
            chartLabels.push(`${mo}月`);
            chartData.push(monthMap[m]);
        });
    }

    // Draw chart safely
    if (window.dashboardChart) {
        window.dashboardChart.destroy();
    }
    const ctx = document.getElementById('salesChart').getContext('2d');
    window.dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: '売上金額',
                data: chartData,
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
