async function loadAnalytics() {
    const analyticsSection = document.getElementById('analytics');
    const sales = await db.getAll('sales');
    const validSales = sales.filter(s => !s.refunded);
    const saleItems = await db.getAll('sale_items');
    
    // Calculate product sales quantities
    const productStats = {};
    validSales.forEach(s => {
        const items = saleItems.filter(si => si.sale_id === s.id);
        items.forEach(si => {
            if (!productStats[si.product_id]) {
                productStats[si.product_id] = { name: si.name, qty: 0, revenue: 0 };
            }
            // 本体のみ
            productStats[si.product_id].qty += si.quantity;
            productStats[si.product_id].revenue += si.unit_price * si.quantity;
        });
    });
    
    const sortedProducts = Object.values(productStats).sort((a,b) => b.qty - a.qty);
    
    analyticsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">分析</h2>
        
        <div class="grid grid-cols-2">
            <div class="card" style="margin-bottom: 1rem;">
                <h3>商品別販売数ランキング</h3>
                <div class="chart-container">
                    <canvas id="qtyChart"></canvas>
                </div>
            </div>
            <div class="card" style="margin-bottom: 1rem;">
                <h3>商品別売上ランキング</h3>
                <div class="chart-container">
                    <canvas id="revChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    if (window.qtyChartInstance) window.qtyChartInstance.destroy();
    if (window.revChartInstance) window.revChartInstance.destroy();
    
    if (sortedProducts.length > 0) {
        window.qtyChartInstance = new Chart(document.getElementById('qtyChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedProducts.map(p => p.name),
                datasets: [{
                    label: '販売数',
                    data: sortedProducts.map(p => p.qty),
                    backgroundColor: 'rgba(225, 173, 1, 0.6)'
                }]
            },
            options: { 
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false
            }
        });
        
        const sortedByRev = [...sortedProducts].sort((a,b) => b.revenue - a.revenue);
        window.revChartInstance = new Chart(document.getElementById('revChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedByRev.map(p => p.name),
                datasets: [{
                    label: '売上金額',
                    data: sortedByRev.map(p => p.revenue),
                    backgroundColor: 'rgba(139, 0, 0, 0.6)'
                }]
            },
            options: { 
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}
