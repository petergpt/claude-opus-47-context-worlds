# Stonehenge Prompt

Explore the Stonehenge circle with accurate orthostat layout and observe solstice-aligned shadows (the scene should read as high-fidelity, not "boxy" or game-flat).

#### USER CONTROLS

- Sun Azimuth/Elevation sliders (lock to summer solstice by default).
- Grass Wind slider affects field sway; "Crowd" toggle adds distant visitors (prefer low-poly 3D instanced silhouettes with variation, not flat/improvised look).
- Free orbit/dolly; Reset to the Avenue alignment. Make it visually impressive (stones/ground/crowd should hold up close).

#### SCENE CONTENT & BACKGROUND

- Sarsen trilithons with lintels
- Bluestones inside the circle
- Chalky field (more natural/less fake-strong material detail)
- Low fences
- Distant barrows

#### REQUIREMENTS

- Hard, crisp shadows
- Stronger but still subtle lichen/moss variation on stones
- Chalk terrain patches with believable texture/normal/roughness variation
- Optional compass overlay lines for alignment

#### TECHNICAL SPECIFICATIONS

- Full implementation; custom controls; color-space compatibility; BufferGeometry; Instanced grass.
- >=55 FPS with grass density adapting to camera height (visual upgrades must remain performance-conscious).
