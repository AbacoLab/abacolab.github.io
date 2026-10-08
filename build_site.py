"""Build the Abaco site: one shared frame (head, header with the chain as navigation, footer) and the
pages. Static HTML, no generator to maintain: run it, commit, push.

    python3 build_site.py        writes index.html, phisys.html, data.html, test.html, ai.html, notes.html, pricing.html, scripts.html
    python3 make_demo_images.py  writes img/*.png, the demo pictures the pages use

The study pages (test/*.html) are written by their own scripts and only linked from here.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://abacolab.github.io"
BIO = ("In 1202 Fibonacci's <em>Liber Abaci</em> taught merchants to count before they traded. "
       "We still do. Abaco is written by an algo trader, for algo traders.")
NAV = [("phisys", "phisys.html"), ("data", "data.html"), ("test", "test.html"), ("ai", "ai.html"), ("notes", "notes.html"), ("pricing", "pricing.html")]
CONTACT = "ciao.abaco@gmail.com"

CSS = """
  :root { --bg: #1b1d22; --fg: #ece8df; --muted: #a8abb2; --dim: #8d9099; --cu: #e07c4e; --line: #33363e; --card: #22252b; color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--fg); }
  body { font-family: Jost, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 18px; line-height: 1.55; }
  .wrap { max-width: 1120px; margin: 0 auto; padding-inline: 24px; }
  header { padding-block: 26px 18px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
  header img { height: 34px; width: auto; display: block; }
  nav { display: flex; gap: 0; align-items: baseline; font-size: 17px; letter-spacing: 0.02em; flex-wrap: wrap; }
  nav a { color: var(--muted); text-decoration: none; padding: 4px 2px; }
  nav a:hover, nav a:focus-visible { color: var(--fg); }
  nav a[aria-current] { color: var(--cu); }
  nav .dot { color: var(--dim); padding: 0 9px; }
  .kicker { color: var(--cu); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; }
  h1 { font-weight: 500; font-size: clamp(36px, 6vw, 64px); line-height: 1.02; margin: 8px 0 18px; letter-spacing: -0.01em; text-wrap: balance; }
  h2 { font-weight: 500; font-size: clamp(24px, 3vw, 32px); margin: 0 0 12px; text-wrap: balance; }
  h3 { font-weight: 500; font-size: 20px; margin: 0 0 6px; }
  p { max-width: 62ch; margin: 0 0 14px; }
  a { color: var(--fg); }
  .lede { font-size: clamp(19px, 2vw, 23px); color: var(--muted); max-width: 56ch; }
  .page { padding-block: 36px 24px; }
  section { border-top: 1px solid var(--line); padding-block: 40px 28px; }
  section.flush { border-top: 0; padding-top: 8px; }
  .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 40px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
  @media (max-width: 860px) { .grid4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .grid2, .grid4 { grid-template-columns: 1fr; } }
  .verb { border-top: 2px solid var(--line); padding-top: 12px; }
  .verb .kicker { display: block; margin-bottom: 4px; }
  .verb p { color: var(--muted); font-size: 16.5px; margin-bottom: 8px; }
  .verb a { color: var(--fg); text-decoration: none; border-bottom: 1px solid var(--line); }
  .verb a:hover { border-color: var(--cu); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 20px 22px; min-width: 0; }
  .card p { font-size: 16.5px; color: var(--muted); }
  .card p:last-child { margin-bottom: 0; }
  .card.cu { border-color: var(--cu); }
  .tag { display: inline-block; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px; margin-left: 8px; vertical-align: middle; }
  .tag.live { color: var(--cu); border-color: var(--cu); }
  ul.plain { list-style: none; padding: 0; margin: 0 0 14px; max-width: 62ch; }
  ul.plain li { padding: 8px 0; border-top: 1px solid var(--line); color: var(--muted); font-size: 16.5px; }
  ul.plain li b { color: var(--fg); font-weight: 500; }
  ul.plain li:first-child { border-top: 0; }
  .tbl { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; margin: 16px 0 20px; max-width: 760px; }
  table { border-collapse: collapse; width: 100%; min-width: 520px; font-size: 15.5px; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 9px 12px; border-top: 1px solid var(--line); vertical-align: top; }
  thead th { border-top: 0; color: var(--dim); font-weight: 400; font-size: 13px; letter-spacing: .05em; text-transform: uppercase; background: var(--card); }
  td.n { text-align: right; white-space: nowrap; }
  .note { color: var(--dim); font-size: 15px; }
  .feature { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 32px; align-items: center; }
  .feature img { width: 100%; height: auto; display: block; border-radius: 6px; }
  @media (max-width: 760px) { .feature { grid-template-columns: 1fr; } }
  .hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 40px; align-items: center; padding-block: 40px 48px; }
  .hero h1 { font-size: clamp(48px, 7.5vw, 96px); line-height: 1; margin: 0; }
  .hero h1 span { display: block; width: max-content; }
  .hero h1 .cu { color: var(--cu); }
  .hero h1 .second { font-size: 1.104em; }
  .hero .chain { margin: 22px 0 0; color: var(--muted); font-size: clamp(18px, 2vw, 22px); letter-spacing: 0.02em; }
  .hero .chart { width: 100%; height: auto; display: block; }
  @media (max-width: 760px) { .hero { grid-template-columns: 1fr; padding-block: 24px 40px; gap: 32px; } }
  .motto { color: var(--muted); font-style: italic; }
  .shot { width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid var(--line); }
  .why { border-left: 3px solid var(--cu); padding: 6px 0 6px 22px; max-width: 70ch; }
  .why h2 { margin-bottom: 8px; }
  .why p { color: var(--muted); }
  .quote { font-size: clamp(22px, 2.6vw, 30px); line-height: 1.3; max-width: 30ch; margin: 0 0 10px; text-wrap: balance; }
  .quote .cu { color: var(--cu); }
  .feature.rev { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); }
  @media (max-width: 760px) { .feature.rev { grid-template-columns: 1fr; } }
  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; counter-reset: s; }
  @media (max-width: 760px) { .steps { grid-template-columns: 1fr; } }
  .step { border-top: 2px solid var(--line); padding-top: 12px; min-width: 0; }
  .step::before { counter-increment: s; content: counter(s); display: block; color: var(--cu); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 15px; margin-bottom: 4px; }
  .step p { color: var(--muted); font-size: 16.5px; }
  .tiers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 760px) { .tiers { grid-template-columns: 1fr; } }
  .tier { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 22px 22px 18px; display: grid; gap: 10px; align-content: start; min-width: 0; }
  .tier.cu { border-color: var(--cu); }
  .tier .price { font-size: 38px; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; }
  .tier .price small { font-size: 15px; color: var(--dim); font-weight: 400; margin-left: 4px; }
  .tier ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 16px; }
  .tier li { margin-bottom: 5px; }
  .tier .who { color: var(--dim); font-size: 14px; }
  .cta { display: inline-block; margin-top: 6px; color: var(--fg); text-decoration: none; border: 1px solid var(--cu); border-radius: 6px; padding: 9px 16px; }
  .cta:hover { background: var(--cu); color: var(--bg); }
  .cta.ghost { border-color: var(--line); }
  footer { border-top: 1px solid var(--line); margin-top: 24px; padding-block: 24px 40px; color: var(--dim); font-size: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px 32px; }
  footer a { color: var(--muted); text-decoration: none; }
  footer a:hover { color: var(--fg); }
  footer b { display: block; color: var(--muted); font-weight: 500; letter-spacing: .06em; text-transform: uppercase; font-size: 12px; margin-bottom: 4px; }
