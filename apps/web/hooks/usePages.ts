// hooks/usePages.ts
import { useState, useCallback } from 'react';
import type { Page } from '@/types/page';
import type { Session } from 'next-auth';

export default function usePages(session: Session | null) {
 const [pages, setPages] = useState<Page[]>([]);
 const [error, setError] = useState<string | null>(null);

 const fetchPages = useCallback(async () => {
   try {
     const response = await fetch('/api/pages', {
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
     });

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

 const createPage = useCallback(async (title: string, parentId?: string | null) => {
   try {
     const response = await fetch('/api/pages', {
       method: 'POST',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ title, parentId }),
     });

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'Failed to create page');
     }

     const newPage = await response.json();
     await fetchPages();
     return newPage;
   } catch (error) {
     console.error('Error creating page:', error);
     setError(error instanceof Error ? error.message : 'Failed to create page');
     throw error;
   }
 }, [fetchPages]);

 const updatePage = useCallback(async (id: string, updates: { title?: string; content?: string }) => {
   try {
     const response = await fetch(`/api/pages/${id}`, {
       method: 'PATCH',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(updates),
     });

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'Failed to update page');
     }

     const updatedPage = await response.json();
     await fetchPages();
     return updatedPage;
   } catch (error) {
     console.error('Error updating page:', error);
     setError(error instanceof Error ? error.message : 'Failed to update page');
     throw error;
   }
 }, [fetchPages]);

 const deletePage = useCallback(async (id: string) => {
   try {
     const response = await fetch(`/api/pages/${id}`, {
       method: 'DELETE',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
     });

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'Failed to delete page');
     }

     await fetchPages();
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

