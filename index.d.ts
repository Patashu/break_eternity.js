export declare type CompareResult = -1 | 0 | 1;
export declare type DecimalSource = Decimal | number | string;
/**
 * The Decimal's value is simply mantissa * 10^exponent.
 */
export default class Decimal {
    static readonly dZero: Decimal;
    static readonly dOne: Decimal;
    static readonly dNegOne: Decimal;
    static readonly dTwo: Decimal;
    static readonly dTen: Decimal;
    static readonly dNaN: Decimal;
    static readonly dInf: Decimal;
    static readonly dNegInf: Decimal;
    static readonly dNumberMax: Decimal;
    static readonly dNumberMin: Decimal;
    sign: number;
    mag: number;
    layer: number;
    constructor(value?: DecimalSource);
    get m(): number;
    set m(value: number);
    get e(): number;
    set e(value: number);
    get s(): number;
    set s(value: number);
    get mantissa(): number;
    set mantissa(value: number);
    get exponent(): number;
    set exponent(value: number);
    static fromComponents(sign: number, layer: number, mag: number): Decimal;
    static fromComponents_noNormalize(sign: number, layer: number, mag: number): Decimal;
    static fromMantissaExponent(mantissa: number, exponent: number): Decimal;
    static fromMantissaExponent_noNormalize(mantissa: number, exponent: number): Decimal;
    static fromDecimal(value: Decimal): Decimal;
    static fromNumber(value: number): Decimal;
    static fromString(value: string): Decimal;
    static fromValue(value: DecimalSource): Decimal;
    static fromValue_noAlloc(value: DecimalSource): Decimal;
    static abs(value: DecimalSource): Decimal;
    static neg(value: DecimalSource): Decimal;
    static negate(value: DecimalSource): Decimal;
    static negated(value: DecimalSource): Decimal;
    static sign(value: DecimalSource): number;
    static sgn(value: DecimalSource): number;
    static round(value: DecimalSource): Decimal;
    static floor(value: DecimalSource): Decimal;
    static ceil(value: DecimalSource): Decimal;
    static trunc(value: DecimalSource): Decimal;
    static add(value: DecimalSource, other: DecimalSource): Decimal;
    static plus(value: DecimalSource, other: DecimalSource): Decimal;
    static sub(value: DecimalSource, other: DecimalSource): Decimal;
    static subtract(value: DecimalSource, other: DecimalSource): Decimal;
    static minus(value: DecimalSource, other: DecimalSource): Decimal;
    static mul(value: DecimalSource, other: DecimalSource): Decimal;
    static multiply(value: DecimalSource, other: DecimalSource): Decimal;
    static times(value: DecimalSource, other: DecimalSource): Decimal;
    static div(value: DecimalSource, other: DecimalSource): Decimal;
    static divide(value: DecimalSource, other: DecimalSource): Decimal;
    static recip(value: DecimalSource): Decimal;
    static reciprocal(value: DecimalSource): Decimal;
    static reciprocate(value: DecimalSource): Decimal;
    static cmp(value: DecimalSource, other: DecimalSource): CompareResult;
    static cmpabs(value: DecimalSource, other: DecimalSource): CompareResult;
    static compare(value: DecimalSource, other: DecimalSource): CompareResult;
    static isNaN(value: DecimalSource): boolean;
    static isFinite(value: DecimalSource): boolean;
    static eq(value: DecimalSource, other: DecimalSource): boolean;
    static equals(value: DecimalSource, other: DecimalSource): boolean;
    static neq(value: DecimalSource, other: DecimalSource): boolean;
    static notEquals(value: DecimalSource, other: DecimalSource): boolean;
    static lt(value: DecimalSource, other: DecimalSource): boolean;
    static lte(value: DecimalSource, other: DecimalSource): boolean;
    static gt(value: DecimalSource, other: DecimalSource): boolean;
    static gte(value: DecimalSource, other: DecimalSource): boolean;
    static max(value: DecimalSource, other: DecimalSource): Decimal;
    static min(value: DecimalSource, other: DecimalSource): Decimal;
    static minabs(value: DecimalSource, other: DecimalSource): Decimal;
    static maxabs(value: DecimalSource, other: DecimalSource): Decimal;
    static clamp(value: DecimalSource, min: DecimalSource, max: DecimalSource): Decimal;
    static clampMin(value: DecimalSource, min: DecimalSource): Decimal;
    static clampMax(value: DecimalSource, max: DecimalSource): Decimal;
    static cmp_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): CompareResult;
    static compare_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): CompareResult;
    static eq_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static equals_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static neq_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static notEquals_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static lt_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static lte_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static gt_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static gte_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    static pLog10(value: DecimalSource): Decimal;
    static absLog10(value: DecimalSource): Decimal;
    static log10(value: DecimalSource): Decimal;
    static log(value: DecimalSource, base: DecimalSource): Decimal;
    static log2(value: DecimalSource): Decimal;
    static ln(value: DecimalSource): Decimal;
    static logarithm(value: DecimalSource, base: DecimalSource): Decimal;
    static pow(value: DecimalSource, other: DecimalSource): Decimal;
    static pow10(value: DecimalSource): Decimal;
    static root(value: DecimalSource, other: DecimalSource): Decimal;
    static factorial(value: DecimalSource, _other?: never): Decimal;
    static gamma(value: DecimalSource, _other?: never): Decimal;
    static lngamma(value: DecimalSource, _other?: never): Decimal;
    static exp(value: DecimalSource): Decimal;
    static sqr(value: DecimalSource): Decimal;
    static sqrt(value: DecimalSource): Decimal;
    static cube(value: DecimalSource): Decimal;
    static cbrt(value: DecimalSource): Decimal;
    static tetrate(value: DecimalSource, height?: number, payload?: DecimalSource): Decimal;
    static iteratedexp(value: DecimalSource, height?: number, payload?: Decimal): Decimal;
    static iteratedlog(value: DecimalSource, base?: DecimalSource, times?: number): Decimal;
    static layeradd10(value: DecimalSource, diff: DecimalSource): Decimal;
    static layeradd(value: DecimalSource, diff: number, base?: number): Decimal;
    static slog(value: DecimalSource, base?: number): Decimal;
    static lambertw(value: DecimalSource): Decimal;
    static ssqrt(value: DecimalSource): Decimal;
    static pentate(value: DecimalSource, height?: number, payload?: DecimalSource): Decimal;
    /**
     * If you're willing to spend 'resourcesAvailable' and want to buy something
     * with exponentially increasing cost each purchase (start at priceStart,
     * multiply by priceRatio, already own currentOwned), how much of it can you buy?
     * Adapted from Trimps source code.
     */
    static affordGeometricSeries(resourcesAvailable: DecimalSource, priceStart: DecimalSource, priceRatio: DecimalSource, currentOwned: DecimalSource): Decimal;
    /**
     * How much resource would it cost to buy (numItems) items if you already have currentOwned,
     * the initial price is priceStart and it multiplies by priceRatio each purchase?
     */
    static sumGeometricSeries(numItems: DecimalSource, priceStart: DecimalSource, priceRatio: DecimalSource, currentOwned: DecimalSource): Decimal;
    /**
     * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
     * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
     * how much of it can you buy?
     */
    static affordArithmeticSeries(resourcesAvailable: DecimalSource, priceStart: DecimalSource, priceAdd: DecimalSource, currentOwned: DecimalSource): Decimal;
    /**
     * How much resource would it cost to buy (numItems) items if you already have currentOwned,
     * the initial price is priceStart and it adds priceAdd each purchase?
     * Adapted from http://www.mathwords.com/a/arithmetic_series.htm
     */
    static sumArithmeticSeries(numItems: DecimalSource, priceStart: DecimalSource, priceAdd: DecimalSource, currentOwned: DecimalSource): Decimal;
    /**
     * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
     * the lowest efficiency score is the better one to purchase.
     * From Frozen Cookies:
     * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
     */
    static efficiencyOfPurchase(cost: DecimalSource, currentRpS: DecimalSource, deltaRpS: DecimalSource): Decimal;
    static randomDecimalForTesting(maxLayers: number): Decimal;
    static affordGeometricSeries_core(resourcesAvailable: Decimal, priceStart: Decimal, priceRatio: Decimal, currentOwned: DecimalSource): Decimal;
    static sumGeometricSeries_core(numItems: DecimalSource, priceStart: Decimal, priceRatio: Decimal, currentOwned: DecimalSource): Decimal;
    static affordArithmeticSeries_core(resourcesAvailable: Decimal, priceStart: Decimal, priceAdd: Decimal, currentOwned: Decimal): Decimal;
    static sumArithmeticSeries_core(numItems: Decimal, priceStart: Decimal, priceAdd: Decimal, currentOwned: Decimal): Decimal;
    static efficiencyOfPurchase_core(cost: Decimal, currentRpS: Decimal, deltaRpS: Decimal): Decimal;
    normalize(): this;
    fromComponents(sign: number, layer: number, mag: number): this;
    fromComponents_noNormalize(sign: number, layer: number, mag: number): this;
    fromMantissaExponent(mantissa: number, exponent: number): this;
    fromMantissaExponent_noNormalize(mantissa: number, exponent: number): this;
    fromDecimal(value: Decimal): this;
    fromNumber(value: number): this;
    fromString(value: string): Decimal;
    fromValue(value: DecimalSource): Decimal;
    toNumber(): number;
    mantissaWithDecimalPlaces(places: number): number;
    magnitudeWithDecimalPlaces(places: number): number;
    toString(): string;
    toExponential(places: number): string;
    toFixed(places: number): string;
    toPrecision(places: number): string;
    valueOf(): string;
    toJSON(): string;
    toStringWithDecimalPlaces(places: number): string;
    abs(): Decimal;
    neg(): Decimal;
    negate(): Decimal;
    negated(): Decimal;
    sgn(): number;
    round(): this | Decimal;
    floor(): this | Decimal;
    ceil(): this | Decimal;
    trunc(): this | Decimal;
    add(value: DecimalSource): this | Decimal;
    plus(value: DecimalSource): Decimal;
    sub(value: DecimalSource): Decimal;
    subtract(value: DecimalSource): Decimal;
    minus(value: DecimalSource): Decimal;
    mul(value: DecimalSource): Decimal;
    multiply(value: DecimalSource): Decimal;
    times(value: DecimalSource): Decimal;
    div(value: DecimalSource): Decimal;
    divide(value: DecimalSource): Decimal;
    divideBy(value: DecimalSource): Decimal;
    dividedBy(value: DecimalSource): Decimal;
    recip(): Decimal;
    reciprocal(): Decimal;
    reciprocate(): Decimal;
    /**
     * -1 for less than value, 0 for equals value, 1 for greater than value
     */
    cmp(value: DecimalSource): CompareResult;
    cmpabs(value: DecimalSource): CompareResult;
    compare(value: DecimalSource): CompareResult;
    isNan(): boolean;
    isFinite(): boolean;
    eq(value: DecimalSource): boolean;
    equals(value: DecimalSource): boolean;
    neq(value: DecimalSource): boolean;
    notEquals(value: DecimalSource): boolean;
    lt(value: DecimalSource): boolean;
    lte(value: DecimalSource): boolean;
    gt(value: DecimalSource): boolean;
    gte(value: DecimalSource): boolean;
    max(value: DecimalSource): Decimal;
    min(value: DecimalSource): Decimal;
    maxabs(value: DecimalSource): Decimal;
    minabs(value: DecimalSource): Decimal;
    clamp(min: DecimalSource, max: DecimalSource): Decimal;
    clampMin(min: DecimalSource): Decimal;
    clampMax(max: DecimalSource): Decimal;
    cmp_tolerance(value: DecimalSource, tolerance: number): CompareResult;
    compare_tolerance(value: DecimalSource, tolerance: number): CompareResult;
    /**
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    eq_tolerance(value: DecimalSource, tolerance: number): boolean;
    equals_tolerance(value: DecimalSource, tolerance: number): boolean;
    neq_tolerance(value: DecimalSource, tolerance: number): boolean;
    notEquals_tolerance(value: DecimalSource, tolerance: number): boolean;
    lt_tolerance(value: DecimalSource, tolerance: number): boolean;
    lte_tolerance(value: DecimalSource, tolerance: number): boolean;
    gt_tolerance(value: DecimalSource, tolerance: number): boolean;
    gte_tolerance(value: DecimalSource, tolerance: number): boolean;
    pLog10(): Decimal;
    absLog10(): Decimal;
    log10(): Decimal;
    log(base: DecimalSource): Decimal;
    log2(): Decimal;
    ln(): Decimal;
    logarithm(base: DecimalSource): Decimal;
    pow(value: DecimalSource): Decimal;
    pow10(): Decimal;
    pow_base(value: DecimalSource): Decimal;
    root(value: DecimalSource): Decimal;
    factorial(): Decimal;
    gamma(): Decimal;
    lngamma(): Decimal;
    exp(): Decimal;
    sqr(): Decimal;
    sqrt(): Decimal;
    cube(): Decimal;
    cbrt(): Decimal;
    tetrate(height?: number, payload?: DecimalSource): Decimal;
    iteratedexp(height?: number, payload?: Decimal): Decimal;
    iteratedlog(base?: DecimalSource, times?: number): Decimal;
    slog(base?: DecimalSource): Decimal;
    static slog_critical(base: number, height: number): number;
    static tetrate_critical(base: number, height: number): number;
    static critical_section(base: number, height: number, grid: number[][]): number;
    layeradd10(diff: DecimalSource): Decimal;
    layeradd(diff: number, base: DecimalSource): Decimal;
    lambertw(): Decimal;
    ssqrt(): Decimal;
    pentate(height?: number, payload?: DecimalSource): Decimal;
    sin(): this | Decimal;
    cos(): Decimal;
    tan(): this | Decimal;
    asin(): this | Decimal;
    acos(): Decimal;
    atan(): this | Decimal;
    sinh(): Decimal;
    cosh(): Decimal;
    tanh(): Decimal;
    asinh(): Decimal;
    acosh(): Decimal;
    atanh(): Decimal;
    /**
     * Joke function from Realm Grinder
     */
    ascensionPenalty(ascensions: DecimalSource): Decimal;
    /**
     * Joke function from Cookie Clicker. It's 'egg'
     */
    egg(): Decimal;
    lessThanOrEqualTo(other: DecimalSource): boolean;
    lessThan(other: DecimalSource): boolean;
    greaterThanOrEqualTo(other: DecimalSource): boolean;
    greaterThan(other: DecimalSource): boolean;
}
