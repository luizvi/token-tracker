---
name: registro-atividades
description: Gera registro de atividades para preenchimento de planilha de horas. Busca git log e claude-mem para reconstruir o que foi feito em um periodo. Use quando o usuario pedir relatorio de atividades, timesheet, registro de horas, ou recapitular trabalho feito.
---

# Registro de Atividades

Gera um resumo de atividades realizadas em um projeto para preenchimento de planilha de horas/timesheet.

## Uso

O usuario informa o periodo desejado:
- `/registro-atividades 01/04 a 07/04`
- `/registro-atividades ultima semana`
- `/registro-atividades mes de marco`

Se nenhum periodo for informado, pergunte.

## Fontes de dados

Buscar atividades em **todas** as fontes disponiveis, em paralelo:

1. **Git log** — commits no periodo, agrupados por dia:
   ```bash
   git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline --format="%ad %s" --date=short --all | sort
   ```

2. **claude-mem** — observacoes do periodo via `mcp__plugin_claude-mem_mcp-search__timeline` ou `mcp__plugin_claude-mem_mcp-search__search` com filtro de data. Disponivel se o plugin claude-mem estiver instalado.

3. **token-tracker** — tasks manuais e detectadas no periodo:
   ```bash
   PORT="${TRACKER_PORT:-4833}"
   curl -fsS "http://127.0.0.1:${PORT}/api/tasks?since=YYYY-MM-DD&until=YYYY-MM-DD" 2>/dev/null
   ```

4. **PRs mergeadas** — se disponivel via `gh`:
   ```bash
   gh pr list --state merged --search "merged:YYYY-MM-DD..YYYY-MM-DD" --limit 50
   ```

## Formato de saida

Tabela markdown com uma linha por dia, no formato:

| Data | Dia | Descricao |
|------|-----|-----------|
| DD/MM/AAAA | dia-da-semana | Descricao concisa das atividades do dia, separadas por ponto. |

### Regras do formato:

- **Uma linha por dia** — agrupar todas as atividades do dia em uma unica descricao
- **Dias sem atividade** ficam com descricao vazia (linha presente mas sem texto)
- **Descricao concisa** — frases curtas separadas por ponto, sem detalhes tecnicos excessivos
- **Foco no "o que"** — descrever a atividade/entrega, nao o como
- **Agrupar PRs relacionadas** — se varias PRs tratam do mesmo tema no mesmo dia, consolidar em uma frase
- **Sem coluna de horas** — o usuario preenche as horas manualmente
- **Linguagem** — usar a mesma lingua que o usuario usou no pedido

### Exemplo de descricao boa:
> Correcao de geracao de PDF com seguranca de arquivos ativa. Remocao de mutex global da fila de conversao.

### Exemplo de descricao ruim (muito tecnica/verbosa):
> Fix no PdfController para converter imagens para data URI base64 quando a feature flag PROTECAO_ARQUIVOS esta ativa, alterando os metodos gerarPdf() e prepararImagens() para usar Storage::get() ao inves de file_get_contents().

## Estimativa de horas (opcional)

Se o usuario pedir estimativa de horas, adicionar coluna "Horas (est.)" com estimativa baseada em:

- **Commits simples** (typo, config): ~0.5h
- **Bugfix pontual** (1-2 arquivos): ~1-2h
- **Bugfix complexo** (investigacao + multiplos commits): ~2-4h
- **Feature pequena**: ~2-3h
- **Feature media** (com UI): ~4-6h
- **Investigacao/analise** sem commit: ~1-2h
- **Incidente em producao** (rollback, hotfix urgente): ~2-4h
- **Reuniao**: ~1-1.5h

Considerar que o trabalho e misto: humano (analisar, testar, passar prompt, revisar) + IA (gerar codigo). O tempo estimado deve refletir o tempo total do desenvolvedor, nao apenas o tempo de geracao.
