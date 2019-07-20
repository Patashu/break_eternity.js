# break_eternity.js
A Javascript numerical library to represent numbers as large as 10^^1e308 and as 'small' as 10^-(10^^1e308). This is a sequel to break_infinity.js, my other library which maxes out at 1e1e308 ( https://github.com/Patashu/break_infinity.js ) and its C# port ( https://github.com/Razenpok/BreakInfinity.cs ). Despite handling a wider range of numbers, execution time is comparable (within 2x/0.5x as fast as break_infinity.js in testing) and it has the same interface, so it can be used as a drop-in replacement for break_infinity.js and decimal.js.

Now with arbitrary real height and base handling in your favourite hyper 4 operators (tetrate, iterated exponentiation, iterated logarithm, super logarithm, super square root) and even in pentate (if you want to do that for some reason)! Using the linear approximation. (Analytical approximation is too hard for me atm.)

The internal representation is as follows: `Decimal.fromComponents(sign, layer, mag)` === `sign*10^10^10^ ... (layer times) mag`. So a layer 0 number is just `sign*mag`, a layer 1 number is `sign*10^mag`, a layer 2 number is `sign*10^10^mag`, and so on. If `layer > 0` and `mag < 0`, then the number's exponent is negative, e.g. `sign*10^-10^10^10^ ... mag`.

* sign is -1, 0 or 1.
* layer is a non-negative integer.
* mag is a Number, normalized as follows: if it is above 9e15, log10(mag) it and increment layer. If it is below log10(9e15) (about 15.954) and layer > 0, Math.pow(10, mag) it and decrement layer. At layer 0, sign is extracted from negative mags. Zeroes (`this.sign === 0 || (this.mag === 0 && this.layer === 0)`) become `0, 0, 0` in all fields.

Create a Decimal with `new Decimal(String or Number or Decimal)` or with `Decimal.fromComponents(sign, layer, mag)`. Use operations 

IMPORTANT NOTE TO PEOPLE CONVERTING FROM break_infinity.js: log/log2/log10/ln now return Decimal not Number! You'll also need to reconsider your string parsing/displaying functions and consider moving e/exponent calls to absLog10. Support for very small numbers has finally been added, so things like tickspeed multiplier being 1e-400 will be fine now!

Functions you can call include `abs, neg, round, floor, ceil, trunc, add, sub, mul, div, recip, cmp, cmpabs, max, min, maxabs, minabs, log, log10, ln, pow, root, factorial, gamma, exp, sqrt, tetrate, iteratedexp, iteratedlog, layeradd10, layeradd, slog, ssqrt, lambertw, pentate` and more! Javascript operators like `+` and `*` do not work - you need to call the equivalent functions instead.

Accepted input formats to new Decimal or Decimal.fromString:

```
M === M
eX === 10^X
MeX === M*10^X
eXeY === 10^(XeY)
MeXeY === M*10^(XeY)
eeX === 10^10^X
eeXeY === 10^10^(XeY)
eeeX === 10^10^10^X
eeeXeY === 10^10^10^(XeY)
eeee... (N es) X === 10^10^10^ ... (N 10^s) X
(e^N)X === 10^10^10^ ... (N 10^s) X
N PT X === 10^10^10^ ... (N 10^s) X
N PT (X) === 10^10^10^ ... (N 10^s) X
NpX === 10^10^10^ ... (N 10^s) X
X^Y === X^Y
X^^N === X^X^X^ ... (N X^s) 1
X^^N;Y === X^X^X^ ... (N X^s) Y
X^^^N === X^^X^^X^^ ... (N X^^s) 1
X^^^N;Y === X^^X^^X^^ ... (N X^^s) Y
```

# Use

The library exports a single function object, Decimal, the constructor of Decimal instances.

It accepts a value of type number, string or Decimal.

```javascript
    x = new Decimal(123.4567)
    y = new Decimal('123456.7e-3')
    z = new Decimal(x)
    x.equals(y) && y.equals(z) && x.equals(z)        // true
```
    
The methods that return a Decimal can be chained.

```javascript
    x.dividedBy(y).plus(z).times(9).floor()
    x.times('1.23456780123456789e+9').plus(9876.5432321).dividedBy('4444562598.111772').ceil()
````
    
A list of functions is provided earlier in this readme, or you can use autocomplete or read through the js file to see for yourself.

If you want to just mess around with the library to try it, download break_eternity.js, add <script> </script> tags to the beginning and end respectively, rename it break_eternity.html, open it in chrome, right click -> inspect, go to the Javascript Console, and type in and execute whatever commands you want. Enjoy!

---

Special thanks:

* https://mrob.com/pub/comp/hypercalc/hypercalc-javascript.html HyperCalc, an existing calculator that handles numbers until 10^^(1e10) and is proving very useful for testing. (I also use SpeedCrunch, which goes up to 1e1e9, and break_infinity.js, which goes up to 1e1e308, for testing)
* https://play.google.com/store/apps/details?id=com.antoine.mathematician.oddlittlegame&hl=en Incremental Unlimited, an incremental game that reaches as high as 10^^4.
* nathanisbored, for coming up with a short and sweet formula for 10^a + 10^b == 10^c which has been used in add and mul.
* Razenpok, slabdrill and Hevipelle/Antimatter Dimensions, for inspiration, assistance and testing with the original break_infinity.js and its C# port.

obligatory SEO: number library, big number, big num, bignumber, bignum, big integer, biginteger, bigint, incremental games, idle games, large numbers, huge numbers

---

Want to go even further? Check out Naruyoko's OmegaNum.js: https://github.com/Naruyoko/OmegaNum.js
