# Handover — clcl-electron (atualizado em 2026-10-09)

Continuação de `clcl-mac/HANDOVER.md` (repo `rodste81/pocs`, branch `claude/upbeat-wright-n399b8`).

## Estado atual

App Electron + TypeScript: bandeja, três atalhos globais, menus nativos e uma janela de busca (único renderer, HTML/JS puro em `ui/`).

| Atalho | Menu |
|---|---|
| `Control+Q` | Itens salvos (a árvore importada do `regist.dat` + o que o usuário for salvando) |
| `Control+W` | Clipboard (histórico, 30 itens) |
| `Control+E` | Janela de busca (`ui/search.html`): filtra título, pasta e conteúdo dos itens salvos e dos textos do clipboard; Enter cola, Shift+Enter só copia |
| ⌘E dentro da busca, ou "Editar itens salvos…" no ícone da barra | Editor da árvore (`ui/editor.html`): criar pasta/item, item a partir do clipboard, renomear, editar texto, mover (↑ ↓, recortar/colar), excluir, desfazer. Salva sozinho; a cada abertura grava uma cópia em `backups/` (10 mais recentes) |

Na busca, um link (`http(s)://…`) colado sozinho vira a opção "Baixar o vídeo deste link para Downloads": `src/download.ts` chama o `yt-dlp` instalado na máquina (procura em `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin` e no PATH; o link vai depois de `--`, sem shell). Requer `brew install yt-dlp ffmpeg`. O resultado sai em notificação; clicar nela mostra o arquivo no Finder.

Os atalhos ficam em `config.json` (`hotkeyTemplates`, `hotkeyHistory`, `hotkeySearch`). O padrão é Control+Q/W/E. Ao abrir, um `config.json` sem `hotkeysVersion: 2` tem os três atalhos trocados uma única vez para o padrão; depois disso o app respeita o que estiver no arquivo.

- `src/regist.ts`: importador do `regist.dat` (port de `File.c: file_file_to_item`). Usa `UNICODE TEXT` (UTF-16LE) quando existe, senão `TEXT` (windows-1252). Converte CRLF em LF. A pasta-raiz única (`Top_Clips`) vira o nível de cima do menu.
- `src/main.ts`: bandeja, atalhos, polling do clipboard (300 ms), menus, colar com ⌘V via `osascript`.
- `src/store.ts`: `config.json`, `templates.json`, `history.json` em `app.getPath('userData')` (no Mac: `~/Library/Application Support/clcl-electron/`).
- Primeira execução: se não existe `templates.json`, importa o `regist.dat` de `../regist.dat` (a pasta `new clcl`) ou do caminho em `config.json > registPath`.
- Resultado da importação do arquivo do usuário: 1411 itens, 208 pastas, 3 itens vazios descartados.

- No macOS a janela-âncora do menu e a janela de busca são `type: 'panel'`, nível `screen-saver`: aparecem por cima de apps em tela cheia e em qualquer Space, e a busca recebe o teclado sem ativar o app (se não receber em 150 ms, cai para `app.focus({ steal: true })`). Apertar o mesmo atalho com o menu aberto fecha; outro atalho troca de menu.

