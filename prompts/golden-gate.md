# Golden Gate Prompt

OBJECTIVE
Realistic representation of the Golden Gate Bridge with a hint of the Presidio and Marin Headlands, tuned to feel like the real San Francisco Bay. Prioritize a believable atmosphere/sky, water, and traffic flow.

USER CONTROLS
- Fog bank slider: 0 → 100%
  - Controls a **height-based fog bank** that lives mostly under and around the deck.
  - At 100% it should be unmistakably foggy around the bridge and water surface (even in Clear weather), rising and falling as a coherent bank, not just a global haze.
- Traffic density slider: 0 → 100%
  - Controls the number of vehicles on the roadway and approaches.
  - Vehicles drive continuously and loop seamlessly so traffic feels endless.
- Water waves slider: 0 → 100%
  - Controls how wavy/choppy the bay looks (wave height, choppiness, and whitewater/foam presence).
  - At 0% water is calmer (gentle ripples). At 100% (especially in Stormy) it should look close to storm conditions, not just a subtle height shift.
- Weather selector: presets (Clear, Marine layer, Overcast, Stormy)
  - Each preset should be **meaningfully different**, not minor tweaks.
  - Clouds should be visible and animated (layered drift), with cloud height/opacity responding to the active preset.
  - Clear: vibrant, believable blue sky; crisp visibility; minimal cloud cover.
  - Marine layer: a low fog bank/haze sitting near the water/under the deck; cooler lighting.
  - Overcast: heavy cloud cover with diffuse lighting; muted contrast but still clearly visible (not “can’t see anything”).
  - Stormy: dark clouds, rain, lightning; stronger waves; dramatic but still readable (not pure black or an overly aggressive rectangular haze layer). Lightning should briefly illuminate the scene/water.
  - Rain should be visibly present and make surfaces look wet (road/bridge sheen, occasional puddling).
- Time of day slider: Morning → Night
  - Drives sun/moon position, sky color, exposure, water color, stars, and intensities for night-time lights (deck lights, vehicle lights, skyline, Alcatraz).
  - Sunrise/sunset should be clearly visible and “golden hour” should feel distinct from midday.
- Comet button (available at night)
  - Pressing the button sends a visible comet across the sky **above the bridge**, traveling roughly perpendicular to the bridge’s span.
  - The comet should have a believable head + glowing tail (golden tint), without hard-edged halos.
  - It should briefly light up the environment in an impressive way and produce a visible reflection/response on the water.
- Whales button
  - Pressing the button spawns **1–5 humpback whales** in the bay (randomized count), behaving as a loose group.
  - Whales should look recognizable (not like submarines) and do typical behaviors: swimming, surfacing, breaching/tail slaps, etc.
  - They must stay in the water, avoid land, and avoid intersecting the bridge/structures.
  - Their motion should produce visible water interaction: ripples, spray/splashes, and disturbance that reads with the current wave conditions.
- Camera: Free orbit / pan / dolly (OrbitControls-style).
- UI readout: show current values for fog %, traffic %, waves %, whales count, and a time-of-day label.

SCENE CONTENT & BACKGROUND
- Golden Gate Bridge
  - Two Art Deco towers, suspension cables, and vertical hangers in correct “International Orange”.
  - Suspension system must read as structurally connected:
    - Main cables attach at tower tops and continue to both ends (anchorages), not terminating mid-air.
    - Vertical hangers run continuously from main cables down to the deck along the main span.
  - Bridge shape should be coherent and believable:
    - Towers are not floating; they connect to believable bases/footings at water/land.
    - Road deck and side edges/catwalk elements connect cleanly to approaches (no mismatched “edgy” shapes where a rounded/circular edge is expected).
- Roadway and traffic
  - Roadway on top of the deck plus approach roads on both sides with lane markings.
  - Approach roads should extend far enough that the visible road doesn’t end abruptly near the bridge (traffic should disappear off-screen naturally).
  - Multi-lane traffic in both directions:
    - Mix of cars and heavier vehicles (trucks/buses), with **10+ visually distinct vehicle archetypes** and realistic scale variation.
    - Vehicle colors must be varied and realistic (traditional automotive palette; avoid toy-like saturation; avoid “all grey”).
    - Vehicles must not overlap/clip through each other; maintain believable spacing so both directions read correctly.
    - Headlights/taillights are emissive and brighten as it gets darker.
- Terrain and shoreline
  - Natural terrain for Presidio (south) and Marin (north): rolling hills framing the bridge down to shoreline.
  - Vegetation shading: deeper greens near water, pushing into slightly dry/golden tones at higher elevations; avoid neon/flat greens.
  - Shoreline should look **natural**, not like a square cutout; land should extend to the edges of the simulation so the world doesn’t feel like a clipped rectangle.
  - Ensure water/shore interaction doesn’t flicker at shallow areas (no “z-fighting” look).
- San Francisco skyline (distant silhouette) on the Presidio side
  - Simple skyline silhouette with soft window/emissive detail that becomes more noticeable at night.
  - Night emissives should feel plausible (not overly harsh/glowy).
- Alcatraz hint
  - Small island with rocky base, a main prison block mass, and a simple tower/lighthouse element with subtle emissive at night.
- Bay water
  - Visually impressive water that avoids obvious tiling/square artifacts.
  - Multi-scale wave motion with foam/whitewater accents, especially at higher wave settings and stormy weather.
  - Reflects sun/moon and overall sky color in a believable, non-blinding way (avoid “white-out” reflections at midday).
  - Integrates with fog and weather (fog bank sits on/over it; stormy rain affects its look).
- Vessels
  - Several varied boats/ships (not just rectangles) such as cargo/container ships, tankers, and a ferry.
  - Ships should follow **purposeful routes** (e.g., recognizable shipping lanes / ferry route), not aimless drifting, and move independently with distinct speeds/phases.
  - Ships remain in the water and do not intersect land/bridge; light bobbing/wake is a plus if it reads well.
- Additional environment detail
  - Instanced trees placed on hillsides (no floating trees, none in water).
  - Small flock of birds circling/gliding near/around the bridge.
  - Distant background/bowl geometry to close the horizon.
- Sky, Sun, Moon, Stars
  - Day sky must be clearly **blue** in Clear weather, with a natural horizon haze gradient (not pale grey/white).
  - The sun should be visible as a disc/bright element when above the horizon, not just an overexposed white screen.
  - Morning vs midday vs afternoon should feel different; sunrise/sunset should be clearly warmer and more dramatic.
  - Night sky should be dark but not empty: visible moon and a tasteful starfield (stars present and noticeable, but not overly dense).
  - Stars fade in/out smoothly during the day→night transition.

TECHNICAL SPECIFICATIONS
- Create a Self-contained output that runs in a blank Chrome tab with no bundler/build step.
- Use Three.js as ES modules only:
  - Include an import map (before the module script) mapping `"three"` and `"three/addons/"` to the same pinned Three.js version.
  - Import only via those names (no other bare specifiers).
- Performance:
  - Use instanced meshes for repeated objects (cars, trees, skyline windows/buildings, etc.) and avoid unnecessary per-frame allocations.
- Code quality:
  - Never reuse identifiers in the same scope or shadow variables; prefer descriptive names.
- Rendering:
  - Physically plausible lighting setup (sun/moon directional, hemisphere/ambient fill as appropriate).
  - ACES-Filmic tone mapping and sRGB output.
  - Avoid deprecated Three.js settings and avoid any console errors/warnings (e.g., shader compile errors, WebGL feedback loop errors).
