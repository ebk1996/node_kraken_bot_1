const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const { MockKrakenConnector, MockTradingService, mockOHLCVData } = require('../mocks/testMocks');

// Mock the dependencies
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../src/connectors/kraken', () => new MockKrakenConnector());

describe('Kraken Connector Integration Tests', () => {
    let krakenConnector;

    beforeEach(() => {
        krakenConnector = new MockKrakenConnector();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize in paper trading mode', () => {
            krakenConnector.initializeKraken('', '', true);
            
            expect(krakenConnector.initialized).toBe(true);
            expect(krakenConnector.isPaperTrading).toBe(true);
        });

        test('should initialize in live trading mode', () => {
            krakenConnector.initializeKraken('test-key', 'test-secret', false);
            
            expect(krakenConnector.initialized).toBe(true);
            expect(krakenConnector.isPaperTrading).toBe(false);
        });
    });

    describe('balance operations', () => {
        test('should fetch USD balance', async () => {
            krakenConnector.initializeKraken('', '', true);
            
            const balance = await krakenConnector.getBalance('USD');
            
            expect(balance).toBe(10000);
        });

        test('should fetch BTC balance', async () => {
            krakenConnector.initializeKraken('', '', true);
            
            const balance = await krakenConnector.getBalance('BTC');
            
            expect(balance).toBe(0.5);
        });

        test('should return 0 for unknown currency', async () => {
            krakenConnector.initializeKraken('', '', true);
            
            const balance = await krakenConnector.getBalance('UNKNOWN');
            
            expect(balance).toBe(0);
        });
    });

    describe('ticker operations', () => {
        test('should fetch ticker data', async () => {
            krakenConnector.initializeKraken('', '', true);
            
            const ticker = await krakenConnector.getTicker('BTC/USD');
            
            expect(ticker).toHaveProperty('symbol', 'BTC/USD');
            expect(ticker).toHaveProperty('bid');
            expect(ticker).toHaveProperty('ask');
            expect(ticker).toHaveProperty('last');
            expect(ticker.bid).toBeGreaterThan(0);
            expect(ticker.ask).toBeGreaterThan(ticker.bid);
        });
    });

    describe('OHLCV operations', () => {
        test('should fetch OHLCV data', async () => {
            krakenConnector.initializeKraken('', '', true);
            
            const ohlcv = await krakenConnector.fetchOHLCV('BTC/USD', '1h', 100);
            
            expect(Array.isArray(ohlcv)).toBe(true);
            expect(ohlcv.length).toBeGreaterThan(0);
            expect(ohlcv[0]).toHaveLength(6); // [timestamp, open, high, low, close, volume]
        });

        test('should limit OHLCV data to requested amount', async () => {
            krakenConnector.initializeKraken('', '', true);
            
            const ohlcv = await krakenConnector.fetchOHLCV('BTC/USD', '1h', 3);
            
            expect(ohlcv.length).toBeLessThanOrEqual(3);
        });
    });

    describe('order operations', () => {
        test('should create market buy order', async () => {
            krakenConnector.initializeKraken('test-key', 'test-secret', false);
            
            const order = await krakenConnector.createMarketOrder('BTC/USD', 'buy', 0.1);
            
            expect(order).toHaveProperty('id');
            expect(order).toHaveProperty('symbol', 'BTC/USD');
            expect(order).toHaveProperty('side', 'buy');
            expect(order).toHaveProperty('amount', 0.1);
            expect(order.id).toContain('mock-buy');
        });

        test('should create market sell order', async () => {
            krakenConnector.initializeKraken('test-key', 'test-secret', false);
            
            const order = await krakenConnector.createMarketOrder('BTC/USD', 'sell', 0.05);
            
            expect(order).toHaveProperty('side', 'sell');
            expect(order).toHaveProperty('amount', 0.05);
            expect(order.id).toContain('mock-sell');
        });

        test('should create limit buy order', async () => {
            krakenConnector.initializeKraken('test-key', 'test-secret', false);
            
            const order = await krakenConnector.createLimitOrder('BTC/USD', 'buy', 0.1, 45000);
            
            expect(order).toHaveProperty('type', 'limit');
            expect(order).toHaveProperty('price', 45000);
            expect(order.id).toContain('mock-limit-buy');
        });

        test('should create limit sell order', async () => {
            krakenConnector.initializeKraken('test-key', 'test-secret', false);
            
            const order = await krakenConnector.createLimitOrder('BTC/USD', 'sell', 0.05, 55000);
            
            expect(order).toHaveProperty('side', 'sell');
            expect(order).toHaveProperty('type', 'limit');
            expect(order).toHaveProperty('price', 55000);
        });
    });
});

