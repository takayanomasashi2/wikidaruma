// app/dashboard/page.tsx の先頭に追加
"use client";

import { useEffect, useState } from 'react';
import { usePages } from '@/hooks/usePages';
import { Button } from '@/components/tailwind/ui/button';
import { NestedPageEditor } from '@/components/NestedPageEditor';
import { useToast } from "@/components/tailwind/ui/use-toast";

import { Dialog, DialogContent, DialogTrigger } from "@/components/tailwind/ui/dialog";
import Menu from "@/components/tailwind/ui/menu";
import { ScrollArea } from "@/components/tailwind/ui/scroll-area";
import { BookOpen, GithubIcon } from "lucide-react";
import Link from "next/link";
import { ChatBot } from '@/components/ChatBot';


export default function DashboardPage() {
  const { pages, error, fetchPages, createPage, updatePage, deletePage } = usePages();
  const { toast } = useToast();
  const [currentPageId, setCurrentPageId] = useState<string | undefined>();
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ページ一覧の初回ロード
  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // 最初のページを選択
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      const rootPage = pages.find(page => page.parentId === null);
      setCurrentPageId(rootPage ? rootPage.id : pages[0].id);
    }
  }, [pages, currentPageId]);

  // エラー処理
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error
      });
    }
  }, [error, toast]);

  const handleCreateNewPage = async () => {
    if (isCreatingPage || isLoading) return;
    setIsCreatingPage(true);
    setIsLoading(true);

    try {
      const baseTitle = 'New Page';
      const existingTitles = pages.map(p => p.title);
      
      let newTitle = baseTitle;
      let counter = 1;
      while (existingTitles.includes(newTitle)) {
        newTitle = `${baseTitle} ${counter}`;
        counter++;
      }

      const parentId = pages.length === 0 ? null : undefined;
      const newPage = await createPage(newTitle, parentId);
      // ページ一覧を更新
      await fetchPages();
      // 新しいページに移動
      setCurrentPageId(newPage.id);
      
      toast({
        title: "成功",
        description: "ページを作成しました"
      });
    } catch (error) {
      console.error('Error creating page:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ページの作成に失敗しました"
      });
    } finally {
      setIsCreatingPage(false);
      setIsLoading(false);
    }
  };

  const handleCreateSubPage = async () => {
    if (!currentPageId || isCreatingPage || isLoading) return;
    setIsCreatingPage(true);
    setIsLoading(true);

    try {
      const baseTitle = 'New Subpage';
      const existingSubpageTitles = pages
        .filter(p => p.parentId === currentPageId)
        .map(p => p.title);

      let newTitle = baseTitle;
      let counter = 1;
      while (existingSubpageTitles.includes(newTitle)) {
        newTitle = `${baseTitle} ${counter}`;
        counter++;
      }

      const newPage = await createPage(newTitle, currentPageId); // 親ページの ID を設定
      // ページ一覧を再取得
      await fetchPages();

      // サブページ作成後、即座に currentPageId を更新
      setCurrentPageId(newPage.id);  // サブページの ID を設定

      toast({
        title: "成功",
        description: "サブページを作成しました"
      });
    } catch (error) {
      console.error('Error creating subpage:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "サブページの作成に失敗しました"
      });
    } finally {
      setIsCreatingPage(false);
      setIsLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const confirmDelete = window.confirm('本当にこのページを削除しますか？');
      if (!confirmDelete) {
        setIsLoading(false);
        return;
      }

      await deletePage(pageId);
      
      // ページ一覧を更新
      await fetchPages();
      
      // currentPageId が削除されたページの場合、他のページに移動
      if (currentPageId === pageId) {
        const remainingPages = pages.filter(p => p.id !== pageId);
        if (remainingPages.length > 0) {
          const rootPage = remainingPages.find(page => page.parentId === null);
          setCurrentPageId(rootPage ? rootPage.id : remainingPages[0].id);
        } else {
          setCurrentPageId(undefined);
        }
      }

      toast({
        title: "成功",
        description: "ページを削除しました"
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ページの削除に失敗しました"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePage = async (id: string, content: string) => {
    try {
      await updatePage(id, { content });
    } catch (error) {
      console.error('Error updating page:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "ページの更新に失敗しました"
      });
    }
  };

  return (
    <div className="p-4 flex flex-col space-y-4">
      <div className="flex w-full max-w-screen-lg items-center gap-2 px-4 sm:mb-[calc(2vh)]">
        <Button size="icon" variant="outline">
          <a href="https://github.com/steven-tey/novel" target="_blank" rel="noreferrer">
            <GithubIcon />
          </a>
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="ml gap-2">
              <BookOpen className="h-4 w-4" />
              Usage in dialog
            </Button>
          </DialogTrigger>
        </Dialog>
        <Link href="/docs" className="ml-auto">
          <Button variant="ghost">Documentation</Button>
        </Link>
        <Menu />
      </div>
      <div className="flex space-x-2">
        <Button 
          onClick={handleCreateNewPage}
          disabled={isCreatingPage || isLoading}
        >
          新規ページ作成
        </Button>
        {currentPageId && (
          <Button 
            variant="secondary" 
            onClick={handleCreateSubPage}
            disabled={isCreatingPage || isLoading}
          >
            サブページ作成
          </Button>
        )}
      </div>
      {pages.length > 0 && (
        <NestedPageEditor
          pages={pages}
          currentPageId={currentPageId}
          onUpdatePage={handleUpdatePage}
          onDeletePage={handleDeletePage}
          onSelectPage={setCurrentPageId}
          onUpdatePageTitle={(id, title) => updatePage(id, { title })}
        />
      )}
      <ChatBot/>
    </div>
  );
}