"""


def frame(path, title, desc, body, current=None, og_image="og.png"):
    nav = []
    for name, href in NAV:
        cur = ' aria-current="page"' if name == current else ""
        nav.append(f'<a href="{href}"{cur}>{name}</a>')
    nav_html = '<span class="dot">·</span>'.join(nav)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{BASE}/{og_image}">
<meta property="og:url" content="{BASE}/{path}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@AbacoLab">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="abaco-mark-small.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400&display=swap">
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
  <header><a href="index.html"><img src="abaco-lockup-light.svg" alt="abaco"></a><nav>{nav_html}</nav></header>
{body}
  <footer>
    <div><b>Abaco</b>© 2026 · Nothing on this site is investment advice. We publish measurements and tools; we do not give signals or manage money.</div>
    <div><b>Elsewhere</b><a href="https://x.com/AbacoLab">X</a> · <a href="https://www.tradingview.com/u/AbacoLab/">TradingView</a> · <a href="https://github.com/AbacoLab">GitHub</a> · <a href="scripts.html">Scripts and custom work</a></div>
    <div><b>Write</b><span>{CONTACT}</span></div>
  </footer>
</div>
</body>
</html>
"""


PAGES = {}

PAGES["index.html"] = ("Abaco · Count twice, trade once",
                       "Phisys, by Abaco: a strategy tester for perpetuals that does the test right, then runs the rule on a machine of yours in the cloud. Written by an algo trader, for algo traders.", None, f"""
  <section class="hero flush">
    <div>
      <h1><span class="cu">Count twice</span><span class="second">trade once</span></h1>
      <p class="chain">data · rules · test · trade</p>
    </div>
    <img class="chart" src="fili-volume.svg" alt="One wire per bar; the beads gather around the price, sized by the volume traded there.">
  </section>

  <section>
    <p class="quote">Phisys tests a trading rule <span class="cu">the way it should be tested</span>, then runs it on a machine of yours. You pilot the machine; you do not follow the chart.</p>
    <p class="lede">Chosen on the past, judged on what came after, with the real costs of the venue you trade on. Written by an algo trader, for algo traders: the test we run on our own rules, in a page you open and use.</p>
    <a class="cta" href="phisys.html">See Phisys</a> <a class="cta ghost" href="pricing.html">Pricing</a>
  </section>

  <section class="flush">
    <img class="shot" src="img/lab-interface.png" alt="Phisys in the browser: the rule on the chart, the signals, the out-of-sample report beside it.">
  </section>

  <section>
    <div class="grid2">
      <div class="verb"><span class="kicker">data</span><h3>Four venues, one 5-minute grid</h3><p>Binance, Bybit, Dukascopy and Hyperliquid since 2017, aligned and checked. Every test is resolved on the 5-minute path, because the outcome of a trade is decided inside the bar.</p><a href="data.html">The data →</a></div>
      <div class="verb"><span class="kicker">rules</span><h3>Yours, written with you</h3><p>Describe the rule in words; the assistant drafts it from Phisys's indicators; the test judges it. Or start from ours, each with its walk-forward.</p><a href="ai.html">The assistant →</a></div>
      <div class="verb"><span class="kicker">test</span><h3>Out of sample, with real costs</h3><p>Walk-forward, the venue's costs, every setting on one map, four tests per asset. Never an average.</p><a href="test.html">The test →</a></div>
      <div class="verb"><span class="kicker">trade</span><h3>From your machine, with your keys</h3><p>When a rule holds, the same machine runs it: Hyperliquid, Binance, Bybit. Keys are born on your machine and never touch ours.</p><a href="phisys.html#execution">The execution →</a></div>
    </div>
  </section>

  <section>
    <div class="feature">
      <div>
        <span class="kicker">latest note</span>
        <h2>How much a timeframe costs</h2>
        <p>At 5 minutes the typical bar does not pay the round trip, on any of 55 Hyperliquid crypto perps. The trade must last about half an hour, whatever the entry. Measured, asset by asset.</p>
        <a class="cta ghost" href="test/timeframe-cost.html">Read the study</a>
      </div>
      <a href="test/timeframe-cost.html"><img src="test/img/1-minutes.png" alt="Minutes a trade must last to be worth two round trips, 55 crypto perps."></a>
    </div>
  </section>

  <section>
    <p class="lede">{BIO}</p>
    <p class="motto">Out of sample, or it doesn't count.</p>
  </section>
""")

