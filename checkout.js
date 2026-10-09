/* Abaco checkout: pick a plan, then pay by card (a Stripe Payment Link) or in USDC from the buyer's own wallet.
   No server behind the site: whatever the page cannot do itself leaves as an email to us.
   The Stripe links and the USDC address live in the JSON block #pay-config of checkout.html. */
(function () {
  'use strict';

  var MAIL = 'ciao.abaco@gmail.com';
  var PLANS = {
    novice: { name: 'Novice', m: 0, y: 0 },
    apprentice: { name: 'Apprentice', m: 34, y: 374 },
    adept: { name: 'Adept', m: 55, y: 605 },
    magister: { name: 'Magister', m: 89, y: 979 }
  };
  // Native USDC (Circle) on each network; the euro price is converted at the rate of the day.
  var NETS = {
    arbitrum: { name: 'Arbitrum', chainId: '0xa4b1', chainName: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc',
                explorer: 'https://arbiscan.io', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    base: { name: 'Base', chainId: '0x2105', chainName: 'Base', rpc: 'https://mainnet.base.org',
            explorer: 'https://basescan.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
  };
  // The rate of the day: ExchangeRate-API's open endpoint (it asks for the credit shown beside the rate),
  // then the ECB reference rate through Frankfurter, which some browsers fail to reach.
  var RATES = [
    { url: 'https://open.er-api.com/v6/latest/EUR', by: 'ExchangeRate-API', home: 'https://www.exchangerate-api.com',
      read: function (j) { return j.result === 'success' && { usd: j.rates.USD, day: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10) }; } },
    { url: 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD', by: 'ECB', home: 'https://www.ecb.europa.eu',
      read: function (j) { return j.rates && { usd: j.rates.USD, day: j.date }; } }
  ];

  var rate = null, rateDate = '', rateBy = null, rateFailed = false, busy = false, lastTx = null;

  function $(id) { return document.getElementById(id); }
  function radio(name) {
    var r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : null;
  }
  function setRadio(name, v) {
    var r = document.querySelector('input[name="' + name + '"][value="' + v + '"]');
    if (r) r.checked = true;
  }
  function cfg() {
    try { return JSON.parse($('pay-config').textContent); } catch (e) { return {}; }
  }
  function isAddr(a) { return /^0x[0-9a-fA-F]{40}$/.test(a || ''); }
  function euro(n) { return '€' + (n % 1 ? n.toFixed(2) : String(n)); }
  function usdc(cents) { return (cents / 100).toFixed(2) + ' USDC'; }
  function months(n) { return n + (n === 1 ? ' month' : ' months'); }

  function state() {
    var plan = PLANS[radio('plan')] ? radio('plan') : 'adept';
    var bill = radio('bill') === 'y' ? 'y' : 'm';
    var n = +(radio('months') || (bill === 'y' ? 12 : 1));
    var p = PLANS[plan];
    var eur = n === 12 ? p.y : p.m * n;
    return {
      plan: plan, p: p, bill: bill, months: n, eur: eur,
      net: NETS[radio('net')] || NETS.arbitrum,
      cents: rate ? Math.ceil(eur * rate * 100 - 1e-6) : null,
      ref: plan !== 'novice' && $('co-ref').checked
    };
  }

  function say(text, link) {
    var s = $('co-status');
    s.textContent = text;
    if (link) {
      s.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'See it on the explorer';
      s.appendChild(a);
    }
  }

  function render() {
    var s = state(), paid = s.plan !== 'novice', c = cfg();
    var price = s.bill === 'y' ? euro(s.p.y) + ' a year, one month free' : euro(s.p.m) + ' a month';
    $('co-title').textContent = 'Begin ' + s.p.name;
    $('co-lede').textContent = !paid ? 'Free: the monthly report, and our indicators and screeners on TradingView'
      : s.ref ? 'First month free with referral, then ' + euro(s.p[s.bill]) + (s.bill === 'y' ? ' a year' : ' a month') : price;
    document.querySelectorAll('#co-plan b[data-m]').forEach(function (b) { b.textContent = b.getAttribute('data-' + s.bill); });
    $('co-bill').hidden = !paid;
    $('co-ref-row').hidden = !paid;
    $('co-addr-row').hidden = !s.ref;
    $('co-pay').hidden = !paid || s.ref;
    $('co-go').hidden = paid && !s.ref;
    $('co-free').textContent = paid ? 'Start my free month' : 'Create my account';
    $('co-usdc').textContent = s.cents !== null ? usdc(s.cents) : euro(s.eur) + ' at the day’s rate';
    $('co-eur').textContent = euro(s.eur) + ' for ' + months(s.months);
    var rt = $('co-rate');
    rt.textContent = rate ? '1 EUR = ' + rate.toFixed(4) + ' USD, ' + rateDate + ', rates by '
      : rateFailed ? 'the day’s rate, in our reply' : 'loading…';
    if (rate) {
      var a = document.createElement('a');
      a.href = rateBy.home; a.target = '_blank'; a.rel = 'noopener'; a.textContent = rateBy.by;
      rt.appendChild(a);
    }
    $('co-to').textContent = isAddr(c.usdc_to) ? c.usdc_to : 'sent to you by email';
    try {
      history.replaceState(null, '', '?plan=' + s.plan + (paid ? '&bill=' + s.bill : ''));
    } catch (e) {}
  }

  function email() { return $('co-email').value.trim(); }
  function needEmail() {
    var el = $('co-email'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email());
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) { say('Write your email first: the licence key goes there.'); el.focus(); }
    return ok;
  }
  function lines(s, extra) {
    var out = ['Plan: ' + s.p.name];
    if (s.plan !== 'novice') out.push('Billing: ' + (s.bill === 'y' ? 'yearly' : 'monthly'));
    out.push('Email: ' + email(), 'TradingView username: ' + ($('co-tv').value.trim() || '-'));
    return out.concat(extra || []).join('\n');
  }
  function mail(subject, body) {
    location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  // ERC-20 transfer(to, amount): USDC has 6 decimals, so one cent is 10,000 units.
  function pad64(hex) { return (new Array(65).join('0') + hex).slice(-64); }
  function transferData(to, cents) {
    return '0xa9059cbb' + pad64(to.slice(2).toLowerCase()) + pad64((cents * 10000).toString(16));
  }

  async function onNet(eth, net) {
    var cur = String(await eth.request({ method: 'eth_chainId' })).toLowerCase();
    if (cur === net.chainId) return;
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.chainId }] });
    } catch (e) {
      var code = e && (e.code || (e.data && e.data.originalError && e.data.originalError.code));
      if (code !== 4902) throw e;
      await eth.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: net.chainId, chainName: net.chainName, rpcUrls: [net.rpc], blockExplorerUrls: [net.explorer],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } }] });
    }
    cur = String(await eth.request({ method: 'eth_chainId' })).toLowerCase();
    if (cur !== net.chainId) throw new Error('the wallet is not on ' + net.name);
  }

  async function payUsdc() {
    var s = state(), to = cfg().usdc_to;
    if (!isAddr(to) || s.cents === null) {
      mail('Pay in USDC: ' + s.p.name + ', ' + months(s.months),
           lines(s, ['Months: ' + s.months, 'Network: ' + s.net.name, 'Price: ' + euro(s.eur)]));
      say('Your mail app opens with the request: we reply with the address and the amount in USDC.');
      return;
    }
    var eth = window.ethereum;
    if (!eth || !eth.request) {
      say('No wallet in this browser. Send ' + usdc(s.cents) + ' on ' + s.net.name +
          ' to the address above from any wallet, then email us the transaction.');
      return;
    }
    busy = true; $('co-mm').disabled = true;
    try {
      say('Confirm in your wallet…');
      var acc = await eth.request({ method: 'eth_requestAccounts' });
      await onNet(eth, s.net);
      var hash = await eth.request({ method: 'eth_sendTransaction', params: [{
        from: acc[0], to: s.net.usdc, value: '0x0', data: transferData(to, s.cents) }] });
      lastTx = { s: s, url: s.net.explorer + '/tx/' + hash };
      $('co-receipt').hidden = false;
      say('Sent: ' + usdc(s.cents) + ' on ' + s.net.name + '. Send us the receipt and the licence key follows.', lastTx.url);
    } catch (e) {
      say(e && e.code === 4001 ? 'Cancelled in the wallet: nothing was sent.' : 'The wallet stopped: ' + ((e && e.message) || e));
    } finally {
      busy = false; $('co-mm').disabled = false;
    }
  }

  function payCard() {
    var s = state(), link = ((cfg().stripe || {})[s.plan] || {})[s.bill];
    if (link && /^https:\/\/buy\.stripe\.com\//.test(link)) {
      location.href = link + (link.indexOf('?') < 0 ? '?' : '&') + 'prefilled_email=' + encodeURIComponent(email());
      return;
    }
    mail('Pay by card: ' + s.p.name + ', ' + (s.bill === 'y' ? 'yearly' : 'monthly'), lines(s));
    say('Card payments open soon: your mail app opens and we keep your place.');
  }

  function freeStart() {
    var s = state();
    if (s.plan === 'novice') {
      mail('Novice sign-up', lines(s));
      say('Your mail app opens with the request: send it and we open your account.');
      return;
    }
    var el = $('co-addr'), a = el.value.trim();
    el.setAttribute('aria-invalid', isAddr(a) ? 'false' : 'true');
    if (!isAddr(a)) { say('Write the Hyperliquid address you opened through our link: 0x and 40 characters.'); el.focus(); return; }
    mail('Free month: ' + s.p.name, lines(s, ['Hyperliquid address: ' + a]));
    say('Your mail app opens with the request: we check the referral and send your licence key.');
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var q = new URLSearchParams(location.search);
    if (q.get('paid') === 'card') {
      $('co-title').textContent = 'Thank you';
      $('co-lede').textContent = 'Your licence key arrives by email. Look in the spam folder too.';
      $('co').hidden = true;
      return;
    }
    var bill = q.get('bill') === 'y' ? 'y' : 'm';
    setRadio('plan', PLANS[q.get('plan')] ? q.get('plan') : 'adept');
    setRadio('bill', bill);
    setRadio('months', bill === 'y' ? '12' : '1');

    $('co').addEventListener('change', function (e) {
      var n = e.target.name;
      if (n === 'bill') setRadio('months', radio('bill') === 'y' ? '12' : '1');
      if (n === 'months') setRadio('bill', radio('months') === '12' ? 'y' : 'm');
      render();
    });
    $('co').addEventListener('submit', function (e) { e.preventDefault(); });
    $('co-card').addEventListener('click', function () { if (needEmail()) payCard(); });
    $('co-mm').addEventListener('click', function () { if (!busy && needEmail()) payUsdc(); });
    $('co-free').addEventListener('click', function () { if (needEmail()) freeStart(); });
    $('co-send').addEventListener('click', function () {
      if (!lastTx) return;
      var s = lastTx.s;
      mail('USDC receipt: ' + s.p.name + ', ' + months(s.months),
           lines(s, ['Months: ' + s.months, 'Network: ' + s.net.name, 'Amount: ' + usdc(s.cents), 'Transaction: ' + lastTx.url]));
    });
    render();

    (function next(i) {
      if (i >= RATES.length) { rateFailed = true; render(); return; }
      var src = RATES[i];
      fetch(src.url).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (j) {
        var got = src.read(j);
        if (!(got && got.usd > 0)) throw new Error('no rate');
        rate = got.usd; rateDate = got.day || ''; rateBy = src;
        render();
      }).catch(function () { next(i + 1); });
    })(0);
  });
})();
