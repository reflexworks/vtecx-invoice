'use client'
import { useEffect, useState } from 'react'
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
  Chip,
  Button,
  Snackbar,
  Alert
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import FolderIcon from '@mui/icons-material/Folder'
import { useRouter } from 'next/navigation'
import { getGroupList, getMyAccount } from '../fetcher'
import VtecxApp from '@/typings'

const ROLE_LABELS: Record<string, string> = { AD: '管理者', ED: '編集者', VI: '閲覧のみ' }
const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  AD: 'error',
  ED: 'warning',
  VI: 'info'
}

export default function GroupList() {
  const router = useRouter()
  const [groups, setGroups] = useState<VtecxApp.Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const handleSetupImgFolders = async () => {
    setMigrating(true)
    try {
      const res = await fetch('/api/migrate?action=setup-img-folder-company', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
      const json = await res.json().catch(() => ({}))
      const title = json?.feed?.title ?? ''
      if (res.ok) {
        setSnackbar({
          open: true,
          message: title || '画像フォルダを作成しました',
          severity: 'success'
        })
      } else {
        setSnackbar({
          open: true,
          message: title || 'フォルダ作成に失敗しました',
          severity: 'error'
        })
      }
    } catch (e: any) {
      setSnackbar({ open: true, message: e?.message ?? 'エラーが発生しました', severity: 'error' })
    }
    setMigrating(false)
  }

  useEffect(() => {
    const fetch = async () => {
      const [accountRes, groupRes] = await Promise.all([getMyAccount(), getGroupList()])
      const accountEntries = Array.isArray(accountRes)
        ? accountRes
        : ((accountRes as any)?.feed?.entry ?? [])
      setIsAdmin(accountEntries[0]?._isAdmin === true)
      if (groupRes && 'error' in (groupRes as any)) {
        setError((groupRes as any).error?.message ?? '取得に失敗しました')
      } else {
        const entries: VtecxApp.Entry[] = Array.isArray(groupRes)
          ? groupRes
          : ((groupRes as any)?.feed?.entry ?? [])
        setGroups(entries)
      }
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 4 }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupsIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {isAdmin ? 'グループ管理' : '所属グループ一覧'}
          </Typography>
        </Box>
        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FolderIcon />}
            onClick={handleSetupImgFolders}
            disabled={migrating}
          >
            {migrating ? '実行中...' : '画像フォルダ初期化'}
          </Button>
        )}
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {groups.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <GroupsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            グループに所属していません
          </Typography>
          <Typography variant="body2" color="text.secondary">
            アカウント管理画面から新規グループの作成、またはグループへの参加申請を行ってください。
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>グループID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>グループ名</TableCell>
                {isAdmin ? (
                  <TableCell sx={{ fontWeight: 'bold' }}>オーナーUID</TableCell>
                ) : (
                  <TableCell sx={{ fontWeight: 'bold' }}>ロール</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => {
                const company_id =
                  group.company_group?.company_id ??
                  group.link
                    ?.find((l) => l.___rel === 'self')
                    ?.___href?.split('/')
                    .pop() ??
                  ''
                const owner_id = group.company_group?.owner_id ?? ''
                const role = group.company_group?.role ?? ''
                return (
                  <TableRow
                    key={company_id}
                    hover
                    onClick={() => router.push(`/account/group/${company_id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Chip label={company_id} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>{group.title ?? company_id}</TableCell>
                    {isAdmin ? (
                      <TableCell
                        sx={{
                          color: 'text.secondary',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem'
                        }}
                      >
                        {owner_id}
                      </TableCell>
                    ) : (
                      <TableCell>
                        <Chip
                          label={ROLE_LABELS[role] ?? role}
                          size="small"
                          color={ROLE_COLORS[role] ?? 'default'}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
