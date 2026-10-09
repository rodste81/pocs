# Handover — clcl-electron (atualizado em 2026-10-09)

Continuação de `clcl-mac/HANDOVER.md` (repo `rodste81/pocs`, branch `claude/upbeat-wright-n399b8`).

## Estado atual

App Electron + TypeScript só com processo principal (sem renderer): bandeja, dois atalhos globais e menus nativos.

| Atalho | Menu |
|---|---|
| `Control+Q` | Itens salvos (a árvore importada do `regist.dat` + o que o usuário for salvando) |
| `Control+W` | Clipboard (histórico, 30 itens) |

- `src/regist.ts`: importador do `regist.dat` (port de `File.c: file_file_to_item`). Usa `UNICODE TEXT` (UTF-16LE) quando existe, senão `TEXT` (windows-1252). Converte CRLF em LF. A pasta-raiz única (`Top_Clips`) vira o nível de cima do menu.
- `src/main.ts`: bandeja, atalhos, polling do clipboard (300 ms), menus, colar com ⌘V via `osascript`.
- `src/store.ts`: `config.json`, `templates.json`, `history.json` em `app.getPath('userData')` (no Mac: `~/Library/Application Support/clcl-electron/`).
- Primeira execução: se não existe `templates.json`, importa o `regist.dat` de `../regist.dat` (a pasta `new clcl`) ou do caminho em `config.json > registPath`.
- Resultado da importação do arquivo do usuário: 1411 itens, 208 pastas, 3 itens vazios descartados.

## Como rodar

```
npm install
npm start                # modo desenvolvimento
npm run install-mac      # gera CLCL.app (electron-builder), assina ad-hoc e copia para /Applications
```

`npm start` e o `CLCL.app` usam a mesma pasta de dados (`~/Library/Application Support/clcl-electron/`).
A assinatura é ad-hoc: a cada reinstalação o macOS pede a permissão de Acessibilidade de novo.

## Testado / não testado

- Testado no Linux (headless): compilação, importação do `regist.dat` real, inicialização sem erro, empacotamento (`npm run pack`).
- **Não testado no macOS**: o popup do menu na posição do cursor (janela-âncora 1x1 com `showInactive`), o ⌘V automático (precisa de Acessibilidade) e os atalhos `Control+Q` / `Control+W` e o `scripts/install-mac.sh`.

## Pendências

- Só texto: imagens, arquivos e RTF não entram no histórico.
- Editar, renomear, mover e apagar itens salvos: hoje só editando `templates.json` e usando "Recarregar itens salvos do arquivo".
- Expansão de `%d` / `%t` (port do `tool_text`); 96 itens importados contêm esses padrões.
- Ícone próprio do app e assinatura com Developer ID (hoje é ad-hoc).
- Os dados do usuário (`regist.dat`, `templates.json`) têm senhas: **não commitar**.
