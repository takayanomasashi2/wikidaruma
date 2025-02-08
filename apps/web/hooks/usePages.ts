import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Page } from "@prisma/client";
import type { PageWithChildren } from "@/types/page";

export default function usePages() {
  const { data: session, status } = useSession();
  const [pages, setPages] = useState<PageWithChildren[]>([]);  // 変更
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (status !== "authenticated") {
      setError("認証が必要です");
      return;
    }

    try {
      const response = await fetch("/api/pages", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ページの取得に失敗しました");
      }

      const data = await response.json();
      setPages(data);
      return data;
    } catch (error) {
      console.error("Error fetching pages:", error);
      setError(error instanceof Error ? error.message : "ページの取得に失敗しました");
    }
  }, [status]);

  const createPage = useCallback(async (title: string, parentId?: string | null) => {
    if (status !== "authenticated") {
      throw new Error("認証が必要です");
    }

    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, parentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ページの作成に失敗しました");
      }

      const newPage = await response.json();
      await fetchPages();
      return newPage;
    } catch (error) {
      console.error("Error creating page:", error);
      setError(error instanceof Error ? error.message : "ページの作成に失敗しました");
      throw error;
    }
  }, [status, fetchPages]);

  const updatePage = useCallback(async (id: string, updates: { title?: string; content?: string }) => {
    if (status !== "authenticated") {
      throw new Error("認証が必要です");
    }

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ページの更新に失敗しました");
      }

      const updatedPage = await response.json();
      await fetchPages();
      return updatedPage;
    } catch (error) {
      console.error("Error updating page:", error);
      setError(error instanceof Error ? error.message : "ページの更新に失敗しました");
      throw error;
    }
  }, [status, fetchPages]);

  const deletePage = useCallback(async (id: string) => {
    if (status !== "authenticated") {
      throw new Error("認証が必要です");
    }

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ページの削除に失敗しました");
      }

      await fetchPages();
      return { success: true };
    } catch (error) {
      console.error("Error deleting page:", error);
      setError(error instanceof Error ? error.message : "ページの削除に失敗しました");
      throw error;
    }
  }, [status, fetchPages]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPages();
    }
  }, [fetchPages, status]);

  return {
    pages,
    error,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
  };
}