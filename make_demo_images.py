"""Demo images for the site, in the brand style: paper background, Jost and IBM Plex Mono, ink and copper.

    python3 make_demo_images.py        writes img/*.png (1600x900)

These are placeholders drawn from synthetic or inventory data so the pages can be judged with pictures
in them; the real screenshots and charts replace them one by one. Every image carries a "demo" mark
except the coverage timeline, which is drawn from the database inventory of 7 October 2026.
"""
import os

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import FancyBboxPatch, Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "..", "brand", "fonts")
OUT = os.path.join(HERE, "img")
INK, COPPER, PAPER, MUTED, LINE = "#1b1d22", "#b0532a", "#fbfaf7", "#686b73", "#e2ded4"
SOFT, GREEN, RED = "#f4e4da", "#5d7a63", "#9a4a3c"
DARK_BG, DARK_CARD, DARK_LINE, DARK_FG, DARK_MUTED = "#1b1d22", "#22252b", "#33363e", "#ece8df", "#a8abb2"

for f in os.listdir(FONTS):
    if f.endswith(".ttf"):
        fm.fontManager.addfont(os.path.join(FONTS, f))
plt.rcParams.update({"font.family": "Jost", "text.color": INK, "axes.edgecolor": LINE, "axes.labelcolor": MUTED,
                     "xtick.color": MUTED, "ytick.color": MUTED, "figure.facecolor": PAPER, "axes.facecolor": PAPER,
                     "savefig.facecolor": PAPER, "axes.spines.top": False, "axes.spines.right": False})
MONO = "IBM Plex Mono"
rng = np.random.default_rng(7)


def figure(title, sub, demo=True, dark=False):
    f = plt.figure(figsize=(16, 9), dpi=100)
    if dark:
        f.patch.set_facecolor(DARK_BG)
    fg = DARK_FG if dark else INK
    mu = DARK_MUTED if dark else MUTED
    f.text(0.05, 0.93, title, fontsize=30, fontweight="semibold", va="top", color=fg)
    f.text(0.05, 0.865, sub, fontsize=15, color=mu, va="top")
    if demo:
        f.text(0.95, 0.93, "demo", fontsize=12, color=COPPER, ha="right", va="top", fontfamily=MONO)
    f.text(0.95, 0.04, "abacolab.github.io", fontsize=11, color=mu, ha="right", fontfamily=MONO)
    return f


def save(f, name):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    f.savefig(path, dpi=100, facecolor=f.get_facecolor())
    plt.close(f)
    print("written:", path)


# 1 · coverage timeline, from the inventory of 7 October 2026
def coverage():
    rows = [
        ("Dukascopy · cash: forex, indices, commodities", 2003.0, "bars"),
        ("Coinbase · spot", 2015.5, "bars"),
        ("Binance · spot", 2017.6, "bars, taker flow"),
        ("Dukascopy · cash: stocks", 2017.0, "bars"),
        ("Binance · perps", 2020.0, "bars, taker flow, open interest, funding"),
        ("Bybit · perps", 2020.2, "bars, open interest, liquidations, funding"),
        ("Bybit · spot", 2021.5, "bars"),
        ("Hyperliquid · perps", 2023.4, "mark, mid, oracle, open interest, impact spread, funding; taker flow, liquidations 2025"),
        ("Binance, Bybit, Hyperliquid · TradFi perps", 2026.1, "stocks, gold, oil, indices at leverage, 24/7"),
    ]
    f = figure("Four venues, one 5-minute grid", "What Phisys reads, and since when. Every series on the same 5-minute bars.", demo=False)
    ax = f.add_axes([0.05, 0.12, 0.9, 0.68])
    end = 2026.78
    for i, (name, start, series) in enumerate(rows):
        y = len(rows) - 1 - i
        col = COPPER if "perps" in name else INK
        ax.barh(y, end - start, left=start, height=0.5, color=col, alpha=0.9 if col == COPPER else 0.85)
        ax.text(start - 0.15, y + 0.12, name, ha="right", va="center", fontsize=12.5, color=INK)
        ax.text(start - 0.15, y - 0.2, series, ha="right", va="center", fontsize=9.5, color=MUTED, fontfamily=MONO)
    ax.set_xlim(1995.5, end + 0.2)
    ax.set_ylim(-0.7, len(rows) - 0.3)
    ax.set_yticks([])
    ax.set_xticks(range(2003, 2027, 2))
    ax.tick_params(axis="x", labelsize=11)
    ax.spines["left"].set_visible(False)
    ax.grid(axis="x", color=LINE, lw=0.8)
    ax.set_axisbelow(True)
    f.text(0.05, 0.065, "Copper: the perpetuals, where Phisys trades. Ink: the spot and cash history behind them, where it tests.",
           fontsize=12, color=MUTED)
    save(f, "data-coverage.png")


