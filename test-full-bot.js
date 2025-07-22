#!/usr/bin/env node

/**
 * Comprehensive Bot Functionality Test
 * Tests all major components of the crypto trading bot
 */

const path = require('path');
const fs = require('fs');

console.log('🤖 CRYPTO TRADING BOT - COMPREHENSIVE FUNCTIONALITY TEST');
console.log('=' .repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
    if (passed) {
        console.log(`✅ ${name}`);
        if (details) console.log(`   ${details}`);
        testsPassed++;
    } else {
        console.log(`❌ ${name}`);
        if (details) console.log(`   ${details}`);
        testsFailed++;
    }
}

async function runTest(name, testFn) {
    try {
        const result = await testFn();
        logTest(name, true, result);
    } catch (error) {
        logTest(name, false, `Error: ${error.message}`);
    }
}

// Test 1: Environment and Configuration
console.log('\n📋 TESTING ENVIRONMENT & CONFIGURATION');
console.log('-'.repeat(40));

await runTest('Environment variables loaded', () => {
    require('dotenv').config();
    const mode = process.env.MODE;
    const nodeEnv = process.env.NODE_ENV;
    return `MODE: ${mode}, NODE_ENV: ${nodeEnv}`;
});

await runTest('Default configuration loaded', () => {
    const config = require('./config/default.json');
    return `${config.exchange.symbols.length} symbols, ${config.trading.maxConcurrentTrades} max trades`;
});

await runTest('Strategy configuration loaded', () => {
    const strategies = require('./config/strategies.json');
    const enabledCount = Object.values(strategies).filter(s => s.enabled).length;
    return `${Object.keys(strategies).length} total strategies, ${enabledCount} enabled`;
});

// Test 2: Core Modules
console.log('\n🔧 TESTING CORE MODULES');
console.log('-'.repeat(40));

await runTest('Logger module', () => {
    const logger = require('./src/utils/logger');
    logger.info('Test log message');
    return 'Logger initialized and functional';
});

await runTest('Risk Manager module', () => {
    const RiskManager = require('./src/riskManagement/riskManager');
    const lotSize = RiskManager.calculateLotSize(1000, 50000, 0.02);
    return `Calculated lot size: ${lotSize} for $1000 balance`;
});

await runTest('Paper Trader module', () => {
    const PaperTrader = require('./src/paperTrading/paperTrader');
    const trader = new PaperTrader(10000);
    const balance = trader.getCurrentBalance('USD');
    return `Paper trader initialized with $${balance}`;
});

await runTest('Kraken Connector module', () => {
    const KrakenConnector = require('./src/connectors/kraken');
    return 'Kraken connector module loaded successfully';
});

await runTest('Market Data Service module', () => {
    const MarketDataService = require('./src/services/marketDataService');
    return 'Market data service module loaded successfully';
});

await runTest('Trading Service module', () => {
    const TradingService = require('./src/services/tradingService');
    return 'Trading service module loaded successfully';
});

// Test 3: Strategy System
console.log('\n📈 TESTING STRATEGY SYSTEM');
console.log('-'.repeat(40));

await runTest('Strategy Registry module', () => {
    const StrategyRegistry = require('./src/strategies/strategyRegistry');
    return 'Strategy registry loaded successfully';
});

await runTest('Strategy Interface module', () => {
    const StrategyInterface = require('./src/strategies/strategyInterface');
    return 'Strategy interface loaded successfully';
});

await runTest('RSI EMA Confluence Strategy', () => {
    const RSIEMAStrategy = require('./src/strategies/rsiEmaConfluence');
    return 'RSI EMA Confluence strategy loaded successfully';
});

// Test 4: Paper Trading Functionality
console.log('\n💸 TESTING PAPER TRADING FUNCTIONALITY');
console.log('-'.repeat(40));

await runTest('Paper trader buy order execution', () => {
    const PaperTrader = require('./src/paperTrading/paperTrader');
    const trader = new PaperTrader(10000);
    
    const buyOrder = {
        symbol: 'BTC/USD',
        side: 'buy',
        amount: 0.1,
        price: 50000
    };
    
    const result = trader.executeTrade(buyOrder);
    if (!result.success) throw new Error('Buy order failed');
    
    return `Bought ${result.order.amount} BTC at $${result.order.price}`;
});

await runTest('Paper trader sell order execution', () => {
    const PaperTrader = require('./src/paperTrading/paperTrader');
    const trader = new PaperTrader(10000);
    
    // First buy some BTC
    trader.executeTrade({ symbol: 'BTC/USD', side: 'buy', amount: 0.1, price: 50000 });
    
    // Then sell it
    const sellOrder = {
        symbol: 'BTC/USD',
        side: 'sell',
        amount: 0.05,
        price: 52000
    };
    
    const result = trader.executeTrade(sellOrder);
    if (!result.success) throw new Error('Sell order failed');
    
    return `Sold ${result.order.amount} BTC at $${result.order.price}`;
});

