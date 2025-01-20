// /components/tailwind/ui/use-toast.ts
import * as React from "react"
import type { ToastActionElement, ToastProps } from "@/components/tailwind/ui/toast"

/* 
  ここでは、shadcn/ui スタイルの toast 状態管理をするための
  カスタムフック & 関数を定義しています。
*/

// 一度に表示できるトーストの最大数
const TOAST_LIMIT = 1

// トーストを自動的に削除するまでの遅延(ミリ秒)
const TOAST_REMOVE_DELAY = 5000  // 例: 5秒

type ToastVariant = "default" | "destructive"

/**
 * 状態管理用の拡張済みトースト型
 *  - ToastProps に加えて、内部的に使うプロパティを足している
 */
type ToasterToast = ToastProps & {
  /** ユニークID */
  id: string
  /** トーストのタイトル（React要素でOK） */
  title?: React.ReactNode
  /** トーストの説明文（React要素でOK） */
  description?: React.ReactNode
  /** ボタンなどのアクション */
  action?: ToastActionElement
  /** カラーリングなどを切り替えるための variant */
  variant?: ToastVariant
  /** トーストが開いているかどうか */
  open?: boolean
  /** トーストが開閉されたときに呼ばれるコールバック */
  onOpenChange?: (open: boolean) => void
}

// reducer で使うアクションタイプ
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

// ID生成用のカウンタ
let count = 0
function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

// Action の型
type ActionType = typeof actionTypes
type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

// トーストを一定時間後に削除するためのタイマー管理
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

// トースト削除キューに入れる関数
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// reducer 本体
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // トーストを閉じる場合、削除キューに入れる
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// グローバルに状態を持つための仕組み
const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

// dispatch 関数
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// 実際にトーストを追加する関数
type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })

  const dismiss = () =>
    dispatch({
      type: "DISMISS_TOAST",
      toastId: id,
    })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * コンポーネントで使いやすいようにするカスタムフック
 * - 現在のトースト一覧や、追加・削除の関数を返す
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    ...state,
    // 新しいトーストを出す関数
    toast,
    // 特定のトーストを閉じる関数
    dismiss: (toastId?: string) =>
      dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
export type { Toast } 
