---
description: Conclui (fecha) a task manual aberta do cwd atual no token-tracker
allowed-tools: Bash
---

Fecha a task manual aberta para o cwd atual.

```bash
PORT="${TRACKER_PORT:-4833}"
curl -fsS -X PATCH "http://127.0.0.1:${PORT}/api/manual-tasks?action=close" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg c "$PWD" '{cwd:$c}')"
echo
```

Mostre um resumo de uma linha do que foi concluído.
