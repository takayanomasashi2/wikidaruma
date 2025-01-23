// types/page.ts
import type { JSONContent } from "novel";

export type Page = {
  id: string;
  title: string;
  content: string | null;  // JSONContentをStringとして保存
  parentId: string | null;
  order: number;
  children: Page[];
  createdAt: Date;
  updatedAt: Date;
};

// src/types/index.ts の BlockType 定義を確認
export type BlockType = 
  | 'text'
  | 'todo'
  | 'heading'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'subheading'
  | 'quote'
  | 'codeBlock'
  | 'paragraph'
  | 'orderedList'
  | 'listItem'
  | 'taskList'
  | 'horizontalRule'
  | 'math'
  | 'twitter'
  | 'doc'
  | 'mark_code'
  | 'bulletList'
  | 'mark_link';

export interface Block {
    id: string;
    type: BlockType;
    content: string;
    pageId: string;
    order: number;
    checked: boolean | null;
    embedding?: number[] | string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface EditorProps {
    page: Page;
    onUpdate: (pageId: string, content: string) => void;
    onTitleChange: (pageId: string, title: string) => void;
}

export interface BlockEditorProps {
    blocks: Block[];
    pageId: string;
    onBlocksChange: (newBlocks: Block[]) => void;
}