# 2 · what an hourly bar hides
def grid():
    f = figure("What an hourly bar hides", "One hour, two readings. The outcome of a trade is decided inside the bar: that is why the grid is 5 minutes.")
    # the path inside the hour: 13 points, falls to the stop first, then rises to the target
    path = np.array([100, 99.6, 99.1, 98.7, 98.4, 98.2, 98.9, 99.7, 100.4, 101.1, 101.6, 101.9, 101.4])
    entry, stop, target = 100.0, 98.3, 101.8
    ax1 = f.add_axes([0.07, 0.14, 0.22, 0.64])
    ax2 = f.add_axes([0.37, 0.14, 0.58, 0.64])
    for ax in (ax1, ax2):
        ax.set_ylim(97.6, 102.6)
        ax.set_yticks([])
        ax.spines["left"].set_visible(False)
        ax.spines["bottom"].set_visible(False)
        for lvl, lab, col in ((entry, "entry", INK), (stop, "stop", RED), (target, "target", GREEN)):
            ax.axhline(lvl, color=col, lw=1.2, ls=(0, (4, 3)))
    # the hourly candle
    o, h, l, c = path[0], path.max(), path.min(), path[-1]
    ax1.add_patch(Rectangle((0.3, min(o, c)), 0.4, abs(c - o), color=INK))
    ax1.plot([0.5, 0.5], [l, h], color=INK, lw=2)
    ax1.set_xlim(0, 1)
    ax1.set_xticks([])
    for lvl, lab, col in ((entry, "entry", INK), (stop, "stop", RED), (target, "target", GREEN)):
        ax1.text(0.02, lvl + 0.08, lab, fontsize=11, color=col, fontfamily=MONO)
    ax1.set_title("the 1-hour bar", fontsize=14, color=MUTED, loc="left")
    ax1.text(0.5, 97.75, "low below the stop, high above the target:\nwhich came first? the bar cannot say",
             fontsize=11, color=MUTED, ha="center", va="bottom")
    # the twelve 5-minute candles
    for i in range(12):
        o5, c5 = path[i], path[i + 1]
        lo, hi = min(o5, c5) - 0.12, max(o5, c5) + 0.12
        col = GREEN if c5 >= o5 else RED
        ax2.plot([i, i], [lo, hi], color=col, lw=1.6)
        ax2.add_patch(Rectangle((i - 0.28, min(o5, c5)), 0.56, max(abs(c5 - o5), 0.04), color=col))
    ax2.set_xlim(-0.8, 11.8)
    ax2.set_xticks(range(0, 12, 3))
    ax2.set_xticklabels([":00", ":15", ":30", ":45"], fontfamily=MONO, fontsize=11)
    ax2.set_title("the same hour at 5 minutes", fontsize=14, color=MUTED, loc="left")
    ax2.annotate("stop hit at :25", xy=(4.5, stop), xytext=(2.2, 97.9), fontsize=12, color=RED,
                 arrowprops=dict(arrowstyle="-", color=RED, lw=1))
    ax2.annotate("target reached at :50, too late", xy=(10.5, target), xytext=(6.6, 102.25), fontsize=12, color=GREEN,
                 arrowprops=dict(arrowstyle="-", color=GREEN, lw=1))
    f.text(0.37, 0.065, "Tests at 15 minutes and above are resolved on the 5-minute path: the stop, the targets, the trailing, in the order they happened.",
           fontsize=12, color=MUTED)
    save(f, "data-grid.png")


