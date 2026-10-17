# Optional Stop hook

This hook is off by default. When enabled, every time Claude Code is about to stop it runs

```bash
codewolf review --format plain --fail-on critical
```

on the uncommitted changes. If a critical finding remains, the hook exits with code 2 and Claude Code keeps working with the findings as feedback. If CodeWolf cannot run (no provider configured, network down), the hook lets Claude stop and prints a note. It never blocks twice in a row: when Claude is already continuing because of this hook (`stop_hook_active`), it lets the stop through.

Each review costs one model call per changed chunk, so enable it only where that is acceptable.

## Enable it

Option 1, inside the plugin: copy `hook-example/hooks.json` to `hooks/hooks.json` in your installed copy of the plugin (or in a fork), then run `/reload-plugins`.

Option 2, per project: add this to `.claude/settings.json`, pointing at a checkout of this repository:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node /path/to/codewolf/integrations/claude-code/scripts/stop-review.mjs", "timeout": 600 }
        ]
      }
    ]
  }
}
```

## Disable it

Delete `hooks/hooks.json` (option 1) or remove the `Stop` entry (option 2).
