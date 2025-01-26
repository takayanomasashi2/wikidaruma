import React, { useEffect, useState, type FC } from "react";
import type { Page } from "@/types/page";
import dynamic from "next/dynamic";
import type { JSONContent, EditorInstance } from "novel";
import type { TailwindAdvancedEditorProps } from "./tailwind/advanced-editor";
import { PageLinkNode } from "@/lib/novel-extensions";
import { Node } from "@tiptap/core";
import { ChatBotWithImage } from "./ChatBot";
import { useSession } from "next-auth/react";

const TailwindAdvancedEditor = dynamic<TailwindAdvancedEditorProps>(
  () => import("./tailwind/advanced-editor"),
  { ssr: false },
);

interface NestedPageEditorProps {
  pageId: string;
  onUpdate: (
    id: string,
    updates: { title?: string; content?: string },
  ) => Promise<any>;
  initialContent?: string | null;
  initialTitle?: string;
}

export const NestedPageEditor: FC<NestedPageEditorProps> = ({
  pageId,
  onUpdate,
  initialContent,
  initialTitle,
}) => {
  const { data: session } = useSession();
  const [editorKey, setEditorKey] = useState<string>("0");
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>("");
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    setEditorKey((prev) => String(Number(prev) + 1));
    setLastSavedContent(null);
    setTempTitle(initialTitle || "");
  }, [pageId, initialTitle]);

  const parseContent = (content: any): JSONContent => {
    if (!content || content === "null") return { type: "doc", content: [] };
    try {
      const parsed =
        typeof content === "string" ? JSON.parse(content) : content;
      return parsed;
    } catch (error) {
      console.error("Error parsing content:", error);
      return { type: "doc", content: [] };
    }
  };

  const handleEditorUpdate = ({ editor }: { editor: EditorInstance }) => {
    const newContent = editor.getJSON();
    const stringifiedContent = JSON.stringify(newContent);

    if (stringifiedContent === lastSavedContent) return;

    setLastSavedContent(stringifiedContent);
    onUpdate(pageId, { content: stringifiedContent });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitle(e.target.value);
  };

  const handleTitleUpdate = () => {
    if (tempTitle) {
      onUpdate(pageId, { title: tempTitle });
    }
  };

  return (
    <div className="relative h-full">
      <div className="flex h-full w-full">
        <div className="flex-1 h-full p-4 space-y-4">
          <div>
            <input
              type="text"
              value={tempTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleUpdate}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => {
                setIsComposing(false);
                handleTitleUpdate();
              }}
              className="w-full text-2xl font-bold border-b mb-4 py-2 focus:outline-none focus:border-blue-500"
              placeholder="ページタイトル"
            />

            <div key={`editor-wrapper-${editorKey}`}>
              <TailwindAdvancedEditor
                key={`editor-${pageId}-${editorKey}`}
                pageId={pageId}
                initialContent={parseContent(initialContent)}
                onUpdate={handleEditorUpdate}
                extensions={[PageLinkNode as Node]}
              />
            </div>
          </div>
        </div>
      </div>
      {session?.user?.id && <ChatBotWithImage userId={session.user.id} />}
    </div>
  );
};
