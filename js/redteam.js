/* ============================================================
   Red team console — visitors attack this page, a small detection
   engine watches every input and writes a defense log.
   Everything runs in the browser. Input is only ever rendered with
   textContent, and nothing is sent anywhere (there is no server).
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var KEY = 'dp-rt-log';

  /* ---------- detection rules ---------- */
  // Same pattern as INJECTION in soc-home-lab/ai/triage.py, ported to JS.
  var PROMPT_INJECTION = /(ignore (all |the )?(previous|prior|above)|disregard (the )?(instructions|rules)|you are now|system prompt|mark (this|it) (as )?(benign|safe|false positive)|do not (alert|report|escalate)|<\/?\s*(system|assistant|instructions?)\s*>|ignore_previous)/i;

  var RULES = {
    scan:    { id: '100201', lvl: 6,  mitre: 'T1595.001', name: 'Active scanning: port and service sweep',
               resp: 'Logged. Nothing to block: only 80 and 443 answer, and there is no server behind them.' },
    fail:    { id: '100210', lvl: 5,  mitre: 'T1110.001', name: 'Failed admin login',
               resp: 'Logged and counted toward the brute-force threshold.' },
    brute:   { id: '100211', lvl: 10, mitre: 'T1110',     name: 'Brute force: 5 failed logins within 60 s',
               resp: 'Source locked out for 300 s (shown here 10× faster). Same response as firewall-drop in my lab.' },
    deflt:   { id: '100212', lvl: 8,  mitre: 'T1078.001', name: 'Default credentials tried',
               resp: 'Logged. Default passwords are the first thing every scanner tries.' },
    sqli:    { id: '100220', lvl: 12, mitre: 'T1190',     name: 'SQL injection pattern in input',
               resp: 'Handled as plain text. There is no database here for it to reach.' },
    xss:     { id: '100221', lvl: 12, mitre: 'T1059.007', name: 'Script injection (XSS) pattern in input',
               resp: 'Rendered with textContent, never as HTML. Nothing executed.' },
    trav:    { id: '100222', lvl: 10, mitre: 'T1083',     name: 'Path traversal pattern in input',
               resp: 'No file system behind this form. Logged.' },
    cmd:     { id: '100223', lvl: 10, mitre: 'T1059.004', name: 'Command injection pattern in input',
               resp: 'Nothing on this page runs a shell. Logged.' },
    prompt:  { id: '100230', lvl: 12, mitre: 'AML.T0051', name: 'Prompt injection aimed at the AI analyst',
               resp: 'Flagged before the model sees it and wrapped as untrusted data. A benign verdict now needs a human.' },
    honey:   { id: '100240', lvl: 8,  mitre: 'T1595.003', name: 'Honeypot path requested',
               resp: 'The path does not exist. The request got a honeypot page and was logged.' }
  };

  var PAYLOADS = [
    ['sqli', /('|%27|")\s*(or|and)\s+[\w'"]+\s*(=|like)|union(\s|\/\*.*?\*\/)+select|;\s*(drop|delete|insert|update)\s|\bsleep\s*\(\s*\d|'\s*--|"\s*--|\bor\s+1\s*=\s*1\b/i],
    ['xss',  /<\s*\/?\s*(script|img|svg|iframe|body|object)\b|\bon(error|load|click|mouseover)\s*=|javascript\s*:/i],
    ['trav', /\.\.[\/\\]|\/etc\/(passwd|shadow)|%2e%2e%2f|c:\\windows/i],
    ['cmd',  /;\s*(cat|ls|id|whoami|wget|curl|nc|bash|sh|rm)\b|\|\s*(sh|bash|nc)\b|\$\([^)]*\)|`[^`]+`|&&\s*(whoami|id|cat)\b/i]
  ];

  function scanPayloads(text) {
    var hits = [];
    PAYLOADS.forEach(function (p) { if (p[1].test(text)) hits.push(p[0]); });
    return hits;
  }

  /* ---------- log store ---------- */
  var log = [];
  function load() {
    try { log = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { log = []; }
    if (!Array.isArray(log)) log = [];
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(log.slice(-60))); } catch (e) {}
  }

  var logEl, countEl, badge, toasts;

  function stamp(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function li(entry) {
    var r = RULES[entry.k] || RULES.scan;
    var el = document.createElement('li');
    el.style.borderLeftColor = r.lvl >= 10 ? 'var(--red)' : 'var(--amber)';
    var h = document.createElement('div'); h.className = 'lh';
    var lv = document.createElement('span'); lv.className = 'lv' + (r.lvl >= 10 ? ' hi' : ''); lv.textContent = 'L' + r.lvl;
    var id = document.createElement('span'); id.className = 'rid'; id.textContent = 'RULE ' + r.id;
    var mt = document.createElement('span'); mt.className = 'mt'; mt.textContent = r.mitre;
    var tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = entry.t;
    h.appendChild(lv); h.appendChild(id); h.appendChild(mt); h.appendChild(tm);
    var nm = document.createElement('div'); nm.textContent = r.name + (entry.d ? ': ' + entry.d : '');
    var rs = document.createElement('span'); rs.className = 'rs'; rs.textContent = '↳ ' + r.resp;
    el.appendChild(h); el.appendChild(nm); el.appendChild(rs);
    return el;
  }

  function render() {
    if (!logEl) return;
    logEl.textContent = '';
    if (!log.length) {
      var e = document.createElement('li'); e.className = 'rt-empty'; e.textContent = 'Nothing yet. Attack something.';
      logEl.appendChild(e);
    } else {
      for (var i = log.length - 1; i >= 0; i--) logEl.appendChild(li(log[i]));
    }
    countEl.textContent = log.length + ' caught';
    badge.hidden = !log.length;
    badge.textContent = log.length;
    renderScore();
  }

  function renderScore() {
    var box = $('#your-score'), txt = $('#your-score-text');
    if (!box || !txt) return;
    if (!log.length) { box.hidden = true; return; }
    var kinds = {};
    log.forEach(function (e) { kinds[(RULES[e.k] || {}).mitre] = 1; });
    var nk = Object.keys(kinds).length;
    txt.textContent = '';
    var b1 = document.createElement('b'); b1.textContent = log.length + (log.length === 1 ? ' attack' : ' attacks');
    var b2 = document.createElement('b'); b2.textContent = nk + (nk === 1 ? ' technique' : ' techniques');
    txt.appendChild(document.createTextNode('You tried '));
    txt.appendChild(b1);
    txt.appendChild(document.createTextNode(' across '));
    txt.appendChild(b2);
    txt.appendChild(document.createTextNode('. Every one was detected and logged. The quickest way into this network is still the email below.'));
    box.hidden = false;
  }

  function toast(r, d) {
    if (!toasts) return;
    var t = document.createElement('div'); t.className = 'toast';
    t.style.borderColor = r.lvl >= 10 ? 'var(--red)' : 'var(--amber)';
    var b = document.createElement('b'); b.textContent = 'DETECTED · RULE ' + r.id + ' · ' + r.mitre;
    t.appendChild(b);
    t.appendChild(document.createTextNode(r.name + (d ? ': ' + d : '')));
    toasts.appendChild(t);
    while (toasts.children.length > 3) toasts.removeChild(toasts.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4800);
  }

  function detect(k, detail) {
    var r = RULES[k];
    if (!r) return;
    var d = detail ? String(detail).slice(0, 60) : '';
    log.push({ k: k, t: stamp(new Date()), d: d });
    if (log.length > 60) log = log.slice(-60);
    save(); render();
    if (!drawer.classList.contains('open')) toast(r, d);
    if (window.__net && window.__net.hit) window.__net.hit(k);
  }

  /* ---------- drawer ---------- */
  var drawer, openBtn;
  function setOpen(on) {
    drawer.classList.toggle('open', on);
    drawer.setAttribute('aria-hidden', on ? 'false' : 'true');
    openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) { var f = $('.rt-pane:not([hidden]) input, .rt-pane:not([hidden]) button', drawer); if (f && window.innerWidth > 600) f.focus({ preventScroll: true }); }
  }
  function tab(name) {
    $$('.rt-tab', drawer).forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.rt-pane', drawer).forEach(function (p) { p.hidden = p.dataset.pane !== name; });
  }

  /* ---------- 01 scan ---------- */
  function initScan() {
    var btn = $('#rt-scan'), out = $('#rt-scan-out'), busy = false;
    var LINES = [
      ['', 'Starting Nmap 7.95 ( https://nmap.org )'],
      ['', 'Nmap scan report for dhruvpatel47.github.io (185.199.108.153)'],
      ['', 'Host is up.'],
      ['', 'Not shown: 998 filtered tcp ports (no-response)'],
      ['', 'PORT     STATE SERVICE   VERSION'],
      ['o', '80/tcp   open  http      GitHub Pages (redirects to 443)'],
      ['o', '443/tcp  open  ssl/http  GitHub Pages'],
      ['', ''],
      ['x', '[SIMULATED] Two ports, static files, no login, no database.'],
      ['x', 'The attack surface is small on purpose.']
    ];
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true; out.textContent = '';
      LINES.forEach(function (l, i) {
        setTimeout(function () {
          var s = document.createElement('span'); if (l[0]) s.className = l[0];
          s.textContent = l[1] + '\n'; out.appendChild(s);
          if (i === LINES.length - 1) { busy = false; detect('scan', 'nmap -sV, 1000 ports'); }
        }, 180 * i + (i > 4 ? 500 : 0));
      });
    });
  }

  /* ---------- 02 login ---------- */
  function initLogin() {
    var form = $('#rt-login'), u = $('#rt-u'), p = $('#rt-p'), msg = $('#rt-login-msg');
    var fails = [], lockedUntil = 0, lockTimer = null;

    function say(text, cls) { msg.textContent = text; msg.className = 'rt-msg' + (cls ? ' ' + cls : ''); }

    function lock() {
      lockedUntil = Date.now() + 30000;
      form.classList.add('locked');
      clearInterval(lockTimer);
      lockTimer = setInterval(function () {
        var left = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (left <= 0) {
          clearInterval(lockTimer); form.classList.remove('locked'); fails = [];
          say('Lockout expired. The timer removed the block, same as the lab.', 'ok');
          return;
        }
        say('BLOCKED. Source locked out: ' + (left * 10) + ' s left (300 s at 10× speed).', 'bad');
      }, 250);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (Date.now() < lockedUntil) return;
      var uv = u.value, pv = p.value;
      var hits = scanPayloads(uv + '\n' + pv);
      hits.forEach(function (k) { detect(k, (uv + ' ' + pv).trim()); });

      if (/^\s*(admin|root|administrator)\s*$/i.test(uv) && /^\s*(admin|root|password|123456|admin123|toor)\s*$/i.test(pv)) {
        detect('deflt', uv + ' / ' + pv);
      }
      var now = Date.now();
      fails = fails.filter(function (t) { return now - t < 60000; });
      fails.push(now);
      detect('fail', 'user "' + uv.slice(0, 24) + '" (' + fails.length + '/5)');

      if (fails.length >= 5) { detect('brute', fails.length + ' failures'); lock(); return; }
      if (hits.length) say('Access denied. Payload detected and treated as plain text: ' + hits.map(function (k) { return RULES[k].name.split(' ')[0]; }).join(', ') + '.', 'bad');
      else say('Access denied. Attempt ' + fails.length + ' of 5 before lockout.', 'bad');
    });

    $$('[data-fill]', form.parentNode).forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.getAttribute('data-fill').split('|');
        u.value = parts[0]; p.value = parts[1] || '';
        if (Date.now() >= lockedUntil) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      });
    });
  }

  /* ---------- 03 AI analyst ---------- */
  var KB = [
    [/\b(hi|hello|hey|yo)\b/i, 'Hi. I answer questions about Dhruv, using only what\'s on this page. Ask about his <b>experience</b>, <b>AWS work</b>, the <b>SOC lab</b>, <b>skills</b>, <b>education</b> or how to <b>contact</b> him.'],
    [/authori[sz]|visa|permit|citizen|sponsor|\bpr\b/i, 'He is <b>authorized to work in Canada</b>. For anything beyond that, ask him directly.'],
    [/salary|pay|rate|compensation/i, 'That\'s a conversation for him, not me. Email is at the bottom of the page.'],
    [/aws|cloud|easyshop|serverless|lambda|vpc|cognito/i, 'His capstone, <b>EasyShop</b>, is a fully serverless store on AWS: a custom VPC across two AZs, Multi-AZ RDS with failover, 11 Lambda functions behind API Gateway, Cognito for every credential, Stripe for cards. Total cost for the whole build was $52.71. It\'s drawn live in stage 04, where you can break it.'],
    [/\bai\b|llm|triage|model|prompt|gpt/i, 'In his home SOC a local model (gpt-oss:20b on his own GPU) groups Wazuh alerts into incidents and drafts the triage. Guardrails sit around it: an injection pre-check, an allow-list of actions, a severity floor, and a human approval on every response. When he attacked it with prompt injection, the model was fooled and the guardrails caught it.'],
    [/soc|siem|wazuh|splunk|qradar|detect|lab|alert|mitre/i, 'As a SOC analyst at <b>Heritage Cyber World</b> (Jan 2023 to Jun 2024) he wrote 8+ correlation rules that cut false positives 35% and triage time 40%. At home he built a Wazuh SOC, attacked it with 9 MITRE-mapped tests, and caught all 9. The replay is in stage 03.'],
    [/experience|work|job|career|asite|heritage|support|role/i, 'Two roles: <b>SOC Analyst</b> at Heritage Cyber World (Jan 2023 to Jun 2024), then <b>Technical Support Engineer L1</b> at Asite Solutions (Oct 2024 to Mar 2026), handling SSO, MFA and access issues against SLAs.'],
    [/skill|stack|tool|tech|know/i, 'Cloud: AWS (Lambda, API Gateway, VPC, RDS, Cognito, IAM, KMS, CloudFront), plus Azure. Security: Splunk, Wazuh, QRadar, MITRE ATT&amp;CK, incident response, SOAR. Frameworks: NIST CSF, ISO 27001, CIS. The full list is in stage 05.'],
    [/educat|degree|school|college|seneca|york|ganpat|study/i, 'A PG certificate in Cloud Architecture &amp; Automation (Seneca), a PG diploma in Cybersecurity Operations (York University), and a B.Tech in Computer Science specialised in cybersecurity.'],
    [/cert/i, 'AWS Certified Cloud Practitioner, the IBM IT System Log Analyzer project, and Skills Ontario Cybersecurity.'],
    [/where|locat|toronto|remote|reloc|based/i, 'Based in Scarborough, Toronto. Open to roles across the GTA or remote in Canada.'],
    [/contact|email|hire|reach|linkedin|github|resume|cv/i, 'Email <b>Dhruv123.dp47@gmail.com</b>, or LinkedIn and GitHub, all linked in the last stage.']
  ];
  var SOFT = /forget|pretend|jailbreak|override|new instructions|act as|roleplay|developer mode|reveal|secret/i;

  function initAI() {
    var chat = $('#rt-chat'), form = $('#rt-ask'), q = $('#rt-q');

    function bubble(cls, html, label) {
      var p = document.createElement('p'); p.className = cls;
      if (label) { var s = document.createElement('span'); s.textContent = label; p.appendChild(s); }
      if (cls === 'me') p.appendChild(document.createTextNode(html));
      else { var d = document.createElement('span'); d.innerHTML = html; p.appendChild(d); } // trusted, scripted strings only
      chat.appendChild(p);
      chat.scrollTop = chat.scrollHeight;
    }

    function answer(text) {
      bubble('me', text);
      var m = text.match(PROMPT_INJECTION);
      var hits = scanPayloads(text);
      hits.forEach(function (k) { detect(k, text); });
      setTimeout(function () {
        if (m) {
          detect('prompt', '"' + m[0] + '"');
          bubble('bot guard', 'Matched <b>"' + m[0].replace(/[<>&"]/g, '') + '"</b>. In my real pipeline this text is flagged before the model reads it, wrapped as untrusted data, and any benign verdict is overridden so a human decides. Nice try.', 'GUARDRAIL · INJECTION PRE-CHECK');
          return;
        }
        if (hits.length) {
          bubble('bot guard', 'That input carried a payload, so it was logged and treated as plain text. I don\'t execute anything I\'m sent.', 'GUARDRAIL · INPUT CHECK');
          return;
        }
        for (var i = 0; i < KB.length; i++) {
          if (KB[i][0].test(text)) { bubble('bot', KB[i][1]); return; }
        }
        if (SOFT.test(text)) {
          bubble('bot', 'No injection pattern matched that one. A regex can\'t catch every phrasing, which is exactly why the real pipeline never trusts the model on its own: actions come from an allow-list and a human approves every one.');
          return;
        }
        bubble('bot', 'I only know what\'s on this page. Try: experience, AWS, SOC lab, AI triage, skills, education, contact.');
      }, 420);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = q.value.trim();
      if (!t) return;
      q.value = '';
      answer(t.slice(0, 400));
    });
    $$('[data-ask]', form.parentNode).forEach(function (b) {
      b.addEventListener('click', function () { answer(b.getAttribute('data-ask')); });
    });
  }

  /* ---------- boot ---------- */
  function init() {
    drawer = $('#rt'); openBtn = $('#rt-open');
    if (!drawer || !openBtn) return;
    logEl = $('#rt-log'); countEl = $('#rt-count'); badge = $('#rt-badge'); toasts = $('#toasts');

    openBtn.addEventListener('click', function () { setOpen(!drawer.classList.contains('open')); });
    $$('[data-rt-open]').forEach(function (b) { b.addEventListener('click', function () { setOpen(true); }); });
    $('#rt-close').addEventListener('click', function () { setOpen(false); openBtn.focus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) { setOpen(false); openBtn.focus(); } });
    $$('.rt-tab', drawer).forEach(function (t) { t.addEventListener('click', function () { tab(t.dataset.tab); }); });
    $('#rt-clear').addEventListener('click', function () { log = []; save(); render(); });

    initScan(); initLogin(); initAI();
    load(); render();

    // A honeypot hit on another page lands here when they come back.
    window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); render(); } });
    if (location.hash === '#rt') { tab('probe'); setOpen(true); }

    window.__rt = { detect: detect, open: setOpen, tab: tab };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
