---
description: Inicia uma task manual no token-tracker para o cwd atual
allowed-tools: Bash
---

Inicia uma task manual no tracker local. Argumento: título da task.

Execute via Bash, sem confirmar:

```bash
TITLE="${ARGUMENTS:-task manual}"
PORT="${TRACKER_PORT:-4833}"
curl -fsS -X POST "http://127.0.0.1:${PORT}/api/manual-tasks" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg t "$TITLE" --arg c "$PWD" --arg n "$(basename "$PWD")" '{title:$t, cwd:$c, projectName:$n}')"
echo
```

Após executar, mostre um resumo de uma linha (id da task + título).
