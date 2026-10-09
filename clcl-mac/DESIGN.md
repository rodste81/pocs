# Kurukuru — um CLCL para macOS

> Nome provisório: o CLCL se pronuncia "kurukuru" (クルクル) em japonês.

Este documento tem duas partes:

1. **Como o CLCL funciona**: análise do código-fonte em `../clcl-src/` (core oficial v2.x + plugins).
2. **Design da versão macOS**: arquitetura, modelo de dados, fluxos, permissões e plano de entrega.

Referências como `main.c:971` apontam para `clcl-src/core-oficial-nakkag/`.

---

## Parte 1 — Como o CLCL funciona

### 1.1 Visão geral

O CLCL é um único processo Win32, sem janela visível, com ícone na bandeja. Ele faz quatro coisas:

```
 ┌────────────────┐   WM_DRAWCLIPBOARD   ┌──────────────┐   history_add   ┌────────────┐
 │ Clipboard do   │ ───────────────────► │ Captura      │ ──────────────► │ Histórico  │
 │ Windows        │                      │ (filtros)    │                 │ (lista)    │
 └────────────────┘                      └──────────────┘                 └─────┬──────┘
        ▲                                                                       │
        │ clipboard_set_datainfo + Ctrl+V simulado                              │
 ┌──────┴─────────┐   item escolhido    ┌──────────────┐   hotkey/bandeja  ┌────┴───────┐
 │ Colar no app   │ ◄────────────────── │ Menu popup   │ ◄──────────────── │ Ações      │
 │ ativo          │                     │ (histórico + │                   │            │
 └────────────────┘                     │  templates)  │                   └────────────┘
                                        └──────────────┘
```

Além disso há o **Viewer**, uma janela tipo Explorer para ver e editar o histórico e os templates; o **CLCLSet**, a tela de opções; e uma **API de plugins** em DLL.

### 1.2 Modelo de dados — `DATA_INFO` (`Data.h`)

Tudo é uma árvore de um único struct, `DATA_INFO`, com quatro tipos:

| Tipo | Papel |
|---|---|
| `TYPE_ROOT` | Raiz. Existem duas: `history_data` e `regist_data` (templates, chamados de "itens registrados") |
| `TYPE_FOLDER` | Pasta. Só aparece nos templates, ou no histórico com o plugin `tool_history` |
| `TYPE_ITEM` | **Uma cópia**: tem título, data, nome da janela de origem, hotkey própria e flag "colar ao usar" |
| `TYPE_DATA` | **Um formato** daquela cópia (`format_name`, `data`, `size`). Uma cópia de texto do Word gera vários formatos irmãos (`UNICODE TEXT`, `Rich Text Format`, `HTML Format`…) |

Pontos importantes:
- Um item guarda **todos os formatos** que passaram pelos filtros. Ao colar, todos são devolvidos ao clipboard, então o app de destino escolhe o mais rico.
- A lista é **encadeada com o mais novo na frente** (`History.c:141`).
- Campos `menu_*` (título, ícone, miniatura) são cache de exibição e não são salvos.

### 1.3 Captura do clipboard

**Detecção** (`main.c:1728`): o CLCL entra na *clipboard viewer chain* antiga (`SetClipboardViewer`), não usa `AddClipboardFormatListener`. Em cada `WM_DRAWCLIPBOARD`:
1. repassa a mensagem para o próximo da cadeia;
2. se `clip_flag` estiver ligado (a mudança foi feita pelo próprio CLCL), ignora;
3. senão agenda `ID_HISTORY_TIMER` com `history_add_interval`, padrão 1 ms. Esse *debounce* evita ler o clipboard no meio de uma escrita.

Um timer de 1 minuto (`ID_RECHAIN_TIMER`, `main.c:1792`) **refaz a inscrição na cadeia** se outro programa a tiver quebrado. Isso é robustez contra apps mal comportados.