# 3 · the walk-forward
def walkforward():
    f = figure("Chosen on the past, judged on what came after", "Every setting is picked inside a window and scored on the next one. The number we report is the one from the stretch never looked at.")
    ax = f.add_axes([0.05, 0.14, 0.9, 0.66])
    years = np.arange(2021, 2027)
    folds = 6
    w_in, w_out, step = 1.5, 0.5, 0.5
    for k in range(folds):
        y = folds - k
        s = 2021 + k * step
        ax.add_patch(Rectangle((s, y - 0.3), w_in, 0.6, color=LINE))
        ax.add_patch(Rectangle((s + w_in, y - 0.3), w_out, 0.6, color=COPPER))
        if k == 0:
            ax.text(s + w_in / 2, y + 0.42, "choose the settings here", ha="center", fontsize=11.5, color=MUTED)
            ax.text(s + w_in + w_out / 2, y + 0.42, "score here", ha="center", fontsize=11.5, color=COPPER)
    # the concatenated out-of-sample stretch
    y0 = 0
    for k in range(folds):
        s = 2021 + k * step + w_in
        ax.add_patch(Rectangle((s, y0 - 0.3), w_out, 0.6, color=COPPER))
    ax.text(2021 + w_in + folds * step / 2, y0 - 0.72, "the stretch never looked at: what we report", ha="center", fontsize=12.5, color=COPPER)
    ax.text(2020.9, y0, "out of sample", ha="right", va="center", fontsize=12, color=INK)
    ax.text(2020.9, (folds + 1) / 2, "window by window", ha="right", va="center", fontsize=12, color=INK, rotation=90)
    ax.set_xlim(2019.9, 2026.3)
    ax.set_ylim(-1.1, folds + 0.9)
    ax.set_yticks([])
    ax.set_xticks(years)
    ax.tick_params(axis="x", labelsize=12)
    ax.spines["left"].set_visible(False)
    ax.grid(axis="x", color=LINE, lw=0.8)
    ax.set_axisbelow(True)
    f.text(0.05, 0.065, "A backtest optimised on the whole history is a story about the past. This is a test: a choice, then what followed.",
           fontsize=12, color=MUTED)
    save(f, "test-walkforward.png")


