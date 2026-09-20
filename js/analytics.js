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
            <div class="card">
                <h3>商品別販売数ランキング</h3>
                <canvas id="qtyChart" height="200"></canvas>
            </div>
            <div class="card">
                <h3>商品別売上ランキング</h3>
                <canvas id="revChart" height="200"></canvas>
            </div>
        </div>
    `;
    
    if (sortedProducts.length > 0) {
        new Chart(document.getElementById('qtyChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedProducts.map(p => p.name),
                datasets: [{
                    label: '販売数',
                    data: sortedProducts.map(p => p.qty),
                    backgroundColor: 'rgba(225, 173, 1, 0.6)'
                }]
            },
            options: { indexAxis: 'y' }
        });
        
        const sortedByRev = [...sortedProducts].sort((a,b) => b.revenue - a.revenue);
        new Chart(document.getElementById('revChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedByRev.map(p => p.name),
                datasets: [{
                    label: '売上金額',
                    data: sortedByRev.map(p => p.revenue),
                    backgroundColor: 'rgba(139, 0, 0, 0.6)'
                }]
            },
            options: { indexAxis: 'y' }
        });
    }
}
