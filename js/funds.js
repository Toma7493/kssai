let accountsReceivable = 0;

let currentFundsTab = 'actual'; // 'actual' or 'projected'
let selectedFundsYear = null;

async function loadFunds(silent = false) {
    if (!document.getElementById('funds')) return; // Just in case
    
    const fundsSection = document.getElementById('funds');
    const transactions = await db.getAll('transactions');
    const expenses = await db.getAll('expenses');
    
    const balance = await getBalanceSummary(db);
    let cash = balance.cash;
    let bank = balance.bank;
    accountsReceivable = balance.accountsReceivable;
    let unpaidExpenses = balance.unpaidExpenses;
    const totalFunds = balance.currentFunds;
    
    const jstNow = getJSTDate(new Date().toISOString());
    const realCurrentYearStr = formatYMD(jstNow).substring(0, 4);
    
    if (!selectedFundsYear) {
        selectedFundsYear = realCurrentYearStr;
    }
    
    // Tax Calculation (Auto or Manual)
    const isProjected = currentFundsTab === 'projected';
    const taxData = await calculateTaxReserve(db, selectedFundsYear, isProjected);
    const totalUnpaidTax = await getTotalUnpaidTaxReserve(db);
    
    // 利用可能額 = 現預金 - 未払経費 - 未納の納税準備額 (全年度)
    // ※ダッシュボードと一致させるため、未入金(売掛)は現預金から除外し、税金は全年度分を引く
    const usableFunds = totalFunds - unpaidExpenses - totalUnpaidTax;
    
    // Render
    let taxHtml = '';
    if (!taxData.isConfigured) {
        taxHtml = `
            <div style="background:#fff3cd; color:#856404; padding:1rem; border-radius:4px; font-size:0.9rem; text-align:center;">
                <p style="font-weight:bold; margin-bottom: 0.5rem;">税金目安の設定が必要です</p>
                <p style="margin-bottom: 1rem;">下部の「設定・データ管理」セクションにて、税金計算モード（自動・手動）を選択し、設定を保存してください。</p>
                <button onclick="document.getElementById('settings-auto').scrollIntoView({behavior: 'smooth'})" class="btn-primary" style="padding: 0.5rem 1rem; width: auto; font-size: 0.8rem;">設定エリアへ移動</button>
            </div>
        `;
    } else if (taxData.taxMode === 'auto') {
        const sim = taxData.autoSim;
        if (!sim) {
            taxHtml = `<p>税金計算モジュールが読み込めませんでした。</p>`;
        } else if (sim.status === 'not_supported') {
            taxHtml = `<p style="color:var(--accent-red);">${sim.warnings.join('<br>')}</p>`;
        } else {
            let warnHtml = sim.warnings.length > 0 ? `<div style="background:#fff3cd; color:#856404; padding:0.5rem; border-radius:4px; font-size:0.8rem; margin-bottom:1rem;">${sim.warnings.join('<br>')}</div>` : '';
            let notCalcHtml = sim.notCalculated.length > 0 ? `<div style="color:var(--accent-red); font-size:0.8rem;">未計算: ${sim.notCalculated.join(', ')}</div>` : '';
            
            taxHtml = `
                ${warnHtml}
                <table style="width:100%; text-align:left; font-size:0.95rem; margin-bottom:0.5rem; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:0.25rem 0; color:#555;">
                            <div style="font-weight:bold;">所得税</div>
                            <div style="font-size:0.75rem; color:#888;">${sim.labels.incomeTax}</div>
                        </td>
                        <td style="padding:0.25rem 0; text-align:right; vertical-align:top;">¥${sim.incomeTax.toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:0.25rem 0; color:#555;">
                            <div style="font-weight:bold;">復興特別所得税</div>
                            <div style="font-size:0.75rem; color:#888;">${sim.labels.reconstructionTax}</div>
                        </td>
                        <td style="padding:0.25rem 0; text-align:right; vertical-align:top;">¥${sim.reconstructionTax.toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:0.25rem 0; color:#555;">
                            <div style="font-weight:bold;">住民税</div>
                            <div style="font-size:0.75rem; color:#888;">${sim.labels.residentTax}</div>
                        </td>
                        <td style="padding:0.25rem 0; text-align:right; vertical-align:top;">¥${sim.residentTax.toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:0.25rem 0; color:#555;">
                            <div style="font-weight:bold;">個人事業税</div>
                            <div style="font-size:0.75rem; color:#888;">${sim.labels.enterpriseTax}</div>
                        </td>
                        <td style="padding:0.25rem 0; text-align:right; vertical-align:top;">¥${sim.enterpriseTax.toLocaleString()}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:0.25rem 0; color:#555;">
                            <div style="font-weight:bold;">消費税</div>
                            <div style="font-size:0.75rem; color:#888;">${sim.labels.consumptionTax}</div>
                        </td>
                        <td style="padding:0.25rem 0; text-align:right; vertical-align:top;">¥${sim.consumptionTax.toLocaleString()}</td>
                    </tr>
                </table>
                <div style="text-align:right; font-weight:bold; font-size:1.1rem; border-top: 2px solid #ddd; padding-top: 0.5rem;">
                    合計概算: ¥${sim.totalTax.toLocaleString()}
                </div>
                ${notCalcHtml}
                <div style="font-size:0.8rem; color:#888; margin-top:0.5rem; text-align:right;">
                    <a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm" target="_blank" style="color:var(--primary-color);">国税庁: 所得税の税率</a>
                </div>
            `;
        }
    } else {
        taxHtml = `
            <div style="font-size:0.9rem; color:#666;">
                手動積立モード (税率: ${taxData.taxRateStr})<br>
                利益に対して一定割合を計算しています。<br>
                実際の税額概算を確認するには、設定から「税額概算モード」に変更してください。
            </div>
        `;
    }
    
    // Tab toggles UI
    const targetProfit = isProjected ? taxData.projectedProfit : taxData.profit;
    const targetSales = isProjected ? taxData.projectedSales : taxData.totalSales;
    const targetExpenses = isProjected ? (taxData.autoConfig?.estimatedExpenses || 0) : taxData.totalExpenses;

    const baseYearNum = parseInt(realCurrentYearStr);
    const yearOptions = [baseYearNum - 2, baseYearNum - 1, baseYearNum, baseYearNum + 1].map(y => {
        return `<option value="${y}" ${parseInt(selectedFundsYear) === y ? 'selected' : ''}>${y}年</option>`;
    }).join('');

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
            <h2 style="margin: 0;">資金・税金ダッシュボード</h2>
            <select id="funds-year-selector" onchange="changeFundsYear(this.value)" style="padding:0.5rem; border:1px solid #ccc; border-radius:4px; font-size:1rem;">
                ${yearOptions}
            </select>
        </div>
        
        <!-- Tabs -->
        <div style="display:flex; margin-bottom: 1.5rem; background:#eee; border-radius:8px; padding:0.25rem;">
            <button onclick="switchFundsTab('actual')" style="flex:1; padding:0.75rem; border:none; border-radius:6px; font-weight:bold; cursor:pointer; background:${!isProjected ? '#fff' : 'transparent'}; box-shadow:${!isProjected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};">今年ここまでの実績</button>
            <button onclick="switchFundsTab('projected')" style="flex:1; padding:0.75rem; border:none; border-radius:6px; font-weight:bold; cursor:pointer; background:${isProjected ? '#fff' : 'transparent'}; box-shadow:${isProjected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'};">年間見込み(予測)</button>
        </div>
        
        <!-- Overview Grid -->
        <div class="grid grid-cols-2" style="margin-bottom: 1.5rem;">
            <div class="card metric-card">
                <h3>売上 (${isProjected ? '見込' : '実績'})</h3>
                <div class="value">¥${targetSales.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>経費 (${isProjected ? '見込' : '実績'})</h3>
                <div class="value">¥${targetExpenses.toLocaleString()}</div>
            </div>
        </div>
        
        <div class="grid grid-cols-3" style="margin-bottom: 1.5rem;">
            <div class="card metric-card">
                <h3>管理上の利益</h3>
                <div class="value" style="color:var(--text-color);">¥${targetProfit.toLocaleString()}</div>
            </div>
            <div class="card metric-card">
                <h3>納税準備金目安</h3>
                <div class="value" style="color: var(--accent-red);">¥${taxData.remainingReserve.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#888; margin-top:0.2rem;">支払済: ¥${taxData.taxPaid.toLocaleString()}</div>
            </div>
            <div class="card metric-card" style="background:#f0fdf4; border-color:#bbf7d0;">
                <h3>最終利用可能額</h3>
                <div class="value" style="color: var(--accent-green);">¥${usableFunds.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#666; margin-top:0.2rem;">現預金 - 未払 - 全年度税金</div>
            </div>
        </div>
        
        <div class="grid grid-cols-2" style="margin-bottom: 1.5rem;">
            <div class="card">
                <h3 style="margin-bottom: 0.2rem; color: var(--accent-red);">${parseInt(selectedFundsYear)+1}年の納税に備える目安</h3>
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">${selectedFundsYear}年の所得に基づく概算 ${isProjected ? '(年間見込み)' : '(今年ここまでの実績)'}</div>
                <hr style="margin: 0.75rem 0; border-top:1px solid #eee;">
                ${taxHtml}
                <div style="margin-top: 1rem; text-align: center;">
                    <button onclick="openTaxPaymentModal('${selectedFundsYear}')" class="btn-primary" style="padding: 0.5rem 1rem; width: auto; font-size: 0.9rem;">税金の支払いを記録する</button>
                </div>
            </div>
            
            <div>
                <div class="card" style="margin-bottom: 1rem;">
                    <h3>現預金・未入金</h3>
                    <ul style="margin-top:0.5rem; line-height: 1.6;">
                        <li style="display:flex; justify-content:space-between;"><span>現金:</span> <strong>¥${cash.toLocaleString()}</strong></li>
                        <li style="display:flex; justify-content:space-between;"><span>銀行A:</span> <strong>¥${bank.toLocaleString()}</strong></li>
                        <li style="display:flex; justify-content:space-between; color:var(--accent-red);"><span>未払経費:</span> <strong>-¥${unpaidExpenses.toLocaleString()}</strong></li>
                    </ul>
                    <hr style="margin: 0.75rem 0; border-top:1px solid #eee;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:0.9rem; color:#666;">カード・QR等 未入金残高</div>
                            <div style="font-size: 1.4rem; font-weight: bold;">¥${accountsReceivable.toLocaleString()}</div>
                        </div>
                        <button onclick="openDepositModal()" class="btn-primary" style="padding: 0.5rem 1rem; width: auto; font-size:0.9rem;" ${accountsReceivable <= 0 ? 'disabled' : ''}>入金を処理</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    fundsSection.innerHTML = html;
}

window.switchFundsTab = function(tab) {
    currentFundsTab = tab;
    loadFunds(false);
};

window.changeFundsYear = function(year) {
    selectedFundsYear = year;
    loadFunds(false);
};

async function openDepositModal() {
    const transactions = await db.getAll('transactions');
    const arTransactions = transactions.filter(t => t.account === '未入金' && t.type === '売上' && t.clearance_status !== 'paid');
    arTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const overlay = document.createElement('div');
    overlay.className = 'slide-panel-overlay';
    
    let arListHtml = arTransactions.map(t => {
        const remaining = (parseFloat(t.amount) || 0) - (parseFloat(t.cleared_amount) || 0);
        return `<div style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem; border-bottom:1px solid #eee;">
            <label style="display:flex; align-items:center; flex:1; cursor:pointer;">
                <input type="checkbox" class="ar-chk" value="${t.id}" data-amt="${remaining}" style="margin-right:1rem; width:20px; height:20px;">
                <div>
                    <div style="font-size:0.85rem; color:#666;">${formatYMD(getJSTDate(t.date))}</div>
                </div>
            </label>
            <div style="font-weight:bold;">¥${remaining.toLocaleString()}</div>
        </div>`;
    }).join('');
    
    if (arTransactions.length === 0) {
        arListHtml = '<p style="color:#888;">消込可能な未入金データがありません。</p>';
    }
    
    overlay.innerHTML = `
        <div class="slide-panel" style="max-height: 90vh; display: flex; flex-direction: column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.2rem;">未入金の入金消込</h3>
                <button id="dep-cancel" style="background:none; border:none; font-size: 1.5rem; color: #888;">✕</button>
            </div>
            
            <div style="margin-bottom: 0.5rem;">
                消込対象の売上を選択してください：
            </div>
            
            <div style="flex:1; overflow-y:auto; border:1px solid #ccc; border-radius:8px; margin-bottom:1rem; padding:0.5rem; background:#fff;">
                ${arListHtml}
            </div>
            
            <div style="margin-bottom: 1rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">選択合計額 (入金額)</label>
                <input type="number" id="dep-target" value="0" readonly style="width:100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem; background:#f0f0f0;">
            </div>
            
            <div style="margin-bottom: 1rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">決済手数料など (経費として引かれる額)</label>
                <input type="number" id="dep-fee" value="0" style="width:100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem;">
            </div>
            
            <div style="margin-bottom: 1.5rem; background: #f9f9f9; padding: 1rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem;">
                    <span>銀行への実際の入金額</span>
                    <span id="dep-actual" style="color: var(--accent-green);">¥0</span>
                </div>
            </div>
            
            <button id="dep-submit" class="btn-primary" disabled>入金を記録</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const targetInput = document.getElementById('dep-target');
    const feeInput = document.getElementById('dep-fee');
    const actualDisplay = document.getElementById('dep-actual');
    const btnSubmit = document.getElementById('dep-submit');
    
    const checkboxes = overlay.querySelectorAll('.ar-chk');
    
    const updateActual = () => {
        let totalSelected = 0;
        checkboxes.forEach(chk => {
            if (chk.checked) totalSelected += parseFloat(chk.getAttribute('data-amt'));
        });
        targetInput.value = totalSelected;
        
        let fee = parseInt(feeInput.value) || 0;
        let actual = totalSelected - fee;
        actualDisplay.innerText = "¥" + actual.toLocaleString();
        
        if (actual < 0) {
            actualDisplay.style.color = "var(--accent-red)";
            btnSubmit.disabled = true;
        } else {
            actualDisplay.style.color = "var(--accent-green)";
            btnSubmit.disabled = totalSelected === 0;
        }
    };
    
    checkboxes.forEach(chk => chk.addEventListener('change', updateActual));
    feeInput.addEventListener('input', updateActual);
    
    document.getElementById('dep-cancel').onclick = () => document.body.removeChild(overlay);
    
    btnSubmit.onclick = async () => {
        if (btnSubmit.disabled) return;
        
        let target = parseInt(targetInput.value) || 0;
        let fee = parseInt(feeInput.value) || 0;
        let actual = target - fee;
        
        if (target <= 0) return;
        
        btnSubmit.disabled = true;
        btnSubmit.innerText = "処理中...";
        
        try {
            const tx = db.transaction(['transactions', 'expenses'], 'readwrite');
            const store = tx.objectStore('transactions');
            
            // 選択された売上のステータスを更新
            for (const chk of checkboxes) {
                if (chk.checked) {
                    const tId = chk.value;
                    const t = await store.get(tId);
                    if (t) {
                        const remaining = (parseFloat(t.amount) || 0) - (parseFloat(t.cleared_amount) || 0);
                        t.cleared_amount = (parseFloat(t.cleared_amount) || 0) + remaining;
                        t.clearance_status = 'paid';
                        store.put(t);
                    }
                }
            }
            
            const groupId = Date.now();
            
            // 1. 未入金から減らす (全体額)
            store.put({
                id: 'tx_dep_out_' + groupId,
                date: new Date().toISOString(),
                type: '振替出金',
                amount: target,
                account: '未入金',
                memo: '決済入金消込'
            });
            
            // 2. 銀行に入金する
            store.put({
                id: 'tx_dep_in_' + groupId,
                date: new Date().toISOString(),
                type: '振替入金',
                amount: target,
                account: '銀行A',
                memo: '決済入金消込'
            });
            
            // 3. 手数料があれば経費として支払ったとして記録
            if (fee > 0) {
                tx.objectStore('expenses').put({
                    id: 'exp_fee_' + groupId,
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
    
    const getSet = (k, def) => {
        const s = settings.find(x => x.key === k);
        return s ? s.value : def;
    };

    const taxMode = getSet('tax_calc_mode', 'manual');
    const isConf = getSet('tax_rate_configured', false);
    
    // Manual
    const taxRateSetting = settings.find(s => s.key === 'tax_rate');
    let taxRateVal = '';
    if (taxRateSetting && taxRateSetting.value !== '') {
        let num = parseFloat(taxRateSetting.value);
        if (!isNaN(num)) taxRateVal = (num > 0 && num <= 1) ? (num * 100) : num;
    }
    
    // Auto
    const busType = getSet('tax_business_type', '個人事業主');
    const declType = getSet('tax_declaration', '青色申告');
    const blueDed = getSet('tax_blue_deduction', 650000);
    const otherDed = getSet('tax_other_deductions', 480000);
    const hasOther = getSet('tax_has_other_income', false);
    const consTax = getSet('tax_consumption', '免税');
    
    settingsSection.innerHTML = `
        <h2 style="margin-bottom: 1.5rem;">設定・データ管理</h2>
        
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3>税金・資金計算モード</h3>
            <div style="margin-top: 1rem; margin-bottom: 1.5rem;">
                <label style="display:inline-flex; align-items:center; margin-right: 1.5rem; cursor:pointer;">
                    <input type="radio" name="tax_calc_mode" value="manual" ${taxMode === 'manual' ? 'checked' : ''} onchange="toggleTaxMode()">
                    <span style="margin-left:0.5rem; font-weight:bold;">手動積立モード</span>
                </label>
                <label style="display:inline-flex; align-items:center; cursor:pointer;">
                    <input type="radio" name="tax_calc_mode" value="auto" ${taxMode === 'auto' ? 'checked' : ''} onchange="toggleTaxMode()">
                    <span style="margin-left:0.5rem; font-weight:bold;">税額概算モード (推奨)</span>
                </label>
            </div>
            
            <!-- 手動積立設定 -->
            <div id="settings-manual" style="display: ${taxMode === 'manual' ? 'block' : 'none'}; background: #f9f9f9; padding: 1rem; border-radius: 8px;">
                <label style="display:block; margin-bottom: 0.5rem; font-weight:bold;">納税用積立率 (%)</label>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem;">利益に対して一定割合を自動で取り置きます。</p>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.5rem;">
                    <input type="number" id="set-taxrate" step="1" min="0" max="100" value="${taxRateVal}" placeholder="例: 20" style="padding: 0.5rem; width:100px; border: 1px solid var(--border-color); border-radius: 4px;">
                    <span>%</span>
                </div>
                <label style="display:flex; align-items:center; font-size: 0.9rem; color: #666;">
                    <input type="checkbox" id="set-tax-zero" ${isConf && taxRateVal === 0 ? 'checked' : ''} style="margin-right: 0.5rem;">
                    意図的に0%として設定する
                </label>
            </div>
            
            <!-- 税額概算設定 -->
            <div id="settings-auto" style="display: ${taxMode === 'auto' ? 'block' : 'none'}; background: #f0f7ff; padding: 1rem; border-radius: 8px;">
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">公式の計算式に基づいて税金（所得税・住民税・事業税・消費税）の目安を算出します。</p>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display:block; font-weight:bold; margin-bottom: 0.3rem;">事業形態</label>
                    <select id="set-bus-type" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                        <option value="個人事業主" ${busType === '個人事業主' ? 'selected' : ''}>個人事業主</option>
                        <option value="法人" ${busType === '法人' ? 'selected' : ''}>法人（未対応）</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display:block; font-weight:bold; margin-bottom: 0.3rem;">申告区分</label>
                    <select id="set-decl-type" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                        <option value="青色申告" ${declType === '青色申告' ? 'selected' : ''}>青色申告</option>
                        <option value="白色申告" ${declType === '白色申告' ? 'selected' : ''}>白色申告</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display:block; font-weight:bold; margin-bottom: 0.3rem;">青色申告特別控除額</label>
                    <select id="set-blue-ded" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                        <option value="650000" ${blueDed == 650000 ? 'selected' : ''}>65万円 (e-Tax等)</option>
                        <option value="550000" ${blueDed == 550000 ? 'selected' : ''}>55万円</option>
                        <option value="100000" ${blueDed == 100000 ? 'selected' : ''}>10万円</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display:block; font-weight:bold; margin-bottom: 0.3rem;">所得控除の合計 (基礎控除・社会保険料等)</label>
                    <input type="number" id="set-other-ded" value="${otherDed}" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                    <p style="font-size:0.8rem; color:#666; margin-top:0.2rem;">※基礎控除(48万円)を含む。国民健康保険や年金を払っている場合はここに足してください。</p>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display:block; font-weight:bold; margin-bottom: 0.3rem;">消費税の課税状況</label>
                    <select id="set-cons-tax" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                        <option value="免税" ${consTax === '免税' ? 'selected' : ''}>免税事業者</option>
                        <option value="簡易課税" ${consTax === '簡易課税' ? 'selected' : ''}>簡易課税 (第4種・飲食店業)</option>
                        <option value="本則課税" ${consTax === '本則課税' ? 'selected' : ''}>本則課税 (未計算)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display:flex; align-items:center; font-weight:bold;">
                        <input type="checkbox" id="set-has-other" ${hasOther ? 'checked' : ''} style="margin-right:0.5rem;">
                        給与など他の所得がある
                    </label>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <button id="btn-save-tax" onclick="saveSettings()" class="btn-primary" style="padding: 0.75rem 2rem; width: auto;">設定を保存</button>
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

window.toggleTaxMode = function() {
    const mode = document.querySelector('input[name="tax_calc_mode"]:checked').value;
    document.getElementById('settings-manual').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('settings-auto').style.display = mode === 'auto' ? 'block' : 'none';
};

async function saveSettings() {
    const btn = document.getElementById('btn-save-tax');
    if (btn.disabled) return;
    btn.disabled = true;
    
    const mode = document.querySelector('input[name="tax_calc_mode"]:checked').value;
    
    try {
        await db.put('settings', { key: 'tax_calc_mode', value: mode });
        
        if (mode === 'manual') {
            const inputVal = document.getElementById('set-taxrate').value;
            const isZeroConf = document.getElementById('set-tax-zero').checked;
            
            if (inputVal === '' && !isZeroConf) {
                alert('数値を入力するか、「意図的に0%として設定する」にチェックを入れてください。');
                btn.disabled = false;
                return;
            }
            let rate = parseFloat(inputVal);
            if (isZeroConf) rate = 0;
            else if (isNaN(rate) || rate < 0 || rate > 100) {
                alert('積立率は 0 から 100 の間で入力してください。');
                btn.disabled = false;
                return;
            }
            await db.put('settings', { key: 'tax_rate', value: rate });
            await db.put('settings', { key: 'tax_rate_configured', value: true });
        } else {
            // auto mode saves
            await db.put('settings', { key: 'tax_business_type', value: document.getElementById('set-bus-type').value });
            await db.put('settings', { key: 'tax_declaration', value: document.getElementById('set-decl-type').value });
            await db.put('settings', { key: 'tax_blue_deduction', value: parseInt(document.getElementById('set-blue-ded').value) });
            await db.put('settings', { key: 'tax_other_deductions', value: parseInt(document.getElementById('set-other-ded').value) || 0 });
            await db.put('settings', { key: 'tax_consumption', value: document.getElementById('set-cons-tax').value });
            await db.put('settings', { key: 'tax_has_other_income', value: document.getElementById('set-has-other').checked });
            await db.put('settings', { key: 'tax_auto_configured', value: true });
        }
        
        alert('設定を保存しました。');
        
        // Reload dashboard and funds sections to reflect immediately
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
        loadFunds(false);
        loadSettings();
        loadFunds(true); // Assuming loadFunds supports silent mode or we just let it be updated on tab switch
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

async function openTaxPaymentModal(defaultYear) {
    const overlay = document.createElement('div');
    overlay.className = 'slide-panel-overlay';
    
    // 現在の年をデフォルトの日付に使用
    const today = formatYMD(getJSTDate(new Date().toISOString()));
    
    overlay.innerHTML = `
        <div class="slide-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.2rem;">税金の支払いを記録</h3>
                <button id="tp-cancel" style="background:none; border:none; font-size: 1.5rem; color: #888;">✕</button>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">対象の所得年</label>
                <input type="number" id="tp-year" value="${defaultYear}" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem; background:#f9f9f9;" readonly>
                <div style="font-size:0.8rem; color:#666; margin-top:0.2rem;">※${parseInt(defaultYear)+1}年などに納付する税金でも、対象となった所得年(${defaultYear}年)に紐づけます。</div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">支払額</label>
                <input type="number" id="tp-amount" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem;">
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">支払日</label>
                <input type="date" id="tp-date" value="${today}" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem;">
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">支払元</label>
                <select id="tp-account" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem; appearance: none; background: #fff;">
                    <option value="現金">現金</option>
                    <option value="銀行A">銀行A</option>
                </select>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="font-weight:bold; display:block; margin-bottom:0.5rem;">メモ・税目など</label>
                <input type="text" id="tp-memo" placeholder="例: 2026年分 所得税" style="width:100%; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1.2rem;">
            </div>
            
            <button id="tp-submit" class="btn-primary">支払を記録</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('tp-cancel').onclick = () => document.body.removeChild(overlay);
    
    document.getElementById('tp-submit').onclick = async () => {
        const btnSubmit = document.getElementById('tp-submit');
        if (btnSubmit.disabled) return;
        
        let amount = parseInt(document.getElementById('tp-amount').value) || 0;
        if (amount <= 0) {
            alert("支払額を正しく入力してください。");
            return;
        }
        
        btnSubmit.disabled = true;
        btnSubmit.innerText = "処理中...";
        
        try {
            const tx = db.transaction(['transactions'], 'readwrite');
            
            tx.objectStore('transactions').put({
                id: 'tx_tax_' + Date.now(),
                date: new Date(document.getElementById('tp-date').value).toISOString(),
                type: '税金',
                amount: amount,
                account: document.getElementById('tp-account').value,
                memo: document.getElementById('tp-memo').value,
                tax_year: document.getElementById('tp-year').value
            });
            
            await tx.done;
            alert('税金の支払いを記録しました。');
            document.body.removeChild(overlay);
            loadFunds();
        } catch (e) {
            console.error(e);
            alert("処理に失敗しました。");
            btnSubmit.disabled = false;
            btnSubmit.innerText = "支払を記録";
        }
    };
}

