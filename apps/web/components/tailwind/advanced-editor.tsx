import React, { useEffect, useState, useRef, useMemo } from "react";
import type { JSONContent, EditorInstance } from "novel";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  ImageResizer,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { Extension, Node } from '@tiptap/core';
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { Separator } from "./ui/separator";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";

export interface TailwindAdvancedEditorProps {
  initialContent?: JSONContent | null;
  onUpdate?: ({ editor }: { editor: EditorInstance }) => void;
  extensions?: Array<Extension | Node>;
}

const TailwindAdvancedEditor: React.FC<TailwindAdvancedEditorProps> = ({
  initialContent,
  onUpdate,
  extensions: customExtensions = [],
}) => {
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number | undefined>();
  const editorRef = useRef<EditorInstance | null>(null);

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  // マウント時とアンマウント時にストレージをクリア
  useEffect(() => {
    const clearStorage = () => {
      window.localStorage.removeItem("novel-content");
      window.localStorage.removeItem("html-content");
      window.localStorage.removeItem("markdown");
    };

    clearStorage();
    
    return () => {
      clearStorage();
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // initialContentが変更された時にエディタの内容を更新
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.commands.setContent(initialContent);
    }
  }, [initialContent]);

  // 拡張機能の重複を防ぐ
  const allExtensions = useMemo(() => {
    const baseExtensions = defaultExtensions.filter(ext => 
      !customExtensions.some(customExt => 
        customExt.name === ext.name
      )
    );
    return [...baseExtensions, slashCommand, ...customExtensions];
  }, [customExtensions]);

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    
    if (onUpdate) {
      onUpdate({ editor });
    }
    setSaveStatus("Saved");
  }, 500);

  const handleUpdate = ({ editor }: { editor: EditorInstance }) => {
    editorRef.current = editor;
    debouncedUpdates(editor);
    setSaveStatus("Unsaved");
  };

  const handleCreate = ({ editor }: { editor: EditorInstance }) => {
    editorRef.current = editor;
  };

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground">
          {saveStatus}
        </div>
        <div className={charsCount ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground" : "hidden"}>
          {charsCount} Words
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent || { type: 'doc', content: [] }}
          extensions={allExtensions}
          className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class: "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
            },
          }}
          onUpdate={handleUpdate}
          onCreate={handleCreate}
          slotAfter={<ImageResizer />}
          immediatelyRender={false}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default React.memo(TailwindAdvancedEditor);