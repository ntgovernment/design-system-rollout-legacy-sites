import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Design tokens are pulled from the (private) tokens repo at build time.
// Layout there: dist/tokens/<version>/<theme>.tokens.css
const TOKENS_REPO = 'ntgovernment/web-design-system-tokens';
const TOKENS_PATH = 'dist/tokens';
const TOKENS_THEME = process.env.TOKENS_THEME || 'newntg';

// Published asset location: dist/<channel>/<package>/<tokens version>/
const CHANNEL = 'dev';
const PACKAGE = 'ntg';

// Local token file referenced by index.html -- used as-is by the dev server,
// swapped for the remote tokens during `vite build`.
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

// Replaces src/css/tokens.css with the remote token file during build.
function remoteTokens(version) {
  let css;
  return {
    name: 'remote-design-tokens',
    apply: 'build',
    enforce: 'pre',
    async buildStart() {
      const file = `${TOKENS_PATH}/${version}/${TOKENS_THEME}.tokens.css`;
      css = `/* ${TOKENS_REPO}/${file} */\n` + (await github(file, true));
      this.info(`using tokens ${version} (${TOKENS_THEME})`);
    },
    // index.html links tokens.css with a `media` attribute, so Vite copies it
    // as a plain asset (read straight from disk) -- swap its contents here.
    generateBundle(_, bundle) {
      const asset = Object.values(bundle).find(
        (f) => f.type === 'asset' && f.originalFileName?.replace(/\\/g, '/') === LOCAL_TOKENS.slice(1)
      );
      if (!asset) this.error(`${LOCAL_TOKENS} not found in the build output`);
      asset.source = css;
    }
  };
}

export default defineConfig(async ({ command }) => {
  // TOKENS_VERSION=0.0.1 pins a specific version; otherwise use the latest.
  const version =
    command === 'build' ? process.env.TOKENS_VERSION || (await latestTokensVersion()) : null;
  const assetDir = `${CHANNEL}/${PACKAGE}/${version}`;

  return {
    base: './',
    plugins: version ? [remoteTokens(version)] : [],
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
