---
description: Pausa a task manual aberta do cwd atual no token-tracker
allowed-tools: Bash
---

Pausa a task manual aberta para o cwd atual.

```bash
PORT="${TRACKER_PORT:-4833}"
curl -fsS -X PATCH "http://127.0.0.1:${PORT}/api/manual-tasks?action=pause" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg c "$PWD" '{cwd:$c}')"
echo
```

Mostre um resumo de uma linha do que foi pausado.
