const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const { MockTradingService, generateTrendingOHLCV } = require('../mocks/testMocks');

// Mock the dependencies
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../src/connectors/kraken', () => ({
    fetchOHLCV: jest.fn().mockResolvedValue(generateTrendingOHLCV(50, 50000, 'up'))
}));

const StrategyInterface = require('../../src/strategies/strategyInterface');

// Create a test strategy that extends StrategyInterface
class TestStrategy extends StrategyInterface {
    constructor(symbol, config, tradingService) {
        super(symbol, config, tradingService);
        this.name = 'TestStrategy';
        this.signalHistory = [];
    }

    async initialize() {
        this.isInitialized = true;
        this.log('info', 'Test strategy initialized');
    }

    async run(candle) {
        if (!this.validateCandle(candle)) {
            this.log('error', 'Invalid candle data');
            return;
        }

        // Simple test logic: buy if price > 50000, sell if price < 48000
        if (candle.close > 50000 && !this.isInCooldown()) {
            this.signalHistory.push({ type: 'buy', price: candle.close, timestamp: Date.now() });
            await this.buy();
        } else if (candle.close < 48000 && !this.isInCooldown()) {
            this.signalHistory.push({ type: 'sell', price: candle.close, timestamp: Date.now() });
            await this.sell();
        }
    }

    getSignalHistory() {
        return this.signalHistory;
    }
}

