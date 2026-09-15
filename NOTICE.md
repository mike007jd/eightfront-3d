# Notices and provenance

Eight Fronts
Copyright 2026 mike007jd

Licensed under the Apache License, Version 2.0 (see LICENSE). Redistributions must keep this NOTICE file.

Unofficial fan tribute, not an official Konami release. The project contains no original ROM, commercial sprite sheets, extracted commercial character models, music recordings or font files. Geometry, rigs, IK, materials, shaders, VFX, guidance UI and cue sounds are procedural and authored in `src/`; commando geometry, rig and IK live in `src/characters.js` and incorporate no MakeHuman asset. Chapter-preview JPEGs embedded as data URIs in `src/stage-previews.js` are crops of this project's own rendered frames, used as navigation thumbnails. The JPEGs in `docs/` are screenshots of this project's own builds, used in the README.

## Bundled renderer

Three.js r179 is the only rendering backend; there is no native WebGL replacement or fallback. The two local, unmodified official distribution files are checked against the official r179 Git blob fingerprints by `scripts/bundle-three.mjs` on every build.

| File | Bytes | Official Git blob SHA-1 |
|---|---:|---|
| three.core.js | 1401321 | 3ed693adea2a7e940c56d16b4bfa0e61041c076a |
| three.module.js | 603380 | 6c6b8a0880aa505b5ffadea5a3d68b15d74698fa |

Official source references:
https://github.com/mrdoob/three.js/blob/r179/build/three.core.js
https://github.com/mrdoob/three.js/blob/r179/build/three.module.js
https://github.com/mrdoob/three.js/blob/r179/LICENSE

Three.js is MIT licensed. The complete notice is included in `vendor/THREE-LICENSE.txt`, the distribution headers and the HTML shell. Keep those notices with redistributed builds.
