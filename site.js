/* Abaco site, version 3: one moving drawing at a time, the demo widgets, the copy button. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // The address never appears whole in the files: harvesters read the HTML and the scripts.
  var MAIL = atob('Y2lhby5hYmFjb0BnbWFpbC5jb20=');

  ready(function () {
    document.querySelectorAll('[data-mail]').forEach(function (n) { n.textContent = MAIL; });

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
      anims.forEach(function (a) { a.classList.toggle('play', a === best); });
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
          var user = f.querySelector('input[type="text"]');
          var name = user ? user.value.trim() : '';
          if (!name) { if (s) s.textContent = 'Write your TradingView username first.'; if (user) user.focus(); return; }
          location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('TradingView access') +
            '&body=' + encodeURIComponent('Please add me to the Abaco invite-only scripts.\nTradingView username: ' + name +
            '\nEmail: ' + (who || '-'));
          if (s) s.textContent = 'Your mail app opens with the request: send it and we add you.';
          return;
        }
        location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Monthly report') +
          '&body=' + encodeURIComponent('Please send the monthly report to ' + (who || 'this address') + '.');
        if (s) { s.hidden = false; s.textContent = 'Your mail app opens with the request: send it and you are on the list.'; }
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