# 4 · every setting on one map: the plateau
def plateau():
    f = figure("Every setting, on one map", "The rule on every combination of its two inputs, after costs. A good setting sits on a plateau; a lone peak is a lucky number.")
    ax = f.add_axes([0.09, 0.16, 0.56, 0.64])
    lengths = np.arange(6, 22, 1)
    factors = np.arange(1.0, 6.5, 0.5)
    L, F = np.meshgrid(lengths, factors, indexing="ij")
    # a broad hill of profitable settings, a sea of losing ones, and one lucky cell far from the hill
    z = 38 * np.exp(-(((L - 15) / 4.2) ** 2 + ((F - 4.2) / 1.25) ** 2)) - 14 + rng.normal(0, 4, L.shape)
    z[1, 1] = 31
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list("pl", [RED, "#d9b3a8", PAPER, "#b9c8bb", GREEN])
    norm = matplotlib.colors.TwoSlopeNorm(vmin=-30, vcenter=0, vmax=30)
    for a in range(len(lengths)):
        for b in range(len(factors)):
            ax.add_patch(Rectangle((b, a), 0.94, 0.9, color=cmap(norm(np.clip(z[a, b], -30, 30)))))
    # the plateau and the chosen setting inside it
    ax.add_patch(Rectangle((4.85, 6.85), 4.2, 5.2, fill=False, edgecolor=INK, lw=2))
    ax.plot(6 + 0.47, 9 + 0.45, marker="o", ms=15, mfc="none", mec=COPPER, mew=3)
    ax.annotate("the plateau:\nthe neighbours make money too", xy=(9.05, 11.2), xytext=(11.6, 13.4),
                fontsize=12.5, color=INK, va="center", annotation_clip=False,
                arrowprops=dict(arrowstyle="-", color=INK, lw=1.2))
    ax.annotate("a lone peak among losers:\nluck with a parameter name", xy=(1.94, 1.45), xytext=(11.6, 2.4),
                fontsize=12.5, color=RED, va="center", annotation_clip=False,
                arrowprops=dict(arrowstyle="-", color=RED, lw=1.2))
    ax.set_xlim(-0.2, len(factors) + 0.1)
    ax.set_ylim(-0.2, len(lengths) + 0.6)
    ax.set_xticks(np.arange(len(factors)) + 0.47, ["%g" % x for x in factors], fontsize=11)
    ax.set_yticks(np.arange(len(lengths))[::2] + 0.45, [str(x) for x in lengths[::2]], fontsize=11)
    ax.set_xlabel("input 2 · factor", fontsize=12)
    ax.set_ylabel("input 1 · length", fontsize=12)
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.tick_params(length=0)
    # the legend
    lg = f.add_axes([0.905, 0.36, 0.014, 0.32])
    lg.imshow(np.linspace(30, -30, 100)[:, None], aspect="auto", cmap=cmap, norm=norm, extent=(0, 1, -30, 30))
    lg.set_xticks([]); lg.yaxis.tick_right()
    lg.set_yticks([-30, 0, 30], ["−30 %", "0", "+30 %"], fontsize=11)
    for sp in lg.spines.values():
        sp.set_visible(False)
    f.text(0.912, 0.71, "a year,\nafter costs", fontsize=12, color=MUTED, ha="center")
    f.text(0.09, 0.065, "The circle is the setting the walk-forward picked. It counts because it sits on the plateau, not on the peak.",
           fontsize=12, color=MUTED)
    save(f, "test-plateau.png")


# 5 · four tests per asset
def evidence():
    f = figure("Four tests per asset, never an average", "Positive after costs out of sample · most windows positive · on a plateau · choosing beats not choosing. It holds where it passes all four.")
    assets = ["BTC", "ETH", "SOL", "XRP", "DOGE", "HYPE", "LINK", "AVAX", "TSLA", "NVDA", "XAU", "SPX"]
    tfs = ["15m", "1h", "4h", "1d"]
    # the four tests per cell: (after costs, windows, plateau, choosing beats not choosing)
    T = [["1000", "1111", "1111", "1100"], ["0000", "1111", "1110", "1010"], ["1111", "1111", "1100", "1000"],
         ["0000", "1000", "1010", "0100"], ["0000", "1111", "1000", "1100"], ["1111", "1011", "0100", "1000"],
         ["0000", "0100", "1111", "1000"], ["1000", "1111", "0000", "1100"], ["0000", "1000", "0110", "1010"],
         ["0000", "1111", "1100", "1000"], ["0100", "1000", "0000", "1010"], ["0000", "0010", "1000", "1100"]]
    ax = f.add_axes([0.12, 0.12, 0.76, 0.68])
    for i, a in enumerate(assets):
        y = len(assets) - 1 - i
        for j, t in enumerate(tfs):
            passed = [c == "1" for c in T[i][j]]
            holds = all(passed)
            ax.add_patch(Rectangle((j, y), 0.92, 0.84, color=COPPER if holds else LINE))
            ax.text(j + 0.30, y + 0.42, "holds" if holds else "no", ha="center", va="center", fontsize=11,
                    color=PAPER if holds else MUTED, fontfamily=MONO)
            for k, ok in enumerate(passed):
                c = PAPER if holds else INK
                ax.plot(j + 0.55 + k * 0.095, y + 0.42, marker="o", ms=6, mfc=c if ok else "none", mec=c, mew=1.2)
        ax.text(-0.15, y + 0.42, a, ha="right", va="center", fontsize=13, fontfamily=MONO)
    for j, t in enumerate(tfs):
        ax.text(j + 0.46, len(assets) + 0.15, t, ha="center", fontsize=13, fontfamily=MONO, color=MUTED)
    ax.set_xlim(-0.6, 4)
    ax.set_ylim(-0.1, len(assets) + 0.5)
    ax.axis("off")
    f.text(0.12, 0.065, "The four dots are the tests, in that order: a full dot passed, an empty one failed. A «no» says which test it failed.",
           fontsize=12, color=MUTED)
    save(f, "test-evidence.png")


