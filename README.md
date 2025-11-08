# 251108_ParametricRing

251108_ParametricRing is an interactive Three.js playground for designing parametric ring geometries. A sleek HUD overlays the WebGL canvas, letting you sculpt a 2D profile and sweep it around a circular path to experiment with unique jewelry-inspired forms. The experience aims for instant visual feedback, tactile controls, and an Apple-like aesthetic.

## Features
- Real-time Three.js renderer with physically based shading, fog, and orbit controls.
- Lower-left profile editor with draggable control points on a circular workspace.
- Glassmorphic control pane for profile count, twist, radial scale, and profile scale.
- Live remeshing pipeline that rebuilds the swept mesh whenever parameters change.
- Hot-reload friendly code structure with clean separation of scene, UI, and state logic.

## Getting Started
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open the Vite-served URL (usually http://localhost:5173) to interact with the editor.

## Controls
- Drag control points inside the mini-editor to reshape the 2D profile.
- Use the Profiles slider to set how many cross-sections are arrayed along the circle.
- Twist slider gradually rotates profile instances to create helical surfaces.
- Ring Radius adjusts the sweep radius; Profile Scale grows or shrinks the cross-section.
- Orbit the camera with the mouse (left-drag to rotate, wheel to zoom, right-drag to pan).
