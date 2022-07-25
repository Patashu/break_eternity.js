var assert_eq_tolerance = function(error, a, b, precision = 1e-7)
{
  a = new Decimal(a);
  b = new Decimal(b);
  if (!a.isFinite() && !b.isFinite())
  {
    if (a.isNan() && b.isNan())
    {
      return;
    }
    if (a.sign == b.sign)
    {
      return;
    }
  }
  if (!a.eq_tolerance(b, precision))
  {
    console.log(error);
  }
}

//tetrate and slog ground truth for:
/*10^^2 = 1e10
10^^1.5 = 299.92012356854604298
10^^1.1 = 15.276013187671926546
10^^1 = 10
10^^0.5 = 2.4770056063449647580
10^^0 = 1
10^^-0.5 = 0.39392698954987671956
10^^-1 = 0
10^^-1.1 = -0.073413324316674049650
10^^-1.5 = -0.40458426287953460128
10^^-1.9 = -1.1345680321718982860
10^^-1.99 = -2.1357989167988367351
10^^-1.999 = -3.1358003090926477386 
10^^-1.9999 = -4.1357992057580525630
10^^-1.99999 = -5.1357990829699223045
10^^-2 = -neg infinity
10^^-2.1 = NaN*/

var test_tetrate_slog = function()
{
  console.log("test_tetrate_slog")
  for (var i = 0; i < 1000; ++i)
  {
    let base = Math.random()*10 + 1.5;
    let tower = Math.random()*10 - 1;
    let round_trip = new Decimal(base).tetrate(tower).slog(base).toNumber();
    assert_eq_tolerance(base + ", " + tower, round_trip, tower, base < 2 ? 1e-2 : 1e-10);
  }
}

var test_layeradd10_twice = function()
{
  console.log("test_layeradd10_twice")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.random()*100;
    var both = Math.random()*100;
    var expected = first+both+1;
    var result = new Decimal(10).layeradd10(first).layeradd10(both).slog();
    assert_eq_tolerance(first + ", " + both, expected, result);
  }
}

var test_layeradd10_reverse = function()
{
  console.log("test_layeradd10_reverse")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.random()*100;
    var both = Math.random()*100;
    first += both;
    var expected = first-both+1;
    var result = new Decimal(10).layeradd10(first).layeradd10(-both).slog();
    assert_eq_tolerance(first + ", " + both, expected, result);
  }
}

var test_layeradd10_twice_anybase = function()
{
  console.log("test_layeradd10_twice_anybase")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.random()*100;
    var both = Math.random()*100;
    var base = Math.random()*8+2;
    var expected = first+both+1;
    var result = new Decimal(base).layeradd(first, base).layeradd(both, base).slog(base);
    assert_eq_tolerance(first + ", " + both + ", " + base, expected, result);
  }
}

var test_layeradd10_reverse_anybase = function()
{
  console.log("test_layeradd10_reverse_anybase")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.random()*100;
    var both = Math.random()*100;
    var base = Math.random()*8+2;
    first += both;
    var expected = first-both+1;
    var result = new Decimal(base).layeradd(first, base).layeradd(-both, base).slog(base);
    assert_eq_tolerance(first + ", " + both + ", " + base, expected, result);
  }
}

var test_tetrate_iteratedlog = function()
{
  console.log("test_ltetrate_iteratedlog")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.round((Math.random()*30))/10;
    var both = Math.round((Math.random()*30))/10;
    var tetrateonly = Decimal.tetrate(10, first);
    var tetrateandlog = Decimal.tetrate(10, first+both).iteratedlog(10, both);
    assert_eq_tolerance(first + ", " + both, expected, result);
  }
}

var test_tetrate_base = function()
{
  console.log("test_tetrate_base")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.round((Math.random()*30))/10;
    var both = Math.round((Math.random()*30))/10;
    var base = Math.random()*8+2;
    var tetrateonly = Decimal.tetrate(base, first);
    var tetrateandlog = Decimal.tetrate(base, first+both).iteratedlog(base, both);
    assert_eq_tolerance(first + ", " + both + ", " + base, expected, result);
  }
}

var test_tetrate_base_2 = function()
{
  console.log("test_tetrate_base_2")
  for (var i = 0; i < 1000; ++i)
  {
    var first = Math.round((Math.random()*30))/10;
    var both = Math.round((Math.random()*30))/10;
    var base = Math.random()*8+2;
    var tetrateonly = Decimal.tetrate(base, first, base);
    var tetrateandlog = Decimal.tetrate(base, first+both, base).iteratedlog(base, both);
    assert_eq_tolerance(first + ", " + both + ", " + base, expected, result);
  }
}

var test_lambertw = function()
{
  console.log("test_lambertw")
  for (var i = 0; i < 1000; ++i)
  {
    var xex = new Decimal(-0.3678794411710499+Math.random()*100);
    var x = Decimal.lambertw(xex);
    assert_eq_tolerance(xex, x.mul(Decimal.exp(x)));
  }
}

var test_lambertw_2 = function()
{
  console.log("test_lambertw_2")
  for (var i = 0; i < 1000; ++i)
  {
    var xex = new Decimal(-0.3678794411710499+Math.exp(Math.random()*100));
    var x = Decimal.lambertw(xex);
    assert_eq_tolerance(xex, x.mul(Decimal.exp(x)));
  }
}

var test_add_number = function()
{
  console.log("test_add_number")
  for (var i = 0; i < 1000; ++i)
  {
    var a = Decimal.randomDecimalForTesting(Math.random() > 0.5 ? 0 : 1);
    var b = Decimal.randomDecimalForTesting(Math.random() > 0.5 ? 0 : 1);
    if (Math.random() > 0.5) { a = a.recip(); }
    if (Math.random() > 0.5) { b = b.recip(); }
    var c = a.add(b).toNumber();
    assert_eq_tolerance(a + ", " + b, c, a.toNumber()+b.toNumber());
  }
}

var test_mul = function()
{
  console.log("test_mul")
  for (var i = 0; i < 100; ++i)
  {
    var a = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
    var b = Decimal.randomDecimalForTesting(Math.round(Math.random()*4));
    if (Math.random() > 0.5) { a = a.recip(); }
    if (Math.random() > 0.5) { b = b.recip(); }
    var c = a.mul(b).toNumber();
    assert_eq_tolerance("Test 1: " + a + ", " + b, c, a.toNumber()*b.toNumber())
    assert_eq_tolerance("Test 2: " + a + ", " + b, Decimal.mul(a.recip(), b.recip()),Decimal.mul(a, b).recip());
  }
}

var test_pow_root = function()
{
  console.log("test_pow_root")
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
    assert_eq_tolerance("Test 1: " + a + ", " + b, c, d)
    assert_eq_tolerance("Test 2: " + a + ", " + b, e, f)
  }
}

var all_tests = function()
{
  test_tetrate_slog();
  test_layeradd10_twice();
  test_layeradd10_reverse();
  test_layeradd10_twice_anybase();
  test_layeradd10_reverse_anybase();
  test_tetrate_iteratedlog();
  test_tetrate_base();
  test_tetrate_base_2();
  test_lambertw();
  test_lambertw_2();
  test_add_number();
  test_mul();
  test_pow_root();
}