# 6 · the interface, as a mock
def interface():
    f = figure("Phisys, in the browser", "Your rule on the chart, the signals where they were known, the report beside it. Runs on your machine.", dark=True)
    # chrome
    f.patches.append(FancyBboxPatch((0.05, 0.08), 0.9, 0.72, boxstyle="round,pad=0.004,rounding_size=0.01",
                                    transform=f.transFigure, facecolor=DARK_CARD, edgecolor=DARK_LINE, lw=1.2, zorder=-2))
    f.text(0.07, 0.765, "phisys", fontsize=13, color=COPPER, fontfamily=MONO, va="center")
    for k, name in enumerate(["data", "rules", "test", "trade"]):
        f.text(0.16 + k * 0.055, 0.765, name, fontsize=12, color=DARK_FG if name == "test" else DARK_MUTED, va="center")
    f.text(0.93, 0.765, "SOL · Hyperliquid · 1h", fontsize=12, color=DARK_MUTED, va="center", ha="right", fontfamily=MONO)
    # asset list
    for k, (a, col) in enumerate([("BTC", DARK_MUTED), ("ETH", DARK_MUTED), ("SOL", COPPER), ("XRP", DARK_MUTED), ("DOGE", DARK_MUTED),
                                  ("HYPE", DARK_MUTED), ("TSLA", DARK_MUTED), ("NVDA", DARK_MUTED), ("XAU", DARK_MUTED)]):
        f.text(0.075, 0.70 - k * 0.058, a, fontsize=12, color=col, fontfamily=MONO)
    # chart
    ax = f.add_axes([0.14, 0.14, 0.52, 0.58])
    ax.set_facecolor(DARK_CARD)
    n = 160
    x = np.arange(n)
    p = 100 + np.cumsum(rng.normal(0.05, 0.9, n))
    ax.plot(x, p, color=DARK_FG, lw=1.3)
    ema = np.convolve(p, np.ones(20) / 20, mode="same")
    ax.plot(x[10:-10], ema[10:-10], color=DARK_MUTED, lw=1, ls=(0, (3, 3)))
    longs = [28, 61, 97, 131]
    for i in longs:
        ax.plot(i, p[i] - 2.2, marker="^", color=COPPER, ms=11)
        ax.plot([i, i + 14], [p[i] - 4.5, p[i] - 4.5], color=RED, lw=1)
        ax.plot([i, i + 14], [p[i] + 6, p[i] + 6], color=GREEN, lw=1)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_xticks([]); ax.set_yticks([])
    ax.text(0.01, 0.95, "TF - Extension Thrust  ·  signal at the close, stop and TP1 drawn where they were known", transform=ax.transAxes,
            fontsize=10.5, color=DARK_MUTED, fontfamily=MONO)
    # report panel
    f.patches.append(FancyBboxPatch((0.685, 0.12), 0.245, 0.6, boxstyle="round,pad=0.003,rounding_size=0.008",
                                    transform=f.transFigure, facecolor=DARK_BG, edgecolor=DARK_LINE, lw=1, zorder=-1))
    f.text(0.70, 0.69, "REPORT · OUT OF SAMPLE", fontsize=10.5, color=COPPER, fontfamily=MONO)
    lines = [("evidence", "holds", COPPER), ("R per trade", "0.31", DARK_FG), ("trades", "142", DARK_FG), ("hit rate", "44 %", DARK_FG),
             ("costs paid", "9.4 bps / trip", DARK_FG), ("on a plateau", "7 of 8 neighbours", DARK_FG), ("max drawdown", "11.8 R", DARK_FG),
             ("windows positive", "6 of 6", DARK_FG), ("stop", "1.5 ATR", DARK_MUTED), ("TP1 / TP2", "2 R / 4 R", DARK_MUTED), ("breakeven", "at TP1", DARK_MUTED)]
    for k, (a, b, col) in enumerate(lines):
        y = 0.645 - k * 0.04
        f.text(0.70, y, a, fontsize=11, color=DARK_MUTED)
        f.text(0.915, y, b, fontsize=11.5, color=col, ha="right", fontfamily=MONO)
    f.patches.append(FancyBboxPatch((0.70, 0.135), 0.215, 0.045, boxstyle="round,pad=0.002,rounding_size=0.006",
                                    transform=f.transFigure, facecolor=COPPER, edgecolor=COPPER))
    f.text(0.8075, 0.1575, "Run it on my machine", fontsize=12, color=DARK_BG, ha="center", va="center", fontweight="medium")
    save(f, "lab-interface.png")


