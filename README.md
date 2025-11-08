# 251108_ParametricRing

251108_ParametricRing is an interactive Three.js playground for designing parametric ring geometries. A sleek HUD overlays the WebGL canvas, letting you sculpt a 2D profile and sweep it around a circular path to experiment with unique jewelry-inspired forms. The experience aims for instant visual feedback, tactile controls, and an Apple-like aesthetic.

## Features
- Real-time Three.js renderer with PBR lighting, orbit controls, and HDR room environment reflections.
- Lower-left profile editor with draggable control points plus a live preview of the smoothed spline curve.
- Glassmorphic control pod for profile count, twist, radius, cross-section scale, scale variance, and sampling density.
- Fully parametric sweep pipeline that rebuilds a closed mesh with Catmull-Rom sampled profiles and gradual twisting/scaling.
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
- Orbit the camera with the mouse (left-drag to rotate, wheel to zoom, right-drag to pan).
