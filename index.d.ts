export type CompareResult = -1 | 0 | 1;
export type DecimalSource = Decimal | number | string;
/**
 * The value of the Decimal is sign * 10^10^10...^mag, with (layer) 10s. If the layer is not 0, then negative mag means it's the reciprocal of the corresponding number with positive mag.
 */
export default class Decimal {
    /**
     * Represents the number 0.
     */
    static readonly dZero: Decimal;
    /**
     * Represents the number 1.
     */
    static readonly dOne: Decimal;
    /**
     * Represents the number -1.
     */
    static readonly dNegOne: Decimal;
    /**
     * Represents the number 2.
     */
    static readonly dTwo: Decimal;
    /**
     * Represents the number 10.
     */
    static readonly dTen: Decimal;
    /**
     * Represents a NaN (Not A Number) value.
     */
    static readonly dNaN: Decimal;
    /**
     * Represents positive infinity.
     */
    static readonly dInf: Decimal;
    /**
     * Represents negative infinity.
     */
    static readonly dNegInf: Decimal;
    /**
     * Represents the largest value a JavaScript number can have, which is approximately 1.79 * 10^308.
     */
    static readonly dNumberMax: Decimal;
    /**
     * Represents the smallest value a JavaScript number can have, which is approximately 5 * 10^-324.
     */
    static readonly dNumberMin: Decimal;
    /**
     * Represents the largest Decimal where adding 1 to the layer is a safe operation
     * (Decimals larger than this are too big for pow/exp/log to affect, but tetrate/iteratedlog/slog can still affect them).
     * Approximately 10^^(9.007 * 10^15).
     */
    static readonly dLayerSafeMax: Decimal;
    /**
     * Represents the smallest Decimal where adding 1 to the layer is a safe operation. Approximately 1 / (10^^(9.007 * 10^15)).
     */
    static readonly dLayerSafeMin: Decimal;
    /**
     * Represents the largest finite value a Decimal can represent. Approximately 10^^(1.79 * 10^308).
     */
    static readonly dLayerMax: Decimal;
    /**
     * Represents the smallest non-zero value a Decimal can represent. Approximately 1 / (10^^(1.79 * 10^308)).
     */
    static readonly dLayerMin: Decimal;
    private static fromStringCache;
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
    /**
     * Turns the given components into a valid Decimal.
     */
    static fromComponents(sign: number, layer: number, mag: number): Decimal;
    /**
     * Turns the given components into a Decimal, but not necessarily a valid one (it's only valid if the components would already create a valid Decimal without normalization). Users of this library should not use this function.
     */
    static fromComponents_noNormalize(sign: number, layer: number, mag: number): Decimal;
    /**
     * Turns the mantissa and exponent into a valid Decimal with value mantissa * 10^exponent.
     */
    static fromMantissaExponent(mantissa: number, exponent: number): Decimal;
    /**
     * Turns the mantissa and exponent into a Decimal, but not necessarily a valid one. Users of this library should not use this function.
     */
    static fromMantissaExponent_noNormalize(mantissa: number, exponent: number): Decimal;
    /**
     * Creates a deep copy of the provided value.
     */
    static fromDecimal(value: Decimal): Decimal;
    /**
     * Converts a floating-point number into a Decimal.
     */
    static fromNumber(value: number): Decimal;
    /**
     * Converts a string into a Decimal.
     *
     * If linearhyper4 is true, then strings like "10^^8.5" will use the linear approximation of tetration even for bases <= 10.
     */
    static fromString(value: string, linearhyper4?: boolean): Decimal;
    /**
     * The function used by new Decimal() to create a new Decimal. Accepts a DecimalSource: uses fromNumber if given a number, uses fromString if given a string, and uses fromDecimal if given a Decimal.
     */
    static fromValue(value: DecimalSource): Decimal;
    /**
     * Converts a DecimalSource to a Decimal, without constructing a new Decimal
     * if the provided value is already a Decimal.
     *
     * As the return value could be the provided value itself, this function
     * returns a read-only Decimal to prevent accidental mutations of the value.
     * Use `new Decimal(value)` to explicitly create a writeable copy if mutation
     * is required.
     */
    static fromValue_noAlloc(value: DecimalSource): Readonly<Decimal>;
    /**
     * Absolute value function: returns 'value' if 'value' >= 0, returns the negative of 'value' if 'value' < 0.
     */
    static abs(value: DecimalSource): Decimal;
    /**
     * Returns the negative of the given value.
     */
    static neg(value: DecimalSource): Decimal;
    /**
     * Returns the negative of the given value.
     */
    static negate(value: DecimalSource): Decimal;
    /**
     * Returns the negative of the given value.
     */
    static negated(value: DecimalSource): Decimal;
    /**
     * Returns the sign of the given value.
     */
    static sign(value: DecimalSource): number;
    /**
     * Returns the sign of the given value.
     */
    static sgn(value: DecimalSource): number;
    /**
     * Rounds the value to the nearest integer.
     */
    static round(value: DecimalSource): Decimal;
    /**
     * "Rounds" the value to the nearest integer that's less than or equal to it.
     */
    static floor(value: DecimalSource): Decimal;
    /**
     * "Rounds" the value to the nearest integer that's greater than or equal to it.
     */
    static ceil(value: DecimalSource): Decimal;
    /**
     * Extracts the integer part of the Decimal and returns it. Behaves like floor on positive numbers, but behaves like ceiling on negative numbers.
     */
    static trunc(value: DecimalSource): Decimal;
    /**
     * Addition: returns the sum of the two Decimals.
     */
    static add(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Addition: returns the sum of the two Decimals.
     */
    static plus(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Subtraction: returns the difference between 'value' and 'other'.
     */
    static sub(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Subtraction: returns the difference between 'value' and 'other'.
     */
    static subtract(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Subtraction: returns the difference between 'value' and 'other'.
     */
    static minus(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Multiplication: returns the product of the two Decimals.
     */
    static mul(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Multiplication: returns the product of the two Decimals.
     */
    static multiply(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Multiplication: returns the product of the two Decimals.
     */
    static times(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Division: returns the quotient of 'value' and 'other'.
     */
    static div(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Division: returns the quotient of 'value' and 'other'.
     */
    static divide(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Returns the reciprocal (1 / X) of the given value.
     */
    static recip(value: DecimalSource): Decimal;
    /**
     * Returns the reciprocal (1 / X) of the given value.
     */
    static reciprocal(value: DecimalSource): Decimal;
    /**
     * Returns the reciprocal (1 / X) of the given value.
     */
    static reciprocate(value: DecimalSource): Decimal;
    /**
     * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
     * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
     * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
     * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
     */
    static mod(value: DecimalSource, other: DecimalSource, floored?: boolean): Decimal;
    /**
     * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
     * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
     * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
     * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
     */
    static modulo(value: DecimalSource, other: DecimalSource, floored?: boolean): Decimal;
    /**
     * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
     * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
     * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
     * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
     */
    static modular(value: DecimalSource, other: DecimalSource, floored?: boolean): Decimal;
    /**
     * Returns 1 if 'value' > 'other', returns -1 if 'value' < 'other', returns 0 if 'value' == 'other'.
     */
    static cmp(value: DecimalSource, other: DecimalSource): CompareResult;
    /**
     * Compares the absolute values of this and value.
     * Returns 1 if |'value'| > |'other'|, returns -1 if |'value'| < |'other'|, returns 0 if |'value'| == |'other'|.
     */
    static cmpabs(value: DecimalSource, other: DecimalSource): CompareResult;
    /**
     * Returns 1 if 'value' > 'other', returns -1 if 'value' < 'other', returns 0 if 'value' == 'other'.
     */
    static compare(value: DecimalSource, other: DecimalSource): CompareResult;
    /**
     * Returns true if the given value is an NaN value.
     */
    static isNaN(value: DecimalSource): boolean;
    /**
     * Returns true if the given value is finite (by Decimal standards, not by floating point standards - a humongous Decimal like 10^^10^100 is still finite!)
     */
    static isFinite(value: DecimalSource): boolean;
    /**
     * The Decimal equivalent of ==. Returns true if 'value' and 'other' have equal values.
     */
    static eq(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * Returns true if 'value' and 'other' have equal values.
     */
    static equals(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * The Decimal equivalent of !=. Returns true if 'value' and 'other' do not have equal values.
     */
    static neq(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * Returns true if 'value' and 'other' do not have equal values.
     */
    static notEquals(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * The Decimal equivalent of <. Returns true if 'value' is less than 'other'.
     */
    static lt(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * The Decimal equivalent of <=. Returns true if 'value' is less than or equal to 'other'.
     */
    static lte(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * The Decimal equivalent of >. Returns true if 'value' is greater than 'other'.
     */
    static gt(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * The Decimal equivalent of >=. Returns true if 'value' is greater than or equal to 'other'.
     */
    static gte(value: DecimalSource, other: DecimalSource): boolean;
    /**
     * Returns whichever of 'value' and 'other' is higher.
     */
    static max(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Returns whichever of 'value' and 'other' is lower.
     */
    static min(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Returns whichever of 'value' and 'other' has a larger absolute value.
     */
    static minabs(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Returns whichever of 'value' and 'other' has a smaller absolute value.
     */
    static maxabs(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * A combination of minimum and maximum: the value returned by clamp is normally 'value', but it won't go below 'min' and it won't go above 'max'.
     * Therefore, if 'value' < 'min', then 'min' is returned, and if 'value' > 'max', then 'max' is returned.
     */
    static clamp(value: DecimalSource, min: DecimalSource, max: DecimalSource): Decimal;
    /**
     * Returns 'value', unless 'value' is less than 'min', in which case 'min' is returned.
     */
    static clampMin(value: DecimalSource, min: DecimalSource): Decimal;
    /**
     * Returns 'value', unless 'value' is greater than 'max', in which case 'max' is returned.
     */
    static clampMax(value: DecimalSource, max: DecimalSource): Decimal;
    /**
     * Returns 1 if 'value' is greater than 'other', returns -1 if 'value' is less than 'other', returns 0 if 'value' is equal to 'other'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static cmp_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): CompareResult;
    /**
     * Returns 1 if 'value' is greater than 'other', returns -1 if 'value' is less than 'other', returns 0 if 'value' is equal to 'other'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static compare_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): CompareResult;
    /**
     * Tests whether two Decimals are approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static eq_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Tests whether two Decimals are approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static equals_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static neq_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static notEquals_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'value' is less than 'other'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static lt_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'value' is less than or equal to 'other'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static lte_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'value' is greater than 'other'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static gt_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'value' is greater than or equal to 'other'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    static gte_tolerance(value: DecimalSource, other: DecimalSource, tolerance: number): boolean;
    /**
     * "Positive log10": Returns the base-10 logarithm of nonnegative Decimals, but returns 0 for negative Decimals.
     */
    static pLog10(value: DecimalSource): Decimal;
    /**
     * Returns the base-10 logarithm of abs('value').
     */
    static absLog10(value: DecimalSource): Decimal;
    /**
     * Base-10 logarithm: returns the Decimal X such that 10^X = 'value'.
     * For numbers above layer 0, this is equivalent to subtracting 1 from layer and normalizing.
     */
    static log10(value: DecimalSource): Decimal;
    /**
     * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'value'.
     */
    static log(value: DecimalSource, base: DecimalSource): Decimal;
    /**
     * Base-2 logarithm: returns the Decimal X such that 2^X = 'value'.
     */
    static log2(value: DecimalSource): Decimal;
    /**
     * Base-e logarithm, also known as the "natural" logarithm: returns the Decimal X such that e^X = 'value'.
     */
    static ln(value: DecimalSource): Decimal;
    /**
     * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'value'.
     */
    static logarithm(value: DecimalSource, base: DecimalSource): Decimal;
    /**
     * Exponentiation: Returns the result of 'value' ^ 'other' (often written as 'value' ** 'other' in programming languages).
     */
    static pow(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * Raises 10 to the power of 'value', i.e. (10^'value'). For positive numbers above 1, this is equivalent to adding 1 to the value's layer and normalizing.
     */
    static pow10(value: DecimalSource): Decimal;
    /**
     * Roots are one of the inverses of exponentiation: this function finds the Decimal X such that X ^ 'other' = 'value'.
     * Equivalent to 'value' ^ (1 / 'other'), which is written here as value.pow(other.recip()).
     */
    static root(value: DecimalSource, other: DecimalSource): Decimal;
    /**
     * For positive integers, X factorial (written as X!) equals X * (X - 1) * (X - 2) *... * 3 * 2 * 1. 0! equals 1.
     * This can be extended to real numbers (except for negative integers) via the gamma function, which is what this function does.
     */
    static factorial(value: DecimalSource, _other?: never): Decimal;
    /**
     * The gamma function extends the idea of factorials to non-whole numbers using some calculus.
     * Gamma(x) is defined as the integral of t^(x-1) * e^-t dt from t = 0 to t = infinity,
     * and gamma(x) = (x - 1)! for nonnegative integer x, so the factorial for non-whole numbers is defined using the gamma function.
     */
    static gamma(value: DecimalSource, _other?: never): Decimal;
    /**
     * Returns the natural (base-e) logarithm of Gamma('value').
     */
    static lngamma(value: DecimalSource, _other?: never): Decimal;
    /**
     * Base-e exponentiation: returns e^'value'.
     */
    static exp(value: DecimalSource): Decimal;
    /**
     * Squaring a number means multiplying it by itself, a.k.a. raising it to the second power.
     */
    static sqr(value: DecimalSource): Decimal;
    /**
     * Square root: finds the Decimal X such that X * X, a.k.a X^2, equals 'value'. Equivalent to X^(1/2).
     */
    static sqrt(value: DecimalSource): Decimal;
    /**
     * Cubing a number means raising it to the third power.
     */
    static cube(value: DecimalSource): Decimal;
    /**
     * Cube root: finds the Decimal X such that X^3 equals 'value'. Equivalent to X^(1/3).
     */
    static cbrt(value: DecimalSource): Decimal;
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
    static tetrate(value: DecimalSource, height?: number, payload?: DecimalSource, linear?: boolean): Decimal;
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
    static iteratedexp(value: DecimalSource, height?: number, payload?: Decimal, linear?: boolean): Decimal;
    /**
     * iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting 'times' from the number's slog representation. Equivalent to tetrating to a negative height.
     *
     * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
     * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
     * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
     * Analytic approximation is not currently supported for bases > 10.
     */
    static iteratedlog(value: DecimalSource, base?: DecimalSource, times?: number, linear?: boolean): Decimal;
    /**
     * Adds/removes layers from a Decimal, even fractional layers (e.g. its slog10 representation). Very similar to tetrate base 10 and iterated log base 10.
     *
     * Tetration for non-integer heights does not have a single agreed-upon definition,
     * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
     * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
     * Analytic approximation is not currently supported for bases > 10.
     */
    static layeradd10(value: DecimalSource, diff: DecimalSource, linear?: boolean): Decimal;
    /**
     * layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
     *
     * Tetration for non-integer heights does not have a single agreed-upon definition,
     * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
     * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
     * Analytic approximation is not currently supported for bases > 10.
     */
    static layeradd(value: DecimalSource, diff: number, base?: DecimalSource, linear?: boolean): Decimal;
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
    static slog(value: DecimalSource, base?: DecimalSource, linear?: boolean): Decimal;
    /**
     * The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
     * https://en.wikipedia.org/wiki/Lambert_W_function
     *
     * This is a multi-valued function in the complex plane, but only two branches matter for real numbers: the "principal branch" W0, and the "non-principal branch" W_-1.
     * W_0 works for any number >= -1/e, but W_-1 only works for negative numbers >= -1/e.
     * The "principal" parameter, which is true by default, decides which branch we're looking for: W_0 is used if principal is true, W_-1 is used if principal is false.
     */
    static lambertw(value: DecimalSource, principal: boolean): Decimal;
    /**
     * The super square-root function - what number, tetrated to height 2, equals 'value'? https://en.wikipedia.org/wiki/Tetration#Super-root
     */
    static ssqrt(value: DecimalSource): Decimal;
    /**
     * Super-root, one of tetration's inverses - what number, tetrated to height 'degree', equals 'value'? https://en.wikipedia.org/wiki/Tetration#Super-root
     *
     * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
     * This only matters for non-integer degrees.
     */
    static linear_sroot(value: DecimalSource, degree: number): Decimal;
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
    static pentate(value: DecimalSource, height?: number, payload?: DecimalSource, linear?: boolean): Decimal;
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
    static penta_log(value: DecimalSource, base?: DecimalSource, linear?: boolean): Decimal;
    /**
     * Penta-root, one of pentation's inverses - what number, pentated to height 'degree', equals 'value'?
     *
     * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
     */
    static linear_penta_root(value: DecimalSource, degree: number): Decimal;
    /**
     * The sine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
     */
    static sin(value: DecimalSource): Decimal;
    /**
     * The cosine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
     */
    static cos(value: DecimalSource): Decimal;
    /**
     * The tangent function, equal to sine divided by cosine. Behaves periodically with period pi.
     */
    static tan(value: DecimalSource): Decimal;
    /**
     * The arcsine function, the inverse of the sine function.
     */
    static asin(value: DecimalSource): Decimal;
    /**
     * The arccosine function, the inverse of the cosine function.
     */
    static acos(value: DecimalSource): Decimal;
    /**
     * The arctangent function, the inverse of the tangent function.
     */
    static atan(value: DecimalSource): Decimal;
    /**
     * Hyperbolic sine: sinh(X) = (e^x - e^-x)/2.
     */
    static sinh(value: DecimalSource): Decimal;
    /**
     * Hyperbolic cosine: cosh(x) = (e^x + e^-x)/2.
     */
    static cosh(value: DecimalSource): Decimal;
    /**
     * Hyperbolic tangent: tanh(x) = sinh(x)/cosh(x).
     */
    static tanh(value: DecimalSource): Decimal;
    /**
     * Hyperbolic arcsine, the inverse of hyperbolic sine.
     */
    static asinh(value: DecimalSource): Decimal;
    /**
     * Hyperbolic arccosine, the inverse of hyperbolic cosine.
     */
    static acosh(value: DecimalSource): Decimal;
    /**
     * Hyperbolic arcctangent, the inverse of hyperbolic tangent.
     */
    static atanh(value: DecimalSource): Decimal;
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
    /**
     * Turns the Decimal into a valid Decimal. This function is meant for internal purposes - users of this library should not need to use normalize.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    normalize(): this;
    /**
     * Turns the given components into a valid Decimal.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromComponents(sign: number, layer: number, mag: number): this;
    /**
     * Turns the given components into a Decimal, but not necessarily a valid one (it's only valid if the components would already create a valid Decimal without normalization). Users of this library should not use this function.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromComponents_noNormalize(sign: number, layer: number, mag: number): this;
    /**
     * Turns the mantissa and exponent into a valid Decimal with value mantissa * 10^exponent.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromMantissaExponent(mantissa: number, exponent: number): this;
    /**
     * Turns the mantissa and exponent into a Decimal, but not necessarily a valid one. Users of this library should not use this function.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromMantissaExponent_noNormalize(mantissa: number, exponent: number): this;
    /**
     * Turns the Decimal that this function is called on into a deep copy of the provided value.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromDecimal(value: Decimal): this;
    /**
     * Converts a floating-point number into a Decimal.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromNumber(value: number): this;
    /**
     * Converts a string into a Decimal.
     *
     * If linearhyper4 is true, then strings like "10^^8.5" will use the linear approximation of tetration even for bases <= 10.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromString(value: string, linearhyper4?: boolean): Decimal;
    /**
     * The function used by new Decimal() to create a new Decimal. Accepts a DecimalSource: uses fromNumber if given a number, uses fromString if given a string, and uses fromDecimal if given a Decimal.
     *
     * Note: this function mutates the Decimal it is called on.
     */
    fromValue(value: DecimalSource): Decimal;
    /**
     * Returns the numeric value of the Decimal it's called on. Will return Infinity (or -Infinity for negatives) for Decimals that are larger than Number.MAX_VALUE.
     */
    toNumber(): number;
    mantissaWithDecimalPlaces(places: number): number;
    magnitudeWithDecimalPlaces(places: number): number;
    /**
     * Returns a string representation of the Decimal it's called on.
     * This string is written as a plain number for most layer 0 numbers, in scientific notation for layer 1 numbers (and layer 0 numbers below 1e-6),
     * in "ee...X" form for numbers from layers 2 to 5, and in (e^N)X form for layer > 5.
     */
    toString(): string;
    toExponential(places: number): string;
    toFixed(places: number): string;
    toPrecision(places: number): string;
    valueOf(): string;
    toJSON(): string;
    toStringWithDecimalPlaces(places: number): string;
    /**
     * Absolute value function: returns 'this' if 'this' >= 0, returns the negative of 'this' if this < 0.
     */
    abs(): Decimal;
    /**
     * Negates the Decimal it's called on: in other words, when given X, returns -X.
     */
    neg(): Decimal;
    /**
     * Negates the Decimal it's called on: in other words, when given X, returns -X.
     */
    negate(): Decimal;
    /**
     * Negates the Decimal it's called on: in other words, when given X, returns -X.
     */
    negated(): Decimal;
    /**
     * Returns the sign of the Decimal it's called on. (Though, since sign is a public data member of Decimal, you might as well just call .sign instead of .sgn())
     */
    sgn(): number;
    /**
     * Rounds the Decimal it's called on to the nearest integer.
     */
    round(): Decimal;
    /**
     * "Rounds" the Decimal it's called on to the nearest integer that's less than or equal to it.
     */
    floor(): Decimal;
    /**
     * "Rounds" the Decimal it's called on to the nearest integer that's greater than or equal to it.
     */
    ceil(): Decimal;
    /**
     * Extracts the integer part of the Decimal and returns it. Behaves like floor on positive numbers, but behaves like ceiling on negative numbers.
     */
    trunc(): Decimal;
    /**
     * Addition: returns the sum of 'this' and 'value'.
     */
    add(value: DecimalSource): this | Decimal;
    /**
     * Addition: returns the sum of 'this' and 'value'.
     */
    plus(value: DecimalSource): Decimal;
    /**
     * Subtraction: returns the difference between 'this' and 'value'.
     */
    sub(value: DecimalSource): Decimal;
    /**
     * Subtraction: returns the difference between 'this' and 'value'.
     */
    subtract(value: DecimalSource): Decimal;
    /**
     * Subtraction: returns the difference between 'this' and 'value'.
     */
    minus(value: DecimalSource): Decimal;
    /**
     * Multiplication: returns the product of 'this' and 'value'.
     */
    mul(value: DecimalSource): Decimal;
    /**
     * Multiplication: returns the product of 'this' and 'value'.
     */
    multiply(value: DecimalSource): Decimal;
    /**
     * Multiplication: returns the product of 'this' and 'value'.
     */
    times(value: DecimalSource): Decimal;
    /**
     * Division: returns the quotient of 'this' and 'value'.
     */
    div(value: DecimalSource): Decimal;
    /**
     * Division: returns the quotient of 'this' and 'value'.
     */
    divide(value: DecimalSource): Decimal;
    /**
     * Division: returns the quotient of 'this' and 'value'.
     */
    divideBy(value: DecimalSource): Decimal;
    /**
     * Division: returns the quotient of 'this' and 'value'.
     */
    dividedBy(value: DecimalSource): Decimal;
    /**
     * Returns the reciprocal (1 / X) of the Decimal it's called on.
     */
    recip(): Decimal;
    /**
     * Returns the reciprocal (1 / X) of the Decimal it's called on.
     */
    reciprocal(): Decimal;
    /**
     * Returns the reciprocal (1 / X) of the Decimal it's called on.
     */
    reciprocate(): Decimal;
    /**
     * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
     * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
     * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
     * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
     */
    mod(value: DecimalSource, floored?: boolean): Decimal;
    /**
     * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
     * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
     * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
     * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
     */
    modulo(value: DecimalSource, floored?: boolean): Decimal;
    /**
     * Returns the remainder of 'this' divided by 'value': for example, 5 mod 2 = 1, because the remainder of 5 / 2 is 1.
     * Uses the "truncated division" modulo, which is the same as JavaScript's native modulo operator (%)...
     * unless 'floored' is true, in which case it uses the "floored" modulo, which is closer to how modulo works in number theory.
     * These two forms of modulo are the same when only positive numbers are involved, but differ in how they work with negative numbers.
     */
    modular(value: DecimalSource, floored?: boolean): Decimal;
    /**
     * Returns 1 if 'this' > 'value', returns -1 if 'this' < 'value', returns 0 if 'this' == 'value'.
     */
    cmp(value: DecimalSource): CompareResult;
    /**
     * Compares the absolute values of this and value.
     * Returns 1 if |'this'| > |'value'|, returns -1 if |'this'| < |'value'|, returns 0 if |'this'| == |'value'|.
     */
    cmpabs(value: DecimalSource): CompareResult;
    /**
     * Returns 1 if 'this' > 'value', returns -1 if 'this' < 'value', returns 0 if 'this' == 'value'.
     */
    compare(value: DecimalSource): CompareResult;
    /**
     * Returns true if the Decimal is an NaN value.
     */
    isNan(): boolean;
    /**
     * Returns true if the Decimal is finite (by Decimal standards, not by floating point standards - a humongous Decimal like 10^^10^100 is still finite!)
     */
    isFinite(): boolean;
    /**
     * The Decimal equivalent of ==. Returns true if 'this' and 'value' have equal values.
     */
    eq(value: DecimalSource): boolean;
    /**
     * Returns true if 'this' and 'value' have equal values.
     */
    equals(value: DecimalSource): boolean;
    /**
     * The Decimal equivalent of !=. Returns true if 'this' and 'value' do not have equal values.
     */
    neq(value: DecimalSource): boolean;
    /**
     * Returns true if 'this' and 'value' do not have equal values.
     */
    notEquals(value: DecimalSource): boolean;
    /**
     * The Decimal equivalent of <. Returns true if 'this' is less than 'value'.
     */
    lt(value: DecimalSource): boolean;
    /**
     * The Decimal equivalent of <=. Returns true if 'this' is less than or equal to 'value'.
     */
    lte(value: DecimalSource): boolean;
    /**
     * The Decimal equivalent of >. Returns true if 'this' is greater than 'value'.
     */
    gt(value: DecimalSource): boolean;
    /**
     * The Decimal equivalent of >=. Returns true if 'this' is greater than or equal to 'value'.
     */
    gte(value: DecimalSource): boolean;
    /**
     * Returns whichever of 'this' and 'value' is higher.
     */
    max(value: DecimalSource): Decimal;
    /**
     * Returns whichever of 'this' and 'value' is lower.
     */
    min(value: DecimalSource): Decimal;
    /**
     * Returns whichever of 'this' and 'value' has a larger absolute value.
     */
    maxabs(value: DecimalSource): Decimal;
    /**
     * Returns whichever of 'this' and 'value' has a smaller absolute value.
     */
    minabs(value: DecimalSource): Decimal;
    /**
     * A combination of minimum and maximum: the value returned by clamp is normally 'this', but it won't go below 'min' and it won't go above 'max'.
     * Therefore, if 'this' < 'min', then 'min' is returned, and if 'this' > 'max', then 'max' is returned.
     */
    clamp(min: DecimalSource, max: DecimalSource): Decimal;
    /**
     * Returns 'this', unless 'this' is less than 'min', in which case 'min' is returned.
     */
    clampMin(min: DecimalSource): Decimal;
    /**
     * Returns 'this', unless 'this' is greater than 'max', in which case 'max' is returned.
     */
    clampMax(max: DecimalSource): Decimal;
    /**
     * Returns 1 if 'this' is greater than 'value', returns -1 if 'this' is less than 'value', returns 0 if 'this' is equal to 'value'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    cmp_tolerance(value: DecimalSource, tolerance: number): CompareResult;
    /**
     * Returns 1 if 'this' is greater than 'value', returns -1 if 'this' is less than 'value', returns 0 if 'this' is equal to 'value'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    compare_tolerance(value: DecimalSource, tolerance: number): CompareResult;
    /**
     * Tests whether two Decimals are approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    eq_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Tests whether two Decimals are approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    equals_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    neq_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Tests whether two Decimals are not approximately equal, up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    notEquals_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'this' is less than 'value'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    lt_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'this' is less than or equal to 'value'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    lte_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'this' is greater than 'value'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    gt_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * Returns true if 'this' is greater than or equal to 'value'.
     * However, the two Decimals are considered equal if they're approximately equal up to a certain tolerance.
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    gte_tolerance(value: DecimalSource, tolerance: number): boolean;
    /**
     * "Positive log10": Returns the base-10 logarithm of nonnegative Decimals, but returns 0 for negative Decimals.
     */
    pLog10(): Decimal;
    /**
     * Returns the base-10 logarithm of abs('this').
     */
    absLog10(): Decimal;
    /**
     * Base-10 logarithm: returns the Decimal X such that 10^X = 'this'.
     * For numbers above layer 0, this is equivalent to subtracting 1 from layer and normalizing.
     */
    log10(): Decimal;
    /**
     * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'this'.
     */
    log(base: DecimalSource): Decimal;
    /**
     * Base-2 logarithm: returns the Decimal X such that 2^X = 'this'.
     */
    log2(): Decimal;
    /**
     * Base-e logarithm, also known as the "natural" logarithm: returns the Decimal X such that e^X = 'this'.
     */
    ln(): Decimal;
    /**
     * Logarithms are one of the inverses of exponentiation: this function finds the Decimal X such that base^X = 'this'.
     */
    logarithm(base: DecimalSource): Decimal;
    /**
     * Exponentiation: Returns the result of 'this' ^ 'value' (often written as 'this' ** 'value' in programming languages).
     */
    pow(value: DecimalSource): Decimal;
    /**
     * Raises 10 to the power of 'this', i.e. (10^'this'). For positive numbers above 1, this is equivalent to adding 1 to layer and normalizing.
     */
    pow10(): Decimal;
    /**
     * Exponentiation: Returns the result of 'value' ^ 'this' (often written as 'value' ** 'this' in programming languages).
     */
    pow_base(value: DecimalSource): Decimal;
    /**
     * Roots are one of the inverses of exponentiation: this function finds the Decimal X such that X ^ 'value' = 'this'.
     * Equivalent to 'this' ^ (1 / 'value'), which is written here as this.pow(value.recip()).
     */
    root(value: DecimalSource): Decimal;
    /**
     * For positive integers, X factorial (written as X!) equals X * (X - 1) * (X - 2) *... * 3 * 2 * 1. 0! equals 1.
     * This can be extended to real numbers (except for negative integers) via the gamma function, which is what this function does.
     */
    factorial(): Decimal;
    /**
     * The gamma function extends the idea of factorials to non-whole numbers using some calculus.
     * Gamma(x) is defined as the integral of t^(x-1) * e^-t dt from t = 0 to t = infinity,
     * and gamma(x) = (x - 1)! for nonnegative integer x, so the factorial for non-whole numbers is defined using the gamma function.
     */
    gamma(): Decimal;
    /**
     * Returns the natural logarithm of Gamma('this').
     */
    lngamma(): Decimal;
    /**
     * Base-e exponentiation: returns e^'this'.
     */
    exp(): Decimal;
    /**
     * Squaring a number means multiplying it by itself, a.k.a. raising it to the second power.
     */
    sqr(): Decimal;
    /**
     * Square root: finds the Decimal X such that X * X, a.k.a X^2, equals 'this'. Equivalent to X^(1/2).
     */
    sqrt(): Decimal;
    /**
     * Cubing a number means raising it to the third power.
     */
    cube(): Decimal;
    /**
     * Cube root: finds the Decimal X such that X^3 equals 'this'. Equivalent to X^(1/3).
     */
    cbrt(): Decimal;
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
    tetrate(height?: number, payload?: DecimalSource, linear?: boolean): Decimal;
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
    iteratedexp(height?: number, payload?: Decimal, linear?: boolean): Decimal;
    /**
     * iterated log/repeated log: The result of applying log(base) 'times' times in a row. Approximately equal to subtracting 'times' from the number's slog representation. Equivalent to tetrating to a negative height.
     *
     * Works with negative and positive real heights. Tetration for non-integer heights does not have a single agreed-upon definition,
     * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
     * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
     * Analytic approximation is not currently supported for bases > 10.
     */
    iteratedlog(base?: DecimalSource, times?: number, linear?: boolean): Decimal;
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
    slog(base?: DecimalSource, iterations?: number, linear?: boolean): Decimal;
    slog_internal(base?: DecimalSource, linear?: boolean): Decimal;
    static slog_critical(base: number, height: number): number;
    static tetrate_critical(base: number, height: number): number;
    static critical_section(base: number, height: number, grid: number[][], linear?: boolean): number;
    /**
     * Adds/removes layers from a Decimal, even fractional layers (e.g. its slog10 representation). Very similar to tetrate base 10 and iterated log base 10.
     *
     * Tetration for non-integer heights does not have a single agreed-upon definition,
     * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
     * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
     * Analytic approximation is not currently supported for bases > 10.
     */
    layeradd10(diff: DecimalSource, linear?: boolean): Decimal;
    /**
     * layeradd: like adding 'diff' to the number's slog(base) representation. Very similar to tetrate base 'base' and iterated log base 'base'.
     *
     * Tetration for non-integer heights does not have a single agreed-upon definition,
     * so this library uses an analytic approximation for bases <= 10, but it reverts to the linear approximation for bases > 10.
     * If you want to use the linear approximation even for bases <= 10, set the linear parameter to true.
     * Analytic approximation is not currently supported for bases > 10.
     */
    layeradd(diff: number, base: DecimalSource, linear?: boolean): Decimal;
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
    private static excess_slog;
    /**
     * The Lambert W function, also called the omega function or product logarithm, is the solution W(x) === x*e^x.
     * https://en.wikipedia.org/wiki/Lambert_W_function
     *
     * This is a multi-valued function in the complex plane, but only two branches matter for real numbers: the "principal branch" W0, and the "non-principal branch" W_-1.
     * W_0 works for any number >= -1/e, but W_-1 only works for nonpositive numbers >= -1/e.
     * The "principal" parameter, which is true by default, decides which branch we're looking for: W_0 is used if principal is true, W_-1 is used if principal is false.
     */
    lambertw(principal?: boolean): Decimal;
    /**
     * The super square-root function - what number, tetrated to height 2, equals 'this'? https://en.wikipedia.org/wiki/Tetration#Super-root
     */
    ssqrt(): Decimal;
    /**
     * Super-root, one of tetration's inverses - what number, tetrated to height 'degree', equals 'this'? https://en.wikipedia.org/wiki/Tetration#Super-root
     *
     * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
     * This only matters for non-integer degrees.
     */
    linear_sroot(degree: number): Decimal;
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
    static increasingInverse(func: (((value: DecimalSource) => Decimal) | ((value: Decimal) => Decimal)), decreasing?: boolean, iterations?: number, minX?: DecimalSource, maxX?: DecimalSource, minY?: DecimalSource, maxY?: DecimalSource): (value: DecimalSource) => Decimal;
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
    pentate(height?: number, payload?: DecimalSource, linear?: boolean): Decimal;
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
    penta_log(base?: DecimalSource, iterations?: number, linear?: boolean): Decimal;
    /**
     * Penta-root, one of pentation's inverses - what number, pentated to height 'degree', equals 'this'?
     *
     * Only works with the linear approximation of tetration, as starting with analytic and then switching to linear would result in inconsistent behavior for super-roots.
     */
    linear_penta_root(degree: number): Decimal;
    /**
     * The sine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
     */
    sin(): this | Decimal;
    /**
     * The cosine function, one of the main two trigonometric functions. Behaves periodically with period 2*pi.
     */
    cos(): Decimal;
    /**
     * The tangent function, equal to sine divided by cosine. Behaves periodically with period pi.
     */
    tan(): this | Decimal;
    /**
     * The arcsine function, the inverse of the sine function.
     */
    asin(): this | Decimal;
    /**
     * The arccosine function, the inverse of the cosine function.
     */
    acos(): Decimal;
    /**
     * The arctangent function, the inverse of the tangent function.
     */
    atan(): this | Decimal;
    /**
     * Hyperbolic sine: sinh(X) = (e^x - e^-x)/2.
     */
    sinh(): Decimal;
    /**
     * Hyperbolic cosine: cosh(x) = (e^x + e^-x)/2.
     */
    cosh(): Decimal;
    /**
     * Hyperbolic tangent: tanh(x) = sinh(x)/cosh(x).
     */
    tanh(): Decimal;
    /**
     * Hyperbolic arcsine, the inverse of hyperbolic sine.
     */
    asinh(): Decimal;
    /**
     * Hyperbolic arccosine, the inverse of hyperbolic cosine.
     */
    acosh(): Decimal;
    /**
     * Hyperbolic arcctangent, the inverse of hyperbolic tangent.
     */
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
