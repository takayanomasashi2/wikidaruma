// /components/tailwind/ui/toast.ts
import React from "react"

/**
 * ボタンなどのアクションを表す型。
 * - 実体は ReactNode でもよいし
 * - label, onClick など細かく定義してもよい
 */
export type ToastActionElement = React.ReactNode

/**
 * トースト1つあたりの基本的なプロパティ
 * - 必要に応じて追加・修正してください
 */
export interface ToastProps {
  title?: React.ReactNode
  description?: React.ReactNode
}

/* ここでは主に型だけを定義していて、
   コンポーネント本体 (Toast, ToastProvider, etc.) は書いていません。
   すでに別のファイルで Toast UI を作成済みの場合、
   そのファイルに合わせて適宜プロパティを追加してください。 */
