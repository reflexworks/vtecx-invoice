'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Autocomplete
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import * as browserutil from '@/utils/browserutil'

type CustomerEmail = { email: string; label: string }

type Props = {
  open: boolean
  docCode: string
  docType: 'invoice' | 'quotation' | 'purchase_order'
  customerName?: string
  companyId?: string
  onClose: () => void
  onSend: (toList: string[], options: { cc?: string[]; subject?: string; body?: string }) => Promise<any>
}

function ChipEmailInput({
  label,
  values,
  onAdd,
  onRemove,
  inputValue,
  onInputChange,
  options,
  excludeEmails,
  disabled,
  required,
  helperText,
  error
}: {
  label: string
  values: string[]
  onAdd: (email: string) => void
  onRemove: (index: number) => void
  inputValue: string
  onInputChange: (v: string) => void
  options: CustomerEmail[]
  excludeEmails?: string[]
  disabled: boolean
  required?: boolean
  helperText?: string
  error?: string
}) {
  const optionStrings = options
    .map((o) => o.email)
    .filter((email) => !values.includes(email) && !(excludeEmails ?? []).includes(email))

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{ mb: 0.25, color: error ? 'error.main' : 'text.secondary', fontWeight: 500 }}
      >
        {label}{required && ' *'}
      </Typography>
      {(helperText || error) && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mb: 0.5, display: 'block' }}>
          {error ?? helperText}
        </Typography>
      )}
      <Box
        sx={{
          border: error ? '1px solid #d32f2f' : '1px solid rgba(0,0,0,0.23)',
          borderRadius: 1,
          p: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center',
          '&:focus-within': { borderColor: 'primary.main', borderWidth: '2px' }
        }}
      >
        {values.map((email, i) => (
          <Chip
            key={i}
            label={email}
            size="small"
            onDelete={disabled ? undefined : () => onRemove(i)}
          />
        ))}
        <Autocomplete
          freeSolo
          forcePopupIcon
          options={optionStrings}
          inputValue={inputValue}
          getOptionLabel={(option) => option}
          filterOptions={(opts) => opts}
          renderOption={(props, option) => {
            const found = options.find((o) => o.email === option)
            const display = found?.label ? `${found.label}：${found.email}` : option
            return <li {...props} key={option}>{display}</li>
          }}
          onInputChange={(_, newValue, reason) => {
            if (reason === 'clear') { onInputChange(''); return }
            if (reason === 'input') {
              if (newValue.endsWith(',')) {
                const email = newValue.slice(0, -1).trim()
                if (email) onAdd(email)
                else onInputChange('')
              } else {
                onInputChange(newValue)
              }
            }
          }}
          onChange={(_, newValue) => {
            if (typeof newValue === 'string' && newValue.trim()) {
              onAdd(newValue.trim())
            }
          }}
          disabled={disabled}
          sx={{ flex: 1, minWidth: 180 }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              placeholder=""
              slotProps={{ input: { ...params.InputProps, disableUnderline: true } }}
            />
          )}
        />
      </Box>
    </Box>
  )
}

