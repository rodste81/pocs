// Uso: node dist/import-check.js <caminho do regist.dat>
// Mostra so a arvore de pastas e as contagens (nao imprime o conteudo dos itens).
import * as fs from 'fs';
import { parseRegist } from './regist';
import { TemplateNode } from './types';

const file = process.argv[2] ?? '../regist.dat';
const { root, stats } = parseRegist(fs.readFileSync(file));
const show = (nodes: TemplateNode[], depth: number): void => {
  const items = nodes.filter((n) => n.type === 'item').length;
  if (items) console.log(`${'  '.repeat(depth)}(${items} itens)`);
  for (const n of nodes) {
    if (n.type === 'folder') {
      console.log(`${'  '.repeat(depth)}[${n.title}]`);
      if (depth < 2) show(n.children, depth + 1);
    }
  }
};
show(root, 0);
console.log(stats);
