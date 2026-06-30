'use client'
import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupsIcon from '@mui/icons-material/Groups'
import AddIcon from '@mui/icons-material/Add'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import LockIcon from '@mui/icons-material/Lock'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { getHashpass } from '@vtecx/vtecxauth'
import { useParams, useRouter } from 'next/navigation'
import {
  getAccountData,
  getMyAccount,
  putAccount,
  searchGroup,
  removeGroupMember,
  getMyGroups,
  postGroupRequest,
  getMyGroupRequests,
  cancelGroupRequest
} from '../../fetcher'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { AccountForm } from '../../account-form'
import * as browserutil from '@/utils/browserutil'
import VtecxApp from '@/typings'

type FormErrors = {
  company_name?: string
  tel?: string
}

type GroupEntry = {
  company_id: string
  company_name: string
  role: string
}

const EMPTY_COMPANY: VtecxApp.Company = {
  company_name: '',
  zip_code: '',
  prefecture: '',
  city: '',
  address_line1: '',
  building_name: '',
  tel: ''
}

const ROLE_LABELS: Record<string, string> = { AD: '管理者', ED: '編集者', VI: '閲覧のみ' }
const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  AD: 'error',
  ED: 'warning',
  VI: 'info'
}

export default function AccountEdit() {
  const params = useParams()
  const router = useRouter()
  const uid = decodeURIComponent(params?.id as string)

  const [initialCompany, setInitialCompany] = useState<VtecxApp.Company>(EMPTY_COMPANY)
  const [name, setName] = useState('')
  const [numericUid, setNumericUid] = useState('')
  const [userName, setUserName] = useState('')
  const [company, setCompany] = useState<VtecxApp.Company>(EMPTY_COMPANY)
  const [defaultBankLabel, setDefaultBankLabel] = useState<string | undefined>()
  const [defaultBank, setDefaultBank] = useState<VtecxApp.Bank | undefined>()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // 複数グループ
  const [groups, setGroups] = useState<GroupEntry[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null)

  // グループ申請フォーム
  const [joinFormOpen, setJoinFormOpen] = useState(false)
  const [joinGroupId, setJoinGroupId] = useState('')
  const [joinLookupStatus, setJoinLookupStatus] = useState<
    'idle' | 'loading' | 'found' | 'notfound'
  >('idle')
  const [joinGroupName, setJoinGroupName] = useState('')
  const [joining, setJoining] = useState(false)

  // 申請中グループ
  const [pendingRequests, setPendingRequests] = useState<{ company_id: string; company_name: string; status: string }[]>([])
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null)
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<{ company_id: string; company_name: string } | null>(null)

  // 新規グループ作成フォーム
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [createGroupName, setCreateGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  // パスワード変更フォーム
  const [passFormOpen, setPassFormOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  const isDirty = JSON.stringify(company) !== JSON.stringify(initialCompany)
  const { confirmNavigation, ConfirmDialog } = useUnsavedChangesGuard(isDirty, 'edit')

  useEffect(() => {
    getMyAccount()
      .then((res: any) => {
        const entries = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
        setIsAdmin(entries[0]?._isAdmin === true)
      })
      .catch(() => setIsAdmin(false))
  }, [])

  const fetchGroups = async (targetNumericUid?: string) => {
    setGroupsLoading(true)
    const [res, reqRes] = await Promise.all([
      getMyGroups(targetNumericUid),
      getMyGroupRequests()
    ])
    setGroupsLoading(false)
    if (res && !('error' in (res as any))) {
      const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      setGroups(
        entries
          .map((e: any) => ({
            company_id: e.company_group?.company_id ?? '',
            company_name: e.title ?? e.company_group?.company_id ?? '',
            role: e.company_group?.role ?? 'ED'
          }))
          .filter(
            (g: GroupEntry) =>
              g.company_id && !['$admin', '$useradmin', '$content'].includes(g.company_id)
          )
      )
    }
    if (reqRes && !('error' in (reqRes as any))) {
      const reqEntries: any[] = Array.isArray(reqRes) ? reqRes : (reqRes?.feed?.entry ?? [])
      setPendingRequests(
        reqEntries.map((e: any) => ({
          company_id: e.company_group?.company_id ?? '',
          company_name: e.company_group?.company_name ?? e.company_group?.company_id ?? '',
          status: e.company_group?.status ?? 'pending'
        })).filter((r) => r.company_id)
      )
    }
  }

  useEffect(() => {
    if (!uid) return
    const fetchData = async () => {
      const [accountData, bankData] = await Promise.all([
        getAccountData(uid),
        browserutil.requestApi('GET', 'bank', '').catch(() => null)
      ])

      if (accountData?.error) {
        setFetchError(accountData.error.message)
      } else {
        const entries: any[] = Array.isArray(accountData)
          ? accountData
          : (accountData?.feed?.entry ?? [])
        const entry = entries[0]
        if (entry) {
          const loadedCompany = { ...EMPTY_COMPANY, ...(entry.company ?? {}) }
          setName(entry.title ?? '')
          const numUid = entry.user?.uid ?? entry.id?.split('/').pop()?.split(',')[0] ?? uid
          setNumericUid(String(numUid))
          setUserName(entry.user?.user_name ?? '')
          setCompany(loadedCompany)
          setInitialCompany(loadedCompany)
          await fetchGroups(String(numUid))
        }
      }

      if (bankData) {
        const bankEntries: VtecxApp.Entry[] = Array.isArray(bankData)
          ? bankData
          : (bankData?.feed?.entry ?? [])
        const defaultBankEntry = bankEntries.find((e: any) => {
          const val = e.bank?.is_default
          return val === true || val === 'true'
        })
        if (defaultBankEntry) {
          setDefaultBankLabel((defaultBankEntry as any).bank?.bank_label)
          setDefaultBank((defaultBankEntry as any).bank)
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [uid])

  const handleGroupLeave = async (company_id: string) => {
    setLeavingGroupId(company_id)
    const res = await removeGroupMember(company_id, numericUid || uid)
    setLeavingGroupId(null)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? 'グループ脱退に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: 'グループから脱退しました', severity: 'success' })
      setGroups((prev) => prev.filter((g) => g.company_id !== company_id))
    }
  }

  const handleGroupLookup = async () => {
    if (!joinGroupId.trim()) return
    setJoinLookupStatus('loading')
    setJoinGroupName('')
    const res = await searchGroup(joinGroupId.trim())
    if (res && !('error' in (res as any))) {
      const entries = Array.isArray(res) ? res : ((res as any)?.feed?.entry ?? [])
      const entry = entries[0]
      if (entry) {
        setJoinGroupName(entry.title ?? joinGroupId)
        setJoinLookupStatus('found')
      } else {
        setJoinLookupStatus('notfound')
      }
    } else {
      setJoinLookupStatus('notfound')
    }
  }

  const handleJoinGroup = async () => {
    if (joinLookupStatus !== 'found' || !joinGroupId.trim()) return
    if (groups.some((g) => g.company_id === joinGroupId.trim())) {
      setSnackbar({ open: true, message: '既にこのグループに所属しています', severity: 'error' })
      return
    }
    if (pendingRequests.some((r) => r.company_id === joinGroupId.trim())) {
      setSnackbar({ open: true, message: '既に申請中です', severity: 'error' })
      return
    }
    setJoining(true)
    const res = await postGroupRequest(joinGroupId.trim())
    setJoining(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '申請に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: `${joinGroupName} に参加申請を送りました`, severity: 'success' })
      setPendingRequests((prev) => [
        ...prev,
        { company_id: joinGroupId.trim(), company_name: joinGroupName, status: 'pending' }
      ])
      setJoinFormOpen(false)
      setJoinGroupId('')
      setJoinLookupStatus('idle')
      setJoinGroupName('')
    }
  }

  const handleCancelRequest = async (company_id: string) => {
    setCancellingRequestId(company_id)
    const res = await cancelGroupRequest(company_id)
    setCancellingRequestId(null)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '申請のキャンセルに失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: '申請をキャンセルしました', severity: 'success' })
      setPendingRequests((prev) => prev.filter((r) => r.company_id !== company_id))
    }
  }

  const handleCreateGroup = async () => {
    if (!createGroupName.trim()) {
      setSnackbar({ open: true, message: '企業名を入力してください', severity: 'error' })
      return
    }
    setCreating(true)
    const res = await fetch('/api/group', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: numericUid || uid, company_name: createGroupName.trim() })
    })
    setCreating(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setSnackbar({
        open: true,
        message: json?.feed?.title ?? 'グループ作成に失敗しました',
        severity: 'error'
      })
    } else {
      const json = await res.json().catch(() => ({}))
      const entry = Array.isArray(json) ? json[0] : (json?.feed?.entry?.[0] ?? json)
      const created_company_id = entry?.company_group?.company_id ?? ''
      setGroups((prev) => [
        ...prev,
        { company_id: created_company_id, company_name: createGroupName.trim(), role: 'AD' }
      ])
      setCreateFormOpen(false)
      setCreateGroupName('')
      setSnackbar({
        open: true,
        message: `グループ ${created_company_id} を作成しました`,
        severity: 'success'
      })
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setSnackbar({ open: true, message: 'すべての項目を入力してください', severity: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      setSnackbar({ open: true, message: '新しいパスワードが一致しません', severity: 'error' })
      return
    }
    if (newPassword.length < 8) {
      setSnackbar({
        open: true,
        message: 'パスワードは8文字以上で入力してください',
        severity: 'error'
      })
      return
    }
    setChangingPass(true)
    const res = await fetch('/api/mypassword', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newpswd: getHashpass(newPassword)
      })
    })
    setChangingPass(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setSnackbar({
        open: true,
        message: json?.feed?.title ?? 'パスワードの変更に失敗しました',
        severity: 'error'
      })
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setSnackbar({ open: true, message: 'パスワードを変更しました', severity: 'success' })
    }
  }

  const handleSave = async () => {
    setErrors({})
    setIsSubmitting(true)
    const result = await putAccount(numericUid || uid, name, company, undefined, userName)
    setIsSubmitting(false)
    if (result && 'error' in (result as any)) {
      setSnackbar({
        open: true,
        message: (result as any).error?.message || '更新に失敗しました',
        severity: 'error'
      })
      return
    }
    setSnackbar({ open: true, message: 'アカウントを更新しました', severity: 'success' })
    if (isAdmin) setTimeout(() => router.push('/account'), 3000)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (fetchError) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{fetchError}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', boxShadow: 3 }}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {ConfirmDialog}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {isAdmin && (
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => confirmNavigation(() => router.back())}
            sx={{ bgcolor: 'white' }}
          >
            一覧に戻る
          </Button>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSubmitting}
            sx={{ px: 4, fontWeight: 'bold' }}
          >
            {isSubmitting ? '更新中...' : '更新する'}
          </Button>
        </Box>
      </Box>

      <Paper
        sx={{
          p: { xs: 3, md: 5 },
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          borderRadius: 2
        }}
      >
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 'bold', color: 'text.primary' }}>
          アカウント編集
        </Typography>
        <AccountForm
          mode="edit"
          email={name}
          userName={userName}
          onUserNameChange={(v) => setUserName(v)}
          company={company}
          setCompany={setCompany}
          companyNameError={errors.company_name}
          telError={errors.tel}
          defaultBankLabel={defaultBankLabel}
          defaultBank={defaultBank}
          onGoBankList={() => router.push(`/${uid}/bank`)}
          hideCompanyBank={true}
          afterAccountInfo={
            <>
              {/* パスワード変更 */}
              <Box sx={{ mt: 2, mb: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => {
                    setPassFormOpen((v) => !v)
                    if (passFormOpen) {
                      setNewPassword('')
                      setConfirmPassword('')
                    }
                  }}
                >
                  パスワードを変更する
                </Button>
              </Box>
              {passFormOpen && (
                <Box
                  sx={{
                    px: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxWidth: 400,
                    mb: 2
                  }}
                >
                  <TextField
                    label="新しいパスワード"
                    type={showNewPass ? 'text' : 'password'}
                    size="small"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    helperText="8文字以上で入力してください"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowNewPass((v) => !v)}>
                              {showNewPass ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                  <TextField
                    label="新しいパスワード（確認）"
                    type={showConfirmPass ? 'text' : 'password'}
                    size="small"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={confirmPassword !== '' && confirmPassword !== newPassword}
                    helperText={
                      confirmPassword !== '' && confirmPassword !== newPassword
                        ? 'パスワードが一致しません'
                        : ''
                    }
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowConfirmPass((v) => !v)}>
                              {showConfirmPass ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                  <Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleChangePassword}
                      disabled={changingPass || !newPassword || !confirmPassword}
                    >
                      {changingPass ? '変更中...' : '変更する'}
                    </Button>
                  </Box>
                </Box>
              )}

              <Box
                sx={{
                  bgcolor: '#d1e9ff',
                  p: 0.5,
                  px: 2,
                  mb: 2,
                  mt: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <GroupsIcon fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  グループ設定
                </Typography>
              </Box>
              <Box sx={{ px: 1 }}>
                {/* 所属グループ一覧 */}
                {groupsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : groups.length > 0 ? (
                  <Box
                    sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}
                  >
                    {groups.map((g) => (
                      <Card key={g.company_id} variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ pb: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 0.5
                            }}
                          >
                            <Chip
                              label={g.company_id}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={ROLE_LABELS[g.role] ?? g.role}
                              size="small"
                              color={ROLE_COLORS[g.role] ?? 'default'}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                            {g.company_name}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => router.push(`/account/group/${g.company_id}`)}
                          >
                            詳細
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={leavingGroupId === g.company_id}
                            onClick={() => handleGroupLeave(g.company_id)}
                          >
                            {leavingGroupId === g.company_id ? '処理中...' : '脱退'}
                          </Button>
                        </CardActions>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    グループに所属していません
                  </Typography>
                )}

                {/* 申請中グループ */}
                {pendingRequests.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', mb: 0.5 }}>
                      申請中
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#fff8e1' }}>
                            <TableCell sx={{ fontWeight: 'bold', py: 0.75 }}>グループID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', py: 0.75 }}>グループ名</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', py: 0.75 }}>ステータス</TableCell>
                            <TableCell sx={{ py: 0.75 }} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pendingRequests.map((r) => (
                            <TableRow key={r.company_id} hover>
                              <TableCell sx={{ py: 0.75 }}>{r.company_id}</TableCell>
                              <TableCell sx={{ py: 0.75 }}>{r.company_name}</TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                {r.status === 'rejected' ? (
                                  <Chip label="却下" size="small" color="error" variant="outlined" />
                                ) : (
                                  <Chip label="申請中" size="small" color="warning" variant="outlined" />
                                )}
                              </TableCell>
                              <TableCell sx={{ py: 0.75 }} align="right">
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  disabled={cancellingRequestId === r.company_id}
                                  onClick={() =>
                                    r.status === 'rejected'
                                      ? handleCancelRequest(r.company_id)
                                      : setCancelConfirmTarget({ company_id: r.company_id, company_name: r.company_name })
                                  }
                                  sx={{ whiteSpace: 'nowrap' }}
                                >
                                  {cancellingRequestId === r.company_id
                                    ? <CircularProgress size={14} />
                                    : r.status === 'rejected' ? '確認済みにする' : '申請取り消し'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* 操作ボタン */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<GroupAddIcon />}
                    onClick={() => {
                      setJoinFormOpen(true)
                      setJoinGroupId('')
                      setJoinLookupStatus('idle')
                      setJoinGroupName('')
                    }}
                  >
                    グループに参加申請
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setCreateFormOpen((v) => !v)
                      setJoinFormOpen(false)
                    }}
                  >
                    新規グループを作成
                  </Button>
                </Box>


                {/* 新規グループ作成フォーム */}
                {createFormOpen && (
                  <Card
                    variant="outlined"
                    sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#f9f9f9' }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                      新規グループを作成
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        placeholder="グループ名"
                        value={createGroupName}
                        onChange={(e) => setCreateGroupName(e.target.value)}
                        sx={{ width: 240, bgcolor: 'white' }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleCreateGroup}
                        disabled={creating || !createGroupName.trim()}
                      >
                        {creating ? '作成中...' : 'グループを作成'}
                      </Button>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      あなたがグループ管理者になります。
                    </Typography>
                  </Card>
                )}
              </Box>
            </>
          }
        />
      </Paper>

      {/* 申請取り消し確認ダイアログ */}
      <Dialog
        open={!!cancelConfirmTarget}
        onClose={() => setCancelConfirmTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>申請取り消しの確認</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{cancelConfirmTarget?.company_name}（{cancelConfirmTarget?.company_id}）</strong> への参加申請を取り消しますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmTarget(null)}>戻る</Button>
          <Button
            variant="contained"
            color="error"
            disabled={cancellingRequestId === cancelConfirmTarget?.company_id}
            onClick={async () => {
              if (!cancelConfirmTarget) return
              setCancelConfirmTarget(null)
              await handleCancelRequest(cancelConfirmTarget.company_id)
            }}
          >
            取り消す
          </Button>
        </DialogActions>
      </Dialog>

      {/* グループ参加申請ダイアログ */}
      <Dialog
        open={joinFormOpen}
        onClose={() => setJoinFormOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>グループへの参加申請</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                label="グループID"
                placeholder="例: C00001"
                value={joinGroupId}
                onChange={(e) => {
                  setJoinGroupId(e.target.value)
                  setJoinLookupStatus('idle')
                  setJoinGroupName('')
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGroupLookup() }}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleGroupLookup}
                disabled={joinLookupStatus === 'loading' || !joinGroupId.trim()}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {joinLookupStatus === 'loading' ? <CircularProgress size={16} /> : '検索'}
              </Button>
            </Box>
            {joinLookupStatus === 'found' && (
              <Chip label={`✓ ${joinGroupName}`} color="success" size="small" />
            )}
            {joinLookupStatus === 'notfound' && (
              <Chip label="グループが見つかりません" color="error" size="small" />
            )}
            <Typography variant="caption" color="text.secondary">
              グループ管理者が承認すると参加が完了します。
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinFormOpen(false)} disabled={joining}>キャンセル</Button>
          <Button
            variant="contained"
            disabled={joinLookupStatus !== 'found' || joining}
            onClick={handleJoinGroup}
          >
            {joining ? '申請中...' : '申請する'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
