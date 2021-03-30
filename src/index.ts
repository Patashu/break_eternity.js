import padEnd from "pad-end";
// padEnd

var MAX_SIGNIFICANT_DIGITS = 17; //Maximum number of digits of precision to assume in Number

var EXP_LIMIT = 9e15; //If we're ABOVE this value, increase a layer. (9e15 is close to the largest integer that can fit in a Number.)

var LAYER_DOWN = Math.log10(9e15); //If we're BELOW this value, drop down a layer. About 15.954.

var FIRST_NEG_LAYER = 1 / 9e15; //At layer 0, smaller non-zero numbers than this become layer 1 numbers with negative mag. After that the pattern continues as normal.

var NUMBER_EXP_MAX = 308; //The largest exponent that can appear in a Number, though not all mantissas are valid here.

var NUMBER_EXP_MIN = -324; //The smallest exponent that can appear in a Number, though not all mantissas are valid here.

var MAX_ES_IN_A_ROW = 5; //For default toString behaviour, when to swap from eee... to (e^n) syntax.

const IGNORE_COMMAS = true;
const COMMAS_ARE_DECIMAL_POINTS = false;

var powerOf10 = (function () {
  // We need this lookup table because Math.pow(10, exponent)
  // when exponent's absolute value is large is slightly inaccurate.
  // You can fix it with the power of math... or just make a lookup table.
  // Faster AND simpler
  var powersOf10 = [];

  for (var i = NUMBER_EXP_MIN + 1; i <= NUMBER_EXP_MAX; i++) {
    powersOf10.push(Number("1e" + i));
  }

  var indexOf0InPowersOf10 = 323;
  return function (power) {
    return powersOf10[power + indexOf0InPowersOf10];
  };
})();

var D = function D(value) {
  return Decimal.fromValue_noAlloc(value);
};

var FC = function FC(sign, layer, mag) {
  return Decimal.fromComponents(sign, layer, mag);
};

var FC_NN = function FC_NN(sign, layer, mag) {
  return Decimal.fromComponents_noNormalize(sign, layer, mag);
};

var ME = function ME(mantissa, exponent) {
  return Decimal.fromMantissaExponent(mantissa, exponent);
};

var ME_NN = function ME_NN(mantissa, exponent) {
  return Decimal.fromMantissaExponent_noNormalize(mantissa, exponent);
};

var decimalPlaces = function decimalPlaces(value, places) {
  var len = places + 1;
  var numDigits = Math.ceil(Math.log10(Math.abs(value)));
  var rounded = Math.round(value * Math.pow(10, len - numDigits)) * Math.pow(10, numDigits - len);
  return parseFloat(rounded.toFixed(Math.max(len - numDigits, 0)));
};

var f_maglog10 = function (n) {
  return Math.sign(n) * Math.log10(Math.abs(n));
};