# 7 · the assistant writes the rule
def ai_rule():
    f = figure("Your rule, written with you", "Describe it in words; the assistant drafts it from Phisys's indicators; the test judges it. It never predicts and never trades.")
    cols = [0.05, 0.37, 0.69]
    w = 0.27
    titles = ["YOU WRITE", "THE ASSISTANT DRAFTS", "THE TEST JUDGES"]
    for x, t in zip(cols, titles):
        f.patches.append(FancyBboxPatch((x, 0.12), w, 0.66, boxstyle="round,pad=0.004,rounding_size=0.01",
                                        transform=f.transFigure, facecolor="#ffffff", edgecolor=LINE, lw=1.2))
        f.text(x + 0.02, 0.74, t, fontsize=11, color=COPPER, fontfamily=MONO)
    f.text(cols[0] + 0.02, 0.68, "«Buy when price is more than two\nsigmas above its 20-bar average,\nbut only when volatility is in the\nlower half of the last 2000 bars.\n\nStop one and a half ATR below,\ntake half at 2R, the rest at 4R,\nmove the stop to breakeven at\nthe first target.\n\nTry it on SOL and ETH at 1 hour.»",
           fontsize=13, va="top", linespacing=1.45)
    draft = ("entry:\n  indicator: extension_thrust\n  entry_pct: 97\n  ema_len: 20\n\nconfluence:\n  volatility.vol_pct\n  rule: below 0.5\n  lookback: 2000\n\nmanagement:\n  stop_atr: 1.5\n  tp1: 2 R · 50 %\n  tp2: 4 R\n  breakeven: at tp1\n\nassets: SOL, ETH · tf: 1h")
    f.text(cols[1] + 0.02, 0.68, draft, fontsize=11.5, va="top", fontfamily=MONO, linespacing=1.4, color=INK)
    f.text(cols[1] + 0.02, 0.16, "built only from the indicators Phisys has;\nif a piece is missing, it says so", fontsize=10.5, color=MUTED, va="bottom")
    rows = [("SOL · 1h", "holds", COPPER, "0.31 R · 142 trades"), ("ETH · 1h", "no", MUTED, "0.04 R · 118 trades")]
    for k, (a, result_, col, det) in enumerate(rows):
        y = 0.63 - k * 0.14
        f.text(cols[2] + 0.02, y, a, fontsize=14, fontfamily=MONO)
        f.text(cols[2] + 0.02, y - 0.045, result_, fontsize=16, color=col, fontweight="semibold")
        f.text(cols[2] + 0.02, y - 0.085, det, fontsize=11, color=MUTED, fontfamily=MONO)
    f.text(cols[2] + 0.02, 0.30, "then the assistant reads the report\nand says what it means and what\nto try next: a longer stop, a filter\non the session, another asset.\n\nThe rule is yours. The test decides.",
           fontsize=12.5, va="top", color=INK, linespacing=1.4)
    save(f, "ai-rule.png")


