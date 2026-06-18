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
  Checkbox
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import SortIcon from '@mui/icons-material/Sort' // ソートアイコン
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward' // 昇順用
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward' // 降順用
import { useRouter, useSearchParams } from 'next/navigation'
import VtecxApp from '@/typings'

import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import { Chip } from '@mui/material'
//import useUser from './fetcher'
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
  getParam,
  getParamStr
} from '@/utils/datautil'
import { handleErrorProps } from '@/utils/browserutil'
import useLoader from '@/hooks/useLoader'
import { AdminPagination } from '@/components/admin_pagination'
import useUser from './fetcher'


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

const Main = ({}: any) => {
  const router = useRouter()
  const [entries, setEntries] = useState<VtecxApp.Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const searchParams = useSearchParams()
  const search_option = searchParams.get('search')?.replace(/ /g, '+')

  const { getUserListCount, getUserPageList } = useUser({})

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
    //setLoader(true)
    setError(undefined)

    // 件数取得
    getUserListCount(option).then((res: VtecxApp.Request | handleErrorProps | undefined) => {
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
    const res: VtecxApp.Entry[] | handleErrorProps | undefined = await getUserPageList(option)
    if (res) {
      if (res instanceof Array) {
        setEntries(res)
      } else if (res.error) {
        setEntries([])
        setError(res.error)
      }
    } else {
      setEntries([])
    }
    //setLoader(false)
  }, [])

  const setSearch = React.useCallback(
    async (move_page?: number) => {
      const targetPage = move_page || 1
      const input_param: any = {}
      if (customerName) input_param['user.customer_name'] = customerName
      // 片方だけチェックの場合のみ status フィルタを付与
      if (showDraft && !showComplete) input_param['user.status'] = 'draft'
      if (!showDraft && showComplete) input_param['user.status'] = 'complete'
      input_param.s = `user.${sortKey}-${sortOrder}`
      const param = getParamStr(input_param)
      const option = `n=${targetPage}&l=${max_number}${param ? '&' + param : ''}`
      const str = compressToEncodedURIComponent(option)
      if (search_option !== str) {
        setPage(targetPage)
        getList(option)
        const array: string[] = []
        if (str) array.push('search=' + str)
        router.replace(`user?${array.join('&')}`, { scroll: false })
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
      setCustomerName(param['user.customer_name'] || '')
      const statusParam = param['user.status']
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
        const rawSortKey = param.s.substring(0, lastDash).replace(/^user\./, '')
        setSortKey(rawSortKey || 'issue_date')
        setSortOrder((param.s.substring(lastDash + 1) as 'asc' | 'desc') || 'desc')
      }
    } else {
      getList(`n=1&l=25`)
    }
  }, [])

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          アカウント一覧
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/account/add')}
        >
          新規作成
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error.message}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>メールアドレス</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ユーザ名</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry: VtecxApp.Entry) => {
                const email = entry?.company?.email || entry?.title || ''
                const uid = entry.user?.uid ?? entry.id?.split('/').pop()?.split(',')[0] ?? ''
                return (
                  <TableRow
                    key={uid || email}
                    hover
                    onClick={() => router.push(`/account/edit/${uid}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{email}</TableCell>
                    <TableCell>{entry.user?.user_name || ''}</TableCell>
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
    </Box>
  )
}

export default Main