//from HyperCalc source code
var f_gamma = function (n) {
  if (!isFinite(n)) {
    return n;
  }
  if (n < -50) {
    if (n === Math.trunc(n)) {
      return Number.NEGATIVE_INFINITY;
    }
    return 0;
  }

  var scal1 = 1;
  while (n < 10) {
    scal1 = scal1 * n;
    ++n;
  }

  n -= 1;
  var l = 0.9189385332046727; //0.5*Math.log(2*Math.PI)
  l = l + (n + 0.5) * Math.log(n);
  l = l - n;
  var n2 = n * n;
  var np = n;
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

var twopi = 6.2831853071795864769252842; // 2*pi
var EXPN1 = 0.36787944117144232159553; // exp(-1)
var OMEGA = 0.56714329040978387299997; // W(1, 0)
//from https://math.stackexchange.com/a/465183
// The evaluation can become inaccurate very close to the branch point
var f_lambertw = function (z, tol = 1e-10) {
  var w;
  var wn;

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

  for (var i = 0; i < 100; ++i) {
    wn = (z * Math.exp(-w) + w * w) / (w + 1);
    if (Math.abs(wn - w) < tol * Math.abs(wn)) {
      return wn;
    } else {
      w = wn;
    }
  }

  throw Error("Iteration failed to converge: " + z);
  //return Number.NaN;
};

//from https://github.com/scipy/scipy/blob/8dba340293fe20e62e173bdf2c10ae208286692f/scipy/special/lambertw.pxd
// The evaluation can become inaccurate very close to the branch point
// at ``-1/e``. In some corner cases, `lambertw` might currently
// fail to converge, or can end up on the wrong branch.
function d_lambertw(z, tol = 1e-10) {
  var w;
  var ew, wew, wewz, wn;

  if (!Number.isFinite(z.mag)) {
    return z;
  }
  if (z === 0) {
    return z;
  }
  if (z === 1) {
    //Split out this case because the asymptotic series blows up
    return OMEGA;
  }

  var absz = Decimal.abs(z);
  //Get an initial guess for Halley's method
  w = Decimal.ln(z);

  //Halley's method; see 5.9 in [1]

  for (var i = 0; i < 100; ++i) {
    ew = Decimal.exp(-w);
    wewz = w.sub(z.mul(ew));
    wn = w.sub(wewz.div(w.add(1).sub(w.add(2).mul(wewz).div(Decimal.mul(2, w).add(2)))));
    if (Decimal.abs(wn.sub(w)).lt(Decimal.abs(wn).mul(tol))) {
      return wn;
    } else {
      w = wn;
    }
  }

  throw Error("Iteration failed to converge: " + z);
  //return Decimal.dNaN;
}

export type DecimalSource = Decimal | number | string;

/**
 * The Decimal's value is simply mantissa * 10^exponent.
 */
export default class Decimal {
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

  public sign: number = Number.NaN;
  public mag: number = Number.NaN;
  public layer: number = Number.NaN;

  get m() {
    if (this.sign === 0) {
      return 0;
    } else if (this.layer === 0) {
      var exp = Math.floor(Math.log10(this.mag));
      //handle special case 5e-324
      var man;
      if (this.mag === 5e-324) {
        man = 5;
      } else {
        man = this.mag / powerOf10(exp);
      }
      return this.sign * man;
    } else if (this.layer === 1) {
      var residue = this.mag - Math.floor(this.mag);
      return this.sign * Math.pow(10, residue);
    } else {
      //mantissa stops being relevant past 1e9e15 / ee15.954
      return this.sign;
    }
  }

  set m(value) {
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

  get e() {
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
  set e(value) {
    this.fromMantissaExponent(this.m, value);
  }

  get s() {
    return this.sign;
  }
  set s(value) {
    if (value === 0) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
    } else {
      this.sign = value;
    }
  }

  // Object.defineProperty(Decimal.prototype, "mantissa", {
  get mantissa() {
    return this.m;
  }

  set mantissa(value) {
    this.m = value;
  }

  get exponent() {
    return this.e;
  }
  set exponent(value) {
    this.e = value;
  }

  public static fromComponents(sign, layer, mag) {
    return new Decimal().fromComponents(sign, layer, mag);
  }

  public static fromComponents_noNormalize(sign, layer, mag) {
    return new Decimal().fromComponents_noNormalize(sign, layer, mag);
  }

  public static fromMantissaExponent(mantissa, exponent) {
    return new Decimal().fromMantissaExponent(mantissa, exponent);
  }

  public static fromMantissaExponent_noNormalize(mantissa, exponent) {
    return new Decimal().fromMantissaExponent_noNormalize(mantissa, exponent);
  }

  public static fromDecimal(value) {
    return new Decimal().fromDecimal(value);
  }

  public static fromNumber(value) {
    return new Decimal().fromNumber(value);
  }

  public static fromString(value) {
    return new Decimal().fromString(value);
  }

  public static fromValue(value) {
    return new Decimal().fromValue(value);
  }

  public static fromValue_noAlloc(value) {
    return value instanceof Decimal ? value : new Decimal(value);
  }

  public static abs(value) {
    return D(value).abs();
  }

  public static neg(value) {
    return D(value).neg();
  }

  public static negate(value) {
    return D(value).neg();
  }

  public static negated(value) {
    return D(value).neg();
  }

  public static sign(value) {
    return D(value).sign;
  }

  public static sgn(value) {
    return D(value).sign;
  }

  public static round(value) {
    return D(value).round();
  }

  public static floor(value) {
    return D(value).floor();
  }

  public static ceil(value) {
    return D(value).ceil();
  }

  public static trunc(value) {
    return D(value).trunc();
  }

  public static add(value, other) {
    return D(value).add(other);
  }

  public static plus(value, other) {
    return D(value).add(other);
  }

  public static sub(value, other) {
    return D(value).sub(other);
  }

  public static subtract(value, other) {
    return D(value).sub(other);
  }

  public static minus(value, other) {
    return D(value).sub(other);
  }

  public static mul(value, other) {
    return D(value).mul(other);
  }

  public static multiply(value, other) {
    return D(value).mul(other);
  }

  public static times(value, other) {
    return D(value).mul(other);
  }

  public static div(value, other) {
    return D(value).div(other);
  }

  public static divide(value, other) {
    return D(value).div(other);
  }

  public static recip(value) {
    return D(value).recip();
  }

  public static reciprocal(value) {
    return D(value).recip();
  }

  public static reciprocate(value) {
    return D(value).reciprocate();
  }

  public static cmp(value, other) {
    return D(value).cmp(other);
  }

  public static cmpabs(value, other) {
    return D(value).cmpabs(other);
  }

  public static compare(value, other) {
    return D(value).cmp(other);
  }

  public static eq(value, other) {
    return D(value).eq(other);
  }

  public static equals(value, other) {
    return D(value).eq(other);
  }

  public static neq(value, other) {
    return D(value).neq(other);
  }

  public static notEquals(value, other) {
    return D(value).notEquals(other);
  }

  public static lt(value, other) {
    return D(value).lt(other);
  }

  public static lte(value, other) {
    return D(value).lte(other);
  }

  public static gt(value, other) {
    return D(value).gt(other);
  }

  public static gte(value, other) {
    return D(value).gte(other);
  }

  public static max(value, other) {
    return D(value).max(other);
  }

  public static min(value, other) {
    return D(value).min(other);
  }

  public static minabs(value, other) {
    return D(value).minabs(other);
  }

  public static maxabs(value, other) {
    return D(value).maxabs(other);
  }

  public static clamp(value, min, max) {
    return D(value).clamp(min, max);
  }

  public static clampMin(value, min) {
    return D(value).clampMin(min);
  }

  public static clampMax(value, max) {
    return D(value).clampMax(max);
  }

  public static cmp_tolerance(value, other, tolerance) {
    return D(value).cmp_tolerance(other, tolerance);
  }

  public static compare_tolerance(value, other, tolerance) {
    return D(value).cmp_tolerance(other, tolerance);
  }

  public static eq_tolerance(value, other, tolerance) {
    return D(value).eq_tolerance(other, tolerance);
  }

  public static equals_tolerance(value, other, tolerance) {
    return D(value).eq_tolerance(other, tolerance);
  }

  public static neq_tolerance(value, other, tolerance) {
    return D(value).neq_tolerance(other, tolerance);
  }

  public static notEquals_tolerance(value, other, tolerance) {
    return D(value).notEquals_tolerance(other, tolerance);
  }

  public static lt_tolerance(value, other, tolerance) {
    return D(value).lt_tolerance(other, tolerance);
  }

  public static lte_tolerance(value, other, tolerance) {
    return D(value).lte_tolerance(other, tolerance);
  }

  public static gt_tolerance(value, other, tolerance) {
    return D(value).gt_tolerance(other, tolerance);
  }

  public static gte_tolerance(value, other, tolerance) {
    return D(value).gte_tolerance(other, tolerance);
  }

  public static pLog10(value) {
    return D(value).pLog10();
  }

  public static absLog10(value) {
    return D(value).absLog10();
  }

  public static log10(value) {
    return D(value).log10();
  }

  public static log(value, base) {
    return D(value).log(base);
  }

  public static log2(value) {
    return D(value).log2();
  }

  public static ln(value) {
    return D(value).ln();
  }

  public static logarithm(value, base) {
    return D(value).logarithm(base);
  }

  public static pow(value, other) {
    return D(value).pow(other);
  }

  public static pow10(value) {
    return D(value).pow10();
  }

  public static root(value, other) {
    return D(value).root(other);
  }

  public static factorial(value, other) {
    return D(value).factorial();
  }

  public static gamma(value, other) {
    return D(value).gamma();
  }

  public static lngamma(value, other) {
    return D(value).lngamma();
  }

  public static exp(value) {
    return D(value).exp();
  }

  public static sqr(value) {
    return D(value).sqr();
  }

  public static sqrt(value) {
    return D(value).sqrt();
  }

  public static cube(value) {
    return D(value).cube();
  }

  public static cbrt(value) {
    return D(value).cbrt();
  }

  public static tetrate(value, height = 2, payload = FC_NN(1, 0, 1)) {
    return D(value).tetrate(height, payload);
  }

  public static iteratedexp(value, height = 2, payload = FC_NN(1, 0, 1)) {
    return D(value).iteratedexp(height, payload);
  }

  public static iteratedlog(value, base = 10, times = 1) {
    return D(value).iteratedlog(base, times);
  }

  public static layeradd10(value, diff) {
    return D(value).layeradd10(diff);
  }

  public static layeradd(value, diff, base = 10) {
    return D(value).layeradd(diff, base);
  }

  public static slog(value, base = 10) {
    return D(value).slog(base);
  }

  public static lambertw(value) {
    return D(value).lambertw();
  }

  public static ssqrt(value) {
    return D(value).ssqrt();
  }

  public static pentate(value, height = 2, payload = FC_NN(1, 0, 1)) {
    return D(value).pentate(height, payload);
  }

  /**
   * If you're willing to spend 'resourcesAvailable' and want to buy something
   * with exponentially increasing cost each purchase (start at priceStart,
   * multiply by priceRatio, already own currentOwned), how much of it can you buy?
   * Adapted from Trimps source code.
   */

  public static affordGeometricSeries(resourcesAvailable, priceStart, priceRatio, currentOwned) {
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

  public static sumGeometricSeries(numItems, priceStart, priceRatio, currentOwned) {
    return this.sumGeometricSeries_core(numItems, D(priceStart), D(priceRatio), currentOwned);
  }
  /**
   * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
   * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
   * how much of it can you buy?
   */

  public static affordArithmeticSeries(resourcesAvailable, priceStart, priceAdd, currentOwned) {
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

  public static sumArithmeticSeries(numItems, priceStart, priceAdd, currentOwned) {
    return this.sumArithmeticSeries_core(D(numItems), D(priceStart), D(priceAdd), D(currentOwned));
  }
  /**
   * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
   * the lowest efficiency score is the better one to purchase.
   * From Frozen Cookies:
   * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
   */

  public static efficiencyOfPurchase(cost, currentRpS, deltaRpS) {
    return this.efficiencyOfPurchase_core(D(cost), D(currentRpS), D(deltaRpS));
  }

  public static randomDecimalForTesting(maxLayers) {
    // NOTE: This doesn't follow any kind of sane random distribution, so use this for testing purposes only.
    //5% of the time, return 0
    if (Math.random() * 20 < 1) {
      return FC_NN(0, 0, 0);
    }

    var randomsign = Math.random() > 0.5 ? 1 : -1;

    //5% of the time, return 1 or -1
    if (Math.random() * 20 < 1) {
      return FC_NN(randomsign, 0, 1);
    }

    //pick a random layer
    var layer = Math.floor(Math.random() * (maxLayers + 1));

    var randomexp = layer === 0 ? Math.random() * 616 - 308 : Math.random() * 16;
    //10% of the time, make it a simple power of 10
    if (Math.random() > 0.9) {
      randomexp = Math.trunc(randomexp);
    }
    var randommag = Math.pow(10, randomexp);
    //10% of the time, trunc mag
    if (Math.random() > 0.9) {
      randommag = Math.trunc(randommag);
    }
    return FC(randomsign, layer, randommag);
  }

  public static affordGeometricSeries_core(
    resourcesAvailable,
    priceStart,
    priceRatio,
    currentOwned
  ) {
    var actualStart = priceStart.mul(priceRatio.pow(currentOwned));
    return Decimal.floor(
      resourcesAvailable
        .div(actualStart)
        .mul(priceRatio.sub(1))
        .add(1)
        .log10()
        .div(priceRatio.log10())
    );
  }

  public static sumGeometricSeries_core(numItems, priceStart, priceRatio, currentOwned) {
    return priceStart
      .mul(priceRatio.pow(currentOwned))
      .mul(Decimal.sub(1, priceRatio.pow(numItems)))
      .div(Decimal.sub(1, priceRatio));
  }

  public static affordArithmeticSeries_core(
    resourcesAvailable,
    priceStart,
    priceAdd,
    currentOwned
  ) {
    // n = (-(a-d/2) + sqrt((a-d/2)^2+2dS))/d
    // where a is actualStart, d is priceAdd and S is resourcesAvailable
    // then floor it and you're done!
    var actualStart = priceStart.add(currentOwned.mul(priceAdd));
    var b = actualStart.sub(priceAdd.div(2));
    var b2 = b.pow(2);
    return b
      .neg()
      .add(b2.add(priceAdd.mul(resourcesAvailable).mul(2)).sqrt())
      .div(priceAdd)
      .floor();
  }

  public static sumArithmeticSeries_core(numItems, priceStart, priceAdd, currentOwned) {
    var actualStart = priceStart.add(currentOwned.mul(priceAdd)); // (n/2)*(2*a+(n-1)*d)

    return numItems.div(2).mul(actualStart.mul(2).plus(numItems.sub(1).mul(priceAdd)));
  }

  public static efficiencyOfPurchase_core(cost, currentRpS, deltaRpS) {
    return cost.div(currentRpS).add(cost.div(deltaRpS));
  }

  public normalize() {
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

    var absmag = Math.abs(this.mag);
    var signmag = Math.sign(this.mag);

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

  public fromComponents(sign, layer, mag) {
    this.sign = sign;
    this.layer = layer;
    this.mag = mag;

    this.normalize();
    return this;
  }

  public fromComponents_noNormalize(sign, layer, mag) {
    this.sign = sign;
    this.layer = layer;
    this.mag = mag;
    return this;
  }

  public fromMantissaExponent(mantissa, exponent) {
    this.layer = 1;
    this.sign = Math.sign(mantissa);
    mantissa = Math.abs(mantissa);
    this.mag = exponent + Math.log10(mantissa);

    this.normalize();
    return this;
  }

  public fromMantissaExponent_noNormalize(mantissa, exponent) {
    //The idea of 'normalizing' a break_infinity.js style Decimal doesn't really apply. So just do the same thing.
    this.fromMantissaExponent(mantissa, exponent);
    return this;
  }

  public fromDecimal(value) {
    this.sign = value.sign;
    this.layer = value.layer;
    this.mag = value.mag;
    return this;
  }

  public fromNumber(value) {
    this.mag = Math.abs(value);
    this.sign = Math.sign(value);
    this.layer = 0;
    this.normalize();
    return this;
  }

  public fromString(value: string) {
    if (IGNORE_COMMAS) {
      value = value.replace(",", "");
    } else if (COMMAS_ARE_DECIMAL_POINTS) {
      value = value.replace(",", ".");
    }

    //Handle x^^^y format.
    var pentationparts = value.split("^^^");
    if (pentationparts.length === 2) {
      var base = parseFloat(pentationparts[0]);
      var height = parseFloat(pentationparts[1]);
      var payload = 1;
      var heightparts = pentationparts[1].split(";");
      if (heightparts.length === 2) {
        var payload = parseFloat(heightparts[1]);
        if (!isFinite(payload)) {
          payload = 1;
        }
      }
      if (isFinite(base) && isFinite(height)) {
        var result = Decimal.pentate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //Handle x^^y format.
    var tetrationparts = value.split("^^");
    if (tetrationparts.length === 2) {
      var base = parseFloat(tetrationparts[0]);
      var height = parseFloat(tetrationparts[1]);
      var heightparts = tetrationparts[1].split(";");
      if (heightparts.length === 2) {
        var payload = parseFloat(heightparts[1]);
        if (!isFinite(payload)) {
          payload = 1;
        }
      }
      if (isFinite(base) && isFinite(height)) {
        var result = Decimal.tetrate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //Handle x^y format.
    var powparts = value.split("^");
    if (powparts.length === 2) {
      var base = parseFloat(powparts[0]);
      var exponent = parseFloat(powparts[1]);
      if (isFinite(base) && isFinite(exponent)) {
        var result = Decimal.pow(base, exponent);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //Handle various cases involving it being a Big Number.
    value = value.trim().toLowerCase();

    //handle X PT Y format.
    var ptparts = value.split("pt");
    if (ptparts.length === 2) {
      base = 10;
      height = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      var payload = parseFloat(ptparts[1]);
      if (!isFinite(payload)) {
        payload = 1;
      }
      if (isFinite(base) && isFinite(height)) {
        var result = Decimal.tetrate(base, height, payload);
        this.sign = result.sign;
        this.layer = result.layer;
        this.mag = result.mag;
        return this;
      }
    }

    //handle XpY format (it's the same thing just with p).
    var ptparts = value.split("p");
    if (ptparts.length === 2) {
      base = 10;
      height = parseFloat(ptparts[0]);
      ptparts[1] = ptparts[1].replace("(", "");
      ptparts[1] = ptparts[1].replace(")", "");
      var payload = parseFloat(ptparts[1]);
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

    var parts = value.split("e");
    var ecount = parts.length - 1;

    //Handle numbers that are exactly floats (0 or 1 es).
    if (ecount === 0) {
      var numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt)) {
        return this.fromNumber(numberAttempt);
      }
    } else if (ecount === 1) {
      //Very small numbers ("2e-3000" and so on) may look like valid floats but round to 0.
      var numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt) && numberAttempt !== 0) {
        return this.fromNumber(numberAttempt);
      }
    }

    //Handle new (e^N)X format.
    var newparts = value.split("e^");
    if (newparts.length === 2) {
      this.sign = 1;
      if (newparts[0].charAt(0) == "-") {
        this.sign = -1;
      }
      var layerstring = "";
      for (var i = 0; i < newparts[1].length; ++i) {
        var chrcode = newparts[1].charCodeAt(i);
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
    var mantissa = parseFloat(parts[0]);
    if (mantissa === 0) {
      this.sign = 0;
      this.layer = 0;
      this.mag = 0;
      return this;
    }
    var exponent = parseFloat(parts[parts.length - 1]);
    //handle numbers like AeBeC and AeeeeBeC
    if (ecount >= 2) {
      var me = parseFloat(parts[parts.length - 2]);
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
        var result = Decimal.mul(FC(1, 2, exponent), D(mantissa));
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

  public fromValue(value) {
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

  public toNumber() {
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

  public mantissaWithDecimalPlaces(places) {
    // https://stackoverflow.com/a/37425022
    if (isNaN(this.m)) {
      return Number.NaN;
    }

    if (this.m === 0) {
      return 0;
    }

    return decimalPlaces(this.m, places);
  }

  public magnitudeWithDecimalPlaces(places) {
    // https://stackoverflow.com/a/37425022
    if (isNaN(this.mag)) {
      return Number.NaN;
    }

    if (this.mag === 0) {
      return 0;
    }

    return decimalPlaces(this.mag, places);
  }

  public toString() {
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

  public toExponential(places) {
    if (this.layer === 0) {
      return (this.sign * this.mag).toExponential(places);
    }
    return this.toStringWithDecimalPlaces(places);
  }

  public toFixed(places) {
    if (this.layer === 0) {
      return (this.sign * this.mag).toFixed(places);
    }
    return this.toStringWithDecimalPlaces(places);
  }

  public toPrecision(places) {
    if (this.e <= -7) {
      return this.toExponential(places - 1);
    }

    if (places > this.e) {
      return this.toFixed(places - this.exponent - 1);
    }

    return this.toExponential(places - 1);
  }

  public valueOf() {
    return this.toString();
  }

  public toJSON() {
    return this.toString();
  }

  public toStringWithDecimalPlaces(places) {
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

  public abs() {
    return FC_NN(this.sign === 0 ? 0 : 1, this.layer, this.mag);
  }

  public neg() {
    return FC_NN(-this.sign, this.layer, this.mag);
  }

  public negate() {
    return this.neg();
  }

  public negated() {
    return this.neg();
  }

  // public sign () {
  //     return this.sign;
  //   }

  public sgn() {
    return this.sign;
  }

  public round() {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.round(this.mag));
    }
    return this;
  }

  public floor() {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.floor(this.mag));
    }
    return this;
  }

  public ceil() {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.ceil(this.mag));
    }
    return this;
  }

  public trunc() {
    if (this.mag < 0) {
      return Decimal.dZero;
    }
    if (this.layer === 0) {
      return FC(this.sign, 0, Math.trunc(this.mag));
    }
    return this;
  }

  public add(value) {
    var decimal = D(value);

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

    var a;
    var b;

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

    var layera = a.layer * Math.sign(a.mag);
    var layerb = b.layer * Math.sign(b.mag);

    //If one of the numbers is 2+ layers higher than the other, just take the bigger number.
    if (layera - layerb >= 2) {
      return a;
    }

    if (layera === 0 && layerb === -1) {
      if (Math.abs(b.mag - Math.log10(a.mag)) > MAX_SIGNIFICANT_DIGITS) {
        return a;
      } else {
        var magdiff = Math.pow(10, Math.log10(a.mag) - b.mag);
        var mantissa = b.sign + a.sign * magdiff;
        return FC(Math.sign(mantissa), 1, b.mag + Math.log10(Math.abs(mantissa)));
      }
    }

    if (layera === 1 && layerb === 0) {
      if (Math.abs(a.mag - Math.log10(b.mag)) > MAX_SIGNIFICANT_DIGITS) {
        return a;
      } else {
        var magdiff = Math.pow(10, a.mag - Math.log10(b.mag));
        var mantissa = b.sign + a.sign * magdiff;
        return FC(Math.sign(mantissa), 1, Math.log10(b.mag) + Math.log10(Math.abs(mantissa)));
      }
    }

    if (Math.abs(a.mag - b.mag) > MAX_SIGNIFICANT_DIGITS) {
      return a;
    } else {
      var magdiff = Math.pow(10, a.mag - b.mag);
      var mantissa = b.sign + a.sign * magdiff;
      return FC(Math.sign(mantissa), 1, b.mag + Math.log10(Math.abs(mantissa)));
    }

    throw Error("Bad arguments to add: " + this + ", " + value);
  }

  public plus(value) {
    return this.add(value);
  }

  public sub(value) {
    return this.add(D(value).neg());
  }

  public subtract(value) {
    return this.sub(value);
  }

  public minus(value) {
    return this.sub(value);
  }

  public mul(value) {
    var decimal = D(value);

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

    var a;
    var b;

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
      var newmag = FC(Math.sign(a.mag), a.layer - 1, Math.abs(a.mag)).add(
        FC(Math.sign(b.mag), b.layer - 1, Math.abs(b.mag))
      );
      return FC(a.sign * b.sign, newmag.layer + 1, newmag.sign * newmag.mag);
    }

    if (a.layer === 2 && b.layer === 2) {
      var newmag = FC(Math.sign(a.mag), a.layer - 1, Math.abs(a.mag)).add(
        FC(Math.sign(b.mag), b.layer - 1, Math.abs(b.mag))
      );
      return FC(a.sign * b.sign, newmag.layer + 1, newmag.sign * newmag.mag);
    }

    throw Error("Bad arguments to mul: " + this + ", " + value);
  }

  public multiply(value) {
    return this.mul(value);
  }

  public times(value) {
    return this.mul(value);
  }

  public div(value) {
    var decimal = D(value);
    return this.mul(decimal.recip());
  }

  public divide(value) {
    return this.div(value);
  }

  public divideBy(value) {
    return this.div(value);
  }

  public dividedBy(value) {
    return this.div(value);
  }

  public recip() {
    if (this.mag === 0) {
      return Decimal.dNaN;
    } else if (this.layer === 0) {
      return FC(this.sign, 0, 1 / this.mag);
    } else {
      return FC(this.sign, this.layer, -this.mag);
    }
  }

  public reciprocal() {
    return this.recip();
  }

  public reciprocate() {
    return this.recip();
  }

  /**
   * -1 for less than value, 0 for equals value, 1 for greater than value
   */
  public cmp(value) {
    var decimal = D(value);
    if (this.sign > decimal.sign) {
      return 1;
    }
    if (this.sign < decimal.sign) {
      return -1;
    }
    return this.sign * this.cmpabs(value);
  }

  public cmpabs(value) {
    var decimal = D(value);
    var layera = this.mag > 0 ? this.layer : -this.layer;
    var layerb = decimal.mag > 0 ? decimal.layer : -decimal.layer;
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

  public compare(value) {
    return this.cmp(value);
  }

  public eq(value) {
    var decimal = D(value);
    return this.sign === decimal.sign && this.layer === decimal.layer && this.mag === decimal.mag;
  }

  public equals(value) {
    return this.eq(value);
  }

  public neq(value) {
    return !this.eq(value);
  }

  public notEquals(value) {
    return this.neq(value);
  }

  public lt(value) {
    var decimal = D(value);
    return this.cmp(value) === -1;
  }

  public lte(value) {
    return !this.gt(value);
  }

  public gt(value) {
    var decimal = D(value);
    return this.cmp(value) === 1;
  }

  public gte(value) {
    return !this.lt(value);
  }

  public max(value) {
    var decimal = D(value);
    return this.lt(decimal) ? decimal : this;
  }

  public min(value) {
    var decimal = D(value);
    return this.gt(decimal) ? decimal : this;
  }

  public maxabs(value) {
    var decimal = D(value);
    return this.cmpabs(decimal) < 0 ? decimal : this;
  }

  public minabs(value) {
    var decimal = D(value);
    return this.cmpabs(decimal) > 0 ? decimal : this;
  }

  public clamp(min, max) {
    return this.max(min).min(max);
  }

  public clampMin(min) {
    return this.max(min);
  }

  public clampMax(max) {
    return this.min(max);
  }

  public cmp_tolerance(value, tolerance) {
    var decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) ? 0 : this.cmp(decimal);
  }

  public compare_tolerance(value, tolerance) {
    return this.cmp_tolerance(value, tolerance);
  }

  /**
   * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
   * For example, if you put in 1e-9, then any number closer to the
   * larger number than (larger number)*1e-9 will be considered equal.
   */
  public eq_tolerance(value, tolerance) {
    var decimal = D(value); // https://stackoverflow.com/a/33024979
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
    var magA = this.mag;
    var magB = decimal.mag;
    if (this.layer > decimal.layer) {
      magB = f_maglog10(magB);
    }
    if (this.layer < decimal.layer) {
      magA = f_maglog10(magA);
    }
    return Math.abs(magA - magB) <= tolerance * Math.max(Math.abs(magA), Math.abs(magB));
  }

  public equals_tolerance(value, tolerance) {
    return this.eq_tolerance(value, tolerance);
  }

  public neq_tolerance(value, tolerance) {
    return !this.eq_tolerance(value, tolerance);
  }

  public notEquals_tolerance(value, tolerance) {
    return this.neq_tolerance(value, tolerance);
  }

  public lt_tolerance(value, tolerance) {
    var decimal = D(value);
    return !this.eq_tolerance(decimal, tolerance) && this.lt(decimal);
  }

  public lte_tolerance(value, tolerance) {
    var decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) || this.lt(decimal);
  }

  public gt_tolerance(value, tolerance) {
    var decimal = D(value);
    return !this.eq_tolerance(decimal, tolerance) && this.gt(decimal);
  }

  public gte_tolerance(value, tolerance) {
    var decimal = D(value);
    return this.eq_tolerance(decimal, tolerance) || this.gt(decimal);
  }

  public pLog10() {
    if (this.lt(Decimal.dZero)) {
      return Decimal.dZero;
    }
    return this.log10();
  }

  public absLog10() {
    if (this.sign === 0) {
      return Decimal.dNaN;
    } else if (this.layer > 0) {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    } else {
      return FC(1, 0, Math.log10(this.mag));
    }
  }

  public log10() {
    if (this.sign <= 0) {
      return Decimal.dNaN;
    } else if (this.layer > 0) {
      return FC(Math.sign(this.mag), this.layer - 1, Math.abs(this.mag));
    } else {
      return FC(this.sign, 0, Math.log10(this.mag));
    }
  }

  public log(base) {
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

  public log2() {
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

  public ln() {
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

  public logarithm(base) {
    return this.log(base);
  }

  public pow(value) {
    var decimal = D(value);
    var a = this;
    var b = decimal;

    //special case: if a is 0, then return 0
    if (a.sign === 0) {
      return a;
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

    var result = a.absLog10().mul(b).pow10();

    if (this.sign === -1 && b.toNumber() % 2 === 1) {
      return result.neg();
    }

    return result;
  }

  public pow10() {
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

    var a = this;

    //handle layer 0 case - if no precision is lost just use Math.pow, else promote one layer
    if (a.layer === 0) {
      var newmag = Math.pow(10, a.sign * a.mag);
      if (Number.isFinite(newmag) && Math.abs(newmag) > 0.1) {
        return FC(1, 0, newmag);
      } else {
        if (a.sign === 0) {
          return Decimal.dOne;
        } else {
          a = FC_NN(a.sign, a.layer + 1, Math.log10(a.mag));
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

  public pow_base(value) {
    return D(value).pow(this);
  }

  public root(value) {
    var decimal = D(value);
    return this.pow(decimal.recip());
  }

  public factorial() {
    if (this.mag < 0) {
      return this.toNumber().add(1).gamma();
    } else if (this.layer === 0) {
      return this.add(1).gamma();
    } else if (this.layer === 1) {
      return Decimal.exp(Decimal.mul(this, Decimal.ln(this).sub(1)));
    } else {
      return Decimal.exp(this);
    }
  }

  //from HyperCalc source code
  public gamma() {
    if (this.mag < 0) {
      return this.recip();
    } else if (this.layer === 0) {
      if (this.lt(FC_NN(1, 0, 24))) {
        return D(f_gamma(this.sign * this.mag));
      }

      var t = this.mag - 1;
      var l = 0.9189385332046727; //0.5*Math.log(2*Math.PI)
      l = l + (t + 0.5) * Math.log(t);
      l = l - t;
      var n2 = t * t;
      var np = t;
      var lm = 12 * np;
      var adj = 1 / lm;
      var l2 = l + adj;
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
      var lt = 1 / lm;
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

  public lngamma() {
    return this.gamma().ln();
  }

  public exp() {
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

  public sqr() {
    return this.pow(2);
  }

  public sqrt() {
    if (this.layer === 0) {
      return D(Math.sqrt(this.sign * this.mag));
    } else if (this.layer === 1) {
      return FC(1, 2, Math.log10(this.mag) - 0.3010299956639812);
    } else {
      var result = Decimal.div(FC_NN(this.sign, this.layer - 1, this.mag), FC_NN(1, 0, 2));
      result.layer += 1;
      result.normalize();
      return result;
    }
  }

  public cube() {
    return this.pow(3);
  }

  public cbrt() {
    return this.pow(1 / 3);
  }

  //Tetration/tetrate: The result of exponentiating 'this' to 'this' 'height' times in a row.  https://en.wikipedia.org/wiki/Tetration
  //If payload != 1, then this is 'iterated exponentiation', the result of exping (payload) to base (this) (height) times. https://andydude.github.io/tetration/archives/tetration2/ident.html
  //Works with negative and positive real heights.
  public tetrate(height = 2, payload = FC_NN(1, 0, 1)) {
    if (height === Number.POSITIVE_INFINITY) {
      //Formula for infinite height power tower.
      var negln = Decimal.ln(this).neg();
      return negln.lambertw().div(negln);
    }

    if (height < 0) {
      return Decimal.iteratedlog(payload, this, -height);
    }

    payload = D(payload);
    var oldheight = height;
    height = Math.trunc(height);
    var fracheight = oldheight - height;

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

    for (var i = 0; i < height; ++i) {
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
  public iteratedexp(height = 2, payload = FC_NN(1, 0, 1)) {
    return this.tetrate(height, payload);
  }

  //iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting (times) from the number's slog representation. Equivalent to tetrating to a negative height.
  //Works with negative and positive real heights.
  public iteratedlog(base = 10, times = 1) {
    if (times < 0) {
      return Decimal.tetrate(base, -times, this);
    }

    base = D(base);
    var result = D(this);
    var fulltimes = times;
    times = Math.trunc(times);
    var fraction = fulltimes - times;
    if (result.layer - base.layer > 3) {
      var layerloss = Math.min(times, result.layer - base.layer - 3);
      times -= layerloss;
      result.layer -= layerloss;
    }

    for (var i = 0; i < times; ++i) {
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
  public slog(base = 10) {
    if (this.mag < 0) {
      return Decimal.dNegOne;
    }

    base = D(base);

    var result = 0;
    var copy = D(this);
    if (copy.layer - base.layer > 3) {
      var layerloss = copy.layer - base.layer - 3;
      result += layerloss;
      copy.layer -= layerloss;
    }

    for (var i = 0; i < 100; ++i) {
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
  public layeradd10(diff) {
    diff = Decimal.fromValue_noAlloc(diff).toNumber();
    var result = D(this);
    if (diff >= 1) {
      var layeradd = Math.trunc(diff);
      diff -= layeradd;
      result.layer += layeradd;
    }
    if (diff <= -1) {
      var layeradd = Math.trunc(diff);
      diff -= layeradd;
      result.layer += layeradd;
      if (result.layer < 0) {
        for (var i = 0; i < 100; ++i) {
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
      var subtractlayerslater = 0;
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
      var diffToNextSlog = Math.log10(Math.log(1e10) / Math.log(result.mag), 10);
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
      var subtractlayerslater = 0;

      while (Number.isFinite(result.mag) && result.mag < 10) {
        result.mag = Math.pow(10, result.mag);
        ++subtractlayerslater;
      }

      if (result.mag > 1e10) {
        result.mag = Math.log10(result.mag);
        result.layer++;
      }

      var diffToNextSlog = Math.log10(1 / Math.log10(result.mag));
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
  public layeradd(diff, base) {
    var slogthis = this.slog(base).toNumber();
    var slogdest = slogthis + diff;
    if (slogdest >= 0) {
      return Decimal.tetrate(base, slogdest);
    } else if (!Number.isFinite(slogdest)) {
      return Decimal.dNaN;
    } else if (slogdest >= -1) {
      return Decimal.log(Decimal.tetrate(base, slogdest + 1), base);
    } else {
      Decimal.log(Decimal.log(Decimal.tetrate(base, slogdest + 2), base), base);
    }
  }

  //The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
  // https://en.wikipedia.org/wiki/Lambert_W_function
  //Some special values, for testing: https://en.wikipedia.org/wiki/Lambert_W_function#Special_values
  public lambertw() {
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
  }

  //The super square-root function - what number, tetrated to height 2, equals this?
  //Other sroots are possible to calculate probably through guess and check methods, this one is easy though.
  // https://en.wikipedia.org/wiki/Tetration#Super-root
  public ssqrt() {
    if (this.sign == 1 && this.layer >= 3) {
      return FC_NN(this.sign, this.layer - 1, this.mag);
    }
    var lnx = this.ln();
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
  public pentate(height = 2, payload = FC_NN(1, 0, 1)) {
    payload = D(payload);
    var oldheight = height;
    height = Math.trunc(height);
    var fracheight = oldheight - height;

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

    for (var i = 0; i < height; ++i) {
      payload = this.tetrate(payload);
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
  public sin() {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.sin(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  public cos() {
    if (this.mag < 0) {
      return Decimal.dOne;
    }
    if (this.layer === 0) {
      return D(Math.cos(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  public tan() {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.tan(this.sign * this.mag));
    }
    return FC_NN(0, 0, 0);
  }

  public asin() {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.asin(this.sign * this.mag));
    }
    return FC_NN(Number.NaN, Number.NaN, Number.NaN);
  }

  public acos() {
    if (this.mag < 0) {
      return D(Math.acos(this.toNumber()));
    }
    if (this.layer === 0) {
      return D(Math.acos(this.sign * this.mag));
    }
    return FC_NN(Number.NaN, Number.NaN, Number.NaN);
  }

  public atan() {
    if (this.mag < 0) {
      return this;
    }
    if (this.layer === 0) {
      return D(Math.atan(this.sign * this.mag));
    }
    return D(Math.atan(this.sign * 1.8e308));
  }

  public sinh() {
    return this.exp().sub(this.negate().exp()).div(2);
  }

  public cosh() {
    return this.exp().add(this.negate().exp()).div(2);
  }

  public tanh() {
    return this.sinh().div(this.cosh());
  }

  public asinh() {
    return Decimal.ln(this.add(this.sqr().add(1).sqrt()));
  }

  public acosh() {
    return Decimal.ln(this.add(this.sqr().sub(1).sqrt()));
  }

  public atanh() {
    if (this.abs().gte(1)) {
      return FC_NN(Number.NaN, Number.NaN, Number.NaN);
    }

    return Decimal.ln(this.add(1).div(D(1).sub(this))).div(2);
  }

  /**
   * Joke function from Realm Grinder
   */
  public ascensionPenalty(ascensions) {
    if (ascensions === 0) {
      return this;
    }

    return this.root(Decimal.pow(10, ascensions));
  }

  /**
   * Joke function from Cookie Clicker. It's 'egg'
   */
  public egg() {
    return this.add(9);
  }

  public lessThanOrEqualTo(other) {
    return this.cmp(other) < 1;
  }

  public lessThan(other) {
    return this.cmp(other) < 0;
  }

  public greaterThanOrEqualTo(other) {
    return this.cmp(other) > -1;
  }

  public greaterThan(other) {
    return this.cmp(other) > 0;
  }

  // return Decimal;
}

Decimal.dZero = FC_NN(0, 0, 0);
Decimal.dOne = FC_NN(1, 0, 1);
Decimal.dNegOne = FC_NN(-1, 0, 1);
Decimal.dTwo = FC_NN(1, 0, 2);
Decimal.dTen = FC_NN(1, 0, 10);
Decimal.dNaN = FC_NN(Number.NaN, Number.NaN, Number.NaN);
Decimal.dInf = FC_NN(1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
Decimal.dNegInf = FC_NN(-1, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
Decimal.dNumberMax = FC(1, 0, Number.MAX_VALUE);
Decimal.dNumberMin = FC(1, 0, Number.MIN_VALUE);

// return Decimal;
