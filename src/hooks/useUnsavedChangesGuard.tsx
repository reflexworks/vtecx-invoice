'use client'
import { useEffect, useCallback, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material'

/**
 * 未保存変更がある場合にナビゲーションをガードするフック
 * @param isDirty - 未保存の変更があるかどうか
 * @param mode - 'add'（登録）または 'edit'（編集）でダイアログ文言を切り替え
 */
export function useUnsavedChangesGuard(isDirty: boolean, mode: 'add' | 'edit' = 'add') {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  // ブラウザのタブ閉じ・リロード・外部ナビゲーション対策
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  /**
   * ナビゲーション前に確認を挟む
   * isDirty でなければそのまま action を実行する
   */
  const confirmNavigation = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action()
      } else {
        setPendingAction(() => action)
      }
    },
    [isDirty]
  )

  const handleConfirm = () => {
    const action = pendingAction
    setPendingAction(null)
    action?.()
  }

  const handleCancel = () => setPendingAction(null)

  const actionLabel = mode === 'add' ? '登録' : '編集'

  const ConfirmDialog = (
    <Dialog open={pendingAction !== null} onClose={handleCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>入力内容が保存されていません</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          入力内容が保存されていません。{actionLabel}を中断してもよろしいですか？
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} variant="outlined">
          キャンセル
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="warning">
          中断する
        </Button>
      </DialogActions>
    </Dialog>
  )

  return { confirmNavigation, ConfirmDialog }
}
