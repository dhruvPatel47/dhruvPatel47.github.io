/* ============================================================
   Dhruv Patel — portfolio: skills index
   Vanilla JS, no dependencies, no build step.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var ACID = '#39f3bb';

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
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

  function init() { initStack(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
