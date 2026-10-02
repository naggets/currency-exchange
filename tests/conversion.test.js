const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseNumber, convert, withdrawal } = require('../scripts/conversion');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);
test('four pairs calculate from every currency without intermediate rounding', () => {
    const rates = [0.95, 1.3, 1 / 117, 1.1];
    const expected = convert(10000, 0, rates);
    expected.forEach((amount, index) => convert(amount, index, rates).forEach((value, i) => near(value, expected[i])));
});
test('legacy KGS per USD rate preserves the old conversion', () => {
    const result = convert(10000, 0, [0.95, 1 / 87, 148.5]);
    near(result[2], 9500 / 87);
    near(result[3], 9500 / 87 * 148.5);
});
test('comma decimals, spaced amounts, zero, and invalid input', () => {
    assert.equal(parseNumber('1 000,25'), 1000.25);
    for (const value of ['', '12abc', '1,2,3', '-1', 'Infinity']) assert.ok(Number.isNaN(parseNumber(value)));
    assert.deepEqual(convert(0, 0, [1, 2]), [0, 0, 0]);
    for (const rate of [0, -1, NaN, Infinity]) assert.equal(convert(100, 0, [rate]), null);
    assert.equal(convert(Number.MAX_VALUE, 0, [2]), null);
});
test('ATM surcharge and budget are inverse calculations', () => {
    const result = withdrawal(100, 2, 'withdrawal');
    assert.deepEqual(result, { cash: 100, debit: 102, fee: 2 });
    assert.deepEqual(withdrawal(102, 2, 'budget'), result);
    assert.deepEqual(withdrawal(100, 0, 'budget'), { cash: 100, debit: 100, fee: 0 });
    assert.equal(withdrawal(100, -1, 'withdrawal'), null);
    assert.equal(withdrawal(100, NaN, 'budget'), null);
    const costs = convert(result.debit, 2, [0.95, 1.3, 1 / 117]);
    near(costs[0], 102 / 1.3 / 0.95);
});
