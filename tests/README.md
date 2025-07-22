# Trading Bot Test Suite

This directory contains comprehensive tests for the cryptocurrency trading bot.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── riskManager.test.js     # Risk management tests
│   ├── indicatorUtils.test.js  # Technical indicator tests
│   └── strategyInterface.test.js # Strategy interface tests
├── integration/             # Integration tests
│   ├── tradingIntegration.test.js # Trading service integration
│   └── endToEnd.test.js          # End-to-end workflow tests
├── mocks/                   # Mock data and utilities
│   └── testMocks.js            # Mock classes and test data
├── setup.js                 # Jest setup and configuration
└── README.md               # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test tests/unit/
```

### Integration Tests Only
```bash
npm test tests/integration/
```

### With Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Using Test Runner Script
```bash
node scripts/test-runner.js [unit|integration|coverage|watch|all]
```

## Test Categories

### Unit Tests

**Risk Manager Tests** (`riskManager.test.js`)
- Lot size calculations
- Trade validation
- Stop loss and take profit calculations
- Portfolio risk management
- Cooldown period validation

**Indicator Utils Tests** (`indicatorUtils.test.js`)
- RSI calculations
- EMA and SMA calculations
- MACD and Bollinger Bands
- Crossover detection
- Volume analysis
- Price change calculations

**Strategy Interface Tests** (`strategyInterface.test.js`)
- Strategy initialization
- Candle validation
- Cooldown management
- Trade execution
- Configuration access

### Integration Tests

**Trading Integration Tests** (`tradingIntegration.test.js`)
- Kraken connector mocking
- Trading service initialization
- Order execution flow
- Multi-mode support (paper/live/backtest)

**End-to-End Tests** (`endToEnd.test.js`)
- Complete trading workflows
- Multiple symbol handling
- Error handling and edge cases
- Performance testing
- Market scenario simulations

## Test Data and Mocks

### Mock Classes
- `MockKrakenConnector`: Simulates Kraken API responses
- `MockTradingService`: Simulates trading service operations
- `MockLogger`: Captures log output for testing

### Test Data Generators
- `generateRandomOHLCV()`: Creates random market data
- `generateTrendingOHLCV()`: Creates trending market data
- Mock ticker, balance, and order data

## Coverage Targets

The test suite aims for:
- **90%+ line coverage** for critical components
- **100% coverage** for risk management functions
- **85%+ coverage** for indicator calculations
- **80%+ coverage** for integration flows

## Test Environment

Tests run in an isolated environment with:
- Mocked external APIs (no real API calls)
- Simulated market data
- In-memory storage
- Controlled time progression

## Writing New Tests

### Unit Test Template
```javascript
const { describe, test, expect, beforeEach } = require('@jest/globals');

describe('ComponentName', () => {
    beforeEach(() => {
        // Setup
    });

    test('should do something', () => {
        // Test implementation
        expect(result).toBe(expected);
    });
});
```

### Integration Test Template
```javascript
const { describe, test, expect, beforeEach } = require('@jest/globals');
const { MockTradingService } = require('../mocks/testMocks');

describe('Integration: ComponentName', () => {
    let service;

    beforeEach(() => {
        service = new MockTradingService();
    });

    test('should integrate correctly', async () => {
        // Test implementation
    });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe what they test
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Don't make real API calls
5. **Test Edge Cases**: Include error conditions and boundary values
6. **Performance**: Keep tests fast and focused

## Continuous Integration

Tests are designed to run in CI/CD environments:
- No external dependencies
- Deterministic results
- Proper cleanup
- Clear error messages

## Debugging Tests

### Running Specific Tests
```bash
npx jest --testNamePattern="should calculate lot size"
```

### Debug Mode
```bash
npx jest --runInBand --detectOpenHandles tests/unit/riskManager.test.js
```

### Verbose Output
```bash
npx jest --verbose --no-cache
```

## Test Data Files

All test data is generated programmatically to ensure consistency and avoid external file dependencies. Mock data includes:

- OHLCV candle data
- Account balances
- Order responses
- Ticker information
- Market trends (bull/bear/sideways)

## Common Issues

1. **Timeout Errors**: Increase Jest timeout in setup.js
2. **Mock Issues**: Ensure mocks are cleared between tests
3. **Async Issues**: Use proper async/await patterns
4. **Memory Leaks**: Clean up resources in afterEach hooks

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure good test coverage
3. Include both positive and negative test cases
4. Update this README if adding new test categories
