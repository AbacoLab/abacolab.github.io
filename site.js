/* Abaco site, version 3: one moving drawing at a time, the demo widgets, the copy button. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // The address never appears whole in the files: harvesters read the HTML and the scripts.
  var MAIL = atob('YWJhY29AcGhpc3lzLmFwcA==');

  // Monthly report: the address goes to the mailing list (Brevo), which asks for a confirmation by email.
  var LIST = 'https://35dd6c9c.sibforms.com/serve/MUIFAEFhO9EZELir6NqGhKsngp3EXFMzBvMjPDtG9MMZLekzKFx8e1N-hRSxwh7QCAszshEdR6L0g5EHMMFi5AUza7EM6RaMdH_5t4cSm6Hjl2PixzHbtVUJHatXateY7UetuI_fnTcyPeBJDFapIwg5ZP02HF34vgnTyMGF373F-hYhME1FmWZ5zsrh_CCMzfp3rBSXydwVDGwhCA==';
  function subscribe(input, s, from, extra, done, url) {
    var who = input ? input.value.trim() : '';
    var say = function (t, cls) { if (s) { s.hidden = false; s.textContent = t; s.classList.remove('hit', 'miss'); if (cls) s.classList.add(cls); } };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(who)) { say('That email does not look right.', 'miss'); if (input) input.focus(); return; }
    say('Sending…');
    var body = new FormData(); body.append('EMAIL', who); body.append('email_address_check', ''); body.append('locale', 'en');   // as Brevo's own form sends it
    Object.keys(extra || {}).forEach(function (k) { if (extra[k]) body.append(k, extra[k]); });
    fetch((url || LIST) + '?isAjax=1', { method: 'POST', body: body }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.success) throw new Error('refused');
      say(done || 'Almost there: check your inbox and click the link to confirm.', 'hit');
      if (input && !done) input.value = '';
      try { if (window.umami) window.umami.track('newsletter', { from: from || '' }); } catch (e) { /* counting is optional */ }
    }).catch(function () { say('It did not go through. Try again in a minute.', 'miss'); });
  }
  window.abacoSubscribe = subscribe;
  // Novice has its own form on the mailing list: its own confirmation email, the TradingView username required
  var NOVICE = 'https://35dd6c9c.sibforms.com/serve/MUIFAH4m-LrUUpCpM1t9H2eMAYbGePtQDCynUQEwgq1qh5CEqMSSvTSioig_JMrKRlVj3cC394ED_qGtGbfuMaWCWf2WMxqJUXTFljt7p5GTRPD8XABKa_X5ZfJ3qYJBkznLfvVj5lUXmBIyzw-LwYzOcYGqkS_jkqjD_V_f2ECVZ0T5k_46s50ctGduATGx9wl_9yIutIVgvGTxew==';
  window.abacoNovice = NOVICE;

  ready(function () {
    document.querySelectorAll('[data-mail]').forEach(function (n) { n.textContent = MAIL; });
    // Reels: arrows on the sides, a fade where more waits, drag with the mouse, and one small nudge the first time one is seen
    document.querySelectorAll('.reel').forEach(function (reel) {
      var wrap = document.createElement('div'); wrap.className = 'reel-wrap';
      reel.parentNode.insertBefore(wrap, reel); wrap.appendChild(reel);
      var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var prev = document.createElement('button'), next = document.createElement('button');
      prev.type = next.type = 'button'; prev.className = 'reel-btn prev'; next.className = 'reel-btn next';
      prev.setAttribute('aria-label', 'Previous'); next.setAttribute('aria-label', 'Next');
      prev.innerHTML = next.innerHTML = arrow;
      wrap.appendChild(prev); wrap.appendChild(next);
      function step() { var f = reel.querySelector('figure'); return f ? f.getBoundingClientRect().width + 16 : reel.clientWidth * 0.8; }
      function mid() { var sh = reel.querySelector('.shot'); if (sh) wrap.style.setProperty('--mid', (sh.offsetTop - reel.offsetTop + sh.offsetHeight / 2) + 'px'); }
      function state() {
        var max = reel.scrollWidth - reel.clientWidth - 2;
        wrap.classList.toggle('at-start', reel.scrollLeft <= 2);
        wrap.classList.toggle('at-end', reel.scrollLeft >= max);
      }
      prev.addEventListener('click', function () { reel.scrollBy({ left: -step(), behavior: 'smooth' }); });
      next.addEventListener('click', function () { reel.scrollBy({ left: step(), behavior: 'smooth' }); });
      reel.addEventListener('scroll', state, { passive: true });
      window.addEventListener('resize', function () { mid(); state(); });
      reel.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
      });
      // drag with the mouse; a drag is not a click on the picture
      var down = false, x0 = 0, s0 = 0, moved = false;
      reel.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = reel.scrollLeft; });
      window.addEventListener('pointermove', function (e) {
        if (!down) return; var dx = e.clientX - x0;
        if (Math.abs(dx) > 5) { moved = true; wrap.classList.add('dragging'); }
        if (moved) reel.scrollLeft = s0 - dx;
      });
      window.addEventListener('pointerup', function () { if (!down) return; down = false; wrap.classList.remove('dragging'); });
      reel.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
      reel.addEventListener('dragstart', function (e) { e.preventDefault(); });
      mid(); state();
      reel.querySelectorAll('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', mid, { once: true }); });
      // the nudge: once a page, small, when the first reel comes into view, so the eye sees there is more to the right
      if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            if (!en.isIntersecting) return; io.disconnect();
            if (window.abacoNudged || reel.scrollLeft > 2 || reel.scrollWidth <= reel.clientWidth) return;
            window.abacoNudged = true;   // one nudge per page, on the first reel seen
            setTimeout(function () { reel.scrollBy({ left: 40, behavior: 'smooth' }); setTimeout(function () { reel.scrollTo({ left: 0, behavior: 'smooth' }); }, 500); }, 400);
          });
        }, { threshold: 0.6 });
        io.observe(reel);
      }
    });
    // TradingView: one picture, three strategies — the tabs and the names in the list choose which
    document.querySelectorAll('[data-swapbox]').forEach(function (box) {
      var row = box.closest('.tvrow') || document;
      function show(k) {
        box.querySelectorAll('img[data-pane]').forEach(function (im) { im.hidden = im.getAttribute('data-pane') !== k; });
        row.querySelectorAll('[data-swap]').forEach(function (el) {
          var on = el.getAttribute('data-swap') === k; el.classList.toggle('on', on);
          if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', String(on));
        });
      }
      row.querySelectorAll('[data-swap]').forEach(function (el) {
        el.addEventListener('click', function () { show(el.getAttribute('data-swap')); });
        if (el.tagName === 'LI') { el.tabIndex = 0; el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(el.getAttribute('data-swap')); } }); }
      });
    });
    // Every picture of the work opens large: click or Enter to open, click, Esc or × to close
    (function () {
      var pics = Array.prototype.filter.call(document.querySelectorAll('main img'), function (im) {
        return /(^|\/)img\//.test(im.getAttribute('src') || '') && !im.closest('a') && !im.classList.contains('phi-inline') && !im.classList.contains('phisys-mark');
      });
      if (!pics.length) return;
      var box = document.createElement('div'), big = document.createElement('img'), x = document.createElement('button');
      box.className = 'zoom'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      x.type = 'button'; x.className = 'zoom-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
      box.appendChild(big); box.appendChild(x); document.body.appendChild(box);
      var back = null;
      function close() { box.hidden = true; big.removeAttribute('src'); document.documentElement.classList.remove('zoomed'); if (back) back.focus(); }
      function open(im) { back = im; big.src = im.currentSrc || im.src; big.alt = im.alt || ''; box.hidden = false; document.documentElement.classList.add('zoomed'); x.focus(); }
      pics.forEach(function (im) {
        im.classList.add('zoomable'); im.tabIndex = 0;
        im.addEventListener('click', function () { open(im); });
        im.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(im); } });
      });
      box.addEventListener('click', close);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
    })();
    document.querySelectorAll('a[data-mailto]').forEach(function (a) { a.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(a.getAttribute('data-mailto')); });

    // The hero lockup: its three lines start and end on the same verticals. Letter-spacing closes the gap,
    // and the glyphs' side bearings come from a canvas, so the ink lines up and not just the boxes.
    var lockup = document.querySelector('.hero-claim');
    if (lockup && document.fonts && window.CanvasRenderingContext2D) {
      var lines = ['.l1', '.l2', '.chain'].map(function (q) { return lockup.querySelector(q); });
      var ctx = document.createElement('canvas').getContext('2d');
      var ink = function (el) {
        var cs = getComputedStyle(el), t = el.textContent, rg = document.createRange();
        rg.selectNodeContents(el);
        var b = rg.getBoundingClientRect();
        ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        var first = ctx.measureText(t.charAt(0)), last = ctx.measureText(t.charAt(t.length - 1));
        var ls = parseFloat(cs.letterSpacing) || 0;
        return { left: b.left - first.actualBoundingBoxLeft, right: b.right - ls - (last.width - last.actualBoundingBoxRight), ls: ls, n: t.length };
      };
      var align = function () {
        lines.forEach(function (el) { el.style.letterSpacing = ''; el.style.marginLeft = ''; });
        var a = ink(lines[0]), w = a.right - a.left;
        lines.slice(1).forEach(function (el) {
          var m = ink(el);
          el.style.letterSpacing = (m.ls + (w - (m.right - m.left)) / (m.n - 1)) + 'px';
          el.style.marginLeft = (a.left - m.left) + 'px';
        });
      };
      document.fonts.ready.then(function () {
        align();
        if (window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(align); }).observe(lockup);
        else window.addEventListener('resize', function () { requestAnimationFrame(align); });
      });
    }

    // Only the drawing nearest the middle of the screen moves; every other one rests.
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var anims = Array.prototype.slice.call(document.querySelectorAll('.anim'));
    var queued = false;
    function pick() {
      queued = false;
      if (reduce.matches) {
        anims.forEach(function (a) { a.classList.remove('play'); });
        return;
      }
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var best = null, bestD = Infinity;
      anims.forEach(function (a) {
        var r = a.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom <= 0 || r.top >= vh) return;
        var d = Math.abs((r.top + r.bottom) / 2 - vh / 2);
        if (d < bestD) { bestD = d; best = a; }
      });
      // the drawings on the same row as the nearest one move with it
      var row = best ? best.getBoundingClientRect() : null;
      anims.forEach(function (a) {
        var r = a.getBoundingClientRect();
        a.classList.toggle('play', !!row && (a === best || (r.width > 0 && Math.abs(r.top - row.top) < 60)));
      });
    }
    function queue() {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || setTimeout)(pick);
    }
    if (anims.length) {
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', queue);
      if (reduce.addEventListener) reduce.addEventListener('change', pick);
      pick();
      setTimeout(pick, 400);
    }

    // The 24-hour ring: the current UTC hour in copper.
    try {
      var h = new Date().getUTCHours();
      document.querySelectorAll('.ring circle[data-h]').forEach(function (c) {
        var on = +c.getAttribute('data-h') === h;
        c.setAttribute('class', on ? 'f-cu' : 'f-b3');
        c.setAttribute('r', on ? '5' : '2.6');
      });
      document.querySelectorAll('[data-utc]').forEach(function (n) {
        n.textContent = (h < 10 ? '0' : '') + h + ' UTC';
      });
    } catch (e) {}

    // Book switches (demo).
    document.querySelectorAll('.sw').forEach(function (b) {
      b.addEventListener('click', function () {
        b.setAttribute('aria-checked', b.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      });
    });

    // Forms: no server behind the site, so the request leaves as an email.
    document.querySelectorAll('form[data-mock]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var s = document.getElementById(f.getAttribute('data-mock'));
        var input = f.querySelector('input[type="email"]');
        var who = input ? input.value.trim() : '';
        if (f.getAttribute('data-kind') === 'tv') {
          // The invite-only scripts are Novice: the request joins the mailing list with its username, as the checkout does
          var user = f.querySelector('input[type="text"]');
          var name = user ? user.value.trim() : '';
          if (!name) { if (s) s.textContent = 'Write your TradingView username first.'; if (user) user.focus(); return; }
          subscribe(input, s, 'tv', { TV_USERNAME: name },
            'Almost there: check your inbox and click the link to confirm. Access to the invite-only scripts follows for ' + name + '.', NOVICE);
          return;
        }
        if (f.getAttribute('data-kind') === 'beta') {
          // The beta: phisys.app makes the licence and Brevo sends its code (`edge.mjs`, `betaJoin`)
          var say = function (t, cls) { if (s) { s.hidden = false; s.textContent = t; s.classList.remove('hit', 'miss'); if (cls) s.classList.add(cls); } };
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(who)) { say('That email does not look right.', 'miss'); if (input) input.focus(); return; }
          var tvIn = f.querySelector('input[type="text"]:not([name="website"])'), trap = f.querySelector('input[name="website"]');
          say('Making your licence…');
          fetch('https://phisys.app/beta/join', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: who, tv: tvIn ? tvIn.value.trim() : '', website: trap ? trap.value : '' }) })
            .then(function (r) { return r.json(); }).then(function (j) {
              if (!j || !j.ok) { say((j && j.error) || 'It did not go through. Try again in a minute.', 'miss'); return; }
              say('Done: your licence code is on its way to ' + who + '. Check your inbox (and spam) and open phisys.app.', 'hit');
              try { if (window.umami) window.umami.track('beta', { from: 'pricing' }); } catch (e) { /* counting is optional */ }
            }).catch(function () { say('It did not go through. Try again in a minute.', 'miss'); });
          return;
        }
        subscribe(input, s, f.id || f.getAttribute('data-mock'));
      });
    });

    // Copy the address; fall back to selecting it.
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      var target = document.getElementById(btn.getAttribute('data-copy'));
      var label = btn.querySelector('.lb');
      if (!target) return;
      btn.addEventListener('click', function () {
        function select() {
          try {
            var r = document.createRange(); r.selectNodeContents(target);
            var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
            if (label) label.textContent = 'Selected';
          } catch (e) {}
        }
        try {
          navigator.clipboard.writeText(target.textContent.trim()).then(function () {
            if (label) label.textContent = 'Copied';
          }, select);
        } catch (e) { select(); }
      });
    });

    // Home: the Phisys carousel. One screen at a time, every 5 s; it rests while hovered, out of sight or when motion is reduced.
    var car = document.querySelector('.carousel');
    if (car) {
      var track = car.querySelector('.track'), slides = car.querySelectorAll('.slide');
      var dotsC = document.querySelectorAll('.car-dots .dot'), at = 0, timer = null, hover = false, seen = true;
      function show(n) {
        at = (n + slides.length) % slides.length;
        track.style.transform = 'translateX(' + (-100 * at) + '%)';
        slides.forEach(function (s, k) { if (k === at) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); });
        dotsC.forEach(function (d, k) { d.classList.toggle('on', k === at); if (k === at) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      }
      function run() {
        clearInterval(timer); timer = null;
        if (!hover && seen && !document.hidden && !reduce.matches) timer = setInterval(function () { show(at + 1); }, 5000);
      }
      dotsC.forEach(function (d, k) { d.addEventListener('click', function () { show(k); run(); }); });
      car.addEventListener('mouseenter', function () { hover = true; run(); });
      car.addEventListener('mouseleave', function () { hover = false; run(); });
      document.addEventListener('visibilitychange', run);
      if (window.IntersectionObserver) new IntersectionObserver(function (e) { seen = e[0].isIntersecting; run(); }).observe(car);
      var x0 = null;
      car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      car.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) { show(at + (dx < 0 ? 1 : -1)); run(); }
      });
      run();
    }

    // The beta's places: phisys.app counts the beta licences (/beta/seats → {taken, total}). The page's own count if it is silent.
    var seats = document.querySelector('.seats');
    if (seats) {
      // the count stays hidden until phisys.app answers, so that it never jumps; after 2.5 s the page's own count shows
      seats.classList.add('wait');
      var shown = setTimeout(function () { seats.classList.remove('wait'); }, 2500);
      fetch('https://phisys.app/beta/seats').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j || typeof j.taken !== 'number') return;
        var total = j.max || j.total || 30, taken = Math.min(j.taken, total);
        var dots = seats.querySelectorAll('.dots i');
        dots.forEach(function (d, k) { d.classList.toggle('on', k < taken); });
        var b = seats.querySelector('p b'); if (b) b.textContent = taken;
        seats.setAttribute('aria-label', taken + ' of ' + total + ' places taken');
        if (taken >= total || j.full) { var p = seats.querySelector('p'); if (p) p.textContent = 'The beta is full'; }
      }).catch(function () { /* the page's own count stands */ }).then(function () { clearTimeout(shown); seats.classList.remove('wait'); });
    }

    // Prices: phisys.app's table, the one the payments are checked against (/pay/prices). The page's own stand if it is silent.
    if (document.querySelector('.tier .price[data-m], .plan .pp')) {
      fetch('https://phisys.app/pay/prices').then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok || !j.eur) return;
        var eu = function (n) { return '€' + (n % 1 ? n.toFixed(2) : n.toLocaleString('en-US')); };
        document.querySelectorAll('.tier').forEach(function (t) {
          var h = t.querySelector('.tname'), e = h && j.eur[h.textContent.trim().toLowerCase()];
          var pr = t.querySelector('.price[data-m]'), sub = t.querySelector('.price-sub[data-m]');
          if (!e || !pr) return;
          var byEl = document.getElementById('bill-y'), mode = byEl && byEl.getAttribute('aria-pressed') === 'true' ? 'y' : 'm';
          pr.setAttribute('data-m', eu(e.month)); pr.setAttribute('data-y', eu(e.year));
          pr.firstChild.nodeValue = pr.getAttribute('data-' + mode);
          if (sub) {
            sub.setAttribute('data-m', 'or ' + eu(e.year) + ' a year');
            sub.setAttribute('data-y', 'that is ' + eu(Math.round(e.year / 12 * 100) / 100) + ' a month');
            sub.textContent = sub.getAttribute('data-' + mode);
          }
        });
        document.querySelectorAll('.plan').forEach(function (a) {
          var n = a.querySelector('.pn'), pp = a.querySelector('.pp'), e = n && j.eur[n.textContent.trim().toLowerCase()];
          if (e && pp && pp.firstChild && pp.firstChild.nodeType === 3) pp.firstChild.nodeValue = eu(e.month);
        });
      }).catch(function () { /* the prices written in the page stand */ });
    }

    // Pricing: monthly or yearly.
    var bm = document.getElementById('bill-m'), by = document.getElementById('bill-y');
    if (bm && by) {
      var set = function (mode) {
        bm.setAttribute('aria-pressed', String(mode === 'm'));
        by.setAttribute('aria-pressed', String(mode === 'y'));
        document.querySelectorAll('.price[data-m]').forEach(function (el) {
          var small = el.querySelector('small');
          el.firstChild.nodeValue = el.getAttribute('data-' + mode);
          if (small) small.textContent = small.getAttribute('data-' + mode);
        });
        document.querySelectorAll('.price-sub[data-m]').forEach(function (el) {
          el.textContent = el.getAttribute('data-' + mode);
        });
        document.querySelectorAll('a[data-plan]').forEach(function (a) {
          var p = a.getAttribute('data-plan');
          a.setAttribute('href', 'checkout.html?plan=' + p + (p === 'novice' ? '' : '&bill=' + mode));
        });
      };
      bm.addEventListener('click', function () { set('m'); });
      by.addEventListener('click', function () { set('y'); });
    }
  });
})();
