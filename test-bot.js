#!/usr/bin/env node

/**
 * Simple test runner to verify basic functionality
 */

const RiskManager = require('./src/riskManagement/riskManager');
const PaperTrader = require('./src/paperTrading/paperTrader');

console.log('🚀 Starting crypto trading bot tests...\n');

// Test 1: Risk Manager
console.log('📊 Testing Risk Manager...');
try {
    const lotSize = RiskManager.calculateLotSize(1000, 50000, 0.02);
    console.log(`✅ Lot size calculation: ${lotSize} (for $1000 balance, $50000 price, 2% risk)`);
    
    const trade = {
        symbol: 'BTC/USD',
        side: 'buy',
        amount: 0.01,
        price: 50000
    };
    
    const isValid = RiskManager.validateTrade(trade, 1000);
    console.log(`✅ Trade validation: ${isValid ? 'PASSED' : 'FAILED'}`);
} catch (error) {
    console.log(`❌ Risk Manager test failed: ${error.message}`);
}

// Test 2: Paper Trader
console.log('\n📈 Testing Paper Trader...');
try {
    const paperTrader = new PaperTrader(10000); // $10,000 starting balance
    console.log(`✅ Paper trader initialized with $${paperTrader.getCurrentBalance('USD')} USD`);
    
    // Simulate a buy order
    const buyOrder = {
        symbol: 'BTC/USD',
        side: 'buy',
        amount: 0.1,
        price: 50000
    };
    
    const buyResult = paperTrader.executeTrade(buyOrder);
    console.log(`✅ Buy order execution: ${buyResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (buyResult.success) {
        console.log(`   - Bought ${buyResult.order.amount} BTC at $${buyResult.order.price}`);
        console.log(`   - Remaining USD: $${paperTrader.getCurrentBalance('USD')}`);
        console.log(`   - BTC balance: ${paperTrader.getCurrentBalance('BTC')}`);
    }
} catch (error) {
    console.log(`❌ Paper Trader test failed: ${error.message}`);
}

// Test 3: Configuration loading
console.log('\n⚙️  Testing Configuration...');
try {
    const config = require('./config/default.json');
    const strategies = require('./config/strategies.json');
    
    console.log(`✅ Config loaded: ${config.exchange.symbols.length} symbols configured`);
    console.log(`✅ Strategies loaded: ${Object.keys(strategies).length} strategies available`);
    
    const enabledStrategies = Object.keys(strategies).filter(key => strategies[key].enabled);
    console.log(`✅ Enabled strategies: ${enabledStrategies.join(', ')}`);
} catch (error) {
    console.log(`❌ Configuration test failed: ${error.message}`);
}

console.log('\n🎉 Basic tests completed!');
console.log('\n💡 To start the bot in paper trading mode, run: npm run dev');
console.log('💡 To start the bot in live mode (BE CAREFUL!), run: npm start');
