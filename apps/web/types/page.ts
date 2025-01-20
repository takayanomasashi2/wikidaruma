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