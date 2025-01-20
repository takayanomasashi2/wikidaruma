import React, { useEffect, useState } from "react";
import type { Page } from "@/types/page";
import dynamic from "next/dynamic";
import { PageTree } from "./PageTree";
import type { JSONContent, EditorInstance } from "novel";
import type { TailwindAdvancedEditorProps } from "./tailwind/advanced-editor";
import { PageLinkNode } from "@/lib/novel-extensions";
import { Node } from '@tiptap/core';

const TailwindAdvancedEditor = dynamic<TailwindAdvancedEditorProps>(() => import("./tailwind/advanced-editor"), {
  ssr: false,
});

interface NestedPageEditorProps {
  pages: Page[];
  onUpdatePage: (id: string, content: string) => void;
  onUpdatePageTitle?: (id: string, title: string) => void;
  onDeletePage: (id: string) => void;
  currentPageId?: string;
  onSelectPage: (pageId: string) => void;
}

export const NestedPageEditor: React.FC<NestedPageEditorProps> = ({
  pages,
  onUpdatePage,
  onUpdatePageTitle,
  onDeletePage,
  currentPageId,
  onSelectPage
}) => {
  const [editorKey, setEditorKey] = useState<string>('0');
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);

  // 現在のページを探す
  const currentPage = currentPageId 
    ? pages.find(p => p.id === currentPageId) || 
      pages.flatMap(p => p.children || []).find(p => p.id === currentPageId)
    : undefined;

  // デバッグ用: currentPageの変更を監視
  useEffect(() => {
    console.log('Current page changed:', { 
      id: currentPage?.id, 
      title: currentPage?.title,
      content: currentPage?.content 
    });
  }, [currentPage]);

  // デバッグ用: ページコンテンツの変更を監視
  useEffect(() => {
    console.log('Page content updated:', currentPage?.content);
  }, [currentPage?.content]);

  // ページが変更されたらエディタを強制的に再マウント
  useEffect(() => {
    console.log('Forcing editor remount due to page change');
    setEditorKey(prev => String(Number(prev) + 1));
    setLastSavedContent(null);  // 最後に保存されたコンテンツをリセット
  }, [currentPageId]);

  // ページコンテンツのパース
  const parseContent = (content: any): JSONContent => {
    console.log('Parsing content:', content);
    if (!content || content === 'null') return { type: 'doc', content: [] };
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      console.log('Parsed content:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error parsing content:', error);
      return { type: 'doc', content: [] };
    }
  };

// エディタの更新ハンドラ
  const handleEditorUpdate = ({ editor }: { editor: EditorInstance }) => {
    if (!currentPage) return;

    const newContent = editor.getJSON();
    const stringifiedContent = JSON.stringify(newContent);
    
    // 最後に保存したコンテンツと同じ場合は更新をスキップ
    if (stringifiedContent === lastSavedContent) {
      console.log('Content unchanged, skipping update');
      return;
    }

    console.log('Saving new content:', {
      pageId: currentPage.id,
      content: newContent
    });

    setLastSavedContent(stringifiedContent);
    
    // 更新を非同期で実行
    onUpdatePage(currentPage.id, stringifiedContent);
  };

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
        {currentPage && (
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
                initialContent={parseContent(currentPage.content)}
                onUpdate={handleEditorUpdate}
                extensions={[PageLinkNode as Node]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};