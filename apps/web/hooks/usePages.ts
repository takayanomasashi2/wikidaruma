import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Page } from "@/types/page";

export default function usePages() {
  const { data: session, status } = useSession(); // ✅ `status` を取得
  console.log("🔎 session:", session, "status:", status);

  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (status !== "authenticated" || !session?.accessToken) {
      console.log("❌ No session or access token found.");
      setError("Unauthorized: No session or access token found");
      return;
    }

    try {
      console.log("📡 Fetching pages with accessToken:", session.accessToken);

      const response = await fetch("/api/pages", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`, // ✅ Authorization ヘッダーを追加
        },
      });

      console.log("🔎 API Response Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch pages");
      }

      const data = await response.json();
      setPages(data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching pages:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch pages");
    }
  }, [session, status]); // ✅ `session` を依存リストに追加

  useEffect(() => {
    if (status === "authenticated") {
      fetchPages();
    }
  }, [fetchPages, status]);

  const createPage = useCallback(async (title: string, parentId?: string | null) => {
    if (status !== "authenticated" || !session?.accessToken) {
      throw new Error("Unauthorized: No session or access token found");
    }

    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`, // ✅ Authorization ヘッダーを追加
        },
        body: JSON.stringify({ title, parentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create page");
      }

      const newPage = await response.json();
      await fetchPages();
      return newPage;
    } catch (error) {
      console.error("❌ Error creating page:", error);
      setError(error instanceof Error ? error.message : "Failed to create page");
      throw error;
    }
  }, [session, status, fetchPages]); // ✅ `session` を依存リストに追加

  const updatePage = useCallback(async (id: string, updates: { title?: string; content?: string }) => {
    if (status !== "authenticated" || !session?.accessToken) {
      throw new Error("Unauthorized: No session or access token found");
    }

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`, // ✅ Authorization ヘッダーを追加
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update page");
      }

      const updatedPage = await response.json();
      await fetchPages();
      return updatedPage;
    } catch (error) {
      console.error("❌ Error updating page:", error);
      setError(error instanceof Error ? error.message : "Failed to update page");
      throw error;
    }
  }, [session, status, fetchPages]); // ✅ `session` を依存リストに追加

  const deletePage = useCallback(async (id: string) => {
    if (status !== "authenticated" || !session?.accessToken) {
      throw new Error("Unauthorized: No session or access token found");
    }

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`, // ✅ Authorization ヘッダーを追加
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete page");
      }

      await fetchPages();
      return { success: true };
    } catch (error) {
      console.error("❌ Error deleting page:", error);
      setError(error instanceof Error ? error.message : "Failed to delete page");
      throw error;
    }
  }, [session, status, fetchPages]); // ✅ `session` を依存リストに追加

  return {
    pages,
    error,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
  };
}
