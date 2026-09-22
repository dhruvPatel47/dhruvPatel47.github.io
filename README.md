# Dhruv Patel — Portfolio

Personal site: cloud and security engineering work, built as a single static page with no
frameworks and no build step.

**Live:** https://USERNAME.github.io

## What's in it

- **Animated perspective grid** — canvas-rendered floor grid and a drifting node constellation,
  redrawn each frame and paused when the tab is hidden.
- **Live architecture blueprint** — three real project architectures (EasyShop on AWS, a
  Shuffle/Wazuh/TheHive SOAR pipeline, and a NIST CSF post-ransomware redesign) drawn as SVG
  node graphs with packets animating along the edges. Every node is clickable and explains
  its own role.
- **Working terminal** — a real command interpreter with history, tab completion and about a
  dozen commands (`help`, `whoami`, `projects`, `open easyshop`, `neofetch`, …).
- **Scroll-driven reveals**, animated counters, scrollspy navigation and a cursor glow.

## Structure

```
index.html      markup and content
css/style.css   design tokens, layout, all motion
js/main.js      grid, typed text, blueprint engine, terminal, scroll behaviour
```

## Running locally

No build step. Any static server works:

```bash
python -m http.server 8777
# then open http://localhost:8777
```

## Accessibility and performance

- Every animation is disabled under `prefers-reduced-motion`.
- The blueprint nodes are keyboard-focusable and respond to Enter/Space.
- Canvas and SVG animation loops stop when the tab is backgrounded.
- Node counts scale with viewport area so phones stay smooth.
- A print stylesheet strips the chrome so the page prints cleanly.

## Licence

Code is MIT. The written content and CV material are not — please don't reuse those.
