# break_eternity.js
A Javascript numerical library to represent numbers as large as 10^^1e308.

The internal representation is as follows: Decimal.fromComponents(sign, layer, mag) = sign*10^10^10^ ... (layer times) mag.

So far all the operators except pow and its variants (log, root, etc) are implemented. 