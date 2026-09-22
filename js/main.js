/* ============================================================
   Dhruv Patel — portfolio
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1. Animated perspective grid + drifting nodes
     --------------------------------------------------------- */
  function initGrid() {
    var cv = $('#grid-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [], t = 0, raf = null;

    function resize() {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      // Node count scales with area, capped so phones stay smooth.
      var count = Math.min(Math.round((w * h) / 26000), 70);
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 0.7
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      t += 0.0022;

      // --- perspective floor grid ---
      var horizon = h * 0.62;
      ctx.lineWidth = 1;

      // vertical rays converging on a vanishing point
      ctx.strokeStyle = 'rgba(0,229,255,0.055)';
      var vpx = w / 2;
      for (var i = -26; i <= 26; i++) {
        ctx.beginPath();
        ctx.moveTo(vpx + i * 46, horizon);
        ctx.lineTo(vpx + i * 340, h + 60);
        ctx.stroke();
      }

      // horizontal lines, scrolling toward the viewer
      for (var j = 0; j < 22; j++) {
        var p = ((j / 22) + (t % (1 / 22)) * 22) % 1;
        var y = horizon + Math.pow(p, 2.6) * (h - horizon + 70);
        var a = 0.085 * (1 - p);
        ctx.strokeStyle = 'rgba(0,229,255,' + a.toFixed(4) + ')';
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // --- floating node constellation (upper area) ---
      for (var n = 0; n < nodes.length; n++) {
        var o = nodes[n];
        o.x += o.vx; o.y += o.vy;
        if (o.x < -20) o.x = w + 20; if (o.x > w + 20) o.x = -20;
        if (o.y < -20) o.y = h + 20; if (o.y > h + 20) o.y = -20;

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.5)';
        ctx.fill();
      }

      // link nearby nodes
      for (var a1 = 0; a1 < nodes.length; a1++) {
        for (var b1 = a1 + 1; b1 < nodes.length; b1++) {
          var dx = nodes[a1].x - nodes[b1].x, dy = nodes[a1].y - nodes[b1].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 17000) {
            var op = (1 - d2 / 17000) * 0.2;
            ctx.strokeStyle = 'rgba(0,229,255,' + op.toFixed(4) + ')';
            ctx.beginPath();
            ctx.moveTo(nodes[a1].x, nodes[a1].y);
            ctx.lineTo(nodes[b1].x, nodes[b1].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', debounce(resize, 180));

    if (reduceMotion) { drawStatic(); return; }
    draw();

    // Pause the loop when the tab is hidden — no point burning cycles.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) { raf = requestAnimationFrame(draw); }
    });

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,229,255,0.05)';
      for (var x = 0; x < w; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var y = 0; y < h; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
  }

  /* ---------------------------------------------------------
     2. Typed role line
     --------------------------------------------------------- */
  function initTyped() {
    var el = $('#typed-role');
    if (!el) return;
    var roles = [
      'Cloud Engineer',
      'Security Analyst',
      'AWS Solutions Builder',
      'Infrastructure Automation'
    ];

    if (reduceMotion) { el.textContent = roles[0]; return; }

    var ri = 0, ci = 0, deleting = false;

    (function tick() {
      var word = roles[ri];
      el.textContent = word.slice(0, ci);

      var delay;
      if (!deleting) {
        ci++;
        delay = 72;
        if (ci > word.length) { deleting = true; delay = 1900; }
      } else {
        ci--;
        delay = 36;
        if (ci === 0) { deleting = false; ri = (ri + 1) % roles.length; delay = 380; }
      }
      setTimeout(tick, delay);
    })();
  }

  /* ---------------------------------------------------------
     3. Scroll reveal + counters + scroll progress + nav state
     --------------------------------------------------------- */
  function initScroll() {
    var revealEls = $$('.reveal');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e, i) {
          if (!e.isIntersecting) return;
          // Small stagger so groups cascade instead of popping together.
          setTimeout(function () { e.target.classList.add('in'); }, i * 70);
          io.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }

    // counters
    var counters = $$('.counter'), done = [];
    function runCounters() {
      counters.forEach(function (c) {
        if (done.indexOf(c) > -1) return;
        var r = c.getBoundingClientRect();
        if (r.top > window.innerHeight - 40) return;
        done.push(c);
        var target = parseInt(c.getAttribute('data-target'), 10) || 0;
        if (reduceMotion) { c.textContent = target; return; }
        var start = performance.now(), dur = 1500;
        (function step(now) {
          var p = Math.min((now - start) / dur, 1);
          // easeOutExpo
          var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          c.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    }

    var nav = $('#nav'), bar = $('#scroll-progress');
    var sections = $$('main section[id]');
    var navLinks = $$('.nav-links a[data-nav]');

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (nav) nav.classList.toggle('scrolled', y > 40);

      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }

      // scrollspy
      var current = '';
      sections.forEach(function (s) {
        if (y >= s.offsetTop - 140) current = s.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });

      runCounters();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------
     4. Cursor glow + hero glitch + mobile nav
     --------------------------------------------------------- */
  function initChrome() {
    var glow = $('#cursor-glow');
    if (glow && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
      var gx = 0, gy = 0, cx = 0, cy = 0;
      document.body.classList.add('has-cursor');
      window.addEventListener('mousemove', function (e) { gx = e.clientX; gy = e.clientY; });
      (function follow() {
        cx += (gx - cx) * 0.1;
        cy += (gy - cy) * 0.1;
        glow.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
        requestAnimationFrame(follow);
      })();
    }

    // occasional glitch flicker on the name
    var name = $('.hero-name');
    if (name && !reduceMotion) {
      setInterval(function () {
        if (Math.random() > 0.72) {
          name.classList.add('glitch');
          setTimeout(function () { name.classList.remove('glitch'); }, 130);
        }
      }, 2600);
    }

    // mobile nav
    var toggle = $('#nav-toggle'), links = $('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var yr = $('#year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     5. Live architecture blueprint
     --------------------------------------------------------- */
  var PROJECTS = {
    easyshop: {
      file: 'easyshop-architecture.svg',
      meta: [
        ['Context', 'Seneca capstone · 2026'],
        ['Cloud spend', 'Under $52 total'],
        ['Availability', 'Multi-AZ, automatic failover'],
        ['Standard', 'All six AWS Well-Architected pillars']
      ],
      nodes: [
        { id: 'client',  x: 30,  y: 205, label: 'Client',       sub: 'browser',          role: 'Entry point',   desc: 'Every request arrives over HTTPS/TLS. Nothing in the stack accepts plaintext traffic.' },
        { id: 'cf',      x: 185, y: 205, label: 'CloudFront',   sub: 'CDN · TLS',        role: 'Edge delivery', desc: 'Serves the static front end from edge locations and terminates TLS, keeping latency down and the origin private.' },
        { id: 'apigw',   x: 350, y: 205, label: 'API Gateway',  sub: 'REST',             role: 'API layer',     desc: 'Single managed entry to the backend. Routes each REST path to its own Lambda, so one noisy endpoint cannot starve the rest.' },
        { id: 'cognito', x: 350, y: 70,  label: 'Cognito',      sub: 'JWT auth',         role: 'Identity',      desc: 'Handles sign-up, sign-in and token issuance. API Gateway validates the JWT before a Lambda ever runs.' },
        { id: 'stripe',  x: 545, y: 70,  label: 'Stripe',       sub: 'payments',         role: 'Integration',   desc: 'Card data never touches my infrastructure — the payment Lambda talks to Stripe directly, which keeps the compliance surface small.' },
        { id: 'lambda',  x: 545, y: 205, label: 'Lambda × 11',  sub: 'private subnet',   role: 'Compute',       desc: 'Eleven single-purpose functions, each with its own least-privilege IAM role, running inside a private subnet with no public IP.' },
        { id: 'rds',     x: 730, y: 130, label: 'RDS MySQL',    sub: 'Multi-AZ',         role: 'Data',          desc: 'Multi-AZ deployment with automatic failover to the standby. A lost availability zone costs a reconnect, not an outage.' },
        { id: 'kms',     x: 730, y: 285, label: 'KMS',          sub: 'encryption',       role: 'Crypto',        desc: 'Manages the keys encrypting data at rest. Rotation is handled by AWS rather than by me remembering to do it.' },
        { id: 'vpc',     x: 545, y: 350, label: 'VPC · 2 AZ',   sub: 'network boundary', role: 'Network',       desc: 'Custom VPC spanning two availability zones, split into public and private subnets. Compute and data sit in private subnets only.' }
      ],
      edges: [['client','cf'],['cf','apigw'],['apigw','cognito'],['apigw','lambda'],['lambda','stripe'],['lambda','rds'],['lambda','kms'],['lambda','vpc']]
    },

    soar: {
      file: 'soar-pipeline.svg',
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
      edges: [['endp','wazuh'],['wazuh','shuffle'],['shuffle','enrich'],['shuffle','esc'],['shuffle','hive'],['hive','analyst']]
    },

    acme: {
      file: 'acme-nist-redesign.svg',
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
      edges: [['assess','identify'],['assess','protect'],['assess','detect'],['identify','respond'],['protect','respond'],['detect','recover'],['respond','report'],['recover','report']]
    }
  };

  var NODE_W = 128, NODE_H = 52;

  function initBlueprint() {
    var svg = $('#bp-svg');
    if (!svg) return;
    var gEdges = $('#bp-edges'), gPackets = $('#bp-packets'), gNodes = $('#bp-nodes');
    var detail = $('#bp-detail'), metaBox = $('#proj-meta'), fileLabel = $('#bp-filename');
    var NS = 'http://www.w3.org/2000/svg';
    var packets = [], paths = [], raf = null, current = null;

    function el(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    function centre(n) { return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 }; }

    function render(key) {
      var p = PROJECTS[key];
      if (!p) return;
      current = key;

      gEdges.textContent = ''; gPackets.textContent = ''; gNodes.textContent = '';
      packets = []; paths = [];
      if (fileLabel) fileLabel.textContent = p.file;

      var byId = {};
      p.nodes.forEach(function (n) { byId[n.id] = n; });

      // edges as curves, so crossing links stay readable
      p.edges.forEach(function (pair) {
        var a = byId[pair[0]], b = byId[pair[1]];
        if (!a || !b) return;
        var c1 = centre(a), c2 = centre(b);
        var mx = (c1.x + c2.x) / 2;
        var d = 'M' + c1.x + ',' + c1.y + ' C' + mx + ',' + c1.y + ' ' + mx + ',' + c2.y + ' ' + c2.x + ',' + c2.y;
        var path = el('path', { d: d, class: 'bp-edge' });
        gEdges.appendChild(path);
        paths.push(path);

        var dot = el('circle', { r: 3.2, class: 'bp-packet', cx: c1.x, cy: c1.y });
        gPackets.appendChild(dot);
        packets.push({ dot: dot, path: path, t: Math.random(), speed: 0.0026 + Math.random() * 0.0028 });
      });

      // nodes
      p.nodes.forEach(function (n) {
        var g = el('g', { class: 'bp-node', tabindex: '0', role: 'button',
                          'aria-label': n.label + ' — ' + n.role });
        g.appendChild(el('rect', {
          x: n.x, y: n.y, width: NODE_W, height: NODE_H, rx: 9,
          fill: 'rgba(12,18,32,0.9)', stroke: 'rgba(140,160,210,0.28)', 'stroke-width': 1.3
        }));
        var lbl = el('text', { x: n.x + NODE_W / 2, y: n.y + 22, 'text-anchor': 'middle', class: 'n-label' });
        lbl.textContent = n.label;
        var sub = el('text', { x: n.x + NODE_W / 2, y: n.y + 38, 'text-anchor': 'middle', class: 'n-sub' });
        sub.textContent = n.sub;
        g.appendChild(lbl); g.appendChild(sub);

        function select() {
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

      // meta cards
      if (metaBox) {
        metaBox.innerHTML = '';
        p.meta.forEach(function (row) {
          var c = document.createElement('div'); c.className = 'pm-card';
          var k = document.createElement('span'); k.className = 'pm-k'; k.textContent = row[0];
          var v = document.createElement('span'); v.className = 'pm-v'; v.textContent = row[1];
          c.appendChild(k); c.appendChild(v); metaBox.appendChild(c);
        });
      }

      detail.innerHTML = '<p class="bp-hint">Select a node above to inspect it.</p>';
    }

    function animate() {
      for (var i = 0; i < packets.length; i++) {
        var pk = packets[i];
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

    // tabs
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

    render('easyshop');
    if (!reduceMotion) {
      animate();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
        else if (!raf) { raf = requestAnimationFrame(animate); }
      });
    }

    // expose for the terminal's `open` command
    window.__bpShow = function (key) {
      var tab = $('.bp-tab[data-proj="' + key + '"]');
      if (tab) tab.click();
    };
  }

  /* ---------------------------------------------------------
     6. Skills
     --------------------------------------------------------- */
  var SKILLS = [
    { icon: '☁', title: 'Cloud & Infrastructure', tags: ['AWS Lambda','API Gateway','S3','CloudFront','RDS','Cognito','VPC','KMS','IAM','CloudWatch','EKS','SNS','SES','NAT Gateway','Azure','GCP fundamentals','Serverless design','Multi-AZ / HA','Docker','Kubernetes','REST APIs'] },
    { icon: '🛡', title: 'Security Operations',    tags: ['Splunk','Wazuh','IBM QRadar','MITRE ATT&CK','IOC analysis','Threat hunting','Incident response','SOAR (Shuffle)','TheHive','Vulnerability assessment','Penetration testing'] },
    { icon: '📋', title: 'Governance & Frameworks',tags: ['NIST CSF','ISO 27001','CIS Controls','GDPR','AWS Well-Architected','Zero Trust','RBAC','Least privilege'] },
    { icon: '🖥', title: 'Systems & Support',      tags: ['Windows','Linux','Microsoft 365','Active Directory','Endpoint support','Ticketing & SLA','SSO & MFA','Runbook & KB authoring'] },
    { icon: '🌐', title: 'Networking',             tags: ['TCP/IP','DNS','DHCP','VPN','Firewalls'] }
  ];

  function initSkills() {
    var grid = $('#skills-grid');
    if (!grid) return;
    SKILLS.forEach(function (g) {
      var box = document.createElement('div');
      box.className = 'sk-group reveal';
      var h = document.createElement('h3');
      h.innerHTML = '<span class="sk-ico">' + g.icon + '</span>';
      h.appendChild(document.createTextNode(g.title));
      var tags = document.createElement('div');
      tags.className = 'sk-tags';
      g.tags.forEach(function (t) {
        var s = document.createElement('span');
        s.className = 'sk-tag'; s.textContent = t;
        tags.appendChild(s);
      });
      box.appendChild(h); box.appendChild(tags);
      grid.appendChild(box);
    });
  }

  /* ---------------------------------------------------------
     7. Interactive terminal
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
         ['open <name>','load a project diagram (easyshop · soar · acme)'],
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
        var target = document.getElementById('projects');
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
        line('<span class="t-key">about/  experience/  projects/  terminal/  skills/  contact/</span>');
      },

      clear: function () { body.innerHTML = ''; },

      sudo: function () {
        line('Nice try. <span class="t-dim">This incident has been logged. (It has not.)</span>', 't-warn');
      },

      exit: function () {
        line('There is no exit. Scroll up instead.', 't-dim');
      },

      date: function () { line(new Date().toString(), 't-dim'); }
    };

    function run(raw) {
      var trimmed = raw.trim();
      line('<span class="t-ok">dhruv@portfolio</span><span class="t-key">:~$</span> <span class="t-cmd">' + esc(trimmed) + '</span>');
      if (!trimmed) return;

      history.unshift(trimmed); hIdx = -1;

      var parts = trimmed.split(/\s+/);
      var cmd = parts[0].toLowerCase();
      var arg = parts.slice(1).join(' ');

      if (cmd === 'cat' || cmd === 'cd') {
        line(cmd + ': try a bare section name, or `help`', 't-dim');
        return;
      }

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

    // clicking anywhere in the terminal focuses the input
    $('#term').addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') input.focus();
    });

    // boot banner, typed out once the section is first seen
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
      io.observe($('#terminal'));
    } else { boot(); }
  }

  /* ---------------------------------------------------------
     util
     --------------------------------------------------------- */
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function init() {
    initGrid();
    initTyped();
    initSkills();
    initBlueprint();
    initTerminal();
    initChrome();
    initScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
