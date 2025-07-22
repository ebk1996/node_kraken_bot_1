/**
 * @module TestMocks
 * @description Mock data and utilities for testing the trading bot.
 */

// Mock OHLCV data for testing
const mockOHLCVData = [
    { timestamp: 1640995200000, open: 47000, high: 47500, low: 46500, close: 47200, volume: 100 },
    { timestamp: 1641001200000, open: 47200, high: 48000, low: 47000, close: 47800, volume: 150 },
    { timestamp: 1641007200000, open: 47800, high: 48200, low: 47600, close: 48000, volume: 120 },
    { timestamp: 1641013200000, open: 48000, high: 48500, low: 47800, close: 48300, volume: 180 },
    { timestamp: 1641019200000, open: 48300, high: 49000, low: 48100, close: 48700, volume: 200 }
];

// Mock ticker data
const mockTicker = {
    symbol: 'BTC/USD',
    bid: 48650,
    ask: 48750,
    last: 48700,
    change: 1700,
    percentage: 3.61,
    datetime: new Date().toISOString()
};

// Mock balance data
const mockBalance = {
    'USD': 10000,
    'BTC': 0.5,
    'ETH': 2.0
};

// Mock order response
const mockOrder = {
    id: 'test-order-123',
    symbol: 'BTC/USD',
    side: 'buy',
    type: 'market',
    amount: 0.1,
    price: 48700,
    status: 'closed',
    datetime: new Date().toISOString()
};

// Mock Kraken connector
class MockKrakenConnector {
    constructor() {
        this.initialized = false;
        this.balance = { ...mockBalance };
    }

    initializeKraken(apiKey, secret, isPaperTrading = false) {
        this.initialized = true;
        this.isPaperTrading = isPaperTrading;
    }

    async getBalance(currency) {
        return this.balance[currency] || 0;
    }

    async getTicker(symbol) {
        return { ...mockTicker, symbol };
    }

    async fetchOHLCV(symbol, timeframe = '1h', limit = 100) {
        return mockOHLCVData.slice(-limit);
    }

    async createMarketOrder(symbol, side, amount) {
        return {
            ...mockOrder,
            id: `mock-${side}-${Date.now()}`,
            symbol,
            side,
            amount
        };
    }

    async createLimitOrder(symbol, side, amount, price) {
        return {
            ...mockOrder,
            id: `mock-limit-${side}-${Date.now()}`,
            symbol,
            side,
            amount,
            price,
            type: 'limit'
        };
    }
}

// Mock trading service
class MockTradingService {
    constructor() {
        this.mode = 'paper';
        this.trades = [];
    }

    async initializeTradingService(mode, apiKey, apiSecret) {
        this.mode = mode;
    }

    async executeTrade(symbol, side, amount, type, metadata, price = null) {
        const trade = {
            id: `mock-trade-${Date.now()}`,
            symbol,
            side,
            amount: amount || 0.1,
            type,
            price: price || mockTicker.last,
            status: 'closed',
            datetime: new Date().toISOString(),
            metadata
        };
        
        this.trades.push(trade);
        return trade;
    }

    getTrades() {
        return this.trades;
    }
}

// Mock logger
class MockLogger {
    constructor() {
        this.logs = [];
    }

    info(message, meta = {}) {
        this.logs.push({ level: 'info', message, meta, timestamp: new Date() });
    }

    warn(message, meta = {}) {
        this.logs.push({ level: 'warn', message, meta, timestamp: new Date() });
    }

    error(message, meta = {}) {
        this.logs.push({ level: 'error', message, meta, timestamp: new Date() });
    }

    debug(message, meta = {}) {
        this.logs.push({ level: 'debug', message, meta, timestamp: new Date() });
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }
}

// Test data generators
function generateRandomOHLCV(count = 100, basePrice = 50000) {
    const data = [];
    let currentPrice = basePrice;
    
    for (let i = 0; i < count; i++) {
        const timestamp = Date.now() - ((count - i) * 3600000); // 1 hour intervals
        const change = (Math.random() - 0.5) * 0.02; // ±1% change
        const open = currentPrice;
        const close = open * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.random() * 100 + 50;
        
        data.push({
            timestamp,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: parseFloat(volume.toFixed(2))
        });
        
        currentPrice = close;
    }
    
    return data;
}

function generateTrendingOHLCV(count = 50, basePrice = 50000, trend = 'up') {
    const data = [];
    let currentPrice = basePrice;
    const trendMultiplier = trend === 'up' ? 1.001 : 0.999; // 0.1% trend per candle
    
    for (let i = 0; i < count; i++) {
        const timestamp = Date.now() - ((count - i) * 3600000);
        const randomChange = (Math.random() - 0.5) * 0.01; // ±0.5% random
        const trendChange = (trendMultiplier - 1);
        const totalChange = trendChange + randomChange;
        
        const open = currentPrice;
        const close = open * (1 + totalChange);
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        const volume = Math.random() * 100 + 50;
        
        data.push({
            timestamp,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            volume: parseFloat(volume.toFixed(2))
        });
        
        currentPrice = close;
    }
    
    return data;
}

module.exports = {
    mockOHLCVData,
    mockTicker,
    mockBalance,
    mockOrder,
    MockKrakenConnector,
    MockTradingService,
    MockLogger,
    generateRandomOHLCV,
    generateTrendingOHLCV
};
