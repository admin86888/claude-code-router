import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { claudeCodeWrapperCmdScript, claudeCodeWrapperShellScript, restoreInactiveGlobalProfileConfigs } from "../../src/main/profile-service.ts";

test("profile service restores managed global Claude settings when only CCR-scoped Claude profiles are active", () => {
  const previousHome = process.env.HOME;
  const home = mkdtempSync(path.join(os.tmpdir(), "ccr-profile-home-"));
  process.env.HOME = home;
  try {
    const settingsFile = path.join(home, ".claude", "settings.json");
    mkdirSync(path.dirname(settingsFile), { recursive: true });
    const originalSettings = {
      env: {
        USER_VALUE: "kept"
      },
      theme: "dark"
    };
    writeFileSync(`${settingsFile}.ccr-backup-2026-01-01T00-00-00-000Z`, `${JSON.stringify(originalSettings, null, 2)}\n`);
    writeFileSync(settingsFile, `${JSON.stringify({
      apiKeyHelper: "/tmp/ccr-claude-code-api-key-claude-code",
      env: {
        ANTHROPIC_API_BASE_URL: "http://127.0.0.1:3456",
        ANTHROPIC_BASE_URL: "http://127.0.0.1:3456",
        ANTHROPIC_MODEL: "Fusion/GLM-5.2V",
        CLAUDE_AGENT_API_BASE_URL: "http://127.0.0.1:3456"
      }
    }, null, 2)}\n`);

    const statuses = restoreInactiveGlobalProfileConfigs([
      {
        agent: "claude-code",
        enabled: true,
        env: { CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1" },
        id: "claude-code-2",
        model: "Fusion/kimisearch",
        name: "Claude Code",
        scope: "ccr",
        settingsFile: "~/.claude/settings.json",
        smallFastModel: "",
        surface: "auto"
      }
    ]);

    const restored = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].client, "claude-code");
    assert.equal(statuses[0].ok, true);
    assert.equal(restored.env.USER_VALUE, "kept");
    assert.equal(restored.env.ANTHROPIC_MODEL, undefined);
    assert.equal(restored.env.CCR_CLAUDE_CODE_MODEL, undefined);
    assert.equal(restored.env.CODEXL_CLAUDE_CODE_MODEL, undefined);
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    rmSync(home, { force: true, recursive: true });
  }
});

test("profile service keeps managed global Claude settings when a global Claude profile is active", () => {
  const previousHome = process.env.HOME;
  const home = mkdtempSync(path.join(os.tmpdir(), "ccr-profile-home-"));
  process.env.HOME = home;
  try {
    const settingsFile = path.join(home, ".claude", "settings.json");
    mkdirSync(path.dirname(settingsFile), { recursive: true });
    writeFileSync(settingsFile, `${JSON.stringify({
      apiKeyHelper: "/tmp/ccr-claude-code-api-key-claude-code",
      env: {
        ANTHROPIC_API_BASE_URL: "http://127.0.0.1:3456",
        ANTHROPIC_BASE_URL: "http://127.0.0.1:3456",
        ANTHROPIC_MODEL: "Fusion/GLM-5.2V",
        CLAUDE_AGENT_API_BASE_URL: "http://127.0.0.1:3456"
      }
    }, null, 2)}\n`);

    const statuses = restoreInactiveGlobalProfileConfigs([
      {
        agent: "claude-code",
        enabled: true,
        env: {},
        id: "claude-code",
        model: "Fusion/GLM-5.2V",
        name: "Claude Code",
        scope: "global",
        settingsFile: "~/.claude/settings.json",
        smallFastModel: "",
        surface: "auto"
      }
    ]);

    const current = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(statuses.length, 0);
    assert.equal(current.env.ANTHROPIC_MODEL, "Fusion/GLM-5.2V");
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    rmSync(home, { force: true, recursive: true });
  }
});

test("Claude Code wrapper exports the CCR profile API key for CLI auth", () => {
  const config = {
    APIKEY: "ccr-default",
    APIKEYS: [],
    botGateway: { authType: "", platform: "none", profiles: [] },
    gateway: { host: "127.0.0.1", port: 3457 },
    profile: { profiles: [] },
    Providers: [],
    Router: {}
  };
  const profile = {
    agent: "claude-code",
    enabled: true,
    env: {},
    id: "claude-main",
    model: "litellm/deepseek-v4-flash-cc",
    name: "Claude Main",
    scope: "ccr",
    smallFastModel: "",
    surface: "cli"
  };

  const shellWrapper = claudeCodeWrapperShellScript(config, profile, "/tmp/ccr-runtime.js", "/tmp/ccr-api-key");
  assert.match(shellWrapper, /ANTHROPIC_API_KEY="\$\(\$CCR_REMOTE_SYNC_API_KEY_HELPER\)"/);
  assert.match(shellWrapper, /export ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN/);

  const cmdWrapper = claudeCodeWrapperCmdScript(config, profile, "C:\\ccr\\runtime.js", "C:\\ccr\\api-key.cmd");
  assert.match(cmdWrapper, /if not defined ANTHROPIC_API_KEY/);
  assert.match(cmdWrapper, /set "ANTHROPIC_AUTH_TOKEN=%ANTHROPIC_API_KEY%"/);
});
