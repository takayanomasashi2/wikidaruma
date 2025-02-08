// app/components/PageTree.tsx
"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Trash2,
  Edit,
  Check,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageWithChildren } from "@/types/page";

interface PageTreeProps {
  pages: PageWithChildren[];
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (id: string, updates: { title: string }) => void;
  onCreateSubPage: (parentId: string) => void;
}

interface PageTreeItemProps {
  page: PageWithChildren;
  level?: number;
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (id: string, updates: { title?: string }) => void;
  onCreateSubPage: (parentId: string) => void;
}

const PageTreeItem = ({
  page,
  level = 0,
  selectedPageId,
  onSelectPage,
  onDeletePage,
  onUpdatePage,
  onCreateSubPage,
}: PageTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(page.title);
  const hasChildren = page.children && page.children.length > 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeletePage(page.id);
  };

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedTitle(page.title);
    setIsEditing(false);
  };

  const handleEditSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedTitle.trim() && editedTitle !== page.title) {
      onUpdatePage(page.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleCreateSubPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCreateSubPage(page.id);
  };

  const isRootPage = page.parentId === null;

  return (
    <div className="w-full">
      <div
        className={cn(
          "group flex items-center justify-between gap-2 p-2 hover:bg-accent rounded cursor-pointer",
          selectedPageId === page.id && "bg-accent",
          isRootPage && "font-bold",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectPage(page.id)}
      >
        <div className="flex items-center gap-2 flex-grow">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-4 h-4 flex items-center justify-center"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <File className="w-4 h-4 text-muted-foreground" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-2 flex-grow relative">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-grow border rounded px-2 py-1"
                autoFocus
              />
              <div className="absolute right-0 flex gap-2">
                <button
                  onClick={handleEditSave}
                  className="text-green-500 hover:text-green-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleEditCancel}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-sm flex-grow">{page.title}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button
                onClick={handleCreateSubPage}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-black transition-opacity duration-200"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleEditStart}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-black transition-opacity duration-200"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-red-600 transition-opacity duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="w-full">
          {page.children.map((childPage) => (
            <PageTreeItem
              key={childPage.id}
              page={childPage}
              level={level + 1}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
              onDeletePage={onDeletePage}
              onUpdatePage={onUpdatePage}
              onCreateSubPage={onCreateSubPage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PageTree = ({
  pages,
  selectedPageId,
  onSelectPage,
  onDeletePage,
  onUpdatePage,
  onCreateSubPage,
}: PageTreeProps) => {
  const rootPages = pages.filter((page) => page.parentId === null);

  return (
    <div className="w-64 border-r border-muted h-full overflow-y-auto">
      {rootPages.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onDeletePage={onDeletePage}
          onUpdatePage={onUpdatePage}
          onCreateSubPage={onCreateSubPage}
        />
      ))}
    </div>
  );
};
