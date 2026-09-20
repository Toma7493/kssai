// js/tax_calc.js

/**
 * 税制に基づく概算シミュレーションロジック
 */

// 令和8年(2026年)等に準拠した速算表（適宜最新版に更新）
const INCOME_TAX_RATES = [
    { over: 40000000, rate: 0.45, deduction: 4796000 },
    { over: 18000000, rate: 0.40, deduction: 2796000 },
    { over: 9000000,  rate: 0.33, deduction: 1536000 },
    { over: 6950000,  rate: 0.23, deduction: 636000 },
    { over: 3300000,  rate: 0.20, deduction: 427500 },
    { over: 1950000,  rate: 0.10, deduction: 97500 },
    { over: 0,        rate: 0.05, deduction: 0 }
];

const RECONSTRUCTION_TAX_RATE = 0.021; // 所得税額の2.1%
const RESIDENT_TAX_RATE = 0.10; // 一律10% (所得割)
const RESIDENT_TAX_PER_CAPITA = 5000; // 均等割の目安 (5000円)

const ENTERPRISE_TAX_DEDUCTION = 2900000; // 事業主控除 (年間290万円)
const ENTERPRISE_TAX_RATE = 0.05; // 飲食店業(第1種)

function getIncomeTax(taxableIncome) {
    if (taxableIncome <= 0) return 0;
    
    for (const bracket of INCOME_TAX_RATES) {
        if (taxableIncome >= bracket.over) {
            const tax = (taxableIncome * bracket.rate) - bracket.deduction;
            return Math.max(0, Math.floor(tax)); // 切り捨て
        }
    }
    return 0;
}

/**
 * 税額概算メイン関数
 * @param {number} profit 年間の事業所得(利益)
 * @param {object} config 税制設定オブジェクト
 * @returns {object} 計算結果
 */
function simulateTaxes(profit, config) {
    let result = {
        status: 'calculated',
        incomeTax: 0,
        reconstructionTax: 0,
        residentTax: 0,
        enterpriseTax: 0,
        consumptionTax: 0,
        totalTax: 0,
        warnings: [],
        notCalculated: []
    };

    if (config.businessType === '法人') {
        return {
            status: 'not_supported',
            totalTax: 0,
            warnings: ['法人税の計算には現在対応していません（未計算）。税理士等にご確認ください。']
        };
    }

    if (config.hasOtherIncome) {
        result.warnings.push('他の所得がある場合、合算されるため本アプリの概算より実際の税額が高くなる可能性が高いです。');
    }

    // 1. 事業所得 (青色申告特別控除を差し引く)
    const blueReturnDeduction = config.declarationType === '青色申告' ? (parseInt(config.blueDeduction) || 0) : 0;
    const businessIncome = Math.max(0, profit - blueReturnDeduction);
    
    // 2. 課税所得 (所得控除を差し引く)
    const otherDeductions = parseInt(config.otherDeductions) || 480000; // デフォルト基礎控除48万
    const taxableIncome = Math.max(0, businessIncome - otherDeductions);
    
    // -- 所得税 --
    result.incomeTax = getIncomeTax(taxableIncome);
    
    // -- 復興特別所得税 --
    result.reconstructionTax = Math.floor(result.incomeTax * RECONSTRUCTION_TAX_RATE);
    
    // -- 住民税 --
    // ※住民税の基礎控除額は所得税(48万)と異なり43万ですが、簡易化のため同じ控除額をベースに計算します
    const residentTaxableIncome = Math.max(0, businessIncome - Math.max(0, otherDeductions - 50000));
    if (residentTaxableIncome > 0) {
        result.residentTax = Math.floor(residentTaxableIncome * RESIDENT_TAX_RATE) + RESIDENT_TAX_PER_CAPITA;
    } else {
        result.residentTax = profit > 0 ? RESIDENT_TAX_PER_CAPITA : 0; // 均等割のみ
    }

    // -- 個人事業税 --
    // 事業主控除290万円
    // 飲食業は第1種事業(5%)
    const enterpriseTaxable = Math.max(0, profit - ENTERPRISE_TAX_DEDUCTION);
    result.enterpriseTax = Math.floor(enterpriseTaxable * ENTERPRISE_TAX_RATE);
    
    // -- 消費税 --
    if (config.consumptionTaxType === '免税') {
        result.consumptionTax = 0;
    } else if (config.consumptionTaxType === '簡易課税') {
        // 飲食業は第4種事業 (みなし仕入率60%) -> 納税は売上消費税の40%
        // 売上(税込)から逆算: 売上 * (10/110) * 0.4
        // ※軽減税率(8%)を考慮していないため概算
        const totalSales = profit + (parseInt(config.estimatedExpenses) || 0); // Profit = Sales - Exp => Sales = Profit + Exp
        const salesTax = totalSales * (10 / 110);
        result.consumptionTax = Math.floor(salesTax * 0.4);
        result.warnings.push('消費税(簡易課税)は全額10%・第4種事業(飲食)として大まかに計算しています。');
    } else if (config.consumptionTaxType === '本則課税') {
        result.consumptionTax = 0;
        result.notCalculated.push('消費税(本則課税)');
        result.warnings.push('本則課税の消費税は、品目ごとの税率や適格請求書の判定が必要なため未計算です。');
    }

    result.totalTax = result.incomeTax + result.reconstructionTax + result.residentTax + result.enterpriseTax + result.consumptionTax;
    
    return result;
}
