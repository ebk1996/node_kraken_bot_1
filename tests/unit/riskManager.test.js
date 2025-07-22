const { describe, test, expect, beforeEach, jest } = require('@jest/globals');
const RiskManager = require('../../src/riskManagement/riskManager');

describe('RiskManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateLotSize', () => {
        test('should calculate correct lot size based on risk percentage', async () => {
            const symbol = 'BTC/USD';
            const currentPrice = 50000;
            const accountBalance = 10000;
            const riskPercentage = 0.02; // 2%

            const lotSize = await RiskManager.calculateLotSize(symbol, currentPrice, accountBalance, riskPercentage);
            
            // Expected: (10000 * 0.02) / 50000 = 0.004
            expect(lotSize).toBeCloseTo(0.004, 6);
        });

        test('should return 0 for insufficient balance', async () => {
            const symbol = 'BTC/USD';
            const currentPrice = 50000;
            const accountBalance = 50; // Below minimum
            
            const lotSize = await RiskManager.calculateLotSize(symbol, currentPrice, accountBalance);
            
            expect(lotSize).toBe(0);
        });

        test('should handle zero price gracefully', async () => {
            const symbol = 'BTC/USD';
            const currentPrice = 0;
            const accountBalance = 10000;
            
            // Should not throw and should handle edge case
            const lotSize = await RiskManager.calculateLotSize(symbol, currentPrice, accountBalance);
            expect(typeof lotSize).toBe('number');
        });
    });

    describe('validateTrade', () => {
        test('should validate a normal trade', async () => {
            const symbol = 'BTC/USD';
            const amount = 0.1;
            const price = 50000;
            const accountBalance = 10000;

            const isValid = await RiskManager.validateTrade(symbol, amount, price, accountBalance);
            
            expect(isValid).toBe(true);
        });

        test('should reject trade exceeding risk limit', async () => {
            const symbol = 'BTC/USD';
            const amount = 1; // Large amount
            const price = 50000; // $50,000 trade value
            const accountBalance = 10000; // Only $10,000 balance

            const isValid = await RiskManager.validateTrade(symbol, amount, price, accountBalance);
            
            expect(isValid).toBe(false);
        });

        test('should reject trade with insufficient balance', async () => {
            const symbol = 'BTC/USD';
            const amount = 0.1;
            const price = 50000;
            const accountBalance = 50; // Below minimum

            const isValid = await RiskManager.validateTrade(symbol, amount, price, accountBalance);
            
            expect(isValid).toBe(false);
        });

        test('should reject very small trades', async () => {
            const symbol = 'BTC/USD';
            const amount = 0.0001; // Very small amount
            const price = 50000; // $5 trade value
            const accountBalance = 10000;

            const isValid = await RiskManager.validateTrade(symbol, amount, price, accountBalance);
            
            expect(isValid).toBe(false);
        });
    });

    describe('calculateStopLoss', () => {
        test('should calculate stop loss for buy position', () => {
            const entryPrice = 50000;
            const side = 'buy';
            const stopLossPercentage = 0.05; // 5%

            const stopLoss = RiskManager.calculateStopLoss(entryPrice, side, stopLossPercentage);
            
            // Expected: 50000 * (1 - 0.05) = 47500
            expect(stopLoss).toBe(47500);
        });

        test('should calculate stop loss for sell position', () => {
            const entryPrice = 50000;
            const side = 'sell';
            const stopLossPercentage = 0.05; // 5%

            const stopLoss = RiskManager.calculateStopLoss(entryPrice, side, stopLossPercentage);
            
            // Expected: 50000 * (1 + 0.05) = 52500
            expect(stopLoss).toBe(52500);
        });
    });

    describe('calculateTakeProfit', () => {
        test('should calculate take profit for buy position', () => {
            const entryPrice = 50000;
            const side = 'buy';
            const takeProfitPercentage = 0.15; // 15%

            const takeProfit = RiskManager.calculateTakeProfit(entryPrice, side, takeProfitPercentage);
            
            // Expected: 50000 * (1 + 0.15) = 57500
            expect(takeProfit).toBe(57500);
        });

        test('should calculate take profit for sell position', () => {
            const entryPrice = 50000;
            const side = 'sell';
            const takeProfitPercentage = 0.15; // 15%

            const takeProfit = RiskManager.calculateTakeProfit(entryPrice, side, takeProfitPercentage);
            
            // Expected: 50000 * (1 - 0.15) = 42500
            expect(takeProfit).toBe(42500);
        });
    });

    describe('checkTotalRisk', () => {
        test('should pass with acceptable total risk', () => {
            const openPositions = [
                { amount: 0.1, price: 50000 }, // $5000 exposure
                { amount: 0.05, price: 40000 }  // $2000 exposure
            ];
            const accountBalance = 100000; // Total exposure: 7%, well within limits

            const isAcceptable = RiskManager.checkTotalRisk(openPositions, accountBalance);
            
            expect(isAcceptable).toBe(true);
        });

        test('should fail with excessive total risk', () => {
            const openPositions = [
                { amount: 1, price: 50000 },    // $50000 exposure
                { amount: 1, price: 40000 }     // $40000 exposure
            ];
            const accountBalance = 100000; // Total exposure: 90%, exceeds limits

            const isAcceptable = RiskManager.checkTotalRisk(openPositions, accountBalance);
            
            expect(isAcceptable).toBe(false);
        });
    });

    describe('getMaxConcurrentTrades', () => {
        test('should return full limit for large balance', () => {
            const accountBalance = 50000;
            
            const maxTrades = RiskManager.getMaxConcurrentTrades(accountBalance);
            
            expect(maxTrades).toBe(3); // From config
        });

        test('should limit trades for small balance', () => {
            const accountBalance = 500;
            
            const maxTrades = RiskManager.getMaxConcurrentTrades(accountBalance);
            
            expect(maxTrades).toBe(1);
        });

        test('should limit trades for medium balance', () => {
            const accountBalance = 2000;
            
            const maxTrades = RiskManager.getMaxConcurrentTrades(accountBalance);
            
            expect(maxTrades).toBe(2);
        });
    });

    describe('adjustPositionForVolatility', () => {
        test('should reduce position size for high volatility', () => {
            // Create high volatility price data
            const priceHistory = [50000, 45000, 55000, 40000, 60000]; // Very volatile
            const basePositionSize = 1.0;

            const adjustedSize = RiskManager.adjustPositionForVolatility(priceHistory, basePositionSize);
            
            expect(adjustedSize).toBeLessThan(basePositionSize);
            expect(adjustedSize).toBeGreaterThanOrEqual(0.5); // Minimum adjustment
        });

        test('should maintain position size for low volatility', () => {
            // Create low volatility price data
            const priceHistory = [50000, 50100, 49900, 50050, 49950]; // Low volatility
            const basePositionSize = 1.0;

            const adjustedSize = RiskManager.adjustPositionForVolatility(priceHistory, basePositionSize);
            
            expect(adjustedSize).toBeCloseTo(basePositionSize, 1);
        });

        test('should handle insufficient price history', () => {
            const priceHistory = [50000]; // Only one price point
            const basePositionSize = 1.0;

            const adjustedSize = RiskManager.adjustPositionForVolatility(priceHistory, basePositionSize);
            
            expect(adjustedSize).toBe(basePositionSize);
        });
    });

    describe('validateCooldown', () => {
        test('should pass after cooldown period', () => {
            const lastTradeTime = Date.now() - 3700000; // 1 hour + 100 seconds ago
            const cooldownPeriod = 3600000; // 1 hour

            const isValid = RiskManager.validateCooldown(lastTradeTime, cooldownPeriod);
            
            expect(isValid).toBe(true);
        });

        test('should fail during cooldown period', () => {
            const lastTradeTime = Date.now() - 1800000; // 30 minutes ago
            const cooldownPeriod = 3600000; // 1 hour

            const isValid = RiskManager.validateCooldown(lastTradeTime, cooldownPeriod);
            
            expect(isValid).toBe(false);
        });

        test('should handle zero cooldown', () => {
            const lastTradeTime = Date.now() - 1000; // 1 second ago
            const cooldownPeriod = 0; // No cooldown

            const isValid = RiskManager.validateCooldown(lastTradeTime, cooldownPeriod);
            
            expect(isValid).toBe(true);
        });
    });
});
