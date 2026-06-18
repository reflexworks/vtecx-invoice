'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import DescriptionIcon from '@mui/icons-material/Description'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { useParams, useRouter } from 'next/navigation'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import useCustomer from './fetcher'

type CustomerEmail = { email: string; label: string }

export default function CustomerDetail() {
  const params = useParams()
  const router = useRouter()
  const customer_code = params?.customer_code as string
  const uid = params?.uid as string

  const { activeCompany } = useActiveCompany()
  const { canWrite } = usePermission()
  const { getCustomerList, putCustomer, deleteCustomer } = useCustomer({ companyId: activeCompany?.company_id })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [emails, setEmails] = useState<CustomerEmail[]>([])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  // メール編集ダイアログ
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailDialogMode, setEmailDialogMode] = useState<'add' | 'edit'>('add')
  const [emailDialogIndex, setEmailDialogIndex] = useState<number>(-1)
  const [emailForm, setEmailForm] = useState<CustomerEmail>({ email: '', label: '' })
  const [emailFormError, setEmailFormError] = useState<string | null>(null)

  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchCustomer = useCallback(async () => {
    setLoading(true)
    const res = await getCustomerList()
    const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ? (Array.isArray(res.feed.entry) ? res.feed.entry : [res.feed.entry]) : [])
    const entry = entries.find((e: any) => e.customer?.customer_code === customer_code)
    if (entry) {
      setCustomerName(entry.customer?.customer_name ?? '')
      setEmails(Array.isArray(entry.customer_email) ? entry.customer_email : [])
    }
    setLoading(false)
  }, [customer_code, activeCompany?.company_id])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const handleSaveName = async () => {
    if (!customerName.trim()) return
    setSaving(true)
    const res = await putCustomer({ customer_code, customer_name: customerName, customer_email: emails })
    setSaving(false)
    if (res && 'error' in res) {
      setSnackbar({ open: true, message: (res as any).error?.message ?? '保存に失敗しました', severity: 'error' })
    } else {
      setSnackbar({ open: true, message: '顧客名を更新しました', severity: 'success' })
    }
  }

  const openAddEmail = () => {
    setEmailForm({ email: '', label: '' })
    setEmailFormError(null)
    setEmailDialogMode('add')
    setEmailDialogIndex(-1)
    setEmailDialogOpen(true)
  }

  const openEditEmail = (index: number) => {
    setEmailForm({ ...emails[index] })
    setEmailFormError(null)
    setEmailDialogMode('edit')
    setEmailDialogIndex(index)
    setEmailDialogOpen(true)
  }

  const handleSaveEmail = async () => {
    if (!emailForm.email.trim()) {
      setEmailFormError('メールアドレスは必須です。')
      return
    }
    const isDuplicate = emails.some((e, i) => e.email === emailForm.email.trim() && i !== emailDialogIndex)
    if (isDuplicate) {
      setEmailFormError('同じメールアドレスが既に登録されています。')
      return
    }

    let updatedEmails: CustomerEmail[]
    if (emailDialogMode === 'add') {
      updatedEmails = [...emails, { email: emailForm.email.trim(), label: emailForm.label.trim() }]
    } else {
      updatedEmails = emails.map((e, i) =>
        i === emailDialogIndex ? { email: emailForm.email.trim(), label: emailForm.label.trim() } : e
      )
    }

    setSaving(true)
    const res = await putCustomer({ customer_code, customer_name: customerName, customer_email: updatedEmails })
    setSaving(false)
    if (res && 'error' in res) {
      setEmailFormError((res as any).error?.message ?? '保存に失敗しました')
      return
    }
    setEmails(updatedEmails)
    setEmailDialogOpen(false)
    setSnackbar({ open: true, message: emailDialogMode === 'add' ? 'メールアドレスを追加しました' : 'メールアドレスを更新しました', severity: 'success' })
  }

  const handleDeleteEmail = async (index: number) => {
    const updatedEmails = emails.filter((_, i) => i !== index)
    setSaving(true)
    const res = await putCustomer({ customer_code, customer_name: customerName, customer_email: updatedEmails })
    setSaving(false)
    if (res && 'error' in res) {
      setSnackbar({ open: true, message: (res as any).error?.message ?? '削除に失敗しました', severity: 'error' })
      return
    }
    setEmails(updatedEmails)
    setSnackbar({ open: true, message: 'メールアドレスを削除しました', severity: 'success' })
  }

  const handleDeleteCustomer = async () => {
    setDeleting(true)
    const res = await deleteCustomer(customer_code)
    setDeleting(false)
    if (res && 'error' in res) {
      setSnackbar({ open: true, message: (res as any).error?.message ?? '削除に失敗しました', severity: 'error' })
      setDeleteDialogOpen(false)
      return
    }
    router.push(`/${uid}/customer`)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => router.push(`/${uid}/customer`)}>
          一覧に戻る
        </Button>
        {canWrite && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            顧客を削除
          </Button>
        )}
      </Box>

      {/* 新規作成ボタン */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          この顧客で新規作成
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DescriptionIcon />}
            onClick={() => router.push(`/${uid}/quotation/add?customer_name=${encodeURIComponent(customerName)}`)}
          >
            見積書を作成
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<RequestQuoteIcon />}
            onClick={() => router.push(`/${uid}/invoice/add?customer_name=${encodeURIComponent(customerName)}`)}
          >
            請求書を作成
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ShoppingCartIcon />}
            onClick={() => router.push(`/${uid}/purchase_order/add?customer_name=${encodeURIComponent(customerName)}`)}
          >
            注文書を作成
          </Button>
        </Box>
      </Paper>

      {/* 顧客情報 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>顧客情報</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>顧客コード</Typography>
          <Typography variant="body1">{customer_code}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>顧客名</Typography>
          {canWrite ? (
            <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
              <TextField
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                disabled={saving}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveName}
                disabled={saving || !customerName.trim()}
              >
                保存
              </Button>
            </Box>
          ) : (
            <Typography variant="body1">{customerName}</Typography>
          )}
        </Box>
      </Paper>

      {/* メールアドレス */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>メールアドレス</Typography>
          {canWrite && (
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openAddEmail}>
              追加
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {emails.length === 0 ? (
          <Typography color="text.secondary" variant="body2">メールアドレスが登録されていません</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>メールアドレス</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>ラベル</TableCell>
                  {canWrite && <TableCell sx={{ width: 80 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {emails.map((e, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{e.email}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{e.label || '-'}</TableCell>
                    {canWrite && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="編集">
                          <IconButton size="small" onClick={() => openEditEmail(i)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="削除">
                          <IconButton size="small" color="error" onClick={() => handleDeleteEmail(i)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* メールアドレス追加・編集ダイアログ */}
      <Dialog open={emailDialogOpen} onClose={() => !saving && setEmailDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{emailDialogMode === 'add' ? 'メールアドレスを追加' : 'メールアドレスを編集'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="メールアドレス"
              required
              value={emailForm.email}
              onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              size="small"
              type="email"
              placeholder="example@example.com"
              disabled={saving}
              autoFocus
            />
            <TextField
              label="ラベル（任意）"
              value={emailForm.label}
              onChange={(e) => setEmailForm((f) => ({ ...f, label: e.target.value }))}
              fullWidth
              size="small"
              placeholder="担当者A"
              disabled={saving}
            />
            {emailFormError && (
              <Typography variant="body2" color="error">{emailFormError}</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)} disabled={saving}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSaveEmail}
            disabled={saving || !emailForm.email.trim()}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? '保存中...' : '保存する'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 顧客削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>顧客を削除</DialogTitle>
        <DialogContent>
          <Typography><strong>{customerName}</strong> を削除しますか？</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>この操作は元に戻せません。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCustomer}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
