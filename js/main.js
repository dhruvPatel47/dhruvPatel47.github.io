/* ============================================================
   Dhruv Patel — portfolio
   Vanilla JS, no dependencies, no build step.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var ACID = '#ccff00';

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  /* ---------------------------------------------------------
     1. Preloader
     --------------------------------------------------------- */
  function initLoader() {
    var loader = $('#loader'), num = $('#loader-num'),
        fill = $('#loader-fill'), status = $('#loader-status');
    if (!loader) return;

    var steps = ['INITIALISING', 'MOUNTING /PROFILE', 'RESOLVING TOPOLOGY',
                 'LOADING ARCHITECTURE', 'READY'];
    var pct = 0;

    function done() {
      loader.classList.add('done');
      document.body.classList.remove('is-loading');
      document.documentElement.classList.add('ready');
      // Hero type animates in only once the curtain is actually lifting.
      setTimeout(function () { $$('.hero [data-scramble]').forEach(scramble); }, 120);
    }

    if (reduceMotion) { done(); return; }

    var timer = setInterval(function () {
      // Uneven increments read as real work rather than a fake progress bar.
      pct += Math.random() * 14 + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(timer);
        setTimeout(done, 380);
      }
      var p = Math.floor(pct);
      if (num) num.textContent = p < 10 ? '0' + p : String(p);
      if (fill) fill.style.width = p + '%';
      if (status) status.textContent = steps[Math.min(Math.floor(p / 25), steps.length - 1)];
    }, 130);

    // Never let a stalled timer trap the page.
    setTimeout(function () { clearInterval(timer); done(); }, 4200);
  }

  /* ---------------------------------------------------------
     3b. Fit the giant type edge to edge
     --------------------------------------------------------- */
  var scrambling = 0;

  function fitGiant() {
    // Measuring mid-scramble would size the line to decoding glyphs.
    if (scrambling > 0) return;
    $$('.giant').forEach(function (el) {
      var parent = el.parentElement;
      if (!parent) return;
      var avail = parent.clientWidth;
      if (!avail) return;

      // Measure at a known size, then scale so the line spans the column.
      // max-width must come off first: at the probe size the line overflows,
      // and a clamped box reports its clamped width, not the text's real one.
      el.style.maxWidth = 'none';
      el.style.fontSize = '100px';
      var natural = el.getBoundingClientRect().width;
      el.style.maxWidth = '';

      if (!natural) { el.style.fontSize = ''; return; }

      var size = 100 * (avail / natural);
      // A short line on an ultrawide monitor would otherwise set type taller
      // than the screen. Capping costs a little rag on the right; worth it.
      size = Math.min(size, window.innerHeight * 0.62);
      // Floor keeps a sub-pixel rounding error from forcing an overflow.
      el.style.fontSize = Math.floor(size * 100) / 100 + 'px';
    });
  }

  function initFit() {
    // Web fonts change the metrics, so re-fit once they have landed.
    fitGiant();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitGiant);
    }
    window.addEventListener('resize', debounce(fitGiant, 140));
  }

  /* ---------------------------------------------------------
     4. Text scramble
     --------------------------------------------------------- */
  var GLYPHS = '█▓▒░#@%&$/\\<>[]{}=+*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  var SCRAMBLE_MS = 700;

  function scramble(el) {
    if (reduceMotion || el.dataset.done === '1') return;
    el.dataset.done = '1';

    var final = el.textContent;
    var len = final.length;
    if (!len) return;

    // Lock the box first: decoding glyphs are wider than the real ones and
    // would otherwise reflow the whole line on every frame.
    var w = el.getBoundingClientRect().width;
    if (w) el.style.minWidth = w + 'px';

    var starts = [], ends = [];
    for (var i = 0; i < len; i++) {
      var s = Math.random() * 0.35;
      starts.push(s);
      ends.push(s + 0.25 + Math.random() * 0.4);
    }

    var settled = false;
    scrambling++;
    function settle() {
      if (settled) return;
      settled = true;
      scrambling--;
      el.textContent = final;
      el.style.minWidth = '';
      if (scrambling === 0) fitGiant();
    }

    var t0 = performance.now();
    (function frame(now) {
      if (settled) return;
      // Driven by wall-clock, not frame count — a throttled tab must never
      // leave a visitor staring at a garbled name.
      var p = Math.min(((now || performance.now()) - t0) / SCRAMBLE_MS, 1);
      if (p >= 1) { settle(); return; }

      var out = '';
      for (var i = 0; i < len; i++) {
        var ch = final[i];
        if (ch === ' ') { out += ' '; continue; }
        if (p >= ends[i]) out += ch;
        else if (p >= starts[i]) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += ' ';
      }
      el.textContent = out;
      requestAnimationFrame(frame);
    })(t0);

    // Hard guarantee independent of requestAnimationFrame.
    setTimeout(settle, SCRAMBLE_MS + 400);
  }

  function initScramble() {
    var targets = $$('[data-scramble]').filter(function (el) { return !el.closest('.hero'); });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        scramble(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     5. Ticker
     --------------------------------------------------------- */
  function initTicker() {
    var track = $('#ticker-track');
    if (!track) return;
    var items = ['AWS', '✦', 'SERVERLESS', '✦', 'MULTI-AZ', '✦', 'SIEM', '✦', 'MITRE ATT&CK',
                 '✦', 'NIST CSF', '✦', 'INCIDENT RESPONSE', '✦', 'ZERO TRUST', '✦', 'LAMBDA',
                 '✦', 'COGNITO', '✦', 'SOC', '✦', 'THREAT HUNTING', '✦', 'ISO 27001', '✦'];
    // Rendered twice so the -50% keyframe loops seamlessly.
    var html = '';
    for (var pass = 0; pass < 2; pass++) {
      items.forEach(function (s) { html += '<span>' + s + '</span>'; });
    }
    track.innerHTML = html;
  }

  /* ---------------------------------------------------------
     6. Cursor, nav, clock, reveals, counters
     --------------------------------------------------------- */
  function initChrome() {
    var cur = $('#cursor');
    if (cur && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
      document.body.classList.add('has-cursor');
      var gx = 0, gy = 0, cx = 0, cy = 0;
      window.addEventListener('mousemove', function (e) { gx = e.clientX; gy = e.clientY; });
      (function follow() {
        cx += (gx - cx) * 0.16; cy += (gy - cy) * 0.16;
        cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
        requestAnimationFrame(follow);
      })();

      var curLabel = $('#cursor-label');
      document.addEventListener('mouseover', function (e) {
        var t = e.target.closest('[data-cursor="link"], a, button, input');
        cur.classList.toggle('on', !!t);
        if (curLabel) {
          // Nearest ancestor carrying a label wins, so a link inside a
          // labelled card still shows the card's verb.
          var labelled = e.target.closest('[data-label]');
          curLabel.textContent = (t && labelled) ? labelled.getAttribute('data-label') : '';
        }
      });
    }

    var toggle = $('#nav-toggle'), links = $('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var clock = $('#clock');
    if (clock) {
      (function tick() {
        // Toronto time, since that's where he is and where the job is.
        var s = new Date().toLocaleTimeString('en-CA', {
          hour12: false, timeZone: 'America/Toronto'
        });
        clock.textContent = s + ' EST';
        setTimeout(tick, 1000);
      })();
    }

    var yr = $('#year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  function initScroll() {
    // Everything inside a section reveals on scroll except the hero,
    // which the preloader hands over already visible.
    $$('.section .wrap > *, .room-content > *, .ticker').forEach(function (el) {
      el.classList.add('rv');
    });
    var revealEls = $$('.rv');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e, i) {
          if (!e.isIntersecting) return;
          setTimeout(function () { e.target.classList.add('in'); }, i * 65);
          io.unobserve(e.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }

    var counters = $$('.counter'), done = [];
    function runCounters() {
      counters.forEach(function (c) {
        if (done.indexOf(c) > -1) return;
        if (c.getBoundingClientRect().top > window.innerHeight - 40) return;
        done.push(c);
        var target = parseInt(c.getAttribute('data-target'), 10) || 0;
        if (reduceMotion) { c.textContent = target; return; }
        var start = performance.now(), dur = 1600;
        (function step(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          c.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    }

    var sections = $$('main section[id]');
    var navLinks = $$('.nav-links a[data-nav]');
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      var current = '';
      sections.forEach(function (s) { if (y >= s.offsetTop - 160) current = s.id; });
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
      runCounters();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------
     7. Project data
     --------------------------------------------------------- */
  var PROJECTS = {
    easyshop: {
      file: 'easyshop-architecture.svg',
      blurb: 'A fully serverless e-commerce platform on AWS — browse, register, pay by card, get a receipt. ' +
             'No servers to manage anywhere in it. Step through the flow below to follow a real request.',
      meta: [
        ['Region', 'us-east-2 (Ohio) · 2 AZs'],
        ['Network', 'Custom VPC 10.0.0.0/16 · 4 subnets'],
        ['Compute', '11 Lambda functions · Node.js 24.x'],
        ['All-time cost', '$52.71 (Sept 2025 – Apr 2026)']
      ],
      nodes: [
        { id: 'customer',  x: 15,  y: 240, label: 'Customer',    sub: 'browser',           role: 'Entry point',
          desc: 'Everything starts here over HTTPS. The browser holds the cart in localStorage and the Cognito JWT that authorizes every API call.' },
        { id: 'cloudfront',x: 165, y: 240, label: 'CloudFront',  sub: 'CDN · HTTPS',       role: 'Edge delivery',
          desc: 'Distribution dreytiaia0vyk.cloudfront.net. Serves the front end from global edge locations, terminates TLS and absorbs DDoS traffic. Origin is S3, default root object index.html.' },
        { id: 's3',        x: 165, y: 360, label: 'S3',          sub: 'static + images',   role: 'Storage',
          desc: 'Bucket easyshop-frontend-uche1 holds every HTML, CSS and JS file, plus product images uploaded by the admin. All objects encrypted at rest with SSE-S3 (AES-256).' },
        { id: 'cognito',   x: 325, y: 110, label: 'Cognito',     sub: 'user pool',         role: 'Identity',
          desc: 'User pool us-east-2_HJXtENYkU, 13 registered users. Handles registration, email verification, SRP password hashing and JWT issuance. The application never touches a raw password.' },
        { id: 'apigw',     x: 325, y: 240, label: 'API Gateway', sub: 'HTTP API · 10 routes', role: 'API layer',
          desc: 'HTTP API on the dev stage, 10 routes covering product and order CRUD, Stripe checkout, email and presigned uploads. CORS is locked to the CloudFront origin.' },
        { id: 'stripe',    x: 495, y: 45,  label: 'Stripe',      sub: 'hosted checkout',   role: 'Payments',
          desc: 'Checkout runs on Stripe\u2019s hosted page. Card numbers, CVV and billing details are entered on Stripe\u2019s PCI-compliant infrastructure and never pass through my application or database.' },
        { id: 'lambda',    x: 495, y: 240, label: 'Lambda × 11', sub: 'private subnets',   role: 'Compute',
          desc: 'Eleven single-purpose Node.js functions — products CRUD, orders CRUD, createCheckoutSession, sendConfirmationEmail, getUploadUrl. They run in private subnets and reach the internet only through NAT gateways.' },
        { id: 'cloudwatch',x: 495, y: 380, label: 'CloudWatch',  sub: '11 log groups',     role: 'Observability',
          desc: 'One log group per function. Invocations, duration, memory and errors are captured automatically — full visibility with no agent to install.' },
        { id: 'rds',       x: 680, y: 155, label: 'RDS MySQL',   sub: 'Multi-AZ · 8.4.7',  role: 'Database',
          desc: 'MySQL 8.4.7 on db.t3.micro with a standby in a second AZ for automatic failover. Two tables, products and orders. Encrypted at rest with the aws/rds KMS key, automated backups, storage autoscaling to 1000 GiB.' },
        { id: 'ses',       x: 680, y: 265, label: 'SES',         sub: 'order receipts',    role: 'Email',
          desc: 'Sends the order confirmation from a verified sender identity once payment succeeds. Triggered by the sendConfirmationEmail function, not by the client.' },
        { id: 'sns',       x: 680, y: 375, label: 'SNS',         sub: 'order topic',       role: 'Messaging',
          desc: 'Topic EasyShop-OrderTopic with a confirmed email subscription — the hook for order broadcasting and future alerting.' }
      ],
      edges: [
        ['customer','cloudfront'],['cloudfront','s3'],['cloudfront','apigw'],['cloudfront','cognito'],
        ['cognito','apigw'],['apigw','lambda'],['lambda','rds'],['lambda','stripe'],['lambda','ses'],
        ['lambda','sns'],['lambda','cloudwatch'],['lambda','s3'],['customer','stripe']
      ],
      flows: [
        { title: 'Browse the shop', path: ['customer','cloudfront','s3'],
          desc: 'The customer opens the site. CloudFront serves the static front end from the S3 bucket out of the nearest edge location, over HTTPS.' },
        { title: 'Register', path: ['customer','cloudfront','cognito'],
          desc: 'The Cognito Identity JS SDK creates the account directly against the user pool. Cognito emails a verification code. No password ever reaches my code.' },
        { title: 'Log in', path: ['customer','cloudfront','cognito','apigw'],
          desc: 'Cognito authenticates the credentials and returns a JWT ID token. The browser stores it and attaches it to every later API call.' },
        { title: 'Load products', path: ['customer','cloudfront','apigw','lambda','rds'],
          desc: 'GET /products reaches API Gateway, which triggers the easyshop-products function. It queries the products table in RDS over the private network and returns the catalogue.' },
        { title: 'Start checkout', path: ['customer','cloudfront','apigw','lambda','stripe'],
          desc: 'POST /create-checkout-session runs createCheckoutSession. It opens a Stripe Checkout session and hands back the hosted payment URL.' },
        { title: 'Pay', path: ['customer','stripe'],
          desc: 'The customer is redirected to Stripe and pays there. This is the important edge on the diagram: card data goes straight to Stripe and never touches my infrastructure.' },
        { title: 'Record the order', path: ['customer','cloudfront','apigw','lambda','rds'],
          desc: 'Stripe redirects back to the success page, which calls POST /orders. The createOrder function writes the order row to RDS and the cart is cleared.' },
        { title: 'Send the receipt', path: ['apigw','lambda','ses'],
          desc: 'POST /send-email triggers sendConfirmationEmail, which asks SES to deliver a personalised confirmation to the customer\u2019s registered address.' },
        { title: 'Admin image upload', path: ['customer','cloudfront','apigw','lambda','s3'],
          desc: 'The admin panel asks getUploadUrl for a presigned S3 URL, then the browser uploads the image straight to S3. The file never passes through Lambda — no size limit, no compute cost.' },
        { title: 'Everything is logged', path: ['lambda','cloudwatch'],
          desc: 'Every invocation writes to its own CloudWatch log group. Eleven functions, eleven log groups, no configuration needed.' }
      ]
    },

    soar: {
      file: 'soar-pipeline.svg',
      blurb: 'An automated incident-response pipeline. Alerts arrive, get enriched and triaged without a human, ' +
             'and only reach an analyst once there is something worth their attention.',
      meta: [
        ['Context', 'Personal build · 2024–2025'],
        ['Manual triage', 'Down 60%'],
        ['Stack', 'Shuffle · Wazuh · TheHive'],
        ['Goal', 'Analysts see enriched alerts, not raw ones']
      ],
      nodes: [
        { id: 'endp',    x: 30,  y: 205, label: 'Endpoints',    sub: 'agents',        role: 'Telemetry',      desc: 'Wazuh agents on monitored hosts ship file integrity, process and authentication events upstream.' },
        { id: 'wazuh',   x: 195, y: 205, label: 'Wazuh',        sub: 'SIEM / XDR',    role: 'Detection',      desc: 'Correlates incoming events against detection rules and raises the alerts that start the pipeline.' },
        { id: 'shuffle', x: 375, y: 205, label: 'Shuffle',      sub: 'SOAR engine',   role: 'Orchestration',  desc: 'The automation core. Receives each alert through a webhook and decides what happens next — no analyst involved until there is something worth their attention.' },
        { id: 'enrich',  x: 375, y: 70,  label: 'Enrichment',   sub: 'IOC lookup',    role: 'Context',        desc: 'Every indicator is enriched automatically — reputation, prior sightings, related events. This is where most of the 60% time saving came from.' },
        { id: 'esc',     x: 375, y: 348, label: 'Escalation',   sub: 'auto-routing',  role: 'Decision',       desc: 'Severity rules decide: close as noise, raise a case, or page a human. The rules encode what a tier-1 analyst would have done by hand.' },
        { id: 'hive',    x: 570, y: 205, label: 'TheHive',      sub: 'case mgmt',     role: 'Case tracking',  desc: 'Confirmed incidents become structured cases with the enrichment already attached, so the investigation starts from context rather than a bare alert.' },
        { id: 'analyst', x: 745, y: 205, label: 'Analyst',      sub: 'human review',  role: 'Human',          desc: 'The analyst now opens a case that is already triaged and enriched. Judgement stays human; the assembly work does not.' }
      ],
      edges: [['endp','wazuh'],['wazuh','shuffle'],['shuffle','enrich'],['shuffle','esc'],['shuffle','hive'],['hive','analyst']],
      flows: [
        { title: 'Alert raised', path: ['endp','wazuh'],
          desc: 'Wazuh agents ship file integrity, process and authentication events. A detection rule fires and an alert is born.' },
        { title: 'Enrich automatically', path: ['wazuh','shuffle','enrich'],
          desc: 'Shuffle picks the alert up by webhook and enriches every indicator — reputation, prior sightings, related events. This step is where most of the 60% time saving came from.' },
        { title: 'Decide', path: ['shuffle','esc'],
          desc: 'Severity rules decide what happens: close it as noise, raise a case, or page a human. The rules encode the judgement a tier-1 analyst was applying by hand.' },
        { title: 'Open a case', path: ['shuffle','hive','analyst'],
          desc: 'Anything real becomes a TheHive case with the enrichment already attached, so the analyst starts from context instead of a bare alert.' }
      ]
    },

    acme: {
      file: 'acme-nist-redesign.svg',
      blurb: 'An enterprise security redesign carried out after a ransomware incident, structured around the ' +
             'NIST Cybersecurity Framework and written to be funded, not just filed.',
      meta: [
        ['Context', 'York University · 2025'],
        ['Trigger', 'Post-ransomware assessment'],
        ['Framework', 'NIST Cybersecurity Framework'],
        ['Projected impact', 'Incident response time cut 50%']
      ],
      nodes: [
        { id: 'assess',   x: 30,  y: 205, label: 'Assessment',  sub: 'current state', role: 'Starting point', desc: 'Full review of the enterprise infrastructure after a ransomware incident — what failed, what was missing, and what let the attacker move.' },
        { id: 'identify', x: 215, y: 70,  label: 'Identify',    sub: 'NIST CSF',      role: 'Function 1',     desc: 'Asset and risk inventory. You cannot protect infrastructure nobody has written down, and the gaps here explained most of the rest.' },
        { id: 'protect',  x: 215, y: 205, label: 'Protect',     sub: 'NIST CSF',      role: 'Function 2',     desc: 'Segmentation, access control and hardening — the controls that decide whether one compromised host becomes an enterprise-wide event.' },
        { id: 'detect',   x: 215, y: 340, label: 'Detect',      sub: 'NIST CSF',      role: 'Function 3',     desc: 'Monitoring and alerting designed so the next intrusion surfaces in hours rather than after encryption starts.' },
        { id: 'respond',  x: 430, y: 138, label: 'Respond',     sub: 'NIST CSF',      role: 'Function 4',     desc: 'Defined response procedures with named owners. Most of the projected 50% saving comes from removing the "who decides?" delay.' },
        { id: 'recover',  x: 430, y: 275, label: 'Recover',     sub: 'NIST CSF',      role: 'Function 5',     desc: 'Tested backup and restoration paths, because ransomware recovery is a restore problem before it is a security one.' },
        { id: 'report',   x: 650, y: 205, label: 'Exec Report', sub: 'deliverable',   role: 'Output',         desc: 'A findings and roadmap report written for executives, not engineers — prioritised by risk reduction per dollar so it could actually be funded.' }
      ],
      edges: [['assess','identify'],['assess','protect'],['assess','detect'],['identify','respond'],['protect','respond'],['detect','recover'],['respond','report'],['recover','report']],
      flows: [
        { title: 'Assess the damage', path: ['assess','identify'],
          desc: 'Start from what actually happened: which assets existed, which were unknown, and what let the attacker move laterally once inside.' },
        { title: 'Close the gaps', path: ['assess','protect','respond'],
          desc: 'Segmentation, access control and hardening — the controls that decide whether one compromised host becomes an enterprise-wide event.' },
        { title: 'See it sooner', path: ['assess','detect','recover'],
          desc: 'Monitoring designed so the next intrusion surfaces in hours, paired with restore paths that are actually tested rather than assumed.' },
        { title: 'Make it fundable', path: ['respond','report'],
          desc: 'A findings and roadmap report written for executives, prioritised by risk reduction per dollar — because a recommendation nobody funds changes nothing.' }
      ]
    }
  };

  var NODE_W = 128, NODE_H = 52;

  /* ---------------------------------------------------------
     8. Blueprint engine
     --------------------------------------------------------- */
  function initBlueprint() {
    var svg = $('#bp-svg');
    if (!svg) return;
    var gEdges = $('#bp-edges'), gPackets = $('#bp-packets'), gNodes = $('#bp-nodes');
    var detail = $('#bp-detail'), metaBox = $('#proj-meta'), fileLabel = $('#bp-filename');
    var flowStrip = $('#bp-flow'), blurbBox = $('#bp-blurb'), playBtn = $('#bp-play');
    var NS = 'http://www.w3.org/2000/svg';
    var packets = [], raf = null, current = null;
    var edgeMap = {}, activeFlow = -1, playTimer = null;

    function el(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    function centre(n) { return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 }; }
    function pairKey(a, b) { return a + '|' + b; }

    /* Direction is ignored — an edge is "hot" if the step walks it either way. */
    function hotPairs(pathIds) {
      var set = {};
      for (var i = 0; i < pathIds.length - 1; i++) {
        set[pairKey(pathIds[i], pathIds[i + 1])] = true;
        set[pairKey(pathIds[i + 1], pathIds[i])] = true;
      }
      return set;
    }

    function clearFlow() {
      activeFlow = -1;
      $$('.bp-node', svg).forEach(function (g) { g.classList.remove('dim', 'lit'); });
      Object.keys(edgeMap).forEach(function (k) {
        edgeMap[k].path.classList.remove('hot', 'cold');
        if (edgeMap[k].packet) edgeMap[k].packet.classList.remove('hot', 'cold');
      });
      $$('.flow-step', flowStrip).forEach(function (b) { b.classList.remove('active'); });
    }

    function selectFlow(idx, fromPlayer) {
      var p = PROJECTS[current];
      if (!p || !p.flows || !p.flows[idx]) return;
      var step = p.flows[idx];
      activeFlow = idx;

      var hot = hotPairs(step.path), inPath = {};
      step.path.forEach(function (id) { inPath[id] = true; });

      $$('.bp-node', svg).forEach(function (g) {
        var on = inPath[g.getAttribute('data-id')];
        g.classList.toggle('lit', !!on);
        g.classList.toggle('dim', !on);
        g.classList.remove('sel');
      });
      Object.keys(edgeMap).forEach(function (k) {
        var on = !!hot[k];
        edgeMap[k].path.classList.toggle('hot', on);
        edgeMap[k].path.classList.toggle('cold', !on);
        if (edgeMap[k].packet) {
          edgeMap[k].packet.classList.toggle('hot', on);
          edgeMap[k].packet.classList.toggle('cold', !on);
        }
      });
      $$('.flow-step', flowStrip).forEach(function (b, i) { b.classList.toggle('active', i === idx); });

      detail.innerHTML = '';
      var n = document.createElement('p');
      n.className = 'bp-role';
      n.textContent = 'Step ' + (idx + 1) + ' of ' + p.flows.length;
      var h = document.createElement('h4'); h.textContent = step.title;
      var d = document.createElement('p'); d.textContent = step.desc;
      detail.appendChild(n); detail.appendChild(h); detail.appendChild(d);

      if (!fromPlayer) stopPlay();
    }

    function stopPlay() {
      if (playTimer) { clearInterval(playTimer); playTimer = null; }
      if (playBtn) { playBtn.classList.remove('playing'); playBtn.textContent = '▶ PLAY FLOW'; }
    }
    function startPlay() {
      var p = PROJECTS[current];
      if (!p || !p.flows) return;
      selectFlow(0, true);
      if (playBtn) { playBtn.classList.add('playing'); playBtn.textContent = '❚❚ PAUSE'; }
      playTimer = setInterval(function () {
        selectFlow((activeFlow + 1) % p.flows.length, true);
      }, 4200);
    }

    function render(key) {
      var p = PROJECTS[key];
      if (!p) return;
      current = key;

      gEdges.textContent = ''; gPackets.textContent = ''; gNodes.textContent = '';
      packets = []; edgeMap = {};
      stopPlay();
      if (fileLabel) fileLabel.textContent = p.file;

      var byId = {};
      p.nodes.forEach(function (n) { byId[n.id] = n; });

      p.edges.forEach(function (pair) {
        var a = byId[pair[0]], b = byId[pair[1]];
        if (!a || !b) return;
        var c1 = centre(a), c2 = centre(b);
        var mx = (c1.x + c2.x) / 2;
        var d = 'M' + c1.x + ',' + c1.y + ' C' + mx + ',' + c1.y + ' ' + mx + ',' + c2.y + ' ' + c2.x + ',' + c2.y;
        var path = el('path', { d: d, class: 'bp-edge' });
        gEdges.appendChild(path);

        var dot = el('circle', { r: 3.2, class: 'bp-packet', cx: c1.x, cy: c1.y });
        gPackets.appendChild(dot);
        packets.push({ dot: dot, path: path, t: Math.random(), speed: 0.0026 + Math.random() * 0.0028 });

        var rec = { path: path, packet: dot };
        edgeMap[pairKey(pair[0], pair[1])] = rec;
        edgeMap[pairKey(pair[1], pair[0])] = rec;
      });

      p.nodes.forEach(function (n) {
        var g = el('g', { class: 'bp-node', tabindex: '0', role: 'button',
                          'data-id': n.id, 'data-cursor': 'link',
                          'aria-label': n.label + ' — ' + n.role });
        g.appendChild(el('rect', {
          x: n.x, y: n.y, width: NODE_W, height: NODE_H,
          fill: 'rgba(10,10,10,0.92)', stroke: 'rgba(204,255,0,0.3)', 'stroke-width': 1.2
        }));
        var lbl = el('text', { x: n.x + NODE_W / 2, y: n.y + 22, 'text-anchor': 'middle', class: 'n-label' });
        lbl.textContent = n.label;
        var sub = el('text', { x: n.x + NODE_W / 2, y: n.y + 38, 'text-anchor': 'middle', class: 'n-sub' });
        sub.textContent = n.sub;
        g.appendChild(lbl); g.appendChild(sub);

        function select() {
          clearFlow();
          $$('.bp-node', svg).forEach(function (o) { o.classList.remove('sel'); });
          g.classList.add('sel');
          detail.innerHTML = '';
          var h = document.createElement('h4'); h.textContent = n.label;
          var r = document.createElement('p'); r.className = 'bp-role'; r.textContent = n.role;
          var d = document.createElement('p'); d.textContent = n.desc;
          detail.appendChild(h); detail.appendChild(r); detail.appendChild(d);
        }
        g.addEventListener('click', select);
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
        });
        gNodes.appendChild(g);
      });

      if (metaBox) {
        metaBox.innerHTML = '';
        p.meta.forEach(function (row) {
          var c = document.createElement('div'); c.className = 'pm-card';
          var k = document.createElement('span'); k.className = 'pm-k'; k.textContent = row[0];
          var v = document.createElement('span'); v.className = 'pm-v'; v.textContent = row[1];
          c.appendChild(k); c.appendChild(v); metaBox.appendChild(c);
        });
      }

      if (blurbBox) blurbBox.textContent = p.blurb || '';

      if (flowStrip) {
        flowStrip.innerHTML = '';
        (p.flows || []).forEach(function (step, i) {
          var b = document.createElement('button');
          b.className = 'flow-step'; b.type = 'button';
          b.setAttribute('data-cursor', 'link');
          b.innerHTML = '<span class="fs-num">' + (i + 1) + '</span><span class="fs-label"></span>';
          b.querySelector('.fs-label').textContent = step.title;
          b.addEventListener('click', function () { selectFlow(i); });
          flowStrip.appendChild(b);
        });
      }
      if (playBtn) playBtn.style.display = (p.flows && p.flows.length) ? '' : 'none';

      detail.innerHTML = '<p class="bp-hint">Play the flow, pick a step, or select any node.</p>';
    }

    function animate() {
      for (var i = 0; i < packets.length; i++) {
        var pk = packets[i];
        // Frozen packets on dimmed edges would read as traffic that isn't there.
        if (pk.dot.classList.contains('cold')) continue;
        pk.t += pk.speed;
        if (pk.t > 1) pk.t = 0;
        try {
          var len = pk.path.getTotalLength();
          var pt = pk.path.getPointAtLength(pk.t * len);
          pk.dot.setAttribute('cx', pt.x);
          pk.dot.setAttribute('cy', pt.y);
        } catch (e) { /* path not measurable yet */ }
      }
      raf = requestAnimationFrame(animate);
    }

    $$('.bp-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.bp-tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        render(tab.getAttribute('data-proj'));
      });
    });

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (playTimer) stopPlay(); else startPlay();
      });
    }

    render('easyshop');
    if (!reduceMotion) {
      animate();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
        else if (!raf) { raf = requestAnimationFrame(animate); }
      });
    }

    window.__bpShow = function (key) {
      var tab = $('.bp-tab[data-proj="' + key + '"]');
      if (tab) tab.click();
    };
  }

  /* ---------------------------------------------------------
     9. Stack
     --------------------------------------------------------- */
  var SKILLS = [
    { title: 'Cloud & Infrastructure', tags: ['AWS Lambda','API Gateway','S3','CloudFront','RDS','Cognito','VPC','KMS','IAM','CloudWatch','EKS','SNS','SES','NAT Gateway','Azure','GCP fundamentals','Serverless design','Multi-AZ / HA','Docker','Kubernetes','REST APIs'] },
    { title: 'Security Operations',    tags: ['Splunk','Wazuh','IBM QRadar','MITRE ATT&CK','IOC analysis','Threat hunting','Incident response','SOAR (Shuffle)','TheHive','Vulnerability assessment','Penetration testing'] },
    { title: 'Governance & Frameworks',tags: ['NIST CSF','ISO 27001','CIS Controls','GDPR','AWS Well-Architected','Zero Trust','RBAC','Least privilege'] },
    { title: 'Systems & Support',      tags: ['Windows','Linux','Microsoft 365','Active Directory','Endpoint support','Ticketing & SLA','SSO & MFA','Runbook & KB authoring'] },
    { title: 'Networking',             tags: ['TCP/IP','DNS','DHCP','VPN','Firewalls'] }
  ];

  function initStack() {
    var box = $('#stack-index');
    if (!box) return;
    SKILLS.forEach(function (g, i) {
      var row = document.createElement('div');
      row.className = 'stack-row';

      var no = document.createElement('span');
      no.className = 'sr-no';
      no.textContent = String(i + 1).padStart(2, '0');

      var name = document.createElement('span');
      name.className = 'sr-name';
      name.textContent = g.title.toUpperCase();

      var tags = document.createElement('div');
      tags.className = 'sr-tags';
      g.tags.forEach(function (t) {
        var s = document.createElement('span');
        s.textContent = t;
        tags.appendChild(s);
      });

      row.appendChild(no); row.appendChild(name); row.appendChild(tags);
      box.appendChild(row);
    });
  }

  /* ---------------------------------------------------------
     10. Terminal
     --------------------------------------------------------- */
  function initTerminal() {
    var body = $('#term-body'), input = $('#term-input');
    if (!body || !input) return;

    var history = [], hIdx = -1;

    function line(html, cls) {
      var d = document.createElement('div');
      d.className = 'term-line' + (cls ? ' ' + cls : '');
      d.innerHTML = html;
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }
    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    var COMMANDS = {
      help: function () {
        line('<span class="t-key">Available commands</span>');
        [['whoami','who is this'],['about','the short version'],
         ['experience','where I have worked'],['projects','what I have built'],
         ['open <name>','load a diagram (easyshop · soar · acme)'],
         ['skills','the stack'],['education','degrees and certificates'],
         ['certs','certifications'],['contact','how to reach me'],
         ['resume','how to get the PDF'],['neofetch','system info'],
         ['ls','list sections'],['clear','wipe the screen']]
          .forEach(function (c) {
            line('  <span class="t-key">' + esc(c[0]) + '</span>'
               + '<span class="t-dim">' + ' '.repeat(Math.max(1, 16 - c[0].length)) + esc(c[1]) + '</span>');
          });
      },
      whoami: function () {
        line('<span class="t-ok">Dhruv Patel</span> — cloud &amp; security engineer, Toronto ON');
        line('<span class="t-dim">Authorized to work in Canada. Open to cloud and security roles.</span>');
      },
      about: function () {
        line('Started in a SOC writing SIEM correlation rules. Moved to L1 support,');
        line('where I learned most outages are configuration, not code. Now I build');
        line('on AWS — serverless, multi-AZ, least privilege, security designed in.');
      },
      experience: function () {
        line('<span class="t-key">Asite Solutions</span> <span class="t-dim">— Technical Support Engineer L1 · Oct 2024–Mar 2026</span>');
        line('  SaaS troubleshooting, SSO/MFA, SLA compliance, KB authoring.');
        line('');
        line('<span class="t-key">Heritage Cyber World LLP</span> <span class="t-dim">— SOC Analyst · Jan 2023–Jun 2024</span>');
        line('  <span class="t-ok">-35%</span> false positives via 8+ correlation rules, <span class="t-ok">-40%</span> triage time.');
      },
      projects: function () {
        line('<span class="t-key">easyshop</span>  <span class="t-dim">Serverless e-commerce on AWS · Seneca capstone 2026</span>');
        line('          <span class="t-dim">11 Lambdas · Multi-AZ RDS · Cognito · Stripe · SES · $52.71 all-in</span>');
        line('<span class="t-key">soar</span>      <span class="t-dim">Automated incident response · Shuffle + Wazuh + TheHive</span>');
        line('<span class="t-key">acme</span>      <span class="t-dim">Post-ransomware security redesign · NIST CSF · York 2025</span>');
        line('');
        line('<span class="t-dim">Try:</span> open easyshop');
      },
      open: function (arg) {
        var key = (arg || '').toLowerCase();
        if (!key) { line('usage: open &lt;easyshop|soar|acme&gt;', 't-warn'); return; }
        if (!PROJECTS[key]) { line('no such project: ' + esc(key), 't-err'); return; }
        if (window.__bpShow) window.__bpShow(key);
        line('Loading <span class="t-key">' + esc(key) + '</span> architecture…', 't-ok');
        var target = document.getElementById('systems');
        if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      },
      skills: function () {
        SKILLS.forEach(function (g) {
          line('<span class="t-key">' + esc(g.title) + '</span>');
          line('  <span class="t-dim">' + esc(g.tags.join(' · ')) + '</span>');
        });
      },
      education: function () {
        line('<span class="t-key">Seneca Polytechnic</span> <span class="t-dim">· PG Cert, Cloud Architecture &amp; Automation · 2025–2026</span>');
        line('<span class="t-key">York University</span>    <span class="t-dim">· PG Dip, Cybersecurity Operations · 2024–2025</span>');
        line('<span class="t-key">Ganpat University</span>  <span class="t-dim">· B.Tech CSE (Cybersecurity) · 2020–2024</span>');
      },
      certs: function () {
        line('<span class="t-ok">✓</span> AWS Certified Cloud Practitioner <span class="t-dim">(2026)</span>');
        line('<span class="t-ok">✓</span> IBM IT System Log Analyzer <span class="t-dim">(2024)</span>');
        line('<span class="t-ok">✓</span> Skills Ontario Cybersecurity Competition <span class="t-dim">(2026)</span>');
        line('<span class="t-dim">  labs: Amazon EKS · Azure P2S VPN · IAM hardening · AWS security architecture</span>');
      },
      contact: function () {
        line('<span class="t-key">email</span>     <a href="mailto:Dhruv123.dp47@gmail.com">Dhruv123.dp47@gmail.com</a>');
        line('<span class="t-key">linkedin</span>  <a href="https://linkedin.com/in/patel-dhruv-50455b1b9" target="_blank" rel="noopener">in/patel-dhruv-50455b1b9</a>');
        line('<span class="t-key">location</span>  Toronto, ON <span class="t-dim">(GTA or remote in Canada)</span>');
      },
      resume: function () {
        line('Email me and I will send the PDF tailored to the role.', 't-dim');
        line('<a href="mailto:Dhruv123.dp47@gmail.com?subject=Resume%20request">Dhruv123.dp47@gmail.com</a>');
      },
      neofetch: function () {
        var rows = [
          ['OS',       'Cloud Architecture & Automation (Seneca)'],
          ['Kernel',   'Cybersecurity Operations (York)'],
          ['Shell',    'bash · PowerShell'],
          ['Cloud',    'AWS · Azure · GCP fundamentals'],
          ['Uptime',   '3+ years'],
          ['Location', 'Toronto, ON'],
          ['Status',   'open to work']
        ];
        line('<span class="t-key">      ___      </span>  <span class="t-ok">dhruv@portfolio</span>');
        line('<span class="t-key">     /   \\     </span>  <span class="t-dim">───────────────</span>');
        rows.forEach(function (r, i) {
          var art = ['    | o o |    ','    |  ^  |    ','     \\ ~ /     ','    /`---`\\    ','   /       \\   ','  |  aws    |  ','   \\_______/   '][i] || '               ';
          line('<span class="t-key">' + esc(art) + '</span>  <span class="t-key">' + r[0] + '</span><span class="t-dim">: ' + esc(r[1]) + '</span>');
        });
      },
      ls: function () {
        line('<span class="t-key">index/  work/  systems/  shell/  stack/  contact/</span>');
      },
      clear: function () { body.innerHTML = ''; },
      sudo: function () {
        line('Nice try. <span class="t-dim">This incident has been logged. (It has not.)</span>', 't-warn');
      },
      exit: function () { line('There is no exit. Scroll up instead.', 't-dim'); },
      date: function () { line(new Date().toString(), 't-dim'); }
    };

    function run(raw) {
      var trimmed = raw.trim();
      line('<span class="t-ok">dhruv@portfolio</span><span class="t-dim">:~$</span> <span class="t-cmd">' + esc(trimmed) + '</span>');
      if (!trimmed) return;
      history.unshift(trimmed); hIdx = -1;

      var parts = trimmed.split(/\s+/);
      var cmd = parts[0].toLowerCase();
      var arg = parts.slice(1).join(' ');

      if (cmd === 'cat' || cmd === 'cd') { line(cmd + ': try a bare section name, or `help`', 't-dim'); return; }
      if (COMMANDS[cmd]) { COMMANDS[cmd](arg); }
      else {
        line('command not found: ' + esc(cmd), 't-err');
        line('Type <span class="t-key">help</span> for the list.', 't-dim');
      }
      line('');
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { run(input.value); input.value = ''; }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIdx < history.length - 1) { hIdx++; input.value = history[hIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx > 0) { hIdx--; input.value = history[hIdx]; }
        else { hIdx = -1; input.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        var v = input.value.trim().toLowerCase();
        if (!v) return;
        var match = Object.keys(COMMANDS).filter(function (k) { return k.indexOf(v) === 0; });
        if (match.length === 1) input.value = match[0] + ' ';
      }
    });

    $('#term').addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') input.focus();
    });

    var booted = false;
    function boot() {
      if (booted) return;
      booted = true;
      var seq = [
        ['<span class="t-dim">Last login: ' + new Date().toDateString() + '</span>', 90],
        ['<span class="t-ok">[ OK ]</span> <span class="t-dim">mounting /profile</span>', 190],
        ['<span class="t-ok">[ OK ]</span> <span class="t-dim">loading aws credentials</span>', 170],
        ['<span class="t-ok">[ OK ]</span> <span class="t-dim">3 projects indexed</span>', 170],
        ['', 90],
        ['Welcome. Type <span class="t-key">help</span> to see what this shell knows.', 0]
      ];
      var i = 0;
      (function next() {
        if (i >= seq.length) { line(''); return; }
        line(seq[i][0]);
        var d = reduceMotion ? 0 : seq[i][1];
        i++;
        setTimeout(next, d);
      })();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { boot(); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe($('#shell'));
    } else { boot(); }
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function init() {
    initLoader();
    initFit();
    initTicker();
    initStack();
    initBlueprint();
    initTerminal();
    initChrome();
    initScroll();
    initScramble();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
