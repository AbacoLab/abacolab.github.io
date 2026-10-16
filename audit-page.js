/* Hyperliquid Account Audit: the page. audit.js reads and counts, this file draws. */
(function () {
  'use strict';

  var $ = function (q, el) { return (el || document).querySelector(q); };
  var form = $('#audit-form'), input = $('#audit-addr'), bar = $('#audit-bar'), step = $('#audit-step'), out = $('#audit-out');
  var DAY = 86400000, running = 0;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function track(name, data) { try { if (window.umami) window.umami.track(name, data); } catch (e) { /* counting is optional */ } }

  /* ---------- formats ---------- */
  function money(x, signed) {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    var a = Math.abs(x), s = x < 0 ? '−' : (signed && x > 0 ? '+' : ''), v;
    if (a >= 1e6) v = (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    else if (a >= 1e4) v = (a / 1e3).toFixed(1) + 'k';
    else v = a.toLocaleString('en-US', { maximumFractionDigits: a >= 100 ? 0 : 2 });
    return s + '$' + v;
  }
  function pct(x, d, signed) {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    var v = x * 100, s = v < 0 ? '−' : (signed && v > 0 ? '+' : '');
    return s + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d }) + '%';
  }
  function ratio(x) { return x === null || x === undefined || !isFinite(x) ? '–' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(2); }
  function dur(ms) {
    if (ms === null || ms === undefined || !isFinite(ms)) return '–';
    var m = ms / 60000;
    if (m < 90) return Math.round(m) + ' min';
    if (m < 48 * 60) return (m / 60).toFixed(1).replace(/\.0$/, '') + ' h';
    var d = m / 1440;
    return d < 100 ? d.toFixed(d < 10 ? 1 : 0).replace(/\.0$/, '') + ' days' : Math.round(d) + ' days';
  }
  function date(t) { var d = new Date(t); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function sign(x) { return x > 0 ? 'up' : x < 0 ? 'down' : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n(x, cls) { return '<span class="v ' + (cls || '') + '">' + x + '</span>'; }
  function kpi(label, value, cls, note) { return '<div class="kpi"><p class="k">' + label + '</p><p class="v ' + (cls || '') + '">' + value + '</p>' + (note ? '<p class="note">' + note + '</p>' : '') + '</div>'; }
  function src(text) { return '<p class="src">' + text + '</p>'; }
  var EST = '<span class="est" title="Our estimate, not a figure Hyperliquid reports">estimate</span>';

  // five steps each side, by size against the largest in view
  function step5(x, max) { if (!x || !max) return 0; return Math.max(1, Math.min(5, Math.ceil(5 * Math.abs(x) / max))); }
  function cellClass(x, s) { return x > 0 ? 'u' + s : x < 0 ? 'd' + s : 'z'; }
  function monthStep(r) { var a = Math.abs(r) * 100; return a < 2 ? 1 : a < 5 ? 2 : a < 10 ? 3 : a < 20 ? 4 : 5; }

  /* ---------- charts ---------- */
  function lineChart(series, opts) {
    // series: [{pts:[[t,v]], cls}], all on one scale
    var W = 1000, H = opts.h || 240, xs = [], ys = [];
    series.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    if (xs.length < 2) return '';
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (opts.zeroTop) y1 = Math.max(0, y1);
    if (y1 === y0) { y1 += 1; y0 -= 1; }
    var X = function (t) { return (t - x0) / (x1 - x0) * W; }, Y = function (v) { return H - 4 - (v - y0) / (y1 - y0) * (H - 8); };
    var paths = series.map(function (s) {
      var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('');
      return '<path class="' + s.cls + '" d="' + d + '"/>';
    }).join('');
    var base = opts.base !== undefined && opts.base >= y0 && opts.base <= y1 ? '<path class="s-line" d="M0 ' + Y(opts.base).toFixed(1) + 'H' + W + '"/>' : '';
    var ticks = '', yr0 = new Date(x0).getUTCFullYear(), yr1 = new Date(x1).getUTCFullYear(), span = x1 - x0;
    if (span > 400 * DAY) for (var y = yr0 + 1; y <= yr1; y++) { var t = Date.UTC(y, 0, 1); ticks += '<span style="left:' + (X(t) / W * 100).toFixed(2) + '%">' + y + '</span>'; }
    else for (var m = new Date(Date.UTC(yr0, new Date(x0).getUTCMonth() + 1, 1)).getTime(); m < x1; m = Date.UTC(new Date(m).getUTCFullYear(), new Date(m).getUTCMonth() + 1, 1)) ticks += '<span style="left:' + (X(m) / W * 100).toFixed(2) + '%">' + MONTHS[new Date(m).getUTCMonth()] + '</span>';
    return '<figure class="chart"><div class="plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(opts.label) + '">' + base + paths + '</svg>' +
      '<p class="ylab top">' + opts.fmt(y1) + '</p><p class="ylab bot">' + opts.fmt(y0) + '</p></div><div class="xticks">' + ticks + '</div></figure>';
  }

  /* ---------- the report ---------- */
  function render(a) {
    var c = a.costs, s = a.stats, R = a.risk || {}, U = a.use, M = a.maker, h = [];
    var firstT = a.index.length ? a.index[0].t : (a.curve.length ? a.curve[0].t : a.from);
    var deep = a.mode === 'deep';

    // the period
    h.push('<p class="period">' + (a.nFills ? 'Trades and costs: ' + (a.capped ? 'the latest ' : '') + a.nFills.toLocaleString('en-US') + ' fills, from ' + date(a.from) + ' to today. ' : 'No fills on record. ') +
      'Curve, drawdowns and months: the account since ' + date(firstT) + ', net of deposits and withdrawals.' + (deep ? '' : ' <span class="refine">Refining…</span>') + '</p>');

    // headline
    h.push('<div class="kpis">' +
      kpi('Net from trades', money(c.net, true), sign(c.net), 'Closed trades, after fees and funding') +
      kpi('Paid in fees', money(c.fees), '', c.gross > 0 ? pct(c.fees / c.gross, 0) + ' of the gross' : '') +
      kpi('Return since ' + new Date(firstT).getUTCFullYear(), R.total !== undefined ? pct(R.total, 0, true) : '–', sign(R.total), 'Net of deposits') +
      kpi('Deepest drawdown', pct(R.maxDD, 1), R.maxDD < 0 ? 'down' : '', R.maxDDAt ? date(R.maxDDAt) : '') + '</div>');

    // curve and drawdown
    if (a.index.length > 2) {
      var peak = -Infinity, dd = a.index.map(function (p) { peak = Math.max(peak, p.I); return [p.t, p.I / peak - 1]; });
      var logS = Math.max.apply(null, a.index.map(function (p) { return p.I; })) / Math.min.apply(null, a.index.map(function (p) { return p.I; })) > 8;
      h.push(sec('curve', 'Growth of $1', (logS ? 'Log scale. ' : '') + 'Each step is the account’s return on what it held, deposits and withdrawals taken out.',
        lineChart([{ pts: a.index.map(function (p) { return [p.t, logS ? Math.log(p.I) : p.I]; }), cls: 's-fg' }], { label: 'Growth of one dollar', h: 220, base: logS ? 0 : 1, fmt: function (v) { return '$' + (logS ? Math.exp(v) : v).toFixed((logS ? Math.exp(v) : v) < 10 ? 2 : 0); } }) +
        lineChart([{ pts: dd, cls: 's-down' }], { label: 'Drawdown from the previous high', h: 90, zeroTop: true, base: 0, fmt: function (v) { return pct(v, 0); } }) +
        src('Source: Hyperliquid portfolio history · returns ' + (a.rebuilt ? 'daily over the fills, rebuilt from trades, funding and daily closes; before them ' : '') + 'between Hyperliquid’s own points ' + EST)));
    }

    // costs
    if (a.nFills) {
      var rows = [['Gross from closed trades', c.gross], ['Fees', -c.fees], ['Funding', c.funding], ['Net', c.net]];
      var mx = Math.max.apply(null, rows.map(function (r) { return Math.abs(r[1]); })) || 1;
      h.push(sec('costs', 'Where the money went', 'From the first fill in view to today.',
        '<div class="fall">' + rows.map(function (r, i) {
          return '<div class="row' + (i === 3 ? ' tot' : '') + '"><span class="k">' + r[0] + '</span><span class="track"><i class="' + (r[1] >= 0 ? 'bu' : 'bd') + '" style="width:' + (Math.abs(r[1]) / mx * 100).toFixed(1) + '%"></i></span>' + n(money(r[1], true), sign(r[1])) + '</div>';
        }).join('') + '</div>' +
        '<p class="aside">' + (c.builder > 0 ? 'Of the fees, ' + money(c.builder) + ' went to front-ends as builder fees. ' : '') +
        (Math.abs(c.unreal) > 0 ? 'Open positions now carry ' + n(money(c.unreal, true), sign(c.unreal)) + ' not yet realised, left out of the net. ' : '') +
        (a.fundingDone ? '' : 'Funding before ' + date(a.fundingFrom || a.from) + ' is still loading.') + '</p>' +
        src('Source: Hyperliquid fills and funding payments')));

      // maker and taker
      if (M.takerShare !== null) {
        h.push(sec('maker', 'Maker or taker', 'Taker fills cross the spread and pay the higher fee; maker fills rest on the book.',
          '<div class="kpis three">' + kpi('Volume taken', pct(M.takerShare, 0)) +
          kpi('Taker fee paid', M.takerRate !== null ? (M.takerRate * 1e4).toFixed(2) + ' bp' : '–', '', M.makerRate !== null ? 'maker ' + (M.makerRate * 1e4).toFixed(2) + ' bp' : 'no maker fills') +
          kpi('Taker volume at the maker rate', M.extra !== null ? money(-M.extra, true) : '–', M.extra > 0 ? 'down' : '', 'what the gap cost ' + EST) + '</div>' +
          src('Source: Hyperliquid fills, the account’s own fee rates · the spread crossed is not counted')));
      }

      // too short to pay
      if (a.short.studied) {
        var sh = a.short;
        h.push(sec('short', 'Shorter than the costs', 'On each asset we measured how long the typical move takes to pay two taker round trips.',
          '<div class="kpis three">' + kpi('Trades shorter than that', sh.n + ' of ' + sh.studied, '', pct(sh.n / sh.studied, 0)) +
          kpi('Their net', money(sh.net, true), sign(sh.net)) + '</div>' +
          src('Source: Hyperliquid fills · thresholds from <a href="test/timeframe-cost.html">our timeframe study</a>, 55 perps')));
      }

      // trades
      if (s.n) {
        h.push(sec('trades', 'Trades', 'A trade runs from flat to flat on one asset; a flip closes one and opens the next.',
          '<div class="kpis">' + kpi('Closed trades', s.n.toLocaleString('en-US')) + kpi('Won', pct(s.winRate, 0)) +
          kpi('Profit factor', ratio(s.profitFactor), '', 'won ÷ lost') + kpi('Win ÷ loss size', ratio(s.payoff)) +
          kpi('Per trade', money(s.expectancy, true), sign(s.expectancy)) + kpi('Longest losing run', s.losingStreak + ' trades') +
          kpi('Median hold, winners', dur(s.holdWin)) + kpi('Median hold, losers', dur(s.holdLoss)) + '</div>' +
          table('By asset', ['Asset', 'Trades', 'Won', 'Costs', 'Net'], a.byAsset.slice(0, 12).map(function (g) { return grow(g); })) +
          (a.byAsset.length > 12 ? '<p class="aside">' + (a.byAsset.length - 12) + ' more assets, ' + n(money(a.byAsset.slice(12).reduce(function (x, g) { return x + g.net; }, 0), true)) + ' together.</p>' : '') +
          '<div class="two">' + table('Long and short', ['Side', 'Trades', 'Won', 'Costs', 'Net'], a.bySide.map(function (g) { return grow(g); })) +
          table('By holding time', ['Hold', 'Trades', 'Won', 'Costs', 'Net'], ['intraday', 'swing', 'hold'].map(function (k) { return a.byStyle.filter(function (g) { return g.k === k; })[0]; }).filter(Boolean).map(function (g) { return grow(g, { intraday: 'under a day', swing: '1–7 days', hold: 'over a week' }[g.k]); })) + '</div>' +
          src('Source: Hyperliquid fills and funding · costs are fees less funding received')));

        // hours and days
        var hm = Math.max.apply(null, a.hours.map(Math.abs)), dm = Math.max.apply(null, a.dows.map(Math.abs));
        h.push(sec('when', 'When trades closed', 'Net by the hour and the day the trade closed, UTC.',
          '<div class="heat hours">' + a.hours.map(function (v, i) { return '<div class="cell ' + cellClass(v, step5(v, hm)) + '" title="' + i + ':00 UTC · ' + a.hoursN[i] + ' trades · ' + money(v, true) + '"><span>' + i + '</span></div>'; }).join('') + '</div>' +
          '<div class="heat dows">' + a.dows.map(function (v, i) { return '<div class="cell ' + cellClass(v, step5(v, dm)) + '" title="' + DOWS[i] + ' · ' + a.dowsN[i] + ' trades · ' + money(v, true) + '"><span>' + DOWS[i] + '</span></div>'; }).join('') + '</div>' +
          legend() + src('Source: Hyperliquid fills')));
      }
    }

    // risk
    if (R.maxDD !== undefined) {
      h.push(sec('risk', 'Risk on the way', 'Measured on the curve above, deposits and withdrawals taken out.',
        '<div class="kpis">' + kpi('Deepest drawdown', pct(R.maxDD), 'down') + kpi('Average drawdown', pct(R.avgDD), R.avgDD < 0 ? 'down' : '') +
        kpi('Ulcer index', R.ulcer !== null ? R.ulcer.toFixed(1) : '–', '', 'depth and length of drawdowns') +
        kpi('Longest under water', dur(R.longest)) + kpi('Under water now', R.current > 0 ? dur(R.current) : 'at a high') +
        kpi('Yearly growth', R.cagr !== null ? pct(R.cagr, 0, true) : '–', sign(R.cagr), R.cagr === null ? 'under a month of history' : 'CAGR') +
        kpi('Sortino', ratio(R.sortino), '', R.sortino !== null ? 'on ' + R.days + ' daily returns' : 'needs 20 days, 5 of them down') + kpi('Sharpe', ratio(R.sharpe)) +
        kpi('Calmar', ratio(R.calmar), '', 'growth ÷ deepest drawdown') + kpi('Worst day', pct(R.worstDay), R.worstDay < 0 ? 'down' : '') + '</div>' +
        src('Source: Hyperliquid portfolio history' + (a.rebuilt ? ' and daily closes' : '') + ' · ' + (a.rebuilt ? 'daily returns over the fills' : 'daily returns over the last month') + ' ' + EST)));
    }

    // months
    if (a.months.length) {
      var years = {}; a.months.forEach(function (m) { (years[m.y] = years[m.y] || {})[m.m] = m; });
      var ys = Object.keys(years).sort();
      var grid = ys.map(function (y) {
        var tot = 1; Object.keys(years[y]).forEach(function (k) { tot *= 1 + years[y][k].r; });
        return '<div class="yr">' + y + '</div>' + MONTHS.map(function (_, i) {
          var m = years[y][i];
          if (!m) return '<div class="cell z empty"></div>';
          return '<div class="cell ' + cellClass(m.r, monthStep(m.r)) + (m.partial ? ' part' : '') + '" title="' + MONTHS[i] + ' ' + y + ' · ' + pct(m.r, 1, true) + (m.partial ? ' · part of the month' : '') + '"><span>' + Math.round(m.r * 100) + '</span></div>';
        }).join('') + '<div class="yt ' + sign(tot - 1) + '">' + pct(tot - 1, 0, true) + '</div>';
      }).join('');
      h.push(sec('months', 'Month by month', 'Return of each calendar month, in %. Steps at 2, 5, 10 and 20%; a dotted edge is a part month.',
        '<div class="heat months"><div></div>' + MONTHS.map(function (m) { return '<div class="mh">' + m.charAt(0) + '<span>' + m.slice(1) + '</span></div>'; }).join('') + '<div class="mh">year</div>' + grid + '</div>' +
        src('Source: Hyperliquid portfolio history · month ends read between its points ' + EST)));
    }

    // use of risk
    if (a.nFills) {
      h.push(sec('use', 'How the account was used', 'Exposure is the size of all open positions against the account value, at each fill.',
        '<div class="kpis">' + kpi('Median exposure', U.levMedian !== null ? U.levMedian.toFixed(1) + '×' : '–') + kpi('Highest exposure', U.levMax !== null ? U.levMax.toFixed(1) + '×' : '–', '', EST) +
        kpi('Most traded', U.top ? esc(U.top) : '–', '', U.topShare !== null ? pct(U.topShare, 0) + ' of the volume' : '') +
        kpi('Time with a position', pct(U.inMarket, 0)) + kpi('Liquidations', String(U.liquidations), U.liquidations ? 'down' : '') + '</div>' +
        (a.positions.length ? table('Open now', ['Asset', 'Side', 'Size', 'Leverage', 'Unrealised'], a.positions.map(function (p) { return [esc(p.coin), p.szi > 0 ? 'long' : 'short', money(Math.abs(p.value)), p.lev ? p.lev + '×' : '–', n(money(p.upnl, true), sign(p.upnl))]; })) : '') +
        src('Source: Hyperliquid fills and account state')));
    }

    // vault
    if (a.vault) {
      var V = a.vault;
      h.push(sec('vault', 'The vault: ' + esc(V.name), 'What the leader keeps and how depositors did.',
        '<div class="kpis">' + kpi('Leader’s share', pct(V.leaderFraction, 0)) + kpi('Leader’s cut of profits', pct(V.commission, 0)) +
        kpi('Open to deposits', V.open ? 'yes' : 'no') + kpi('Depositors in view', String(V.followers), '', 'the largest 100 at most') +
        kpi('Depositors in profit', pct(V.positive, 0)) + kpi('Their median result', money(V.medianPnl, true), sign(V.medianPnl)) +
        kpi('Median time inside', V.medianDays !== null ? Math.round(V.medianDays) + ' days' : '–') + kpi('Their equity', money(V.equity)) + '</div>' +
        (V.children ? '<p class="aside">The vault trades through ' + V.children + ' sub-accounts; trades and costs above are the parent’s own.</p>' : '') +
        src('Source: Hyperliquid vault details')));
    }

    h.push(hook(a));
    out.innerHTML = h.join('');
    out.hidden = false;
  }

  function sec(id, title, lede, body) { return '<section class="ares" id="r-' + id + '" aria-labelledby="r-' + id + '-h"><h2 id="r-' + id + '-h">' + title + '</h2><p class="say">' + lede + '</p>' + body + '</section>'; }
  function grow(g, label) { return [esc(label || g.k), String(g.n), pct(g.wins / g.n, 0), n(money(-g.costs, true), sign(-g.costs)), n(money(g.net, true), sign(g.net))]; }
  function table(cap, head, rows) {
    return '<div class="tw"><table><caption>' + cap + '</caption><thead><tr>' + head.map(function (x, i) { return '<th' + (i ? ' class="r"' : '') + '>' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (x, i) { return '<td' + (i ? ' class="r"' : '') + '>' + x + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function legend() { return '<div class="legend"><span>loss</span>' + [5, 4, 3, 2, 1].map(function (i) { return '<i class="d' + i + '"></i>'; }).join('') + [1, 2, 3, 4, 5].map(function (i) { return '<i class="u' + i + '"></i>'; }).join('') + '<span>gain</span></div>'; }

  // one sentence from the result, then the way on
  function hook(a) {
    var c = a.costs, M = a.maker, line, cta;
    var big = Math.max(1, Math.abs(c.gross));
    if (M.extra !== null && M.extra > 0.15 * big) {
      line = 'Taking liquidity cost this account about ' + money(M.extra) + ' more than resting orders would have, on the same volume.';
      cta = '<a class="btn" href="phisys.html" data-cta="phisys">How Phisys tests rules with costs in</a>';
    } else if (a.short.studied >= 10 && a.short.n / a.short.studied > 0.3) {
      line = a.short.n + ' of ' + a.short.studied + ' trades closed before the typical move covers two round trips.';
      cta = '<a class="btn" href="test/timeframe-cost.html" data-cta="study">Read the study</a>';
    } else if (c.gross > 0 && c.fees > 0.3 * c.gross) {
      line = 'Fees took ' + pct(c.fees / c.gross, 0) + ' of what the trades made.';
      cta = '<a class="btn" href="phisys.html" data-cta="phisys">How Phisys tests rules with costs in</a>';
    } else {
      line = 'Every month we measure one cost or habit like these, on real data.';
      cta = '<a class="btn" href="studies.html" data-cta="studies">See the studies</a>';
    }
    return '<section class="ares hook" aria-labelledby="r-hook-h"><h2 id="r-hook-h" class="say big">' + line + '</h2>' +
      '<p class="say">One study a month by email: what a cost or a habit does to results, measured. Free.</p>' +
      '<form class="sub" data-mock="hook-status" novalidate><label class="sr" for="hook-email">Email</label><input id="hook-email" type="email" placeholder="you@example.com" autocomplete="email"><button class="btn fill" type="submit" data-cta="newsletter">Send it</button></form>' +
      '<p class="status" id="hook-status" aria-live="polite"></p>' +
      '<div class="acts">' + cta + '<a class="btn ghost" data-cta="share" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + encodeURIComponent('Hyperliquid Account Audit: fees, funding, maker or taker, drawdowns, month by month. Free, in the browser, by @AbacoLab') + '&url=' + encodeURIComponent('https://abaco.phisys.app/hyperliquid-audit.html') + '">Share on X</a></div></section>';
  }

  /* ---------- running ---------- */
  function progress(p, text) { bar.style.width = Math.max(2, Math.min(100, p)) + '%'; bar.parentNode.hidden = p >= 100; if (text) step.textContent = text; }

  async function go(addr) {
    var my = ++running;
    out.hidden = true; out.innerHTML = '';
    progress(2, 'Starting');
    track('audit_run');
    try {
      var r = await window.HLAudit.run(addr, function (x) { if (my === running) progress(x.pct, x.step); });
      if (my !== running) return;
      if (!r.audit.nFills && r.audit.index.length < 2) { progress(100); step.textContent = 'Hyperliquid has no trades or history for this address.'; return; }
      render(r.audit);
      progress(60, 'First read done. Refining with the rest of the funding and daily closes…');
      var b = await r.more(function (p) { if (my === running) progress(60 + p * 0.4, 'Refining: ' + Math.round(p) + '%'); });
      if (my !== running) return;
      render(b);
      progress(100); step.textContent = 'Done. Read from Hyperliquid at ' + new Date().toUTCString().slice(17, 22) + ' UTC.';
    } catch (e) {
      if (my !== running) return;
      progress(100); step.textContent = 'Hyperliquid did not answer as expected (' + (e && e.message ? e.message : 'error') + '). Try again in a minute.';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(v)) { step.textContent = 'An address is 0x followed by 40 letters and digits.'; input.focus(); return; }
    try { history.replaceState(null, '', '?address=' + v.toLowerCase()); } catch (err) { /* not essential */ }
    go(v.toLowerCase());
  });

  out.addEventListener('click', function (e) { var t = e.target.closest('[data-cta]'); if (t && t.tagName === 'A') track('audit_cta', { to: t.getAttribute('data-cta') }); });
  // the newsletter form inside the report arrives after site.js has wired the others
  // the newsletter form inside the report arrives after site.js has wired the others
  out.addEventListener('submit', function (e) {
    var f = e.target; if (!f.matches('form[data-mock]')) return;
    e.preventDefault();
    if (window.abacoSubscribe) window.abacoSubscribe(f.querySelector('input[type=email]'), document.getElementById(f.getAttribute('data-mock')), 'audit');
  });

  var q = new URLSearchParams(location.search).get('address');
  if (q && /^0x[0-9a-fA-F]{40}$/.test(q)) { input.value = q; go(q.toLowerCase()); }
})();
