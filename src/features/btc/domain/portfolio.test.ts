import { calcReturnPercentage, computePortfolioKpis } from './portfolio';

const approx = (value: number, expected: number, eps = 1e-6) => {
  if (Math.abs(value - expected) > eps) {
    throw new Error(`Expected ${expected} but got ${value}`);
  }
};

(() => {
  const kpis = computePortfolioKpis({
    holdingsBtc: 0.5,
    buyInPriceEur: 20000,
    livePriceEur: 30000,
  });

  approx(kpis.investiertEur, 10000);
  approx(kpis.aktuellerWertEur, 15000);
  approx(kpis.gewinnVerlustEur, 5000);
  approx(kpis.renditeProzent, 50);
})();

(() => {
  const result = calcReturnPercentage(200, 0);
  approx(result, 0);
})();

console.log('portfolio tests passed');
