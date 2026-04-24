const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[cursor-plugin] ERROR: ${message}`);
  process.exitCode = 1;
}

function readJson(jsonPath) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (error) {
    fail(`Failed to read JSON at ${jsonPath}: ${error.message}`);
    return null;
  }
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found: ${filePath}`);
    return false;
  }
  return true;
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const pluginRoot = path.join(rootDir, 'cursor-plugin');
  const manifestPath = path.join(pluginRoot, '.cursor-plugin', 'plugin.json');
  const mcpConfigPath = path.join(pluginRoot, 'mcp.json');
  const mcpBundlePath = path.join(pluginRoot, 'dist', 'mcp-server.js');
  const boardHtmlPath = path.join(pluginRoot, 'ui', 'board', 'index.html');

  assertExists(pluginRoot, 'Plugin root');
  assertExists(manifestPath, 'Plugin manifest');
  assertExists(mcpConfigPath, 'MCP config');
  assertExists(mcpBundlePath, 'MCP server bundle');
  assertExists(boardHtmlPath, 'MCP board HTML');

  const manifest = readJson(manifestPath);
  if (manifest) {
    if (!manifest.name || typeof manifest.name !== 'string') {
      fail('plugin.json must include a string "name".');
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      fail('plugin.json must include a string "version".');
    }
    if (!manifest.repository || typeof manifest.repository !== 'string') {
      fail('plugin.json should include a repository URL string.');
    }
  }

  const mcpConfig = readJson(mcpConfigPath);
  if (mcpConfig) {
    const server = mcpConfig.mcpServers && mcpConfig.mcpServers.taskplanner;
    if (!server) {
      fail('mcp.json must define mcpServers.taskplanner.');
    } else {
      if (server.command !== 'node') {
        fail('mcp.json mcpServers.taskplanner.command must be "node".');
      }
      const args = Array.isArray(server.args) ? server.args : [];
      if (!args.includes('${CURSOR_PLUGIN_ROOT}/dist/mcp-server.js')) {
        fail('mcp.json args must include ${CURSOR_PLUGIN_ROOT}/dist/mcp-server.js.');
      }
    }
  }

  if (process.exitCode && process.exitCode !== 0) {
    return;
  }
  console.log('[cursor-plugin] Validation passed.');
}

main();
