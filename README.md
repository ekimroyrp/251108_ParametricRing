# 251108_ParametricRing

251108_ParametricRing is an interactive Three.js playground for designing parametric ring geometries. A sleek HUD overlays the WebGL canvas, letting you sculpt a 2D profile and sweep it around a circular path to experiment with unique jewelry-inspired forms. The experience aims for instant visual feedback, tactile controls, and an Apple-like aesthetic.

## Features
- Real-time Three.js renderer with PBR lighting, orbit controls, and HDR room environment reflections.
- Lower-left profile editor with draggable control points plus a live preview of the smoothed spline curve.
- Glassmorphic control pod for profile count, twist, radius, cross-section scale, scale variance, and sampling density.
- Fully parametric sweep pipeline that rebuilds a closed mesh with Catmull-Rom sampled profiles and gradual twisting/scaling.
- Optional sculpt mode with raycast-driven brush strokes that push/pull vertices directly on the mesh surface.
- Reset actions for both the control points and the slider stack to quickly explore new looks.
- Hot-reload friendly TypeScript structure separating rendering, UI, state, and geometry helpers.

## Getting Started
1. Install dependencies: `npm install`
2. Start the dev server either by running `dev.bat` (double-click or via terminal) or executing `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm run dev`.
3. Open the Vite-served URL (usually http://localhost:5173) to interact with the editor.

## Controls
- Drag control points inside the mini-editor to reshape the 2D profile.
- Use the Profiles slider to set how many cross-sections are arrayed along the circle.
- Twist slider gradually rotates profile instances to create helical surfaces.
- Ring Radius adjusts the sweep radius; Profile Scale grows or shrinks the cross-section.
- Enable Sculpt Mode to click-drag on the ring and push/pull geometry with the screen-space brush.
- Orbit the camera with the mouse (left-drag to rotate, wheel to zoom, right-drag to pan).

## Deployment
The site is deployed via GitHub Pages at [ekimroyrp.github.io/251108_ParametricRing](https://ekimroyrp.github.io/251108_ParametricRing/).

To build locally:
1. `npm install`
2. `npm run build` – outputs the static site into `dist/` with relative asset paths.

To update the GitHub Pages deployment:
1. `git checkout gh-pages`
2. Replace branch contents with the latest `dist` artifacts (or use `npm run build && git checkout gh-pages && rm -rf * && cp -r ../main/dist/* .` workflow, ensuring only static files remain).
3. `git commit -am "deploy: update gh-pages"` and `git push origin gh-pages`.
