const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  logLevel: 'info',
};

async function main() {
  const extensionCtx = await esbuild.context({
    ...shared,
    entryPoints: ['src/extension/extension.ts'],
    outfile: 'dist/extension.js',
    external: ['vscode'],
    plugins: [
      {
        name: 'watch-plugin',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log('[watch] extension build succeeded');
            }
          });
        },
      },
    ],
  });

  const mcpCtx = await esbuild.context({
    ...shared,
    entryPoints: ['src/mcp/server.ts'],
    outfile: 'cursor-plugin/dist/mcp-server.js',
    plugins: [
      {
        name: 'watch-plugin',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log('[watch] mcp-server build succeeded');
            }
          });
        },
      },
    ],
  });

  if (watch) {
    await extensionCtx.watch();
    await mcpCtx.watch();
    console.log('[watch] watching for changes...');
  } else {
    await extensionCtx.rebuild();
    await mcpCtx.rebuild();
    await extensionCtx.dispose();
    await mcpCtx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