PAGES["phisys.html"] = ("Phisys · Abaco",
                     "A strategy tester for perpetuals that does the test right, on a machine of yours in the cloud created in one click. Nothing to install; your keys stay on your machine.", "phisys", """
  <div class="page">
    <span class="kicker">the product · by abaco</span>
    <h1>Phisys <span class="tag">in preparation</span></h1>
    <p class="lede">Testing a rule properly is slow, fussy work that almost nobody does on perpetuals: the tester on your chart has no walk-forward, the open-source bots optimise on the whole history, the serious tools cost a thousand dollars and stop at futures. Phisys is the test we run on our own rules, made usable from a page in your browser.</p>
  </div>

  <section class="flush">
    <img class="shot" src="img/lab-interface.png" alt="Phisys in the browser: the rule on the chart, the signals where they were known, the out-of-sample report beside it.">
  </section>

  <section>
    <h2>How it works</h2>
    <div class="steps">
      <div class="step"><h3>Open the page</h3><p>Phisys has its own address, separate from this site: you sign in, and from there you create your server or open it. Any browser, any computer; nothing to download, nothing to update.</p></div>
      <div class="step"><h3>Get your machine</h3><p>One click creates a small server of yours in the cloud with the engine already inside. We set it up, then remove our own access. Prefer your own provider? Paste a token and it is built on your account instead.</p></div>
      <div class="step"><h3>Test, then trade</h3><p>Pick a venue, an asset, a rule. Your machine reads the data it needs from our server, runs the test, shows the report. When a rule holds, the same machine runs it, with your keys.</p></div>
    </div>
    <img class="shot" src="img/lab-machine.png" alt="Your browser talks to your machine; your machine reads data slices from our server and trades on the venues with your keys." style="margin-top:24px">
  </section>

  <section>
    <h2>What is inside</h2>
    <div class="grid2">
      <div class="verb"><span class="kicker">data</span><h3>Four venues, one 5-minute grid</h3><p>Binance since 2017, Bybit since 2020, Hyperliquid since 2023, and the cash history of stocks, gold and oil since 2017 for the new TradFi perps. Open interest, taker flow, funding and impact spread where the venue gives them. Your machine reads only the slices a test needs.</p><a href="data.html">The data →</a></div>
      <div class="verb"><span class="kicker">rules</span><h3>Yours, and the Book</h3><p>Yours are built in the page from Phisys's indicators: by hand, or by describing them to the assistant. The Book is ours: every strategy that passed the test, with its walk-forward published and the list of assets where it held, updated as new ones pass or old ones stop.</p><a href="ai.html">The assistant →</a></div>
      <div class="verb"><span class="kicker">test</span><h3>The test done right</h3><p>Settings chosen inside a window and scored on the next one. The real costs of the venue. Every combination of the inputs on one map. Four tests per asset. Stop in ATR, partial targets, breakeven and fixed-risk sizing on a grid.</p><a href="test.html">The test →</a></div>
      <div class="verb"><span class="kicker">trade</span><h3>From your machine</h3><p>Hyperliquid through an agent key that can trade and cannot withdraw; Binance and Bybit through trade-only API keys bound to your machine. Round the clock: you pilot the machine, you do not follow the chart.</p><a href="#execution">The execution ↓</a></div>
    </div>
  </section>

  <section id="execution">
    <h2>Your keys, your machine</h2>
    <div class="grid2">
      <div class="card cu"><h3>Where the keys live</h3><p>On Hyperliquid an agent key is created on your machine and authorised once from your wallet; it can trade, it cannot withdraw, and you revoke it whenever you want. On Binance and Bybit you create trade-only API keys bound to your machine's address and paste them in the page, which hands them to your machine and forgets them. After setup we remove our access; the engine updates itself.</p></div>
      <div class="card"><h3>What we do not do</h3><p>No signals, no alerts sent to you, no bots running with your keys on our servers, no custody, no promise of returns. Every number comes with its walk-forward; nothing comes as a yield. If you want nobody but you to be able to touch the machine, build it on your own provider account.</p></div>
    </div>
  </section>

  <section>
    <h2>Who it is for</h2>
    <div class="grid2">
      <div><h3>The systematic retail trader</h3><p>You trade perps on Hyperliquid, Binance or Bybit, you look at TradingView, and you want to know whether a rule holds before you fund it. You are not a quant; you know what out of sample means.</p></div>
      <div><h3>Whoever trades stocks and gold at leverage, 24/7</h3><p>Hundreds of TradFi perps opened this year on the three venues, with months of history. Phisys tests them on the cash history behind them and trades them on the perp.</p></div>
    </div>
    <p class="note" style="margin-top:12px">Written by an algo trader, for algo traders: Phisys is the engine we built for our own trading, cut down to what a test needs and made usable from a browser.</p>
  </section>

  <section>
    <h2>Price and opening</h2>
    <p>Two levels, Phisys and Phisys with the Book, plus a small machine of yours: see <a href="pricing.html">pricing</a>. A free sandbox on a machine of ours lets you see the test before paying. Phisys opens when its first strategy has a public walk-forward. Until then the studies, the notes and the free indicators are the way in; follow <a href="https://x.com/AbacoLab">@AbacoLab</a> for the date.</p>
  </section>
""")