# 8 · the machine
def machine():
    f = figure("Your browser, your server, your keys", "The page is ours; the engine and the executor run on a small server of yours, created in one click. Keys never touch our side.")
    boxes = {
        "browser": (0.05, 0.42, 0.2, 0.22, "YOUR BROWSER", "the Phisys page\nat its own address"),
        "server": (0.38, 0.32, 0.26, 0.42, "YOUR SERVER", "a small server of yours, in the cloud\nthe engine · the executor\nyour keys, born here"),
        "venues": (0.76, 0.42, 0.19, 0.22, "THE VENUES", "Hyperliquid\nBinance · Bybit"),
        "abaco": (0.38, 0.08, 0.26, 0.15, "ABACO", "the data, aligned and checked, in slices\nthe licence"),
    }
    for key, (x, y, w, h, t, body) in boxes.items():
        cu = key == "server"
        f.patches.append(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.004,rounding_size=0.012", transform=f.transFigure,
                                        facecolor=SOFT if cu else "#ffffff", edgecolor=COPPER if cu else LINE, lw=1.6 if cu else 1.2))
        f.text(x + w / 2, y + h - 0.04, t, fontsize=11.5, color=COPPER, fontfamily=MONO, ha="center")
        f.text(x + w / 2, y + h / 2 - 0.03, body, fontsize=13.5, ha="center", va="center", linespacing=1.5)
    ax = f.add_axes([0, 0, 1, 1]); ax.axis("off"); ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    def arrow(x0, y0, x1, y1, label, dy=0.03):
        ax.annotate("", xy=(x1, y1), xytext=(x0, y0), arrowprops=dict(arrowstyle="<->", color=INK, lw=1.4))
        ax.text((x0 + x1) / 2, (y0 + y1) / 2 + dy, label, ha="center", fontsize=11, color=MUTED)
    arrow(0.25, 0.53, 0.38, 0.53, "tests, reports,\nthe executor's state", dy=0.045)
    arrow(0.64, 0.53, 0.76, 0.53, "data live, orders")
    ax.annotate("", xy=(0.51, 0.32), xytext=(0.51, 0.23), arrowprops=dict(arrowstyle="->", color=INK, lw=1.4))
    ax.text(0.525, 0.275, "only the slices a test needs", fontsize=11, color=MUTED, va="center")
    # Abaco collects the history from the venues, every week
    ax.plot([0.64, 0.855], [0.155, 0.155], color=INK, lw=1.4)
    ax.annotate("", xy=(0.855, 0.42), xytext=(0.855, 0.155), arrowprops=dict(arrowstyle="<-", color=INK, lw=1.4))
    ax.text(0.7475, 0.175, "collects the history, every week", ha="center", fontsize=11, color=MUTED)
    ax.text(0.05, 0.36, "Hyperliquid: an agent key that can trade\nand cannot withdraw, revocable from your wallet.\nBinance and Bybit: trade-only API keys, bound\nto your server's address, sent from your\nbrowser to your server.\nAfter setup we remove our access;\nthe engine updates itself.",
            fontsize=11, color=MUTED, va="top", linespacing=1.5)
    save(f, "lab-machine.png")


if __name__ == "__main__":
    coverage(); grid(); walkforward(); plateau(); evidence(); interface(); ai_rule(); machine()
