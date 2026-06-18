'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ja } from 'date-fns/locale'
import { addMonths, format } from 'date-fns'
import { toRomaji } from 'wanakana'

const hasKanji = (str: string) => /[\u4E00-\u9FFF]/.test(str)

// kuroshiro のシングルトン（一度だけ初期化）
let kuroshiroInstance: any = null
let kuroshiroReady = false

const getKuroshiro = async (): Promise<any> => {
  if (kuroshiroReady) return kuroshiroInstance
  const Kuroshiro = (await import('kuroshiro')).default
  const KuromojiAnalyzer = (await import('kuroshiro-analyzer-kuromoji')).default
  kuroshiroInstance = new Kuroshiro()
  await kuroshiroInstance.init(new KuromojiAnalyzer())
  kuroshiroReady = true
  return kuroshiroInstance
}

/**
 * customer_name からプレフィックス2文字を非同期で生成する
 * - 漢字交じり → kuroshiro でローマ字変換
 * - かな・カタカナのみ → wanakana でローマ字変換
 * - 先頭ASCII英字があればそのまま使用
 * 将来: customer_code の先頭2文字に差し替え予定
 */
export const generatePrefix = async (customerName: string): Promise<string> => {
  if (!customerName) return 'XX'

  // 法人格を除去
  const cleaned = customerName
    .replace(/株式会社|有限会社|合同会社|合資会社|一般社団法人|公益社団法人/g, '')
    .trim()

  if (!cleaned) return 'XX'

  // 先頭にASCII英字があればそのまま使用
  const asciiMatch = cleaned.match(/^[A-Za-z]+/)
  if (asciiMatch) {
    return asciiMatch[0].slice(0, 2).toUpperCase()
  }

  let romaji = ''
  if (hasKanji(cleaned)) {
    // 漢字交じり → kuroshiro
    try {
      const kuroshiro = await getKuroshiro()
      romaji = await kuroshiro.convert(cleaned, { to: 'romaji', mode: 'spaced' })
    } catch {
      romaji = ''
    }
  } else {
    // かな・カタカナのみ → wanakana
    romaji = toRomaji(cleaned)
  }

  const letters = romaji.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase()
  if (letters.length === 1) return (letters + 'X').toUpperCase()
  return 'XX'
}

type Props = {
  open: boolean
  sourceInvoiceCode: string
  customerName: string
  onClose: () => void
  onCopy: (newInvoiceCode: string, newDueDate: Date) => Promise<void>
  checkExists: (invoiceCode: string) => Promise<boolean>
}

export function InvoiceCopyDialog({
  open,
  sourceInvoiceCode,
  customerName,
  onClose,
  onCopy,
  checkExists
}: Props) {
  const [dueDate, setDueDate] = useState<Date | null>(addMonths(new Date(), 1))
  const [previewCode, setPreviewCode] = useState('')
  const [resolving, setResolving] = useState(false)
  const [copying, setCopying] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!open || !dueDate) {
      setPreviewCode('')
      return
    }

    cancelRef.current = false
    const resolve = async () => {
      setResolving(true)
      const prefix = await generatePrefix(customerName)
      const yyyymm = format(dueDate, 'yyyyMM')
      const base = `${prefix}${yyyymm}`

      // 重複チェック: base → base-1 → base-2 ...
      let candidate = base
      let seq = 1
      while (await checkExists(candidate)) {
        candidate = `${base}-${seq}`
        seq++
      }

      if (!cancelRef.current) {
        setPreviewCode(candidate)
        setResolving(false)
      }
    }
    resolve()
    return () => { cancelRef.current = true }
  }, [open, dueDate, customerName])

  const handleCopy = async () => {
    if (!dueDate || !previewCode) return
    setCopying(true)
    await onCopy(previewCode, dueDate)
    setCopying(false)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>請求書を複写</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {sourceInvoiceCode} を元に新しい請求書を作成します。
          </Typography>
          <DatePicker
            label="振込月"
            value={dueDate}
            onChange={(v) => setDueDate(v)}
            views={['year', 'month']}
            format="yyyy年MM月"
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <Box sx={{ mt: 2, minHeight: 40 }}>
            <Typography variant="caption" color="text.secondary">
              新しい請求書No：
            </Typography>
            {resolving ? (
              <CircularProgress size={14} sx={{ ml: 1 }} />
            ) : (
              <Typography variant="body2" fontWeight="bold">
                {previewCode}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={copying}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleCopy}
            disabled={!dueDate || !previewCode || resolving || copying}
          >
            {copying ? '作成中...' : '複写して作成'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}
