import { LRUCache } from "./lru-cache";

export type CompareResult = -1 | 0 | 1;

const MAX_SIGNIFICANT_DIGITS = 17; //Maximum number of digits of precision to assume in Number

const EXP_LIMIT = 9e15; //If we're ABOVE this value, increase a layer. (9e15 is close to the largest integer that can fit in a Number.)

const LAYER_DOWN: number = Math.log10(9e15);

const FIRST_NEG_LAYER = 1 / 9e15; //At layer 0, smaller non-zero numbers than this become layer 1 numbers with negative mag. After that the pattern continues as normal.

const NUMBER_EXP_MAX = 308; //The largest exponent that can appear in a Number, though not all mantissas are valid here.

const NUMBER_EXP_MIN = -324; //The smallest exponent that can appear in a Number, though not all mantissas are valid here.

const MAX_ES_IN_A_ROW = 5; //For default toString behaviour, when to swap from eee... to (e^n) syntax.

const DEFAULT_FROM_STRING_CACHE_SIZE = (1 << 10) - 1; // The default size of the LRU cache used to cache Decimal.fromString.

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

//tetration/slog to real height stuff
//background info and tables of values for critical functions taken here: https://github.com/Patashu/break_eternity.js/issues/22
const critical_headers = [2, Math.E, 3, 4, 5, 6, 7, 8, 9, 10];
const critical_tetr_values = [
  [
    // Base 2 (using http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html )
    1, 1.0891180521811202527, 1.1789767925673958433, 1.2701455431742086633, 1.3632090180450091941,
    1.4587818160364217007, 1.5575237916251418333, 1.6601571006859253673, 1.7674858188369780435, 1.8804192098842727359,
    2,
  ],
  [
    // Base E (using http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html )
    1, //0.0
    1.1121114330934078681, //0.1
    1.2310389249316089299, //0.2
    1.3583836963111376089, //0.3
    1.4960519303993531879, //0.4
    1.6463542337511945810, //0.5
    1.8121385357018724464, //0.6
    1.9969713246183068478, //0.7
    2.2053895545527544330, //0.8
    2.4432574483385252544, //0.9
    Math.E, //1.0
  ],
  [
    // Base 3
    1, 1.1187738849693603, 1.2464963939368214, 1.38527004705667, 1.5376664685821402,
    1.7068895236551784, 1.897001227148399, 2.1132403089001035, 2.362480153784171,
    2.6539010333870774, 3,
  ],
  [
    // Base 4
    1, 1.1367350847096405, 1.2889510672956703, 1.4606478703324786, 1.6570295196661111,
    1.8850062585672889, 2.1539465047453485, 2.476829779693097, 2.872061932789197,
    3.3664204535587183, 4,
  ],
  [
    // Base 5
    1, 1.1494592900767588, 1.319708228183931, 1.5166291280087583, 1.748171114438024,
    2.0253263297298045, 2.3636668498288547, 2.7858359149579424, 3.3257226212448145,
    4.035730287722532, 5,
  ],
  [
    // Base 6
    1, 1.159225940787673, 1.343712473580932, 1.5611293155111927, 1.8221199554561318,
    2.14183924486326, 2.542468319282638, 3.0574682501653316, 3.7390572020926873, 4.6719550537360774,
    6,
  ],
  [
    // Base 7
    1, 1.1670905356972596, 1.3632807444991446, 1.5979222279405536, 1.8842640123816674,
    2.2416069644878687, 2.69893426559423, 3.3012632110403577, 4.121250340630164, 5.281493033448316,
    7,
  ],
  [
    // Base 8
    1, 1.1736630594087796, 1.379783782386201, 1.6292821855668218, 1.9378971836180754,
    2.3289975651071977, 2.8384347394720835, 3.5232708454565906, 4.478242031114584,
    5.868592169644505, 8,
  ],
  [
    // Base 9
    1, 1.1793017514670474, 1.394054150657457, 1.65664127441059, 1.985170999970283,
    2.4069682290577457, 2.9647310119960752, 3.7278665320924946, 4.814462547283592,
    6.436522247411611, 9,
  ],
  [
    // Base 10 (using http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html )
    1, 1.1840100246247336579, 1.4061375836156954169, 1.6802272208863963918, 2.026757028388618927,
    2.4770056063449647580, 3.0805252717554819987, 3.9191964192627283911, 5.1351528408331864230,
    6.9899611795347148455, 10,
  ],
];
const critical_slog_values = [
  [
    // Base 2
    -1, -0.9194161097107025, -0.8335625019330468, -0.7425599821143978, -0.6466611521029437,
    -0.5462617907227869, -0.4419033816638769, -0.3342645487554494, -0.224140440909962,
    -0.11241087890006762, 0,
  ],
  [
    // Base E
    -1, //0.0
    -0.90603157029014, //0.1
    -0.80786507256596, //0.2
    -0.7064666939634, //0.3
    -0.60294836853664, //0.4
    -0.49849837513117, //0.5
    -0.39430303318768, //0.6
    -0.29147201034755, //0.7
    -0.19097820800866, //0.8
    -0.09361896280296, //0.9
    0, //1.0
  ],
  [
    // Base 3
    -1, -0.9021579584316141, -0.8005762598234203, -0.6964780623319391, -0.5911906810998454,
    -0.486050182576545, -0.3823089430815083, -0.28106046722897615, -0.1831906535795894,
    -0.08935809204418144, 0,
  ],
  [
    // Base 4
    -1, -0.8917227442365535, -0.781258746326964, -0.6705130326902455, -0.5612813129406509,
    -0.4551067709033134, -0.35319256652135966, -0.2563741554088552, -0.1651412821106526,
    -0.0796919581982668, 0,
  ],
  [
    // Base 5
    -1, -0.8843387974366064, -0.7678744063886243, -0.6529563724510552, -0.5415870994657841,
    -0.4352842206588936, -0.33504449124791424, -0.24138853420685147, -0.15445285440944467,
    -0.07409659641336663, 0,
  ],
  [
    // Base 6
    -1, -0.8786709358426346, -0.7577735191184886, -0.6399546189952064, -0.527284921869926,
    -0.4211627631006314, -0.3223479611761232, -0.23107655627789858, -0.1472057700818259,
    -0.07035171210706326, 0,
  ],
  [
    // Base 7
    -1, -0.8740862815291583, -0.7497032990976209, -0.6297119746181752, -0.5161838335958787,
    -0.41036238255751956, -0.31277212146489963, -0.2233976621705518, -0.1418697367979619,
    -0.06762117662323441, 0,
  ],
  [
    // Base 8
    -1, -0.8702632331800649, -0.7430366914122081, -0.6213373075161548, -0.5072025698095242,
    -0.40171437727184167, -0.30517930701410456, -0.21736343968190863, -0.137710238299109,
    -0.06550774483471955, 0,
  ],
  [
    // Base 9
    -1, -0.8670016295947213, -0.7373984232432306, -0.6143173985094293, -0.49973884395492807,
    -0.394584953527678, -0.2989649949848695, -0.21245647317021688, -0.13434688362382652,
    -0.0638072667348083, 0,
  ],
  [
    // Base 10
    -1, -0.8641642839543857, -0.732534623168535, -0.6083127477059322, -0.4934049257184696,
    -0.3885773075899922, -0.29376029055315767, -0.2083678561173622, -0.13155653399373268,
    -0.062401588652553186, 0,
  ],
];

let D = function D(value: DecimalSource): Readonly<Decimal> {
  return Decimal.fromValue_noAlloc(value);
};

let FC = function (sign: number, layer: number, mag: number) {
  return Decimal.fromComponents(sign, layer, mag);
};

