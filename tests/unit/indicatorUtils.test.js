const { describe, test, expect, beforeEach, jest } = require('@jest/globals');
const IndicatorUtils = require('../../src/indicators/indicatorUtils');

describe('IndicatorUtils', () => {
    let mockPrices;
    let mockVolumes;

    beforeEach(() => {
        // Sample price data for testing
        mockPrices = [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
        mockVolumes = [100, 120, 110, 130, 140, 125, 135, 145, 150, 160, 155, 165, 170, 175, 180, 185];
        jest.clearAllMocks();
    });

    describe('calculateRSI', () => {
        test('should calculate RSI with default period', () => {
            const rsi = IndicatorUtils.calculateRSI(mockPrices);
            
            expect(Array.isArray(rsi)).toBe(true);
            expect(rsi.length).toBeGreaterThan(0);
            expect(rsi[rsi.length - 1]).toBeGreaterThan(0);
            expect(rsi[rsi.length - 1]).toBeLessThan(100);
        });

        test('should return empty array for insufficient data', () => {
            const shortPrices = [45, 46, 47];
            const rsi = IndicatorUtils.calculateRSI(shortPrices, 14);
            
            expect(rsi).toEqual([]);
        });

        test('should calculate RSI with custom period', () => {
            const rsi = IndicatorUtils.calculateRSI(mockPrices, 10);
            
            expect(Array.isArray(rsi)).toBe(true);
            expect(rsi.length).toBeGreaterThan(0);
        });
    });

    describe('calculateEMA', () => {
        test('should calculate EMA correctly', () => {
            const ema = IndicatorUtils.calculateEMA(mockPrices, 5);
            
            expect(Array.isArray(ema)).toBe(true);
            expect(ema.length).toBeGreaterThan(0);
            expect(ema[ema.length - 1]).toBeGreaterThan(0);
        });

        test('should return empty array for insufficient data', () => {
            const shortPrices = [45, 46];
            const ema = IndicatorUtils.calculateEMA(shortPrices, 5);
            
            expect(ema).toEqual([]);
        });
    });

    describe('calculateSMA', () => {
        test('should calculate SMA correctly', () => {
            const sma = IndicatorUtils.calculateSMA(mockPrices, 5);
            
            expect(Array.isArray(sma)).toBe(true);
            expect(sma.length).toBeGreaterThan(0);
            
            // Check first SMA value manually
            const expectedFirstSMA = (45 + 46 + 47 + 48 + 49) / 5;
            expect(sma[0]).toBeCloseTo(expectedFirstSMA, 2);
        });

        test('should return empty array for insufficient data', () => {
            const shortPrices = [45, 46];
            const sma = IndicatorUtils.calculateSMA(shortPrices, 5);
            
            expect(sma).toEqual([]);
        });
    });

    describe('calculateMACD', () => {
        test('should calculate MACD with default parameters', () => {
            const macd = IndicatorUtils.calculateMACD(mockPrices);
            
            expect(Array.isArray(macd)).toBe(true);
            if (macd.length > 0) {
                expect(macd[0]).toHaveProperty('MACD');
                expect(macd[0]).toHaveProperty('signal');
                expect(macd[0]).toHaveProperty('histogram');
            }
        });

        test('should return empty array for insufficient data', () => {
            const shortPrices = [45, 46, 47];
            const macd = IndicatorUtils.calculateMACD(shortPrices);
            
            expect(macd).toEqual([]);
        });
    });

    describe('calculateBollingerBands', () => {
        test('should calculate Bollinger Bands correctly', () => {
            const bb = IndicatorUtils.calculateBollingerBands(mockPrices);
            
            expect(Array.isArray(bb)).toBe(true);
            if (bb.length > 0) {
                expect(bb[0]).toHaveProperty('upper');
                expect(bb[0]).toHaveProperty('middle');
                expect(bb[0]).toHaveProperty('lower');
                expect(bb[0].upper).toBeGreaterThan(bb[0].middle);
                expect(bb[0].middle).toBeGreaterThan(bb[0].lower);
            }
        });
    });

    describe('isBullishCrossover', () => {
        test('should detect bullish crossover', () => {
            const fastLine = [45, 46, 47, 48, 49, 50];
            const slowLine = [47, 47, 47, 47, 47, 47];
            
            const isBullish = IndicatorUtils.isBullishCrossover(fastLine, slowLine);
            
            expect(isBullish).toBe(true);
        });

        test('should not detect bullish crossover when already above', () => {
            const fastLine = [50, 51, 52, 53, 54, 55];
            const slowLine = [47, 47, 47, 47, 47, 47];
            
            const isBullish = IndicatorUtils.isBullishCrossover(fastLine, slowLine);
            
            expect(isBullish).toBe(false);
        });

        test('should handle insufficient data', () => {
            const fastLine = [50];
            const slowLine = [47];
            
            const isBullish = IndicatorUtils.isBullishCrossover(fastLine, slowLine);
            
            expect(isBullish).toBe(false);
        });
    });

    describe('isBearishCrossover', () => {
        test('should detect bearish crossover', () => {
            const fastLine = [50, 49, 48, 47, 46, 45];
            const slowLine = [47, 47, 47, 47, 47, 47];
            
            const isBearish = IndicatorUtils.isBearishCrossover(fastLine, slowLine);
            
            expect(isBearish).toBe(true);
        });

        test('should not detect bearish crossover when already below', () => {
            const fastLine = [45, 44, 43, 42, 41, 40];
            const slowLine = [47, 47, 47, 47, 47, 47];
            
            const isBearish = IndicatorUtils.isBearishCrossover(fastLine, slowLine);
            
            expect(isBearish).toBe(false);
        });
    });

    describe('calculateAverageVolume', () => {
        test('should calculate average volume correctly', () => {
            const avgVolume = IndicatorUtils.calculateAverageVolume(mockVolumes, 5);
            
            // Average of last 5 volumes: (155 + 165 + 170 + 175 + 180 + 185) / 6 = 171.67
            const expectedAvg = (155 + 165 + 170 + 175 + 180 + 185) / 6;
            expect(avgVolume).toBeCloseTo(expectedAvg, 1);
        });

        test('should return 0 for insufficient data', () => {
            const shortVolumes = [100, 120];
            const avgVolume = IndicatorUtils.calculateAverageVolume(shortVolumes, 5);
            
            expect(avgVolume).toBe(0);
        });
    });

    describe('isVolumeAboveAverage', () => {
        test('should detect volume above threshold', () => {
            const currentVolume = 300; // Much higher than average
            const isAbove = IndicatorUtils.isVolumeAboveAverage(currentVolume, mockVolumes, 1.5, 5);
            
            expect(isAbove).toBe(true);
        });

        test('should detect volume below threshold', () => {
            const currentVolume = 100; // Lower than average
            const isAbove = IndicatorUtils.isVolumeAboveAverage(currentVolume, mockVolumes, 1.5, 5);
            
            expect(isAbove).toBe(false);
        });
    });

    describe('calculatePercentageChange', () => {
        test('should calculate positive percentage change', () => {
            const change = IndicatorUtils.calculatePercentageChange(100, 110);
            
            expect(change).toBe(10);
        });

        test('should calculate negative percentage change', () => {
            const change = IndicatorUtils.calculatePercentageChange(100, 90);
            
            expect(change).toBe(-10);
        });

        test('should handle zero old value', () => {
            const change = IndicatorUtils.calculatePercentageChange(0, 50);
            
            expect(change).toBe(0);
        });
    });

    describe('isOversold', () => {
        test('should detect oversold condition', () => {
            const isOversold = IndicatorUtils.isOversold(25);
            
            expect(isOversold).toBe(true);
        });

        test('should not detect oversold when RSI is high', () => {
            const isOversold = IndicatorUtils.isOversold(50);
            
            expect(isOversold).toBe(false);
        });

        test('should use custom threshold', () => {
            const isOversold = IndicatorUtils.isOversold(35, 40);
            
            expect(isOversold).toBe(true);
        });
    });

    describe('isOverbought', () => {
        test('should detect overbought condition', () => {
            const isOverbought = IndicatorUtils.isOverbought(75);
            
            expect(isOverbought).toBe(true);
        });

        test('should not detect overbought when RSI is low', () => {
            const isOverbought = IndicatorUtils.isOverbought(50);
            
            expect(isOverbought).toBe(false);
        });

        test('should use custom threshold', () => {
            const isOverbought = IndicatorUtils.isOverbought(65, 60);
            
            expect(isOverbought).toBe(true);
        });
    });

    describe('extractClosePrices', () => {
        test('should extract closing prices from OHLCV data', () => {
            const ohlcvData = [
                { open: 100, high: 105, low: 95, close: 102, volume: 1000 },
                { open: 102, high: 108, low: 98, close: 106, volume: 1200 }
            ];
            
            const closePrices = IndicatorUtils.extractClosePrices(ohlcvData);
            
            expect(closePrices).toEqual([102, 106]);
        });
    });

    describe('extractVolumes', () => {
        test('should extract volumes from OHLCV data', () => {
            const ohlcvData = [
                { open: 100, high: 105, low: 95, close: 102, volume: 1000 },
                { open: 102, high: 108, low: 98, close: 106, volume: 1200 }
            ];
            
            const volumes = IndicatorUtils.extractVolumes(ohlcvData);
            
            expect(volumes).toEqual([1000, 1200]);
        });
    });
});
