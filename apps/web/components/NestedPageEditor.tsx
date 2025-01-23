import React, { useEffect, useState, type FC } from "react";
import type { Page } from "@/types/page";
import dynamic from "next/dynamic";
import { PageTree } from "./PageTree";
import type { JSONContent, EditorInstance } from "novel";
import type { TailwindAdvancedEditorProps } from "./tailwind/advanced-editor";
import { PageLinkNode } from "@/lib/novel-extensions";
import { Node } from '@tiptap/core';

const TailwindAdvancedEditor = dynamic<TailwindAdvancedEditorProps>(() => import("./tailwind/advanced-editor"), { ssr: false });

interface NestedPageEditorProps {
  pages: Page[];
  onUpdatePage: (id: string, content: string) => void;
  onUpdatePageTitle?: (id: string, title: string) => void;
  onDeletePage: (id: string) => void;
  currentPageId?: string;
  onSelectPage: (pageId: string) => void;
}

export const NestedPageEditor: FC<NestedPageEditorProps> = ({
  pages,
  onUpdatePage,
  onUpdatePageTitle,
  onDeletePage,
  currentPageId,
  onSelectPage
}) => {
  const [editorKey, setEditorKey] = useState<string>('0');
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);

  const currentPage = currentPageId 
    ? pages.find(p => p.id === currentPageId) || 
      pages.flatMap(p => p.children || []).find(p => p.id === currentPageId)
    : undefined;

  useEffect(() => {
    setEditorKey(prev => String(Number(prev) + 1));
    setLastSavedContent(null);
  }, [currentPageId]);

  const parseContent = (content: any): JSONContent => {
    if (!content || content === 'null') return { type: 'doc', content: [] };
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return parsed;
    } catch (error) {
      console.error('Error parsing content:', error);
      return { type: 'doc', content: [] };
    }
  };

  const handleEditorUpdate = ({ editor }: { editor: EditorInstance }) => {
    if (!currentPage) return;

    const newContent = editor.getJSON();
    const stringifiedContent = JSON.stringify(newContent);
    
    if (stringifiedContent === lastSavedContent) return;

    setLastSavedContent(stringifiedContent);
    onUpdatePage(currentPage.id, stringifiedContent);
  };

  if (!currentPage) {
    return null;
  }

  return (
    <div className="flex h-full w-full">
      <PageTree
        pages={pages}
        selectedPageId={currentPageId || ""}
        onSelectPage={onSelectPage}
        onDeletePage={onDeletePage}
        onUpdatePage={
          onUpdatePageTitle 
            ? (id, updates) => onUpdatePageTitle(id, updates.title || '') 
            : undefined
        }
      />
      <div className="flex-1 h-full p-4 space-y-4">
        <div>
          <input
            type="text"
            value={currentPage.title || ''}
            onChange={e => onUpdatePageTitle?.(currentPage.id, e.target.value)}
            className="w-full text-2xl font-bold border-b mb-4 py-2 focus:outline-none focus:border-blue-500"
            placeholder="ページタイトル"
          />
          
          <div key={`editor-wrapper-${editorKey}`}>
            <TailwindAdvancedEditor
              key={`editor-${currentPage.id}-${editorKey}`}
              pageId={currentPage.id}
              initialContent={parseContent(currentPage.content)}
              onUpdate={handleEditorUpdate}
              extensions={[PageLinkNode as Node]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