PAGES["data.html"] = ("Data · Abaco",
                      "Four venues on one 5-minute grid: Binance, Bybit, Dukascopy and Hyperliquid, aligned and checked, inside Phisys. Why 5 minutes: the outcome of a trade is decided inside the bar.", "data", """
  <div class="page">
    <span class="kicker">data</span>
    <h1>Four venues, one 5-minute grid</h1>
    <p class="lede">Everything Phisys tests on, since 2017 and back to 2003 for the cash markets, kept current every week and checked the way our own research needs it. Not sold on its own: it is what your tests run on.</p>
  </div>

  <section class="flush">
    <img class="shot" src="img/data-coverage.png" alt="Coverage timeline: Dukascopy cash since 2003, Coinbase spot 2015, Binance spot 2017, Binance and Bybit perps 2020, Hyperliquid 2023, TradFi perps 2026.">
  </section>

  <section>
    <div class="feature">
      <div class="why">
        <h2>Why 5 minutes</h2>
        <p>Nobody should trade below 15 minutes: <a href="test/timeframe-cost.html">we measured it</a>, the typical 5-minute bar does not pay its own round trip. But a test at 1 hour that only knows the hourly bar cannot say whether the stop or the target was hit first, and that is the whole outcome of a trade.</p>
        <p>So every series lives on one 5-minute grid, and every test at 15 minutes and above is resolved on the 5-minute path: the stop, the partial targets, the breakeven, the trailing, in the order they actually happened. The higher timeframes are built from the same bars, so nothing disagrees with itself.</p>
      </div>
      <img src="img/data-grid.png" alt="One hour seen as one bar and as twelve 5-minute bars: the stop was hit before the target, which the hourly bar cannot say.">
    </div>
  </section>

  <section>
    <h2>What is inside</h2>
    <div class="tbl"><table>
      <thead><tr><th>Venue</th><th>Since</th><th>Series</th></tr></thead>
      <tbody>
        <tr><td>Binance, perps and spot</td><td class="n">2017</td><td>bars with taker flow; open interest since 2020; funding; the TradFi perps since 2026</td></tr>
        <tr><td>Bybit, perps and spot</td><td class="n">2020</td><td>bars; open interest; liquidations; funding; the TradFi perps since 2026</td></tr>
        <tr><td>Dukascopy, cash</td><td class="n">2003 · stocks 2017</td><td>the long history behind the stock, index and commodity perps</td></tr>
        <tr><td>Hyperliquid, perps</td><td class="n">2023</td><td>mark, mid and oracle; open interest; impact spread; taker flow and liquidations by side; funding; HIP-3 included</td></tr>
        <tr><td>Coinbase, spot</td><td class="n">2015</td><td>bars, as a witness for the crypto spot</td></tr>
      </tbody>
    </table></div>
    <p class="note">From the venues' public feeds, aligned and checked by us, updated every week. Inside Phisys your machine reads only the slices a test needs; nothing to download.</p>
  </section>

  <section>
    <h2>How it is checked</h2>
    <ul class="plain">
      <li><b>On the grid.</b> Every timestamp is a multiple of five minutes; a snapshot is never passed off as a closed bar.</li>
      <li><b>Holes are holes.</b> A missing bar is missing, never filled with the last value; the known gaps are listed.</li>
      <li><b>Zero is not missing.</b> A zero volume is a bar nobody traded; an absent value is absent.</li>
      <li><b>Each series against a witness.</b> Prices against a second venue; open interest against the archive; spreads against the order book.</li>
      <li><b>Nothing from the future.</b> Every value is stamped at the bar where it was known.</li>
    </ul>
    <p class="note">The checks are the same ones our own research runs on. The data is a by-product of using it.</p>
  </section>
""")

