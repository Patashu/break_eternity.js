(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Decimal = factory());
}(this, function () { 'use strict';

  var padEnd = function (string, maxLength, fillString) {

    if (string == null || maxLength == null) {
      return string;
    }

    var result    = String(string);
    var targetLen = typeof maxLength === 'number'
      ? maxLength
      : parseInt(maxLength, 10);

    if (isNaN(targetLen) || !isFinite(targetLen)) {
      return result;
    }


    var length = result.length;
    if (length >= targetLen) {
      return result;
    }


    var filled = fillString == null ? '' : String(fillString);
    if (filled === '') {
      filled = ' ';
    }


    var fillLen = targetLen - length;

    while (filled.length < fillLen) {
      filled += filled;
    }

    var truncated = filled.length > fillLen ? filled.substr(0, fillLen) : filled;

    return result + truncated;
  };

  var MAX_SIGNIFICANT_DIGITS = 17; // Highest value you can safely put here is Number.MAX_SAFE_INTEGER-MAX_SIGNIFICANT_DIGITS

  var EXP_LIMIT = 9e15; // If we're ABOVE this value, increase a layer. (9e15 is close to the largest integer that can fit in a Number.)
  
  var LAYER_DOWN = Math.log10(9e15); //If we're BELOW this value, drop down a layer. About 15.954.

  var NUMBER_EXP_MAX = 308; // The smallest exponent that can appear in a Number, though not all mantissas are valid here.

  var NUMBER_EXP_MIN = -324;
  
  var MAX_ES_IN_A_ROW = 5;

  var powerOf10 = function () {
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
  }();

  var D = function D(value) {
    return Decimal.fromValue_noAlloc(value);
  };

  var FC = function FC(sign, layer, mag) {
    return Decimal.fromComponents(sign, layer, mag);
  };

  var FC_NN = function FC_NN(sign, layer, mag) {
    return Decimal.fromComponents_noNormalize(sign, layer, mag);
  };
  
  var decimalPlaces = function decimalPlaces(value, places) {
    var len = places + 1;
    var numDigits = Math.ceil(Math.log10(Math.abs(value)));
    var rounded = Math.round(value * Math.pow(10, len - numDigits)) * Math.pow(10, numDigits - len);
    return parseFloat(rounded.toFixed(Math.max(len - numDigits, 0)));
  };
  
  var Decimal =
  /** @class */
  function () {
    function Decimal(value) {
      
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

    Object.defineProperty(Decimal.prototype, "m", {
      get: function get() {
        if (this.sign === 0)
        {
          return 0;
        }
        else if (this.layer === 0)
        {
          var exp = Math.floor(Math.log10(this.mag));
          var man = this.mag / powerOf10(exp);
          return this.sign*man;
        }
        else if (this.layer === 1)
        {
          var residue = this.mag-Math.floor(this.mag);
          return this.sign*Math.pow(10, residue);
        }
        else
        {
          //mantissa stops being relevant past 1e9e15 / ee15.954
          return this.sign;
        }
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal.prototype, "e", {
      get: function get() {
        if (this.sign === 0)
        {
          return 0;
        }
        else if (this.layer === 0)
        {
          return Math.floor(Math.log10(this.mag));
        }
        else if (this.layer === 1)
        {
          return Math.floor(this.mag);
        }
        else if (this.layer === 2)
        {
          return Math.floor(Math.pow(10, this.mag));
        }
        else
        {
          return Number.POSITIVE_INFINITY;
        }
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal.prototype, "s", {
      get: function get() {
        return this.sign;
      },
      set: function set(value) {
        if (value === 0) {
          this.sign = 0;
          this.layer = 0;
          this.mag = 0;
        }
        else
        {
          this.sign = value;
        }
      },
      enumerable: true,
      configurable: true
    });

    Decimal.fromComponents = function (sign, layer, mag) {
      return new Decimal().fromComponents(sign, layer, mag);
    };

    Decimal.fromComponents_noNormalize = function (sign, layer, mag) {
      return new Decimal().fromComponents_noNormalize(sign, layer, mag);
    };
    
    Decimal.fromDecimal = function (value) {
      return new Decimal().fromDecimal(value);
    };

    Decimal.fromNumber = function (value) {
      return new Decimal().fromNumber(value);
    };

    Decimal.fromString = function (value) {
      return new Decimal().fromString(value);
    };

    Decimal.fromValue = function (value) {
      return new Decimal().fromValue(value);
    };

    Decimal.fromValue_noAlloc = function (value) {
      return value instanceof Decimal ? value : new Decimal(value);
    };
    
    Decimal.abs = function (value) {
      return D(value).abs();
    };

    Decimal.neg = function (value) {
      return D(value).neg();
    };

    Decimal.negate = function (value) {
      return D(value).neg();
    };

    Decimal.negated = function (value) {
      return D(value).neg();
    };

    Decimal.sign = function (value) {
      return D(value).sign();
    };

    Decimal.sgn = function (value) {
      return D(value).sign();
    };

    Decimal.round = function (value) {
      return D(value).round();
    };

    Decimal.floor = function (value) {
      return D(value).floor();
    };

    Decimal.ceil = function (value) {
      return D(value).ceil();
    };

    Decimal.trunc = function (value) {
      return D(value).trunc();
    };

    Decimal.add = function (value, other) {
      return D(value).add(other);
    };

    Decimal.plus = function (value, other) {
      return D(value).add(other);
    };

    Decimal.sub = function (value, other) {
      return D(value).sub(other);
    };

    Decimal.subtract = function (value, other) {
      return D(value).sub(other);
    };

    Decimal.minus = function (value, other) {
      return D(value).sub(other);
    };

    Decimal.mul = function (value, other) {
      return D(value).mul(other);
    };

    Decimal.multiply = function (value, other) {
      return D(value).mul(other);
    };

    Decimal.times = function (value, other) {
      return D(value).mul(other);
    };

    Decimal.div = function (value, other) {
      return D(value).div(other);
    };

    Decimal.divide = function (value, other) {
      return D(value).div(other);
    };

    Decimal.recip = function (value) {
      return D(value).recip();
    };

    Decimal.reciprocal = function (value) {
      return D(value).recip();
    };

    Decimal.reciprocate = function (value) {
      return D(value).reciprocate();
    };

    Decimal.cmp = function (value, other) {
      return D(value).cmp(other);
    };

	Decimal.cmpabs = function (value, other) {
      return D(value).cmpabs(other);
    };
	
    Decimal.compare = function (value, other) {
      return D(value).cmp(other);
    };

    Decimal.eq = function (value, other) {
      return D(value).eq(other);
    };

    Decimal.equals = function (value, other) {
      return D(value).eq(other);
    };

    Decimal.neq = function (value, other) {
      return D(value).neq(other);
    };

    Decimal.notEquals = function (value, other) {
      return D(value).notEquals(other);
    };

    Decimal.lt = function (value, other) {
      return D(value).lt(other);
    };

    Decimal.lte = function (value, other) {
      return D(value).lte(other);
    };

    Decimal.gt = function (value, other) {
      return D(value).gt(other);
    };

    Decimal.gte = function (value, other) {
      return D(value).gte(other);
    };

    Decimal.max = function (value, other) {
      return D(value).max(other);
    };

    Decimal.minabs = function (value, other) {
      return D(value).minabs(other);
    };
	
	Decimal.maxabs = function (value, other) {
      return D(value).maxabs(other);
    };

    Decimal.min = function (value, other) {
      return D(value).min(other);
    };

    Decimal.cmp_tolerance = function (value, other, tolerance) {
      return D(value).cmp_tolerance(other, tolerance);
    };

    Decimal.compare_tolerance = function (value, other, tolerance) {
      return D(value).cmp_tolerance(other, tolerance);
    };

    Decimal.eq_tolerance = function (value, other, tolerance) {
      return D(value).eq_tolerance(other, tolerance);
    };

    Decimal.equals_tolerance = function (value, other, tolerance) {
      return D(value).eq_tolerance(other, tolerance);
    };

    Decimal.neq_tolerance = function (value, other, tolerance) {
      return D(value).neq_tolerance(other, tolerance);
    };

    Decimal.notEquals_tolerance = function (value, other, tolerance) {
      return D(value).notEquals_tolerance(other, tolerance);
    };

    Decimal.lt_tolerance = function (value, other, tolerance) {
      return D(value).lt_tolerance(other, tolerance);
    };

    Decimal.lte_tolerance = function (value, other, tolerance) {
      return D(value).lte_tolerance(other, tolerance);
    };

    Decimal.gt_tolerance = function (value, other, tolerance) {
      return D(value).gt_tolerance(other, tolerance);
    };

    Decimal.gte_tolerance = function (value, other, tolerance) {
      return D(value).gte_tolerance(other, tolerance);
    };

    Decimal.log10 = function (value) {
      return D(value).log10();
    };

    Decimal.log = function (value, base) {
      return D(value).log(base);
    };

    Decimal.log2 = function (value) {
      return D(value).log2();
    };

    Decimal.ln = function (value) {
      return D(value).ln();
    };

    Decimal.logarithm = function (value, base) {
      return D(value).logarithm(base);
    };

    Decimal.pow10 = function (value) {
      return D(value).powbase10();
    };

    Decimal.pow = function (value, other) {
      return D(value).pow(other);
    };
    
    Decimal.root = function (value, other) {
      return D(value).pow(other);
    };
    
    Decimal.factorial = function (value, other) {
      return D(value).factorial();
    };
    
    Decimal.gamma = function (value, other) {
      return D(value).gamma();
    };

    Decimal.exp = function (value) {
      return D(value).exp();
    };

    Decimal.sqr = function (value) {
      return D(value).sqr();
    };

    Decimal.sqrt = function (value) {
      return D(value).sqrt();
    };

    Decimal.cube = function (value) {
      return D(value).cube();
    };

    Decimal.cbrt = function (value) {
      return D(value).cbrt();
    };
    
    Decimal.tetrate = function (value, height = 2, payload = FC_NN(1, 0, 1)) {
      return D(value).tetrate(height, payload);
    }
    
    /**
     * If you're willing to spend 'resourcesAvailable' and want to buy something
     * with exponentially increasing cost each purchase (start at priceStart,
     * multiply by priceRatio, already own currentOwned), how much of it can you buy?
     * Adapted from Trimps source code.
     */


    Decimal.affordGeometricSeries = function (resourcesAvailable, priceStart, priceRatio, currentOwned) {
      return this.affordGeometricSeries_core(D(resourcesAvailable), D(priceStart), D(priceRatio), currentOwned);
    };
    /**
     * How much resource would it cost to buy (numItems) items if you already have currentOwned,
     * the initial price is priceStart and it multiplies by priceRatio each purchase?
     */


    Decimal.sumGeometricSeries = function (numItems, priceStart, priceRatio, currentOwned) {
      return this.sumGeometricSeries_core(numItems, D(priceStart), D(priceRatio), currentOwned);
    };
    /**
     * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
     * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
     * how much of it can you buy?
     */


    Decimal.affordArithmeticSeries = function (resourcesAvailable, priceStart, priceAdd, currentOwned) {
      return this.affordArithmeticSeries_core(D(resourcesAvailable), D(priceStart), D(priceAdd), D(currentOwned));
    };
    /**
     * How much resource would it cost to buy (numItems) items if you already have currentOwned,
     * the initial price is priceStart and it adds priceAdd each purchase?
     * Adapted from http://www.mathwords.com/a/arithmetic_series.htm
     */


    Decimal.sumArithmeticSeries = function (numItems, priceStart, priceAdd, currentOwned) {
      return this.sumArithmeticSeries_core(D(numItems), D(priceStart), D(priceAdd), D(currentOwned));
    };
    /**
     * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
     * the lowest efficiency score is the better one to purchase.
     * From Frozen Cookies:
     * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
     */


    Decimal.efficiencyOfPurchase = function (cost, currentRpS, deltaRpS) {
      return this.efficiencyOfPurchase_core(D(cost), D(currentRpS), D(deltaRpS));
    };

    Decimal.randomDecimalForTesting = function (maxLayers) {
      // NOTE: This doesn't follow any kind of sane random distribution, so use this for testing purposes only.
      throw new Error("Unimplemented");
    };

    Decimal.affordGeometricSeries_core = function (resourcesAvailable, priceStart, priceRatio, currentOwned) {
      var actualStart = priceStart.mul(priceRatio.pow(currentOwned));
      return Decimal.floor(resourcesAvailable.div(actualStart).mul(priceRatio.sub(1)).add(1).log10() / priceRatio.log10());
    };

    Decimal.sumGeometricSeries_core = function (numItems, priceStart, priceRatio, currentOwned) {
      return priceStart.mul(priceRatio.pow(currentOwned)).mul(Decimal.sub(1, priceRatio.pow(numItems))).div(Decimal.sub(1, priceRatio));
    };

    Decimal.affordArithmeticSeries_core = function (resourcesAvailable, priceStart, priceAdd, currentOwned) {
      // n = (-(a-d/2) + sqrt((a-d/2)^2+2dS))/d
      // where a is actualStart, d is priceAdd and S is resourcesAvailable
      // then floor it and you're done!
      var actualStart = priceStart.add(currentOwned.mul(priceAdd));
      var b = actualStart.sub(priceAdd.div(2));
      var b2 = b.pow(2);
      return b.neg().add(b2.add(priceAdd.mul(resourcesAvailable).mul(2)).sqrt()).div(priceAdd).floor();
    };

    Decimal.sumArithmeticSeries_core = function (numItems, priceStart, priceAdd, currentOwned) {
      var actualStart = priceStart.add(currentOwned.mul(priceAdd)); // (n/2)*(2*a+(n-1)*d)

      return numItems.div(2).mul(actualStart.mul(2).plus(numItems.sub(1).mul(priceAdd)));
    };

    Decimal.efficiencyOfPurchase_core = function (cost, currentRpS, deltaRpS) {
      return cost.div(currentRpS).add(cost.div(deltaRpS));
    };
    
    Decimal.prototype.normalize = function () {
      /*
      PSEUDOCODE:
      Make anything that is partially 0 (sign is 0 or mag and layer is 0) fully 0.
      If mag > EXP_LIMIT (9e15), layer += 1, mag = log10(mag).
      If mag < LAYER_DOWN (15.954) and layer > 0 (not handling negative layers for now), layer -= 1, mag = pow(10, mag).
      I think zero/negative mag already works fine (10^10^-1 becomes 10^0.1 becomes 1.259), but we may need to do it many times.
      Finally, if layer === 0 and mag is negative, make it positive and invert sign.
      
      When we're done, all of the following should be true OR one of the numbers is not IsFinite OR layer is not IsInteger (error state):
      Any 0 is totally zero (0, 0, 0).
      Anything layer 0 has mag >= 0.
      Anything layer 1 or higher has mag >= 15.954 and < 9e15.
      We will assume in calculations that all Decimals are either erroneous or satisfy these criteria. (Otherwise: Garbage in, garbage out.)
      */
      if (this.sign === 0 || (this.mag === 0 && this.layer === 0))
      {
        this.sign = 0;
        this.mag = 0;
        this.layer = 0;
        return this;
      }
      
      if (this.mag >= EXP_LIMIT)
      {
        if (this.layer === 0 && this.mag < 0)
        {
          this.mag = -this.mag;
          this.sign = -this.sign;
        }
        this.layer += 1;
        this.mag = Math.log10(this.mag);
        return this;
      }
      else
      {
        while (this.mag < LAYER_DOWN && this.layer > 0)
        {
          this.layer -= 1;
          this.mag = Math.pow(10, this.mag);
        }
        if (this.layer === 0 && this.mag < 0)
        {
          this.mag = -this.mag;
          this.sign = -this.sign;
        }
      }

      return this;
    };

    Decimal.prototype.fromComponents = function (sign, layer, mag) {
      this.sign = sign;
      this.layer = layer;
      this.mag = mag;

      this.normalize();
      return this;
    };

    Decimal.prototype.fromComponents_noNormalize = function (sign, layer, mag) {
      this.sign = sign;
      this.layer = layer;
      this.mag = mag;
      return this;
    };

    Decimal.prototype.fromDecimal = function (value) {
      this.sign = value.sign;
      this.layer = value.layer;
      this.mag = value.mag;
      return this;
    };

    Decimal.prototype.fromNumber = function (value) {
      this.mag = Math.abs(value);
      this.sign = Math.sign(value);
      this.layer = 0;
      this.normalize();
      return this;
    };

    Decimal.prototype.fromString = function (value) {
      //Handle numbers that are already floats.
      var numberAttempt = parseFloat(value);
      if (isFinite(numberAttempt))
      {
        return this.fromNumber(numberAttempt);
      }
      //Handle various cases involving it being a Big Number.
      value = value.trim().toLowerCase();
      
      //Handle new (e^N)X format.
      var newparts = value.split("e^");
      if (newparts.length === 2)
      {
        var layerstring = "";
        for (var i = 0; i < newparts[1].length; ++i)
        {
          var chrcode = newparts[1].charCodeAt(0);
          if (chrcode >= 48 && chrcode <= 57) //is "0" to "9"
          {
            layerstring += newparts[1].charAt(0);
          }
          else //we found the end of the layer count
          {
            this.layer = parseFloat(layerstring);
            this.mag = parseFloat(newparts[1].substr(i+1));
            this.normalize();
            return this;
          }
        }
      }
      
      var parts = value.split("e");
      var ecount = parts.length-1;
      if (ecount < 1) { this.sign = 0; this.layer = 0; this.mag = 0; return this; }
      var mantissa = parseFloat(parts[0]);
      if (mantissa === 0) { this.sign = 0; this.layer = 0; this.mag = 0; return this; }
      var exponent = parseFloat(parts[parts.length-1]);
      
      //Handle numbers written like eee... (N es) X
      if (!isFinite(mantissa))
      {
        this.sign = (parts[0] === "-") ? -1 : 1;
        this.layer = ecount;
        this.mag = exponent;
      }
      //Handle numbers written like XeY
      else if (ecount === 1)
      {
        this.sign = Math.sign(mantissa);
        this.layer = 1;
        //Example: 2e10 is equal to 10^log10(2e10) which is equal to 10^(10+log10(2))
        this.mag = exponent + Math.log10(Math.abs(mantissa));
      }
      //Handle numbers written like Xeee... (N es) Y
      else
      {
        this.sign = Math.sign(mantissa);
        this.layer = ecount;
        //Example: 2ee10 is equal to 10^(10^10+log10(2)) is equal to 10^10^(10+(1+log10(2))/1e11)
        if (ecount === 2)
        {
          this.mag = exponent + (1+Math.log10(Math.abs(mantissa)))/1e11;
        }
        else
        {
          //at eee and above, mantissa is too small to be recognizable!
          this.mag = exponent;
        }
      }
      
      this.normalize();
      return this;
    };

    Decimal.prototype.fromValue = function (value) {
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
    };

    Decimal.prototype.toNumber = function () {
      if (this.layer === 0)
      {
        return this.sign*this.mag;
      }
      else if (this.layer === 1)
      {
        return this.sign*Math.pow(10, this.mag);
      }
      else //overflow for any normalized Decimal
      {
        return Number.POSITIVE_INFINITY;
      }
    };
    
    Decimal.prototype.mantissaWithDecimalPlaces = function (places) {
      // https://stackoverflow.com/a/37425022
      if (isNaN(this.m)) {
        return Number.NaN;
      }

      if (this.m === 0) {
        return 0;
      }

      return decimalPlaces(this.m, places);
    };
    
    Decimal.prototype.magnitudeWithDecimalPlaces = function (places) {
      // https://stackoverflow.com/a/37425022
      if (isNaN(this.mag)) {
        return Number.NaN;
      }

      if (this.mag === 0) {
        return 0;
      }

      return decimalPlaces(this.mag, places);
    };
    
    Decimal.prototype.toString = function () {
      if (this.layer === 0)
      {
        if (this.mag < 1e21 && this.mag > 1e-7)
        {
          return (this.sign*this.mag).toString();
        }
        return this.m + "e" + this.e;
      }
      else if (this.layer === 1)
      {
        return this.m + "e" + this.e;
      }
      else
      {
        //layer 2+
        if (this.layer <= MAX_ES_IN_A_ROW)
        {
          return "e".repeat(this.layer) + this.mag;
        }
        else
        {
          return "(e^" + this.layer + ")" + this.mag;
        }
      }
    };
    
    Decimal.prototype.toExponential = function (places) {
      if (this.layer === 0)
      {
        return (this.sign*this.mag).toExponential(places);
      }
      return this.toStringWithDecimalPlaces(places);
    };
    
    Decimal.prototype.toFixed = function (places) {
      if (this.layer === 0)
      {
        return (this.sign*this.mag).toFixed(places);
      }
      return this.toStringWithDecimalPlaces(places);
    };
    
    Decimal.prototype.toPrecision = function (places) {
      if (this.e <= -7) {
        return this.toExponential(places - 1);
      }

      if (places > this.e) {
        return this.toFixed(places - this.exponent - 1);
      }

      return this.toExponential(places - 1);
    };
    
    Decimal.prototype.valueOf = function () {
      return this.toString();
    };

    Decimal.prototype.toJSON = function () {
      return this.toString();
    };
    
    Decimal.prototype.toStringWithDecimalPlaces = function (places) {
      if (this.layer === 0)
      {
        if (this.mag < 1e21 & this.mag > 1e-7)
        {
          return (this.sign*this.mag).toFixed(places);
        }
        return decimalPlaces(this.m, places) + "e" + decimalPlaces(this.e, places);
      }
      else if (this.layer === 1)
      {
        return decimalPlaces(this.m, places) + "e" + decimalPlaces(this.e, places);
      }
      else
      {
        //layer 2+
        if (this.layer <= MAX_ES_IN_A_ROW)
        {
          return "e".repeat(this.layer, places) + decimalPlaces(this.mag, places);
        }
        else
        {
          return "(e^" + this.layer + ")" + decimalPlaces(this.mag, places);
        }
      }
    };
    
    Decimal.prototype.abs = function () {
      return FC_NN(this.sign === 0 ? 0 : 1, this.layer, this.mag);
    };

    Decimal.prototype.neg = function () {
      return FC_NN(-this.sign, this.layer, this.mag);
    };

    Decimal.prototype.negate = function () {
      return this.neg();
    };

    Decimal.prototype.negated = function () {
      return this.neg();
    };

    Decimal.prototype.sign = function () {
      return this.sign;
    };

    Decimal.prototype.sgn = function () {
      return this.sign;
    };
    
    Decimal.prototype.round = function () {
      if (this.layer === 0)
      {
        return FC(0, 0, Math.round(this.sign*this.mag));
      }
      return this;
    };

    Decimal.prototype.floor = function () {
      if (this.layer === 0)
      {
        return FC(0, 0, Math.floor(this.sign*this.mag));
      }
      return this;
    };

    Decimal.prototype.ceil = function () {
      if (this.layer === 0)
      {
        return FC(0, 0, this.Math.ceil(this.sign*this.mag));
      }
      return this;
    };

    Decimal.prototype.trunc = function () {
      if (this.layer === 0)
      {
        return FC(0, 0, Math.trunc(this.sign*this.mag));
      }
      return this;
    };

    Decimal.prototype.add = function (value) {
      var decimal = D(value);
      //Special case - Adding a number to its negation produces 0, no matter how large.
      if (this.sign == -(decimal.sign) && this.layer == decimal.layer && this.mag == decimal.mag) { return FC_NN(0, 0, 0); }
      
      var a;
      var b;
      
      if (Decimal.cmpabs(this, decimal) > 0)
      {
        a = this;
        b = decimal;
      }
      else
      {
        a = decimal;
        b = this;
      }
      
      //Special case: If one of the numbers is layer 2 or higher, just take the bigger number.
      if ((a.layer >= 2 || b.layer >= 2)) { return a; }
      
      if (a.layer == 0 && b.layer == 0) { return D(a.sign*a.mag + b.sign*b.mag); }
      
      if (a.layer == 1 && b.layer == 0)
      {
        if (a.mag-Math.log10(b.mag) > MAX_SIGNIFICANT_DIGITS)
        {
          return a;
        }
        else
        {
          var magdiff = Math.pow(10, a.mag-Math.log10(b.mag));
          var mantissa = (b.sign*1)+(a.sign*magdiff);
          return FC(Math.sign(mantissa), 1, Math.log10(b.mag)+Math.log10(Math.abs(mantissa)));
        }
      }
      
      if (a.layer == 1 && b.layer == 1)
      {
        if (a.mag-b.mag > MAX_SIGNIFICANT_DIGITS)
        {
          return a;
        }
        else
        {
          var magdiff = Math.pow(10, a.mag-b.mag);
          var mantissa = (b.sign*1)+(a.sign*magdiff);
          return FC(Math.sign(mantissa), 1, b.mag+Math.log10(Math.abs(mantissa)));
        }
      }
      
      throw Error("Bad arguments to add: " + this + ", " + value);
    };

    Decimal.prototype.plus = function (value) {
      return this.add(value);
    };

    Decimal.prototype.sub = function (value) {
      return this.add(D(value).neg());
    };

    Decimal.prototype.subtract = function (value) {
      return this.sub(value);
    };

    Decimal.prototype.minus = function (value) {
      return this.sub(value);
    };

    Decimal.prototype.mul = function (value) {
      var decimal = D(value);
      
      //Special case - if one of the numbers is 0, return 0.
      if (this.sign == 0 || decimal.sign == 0) { return FC_NN(0, 0, 0); }
            
      var a;
      var b;
      
      if (Decimal.cmpabs(this, decimal) > 0)
      {
        a = this;
        b = decimal;
      }
      else
      {
        a = decimal;
        b = this;
      }
      
      //Special case: If one of the numbers is layer 3 or higher or one of the numbers is 2+ layers bigger than the other, just take the bigger number.
      if ((a.layer >= 3 || b.layer >= 3) || (a.layer - b.layer >= 2)) { return FC(a.sign*b.sign, a.layer, a.mag); }
      
      if (a.layer == 0 && b.layer == 0) { return D(a.sign*b.sign*a.mag*b.mag); }
      
      if (a.layer == 1 && b.layer == 0)
      { 
        return FC(a.sign*b.sign, 1, a.mag+Math.log10(b.mag));
      }
      
      if (a.layer == 1 && b.layer == 1)
      {
        return FC(a.sign*b.sign, 1, a.mag+b.mag);
      }
      
      if (a.layer == 2 && b.layer == 1)
      {
        if (a.mag-Math.log10(b.mag) > MAX_SIGNIFICANT_DIGITS)
        {
          return FC(a.sign*b.sign, a.layer, a.mag);
        }
        else
        {
          var magdiff = Math.pow(10, a.mag-Math.log10(b.mag));
          var mantissa = 1+magdiff;
          return FC(a.sign*b.sign, 2, Math.log10(b.mag)+Math.log10(Math.abs(mantissa)));
        }
      }
      
      if (a.layer == 2 && b.layer == 2)
      {
        if (a.mag-b.mag > MAX_SIGNIFICANT_DIGITS)
        {
          return FC(a.sign*b.sign, a.layer, a.mag);
        }
        else
        {
          var magdiff = Math.pow(10, a.mag-b.mag);
          var mantissa = 1+magdiff;
          return FC(a.sign*b.sign, 2, b.mag+Math.log10(Math.abs(mantissa)));
        }
      }
      
      throw Error("Bad arguments to mul: " + this + ", " + value);
    };

    Decimal.prototype.multiply = function (value) {
      return this.mul(value);
    };

    Decimal.prototype.times = function (value) {
      return this.mul(value);
    };

    Decimal.prototype.div = function (value) {
      var decimal = D(value);
      
      var a = this;
      var b = decimal;
      
      //Special case - Dividing a number by its own magnitude yields +/- 1, no matter how large.
      if (a.layer == b.layer && a.mag == b.mag) { return FC_NN(a.sign*b.sign, 0, 1); }
      
      //Special case - if the first number is 0, return 0.
      
      if (a.sign == 0) { return FC_NN(0, 0, 0); }
      
      //Special case - if the second number is 0, explode (Divide by 0).
      
      if (b.sign == 0) { throw Error("Divide by 0"); }
      
      //NOTE: Unlike add/mul, second number can be bigger in magnitude than first number.
      
      //Special case - if the second number is hugely larger than the first number, return 0.
      
      if (b.layer - a.layer > 2) { return FC_NN(0, 0, 0); }
      
      //Special case - if the first number is hugely larger than the second number, return it.
      
      if (a.layer - b.layer > 2) { return FC(a.sign*b.sign, a.layer, a.mag); }
      
      //Special case - if either number is layer 3 or higher, whichever number is larger wins.
      if (a.layer >= 3 || b.layer >= 3) { return a.cmpabs(b) > 0 ? FC(a.sign*b.sign, a.layer, a.mag) : FC_NN(0, 0, 0); }
      
      if (a.layer == 0 && b.layer == 0) { return D(a.sign*b.sign*a.mag/b.mag); }
      
      if (a.layer == 1 && b.layer == 0) { return FC(a.sign*b.sign, 1, a.mag-Math.log10(b.mag)); }
      
      if (a.layer == 0 && b.layer == 1) { return FC(a.sign*b.sign, 1, Math.log10(a.mag)-b.mag); }
      
      if (a.layer == 1 && b.layer == 1) { return FC(a.sign*b.sign, 1, a.mag-b.mag); }
      
      if (a.layer == 2 && b.layer == 1)
      {
        if (a.mag < Math.log10(b.mag)) { return FC_NN(0, 0, 0); }
        
        if (a.mag-Math.log10(b.mag) > MAX_SIGNIFICANT_DIGITS)
        {
          return FC(a.sign*b.sign, a.layer, a.mag);
        }
        else
        {
          var magdiff = Math.pow(10, a.mag-Math.log10(b.mag));
          var mantissa = -1+magdiff;
          return FC(a.sign*b.sign, 2, Math.log10(b.mag)+Math.log10(Math.abs(mantissa)));
        }
      }
      
      if (a.layer == 1 && b.layer == 2)
      {
        return FC_NN(0, 0, 0);
      }
      
      if (a.layer == 2 && b.layer == 2)
      {
        if (a.mag < b.mag) { return FC_NN(0, 0, 0); }
        
        if (a.mag-b.mag > MAX_SIGNIFICANT_DIGITS)
        {
          return FC(a.sign*b.sign, a.layer, a.mag);
        }
        else
        {
          var magdiff = Math.pow(10, a.mag-b.mag);
          var mantissa = -1+magdiff;
          return FC(a.sign*b.sign, 2, b.mag+Math.log10(Math.abs(mantissa)));
        }
      }
      
      throw Error("Bad arguments to div: " + this + ", " + value);
    };

    Decimal.prototype.divide = function (value) {
      return this.div(value);
    };

    Decimal.prototype.divideBy = function (value) {
      return this.div(value);
    };

    Decimal.prototype.dividedBy = function (value) {
      return this.div(value);
    };

    Decimal.prototype.recip = function () {
      if (this.layer == 0)
      {
        return FC(this.sign, 0, 1/this.mag);
      }
      else if (this.layer == 1)
      {
        return FC(this.sign, 1, -this.mag);
      }
      else
      {
        return FC_NN(0, 0, 0);
      }
    };

    Decimal.prototype.reciprocal = function () {
      return this.recip();
    };

    Decimal.prototype.reciprocate = function () {
      return this.recip();
    };
    
    /**
     * -1 for less than value, 0 for equals value, 1 for greater than value
     */
    Decimal.prototype.cmp = function (value) {
      var decimal = D(value);
      if (this.sign > decimal.sign) { return 1; }
      if (this.sign < decimal.sign) { return -1; }
      if (this.layer > decimal.layer) { return 1; }
      if (this.layer < decimal.layer) { return -1; }
      if (this.mag > decimal.mag) { return 1; }
      if (this.mag < decimal.mag) { return -1; }
      return 0;
    };
	
	Decimal.prototype.cmpabs = function (value) {
      var decimal = D(value);
      if (this.layer > decimal.layer) { return 1; }
      if (this.layer < decimal.layer) { return -1; }
      if (this.mag > decimal.mag) { return 1; }
      if (this.mag < decimal.mag) { return -1; }
      return 0;
    };

    Decimal.prototype.compare = function (value) {
      return this.cmp(value);
    };

    Decimal.prototype.eq = function (value) {
      var decimal = D(value);
      return this.sign === decimal.sign && this.layer === decimal.layer && this.mag === decimal.mag;
    };

    Decimal.prototype.equals = function (value) {
      return this.eq(value);
    };

    Decimal.prototype.neq = function (value) {
      return !this.eq(value);
    };

    Decimal.prototype.notEquals = function (value) {
      return this.neq(value);
    };

    Decimal.prototype.lt = function (value) {
      var decimal = D(value);
      return this.cmp(value) == -1;
    };

    Decimal.prototype.lte = function (value) {
      return !this.gt(value);
    };

    Decimal.prototype.gt = function (value) {
      var decimal = D(value);
      return this.cmp(value) == 1;
    };

    Decimal.prototype.gte = function (value) {
      return !this.lt(value);
    };

    Decimal.prototype.max = function (value) {
      var decimal = D(value);
      return this.lt(decimal) ? decimal : this;
    };

    Decimal.prototype.min = function (value) {
      var decimal = D(value);
      return this.gt(decimal) ? decimal : this;
    };
	
	Decimal.prototype.maxabs = function (value) {
      var decimal = D(value);
      return this.cmpabs(decimal) < 0 ? decimal : this;
    };

    Decimal.prototype.minabs = function (value) {
      var decimal = D(value);
      return this.cmpabs(decimal) > 0 ? decimal : this;
    };

    Decimal.prototype.cmp_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return this.eq_tolerance(decimal, tolerance) ? 0 : this.cmp(decimal);
    };

    Decimal.prototype.compare_tolerance = function (value, tolerance) {
      return this.cmp_tolerance(value, tolerance);
    };
    
    /**
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */
    Decimal.prototype.eq_tolerance = function (value, tolerance) {
      var decimal = D(value); // https://stackoverflow.com/a/33024979
      //Numbers that are too far away are never close.
      if (this.sign != decimal.sign) { return false; }
      if (Math.abs(this.layer - decimal.layer) > 1) { return false; }
      // return abs(a-b) <= tolerance * max(abs(a), abs(b))
      var magA = this.mag;
      var magB = decimal.mag;
      if (this.layer > decimal.layer) { magB = Math.log10(magB); }
      if (this.layer < decimal.layer) { magA = Math.log10(magA); }
      return Math.abs(magA-magB) <= tolerance*Math.max(Math.abs(magA), Math.abs(magB));
    };

    Decimal.prototype.equals_tolerance = function (value, tolerance) {
      return this.eq_tolerance(value, tolerance);
    };

    Decimal.prototype.neq_tolerance = function (value, tolerance) {
      return !this.eq_tolerance(value, tolerance);
    };

    Decimal.prototype.notEquals_tolerance = function (value, tolerance) {
      return this.neq_tolerance(value, tolerance);
    };

    Decimal.prototype.lt_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return !this.eq_tolerance(decimal, tolerance) && this.lt(decimal);
    };

    Decimal.prototype.lte_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return this.eq_tolerance(decimal, tolerance) || this.lt(decimal);
    };

    Decimal.prototype.gt_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return !this.eq_tolerance(decimal, tolerance) && this.gt(decimal);
    };

    Decimal.prototype.gte_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return this.eq_tolerance(decimal, tolerance) || this.gt(decimal);
    };

    Decimal.prototype.abslog10 = function () {
       if (this.layer > 0)
      {
        return FC_NN(this.sign, this.layer-1, this.mag);
      }
      else if (this.sign === 0)
      {
        throw Error("abslog10(0) is undefined");
      }
      else
      {
        return FC_NN(this.sign, 0, Math.log10(Math.abs(this.mag)));
      }
    };

    Decimal.prototype.log10 = function () {
      if (this.layer > 0)
      {
        return FC_NN(this.sign, this.layer-1, this.mag);
      }
      else if (this.sign < -1)
      {
        throw Error("log10 is undefined for numbers <= 0");
      }
      else
      {
        return FC_NN(this.sign, 0, Math.log10(this.mag));
      }
    };

    Decimal.prototype.log = function (base) {
      throw Error("Unimplemented");
    };

    Decimal.prototype.log2 = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.ln = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.logarithm = function (base) {
      return this.log(base);
    };

    Decimal.prototype.pow = function (value) {
      var decimal = D(value);
      var a = this;
      var b = decimal;
      
      //TODO: Going to worry about negative numbers later and assume stuff is positive for now.
      
      //TODO: Can probably be made slightly less redundant.
      
      //special case: if a is 0, then return 0 (redundant: handled by a special case below)
      //if (a.sign === 0) { return FC_NN(0, 0, 0); }
      //special case: if a is 1, then return 1
      if (a.sign === 1 && a.layer === 0 && a.mag === 1) { return a; }
      //special case: if b is 0, then return 1
      if (b.sign === 0) { return FC_NN(1, 0, 1); }
      //special case: if b is 1, then return a
      if (b.sign === 1 && b.layer === 0 && b.mag === 1) { return a; }
      //special case: if a is 10, then call powbase10
      if (a.sign === 1 && a.layer === 0 && a.mag === 10) { return b.powbase10(); }
      
      if (a.layer === 0 && b.layer === 0)
      {
        var newmag = Math.pow(a.sign*a.mag, b.sign*b.mag);
        if (isFinite(newmag)) { return FC(1, 0, newmag); }
        return FC(1, 0, Math.log10(a.mag)*b.mag);
      }
      
      //Special case: if a is < 1 and b.layer > 0 then return 0
      if (a.layer === 0 && a.mag < 1) { return FC_NN(0, 0, 0); }
      
      if (a.layer === 1 && b.layer === 0)
      {
        return FC(1, 2, Math.log10(a.mag)+Math.log10(b.mag));
      }
      
      if (a.layer === 0 && b.layer === 1)
      {
        return FC(1, 2, Math.log10(Math.log10(a.mag))+b.mag);
      }
      
      if (a.layer === 1 && b.layer === 1)
      {
        return FC(1, 2, Math.log10(a.mag)+b.mag);
      }
      
      if (a.layer === 2 && b.layer <= 2)
      {
        var result = Decimal.mul(FC_NN(a.sign, 1, a.mag), FC_NN(b.sign, b.layer, b.mag));
        result.layer += 1;
        return result;
      }
      
      if (b.layer >= 2 && (b.layer - a.layer) >= 0)
      {
        //As far as I can tell, if b.layer >= 2 and a is a layer or more behind, then you just add 1 to b's layer because all precision vanishes.
        return FC(1, b.layer+1, b.mag);
      }
      else
      {
        //mul of increasingly higher layer (eventually turns into max).
        var result = Decimal.mul(FC_NN(a.sign, a.layer-1, a.mag), FC_NN(b.sign, b.layer, b.mag));
        result.layer += 1;
        return result;
      }
      
      throw Error("Bad arguments to pow: " + this + ", " + value);
    };
    
    Decimal.prototype.powbase10 = function () {
      if (this.sign === 0)
      {
        return FC_NN(1, 0, 1);
      }
      else if (this.sign === 1)
      {
        //mag might be too low and it might immediately be bumped down
        return FC(1, this.layer+1, this.mag);
      }
      else if (this.layer === 0)
      {
        //negative layer 0 number - will end up in range (0, 1) though rounding can make it exactly 0 or 1
        var new_mag = Math.pow(10, -this.mag);
        if (new_mag === 0) { return FC_NN(0, 0, 0); }
        return FC_NN(1, 0, new_mag);
      }
      else
      {
        //negative higher layer number - will always be 0
        return FC_NN(0, 0, 0);
      }
    }

    Decimal.prototype.pow_base = function (value) {
      return D(value).pow(this);
    };
    
    decimal.prototype.root = function (value) {
      throw Error("Unimplemented");
    }

    Decimal.prototype.factorial = function () {
      throw Error("Unimplemented");
    };
    
    Decimal.prototype.gamma = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.exp = function () {
      return Decimal.fromNumber(Math.E).pow(this);
    };

    Decimal.prototype.sqr = function () {
      return Decimal.pow(2);
    };

    Decimal.prototype.sqrt = function () {
      return Decimal.pow(0.5);
    };

    Decimal.prototype.cube = function () {
      return Decimal.pow(3);
    };

    Decimal.prototype.cbrt = function () {
      return Decimal.pow(1/3);
    };
    
    Decimal.prototype.tetrate = function(height = 2, payload = FC_NN(1, 0, 1)) {
      payload = D(payload);
      
      //special case: if height is 0, return 1
      if (height == 0) { return FC_NN(1, 0, 1); }
      //special case: if this is 10, return payload with layer increases by height
      if (this.sign == 1 && this.layer == 0 && this.mag == 10) { return FC(payload.sign, payload.layer + height, payload.mag); }
      
      //TODO: There are probably tricks to compute large heights more directly. Check what HyperCalc does.
      
      for (var i = 0; i < height; ++i)
      {
        payload = this.pow(payload);
      }
      return payload;
    }
	
	// trig functions!
    Decimal.prototype.sin = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.cos = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.tan = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.asin = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.acos = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.atan = function () {
      throw Error("Unimplemented");
    };
    
    // Some hyperbolic trig functions that happen to be easy
    Decimal.prototype.sinh = function () {
      return this.exp().sub(this.negate().exp()).div(2);
    };

    Decimal.prototype.cosh = function () {
      return this.exp().add(this.negate().exp()).div(2);
    };

    Decimal.prototype.tanh = function () {
      return this.sinh().div(this.cosh());
    };

    Decimal.prototype.asinh = function () {
      return Decimal.ln(this.add(this.sqr().add(1).sqrt()));
    };

    Decimal.prototype.acosh = function () {
      return Decimal.ln(this.add(this.sqr().sub(1).sqrt()));
    };

    Decimal.prototype.atanh = function () {
      if (this.abs().gte(1)) {
        return Number.NaN;
      }

      return Decimal.ln(this.add(1).div(D(1).sub(this))).div(2);
    };
    
    /**
     * Joke function from Realm Grinder
     */
    Decimal.prototype.ascensionPenalty = function (ascensions) {
      if (ascensions === 0) {
        return this;
      }

      return this.pow(Math.pow(10, -ascensions));
    };
    
    /**
     * Joke function from Cookie Clicker. It's 'egg'
     */
    Decimal.prototype.egg = function () {
      return this.add(9);
    };
    
    Decimal.prototype.lessThanOrEqualTo = function (other) {
      return this.cmp(other) < 1;
    };

    Decimal.prototype.lessThan = function (other) {
      return this.cmp(other) < 0;
    };

    Decimal.prototype.greaterThanOrEqualTo = function (other) {
      return this.cmp(other) > -1;
    };

    Decimal.prototype.greaterThan = function (other) {
      return this.cmp(other) > 0;
    };

    return Decimal;
  }();

  return Decimal;

}));