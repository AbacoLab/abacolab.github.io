/* Hyperliquid Account Audit: everything runs in the visitor's browser.
   It reads Hyperliquid's public info API (no keys, no wallet), rebuilds the trades from the fills,
   and measures costs, risk and habits. Nothing is sent to Abaco and nothing is stored. */
(function () {
  'use strict';

  var API = 'https://api.hyperliquid.xyz/info';
  var SAMPLE = window.AUDIT_SAMPLE || null;            // a recorded set of answers, for previews without network
  var NOW = SAMPLE ? SAMPLE.now : Date.now();
  var DAY = 86400000;
  // Minutes a trade must last for the typical move to pay two taker round trips (Abaco study, Jul 2025 – Sep 2026)
  var STUDY = {"ZEC":8,"HYPE":10,"ENA":13,"XPL":13,"ZRO":14,"WLD":15,"PENGU":16,"SUI":17,"TAO":17,"VIRTUAL":19,"SOL":20,"NEAR":21,"AAVE":22,"DOGE":22,"ADA":23,"ARB":24,"LINK":24,"AVAX":25,"UNI":25,"XRP":25,"LDO":26,"ONDO":26,"ASTER":27,"APT":28,"CRV":28,"ETHFI":29,"FET":29,"INJ":29,"ETH":30,"JTO":30,"JUP":30,"PENDLE":31,"XMR":32,"VVV":35,"ICP":36,"XLM":37,"OP":38,"PYTH":38,"DOT":39,"GRASS":39,"BCH":40,"KAITO":40,"LTC":40,"HBAR":47,"MORPHO":47,"FIL":49,"AERO":56,"BNB":56,"BTC":56,"STX":56,"ALGO":69,"ATOM":80,"IMX":95,"MINA":125,"TRX":296};
  var STYLE = [['intraday', DAY], ['swing', 7 * DAY], ['hold', Infinity]];

  /* ---------- the API, paced under Hyperliquid's limit of 1,200 weight a minute per IP ---------- */
  var spent = [];
  function budget(w) {
    return new Promise(function (resolve) {
      (function check() {
        var t = Date.now();
        spent = spent.filter(function (x) { return t - x[0] < 60000; });
        var used = spent.reduce(function (a, x) { return a + x[1]; }, 0);
        if (used + w <= 1150) { spent.push([t, w]); resolve(); } else setTimeout(check, 1500);
      })();
    });
  }
  function weightOf(type) { return ({ clearinghouseState: 2, spotClearinghouseState: 2 })[type] || 20; }
  var recorder = null;   // set by the preview builder to keep every answer
  async function info(body) {
    var key = JSON.stringify(body);
    if (SAMPLE) {
      if (!(key in SAMPLE.answers)) throw new Error('not in the sample: ' + key);
      return SAMPLE.answers[key];
    }
    await budget(weightOf(body.type));
    var r, tries = 0;
    for (;;) {
      r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: key });
      if (r.status === 429 && tries++ < 4) { await new Promise(function (ok) { setTimeout(ok, 4000 * tries); }); continue; }
      break;
    }
    if (!r.ok) throw new Error('Hyperliquid answered ' + r.status);
    var text = await r.text();
    var data = text === 'null' ? null : JSON.parse(text);
    if (Array.isArray(data) && /Fills|Funding/.test(body.type)) spent.push([Date.now(), Math.floor(data.length / 20)]);
    if (recorder) recorder[key] = data;
    return data;
  }

  // Only the most recent 10,000 fills. The latest 2,000 give the account's pace; windows then walk back from there
  async function allFills(user, onCount) {
    var seen = new Map(), floor = NOW - 4 * 365 * DAY;
    function keep(list) { (list || []).forEach(function (f) { if (!seen.has(f.tid)) seen.set(f.tid, f); }); if (onCount) onCount(Math.min(10000, seen.size)); }
    var recent = (await info({ type: 'userFills', user: user })) || [];
    keep(recent);
    if (recent.length < 2000) return finish();
    var oldest = Math.min.apply(null, recent.map(function (f) { return f.time; }));
    var pace = 2000 / Math.max(3600000, NOW - oldest);          // fills per millisecond
    var end = oldest, idle = 0;
    while (seen.size < 10000 && end > floor && idle < 3) {
      var W = Math.floor(Math.min(365 * DAY, Math.max(3600000, (10000 - seen.size) / pace * 1.1))), start = Math.floor(Math.max(floor, end - W)), cur = start, got = 0;
      for (;;) {                                                // forward pages inside the window
        var page = (await info({ type: 'userFillsByTime', user: user, startTime: cur, endTime: end })) || [];
        keep(page); got += page.length;
        if (page.length < 2000) break;
        cur = page[page.length - 1].time;
      }
      idle = got ? 0 : idle + 1;
      if (got) pace = Math.max(pace / 4, got / Math.max(3600000, end - start));
      end = start;
    }
    return finish();
    function finish() {
      var list = Array.from(seen.values()).sort(function (a, b) { return a.time - b.time || a.tid - b.tid; });
      return list.slice(Math.max(0, list.length - 10000));
    }
  }

  // Funding comes in pages of 500 rows; maxPages caps the first, quick pass
  async function fundingFrom(user, start, maxPages, onPage) {
    var rows = new Map(), pages = 0, done = false;
    for (;;) {
      var page = await info({ type: 'userFunding', user: user, startTime: start, endTime: NOW });
      pages++;
      if (!page || !page.length) { done = true; break; }
      page.forEach(function (x) { rows.set(x.time + '|' + x.delta.coin, x); });
      if (onPage) onPage(pages);
      if (page.length < 500) { done = true; break; }
      start = page[page.length - 1].time;
      if (pages >= maxPages) break;
    }
    var list = Array.from(rows.values()).sort(function (a, b) { return a.time - b.time; });
    return { rows: list, done: done, next: start };
  }

  /* ---------- small helpers ---------- */
  function num(x) { var v = +x; return isFinite(v) ? v : 0; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  function median(a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); var m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  function isPerp(f) { return /Long|Short/.test(f.dir || ''); }

  /* ---------- the account curve: portfolio windows stitched, finer windows written last ---------- */
  function curve(portfolio) {
    var byName = {};
    (portfolio || []).forEach(function (w) { byName[w[0]] = w[1]; });
    var order = ['allTime', 'month', 'week', 'day'].filter(function (n) { return byName[n] && byName[n].accountValueHistory.length > 1; });
    var wins = order.map(function (n) {
      var w = byName[n], pnl = new Map(w.pnlHistory.map(function (p) { return [p[0], num(p[1])]; }));
      return w.accountValueHistory.filter(function (p) { return pnl.has(p[0]); }).map(function (p) { return { t: p[0], av: num(p[1]), pnl: pnl.get(p[0]) }; });
    });
    var avs = [].concat.apply([], wins.map(function (w) { return w.map(function (p) { return p.av; }); })).filter(function (v) { return v > 0; });
    var floorCap = Math.max(100, 0.02 * (median(avs) || 0));
    var pts = [], rets = [];
    wins.forEach(function (w, k) {
      var lo = w[0].t, hi = k + 1 < wins.length ? wins[k + 1][0].t : Infinity;
      for (var i = 1; i < w.length; i++) {
        var a = w[i - 1], b = w[i];
        if (b.t <= lo || a.t >= hi) continue;
        var t0 = Math.max(a.t, lo), t1 = Math.min(b.t, hi), part = (t1 - t0) / (b.t - a.t);
        var dp = b.pnl - a.pnl, flow = (b.av - a.av) - dp, cap = a.av + 0.5 * flow;
        if (cap > 0 && cap >= floorCap) rets.push({ t: t1, ret: Math.max(-0.99, dp / cap) * part, dt: t1 - t0 });
      }
      w.forEach(function (p) { if (p.t >= lo && p.t < hi) pts.push({ t: p.t, av: p.av }); });
    });
    pts.sort(function (a, b) { return a.t - b.t; });
    rets.sort(function (a, b) { return a.t - b.t; });
    return { pts: pts, rets: rets };
  }
  function avAt(pts, t) {
    if (!pts.length) return 0;
    if (t <= pts[0].t) return pts[0].av;
    for (var i = 1; i < pts.length; i++) if (pts[i].t >= t) {
      var a = pts[i - 1], b = pts[i]; return a.av + (b.av - a.av) * (t - a.t) / (b.t - a.t);
    }
    return pts[pts.length - 1].av;
  }

  /* ---------- trades: from flat to flat, per coin; a flip is two trades ---------- */
  function trades(fills, startOfData) {
    var open = {}, done = [], pos = {};
    function begin(f, side, t, partial) { return { coin: f.coin, side: side, t0: t, t1: null, gross: 0, fees: 0, builder: 0, funding: 0, takerFees: 0, notional: 0, takerNotional: 0, legs: {}, partial: partial }; }
    function add(tr, f, share) {
      var fee = num(f.fee) * share, notional = num(f.px) * num(f.sz) * share;
      tr.fees += fee; tr.builder += num(f.builderFee) * share; tr.notional += notional;
      if (f.crossed) { tr.takerFees += fee; tr.takerNotional += notional; }
      tr.legs[f.oid] = 1;
    }
    fills.filter(isPerp).forEach(function (f) {
      var c = f.coin, sz = num(f.sz) * (f.side === 'B' ? 1 : -1), start = num(f.startPosition), end = start + sz;
      if (Math.abs(end) < 1e-12) end = 0;
      if (!open[c] && start !== 0) open[c] = begin(f, start > 0 ? 'long' : 'short', startOfData, true);
      if (!open[c]) open[c] = begin(f, sz > 0 ? 'long' : 'short', f.time, false);
      var tr = open[c];
      var flips = start !== 0 && end !== 0 && (start > 0) !== (end > 0);
      if (flips) {
        var closeShare = Math.abs(start) / Math.abs(sz);
        add(tr, f, closeShare); tr.gross += num(f.closedPnl); tr.t1 = f.time; done.push(tr);
        var nt = begin(f, end > 0 ? 'long' : 'short', f.time, false); add(nt, f, 1 - closeShare); open[c] = nt;
      } else {
        add(tr, f, 1); tr.gross += num(f.closedPnl);
        if (end === 0) { tr.t1 = f.time; done.push(tr); delete open[c]; }
      }
      pos[c] = end;
    });
    var still = Object.keys(open).map(function (c) { return open[c]; });
    return { closed: done, open: still };
  }

  function attachFunding(list, rows) {
    var byCoin = {};
    list.forEach(function (tr) { (byCoin[tr.coin] = byCoin[tr.coin] || []).push(tr); });
    var loose = 0;
    rows.forEach(function (r) {
      var c = r.delta.coin, v = num(r.delta.usdc), hit = null, arr = byCoin[c] || [];
      for (var i = 0; i < arr.length; i++) { var tr = arr[i]; if (r.time >= tr.t0 && (tr.t1 === null || r.time <= tr.t1)) { hit = tr; break; } }
      if (hit) hit.funding += v; else loose += v;
    });
    return loose;
  }

  /* ---------- risk measures on an index of the account, net of deposits and withdrawals ---------- */
  function indexFrom(points) {   // points: [{t, ret}] with ret the return since the previous point
    var I = 1, out = [];
    points.forEach(function (p) { I *= 1 + p.ret; out.push({ t: p.t, I: I }); });
    return out;
  }
  function risk(idx, daily) {
    if (idx.length < 2) return null;
    var peak = idx[0].I, peakT = idx[0].t, maxDD = 0, maxT = idx[0].t, ddSq = 0, ddSum = 0, span = 0, longest = 0, uwStart = null;
    for (var i = 1; i < idx.length; i++) {
      var p = idx[i], dt = p.t - idx[i - 1].t;
      if (p.I >= peak) { if (uwStart !== null) longest = Math.max(longest, p.t - uwStart); uwStart = null; peak = p.I; peakT = p.t; }
      else if (uwStart === null) uwStart = peakT;
      var dd = p.I / peak - 1;
      if (dd < maxDD) { maxDD = dd; maxT = p.t; }
      ddSq += dd * dd * dt; ddSum += dd * dt; span += dt;
    }
    var current = uwStart === null ? 0 : NOW - uwStart;
    longest = Math.max(longest, current);
    var years = (idx[idx.length - 1].t - idx[0].t) / (365 * DAY);
    var total = idx[idx.length - 1].I / idx[0].I - 1;
    var cagr = years > 0.08 ? Math.pow(1 + total, 1 / years) - 1 : null;
    var ulcer = Math.sqrt(ddSq / span) * 100;
    var r = daily.map(function (d) { return d.ret; });
    var mean = r.length ? sum(r) / r.length : 0;
    var sd = r.length > 1 ? Math.sqrt(sum(r, function (x) { return (x - mean) * (x - mean); }) / (r.length - 1)) : 0;
    var down = r.length ? Math.sqrt(sum(r, function (x) { return x < 0 ? x * x : 0; }) / r.length) : 0;
    return {
      total: total, cagr: cagr, maxDD: maxDD, maxDDAt: maxT, avgDD: ddSum / span, ulcer: ulcer,
      longest: longest, current: current,
      sortino: down > 0 && r.length >= 20 && r.filter(function (x) { return x < 0; }).length >= 5 ? mean / down * Math.sqrt(365) : null,
      sharpe: sd > 0 && r.length >= 20 ? mean / sd * Math.sqrt(365) : null,
      calmar: cagr !== null && maxDD < 0 ? cagr / -maxDD : null,
      upi: cagr !== null && ulcer > 0 ? cagr * 100 / ulcer : null,
      worstDay: r.length ? Math.min.apply(null, r) : null, days: r.length
    };
  }
  function months(idx) {   // calendar months, from the index interpolated at month starts
    if (idx.length < 2) return [];
    function at(t) {
      if (t <= idx[0].t) return idx[0].I;
      for (var i = 1; i < idx.length; i++) if (idx[i].t >= t) { var a = idx[i - 1], b = idx[i]; return a.I + (b.I - a.I) * (t - a.t) / (b.t - a.t); }
      return idx[idx.length - 1].I;
    }
    var out = [], d = new Date(idx[0].t); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    while (d.getTime() < NOW) {
      var s = Math.max(d.getTime(), idx[0].t), n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)), e = Math.min(n.getTime(), idx[idx.length - 1].t);
      if (e > s) out.push({ y: d.getUTCFullYear(), m: d.getUTCMonth(), r: at(e) / at(s) - 1, partial: s > d.getTime() || e < n.getTime() });
      d = n;
    }
    return out;
  }

  /* ---------- the audit ---------- */
  async function run(user, report) {
    report({ step: 'Reading the account', pct: 5 });
    var vault = null;
    try { vault = await info({ type: 'vaultDetails', vaultAddress: user }); } catch (e) { vault = null; }
    var portfolio = await info({ type: 'portfolio', user: user });
    report({ step: 'Reading the fills', pct: 15 });
    var fills = await allFills(user, function (n) { report({ step: 'Reading the fills: ' + n.toLocaleString('en-US'), pct: 15 + Math.round(30 * Math.min(1, n / 10000)) }); });
    report({ step: 'Reading open positions', pct: 45 });
    var state = await info({ type: 'clearinghouseState', user: user });
    var dexes = [];
    try { dexes = (await info({ type: 'perpDexs' })) || []; } catch (e) { dexes = []; }
    var hip3 = [];
    for (var i = 0; i < dexes.length; i++) {
      var dx = dexes[i]; if (!dx || !dx.name) continue;
      try { var s3 = await info({ type: 'clearinghouseState', user: user, dex: dx.name }); if (s3 && s3.assetPositions && s3.assetPositions.length) hip3.push(s3); } catch (e) { /* that dex is skipped */ }
    }
    var startOfData = fills.length ? fills[0].time : NOW;
    report({ step: 'Reading funding', pct: 55 });
    var fund = await fundingFrom(user, startOfData, 3, null);
    var a = build(user, vault, portfolio, fills, state, hip3, fund, null);
    a.mode = fund.done ? 'deep-funding' : 'light';
    return { audit: a, more: async function (onPct) {
      // the deep pass: the rest of the funding, then a daily curve rebuilt from trades, funding and daily closes
      var restPages = 0;
      if (!fund.done) {
        var rest = await fundingFrom(user, fund.next, 400, function (n) { restPages = n; onPct(Math.min(70, 5 + n)); });
        var m = new Map(); fund.rows.concat(rest.rows).forEach(function (x) { m.set(x.time + '|' + x.delta.coin, x); });
        fund = { rows: Array.from(m.values()).sort(function (x, y) { return x.time - y.time; }), done: rest.done, next: rest.next };
      }
      var coins = Array.from(new Set(fills.filter(isPerp).map(function (f) { return f.coin; })));
      var closes = {};
      for (var k = 0; k < coins.length; k++) {
        onPct(70 + Math.round(25 * k / Math.max(1, coins.length)));
        try {
          var cs = await info({ type: 'candleSnapshot', req: { coin: coins[k], interval: '1d', startTime: startOfData - DAY, endTime: NOW } });
          closes[coins[k]] = (cs || []).map(function (c) { return [c.t, num(c.c)]; });
        } catch (e) { closes[coins[k]] = []; }
      }
      var b = build(user, vault, portfolio, fills, state, hip3, fund, closes);
      b.mode = 'deep';
      return b;
    } };
  }

  function build(user, vault, portfolio, fills, state, hip3, fund, closes) {
    var startOfData = fills.length ? fills[0].time : NOW;
    var CV = curve(portfolio), pts = CV.pts;
    var T = trades(fills, startOfData);
    var all = T.closed.concat(T.open);
    var loose = attachFunding(all, fund.rows);
    var spotFees = sum(fills.filter(function (f) { return !isPerp(f); }), function (f) { return num(f.fee); });

    // costs
    var gross = sum(T.closed, function (t) { return t.gross; });
    var fees = sum(all, function (t) { return t.fees; }) + spotFees;
    var builder = sum(all, function (t) { return t.builder; });
    var funding = sum(fund.rows, function (r) { return num(r.delta.usdc); });
    var unreal = 0, positions = [];
    [state].concat(hip3).forEach(function (s) {
      ((s && s.assetPositions) || []).forEach(function (p) { var q = p.position; unreal += num(q.unrealizedPnl); positions.push({ coin: q.coin, szi: num(q.szi), value: num(q.positionValue), upnl: num(q.unrealizedPnl), lev: q.leverage && q.leverage.value }); });
    });
    var net = gross - fees + funding;

    // maker and taker, at the account's own observed rates
    var pf = fills.filter(isPerp), tN = 0, mN = 0, tF = 0, mF = 0;
    pf.forEach(function (f) { var n = num(f.px) * num(f.sz), fee = num(f.fee) - num(f.builderFee); if (f.crossed) { tN += n; tF += fee; } else { mN += n; mF += fee; } });
    var takerRate = tN ? tF / tN : null, makerRate = mN ? mF / mN : null;
    var takerExtra = takerRate !== null && makerRate !== null ? tN * (takerRate - makerRate) : null;

    // per trade
    var C = T.closed.map(function (t) {
      var res = t.gross - t.fees + t.funding, hold = t.t1 - t.t0;
      var style = STYLE.filter(function (s) { return hold < s[1]; })[0][0];
      var base = t.coin.indexOf(':') >= 0 ? null : t.coin;
      var floor = base && STUDY[base] ? STUDY[base] * 60000 : null;
      return { coin: t.coin, side: t.side, t0: t.t0, t1: t.t1, hold: hold, res: res, gross: t.gross, costs: t.fees - t.funding, style: style, partial: t.partial, tooShort: floor !== null ? hold < floor : null, legs: Object.keys(t.legs).length };
    });
    var wins = C.filter(function (t) { return t.res > 0; }), losses = C.filter(function (t) { return t.res <= 0; });
    var streak = 0, worstStreak = 0; C.forEach(function (t) { streak = t.res <= 0 ? streak + 1 : 0; worstStreak = Math.max(worstStreak, streak); });
    var stats = {
      n: C.length, winRate: C.length ? wins.length / C.length : null,
      profitFactor: losses.length && sum(losses, function (t) { return t.res; }) < 0 ? sum(wins, function (t) { return t.res; }) / -sum(losses, function (t) { return t.res; }) : null,
      payoff: wins.length && losses.length ? (sum(wins, function (t) { return t.res; }) / wins.length) / Math.abs(sum(losses, function (t) { return t.res; }) / losses.length) : null,
      expectancy: C.length ? sum(C, function (t) { return t.res; }) / C.length : null, losingStreak: worstStreak,
      holdWin: median(wins.map(function (t) { return t.hold; })), holdLoss: median(losses.map(function (t) { return t.hold; }))
    };
    function group(key) {
      var g = {};
      C.forEach(function (t) { var k = key(t); var o = g[k] = g[k] || { k: k, n: 0, net: 0, costs: 0, wins: 0, holds: [], holdW: [], holdL: [] }; o.n++; o.net += t.res; o.costs += t.costs; if (t.res > 0) { o.wins++; o.holdW.push(t.hold); } else o.holdL.push(t.hold); o.holds.push(t.hold); });
      return Object.keys(g).map(function (k) { return g[k]; });
    }
    var byAsset = group(function (t) { return t.coin; }).sort(function (a, b) { return b.net - a.net; });
    var bySide = group(function (t) { return t.side; });
    var byStyle = group(function (t) { return t.style; });
    var hours = new Array(24).fill(0), hoursN = new Array(24).fill(0), dows = new Array(7).fill(0), dowsN = new Array(7).fill(0);
    C.forEach(function (t) { var d = new Date(t.t1); hours[d.getUTCHours()] += t.res; hoursN[d.getUTCHours()]++; var w = (d.getUTCDay() + 6) % 7; dows[w] += t.res; dowsN[w]++; });
    var studied = C.filter(function (t) { return t.tooShort !== null; }), short = studied.filter(function (t) { return t.tooShort; });

    // exposure: gross notional against the account value, at every fill
    var posNow = {}, lastPx = {}, levs = [];
    pf.forEach(function (f) { posNow[f.coin] = num(f.startPosition) + num(f.sz) * (f.side === 'B' ? 1 : -1); lastPx[f.coin] = num(f.px);
      var g = 0; Object.keys(posNow).forEach(function (c) { g += Math.abs(posNow[c]) * lastPx[c]; }); var eq = avAt(pts, f.time); if (eq > 0) levs.push(g / eq); });
    var notionalBy = {}; pf.forEach(function (f) { notionalBy[f.coin] = (notionalBy[f.coin] || 0) + num(f.px) * num(f.sz); });
    var totN = sum(Object.keys(notionalBy).map(function (k) { return notionalBy[k]; }));
    var topCoin = Object.keys(notionalBy).sort(function (x, y) { return notionalBy[y] - notionalBy[x]; })[0];
    var inMarket = 0; (function () { var ivs = all.map(function (t) { return [t.t0, t.t1 === null ? NOW : t.t1]; }).sort(function (x, y) { return x[0] - y[0]; }); var cs = null, ce = null; ivs.forEach(function (iv) { if (cs === null) { cs = iv[0]; ce = iv[1]; } else if (iv[0] <= ce) ce = Math.max(ce, iv[1]); else { inMarket += ce - cs; cs = iv[0]; ce = iv[1]; } }); if (cs !== null) inMarket += ce - cs; })();
    var liquidations = fills.filter(function (f) { return f.liquidation && String(f.liquidation.liquidatedUser).toLowerCase() === user.toLowerCase(); }).length;

    // returns, net of deposits: from the stitched portfolio, or a daily rebuild over the fills
    var rets = CV.rets.slice(), daily = [];
    var rebuilt = false;
    if (closes && fills.length) {
      var start = Math.floor(startOfData / DAY) * DAY, days = [];
      for (var d = start; d < NOW; d += DAY) days.push(d);
      var realized = {}, fundD = {};
      fills.forEach(function (f) { var k = Math.floor(f.time / DAY) * DAY; realized[k] = (realized[k] || 0) + (isPerp(f) ? num(f.closedPnl) : 0) - num(f.fee); });
      fund.rows.forEach(function (r) { var k = Math.floor(r.time / DAY) * DAY; fundD[k] = (fundD[k] || 0) + num(r.delta.usdc); });
      // positions and average entry per coin, day by day
      var book = {}, fi = 0, prevU = 0;
      var sorted = pf;
      days.forEach(function (d) {
        var end = d + DAY;
        while (fi < sorted.length && sorted[fi].time < end) {
          var f = sorted[fi++], b = book[f.coin] = book[f.coin] || { q: num(f.startPosition), avg: num(f.px) };
          var q = num(f.sz) * (f.side === 'B' ? 1 : -1), nq = b.q + q;
          if (b.q === 0 || (b.q > 0) === (q > 0)) b.avg = (b.avg * Math.abs(b.q) + num(f.px) * Math.abs(q)) / Math.max(1e-12, Math.abs(nq));
          else if (nq !== 0 && (nq > 0) !== (b.q > 0)) b.avg = num(f.px);
          b.q = Math.abs(nq) < 1e-12 ? 0 : nq;
        }
        var U = 0;
        Object.keys(book).forEach(function (c) { var b = book[c]; if (!b.q) return; var cl = (closes[c] || []).filter(function (x) { return x[0] < end; }); var px = cl.length ? cl[cl.length - 1][1] : b.avg; U += b.q * (px - b.avg); });
        var pnlD = (realized[d] || 0) + (fundD[d] || 0) + U - prevU; prevU = U;
        var eq = avAt(pts, d);
        if (eq > 0) daily.push({ t: end, ret: pnlD / eq, dt: DAY });
      });
      rets = rets.filter(function (r) { return r.t < start; }).concat(daily);
      rebuilt = true;
    }
    var idx = indexFrom(rets);
    if (!rebuilt) {
      // the last month has a point a day or more: read the index at each midnight
      var dIdx = idx.filter(function (p) { return p.t > NOW - 31 * DAY; });
      if (dIdx.length > 1) {
        var at = function (t) { for (var j = 1; j < dIdx.length; j++) if (dIdx[j].t >= t) { var a = dIdx[j - 1], b = dIdx[j]; return a.I + (b.I - a.I) * (t - a.t) / (b.t - a.t); } return dIdx[dIdx.length - 1].I; };
        for (var dd = Math.ceil(dIdx[0].t / DAY) * DAY; dd + DAY <= dIdx[dIdx.length - 1].t; dd += DAY) daily.push({ t: dd + DAY, ret: at(dd + DAY) / at(dd) - 1, dt: DAY });
      }
    }
    var R = risk(idx, daily);
    var M = months(idx);

    // the vault, when the address is one
    var V = null;
    if (vault && vault.name) {
      var fl = (vault.followers || []).filter(function (x) { return x.user !== vault.leader; });
      V = { name: vault.name, leader: vault.leader, leaderFraction: num(vault.leaderFraction), commission: num(vault.leaderCommission), apr: num(vault.apr), open: vault.allowDeposits && !vault.isClosed,
        children: vault.relationship && vault.relationship.type === 'parent' ? (vault.relationship.data.childAddresses || []).length : 0,
        followers: fl.length, positive: fl.length ? fl.filter(function (x) { return num(x.allTimePnl) > 0; }).length / fl.length : null,
        medianPnl: median(fl.map(function (x) { return num(x.allTimePnl); })), medianDays: median(fl.map(function (x) { return num(x.daysFollowing); })),
        equity: sum(fl, function (x) { return num(x.vaultEquity); }) };
    }

    return {
      user: user, now: NOW, from: startOfData, nFills: fills.length, capped: fills.length >= 9990, vault: V,
      curve: pts, index: idx, rebuilt: rebuilt, fundingDone: fund.done, fundingFrom: fund.rows.length ? fund.rows[0].time : null, fundingTo: fund.rows.length ? fund.rows[fund.rows.length - 1].time : null,
      costs: { gross: gross, fees: fees, builder: builder, funding: funding, net: net, unreal: unreal, loose: loose },
      maker: { takerShare: tN + mN ? tN / (tN + mN) : null, takerRate: takerRate, makerRate: makerRate, extra: takerExtra },
      stats: stats, byAsset: byAsset, bySide: bySide, byStyle: byStyle, hours: hours, hoursN: hoursN, dows: dows, dowsN: dowsN,
      short: { studied: studied.length, n: short.length, net: sum(short, function (t) { return t.res; }) },
      risk: R, months: M, positions: positions,
      use: { levMedian: median(levs), levMax: levs.length ? Math.max.apply(null, levs) : null, top: topCoin, topShare: totN ? notionalBy[topCoin] / totN : null, inMarket: (NOW - startOfData) > 0 ? inMarket / (NOW - startOfData) : null, liquidations: liquidations }
    };
  }

  window.HLAudit = { run: run, setRecorder: function (r) { recorder = r; } };
})();
