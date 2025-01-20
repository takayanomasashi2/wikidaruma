// hooks/usePages.ts
import { useState, useCallback } from 'react';
import type { Page } from '@/types/page';

export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updatePageInTree = useCallback((pages: Page[], pageId: string, updatedPage: Page): Page[] => {
    return pages.map(page => {
      if (page.id === pageId) {
        return updatedPage;
      }
      if (page.children?.length) {
        return {
          ...page,
          children: updatePageInTree(page.children, pageId, updatedPage)
        };
      }
      return page;
    });
  }, []);

  const fetchPages = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/pages');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pages');
      }
      const data = await response.json();
      setPages(data);
      return data;
    } catch (error) {
      console.error('Error fetching pages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch pages');
      throw error;
    }
  }, []);

  const updatePage = useCallback(async (id: string, updates: { title?: string; content?: string | null }) => {
    try {
      setError(null);
      console.log('Updating page:', { id, updates });

      const response = await fetch(`/api/pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          content: updates.content === '' ? null : updates.content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update page');
      }

      const updatedPage = await response.json();
      console.log('Server response:', updatedPage);

      // 直接ステートを更新せず、fetchPagesを呼び出して最新の状態を取得
      await fetchPages();

      return updatedPage;
    } catch (error) {
      console.error('Error updating page:', error);
      setError(error instanceof Error ? error.message : 'Failed to update page');
      throw error;
    }
  }, [fetchPages]);


  const createPage = useCallback(async (title: string, parentId?: string | null) => {
  try {
    setError(null);

    // ページタイトルの重複を防ぐ
    const uniqueTitle = (() => {
      const existingTitles = pages.map(p => p.title);
      let titleCandidate = title;
      let counter = 1;
      while (existingTitles.includes(titleCandidate)) {
        titleCandidate = `${title} ${counter}`;
        counter++;
      }
      return titleCandidate;
    })();

    // リクエストボディ
    const requestBody = {
      title: uniqueTitle,
      parentId,
      content: null, // 初期コンテンツは空
    };

    const response = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create page');
    }

    const newPage = await response.json();
    console.log('Created new page:', newPage);

    // ページリストを再取得し状態を更新
    const updatedPages = await fetchPages();
    console.log('Pages after creation:', updatedPages);

    return newPage;
  } catch (error) {
    console.error('Error creating page:', error);
    setError(error instanceof Error ? error.message : 'Failed to create page');
    throw error;
  }
}, [pages, fetchPages]);


  const deletePage = useCallback(async (id: string) => {
    try {
      setError(null);
      console.log('Deleting page:', id);

      const response = await fetch(`/api/pages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete page');
      }

      // ページリストを再取得
      await fetchPages();

      // 削除したページが現在選択されているページの場合の処理は、コンポーネント側で行う
      return { success: true };
    } catch (error) {
      console.error('Error deleting page:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete page');
      throw error;
    }
  }, [fetchPages]);

  return {
    pages,
    error,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
  };
}