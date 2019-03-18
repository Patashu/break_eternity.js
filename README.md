# break_eternity.js
A Javascript numerical library to represent numbers as large as 10^^1e308. If this is too ridiculous for your needs, check out break_infinity.js, my other library which maxes out at 1e1e308 ( https://github.com/Patashu/break_infinity.js ) and its C# port ( https://github.com/Razenpok/BreakInfinity.cs ).

The internal representation is as follows: Decimal.fromComponents(sign, layer, mag) == sign*10^10^10^ ... (layer times) mag.

* sign is -1, 0 or 1.
* layer is a non-negative integer. (Sorry, no negative layers (except maybe in a fork).)
* mag is normalized as follows: if it is above 9e15, log10(mag) it and increment layer. If it is below log10(9e15) (about 15.954) and layer > 0, Math.pow(10, mag) it and decrement layer. At layer 0, sign is extracted from negative mags. Zeroes (this.sign === 0 || (this.mag === 0 && this.layer === 0)) become 0, 0, 0 in all fields.

Create a Decimal with `new Decimal(string, Number or Decimal)` or with `Decimal.fromComponents(sign, layer, mag)`.

IMPORTANT NOTE TO PEOPLE CONVERTING FROM break_infinity.js: log/log2/log10/ln now return Decimal not Number!

Functions you can call include `abs, neg, round, floor, ceil, trunc, add, sub, mul, div, recip, cmp, cmpabs, max, min, maxabs, minabs, log, log10, ln, pow, root, factorial, gamma, exp, sqrt, tetrate, pentate` and more!

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

Special thanks:

* https://mrob.com/pub/comp/hypercalc/hypercalc-javascript.html HyperCalc, an existing calculator that handles numbers until 10^^(1e10) and is proving very useful for testing. (I also use SpeedCrunch, which goes up to 1e1e9, and break_infinity.js, which goes up to 1e1e308, for testing)
* https://play.google.com/store/apps/details?id=com.antoine.mathematician.oddlittlegame&hl=en Incremental Unlimited, an incremental game that reaches as high as 10^^4.
* nathanisbored, for coming up with a short and sweet formula for 10^a + 10^b == 10^c which has been used in add and mul.
* Razenpok, slabdrill and Hevipelle/Antimatter Dimensions, for inspiration, assistance and testing with the original break_infinity.js and its C# port.

obligatory SEO: number library, big number, big num, bignumber, bignum, big integer, biginteger, bigint, incremental games, idle games, large numbers, huge numbers
