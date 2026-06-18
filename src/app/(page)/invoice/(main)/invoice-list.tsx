'use client'
import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SearchIcon from '@mui/icons-material/Search'
import SortIcon from '@mui/icons-material/Sort' // ソートアイコン
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward' // 昇順用
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward' // 降順用
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import VtecxApp from '@/typings'

import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import { Chip } from '@mui/material'
import useInvoice from './fetcher'
import { InvoiceCopyDialog } from './invoice-copy-dialog'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
  formatDate,
  getParam,
  getParamStr
} from '@/utils/datautil'
import { handleErrorProps } from '@/utils/browserutil'
import useLoader from '@/hooks/useLoader'
import { AdminPagination } from '@/components/admin_pagination'


// 1. 期限チェック用の関数を追加
const getDueDateStatus = (dueDate: string | number | undefined) => {
  if (!dueDate) return 'normal'

  const s = String(dueDate)
  if (s.length !== 8) return 'normal'

  // yyyymmdd を Date オブジェクトに変換
  const year = parseInt(s.substring(0, 4))
  const month = parseInt(s.substring(4, 6)) - 1 // JSの月は0-11
  const day = parseInt(s.substring(6, 8))
  const due = new Date(year, month, day)

  const today = new Date()
  today.setHours(0, 0, 0, 0) // 比較のために時間をリセット

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired' // 期限切れ
  if (diffDays <= 7) return 'urgent' // 7日以内
  return 'normal'
}

// エントリのlinkから所有者UIDを取得するヘルパー
const getOwnerUid = (entry: VtecxApp.Entry): string | undefined => {
  return entry.link?.find((l) => l.___rel === 'self')?.___href?.split('/')[2]
}

