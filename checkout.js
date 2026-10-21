/* Abaco checkout: pick a plan, then pay by card (a Stripe Payment Link) or in USDC from the buyer's own wallet.
   No server behind the site: whatever the page cannot do itself leaves as an email to us.
   The Stripe links and the USDC address live in the JSON block #pay-config of checkout.html. */
(function () {
  'use strict';

  var MAIL = atob('YWJhY29AcGhpc3lzLmFwcA==');  // never whole in the files: harvesters read them
  var PLANS = {
    novice: { name: 'Novice', m: 0, y: 0 },
    apprentice: { name: 'Apprentice', m: 34, y: 374 },
    adept: { name: 'Adept', m: 55, y: 605 },
    magister: { name: 'Magister', m: 89, y: 979 },
    doctor: { name: 'Doctor', m: 144, y: 1584 }
  };
  // Native USDC (Circle) on each network; the euro price is converted at the rate of the day.
  var NETS = {
    arbitrum: { name: 'Arbitrum', chainId: '0xa4b1', chainName: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc',
                explorer: 'https://arbiscan.io', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    base: { name: 'Base', chainId: '0x2105', chainName: 'Base', rpc: 'https://mainnet.base.org',
            explorer: 'https://basescan.org', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
  };
  // phisys.app checks the transfer on chain and issues the licence, or renews the one this email holds
  var PAY_API = 'https://phisys.app/pay/usdc';
  // The referral discount: 15% on every plan, for as long as the buyer subscribes, once the address is confirmed
  var REF_OFF = 0.15, REF = null;
  var PRICES_API = 'https://phisys.app/pay/prices';   // the table phisys.app decides with: the page reads the same
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
  function off(n) { return Math.round(n * (1 - REF_OFF) * 100) / 100; }
  function usdc(cents) { return (cents / 100).toFixed(2) + ' USDC'; }
  function months(n) { return n + (n === 1 ? ' month' : ' months'); }

  function state() {
    var plan = PLANS[radio('plan')] ? radio('plan') : 'adept';
    var bill = radio('bill') === 'y' ? 'y' : 'm';
    var n = +(radio('months') || (bill === 'y' ? 12 : 1));
    var p = PLANS[plan];
    var eur = n === 12 ? p.y : p.m * n;
    var ref = plan !== 'novice' && $('co-ref').checked, addr = ($('co-addr').value || '').trim().toLowerCase();
    var refOk = ref && REF !== null && REF === addr;
    if (refOk) eur = Math.round(eur * (1 - REF_OFF) * 100) / 100;
    return {
      plan: plan, p: p, bill: bill, months: n, eur: eur,
      net: NETS[radio('net')] || NETS.arbitrum,
      cents: rate ? Math.ceil(eur * rate * 100 - 1e-6) : null,
      ref: ref, refOk: refOk, addr: addr
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
    var price = euro(s.p.m) + ' a month, or ' + euro(s.p.y) + ' for 12 months, one month free';
    $('co-title').textContent = 'Begin ' + s.p.name;
    $('co-lede').textContent = !paid ? 'Free: the monthly report, and our indicators, self-optimising strategies and screeners on TradingView'
      : s.refOk ? '15% off for life with referral: ' + euro(off(s.p.m)) + ' a month, or ' + euro(off(s.p.y)) + ' for 12 months'
      : s.ref ? 'Referral: 15% off every plan, for as long as you subscribe. Check your address first' : price;
    document.querySelectorAll('#co-plan b[data-m]').forEach(function (b) { b.textContent = b.getAttribute('data-' + s.bill); });
    $('co-bill').hidden = true;   // one payment for 1, 3 or 12 months: the months pick the price
    $('co-ref-row').hidden = !paid;
    $('co-terms-pay').hidden = !paid;
    $('co-addr-row').hidden = !s.ref;
    $('co-pay').hidden = !paid || (s.ref && !s.refOk);
    $('co-go').hidden = paid && (!s.ref || s.refOk);
    $('co-free').textContent = paid ? 'Check my referral' : 'Create my account';
    $('co-usdc').textContent = s.cents !== null ? usdc(s.cents) : euro(s.eur) + ' at the day’s rate';
    $('co-eur').textContent = euro(s.eur) + ' for ' + months(s.months) + ', total to pay';
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

  // Where the buyer lives: declared in the form, and checked against the country of the connection.
  var CC = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  var seen = null;  // the country of the connection, when a lookup answers
  function countryName(c) {
    try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(c); } catch (e) { return c; }
  }
  function fillCountries() {
    var sel = $('co-country');
    CC.map(function (c) { return [countryName(c), c]; }).sort(function (a, b) { return a[0].localeCompare(b[0]); })
      .forEach(function (p) { var o = document.createElement('option'); o.value = p[1]; o.textContent = p[0]; sel.appendChild(o); });
  }
  function lookCountry() {
    var srcs = [
      ['https://api.country.is/', function (r) { return r.json().then(function (j) { return j.country; }); }],
      ['https://ipapi.co/country/', function (r) { return r.text(); }]
    ];
    fetch(PRICES_API).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok || !j.eur) return;
      Object.keys(PLANS).forEach(function (k) {
        var e = j.eur[k]; if (!e || !(e.month > 0) || !(e.year > 0)) return;
        PLANS[k].m = e.month; PLANS[k].y = e.year;
        var b = document.querySelector('#co-plan input[value="' + k + '"] + span b');
        if (b) { b.setAttribute('data-m', '€' + e.month.toLocaleString('en-US')); b.setAttribute('data-y', '€' + e.year.toLocaleString('en-US')); }
      });
      render();
    }).catch(function () { /* the prices in the page stand */ });

    (function next(i) {
      if (i >= srcs.length) return;
      fetch(srcs[i][0]).then(function (r) { return r.ok ? srcs[i][1](r) : Promise.reject(); }).then(function (c) {
        c = String(c || '').trim().toUpperCase();
        if (CC.indexOf(c) < 0) return Promise.reject();
        seen = c;
        if (!$('co-country').value) $('co-country').value = c;
      }).catch(function () { next(i + 1); });
    })(0);
  }
  function needCountry() {
    var el = $('co-country'), ok = !!el.value;
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) { say('Choose the country you live in.'); el.focus(); }
    return ok;
  }
  function email() { return $('co-email').value.trim(); }
  function needEmail() {
    var el = $('co-email'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email());
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) { say('Write your email first: the licence key goes there.'); el.focus(); }
    return ok && needCountry() && needTerms();
  }
  function needTerms() {
    var el = $('co-terms'), ok = el.checked;
    if (!ok) { say('Tick the box to accept the Legal page first.'); el.focus(); }
    return ok;
  }
  function lines(s, extra) {
    var out = ['Plan: ' + s.p.name];
    if (s.plan !== 'novice') out.push('Billing: ' + (s.bill === 'y' ? 'yearly' : 'monthly'));
    var c = $('co-country').value;
    out.push('Email: ' + email(), 'Country: ' + countryName(c) + ' (' + c + ')',
             'Country of the connection: ' + (seen ? countryName(seen) + ' (' + seen + ')' + (seen === c ? ', matches' : ', differs') : 'not available'),
             'TradingView username: ' + ($('co-tv').value.trim() || '-'));
    if (s.refOk) out.push('Referral: 15% off, Hyperliquid address ' + REF);
    return out.concat(extra || []).join('\n');
  }
  // A request for us: phisys.app forwards it to our inbox, so the buyer sends nothing from their own account.
  // If the route does not answer, the buyer's mail app opens with the same text, as before.
  var NOTE_API = 'https://phisys.app/pay/notify';
  function mail(subject, body, sent, opened) {
    fetch(NOTE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subject: subject, body: body, email: email().toLowerCase().replace(/\s+/g, '') }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!(j && j.ok)) throw new Error('route'); say(sent || 'Sent: we have your request and write back by email.'); $('co-status').classList.add('hit'); })
      .catch(function () {
        location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        if (opened) say(opened);
      });
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
           lines(s, ['Months: ' + s.months, 'Network: ' + s.net.name, 'Price: ' + euro(s.eur)]),
           'Sent: we reply by email with the address and the amount in USDC.',
           'Your mail app opens with the request: we reply with the address and the amount in USDC.');
      return;
    }
    var eth = window.ethereum;
    if (!eth || !eth.request) {
      say('No wallet in this browser. Send ' + usdc(s.cents) + ' on ' + s.net.name +
          ' to the address above from any wallet, then paste the transaction below.');
      return;
    }
    busy = true; $('co-mm').disabled = true;
    try {
      say('Confirm in your wallet…');
      var acc = await eth.request({ method: 'eth_requestAccounts' });
      await onNet(eth, s.net);
      var hash = await eth.request({ method: 'eth_sendTransaction', params: [{
        from: acc[0], to: s.net.usdc, value: '0x0', data: transferData(to, s.cents) }] });
      lastTx = { s: s, hash: hash, url: s.net.explorer + '/tx/' + hash };
      try { await signPay(eth, acc[0], lastTx); }
      catch (e) { noSig(lastTx, e && e.code === 4001 ? 'Signature declined: the USDC are sent, but without it we cannot match them to you.' : ''); return; }
      claim(lastTx, 0);
    } catch (e) {
      say(e && e.code === 4001 ? 'Cancelled in the wallet: nothing was sent.' : 'The wallet stopped: ' + ((e && e.message) || e));
    } finally {
      busy = false; $('co-mm').disabled = false;
    }
  }

  // The hash is public: the wallet that paid signs the email and the hash, so the licence goes to who paid
  function payMessage(hash) {
    return 'Phisys payment\nemail: ' + email().toLowerCase().replace(/\s+/g, '') + '\ntx: ' + hash.toLowerCase();
  }
  function hexUtf8(t) {
    return '0x' + Array.prototype.map.call(new TextEncoder().encode(t), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  async function signPay(eth, from, tx) {
    say('Sent. Now sign in your wallet: it confirms the payment is yours (no cost, nothing moves).', tx.url);
    tx.sig = await eth.request({ method: 'personal_sign', params: [hexUtf8(payMessage(tx.hash)), from] });
  }
  function noSig(tx, why) {
    $('co-receipt').hidden = false;
    say((why || 'Without the wallet’s signature we cannot match the payment to you.') + ' Send us the receipt and the licence key follows.', tx.url);
  }

  // The transfer, handed to phisys.app: it waits for the block, checks address, network and amount, and answers
  // with the licence issued (or renewed). Until it answers, the receipt leaves by email as before.
  function claim(tx, tries) {
    var s = tx.s;
    say(tries ? 'Waiting for the network to confirm the transfer…' : 'Sent. Checking the transfer on ' + s.net.name + '…', tx.url);
    var body = { email: email().toLowerCase().replace(/\s+/g, ''), country: $('co-country').value, seen: seen || '', tv: $('co-tv').value.trim(),
                 plan: s.plan, months: s.months, net: radio('net') || 'arbitrum', tx: tx.hash.toLowerCase(), eur: s.eur, cents: s.cents,
                 rate: rate, rateDate: rateDate, sig: tx.sig || '', ref: s.refOk ? REF : '' };
    fetch(PAY_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { code: r.status, j: j }; }); })
      .then(function (x) {
        if (x.code === 202 && tries < 18) { setTimeout(function () { claim(tx, tries + 1); }, 10000); return; }
        if (x.j && x.j.ok) {
          say(x.j.message || ('Paid. Your licence code is on its way to ' + email() + '.'), tx.url);
          $('co-status').classList.add('hit');
          try { if (window.umami) window.umami.track('paid', { plan: s.plan, months: s.months }); } catch (e) {}
          return;
        }
        throw new Error((x.j && x.j.message) || 'not checked');
      })
      .catch(function (e) {
        $('co-receipt').hidden = false;
        say('Sent: ' + usdc(s.cents) + ' on ' + s.net.name + '. ' + (e && e.message && e.message !== 'Failed to fetch' && e.message !== 'not checked' ? e.message + ' ' : '') +
            'Send us the receipt and the licence key follows.', tx.url);
      });
  }

  // Paid from a wallet outside this browser: the transaction's hash does the same
  function claimHash() {
    var h = ($('co-tx').value || '').trim(), s = state();
    var m = h.match(/0x[0-9a-fA-F]{64}/);
    if (!m) { say('Paste the transaction hash: 0x and 64 characters, from your wallet or the explorer.'); $('co-tx').focus(); return; }
    var tx = lastTx = { s: s, hash: m[0], url: s.net.explorer + '/tx/' + m[0] };
    var eth = window.ethereum;
    if (!eth || !eth.request) { noSig(tx, 'To check it here, open this page where the wallet that paid is connected.'); return; }
    eth.request({ method: 'eth_requestAccounts' })
      .then(function (acc) { return signPay(eth, acc[0], tx); })
      .then(function () { claim(tx, 0); })
      .catch(function (e) { noSig(tx, e && e.code === 4001 ? 'Signature declined.' : ''); });
  }

  function payCard() {
    var s = state(), link = ((cfg()[s.refOk ? 'stripe_ref' : 'stripe'] || {})[s.plan] || {})[s.bill];
    if (link && /^https:\/\/buy\.stripe\.com\//.test(link)) {
      location.href = link + (link.indexOf('?') < 0 ? '?' : '&') + 'prefilled_email=' + encodeURIComponent(email());
      return;
    }
    mail('Pay by card: ' + s.p.name + ', ' + (s.bill === 'y' ? 'yearly' : 'monthly'), lines(s),
         'Sent: we write back by email with the card link.', 'Your mail app opens with the request: we write back with the card link.');
  }

  function freeStart() {
    var s = state();
    if (s.plan === 'novice') {
      // Novice is the monthly report: the same list, the same confirmation email; the TradingView username rides along
      var tv = $('co-tv').value.trim();
      if (!tv) { say('Write your TradingView username: Novice is the report plus our invite-only scripts there. For the report alone, use the form below.'); $('co-tv').focus(); return; }
      if (window.abacoSubscribe) window.abacoSubscribe($('co-email'), $('co-status'), 'novice', { TV_USERNAME: tv },
        'Almost there: check your inbox and click the link to confirm. Access to the invite-only scripts follows for ' + tv + '.', window.abacoNovice);
      return;
    }
    var el = $('co-addr'), a = el.value.trim();
    el.setAttribute('aria-invalid', isAddr(a) ? 'false' : 'true');
    if (!isAddr(a)) { say('Write the Hyperliquid address you opened through our link: 0x and 40 characters.'); el.focus(); return; }
    checkRef(s, a);
  }

  // The referral, read in the browser from Hyperliquid's own record: the address must have been opened with our
  // code. The discount then shows in both prices; phisys.app checks the same record again before it issues the licence.
  function checkRef(s, a) {
    say('Checking the referral on Hyperliquid…');
    fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ type: 'referral', user: a.toLowerCase() }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var code = j && j.referredBy && j.referredBy.code;
        if (!code || String(code).toUpperCase() !== 'PHISYS') {
          REF = null; render();
          say('This address was not opened with the Abaco referral link. Check it, or untick the box to pay the full price.');
          return;
        }
        REF = a.toLowerCase(); render();
        say('Referral confirmed: 15% off, for as long as you subscribe. Choose how to pay below.');
        $('co-status').classList.add('hit');
      })
      .catch(function () {
        mail('Referral discount: ' + s.p.name, lines(s, ['Hyperliquid address: ' + a]),
             'Hyperliquid did not answer: we check the referral and write back to ' + email() + ' with your discounted link.',
             'Hyperliquid did not answer. Your mail app opens: we check the referral and write back with your discounted link.');
      });
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
    fillCountries();
    lookCountry();
    var bill = q.get('bill') === 'y' ? 'y' : 'm';
    setRadio('plan', PLANS[q.get('plan')] ? q.get('plan') : 'adept');
    setRadio('bill', bill);
    setRadio('months', bill === 'y' ? '12' : '1');
    // a renewal reminder links here with the plan, the months and the email filled in
    if (/^(1|3|12)$/.test(q.get('months') || '')) setRadio('months', q.get('months'));
    if (q.get('email')) $('co-email').value = q.get('email');

    $('co').addEventListener('change', function (e) {
      var n = e.target.name;
      if (n === 'bill') setRadio('months', radio('bill') === 'y' ? '12' : '1');
      if (n === 'months') setRadio('bill', radio('months') === '12' ? 'y' : 'm');
      render();
    });
    $('co').addEventListener('submit', function (e) { e.preventDefault(); });
    if ($('co-card')) $('co-card').addEventListener('click', function (e) { e.preventDefault(); if (needEmail()) payCard(); });
    $('co-mm').addEventListener('click', function () { if (!busy && needEmail()) payUsdc(); });
    $('co-check').addEventListener('click', function () { if (needEmail()) claimHash(); });
    $('co-free').addEventListener('click', function () { if (needEmail()) freeStart(); });
    $('co-send').addEventListener('click', function () {
      if (!lastTx) return;
      var s = lastTx.s;
      mail('USDC receipt: ' + s.p.name + ', ' + months(s.months),
           lines(s, ['Months: ' + s.months, 'Network: ' + s.net.name, 'Amount: ' + usdc(s.cents), 'Transaction: ' + lastTx.url]),
           'Sent: we check the transfer and your licence code reaches ' + email() + '.');
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