- **Menus em janela própria** (`config.json > popupMode`, padrão `panel`): os menus de itens salvos e do clipboard são desenhados em `ui/menu.html`, numa janela-painel transparente do tamanho da tela (`type: 'panel'`), com colunas em cascata. O painel recebe o teclado sem ativar o CLCL. Motivo, medido no Mac em 2026-10-11 sobre o ChatGPT em tela cheia: ativar o app (`activate`) faz o macOS sair da tela cheia para a mesa principal e fecha o menu; o painel de busca, que é desse mesmo tipo, abriu focado e recebeu as teclas sem trocar de mesa. Teclas: ↑↓, → ou Enter entra na pasta, ← volta, Enter escolhe, Shift+Enter só copia, Esc fecha, letras/números pulam para o item. `menuFontSize` (px) ajusta a letra. Um `config.json` sem `popupVersion: 2` é trocado uma única vez para `panel`.
- **Conferência de mesa (macOS)**: 200 ms depois de abrir o menu-painel ou a busca, o app pergunta ao macOS (JXA + `CGWindowListCopyWindowInfo`, só janelas na tela) se a janela está na mesa que aparece na tela. Se não estiver, destrói e recria a janela, que nasce na mesa ativa (uma vez por abertura). O log registra `na tela que o usuario ve = sim/NAO`. A comparação é por sobreposição (≥ 50%), não por tamanho exato: numa tela cheia o macOS respondeu NAO para um menu que estava visível, provavelmente porque encolhe a janela para fora da barra de menus; quando dá NAO, o log registra as janelas que o macOS listou. Motivo: em 2026-10-12, sobre o Terminal em tela cheia, todas as aberturas apareciam no log como abertas e focadas, sem a marca de todas as mesas perdida, e mesmo assim o usuário não via o menu. A busca deixou de ativar o app quando não recebe o foco, porque ativar tira o usuário da tela cheia.
- **Sem "dormir"**: App Nap desligado (`NSAppSleepDisabled` no Info.plist, via `build.mac.extendInfo`), janelas do menu e da busca com `backgroundThrottling: false` e as chaves do Chromium `disable-renderer-backgrounding`, `disable-background-timer-throttling` e `disable-backgrounding-occluded-windows`. O menu confirma que desenhou (duplo `requestAnimationFrame` → `menu:shown` com número da abertura); sem confirmação em 350 ms o app força o redesenho (`invalidate`) e reenvia o menu. Log: `desenhado = true/false` e `*** painel sem desenho`. Motivo: depois de ~18 h aberto o menu deixou de aparecer e reabrir o CLCL resolveu.
- **Colar vários (menu do clipboard)**: Shift+↑↓ estende a seleção (voltando pelo mesmo caminho, desmarca), Shift+clique marca/desmarca; as linhas marcadas ganham o número da ordem. Enter (ou clique num item marcado) cola todos na ordem da seleção: textos seguidos viram uma colagem só, uma linha cada; imagens seguidas: `config.json > multiImageMode` (padrão `auto`: Finder → `files`, demais apps → `ack`). `ack` (src/imagepaste.ts): cada imagem vai ao clipboard como promessa (`NSPasteboardItem` com data provider, tipos public.png/public.tiff, mais a marca `org.nspasteboard.TransientType` para gerenciadores de clipboard não lerem); o mesmo processo JXA envia o Cmd+V e só passa à próxima quando o app de destino pede o dado. Se o app não pedir em 4 s, o resto vai com espera fixa (`onebyone`, `multiPasteImageDelayMs`). `items`: todas como itens de imagem num Cmd+V. `files`: todas como arquivos .png num Cmd+V. Comando de teste: `testpaste <modo> <n>` cola as n imagens mais recentes no app da frente. Antes de colar (um ou vários itens), se o CLCL tiver virado o app ativo, o app devolve a frente ao app que estava na frente quando o menu abriu (`open -b <bundle>`, guardado na abertura) e espera `did-resign-active`. Motivo: em 2026-10-12 o mesmo pedido de 7 imagens funcionou pelo teclado (7/7 em 1,7 s) e falhou quando o usuário marcou com Shift+clique (0 lidas, depois espera fixa), provavelmente porque o clique ativou o CLCL e o Cmd+V foi para ele. O log registra `CLCL ativo = true/false` em cada colagem. Medido depois: nas tentativas com Shift+clique o CLCL NÃO estava ativo (destino = Notas) e mesmo assim o Notas não leu a 1ª imagem; com teclado (e até com Shift segurado) funciona. Por isso o modo `ack` agora, se o app não pedir a imagem em 1 s, reativa o app de destino (`NSRunningApplication.activateWithOptions`, sem Apple Events) e repete o Cmd+V, até 2 vezes; o log registra o app da frente em cada repetição. Todo Cmd+V do app (também o de um item só) espera Shift/Control/Option/Command serem soltos. Histórico no Mac: no Notas, uma por vez com 0,7 s colou 3 de 7; como arquivos de uma vez não colou nenhuma (o Notas não aceitou os arquivos). Uma imagem sozinha vai como imagem (ou arquivo, no Finder). Durante a sequência a captura do clipboard fica pausada. ⌥ (Option) = só copiar, no lugar do Shift, nos dois menus; só copiar vários junta os textos (imagens não vão juntas para o clipboard). A busca (Control+E) continua com Shift+Enter para só copiar.
- **Modos antigos de menu nativo** (`anchor`, `activate`, `tray`), mantidos para diagnóstico. Testado no Mac em 2026-10-09 com teclas reais: no modo `anchor` (app não ativado) o menu abre mas não recebe o teclado; Esc e setas vão para o app de baixo e os atalhos seguintes ficam na fila até o menu ser fechado com o mouse. No modo `activate` o CLCL vira o app da frente ao abrir e devolve o foco (`app.hide()`) ao fechar. `tray` abre preso ao ícone da barra. O log registra `menu abriu` / `*** o menu NAO abriu ***`.
- **Comandos de teste**: com `remoteCommands: true`, o app lê `new clcl/clcl-cmd.txt` a cada 400 ms (`popup salvos|clipboard [modo]`, `search`, `close`, `set popupMode|popupFallback|remoteCommands <valor>`). Desligar com `set remoteCommands false` quando não estiver depurando.

