# break_eternity.js
A Javascript numerical library to represent numbers as large as 10^^1e308. If this is too ridiculous for your needs, check out break_infinity.js, my other library which maxes out at 1e1e308 ( https://github.com/Patashu/break_infinity.js ) and its C# port ( https://github.com/Razenpok/BreakInfinity.cs ).

The internal representation is as follows: Decimal.fromComponents(sign, layer, mag) == sign*10^10^10^ ... (layer times) mag.

* sign is -1, 0 or 1.
* layer is a non-negative integer. (Sorry, no negative layers!) (For now...?)
* mag is normalized as follows: if it is above 9e15, log10(mag) it and increment layer. If it is below log10(9e15) (about 15.954) and layer > 0, Math.pow(10, mag) it and decrement layer. At layer 0, sign is extracted from negative mags. Zeroes (this.sign === 0 || (this.mag === 0 && this.layer === 0)) become 0, 0, 0 in all fields.

So far all the operators except pow and its variants (log, root, etc) are implemented, and much manual and automatic testing lies in the future. Stretch goals are factorial/gamma/lngamma/invgamma/lambertw/tetrate/superroot/superlog in order of difficulty.

Special thanks:

* https://mrob.com/pub/comp/hypercalc/hypercalc-javascript.html HyperCalc, an existing calculator that handles numbers until 10^^(1e10) and is proving very useful for testing. (I also use SpeedCrunch, which goes up to 1e1e9, and break_infinity.js, which goes up to 1e1e308, for testing)
* https://play.google.com/store/apps/details?id=com.antoine.mathematician.oddlittlegame&hl=en Incremental Unlimited, an incremental game that reaches as high as 10^^4.
* nathanisbored, for coming up with a short and sweet formula for 10^a + 10^b == 10^c which has been used in add and mul.
* Razenpok, slabdrill and Hevipelle/Antimatter Dimensions, for inspiration, assistance and testing with the original break_infinity.js and its C# port.
