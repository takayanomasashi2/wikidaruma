import React, { useEffect, useState, useRef, useMemo, type FC } from "react";
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
import { Extension, Node } from "@tiptap/core";
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
import type { BlockType } from "@/types/page";

interface Block {
  id?: string;
  content: string;
  type: string;
  order: number;
  checked?: boolean;
  embedding?: number[];
  pageId: string;
}

interface ApiBlock {
  id: string;
  order: number;
}

export interface TailwindAdvancedEditorProps {
  initialContent?: JSONContent | null;
  onUpdate?: ({ editor }: { editor: EditorInstance }) => void;
  extensions?: Array<Extension | Node>;
  pageId: string;
}

const TailwindAdvancedEditor: FC<TailwindAdvancedEditorProps> = ({
  initialContent,
  onUpdate,
  extensions: customExtensions = [],
  pageId,
}) => {
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number | undefined>();
  const editorRef = useRef<EditorInstance | null>(null);
  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const extractBlockContent = (node: any): string => {
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.content))
      return node.content.map(extractBlockContent).join("");
    return "";
  };

  async function updateBlockClient(id: string, block: Partial<Block>) {
    // console.log(block)

    const response = await fetch(`/api/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(block), // Do not wrap in another object
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error updating block:", error);
      throw new Error("Failed to update block");
    }

    return response.json();
  }

  const processBlocks = async (editor: EditorInstance) => {
    if (!pageId) return [];

    const json = editor.getJSON();
    const blocks: Block[] = [];

    const existingBlocks = (await fetch(`/api/blocks?pageId=${pageId}`).then(
      (r) => r.json(),
    )) as ApiBlock[];
    const existingBlockIds = new Map(
      existingBlocks.map((b) => [b.order, b.id]),
    );
    const usedBlockIds = new Set<string>();

    const getNodeContent = (node: any): string => {
      if (node.text) return node.text;
      if (node.content) {
        return node.content.map(getNodeContent).join(" / ");
      }
      return "";
    };

    const processNode = async (node: any, parentOrder: number) => {
      let blockType: BlockType = "text";
      if (node.type === "heading" && node.attrs?.level) {
        blockType = `heading${node.attrs.level}` as BlockType;
      } else {
        switch (node.type) {
          case "bulletList":
            blockType = "bulletList";
            break;
          case "taskList":
            blockType = "taskList";
            break;
          case "orderedList":
            blockType = "orderedList";
            break;
          case "listItem":
            blockType = "listItem";
            break;
          case "horizontalRule":
            blockType = "horizontalRule";
            break;
          case "math":
            blockType = "math";
            break;
          case "twitter":
            blockType = "twitter";
            break;
          case "codeBlock":
            blockType = "codeBlock";
            break;
          case "paragraph":
            blockType = "paragraph";
            break;
          case "doc":
            blockType = "doc";
            break;
          default:
            break;
        }
      }

      const content = getNodeContent(node).trim();
      if (content) {
        const blockData = {
          content,
          type: blockType,
          pageId,
          order: parentOrder,
          checked: node.attrs?.checked ?? false,
        };

        const existingId = existingBlockIds.get(parentOrder);
        if (existingId) {
          usedBlockIds.add(existingId);
          blocks.push(await updateBlockClient(existingId, blockData));
        } else {
          const response = await createBlockClient(blockData);
          blocks.push(response);
          if (response.id) usedBlockIds.add(response.id);
        }
      }
    };

    let order = 0;
    for (const node of json.content || []) {
      await processNode(node, order);
      order++;
    }

    for (const block of existingBlocks) {
      if (!usedBlockIds.has(block.id)) {
        await fetch(`/api/blocks/${block.id}`, { method: "DELETE" });
      }
    }

    return blocks;
  };

  async function createBlockClient(block: Partial<Block>) {
    const response = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(block),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

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

  useEffect(() => {
    if (!initialContent) return;

    // Use setTimeout to defer the setContent call
    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.commands.setContent(initialContent);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [initialContent]);

  const allExtensions = useMemo(() => {
    const baseExtensions = defaultExtensions.filter(
      (ext) =>
        !customExtensions.some((customExt) => customExt.name === ext.name),
    );
    return [...baseExtensions, slashCommand, ...customExtensions];
  }, [customExtensions]);

  const debouncedUpdates = useDebouncedCallback(
    async (editor: EditorInstance) => {
      try {
        setSaveStatus("Saving...");
        const updatedBlocks = await processBlocks(editor);
        setCharsCount(editor.storage.characterCount.words());

        if (onUpdate) {
          onUpdate({ editor });
        }
        setSaveStatus("Saved");
      } catch (error) {
        console.error("Error updating blocks:", error);
        setSaveStatus("Error saving");
      }
    },
    1000,
  );

  const handleUpdate = ({ editor }: { editor: EditorInstance }) => {
    editorRef.current = editor;
    setSaveStatus("Unsaved");
    debouncedUpdates(editor);
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
        <div
          className={
            charsCount
              ? "rounded-lg bg-accent px-2 py-1 text-sm text-muted-foreground"
              : "hidden"
          }
        >
          {charsCount} Blocks
        </div>
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent || { type: "doc", content: [] }}
          extensions={allExtensions}
          className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) =>
              handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) =>
              handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
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
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
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
