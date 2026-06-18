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
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import usePurchaseOrder from './fetcher'
import VtecxApp from '@/typings'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
  formatDate,
  getParam,
  getParamStr,
} from '@/utils/datautil'
import { handleErrorProps } from '@/utils/browserutil'
import { AdminPagination } from '@/components/admin_pagination'

const statusLabel = (status?: string) => {
  switch (status) {
    case 'draft':    return { label: '下書き',   color: 'default' as const, sx: undefined }
    case 'sent':     return { label: '送付済み', color: 'primary' as const, sx: undefined }
    case 'accepted': return { label: '承認済み', color: 'success' as const, sx: undefined }
    default:         return { label: status ?? '', color: 'default' as const, sx: undefined }
  }
}

const getOwnerUid = (entry: VtecxApp.Entry): string | undefined =>
  entry.link?.find((l) => l.___rel === 'self')?.___href?.split('/')[2]

export default function PurchaseOrderList() {
  const router = useRouter()
  const params = useParams()
  const uid = params?.uid as string
  const searchParams = useSearchParams()
  const search_option = searchParams.get('search')?.replace(/ /g, '+')

  const { activeCompany } = useActiveCompany()
  const { canWrite } = usePermission()
  const { getPurchaseOrderPageList, getPurchaseOrderListCount } = usePurchaseOrder({ companyId: activeCompany?.company_id })

  const [entries, setEntries] = useState<VtecxApp.Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const [customerName, setCustomerName] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('issue_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [max_number, setMaxNumber] = useState(25)

  const getList = useCallback(async (option: string) => {
    setLoading(true)
    setError(null)

    getPurchaseOrderListCount(option).then((res: any) => {
      if (res && 'feed' in res) {
        const n = parseInt(res.feed.title)
        setCount(isNaN(n) ? 0 : n)
      } else {
        setCount(0)
      }
    })

    const res: VtecxApp.Entry[] | handleErrorProps | undefined = await getPurchaseOrderPageList(option)
    if (res) {
      if (res instanceof Array) {
        setEntries(res)
      } else if ((res as handleErrorProps).error) {
        const errRes = res as handleErrorProps
        if (errRes.error.message === '対象のデータが存在しません。') {
          setEntries([])
        } else {
          setEntries([])
          setError(errRes.error)
        }
      }
    } else {
      setEntries([])
    }
    setLoading(false)
  }, [getPurchaseOrderListCount, getPurchaseOrderPageList])

  const setSearch = useCallback(async (move_page?: number) => {
    const targetPage = move_page || 1
    const input_param: any = {}
    if (customerName) input_param['purchase_order.customer_name'] = customerName
    if (statusFilter)  input_param['purchase_order.status'] = statusFilter
    input_param.s = `purchase_order.${sortKey}-${sortOrder}`
    const param = getParamStr(input_param)
    const option = `n=${targetPage}&l=${max_number}${param ? '&' + param : ''}`
    const str = compressToEncodedURIComponent(option)
    setPage(targetPage)
    getList(option)
    const array: string[] = []
    if (str) array.push('search=' + str)
    router.replace(`/${uid}/purchase_order?${array.join('&')}`, { scroll: false })
  }, [customerName, statusFilter, sortKey, sortOrder, max_number])

  useEffect(() => {
    if (search_option) {
      const option = decompressFromEncodedURIComponent(search_option)
      getList(option)
      const p = getParam(option)
      setPage(parseInt(p.n) || 1)
      setMaxNumber(parseInt(p.l) || 25)
      setCustomerName(p['purchase_order.customer_name'] || '')
      setStatusFilter(p['purchase_order.status'] || '')
      if (p.s) {
        const lastDash = p.s.lastIndexOf('-')
        setSortKey(p.s.substring(0, lastDash).replace(/^purchase_order\./, '') || 'issue_date')
        setSortOrder((p.s.substring(lastDash + 1) as 'asc' | 'desc') || 'desc')
      }
    } else {
      getList(`n=1&l=25`)
    }
  }, [activeCompany?.company_id, getList])

  const filtered = entries.filter((e) => !!e.purchase_order?.purchase_order_code)

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>注文書一覧</Typography>
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push(`/${uid}/purchase_order/add`)} disabled={!activeCompany}>
            新規作成
          </Button>
        )}
      </Box>

      {!activeCompany && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          グループに所属していないため、注文書を作成できません。グループに参加してください。
        </Alert>
      )}

      {/* 検索・ソートフォーム */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="宛名"
          size="small"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setSearch(1) }}
          sx={{ bgcolor: 'white', width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            )
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'white' }}>
          <InputLabel>ステータス</InputLabel>
          <Select value={statusFilter} label="ステータス" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">全て</MenuItem>
            <MenuItem value="draft">下書き</MenuItem>
            <MenuItem value="sent">送付済み</MenuItem>
            <MenuItem value="accepted">承認済み</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'white' }}>
          <InputLabel>並び替え項目</InputLabel>
          <Select value={sortKey} label="並び替え項目" onChange={(e) => setSortKey(e.target.value)}>
            <MenuItem value="issue_date">発行日</MenuItem>
            <MenuItem value="delivery_date">納期</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title={sortOrder === 'asc' ? '昇順 (古い順/小さい順)' : '降順 (新しい順/大きい順)'}>
          <IconButton
            onClick={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')}
            color="primary"
            sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: '7px' }}
          >
            {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>

        <Button variant="contained" startIcon={<SearchIcon />} onClick={() => setSearch(1)} sx={{ height: '40px' }}>
          検索
        </Button>

        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          color="inherit"
          sx={{ height: '40px' }}
          disabled={!customerName && !statusFilter && sortKey === 'issue_date' && sortOrder === 'desc'}
          onClick={() => {
            setCustomerName('')
            setStatusFilter('')
            setSortKey('issue_date')
            setSortOrder('desc')
            setPage(1)
            const defaultOption = `n=1&l=${max_number}&s=purchase_order.issue_date-desc`
            getList(defaultOption)
            const str = compressToEncodedURIComponent(defaultOption)
            router.replace(`/${uid}/purchase_order?search=${str}`, { scroll: false })
          }}
        >
          リセット
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>ステータス</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '110px' }}>注文番号</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>宛名</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>件名</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '110px' }}>発行日</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>納期</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: '130px' }}>合計金額</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, border: 0 }}>
                    <Typography color="error">{error.message}</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, border: 0 }}>
                    <Typography color="text.secondary">注文書がありません</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {!error && filtered.map((entry) => {
                const po = entry.purchase_order
                const s = statusLabel(po?.status)
                return (
                  <TableRow
                    key={po?.purchase_order_code}
                    hover
                    onClick={() => {
                      const ownerUid = getOwnerUid(entry)
                      const query = ownerUid && ownerUid !== uid ? `?owner=${ownerUid}` : ''
                      router.push(`/${uid}/purchase_order/edit/${po?.purchase_order_code}${query}`)
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Chip label={s.label} color={s.color} size="small" sx={s.sx} />
                    </TableCell>
                    <TableCell>{po?.purchase_order_code}</TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {po?.customer_name}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {po?.subject}
                    </TableCell>
                    <TableCell>{formatDate(po?.issue_date)}</TableCell>
                    <TableCell>{formatDate(po?.delivery_date)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      ¥{(po?.total_amount ?? 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AdminPagination
        max_number={max_number}
        current_count={count}
        current_page={page}
        onChange={(move_page: number) => { setSearch(move_page) }}
      />

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
