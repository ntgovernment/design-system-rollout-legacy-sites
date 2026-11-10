# design-system-rollout-legacy-sites
A repository dedicated to rolling out the new design system across legacy websites, primarily focusing on overriding existing colors, styles, and visual elements to align with the updated design standards and ensure a consistent look and feel.

## Setup

Requires Node.js 18+.

```bash
npm install
```

The design tokens come from the private repo
[ntgovernment/web-design-system-tokens](https://github.com/ntgovernment/web-design-system-tokens),
so the build needs GitHub access. Either:

- log in once with the GitHub CLI: `gh auth login`, or
- set a `GITHUB_TOKEN` environment variable with read access to that repo.

## Compile

| Command | What it does |
| --- | --- |
| `npm run build` | Downloads the latest tokens version from the tokens repo into `src/css/newntg.tokens.css` (**overwrites local edits**), then compiles. |
| `npm run build:local` | Compiles your existing `src/css/newntg.tokens.css` as-is, without downloading. Use this after editing the tokens file by hand. |
| `npm run dev` | Local dev server at http://localhost:5180 (uses the original `src/css/tokens.css`). |
| `npm run preview` | Serves the compiled `dist/` folder. |

Both build commands still ask the tokens repo for the latest version number,
which sets the output folder. To pin a version (and skip that lookup in
`build:local`), set `TOKENS_VERSION`:

```bash
# Git Bash
TOKENS_VERSION=0.0.2 npm run build:local
```

```powershell
# PowerShell
$env:TOKENS_VERSION="0.0.2"; npm run build:local
```

`TOKENS_THEME` picks a different theme file from the tokens repo (default `newntg`,
e.g. `TOKENS_THEME=ntg`).

## Output

```
dist/
├── index.html                 # test page, links the latest build
└── dev/ntg/<version>/
    ├── index.css              # compiled from src/css/*.css
    └── tokens.css             # from src/css/newntg.tokens.css
```

A build only writes its own `<version>` folder; older versions (e.g. `0.0.1/`)
are kept.

## Token files in `src/css/`

- `tokens.css`: the original tokens, used by the dev server. Never overwritten by the build.
- `newntg.tokens.css`: tokens from the tokens repo, published as `dist/dev/ntg/<version>/tokens.css`.