await runTest('Paper trader insufficient balance handling', () => {
    const PaperTrader = require('./src/paperTrading/paperTrader');
    const trader = new PaperTrader(1000); // Low balance
    
    const buyOrder = {
        symbol: 'BTC/USD',
        side: 'buy',
        amount: 1, // $50,000 worth, but only have $1,000
        price: 50000
    };
    
    const result = trader.executeTrade(buyOrder);
    if (result.success) throw new Error('Should have failed due to insufficient balance');
    
    return 'Correctly rejected trade due to insufficient balance';
});

// Test 5: Risk Management
console.log('\n⚠️  TESTING RISK MANAGEMENT');
console.log('-'.repeat(40));

await runTest('Risk Manager lot size calculation', () => {
    const RiskManager = require('./src/riskManagement/riskManager');
    
    const lotSize1 = RiskManager.calculateLotSize(1000, 50000, 0.02);
    const lotSize2 = RiskManager.calculateLotSize(5000, 40000, 0.01);
    
    return `Lot sizes: ${lotSize1} (1K bal), ${lotSize2} (5K bal)`;
});

await runTest('Risk Manager trade validation', () => {
    const RiskManager = require('./src/riskManagement/riskManager');
    
    const validTrade = {
        symbol: 'BTC/USD',
        side: 'buy',
        amount: 0.01,
        price: 50000
    };
    
    const isValid = RiskManager.validateTrade(validTrade, 10000);
    if (!isValid) throw new Error('Valid trade was rejected');
    
    return 'Trade validation working correctly';
});

await runTest('Risk Manager stop loss calculation', () => {
    const RiskManager = require('./src/riskManagement/riskManager');
    
    const stopLoss = RiskManager.calculateStopLoss(50000, 'buy');
    const expected = 50000 * (1 - 0.05); // 5% stop loss from config
    
    if (Math.abs(stopLoss - expected) > 1) {
        throw new Error(`Stop loss calculation incorrect: ${stopLoss} vs ${expected}`);
    }
    
    return `Stop loss: $${stopLoss} for $50,000 entry`;
});

// Test 6: Utilities
console.log('\n🛠️  TESTING UTILITIES');
console.log('-'.repeat(40));

await runTest('Performance Metrics module', () => {
    const PerformanceMetrics = require('./src/utils/performanceMetrics');
    return 'Performance metrics module loaded successfully';
});

await runTest('Notifications module', () => {
    const notifications = require('./src/utils/notifications');
    return 'Notifications module loaded successfully';
});

await runTest('Indicator Utils module', () => {
    const indicatorUtils = require('./src/indicators/indicatorUtils');
    return 'Indicator utilities module loaded successfully';
});

// Test 7: Application Integration
console.log('\n🚀 TESTING APPLICATION INTEGRATION');
console.log('-'.repeat(40));

await runTest('Main application module', () => {
    const CryptoBotApp = require('./app');
    const app = new CryptoBotApp();
    return `App initialized in ${app.mode} mode`;
});

await runTest('File structure integrity', () => {
    const requiredDirs = ['src', 'config', 'tests', 'logs'];
    const requiredFiles = ['package.json', '.env', 'app.js'];
    
    for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) throw new Error(`Missing directory: ${dir}`);
    }
    
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
    }
    
    return 'All required files and directories present';
});

// Test 8: Quick Bot Startup Test (without full initialization)
console.log('\n⚡ TESTING BOT STARTUP READINESS');
console.log('-'.repeat(40));

await runTest('Bot startup readiness check', async () => {
    // Check if we can at least import the main app without errors
    const CryptoBotApp = require('./app');
    const bot = new CryptoBotApp();
    
    // Verify mode is set correctly
    if (!bot.mode) throw new Error('Bot mode not set');
    
    return `Bot ready to start in ${bot.mode} mode`;
});

// Final Results
console.log('\n' + '='.repeat(60));
console.log('🏁 TEST RESULTS SUMMARY');
console.log('='.repeat(60));

const totalTests = testsPassed + testsFailed;
const successRate = totalTests > 0 ? ((testsPassed / totalTests) * 100).toFixed(1) : 0;

console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Success Rate: ${successRate}%`);

if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The bot is ready for operation.');
    console.log('\n💡 Next steps:');
    console.log('   • Run "npm run dev" to start in paper trading mode');
    console.log('   • Monitor the logs in the logs/ directory');
    console.log('   • Check paper trading results before going live');
    console.log('   • Only use "npm start" for live trading when you\'re confident');
} else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    console.log('   The bot may not function correctly until issues are resolved.');
}

console.log('\n' + '='.repeat(60));
