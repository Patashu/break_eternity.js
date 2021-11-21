export type CompareResult = -1 | 0 | 1;

const MAX_SIGNIFICANT_DIGITS = 17; //Maximum number of digits of precision to assume in Number

const EXP_LIMIT = 9e15; //If we're ABOVE this value, increase a layer. (9e15 is close to the largest integer that can fit in a Number.)

const LAYER_DOWN: number = Math.log10(9e15);

const FIRST_NEG_LAYER = 1 / 9e15; //At layer 0, smaller non-zero numbers than this become layer 1 numbers with negative mag. After that the pattern continues as normal.

const NUMBER_EXP_MAX = 308; //The largest exponent that can appear in a Number, though not all mantissas are valid here.

const NUMBER_EXP_MIN = -324; //The smallest exponent that can appear in a Number, though not all mantissas are valid here.

const MAX_ES_IN_A_ROW = 5; //For default toString behaviour, when to swap from eee... to (e^n) syntax.

const IGNORE_COMMAS = true;
const COMMAS_ARE_DECIMAL_POINTS = false;

const powerOf10 = (function () {
  // We need this lookup table because Math.pow(10, exponent)
  // when exponent's absolute value is large is slightly inaccurate.
  // You can fix it with the power of math... or just make a lookup table.
  // Faster AND simpler
  const powersOf10: number[] = [];

  for (let i = NUMBER_EXP_MIN + 1; i <= NUMBER_EXP_MAX; i++) {
    powersOf10.push(Number("1e" + i));
  }

  const indexOf0InPowersOf10 = 323;
  return function (power: number) {
    return powersOf10[power + indexOf0InPowersOf10];
  };
})();

const D = function D(value: DecimalSource): Decimal {
  return Decimal.fromValue_noAlloc(value);
};

const FC = function (sign: number, layer: number, mag: number) {
  return Decimal.fromComponents(sign, layer, mag);
};

const FC_NN = function FC_NN(sign: number, layer: number, mag: number) {
  return Decimal.fromComponents_noNormalize(sign, layer, mag);
};

const ME = function ME(mantissa: number, exponent: number) {
  return Decimal.fromMantissaExponent(mantissa, exponent);
};

const ME_NN = function ME_NN(mantissa: number, exponent: number) {
  return Decimal.fromMantissaExponent_noNormalize(mantissa, exponent);
};

const decimalPlaces = function decimalPlaces(value: number, places: number): number {
  const len = places + 1;
  const numDigits = Math.ceil(Math.log10(Math.abs(value)));
  const rounded = Math.round(value * Math.pow(10, len - numDigits)) * Math.pow(10, numDigits - len);
  return parseFloat(rounded.toFixed(Math.max(len - numDigits, 0)));
};

const f_maglog10 = function (n: number) {
  return Math.sign(n) * Math.log10(Math.abs(n));
};

//from HyperCalc source code
const f_gamma = function (n: number) {
  if (!isFinite(n)) {
    return n;
  }
  if (n < -50) {
    if (n === Math.trunc(n)) {
      return Number.NEGATIVE_INFINITY;
    }
    return 0;
  }

  let scal1 = 1;
  while (n < 10) {
    scal1 = scal1 * n;
    ++n;
  }

  n -= 1;
  let l = 0.9189385332046727; //0.5*Math.log(2*Math.PI)
  l = l + (n + 0.5) * Math.log(n);
  l = l - n;
  const n2 = n * n;
  let np = n;
  l = l + 1 / (12 * np);
  np = np * n2;
  l = l + 1 / (360 * np);
  np = np * n2;
  l = l + 1 / (1260 * np);
  np = np * n2;
  l = l + 1 / (1680 * np);
  np = np * n2;
  l = l + 1 / (1188 * np);
  np = np * n2;
  l = l + 691 / (360360 * np);
  np = np * n2;
  l = l + 7 / (1092 * np);
  np = np * n2;
  l = l + 3617 / (122400 * np);

  return Math.exp(l) / scal1;
};

const _twopi = 6.2831853071795864769252842; // 2*pi
const _EXPN1 = 0.36787944117144232159553; // exp(-1)
const OMEGA = 0.56714329040978387299997; // W(1, 0)
//from https://math.stackexchange.com/a/465183
// The evaluation can become inaccurate very close to the branch point
const f_lambertw = function (z: number, tol = 1e-10): number {
  let w;
  let wn;

  if (!Number.isFinite(z)) {
    return z;
  }
  if (z === 0) {
    return z;
  }
  if (z === 1) {
    return OMEGA;
  }

  if (z < 10) {
    w = 0;
  } else {
    w = Math.log(z) - Math.log(Math.log(z));
  }

  for (let i = 0; i < 100; ++i) {
    wn = (z * Math.exp(-w) + w * w) / (w + 1);
    if (Math.abs(wn - w) < tol * Math.abs(wn)) {
      return wn;
    } else {
      w = wn;
    }
  }

  throw Error(`Iteration failed to converge: ${z.toString()}`);
  //return Number.NaN;
};

//from https://github.com/scipy/scipy/blob/8dba340293fe20e62e173bdf2c10ae208286692f/scipy/special/lambertw.pxd
// The evaluation can become inaccurate very close to the branch point
// at ``-1/e``. In some corner cases, `lambertw` might currently
// fail to converge, or can end up on the wrong branch.
function d_lambertw(z: Decimal, tol = 1e-10): Decimal {
  let w;
  let ew, wew, wewz, wn;

  if (!Number.isFinite(z.mag)) {
    return z;
  }
  if (z === Decimal.dZero) {
    return z;
  }
  if (z === Decimal.dOne) {
    //Split out this case because the asymptotic series blows up
    return D(OMEGA);
  }

  const absz = Decimal.abs(z);
  //Get an initial guess for Halley's method
  w = Decimal.ln(z);

  //Halley's method; see 5.9 in [1]

  for (let i = 0; i < 100; ++i) {
    ew = Decimal.exp(-w);
    wewz = w.sub(z.mul(ew));
    wn = w.sub(wewz.div(w.add(1).sub(w.add(2).mul(wewz).div(Decimal.mul(2, w).add(2)))));
    if (Decimal.abs(wn.sub(w)).lt(Decimal.abs(wn).mul(tol))) {
      return wn;
    } else {
      w = wn;
    }
  }

  throw Error(`Iteration failed to converge: ${z.toString()}`);
  //return Decimal.dNaN;
}

export type DecimalSource = Decimal | number | string;

/**
 * The Decimal's value is simply mantissa * 10^exponent.
 */
export default class Decimal {
  public static readonly dZero = FC_NN(0, 0, 0);
  public static readonly dOne = FC_NN(1, 0, 1);
  public static readonly dNegOne = FC_NN(-1, 0, 1);
  public static readonly dTwo = FC_NN(1, 0, 2);
  public static readonly dTen = FC_NN(1, 0, 10);
  public static readonly dNaN = FC_NN(Number.NaN, Number.NaN, Number.NaN);
  public static readonly dInf = FC_NN(1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  public static readonly dNegInf = FC_NN(-1, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  public static readonly dNumberMax = FC(1, 0, Number.MAX_VALUE);
  public static readonly dNumberMin = FC(1, 0, Number.MIN_VALUE);

  public sign: number = Number.NaN;
  public mag: number = Number.NaN;
  public layer: number = Number.NaN;

  constructor(value?: DecimalSource) {
    this.sign = Number.NaN;
    this.layer = Number.NaN;
    this.mag = Number.NaN;

    if (value instanceof Decimal) {
      this.fromDecimal(value);
    } else if (typeof value === "number") {
      this.fromNumber(value);
    } else if (typeof value === "string") {
      this.fromString(value);
    } else {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
    }
  }

  get m(): number {
    if (this.sign === 0) {
      return 0;
    } else if (this.layer === 0) {
      const exp = Math.floor(Math.log10(this.mag));
      //handle special case 5e-324
      let man;
      if (this.mag === 5e-324) {
        man = 5;
      } else {
        man = this.mag / powerOf10(exp);
      }
      return this.sign * man;
    } else if (this.layer === 1) {
      const residue = this.mag - Math.floor(this.mag);
      return this.sign * Math.pow(10, residue);
    } else {
      //mantissa stops being relevant past 1e9e15 / ee15.954
      return this.sign;
    }
  }

  set m(value: number) {
    if (this.layer <= 2) {
      this.fromMantissaExponent(value, this.e);
    } else {
      //don't even pretend mantissa is meaningful
      this.sign = Math.sign(value);
      if (this.sign === 0) {
        this.layer === 0;
        this.exponent === 0;
      }
    }
  }

  get e(): number {
    if (this.sign === 0) {
      return 0;
    } else if (this.layer === 0) {
      return Math.floor(Math.log10(this.mag));
    } else if (this.layer === 1) {
      return Math.floor(this.mag);
    } else if (this.layer === 2) {
      return Math.floor(Math.sign(this.mag) * Math.pow(10, Math.abs(this.mag)));
    } else {
      return this.mag * Number.POSITIVE_INFINITY;
    }
  }
  set e(value: number) {
    this.fromMantissaExponent(this.m, value);
  }

  get s(): number {
    return this.sign;
  }
  set s(value: number) {
    if (value === 0) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
    } else {
      this.sign = value;
    }
  }

  // Object.defineProperty(Decimal.prototype, "mantissa", {
  get mantissa(): number {
    return this.m;
  }

  set mantissa(value: number) {
    this.m = value;
  }

  get exponent(): number {
    return this.e;
  }
  set exponent(value: number) {
    this.e = value;
  }

  public static fromComponents(sign: number, layer: number, mag: number): Decimal {
    return new Decimal().fromComponents(sign, layer, mag);
  }

  public static fromComponents_noNormalize(sign: number, layer: number, mag: number): Decimal {
    return new Decimal().fromComponents_noNormalize(sign, layer, mag);
  }

  public static fromMantissaExponent(mantissa: number, exponent: number): Decimal {
    return new Decimal().fromMantissaExponent(mantissa, exponent);
  }

  public static fromMantissaExponent_noNormalize(mantissa: number, exponent: number): Decimal {
    return new Decimal().fromMantissaExponent_noNormalize(mantissa, exponent);
  }

  public static fromDecimal(value: Decimal): Decimal {
    return new Decimal().fromDecimal(value);
  }

  public static fromNumber(value: number): Decimal {
    return new Decimal().fromNumber(value);
  }

  public static fromString(value: string): Decimal {
    return new Decimal().fromString(value);
  }

  public static fromValue(value: DecimalSource): Decimal {
    return new Decimal().fromValue(value);
  }

  public static fromValue_noAlloc(value: DecimalSource): Decimal {
    return value instanceof Decimal ? value : new Decimal(value);
  }

  public static abs(value: DecimalSource): Decimal {
    return D(value).abs();
  }

  public static neg(value: DecimalSource): Decimal {
    return D(value).neg();
  }

  public static negate(value: DecimalSource): Decimal {
    return D(value).neg();
  }

  public static negated(value: DecimalSource): Decimal {
    return D(value).neg();
  }

  public static sign(value: DecimalSource): number {
    return D(value).sign;
  }

  public static sgn(value: DecimalSource): number {
    return D(value).sign;
  }

  public static round(value: DecimalSource): Decimal {
    return D(value).round();
  }

  public static floor(value: DecimalSource): Decimal {
    return D(value).floor();
  }

  public static ceil(value: DecimalSource): Decimal {
    return D(value).ceil();
  }

  public static trunc(value: DecimalSource): Decimal {
    return D(value).trunc();
  }

  public static add(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).add(other);
  }