const Main = ({}: any) => {
  const router = useRouter()
  const params = useParams()
  const uid = params?.uid as string
  const [entries, setEntries] = useState<VtecxApp.Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const searchParams = useSearchParams()
  const search_option = searchParams.get('search')?.replace(/ /g, '+')

  const { activeCompany } = useActiveCompany()
  const { canWrite } = usePermission()
  const { getInvoiceListCount, getInvoicePageList, copyInvoice, existsInvoice } = useInvoice({ companyId: activeCompany?.company_id })
  const [copyDialogEntry, setCopyDialogEntry] = useState<VtecxApp.Entry | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  // --- 検索・ソートの状態 ---
  const [customerName, setCustomerName] = useState('')
  const [showDraft, setShowDraft] = useState(true)
  const [showComplete, setShowComplete] = useState(true)
  const [sortKey, setSortKey] = useState('issue_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // 昇順・降順の状態
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [max_number, setMaxNumber] = useState(25)

  // ソート順を反転させる関数
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const getList = useCallback(async (option: string) => {
    setLoading(true)
    setError(undefined)

    // 件数取得
    getInvoiceListCount(option).then((res: VtecxApp.Request | handleErrorProps | undefined) => {
      if (res) {
        if ('feed' in res) {
          const data = res.feed.title && parseInt(res.feed.title)
          if (data) {
            setCount(data)
          } else {
            setCount(0)
          }
        } else if ('error' in res) {
          setCount(0)
        }
      }
    })
    // 一覧取得
    const res: VtecxApp.Entry[] | handleErrorProps | undefined = await getInvoicePageList(option)
    if (res) {
      if (res instanceof Array) {
        setEntries(res)
      } else if (res.error) {
        // 204（データなし）は正常な空状態として扱う
        if (res.error.message === '対象のデータが存在しません。') {
          setEntries([])
        } else {
          setEntries([])
          setError(res.error)
        }
      }
    } else {
      setEntries([])
    }
    setLoading(false)
  }, [getInvoiceListCount, getInvoicePageList])

  const setSearch = React.useCallback(
    async (move_page?: number) => {
      const targetPage = move_page || 1
      const input_param: any = {}
      if (customerName) input_param['invoice.customer_name'] = customerName
      // 片方だけチェックの場合のみ status フィルタを付与
      if (showDraft && !showComplete) input_param['invoice.status'] = 'draft'
      if (!showDraft && showComplete) input_param['invoice.status'] = 'complete'
      input_param.s = `invoice.${sortKey}-${sortOrder}`
      const param = getParamStr(input_param)
      const option = `n=${targetPage}&l=${max_number}${param ? '&' + param : ''}`
      const str = compressToEncodedURIComponent(option)
      if (search_option !== str) {
        setPage(targetPage)
        getList(option)
        const array: string[] = []
        if (str) array.push('search=' + str)
        router.replace(`/${uid}/invoice?${array.join('&')}`, { scroll: false })
      }
    },
    [customerName, showDraft, showComplete, sortKey, sortOrder, max_number]
  )

  useEffect(() => {
    if (search_option) {
      // URLから検索条件を補完する
      const option = decompressFromEncodedURIComponent(search_option)
      getList(option)

      // URLから検索条件の初期値をセットする
      const param = getParam(option)
      setPage(parseInt(param.n) || 1)
      setMaxNumber(parseInt(param.l) || 25)
      setCustomerName(param['invoice.customer_name'] || '')
      const statusParam = param['invoice.status']
      if (statusParam === 'draft') {
        setShowDraft(true)
        setShowComplete(false)
      } else if (statusParam === 'complete') {
        setShowDraft(false)
        setShowComplete(true)
      } else {
        setShowDraft(true)
        setShowComplete(true)
      }
      if (param.s) {
        const lastDash = param.s.lastIndexOf('-')
        const rawSortKey = param.s.substring(0, lastDash).replace(/^invoice\./, '')
        setSortKey(rawSortKey || 'issue_date')
        setSortOrder((param.s.substring(lastDash + 1) as 'asc' | 'desc') || 'desc')
      }
    } else {
      getList(`n=1&l=25`)
    }
  }, [activeCompany?.company_id, getList])

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          請求書一覧
        </Typography>
        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push(`/${uid}/invoice/add`)}
            disabled={!activeCompany}
          >
            新規作成
          </Button>
        )}
      </Box>

      {!activeCompany && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          グループに所属していないため、請求書を作成できません。グループに参加してください。
        </Alert>
      )}

      {/* 検索・ソートフォーム */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="請求先名"
          size="small"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSearch(1)
          }}
          sx={{ bgcolor: 'white', width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />

        <FormGroup
          row
          sx={{ border: '1px solid #e0e0e0', borderRadius: 1, px: 1, bgcolor: 'white' }}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={showDraft}
                onChange={(e) => setShowDraft(e.target.checked)}
              />
            }
            label="未完了"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={showComplete}
                onChange={(e) => setShowComplete(e.target.checked)}
              />
            }
            label="完了"
          />
        </FormGroup>

        <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'white' }}>
          <InputLabel>並び替え項目</InputLabel>
          <Select value={sortKey} label="並び替え項目" onChange={(e) => setSortKey(e.target.value)}>
            <MenuItem value="issue_date">発行日</MenuItem>
            <MenuItem value="due_date">振込期日</MenuItem>
          </Select>
        </FormControl>

        {/* 昇順・降順切り替えボタン */}
        <Tooltip
          title={sortOrder === 'asc' ? '昇順 (古い順/小さい順)' : '降順 (新しい順/大きい順)'}
        >
          <IconButton
            onClick={toggleSortOrder}
            color="primary"
            sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: '7px' }}
          >
            {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>

        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={() => setSearch(1)}
          sx={{ height: '40px' }}
        >
          検索
        </Button>

        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={() => {
            setCustomerName('')
            setShowDraft(true)
            setShowComplete(true)
            setSortKey('issue_date')
            setSortOrder('desc')
            setPage(1)
            const defaultOption = `n=1&l=${max_number}&s=invoice.issue_date-desc`
            getList(defaultOption)
            const str = compressToEncodedURIComponent(defaultOption)
            router.replace(`/${uid}/invoice?search=${str}`, { scroll: false })
          }}
          color="inherit"
          sx={{ height: '40px' }}
          disabled={
            !customerName &&
            showDraft &&
            showComplete &&
            sortKey === 'issue_date' &&
            sortOrder === 'desc'
          }
        >
          リセット
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>ステータス</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>発行日</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>請求先名</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>件名</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>振込期日</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: '130px' }}>
                  金額
                </TableCell>
                <TableCell sx={{ width: '100px' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'error.main' }}>
                    {error.message}
                  </TableCell>
                </TableRow>
              ) : entries.filter((entry) => !!entry.invoice?.invoice_code).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, border: 0 }}>
                    <Typography color="text.secondary">請求書がありません</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {!error && entries.filter((entry) => !!entry.invoice?.invoice_code).map((entry) => {
                const status = getDueDateStatus(entry.invoice?.due_date)
                const isComplete = entry.invoice?.status === 'complete'
                return (
                  <TableRow
                    key={entry.invoice?.invoice_code}
                    hover
                    onClick={() => {
                      const ownerUid = getOwnerUid(entry)
                      const query = ownerUid && ownerUid !== uid ? `?owner=${ownerUid}` : ''
                      router.push(`/${uid}/invoice/${entry.invoice?.invoice_code}${query}`)
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ verticalAlign: 'middle' }}>
                      <Chip
                        label={entry.invoice?.status === 'draft' ? '未完了' : '完了'}
                        size="small"
                        variant="outlined"
                        color={entry.invoice?.status === 'draft' ? 'default' : 'primary'}
                      />
                    </TableCell>

                    <TableCell>{formatDate(entry.invoice?.issue_date)}</TableCell>

                    <TableCell
                      sx={{
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {entry.invoice?.customer_name}
                    </TableCell>

                    <TableCell
                      sx={{
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {entry.invoice?.subject}
                        {entry.invoice?.remarks && (
                          <Tooltip title={entry.invoice.remarks}>
                            <Box
                              component="span"
                              sx={{ fontSize: '14px', color: 'action.active', cursor: 'help' }}
                            >
                              💬
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: status !== 'normal' && !isComplete ? 'bold' : 'normal',
                        color: isComplete
                          ? 'inherit'
                          : status === 'expired'
                            ? 'error.main'
                            : status === 'urgent'
                              ? 'warning.main'
                              : 'inherit'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {formatDate(entry.invoice?.due_date)}
                        {status === 'expired' && !isComplete && (
                          <span style={{ fontSize: '12px' }}>⚠️</span>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      ¥{entry.invoice?.total_amount?.toLocaleString() ?? 0}
                    </TableCell>
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p: 0.5 }}
                    >
                      {canWrite && (
                        <Tooltip title="複写して新規作成">
                          <IconButton size="small" onClick={() => setCopyDialogEntry(entry)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
        onChange={(move_page: number) => {
          setSearch(move_page)
        }}
      />

      {copyDialogEntry && (
        <InvoiceCopyDialog
          open={true}
          sourceInvoiceCode={copyDialogEntry.invoice?.invoice_code ?? ''}
          customerName={copyDialogEntry.invoice?.customer_name ?? ''}
          checkExists={existsInvoice}
          onClose={() => setCopyDialogEntry(null)}
          onCopy={async (newInvoiceCode, newDueDate) => {
            const ownerUid = getOwnerUid(copyDialogEntry)
            const res = await copyInvoice(copyDialogEntry.invoice?.invoice_code ?? '', newInvoiceCode, newDueDate, ownerUid !== uid ? ownerUid : undefined)
            if (res && 'error' in res) {
              setSnackbar({ open: true, message: res.error?.message ?? '複写に失敗しました', severity: 'error' })
            } else {
              setCopyDialogEntry(null)
              setSnackbar({ open: true, message: '請求書を複写しました', severity: 'success' })
              setSearch(1)
            }
          }}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Main