## Como rodar

```
npm install
npm start                # modo desenvolvimento
npm run install-mac      # gera CLCL.app (electron-builder), assina ad-hoc e copia para /Applications
```

`npm start` e o `CLCL.app` usam a mesma pasta de dados (`~/Library/Application Support/clcl-electron/`).
Assinatura: o `install-mac.sh` cria uma única vez o certificado próprio `CLCL Local Signing` no chaveiro de login (openssl + `security import`) e assina sempre com ele, para a identidade do app não mudar entre instalações e o macOS manter Acessibilidade/Automação. Se criar ou assinar falhar, cai para ad-hoc (e aí zera as permissões a cada instalação, como antes). O marcador `.assinado-com-certificado` na pasta de dados indica que as permissões já foram concedidas à identidade estável. A lógica foi testada no Linux com comandos simulados; no macOS falta confirmar.

## Testado / não testado

- Testado no Linux (headless): compilação, importação do `regist.dat` real, inicialização sem erro, empacotamento (`npm run pack`).
- **Não testado no macOS**: o popup do menu na posição do cursor (janela-âncora 1x1 com `showInactive`), o ⌘V automático (precisa de Acessibilidade) e os atalhos `Control+Q` / `Control+W` / `Control+E`, o foco da janela de busca (abre, e ao fechar devolve o foco com `app.hide()`) e o `scripts/install-mac.sh`.

## Pendências

- "Limpar todo o histórico…" no menu do ícone da barra (logo após "Editar itens salvos…"), com confirmação Sim/Não; apaga textos e imagens do histórico, não os itens salvos.
- Histórico guarda texto e imagens (PNG em `images/`, ex.: screenshot com ⌘⌃⇧4); a altura da miniatura no menu é `menuImageHeight` em `config.json` (16 a 256, padrão 48). Se o Finder (pasta ou mesa) está na frente ao escolher uma imagem, o app põe no clipboard um arquivo `Imagem AAAA-MM-DD HH.MM.SS.png` (via `osascript`), e o ⌘V cria o arquivo na pasta; nos outros apps cola a imagem. Arquivos copiados e RTF não entram; itens salvos (Control+Q) são só texto.
- Expansão de `%d` / `%t` (port do `tool_text`); 96 itens importados contêm esses padrões.
- Ícone próprio do app e assinatura com Developer ID (hoje é ad-hoc).
- Os dados do usuário (`regist.dat`, `templates.json`) têm senhas: **não commitar**.
