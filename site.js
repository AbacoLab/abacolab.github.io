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