describe('Trading Service Integration Tests', () => {
    let tradingService;

    beforeEach(() => {
        tradingService = new MockTradingService();
    });

    describe('initialization', () => {
        test('should initialize in paper mode', async () => {
            await tradingService.initializeTradingService('paper', '', '');
            
            expect(tradingService.mode).toBe('paper');
        });

        test('should initialize in live mode', async () => {
            await tradingService.initializeTradingService('live', 'key', 'secret');
            
            expect(tradingService.mode).toBe('live');
        });

        test('should initialize in backtest mode', async () => {
            await tradingService.initializeTradingService('backtest', '', '');
            
            expect(tradingService.mode).toBe('backtest');
        });
    });

    describe('trade execution', () => {
        test('should execute buy trade', async () => {
            await tradingService.initializeTradingService('paper', '', '');
            
            const trade = await tradingService.executeTrade(
                'BTC/USD', 
                'buy', 
                0.1, 
                'market', 
                { strategy: 'test' }
            );
            
            expect(trade).toHaveProperty('side', 'buy');
            expect(trade).toHaveProperty('symbol', 'BTC/USD');
            expect(trade).toHaveProperty('amount', 0.1);
            expect(trade).toHaveProperty('type', 'market');
            expect(tradingService.trades).toHaveLength(1);
        });

        test('should execute sell trade', async () => {
            await tradingService.initializeTradingService('paper', '', '');
            
            const trade = await tradingService.executeTrade(
                'ETH/USD', 
                'sell', 
                0.5, 
                'limit', 
                { strategy: 'test' }, 
                3000
            );
            
            expect(trade).toHaveProperty('side', 'sell');
            expect(trade).toHaveProperty('symbol', 'ETH/USD');
            expect(trade).toHaveProperty('amount', 0.5);
            expect(trade).toHaveProperty('type', 'limit');
            expect(trade).toHaveProperty('price', 3000);
        });

        test('should track multiple trades', async () => {
            await tradingService.initializeTradingService('paper', '', '');
            
            await tradingService.executeTrade('BTC/USD', 'buy', 0.1, 'market', { strategy: 'test1' });
            await tradingService.executeTrade('ETH/USD', 'sell', 0.2, 'market', { strategy: 'test2' });
            await tradingService.executeTrade('BTC/USD', 'sell', 0.05, 'limit', { strategy: 'test3' }, 55000);
            
            const trades = tradingService.getTrades();
            expect(trades).toHaveLength(3);
            expect(trades[0].side).toBe('buy');
            expect(trades[1].side).toBe('sell');
            expect(trades[2].type).toBe('limit');
        });

        test('should include metadata in trades', async () => {
            await tradingService.initializeTradingService('paper', '', '');
            
            const metadata = {
                strategy: 'RSI_EMA_Confluence',
                action: 'entry',
                rsi: 25,
                emaSignal: 'bullish'
            };
            
            const trade = await tradingService.executeTrade(
                'BTC/USD', 
                'buy', 
                0.1, 
                'market', 
                metadata
            );
            
            expect(trade.metadata).toEqual(metadata);
        });
    });
});