PAGES["test.html"] = ("Test · Abaco",
                      "How Phisys tests: out of sample, with the venue's real costs, every setting on one map, each asset on its own. The studies we publish.", "test", """
  <div class="page">
    <span class="kicker">test</span>
    <h1>Out of sample, or it doesn't count</h1>
    <p class="lede">A backtest is a story about the past. A test is a choice made on the past and judged on what came after. Phisys only runs the second kind, and we only publish the second kind.</p>
  </div>

  <section class="flush">
    <div class="feature">
      <div>
        <h2>Chosen on the past, judged on what came after</h2>
        <p>Settings are picked inside a window and scored on the next one, window after window. The number Phisys reports is the one from the stretch never looked at. A rule tuned on the whole history has already seen the answer.</p>
      </div>
      <img src="img/test-walkforward.png" alt="The walk-forward: in each fold the settings are chosen on a window and scored on the next; the out-of-sample stretches are what we report.">
    </div>
  </section>

  <section>
    <div class="feature rev">      <img src="img/test-plateau.png" alt="Every combination of two inputs, coloured by the return after costs; the chosen setting sits inside a plateau of profitable neighbours.">
      <div>
        <h2>Every setting, on one map</h2>
        <p>The rule runs on every combination of its inputs, after costs, and the map shows them all. A good setting sits on a plateau: its neighbours make money too. A lone peak among losing cells is a lucky number, and it moves the day the market does.</p>
      </div>
    </div>
  </section>

  <section>
    <div class="feature">
      <div>        <h2>Four tests per asset, never an average</h2>
        <p>The same four every time: positive after costs on the stretch never looked at; most windows positive, not one lucky year; on a plateau, three neighbours in four positive; and choosing beats not choosing, the settings chosen on the past ahead of two thirds of the fixed ones. The rule holds where it passes all four, and the page says which one failed where it does not. No averages across assets: a rule that works on three majors and fails on twelve others is a rule for three majors.</p>
      </div>
      <img src="img/test-evidence.png" alt="A grid of assets by timeframe: each cell holds or no, with the four tests it passed.">
    </div>
  </section>

  <section>
    <h2>And the rest of the test</h2>
    <ul class="plain">
      <li><b>Real costs.</b> Fees, the measured impact spread, funding, slippage on stops, for the venue you will trade on. A rule that only works without them does not work.</li>
      <li><b>Every outcome where it was known.</b> A signal at the close, a stop on the 5-minute bar that hit it, in the order it happened. Nothing from the future.</li>
      <li><b>The management on a grid.</b> Stop in ATR, TP1 and TP2, breakeven, fixed-risk sizing: tried as a grid, with the same walk-forward, so the management is tested like the entry.</li>
      <li><b>The report as a page.</b> Equity, trades, every window in sequence, the map of settings, the four tests, in a page you keep.</li>
    </ul>
  </section>

  <section>
    <h2>Studies</h2>
    <div class="feature">
      <div>
        <h3>How much a timeframe costs <span class="tag live">October 2026</span></h3>
        <p>The typical move of one bar against the cost of one round trip, 55 Hyperliquid crypto perps, four timeframes. At 5 minutes the bar does not pay the trip; the trade must last about half an hour whatever the entry.</p>
        <a class="cta ghost" href="test/timeframe-cost.html">Read</a>
      </div>
      <a href="test/timeframe-cost.html"><img src="test/img/2-counts.png" alt="How many crypto perps pay two round trips per timeframe."></a>
    </div>
    <p class="note" style="margin-top:20px">Next: what a limit order really saves, measured on a live account; the weekend of stocks on Hyperliquid's HIP-3 perps; whether extreme funding predicts anything. All in <a href="notes.html">notes</a>.</p>
  </section>
""")

