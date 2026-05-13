export type BtcAmount = number;
export type FiatAmount = number;
export type Percentage = number;

export interface PortfolioSnapshotInput {
  holdingsBtc: BtcAmount;
  buyInPriceEur: FiatAmount;
  livePriceEur: FiatAmount;
}

export interface PortfolioKpis {
  bestandBtc: BtcAmount;
  buyInEur: FiatAmount;
  investiertEur: FiatAmount;
  aktuellerWertEur: FiatAmount;
  gewinnVerlustEur: FiatAmount;
  renditeProzent: Percentage;
}

const EPSILON = 1e-12;

export const asBtcAmount = (value: number): BtcAmount => {
  if (!Number.isFinite(value)) throw new Error('BTC amount must be finite.');
  return value;
};

export const asFiatAmount = (value: number): FiatAmount => {
  if (!Number.isFinite(value)) throw new Error('Fiat amount must be finite.');
  return value;
};

export const multiplyBtcByPrice = (
  btc: BtcAmount,
  eurPerBtc: FiatAmount,
): FiatAmount => asFiatAmount(btc * eurPerBtc);

export const calcProfitLoss = (
  currentValueEur: FiatAmount,
  investedEur: FiatAmount,
): FiatAmount => asFiatAmount(currentValueEur - investedEur);

export const calcReturnPercentage = (
  profitLossEur: FiatAmount,
  investedEur: FiatAmount,
): Percentage => {
  if (Math.abs(investedEur) < EPSILON) return 0;
  return (profitLossEur / investedEur) * 100;
};

export const computePortfolioKpis = (
  input: PortfolioSnapshotInput,
): PortfolioKpis => {
  const bestandBtc = asBtcAmount(input.holdingsBtc);
  const buyInEur = asFiatAmount(input.buyInPriceEur);
  const livePriceEur = asFiatAmount(input.livePriceEur);

  const investiertEur = multiplyBtcByPrice(bestandBtc, buyInEur);
  const aktuellerWertEur = multiplyBtcByPrice(bestandBtc, livePriceEur);
  const gewinnVerlustEur = calcProfitLoss(aktuellerWertEur, investiertEur);
  const renditeProzent = calcReturnPercentage(gewinnVerlustEur, investiertEur);

  return {
    bestandBtc,
    buyInEur,
    investiertEur,
    aktuellerWertEur,
    gewinnVerlustEur,
    renditeProzent,
  };
};
