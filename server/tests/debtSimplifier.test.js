const { computeNetBalances, simplifyDebts } = require('../services/debtSimplifier');

describe('computeNetBalances', () => {
  test('single expense split equally between 2 people', () => {
    const expenses = [
      {
        amount: 100,
        paidBy: 'A',
        splits: [
          { user: 'A', amount: 50 },
          { user: 'B', amount: 50 },
        ],
      },
    ];
    const net = computeNetBalances(expenses, [], ['A', 'B']);
    expect(net).toEqual({ A: 50, B: -50 });
  });

  test('settlements reduce debt correctly', () => {
    const expenses = [
      {
        amount: 90,
        paidBy: 'A',
        splits: [
          { user: 'A', amount: 30 },
          { user: 'B', amount: 30 },
          { user: 'C', amount: 30 },
        ],
      },
    ];
    const settlements = [{ from: 'B', to: 'A', amount: 30 }];
    const net = computeNetBalances(expenses, settlements, ['A', 'B', 'C']);
    expect(net).toEqual({ A: 30, B: 0, C: -30 });
  });
});

describe('simplifyDebts', () => {
  test('produces zero transactions when everyone is settled', () => {
    const net = { A: 0, B: 0, C: 0 };
    expect(simplifyDebts(net)).toEqual([]);
  });

  test('simple 2-person debt', () => {
    const net = { A: 50, B: -50 };
    const txns = simplifyDebts(net);
    expect(txns).toEqual([{ from: 'B', to: 'A', amount: 50 }]);
  });

  test('reduces a 3-person cycle to minimum transactions', () => {
    // A paid for everyone, B owes A, C owes A -> should collapse to <= 2 txns, not 3
    const net = { A: 60, B: -20, C: -40 };
    const txns = simplifyDebts(net);
    expect(txns.length).toBeLessThanOrEqual(2);
    const totalPaid = txns.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(60);
  });

  test('handles a more complex 4-person group with fewer than n-1... within bound', () => {
    // net balances sum to 0 by construction
    const net = { A: 100, B: 50, C: -70, D: -80 };
    const txns = simplifyDebts(net);
    expect(txns.length).toBeLessThanOrEqual(3); // n-1 = 3 max
    const sumIn = txns.reduce((s, t) => s + t.amount, 0);
    expect(sumIn).toBe(150);
  });
});