PAGES["ai.html"] = ("AI · Abaco",
                    "The assistant inside Phisys writes your rule from a description, explains any rule in plain words, and reads the report with you. It never predicts and never trades.", "ai", """
  <div class="page">
    <span class="kicker">ai</span>
    <h1>Your rule, written with you</h1>
    <p class="lede">You know what you want to test; writing it as a rule the engine can run is the part that stops most people. The assistant inside Phisys does that part, from Phisys's own indicators, and then reads the report with you.</p>
  </div>

  <section class="flush">
    <img class="shot" src="img/ai-rule.png" alt="You describe the rule in words, the assistant drafts it from Phisys's indicators, the test judges it per asset.">
  </section>

  <section>
    <h2>What it does</h2>
    <ul class="plain">
      <li><b>Writes the rule.</b> «Buy when price is two sigmas above its 20-bar average, only when volatility is in the lower half; stop 1.5 ATR, half at 2R, the rest at 4R.» The assistant turns that into a rule assembled from Phisys's indicators, with every parameter visible, and sends it to the test.</li>
      <li><b>Explains any rule.</b> Ours or yours: what each piece measures, what it does not, where the parameters bite.</li>
      <li><b>Reads the report.</b> What the evidence means, where the rule held and where it did not, and what to try next: a longer stop, a session filter, another asset. Each suggestion is a new test, never a conclusion.</li>
      <li><b>Says when a piece is missing.</b> It builds only from indicators Phisys has. If your idea needs one it does not have, it says so instead of inventing it.</li>
    </ul>
  </section>

  <section>
    <div class="grid2">
      <div class="card"><h3>Your key, your machine</h3><p>The assistant runs on your server with your own Anthropic API key, kept there like your exchange keys. You pay the model directly, a few cents a rule; we never see the key or the conversation.</p></div>
      <div class="card cu"><h3>What it never does</h3><p>It never predicts a price, never sends a signal, never places an order, and never calls a result good before the test has. The rule is yours, the test is the judge; the assistant is the hand that writes.</p></div>
      <div class="card"><h3>Why it is in Phisys</h3><p>Because the gap between a trader with an idea and a rule the engine can run is exactly where most ideas die, or get tested badly. Closing that gap is what makes the test usable by someone who does not program.</p></div>
    </div>
  </section>
""")