describe('Strategy Interface Tests', () => {
    let strategy;
    let mockTradingService;
    let mockConfig;

    beforeEach(() => {
        mockTradingService = new MockTradingService();
        mockConfig = {
            params: {
                rsiPeriod: 14,
                rsiOverbought: 70,
                rsiOversold: 30
            },
            riskManagement: {
                positionSize: 0.1,
                stopLoss: 0.05,
                takeProfit: 0.15
            },
            cooldownPeriod: 3600000 // 1 hour
        };

        strategy = new TestStrategy('BTC/USD', mockConfig, mockTradingService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('strategy initialization', () => {
        test('should initialize strategy correctly', async () => {
            expect(strategy.symbol).toBe('BTC/USD');
            expect(strategy.config).toBe(mockConfig);
            expect(strategy.tradingService).toBe(mockTradingService);
            expect(strategy.name).toBe('TestStrategy');
            expect(strategy.isInitialized).toBe(false);

            await strategy.initialize();
            expect(strategy.isInitialized).toBe(true);
        });

        test('should have correct default properties', () => {
            expect(strategy.lastSignalTime).toBe(0);
            expect(strategy.cooldownPeriod).toBe(3600000);
        });
    });

    describe('candle validation', () => {
        test('should validate correct candle data', () => {
            const validCandle = {
                open: 50000,
                high: 51000,
                low: 49500,
                close: 50500,
                volume: 100
            };

            expect(strategy.validateCandle(validCandle)).toBe(true);
        });

        test('should reject invalid candle data', () => {
            const invalidCandles = [
                null,
                undefined,
                {},
                { open: 50000 }, // Missing fields
                { open: 50000, high: 49000, low: 50500, close: 50500, volume: 100 }, // High < Open
                { open: 50000, high: 51000, low: 50500, close: 50500, volume: 100 }, // Low > Open
                { open: '50000', high: 51000, low: 49500, close: 50500, volume: 100 } // String type
            ];

            invalidCandles.forEach(candle => {
                expect(strategy.validateCandle(candle)).toBe(false);
            });
        });
    });

    describe('cooldown management', () => {
        test('should respect cooldown period', () => {
            expect(strategy.isInCooldown()).toBe(false);

            strategy.setLastSignalTime();
            expect(strategy.isInCooldown()).toBe(true);

            // Simulate time passing
            strategy.lastSignalTime = Date.now() - 3700000; // More than 1 hour ago
            expect(strategy.isInCooldown()).toBe(false);
        });

        test('should update last signal time', () => {
            const beforeTime = Date.now();
            strategy.setLastSignalTime();
            const afterTime = Date.now();

            expect(strategy.lastSignalTime).toBeGreaterThanOrEqual(beforeTime);
            expect(strategy.lastSignalTime).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('trade execution', () => {
        beforeEach(async () => {
            await mockTradingService.initializeTradingService('paper', '', '');
        });

        test('should execute buy order', async () => {
            const order = await strategy.buy(0.1, 'market');

            expect(order).toBeDefined();
            expect(order.side).toBe('buy');
            expect(order.amount).toBe(0.1);
            expect(order.type).toBe('market');
            expect(strategy.isInCooldown()).toBe(true);
        });

        test('should execute sell order', async () => {
            const order = await strategy.sell(0.05, 'limit', 55000);

            expect(order).toBeDefined();
            expect(order.side).toBe('sell');
            expect(order.amount).toBe(0.05);
            expect(order.type).toBe('limit');
            expect(order.price).toBe(55000);
            expect(strategy.isInCooldown()).toBe(true);
        });

        test('should include strategy metadata in trades', async () => {
            await strategy.buy();

            const trades = mockTradingService.getTrades();
            expect(trades).toHaveLength(1);
            expect(trades[0].metadata.strategy).toBe('TestStrategy');
            expect(trades[0].metadata.action).toBe('entry');
        });
    });

    describe('configuration access', () => {
        test('should return strategy parameters', () => {
            const params = strategy.getParams();
            
            expect(params).toEqual(mockConfig.params);
            expect(params.rsiPeriod).toBe(14);
            expect(params.rsiOverbought).toBe(70);
        });

        test('should return risk configuration', () => {
            const riskConfig = strategy.getRiskConfig();
            
            expect(riskConfig).toEqual(mockConfig.riskManagement);
            expect(riskConfig.positionSize).toBe(0.1);
            expect(riskConfig.stopLoss).toBe(0.05);
        });

        test('should handle missing configuration gracefully', () => {
            const strategyWithoutConfig = new TestStrategy('BTC/USD', {}, mockTradingService);
            
            expect(strategyWithoutConfig.getParams()).toEqual({});
            expect(strategyWithoutConfig.getRiskConfig()).toEqual({});
        });
    });

    describe('strategy execution', () => {
        beforeEach(async () => {
            await mockTradingService.initializeTradingService('paper', '', '');
            await strategy.initialize();
        });

        test('should execute buy signal on high price', async () => {
            const highPriceCandle = {
                open: 50200,
                high: 50500,
                low: 50100,
                close: 50300,
                volume: 120
            };

            await strategy.run(highPriceCandle);

            const signalHistory = strategy.getSignalHistory();
            expect(signalHistory).toHaveLength(1);
            expect(signalHistory[0].type).toBe('buy');
            expect(signalHistory[0].price).toBe(50300);

            const trades = mockTradingService.getTrades();
            expect(trades).toHaveLength(1);
            expect(trades[0].side).toBe('buy');
        });

        test('should execute sell signal on low price', async () => {
            const lowPriceCandle = {
                open: 47800,
                high: 47900,
                low: 47700,
                close: 47800,
                volume: 80
            };

            await strategy.run(lowPriceCandle);

            const signalHistory = strategy.getSignalHistory();
            expect(signalHistory).toHaveLength(1);
            expect(signalHistory[0].type).toBe('sell');
            expect(signalHistory[0].price).toBe(47800);

            const trades = mockTradingService.getTrades();
            expect(trades).toHaveLength(1);
            expect(trades[0].side).toBe('sell');
        });

        test('should not trade during cooldown period', async () => {
            const candle = {
                open: 50200,
                high: 50500,
                low: 50100,
                close: 50300,
                volume: 120
            };

            // First trade
            await strategy.run(candle);
            expect(strategy.getSignalHistory()).toHaveLength(1);

            // Second trade attempt during cooldown
            await strategy.run(candle);
            expect(strategy.getSignalHistory()).toHaveLength(1); // Should still be 1
        });

        test('should reject invalid candle data', async () => {
            const invalidCandle = {
                open: 50000,
                high: 49000, // Invalid: high < open
                low: 50500,
                close: 50500,
                volume: 100
            };

            await strategy.run(invalidCandle);

            expect(strategy.getSignalHistory()).toHaveLength(0);
            expect(mockTradingService.getTrades()).toHaveLength(0);
        });

        test('should handle multiple valid signals over time', async () => {
            // Simulate cooldown expiring
            strategy.lastSignalTime = Date.now() - 3700000;

            const candles = [
                { open: 50100, high: 50200, low: 50000, close: 50150, volume: 100 }, // Buy
                { open: 47900, high: 48000, low: 47800, close: 47850, volume: 90 },  // Sell (after cooldown)
                { open: 50200, high: 50300, low: 50100, close: 50250, volume: 110 }  // Buy (after cooldown)
            ];

            for (let i = 0; i < candles.length; i++) {
                // Simulate cooldown expiring between trades
                if (i > 0) {
                    strategy.lastSignalTime = Date.now() - 3700000;
                }
                await strategy.run(candles[i]);
            }

            const signalHistory = strategy.getSignalHistory();
            expect(signalHistory.length).toBeGreaterThan(1);
        });
    });

    describe('cleanup', () => {
        test('should cleanup strategy', async () => {
            await strategy.cleanup();
            // Cleanup should complete without errors
            expect(true).toBe(true);
        });
    });
});
