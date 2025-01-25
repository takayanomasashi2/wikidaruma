// api/blocks/[id]/route.ts

import { NextResponse } from "next/server";
import { updateBlock, deleteBlock } from "@/app/actions/blocks";

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params; // Access params directly

  try {
    const blockData = await request.json();

    if (!blockData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updatedBlock = await updateBlock(id, blockData);
    return NextResponse.json(updatedBlock);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update block' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params; // Access params directly

  try {
    if (!id) {
      return NextResponse.json({ error: "Block ID is required" }, { status: 400 });
    }

    await deleteBlock(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting block:", error);
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
  }
}
