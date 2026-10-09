# CLCL – código-fonte (core + plugins)

Fontes do CLCL (clipboard manager para Windows, de Ohno/Nakashima Tomoaki – nakka.com),
reunidos para estudo e para servir de referência a um clipboard manager para macOS.

Binários e pastas de build (`*_Release`, `.exe`, `.dll`, `.lib`, etc.) foram removidos.
Muitos arquivos estão em Shift-JIS ou UTF-16 (comentários em japonês/russo).

| Pasta | Origem | Commit | Conteúdo |
|---|---|---|---|
| `core-oficial-nakkag/` | https://github.com/nakkag/CLCL (repositório oficial do autor, MIT) | `edf7574` (2026-08-27) | CLCL 2.x: app principal, `CLCLHook`, `CLCLSet` (configurações), SDK de plugins (`CLCLPlugin.h`, templates, `tool_test`) |
| `fork-wilfz/` | https://github.com/wilfz/CLCL (fork ativo, MIT) | `6d271ee` (2026-10-08) | CLCL 2.2 com quicksearch, dark mode, traduções, documentação, e os plugins `tool_text`, `tool_utl`, `fmt_rtf` portados |
| `nakka-site/` | https://nakka.com/soft/clcl/ (site oficial, baixado em 2026-10-09) | ver `SHA256SUMS.txt` | **Pacotes originais do autor** (fontes em Shift-JIS, sem DLLs): `tltxt003` (tool_text), `tlutl003` (tool_utl), `tlfind002`, `tlhist002`, `tlbmp002`, `fmtrtf002`, `fmtmeta002`, `fmt_RPA_001`, `clclplgin_sample002` (SDK + exemplo `fmt_text`), e as variantes `*_eng` em inglês |
| `plugins-oficiais/` | https://github.com/AndreyKaiu/CLCL-EN-RU-JP-Plugins (pasta `CLCLPlugin`) | `c3e8d06` (2024-01-29) | Cópia **modificada** (convertida para UTF-16, projetos VS novos, traduções EN/JP/RU) dos plugins do Nakka: `tool_text`, `tool_utl`, `tool_find`, `tool_history`, `tool_bitmap`, `fmt_rtf`, `fmt_metafile`, `tool_test` (com traduções EN/JP/RU) |
| `plugin-tool_clip/` | https://github.com/wilfz/CLCL-tool_clip | `06af6cc` (2026-07-30) | Plugin de terceiros: regex, macros, export/import JSON, tabela HTML, ODBC |
| `plugin-tool_python/` | https://github.com/wilfz/CLCL-tool_python | `061a12c` (2026-08-20) | Plugin de terceiros para escrever ferramentas em Python |

O `clcl213.zip` do site (CLCL 2.1.3) contém só binários; o fonte do core está em
`core-oficial-nakkag/`, que é mais recente. Para os plugins, prefira `nakka-site/` (originais);
`fork-wilfz/CLCLPlugin/` tem versões de `tool_text`, `tool_utl` e `fmt_rtf` evoluídas pelo fork.

## Por onde começar a leitura

- `core-oficial-nakkag/main.c` – janela principal, monitoramento do clipboard, hotkeys
- `ClipBoard.c` / `Format.c` – leitura/escrita de formatos do clipboard
- `History.c` / `Data.c` / `File.c` – histórico e persistência
- `Menu.c` – menu popup
- `SendKey.c` – colar na janela ativa (simula Ctrl+V)
- `CLCLHook/Hook.c` – hook global para detectar a janela em foco
- `CLCLPlugin/CLCLPlugin.h` + `CLCLPlugin.txt` – API de plugins
