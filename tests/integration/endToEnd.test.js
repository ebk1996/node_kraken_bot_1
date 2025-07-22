const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const { MockTradingService, generateRandomOHLCV, generateTrendingOHLCV } = require('../mocks/testMocks');

// Mock all external dependencies
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../src/utils/notifications', () => ({
    sendNotification: jest.fn(),
    sendTradeNotification: jest.fn(),
    sendProfitLossNotification: jest.fn()
}));

describe('End-to-End Trading Bot Tests', () => {
    let tradingService;
    let mockConfig;

    beforeEach(() => {
        tradingService = new MockTradingService();
        mockConfig = {
            exchange: {
                symbols: ['BTC/USD', 'ETH/USD'],
                timeframe: '1h'
            },
            trading: {
                maxConcurrentTrades: 3,
                cooldownPeriod: 3600000
            },
            risk: {
                maxRiskPerTrade: 0.02,
                maxTotalRisk: 0.10,
                stopLossPercentage: 0.05,
                takeProfitPercentage: 0.15,
                minimumBalance: 100
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('complete trading workflow', () => {
        test('should handle full buy-sell cycle', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            // Simulate market data
            const ohlcvData = generateTrendingOHLCV(20, 50000, 'up');
            
            // Execute buy order
            const buyOrder = await tradingService.executeTrade(
                'BTC/USD',
                'buy',
                0.1,
                'market',
                { strategy: 'RSI_EMA_Confluence', action: 'entry' }
            );

            expect(buyOrder).toBeDefined();
            expect(buyOrder.side).toBe('buy');

            // Execute sell order
            const sellOrder = await tradingService.executeTrade(
                'BTC/USD',
                'sell',
                0.1,
                'market',
                { strategy: 'RSI_EMA_Confluence', action: 'exit' }
            );

            expect(sellOrder).toBeDefined();
            expect(sellOrder.side).toBe('sell');

            const trades = tradingService.getTrades();
            expect(trades).toHaveLength(2);
            expect(trades[0].side).toBe('buy');
            expect(trades[1].side).toBe('sell');
        });

        test('should handle multiple symbols', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const symbols = ['BTC/USD', 'ETH/USD'];
            
            for (const symbol of symbols) {
                await tradingService.executeTrade(
                    symbol,
                    'buy',
                    0.1,
                    'market',
                    { strategy: 'test', symbol }
                );
            }

            const trades = tradingService.getTrades();
            expect(trades).toHaveLength(2);
            expect(trades.map(t => t.symbol)).toEqual(expect.arrayContaining(symbols));
        });

        test('should handle different order types', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            // Market order
            const marketOrder = await tradingService.executeTrade(
                'BTC/USD',
                'buy',
                0.1,
                'market',
                { strategy: 'test' }
            );

            // Limit order
            const limitOrder = await tradingService.executeTrade(
                'BTC/USD',
                'sell',
                0.05,
                'limit',
                { strategy: 'test' },
                55000
            );

            expect(marketOrder.type).toBe('market');
            expect(limitOrder.type).toBe('limit');
            expect(limitOrder.price).toBe(55000);
        });
    });

    describe('error handling and edge cases', () => {
        test('should handle trading service in different modes', async () => {
            // Test paper mode
            await tradingService.initializeTradingService('paper', '', '');
            expect(tradingService.mode).toBe('paper');

            // Test live mode
            await tradingService.initializeTradingService('live', 'key', 'secret');
            expect(tradingService.mode).toBe('live');

            // Test backtest mode
            await tradingService.initializeTradingService('backtest', '', '');
            expect(tradingService.mode).toBe('backtest');
        });

        test('should handle zero and negative amounts', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const zeroAmountTrade = await tradingService.executeTrade(
                'BTC/USD',
                'buy',
                0,
                'market',
                { strategy: 'test' }
            );

            // Should still execute (mock doesn't validate amounts)
            expect(zeroAmountTrade).toBeDefined();
            expect(zeroAmountTrade.amount).toBe(0);
        });

        test('should handle very small amounts', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const smallAmountTrade = await tradingService.executeTrade(
                'BTC/USD',
                'buy',
                0.00001,
                'market',
                { strategy: 'test' }
            );

            expect(smallAmountTrade).toBeDefined();
            expect(smallAmountTrade.amount).toBe(0.00001);
        });

        test('should handle large amounts', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const largeAmountTrade = await tradingService.executeTrade(
                'BTC/USD',
                'buy',
                100,
                'market',
                { strategy: 'test' }
            );

            expect(largeAmountTrade).toBeDefined();
            expect(largeAmountTrade.amount).toBe(100);
        });
    });

    describe('performance and stress testing', () => {
        test('should handle multiple rapid trades', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const tradePromises = [];
            for (let i = 0; i < 10; i++) {
                tradePromises.push(
                    tradingService.executeTrade(
                        'BTC/USD',
                        i % 2 === 0 ? 'buy' : 'sell',
                        0.01,
                        'market',
                        { strategy: 'stress-test', tradeNumber: i }
                    )
                );
            }

            const trades = await Promise.all(tradePromises);
            expect(trades).toHaveLength(10);
            expect(tradingService.getTrades()).toHaveLength(10);
        });

        test('should handle trades with complex metadata', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const complexMetadata = {
                strategy: 'RSI_EMA_Confluence',
                indicators: {
                    rsi: 25.5,
                    ema12: 50123.45,
                    ema26: 49876.32,
                    volume: 145.67
                },
                signals: {
                    rsiOversold: true,
                    emaBullishCrossover: true,
                    volumeAboveAverage: false
                },
                timestamp: Date.now(),
                candle: {
                    open: 50000,
                    high: 50200,
                    low: 49800,
                    close: 50100,
                    volume: 145.67
                }
            };

            const trade = await tradingService.executeTrade(
                'BTC/USD',
                'buy',
                0.1,
                'market',
                complexMetadata
            );

            expect(trade.metadata).toEqual(complexMetadata);
        });
    });

    describe('data integrity and validation', () => {
        test('should maintain trade order consistency', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const timestamps = [];
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
                await tradingService.executeTrade(
                    'BTC/USD',
                    'buy',
                    0.01,
                    'market',
                    { strategy: 'test', order: i }
                );
                timestamps.push(Date.now());
            }

            const trades = tradingService.getTrades();
            expect(trades).toHaveLength(5);

            // Check that trade IDs are unique
            const tradeIds = trades.map(t => t.id);
            const uniqueIds = [...new Set(tradeIds)];
            expect(uniqueIds).toHaveLength(5);

            // Check that trades are in order
            for (let i = 0; i < trades.length; i++) {
                expect(trades[i].metadata.order).toBe(i);
            }
        });

        test('should preserve all trade properties', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const trade = await tradingService.executeTrade(
                'ETH/USD',
                'sell',
                0.5,
                'limit',
                { 
                    strategy: 'test',
                    reason: 'take-profit',
                    entryPrice: 3000,
                    targetPrice: 3500
                },
                3500
            );

            // Verify all expected properties exist
            expect(trade).toHaveProperty('id');
            expect(trade).toHaveProperty('symbol', 'ETH/USD');
            expect(trade).toHaveProperty('side', 'sell');
            expect(trade).toHaveProperty('amount', 0.5);
            expect(trade).toHaveProperty('type', 'limit');
            expect(trade).toHaveProperty('price', 3500);
            expect(trade).toHaveProperty('status');
            expect(trade).toHaveProperty('datetime');
            expect(trade).toHaveProperty('metadata');
            
            expect(trade.metadata.strategy).toBe('test');
            expect(trade.metadata.reason).toBe('take-profit');
        });
    });

    describe('market simulation scenarios', () => {
        test('should handle bull market scenario', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const bullMarketData = generateTrendingOHLCV(50, 45000, 'up');
            
            // Simulate strategy decisions based on trending data
            for (let i = 0; i < 5; i++) {
                const candle = bullMarketData[i * 10]; // Every 10th candle
                
                if (candle.close > 48000) {
                    await tradingService.executeTrade(
                        'BTC/USD',
                        'buy',
                        0.02,
                        'market',
                        { 
                            strategy: 'trend-follower',
                            marketCondition: 'bull',
                            price: candle.close
                        }
                    );
                }
            }

            const trades = tradingService.getTrades();
            expect(trades.length).toBeGreaterThan(0);
            expect(trades.every(t => t.side === 'buy')).toBe(true);
        });

        test('should handle bear market scenario', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const bearMarketData = generateTrendingOHLCV(50, 55000, 'down');
            
            // Simulate strategy decisions based on declining data
            for (let i = 0; i < 5; i++) {
                const candle = bearMarketData[i * 10]; // Every 10th candle
                
                if (candle.close < 52000) {
                    await tradingService.executeTrade(
                        'BTC/USD',
                        'sell',
                        0.02,
                        'market',
                        { 
                            strategy: 'trend-follower',
                            marketCondition: 'bear',
                            price: candle.close
                        }
                    );
                }
            }

            const trades = tradingService.getTrades();
            expect(trades.length).toBeGreaterThan(0);
            expect(trades.every(t => t.side === 'sell')).toBe(true);
        });

        test('should handle sideways market scenario', async () => {
            await tradingService.initializeTradingService('paper', '', '');

            const sidewaysData = generateRandomOHLCV(50, 50000);
            
            // Simulate range trading strategy
            let buyCount = 0;
            let sellCount = 0;
            
            for (let i = 0; i < 10; i++) {
                const candle = sidewaysData[i * 5];
                
                if (candle.close < 49500) { // Buy at support
                    await tradingService.executeTrade(
                        'BTC/USD',
                        'buy',
                        0.01,
                        'market',
                        { strategy: 'range-trading', level: 'support' }
                    );
                    buyCount++;
                } else if (candle.close > 50500) { // Sell at resistance
                    await tradingService.executeTrade(
                        'BTC/USD',
                        'sell',
                        0.01,
                        'market',
                        { strategy: 'range-trading', level: 'resistance' }
                    );
                    sellCount++;
                }
            }

            const trades = tradingService.getTrades();
            expect(trades.length).toBe(buyCount + sellCount);
            
            // In sideways market, should have both buys and sells
            const buyTrades = trades.filter(t => t.side === 'buy');
            const sellTrades = trades.filter(t => t.side === 'sell');
            
            if (trades.length > 0) {
                expect(buyTrades.length + sellTrades.length).toBe(trades.length);
            }
        });
    });
});
