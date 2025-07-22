// Jest setup file for trading bot tests
const { jest } = require('@jest/globals');

// Set up global test environment
global.console = {
    ...console,
    // Uncomment to suppress console output during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging during tests
process.env.MODE = 'paper';

// Global test timeout (for long-running integration tests)
jest.setTimeout(30000);

// Mock external APIs to avoid real network calls during testing
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: { ok: true } }),
    get: jest.fn().mockResolvedValue({ data: {} })
}));

// Mock ccxt library to avoid real exchange API calls
jest.mock('ccxt', () => ({
    kraken: jest.fn().mockImplementation(() => ({
        fetchTicker: jest.fn().mockResolvedValue({
            bid: 48000,
            ask: 48100,
            last: 48050,
            symbol: 'BTC/USD'
        }),
        fetchOHLCV: jest.fn().mockResolvedValue([
            [Date.now() - 3600000, 48000, 48200, 47900, 48100, 100],
            [Date.now(), 48100, 48300, 48000, 48200, 120]
        ]),
        fetchBalance: jest.fn().mockResolvedValue({
            USD: { free: 10000, used: 0, total: 10000 },
            BTC: { free: 0.5, used: 0, total: 0.5 }
        }),
        createMarketOrder: jest.fn().mockResolvedValue({
            id: 'test-order-123',
            symbol: 'BTC/USD',
            side: 'buy',
            amount: 0.1,
            type: 'market',
            status: 'closed'
        }),
        createLimitOrder: jest.fn().mockResolvedValue({
            id: 'test-limit-order-123',
            symbol: 'BTC/USD',
            side: 'sell',
            amount: 0.1,
            type: 'limit',
            price: 50000,
            status: 'open'
        })
    }))
}));

// Global test helpers
global.testHelpers = {
    createMockCandle: (price = 50000, volume = 100) => ({
        timestamp: Date.now(),
        open: price,
        high: price * 1.01,
        low: price * 0.99,
        close: price,
        volume: volume
    }),
    
    createMockOHLCVArray: (length = 50, basePrice = 50000) => {
        const data = [];
        for (let i = 0; i < length; i++) {
            const price = basePrice + (Math.random() - 0.5) * 1000;
            data.push({
                timestamp: Date.now() - ((length - i) * 3600000),
                open: price,
                high: price * 1.01,
                low: price * 0.99,
                close: price,
                volume: Math.random() * 100 + 50
            });
        }
        return data;
    },

    waitForMs: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    expectValidTrade: (trade) => {
        expect(trade).toHaveProperty('id');
        expect(trade).toHaveProperty('symbol');
        expect(trade).toHaveProperty('side');
        expect(trade).toHaveProperty('amount');
        expect(trade).toHaveProperty('type');
        expect(trade).toHaveProperty('status');
        expect(trade).toHaveProperty('datetime');
        expect(['buy', 'sell']).toContain(trade.side);
        expect(['market', 'limit']).toContain(trade.type);
        expect(trade.amount).toBeGreaterThan(0);
    }
};

// Setup and teardown for each test
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
