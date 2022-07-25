var assert_eq_tolerance = function(a, b, precision = 1e-7)
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
    console.log(a.toString(), b.toString());
  }
}

var test_tetrate_slog_round_trip_simple_random = function()
{
  for (var i = 0; i < 1000; ++i)
  {
    let base = Math.random()*10;
    let tower = Math.random()*10;
    let round_trip = new Decimal(base).tetrate(tower).slog(base).toNumber();
    assert_eq_tolerance(round_trip, tower);
  }
}