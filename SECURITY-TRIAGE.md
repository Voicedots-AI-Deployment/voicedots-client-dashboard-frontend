# Dependency advisory triage — 2026-10-12

Axios, React Router, Vite, PostCSS and applicable transitive packages were upgraded with the package lock. Tailwind 3 is retained to preserve the current PostCSS/CSS behavior and existing visual improvements.

Residual scanner findings are build-tool dependencies:

- Braces 3.0.3 has no published patched release for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Chokidar, micromatch, fast-glob and Tailwind inherit the finding. Tailwind's configured patterns are trusted repository literals (`./index.html`, `./src/**/*.{js,ts,jsx,tsx}`); user uploads do not supply build globs. Malicious untrusted build patterns would require reassessment.
- Selector-parser [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) concerns runtime parsing of attacker-supplied selectors. This project compiles trusted source CSS. Overriding Tailwind/PostCSS-nested's selector-parser 6 constraint with version 7 changes AST iteration behavior and was not applied merely to reduce scanner counts.

No audit suppression or forced major framework migration was used. Scanner findings remain visible. These triage conclusions do not imply that arbitrary untrusted code/CSS/globs may be compiled safely; reevaluate if the build input boundary changes. Full browser/layout tests and a clean `npm ci` build remain required.