  public static plus(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).add(other);
  }

  public static sub(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).sub(other);
  }

  public static subtract(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).sub(other);
  }

  public static minus(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).sub(other);
  }

  public static mul(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).mul(other);
  }

  public static multiply(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).mul(other);
  }

  public static times(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).mul(other);
  }

  public static div(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).div(other);
  }

  public static divide(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).div(other);
  }

  public static recip(value: DecimalSource): Decimal {
    return D(value).recip();
  }

  public static reciprocal(value: DecimalSource): Decimal {
    return D(value).recip();
  }

  public static reciprocate(value: DecimalSource): Decimal {
    return D(value).reciprocate();
  }

  public static cmp(value: DecimalSource, other: DecimalSource): CompareResult {
    return D(value).cmp(other);
  }

  public static cmpabs(value: DecimalSource, other: DecimalSource): CompareResult {
    return D(value).cmpabs(other);
  }

  public static compare(value: DecimalSource, other: DecimalSource): CompareResult {
    return D(value).cmp(other);
  }

  public static eq(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).eq(other);
  }

  public static equals(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).eq(other);
  }

  public static neq(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).neq(other);
  }

  public static notEquals(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).notEquals(other);
  }

  public static lt(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).lt(other);
  }

  public static lte(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).lte(other);
  }

  public static gt(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).gt(other);
  }

  public static gte(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).gte(other);
  }

  public static max(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).max(other);
  }

  public static min(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).min(other);
  }

  public static minabs(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).minabs(other);
  }

  public static maxabs(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).maxabs(other);
  }

  public static clamp(value: DecimalSource, min: DecimalSource, max: DecimalSource): Decimal {
    return D(value).clamp(min, max);
  }

  public static clampMin(value: DecimalSource, min: DecimalSource): Decimal {
    return D(value).clampMin(min);
  }

  public static clampMax(value: DecimalSource, max: DecimalSource): Decimal {
    return D(value).clampMax(max);
  }

  public static cmp_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): CompareResult {
    return D(value).cmp_tolerance(other, tolerance);
  }

  public static compare_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): CompareResult {
    return D(value).cmp_tolerance(other, tolerance);
  }

  public static eq_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).eq_tolerance(other, tolerance);
  }

  public static equals_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).eq_tolerance(other, tolerance);
  }

  public static neq_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).neq_tolerance(other, tolerance);
  }

  public static notEquals_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).notEquals_tolerance(other, tolerance);
  }

  public static lt_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).lt_tolerance(other, tolerance);
  }

  public static lte_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).lte_tolerance(other, tolerance);
  }

  public static gt_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).gt_tolerance(other, tolerance);
  }

  public static gte_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).gte_tolerance(other, tolerance);
  }

  public static pLog10(value: DecimalSource): Decimal {
    return D(value).pLog10();
  }

  public static absLog10(value: DecimalSource): Decimal {
    return D(value).absLog10();
  }

  public static log10(value: DecimalSource): Decimal {
    return D(value).log10();
  }

  public static log(value: DecimalSource, base: DecimalSource): Decimal {
    return D(value).log(base);
  }

  public static log2(value: DecimalSource): Decimal {
    return D(value).log2();
  }

  public static ln(value: DecimalSource): Decimal {
    return D(value).ln();
  }

  public static logarithm(value: DecimalSource, base: DecimalSource): Decimal {
    return D(value).logarithm(base);
  }

  public static pow(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).pow(other);
  }

  public static pow10(value: DecimalSource): Decimal {
    return D(value).pow10();
  }

  public static root(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).root(other);
  }

  public static factorial(value: DecimalSource, _other?: never): Decimal {
    return D(value).factorial();
  }

  public static gamma(value: DecimalSource, _other?: never): Decimal {
    return D(value).gamma();
  }

  public static lngamma(value: DecimalSource, _other?: never): Decimal {
    return D(value).lngamma();
  }

  public static exp(value: DecimalSource): Decimal {
    return D(value).exp();
  }

  public static sqr(value: DecimalSource): Decimal {
    return D(value).sqr();
  }

  public static sqrt(value: DecimalSource): Decimal {
    return D(value).sqrt();
  }

  public static cube(value: DecimalSource): Decimal {
    return D(value).cube();
  }

  public static cbrt(value: DecimalSource): Decimal {
    return D(value).cbrt();
  }

  public static tetrate(
    value: DecimalSource,
    height = 2,
    payload: DecimalSource = FC_NN(1, 0, 1)
  ): Decimal {
    return D(value).tetrate(height, payload);
  }

  public static iteratedexp(value: DecimalSource, height = 2, payload = FC_NN(1, 0, 1)): Decimal {
    return D(value).iteratedexp(height, payload);
  }

  public static iteratedlog(value: DecimalSource, base: DecimalSource = 10, times = 1): Decimal {
    return D(value).iteratedlog(base, times);
  }

  public static layeradd10(value: DecimalSource, diff: DecimalSource): Decimal {
    return D(value).layeradd10(diff);
  }

  public static layeradd(value: DecimalSource, diff: number, base = 10): Decimal {
    return D(value).layeradd(diff, base);
  }

  public static slog(value: DecimalSource, base = 10): Decimal {
    return D(value).slog(base);
  }

  public static lambertw(value: DecimalSource): Decimal {
    return D(value).lambertw();
  }

  public static ssqrt(value: DecimalSource): Decimal {
    return D(value).ssqrt();
  }

  public static pentate(
    value: DecimalSource,
    height = 2,
    payload: DecimalSource = FC_NN(1, 0, 1)
  ): Decimal {
    return D(value).pentate(height, payload);
  }

  /**
   * If you're willing to spend 'resourcesAvailable' and want to buy something
   * with exponentially increasing cost each purchase (start at priceStart,
   * multiply by priceRatio, already own currentOwned), how much of it can you buy?
   * Adapted from Trimps source code.
   */

  public static affordGeometricSeries(
    resourcesAvailable: DecimalSource,
    priceStart: DecimalSource,
    priceRatio: DecimalSource,
    currentOwned: DecimalSource
  ): Decimal {
    return this.affordGeometricSeries_core(
      D(resourcesAvailable),
      D(priceStart),
      D(priceRatio),
      currentOwned
    );
  }
  /**
   * How much resource would it cost to buy (numItems) items if you already have currentOwned,
   * the initial price is priceStart and it multiplies by priceRatio each purchase?
   */

  public static sumGeometricSeries(
    numItems: DecimalSource,
    priceStart: DecimalSource,
    priceRatio: DecimalSource,
    currentOwned: DecimalSource
  ): Decimal {
    return this.sumGeometricSeries_core(numItems, D(priceStart), D(priceRatio), currentOwned);
  }
  /**
   * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
   * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
   * how much of it can you buy?
   */

  public static affordArithmeticSeries(
    resourcesAvailable: DecimalSource,
    priceStart: DecimalSource,
    priceAdd: DecimalSource,
    currentOwned: DecimalSource
  ): Decimal {
    return this.affordArithmeticSeries_core(
      D(resourcesAvailable),
      D(priceStart),
      D(priceAdd),
      D(currentOwned)
    );
  }
  /**
   * How much resource would it cost to buy (numItems) items if you already have currentOwned,
   * the initial price is priceStart and it adds priceAdd each purchase?
   * Adapted from http://www.mathwords.com/a/arithmetic_series.htm
   */

  public static sumArithmeticSeries(
    numItems: DecimalSource,
    priceStart: DecimalSource,
    priceAdd: DecimalSource,
    currentOwned: DecimalSource
  ): Decimal {
    return this.sumArithmeticSeries_core(D(numItems), D(priceStart), D(priceAdd), D(currentOwned));
  }
  /**
   * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
   * the lowest efficiency score is the better one to purchase.
   * From Frozen Cookies:
   * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
   */

  public static efficiencyOfPurchase(
    cost: DecimalSource,
    currentRpS: DecimalSource,
    deltaRpS: DecimalSource
  ): Decimal {
    return this.efficiencyOfPurchase_core(D(cost), D(currentRpS), D(deltaRpS));
  }

  public static randomDecimalForTesting(maxLayers: number): Decimal {
    // NOTE: This doesn't follow any kind of sane random distribution, so use this for testing purposes only.
    //5% of the time, return 0
    if (Math.random() * 20 < 1) {
      return FC_NN(0, 0, 0);
    }

    const randomsign = Math.random() > 0.5 ? 1 : -1;

    //5% of the time, return 1 or -1
    if (Math.random() * 20 < 1) {
      return FC_NN(randomsign, 0, 1);
    }

    //pick a random layer
    const layer = Math.floor(Math.random() * (maxLayers + 1));

    let randomexp = layer === 0 ? Math.random() * 616 - 308 : Math.random() * 16;
    //10% of the time, make it a simple power of 10
    if (Math.random() > 0.9) {
      randomexp = Math.trunc(randomexp);
    }
    let randommag = Math.pow(10, randomexp);
    //10% of the time, trunc mag
    if (Math.random() > 0.9) {
      randommag = Math.trunc(randommag);
    }
    return FC(randomsign, layer, randommag);
  }

  public static affordGeometricSeries_core(
    resourcesAvailable: Decimal,
    priceStart: Decimal,
    priceRatio: Decimal,
    currentOwned: DecimalSource
  ): Decimal {
    const actualStart = priceStart.mul(priceRatio.pow(currentOwned));
    return Decimal.floor(
      resourcesAvailable
        .div(actualStart)
        .mul(priceRatio.sub(1))
        .add(1)
        .log10()
        .div(priceRatio.log10())
    );
  }

  public static sumGeometricSeries_core(
    numItems: DecimalSource,
    priceStart: Decimal,
    priceRatio: Decimal,
    currentOwned: DecimalSource
  ): Decimal {
    return priceStart
      .mul(priceRatio.pow(currentOwned))
      .mul(Decimal.sub(1, priceRatio.pow(numItems)))
      .div(Decimal.sub(1, priceRatio));
  }

  public static affordArithmeticSeries_core(
    resourcesAvailable: Decimal,
    priceStart: Decimal,
    priceAdd: Decimal,
    currentOwned: Decimal
  ): Decimal {
    // n = (-(a-d/2) + sqrt((a-d/2)^2+2dS))/d
    // where a is actualStart, d is priceAdd and S is resourcesAvailable
    // then floor it and you're done!
    const actualStart = priceStart.add(currentOwned.mul(priceAdd));
    const b = actualStart.sub(priceAdd.div(2));
    const b2 = b.pow(2);
    return b
      .neg()
      .add(b2.add(priceAdd.mul(resourcesAvailable).mul(2)).sqrt())
      .div(priceAdd)
      .floor();
  }

  public static sumArithmeticSeries_core(
    numItems: Decimal,
    priceStart: Decimal,
    priceAdd: Decimal,
    currentOwned: Decimal
  ): Decimal {
    const actualStart = priceStart.add(currentOwned.mul(priceAdd)); // (n/2)*(2*a+(n-1)*d)

    return numItems.div(2).mul(actualStart.mul(2).plus(numItems.sub(1).mul(priceAdd)));
  }

  public static efficiencyOfPurchase_core(
    cost: Decimal,
    currentRpS: Decimal,
    deltaRpS: Decimal
  ): Decimal {
    return cost.div(currentRpS).add(cost.div(deltaRpS));
  }

  public normalize(): this {
    /*
    PSEUDOCODE:
    Whenever we are partially 0 (sign is 0 or mag and layer is 0), make it fully 0.
    Whenever we are at or hit layer 0, extract sign from negative mag.
    If layer === 0 and mag < FIRST_NEG_LAYER (1/9e15), shift to 'first negative layer' (add layer, log10 mag).
    While abs(mag) > EXP_LIMIT (9e15), layer += 1, mag = maglog10(mag).
    While abs(mag) < LAYER_DOWN (15.954) and layer > 0, layer -= 1, mag = pow(10, mag).

    When we're done, all of the following should be true OR one of the numbers is not IsFinite OR layer is not IsInteger (error state):
    Any 0 is totally zero (0, 0, 0).
    Anything layer 0 has mag 0 OR mag > 1/9e15 and < 9e15.
    Anything layer 1 or higher has abs(mag) >= 15.954 and < 9e15.
    We will assume in calculations that all Decimals are either erroneous or satisfy these criteria. (Otherwise: Garbage in, garbage out.)
    */
    if (this.sign === 0 || (this.mag === 0 && this.layer === 0)) {
      this.sign = 0;
      this.mag = 0;
      this.layer = 0;
      return this;
    }

    if (this.layer === 0 && this.mag < 0) {
      //extract sign from negative mag at layer 0
      this.mag = -this.mag;
      this.sign = -this.sign;
    }

    //Handle shifting from layer 0 to negative layers.
    if (this.layer === 0 && this.mag < FIRST_NEG_LAYER) {
      this.layer += 1;
      this.mag = Math.log10(this.mag);
      return this;
    }

    let absmag = Math.abs(this.mag);
    let signmag = Math.sign(this.mag);

    if (absmag >= EXP_LIMIT) {
      this.layer += 1;
      this.mag = signmag * Math.log10(absmag);
      return this;
    } else {
      while (absmag < LAYER_DOWN && this.layer > 0) {
        this.layer -= 1;
        if (this.layer === 0) {
          this.mag = Math.pow(10, this.mag);
        } else {
          this.mag = signmag * Math.pow(10, absmag);
          absmag = Math.abs(this.mag);
          signmag = Math.sign(this.mag);
        }
      }
      if (this.layer === 0) {
        if (this.mag < 0) {
          //extract sign from negative mag at layer 0
          this.mag = -this.mag;
          this.sign = -this.sign;
        } else if (this.mag === 0) {
          //excessive rounding can give us all zeroes
          this.sign = 0;
        }
      }
    }

    return this;
  }

  public fromComponents(sign: number, layer: number, mag: number): this {
    this.sign = sign;
    this.layer = layer;
    this.mag = mag;

    this.normalize();
    return this;
  }

  public fromComponents_noNormalize(sign: number, layer: number, mag: number): this {
    this.sign = sign;
    this.layer = layer;
    this.mag = mag;
    return this;
  }

  public fromMantissaExponent(mantissa: number, exponent: number): this {
    this.layer = 1;
    this.sign = Math.sign(mantissa);
    mantissa = Math.abs(mantissa);
    this.mag = exponent + Math.log10(mantissa);

    this.normalize();
    return this;
  }

  public fromMantissaExponent_noNormalize(mantissa: number, exponent: number): this {
    //The idea of 'normalizing' a break_infinity.js style Decimal doesn't really apply. So just do the same thing.
    this.fromMantissaExponent(mantissa, exponent);
    return this;
  }

  public fromDecimal(value: Decimal): this {
    this.sign = value.sign;
    this.layer = value.layer;
    this.mag = value.mag;
    return this;
  }

  public fromNumber(value: number): this {
    this.mag = Math.abs(value);
    this.sign = Math.sign(value);
    this.layer = 0;
    this.normalize();
    return this;
  }

  public fromString(value: string): Decimal {
    if (IGNORE_COMMAS) {
      value = value.replace(",", "");
    } else if (COMMAS_ARE_DECIMAL_POINTS) {
      value = value.replace(",", ".");
    }

    //Handle x^^^y format.
    const pentationparts = value.split("^^^");
    if (pentationparts.length === 2) {
      const base = parseFloat(pentationparts[0]);
      const height = parseFloat(pentationparts[1]);
      const heightparts = pentationparts[1].split(";");
      let payload = 1;
      if (heightparts.length === 2) {
        payload = parseFloat(heightparts[1]);
        if (!isFinite(payload)) {
          payload = 1;
        }
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.pentate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //Handle x^^y format.
    const tetrationparts = value.split("^^");
    if (tetrationparts.length === 2) {
      const base = parseFloat(tetrationparts[0]);
      const height = parseFloat(tetrationparts[1]);
      const heightparts = tetrationparts[1].split(";");
      let payload = 1;
      if (heightparts.length === 2) {
        payload = parseFloat(heightparts[1]);
        if (!isFinite(payload)) {
          payload = 1;
        }
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.tetrate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //Handle x^y format.
    const powparts = value.split("^");
    if (powparts.length === 2) {
      const base = parseFloat(powparts[0]);
      const exponent = parseFloat(powparts[1]);
      if (isFinite(base) && isFinite(exponent)) {
        const result = Decimal.pow(base, exponent);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //Handle various cases involving it being a Big Number.
    value = value.trim().toLowerCase();

    //handle X PT Y format.
    let base;
    let height;
    let ptparts = value.split("pt");
    if (ptparts.length === 2) {
      base = 10;
      height = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      let payload = parseFloat(ptparts[1]);
      if (!isFinite(payload)) {
        payload = 1;
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.tetrate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //handle XpY format (it's the same thing just with p).
    ptparts = value.split("p");
    if (ptparts.length === 2) {
      base = 10;
      height = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      let payload = parseFloat(ptparts[1]);
      if (!isFinite(payload)) {
        payload = 1;
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.tetrate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    const parts = value.split("e");
    const ecount = parts.length - 1;

    //Handle numbers that are exactly floats (0 or 1 es).
    if (ecount === 0) {
      const numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt)) {
        return this.fromNumber(numberAttempt);
      }
    } else if (ecount === 1) {
      //Very small numbers ("2e-3000" and so on) may look like valid floats but round to 0.
      const numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt) && numberAttempt !== 0) {
        return this.fromNumber(numberAttempt);
      }
    }

    //Handle new (e^N)X format.
    const newparts = value.split("e^");
    if (newparts.length === 2) {
      this.sign = 1;
      if (newparts[0].charAt(0) == "-") {
        this.sign = -1;
      }
      let layerstring = "";
      for (let i = 0; i < newparts[1].length; ++i) {
        const chrcode = newparts[1].charCodeAt(i);
        if ((chrcode >= 43 && chrcode <= 57) || chrcode === 101) {
          //is "0" to "9" or "+" or "-" or "." or "e" (or "," or "/")
          layerstring += newparts[1].charAt(i);
        } //we found the end of the layer count
        else {
          this.layer = parseFloat(layerstring);
          this.mag = parseFloat(newparts[1].substr(i + 1));
          this.normalize();
          return this;
        }
      }
    }

    if (ecount < 1) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
      return this;
    }
    const mantissa = parseFloat(parts[0]);
    if (mantissa === 0) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
      return this;
    }
    let exponent = parseFloat(parts[parts.length - 1]);
    //handle numbers like AeBeC and AeeeeBeC
    if (ecount >= 2) {
      const me = parseFloat(parts[parts.length - 2]);
      if (isFinite(me)) {
        exponent *= Math.sign(me);
        exponent += f_maglog10(me);
      }
    }

    //Handle numbers written like eee... (N es) X
    if (!isFinite(mantissa)) {
      this.sign = parts[0] === "-" ? -1 : 1;
      this.layer = ecount;
      this.mag = exponent;
    }
    //Handle numbers written like XeY
    else if (ecount === 1) {
      this.sign = Math.sign(mantissa);
      this.layer = 1;
      //Example: 2e10 is equal to 10^log10(2e10) which is equal to 10^(10+log10(2))
      this.mag = exponent + Math.log10(Math.abs(mantissa));
    }
    //Handle numbers written like Xeee... (N es) Y
    else {
      this.sign = Math.sign(mantissa);
      this.layer = ecount;
      if (ecount === 2) {
        const result = Decimal.mul(FC(1, 2, exponent), D(mantissa));
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      } else {
        //at eee and above, mantissa is too small to be recognizable!
        this.mag = exponent;
      }
    }

    this.normalize();
    return this;
  }

  public fromValue(value: DecimalSource): Decimal {
    if (value instanceof Decimal) {
      return this.fromDecimal(value);
    }

    if (typeof value === "number") {
      return this.fromNumber(value);
    }

    if (typeof value === "string") {
      return this.fromString(value);
    }

    this.sign = 0;
    this.layer = 0;
    this.mag = 0;
    return this;
  }

  public toNumber(): number {
    if (!Number.isFinite(this.layer)) {
      return Number.NaN;
    }
    if (this.layer === 0) {
      return this.sign * this.mag;
    } else if (this.layer === 1) {
      return this.sign * Math.pow(10, this.mag);
    } //overflow for any normalized Decimal
    else {
      return this.mag > 0
        ? this.sign > 0
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY
        : 0;
    }
  }

  public mantissaWithDecimalPlaces(places: number): number {
    // https://stackoverflow.com/a/37425022
    if (isNaN(this.m)) {
      return Number.NaN;
    }

    if (this.m === 0) {
      return 0;
    }

    return decimalPlaces(this.m, places);
  }

  public magnitudeWithDecimalPlaces(places: number): number {
    // https://stackoverflow.com/a/37425022
    if (isNaN(this.mag)) {
      return Number.NaN;
    }

    if (this.mag === 0) {
      return 0;
    }

    return decimalPlaces(this.mag, places);
  }

  public toString(): string {
    if (this.layer === 0) {
      if ((this.mag < 1e21 && this.mag > 1e-7) || this.mag === 0) {
        return (this.sign * this.mag).toString();
      }
      return this.m + "e" + this.e;
    } else if (this.layer === 1) {
      return this.m + "e" + this.e;
    } else {
      //layer 2+
      if (this.layer <= MAX_ES_IN_A_ROW) {
        return (this.sign === -1 ? "-" : "") + "e".repeat(this.layer) + this.mag;
      } else {
        return (this.sign === -1 ? "-" : "") + "(e^" + this.layer + ")" + this.mag;
      }
    }
  }

  public toExponential(places: number): string {
    if (this.layer === 0) {
      return (this.sign * this.mag).toExponential(places);
    }
    return this.toStringWithDecimalPlaces(places);
  }

  public toFixed(places: number): string {
    if (this.layer === 0) {
      return (this.sign * this.mag).toFixed(places);
    }
    return this.toStringWithDecimalPlaces(places);
  }

  public toPrecision(places: number): string {
    if (this.e <= -7) {
      return this.toExponential(places - 1);
    }

    if (places > this.e) {
      return this.toFixed(places - this.exponent - 1);
    }

    return this.toExponential(places - 1);
  }

  public valueOf(): string {
    return this.toString();
  }

  public toJSON(): string {
    return this.toString();
  }

  public toStringWithDecimalPlaces(places: number): string {
    if (this.layer === 0) {
      if ((this.mag < 1e21 && this.mag > 1e-7) || this.mag === 0) {
        return (this.sign * this.mag).toFixed(places);
      }
      return decimalPlaces(this.m, places) + "e" + decimalPlaces(this.e, places);
    } else if (this.layer === 1) {
      return decimalPlaces(this.m, places) + "e" + decimalPlaces(this.e, places);
    } else {
      //layer 2+
      if (this.layer <= MAX_ES_IN_A_ROW) {
        return (
          (this.sign === -1 ? "-" : "") + "e".repeat(this.layer) + decimalPlaces(this.mag, places)
        );
      } else {
        return (
          (this.sign === -1 ? "-" : "") + "(e^" + this.layer + ")" + decimalPlaces(this.mag, places)
        );
      }
    }
  }

  public abs(): Decimal {
    return FC_NN(this.sign === 0 ? 0 : 1, this.layer, this.mag);
  }

  public neg(): Decimal {
    return FC_NN(-this.sign, this.layer, this.mag);
  }

  public negate(): Decimal {
    return this.neg();
  }

  public negated(): Decimal {
    return this.neg();
  }

  // public sign () {
  //     return this.sign;
  //   }

  public sgn(): number {
    return this.sign;
  }

  public round(): this | Decimal {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.round(this.mag));
    }
    return this;
  }

  public floor(): this | Decimal {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.floor(this.mag));
    }
    return this;
  }

  public ceil(): this | Decimal {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.ceil(this.mag));
    }
    return this;
  }

  public trunc(): this | Decimal {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.trunc(this.mag));
    }
    return this;
  }

  public add(value: DecimalSource): this | Decimal {
    const decimal = D(value);

    //inf/nan check
    if (!Number.isFinite(this.layer)) {
      return this;
    }
    if (!Number.isFinite(decimal.layer)) {
      return decimal;
    }

    //Special case - if one of the numbers is 0, return the other number.
    if (this.sign === 0) {
      return decimal;
    }
    if (decimal.sign === 0) {
      return this;
    }

    //Special case - Adding a number to its negation produces 0, no matter how large.
    if (this.sign === -decimal.sign && this.layer === decimal.layer && this.mag === decimal.mag) {
      return FC_NN(0, 0, 0);
    }

    let a;
    let b;

    //Special case: If one of the numbers is layer 2 or higher, just take the bigger number.
    if (this.layer >= 2 || decimal.layer >= 2) {
      return this.maxabs(decimal);
    }

    if (Decimal.cmpabs(this, decimal) > 0) {
      a = this;
      b = decimal;
    } else {
      a = decimal;
      b = this;
    }

    if (a.layer === 0 && b.layer === 0) {
      return D(a.sign * a.mag + b.sign * b.mag);
    }

    const layera = a.layer * Math.sign(a.mag);
    const layerb = b.layer * Math.sign(b.mag);

    //If one of the numbers is 2+ layers higher than the other, just take the bigger number.
    if (layera - layerb >= 2) {
      return a;
    }

    if (layera === 0 && layerb === -1) {
      if (Math.abs(b.mag - Math.log10(a.mag)) > MAX_SIGNIFICANT_DIGITS) {
        return a;
      } else {
        const magdiff = Math.pow(10, Math.log10(a.mag) - b.mag);
        const mantissa = b.sign + a.sign * magdiff;
        return FC(Math.sign(mantissa), 1, b.mag + Math.log10(Math.abs(mantissa)));
      }
    }

    if (layera === 1 && layerb === 0) {
      if (Math.abs(a.mag - Math.log10(b.mag)) > MAX_SIGNIFICANT_DIGITS) {
        return a;
      } else {
        const magdiff = Math.pow(10, a.mag - Math.log10(b.mag));
        const mantissa = b.sign + a.sign * magdiff;
        return FC(Math.sign(mantissa), 1, Math.log10(b.mag) + Math.log10(Math.abs(mantissa)));
      }
    }

    if (Math.abs(a.mag - b.mag) > MAX_SIGNIFICANT_DIGITS) {
      return a;
    } else {
      const magdiff = Math.pow(10, a.mag - b.mag);
      const mantissa = b.sign + a.sign * magdiff;
      return FC(Math.sign(mantissa), 1, b.mag + Math.log10(Math.abs(mantissa)));
    }

    throw Error("Bad arguments to add: " + this + ", " + value);
  }

  public plus(value: DecimalSource): Decimal {
    return this.add(value);
  }

  public sub(value: DecimalSource): Decimal {
    return this.add(D(value).neg());
  }

  public subtract(value: DecimalSource): Decimal {
    return this.sub(value);
  }

  public minus(value: DecimalSource): Decimal {
    return this.sub(value);
  }

  public mul(value: DecimalSource): Decimal {
    const decimal = D(value);

    //inf/nan check
    if (!Number.isFinite(this.layer)) {
      return this;
    }
    if (!Number.isFinite(decimal.layer)) {
      return decimal;
    }

    //Special case - if one of the numbers is 0, return 0.
    if (this.sign === 0 || decimal.sign === 0) {
      return FC_NN(0, 0, 0);
    }

    //Special case - Multiplying a number by its own reciprocal yields +/- 1, no matter how large.
    if (this.layer === decimal.layer && this.mag === -decimal.mag) {
      return FC_NN(this.sign * decimal.sign, 0, 1);
    }

    let a;
    let b;

    //Which number is bigger in terms of its multiplicative distance from 1?
    if (
      this.layer > decimal.layer ||
      (this.layer == decimal.layer && Math.abs(this.mag) > Math.abs(decimal.mag))
    ) {
      a = this;
      b = decimal;
    } else {
      a = decimal;
      b = this;
    }

    if (a.layer === 0 && b.layer === 0) {
      return D(a.sign * b.sign * a.mag * b.mag);
    }

    //Special case: If one of the numbers is layer 3 or higher or one of the numbers is 2+ layers bigger than the other, just take the bigger number.
    if (a.layer >= 3 || a.layer - b.layer >= 2) {
      return FC(a.sign * b.sign, a.layer, a.mag);
    }

    if (a.layer === 1 && b.layer === 0) {
      return FC(a.sign * b.sign, 1, a.mag + Math.log10(b.mag));
    }

    if (a.layer === 1 && b.layer === 1) {
      return FC(a.sign * b.sign, 1, a.mag + b.mag);
    }

    if (a.layer === 2 && b.layer === 1) {
      const newmag = FC(Math.sign(a.mag), a.layer - 1, Math.abs(a.mag)).add(
        FC(Math.sign(b.mag), b.layer - 1, Math.abs(b.mag))
      );
      return FC(a.sign * b.sign, newmag.layer + 1, newmag.sign * newmag.mag);
    }

    if (a.layer === 2 && b.layer === 2) {
      const newmag = FC(Math.sign(a.mag), a.layer - 1, Math.abs(a.mag)).add(
        FC(Math.sign(b.mag), b.layer - 1, Math.abs(b.mag))
      );
      return FC(a.sign * b.sign, newmag.layer + 1, newmag.sign * newmag.mag);
    }

    throw Error("Bad arguments to mul: " + this + ", " + value);
  }

  public multiply(value: DecimalSource): Decimal {
    return this.mul(value);
  }

  public times(value: DecimalSource): Decimal {
    return this.mul(value);
  }

  public div(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.mul(decimal.recip());
  }

  public divide(value: DecimalSource): Decimal {
    return this.div(value);
  }

  public divideBy(value: DecimalSource): Decimal {
    return this.div(value);
  }

  public dividedBy(value: DecimalSource): Decimal {
    return this.div(value);
  }

  public recip(): Decimal {
    if (this.mag === 0) {
      return Decimal.dNaN;
    } else if (this.layer === 0) {
      return FC(this.sign, 0, 1 / this.mag);
    } else {
      return FC(this.sign, this.layer, -this.mag);
    }
  }

  public reciprocal(): Decimal {
    return this.recip();
  }

  public reciprocate(): Decimal {
    return this.recip();
  }

  /**
   * -1 for less than value, 0 for equals value, 1 for greater than value
   */
  public cmp(value: DecimalSource): CompareResult {
    const decimal = D(value);
    if (this.sign > decimal.sign) {
      return 1;
    }
    if (this.sign < decimal.sign) {
      return -1;
    }
    return (this.sign * this.cmpabs(value)) as CompareResult;
  }

  public cmpabs(value: DecimalSource): CompareResult {
    const decimal = D(value);
    const layera = this.mag > 0 ? this.layer : -this.layer;
    const layerb = decimal.mag > 0 ? decimal.layer : -decimal.layer;
    if (layera > layerb) {
      return 1;
    }
    if (layera < layerb) {
      return -1;
    }
    if (this.mag > decimal.mag) {
      return 1;
    }
    if (this.mag < decimal.mag) {
      return -1;
    }
    return 0;
  }

  public compare(value: DecimalSource): CompareResult {
    return this.cmp(value);
  }

  public eq(value: DecimalSource): boolean {
    const decimal = D(value);
    return this.sign === decimal.sign && this.layer === decimal.layer && this.mag === decimal.mag;
  }

  public equals(value: DecimalSource): boolean {
    return this.eq(value);
  }

  public neq(value: DecimalSource): boolean {
    return !this.eq(value);
  }

  public notEquals(value: DecimalSource): boolean {
    return this.neq(value);
  }

  public lt(value: DecimalSource): boolean {
    const decimal = D(value); // FIXME: Remove?
    return this.cmp(value) === -1;
  }

  public lte(value: DecimalSource): boolean {
    return !this.gt(value);
  }

  public gt(value: DecimalSource): boolean {
    const decimal = D(value); // FIXME: Remove?
    return this.cmp(value) === 1;
  }

  public gte(value: DecimalSource): boolean {
    return !this.lt(value);
  }

  public max(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.lt(decimal) ? decimal : this;
  }

  public min(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.gt(decimal) ? decimal : this;
  }

  public maxabs(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.cmpabs(decimal) < 0 ? decimal : this;
  }

  public minabs(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.cmpabs(decimal) > 0 ? decimal : this;
  }

  public clamp(min: DecimalSource, max: DecimalSource): Decimal {
    return this.max(min).min(max);
  }

  public clampMin(min: DecimalSource): Decimal {
    return this.max(min);
  }

  public clampMax(max: DecimalSource): Decimal {
    return this.min(max);
  }

  public cmp_tolerance(value: DecimalSource, tolerance: number): CompareResult {
    const decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) ? 0 : this.cmp(decimal);
  }

  public compare_tolerance(value: DecimalSource, tolerance: number): CompareResult {
    return this.cmp_tolerance(value, tolerance);
  }

  /**
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public eq_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value); // https://stackoverflow.com/a/33024979
    if (tolerance == null) {
      tolerance = 1e-7;
    }
    //Numbers that are too far away are never close.
    if (this.sign !== decimal.sign) {
      return false;
    }
    if (Math.abs(this.layer - decimal.layer) > 1) {
      return false;
    }
    // return abs(a-b) <= tolerance * max(abs(a), abs(b))
    let magA = this.mag;
    let magB = decimal.mag;
    if (this.layer > decimal.layer) {
      magB = f_maglog10(magB);
    }
    if (this.layer < decimal.layer) {
      magA = f_maglog10(magA);
    }
    return Math.abs(magA - magB) <= tolerance * Math.max(Math.abs(magA), Math.abs(magB));
  }

  public equals_tolerance(value: DecimalSource, tolerance: number): boolean {
    return this.eq_tolerance(value, tolerance);
  }

  public neq_tolerance(value: DecimalSource, tolerance: number): boolean {
    return !this.eq_tolerance(value, tolerance);
  }

  public notEquals_tolerance(value: DecimalSource, tolerance: number): boolean {
    return this.neq_tolerance(value, tolerance);
  }

  public lt_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return !this.eq_tolerance(decimal, tolerance) && this.lt(decimal);
  }

  public lte_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) || this.lt(decimal);
  }

  public gt_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return !this.eq_tolerance(decimal, tolerance) && this.gt(decimal);
  }

  public gte_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) || this.gt(decimal);
  }

  public pLog10(): Decimal {
    if (this.lt(Decimal.dZero)) {
      return Decimal.dZero;
    }
    return this.log10();
  }

  public absLog10(): Decimal {
    if (this.sign === 0) {
      return Decimal.dNaN;
    } else if (this.layer > 0) {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    } else {
      return FC(1, 0, Math.log10(this.mag));
    }
  }

  public log10(): Decimal {
    if (this.sign <= 0) {
      return Decimal.dNaN;
    } else if (this.layer > 0) {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    } else {
      return FC(this.sign, 0, Math.log10(this.mag));
    }
  }

  public log(base: DecimalSource): Decimal {
    base = D(base);
    if (this.sign <= 0) {
      return Decimal.dNaN;
    }
    if (base.sign <= 0) {
      return Decimal.dNaN;
    }
    if (base.sign === 1 && base.layer === 0 && base.mag === 1) {
      return Decimal.dNaN;
    } else if (this.layer === 0 && base.layer === 0) {
      return FC(this.sign, 0, Math.log(this.mag) / Math.log(base.mag));
    }

    return Decimal.div(this.log10(), base.log10());
  }

  public log2(): Decimal {
    if (this.sign <= 0) {
      return Decimal.dNaN;
    } else if (this.layer === 0) {
      return FC(this.sign, 0, Math.log2(this.mag));
    } else if (this.layer === 1) {
      return FC(Math.sign(this.mag), 0, Math.abs(this.mag) * 3.321928094887362); //log2(10)
    } else if (this.layer === 2) {
      return FC(Math.sign(this.mag), 1, Math.abs(this.mag) + 0.5213902276543247); //-log10(log10(2))
    } else {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    }
  }

  public ln(): Decimal {
    if (this.sign <= 0) {
      return Decimal.dNaN;
    } else if (this.layer === 0) {
      return FC(this.sign, 0, Math.log(this.mag));
    } else if (this.layer === 1) {
      return FC(Math.sign(this.mag), 0, Math.abs(this.mag) * 2.302585092994046); //ln(10)
    } else if (this.layer === 2) {
      return FC(Math.sign(this.mag), 1, Math.abs(this.mag) + 0.36221568869946325); //log10(log10(e))
    } else {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    }
  }

  public logarithm(base: DecimalSource): Decimal {
    return this.log(base);
  }

  public pow(value: DecimalSource): Decimal {
    const decimal = D(value);
    const a = this;
    const b = decimal;

    //special case: if a is 0, then return 0 (UNLESS b is 0, then return 1)
    if (a.sign === 0) {
      return b.eq(0) ? FC_NN(1, 0, 1) : a
    }
    //special case: if a is 1, then return 1
    if (a.sign === 1 && a.layer === 0 && a.mag === 1) {
      return a;
    }
    //special case: if b is 0, then return 1
    if (b.sign === 0) {
      return FC_NN(1, 0, 1);
    }
    //special case: if b is 1, then return a
    if (b.sign === 1 && b.layer === 0 && b.mag === 1) {
      return a;
    }

    const result = a.absLog10().mul(b).pow10();

    if (this.sign === -1 && Math.abs(b.toNumber() % 2) % 2 === 1) {
      return result.neg();
    }

    return result;
  }

  public pow10(): Decimal {
    /*
    There are four cases we need to consider:
    1) positive sign, positive mag (e15, ee15): +1 layer (e.g. 10^15 becomes e15, 10^e15 becomes ee15)
    2) negative sign, positive mag (-e15, -ee15): +1 layer but sign and mag sign are flipped (e.g. 10^-15 becomes e-15, 10^-e15 becomes ee-15)
    3) positive sign, negative mag (e-15, ee-15): layer 0 case would have been handled in the Math.pow check, so just return 1
    4) negative sign, negative mag (-e-15, -ee-15): layer 0 case would have been handled in the Math.pow check, so just return 1
    */

    if (!Number.isFinite(this.layer) || !Number.isFinite(this.mag)) {
      return Decimal.dNaN;
    }

    let a = this;

    //handle layer 0 case - if no precision is lost just use Math.pow, else promote one layer
    if (a.layer === 0) {
      const newmag = Math.pow(10, a.sign * a.mag);
      if (Number.isFinite(newmag) && Math.abs(newmag) > 0.1) {
        return FC(1, 0, newmag);
      } else {
        if (a.sign === 0) {
          return Decimal.dOne;
        } else {
          a = FC_NN(a.sign, a.layer + 1, Math.log10(a.mag)) as this;
        }
      }
    }

    //handle all 4 layer 1+ cases individually
    if (a.sign > 0 && a.mag > 0) {
      return FC(a.sign, a.layer + 1, a.mag);
    }
    if (a.sign < 0 && a.mag > 0) {
      return FC(-a.sign, a.layer + 1, -a.mag);
    }
    //both the negative mag cases are identical: one +/- rounding error
    return Decimal.dOne;
  }

  public pow_base(value: DecimalSource): Decimal {
    return D(value).pow(this);
  }

  public root(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.pow(decimal.recip());
  }

  public factorial(): Decimal {
    if (this.mag < 0) {
      return this.add(1).gamma();
    } else if (this.layer === 0) {
      return this.add(1).gamma();
    } else if (this.layer === 1) {
      return Decimal.exp(Decimal.mul(this, Decimal.ln(this).sub(1)));
    } else {
      return Decimal.exp(this);
    }
  }

  //from HyperCalc source code
  public gamma(): Decimal {
    if (this.mag < 0) {
      return this.recip();
    } else if (this.layer === 0) {
      if (this.lt(FC_NN(1, 0, 24))) {
        return D(f_gamma(this.sign * this.mag));
      }

      const t = this.mag - 1;
      let l = 0.9189385332046727; //0.5*Math.log(2*Math.PI)
      l = l + (t + 0.5) * Math.log(t);
      l = l - t;
      const n2 = t * t;
      let np = t;
      let lm = 12 * np;
      let adj = 1 / lm;
      let l2 = l + adj;
      if (l2 === l) {
        return Decimal.exp(l);
      }

      l = l2;
      np = np * n2;
      lm = 360 * np;
      adj = 1 / lm;
      l2 = l - adj;
      if (l2 === l) {
        return Decimal.exp(l);
      }

      l = l2;
      np = np * n2;
      lm = 1260 * np;
      let lt = 1 / lm;
      l = l + lt;
      np = np * n2;
      lm = 1680 * np;
      lt = 1 / lm;
      l = l - lt;
      return Decimal.exp(l);
    } else if (this.layer === 1) {
      return Decimal.exp(Decimal.mul(this, Decimal.ln(this).sub(1)));
    } else {
      return Decimal.exp(this);
    }
  }

  public lngamma(): Decimal {
    return this.gamma().ln();
  }

  public exp(): Decimal {
    if (this.mag < 0) {
      return Decimal.dOne;
    }
    if (this.layer === 0 && this.mag <= 709.7) {
      return D(Math.exp(this.sign * this.mag));
    } else if (this.layer === 0) {
      return FC(1, 1, this.sign * Math.log10(Math.E) * this.mag);
    } else if (this.layer === 1) {
      return FC(1, 2, this.sign * (Math.log10(0.4342944819032518) + this.mag));
    } else {
      return FC(1, this.layer + 1, this.sign * this.mag);
    }
  }

  public sqr(): Decimal {
    return this.pow(2);
  }

  public sqrt(): Decimal {
    if (this.layer === 0) {
      return D(Math.sqrt(this.sign * this.mag));
    } else if (this.layer === 1) {
      return FC(1, 2, Math.log10(this.mag) - 0.3010299956639812);
    } else {
      const result = Decimal.div(FC_NN(this.sign, this.layer - 1, this.mag), FC_NN(1, 0, 2));
      result.layer += 1;
      result.normalize();
      return result;
    }
  }

  public cube(): Decimal {
    return this.pow(3);
  }

  public cbrt(): Decimal {
    return this.pow(1 / 3);
  }

  //Tetration/tetrate: The result of exponentiating 'this' to 'this' 'height' times in a row.  https://en.wikipedia.org/wiki/Tetration
  //If payload != 1, then this is 'iterated exponentiation', the result of exping (payload) to base (this) (height) times. https://andydude.github.io/tetration/archives/tetration2/ident.html
  //Works with negative and positive real heights.
  public tetrate(height = 2, payload: DecimalSource = FC_NN(1, 0, 1)): Decimal {
    if (height === Number.POSITIVE_INFINITY) {
      //Formula for infinite height power tower.
      const negln = Decimal.ln(this).neg();
      return negln.lambertw().div(negln);
    }

    if (height < 0) {
      return Decimal.iteratedlog(payload, this, -height);
    }

    payload = D(payload);
    const oldheight = height;
    height = Math.trunc(height);
    const fracheight = oldheight - height;

    if (fracheight !== 0) {
      if (payload.eq(Decimal.dOne)) {
        ++height;
        payload = new Decimal(fracheight);
      } else {
        if (this.eq(10)) {
          payload = payload.layeradd10(fracheight);
        } else {
          payload = payload.layeradd(fracheight, this);
        }
      }
    }

    for (let i = 0; i < height; ++i) {
      payload = this.pow(payload);
      //bail if we're NaN
      if (!isFinite(payload.layer) || !isFinite(payload.mag)) {
        return payload;
      }
      //shortcut
      if (payload.layer - this.layer > 3) {
        return FC_NN(payload.sign, payload.layer + (height - i - 1), payload.mag);
      }
      //give up after 100 iterations if nothing is happening
      if (i > 100) {
        return payload;
      }
    }
    return payload;
  }

  //iteratedexp/iterated exponentiation: - all cases handled in tetrate, so just call it
  public iteratedexp(height = 2, payload = FC_NN(1, 0, 1)): Decimal {
    return this.tetrate(height, payload);
  }

  //iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting (times) from the number's slog representation. Equivalent to tetrating to a negative height.
  //Works with negative and positive real heights.
  public iteratedlog(base: DecimalSource = 10, times = 1): Decimal {
    if (times < 0) {
      return Decimal.tetrate(base, -times, this);
    }

    base = D(base);
    let result = D(this);
    const fulltimes = times;
    times = Math.trunc(times);
    const fraction = fulltimes - times;
    if (result.layer - base.layer > 3) {
      const layerloss = Math.min(times, result.layer - base.layer - 3);
      times -= layerloss;
      result.layer -= layerloss;
    }

    for (let i = 0; i < times; ++i) {
      result = result.log(base);
      //bail if we're NaN
      if (!isFinite(result.layer) || !isFinite(result.mag)) {
        return result;
      }
      //give up after 100 iterations if nothing is happening
      if (i > 100) {
        return result;
      }
    }

    //handle fractional part
    if (fraction > 0 && fraction < 1) {
      if (base.eq(10)) {
        result = result.layeradd10(-fraction);
      } else {
        result = result.layeradd(-fraction, base);
      }
    }

    return result;
  }

  //Super-logarithm, one of tetration's inverses, tells you what size power tower you'd have to tetrate base to to get number. By definition, will never be higher than 1.8e308 in break_eternity.js, since a power tower 1.8e308 numbers tall is the largest representable number.
  // https://en.wikipedia.org/wiki/Super-logarithm
  public slog(base: DecimalSource = 10): Decimal {
    if (this.mag < 0) {
      return Decimal.dNegOne;
    }

    base = D(base);

    let result = 0;
    let copy = D(this);
    if (copy.layer - base.layer > 3) {
      const layerloss = copy.layer - base.layer - 3;
      result += layerloss;
      copy.layer -= layerloss;
    }

    for (let i = 0; i < 100; ++i) {
      if (copy.lt(Decimal.dZero)) {
        copy = Decimal.pow(base, copy);
        result -= 1;
      } else if (copy.lte(Decimal.dOne)) {
        return D(result + copy.toNumber() - 1); //<-- THIS IS THE CRITICAL FUNCTION
        //^ Also have to change tetrate payload handling and layeradd10 if this is changed!
      } else {
        result += 1;
        copy = Decimal.log(copy, base);
      }
    }
    return D(result);
  }

  //Approximations taken from the excellent paper https://web.archive.org/web/20090201164836/http://tetration.itgo.com/paper.html !
  //Not using for now unless I can figure out how to use it in all the related functions.
  /*var slog_criticalfunction_1 = function(x, z) {
    z = z.toNumber();
    return -1 + z;
  }

  var slog_criticalfunction_2 = function(x, z) {
    z = z.toNumber();
    var lnx = x.ln();
    if (lnx.layer === 0)
    {
      lnx = lnx.toNumber();
      return -1 + z*2*lnx/(1+lnx) - z*z*(1-lnx)/(1+lnx);
    }
    else
    {
      var term1 = lnx.mul(z*2).div(lnx.add(1));
      var term2 = Decimal.sub(1, lnx).mul(z*z).div(lnx.add(1));
      Decimal.dNegOne.add(Decimal.sub(term1, term2));
    }
  }

  var slog_criticalfunction_3 = function(x, z) {
    z = z.toNumber();
    var lnx = x.ln();
    var lnx2 = lnx.sqr();
    var lnx3 = lnx.cube();
    if (lnx.layer === 0 && lnx2.layer === 0 && lnx3.layer === 0)
    {
      lnx = lnx.toNumber();
      lnx2 = lnx2.toNumber();
      lnx3 = lnx3.toNumber();

      var term1 = 6*z*(lnx+lnx3);
      var term2 = 3*z*z*(3*lnx2-2*lnx3);
      var term3 = 2*z*z*z*(1-lnx-2*lnx2+lnx3);
      var top = term1+term2+term3;
      var bottom = 2+4*lnx+5*lnx2+2*lnx3;

      return -1 + top/bottom;
    }
    else
    {
      var term1 = (lnx.add(lnx3)).mul(6*z);
      var term2 = (lnx2.mul(3).sub(lnx3.mul(2))).mul(3*z*z);
      var term3 = (Decimal.dOne.sub(lnx).sub(lnx2.mul(2)).add(lnx3)).mul(2*z*z*z);
      var top = term1.add(term2).add(term3);
      var bottom = new Decimal(2).add(lnx.mul(4)).add(lnx2.mul(5)).add(lnx3.mul(2));

      return Decimal.dNegOne.add(top.div(bottom));
    }
  }*/

  //Function for adding/removing layers from a Decimal, even fractional layers (e.g. its slog10 representation).
  //Everything continues to use the linear approximation ATM.
  public layeradd10(diff: DecimalSource): Decimal {
    diff = Decimal.fromValue_noAlloc(diff).toNumber();
    const result = D(this);
    if (diff >= 1) {
      const layeradd = Math.trunc(diff);
      diff -= layeradd;
      result.layer += layeradd;
    }
    if (diff <= -1) {
      const layeradd = Math.trunc(diff);
      diff -= layeradd;
      result.layer += layeradd;
      if (result.layer < 0) {
        for (let i = 0; i < 100; ++i) {
          result.layer++;
          result.mag = Math.log10(result.mag);
          if (!isFinite(result.mag)) {
            return result;
          }
          if (result.layer >= 0) {
            break;
          }
        }
      }
    }

    //layeradd10: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 10 and iterated log base 10. Also equivalent to adding a fractional amount to the number's layer in its break_eternity.js representation.
    if (diff > 0) {
      let subtractlayerslater = 0;
      //Ironically, this edge case would be unnecessary if we had 'negative layers'.
      while (Number.isFinite(result.mag) && result.mag < 10) {
        result.mag = Math.pow(10, result.mag);
        ++subtractlayerslater;
      }

      //A^(10^B) === C, solve for B
      //B === log10(logA(C))

      if (result.mag > 1e10) {
        result.mag = Math.log10(result.mag);
        result.layer++;
      }

      //Note that every integer slog10 value, the formula changes, so if we're near such a number, we have to spend exactly enough layerdiff to hit it, and then use the new formula.
      const diffToNextSlog = Math.log10(Math.log(1e10) / Math.log(result.mag));
      if (diffToNextSlog < diff) {
        result.mag = Math.log10(1e10);
        result.layer++;
        diff -= diffToNextSlog;
      }

      result.mag = Math.pow(result.mag, Math.pow(10, diff));

      while (subtractlayerslater > 0) {
        result.mag = Math.log10(result.mag);
        --subtractlayerslater;
      }
    } else if (diff < 0) {
      let subtractlayerslater = 0;

      while (Number.isFinite(result.mag) && result.mag < 10) {
        result.mag = Math.pow(10, result.mag);
        ++subtractlayerslater;
      }

      if (result.mag > 1e10) {
        result.mag = Math.log10(result.mag);
        result.layer++;
      }

      const diffToNextSlog = Math.log10(1 / Math.log10(result.mag));
      if (diffToNextSlog > diff) {
        result.mag = 1e10;
        result.layer--;
        diff -= diffToNextSlog;
      }

      result.mag = Math.pow(result.mag, Math.pow(10, diff));

      while (subtractlayerslater > 0) {
        result.mag = Math.log10(result.mag);
        --subtractlayerslater;
      }
    }

    while (result.layer < 0) {
      result.layer++;
      result.mag = Math.log10(result.mag);
    }
    result.normalize();
    return result;
  }

  //layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
  public layeradd(diff: number, base: DecimalSource): Decimal {
    const slogthis = this.slog(base).toNumber();
    const slogdest = slogthis + diff;
    if (slogdest >= 0) {
      return Decimal.tetrate(base, slogdest);
    } else if (!Number.isFinite(slogdest)) {
      return Decimal.dNaN;
    } else if (slogdest >= -1) {
      return Decimal.log(Decimal.tetrate(base, slogdest + 1), base);
    } else {
      return Decimal.log(Decimal.log(Decimal.tetrate(base, slogdest + 2), base), base);
    }
  }

  //The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
  // https://en.wikipedia.org/wiki/Lambert_W_function
  //Some special values, for testing: https://en.wikipedia.org/wiki/Lambert_W_function#Special_values
  public lambertw(): Decimal {
    if (this.lt(-0.3678794411710499)) {
      throw Error("lambertw is unimplemented for results less than -1, sorry!");
    } else if (this.mag < 0) {
      return D(f_lambertw(this.toNumber()));
    } else if (this.layer === 0) {
      return D(f_lambertw(this.sign * this.mag));
    } else if (this.layer === 1) {
      return d_lambertw(this);
    } else if (this.layer === 2) {
      return d_lambertw(this);
    }
    if (this.layer >= 3) {
      return FC_NN(this.sign, this.layer - 1, this.mag);
    }

    throw "Unhandled behavior in lambertw()";
  }

  //The super square-root function - what number, tetrated to height 2, equals this?
  //Other sroots are possible to calculate probably through guess and check methods, this one is easy though.
  // https://en.wikipedia.org/wiki/Tetration#Super-root
  public ssqrt(): Decimal {
    if (this.sign == 1 && this.layer >= 3) {
      return FC_NN(this.sign, this.layer - 1, this.mag);
    }
    const lnx = this.ln();
    return lnx.div(lnx.lambertw());
  }
  /*

Unit tests for tetrate/iteratedexp/iteratedlog/layeradd10/layeradd/slog:

for (var i = 0; i < 1000; ++i)
{
  var first = Math.random()*100;
  var both = Math.random()*100;
  var expected = first+both+1;
  var result = new Decimal(10).layeradd10(first).layeradd10(both).slog();
  if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
  {
      console.log(first + ", " + both);
  }
}

for (var i = 0; i < 1000; ++i)
{
  var first = Math.random()*100;
  var both = Math.random()*100;
  first += both;
  var expected = first-both+1;
  var result = new Decimal(10).layeradd10(first).layeradd10(-both).slog();
  if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
  {
      console.log(first + ", " + both);
  }
}

for (var i = 0; i < 1000; ++i)
{
  var first = Math.random()*100;
  var both = Math.random()*100;
  var base = Math.random()*8+2;
  var expected = first+both+1;
  var result = new Decimal(base).layeradd(first, base).layeradd(both, base).slog(base);
  if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
  {
      console.log(first + ", " + both);
  }
}

for (var i = 0; i < 1000; ++i)
{
  var first = Math.random()*100;
  var both = Math.random()*100;
  var base = Math.random()*8+2;
  first += both;
  var expected = first-both+1;
  var result = new Decimal(base).layeradd(first, base).layeradd(-both, base).slog(base);
  if (Number.isFinite(result.mag) && !Decimal.eq_tolerance(expected, result))
  {
      console.log(first + ", " + both);
  }
}

for (var i = 0; i < 1000; ++i)
{
var first = Math.round((Math.random()*30))/10;
var both = Math.round((Math.random()*30))/10;
var tetrateonly = Decimal.tetrate(10, first);
var tetrateandlog = Decimal.tetrate(10, first+both).iteratedlog(10, both);
if (!Decimal.eq_tolerance(tetrateonly, tetrateandlog))
{
  console.log(first + ", " + both);
}
}

for (var i = 0; i < 1000; ++i)
{
var first = Math.round((Math.random()*30))/10;
var both = Math.round((Math.random()*30))/10;
var base = Math.random()*8+2;
var tetrateonly = Decimal.tetrate(base, first);
var tetrateandlog = Decimal.tetrate(base, first+both).iteratedlog(base, both);
if (!Decimal.eq_tolerance(tetrateonly, tetrateandlog))
{
  console.log(first + ", " + both);
}
}

for (var i = 0; i < 1000; ++i)
{
var first = Math.round((Math.random()*30))/10;
var both = Math.round((Math.random()*30))/10;
var base = Math.random()*8+2;
var tetrateonly = Decimal.tetrate(base, first, base);
var tetrateandlog = Decimal.tetrate(base, first+both, base).iteratedlog(base, both);
if (!Decimal.eq_tolerance(tetrateonly, tetrateandlog))
{
  console.log(first + ", " + both);
}
}

for (var i = 0; i < 1000; ++i)
{
  var xex = new Decimal(-0.3678794411710499+Math.random()*100);
  var x = Decimal.lambertw(xex);
  if (!Decimal.eq_tolerance(xex, x.mul(Decimal.exp(x))))
  {
      console.log(xex);
  }
}

for (var i = 0; i < 1000; ++i)
{
  var xex = new Decimal(-0.3678794411710499+Math.exp(Math.random()*100));
  var x = Decimal.lambertw(xex);
  if (!Decimal.eq_tolerance(xex, x.mul(Decimal.exp(x))))
  {
      console.log(xex);
  }
}

for (var i = 0; i < 1000; ++i)
{
  var a = Decimal.randomDecimalForTesting(Math.random() > 0.5 ? 0 : 1);
  var b = Decimal.randomDecimalForTesting(Math.random() > 0.5 ? 0 : 1);
  if (Math.random() > 0.5) { a = a.recip(); }
  if (Math.random() > 0.5) { b = b.recip(); }
  var c = a.add(b).toNumber();
  if (Number.isFinite(c) && !Decimal.eq_tolerance(c, a.toNumber()+b.toNumber()))
  {
      console.log(a + ", " + b);
  }
}

for (var i = 0; i < 100; ++i)
{
  var a = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
  var b = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
  if (Math.random() > 0.5) { a = a.recip(); }
  if (Math.random() > 0.5) { b = b.recip(); }
  var c = a.mul(b).toNumber();
  if (Number.isFinite(c) && Number.isFinite(a.toNumber()) && Number.isFinite(b.toNumber()) && a.toNumber() != 0 && b.toNumber() != 0 && c != 0 && !Decimal.eq_tolerance(c, a.toNumber()*b.toNumber()))
  {
      console.log("Test 1: " + a + ", " + b);
  }
  else if (!Decimal.mul(a.recip(), b.recip()).eq_tolerance(Decimal.mul(a, b).recip()))
  {
      console.log("Test 3: " + a + ", " + b);
  }
}

for (var i = 0; i < 10; ++i)
{
  var a = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
  var b = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
  if (Math.random() > 0.5 && a.sign !== 0) { a = a.recip(); }
  if (Math.random() > 0.5 && b.sign !== 0) { b = b.recip(); }
  var c = a.pow(b);
  var d = a.root(b.recip());
  var e = a.pow(b.recip());
  var f = a.root(b);

  if (!c.eq_tolerance(d) && a.sign !== 0 && b.sign !== 0)
  {
    console.log("Test 1: " + a + ", " + b);
  }
  if (!e.eq_tolerance(f) && a.sign !== 0 && b.sign !== 0)
  {
    console.log("Test 2: " + a + ", " + b);
  }
}

for (var i = 0; i < 10; ++i)
{
  var a = Math.round(Math.random()*18-9);
  var b = Math.round(Math.random()*100-50);
  var c = Math.round(Math.random()*18-9);
  var d = Math.round(Math.random()*100-50);
  console.log("Decimal.pow(Decimal.fromMantissaExponent(" + a + ", " + b + "), Decimal.fromMantissaExponent(" + c + ", " + d + ")).toString()");
}

*/

  //Pentation/pentate: The result of tetrating 'height' times in a row. An absurdly strong operator - Decimal.pentate(2, 4.28) and Decimal.pentate(10, 2.37) are already too huge for break_eternity.js!
  // https://en.wikipedia.org/wiki/Pentation
  public pentate(height = 2, payload: DecimalSource = FC_NN(1, 0, 1)): Decimal {
    payload = D(payload);
    const oldheight = height;
    height = Math.trunc(height);
    const fracheight = oldheight - height;

    //I have no idea if this is a meaningful approximation for pentation to continuous heights, but it is monotonic and continuous.
    if (fracheight !== 0) {
      if (payload.eq(Decimal.dOne)) {
        ++height;
        payload = new Decimal(fracheight);
      } else {
        if (this.eq(10)) {
          payload = payload.layeradd10(fracheight);
        } else {
          payload = payload.layeradd(fracheight, this);
        }
      }
    }

    for (let i = 0; i < height; ++i) {
      payload = this.tetrate(payload.toNumber());
      //bail if we're NaN
      if (!isFinite(payload.layer) || !isFinite(payload.mag)) {
        return payload;
      }
      //give up after 10 iterations if nothing is happening
      if (i > 10) {
        return payload;
      }
    }

    return payload;
  }

  // trig functions!
  public sin(): this | Decimal {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.sin(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  public cos(): Decimal {
    if (this.mag < 0) {
      return Decimal.dOne;
    }
    if (this.layer === 0) {
      return D(Math.cos(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  public tan(): this | Decimal {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.tan(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  public asin(): this | Decimal {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.asin(this.sign * this.mag));
    }
    return FC_NN(Number.NaN, Number.NaN, Number.NaN);
  }

  public acos(): Decimal {
    if (this.mag < 0) {
      return D(Math.acos(this.toNumber()));
    }
    if (this.layer === 0) {
      return D(Math.acos(this.sign * this.mag));
    }
    return FC_NN(Number.NaN, Number.NaN, Number.NaN);
  }

  public atan(): this | Decimal {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.atan(this.sign * this.mag));
    }
    return D(Math.atan(this.sign * 1.8e308));
  }

  public sinh(): Decimal {
    return this.exp().sub(this.negate().exp()).div(2);
  }

  public cosh(): Decimal {
    return this.exp().add(this.negate().exp()).div(2);
  }

  public tanh(): Decimal {
    return this.sinh().div(this.cosh());
  }

  public asinh(): Decimal {
    return Decimal.ln(this.add(this.sqr().add(1).sqrt()));
  }

  public acosh(): Decimal {
    return Decimal.ln(this.add(this.sqr().sub(1).sqrt()));
  }

  public atanh(): Decimal {
    if (this.abs().gte(1)) {
      return FC_NN(Number.NaN, Number.NaN, Number.NaN);
    }

    return Decimal.ln(this.add(1).div(D(1).sub(this))).div(2);
  }

  /**
   * Joke function from Realm Grinder
   */
  public ascensionPenalty(ascensions: DecimalSource): Decimal {
    if (ascensions === 0) {
      return this;
    }

    return this.root(Decimal.pow(10, ascensions));
  }

  /**
   * Joke function from Cookie Clicker. It's 'egg'
   */
  public egg(): Decimal {
    return this.add(9);
  }

  public lessThanOrEqualTo(other: DecimalSource): boolean {
    return this.cmp(other) < 1;
  }

  public lessThan(other: DecimalSource): boolean {
    return this.cmp(other) < 0;
  }

  public greaterThanOrEqualTo(other: DecimalSource): boolean {
    return this.cmp(other) > -1;
  }

  public greaterThan(other: DecimalSource): boolean {
    return this.cmp(other) > 0;
  }

  // return Decimal;
}

// return Decimal;
