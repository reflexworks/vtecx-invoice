'use client'

import { useEffect, useState, useCallback } from 'react'
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
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  CircularProgress,
  Autocomplete,
  Tooltip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useRouter } from 'next/navigation'
import * as browserutil from '@/utils/browserutil'
import { getBankList, getBranchList } from '@/utils/bank-util'
import VtecxApp from '@/typings'

type BankMasterEntry = {
  bank_code: string
  bank_label: string
  is_default: boolean
  bank_title: string
  branch_code: string
  branch_name: string
  bank_type: string
  bank_number: string
  bank_name: string
}

const EMPTY_FORM: BankMasterEntry = {
  bank_code: '',
  bank_label: '',
  is_default: false,
  bank_title: '',
  branch_code: '',
  branch_name: '',
  bank_type: '1',
  bank_number: '',
  bank_name: ''
}

export default function BankList() {
  const router = useRouter()
  const [list, setList] = useState<BankMasterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [form, setForm] = useState<BankMasterEntry>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BankMasterEntry | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [formErrors, setFormErrors] = useState<{ bank_label?: string; bank_title?: string; bank_number?: string; bank_name?: string }>({})

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await browserutil.requestApi('GET', 'bank', '')
      const entries: VtecxApp.Entry[] = Array.isArray(data) ? data : (data?.feed?.entry ?? [])
      const mapped = entries.map((e: any) => ({ ...EMPTY_FORM, ...e.bank }))
      const isDefault = (v: any) => v === true || v === 'true'
      mapped.sort((a, b) => (isDefault(b.is_default) ? 1 : 0) - (isDefault(a.is_default) ? 1 : 0))
      setList(mapped)
    } catch {
      setSnackbar({ open: true, message: '一覧の取得に失敗しました', severity: 'error' })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, is_default: list.length === 0 })
    setFormErrors({})
    setDialogMode('add')
    setDialogOpen(true)
  }

  const openEdit = (row: BankMasterEntry) => {
    setForm({ ...row })
    setFormErrors({})
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const validate = (): boolean => {
    const e: typeof formErrors = {}
    if (!form.bank_label.trim()) e.bank_label = 'ラベルを入力してください'
    if (!form.bank_title.trim()) e.bank_title = '銀行名を入力してください'
    if (!form.bank_number.trim()) e.bank_number = '口座番号を入力してください'
    if (!form.bank_name.trim()) e.bank_name = '口座名義を入力してください'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const body = [{ bank: form }]
      if (dialogMode === 'add') {
        await browserutil.requestApi('POST', 'bank', '', JSON.stringify(body))
        setSnackbar({ open: true, message: '振込先を登録しました', severity: 'success' })
      } else {
        await browserutil.requestApi('PUT', 'bank', '', JSON.stringify(body))
        setSnackbar({ open: true, message: '振込先を更新しました', severity: 'success' })
      }
      setDialogOpen(false)
      fetchList()
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message ?? '保存に失敗しました', severity: 'error' })
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await browserutil.requestApi('DELETE', 'bank', `bank_code=${deleteTarget.bank_code}`)
      setSnackbar({ open: true, message: '振込先を削除しました', severity: 'success' })
      setDeleteTarget(null)
      fetchList()
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message ?? '削除に失敗しました', severity: 'error' })
    }
    setDeleting(false)
  }

  const selectedBank = getBankList().find((b) => b.name === form.bank_title) ?? null

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => router.back()}>
          戻る
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          口座情報を追加
        </Button>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 }, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>口座マスタ</Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : list.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>振込先が登録されていません</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ラベル</TableCell>
                <TableCell>銀行名</TableCell>
                <TableCell>支店名</TableCell>
                <TableCell>口座種別</TableCell>
                <TableCell>口座番号</TableCell>
                <TableCell>口座名義</TableCell>
                <TableCell align="center">デフォルト</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((row) => (
                <TableRow
                  key={row.bank_code}
                  hover
                  onClick={() => openEdit(row)}
                  sx={{ cursor: 'pointer', bgcolor: row.is_default ? '#e3f2fd' : undefined }}
                >
                  <TableCell>{row.bank_label}</TableCell>
                  <TableCell>{row.bank_title}</TableCell>
                  <TableCell>{row.branch_name}</TableCell>
                  <TableCell>{row.bank_type === '2' ? '当座' : '普通'}</TableCell>
                  <TableCell>{row.bank_number}</TableCell>
                  <TableCell>{row.bank_name}</TableCell>
                  <TableCell align="center">
                    {row.is_default && <Chip label="デフォルト" color="primary" size="small" />}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="削除">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'add' ? '口座情報を追加' : '口座情報を編集'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="ラベル（識別名）"
            fullWidth
            value={form.bank_label}
            onChange={(e) => setForm(p => ({ ...p, bank_label: e.target.value }))}
            error={!!formErrors.bank_label}
            helperText={formErrors.bank_label}
            placeholder="例：メイン口座、請求用口座"
          />

          <Autocomplete
            options={getBankList()}
            getOptionLabel={(o) => `${o.name} (${o.code})`}
            value={selectedBank}
            onChange={(_, newVal) => {
              setForm(p => ({
                ...p,
                bank_title: newVal?.name ?? '',
                bank_code_num: newVal?.code ?? '',
                branch_name: '',
                branch_code: ''
              } as any))
            }}
            renderInput={(params) => (
              <TextField {...params} label="銀行名" error={!!formErrors.bank_title} helperText={formErrors.bank_title} />
            )}
          />

          <Autocomplete
            options={selectedBank ? getBranchList(selectedBank.code) : []}
            getOptionLabel={(o) => `${o.name} (${o.code})`}
            value={selectedBank ? (getBranchList(selectedBank.code).find(b => b.name === form.branch_name) ?? null) : null}
            disabled={!selectedBank}
            onChange={(_, newVal) => {
              setForm(p => ({ ...p, branch_name: newVal?.name ?? '', branch_code: newVal?.code ?? '' }))
            }}
            renderInput={(params) => (
              <TextField {...params} label="支店名" placeholder={!selectedBank ? '銀行を選択してください' : ''} />
            )}
          />

          <FormControl fullWidth>
            <InputLabel>口座種別</InputLabel>
            <Select
              label="口座種別"
              value={form.bank_type}
              onChange={(e) => setForm(p => ({ ...p, bank_type: e.target.value }))}
            >
              <MenuItem value="1">普通</MenuItem>
              <MenuItem value="2">当座</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="口座番号"
            fullWidth
            value={form.bank_number}
            onChange={(e) => setForm(p => ({ ...p, bank_number: e.target.value }))}
            error={!!formErrors.bank_number}
            helperText={formErrors.bank_number}
            slotProps={{ htmlInput: { maxLength: 7, pattern: '[0-9]*', inputMode: 'numeric' } }}
          />

          <TextField
            label="口座名義"
            fullWidth
            value={form.bank_name}
            onChange={(e) => setForm(p => ({ ...p, bank_name: e.target.value }))}
            error={!!formErrors.bank_name}
            helperText={formErrors.bank_name}
            placeholder="カ）バーチャルテクノロジー"
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.is_default}
                onChange={(e) => setForm(p => ({ ...p, is_default: e.target.checked }))}
              />
            }
            label="デフォルトに設定する"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>振込先の削除</DialogTitle>
        <DialogContent>
          <Typography>
            「<strong>{deleteTarget?.bank_label}</strong>」を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
