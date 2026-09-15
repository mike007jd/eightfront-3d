**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# Eight Fronts

![Eight Fronts title screen](docs/title.jpg)

An unofficial Three.js tribute to the 8-bit run-and-gun classics: eight stages, local two-player co-op, modern or retro control schemes. Every asset is procedural and original, every runtime resource is embedded, and the page makes no CDN requests — one HTML file, fully offline.

- **Three stage layouts** — side-scrolling fronts, into-the-screen base rooms, and a vertical waterfall climb.
- **Eight bosses** with exposed/sealed core phases and target-local markers that tell you what can be hit right now.
- **Five weapons** (rifle, machine gun, spread, laser, flame) plus grenades; pick-ups carry one reserve weapon.
- **Local co-op** on one keyboard or two gamepads; no friendly fire, a downed player rejoins at the next life.
- **Modern or retro rules** — mouse aim, hold-to-fire and short hops, or fixed jump height and eight-way aim with tap-to-fire.
- **In-game guidance** — contextual cues for the base rooms and bosses, switchable to always-on or off.
- **UI in English, 简体中文 and 日本語** — switch from the main menu.
- Original forward-HDR pipeline on Three.js r179: GPU-skinned commandos, SSAO, shadow-aware fog, bloom; three quality presets.

![Jungle Assault gameplay](docs/gameplay.jpg)

## The eight fronts

| | Stage | Layout | Boss | Notes |
|---|---|---|---|---|
| <img src="docs/stage-1.jpg" width="220" alt="Jungle Assault"> | **01 Jungle Assault** | Side-scroll | Super Wall | Break the wall, find the entrance. Collapsing bridge, tree platforms, first weapon caches. |
| <img src="docs/stage-2.jpg" width="220" alt="Base 1"> | **02 Base 1** | Into the screen · 5 rooms | Ocular Defense | Destroy the sensors, advance through the barrier. Sidestep into the column; stand, prone or jump to change the gun line. |
| <img src="docs/stage-3.jpg" width="220" alt="Waterfall Climb"> | **03 Waterfall Climb** | Vertical | Waterfall Guardian | Climb 24 tiers of rock while boulders roll down; break the guardian's arms before its core opens. |
| <img src="docs/stage-4.jpg" width="220" alt="Base 2"> | **04 Base 2** | Into the screen · 8 rooms | Illusion Core | Armored sensors, floor rollers and grenadiers. Crack the armor standing, finish the core prone or jumping. |
| <img src="docs/stage-5.jpg" width="220" alt="Snow Field"> | **05 Snow Field** | Side-scroll | Armored UFO | Cross the frozen front past mines and tanks; shoot out the carrier's engines to change its flight path. |
| <img src="docs/stage-6.jpg" width="220" alt="Energy Zone"> | **06 Energy Zone** | Side-scroll | Giant Soldier | Read the flame-jet cycle. The boss telegraphs wind-up, rush and leap — its core is open while it winds up. |
| <img src="docs/stage-7.jpg" width="220" alt="Hangar"> | **07 Hangar** | Side-scroll | Armored Gate | Dodge the presses and carts on moving platforms, then break the gate's locks. |
| <img src="docs/stage-8.jpg" width="220" alt="Alien's Lair"> | **08 Alien's Lair** | Side-scroll | Alien Heart | Destroy the brood pods and the acid-spitting head; burst the sacs so the heart is exposed. |

Any stage can be practised from the stage select without touching the campaign save. Campaign progress, weapons and lives carry over between stages and are saved locally in the browser.

![Stage select](docs/stages.jpg)

## Run

```bash
npm run build
```

This produces `vendor/three.bundle.js` and `dist/index.html` (both generated, not committed). Open `dist/index.html` in a desktop browser, or run `npm run serve` and open the local address printed in the terminal. Requires Node.js 20 or newer; no npm dependencies to install. The main menu's **Save offline copy** button writes the same single-file build from inside the game.

Desktop only: keyboard, mouse or gamepad. Touch-only devices show a notice instead of the game.

## Controls

| Action | P1 | P2 | Gamepad |
|---|---|---|---|
| Move / aim / crouch | W A S D | Arrow keys | D-pad or left stick |
| Fire | J or left mouse | / (Numpad 1) | X or RT |
| Jump | SPACE or K | . (Numpad 2) | A |
| Switch weapon | Q | , (Numpad 0) | Y |
| Grenade | E or G | ' (Numpad 3) | RB |
| Aim in place | Left SHIFT | Right SHIFT | LB |
| Pause | ESC | ESC | Start |

Solo play also accepts the arrow keys, Z (fire) and X (jump). ↓ + Jump drops through one-way platforms. In modern rules P1 can aim with the mouse or the right stick; retro rules disable free aim.

In the base's regular rooms, strafe sideways to line up with the target column. For low targets, release movement and SHIFT first, then hold Down to fire prone; high targets need a jumping shot. The mouse does not replace posture switching in the base. Once every core is destroyed, move forward into the next room.

## Options

- **Squad** — solo or local 2P. **Language** — English, 简体中文, 日本語.
- **Campaign options** — Modern / Retro controls; Arcade (3 armor, checkpoints refill) / Classic (one hit) difficulty.
- **Settings** — quality preset (Smooth / High / Cinematic), render resolution 50–125 %, reduced screen shake and flashes, guidance level (contextual / enhanced / off), reset of learned controls.
- **Diagnostics** — F3 frame stats, F8 hides the UI, and an export of raw frame times as JSON.

## Project layout

Plain browser scripts concatenated by `scripts/build.mjs`; no bundler or framework.

| File | Role |
|---|---|
| `src/shell.html` | Markup and CSS for the menus, HUD and dialogs |
| `src/app.js` | Input, menus, settings, saves, HUD sync |
| `src/game.js` | Simulation: players, enemies, bosses, rooms, checkpoints |
| `src/stages.js` | Eight stage definitions, base room encounters, weapons |
| `src/guidance.js`, `src/guidance-ui.js` | Target-state model and the on-screen cues |
| `src/i18n.js` | UI strings for en / zh / ja |
| `src/renderer-three.js`, `src/shaders.js` | Forward HDR pipeline on Three.js r179 |
| `src/characters.js`, `src/geometry.js`, `src/*-assets.js` | Procedural rigs, meshes and biome props |
| `src/stage-previews.js` | Embedded stage thumbnails (crops of the game's own frames) |

## License

The code is provided under the Apache License 2.0 (see [LICENSE](LICENSE)); redistributions must include LICENSE and [NOTICE.md](NOTICE.md). The embedded Three.js r179 keeps its own MIT license, reproduced in full in `vendor/THREE-LICENSE.txt`, which must also accompany redistributions. This is an unofficial tribute, not affiliated with Konami; see [NOTICE.md](NOTICE.md) for trademark and asset provenance statements.
