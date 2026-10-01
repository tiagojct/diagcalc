# CLAUDE.md

Read [AGENTS.md](AGENTS.md) for the current architecture, style, verification, deployment and versioning instructions. Read [lib/README.md](lib/README.md) for shared API contracts and [docs/PROVENANCE.md](docs/PROVENANCE.md) before modifying presets. These documents replace the former three-file/manual-only guidance.

Run `npm run check` before completing substantive changes. This checks types, numeric contracts, CLI and real terminal flows, package/deployment artifacts and all three browser engines. The static app still loads directly from `index.html` without a build step.