PAGES["notes.html"] = ("Notes · Abaco",
                       "Measurements, costs, and the errors that look like edges. One note a week, one study a month.", "notes", """
  <div class="page">
    <span class="kicker">notes</span>
    <h1>Notes</h1>
    <p class="lede">What we measured this week, what it cost, and the mistakes that looked like edges. Numbers with their population; no advice.</p>
  </div>

  <section>
    <ul class="plain">
      <li><b><a href="test/timeframe-cost.html">How much a timeframe costs</a></b> · October 2026 · At 5 minutes the typical bar does not pay the round trip on any of 55 Hyperliquid crypto perps; the trade must last about half an hour, whatever the entry.</li>
    </ul>
    <p class="note">Next notes: one asset a week from the cost table; an error that looked like an edge, every Friday. The free indicators on TradingView are on the <a href="scripts.html">scripts</a> page.</p>
  </section>
""")

PAGES["pricing.html"] = ("Pricing · Abaco",
                         "Free, Phisys or Phisys Pro: one monthly price each plus a small machine of yours. The machine runs your rules; nothing is done by hand.", "pricing", """
  <div class="page">
    <span class="kicker">pricing</span>
    <h1>Phisys, or Phisys with the Book</h1>
    <p class="lede">Monthly, cancel any time. Prices exclude VAT, which is added at checkout for your country. Phisys opens when its first strategy has a public walk-forward; until then only Free exists.</p>
  </div>

  <section class="flush">
    <div class="tiers">
      <div class="tier">
        <span class="kicker">free</span>
        <div class="price">$0</div>
        <ul>
          <li>The sandbox: the real page on a shared machine of ours, BTC and ETH on Hyperliquid, the last year, one strategy of ours and yours built by hand</li>
          <li>The public walk-forward of every strategy in the Book</li>
          <li>Every study, the notes, the indicators on TradingView</li>
        </ul>
        <span class="who">For anyone who wants to see the test before paying.</span>
      </div>
      <div class="tier cu">
        <span class="kicker">phisys <span class="tag">soon</span></span>
        <div class="price">$49<small>/ month</small></div>
        <ul>
          <li>The four venues, full history</li>
          <li>Your rules, built in the page by hand or with the assistant (with your own Anthropic API key)</li>
          <li>The whole test: walk-forward, real costs, the map of settings, four tests per asset</li>
          <li>One strategy of the Book, the one with the public walk-forward</li>
          <li>The executor, round the clock on your machine, with your keys</li>
        </ul>
        <span class="who">For people who want their rules tested properly, then run by a machine.</span>
      </div>
      <div class="tier">
        <span class="kicker">phisys pro <span class="tag">soon</span></span>
        <div class="price">$99<small>/ month</small></div>
        <ul>
          <li>Everything in Phisys</li>
          <li>The whole Book: every strategy that passes, with its walk-forward and the assets where it holds; the new ones as they pass</li>
        </ul>
        <span class="who">For people who want to run our tested strategies too.</span>
      </div>
    </div>
  </section>

  <section>
    <h2>Your machine</h2>
    <div class="grid2">
      <div class="card cu"><h3>$10 a month, created and managed by us</h3><p>A small server of yours (2 cores, 4 GB) in one click, with the engine inside. We set it up and remove our access. Needed with Phisys and Phisys Pro: it is where the engine runs. A bigger one at the provider's list price.</p></div>
      <div class="card"><h3>Or on your own account</h3><p>Paste a token from your provider and the machine is built on your account, from about $4 a month, managed by you. For those who want nobody but themselves to be able to touch it.</p></div>
    </div>
  </section>

  <section>
    <h2>Apart</h2>
    <div class="tbl"><table>
      <thead><tr><th>What</th><th>Price</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td>Test your strategy, by us</td><td class="n">$149</td><td>send the rule and your trade list; you get the walk-forward, the real costs, the map of settings, the match with TradingView</td></tr>
        <tr><td>Written to order</td><td class="n">from $50</td><td>a strategy or indicator in Pine Script or Python, with its report</td></tr>
        <tr><td>Pine sources</td><td class="n">$9 – 19</td><td>the strategy template with full trade management, the indicators in open form</td></tr>
      </tbody>
    </table></div>
    <p class="note">Details on the <a href="scripts.html">scripts and custom work</a> page.</p>
  </section>

  <section>
    <div class="grid2">
      <div class="card"><h3>Builder code</h3><p>Orders placed through Phisys on Hyperliquid carry Abaco's builder code, a small fee per trade that you approve once and can revoke at any time. It is disclosed here because it is part of how Phisys is priced.</p></div>
      <div class="card"><h3>Payments</h3><p>Handled by Polar, which issues the invoice and collects VAT for your country. Card payments; the subscription and the machine cancel from your customer page.</p></div>
    </div>
  </section>
""")