**Ingestão** (`clipboard_to_history`, `main.c:971`):
1. **Filtro de janela**: `window_ignore_check(GetForegroundWindow())` (`Window.c:65`). Regras são pares título/classe com curinga. Uma regra pode marcar `ignore` (não capturar), `focus` e `paste`.
2. `OpenClipboard`. Se outro app estiver segurando o clipboard, tenta de novo em 1 s (`RECLIP_INTERVAL`).
3. **Marcadores de privacidade** (`ClipBoard.c:38`, `should_ignore`): descarta se houver `ExcludeClipboardContentFromMonitorProcessing`, `Clipboard Viewer Ignore`, ou se `CanIncludeInClipboardHistory`/`CanUploadToCloudClipboard` valer 0. É assim que gerenciadores de senha escondem senhas.
4. **Enumera os formatos** (`clipboard_get_datainfo`, `ClipBoard.c:144`). Para cada um:
   - **filtro por formato**: lista com ação `ADD`/`IGNORE` e uma ação padrão para formatos não listados;
   - copia os dados (via plugin de formato, se houver, ou cópia genérica);
   - **filtro por tamanho**: `limit_size` por formato.
5. **Duplicatas** (`History.c:85`), em 4 modos (`history_overlap_check`, padrão 1):
   - 0: não checa;
   - 1: ignora se igual ao **último** item;
   - 2: ignora se igual a **qualquer** item;
   - 3: **remove os antigos iguais** e insere o novo no topo.

   A comparação é byte a byte em **todos** os formatos.
6. Carimba data e **título da janela de origem**, insere no topo e corta em `history_max`, padrão **30**.
7. Dispara plugins `CALLTYPE_ADD_HISTORY` e salva em disco se `history_always_save`.

### 1.4 Ações e gatilhos (`Ini.h`, defaults em `Ini.c:280`)

Uma **ação** liga um gatilho a um comportamento:

| Gatilho (`ACTION_TYPE_*`) | Comportamentos (`ACTION_*`) |
|---|---|
| Hotkey (`RegisterHotKey`) | Mostrar menu popup |
| **Ctrl Ctrl / Shift Shift / Alt Alt**, ou seja, apertar o modificador duas vezes (via hook de teclado `CLCLHook/Hook.c` + `ID_KEY_TIMER`, `main.c:1938`) | Abrir Viewer |
| Clique / duplo-clique esquerdo ou direito na bandeja | Opções / ligar-desligar captura / sair |

Padrões de fábrica:
- **Alt+C** → menu com histórico + submenu de templates;
- **Alt+T** → menu de templates;
- clique esquerdo na bandeja → menu;
- clique direito → Viewer.

Cada ação tem duas opções: `caret`, que abre o menu na posição do cursor de texto, e `paste`, que cola automaticamente depois de escolher.

Além das ações, há dois tipos de hotkey:
- **cada template pode ter sua própria hotkey**, que cola direto sem abrir menu (`ID_PASTE_TIMER`, `main.c:1822`);
- **cada ferramenta (plugin) pode ter hotkey**.

### 1.5 O menu popup (`Menu.c`, `show_popup_menu` em `main.c:692`)

O menu de cada ação é uma **lista configurável de blocos** (`MENU_INFO`):

