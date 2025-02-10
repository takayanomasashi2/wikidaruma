// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import usePages from "@/hooks/usePages";
import { Button } from "@/components/tailwind/ui/button";
import { NestedPageEditor } from "@/components/NestedPageEditor";
import { useToast } from "@/components/tailwind/ui/use-toast";
import { PageTree } from "@/components/PageTree";
import Menu from "@/components/tailwind/ui/menu";
import type { Page } from "@prisma/client";
import { Plus } from "lucide-react";
import type { PageWithChildren } from "@/types/page";
import AudioUploader from "@/components/AudioUploader";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { pages, error, fetchPages, createPage, updatePage, deletePage } =
    usePages();
  const { toast } = useToast();
  const [currentPageId, setCurrentPageId] = useState<string | undefined>();
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentPage = pages.reduce((found, page) => {
    if (found) return found;
    if (page.id === currentPageId) return page;
    return page.children?.find((child) => child.id === currentPageId) || null;
  }, null as PageWithChildren | null); // 変更

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPages();
    }
  }, [fetchPages, session]);

  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      const rootPage = pages.find((page) => page.parentId === null);
      setCurrentPageId(rootPage ? rootPage.id : pages[0].id);
    }
  }, [pages, currentPageId]);

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error,
      });
    }
  }, [error, toast]);

  // console.log(session);

  const handleCreateNewPage = async () => {
    if (isCreatingPage || isLoading) return;
    setIsCreatingPage(true);
    setIsLoading(true);

    try {
      const baseTitle = "新規ページ";
      const existingTitles = pages.map((p) => p.title);

      let newTitle = baseTitle;
      let counter = 1;
      while (existingTitles.includes(newTitle)) {
        newTitle = `${baseTitle} ${counter}`;
        counter++;
      }

      const parentId = pages.length === 0 ? null : undefined;
      const newPage = await createPage(newTitle, parentId);
      await fetchPages();
      setCurrentPageId(newPage.id);

      toast({
        title: "成功",
        description: "ページを作成しました",
      });
    } catch (error) {
      console.error("Error creating page:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ページの作成に失敗しました",
      });
    } finally {
      setIsCreatingPage(false);
      setIsLoading(false);
    }
  };

  const handleCreateSubPage = async (parentId: string) => {
    if (isCreatingPage || isLoading) return;
    setIsCreatingPage(true);
    setIsLoading(true);

    try {
      const baseTitle = "新規サブページ";
      const existingSubpageTitles = pages
        .filter((p) => p.parentId === parentId)
        .map((p) => p.title);

      let newTitle = baseTitle;
      let counter = 1;
      while (existingSubpageTitles.includes(newTitle)) {
        newTitle = `${baseTitle} ${counter}`;
        counter++;
      }

      const newPage = await createPage(newTitle, parentId);
      await fetchPages();
      setCurrentPageId(newPage.id);

      toast({
        title: "成功",
        description: "サブページを作成しました",
      });
    } catch (error) {
      console.error("Error creating subpage:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "サブページの作成に失敗しました",
      });
    } finally {
      setIsCreatingPage(false);
      setIsLoading(false);
    }
  };

  const handleUpdatePage = async (
    id: string,
    updates: { title?: string; content?: string },
  ) => {
    try {
      await updatePage(id, updates);
    } catch (error) {
      console.error("Error updating page:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ページの更新に失敗しました",
      });
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-50 border-r">
        <div className="p-4 flex flex-col gap-2">
          <Button
            onClick={handleCreateNewPage}
            disabled={isCreatingPage || isLoading}
            variant="ghost"
            className="flex items-center justify-start gap-2 w-full"
          >
            <Plus className="h-4 w-4" />
            新規ページ追加
          </Button>
          <AudioUploader
            disabled={isCreatingPage || isLoading}
            onTranscriptionComplete={async (text, fileName) => {
              if (text) {
                setIsCreatingPage(true);
                setIsLoading(true);
                try {
                  const title = fileName.replace(/\.[^/.]+$/, "");

                  // JSONをパースして生のテキストを取得
                  const parsedContent = JSON.parse(text);
                  const rawText = parsedContent.content[0].content[0].text;

                  // テキストを適度な長さで分割（およそ3段落程度）
                  const segments = rawText
                    // まず、既存の読点で分割
                    .split(/[、,]/)
                    .map((segment) => segment.trim())
                    .filter((segment) => segment.length > 0);

                  // おおよそ3つの段落になるように結合
                  const segmentsPerParagraph = Math.ceil(segments.length / 3);
                  const paragraphs: string[] = [];

                  for (
                    let i = 0;
                    i < segments.length;
                    i += segmentsPerParagraph
                  ) {
                    const paragraph = segments
                      .slice(i, i + segmentsPerParagraph)
                      .join("、");
                    paragraphs.push(paragraph + "。");
                  }

                  // Novelエディタ用のJSON形式を作成
                  const content = {
                    type: "doc",
                    content: paragraphs.map((paragraph) => ({
                      type: "paragraph",
                      attrs: { textAlign: "left" },
                      content: [
                        {
                          type: "text",
                          text: paragraph,
                        },
                      ],
                    })),
                  };

                  // console.log("Generated content:", content);

                  const newPage = await createPage(title, null);
                  await updatePage(newPage.id, {
                    content: JSON.stringify(content),
                  });
                  await fetchPages();
                  setCurrentPageId(newPage.id);

                  toast({
                    title: "成功",
                    description: "音声ファイルからページを作成しました",
                  });
                } catch (error) {
                  console.error("Error creating page from audio:", error);
                  toast({
                    variant: "destructive",
                    title: "エラー",
                    description: "ページの作成に失敗しました",
                  });
                } finally {
                  setIsCreatingPage(false);
                  setIsLoading(false);
                }
              }
            }}
          />
        </div>
        <PageTree
          pages={pages}
          selectedPageId={currentPageId || ""}
          onSelectPage={setCurrentPageId}
          onDeletePage={deletePage}
          onUpdatePage={(id, updates) =>
            updatePage(id, { title: updates.title })
          }
          onCreateSubPage={handleCreateSubPage}
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-end items-center p-4">
          <Menu />
        </div>
        <main className="p-4">
          {currentPageId && (
            <NestedPageEditor
              pageId={currentPageId}
              onUpdate={handleUpdatePage}
              initialContent={
                pages.find((p) => p.id === currentPageId)?.content
              }
              initialTitle={currentPage?.title}
            />
          )}
        </main>
      </div>
    </div>
  );
}