let FC_NN = function FC_NN(sign: number, layer: number, mag: number) {
  return Decimal.fromComponents_noNormalize(sign, layer, mag);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let ME = function ME(mantissa: number, exponent: number) {
  return Decimal.fromMantissaExponent(mantissa, exponent);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let ME_NN = function ME_NN(mantissa: number, exponent: number) {
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
  l = l - 1 / (360 * np);
  np = np * n2;
  l = l + 1 / (1260 * np);
  np = np * n2;
  l = l - 1 / (1680 * np);
  np = np * n2;
  l = l + 1 / (1188 * np);
  np = np * n2;
  l = l - 691 / (360360 * np);
  np = np * n2;
  l = l + 7 / (1092 * np);
  np = np * n2;
  l = l - 3617 / (122400 * np);

  return Math.exp(l) / scal1;
};

const _twopi = 6.2831853071795864769252842; // 2*pi
const _EXPN1 = 0.36787944117144232159553; // exp(-1)
const OMEGA = 0.56714329040978387299997; // W(1, 0)
//from https://math.stackexchange.com/a/465183
// The evaluation can become inaccurate very close to the branch point
// Evaluates W(x, 0) if principal is true, W(x, -1) if principal is false
const f_lambertw = function (z: number, tol = 1e-10, principal = true): number {
  let w;
  let wn;

  if (!Number.isFinite(z)) {
    return z;
  }
  if (principal) {
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
  }
  else {
    if (z === 0) return -Infinity;

    if (z <= -0.1) {
      w = -2;
    } else {
      w = Math.log(-z) - Math.log(-Math.log(-z));
    }
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
// Evaluates W(x, 0) if principal is true, W(x, -1) if principal is false
function d_lambertw(z: Decimal, tol = 1e-10, principal = true): Decimal {
  let w;
  let ew, wewz, wn;

  if (!Number.isFinite(z.mag)) {
    return new Decimal(z);
  }
  if (principal) {
    if (z.eq(Decimal.dZero)) {
      return FC_NN(0, 0, 0);
    }
    if (z.eq(Decimal.dOne)) {
      //Split out this case because the asymptotic series blows up
      return Decimal.fromNumber(OMEGA);
    }
  
    //Get an initial guess for Halley's method
    w = Decimal.ln(z);  
  }
  else {
    if (z.eq(Decimal.dZero)) {
        return new Decimal(Decimal.dNegInf);
      }
    //Get an initial guess for Halley's method
    w = Decimal.ln(z.neg());  
  }
  //Halley's method; see 5.9 in [1]

  for (let i = 0; i < 100; ++i) {
    ew = w.neg().exp();
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
 * The value of the Decimal is sign * 10^10^10...^mag, with (layer) 10s. If the layer is not 0, then negative mag means it's the reciprocal of the corresponding number with positive mag.
 */
export default class Decimal {
  /**
   * Represents the number 0.
   */
  public static readonly dZero = FC_NN(0, 0, 0);
  /**
   * Represents the number 1.
   */
  public static readonly dOne = FC_NN(1, 0, 1);
  /**
   * Represents the number -1.
   */
  public static readonly dNegOne = FC_NN(-1, 0, 1);
  /**
   * Represents the number 2.
   */
  public static readonly dTwo = FC_NN(1, 0, 2);
  /**
   * Represents the number 10.
   */
  public static readonly dTen = FC_NN(1, 0, 10);
  /**
   * Represents a NaN (Not A Number) value.
   */
  public static readonly dNaN = FC_NN(Number.NaN, Number.NaN, Number.NaN);
  /**
   * Represents positive infinity.
   */
  public static readonly dInf = FC_NN(1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  /**
   * Represents negative infinity.
   */
  public static readonly dNegInf = FC_NN(-1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  /**
   * Represents the largest value a JavaScript number can have, which is approximately 1.79 * 10^308.
   */
  public static readonly dNumberMax = FC(1, 0, Number.MAX_VALUE);
  /**
   * Represents the smallest value a JavaScript number can have, which is approximately 5 * 10^-324.
   */
  public static readonly dNumberMin = FC(1, 0, Number.MIN_VALUE);
  /**
   * Represents the largest Decimal where adding 1 to the layer is a safe operation
   * (Decimals larger than this are too big for pow/exp/log to affect, but tetrate/iteratedlog/slog can still affect them).
   * Approximately 10^^(9.007 * 10^15).
   */
  public static readonly dLayerSafeMax = FC(1, Number.MAX_SAFE_INTEGER, EXP_LIMIT - 1);
  /**
   * Represents the smallest Decimal where adding 1 to the layer is a safe operation. Approximately 1 / (10^^(9.007 * 10^15)).
   */
  public static readonly dLayerSafeMin = FC(1, Number.MAX_SAFE_INTEGER, -(EXP_LIMIT - 1));
  /**
   * Represents the largest finite value a Decimal can represent. Approximately 10^^(1.79 * 10^308).
   */
  public static readonly dLayerMax = FC(1, Number.MAX_VALUE, EXP_LIMIT - 1);
  /**
   * Represents the smallest non-zero value a Decimal can represent. Approximately 1 / (10^^(1.79 * 10^308)).
   */
  public static readonly dLayerMin = FC(1, Number.MAX_VALUE, -(EXP_LIMIT - 1));

  private static fromStringCache = new LRUCache<string, Decimal>(DEFAULT_FROM_STRING_CACHE_SIZE);

  public sign = 0;
  public mag = 0;
  public layer = 0;

  constructor(value?: DecimalSource) {
    if (value instanceof Decimal) {
      this.fromDecimal(value);
    } else if (typeof value === "number") {
      this.fromNumber(value);
    } else if (typeof value === "string") {
      this.fromString(value);
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
        this.layer = 0;
        this.exponent = 0;
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

  /**
   * Turns the given components into a valid Decimal.
   */
  public static fromComponents(sign: number, layer: number, mag: number): Decimal {
    return new Decimal().fromComponents(sign, layer, mag);
  }

  /**
   * Turns the given components into a Decimal, but not necessarily a valid one (it's only valid if the components would already create a valid Decimal without normalization). Users of this library should not use this function.
   */
  public static fromComponents_noNormalize(sign: number, layer: number, mag: number): Decimal {
    return new Decimal().fromComponents_noNormalize(sign, layer, mag);
  }

  /**
   * Turns the mantissa and exponent into a valid Decimal with value mantissa * 10^exponent.
   */
  public static fromMantissaExponent(mantissa: number, exponent: number): Decimal {
    return new Decimal().fromMantissaExponent(mantissa, exponent);
  }

  /**
   * Turns the mantissa and exponent into a Decimal, but not necessarily a valid one. Users of this library should not use this function.
   */
  public static fromMantissaExponent_noNormalize(mantissa: number, exponent: number): Decimal {
    return new Decimal().fromMantissaExponent_noNormalize(mantissa, exponent);
  }

  /**
   * Creates a deep copy of the provided value.
   */
  public static fromDecimal(value: Decimal): Decimal {
    return new Decimal().fromDecimal(value);
  }

  /**
   * Converts a floating-point number into a Decimal.
   */
  public static fromNumber(value: number): Decimal {
    return new Decimal().fromNumber(value);
  }

  /**
   * Converts a string into a Decimal.
   * 
   * If linearhyper4 is true, then strings like "10^^8.5" will use the linear approximation of tetration even for bases <= 10.
   */
  public static fromString(value: string, linearhyper4: boolean = false): Decimal {
    return new Decimal().fromString(value, linearhyper4);
  }

  /**
   * The function used by new Decimal() to create a new Decimal. Accepts a DecimalSource: uses fromNumber if given a number, uses fromString if given a string, and uses fromDecimal if given a Decimal.
   */
  public static fromValue(value: DecimalSource): Decimal {
    return new Decimal().fromValue(value);
  }

  /**
   * Converts a DecimalSource to a Decimal, without constructing a new Decimal
   * if the provided value is already a Decimal.
   *
   * As the return value could be the provided value itself, this function
   * returns a read-only Decimal to prevent accidental mutations of the value.
   * Use `new Decimal(value)` to explicitly create a writeable copy if mutation
   * is required.
   */
  public static fromValue_noAlloc(value: DecimalSource): Readonly<Decimal> {
    if (value instanceof Decimal) {
      return value;
    } else if (typeof value === "string") {
      const cached = Decimal.fromStringCache.get(value);
      if (cached !== undefined) {
        return cached;
      }
      return Decimal.fromString(value);
    } else if (typeof value === "number") {
      return Decimal.fromNumber(value);
    } else {
      // This should never happen... but some users like Prestige Tree Rewritten
      // pass undefined values in as DecimalSources, so we should handle this
      // case to not break them.
      return FC_NN(0, 0, 0);
    }
  }

  /**
   * Absolute value function: returns 'value' if 'value' >= 0, returns the negative of 'value' if 'value' < 0.
   */
  public static abs(value: DecimalSource): Decimal {
    return D(value).abs();
  }

  /**
   * Returns the negative of the given value.
   */
  public static neg(value: DecimalSource): Decimal {
    return D(value).neg();
  }

  /**
   * Returns the negative of the given value.
   */
  public static negate(value: DecimalSource): Decimal {
    return D(value).neg();
  }

  /**
   * Returns the negative of the given value.
   */
  public static negated(value: DecimalSource): Decimal {
    return D(value).neg();
  }

  /**
   * Returns the sign of the given value.
   */
  public static sign(value: DecimalSource): number {
    return D(value).sign;
  }

  /**
   * Returns the sign of the given value.
   */
  public static sgn(value: DecimalSource): number {
    return D(value).sign;
  }

  /**
   * Rounds the value to the nearest integer.
   */
  public static round(value: DecimalSource): Decimal {
    return D(value).round();
  }

  /**
   * "Rounds" the value to the nearest integer that's less than or equal to it.
   */
  public static floor(value: DecimalSource): Decimal {
    return D(value).floor();
  }

  /**
   * "Rounds" the value to the nearest integer that's greater than or equal to it.
   */
  public static ceil(value: DecimalSource): Decimal {
    return D(value).ceil();
  }

  /**
   * Extracts the integer part of the Decimal and returns it. Behaves like floor on positive numbers, but behaves like ceiling on negative numbers.
   */
  public static trunc(value: DecimalSource): Decimal {
    return D(value).trunc();
  }

  /**
   * Addition: returns the sum of the two Decimals.
   */
  public static add(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).add(other);
  }

  /**
   * Addition: returns the sum of the two Decimals.
   */
  public static plus(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).add(other);
  }

  /**
   * Subtraction: returns the difference between 'value' and 'other'.
   */
  public static sub(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).sub(other);
  }

  /**
   * Subtraction: returns the difference between 'value' and 'other'.
   */
  public static subtract(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).sub(other);
  }

  /**
   * Subtraction: returns the difference between 'value' and 'other'.
   */
  public static minus(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).sub(other);
  }

  /**
   * Multiplication: returns the product of the two Decimals.
   */
  public static mul(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).mul(other);
  }

  /**
   * Multiplication: returns the product of the two Decimals.
   */
  public static multiply(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).mul(other);
  }

  /**
   * Multiplication: returns the product of the two Decimals.
   */
  public static times(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).mul(other);
  }

  /**
   * Division: returns the quotient of 'value' and 'other'.
   */
  public static div(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).div(other);
  }

  /**
   * Division: returns the quotient of 'value' and 'other'.
   */
  public static divide(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).div(other);
  }

  /**
   * Returns the reciprocal (1 / X) of the given value.
   */
  public static recip(value: DecimalSource): Decimal {
    return D(value).recip();
  }

  /**
   * Returns the reciprocal (1 / X) of the given value.
   */
  public static reciprocal(value: DecimalSource): Decimal {
    return D(value).recip();
  }

  /**
   * Returns the reciprocal (1 / X) of the given value.
   */
  public static reciprocate(value: DecimalSource): Decimal {
    return D(value).reciprocate();
  }

  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  public static mod(value: DecimalSource, other: DecimalSource, floored : boolean = false): Decimal {
    return D(value).mod(other, floored);
  }

  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  public static modulo(value: DecimalSource, other: DecimalSource, floored : boolean = false): Decimal {
    return D(value).modulo(other, floored);
  }

  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  public static modular(value: DecimalSource, other: DecimalSource, floored : boolean = false): Decimal {
    return D(value).modular(other, floored);
  }

  /**
   * Returns 1 if 'value' > 'other', returns -1 if 'value' < 'other', returns 0 if 'value' == 'other'.
   */
  public static cmp(value: DecimalSource, other: DecimalSource): CompareResult {
    return D(value).cmp(other);
  }

  /**
   * Compares the absolute values of this and value.
   * Returns 1 if |'value'| > |'other'|, returns -1 if |'value'| < |'other'|, returns 0 if |'value'| == |'other'|.
   */
  public static cmpabs(value: DecimalSource, other: DecimalSource): CompareResult {
    return D(value).cmpabs(other);
  }

  /**
   * Returns 1 if 'value' > 'other', returns -1 if 'value' < 'other', returns 0 if 'value' == 'other'.
   */
  public static compare(value: DecimalSource, other: DecimalSource): CompareResult {
    return D(value).cmp(other);
  }

  /**
   * Returns true if the given value is an NaN value.
   */
  public static isNaN(value: DecimalSource): boolean {
    value = D(value);
    return isNaN(value.sign) || isNaN(value.layer) || isNaN(value.mag);
  }

  /**
   * Returns true if the given value is finite (by Decimal standards, not by floating point standards - a humongous Decimal like 10^^10^100 is still finite!)
   */
  public static isFinite(value: DecimalSource): boolean {
    value = D(value);
    return isFinite(value.sign) && isFinite(value.layer) && isFinite(value.mag);
  }

  /**
   * The Decimal equivalent of ==. Returns true if 'value' and 'other' have equal values.
   */
  public static eq(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).eq(other);
  }

  /**
   * Returns true if 'value' and 'other' have equal values.
   */
  public static equals(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).eq(other);
  }

  /**
   * The Decimal equivalent of !=. Returns true if 'value' and 'other' do not have equal values.
   */
  public static neq(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).neq(other);
  }

  /**
   * Returns true if 'value' and 'other' do not have equal values.
   */
  public static notEquals(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).notEquals(other);
  }

  /**
   * The Decimal equivalent of <. Returns true if 'value' is less than 'other'.
   */
  public static lt(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).lt(other);
  }

  /**
   * The Decimal equivalent of <=. Returns true if 'value' is less than or equal to 'other'.
   */
  public static lte(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).lte(other);
  }

  /**
   * The Decimal equivalent of >. Returns true if 'value' is greater than 'other'.
   */
  public static gt(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).gt(other);
  }

  /**
   * The Decimal equivalent of >=. Returns true if 'value' is greater than or equal to 'other'.
   */
  public static gte(value: DecimalSource, other: DecimalSource): boolean {
    return D(value).gte(other);
  }

  /**
   * Returns whichever of 'value' and 'other' is higher.
   */
  public static max(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).max(other);
  }

  /**
   * Returns whichever of 'value' and 'other' is lower.
   */
  public static min(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).min(other);
  }

  /**
   * Returns whichever of 'value' and 'other' has a larger absolute value.
   */
  public static minabs(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).minabs(other);
  }

  /**
   * Returns whichever of 'value' and 'other' has a smaller absolute value.
   */
  public static maxabs(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).maxabs(other);
  }

  /**
   * A combination of minimum and maximum: the value returned by clamp is normally 'value', but it won't go below 'min' and it won't go above 'max'.
   * Therefore, if 'value' < 'min', then 'min' is returned, and if 'value' > 'max', then 'max' is returned.
   */
  public static clamp(value: DecimalSource, min: DecimalSource, max: DecimalSource): Decimal {
    return D(value).clamp(min, max);
  }

  /**
   * Returns 'value', unless 'value' is less than 'min', in which case 'min' is returned.
   */
  public static clampMin(value: DecimalSource, min: DecimalSource): Decimal {
    return D(value).clampMin(min);
  }

  /**
   * Returns 'value', unless 'value' is greater than 'max', in which case 'max' is returned.
   */
  public static clampMax(value: DecimalSource, max: DecimalSource): Decimal {
    return D(value).clampMax(max);
  }

  /**
   * Returns 1 if 'value' is greater than 'other', returns -1 if 'value' is less than 'other', returns 0 if 'value' is equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static cmp_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): CompareResult {
    return D(value).cmp_tolerance(other, tolerance);
  }

  /**
   * Returns 1 if 'value' is greater than 'other', returns -1 if 'value' is less than 'other', returns 0 if 'value' is equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static compare_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): CompareResult {
    return D(value).cmp_tolerance(other, tolerance);
  }

  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static eq_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).eq_tolerance(other, tolerance);
  }

  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static equals_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).eq_tolerance(other, tolerance);
  }

  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static neq_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).neq_tolerance(other, tolerance);
  }

  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static notEquals_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).notEquals_tolerance(other, tolerance);
  }

  /**
   * Returns true if 'value' is less than 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static lt_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).lt_tolerance(other, tolerance);
  }

  /**
   * Returns true if 'value' is less than or equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static lte_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).lte_tolerance(other, tolerance);
  }

  /**
   * Returns true if 'value' is greater than 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static gt_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).gt_tolerance(other, tolerance);
  }

  /**
   * Returns true if 'value' is greater than or equal to 'other'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public static gte_tolerance(
    value: DecimalSource,
    other: DecimalSource,
    tolerance: number
  ): boolean {
    return D(value).gte_tolerance(other, tolerance);
  }

  /**
   * "Positive log10": Returns the base-10 logarithm of nonnegative Decimals, but returns 0 for negative Decimals. 
   */
  public static pLog10(value: DecimalSource): Decimal {
    return D(value).pLog10();
  }

  /**
   * Returns the base-10 logarithm of abs('value').
   */
  public static absLog10(value: DecimalSource): Decimal {
    return D(value).absLog10();
  }

  /**
   * Base-10 logarithm: returns the Decimal X such that 10^X = 'value'.
   * For numbers above layer 0, this is equivalent to subtracting 1 from layer and normalizing.
   */
  public static log10(value: DecimalSource): Decimal {
    return D(value).log10();
  }

  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'value'.
   */
  public static log(value: DecimalSource, base: DecimalSource): Decimal {
    return D(value).log(base);
  }

  /**
   * Base-2 logarithm: returns the Decimal X such that 2^X = 'value'.
   */
  public static log2(value: DecimalSource): Decimal {
    return D(value).log2();
  }

  /**
   * Base-e logarithm, also known as the "natural" logarithm: returns the Decimal X such that e^X = 'value'.
   */
  public static ln(value: DecimalSource): Decimal {
    return D(value).ln();
  }

  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'value'.
   */
  public static logarithm(value: DecimalSource, base: DecimalSource): Decimal {
    return D(value).logarithm(base);
  }

  /**
   * Exponentiation: Returns the result of 'value' ^ 'other' (often written as 'value' ** 'other' in programming languages).
   */
  public static pow(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).pow(other);
  }

  /**
   * Raises 10 to the power of 'value', i.e. (10^'value'). For positive numbers above 1, this is equivalent to adding 1 to the value's layer and normalizing.
   */
  public static pow10(value: DecimalSource): Decimal {
    return D(value).pow10();
  }

  /**
   * Roots are one of the inverses of exponentiation: this function finds the Decimal X such that X ^ 'other' = 'value'.
   * Equivalent to 'value' ^ (1 / 'other'), which is written here as value.pow(other.recip()).
   */
  public static root(value: DecimalSource, other: DecimalSource): Decimal {
    return D(value).root(other);
  }

  /**
   * For positive integers, X factorial (written as X!) equals X * (X - 1) * (X - 2) *... * 3 * 2 * 1. 0! equals 1.
   * This can be extended to real numbers (except for negative integers) via the gamma function, which is what this function does.
   */
  public static factorial(value: DecimalSource, _other?: never): Decimal {
    return D(value).factorial();
  }

  /**
   * The gamma function extends the idea of factorials to non-whole numbers using some calculus.
   * Gamma(x) is defined as the integral of t^(x-1) * e^-t dt from t = 0 to t = infinity,
   * and gamma(x) = (x - 1)! for nonnegative integer x, so the factorial for non-whole numbers is defined using the gamma function.
   */
  public static gamma(value: DecimalSource, _other?: never): Decimal {
    return D(value).gamma();
  }

  /**
   * Returns the natural (base-e) logarithm of Gamma('value').
   */
  public static lngamma(value: DecimalSource, _other?: never): Decimal {
    return D(value).lngamma();
  }

  /**
   * Base-e exponentiation: returns e^'value'.
   */
  public static exp(value: DecimalSource): Decimal {
    return D(value).exp();
  }

  /**
   * Squaring a number means multiplying it by itself, a.k.a. raising it to the second power.
   */
  public static sqr(value: DecimalSource): Decimal {
    return D(value).sqr();
  }

  /**
   * Square root: finds the Decimal X such that X * X, a.k.a X^2, equals 'value'. Equivalent to X^(1/2).
   */
  public static sqrt(value: DecimalSource): Decimal {
    return D(value).sqrt();
  }

  /**
   * Cubing a number means raising it to the third power.
   */
  public static cube(value: DecimalSource): Decimal {
    return D(value).cube();
  }

  /**
   * Cube root: finds the Decimal X such that X^3 equals 'value'. Equivalent to X^(1/3).
   */
  public static cbrt(value: DecimalSource): Decimal {
    return D(value).cbrt();
  }

  /**
   *
   * Tetration: The result of exponentiating 'value' to 'value' 'height' times in a row.  https://en.wikipedia.org/wiki/Tetration
   * 
   * If payload != 1, then this is 'iterated exponentiation', the result of exping 'payload' to base 'value' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public static tetrate(
    value: DecimalSource,
    height = 2,
    payload: DecimalSource = FC_NN(1, 0, 1),
    linear = false
  ): Decimal {
    return D(value).tetrate(height, payload, linear);
  }

  /**
   * Iterated exponentiation, the result of exping 'payload' to base 'value' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * Identical to tetrate.
   */
  public static iteratedexp(value: DecimalSource, height = 2, payload = FC_NN(1, 0, 1), linear = false): Decimal {
    return D(value).iteratedexp(height, payload, linear);
  }

  /**
   * iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting 'times' from the number's slog representation. Equivalent to tetrating to a negative height.
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public static iteratedlog(value: DecimalSource, base: DecimalSource = 10, times = 1, linear = false): Decimal {
    return D(value).iteratedlog(base, times, linear);
  }

  /**
   * Adds/removes layers from a Decimal, even fractional layers (e.g. its slog10 representation). Very similar to tetrate base 10 and iterated log base 10.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public static layeradd10(value: DecimalSource, diff: DecimalSource, linear = false): Decimal {
    return D(value).layeradd10(diff, linear);
  }

  /**
   * layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public static layeradd(value: DecimalSource, diff: number, base : DecimalSource = 10, linear = false): Decimal {
    return D(value).layeradd(diff, base, linear);
  }

  /**
   * Super-logarithm, one of tetration's inverses, tells you what size power tower you'd have to tetrate 'base' to to get 'value'. https://en.wikipedia.org/wiki/Super-logarithm
   * 
   * By definition, will never be higher than 1.8e308 in break_eternity.js, since a power tower 1.8e308 numbers tall is the largest representable number.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming tetration as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public static slog(value: DecimalSource, base : DecimalSource = 10, linear = false): Decimal {
    return D(value).slog(base, 100, linear);
  }

  /**
   * The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
   * https://en.wikipedia.org/wiki/Lambert_W_function
   * 
   * This is a multi-valued function in the complex plane, but only two branches matter for real numbers: the "principal branch" W0, and the "non-principal branch" W_-1.
   * W_0 works for any number >= -1/e, but W_-1 only works for negative numbers >= -1/e.
   * The "principal" parameter, which is true by default, decides which branch we're looking for: W_0 is used if principal is true, W_-1 is used if principal is false.
   */
  public static lambertw(value: DecimalSource, principal : boolean): Decimal {
    return D(value).lambertw(principal);
  }

  /**
   * The super square-root function - what number, tetrated to height 2, equals 'value'? https://en.wikipedia.org/wiki/Tetration#Super-root
   */
  public static ssqrt(value: DecimalSource): Decimal {
    return D(value).ssqrt();
  }

  /**
   * Super-root, one of tetration's inverses - what number, tetrated to height 'degree', equals 'value'? https://en.wikipedia.org/wiki/Tetration#Super-root
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   * This only matters for non-integer degrees.
   */
  public static linear_sroot(value: DecimalSource, degree: number): Decimal {
    return D(value).linear_sroot(degree);
  }

  /**
   * Pentation/pentate: The result of tetrating 'height' times in a row. An absurdly strong operator - Decimal.pentate(2, 4.28) and Decimal.pentate(10, 2.37) are already too huge for break_eternity.js!
   * https://en.wikipedia.org/wiki/Pentation
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  public static pentate(
    value: DecimalSource,
    height = 2,
    payload: DecimalSource = FC_NN(1, 0, 1),
    linear = false
  ): Decimal {
    return D(value).pentate(height, payload, linear);
  }

  /**
   * Penta-logarithm, one of pentation's inverses, tells you what height you'd have to pentate 'base' to to get 'value'.
   * 
   * Grows incredibly slowly. For bases above 2, you won't be seeing a result greater than 5 out of this function.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming pentation as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  public static penta_log(value: DecimalSource, base : DecimalSource = 10, linear = false): Decimal {
    return D(value).penta_log(base, 100, linear);
  }

  /**
   * Penta-root, one of pentation's inverses - what number, pentated to height 'degree', equals 'value'?
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   */
  public static linear_penta_root(value: DecimalSource, degree: number): Decimal {
    return D(value).linear_penta_root(degree);
  }

  /**
   * The sine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  public static sin(value: DecimalSource): Decimal {
    return D(value).sin();
  }

  /**
   * The cosine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  public static cos(value: DecimalSource): Decimal {
    return D(value).cos();
  }

  /**
   * The tangent function, equal to sine divided by cosine. Behaves periodically with period pi.
   */
  public static tan(value: DecimalSource): Decimal {
    return D(value).tan();
  }

  /**
   * The arcsine function, the inverse of the sine function.
   */
  public static asin(value: DecimalSource): Decimal {
    return D(value).asin();
  }

  /**
   * The arccosine function, the inverse of the cosine function.
   */
  public static acos(value: DecimalSource): Decimal {
    return D(value).acos();
  }

  /**
   * The arctangent function, the inverse of the tangent function.
   */
  public static atan(value: DecimalSource): Decimal {
    return D(value).atan();
  }

  /**
   * Hyperbolic sine: sinh(X) = (e^x - e^-x)/2.
   */
  public static sinh(value: DecimalSource): Decimal {
    return D(value).sinh();
  }

  /**
   * Hyperbolic cosine: cosh(x) = (e^x + e^-x)/2.
   */
  public static cosh(value: DecimalSource): Decimal {
    return D(value).cosh();
  }

  /**
   * Hyperbolic tangent: tanh(x) = sinh(x)/cosh(x).
   */
  public static tanh(value: DecimalSource): Decimal {
    return D(value).tanh();
  }

  /**
   * Hyperbolic arcsine, the inverse of hyperbolic sine.
   */
  public static asinh(value: DecimalSource): Decimal {
    return D(value).asinh();
  }

  /**
   * Hyperbolic arccosine, the inverse of hyperbolic cosine.
   */
  public static acosh(value: DecimalSource): Decimal {
    return D(value).acosh();
  }

  /**
   * Hyperbolic arcctangent, the inverse of hyperbolic tangent.
   */
  public static atanh(value: DecimalSource): Decimal {
    return D(value).atanh();
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

  /**
   * Turns the Decimal into a valid Decimal. This function is meant for internal purposes - users of this library should not need to use normalize.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public normalize(): this {
    /*
    PSEUDOCODE:
    Whenever we are partially 0 (sign is 0 or mag and layer is 0), make it fully 0.
    Whenever we are at or hit layer 0, extract sign from negative mag.
    If layer === 0 and mag < FIRST_NEG_LAYER (1/9e15), shift to 'first negative layer' (add layer, log10 mag).
    While abs(mag) > EXP_LIMIT (9e15), layer += 1, mag = maglog10(mag).
    While abs(mag) < LAYER_DOWN (15.954) and layer > 0, layer -= 1, mag = pow(10, mag).

    When we're done, all of the following should be true OR one of the numbers is not IsFinite OR layer is not IsInteger (error state):
    Any 0 is totally zero (0, 0, 0) and any NaN is totally NaN (NaN, NaN, NaN).
    Anything layer 0 has mag 0 OR mag > 1/9e15 and < 9e15.
    Anything layer 1 or higher has abs(mag) >= 15.954 and < 9e15.
    Any positive infinity is (1, Infinity, Infinity) and any negative infinity is (-1, Infinity, Infinity).
    We will assume in calculations that all Decimals are either erroneous or satisfy these criteria. (Otherwise: Garbage in, garbage out.)
    */

    //Any 0 is totally 0
    if (this.sign === 0 || (this.mag === 0 && this.layer === 0) || (this.mag === Number.NEGATIVE_INFINITY && this.layer > 0 && Number.isFinite(this.layer))) {
      this.sign = 0;
      this.mag = 0;
      this.layer = 0;
      return this;
    }

    //extract sign from negative mag at layer 0
    if (this.layer === 0 && this.mag < 0) {
      this.mag = -this.mag;
      this.sign = -this.sign;
    }
    
    //Handle infinities
    if (this.mag === Number.POSITIVE_INFINITY || this.layer === Number.POSITIVE_INFINITY || this.mag === Number.NEGATIVE_INFINITY || this.layer === Number.NEGATIVE_INFINITY) {
        this.mag = Number.POSITIVE_INFINITY;
        this.layer = Number.POSITIVE_INFINITY;
      return this;
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

    if (Number.isNaN(this.sign) || Number.isNaN(this.layer) || Number.isNaN(this.mag)) {
      this.sign = Number.NaN;
      this.layer = Number.NaN;
      this.mag = Number.NaN;
    }

    return this;
  }

  /**
   * Turns the given components into a valid Decimal.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromComponents(sign: number, layer: number, mag: number): this {
    this.sign = sign;
    this.layer = layer;
    this.mag = mag;

    this.normalize();
    return this;
  }

  /**
   * Turns the given components into a Decimal, but not necessarily a valid one (it's only valid if the components would already create a valid Decimal without normalization). Users of this library should not use this function.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromComponents_noNormalize(sign: number, layer: number, mag: number): this {
    this.sign = sign;
    this.layer = layer;
    this.mag = mag;
    return this;
  }

  /**
   * Turns the mantissa and exponent into a valid Decimal with value mantissa * 10^exponent.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromMantissaExponent(mantissa: number, exponent: number): this {
    this.layer = 1;
    this.sign = Math.sign(mantissa);
    mantissa = Math.abs(mantissa);
    this.mag = exponent + Math.log10(mantissa);

    this.normalize();
    return this;
  }

  /**
   * Turns the mantissa and exponent into a Decimal, but not necessarily a valid one. Users of this library should not use this function.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromMantissaExponent_noNormalize(mantissa: number, exponent: number): this {
    //The idea of 'normalizing' a break_infinity.js style Decimal doesn't really apply. So just do the same thing.
    this.fromMantissaExponent(mantissa, exponent);
    return this;
  }

  /**
   * Turns the Decimal that this function is called on into a deep copy of the provided value.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromDecimal(value: Decimal): this {
    this.sign = value.sign;
    this.layer = value.layer;
    this.mag = value.mag;
    return this;
  }

  /**
   * Converts a floating-point number into a Decimal.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromNumber(value: number): this {
    this.mag = Math.abs(value);
    this.sign = Math.sign(value);
    this.layer = 0;
    this.normalize();
    return this;
  }

  /**
   * Converts a string into a Decimal.
   * 
   * If linearhyper4 is true, then strings like "10^^8.5" will use the linear approximation of tetration even for bases <= 10.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
  public fromString(value: string, linearhyper4: boolean = false): Decimal {
    const originalValue = value;
    const cached = Decimal.fromStringCache.get(originalValue);
    if (cached !== undefined) {
      return this.fromDecimal(cached);
    }
    if (IGNORE_COMMAS) {
      value = value.replace(",", "");
    } else if (COMMAS_ARE_DECIMAL_POINTS) {
      value = value.replace(",", ".");
    }
	
	if (value.toLowerCase() === 'nan') {
	  return this.fromDecimal(Decimal.dNaN);
	}
	if (value.toLowerCase() === 'infinity') {
	  return this.fromDecimal(Decimal.dInf);
	}
	if (value.toLowerCase() === '-infinity') {
	  return this.fromDecimal(Decimal.dNegInf);
	}

    //Handle x^^^y format. Note that no linearhyper5 parameter is needed, as pentation has no analytic approximation.
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
        const result = Decimal.pentate(base, height, payload, linearhyper4);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
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
        const result = Decimal.tetrate(base, height, payload, linearhyper4);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
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
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
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
      let negative = false;
      if (ptparts[0][0] == "-") {
        negative = true;
        ptparts[0] = ptparts[0].slice(1);
      }
      height = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      let payload = parseFloat(ptparts[1]);
      if (!isFinite(payload)) {
        payload = 1;
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.tetrate(base, height, payload, linearhyper4);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
        if (negative) this.sign *= -1;
        return this;
      }
    }

    //handle XpY format (it's the same thing just with p).
    ptparts = value.split("p");
    if (ptparts.length === 2) {
      base = 10;
      let negative = false;
      if (ptparts[0][0] == "-") {
        negative = true;
        ptparts[0] = ptparts[0].slice(1);
      }
      height = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      let payload = parseFloat(ptparts[1]);
      if (!isFinite(payload)) {
        payload = 1;
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.tetrate(base, height, payload, linearhyper4);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
        if (negative) this.sign *= -1;
        return this;
      }
    }

    //handle XFY format
    ptparts = value.split("f");
    if (ptparts.length === 2) {
      base = 10;
      let negative = false;
      if (ptparts[0][0] == "-") {
        negative = true;
        ptparts[0] = ptparts[0].slice(1);
      }
      ptparts[0] = ptparts[0].replace("(", "");
      ptparts[0] = ptparts[0].replace(")", "");
      let payload = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      height = parseFloat(ptparts[1]);
      if (!isFinite(payload)) {
        payload = 1;
      }
      if (isFinite(base) && isFinite(height)) {
        const result = Decimal.tetrate(base, height, payload, linearhyper4);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
        if (negative) this.sign *= -1;
        return this;
      }
    }

    const parts = value.split("e");
    const ecount = parts.length - 1;

    //Handle numbers that are exactly floats (0 or 1 es).
    if (ecount === 0) {
      const numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt)) {
        this.fromNumber(numberAttempt);
        if (Decimal.fromStringCache.size >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
        return this;
      }
    } else if (ecount === 1) {
      //Very small numbers ("2e-3000" and so on) may look like valid floats but round to 0.
	  //Additionally, small numbers (like 1e-308) look like valid floats but are starting to lose precision.
      const numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt) && Math.abs(numberAttempt) > 1e-307) {
        this.fromNumber(numberAttempt);
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
        return this;
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
          // Handle invalid cases like (e^-8)1 and (e^10.5)1 by just calling tetrate
          if (this.layer < 0 || (this.layer % 1 != 0)) {
            const result = Decimal.tetrate(10, this.layer, this.mag, linearhyper4);
            this.sign = result.sign;
            this.layer = result.layer;
            this.mag = result.mag;
          }
          this.normalize();
          if (Decimal.fromStringCache.maxSize >= 1) {
            Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
          }
          return this;
        }
      }
    }

    if (ecount < 1) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
      if (Decimal.fromStringCache.maxSize >= 1) {
        Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
      }
      return this;
    }
    const mantissa = parseFloat(parts[0]);
    if (mantissa === 0) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
      if (Decimal.fromStringCache.maxSize >= 1) {
        Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
      }
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
        if (Decimal.fromStringCache.maxSize >= 1) {
          Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
        }
        return this;
      } else {
        //at eee and above, mantissa is too small to be recognizable!
        this.mag = exponent;
      }
    }

    this.normalize();
    if (Decimal.fromStringCache.maxSize >= 1) {
      Decimal.fromStringCache.set(originalValue, Decimal.fromDecimal(this));
    }
    return this;
  }

  /**
   * The function used by new Decimal() to create a new Decimal. Accepts a DecimalSource: uses fromNumber if given a number, uses fromString if given a string, and uses fromDecimal if given a Decimal.
   * 
   * Note: this function mutates the Decimal it is called on.
   */
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

  /**
   * Returns the numeric value of the Decimal it's called on. Will return Infinity (or -Infinity for negatives) for Decimals that are larger than Number.MAX_VALUE.
   */
  public toNumber(): number {
    if (this.mag === Number.POSITIVE_INFINITY && this.layer === Number.POSITIVE_INFINITY && this.sign === 1) {
      return Number.POSITIVE_INFINITY;
    }
    if (this.mag === Number.POSITIVE_INFINITY && this.layer === Number.POSITIVE_INFINITY && this.sign === -1) {
      return Number.NEGATIVE_INFINITY;
    }
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

  /**
   * Returns a string representation of the Decimal it's called on.
   * This string is written as a plain number for most layer 0 numbers, in scientific notation for layer 1 numbers (and layer 0 numbers below 1e-6),
   * in "ee...X" form for numbers from layers 2 to 5, and in (e^N)X form for layer > 5.
   */
  public toString(): string {
    if (isNaN(this.layer) || isNaN(this.sign) || isNaN(this.mag)) {
      return "NaN";
    }
    if (this.mag === Number.POSITIVE_INFINITY || this.layer === Number.POSITIVE_INFINITY) {
      return this.sign === 1 ? "Infinity" : "-Infinity";
    }

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

  /**
   * Absolute value function: returns 'this' if 'this' >= 0, returns the negative of 'this' if this < 0.
   */
  public abs(): Decimal {
    return FC_NN(this.sign === 0 ? 0 : 1, this.layer, this.mag);
  }

  /**
   * Negates the Decimal it's called on: in other words, when given X, returns -X.
   */
  public neg(): Decimal {
    return FC_NN(-this.sign, this.layer, this.mag);
  }

  /**
   * Negates the Decimal it's called on: in other words, when given X, returns -X.
   */
  public negate(): Decimal {
    return this.neg();
  }

  /**
   * Negates the Decimal it's called on: in other words, when given X, returns -X.
   */
  public negated(): Decimal {
    return this.neg();
  }

  // public sign () {
  //     return this.sign;
  //   }

  /**
   * Returns the sign of the Decimal it's called on. (Though, since sign is a public data member of Decimal, you might as well just call .sign instead of .sgn())
   */
  public sgn(): number {
    return this.sign;
  }

  /**
   * Rounds the Decimal it's called on to the nearest integer.
   */
  public round(): Decimal {
    if (this.mag < 0) {
      return FC_NN(0, 0, 0);
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.round(this.mag));
    }
    return new Decimal(this);
  }

  /**
   * "Rounds" the Decimal it's called on to the nearest integer that's less than or equal to it.
   */
  public floor(): Decimal {
    if (this.mag < 0) {
      if (this.sign === -1) return FC_NN(-1, 0, 1);
      else return FC_NN(0, 0, 0);
    }
    if (this.sign === -1) return this.neg().ceil().neg();
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.floor(this.mag));
    }
    return new Decimal(this);
  }

  /**
   * "Rounds" the Decimal it's called on to the nearest integer that's greater than or equal to it.
   */
  public ceil(): Decimal {
    if (this.mag < 0) {
      if (this.sign === 1) return FC_NN(1, 0, 1); //The ceiling function called on something tiny like 10^10^-100 should return 1, since 10^10^-100 is still greater than 0
      else return FC_NN(0, 0, 0);
    }
    if (this.sign === -1) return this.neg().floor().neg();
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.ceil(this.mag));
    }
    return new Decimal(this);
  }

  /**
   * Extracts the integer part of the Decimal and returns it. Behaves like floor on positive numbers, but behaves like ceiling on negative numbers.
   */
  public trunc(): Decimal {
    if (this.mag < 0) {
      return FC_NN(0, 0, 0);
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.trunc(this.mag));
    }
    return new Decimal(this);
  }

  /**
   * Addition: returns the sum of 'this' and 'value'.
   */
  public add(value: DecimalSource): this | Decimal {
    const decimal = D(value);

    //Infinity + -Infinity = NaN
    if ((this.eq(Decimal.dInf) && decimal.eq(Decimal.dNegInf)) || (this.eq(Decimal.dNegInf) && decimal.eq(Decimal.dInf))) {
      return new Decimal(Decimal.dNaN);
    }

    //inf/nan check
    if (!Number.isFinite(this.layer)) {
      return new Decimal(this);
    }
    if (!Number.isFinite(decimal.layer)) {
      return new Decimal(decimal);
    }

    //Special case - if one of the numbers is 0, return the other number.
    if (this.sign === 0) {
      return new Decimal(decimal);
    }
    if (decimal.sign === 0) {
      return new Decimal(this);
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
      a = new Decimal(this);
      b = new Decimal(decimal);
    } else {
      a = new Decimal(decimal);
      b = new Decimal(this);
    }

    if (a.layer === 0 && b.layer === 0) {
      return Decimal.fromNumber(a.sign * a.mag + b.sign * b.mag);
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

  /**
   * Addition: returns the sum of 'this' and 'value'.
   */
  public plus(value: DecimalSource): Decimal {
    return this.add(value);
  }

  /**
   * Subtraction: returns the difference between 'this' and 'value'.
   */
  public sub(value: DecimalSource): Decimal {
    return this.add(D(value).neg());
  }

  /**
   * Subtraction: returns the difference between 'this' and 'value'.
   */
  public subtract(value: DecimalSource): Decimal {
    return this.sub(value);
  }

  /**
   * Subtraction: returns the difference between 'this' and 'value'.
   */
  public minus(value: DecimalSource): Decimal {
    return this.sub(value);
  }

  /**
   * Multiplication: returns the product of 'this' and 'value'.
   */
  public mul(value: DecimalSource): Decimal {
    const decimal = D(value);

    // Infinity * -Infinity = -Infinity
    if ((this.eq(Decimal.dInf) && decimal.eq(Decimal.dNegInf)) || (this.eq(Decimal.dNegInf) && decimal.eq(Decimal.dInf))) {
      return new Decimal(Decimal.dNegInf);
    }

    //Infinity * 0 = NaN
    if ((this.mag == Number.POSITIVE_INFINITY && decimal.eq(Decimal.dZero)) || (this.eq(Decimal.dZero) && this.mag == Number.POSITIVE_INFINITY)) {
      return new Decimal(Decimal.dNaN);
    }

    // -Infinity * -Infinity = Infinity
    if ((this.eq(Decimal.dNegInf) && decimal.eq(Decimal.dNegInf))) {
      return new Decimal(Decimal.dInf);
    }

    //inf/nan check
    if (!Number.isFinite(this.layer)) {
      return new Decimal(this);
    }
    if (!Number.isFinite(decimal.layer)) {
      return new Decimal(decimal);
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
      a = new Decimal(this);
      b = new Decimal(decimal);
    } else {
      a = new Decimal(decimal);
      b = new Decimal(this);
    }

    if (a.layer === 0 && b.layer === 0) {
      return Decimal.fromNumber(a.sign * b.sign * a.mag * b.mag);
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

  /**
   * Multiplication: returns the product of 'this' and 'value'.
   */
  public multiply(value: DecimalSource): Decimal {
    return this.mul(value);
  }

  /**
   * Multiplication: returns the product of 'this' and 'value'.
   */
  public times(value: DecimalSource): Decimal {
    return this.mul(value);
  }

  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  public div(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.mul(decimal.recip());
  }

  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  public divide(value: DecimalSource): Decimal {
    return this.div(value);
  }

  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  public divideBy(value: DecimalSource): Decimal {
    return this.div(value);
  }

  /**
   * Division: returns the quotient of 'this' and 'value'.
   */
  public dividedBy(value: DecimalSource): Decimal {
    return this.div(value);
  }

  /**
   * Returns the reciprocal (1 / X) of the Decimal it's called on.
   */
  public recip(): Decimal {
    if (this.mag === 0) {
      return new Decimal(Decimal.dNaN);
    } 
    else if (this.mag === Number.POSITIVE_INFINITY) {
      return FC_NN(0, 0, 0);
    }
    else if (this.layer === 0) {
      return FC(this.sign, 0, 1 / this.mag);
    } else {
      return FC(this.sign, this.layer, -this.mag);
    }
  }

  /**
   * Returns the reciprocal (1 / X) of the Decimal it's called on.
   */
  public reciprocal(): Decimal {
    return this.recip();
  }

  /**
   * Returns the reciprocal (1 / X) of the Decimal it's called on.
   */
  public reciprocate(): Decimal {
    return this.recip();
  }

  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  //Taken from OmegaNum.js, with a couple touch-ups
  public mod(value: DecimalSource, floored : boolean = false): Decimal {
    const vd = D(value);
    const decimal = vd.abs();

    if (this.eq(Decimal.dZero) || decimal.eq(Decimal.dZero)) return FC_NN(0, 0, 0);
    if (floored) {
      let absmod = this.abs().mod(decimal);
      if ((this.sign == -1) != (vd.sign == -1)) absmod = vd.abs().sub(absmod);
      return absmod.mul(vd.sign);
    }
    const num_this = this.toNumber();
    const num_decimal = decimal.toNumber();
    //Special case: To avoid precision issues, if both numbers are valid JS numbers, just call % on those
    if (isFinite(num_this) && isFinite(num_decimal) && num_this != 0 && num_decimal != 0) {
      return new Decimal(num_this % num_decimal);
    }
    if (this.sub(decimal).eq(this)) {
      //decimal is too small to register to this
      return FC_NN(0, 0, 0);
    }
    if (decimal.sub(this).eq(decimal)) {
      //this is too small to register to decimal
      return new Decimal(this);
    }
    if (this.sign == -1) return this.abs().mod(decimal).neg();
    return this.sub(this.div(decimal).floor().mul(decimal));
  }

  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  public modulo(value: DecimalSource, floored : boolean = false) : Decimal {
    return this.mod(value, floored);
  }

  /**
   * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
   * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
   * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
   * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
   */
  public modular(value: DecimalSource, floored : boolean = false) : Decimal {
    return this.mod(value, floored);
  }

  /**
   * Returns 1 if 'this' > 'value', returns -1 if 'this' < 'value', returns 0 if 'this' == 'value'.
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

  /**
   * Compares the absolute values of this and value.
   * Returns 1 if |'this'| > |'value'|, returns -1 if |'this'| < |'value'|, returns 0 if |'this'| == |'value'|.
   */
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

  /**
   * Returns 1 if 'this' > 'value', returns -1 if 'this' < 'value', returns 0 if 'this' == 'value'.
   */
  public compare(value: DecimalSource): CompareResult {
    return this.cmp(value);
  }

  /**
   * Returns true if the Decimal is an NaN value.
   */
  public isNan(): boolean {
    return isNaN(this.sign) || isNaN(this.layer) || isNaN(this.mag);
  }

  /**
   * Returns true if the Decimal is finite (by Decimal standards, not by floating point standards - a humongous Decimal like 10^^10^100 is still finite!)
   */
  public isFinite(): boolean {
    return isFinite(this.sign) && isFinite(this.layer) && isFinite(this.mag);
  }

  /**
   * The Decimal equivalent of ==. Returns true if 'this' and 'value' have equal values.
   */
  public eq(value: DecimalSource): boolean {
    const decimal = D(value);
    return this.sign === decimal.sign && this.layer === decimal.layer && this.mag === decimal.mag;
  }

  /**
   * Returns true if 'this' and 'value' have equal values.
   */
  public equals(value: DecimalSource): boolean {
    return this.eq(value);
  }

  /**
   * The Decimal equivalent of !=. Returns true if 'this' and 'value' do not have equal values.
   */
  public neq(value: DecimalSource): boolean {
    return !this.eq(value);
  }

  /**
   * Returns true if 'this' and 'value' do not have equal values.
   */
  public notEquals(value: DecimalSource): boolean {
    return this.neq(value);
  }

  /**
   * The Decimal equivalent of <. Returns true if 'this' is less than 'value'.
   */
  public lt(value: DecimalSource): boolean {
    return this.cmp(value) === -1;
  }

  /**
   * The Decimal equivalent of <=. Returns true if 'this' is less than or equal to 'value'.
   */
  public lte(value: DecimalSource): boolean {
    return !this.gt(value);
  }

  /**
   * The Decimal equivalent of >. Returns true if 'this' is greater than 'value'.
   */
  public gt(value: DecimalSource): boolean {
    return this.cmp(value) === 1;
  }

  /**
   * The Decimal equivalent of >=. Returns true if 'this' is greater than or equal to 'value'.
   */
  public gte(value: DecimalSource): boolean {
    return !this.lt(value);
  }

  /**
   * Returns whichever of 'this' and 'value' is higher.
   */
  public max(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.lt(decimal) ? new Decimal(decimal) : new Decimal(this);
  }

  /**
   * Returns whichever of 'this' and 'value' is lower.
   */
  public min(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.gt(decimal) ? new Decimal(decimal) : new Decimal(this);
  }

  /**
   * Returns whichever of 'this' and 'value' has a larger absolute value.
   */
  public maxabs(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.cmpabs(decimal) < 0 ? new Decimal(decimal) : new Decimal(this);
  }

  /**
   * Returns whichever of 'this' and 'value' has a smaller absolute value.
   */
  public minabs(value: DecimalSource): Decimal {
    const decimal = D(value);
    return this.cmpabs(decimal) > 0 ? new Decimal(decimal) : new Decimal(this);
  }

  /**
   * A combination of minimum and maximum: the value returned by clamp is normally 'this', but it won't go below 'min' and it won't go above 'max'.
   * Therefore, if 'this' < 'min', then 'min' is returned, and if 'this' > 'max', then 'max' is returned.
   */
  public clamp(min: DecimalSource, max: DecimalSource): Decimal {
    return this.max(min).min(max);
  }

  /**
   * Returns 'this', unless 'this' is less than 'min', in which case 'min' is returned.
   */
  public clampMin(min: DecimalSource): Decimal {
    return this.max(min);
  }

  /**
   * Returns 'this', unless 'this' is greater than 'max', in which case 'max' is returned.
   */
  public clampMax(max: DecimalSource): Decimal {
    return this.min(max);
  }

  /**
   * Returns 1 if 'this' is greater than 'value', returns -1 if 'this' is less than 'value', returns 0 if 'this' is equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public cmp_tolerance(value: DecimalSource, tolerance: number): CompareResult {
    const decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) ? 0 : this.cmp(decimal);
  }

  /**
   * Returns 1 if 'this' is greater than 'value', returns -1 if 'this' is less than 'value', returns 0 if 'this' is equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public compare_tolerance(value: DecimalSource, tolerance: number): CompareResult {
    return this.cmp_tolerance(value, tolerance);
  }

  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
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

  /**
   * Tests whether two Decimals are approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public equals_tolerance(value: DecimalSource, tolerance: number): boolean {
    return this.eq_tolerance(value, tolerance);
  }

  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public neq_tolerance(value: DecimalSource, tolerance: number): boolean {
    return !this.eq_tolerance(value, tolerance);
  }

  /**
   * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public notEquals_tolerance(value: DecimalSource, tolerance: number): boolean {
    return this.neq_tolerance(value, tolerance);
  }

  /**
   * Returns true if 'this' is less than 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public lt_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return !this.eq_tolerance(decimal, tolerance) && this.lt(decimal);
  }

  /**
   * Returns true if 'this' is less than or equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public lte_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) || this.lt(decimal);
  }

  /**
   * Returns true if 'this' is greater than 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public gt_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return !this.eq_tolerance(decimal, tolerance) && this.gt(decimal);
  }

  /**
   * Returns true if 'this' is greater than or equal to 'value'.
   * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public gte_tolerance(value: DecimalSource, tolerance: number): boolean {
    const decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) || this.gt(decimal);
  }

  /**
   * "Positive log10": Returns the base-10 logarithm of nonnegative Decimals, but returns 0 for negative Decimals. 
   */
  public pLog10(): Decimal {
    if (this.lt(Decimal.dZero)) {
      return FC_NN(0, 0, 0);
    }
    return this.log10();
  }

  /**
   * Returns the base-10 logarithm of abs('this').
   */
  public absLog10(): Decimal {
    if (this.sign === 0) {
      return new Decimal(Decimal.dNaN);
    } else if (this.layer > 0) {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    } else {
      return FC(1, 0, Math.log10(this.mag));
    }
  }

  /**
   * Base-10 logarithm: returns the Decimal X such that 10^X = 'this'.
   * For numbers above layer 0, this is equivalent to subtracting 1 from layer and normalizing.
   */
  public log10(): Decimal {
    if (this.sign <= 0) {
      return new Decimal(Decimal.dNaN);
    } else if (this.layer > 0) {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    } else {
      return FC(this.sign, 0, Math.log10(this.mag));
    }
  }

  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'this'.
   */
  public log(base: DecimalSource): Decimal {
    base = D(base);
    if (this.sign <= 0) {
      return new Decimal(Decimal.dNaN);
    }
    if (base.sign <= 0) {
      return new Decimal(Decimal.dNaN);
    }
    if (base.sign === 1 && base.layer === 0 && base.mag === 1) {
      return new Decimal(Decimal.dNaN);
    } else if (this.layer === 0 && base.layer === 0) {
      return FC(this.sign, 0, Math.log(this.mag) / Math.log(base.mag));
    }

    return Decimal.div(this.log10(), base.log10());
  }

  /**
   * Base-2 logarithm: returns the Decimal X such that 2^X = 'this'.
   */
  public log2(): Decimal {
    if (this.sign <= 0) {
      return new Decimal(Decimal.dNaN);
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

  /**
   * Base-e logarithm, also known as the "natural" logarithm: returns the Decimal X such that e^X = 'this'.
   */
  public ln(): Decimal {
    if (this.sign <= 0) {
      return new Decimal(Decimal.dNaN);
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

  /**
   * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'this'.
   */
  public logarithm(base: DecimalSource): Decimal {
    return this.log(base);
  }

  /**
   * Exponentiation: Returns the result of 'this' ^ 'value' (often written as 'this' ** 'value' in programming languages).
   */
  public pow(value: DecimalSource): Decimal {
    const decimal = D(value);
    const a = new Decimal(this);
    const b = new Decimal(decimal);

    //special case: if a is 0, then return 0 (UNLESS b is 0, then return 1)
    if (a.sign === 0) {
      return b.eq(0) ? FC_NN(1, 0, 1) : a;
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

    if (this.sign === -1) {
      if (Math.abs(b.toNumber() % 2) % 2 === 1) {
        return result.neg();
      } else if (Math.abs(b.toNumber() % 2) % 2 === 0) {
        return result;
      }
      return new Decimal(Decimal.dNaN);
    }

    return result;
  }

  /**
   * Raises 10 to the power of 'this', i.e. (10^'this'). For positive numbers above 1, this is equivalent to adding 1 to layer and normalizing.
   */
  public pow10(): Decimal {
    /*
    There are four cases we need to consider:
    1) positive sign, positive mag (e15, ee15): +1 layer (e.g. 10^15 becomes e15, 10^e15 becomes ee15)
    2) negative sign, positive mag (-e15, -ee15): +1 layer but sign and mag sign are flipped (e.g. 10^-15 becomes e-15, 10^-e15 becomes ee-15)
    3) positive sign, negative mag (e-15, ee-15): layer 0 case would have been handled in the Math.pow check, so just return 1
    4) negative sign, negative mag (-e-15, -ee-15): layer 0 case would have been handled in the Math.pow check, so just return 1
    */

    if (this.eq(Decimal.dInf)) {
      return new Decimal(Decimal.dInf);
    }
    if (this.eq(Decimal.dNegInf)) {
      return FC_NN(0, 0, 0);
    }
    if (!Number.isFinite(this.layer) || !Number.isFinite(this.mag)) {
      return new Decimal(Decimal.dNaN);
    }

    let a: Decimal = new Decimal(this);

    //handle layer 0 case - if no precision is lost just use Math.pow, else promote one layer
    if (a.layer === 0) {
      const newmag = Math.pow(10, a.sign * a.mag);
      if (Number.isFinite(newmag) && Math.abs(newmag) >= 0.1) {
        return FC(1, 0, newmag);
      } else {
        if (a.sign === 0) {
          return FC_NN(1, 0, 1);
        } else {
          a = FC_NN(a.sign, a.layer + 1, Math.log10(a.mag));
        }
      }
    }

    //handle all 4 layer 1+ cases individually
    if (a.sign > 0 && a.mag >= 0) {
      return FC(a.sign, a.layer + 1, a.mag);
    }
    if (a.sign < 0 && a.mag >= 0) {
      return FC(-a.sign, a.layer + 1, -a.mag);
    }
    //both the negative mag cases are identical: one +/- rounding error
    return FC_NN(1, 0, 1);
  }

  /**
   * Exponentiation: Returns the result of 'value' ^ 'this' (often written as 'value' ** 'this' in programming languages).
   */
  public pow_base(value: DecimalSource): Decimal {
    return D(value).pow(this);
  }

  /**
   * Roots are one of the inverses of exponentiation: this function finds the Decimal X such that X ^ 'value' = 'this'.
   * Equivalent to 'this' ^ (1 / 'value'), which is written here as this.pow(value.recip()).
   */
  public root(value: DecimalSource): Decimal {
    const decimal = D(value);
    if (this.lt(0) && decimal.mod(2, true).eq(1)) return this.neg().root(decimal).neg();
    return this.pow(decimal.recip());
  }

  /**
   * For positive integers, X factorial (written as X!) equals X * (X - 1) * (X - 2) *... * 3 * 2 * 1. 0! equals 1.
   * This can be extended to real numbers (except for negative integers) via the gamma function, which is what this function does.
   */
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

  /**
   * The gamma function extends the idea of factorials to non-whole numbers using some calculus.
   * Gamma(x) is defined as the integral of t^(x-1) * e^-t dt from t = 0 to t = infinity,
   * and gamma(x) = (x - 1)! for nonnegative integer x, so the factorial for non-whole numbers is defined using the gamma function.
   */
  //from HyperCalc source code
  public gamma(): Decimal {
    if (this.mag < 0) {
      return this.recip();
    } else if (this.layer === 0) {
      if (this.lt(FC_NN(1, 0, 24))) {
        return Decimal.fromNumber(f_gamma(this.sign * this.mag));
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

  /**
   * Returns the natural logarithm of Gamma('this').
   */
  public lngamma(): Decimal {
    return this.gamma().ln();
  }

  /**
   * Base-e exponentiation: returns e^'this'.
   */
  public exp(): Decimal {
    if (this.mag < 0) {
      return FC_NN(1, 0, 1);
    }
    if (this.layer === 0 && this.mag <= 709.7) {
      return Decimal.fromNumber(Math.exp(this.sign * this.mag));
    } else if (this.layer === 0) {
      return FC(1, 1, this.sign * Math.log10(Math.E) * this.mag);
    } else if (this.layer === 1) {
      return FC(1, 2, this.sign * (Math.log10(0.4342944819032518) + this.mag));
    } else {
      return FC(1, this.layer + 1, this.sign * this.mag);
    }
  }

  /**
   * Squaring a number means multiplying it by itself, a.k.a. raising it to the second power.
   */
  public sqr(): Decimal {
    return this.pow(2);
  }

  /**
   * Square root: finds the Decimal X such that X * X, a.k.a X^2, equals 'this'. Equivalent to X^(1/2).
   */
  public sqrt(): Decimal {
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.sqrt(this.sign * this.mag));
    } else if (this.layer === 1) {
      return FC(1, 2, Math.log10(this.mag) - 0.3010299956639812);
    } else {
      const result = Decimal.div(FC_NN(this.sign, this.layer - 1, this.mag), FC_NN(1, 0, 2));
      result.layer += 1;
      result.normalize();
      return result;
    }
  }

  /**
   * Cubing a number means raising it to the third power.
   */
  public cube(): Decimal {
    return this.pow(3);
  }

  /**
   * Cube root: finds the Decimal X such that X^3 equals 'this'. Equivalent to X^(1/3).
   */
  public cbrt(): Decimal {
    if (this.lt(0)) return this.neg().pow(1/3).neg();
    return this.pow(1 / 3);
  }


  /**
   *
   * Tetration: The result of exponentiating 'this' to 'this' 'height' times in a row.  https://en.wikipedia.org/wiki/Tetration
   * 
   * If payload != 1, then this is 'iterated exponentiation', the result of exping 'payload' to base 'this' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public tetrate(height = 2, payload: DecimalSource = FC_NN(1, 0, 1), linear = false): Decimal {
    //x^^1 == x
    if (height === 1) {
      return Decimal.pow(this, payload);
    }
    //x^^0 == 1
    if (height === 0) {
      return new Decimal(payload);
    }
    //1^^x == 1
    if (this.eq(Decimal.dOne)) {
      return FC_NN(1, 0, 1);
    }
    //-1^^x == -1
    if (this.eq(-1)) {
      return Decimal.pow(this, payload);
    }

    if (height === Number.POSITIVE_INFINITY) {
      const this_num = this.toNumber();
      //within the convergence range?
      if (this_num <= 1.44466786100976613366 && this_num >= 0.06598803584531253708) {
        const negln = Decimal.ln(this).neg();
        //For bases above 1, b^x = x has two solutions. The lower solution is a stable equilibrium, the upper solution is an unstable equilibrium.
        let lower = negln.lambertw().div(negln);
        // However, if the base is below 1, there's only the stable equilibrium solution.
        if (this_num < 1) return lower;
        let upper = negln.lambertw(false).div(negln);
        //hotfix for the very edge of the number range not being handled properly
        if (this_num > 1.444667861009099) {
          lower = upper = Decimal.fromNumber(Math.E);
        }
        payload = D(payload);
        if (payload.eq(upper)) return upper;
        else if (payload.lt(upper)) return lower;
        else return new Decimal(Decimal.dInf);
      } else if (this_num > 1.44466786100976613366) {
        //explodes to infinity
        return new Decimal(Decimal.dInf);
      } else {
        //0.06598803584531253708 > this_num >= 0: never converges
        //this_num < 0: quickly becomes a complex number
        return new Decimal(Decimal.dNaN);
      }
    }

    //0^^x oscillates if we define 0^0 == 1 (which in javascript land we do), since then 0^^1 is 0, 0^^2 is 1, 0^^3 is 0, etc. payload is ignored
    //using the linear approximation for height (TODO: don't know a better way to calculate it ATM, but it wouldn't surprise me if it's just NaN)
    if (this.eq(Decimal.dZero)) {
      let result = Math.abs((height + 1) % 2);
      if (result > 1) {
        result = 2 - result;
      }
      return Decimal.fromNumber(result);
    }

    if (height < 0) {
      return Decimal.iteratedlog(payload, this, -height, linear);
    }

    payload = new Decimal(payload);
    const oldheight = height;
    height = Math.trunc(height);
    const fracheight = oldheight - height;

    if (this.gt(Decimal.dZero) && (this.lt(1) || (this.lte(1.44466786100976613366) && payload.lte(Decimal.ln(this).neg().lambertw(false).div(Decimal.ln(this).neg())))) && (oldheight > 10000 || !linear)) {
      //similar to 0^^n, flip-flops between two values, converging slowly (or if it's below 0.06598803584531253708, never). So once again, the fractional part at the beginning will be a linear approximation (TODO: again pending knowledge of how to approximate better, although tbh I think it should in reality just be NaN)
      const limitheight = Math.min(10000, height);
      if (payload.eq(Decimal.dOne)) payload = this.pow(fracheight);
      else if (this.lt(1)) payload = payload.pow(1 - fracheight).mul(this.pow(payload).pow(fracheight));
      else payload = payload.layeradd(fracheight, this);
      for (let i = 0; i < limitheight; ++i) {
        const old_payload: Decimal = payload;
        payload = this.pow(payload);
        //stop early if we converge
        if (old_payload.eq(payload)) {
          return payload;
        }
      }
      if (oldheight > 10000 && Math.ceil(oldheight) % 2 == 1) {
        return this.pow(payload);
      }
      return payload;
    }
    //TODO: base < 0, but it's hard for me to reason about (probably all non-integer heights are NaN automatically?)

    if (fracheight !== 0) {
      if (payload.eq(Decimal.dOne)) {
        //If (linear), use linear approximation even for bases <= 10
        //TODO: for bases above 10, revert to old linear approximation until I can think of something better
        if (this.gt(10) || linear) {
          payload = this.pow(fracheight);
        } else {
          payload = Decimal.fromNumber(Decimal.tetrate_critical(this.toNumber(), fracheight));
          //TODO: until the critical section grid can handle numbers below 2, scale them to the base
          //TODO: maybe once the critical section grid has very large bases, this math can be appropriate for them too? I'll think about it
          if (this.lt(2)) {
            payload = payload.sub(1).mul(this.minus(1)).plus(1);
          }
        }
      } else {
        if (this.eq(10)) {
          payload = payload.layeradd10(fracheight, linear);
        }
        else if (this.lt(1)) {
          payload = payload.pow(1 - fracheight).mul(this.pow(payload).pow(fracheight));
        } 
        else {
          payload = payload.layeradd(fracheight, this, linear);
        }
      }
    }

    for (let i = 0; i < height; ++i) {
      payload = this.pow(payload);
      //bail if we're NaN
      if (!isFinite(payload.layer) || !isFinite(payload.mag)) {
        return payload.normalize();
      }
      //shortcut
      if (payload.layer - this.layer > 3) {
        return FC_NN(payload.sign, payload.layer + (height - i - 1), payload.mag);
      }
      //give up after 10000 iterations if nothing is happening
      if (i > 10000) {
        return payload;
      }
    }
    return payload;
  }

  /**
   * Iterated exponentiation, the result of exping 'payload' to base 'this' 'height' times. https://andydude.github.io/tetration/archives/tetration2/ident.html
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * Identical to tetrate.
   */
  public iteratedexp(height = 2, payload = FC_NN(1, 0, 1), linear = false): Decimal {
    return this.tetrate(height, payload, linear);
  }


  /**
   * iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting 'times' from the number's slog representation. Equivalent to tetrating to a negative height.
   * 
   * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public iteratedlog(base: DecimalSource = 10, times = 1, linear = false): Decimal {
    if (times < 0) {
      return Decimal.tetrate(base, -times, this, linear);
    }

    base = D(base);
    let result = Decimal.fromDecimal(this);
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
        return result.normalize();
      }
      //give up after 10000 iterations if nothing is happening
      if (i > 10000) {
        return result;
      }
    }

    //handle fractional part
    if (fraction > 0 && fraction < 1) {
      if (base.eq(10)) {
        result = result.layeradd10(-fraction, linear);
      } else { //I have no clue what a fractional times on a base below 1 should even mean, so I'm not going to bother - just let it be NaN (TODO: come up with what the answer actually should be)
        result = result.layeradd(-fraction, base, linear);
      }
    }

    return result;
  }

  /**
   * Super-logarithm, one of tetration's inverses, tells you what size power tower you'd have to tetrate 'base' to to get 'this'. https://en.wikipedia.org/wiki/Super-logarithm
   * 
   * By definition, will never be higher than 1.8e308 in break_eternity.js, since a power tower 1.8e308 numbers tall is the largest representable number.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming tetration as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public slog(base: DecimalSource = 10, iterations = 100, linear = false): Decimal {
    let step_size = 0.001;
    let has_changed_directions_once = false;
    let previously_rose = false;
    let result = this.slog_internal(base, linear).toNumber();
    for (var i = 1; i < iterations; ++i)
    {
      let new_decimal = new Decimal(base).tetrate(result, Decimal.dOne, linear);
      let currently_rose = new_decimal.gt(this);
      if (i > 1)
      {
        if (previously_rose != currently_rose)
        {
          has_changed_directions_once = true;
        }
      }
      previously_rose = currently_rose;
      if (has_changed_directions_once)
      {
        step_size /= 2;
      }
      else
      {
        step_size *= 2;
      }
      step_size = Math.abs(step_size) * (currently_rose ? -1 : 1);
      result += step_size;
      if (step_size === 0) { break; }
    }
    return Decimal.fromNumber(result);
  }
  
  public slog_internal(base: DecimalSource = 10, linear = false): Decimal {
    base = D(base);

    //special cases:
    //slog base 0 or lower is NaN
    if (base.lte(Decimal.dZero)) {
      return new Decimal(Decimal.dNaN);
    }
    //slog base 1 is NaN
    if (base.eq(Decimal.dOne)) {
      return new Decimal(Decimal.dNaN);
    }
    //need to handle these small, wobbling bases specially
    if (base.lt(Decimal.dOne)) {
      if (this.eq(Decimal.dOne)) {
        return FC_NN(0, 0, 0);
      }
      if (this.eq(Decimal.dZero)) {
        return FC_NN(-1, 0, 1);
      }
      //0 < this < 1: ambiguous (happens multiple times)
      //this < 0: impossible (as far as I can tell)
      //this > 1: partially complex (http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html base 0.25 for proof)
      return new Decimal(Decimal.dNaN);
    }
    //slog_n(0) is -1
    if (this.mag < 0 || this.eq(Decimal.dZero)) {
      return FC_NN(-1, 0, 1);
    }
    if (base.lt(1.44466786100976613366)) {
      const negln = Decimal.ln(base).neg();
      let infTower = negln.lambertw().div(negln);
      if (this.eq(infTower)) return new Decimal(Decimal.dInf);
      if (this.gt(infTower)) return new Decimal(Decimal.dNaN);
    }

    let result = 0;
    let copy = Decimal.fromDecimal(this);
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
        if (linear) return Decimal.fromNumber(result + copy.toNumber() - 1);
        else return Decimal.fromNumber(result + Decimal.slog_critical(base.toNumber(), copy.toNumber()));
      } else {
        result += 1;
        copy = Decimal.log(copy, base);
      }
    }
    return Decimal.fromNumber(result);
  }

  //background info and tables of values for critical functions taken here: https://github.com/Patashu/break_eternity.js/issues/22
  public static slog_critical(base: number, height: number): number {
    //TODO: for bases above 10, revert to old linear approximation until I can think of something better
    if (base > 10) {
      return height - 1;
    }
    return Decimal.critical_section(base, height, critical_slog_values);
  }

  public static tetrate_critical(base: number, height: number): number {
    return Decimal.critical_section(base, height, critical_tetr_values);
  }

  public static critical_section(base: number, height: number, grid: number[][], linear = false): number {
    //this part is simple at least, since it's just 0.1 to 0.9
    height *= 10;
    if (height < 0) {
      height = 0;
    }
    if (height > 10) {
      height = 10;
    }
    //have to do this complicated song and dance since one of the critical_headers is Math.E, and in the future I'd like 1.5 as well
    if (base < 2) {
      base = 2;
    }
    if (base > 10) {
      base = 10;
    }
    let lower = 0;
    let upper = 0;
    //basically, if we're between bases, we interpolate each bases' relevant values together
    //then we interpolate based on what the fractional height is.
    //accuracy could be improved by doing a non-linear interpolation (maybe), by adding more bases and heights (definitely) but this is AFAIK the best you can get without running some pari.gp or mathematica program to calculate exact values
    //however, do note http://myweb.astate.edu/wpaulsen/tetcalc/tetcalc.html can do it for arbitrary heights but not for arbitrary bases (2, e, 10 present)
    for (let i = 0; i < critical_headers.length; ++i) {
      if (critical_headers[i] == base) {
        // exact match
        lower = grid[i][Math.floor(height)];
        upper = grid[i][Math.ceil(height)];
        break;
      } else if (critical_headers[i] < base && critical_headers[i + 1] > base) {
        // interpolate between this and the next
        const basefrac =
          (base - critical_headers[i]) / (critical_headers[i + 1] - critical_headers[i]);
        lower =
          grid[i][Math.floor(height)] * (1 - basefrac) + grid[i + 1][Math.floor(height)] * basefrac;
        upper =
          grid[i][Math.ceil(height)] * (1 - basefrac) + grid[i + 1][Math.ceil(height)] * basefrac;
        break;
      }
    }
    const frac = height - Math.floor(height);
    //improvement - you get more accuracy (especially around 0.9-1.0) by doing log, then frac, then powing the result
    //(we could pre-log the lookup table, but then fractional bases would get Weird)
    //also, use old linear for slog (values 0 or less in critical section). maybe something else is better but haven't thought about what yet
    if (lower <= 0 || upper <= 0)
    {
      return lower * (1 - frac) + upper * frac;
    }
    else
    {
      return Math.pow(base, (Math.log(lower)/Math.log(base)) * (1 - frac) + (Math.log(upper)/Math.log(base)) * frac );
    }
  }

  /**
   * Adds/removes layers from a Decimal, even fractional layers (e.g. its slog10 representation). Very similar to tetrate base 10 and iterated log base 10.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  //Moved this over to use the same critical section as tetrate/slog.
  public layeradd10(diff: DecimalSource, linear = false): Decimal {
    diff = Decimal.fromValue_noAlloc(diff).toNumber();
    const result = Decimal.fromDecimal(this);
    if (diff >= 1) {
      //bug fix: if result is very smol (mag < 0, layer > 0) turn it into 0 first
      if (result.mag < 0 && result.layer > 0) {
        result.sign = 0;
        result.mag = 0;
        result.layer = 0;
      } else if (result.sign === -1 && result.layer == 0) {
        //bug fix - for stuff like -3.layeradd10(1) we need to move the sign to the mag
        result.sign = 1;
        result.mag = -result.mag;
      }
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
            //another bugfix: if we hit -Infinity mag, then we should return negative infinity, not 0. 0.layeradd10(-1) h its this
            if (result.sign === 0) {
              result.sign = 1;
            }
            //also this, for 0.layeradd10(-2)
            if (result.layer < 0) {
              result.layer = 0;
            }
            return result.normalize();
          }
          if (result.layer >= 0) {
            break;
          }
        }
      }
    }

    while (result.layer < 0) {
      result.layer++;
      result.mag = Math.log10(result.mag);
    }
    //bugfix: before we normalize: if we started with 0, we now need to manually fix a layer ourselves!
    if (result.sign === 0) {
      result.sign = 1;
      if (result.mag === 0 && result.layer >= 1) {
        result.layer -= 1;
        result.mag = 1;
      }
    }
    result.normalize();

    //layeradd10: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 10 and iterated log base 10. Also equivalent to adding a fractional amount to the number's layer in its break_eternity.js representation.
    if (diff !== 0) {
      return result.layeradd(diff, 10, linear); //safe, only calls positive height 1 payload tetration, slog and log
    }

    return result;
  }

  /**
   * layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   */
  public layeradd(diff: number, base: DecimalSource, linear = false): Decimal {
    let baseD = D(base);
    if (baseD.gt(1) && baseD.lte(1.44466786100976613366)) {
      const excessSlog = Decimal.excess_slog(this, base, linear);
      const slogthis = excessSlog[0].toNumber();
      const range = excessSlog[1];
      const slogdest = slogthis + diff;
      const negln = Decimal.ln(base).neg();
      let lower = negln.lambertw().div(negln);
      let upper = negln.lambertw(false).div(negln);
      let slogzero = Decimal.dOne;
      if (range == 1) slogzero = lower.mul(upper).sqrt();
      else if (range == 2) slogzero = upper.mul(2);
      let slogone = baseD.pow(slogzero);
      let wholeheight = Math.floor(slogdest);
      let fracheight = slogdest - wholeheight;
      let towertop = slogzero.pow(1 - fracheight).mul(slogone.pow(fracheight));
      return Decimal.tetrate(baseD, wholeheight, towertop, linear); //wholediff is a whole number so this is safe even if it ends up calling iteratedlog
    }
    const slogthis = this.slog(base, 100, linear).toNumber();
    const slogdest = slogthis + diff;
    if (slogdest >= 0) {
      return Decimal.tetrate(base, slogdest, Decimal.dOne, linear);
    } else if (!Number.isFinite(slogdest)) {
      return new Decimal(Decimal.dNaN);
    } else if (slogdest >= -1) {
      return Decimal.log(Decimal.tetrate(base, slogdest + 1, Decimal.dOne, linear), base);
    } else {
      return Decimal.log(Decimal.log(Decimal.tetrate(base, slogdest + 2, Decimal.dOne, linear), base), base);
    }
  }

  //Apparently having something be private but not static breaks everything
  /**
   * A strange version of slog for bases between 1 and e^1/e which can handle values above base^^Infinity.
   * Returns a pair of a Decimal and a number, with the number always being 0, 1, or 2. The number indicates what range we're in:
   * 0 means we're below the lower solution of b^x = x, and so the normal slog is used.
   * 1 means we're between the two solutions of b^x = x, with the geometric mean of the two solutions arbitrarily chosen to be the value with a slog of 0.
   * 2 means we're above the upper solution of b^x = x, with (upper solution * 2) arbitrarily chosen to be the value with a slog of 0.
   * 
   * The values returned by this function don't really have much mathematical meaning, but the difference between two values does.
   * Therefore, this function is kept private, but it's used for layeradd on these small bases.
   */
  private static excess_slog(value : DecimalSource, base : DecimalSource, linear = false) : [Decimal, 0 | 1 | 2] {
    value = D(value);
    base = D(base);
    let baseD = base;
    base = base.toNumber();
    if (base == 1 || base <= 0) return [new Decimal(Decimal.dNaN), 0];
    if (base > 1.44466786100976613366) return [value.slog(base, 100, linear), 0];
    const negln = Decimal.ln(base).neg();
    let lower = negln.lambertw().div(negln);
    let upper = Decimal.dInf;
    if (base > 1) upper = negln.lambertw(false).div(negln);
    if (base > 1.444667861009099) {
      lower = upper = Decimal.fromNumber(Math.E);
    }
    if (value.lt(lower)) return [value.slog(base, 100, linear), 0];
    if (value.eq(lower)) return [new Decimal(Decimal.dInf), 0];
    if (value.eq(upper)) return [new Decimal(Decimal.dNegInf), 2];
    if (value.gt(upper)) {
      let slogzero = upper.mul(2);
      let slogone = baseD.pow(slogzero);
      let estimate = 0;
      if (value.gte(slogzero) && value.lt(slogone)) estimate = 0;
      else if (value.gte(slogone)) {
        let payload = slogone;
        estimate = 1;
        while (payload.lt(value)) {
          payload = baseD.pow(payload);
          estimate = estimate + 1;
          if (payload.layer > 3) {
            let layersleft = Math.floor(value.layer - payload.layer + 1);
            payload = baseD.iteratedexp(layersleft, payload, linear);
            estimate = estimate + layersleft;
          }
        }
        if (payload.gt(value)) {
          payload = payload.log(base);
          estimate = estimate - 1;
        }
      }
      else if (value.lt(slogzero)) {
        let payload = slogzero;
        estimate = 0;
        while (payload.gt(value)) {
          payload = payload.log(base);
          estimate = estimate - 1;
        }
      }
      let fracheight = 0;
      let tested = 0;
      let step_size = 0.5;
      let towertop = slogzero;
      let guess : Decimal = Decimal.dZero;
      while (step_size > 1e-16) {
        tested = fracheight + step_size;
        towertop = slogzero.pow(1 - tested).mul(slogone.pow(tested)) //Weighted geometric average
        guess = Decimal.iteratedexp(base, estimate, towertop);
        if (guess.eq(value)) return [new Decimal(estimate + tested), 2];
        else if (guess.lt(value)) fracheight += step_size;
        step_size /= 2;
      }
      if (guess.neq_tolerance(value, 1e-7)) return [new Decimal(Decimal.dNaN), 0];
      return [new Decimal(estimate + fracheight), 2];
    }
    if (value.lt(upper) && value.gt(lower)) {
      let slogzero = lower.mul(upper).sqrt(); //Geometric mean of the two b^x = x solutions
      let slogone = baseD.pow(slogzero);
      let estimate = 0;
      if (value.lte(slogzero) && value.gt(slogone)) estimate = 0;
      else if (value.lte(slogone)) {
        let payload = slogone;
        estimate = 1;
        while (payload.gt(value)) {
          payload = baseD.pow(payload);
          estimate = estimate + 1;
        }
        if (payload.lt(value)) {
          payload = payload.log(base);
          estimate = estimate - 1;
        }
      }
      else if (value.gt(slogzero)) {
        let payload = slogzero;
        estimate = 0;
        while (payload.lt(value)) {
          payload = payload.log(base);
          estimate = estimate - 1;
        }
      }
      let fracheight = 0;
      let tested = 0;
      let step_size = 0.5;
      let towertop = slogzero;
      let guess : Decimal = Decimal.dZero;
      while (step_size > 1e-16) {
        tested = fracheight + step_size;
        towertop = slogzero.pow(1 - tested).mul(slogone.pow(tested)) //Weighted geometric average
        guess = Decimal.iteratedexp(base, estimate, towertop);
        if (guess.eq(value)) return [new Decimal(estimate + tested), 1];
        else if (guess.gt(value)) fracheight += step_size;
        step_size /= 2;
      }
      if (guess.neq_tolerance(value, 1e-7)) return [new Decimal(Decimal.dNaN), 0];
      return [new Decimal(estimate + fracheight), 1];
    }
    throw new Error("Unhandled behavior in excess_slog");
  }

  /**
   * The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
   * https://en.wikipedia.org/wiki/Lambert_W_function
   * 
   * This is a multi-valued function in the complex plane, but only two branches matter for real numbers: the "principal branch" W0, and the "non-principal branch" W_-1.
   * W_0 works for any number >= -1/e, but W_-1 only works for nonpositive numbers >= -1/e.
   * The "principal" parameter, which is true by default, decides which branch we're looking for: W_0 is used if principal is true, W_-1 is used if principal is false.
   */
  //Some special values, for testing: https://en.wikipedia.org/wiki/Lambert_W_function#Special_values
  public lambertw(principal = true): Decimal {
    if (this.lt(-0.3678794411710499)) {
      return new Decimal(Decimal.dNaN); //complex
    }
    else if (principal) {
      if (this.abs().lt("1e-300")) return new Decimal(this);
      else if (this.mag < 0) {
        return Decimal.fromNumber(f_lambertw(this.toNumber()));
      } else if (this.layer === 0) {
        return Decimal.fromNumber(f_lambertw(this.sign * this.mag));
      } else if (this.lt("eee15")) {
        return d_lambertw(this);
      } else { // Numbers this large would sometimes fail to converge using d_lambertw, and at this size this.ln() is close enough
        return this.ln();
      }
    }
    else {
      if (this.sign === 1) {
        return new Decimal(Decimal.dNaN); //complex
      }
      if (this.layer === 0) {
        return Decimal.fromNumber(f_lambertw(this.sign * this.mag, 1e-10, false));
      }
      else if (this.layer == 1) {
        return d_lambertw(this, 1e-10, false);
      }
      else {
        return this.neg().recip().lambertw().neg();
      }
    }
  }

  /**
   * The super square-root function - what number, tetrated to height 2, equals 'this'? https://en.wikipedia.org/wiki/Tetration#Super-root
   */
  public ssqrt(): Decimal {
    return this.linear_sroot(2);
  }

  /**
   * Super-root, one of tetration's inverses - what number, tetrated to height 'degree', equals 'this'? https://en.wikipedia.org/wiki/Tetration#Super-root
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   * This only matters for non-integer degrees.
   */
  //Another reason this doesn't support analytic approximation because I don't know the structure of non-linear tetrations for inputs < 1
  //TODO: Optimize this like how slog is optimized (if it isn't already)
  public linear_sroot(degree: number) : Decimal {
    //1st-degree super root just returns its input
    if (degree == 1) {
      return this;
    }
    if (this.eq(Decimal.dInf)) {
      return new Decimal(Decimal.dInf);
    }
    if (!this.isFinite()) {
      return new Decimal(Decimal.dNaN);
    }
    //Using linear approximation, x^^n = x^n if 0 < n < 1
    if (degree > 0 && degree < 1) {
      return this.root(degree);
    }
    //Using the linear approximation, there actually is a single solution for super roots with -2 < degree <= -1
    if (degree > -2 && degree < -1) {
      return Decimal.fromNumber(degree).add(2).pow(this.recip());
    }
    //Super roots with -1 <= degree < 0 have either no solution or infinitely many solutions, and tetration with height <= -2 returns NaN, so super roots of degree <= -2 don't work
    if (degree <= 0) {
      return new Decimal(Decimal.dNaN);
    }
    //Infinite degree super-root is x^(1/x) between 1/e <= x <= e, undefined otherwise
    if (degree == Number.POSITIVE_INFINITY) {
      const this_num = this.toNumber();
      if (this_num < Math.E && this_num > _EXPN1) {
        return this.pow(this.recip());
      }
      else {
        return new Decimal(Decimal.dNaN);
      }
    }
    //Special case: any super-root of 1 is 1
    if (this.eq(1)) {
      return FC_NN(1, 0, 1);
    }
    //TODO: base < 0 (It'll probably be NaN anyway)
    if (this.lt(0)) {
      return new Decimal(Decimal.dNaN);
    }
    //Treat all numbers of layer <= -2 as zero, because they effectively are
    if (this.lte("1ee-16")) {
      if (degree % 2 == 1) return new Decimal(this);
      else return new Decimal(Decimal.dNaN);
    }
    //this > 1
    if (this.gt(1)) {
      //Uses guess-and-check to find the super-root.
      //If this > 10^^(degree), then the answer is under iteratedlog(10, degree - 1): for example, ssqrt(x) < log(x, 10) as long as x > 10^10, and linear_sroot(x, 3) < log(log(x, 10), 10) as long as x > 10^10^10
      //On the other hand, if this < 10^^(degree), then clearly the answer is less than 10
      //Since the answer could be a higher-layered number itself (whereas slog's maximum is 1.8e308), the guess-and-check is scaled to the layer of the upper bound, so the guess is set to the average of some higher-layer exponents of the bounds rather than the bounds itself (as taking plain averages on tetrational-scale numbers would go nowhere)
      let upperBound = Decimal.dTen;
      if (this.gte(Decimal.tetrate(10, degree, 1, true))) {
        upperBound = this.iteratedlog(10, degree - 1, true);
      }
      if (degree <= 1) {
        upperBound = this.root(degree);
      }
      let lower = Decimal.dZero; //This is zero rather than one because we might be on a higher layer, so the lower bound might actually some 10^10^10...^0
      let layer = upperBound.layer;
      let upper = upperBound.iteratedlog(10, layer, true);
      let previous = upper;
      let guess = upper.div(2);
      let loopGoing = true;
      while (loopGoing) {
        guess = lower.add(upper).div(2);
        if (Decimal.iteratedexp(10, layer, guess, true).tetrate(degree, 1, true).gt(this)) upper = guess;
        else lower = guess;
        if (guess.eq(previous)) loopGoing = false;
        else previous = guess;
      }
      return Decimal.iteratedexp(10, layer, guess, true);
    }
    //0 < this < 1
    else {
      //A tetration of decimal degree can potentially have three different portions, as shown at https://www.desmos.com/calculator/ayvqks6mxa, which is a graph of x^^2.05:
      //The portion where the function is increasing, extending from a minimum (which may be at x = 0 or at some x between 0 and 1) up to infinity (I'll call this the "increasing" range)
      //The portion where the function is decreasing (I'll call this the "decreasing" range)
      //A small, steep increasing portion very close to x = 0 (I'll call this the "zero" range)
      //If ceiling(degree) is even, then the tetration will either be strictly increasing, or it will have the increasing and decreasing ranges, but not the zero range (because if ceiling(degree) is even, 0^^degree == 1).
      //If ceiling(degree) is odd, then the tetration will either be strictly increasing, or it will have all three ranges (because if ceiling(degree) is odd, 0^^degree == 0).
      //The existence of these ranges means that a super-root could potentially have two or three valid answers.
      //Out of these, we'd prefer the increasing range value if it exists, otherwise we'll take the zero range value (it can't have a decreasing range value if it doesn't have an increasing range value) if the zero range exists.
      //It's possible to identify which range that "this" is in:
      //If the tetration is decreasing at that point, the point is in the decreasing range.
      //If the tetration is increasing at that point and ceiling(degree) is even, the point is in the increasing range since there is no zero range.
      //If the tetration is increasing at that point and ceiling(degree) is odd, look at the second derivative at that point. If the second derivative is positive, the point is in the increasing range. If the second derivative is negative, the point is the zero range.
      //We need to find the local minimum (separates decreasing and increasing ranges) and the local maximum (separates zero and decreasing ranges).
      //(stage) is which stage of the loop we're in: stage 1 is finding the minimum, stage 2 means we're between the stages, and stage 3 is finding the maximum.
      //The boundary between the decreasing range and the zero range can be very small, so we want to use layer -1 numbers. Therefore, all numbers involved are log10(recip()) of their actual values.
      let stage = 1;
      let minimum = FC(1, 10, 1);
      let maximum = FC(1, 10, 1);
      let lower = FC(1, 10, 1); //eeeeeeeee-10, which is effectively 0; I would use Decimal.dInf but its reciprocal is NaN
      let upper = FC(1, 1, -16); //~ 1 - 1e-16
      let prevspan = Decimal.dZero;
      let difference = FC(1, 10, 1);
      let upperBound = upper.pow10().recip();
      let distance = Decimal.dZero;
      let prevPoint = upperBound;
      let nextPoint = upperBound;
      let evenDegree = (Math.ceil(degree) % 2 == 0);
      let range = 0;
      let lastValid = FC(1, 10, 1);
      let infLoopDetector = false;
      let previousUpper = Decimal.dZero;
      let decreasingFound = false;
      while (stage < 4) {
        if (stage == 2) {
          //The minimum has been found. If ceiling(degree) is even, there's no zero range and thus no local maximum, so end the loop here. Otherwise, begin finding the maximum.
          if (evenDegree) break;
          else {
            lower = FC(1, 10, 1);
            upper = minimum;
            stage = 3;
            difference = FC(1, 10, 1);
            lastValid = FC(1, 10, 1);
          }
        }
        infLoopDetector = false;
        while (upper.neq(lower)) {
          previousUpper = upper;
          if (upper.pow10().recip().tetrate(degree, 1, true).eq(1) && upper.pow10().recip().lt(0.4)) {
            upperBound = upper.pow10().recip();
            prevPoint = upper.pow10().recip();
            nextPoint = upper.pow10().recip();
            distance = Decimal.dZero;
            range = -1; //This would cause problems with degree < 1 in the linear approximation... but those are already covered as a special case
            if (stage == 3) lastValid = upper;
          }
          else if (upper.pow10().recip().tetrate(degree, 1, true).eq(upper.pow10().recip()) && !evenDegree && upper.pow10().recip().lt(0.4)) {
            upperBound = upper.pow10().recip();
            prevPoint = upper.pow10().recip();
            nextPoint = upper.pow10().recip();
            distance = Decimal.dZero;
            range = 0;
          }
          else if (upper.pow10().recip().tetrate(degree, 1, true).eq(upper.pow10().recip().mul(2).tetrate(degree, 1, true))) {
            //If the upper bound is closer to zero than the next point with a discernable tetration, so surely it's in whichever range is closest to zero?
            //This won't happen in a strictly increasing tetration, as there x^^degree ~= x as x approaches zero
            upperBound = upper.pow10().recip();
            prevPoint = Decimal.dZero;
            nextPoint = upperBound.mul(2);
            distance = upperBound;
            if (evenDegree) range = -1;
            else range = 0;
          }
          else {
            //We want to use prevspan to find the "previous point" right before the upper bound and the "next point" right after the upper bound, as that will let us approximate derivatives
            prevspan = upper.mul(1.2e-16);
            upperBound = upper.pow10().recip();
            prevPoint = upper.add(prevspan).pow10().recip();
            distance = upperBound.sub(prevPoint);
            nextPoint = upperBound.add(distance);
            //...but it's of no use to us while its tetration is equal to upper's tetration, so widen the difference until it's not
            //We add prevspan and subtract nextspan because, since upper is log10(recip(upper bound)), the upper bound gets smaller as upper gets larger and vice versa
            while (prevPoint.tetrate(degree, 1, true).eq(upperBound.tetrate(degree, 1, true)) || nextPoint.tetrate(degree, 1, true).eq(upperBound.tetrate(degree, 1, true)) || prevPoint.gte(upperBound) || nextPoint.lte(upperBound)) {
              prevspan = prevspan.mul(2);
              prevPoint = upper.add(prevspan).pow10().recip();
              distance = upperBound.sub(prevPoint);
              nextPoint = upperBound.add(distance);
            }
            if (
              stage == 1 && (nextPoint.tetrate(degree, 1, true).gt(upperBound.tetrate(degree, 1, true)) && prevPoint.tetrate(degree, 1, true).gt(upperBound.tetrate(degree, 1, true)))
              ||
              stage == 3 && (nextPoint.tetrate(degree, 1, true).lt(upperBound.tetrate(degree, 1, true)) && prevPoint.tetrate(degree, 1, true).lt(upperBound.tetrate(degree, 1, true)))
              ) {
                lastValid = upper;
              }
            if (nextPoint.tetrate(degree, 1, true).lt(upperBound.tetrate(degree, 1, true))) {
              //Derivative is negative, so we're in decreasing range
              range = -1;
            }
            else if (evenDegree) {
              //No zero range, so we're in increasing range
              range = 1;
            }
            else if (stage == 3 && upper.gt_tolerance(minimum, 1e-8)) {
              //We're already below the minimum, so we can't be in range 1
              range = 0;
            }
            else {
              //Number imprecision has left the second derivative somewhat untrustworthy, so we need to expand the bounds to ensure it's correct
              while (prevPoint.tetrate(degree, 1, true).eq_tolerance(upperBound.tetrate(degree, 1, true), 1e-8) || nextPoint.tetrate(degree, 1, true).eq_tolerance(upperBound.tetrate(degree, 1, true), 1e-8) || prevPoint.gte(upperBound) || nextPoint.lte(upperBound)) {
                prevspan = prevspan.mul(2);
                prevPoint = upper.add(prevspan).pow10().recip();
                distance = upperBound.sub(prevPoint);
                nextPoint = upperBound.add(distance);
              }
              if (nextPoint.tetrate(degree, 1, true).sub(upperBound.tetrate(degree, 1, true)).lt(upperBound.tetrate(degree, 1, true).sub(prevPoint.tetrate(degree, 1, true)))) {
                //Second derivative is negative, so we're in zero range
                range = 0;
              }
              else {
                //By process of elimination, we're in increasing range
                range = 1;
              }
            }
          }
          if (range == -1) decreasingFound = true;
          if ((stage == 1 && range == 1) || (stage == 3 && range != 0)) {
            //The upper bound is too high
            if (lower.eq(FC(1, 10, 1))) {
              upper = upper.mul(2);
            }
            else {
              let cutOff = false;
              if (infLoopDetector && ((range == 1 && stage == 1) || (range == -1 && stage == 3))) cutOff = true; //Avoids infinite loops from floating point imprecision
              upper = upper.add(lower).div(2);
              if (cutOff) break;
            }
          }
          else {
            if (lower.eq(FC(1, 10, 1))) {
              //We've now found an actual lower bound
              lower = upper;
              upper = upper.div(2);
            }
            else {
              //The upper bound is too low, meaning last time we decreased the upper bound, we should have gone to the other half of the new range instead
              let cutOff = false;
              if (infLoopDetector && ((range == 1 && stage == 1) || (range == -1 && stage == 3))) cutOff = true; //Avoids infinite loops from floating point imprecision
              lower = lower.sub(difference);
              upper = upper.sub(difference);
              if (cutOff) break;
            }
          }
          if (lower.sub(upper).div(2).abs().gt(difference.mul(1.5))) infLoopDetector = true;
          difference = lower.sub(upper).div(2).abs();
          if (upper.gt("1e18")) break;
          if (upper.eq(previousUpper)) break; //Another infinite loop catcher
        }
        if (upper.gt("1e18")) break;
        if (!decreasingFound) break; //If there's no decreasing range, then even if an error caused lastValid to gain a value, the minimum can't exist
        if (lastValid == FC(1, 10, 1)) {
          //Whatever we're searching for, it doesn't exist. If there's no minimum, then there's no maximum either, so either way we can end the loop here.
          break;
        }
        if (stage == 1) minimum = lastValid;
        else if (stage == 3) maximum = lastValid;
        stage++;
      }
      //Now we have the minimum and maximum, so it's time to calculate the actual super-root.
      //First, check if the root is in the increasing range.
      lower = minimum;
      upper = FC(1, 1, -18);
      let previous = upper;
      let guess = Decimal.dZero;
      let loopGoing = true;
      while (loopGoing) {
        if (lower.eq(FC(1, 10, 1))) guess = upper.mul(2);
        else guess = lower.add(upper).div(2);
        if (Decimal.pow(10, guess).recip().tetrate(degree, 1, true).gt(this)) upper = guess;
        else lower = guess;
        if (guess.eq(previous)) loopGoing = false;
        else previous = guess;
        if (upper.gt("1e18")) return new Decimal(Decimal.dNaN);
      }
      //using guess.neq(minimum) led to imprecision errors, so here's a fixed version of that
      if (!(guess.eq_tolerance(minimum, 1e-15))) {
        return guess.pow10().recip();
      }
      else {
        //If guess == minimum, we haven't actually found the super-root, the algorithm just kept going down trying to find a super-root that's not in the increasing range.
        //Check if the root is in the zero range.
        if (maximum.eq(FC(1, 10, 1))) {
          //There is no zero range, so the super root doesn't exist
          return new Decimal(Decimal.dNaN);
        }
        lower = FC(1, 10, 1);
        upper = maximum;
        previous = upper;
        guess = Decimal.dZero;
        loopGoing = true;
        while (loopGoing) {
          if (lower.eq(FC(1, 10, 1))) guess = upper.mul(2);
          else guess = lower.add(upper).div(2);
          if (Decimal.pow(10, guess).recip().tetrate(degree, 1, true).gt(this)) upper = guess;
          else lower = guess;
          if (guess.eq(previous)) loopGoing = false;
          else previous = guess;
          if (upper.gt("1e18")) return new Decimal(Decimal.dNaN);
        }
        return guess.pow10().recip();
      }
    }
  }

  /**
   * This function takes a Decimal => Decimal function as its argument (or DecimalSource => Decimal, that's fine too),
   * and it returns a DecimalSource => Decimal function that's an inverse of the first one, which uses binary search to find its target.
   * The resulting function will call the original many times, so it may be noticably slower than the original.
   * 
   * This function is only intended to be used on continuous, strictly increasing (or, using the decreasing parameter, strictly decreasing) functions.
   * Its resulting function may output erroneous results if the original function was not strictly increasing.
   * If the function is increasing but not strictly increasing, the inverse will, in ranges where the original function is constant, try to return the value closest to 0 out of the multiple correct values.
   * If the function is not continuous, the inverse should return the correct answer in cases where the given value is returned by some input to the original function, but it will return an erroneous result otherwise (the correct result would be to return NaN, but checking to ensure continuity is not implemented)
   * 
   * @param func The Decimal => Decimal function to create an inverse function of.
   * @param decreasing This parameter is false by default. If this parameter is true, the original function should be strictly decreasing instead of strictly increasing.
   * @param iterations The amount of iterations that the inverse function runs before it gives up and returns whatever value it's found thus far. Default is 120, which should be enough to always be as precise as floating point allows.
   * @param minX The original function is assumed to have this value as the lowest value in its domain. Is Decimal.dLayerMax.neg() by default, which means all negative finite values are allowed but infinity is not.
   * @param maxX The original function is assumed to have this value as the highest value in its domain. Is Decimal.dLayerMax by default, which means all positive finite values are allowed but infinity is not.
   * @param minY If the input to the inverse function is below this value, the inverse function assumes the input is not in the range and returns NaN. Is Decimal.dLayerMax.neg() by default, which means all negative finite values are allowed but infinity is not.
   * @param maxY If the input to the inverse function is above this value, the inverse function assumes the input is not in the range and returns NaN. Is Decimal.dLayerMax by default, which means all positive finite values are allowed but infinity is not.
   */
  public static increasingInverse(
    func : (((value : DecimalSource) => Decimal) | ((value : Decimal) => Decimal)),
    decreasing = false,
    iterations = 120,
    minX : DecimalSource = Decimal.dLayerMax.neg(),
    maxX : DecimalSource = Decimal.dLayerMax,
    minY : DecimalSource = Decimal.dLayerMax.neg(),
    maxY : DecimalSource = Decimal.dLayerMax,
  ) {
    return function(value : DecimalSource) : Decimal {
      value = new Decimal(value);
      minX = new Decimal(minX);
      maxX = new Decimal(maxX);
      minY = new Decimal(minY);
      maxY = new Decimal(maxY);
      
      if (value.isNan() || maxX.lt(minX) || value.lt(minY) || value.gt(maxY)) return new Decimal(Decimal.dNaN);

      // Before actually doing the search, let's determine what range we're looking at. First-class function shenanigans incoming.
      let rangeApply = function(value : DecimalSource){return new Decimal(value);}
      let currentCheck = true; // Checking whether the inverse is positive
      if (maxX.lt(0)) currentCheck = false;
      else if (minX.gt(0)) currentCheck = true;
      else {
        let valCheck = func(Decimal.dZero);
        if (valCheck.eq(value)) return FC_NN(0, 0, 0);
        currentCheck = value.gt(valCheck);
        if (decreasing) currentCheck = !currentCheck;
      }
      let positive = currentCheck;
      let reciprocal;
      if (currentCheck) {
        // Checking whether the inverse is below 1/9e15
        if (maxX.lt(FIRST_NEG_LAYER)) currentCheck = true;
        else if (minX.gt(FIRST_NEG_LAYER)) currentCheck = false;
        else {
          let valCheck = func(new Decimal(FIRST_NEG_LAYER));
          currentCheck = value.lt(valCheck);
          if (decreasing) currentCheck = !currentCheck;
        }
        if (currentCheck) {
          reciprocal = true;
          // Checking whether the inverse is above 1/e9e15
          let limit = Decimal.pow(10, EXP_LIMIT).recip();
          if (maxX.lt(limit)) currentCheck = false;
          else if (minX.gt(limit)) currentCheck = true;
          else {
            let valCheck = func(new Decimal(limit));
            currentCheck = value.gt(valCheck);
            if (decreasing) currentCheck = !currentCheck;
          }
          // If the inverse is between 1/e9e15 and 1/9e15, search through layer -1 numbers.
          if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.pow(10, value).recip();}
          else {
            // Checking whether the inverse is above 1/10^^9e15
            let limit = Decimal.tetrate(10, EXP_LIMIT);
            if (maxX.lt(limit)) currentCheck = false;
            else if (minX.gt(limit)) currentCheck = true;
            else {
              let valCheck = func(new Decimal(limit));
              currentCheck = value.gt(valCheck);
              if (decreasing) currentCheck = !currentCheck;
            }
            // If the inverse is between 1/10^^9e15 and 1/e9e15, search through reciprocals of negative layers themselves.
            if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.tetrate(10, new Decimal(value).toNumber()).recip();}
            // If the inverse is below 1/10^^9e15, search through reciprocals of exponents of layers.
            else rangeApply = function(value : DecimalSource){return (new Decimal(value).gt(Math.log10(Number.MAX_VALUE)) ? Decimal.dZero : Decimal.tetrate(10, Decimal.pow(10, value).toNumber()).recip())}
          }
        }
        else {
          reciprocal = false
          // Checking whether the inverse is below 9e15
          if (maxX.lt(EXP_LIMIT)) currentCheck = true;
          else if (minX.gt(EXP_LIMIT)) currentCheck = false;
          else {
            let valCheck = func(new Decimal(EXP_LIMIT));
            currentCheck = value.lt(valCheck);
            if (decreasing) currentCheck = !currentCheck;
          }
          // If the inverse is between 1/9e15 and 9e15, search through direct (layer 0) numbers.
          if (currentCheck) rangeApply = function(value : DecimalSource){return new Decimal(value);}
          else {
            // Checking whether the inverse is below e9e15
            let limit = Decimal.pow(10, EXP_LIMIT);
            if (maxX.lt(limit)) currentCheck = true;
            else if (minX.gt(limit)) currentCheck = false;
            else {
              let valCheck = func(new Decimal(limit));
              currentCheck = value.lt(valCheck);
              if (decreasing) currentCheck = !currentCheck;
            }
            // If the inverse is between 9e15 and e9e15, search through layer 1 numbers.
            if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.pow(10, value);}
            else {
              // Checking whether the inverse is below 10^^9e15
              let limit = Decimal.tetrate(10, EXP_LIMIT);
              if (maxX.lt(limit)) currentCheck = true;
              else if (minX.gt(limit)) currentCheck = false;
              else {
                let valCheck = func(new Decimal(limit));
                currentCheck = value.lt(valCheck);
                if (decreasing) currentCheck = !currentCheck;
              }
              // If the inverse is between e9e15 and 10^^9e15, search through layers themselves.
              if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.tetrate(10, new Decimal(value).toNumber());}
              // If the inverse is above 10^^9e15, search through exponents of layers.
              else rangeApply = function(value : DecimalSource){return (new Decimal(value).gt(Math.log10(Number.MAX_VALUE)) ? Decimal.dInf : Decimal.tetrate(10, Decimal.pow(10, value).toNumber()))}
            }
          }
        }
      }
      else {
        reciprocal = true
        // Checking whether the inverse is above -1/9e15
        if (maxX.lt(-FIRST_NEG_LAYER)) currentCheck = false;
        else if (minX.gt(-FIRST_NEG_LAYER)) currentCheck = true;
        else {
          let valCheck = func(new Decimal(-FIRST_NEG_LAYER));
          currentCheck = value.gt(valCheck);
          if (decreasing) currentCheck = !currentCheck;
        }
        if (currentCheck) {
          // Checking whether the inverse is below -1/e9e15
          let limit = Decimal.pow(10, EXP_LIMIT).recip().neg();
          if (maxX.lt(limit)) currentCheck = true;
          else if (minX.gt(limit)) currentCheck = false;
          else {
            let valCheck = func(new Decimal(limit));
            currentCheck = value.lt(valCheck);
            if (decreasing) currentCheck = !currentCheck;
          }
          // If the inverse is between -1/e9e15 and -1/9e15, search through negatives of layer -1 numbers.
          if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.pow(10, value).recip().neg();}
          else {
            // Checking whether the inverse is below -1/10^^9e15
            let limit = Decimal.tetrate(10, EXP_LIMIT).neg();
            if (maxX.lt(limit)) currentCheck = true;
            else if (minX.gt(limit)) currentCheck = false;
            else {
              let valCheck = func(new Decimal(limit));
              currentCheck = value.lt(valCheck);
              if (decreasing) currentCheck = !currentCheck;
            }
            // If the inverse is between -1/10^^9e15 and -1/e9e15, search through reciprocals of negative layers themselves.
            if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.tetrate(10, new Decimal(value).toNumber()).recip().neg();}
            // If the inverse is above -1/10^^9e15, search through exponents of reciprocals of negative layers.
            else rangeApply = function(value : DecimalSource){return (new Decimal(value).gt(Math.log10(Number.MAX_VALUE)) ? Decimal.dZero : Decimal.tetrate(10, Decimal.pow(10, value).toNumber()).recip().neg())}
          }
        }
        else {
          reciprocal = false;
          // Checking whether the inverse is above -9e15
          if (maxX.lt(-EXP_LIMIT)) currentCheck = false;
          else if (minX.gt(-EXP_LIMIT)) currentCheck = true;
          else {
            let valCheck = func(new Decimal(-EXP_LIMIT));
            currentCheck = value.gt(valCheck);
            if (decreasing) currentCheck = !currentCheck;
          }
          // If the inverse is between -1/9e15 and -9e15, search through negatives of direct (layer 0) numbers.
          if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.neg(value);}
          else {
            // Checking whether the inverse is above -e9e15
            let limit = Decimal.pow(10, EXP_LIMIT).neg();
            if (maxX.lt(limit)) currentCheck = false;
            else if (minX.gt(limit)) currentCheck = true;
            else {
              let valCheck = func(new Decimal(limit));
              currentCheck = value.gt(valCheck);
              if (decreasing) currentCheck = !currentCheck;
            }
            // If the inverse is between -9e15 and -e9e15, search through negatives of layer 1 numbers.
            if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.pow(10, value).neg();}
            else {
              // Checking whether the inverse is above -10^^9e15
              let limit = Decimal.tetrate(10, EXP_LIMIT).neg();
              if (maxX.lt(limit)) currentCheck = false;
              else if (minX.gt(limit)) currentCheck = true;
              else {
                let valCheck = func(new Decimal(limit));
                currentCheck = value.gt(valCheck);
                if (decreasing) currentCheck = !currentCheck;
              }
              // If the inverse is between e9e15 and 10^^9e15, search through negatives of layers themselves.
              if (currentCheck) rangeApply = function(value : DecimalSource){return Decimal.tetrate(10, new Decimal(value).toNumber()).neg();}
              // If the inverse is below -10^^9e15, search through negatives of exponents of layers.
              else rangeApply = function(value : DecimalSource){return (new Decimal(value).gt(Math.log10(Number.MAX_VALUE)) ? Decimal.dNegInf : Decimal.tetrate(10, Decimal.pow(10, value).toNumber()).neg())}
            }
          }
        }
      }
      let searchIncreasing = ((positive != reciprocal) != decreasing);
      let comparative = searchIncreasing ? (function(a : DecimalSource, b : DecimalSource){return Decimal.gt(a, b)}) : (function(a : DecimalSource, b : DecimalSource){return Decimal.lt(a, b)});

      let step_size = 0.001;
      let has_changed_directions_once = false;
      let previously_rose = false;
      let result = 1;
      let appliedResult = Decimal.dOne;
      let oldresult = 0;
      let critical = false;
      for (var i = 1; i < iterations; ++i)
      {
        critical = false;
        oldresult = result;
        appliedResult = rangeApply(result);
        //Under no circumstances should we be calling func on something outside its domain.
        if (appliedResult.gt(maxX)) {
          appliedResult = maxX;
          critical = true;
        }
        if (appliedResult.lt(minX)) {
          appliedResult = minX;
          critical = true;
        }
        let new_decimal = func(appliedResult);
        if (new_decimal.eq(value) && !critical) { break; }
        let currently_rose = comparative(new_decimal, value);
        if (i > 1)
        {
          if (previously_rose != currently_rose)
          {
            has_changed_directions_once = true;
          }
        }
        previously_rose = currently_rose;
        if (has_changed_directions_once)
        {
          step_size /= 2;
        }
        else
        {
          step_size *= 2;
        }
        // If the inverse is trying to increase when it's already at maxX, or it's trying to decrease when it's already at minX, it's going outside the domain, so return NaN.
        if ((currently_rose != searchIncreasing && appliedResult.eq(maxX)) || (currently_rose == searchIncreasing && appliedResult.eq(minX))) return new Decimal(Decimal.dNaN);
        step_size = Math.abs(step_size) * (currently_rose ? -1 : 1);
        result += step_size;
        if (step_size === 0 || oldresult == result) { break; }
      }
      return rangeApply(result);
    }
  }

  /**
   * Pentation/pentate: The result of tetrating 'height' times in a row. An absurdly strong operator - Decimal.pentate(2, 4.28) and Decimal.pentate(10, 2.37) are already too huge for break_eternity.js!
   * https://en.wikipedia.org/wiki/Pentation
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  public pentate(height = 2, payload: DecimalSource = FC_NN(1, 0, 1), linear = false): Decimal {
    payload = new Decimal(payload);
    const oldheight = height;
    height = Math.floor(height);
    const fracheight = oldheight - height;
    let prevpayload = Decimal.dZero;
    let prevtwopayload = Decimal.dZero;

    // Linear approximation. I have no idea if this is a meaningful approximation for pentation to continuous heights, but it is monotonic and continuous.
    if (fracheight !== 0) {
      if (payload.eq(Decimal.dOne)) {
        ++height;
        payload = Decimal.fromNumber(fracheight);
      } else {
        // Despite calling penta_log, this is safe, as penta_log only calls pentation with payload 1.
        return this.pentate(payload.penta_log(this, undefined, linear).plus(oldheight).toNumber(), 1, linear);
      }
    }

    if (height > 0) {
      for (let i = 0; i < height; ) {
        prevtwopayload = prevpayload;
        prevpayload = payload;
        payload = this.tetrate(payload.toNumber(), Decimal.dOne, linear);
        ++i;
        // Under the linear approximation of pentation, if p is between 0 and 1, x^^^p == x^^p (which just equals x^p if tetration is also using the linear approximation)
        // ...and once both the base and payload are between 0 and 1, they'll both stay that way.
        if (this.gt(0) && this.lte(1) && payload.gt(0) && payload.lte(1)) return this.tetrate(height - i, payload, linear);
        // End early if it's settled on a limit. Bases close to 0 alternate between two possible values.
        if (payload.eq(prevpayload) || (payload.eq(prevtwopayload) && (i % 2 == height % 2))) return payload.normalize();
        //bail if we're NaN
        if (!isFinite(payload.layer) || !isFinite(payload.mag)) {
          return payload.normalize();
        }
        //give up after 10000 iterations if nothing is happening
        if (i > 10000) {
          return payload;
        }
      }
    }
    else {
      // Repeated slog is sloooow, but that's what negative pentation height means. Since it's just calling slog repeatedly anyway (without any layer shortcuts), I see no reason to make this its own function (whereas iteratedlog makes sense to be its own function even though it's negative height tetrate).
      for (let i = 0; i < -height; ++i) {
        prevpayload = payload;
        payload = payload.slog(this, undefined, linear);
        // End early if it's settled on a limit
        if (payload.eq(prevpayload)) return payload.normalize();
        //bail if we're NaN
        if (!isFinite(payload.layer) || !isFinite(payload.mag)) {
          return payload.normalize();
        }
        //give up after 100 iterations if nothing is happening
        if (i > 100) {
          return payload;
        }
      }
    }

    return payload;
  }

  /**
   * Penta-logarithm, one of pentation's inverses, tells you what height you'd have to pentate 'base' to to get 'this'.
   * 
   * Grows incredibly slowly. For bases above 2, you won't be seeing a result greater than 5 out of this function.
   * 
   * Accepts a number of iterations (default is 100), and use binary search to, after making an initial guess, hone in on the true value, assuming pentation as the ground truth.
   * 
   * Tetration for non-integer heights does not have a single agreed-upon definition,
   * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
   * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
   * Analytic approximation is not currently supported for bases > 10.
   * 
   * For non-whole pentation heights, the linear approximation of pentation is always used, as there is no defined analytic approximation of pentation.
   */
  // INCREDIBLY slow on numbers <= -1. Probably don't call it on those.
  // If you're here looking to port penta_log to OmegaNum, ExpantaNum, or something similar, then know that this implementation isn't sufficient for that purpose. The pentation functions here run loops without shortcuts, because in break_eternity the numbers don't get large enough to need those shortcuts.
  public penta_log(base: DecimalSource = 10, iterations = 100, linear = false) {
    base = new Decimal(base);
    // Bases below 1 oscillate, so the logarithm doesn't make sense
    if (base.lte(1)) return new Decimal(Decimal.dNaN);
    if (this.eq(1)) return FC_NN(0, 0, 0);
    if (this.eq(Decimal.dInf)) return new Decimal(Decimal.dInf);
    let value = new Decimal(1);
    let result = 0;
    let step_size = 1;

    // There's some x between -1 and -2, depending on the base, where base^^x == x. This x is base^^^(-Infinity), and we shouldn't bother with numbers less than that limit.
    if (this.lt(-1)) {
      if (this.lte(-2)) return new Decimal(Decimal.dNaN);
      let limitcheck = base.tetrate(this.toNumber(), 1, linear);
      if (this.eq(limitcheck)) return new Decimal(Decimal.dNegInf);
      if (this.gt(limitcheck)) return new Decimal(Decimal.dNaN);
    }
    
    // pentate runs through each tetration iteration anyway, so while we're narrowing down on the nearest integer it's faster to just check them one-by-one than to run through pentate every time
    if (this.gt(1)) {
      while (value.lt(this)) {
        result++;
        value = Decimal.tetrate(base, value.toNumber(), 1, linear);
        if (result > 1000) {
          // Probably reached a limit by this point.
          return new Decimal(Decimal.dNaN);
        }
      }
    }
    else {
      while (value.gt(this)) {
        result--;
        value = Decimal.slog(value, base, linear);
        if (result > 100) {
          // Probably reached the limit by this point.
          return new Decimal(Decimal.dNaN);
        }
      }
    }
    for (var i = 1; i < iterations; ++i) {
      let new_decimal = base.pentate(result, Decimal.dOne, linear);
      if (new_decimal.eq(this)) break;
      let currently_rose = new_decimal.gt(this);
      step_size = Math.abs(step_size) * (currently_rose ? -1 : 1);
      result += step_size;
      step_size /= 2;
      if (step_size === 0) { break; }
    }
    return Decimal.fromNumber(result);
  }

  /**
   * Penta-root, one of pentation's inverses - what number, pentated to height 'degree', equals 'this'?
   * 
   * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
   */
  public linear_penta_root(degree: number) : Decimal {
    //1st-degree super root just returns its input
    if (degree == 1) {
      return this;
    }
    //TODO: degree < 0 (A pretty useless case, seeing as it runs into the same issues as linear_sroot's degrees between -1 and 0 for degrees between -2 and 0, and for degrees below -2 it'll only have a value for negative numbers between -1 and... some limit between -1 and -2.)
    if (degree < 0) {
      return new Decimal(Decimal.dNaN);
    }
    if (this.eq(Decimal.dInf)) {
      return new Decimal(Decimal.dInf);
    }
    if (!this.isFinite()) {
      return new Decimal(Decimal.dNaN);
    }
    //Using linear approximation, x^^^n = x^n if 0 < n < 1
    if (degree > 0 && degree < 1) {
      return this.root(degree);
    }
    //Special case: any super-root of 1 is 1
    if (this.eq(1)) {
      return FC_NN(1, 0, 1);
    }
    //TODO: base < 0 (It'll probably be NaN anyway)
    if (this.lt(0)) {
      return new Decimal(Decimal.dNaN);
    }
    /* If 'this' is below 1, then the result is going to be below 1, meaning the original number was a tetration tower where all entries are below 1...
    ...and in the linear approximation, tetration with a height between 0 and 1 reduces to exponentiation of that height.
    Therefore, penta_root and sroot will return the same value. */
    if (this.lt(1)) {
      return this.linear_sroot(degree)
    }
    
    // Unlike with super-root, I'm not sure how to get a good upper bound here, so let's just call increasingInverse.
    return (Decimal.increasingInverse(function(value : Decimal){return Decimal.pentate(value, degree, 1, true)}))(this);
  }

  // trig functions!
  /**
   * The sine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  public sin(): this | Decimal {
    if (this.mag < 0) {
      return new Decimal(this);
    }
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.sin(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  /**
   * The cosine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
   */
  public cos(): Decimal {
    if (this.mag < 0) {
      return FC_NN(1, 0, 1);
    }
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.cos(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  /**
   * The tangent function, equal to sine divided by cosine. Behaves periodically with period pi.
   */
  public tan(): this | Decimal {
    if (this.mag < 0) {
      return new Decimal(this);
    }
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.tan(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  /**
   * The arcsine function, the inverse of the sine function.
   */
  public asin(): this | Decimal {
    if (this.mag < 0) {
      return new Decimal(this);
    }
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.asin(this.sign * this.mag));
    }
    return new Decimal(Decimal.dNaN);
  }

  /**
   * The arccosine function, the inverse of the cosine function.
   */
  public acos(): Decimal {
    if (this.mag < 0) {
      return Decimal.fromNumber(Math.acos(this.toNumber()));
    }
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.acos(this.sign * this.mag));
    }
    return new Decimal(Decimal.dNaN);
  }

  /**
   * The arctangent function, the inverse of the tangent function.
   */
  public atan(): this | Decimal {
    if (this.mag < 0) {
      return new Decimal(this);
    }
    if (this.layer === 0) {
      return Decimal.fromNumber(Math.atan(this.sign * this.mag));
    }
    return Decimal.fromNumber(Math.atan(this.sign * 1.8e308));
  }

  /**
   * Hyperbolic sine: sinh(X) = (e^x - e^-x)/2.
   */
  public sinh(): Decimal {
    return this.exp().sub(this.negate().exp()).div(2);
  }

  /**
   * Hyperbolic cosine: cosh(x) = (e^x + e^-x)/2.
   */
  public cosh(): Decimal {
    return this.exp().add(this.negate().exp()).div(2);
  }

  /**
   * Hyperbolic tangent: tanh(x) = sinh(x)/cosh(x).
   */
  public tanh(): Decimal {
    return this.sinh().div(this.cosh());
  }

  /**
   * Hyperbolic arcsine, the inverse of hyperbolic sine.
   */
  public asinh(): Decimal {
    return Decimal.ln(this.add(this.sqr().add(1).sqrt()));
  }

  /**
   * Hyperbolic arccosine, the inverse of hyperbolic cosine.
   */
  public acosh(): Decimal {
    return Decimal.ln(this.add(this.sqr().sub(1).sqrt()));
  }

  /**
   * Hyperbolic arcctangent, the inverse of hyperbolic tangent.
   */
  public atanh(): Decimal {
    if (this.abs().gte(1)) {
      return new Decimal(Decimal.dNaN);
    }

    return Decimal.ln(this.add(1).div(Decimal.fromNumber(1).sub(this))).div(2);
  }

  /**
   * Joke function from Realm Grinder
   */
  public ascensionPenalty(ascensions: DecimalSource): Decimal {
    if (ascensions === 0) {
      return new Decimal(this);
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

// Optimise Decimal aliases.
// We can't do this optimisation before Decimal is assigned.
D = Decimal.fromValue_noAlloc;
FC = Decimal.fromComponents;
FC_NN = Decimal.fromComponents_noNormalize;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
ME = Decimal.fromMantissaExponent;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
ME_NN = Decimal.fromMantissaExponent_noNormalize;