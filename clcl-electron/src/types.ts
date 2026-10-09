export interface TemplateItem {
  type: 'item';
  title: string;
  text: string;
  modified?: string;
}

export interface TemplateFolder {
  type: 'folder';
  title: string;
  children: TemplateNode[];
}

export type TemplateNode = TemplateItem | TemplateFolder;

export interface ImportStats {
  folders: number;
  items: number;
  skipped: number;
}
