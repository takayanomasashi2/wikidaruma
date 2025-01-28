// api/blocks/[id]/route.ts

import { NextResponse } from "next/server";
import { updateBlock, deleteBlock } from "@/app/actions/blocks";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const data = await req.json();
        const block = await updateBlock(params.id, data);
        return NextResponse.json(block);
    } catch (error) {
        console.error('Error updating block:', error);
        return NextResponse.json(
            { error: 'Failed to update block' },
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
