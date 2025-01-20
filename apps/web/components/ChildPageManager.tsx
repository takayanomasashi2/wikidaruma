// components/ChildPageManager.tsx
"use client"

import { useState } from 'react'
import { Button } from '@/components/tailwind/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/tailwind/ui/dialog'
import { Input } from '@/components/tailwind/ui/input'
import { usePages } from '@/hooks/usePages'

interface ChildPageManagerProps {
  parentPageId: string
  onPageCreated?: (pageId: string) => void
}

export function ChildPageManager({ parentPageId, onPageCreated }: ChildPageManagerProps) {
  const { createPage } = usePages()
  const [newPageTitle, setNewPageTitle] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateChildPage = async () => {
    if (!newPageTitle.trim()) return

    try {
      const newPage = await createPage(newPageTitle, parentPageId)
      onPageCreated?.(newPage.id)
      setNewPageTitle('')
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to create child page', error)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ 子ページを追加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しい子ページを作成</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Input 
            placeholder="ページタイトル" 
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
          />
          <Button onClick={handleCreateChildPage}>作成</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}