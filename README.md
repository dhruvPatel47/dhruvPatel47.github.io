# Dhruv Patel — Portfolio

Cloud and security engineering portfolio. A static site with **no framework and no build
step** — open `index.html` and it runs.

**Live:** https://dhruvpatel47.github.io

## What's in it

### A WebGL scene you scroll through

Three.js loaded via import map. A fixed canvas sits behind the DOM, and scroll position
drives a camera forward along a 900-unit track. Each section owns a set piece placed at that
section's own scroll depth, so scrolling literally flies into it:

| Section | Set piece |
|---|---|
| hero | wireframe icosahedron with orbiting satellites |
| index | nested frames you pass straight through |
| work | slabs drifting past on both sides |
| systems | the EasyShop architecture as a 3D node graph, packets crawling the links |
| shell | an instanced cube wall that ripples |
| stack | 150 cubes on a Fibonacci sphere |
| contact | concentric portal rings |

Scene background and key light interpolate between neighbouring sections and publish the
blended accent to CSS as `--scene-accent`, so the DOM recolours along with the camera.

### Interactive architecture blueprints

Three real systems drawn as SVG node graphs with packets animating along the edges. Every node
is selectable and explains its own role. The **flow player** steps through the full customer
journey — ten steps for EasyShop — lighting only the nodes and edges that step actually uses
and dimming the rest.

### A working terminal

A real command interpreter with history, tab completion and about a dozen commands:
`help`, `whoami`, `projects`, `open easyshop`, `neofetch`, `skills`, `certs`, `contact`.

### Type and motion

Giant display type measured at a probe size and scaled so each line spans its column edge to
edge, re-fitted after web fonts land and on resize. Headings decode from glyph noise on
entry, driven by wall clock rather than frame count so a throttled tab can never leave a
visitor staring at a garbled name.

## Structure

```
index.html      markup and content
css/style.css   design tokens, layout, motion
js/scene.js     the Three.js scene (ES module)
js/main.js      loader, type fitting, scramble, blueprint, terminal, scroll
```

## Running locally

No build step, but it needs to be served over HTTP because `scene.js` is an ES module:

```bash
python -m http.server 8777
# open http://localhost:8777
```

## Degrading gracefully

- **No WebGL, or the CDN doesn't answer** — the scene is skipped and the flat design underneath
  stands on its own. No blank page.
- **`prefers-reduced-motion`** — one static frame, no animation loops anywhere.
- **Backgrounded tab** — render loops stop rather than burning cycles.
- **Keyboard** — blueprint nodes are focusable and respond to Enter/Space.
- **Print** — a print stylesheet strips the scene and chrome so the page prints cleanly.

## Licence

Code is MIT. The written content and CV material are not — please don't reuse those.