PAGES["scripts.html"] = ("Scripts · Abaco",
                         "Free indicators on TradingView, Pine sources, and strategies written to order in Pine Script or Python, with trade management and alerts.", None, """
  <div class="page">
    <span class="kicker">scripts and custom work</span>
    <h1>Indicators and custom work</h1>
    <p class="lede">Context on the chart, not entries. Every indicator says what it measures and what it does not; every strategy we write ships with its test. The same indicators live inside the <a href="phisys.html">Phisys</a>.</p>
  </div>

  <section>
    <h2>On TradingView, free</h2>
    <div class="grid2">
      <div class="card"><h3>Extension <span class="tag">first</span></h3><p>How far price is from its own average, in units of its volatility, and how rare that is over the last 500 bars. An alert when it passes the 95th percentile. Works on any symbol.</p></div>
      <div class="card"><h3>Hyperliquid Derivatives <span class="tag">next</span></h3><p>Open interest against price, the four quadrants; liquidations by side on the bar where they happen; predicted funding. HIP-3 included.</p></div>
      <div class="card"><h3>Attention <span class="tag">next</span></h3><p>A score that says when to look, not which way: relative volume, range expansion, open interest, volatility, weighted together.</p></div>
      <div class="card"><h3>Strategy template <span class="tag">next</span></h3><p>One place to write the entry; stop in ATR, partial targets, breakeven, fixed-risk sizing and webhook alerts already done. Open source.</p></div>
    </div>
    <p class="note">Published on <a href="https://www.tradingview.com/u/AbacoLab/">tradingview.com/u/AbacoLab</a>. Protected source, no payment, no promises.</p>
  </section>

  <section>
    <div class="grid2">
      <div>
        <h2>Written to order</h2>
        <p>Your strategy or indicator in Pine Script or Python: the rule as you describe it, trade management, alerts, and a report that shows it running. Fixed prices, three to ten days.</p>
        <a class="cta" href="https://www.fiverr.com/abacolab">Order on Fiverr</a>
      </div>
      <div>
        <h2>Test your strategy <span class="tag">$149</span></h2>
        <p>Send the rule, in Pine Script or Python, and the trade list exported from your chart. You get back the report: the walk-forward, the real costs, every setting on one map, and where the trades match TradingView and where they do not. No opinion; the numbers.</p>
        <a class="cta ghost" href="https://www.fiverr.com/abacolab">Order on Fiverr</a>
      </div>
    </div>
    <p class="note" style="margin-top:20px">Pine sources <span class="tag">soon</span>: a few scripts sold as source files you paste into your own editor, $9 to $19, no subscription.</p>
  </section>
""")


def main():
    for path, (title, desc, current, body) in PAGES.items():
        with open(os.path.join(HERE, path), "w") as f:
            f.write(frame(path, title, desc, body, current))
        print("written:", path)


if __name__ == "__main__":
    main()
