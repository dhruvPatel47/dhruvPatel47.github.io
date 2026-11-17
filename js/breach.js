/* ============================================================
   Breach — page chrome: incident HUD, stage tracking, reveals,
   counters, clock and the visitor "source profile".
   Scroll work is one passive listener + one rAF per frame at most,
   and the DOM is only written when a value actually changes.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };

  /* ---------- stage tracking ---------- */
  var stages = [], tops = [], stageF = 0, ticking = false;
  var chain = [], statusEl = null, lastStatus = '';

  function measure() {
    var y = window.scrollY || window.pageYOffset;
    tops = stages.map(function (s) { return s.getBoundingClientRect().top + y; });
    tops.push(document.documentElement.scrollHeight);
    update();
  }

  function update() {
    ticking = false;
    if (!tops.length) return;
    var y = window.scrollY || window.pageYOffset;
    var ref = y + window.innerHeight * 0.45;
    var i = 0;
    while (i < stages.length - 1 && ref >= tops[i + 1]) i++;
    var span = Math.max(1, tops[i + 1] - tops[i]);
    var f = clamp(i + (ref - tops[i]) / span, 0, stages.length - 1);
    // At the very bottom the last section may be too short to reach the
    // reference line, so the incident would never read as closed.
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) f = stages.length - 1;
    stageF = f;
    window.__stageF = f;

    var cur = Math.floor(f + 1e-6);
    chain.forEach(function (a) {
      var k = a.k;
      var fill = Math.round(clamp(f - (k - 1), 0, 1) * 100) / 100;
      if (fill !== a.fill) { a.el.style.setProperty('--f', fill); a.fill = fill; }
      var cls = k < cur ? 'done' : (k === cur ? 'cur' : '');
      if (cls !== a.cls) {
        a.el.classList.toggle('done', cls === 'done');
        a.el.classList.toggle('cur', cls === 'cur');
        a.cls = cls;
      }
    });

    var st = f >= 5.5 ? 'closed' : (f >= 4.5 ? 'contained' : 'active');
    if (st !== lastStatus && statusEl) {
      lastStatus = st;
      statusEl.dataset.s = st;
      statusEl.textContent = st.toUpperCase();
      document.body.classList.toggle('closed', st === 'closed');
    }
    if (window.__net && window.__net.setStage) window.__net.setStage(f);
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  function initStages() {
    stages = $$('main .stage');
    statusEl = $('#hud-status');
    chain = $$('#chain a').map(function (el) { return { el: el, k: +el.dataset.i, fill: -1, cls: null }; });
    window.addEventListener('scroll', onScroll, { passive: true });
    var t;
    var re = function () { clearTimeout(t); t = setTimeout(measure, 150); };
    window.addEventListener('resize', re);
    window.addEventListener('load', measure);
    // Lab feeds and diagram panes change height as people use them.
    if ('ResizeObserver' in window) new ResizeObserver(re).observe(document.querySelector('main'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  }

  /* ---------- reveals ---------- */
  function initReveal() {
    var els = $$('.stage .wrap > *');
    if (reduce || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- counters ---------- */
  function initCounters() {
    var cs = $$('.counter');
    function run(c) {
      var target = parseInt(c.getAttribute('data-target'), 10) || 0;
      if (reduce) { c.textContent = target; return; }
      var t0 = performance.now(), dur = 1400;
      (function step(now) {
        var p = Math.min((now - t0) / dur, 1);
        c.textContent = Math.round(target * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    if (!('IntersectionObserver' in window)) { cs.forEach(function (c) { c.textContent = c.dataset.target; }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    cs.forEach(function (c) { io.observe(c); });
  }

  /* ---------- clock + year ---------- */
  function initClock() {
    var el = $('#clock');
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-CA', { hour12: false, timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch (e) { fmt = null; }
    if (el && fmt) {
      (function tick() {
        el.textContent = fmt.format(new Date()) + ' TOR';
        setTimeout(tick, 1000);
      })();
    }
    var yr = $('#year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ---------- source profile: only what the browser already exposes ---------- */
  function initProfile() {
    var box = $('#srcprof');
    if (!box) return;
    var ua = navigator.userAgent || '';
    var client = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
               : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Unknown';
    var m = ua.match(/(Edg|OPR|Firefox|Chrome|Version)\/(\d+)/);
    if (m && client !== 'Unknown') client += ' ' + m[2];
    var os = /Windows NT/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android'
           : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS'
           : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var ref = 'Direct';
    try { if (document.referrer) ref = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
    var vals = {
      client: client, os: os,
      screen: screen.width + '×' + screen.height,
      tz: tz || 'Hidden', lang: (navigator.language || '—'), ref: ref
    };
    $$('dd[data-k]', box).forEach(function (dd) { dd.textContent = vals[dd.dataset.k] || '—'; });
  }

  /* ---------- console note for anyone who opens dev tools ---------- */
  function consoleNote() {
    try {
      console.log('%c DEFENSE LOG %c Recon noted: you opened the console. The source is readable on purpose: github.com/dhruvPatel47/dhruvPatel47.github.io',
        'background:#39f3bb;color:#04060a;font-weight:700;padding:2px 6px', 'color:#9aa6b2');
    } catch (e) {}
  }

  function init() {
    initStages(); initReveal(); initCounters(); initClock(); initProfile(); consoleNote();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
