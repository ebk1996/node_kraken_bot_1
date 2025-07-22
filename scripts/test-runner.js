#!/usr/bin/env node

/**
 * Trading Bot Test Runner
 * Runs comprehensive tests for the cryptocurrency trading bot
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('../node_modules/axios/index.d.cts');

console.log('🚀 Trading Bot Test Suite');
console.log('========================\n');

// Check if test files exist
const testDir = path.join(__dirname, '../tests');
if (!fs.existsSync(testDir)) {
    console.error('❌ Tests directory not found!');
    process.exit(1);
}

// List available tests
console.log('📋 Available Test Suites:');
console.log('- Unit Tests (tests/unit/)');
console.log('- Integration Tests (tests/integration/)');
console.log('- Mock Utilities (tests/mocks/)');
console.log('');

// Get command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

let testCommand = 'npm test';

switch (testType) {
    case 'unit':
        testCommand = 'npx jest tests/unit/ --verbose';
        console.log('🧪 Running Unit Tests...\n');
        break;
    case 'integration':
        testCommand = 'npx jest tests/integration/ --verbose';
        console.log('🔗 Running Integration Tests...\n');
        break;
    case 'coverage':
        testCommand = 'npm run test:coverage';
        console.log('📊 Running Tests with Coverage...\n');
        break;
    case 'watch':
        testCommand = 'npm run test:watch';
        console.log('👀 Running Tests in Watch Mode...\n');
        break;
    case 'all':
    default:
        testCommand = 'npx jest --verbose';
        console.log('🎯 Running All Tests...\n');
        break;
}

// Run the tests
const testProcess = exec(testCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Test execution failed: ${error.message}`);
        return;
    }
    
    if (stderr) {
        console.error(`⚠️ Test warnings: ${stderr}`);
    }
    
    console.log(stdout);
});

testProcess.on('exit', (code) => {
    console.log('');
    if (code === 0) {
        console.log('✅ All tests passed successfully!');
        console.log('');
        console.log('📈 Next Steps:');
        console.log('- Run "npm run test:coverage" to see test coverage');
        console.log('- Run "npm run dev" to start the bot in paper trading mode');
        console.log('- Check logs/ directory for runtime logs');
    } else {
        console.log('❌ Some tests failed. Please check the output above.');
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('- Ensure all dependencies are installed: npm install');
        console.log('- Check that all required files are present');
        console.log('- Review test error messages for specific issues');
    }
    process.exit(code);
});

// Handle interruption
process.on('SIGINT', () => {
    console.log('\n🛑 Test execution interrupted');
    testProcess.kill('SIGINT');
    process.exit(1);
});// tests/setup.test.js
// Import the setup file to ensure all mocks and globals are initialized
require('./setup');
describe('Jest setup.js', () => {
    test('should set environment variables for testing', () => {
        expect(process.env.NODE_ENV).toBe('test');
        expect(process.env.LOG_LEVEL).toBe('error');
        expect(process.env.MODE).toBe('paper');
    });

    test('should mock axios module', async () => {
        const postRes = await axios.post('/test', {});
        const getRes = await axios.get('/test');
        expect(postRes).toEqual({ data: { ok: true } });
        expect(getRes).toEqual({ data: {} });
        expect(axios.post).toHaveBeenCalled();
        expect(axios.get).toHaveBeenCalled();
    });

    test('should mock ccxt.kraken methods', async () => {
        const kraken = new ccxt.kraken();
        const ticker = await kraken.fetchTicker();
        expect(ticker).toHaveProperty('bid', 48000);
        expect(ticker).toHaveProperty('ask', 48100);
        expect(ticker).toHaveProperty('last', 48050);
        expect(ticker).toHaveProperty('symbol', 'BTC/USD');

        const ohlcv = await kraken.fetchOHLCV();
        expect(Array.isArray(ohlcv)).toBe(true);
        expect(ohlcv.length).toBe(2);

        const balance = await kraken.fetchBalance();
        expect(balance).toHaveProperty('USD');
        expect(balance).toHaveProperty('BTC');

        const marketOrder = await kraken.createMarketOrder();
        expect(marketOrder).toHaveProperty('id', 'test-order-123');
        expect(marketOrder).toHaveProperty('type', 'market');

        const limitOrder = await kraken.createLimitOrder();
        expect(limitOrder).toHaveProperty('id', 'test-limit-order-123');
        expect(limitOrder).toHaveProperty('type', 'limit');
    });

    test('should provide global testHelpers.createMockCandle', () => {
        const candle = global.testHelpers.createMockCandle(10000, 50);
        expect(candle).toHaveProperty('timestamp');
        expect(candle.open).toBe(10000);
        expect(candle.high).toBeCloseTo(10000 * 1.01);
        expect(candle.low).toBeCloseTo(10000 * 0.99);
        expect(candle.close).toBe(10000);
        expect(candle.volume).toBe(50);
    });

    test('should provide global testHelpers.createMockOHLCVArray', () => {
        const arr = global.testHelpers.createMockOHLCVArray(10, 20000);
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBe(10);
        arr.forEach(candle => {
            expect(candle).toHaveProperty('timestamp');
            expect(typeof candle.open).toBe('number');
            expect(typeof candle.high).toBe('number');
            expect(typeof candle.low).toBe('number');
            expect(typeof candle.close).toBe('number');
            expect(typeof candle.volume).toBe('number');
        });
    });

    test('should provide global testHelpers.waitForMs', async () => {
        const start = Date.now();
        await global.testHelpers.waitForMs(50);
        expect(Date.now() - start).toBeGreaterThanOrEqual(50);
    });

    test('should provide global testHelpers.expectValidTrade', () => {
        const trade = {
            id: 't1',
            symbol: 'BTC/USD',
            side: 'buy',
            amount: 1,
            type: 'market',
            status: 'closed',
            datetime: new Date().toISOString()
        };
        expect(() => global.testHelpers.expectValidTrade(trade)).not.toThrow();
    });

    test('should clear and restore mocks before and after each test', () => {
        axios.post.mockClear();
        expect(axios.post).not.toHaveBeenCalled();
        axios.post();
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('should have global.console with all standard methods', () => {
        expect(global.console).toHaveProperty('log');
        expect(global.console).toHaveProperty('debug');
        expect(global.console).toHaveProperty('info');
        expect(global.console).toHaveProperty('warn');
        expect(global.console).toHaveProperty('error');
    });

    test('should handle unhandledRejection and uncaughtException without crashing', () => {
        // Mock console.error to capture error logs
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        // Simulate unhandledRejection
        const fakeReason = new Error('Fake rejection');
        const fakePromise = Promise.reject(fakeReason);
        process.emit('unhandledRejection', fakeReason, fakePromise);
        expect(errorSpy).toHaveBeenCalledWith(
            'Unhandled Rejection at:',
            fakePromise,
            'reason:',
            fakeReason
        );

        // Simulate uncaughtException
        const fakeError = new Error('Fake exception');
        process.emit('uncaughtException', fakeError);
        expect(errorSpy).toHaveBeenCalledWith(
            'Uncaught Exception:',
            fakeError
        );

        errorSpy.mockRestore();
    });
});

