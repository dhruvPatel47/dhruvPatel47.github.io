/* ============================================================
   Breach the project — each project drawn as rings of defense.
   Pick an attack, fire it, and watch which ring stops it and why.
   Every claim below comes from the project write-ups; where a
   design has a weak point, the attack is allowed to get through.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';

  /* verdict -> [badge text, tone] */
  var VERDICT = {
    blocked:   ['BLOCKED', 'def'],
    caught:    ['DETECTED', 'def'],
    absorbed:  ['ABSORBED', 'def'],
    nothing:   ['NOTHING TO STEAL', 'def'],
    survives:  ['SURVIVES', 'def'],
    filtered:  ['FILTERED OUT', 'def'],
    escalated: ['REACHES THE ANALYST', 'def'],
    gap:       ['GAP', 'amber'],
    breach:    ['GETS THROUGH', 'red']
  };

  var PROJECTS = [
    {
      key: 'easyshop', name: 'EasyShop', tag: 'AWS · SERVERLESS · CAPSTONE',
      blurb: 'A fully serverless e-commerce platform on AWS: browse, register, pay by card, get a receipt. No servers to manage anywhere in it.',
      core: ['ORDERS &', 'ACCOUNTS'], prompt: 'PICK AN ATTACK',
      rings: [
        { name: 'CloudFront', sub: 'CDN · HTTPS', desc: 'Serves the front end from global edge locations, terminates TLS and absorbs DDoS traffic. The origin is an S3 bucket with every object encrypted at rest (SSE-S3).' },
        { name: 'API Gateway', sub: 'HTTP API · 10 routes', desc: 'Ten routes covering products, orders, Stripe checkout, email and presigned uploads. CORS is locked to the CloudFront origin.' },
        { name: 'Cognito', sub: 'identity · JWT', desc: 'Handles registration, email verification, SRP password hashing and JWT issuance. The application never touches a raw password.' },
        { name: 'Private subnets', sub: 'Lambda × 11 · NAT out', desc: 'Eleven single-purpose Node.js functions in private subnets of a custom VPC (10.0.0.0/16). They reach the internet only through NAT gateways.' },
        { name: 'RDS Multi-AZ', sub: 'KMS-encrypted', desc: 'MySQL 8.4 with a standby in a second availability zone for automatic failover, encrypted at rest with KMS, automated backups.' }
      ],
      attacks: [
        { label: 'Steal card numbers', stop: 'none', v: 'nothing', title: 'Card data never enters the system',
          body: 'Checkout runs on Stripe’s hosted page. Card numbers, CVV and billing details are typed into Stripe’s PCI-compliant infrastructure and never pass through my application or database.',
          decision: 'Payment isolated behind one function, createCheckoutSession. No card data anywhere in the codebase keeps the PCI surface at zero.' },
        { label: 'Flood the shop (DDoS)', stop: 0, v: 'absorbed', title: 'The edge takes the hit',
          body: 'CloudFront serves the static front end from edge locations and absorbs flood traffic before it reaches anything I run. If the API itself were saturated, API Gateway would return 429s, but the site would still load from the edge.',
          decision: 'Front end on S3 behind CloudFront, independent of compute. A compute incident degrades the shop instead of blacking it out.' },
        { label: 'Use the API from another site', stop: 1, v: 'blocked', title: 'Wrong origin, refused',
          body: 'CORS on the HTTP API is locked to the CloudFront origin, so browsers won’t let scripts on any other website read its responses.',
          decision: 'Trust exactly one origin and refuse the rest by default.' },
        { label: 'Steal a user’s password', stop: 2, v: 'blocked', title: 'There is no password to steal',
          body: 'Cognito runs registration and login with SRP, so the password never reaches my code. API calls are authorized with the JWT Cognito issues.',
          decision: 'Identity handed to a managed service. My code holds tokens, never credentials.' },
        { label: 'Reach the database directly', stop: 3, v: 'blocked', title: 'Kept inside the VPC',
          body: 'The database is only reached by the Lambda functions, over the private network inside the VPC. The functions themselves sit in private subnets and go out through NAT; nothing comes in that way.',
          decision: 'Compute and data in private subnets of a custom VPC: outbound through NAT only.' },
        { label: 'Knock out an availability zone', stop: 4, v: 'survives', title: 'Failover, not an outage',
          body: 'RDS promotes the standby in the second zone automatically. Lambda keeps running in the surviving zone’s private subnet. In-flight queries error; the next request reconnects.',
          decision: 'Multi-AZ RDS, subnets in both zones, one NAT gateway per zone. That redundancy is most of the bill, and this is what it buys.' },
        { label: 'Take Cognito down', stop: 'core', v: 'breach', title: 'The weakest point: logins stop',
          body: 'No sign-ups, no logins, no token refresh. Sessions with a valid JWT keep working until it expires and public browsing continues, but checkout and admin become unreachable.',
          decision: 'Auth is a hard dependency with no fallback, and I’d rather say so. The fix is longer token lifetimes and a read-only degraded mode, which I didn’t build.' }
      ],
      meta: [['Region', 'us-east-2 · 2 AZs'], ['Network', 'VPC 10.0.0.0/16 · 4 subnets'], ['Compute', '11 Lambda functions'], ['All-time cost', '$52.71']],
      links: []
    },
    {
      key: 'soclab', name: 'SOC Home Lab', tag: 'WAZUH · SYSMON · LOCAL AI',
      blurb: 'A working SOC on one PC: Wazuh SIEM, a Sysmon-instrumented Windows endpoint, a Kali attacker, and an AI triage layer on my own GPU that is never allowed to act on its own.',
      core: ['THE LAB', 'NETWORK'], prompt: 'PICK AN ATTACK',
      rings: [
        { name: 'Detection rules', sub: 'Wazuh · 100100–100110', desc: 'The built-in ruleset plus nine custom rules mapped to MITRE ATT&CK: discovery bursts, account creation, admin group changes, scheduled tasks, Startup-folder persistence, authorized_keys tampering.' },
        { name: 'Active response', sub: 'firewall-drop · 300 s', desc: 'Brute-force rules trigger an iptables DROP on the source IP for 300 seconds. The analyst workstation and the SIEM are on a never-block list.' },
        { name: 'Correlator', sub: '147 alerts → 3', desc: 'Plain Python, not AI: groups alerts by host, source IP and a 15-minute gap, and keeps only groups with a level 10+ alert.' },
        { name: 'Guardrails', sub: 'code after the model', desc: 'Actions must come from an allow-list and name a real target, severity can never drop below the rule level, and a benign verdict is overridden when injection text is present.' },
        { name: 'Human approval', sub: 'respond.py', desc: 'Nothing runs until I approve a numbered action. Every approve and reject goes to an audit log with a reason.' }
      ],
      attacks: [
        { label: 'Create a backdoor admin', stop: 0, v: 'caught', title: 'Caught within a second',
          body: 'A test account is created and added to Administrators. Rules 100103 and 100104 fire within a second, mapped to T1136.001 and T1098.',
          decision: 'Custom rules for the moves attackers make right after access, not just the ones that come in the default ruleset.' },
        { label: 'SSH brute force from Kali', stop: 1, v: 'blocked', title: 'Blocked 8 seconds in',
          body: 'Kali sprays made-up usernames at SSH. Rule 5712 fires and firewall-drop blocks 192.168.179.131 eight seconds after the first attempt. The block expires on its own.',
          decision: 'A never-block list and auto-expiry turn a bad containment call into a five-minute inconvenience instead of an outage.' },
        { label: 'Bury it in alert noise', stop: 2, v: 'filtered', title: '147 alerts, 3 incidents',
          body: 'The raw test window produced 147 alerts. The correlator turned them into 3 incidents before anything reached the AI or me.',
          decision: 'Noise reduction is deterministic code, so it is predictable and testable. The AI only sees what already matters.' },
        { label: 'Prompt-inject the AI', stop: 3, v: 'blocked', title: 'The model fell for it. The guardrails didn’t.',
          body: 'Usernames written as instructions talked the model into rating a level-10 brute force as low and benign. The guardrails raised it to high and overrode the verdict to unknown before a human saw it.',
          decision: 'Guardrails are code that checks the model’s output. Asking the model to ignore instructions in logs is not a control.' },
        { label: 'Trick the AI into a bad action', stop: 4, v: 'blocked', title: 'A human said no',
          body: 'The AI suggested disabling a misspelled account and isolating the SIEM itself. Nothing runs without a numbered approval, and I rejected both. Both decisions are in the audit log.',
          decision: 'The AI recommends; a person decides. That is the line I would hold in production too.' },
        { label: 'Stop the endpoint agent', stop: 'core', v: 'gap', title: 'The endpoint goes dark',
          body: 'Windows detections stop: no Sysmon events, no account or persistence alerts. Wazuh still sees the agent disconnect, and SSH detection on the server keeps working.',
          decision: 'The gap worth naming: no alert yet for "agent silent for N minutes". In production that is the first rule I would add, because attackers stop agents.' }
      ],
      meta: [['Detections', '9 MITRE tests · 9 caught'], ['Response', 'Blocked in 8 s'], ['AI', 'gpt-oss:20b on my GPU'], ['Context', 'Home lab · Nov 2026']],
      links: [['GitHub', 'https://github.com/dhruvPatel47/soc-home-lab'], ['Report', 'https://github.com/dhruvPatel47/soc-home-lab/blob/main/report/SOC_Home_Lab_Report.pdf']]
    },
    {
      key: 'soar', name: 'SOAR Pipeline', tag: 'SHUFFLE · WAZUH · THEHIVE',
      blurb: 'An automated incident-response pipeline. Alerts arrive, get enriched and triaged without a human, and only reach an analyst once there is something worth their attention.',
      core: ['ANALYST', 'TIME'], prompt: 'SEND AN ALERT THROUGH IT',
      rings: [
        { name: 'Wazuh', sub: 'detection', desc: 'Agents ship file integrity, process and authentication events. Detection rules raise the alerts that start the pipeline.' },
        { name: 'Shuffle enrichment', sub: 'IOC lookup', desc: 'Shuffle picks each alert up by webhook and enriches every indicator: reputation, prior sightings, related events. Most of the time saving came from here.' },
        { name: 'Escalation rules', sub: 'auto-routing', desc: 'Severity rules decide: close as noise, raise a case, or page a human. They encode what a tier-1 analyst was doing by hand.' },
        { name: 'TheHive', sub: 'case management', desc: 'Confirmed incidents become structured cases with the enrichment already attached.' }
      ],
      attacks: [
        { label: 'A noisy, low-value alert', stop: 2, v: 'filtered', at: 'Closed by the escalation rules', title: 'Closed without a human',
          body: 'The alert is enriched automatically, then the severity rules close it as noise. No analyst ever has to open it.',
          decision: 'Automate the judgement a tier-1 analyst was applying by hand, and keep the rules readable.' },
        { label: 'A suspicious indicator', stop: 3, v: 'caught', at: 'Case opened in TheHive', title: 'Becomes a case, context attached',
          body: 'Enrichment adds reputation, prior sightings and related events, and the escalation rules raise a TheHive case with all of it attached.',
          decision: 'Cases start from context. Nobody re-does the lookups by hand.' },
        { label: 'A real intrusion', stop: 'core', v: 'escalated', at: 'Delivered to the analyst', title: 'This one should reach a human, and does',
          body: 'It arrives as a triaged, enriched case, so the investigation starts from context instead of a bare alert. Manual triage time went down 60%.',
          decision: 'Judgement stays human; the assembly work does not.' }
      ],
      meta: [['Context', 'Personal build · 2024–2025'], ['Manual triage', 'Down 60%'], ['Stack', 'Shuffle · Wazuh · TheHive']],
      links: []
    },
    {
      key: 'acme', name: 'ACME Redesign', tag: 'NIST CSF · POST-RANSOMWARE',
      blurb: 'An enterprise security redesign after a ransomware incident, structured around the NIST Cybersecurity Framework and written to be funded, not just filed. A proposed design (York University, 2025), so the outcomes are projected.',
      core: ['BUSINESS', 'OPERATIONS'], prompt: 'REPLAY THE RANSOMWARE',
      rings: [
        { name: 'Identify', sub: 'NIST CSF', desc: 'Asset and risk inventory. You cannot protect infrastructure nobody has written down.' },
        { name: 'Protect', sub: 'NIST CSF', desc: 'Segmentation, access control and hardening: the controls that decide whether one compromised host becomes an enterprise-wide event.' },
        { name: 'Detect', sub: 'NIST CSF', desc: 'Monitoring and alerting designed so the next intrusion surfaces in hours rather than after encryption starts.' },
        { name: 'Respond', sub: 'NIST CSF', desc: 'Defined response procedures with named owners.' },
        { name: 'Recover', sub: 'NIST CSF', desc: 'Tested backup and restoration paths, because ransomware recovery is a restore problem before it is a security one.' }
      ],
      attacks: [
        { label: 'Hit a host nobody listed', stop: 0, v: 'blocked', title: 'It is on the list now',
          body: 'The redesign starts with an asset and risk inventory, because you cannot protect infrastructure nobody has written down. The gaps it found explained most of the rest.',
          decision: 'Inventory first. Every later control depends on it.' },
        { label: 'Move from one host to all', stop: 1, v: 'blocked', title: 'Segmentation holds it to one',
          body: 'Segmentation, access control and hardening decide whether one compromised host becomes an enterprise-wide event.',
          decision: 'Assume one host falls and design so it stays one host.' },
        { label: 'Stay hidden until encryption', stop: 2, v: 'caught', title: 'Surfaces in hours',
          body: 'Monitoring and alerting designed so the intrusion surfaces in hours, before encryption starts.',
          decision: 'Detection measured against the attacker’s timeline, not the audit calendar.' },
        { label: 'Exploit the "who decides?" delay', stop: 3, v: 'blocked', title: 'Named owners, no waiting',
          body: 'Defined response procedures with named owners. Most of the projected 50% cut in response time comes from removing the "who decides?" delay.',
          decision: 'Written for executives and prioritised by risk reduction per dollar, so it could actually be funded.' },
        { label: 'Encrypt the servers anyway', stop: 4, v: 'survives', title: 'Restore, don’t pay',
          body: 'If encryption still happens, tested backup and restoration paths bring the business back.',
          decision: 'Backups only count once a restore has been tested.' }
      ],
      meta: [['Context', 'York University · 2025'], ['Trigger', 'Post-ransomware assessment'], ['Framework', 'NIST CSF'], ['Projected impact', 'Response time −50%']],
      links: []
    }
  ];

  /* ---------- geometry ---------- */
  var C = 250, R_OUT = 236, R_CORE = 58;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function init() {
    var root = $('#breach');
    if (!root) return;
    var tabs = $('#br-tabs'), svg = $('#br-svg'), list = $('#br-attacks'), out = $('#br-out');
    var nameEl = $('#br-name'), tagEl = $('#br-tag'), blurbEl = $('#br-blurb'), promptEl = $('#br-prompt'), metaEl = $('#br-meta');
    var cur = null, rings = [], coreG = null, shot = null, busy = false, raf = 0;

    PROJECTS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'br-tab'; b.setAttribute('role', 'tab');
      b.dataset.k = p.key; b.textContent = p.name.toUpperCase();
      b.addEventListener('click', function () { show(i); });
      tabs.appendChild(b);
    });

    function radii(n) {
      var step = (R_OUT - R_CORE) / n, r = [];
      for (var i = 0; i < n; i++) r.push(R_OUT - i * step);
      return { r: r, step: step };
    }

    function idle(p) {
      out.className = 'br-out';
      out.innerHTML = '';
      var h = document.createElement('p'); h.className = 'br-idle';
      h.textContent = 'Fire an attack, or hover a ring to see what it does.';
      out.appendChild(h);
    }

    function ringInfo(i) {
      if (busy || !cur) return;
      var r = cur.rings[i];
      out.className = 'br-out';
      out.innerHTML = '';
      var k = document.createElement('span'); k.className = 'br-k'; k.textContent = 'RING ' + (i + 1) + ' · ' + r.sub.toUpperCase();
      var h = document.createElement('h4'); h.textContent = r.name;
      var d = document.createElement('p'); d.textContent = r.desc;
      out.appendChild(k); out.appendChild(h); out.appendChild(d);
    }

    function draw(p) {
      svg.textContent = '';
      rings = [];
      var g = radii(p.rings.length);
      el('circle', { cx: C, cy: C, r: R_OUT + 8, class: 'br-halo' }, svg);
      p.rings.forEach(function (ring, i) {
        var r = g.r[i];
        var grp = el('g', { class: 'br-ring', tabindex: '0', role: 'button', 'aria-label': ring.name + ': ' + ring.sub }, svg);
        el('circle', { cx: C, cy: C, r: r - g.step / 2, class: 'br-band', 'stroke-width': g.step - 2 }, grp);
        el('circle', { cx: C, cy: C, r: r, class: 'br-edge' }, grp);
        var t = el('text', { x: C, y: C - r + g.step / 2 + 4, class: 'br-lbl', 'text-anchor': 'middle' }, grp);
        t.textContent = ring.name.toUpperCase();
        var s = el('text', { x: C, y: C + r - g.step / 2 + 4, class: 'br-sub', 'text-anchor': 'middle' }, grp);
        s.textContent = ring.sub;
        grp.addEventListener('mouseenter', function () { ringInfo(i); });
        grp.addEventListener('focus', function () { ringInfo(i); });
        grp.addEventListener('click', function () { ringInfo(i); });
        rings.push({ g: grp, r: r });
      });
      coreG = el('g', { class: 'br-core' }, svg);
      el('circle', { cx: C, cy: C, r: R_CORE - 4 }, coreG);
      p.core.forEach(function (line, j) {
        var t = el('text', { x: C, y: C + (j - (p.core.length - 1) / 2) * 15 + 4, 'text-anchor': 'middle' }, coreG);
        t.textContent = line;
      });
      shot = el('g', { class: 'br-shot', opacity: 0 }, svg);
      el('line', { x1: -26, y1: 0, x2: 0, y2: 0, class: 'br-trail' }, shot);
      el('circle', { cx: 0, cy: 0, r: 6 }, shot);
      el('circle', { cx: 0, cy: 0, r: 30, class: 'br-burst' }, svg);
    }

    function show(i) {
      if (busy) return;
      cur = PROJECTS[i];
      $$('.br-tab', tabs).forEach(function (b, j) {
        b.classList.toggle('active', j === i);
        b.setAttribute('aria-selected', j === i ? 'true' : 'false');
      });
      nameEl.textContent = cur.name;
      tagEl.textContent = cur.tag;
      blurbEl.textContent = cur.blurb;
      promptEl.textContent = cur.prompt;
      draw(cur);
      list.textContent = '';
      cur.attacks.forEach(function (a, j) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'br-atk';
        var n = document.createElement('span'); n.className = 'br-n'; n.textContent = (j < 9 ? '0' : '') + (j + 1);
        var l = document.createElement('span'); l.textContent = a.label;
        var f = document.createElement('span'); f.className = 'br-fire'; f.textContent = 'FIRE ▸';
        b.appendChild(n); b.appendChild(l); b.appendChild(f);
        b.addEventListener('click', function () { fire(j, b); });
        list.appendChild(b);
      });
      metaEl.textContent = '';
      cur.meta.forEach(function (m) {
        var d = document.createElement('div'); d.className = 'pm-card';
        var k = document.createElement('span'); k.className = 'pm-k'; k.textContent = m[0];
        var v = document.createElement('span'); v.className = 'pm-v'; v.textContent = m[1];
        d.appendChild(k); d.appendChild(v); metaEl.appendChild(d);
      });
      cur.links.forEach(function (m) {
        var a = document.createElement('a'); a.className = 'pm-card pm-link';
        a.href = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
        var k = document.createElement('span'); k.className = 'pm-k'; k.textContent = m[0];
        var v = document.createElement('span'); v.className = 'pm-v'; v.textContent = (m[0] === 'GitHub' ? 'soc-home-lab' : '10-page PDF') + ' ↗';
        a.appendChild(k); a.appendChild(v); metaEl.appendChild(a);
      });
      idle(cur);
    }

    function result(a, stopName) {
      var vd = VERDICT[a.v];
      out.className = 'br-out tone-' + vd[1];
      out.innerHTML = '';
      var top = document.createElement('div'); top.className = 'br-res-h';
      var badge = document.createElement('span'); badge.className = 'br-badge'; badge.textContent = vd[0];
      var at = document.createElement('span'); at.className = 'br-at'; at.textContent = stopName;
      top.appendChild(badge); top.appendChild(at);
      var h = document.createElement('h4'); h.textContent = a.title;
      var b = document.createElement('p'); b.textContent = a.body;
      var d = document.createElement('p'); d.className = 'br-dec';
      var dk = document.createElement('span'); dk.textContent = 'THE DESIGN DECISION';
      d.appendChild(dk); d.appendChild(document.createTextNode(a.decision));
      out.appendChild(top); out.appendChild(h); out.appendChild(b); out.appendChild(d);
    }

    function fire(j, btn) {
      if (busy) return;
      var a = cur.attacks[j];
      busy = true;
      root.classList.add('is-busy');
      $$('.br-atk', list).forEach(function (b) { b.classList.toggle('active', b === btn); });
      rings.forEach(function (r) { r.g.classList.remove('pass', 'stop', 'gap'); });
      coreG.classList.remove('hit', 'safe', 'empty', 'warn');
      svg.querySelector('.br-burst').classList.remove('go', 'red');

      var toCore = a.stop === 'core' || a.stop === 'none';
      var stopIdx = toCore ? rings.length : a.stop;
      var endX = toCore ? C - R_CORE + 2 : C - rings[stopIdx].r - 7;
      var startX = -40, dur = reduce ? 1 : 520 + 210 * stopIdx;
      var t0 = performance.now();
      var tone = VERDICT[a.v][1];
      shot.setAttribute('opacity', 1);
      shot.setAttribute('class', 'br-shot' + (a.v === 'escalated' || a.stop === 'none' ? ' calm' : ''));
      out.className = 'br-out';
      out.innerHTML = '<p class="br-idle">Attack in flight…</p>';
      if (window.__net && window.__net.hit) window.__net.hit('scan');

      cancelAnimationFrame(raf);
      (function step(now) {
        var p = Math.min((now - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 2);
        var x = startX + (endX - startX) * e;
        shot.setAttribute('transform', 'translate(' + x + ',' + C + ')');
        rings.forEach(function (r, i) {
          if (i < stopIdx && x > C - r.r) r.g.classList.add('pass');
        });
        if (p < 1) { raf = requestAnimationFrame(step); return; }
        land();
      })(t0);

      function land() {
        var burst = svg.querySelector('.br-burst');
        burst.setAttribute('cx', endX + (toCore ? 0 : 7));
        burst.setAttribute('cy', C);
        if (toCore) {
          coreG.classList.add(a.stop === 'none' ? 'empty' : (tone === 'red' ? 'hit' : (tone === 'amber' ? 'warn' : 'safe')));
          if (tone === 'red' || tone === 'amber') burst.classList.add('red');
        } else {
          rings[stopIdx].g.classList.add('stop');
        }
        // restart the burst animation
        void burst.getBoundingClientRect();
        burst.classList.add('go');
        shot.setAttribute('opacity', 0);
        var where = a.at || (a.stop === 'none' ? 'Nothing at the core' : (toCore ? 'Reached: ' + cur.core.join(' ').toLowerCase() : (a.v === 'caught' ? 'Caught by ' : 'Stopped at ') + cur.rings[stopIdx].name));
        result(a, where);
        busy = false;
        root.classList.remove('is-busy');
      }
    }

    show(0);
    window.__breachShow = function (key) {
      for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].key === key) show(i);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