| Bloco | Conteúdo |
|---|---|
| `HISTORY` / `HISTORY_DESC` | Fatia do histórico (`min`..`max`), crescente ou decrescente. Permite "1–10 no topo, 11–30 num submenu" |
| `REGIST` / `REGIST_DESC` | Uma pasta dos templates, por caminho (`\`, `\Assinaturas`…) |
| `POPUP` | Submenu com seus próprios blocos (recursivo) |
| `TOOL` | Lista de ferramentas/plugins |
| `APP` | Abre um programa com argumentos |
| `VIEWER`, `OPTION`, `CLIPBOARD_WATCH`, `EXIT`, `CANCEL`, `SEPARATOR` | Comandos fixos |

Detalhes que fazem o CLCL ser rápido de usar:
- **Rótulo com atalho numérico**: formato `&%1d. %t` (`Menu.c:489`) vira "**1**. texto…", "**2**. …", e o número é tecla de acelerador. Outros códigos: `%x` (hexa), `%a`/`%A` (letras), `%b`/`%c` (letras+números), `%n` (1 dígito).
- **Formato representativo**: entre os formatos de um item, o menu usa o de maior prioridade na lista de formatos (`format_get_priority_highest`, `Format.c:72`). Isso define se mostra texto, miniatura de imagem ou lista de arquivos. Tooltip mostra o conteúdo completo.
- **Posição no cursor de texto** (`Caret.c:240`): tenta `GetGUIThreadInfo`, depois MSAA, depois UI Automation. Se nada funcionar, usa a posição do mouse.
- Antes de abrir, salva **qual janela e qual controle tinham foco** (`get_focus_info`, `main.c:369`), para devolver o foco depois.

Ao escolher um item:
- **Clique normal** → `item_to_clipboard` → se `paste`, cola.
- **Shift segurado** → só copia, não cola.
- **Clique direito ou Ctrl** → abre o **menu de ferramentas** para aplicar uma transformação naquele item (`show_tool_menu`, `main.c:615`).

### 1.6 Devolver ao clipboard e colar

`item_to_clipboard` (`main.c:1055`):
1. Duplica o item e roda os plugins `CALLTYPE_ITEM_TO_CLIPBOARD`. Eles podem **modificar** o item, por exemplo expandir `%d`/`%t` em templates, ou **cancelar** a operação.
2. `EmptyClipboard` e grava **todos os formatos** do item (`ClipBoard.c:236`).
3. Se o item é um template e `history_ignore_regist_item`, liga `clip_flag` para que o próprio CLCL **não recapture** o template.
4. Opcional (`history_delete`): remove o item do histórico ao usar.

Colar (`sendkey_paste`, `SendKey.c:270`):
1. `key_wait()`: espera o usuário **soltar** as teclas da hotkey, senão Alt+C+V vira lixo;
2. **desregistra as hotkeys** temporariamente;
3. devolve o foco ao app original;
4. espera `paste_wait`, padrão 100 ms, e simula **Ctrl+V** via `keybd_event`. As teclas de colar e o tempo de espera podem ser configurados **por janela**, por exemplo Shift+Insert em terminais;
5. registra as hotkeys de novo.

### 1.7 Ferramentas que operam sobre a seleção (o truque mais esperto)

Uma ferramenta com `copy_paste = 1` transforma o **texto selecionado em qualquer app** (`main.c:808`, `main.c:886` e `main.c:1019`):

1. O usuário escolhe a ferramenta, por exemplo "Maiúsculas", no menu ou via hotkey.
2. O CLCL "arma" a ferramenta (`tmi.enable`) por `tool_valid_interval` (5 s) e **simula Ctrl+C**.
3. Quando o clipboard muda, `clipboard_to_history` vê a ferramenta armada: roda a ferramenta sobre o item recém-capturado, devolve o resultado ao clipboard e **simula Ctrl+V**, substituindo a seleção.

Ou seja: **selecionar → ferramenta → texto transformado no lugar**, sem API específica de cada app.

### 1.8 Persistência

- `history.dat` e `regist.dat` (`File.c:557`) usam um formato binário próprio, com marcadores:
  - `\x4` = início de pasta; `\x5` = fim de pasta;
  - `\x1` = início de item, seguido de: título, data em hexa, janela, string de plugin, parâmetro de plugin, hotkey/paste;
  - `\x2` = início de cabeçalho de formato: tamanho, nome do formato, dados de plugin;
  - `\x3` = início dos dados (bytes crus do formato).
- Configurações em `.ini` (`Ini.c`).
- Na hora de salvar, um **filtro de salvamento** por formato pode descartar formatos pesados. Assim um formato fica no histórico da sessão sem ir para o disco.

### 1.9 API de plugins (`CLCLPlugin/CLCLPlugin.h`)

Há dois tipos de DLL:

**Ferramentas** (`get_tool_info_w` + funções nomeadas): recebem `TOOL_EXEC_INFO` e a lista de itens (`TOOL_DATA_INFO`) e retornam um conjunto de flags: `TOOL_SUCCEED`, `TOOL_CANCEL`, `TOOL_DATA_MODIFIED`. O momento em que rodam é configurável (`CALLTYPE_*`):

| `CALLTYPE_*` | Quando roda |
|---|---|
| `MENU` | Escolhida no menu |
| `VIEWER` | Escolhida no menu do Viewer |
| `VIEWER_OPEN` / `VIEWER_CLOSE` | Ao abrir / fechar o Viewer |
| `ADD_HISTORY` | Ao entrar no histórico |
| `ITEM_TO_CLIPBOARD` | Ao voltar para o clipboard |
| `START` / `END` | Ao iniciar / encerrar o CLCL |

Elas também conversam com o host por `SendMessage(WM_HISTORY_GET_ROOT, WM_ITEM_CREATE, …)`.

**Formatos** (`get_format_header` + `func_*`): ensinam o CLCL a copiar, serializar, comparar, desenhar (título, ícone, miniatura, tooltip) e exibir no Viewer um formato específico do clipboard.

Plugins oficiais (`clcl-src/nakka-site/`):

| Plugin | O que faz |
|---|---|
| `tool_text` | Data/hora em templates (`%d`, `%t`), maiúsculas/minúsculas, citar/descitar (`> `), quebrar em N colunas, envolver com `<TAG>,</TAG>`, remover quebras de linha, juntar vários itens, editar texto |
| `tool_utl` | Limpar histórico, limpar clipboard, tocar som, janela sempre no topo, salvar vários itens em arquivos |
| `tool_find` | Buscar texto no histórico/templates |
| `tool_history` | Agrupar o histórico antigo em pastas automáticas (ex.: "31–60", "61–90") |
| `tool_bitmap` | Editar imagem simples |
| `fmt_rtf`, `fmt_metafile` | Exibir RTF e metafiles no menu/Viewer |
| `fmt_RPA` | Mostrar `DisplayName` de atividades copiadas do UiPath |

Plugins de terceiros (`clcl-src/plugin-tool_*`):
- `tool_clip`: regex, macros, JSON, tabela HTML.
- `tool_python`: ferramentas escritas em Python.

---

## Parte 2 — Design da versão macOS

### 2.1 Princípios

- **Manter o que torna o CLCL bom**:
  - menu popup **no cursor**, com **números como atalho**;
  - **templates em pastas**, com hotkey própria;
  - **todos os formatos** preservados;
  - **ferramentas sobre a seleção**;
  - menus **configuráveis por blocos**.
- **Não copiar o que é Win32**: viewer chain, rechain, `AttachThreadInput`, DLLs, `.ini`, formato `.dat`.
- App nativo em **Swift**, com **AppKit** para o menu/painel (precisa de controle fino de foco) e **SwiftUI** para Viewer e Preferências.
- Agente de barra de menus (`LSUIElement = YES`), sem ícone no Dock.

### 2.2 Tradução Windows → macOS

| CLCL (Win32) | macOS | Observações |
|---|---|---|
| `SetClipboardViewer` / `WM_DRAWCLIPBOARD` | **Polling** de `NSPasteboard.general.changeCount` a cada ~250–500 ms | O macOS não notifica mudanças no pasteboard; todo gerenciador (Maccy, Paste, Raycast) faz polling. Custo desprezível: só compara um inteiro |
| Rechain a cada minuto | Desnecessário | Polling não quebra |
| `OpenClipboard` falhou → retry 1 s | Desnecessário | Leitura do pasteboard não bloqueia |
| `should_ignore` (marcadores de privacidade) | Tipos de [nspasteboard.org](http://nspasteboard.org): `org.nspasteboard.ConcealedType`, `TransientType`, `AutoGeneratedType`; e `com.agilebits.onepassword` | Mesma ideia, convenção do Mac. 1Password, Bitwarden e Keychain marcam assim |
| Formato (`CF_*`, nome registrado) | `NSPasteboard.PasteboardType` / UTI (`public.utf8-plain-text`, `public.rtf`, `public.html`, `public.png`, `public.tiff`, `public.file-url`…) | |
| Item = lista de formatos | Item = lista de **`NSPasteboardItem`**, cada um com N tipos | No Mac um "copiar" pode ter **vários itens**, por exemplo 3 arquivos. O modelo precisa de um nível a mais |
| `GetForegroundWindow` + título/classe | `NSWorkspace.shared.frontmostApplication` → **bundle ID** e nome | Título da janela exigiria Acessibilidade. Filtrar por **app** já cobre 95% dos casos |
| `RegisterHotKey` | Carbon `RegisterEventHotKey`, ou a lib [KeyboardShortcuts](https://github.com/sindresorhus/KeyboardShortcuts) | Funciona **sem** permissão de Acessibilidade |
| Hook de teclado para Ctrl Ctrl / Shift Shift | `CGEventTap` ou `NSEvent.addGlobalMonitorForEvents(.flagsChanged)` | Requer **Acessibilidade/Monitoramento de entrada**; deixar opcional |
| Posição do caret (GUIThreadInfo/MSAA/UIA) | Acessibilidade: `kAXFocusedUIElement` → `kAXSelectedTextRange` → `kAXBoundsForRange` | Fallback: posição do mouse. Igual ao CLCL |
| Menu popup owner-draw | **`NSMenu.popUp(positioning:at:in:)`** (v1) ou **`NSPanel` não-ativante** (v2) | Ver 2.5 |
| `keybd_event` Ctrl+V | `CGEvent` com **⌘V** postado em `.cghidEventTap` | Requer **Acessibilidade**. Tecla/tempo configurável por app (ex.: Terminal) |
| `key_wait()` | Esperar `CGEventSource.flagsState(.combinedSessionState)` ficar sem modificadores | Mesma ideia |
| Ícone na bandeja | `NSStatusItem` | Clique esquerdo/direito/⌥-clique como gatilhos |
| `history.dat` / `regist.dat` | **SQLite** (via GRDB) + blobs grandes em arquivos | Ver 2.4 |
| `.ini` | `UserDefaults` + export/import JSON | |
| DLL de ferramenta | Protocolo `Tool` em Swift (embutidas) + **ferramenta "comando shell"** (stdin→stdout) | Cobre `tool_python`/`tool_clip` sem carregar código nativo |
| DLL de formato | Protocolo `FormatRenderer` interno | Texto, RTF, HTML, imagem, arquivos, cor |
| Viewer (TreeView + ListView) | Janela SwiftUI `NavigationSplitView` | |

### 2.3 Arquitetura

```
Kurukuru.app (LSUIElement)
├── App/
│   ├── AppDelegate            ciclo de vida, NSStatusItem, permissões
│   └── Settings               UserDefaults tipado + import/export JSON
├── Capture/
│   ├── PasteboardMonitor      timer de changeCount → snapshot
│   ├── CapturePolicy          regras: apps ignorados, tipos, tamanhos, privacidade
│   └── SelfWriteGuard         equivalente ao clip_flag
├── Store/
│   ├── Models                 Entry, Representation, Folder, Template
│   ├── HistoryStore           insert/dedupe/trim, regras de duplicata 0..3
│   ├── TemplateStore          árvore de pastas
│   └── Database               GRDB/SQLite + BlobStore
├── Actions/
│   ├── HotkeyManager          RegisterEventHotKey: ações, templates, ferramentas
│   ├── DoubleTapMonitor       ⌃⌃ / ⇧⇧ / ⌥⌥ / ⌘⌘ (opcional, CGEventTap)
│   └── ActionRouter           gatilho → ação
├── Menu/
│   ├── MenuSpec               blocos configuráveis (HISTORY, REGIST, POPUP…)
│   ├── MenuBuilder            MenuSpec + stores → NSMenu
│   ├── LabelFormatter         "&%1d. %t" → "1. texto…" + keyEquivalent
│   └── Renderers              título/ícone/miniatura/tooltip por tipo
├── Output/
│   ├── FocusTracker           app ativo antes do menu; caret via AX
│   ├── PasteboardWriter       Entry → NSPasteboard (todos os tipos)
│   └── Paster                 key_wait + ⌘V via CGEvent, regras por app
├── Tools/
│   ├── Tool (protocolo)       transform(entries) -> ToolResult
│   ├── Builtins               port de tool_text/tool_utl
│   ├── ShellTool              roda comando com texto em stdin
│   └── ToolRunner             CALLTYPEs como hooks + fluxo copiar-transformar-colar
└── UI/
    ├── ViewerWindow           histórico + templates, edição, arrastar
    └── PreferencesWindow      abas espelhando o CLCLSet
```

### 2.4 Modelo de dados

```swift
/// Uma "cópia". Equivale ao DATA_INFO TYPE_ITEM.
struct Entry: Identifiable, Codable {
    let id: UUID
    var title: String?                 // título manual (templates)
    var createdAt: Date
    var sourceApp: SourceApp?          // bundleID + nome (substitui window_name)
    var items: [PasteboardItemSnapshot]
    var hotkey: KeyCombo?              // templates: hotkey própria
    var pasteOnUse: Bool               // op_paste
    var contentHash: Data              // SHA-256 de todos os tipos, para dedupe O(1)
}

/// Um NSPasteboardItem. O nível que o Windows não tem.
struct PasteboardItemSnapshot: Codable {
    var representations: [Representation]
}

/// Um tipo/formato. Equivale ao DATA_INFO TYPE_DATA.
struct Representation: Codable {
    var type: String                   // UTI / NSPasteboard.PasteboardType.rawValue
    var storage: Storage               // .inline(Data) se < 64 KB, senão .blob(fileID)
    var size: Int
}

/// Árvore de templates (regist.dat).
indirect enum TemplateNode: Codable {
    case folder(id: UUID, name: String, children: [TemplateNode])
    case entry(Entry)
}
```

**Por que um hash**: o CLCL compara byte a byte em todos os formatos (`History.c:41`), o que é O(n·tamanho) no modo 2. Um SHA-256 calculado na captura torna os modos "igual ao último", "igual a qualquer" e "remove antigos" baratos.

**Persistência**: SQLite com as tabelas `entries`, `items`, `representations` e `template_nodes`. Dados acima de 64 KB (imagens, PDFs) vão para `~/Library/Application Support/Kurukuru/blobs/<sha256>`, deduplicados pelo hash. A regra "salvar no disco por tipo" do CLCL vira a flag `persist` em `CapturePolicy.typeRules`.

### 2.5 Fluxos principais

**Captura**
```
Timer (300 ms) ─► changeCount mudou?
   └─ sim ─► SelfWriteGuard.consume()? ──sim──► ignora (fui eu que escrevi)
             frontmostApp ∈ appsIgnorados? ──sim──► ignora
             pasteboard tem tipo Concealed/Transient/AutoGenerated? ──sim──► ignora
             snapshot: para cada item, para cada tipo:
                 regra do tipo = ignorar? / tamanho > limite? → pula
             vazio? → ignora
             HistoryStore.add(entry, dedupeMode)
             ToolRunner.run(hook: .addHistory, entry)
             ToolRunner.pendingSelectionTool?  →  fluxo 1.7 (abaixo)
```

**Mostrar menu e colar**
```
Hotkey ⌥C (ou ⌃⌃, ou clique no status item)
   FocusTracker.capture()  → app ativo (NSRunningApplication) + ponto do caret (AX) ou mouse
   MenuBuilder.build(spec) → NSMenu com itens "1. …" (keyEquivalent "1"…"9", sem modificador)
   menu.popUp(at: ponto)
   usuário escolhe:
     ⇧ segurado  → só copiar
     ⌃ ou clique direito → submenu de ferramentas para este item
     normal → ToolRunner.run(hook: .toClipboard) → PasteboardWriter.write(entry)
              (SelfWriteGuard.arm se for template e "não recapturar templates")
              FocusTracker.restore()  → app.activate()
              Paster.paste(for: bundleID)  → espera soltar teclas → delay → ⌘V
```

**`NSMenu` × `NSPanel`**: o `NSMenu` é o mais fiel ao CLCL e dá navegação por teclado, submenus e aceleradores sem esforço. Para abri-lo, porém, o app precisa ser ativado, o que **tira o foco do app de destino**. Por isso o `FocusTracker` reativa o app antes do ⌘V (o mesmo papel de `set_focus_info`, `main.c:394`). Na v2, um `NSPanel` com `.nonactivatingPanel` (abordagem do Maccy/Spotlight) evita esse vaivém e permite **busca incremental**, como o quicksearch do fork wilfz.

**Ferramenta sobre a seleção** (port de 1.7)
```
Usuário seleciona texto em qualquer app → hotkey da ferramenta (ex.: ⌃⌥U = maiúsculas)
   ToolRunner.arm(tool, timeout: 5s)
   Paster.copy()                         → ⌘C simulado
   ...PasteboardMonitor detecta a mudança...
   ToolRunner vê ferramenta armada → result = tool.transform(entry)
   PasteboardWriter.write(result) → Paster.paste()  → ⌘V substitui a seleção
```

### 2.6 Configuração (espelhando o CLCLSet)

| Aba | Itens | Padrão (igual ao CLCL quando faz sentido) |
|---|---|---|
| Geral | Capturar on/off, abrir no login, idioma | on, on |
| Histórico | Máximo de itens, salvar ao sair, salvar sempre, modo de duplicata (0–3), remover ao usar, não recapturar templates | **30**, sim, sim, **1**, não, sim |
| Menu | Formato do rótulo (`%1d. %t`), largura máx., miniaturas (tamanho), tooltip, mostrar hotkeys | `%1d. %t`, 200 px (CLCL), miniaturas 64×64 (sugestão) |
| Ações | Lista gatilho → ação (+ editor de blocos do menu) | ⌥C = histórico+templates; ⌥T = templates; clique no status = menu |
| Tipos | Prioridade de exibição, ignorar/aceitar, limite de tamanho, salvar em disco | texto > RTF > HTML > imagem > arquivos |
| Apps | Ignorar captura; teclas e delay de colar por app | 1Password, Keychain Access ignorados |
| Ferramentas | Lista de ferramentas, hook, hotkey, argumentos | |

O editor de blocos do menu é o recurso de configuração mais poderoso do CLCL. Na v1 basta oferecer 2 ou 3 presets e editar o JSON. O editor visual fica para depois.

### 2.7 Ferramentas embutidas (port dos plugins)

| Ferramenta | Origem | Prioridade |
|---|---|---|
| Expandir `%d` / `%t` (e `{date:yyyy-MM-dd}`, `{clipboard}`) em templates | `tool_text` | **v1** |
| Maiúsculas / minúsculas / Título | `tool_text` | **v1** |
| Citar / descitar (`> `) | `tool_text` | v1 |
| Remover quebras de linha (opção: remover espaços no início) | `tool_text` | v1 |
| Envolver com prefixo/sufixo (`<b>,</b>`) | `tool_text` | v1 |
| Colar como texto puro (remove RTF/HTML) | nova (muito pedida no Mac) | **v1** |
| Juntar itens selecionados no Viewer | `tool_text` | v2 |
| Quebrar em N colunas | `tool_text` | v2 |
| Buscar no histórico | `tool_find` | substituído por busca no painel (v2) |
| Agrupar histórico antigo em pastas | `tool_history` | v2 (ou "Mais antigos ▸" automático) |
| Limpar histórico / clipboard | `tool_utl` | **v1** (itens fixos do menu) |
| Comando shell (stdin → stdout), ex.: `python3 script.py`, `jq .` | `tool_python` / `tool_clip` | v2 |
| Regex substituir | `tool_clip` | v2 |
| Conversões SJIS/EUC/JIS | `tool_text` | **fora** (irrelevante no Mac) |
| Editar bitmap, metafile, fmt_RPA | `tool_bitmap`, `fmt_*` | **fora** |

```swift
protocol Tool {
    var id: String { get }
    var title: String { get }
    var hooks: Set<ToolHook> { get }       // .menu, .viewer, .addHistory, .toClipboard, .start, .end
    func run(_ input: [Entry], context: ToolContext) async throws -> ToolResult
}

enum ToolResult {
    case unchanged
    case modified([Entry])                 // TOOL_DATA_MODIFIED
    case cancel                            // TOOL_CANCEL
}
```

### 2.8 Permissões e distribuição

| Recurso | Permissão | Sem ela |
|---|---|---|
| Capturar histórico | Nenhuma até o macOS 15 | — |
| Colar automaticamente (⌘V simulado) | **Acessibilidade** | Item vai para o clipboard e o usuário cola manualmente |
| Caret como posição do menu | Acessibilidade | Menu abre no mouse |
| ⌃⌃ / ⇧⇧ | Acessibilidade / Monitoramento de entrada | Só hotkeys normais |
| Hotkeys normais | Nenhuma | — |

⚠️ **Privacidade do pasteboard em versões novas**: a Apple vem endurecendo o acesso ao pasteboard (alertas quando um app lê o clipboard sem ação do usuário e APIs para consultar o comportamento de acesso e detectar padrões sem ler o conteúdo). Os detalhes mudam entre versões, então **valide na fase 0**, num Mac com o macOS atual, como um app em background que faz polling se comporta e que permissão o usuário precisa conceder. Esse é o maior risco técnico do projeto.

**Distribuição**: fora da Mac App Store (Developer ID + notarização). O sandbox da App Store complica eventos sintéticos e Acessibilidade. Maccy e similares distribuem assim.

### 2.9 Plano de entrega

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **0 — Spike** (1–2 dias) | Status item + polling + log de tipos capturados + ⌘V via CGEvent | Captura texto/imagem/arquivos de Safari, Notes, Finder, VS Code; cola no TextEdit; comportamento de privacidade do SO documentado |
| **1 — MVP** | Histórico persistente (30, dedupe modo 1); ⌥C abre `NSMenu` com "1. …" no caret; escolher cola; ⇧ = não colar; ignorar apps; marcadores de privacidade | Uso diário substitui o CLCL para texto |
| **2 — Templates** | Árvore de templates; ⌥T; hotkey por template; `%d`/`%t`; Viewer básico (lista + editor de texto) | Assinaturas/snippets usáveis |
| **3 — Ferramentas** | Protocolo `Tool`; ferramentas v1 da tabela 2.7; menu de ferramentas com ⌃/clique direito; fluxo **seleção → ferramenta → colar** | "Selecionar e transformar" funciona em qualquer app |
| **4 — Poder** | ⌃⌃ duplo-toque; editor de blocos do menu; regras por tipo/tamanho/salvar; regras de colar por app; `ShellTool`; import/export JSON | Paridade com o CLCL no que importa |
| **5 — Além do CLCL** | Painel não-ativante com busca; iCloud sync dos templates; importar `regist.dat` do CLCL | — |

**Bônus da fase 5**: o formato do `regist.dat` está documentado na seção 1.8. Um importador permite trazer os templates de quem já usa CLCL no Windows.

### 2.10 Próximos passos sugeridos

1. Criar o projeto Xcode `Kurukuru` (macOS 14+, Swift 6, AppKit + SwiftUI) dentro de `clcl-mac/`.
2. Implementar a **fase 0** e testar num Mac real. Este ambiente é Linux e não compila nem roda apps de Mac.
3. Decidir com base no spike: `NSMenu` ou `NSPanel` na v1, e como lidar com a privacidade do pasteboard.