export default function EmailSendDialog({ open, docCode, docType, customerName, companyId, onClose, onSend }: Props) {
  const [toList, setToList] = useState<string[]>([])
  const [toInput, setToInput] = useState('')
  const [ccList, setCcList] = useState<string[]>([])
  const [ccInput, setCcInput] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingToList, setPendingToList] = useState<string[]>([])
  const [pendingCcList, setPendingCcList] = useState<string[]>([])

  const [customerCode, setCustomerCode] = useState<string | null>(null)
  const [emailOptions, setEmailOptions] = useState<CustomerEmail[]>([])

  const docLabel = docType === 'invoice' ? '請求書' : docType === 'purchase_order' ? '注文書' : '見積書'
  const subjectPlaceholder = docType === 'invoice'
    ? `【請求書】${docCode}`
    : docType === 'purchase_order'
    ? `【注文書】${docCode}`
    : `【見積書】${docCode}`
  const bodyPlaceholder = docType === 'invoice'
    ? 'お世話になっております。\n請求書を送付いたします。\n添付のPDFをご確認ください。'
    : docType === 'purchase_order'
    ? 'お世話になっております。\n注文書を送付いたします。\n添付のPDFをご確認ください。'
    : 'お世話になっております。\n見積書を送付いたします。\n添付のPDFをご確認ください。'

  useEffect(() => {
    if (!open) return
    setToList([])
    setToInput('')
    setCcList([])
    setCcInput('')
    setSubject('')
    setBody('')
    setError(null)
    setCustomerCode(null)
    setEmailOptions([])

    if (!customerName) return

    const fetchCustomer = async () => {
      try {
        const cParam = companyId ? `company_id=${companyId}` : ''
        const params = `customer_name=${encodeURIComponent(customerName)}${cParam ? `&${cParam}` : ''}`
        const res = await browserutil.requestApi('GET', 'customer', params)
        const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ? (Array.isArray(res.feed.entry) ? res.feed.entry : [res.feed.entry]) : [])
        if (entries.length > 0) {
          const entry = entries[0]
          const c = entry.customer
          const emails: CustomerEmail[] = Array.isArray(entry.customer_email) ? entry.customer_email : []
          setEmailOptions(emails)
          setCustomerCode(c?.customer_code ?? null)
          // 登録済みメールが1件のみの場合だけ To に自動入力
          if (emails.length === 1) setToList([emails[0].email])
        }
      } catch {
        // 取得失敗時は空のまま
      }
    }
    fetchCustomer()
  }, [open, customerName, companyId])

  const addTo = (email: string) => {
    if (!email || toList.includes(email)) return
    setToList((prev) => [...prev, email])
    setToInput('')
  }

  const addCc = (email: string) => {
    if (!email || ccList.includes(email)) return
    setCcList((prev) => [...prev, email])
    setCcInput('')
  }

  const handleClose = () => {
    if (sending) return
    setError(null)
    onClose()
  }

  const handleSend = () => {
    const finalToList = toInput.trim() ? [...toList, toInput.trim()] : toList
    const finalCcList = ccInput.trim() ? [...ccList, ccInput.trim()] : ccList

    if (finalToList.length === 0) {
      setError('送信先メールアドレスを入力してください')
      return
    }
    setError(null)
    setPendingToList(finalToList)
    setPendingCcList(finalCcList)
    setConfirmOpen(true)
  }

  const handleConfirmSend = async () => {
    setConfirmOpen(false)
    setSending(true)
    const res = await onSend(pendingToList, {
      cc: pendingCcList.length > 0 ? pendingCcList : undefined,
      subject: subject.trim() || undefined,
      body: body.trim() || undefined
    })
    setSending(false)
    if (res && 'error' in res) {
      setError(res.error?.message ?? 'メール送信に失敗しました')
      return
    }

    // 送信成功後、未登録のメールアドレスを顧客マスタに追加
    if (customerCode && customerName) {
      const existingEmails = emailOptions.map((e) => e.email)
      const allSent = [...pendingToList, ...pendingCcList]
      const toAdd: CustomerEmail[] = allSent
        .filter((email) => !existingEmails.includes(email))
        .map((email) => ({ email, label: '' }))

      if (toAdd.length > 0) {
        try {
          const cParam = companyId ? `company_id=${companyId}` : ''
          await browserutil.requestApi('PUT', 'customer', cParam, JSON.stringify([{
            customer: {
              customer_code: customerCode,
              customer_name: customerName,
              customer_email: [...emailOptions, ...toAdd]
            }
          }]))
        } catch {
          // 顧客マスタ更新失敗はメール送信成功に影響させない
        }
      }
    }

    onClose()
  }

  const helperText = emailOptions.length > 0
    ? 'Enterを押下または , (カンマ)で追加。▼ で登録済みアドレスを選択できます'
    : 'Enterを押下または , (カンマ)で複数追加できます'

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon fontSize="small" />
        {docLabel}をメール送信
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {docLabel}番号: <strong>{docCode}</strong>
          {customerName && <> &nbsp;|&nbsp; 宛先: <strong>{customerName}</strong></>}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <ChipEmailInput
              label="送信先 (To)"
              values={toList}
              onAdd={addTo}
              onRemove={(i) => setToList((prev) => prev.filter((_, idx) => idx !== i))}
              inputValue={toInput}
              excludeEmails={ccList}
              onInputChange={setToInput}
              options={emailOptions}
              disabled={sending}
              required
              helperText={helperText}
            />
          </Box>
          <Box>
            <ChipEmailInput
              label="CC（省略可）"
              values={ccList}
              onAdd={addCc}
              onRemove={(i) => setCcList((prev) => prev.filter((_, idx) => idx !== i))}
              inputValue={ccInput}
              onInputChange={setCcInput}
              options={emailOptions}
              excludeEmails={toList}
              disabled={sending}
              helperText={helperText}
            />
          </Box>
          <TextField
            label="件名（省略時はデフォルト）"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            size="small"
            placeholder={subjectPlaceholder}
            disabled={sending}
          />
          <TextField
            label="本文（省略時はデフォルト）"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={4}
            placeholder={bodyPlaceholder}
            disabled={sending}
          />
          {error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={sending}>キャンセル</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSend}
          disabled={sending || (toList.length === 0 && !toInput.trim())}
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <EmailIcon />}
        >
          {sending ? '送信中...' : '送信する'}
        </Button>
      </DialogActions>

      {/* 送信確認ダイアログ */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>送信内容の確認</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">送信先 (To)</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {pendingToList.map((email) => (
                  <Chip key={email} label={email} size="small" />
                ))}
              </Box>
            </Box>
            {pendingCcList.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">CC</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {pendingCcList.map((email) => (
                    <Chip key={email} label={email} size="small" />
                  ))}
                </Box>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">件名</Typography>
              <Typography variant="body2">{subject.trim() || subjectPlaceholder}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">本文</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                {body.trim() || bodyPlaceholder}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>戻る</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmSend}
            startIcon={<EmailIcon />}
          >
            送信する
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
