'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import { useRouter, useParams } from 'next/navigation'
import useCustomer from './fetcher'
import VtecxApp from '@/typings'

type CustomerEmail = { email: string; label: string }

type CustomerForm = {
  customer_code: string
  customer_name: string
  customer_email: CustomerEmail[]
}

const emptyForm: CustomerForm = { customer_code: '', customer_name: '', customer_email: [] }

export default function CustomerList() {
  const { activeCompany } = useActiveCompany()
  const { canWrite } = usePermission()
  const router = useRouter()
  const params = useParams()
  const uid = params?.uid as string
  const { getCustomerList, postCustomer, deleteCustomer } = useCustomer({ companyId: activeCompany?.company_id })

  const [entries, setEntries] = useState<VtecxApp.Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  // 追加・編集ダイアログ
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<CustomerForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 削除ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<CustomerForm | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    const res = await getCustomerList()
    if (res && Array.isArray(res)) {
      setEntries(res)
    } else if (res && 'feed' in (res as any)) {
      const feed = (res as any).feed
      setEntries(feed?.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : [])
    } else {
      setEntries([])
    }
    setLoading(false)
  }, [activeCompany?.company_id])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openAdd = () => {
    setEditForm(emptyForm)
    setFormError(null)
    setEditDialogOpen(true)
  }

  const addEmailRow = () => {
    setEditForm((f) => ({ ...f, customer_email: [...f.customer_email, { email: '', label: '' }] }))
  }

  const removeEmailRow = (index: number) => {
    setEditForm((f) => ({ ...f, customer_email: f.customer_email.filter((_, i) => i !== index) }))
  }

  const updateEmailRow = (index: number, field: 'email' | 'label', value: string) => {
    setEditForm((f) => ({
      ...f,
      customer_email: f.customer_email.map((e, i) => i === index ? { ...e, [field]: value } : e)
    }))
  }

  const handleSave = async () => {
    if (!editForm.customer_name.trim()) {
      setFormError('顧客名は必須です。')
      return
    }
    const validEmails = editForm.customer_email.filter((e) => e.email.trim())
    const emailSet = new Set(validEmails.map((e) => e.email.trim()))
    if (emailSet.size !== validEmails.length) {
      setFormError('同じメールアドレスが重複しています。')
      return
    }
    setSaving(true)
    setFormError(null)
    const res = await postCustomer({
      customer_name: editForm.customer_name,
      customer_email: validEmails.map((e) => ({ email: e.email.trim(), label: e.label.trim() }))
    })
    setSaving(false)
    if (res && 'error' in res) {
      setFormError((res as any).error?.message ?? '保存に失敗しました')
      return
    }
    setEditDialogOpen(false)
    setSnackbar({ open: true, message: '登録しました', severity: 'success' })
    fetchList()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteCustomer(deleteTarget.customer_code)
    setDeleting(false)
    if (res && 'error' in res) {
      setSnackbar({ open: true, message: (res as any).error?.message ?? '削除に失敗しました', severity: 'error' })
    } else {
      setSnackbar({ open: true, message: '削除しました', severity: 'success' })
      fetchList()
    }
    setDeleteTarget(null)
  }

  const customers = entries.filter((e) => !!(e as any).customer?.customer_code)

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>顧客マスタ</Typography>
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disabled={!activeCompany}>
            新規登録
          </Button>
        )}
      </Box>

      {!activeCompany && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          グループに所属していないため、顧客を登録できません。グループに参加してください。
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>顧客コード</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>顧客名</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>メールアドレス</TableCell>
                {canWrite && <TableCell sx={{ width: '60px' }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, border: 0 }}>
                    <Typography color="text.secondary">顧客が登録されていません</Typography>
                  </TableCell>
                </TableRow>
              ) : customers.map((entry) => {
                const c = (entry as any).customer
                const emails: CustomerEmail[] = Array.isArray((entry as any).customer_email)
                  ? (entry as any).customer_email
                  : []
                return (
                  <TableRow
                    key={c.customer_code}
                    hover
                    onClick={() => router.push(`/${uid}/customer/${c.customer_code}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{c.customer_code}</TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.customer_name}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {emails.length > 0
                          ? emails.map((e, i) => (
                              <Chip
                                key={i}
                                label={e.label ? `${e.label}：${e.email}` : e.email}
                                size="small"
                                variant="outlined"
                              />
                            ))
                          : <Typography variant="body2" color="text.secondary">-</Typography>
                        }
                      </Box>
                    </TableCell>
                    {canWrite && (
                      <TableCell align="right">
                        <Tooltip title="削除">
                          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ ...c, customer_email: emails }) }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 追加・編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => !saving && setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>顧客を新規登録</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="顧客名"
              required
              value={editForm.customer_name}
              onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
              fullWidth
              size="small"
              disabled={saving}
              autoFocus
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">メールアドレス</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addEmailRow} disabled={saving}>
                  追加
                </Button>
              </Box>
              {editForm.customer_email.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                  メールアドレスを追加できます
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {editForm.customer_email.map((e, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        placeholder="メールアドレス"
                        type="email"
                        value={e.email}
                        onChange={(ev) => updateEmailRow(i, 'email', ev.target.value)}
                        size="small"
                        sx={{ flex: 2 }}
                        disabled={saving}
                      />
                      <TextField
                        placeholder="ラベル（任意）"
                        value={e.label}
                        onChange={(ev) => updateEmailRow(i, 'label', ev.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                        disabled={saving}
                      />
                      <IconButton size="small" color="error" onClick={() => removeEmailRow(i)} disabled={saving}>
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {formError && (
              <Typography variant="body2" color="error">{formError}</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !editForm.customer_name.trim()}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? '保存中...' : '保存する'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>顧客を削除</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.customer_name}</strong> を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
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
