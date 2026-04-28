# Voxel Rome Prompt

#### OBJECTIVE

Create a breathtaking, high-definition voxel-art simulation of the entire Ancient Roman City Centre, anchored by a massive, detailed Colosseum. The scene must be generated procedurally, featuring topography, a dense cityscape, and intelligent layout planning.

#### USER CONTROLS

- **Camera:** "God-mode" orbit controls (Left-click rotate, Right-click pan, Scroll zoom).
- **Shortcuts:**
  - **[R]** Re-centre on Colosseum.
  - **[F]** Flyover mode (constant rotation around the city).
  - **[T]** Toggle Time of Day (Day/Sunset).

#### WORLD GENERATION & GEOLOGY (Requirement: Solid & Natural)

- **Topography:** Generate a terrain mesh representing the "Seven Hills of Rome" (rolling elevation changes) and the Tiber River cutting through the edge of the map.
- **Solid Ground:** Ensure the floor is a continuous, solid voxel mesh (no gaps/voids). Use varied palettes for the ground: cobblestone for streets, grassy banks for hills, and dirt for the arena floor.
- **Vegetation:** Procedurally scatter Roman vegetation: Italian Cypress trees (tall/thin), Umbrella Pines (high canopy), and olive shrubs on the hillsides to frame the architecture.

#### ARCHITECTURAL SCOPE (Requirement: High Definition & Variety)

#### The Colosseum (Centerpiece)

- High-resolution voxel scale (smaller voxels for finer detail).
- **Internal details:** Cavea (seating tiers), the Hypogeum (exposed underground maze), and the Velarium (awning structure).
- **Population:** Dense crowds (colored voxel clusters) and Gladiators battling in the center.

#### The City Centre (The Forum & Surroundings)

- Surrounding the Colosseum, generate a dense array of contemporary structures.
- **Landmarks:** Include abstract representations of the Arch of Constantine, the Temple of Venus and Roma, and the Basilicas.
- **Infrastructure:** Aqueducts spanning the horizon, colonnades, and a distant Circus Maximus track if render budget allows.
- **Residential:** Dense insulae (apartment blocks) with terracotta roofs filling the gaps between major monuments.

#### CITY PLANNING LOGIC (Requirement: No Overlap)

- **Grid & Collision:** Implement a bounding-box allocation system. Before placing a building, check the grid to ensure no overlap with existing geometry.
- **Zoning:**
  - **Zone A (Center):** Colosseum (Fixed position).
  - **Zone B (Forum):** High-density Temples and Basilicas.
  - **Zone C (Outskirts):** Residential and Hills.
- **Roads:** Generate clear "Cardo" and "Decumanus" style stone pathways connecting major buildings; buildings must snap to these paths.

#### VISUAL FIDELITY

- **Atmosphere:** Warm, Mediterranean lighting.
- **Water:** The Tiber River must feature a reflective or semi-transparent blue voxel material.
- **Palette:** Use a rich, historical palette: Travertine (creamy white), Porphyry (purple/red), Terracotta (orange/brown), Marble (white/grey), and Gold accents for temple roofs.
- **Shadows:** Approximate ambient occlusion or directional lighting to give depth to the voxel blocks.

#### TECHNICAL SPECIFICATIONS

- **Deliverable:** Provide the full implementation.
- **Offline only:** All code/assets embedded. NO external imports/CDNs.
- **Performance:** Target >= 55 FPS.
- **Crucial:** Use InstancedMesh (Three.js concept or WebGL equivalent) for all voxels. Do NOT create individual geometry for every block. Merge geometries where possible.
- Use a shared texture atlas generated programmatically (Canvas API) for voxel colors to reduce draw calls.

#### IMPLEMENTATION GUARDRAILS

- **Module Resolution:** Use `<script type="importmap">` for any Three.js logic, mapping `"three"` to a minified, base64-encoded inline version OR write raw WebGL2 if confident.
- **Scope Safety:** Use const/let, avoid global namespace pollution.
- **Memory:** Dispose of geometries/materials if regenerating.
- **Code Quality:** Robust error handling. If a procedural placement fails 10 times, skip that building to prevent infinite loops.

#### FINAL OUTPUT INSTRUCTION

Generate the full output now. Ensure the scale feels "Grand" and the resolution is high enough that the Colosseum looks curved rather than square.
