import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// Design tokens are pulled from the (private) tokens repo at build time.
// Layout there: dist/tokens/<version>/<theme>.tokens.css
const TOKENS_REPO = 'ntgovernment/web-design-system-tokens';
const TOKENS_PATH = 'dist/tokens';
const TOKENS_THEME = process.env.TOKENS_THEME || 'newntg';

// Published asset location: dist/<channel>/<package>/<tokens version>/
const CHANNEL = 'dev';
const PACKAGE = 'ntg';

// Original local token file referenced by index.html (never overwritten).
const LOCAL_TOKENS = '/src/css/tokens.css';

function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(
      `Cannot read ${TOKENS_REPO}: set GITHUB_TOKEN or log in with \`gh auth login\`.`
    );
  }
}

async function github(path, raw = false) {
  const res = await fetch(`https://api.github.com/repos/${TOKENS_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${githubToken()}`,
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'User-Agent': 'design-system-rollout-legacy-sites'
    }
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${TOKENS_REPO}/${path}`);
  return raw ? res.text() : res.json();
}

const semver = (v) => v.split('.').map(Number);
const compareSemver = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

async function latestTokensVersion() {
  const entries = await github(TOKENS_PATH);
  const versions = entries
    .filter((e) => e.type === 'dir' && /^\d+\.\d+\.\d+$/.test(e.name))
    .map((e) => e.name)
    .sort(compareSemver);
  if (!versions.length) throw new Error(`No versions found in ${TOKENS_REPO}/${TOKENS_PATH}`);
  return versions.at(-1);
}

// Downloads the remote token file into its own file in src/css/
// (e.g. src/css/newntg.tokens.css), leaving the original tokens.css untouched.
async function syncTokens(version) {
  const file = `${TOKENS_PATH}/${version}/${TOKENS_THEME}.tokens.css`;
  const css = `/* ${TOKENS_REPO}/${file} */\n` + (await github(file, true));
  const target = `src/css/${TOKENS_THEME}.tokens.css`;
  await writeFile(new URL(`./${target}`, import.meta.url), css);
  console.log(`tokens ${version} (${TOKENS_THEME}) -> ${target}`);
  return css;
}

// index.html links src/css/tokens.css (the original tokens, used by the dev
// server). In the build, publish the downloaded tokens under that name instead.
// The link has a `media` attribute, so Vite copies it as a plain asset straight
// from disk -- swap its contents when the bundle is written.
function publishTokens(css) {
  return {
    name: 'publish-remote-tokens',
    apply: 'build',
    generateBundle(_, bundle) {
      const asset = Object.values(bundle).find(
        (f) => f.type === 'asset' && f.originalFileName?.replace(/\\/g, '/') === LOCAL_TOKENS.slice(1)
      );
      if (!asset) this.error(`${LOCAL_TOKENS} not found in the build output`);
      asset.source = css;
    }
  };
}

export default defineConfig(async ({ command, mode }) => {
  // TOKENS_VERSION=0.0.1 pins a specific version; otherwise use the latest.
  const version =
    command === 'build' ? process.env.TOKENS_VERSION || (await latestTokensVersion()) : null;

  // `vite build --mode offline` (npm run build:local) compiles the existing
  // src/css/<theme>.tokens.css as-is, without downloading over local edits.
  let tokensCss = null;
  if (version && mode === 'offline') {
    const target = `src/css/${TOKENS_THEME}.tokens.css`;
    tokensCss = await readFile(new URL(`./${target}`, import.meta.url), 'utf8');
    console.log(`tokens ${version} (${TOKENS_THEME}) <- local ${target}`);
  } else if (version) {
    tokensCss = await syncTokens(version);
  }
  const assetDir = `${CHANNEL}/${PACKAGE}/${version}`;

  return {
    base: './',
    plugins: tokensCss ? [publishTokens(tokensCss)] : [],
    server: {
      port: 5180,
      open: false
    },
    build: {
      outDir: 'dist',
      // keep other versions (e.g. dist/dev/ntg/0.0.1/) when rebuilding
      emptyOutDir: false,
      rollupOptions: {
        output: {
          // stable, unhashed names -- consistent with the main website/ project
          assetFileNames: `${assetDir}/[name][extname]`,
          entryFileNames: `${assetDir}/[name].js`,
          chunkFileNames: `${assetDir}/[name].js`
        }
      }
    }
  };
});
