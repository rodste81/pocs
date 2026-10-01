# Arquitect Uno v1.0.0

Versão personalizada do visualizador de planta, com a casa Rodrigo e Família.

## Como usar

Abra `index.html` no navegador. O 3D precisa de internet para baixar o three.js.

## Novidades da v1.0.0

- **Visual verde-claro com violeta**: cabeçalho em degradê, botões e destaques em violeta, painéis em verde suave.
- **Cômodos e elementos em sanfona**: no painel da direita, cada cômodo abre uma lista com os móveis que estão nele. Os itens fora da casa ficam em "Jardim / terreno". Clicar num item seleciona o móvel; há botões para expandir e recolher tudo.
- **📸 Criar snapshot**: salva a imagem do que está na tela (planta 2D ou cena 3D) junto com o estado completo do projeto. Em "Snapshots" dá para ver as imagens, baixar o PNG ou o JSON, restaurar o estado (com Desfazer) e excluir.
- **Rodapé** com a versão: Arquitect Uno v1.0.0.

## Onde os snapshots ficam salvos

No **IndexedDB**, o banco de dados que já vem dentro do navegador. Funciona sem servidor e guarda imagens grandes sem problema. SQLite não roda nativamente numa página HTML (exigiria baixar uma versão WebAssembly de ~1 MB e mesmo assim gravar no IndexedDB), então não foi usado.

Os snapshots ficam no navegador e no computador em que foram criados. Para levar a outro lugar, baixe o JSON do snapshot e use **Arquivo → Importar projeto**.

## Créditos e licença

Baseado em [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d). O repositório original não publica licença, então os direitos sobre o código-base continuam com o autor original. Esta versão é para uso pessoal. Para vender ou registrar o Arquitect Uno como produto próprio, é preciso uma licença do autor ou reescrever o código do zero.
