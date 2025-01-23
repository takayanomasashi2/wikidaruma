// lib/utils/blockUtils.ts
import { v4 as uuidv4 } from "uuid";
import type { BlockType } from "@/types/page";

export const generateBlockId = (pageId: string): string => {
    const timestamp = Date.now();
    return `block-${pageId}-${timestamp}`;  // より読みやすいID形式
};

export const isValidBlockType = (type: any): type is BlockType => {
    return [
        'text',
        'todo',
        'heading',
        'heading1',
        'heading2',
        'heading3',
        'subheading',
        'quote',
        'codeBlock',
        'paragraph',
        'orderedList',
        'listItem',
        'taskList',
        'horizontalRule',
        'math',
        'twitter',
        'doc',
        'mark_code',
        'mark_link',
        'bulletList'
    ].includes(type);
};