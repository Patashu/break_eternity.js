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

  var EXP_LIMIT = 9e15; // The largest exponent that can appear in a Number, though not all mantissas are valid here.
  
  var LAYER_DOWN = Math.log10(9e15); //If we're BELOW this value, drop down a layer. About 15.954.

  var NUMBER_EXP_MAX = 308; // The smallest exponent that can appear in a Number, though not all mantissas are valid here.

  var NUMBER_EXP_MIN = -324;
  
  var MAX_ES_IN_A_ROW = 6;

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
      throw Error("Unimplemented");
    };

    Decimal.pow = function (value, other) {
      throw Error("Unimplemented");
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
      
      if (a.layer == 0 && b.layer == 0) { return new D(a.sign*a.mag + b.sign*b.mag); }
      
      if (a.layer == 1 && b.layer == 0)
      {
        var magdiff = Math.pow(10, a.mag-Math.log10(b.mag));
        if (!isFinite(magdiff) || magdiff > 1e17)
        {
          return a;
        }
        else
        {
          var mantissa = (b.sign*1)+(a.sign*magdiff);
          return FC(Math.sign(mantissa), 1, Math.log10(b.mag)+Math.log10(Math.abs(mantissa)));
        }
      }
      
      if (a.layer == 1 && b.layer == 1)
      {
        var magdiff = Math.pow(10, a.mag-b.mag);
        if (!isFinite(magdiff) || magdiff > 1e17)
        {
          return a;
        }
        else
        {
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
      
      if (a.layer == 0 && b.layer == 0) { return new D(a.sign*b.sign*a.mag*b.mag); }
      
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
        var magdiff = Math.pow(10, a.mag-Math.log10(b.mag));
        if (!isFinite(magdiff) || magdiff > 1e17)
        {
          return a;
        }
        else
        {
          var mantissa = 1+magdiff;
          return FC(a.sign*b.sign, 2, Math.log10(b.mag)+Math.log10(Math.abs(mantissa)));
        }
      }
      
      if (a.layer == 2 && b.layer == 2)
      {
        var magdiff = Math.pow(10, a.mag-b.mag);
        if (!isFinite(magdiff) || magdiff > 1e17)
        {
          return a;
        }
        else
        {
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
      
      if (a.layer == 0 && b.layer == 0) { return new D(a.sign*b.sign*a.mag/b.mag); }
      
      if (a.layer == 1 && b.layer == 0) { return FC(a.sign*b.sign, 1, a.mag-Math.log10(b.mag)); }
      
      if (a.layer == 0 && b.layer == 1) { return FC(a.sign*b.sign, 1, Math.log10(a.mag)-b.mag); }
      
      if (a.layer == 1 && b.layer == 1) { return FC(a.sign*b.sign, 1, a.mag-b.mag); }
      
      if (a.layer == 2 && b.layer == 1)
      {
        if (a.mag < Math.log10(b.mag)) { return FC_NN(0, 0, 0); }
        var magdiff = Math.pow(10, a.mag-Math.log10(b.mag));
        if (!isFinite(magdiff) || magdiff > 1e17)
        {
          return FC(a.sign*b.sign, a.layer, a.mag);
        }
        else
        {
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
        var magdiff = Math.pow(10, a.mag-b.mag);
        if (!isFinite(magdiff) || magdiff > 1e17)
        {
          return FC(a.sign*b.sign, a.layer, a.mag);
        }
        else
        {
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
        return D_FCNN(this.sign, this.layer-1, this.mag);
      }
      else if (this.sign === 0)
      {
        throw Error("abslog10(0) is undefined");
      }
      else
      {
        return D_FCNN(this.sign, 0, Math.log10(Math.abs(this.mag)));
      }
    };

    Decimal.prototype.log10 = function () {
      if (this.layer > 0)
      {
        return D_FCNN(this.sign, this.layer-1, this.mag);
      }
      else if (this.sign < -1)
      {
        throw Error("log10 is undefined for numbers <= 0");
      }
      else
      {
        return D_FCNN(this.sign, 0, Math.log10(this.mag));
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
      throw Error("Unimplemented");
    };
    
    Decimal.prototype.powbase10 = function (value) {
      if (this.sign === 0)
      {
        return D_FCNN(1, 0, 1);
      }
      else if (this.sign === 1)
      {
        //mag might be too low and it might immediately be bumped down
        return D_FC(1, this.layer+1, this.mag);
      }
      else if (this.layer === 0)
      {
        //negative layer 0 number - will end up in range (0, 1) though rounding can make it exactly 0 or 1
        var new_mag = Math.pow(10, -this.mag);
        if (new_mag === 0) { return D_FC(0, 0, 0); }
        return D_FCNN(1, 0, new_mag);
      }
      else
      {
        //negative higher layer number - will always be 0
        return D_FCNN(0, 0, 0);
      }
    }

    Decimal.prototype.pow_base = function (value) {
      return D(value).pow(this);
    };

    Decimal.prototype.factorial = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.exp = function () {
      return Error("Unimplemented");
    };

    Decimal.prototype.sqr = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.sqrt = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.cube = function () {
      throw Error("Unimplemented");
    };

    Decimal.prototype.cbrt = function () {
      throw Error("Unimplemented");
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
