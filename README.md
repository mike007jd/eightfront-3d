**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# Eight Fronts

An unofficial Three.js tribute game: eight stages, local two-player, modern/retro control schemes. All assets are procedural and original, every runtime resource is embedded, and the page makes no CDN requests.

## Run

```bash
npm run build
```

This produces `vendor/three.bundle.js` and `dist/index.html` (both generated, not committed). Open `dist/index.html` in a desktop browser, or run `npm run serve` and open the local address printed in the terminal. Requires Node.js 20 or newer; no npm dependencies to install.

## Controls

P1: WASD, J/mouse to fire, SPACE/K to jump, Q to switch weapon, E/G for grenade, SHIFT to aim in place, ESC to pause. P2: arrow keys, / to fire, . to jump, , to switch weapon, ' for grenade; the numpad also works.

In the base's regular rooms, strafe sideways to line up with the target column. For low targets, release movement and SHIFT first, then hold Down to fire prone; high targets need a jumping shot. The mouse does not replace posture switching in the base. Once every core is destroyed, move forward into the next room. Contextual guidance in Settings stays on, so you do not need to know the original game to start.

## License

The code is provided under the Apache License 2.0 (see [LICENSE](LICENSE)); redistributions must include LICENSE and [NOTICE.md](NOTICE.md). The embedded Three.js r179 keeps its own MIT license, reproduced in full in `vendor/THREE-LICENSE.txt`, which must also accompany redistributions. This is an unofficial tribute, not affiliated with Konami; see [NOTICE.md](NOTICE.md) for trademark and asset provenance statements.
