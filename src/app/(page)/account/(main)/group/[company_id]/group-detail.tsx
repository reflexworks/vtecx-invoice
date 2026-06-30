'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Grid,
  Tabs,
  Tab,
  Badge
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import GroupsIcon from '@mui/icons-material/Groups'
import BusinessIcon from '@mui/icons-material/Business'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ImageIcon from '@mui/icons-material/Image'
import { Autocomplete, FormControl, InputLabel } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import {
  getGroupDetail,
  addGroupMember,
  updateGroupMemberRole,
  updateGroupCompany,
  removeGroupMember,
  deleteGroup,
  getGroupBankList,
  postGroupBank,
  putGroupBank,
  deleteGroupBank,
  getGroupRequests,
  handleGroupRequest
} from '../../fetcher'
import { AdminPagination } from '@/components/admin_pagination'
import { CompanyForm } from '../../company-form'
import { getBankList, getBranchList } from '@/utils/bank-util'
import VtecxApp from '@/typings'

type Member = {
  uid: string
  role: string
  email: string
  company_name: string
}

type GroupInfo = {
  company_id: string
  company_name: string
  owner_id: string
  company: VtecxApp.Company
  bank: VtecxApp.Bank
}

const ROLE_LABELS: Record<string, string> = {
  AD: '管理者',
  ED: '編集者',
  VI: '閲覧のみ'
}

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  AD: 'error',
  ED: 'warning',
  VI: 'info'
}

const EMPTY_COMPANY: VtecxApp.Company = {
  company_name: '',
  zip_code: '',
  prefecture: '',
  city: '',
  address_line1: '',
  building_name: '',
  tel: '',
  email: '',
  registration_number: ''
}

const EMPTY_BANK: VtecxApp.Bank = {
  bank_title: '',
  bank_code: '',
  branch_name: '',
  branch_code: '',
  bank_type: '1',
  bank_number: '',
  bank_name: ''
}

export default function GroupDetail() {
  const params = useParams()
  const router = useRouter()
  const company_id = params?.company_id as string

  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [myRole, setMyRole] = useState<string | null>(null)
  const [myUid, setMyUid] = useState<string | null>(null)
  const [leavingGroup, setLeavingGroup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // メンバー追加ダイアログ
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<string>('ED')
  const [adding, setAdding] = useState(false)

  // メンバー削除確認ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState(false)

  // グループ削除確認ダイアログ
  const [groupDeleteDialogOpen, setGroupDeleteDialogOpen] = useState(false)
  const [groupDeleting, setGroupDeleting] = useState(false)

  // ロール変更中フラグ
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  // メンバー編集ダイアログ
  const [editTarget, setEditTarget] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState<string>('ED')

  // ページネーション
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  // タブ (0: 基本情報, 1: 口座マスタ, 2: メンバーリスト, 3: その他, 4: 参加申請)
  const [tab, setTab] = useState(0)

  // 参加申請一覧
  const [requestList, setRequestList] = useState<{ uid: string; email: string; company_id: string }[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [handlingRequestUid, setHandlingRequestUid] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<{ uid: string; email: string } | null>(null)
  const [approveRole, setApproveRole] = useState<'ED' | 'VI'>('ED')

  // 口座マスタ
  const [bankList, setBankList] = useState<VtecxApp.Bank[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [bankPage, setBankPage] = useState(1)
  const BANK_PAGE_SIZE = 10
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [bankEditTarget, setBankEditTarget] = useState<VtecxApp.Bank | null>(null)
  const [bankForm, setBankForm] = useState<VtecxApp.Bank>(EMPTY_BANK)
  const [bankFormBankCode, setBankFormBankCode] = useState('')
  const [savingBank, setSavingBank] = useState(false)
  const [bankDeleteTarget, setBankDeleteTarget] = useState<VtecxApp.Bank | null>(null)
  const [deletingBank, setDeletingBank] = useState(false)

  // 企業情報・口座情報編集ダイアログ
  const [companyEditOpen, setCompanyEditOpen] = useState(false)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editCompany, setEditCompany] = useState<VtecxApp.Company>(EMPTY_COMPANY)

  const [savingCompany, setSavingCompany] = useState(false)

  // 画像アップロード
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [stampSrc, setStampSrc] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [stampUploading, setStampUploading] = useState(false)
  const [logoDeleting, setLogoDeleting] = useState(false)
  const [stampDeleting, setStampDeleting] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const stampInputRef = useRef<HTMLInputElement>(null)

  // 初期ロード時に画像の存在確認
  useEffect(() => {
    let cancelled = false
    const logoUrl = `/api/upload-image?uid=${encodeURIComponent(company_id)}&type=logo`
    const logoImg = new Image()
    logoImg.onload = () => { if (!cancelled) setLogoSrc(logoUrl) }
    logoImg.onerror = () => { if (!cancelled) setLogoSrc(null) }
    logoImg.src = logoUrl

    const stampUrl = `/api/upload-image?uid=${encodeURIComponent(company_id)}&type=stamp`
    const stampImg = new Image()
    stampImg.onload = () => { if (!cancelled) setStampSrc(stampUrl) }
    stampImg.onerror = () => { if (!cancelled) setStampSrc(null) }
    stampImg.src = stampUrl

    return () => { cancelled = true }
  }, [company_id])

  const handleImageUpload = async (file: File, type: 'logo' | 'stamp') => {
    // ファイル選択直後にローカルプレビューを表示
    const reader = new FileReader()
    reader.onload = () => {
      if (type === 'logo') setLogoSrc(reader.result as string)
      else setStampSrc(reader.result as string)
    }
    reader.readAsDataURL(file)

    const res = await fetch(
      `/api/upload-image?uid=${encodeURIComponent(company_id)}&type=${type}`,
      {
        method: 'PUT',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': file.type },
        body: file
      }
    )
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setSnackbar({
        open: true,
        message: json?.feed?.title ?? 'アップロードに失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({
        open: true,
        message: `${type === 'logo' ? 'ロゴ' : '角印'}をアップロードしました`,
        severity: 'success'
      })
    }
  }

  const handleImageDelete = async (type: 'logo' | 'stamp') => {
    const res = await fetch(
      `/api/upload-image?uid=${encodeURIComponent(company_id)}&type=${type}`,
      { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    )
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setSnackbar({
        open: true,
        message: json?.feed?.title ?? '削除に失敗しました',
        severity: 'error'
      })
    } else {
      if (type === 'logo') setLogoSrc(null)
      else setStampSrc(null)
      setSnackbar({
        open: true,
        message: `${type === 'logo' ? 'ロゴ' : '角印'}を削除しました`,
        severity: 'success'
      })
    }
  }

  const fetchData = async () => {
    const res = await getGroupDetail(company_id)
    if (res && 'error' in (res as any)) {
      setError((res as any).error?.message ?? '取得に失敗しました')
    } else {
      const data = res as any
      const g = data?.group?.company_group
      setGroup({
        company_id: g?.company_id ?? company_id,
        company_name: data?.group?.title ?? company_id,
        owner_id: g?.owner_id ?? '',
        company: data?.group?.company ?? {},
        bank: data?.bank ?? {}
      })
      setMembers(data?.members ?? [])
      setMyRole(data?.my_role ?? null)
      setMyUid(data?.my_uid ?? null)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (company_id) fetchData()
  }, [company_id])

  useEffect(() => {
    if (myRole === 'VI') setTab(0)
  }, [myRole])

  const fetchBankList = async () => {
    setBankLoading(true)
    const res = await getGroupBankList(company_id)
    setBankLoading(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '口座情報の取得に失敗しました',
        severity: 'error'
      })
    } else {
      const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      setBankList(entries.map((e: any) => e.bank).filter(Boolean))
    }
  }

  useEffect(() => {
    if (company_id && tab === 1) fetchBankList()
  }, [company_id, tab])

  const fetchRequestList = async () => {
    setRequestsLoading(true)
    const res = await getGroupRequests(company_id)
    setRequestsLoading(false)
    if (res && !('error' in (res as any))) {
      const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      setRequestList(
        entries.map((e: any) => ({
          uid: e.user?.uid ?? '',
          email: e.user?.email ?? e.title ?? '',
          company_id: e.company_group?.company_id ?? ''
        })).filter((r) => r.uid)
      )
    }
  }

  useEffect(() => {
    if (company_id && myRole === 'AD') fetchRequestList()
  }, [company_id, myRole])

  useEffect(() => {
    if (company_id && tab === 3 && myRole === 'AD') fetchRequestList()
  }, [tab])

  const handleApproveOrReject = async (uid: string, action: 'approve' | 'reject', role?: string) => {
    setHandlingRequestUid(uid)
    const res = await handleGroupRequest(company_id, uid, action, role)
    setHandlingRequestUid(null)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '操作に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({
        open: true,
        message: action === 'approve' ? '申請を承認しました' : '申請を却下しました',
        severity: 'success'
      })
      setRequestList((prev) => prev.filter((r) => r.uid !== uid))
      if (action === 'approve') fetchData()
    }
  }

  const openBankAdd = () => {
    setBankEditTarget(null)
    setBankForm(EMPTY_BANK)
    setBankFormBankCode('')
    setBankDialogOpen(true)
  }

  const openBankEdit = (bank: VtecxApp.Bank) => {
    setBankEditTarget(bank)
    setBankForm({ ...bank })
    setBankFormBankCode(bank.bank_code ?? '')
    setBankDialogOpen(true)
  }

  const handleSaveBank = async () => {
    setSavingBank(true)
    const res = bankEditTarget
      ? await putGroupBank(company_id, bankForm)
      : await postGroupBank(company_id, bankForm)
    setSavingBank(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '保存に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({
        open: true,
        message: bankEditTarget ? '口座情報を更新しました' : '口座情報を追加しました',
        severity: 'success'
      })
      setBankDialogOpen(false)
      fetchBankList()
    }
  }

  const handleDeleteBank = async () => {
    if (!bankDeleteTarget?.bank_code) return
    setDeletingBank(true)
    const res = await deleteGroupBank(company_id, bankDeleteTarget.bank_code)
    setDeletingBank(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '削除に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: '口座情報を削除しました', severity: 'success' })
      setBankDeleteTarget(null)
      fetchBankList()
    }
  }

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return
    if (members.some((m) => m.email === newMemberEmail.trim())) {
      setSnackbar({ open: true, message: '既に所属済のメンバーです', severity: 'error' })
      return
    }
    setAdding(true)
    const res = await addGroupMember(company_id, newMemberEmail.trim(), newMemberRole)
    setAdding(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? 'メンバー追加に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: 'メンバーを追加しました', severity: 'success' })
      setAddDialogOpen(false)
      setNewMemberEmail('')
      setNewMemberRole('ED')
      fetchData()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await removeGroupMember(company_id, deleteTarget.uid)
    setDeleting(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '削除に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: 'メンバーを削除しました', severity: 'success' })
      setDeleteTarget(null)
      setMembers((prev) => prev.filter((m) => m.uid !== deleteTarget.uid))
    }
  }

  const handleGroupDelete = async () => {
    setGroupDeleting(true)
    const res = await deleteGroup(company_id)
    setGroupDeleting(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? 'グループの削除に失敗しました',
        severity: 'error'
      })
      setGroupDeleteDialogOpen(false)
    } else {
      router.push('/account/group')
    }
  }

  const openCompanyEdit = () => {
    setEditCompanyName(group?.company_name ?? '')
    setEditCompany({ ...EMPTY_COMPANY, ...(group?.company ?? {}) })
    setCompanyEditOpen(true)
  }

  const handleSaveCompany = async () => {
    setSavingCompany(true)
    const res = await updateGroupCompany(company_id, editCompanyName, editCompany)
    setSavingCompany(false)
    if (res && 'error' in (res as any)) {
      setSnackbar({
        open: true,
        message: (res as any).error?.message ?? '更新に失敗しました',
        severity: 'error'
      })
    } else {
      setSnackbar({ open: true, message: '情報を更新しました', severity: 'success' })
      setCompanyEditOpen(false)
      setGroup((prev) =>
        prev
          ? { ...prev, company_name: editCompanyName, company: editCompany }
          : prev
      )
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
        <Button
          onClick={() => router.push('/account/group')}
          sx={{ mt: 2 }}
          startIcon={<ArrowBackIcon />}
        >
          一覧に戻る
        </Button>
      </Box>
    )
  }

  const isGroupAdmin = myRole === 'AD'
  const canEditBank = myRole === 'AD' || myRole === 'ED'

  const companyFields: { label: string; key: keyof VtecxApp.Company }[] = [
    { label: '企業名', key: 'company_name' },
    { label: '郵便番号', key: 'zip_code' },
    { label: '都道府県', key: 'prefecture' },
    { label: '市区町村', key: 'city' },
    { label: '番地', key: 'address_line1' },
    { label: '建物名', key: 'building_name' },
    { label: '電話番号', key: 'tel' },
    { label: 'メールアドレス', key: 'email' },
    { label: '登録番号', key: 'registration_number' }
  ]

  return (
    <>
      <Box sx={{ p: 4 }}>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* ヘッダ */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => router.push('/account/group')}
          >
            一覧に戻る
          </Button>
        </Box>

        {/* タブ */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value={0} label="基本情報" />
          {myRole !== 'VI' && <Tab value={1} label="口座マスタ" />}
          {myRole !== 'VI' && <Tab value={2} label="メンバーリスト" />}
          {isGroupAdmin && (
            <Tab
              value={3}
              label={
                <Badge badgeContent={requestList.length || null} color="error">
                  参加申請
                </Badge>
              }
            />
          )}
          <Tab value={4} label="その他" />
        </Tabs>

        {/* タブ0: 基本情報 */}
        {tab === 0 && (
          <>
            {/* グループ基本情報 */}
            <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <GroupsIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {group?.company_name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    グループID
                  </Typography>
                  <Box>
                    <Chip
                      label={group?.company_id}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    オーナーUID
                  </Typography>
                  <Box>
                    <Chip
                      label={group?.owner_id}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    メンバー数
                  </Typography>
                  <Box>
                    <Chip label={`${members.length} 名`} size="small" variant="outlined" />
                  </Box>
                </Box>
                {myRole && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      あなたのロール
                    </Typography>
                    <Box>
                      <Chip
                        label={ROLE_LABELS[myRole] ?? myRole}
                        size="small"
                        color={ROLE_COLORS[myRole] ?? 'default'}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* 企業情報 */}
            <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    企業情報
                  </Typography>
                </Box>
                {isGroupAdmin && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={openCompanyEdit}
                  >
                    編集
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {companyFields.map(({ label, key }) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {(group?.company as any)?.[key] || '—'}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* ロゴ・角印 */}
            <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ImageIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  ロゴ・角印
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={4}>
                {/* 企業ロゴ */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    企業ロゴ
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 200,
                        height: 60,
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#fafafa'
                      }}
                    >
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt="ロゴ"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          未設定
                        </Typography>
                      )}
                    </Box>
                    {isGroupAdmin && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setLogoUploading(true)
                            await handleImageUpload(file, 'logo')
                            setLogoUploading(false)
                            e.target.value = ''
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={logoUploading}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {logoUploading ? 'アップロード中...' : 'ファイルを選択'}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={logoDeleting}
                          onClick={async () => {
                            setLogoDeleting(true)
                            await handleImageDelete('logo')
                            setLogoDeleting(false)
                          }}
                        >
                          {logoDeleting ? '削除中...' : '削除'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* 角印 */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    角印
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#fafafa'
                      }}
                    >
                      {stampSrc ? (
                        <img
                          src={stampSrc}
                          alt="角印"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          未設定
                        </Typography>
                      )}
                    </Box>
                    {isGroupAdmin && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <input
                          ref={stampInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setStampUploading(true)
                            await handleImageUpload(file, 'stamp')
                            setStampUploading(false)
                            e.target.value = ''
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={stampUploading}
                          onClick={() => stampInputRef.current?.click()}
                        >
                          {stampUploading ? 'アップロード中...' : 'ファイルを選択'}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={stampDeleting}
                          onClick={async () => {
                            setStampDeleting(true)
                            await handleImageDelete('stamp')
                            setStampDeleting(false)
                          }}
                        >
                          {stampDeleting ? '削除中...' : '削除'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}

        {/* タブ1: 口座マスタ */}
        {tab === 1 && (
          <>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                口座マスタ
              </Typography>
              {canEditBank && (
                <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openBankAdd}>
                  口座を追加
                </Button>
              )}
            </Box>

            {bankLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : bankList.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">口座情報がありません</Typography>
              </Paper>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>ラベル</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>銀行名</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>支店名</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>種別</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>口座番号</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>口座名義</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>デフォルト</TableCell>
                        {canEditBank && (
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            操作
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bankList
                        .slice((bankPage - 1) * BANK_PAGE_SIZE, bankPage * BANK_PAGE_SIZE)
                        .map((bank) => (
                          <TableRow
                            key={bank.bank_code}
                            hover
                            onClick={() => canEditBank && openBankEdit(bank)}
                            sx={{ cursor: canEditBank ? 'pointer' : 'default' }}
                          >
                            <TableCell>{bank.bank_label || '—'}</TableCell>
                            <TableCell>{bank.bank_title || '—'}</TableCell>
                            <TableCell>{bank.branch_name || '—'}</TableCell>
                            <TableCell>
                              {bank.bank_type === '2' ? '当座' : bank.bank_type ? '普通' : '—'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>
                              {bank.bank_number || '—'}
                            </TableCell>
                            <TableCell>{bank.bank_name || '—'}</TableCell>
                            <TableCell>
                              {bank.is_default && (
                                <Chip label="デフォルト" size="small" color="primary" />
                              )}
                            </TableCell>
                            {canEditBank && (
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="削除">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setBankDeleteTarget(bank)}
                                  >
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
                <AdminPagination
                  max_number={BANK_PAGE_SIZE}
                  current_count={bankList.length}
                  current_page={bankPage}
                  onChange={(p: number) => setBankPage(p)}
                />
              </>
            )}

            {/* 口座追加・編集ダイアログ */}
            <Dialog
              open={bankDialogOpen}
              onClose={() => setBankDialogOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>{bankEditTarget ? '口座情報を編集' : '口座情報を追加'}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <TextField
                    label="ラベル"
                    fullWidth
                    placeholder="例: メイン口座"
                    value={bankForm.bank_label ?? ''}
                    onChange={(e) => setBankForm((p) => ({ ...p, bank_label: e.target.value }))}
                  />
                  <Autocomplete
                    options={getBankList()}
                    getOptionLabel={(o) => `${o.name} (${o.code})`}
                    value={getBankList().find((b) => b.name === bankForm.bank_title) ?? null}
                    onChange={(_, v) => {
                      setBankForm((p) => ({
                        ...p,
                        bank_title: v?.name ?? '',
                        bank_code: v?.code ?? '',
                        branch_name: '',
                        branch_code: ''
                      }))
                      setBankFormBankCode(v?.code ?? '')
                    }}
                    renderInput={(params) => <TextField {...params} label="銀行名" />}
                  />
                  <Autocomplete
                    options={bankFormBankCode ? getBranchList(bankFormBankCode) : []}
                    getOptionLabel={(o) => `${o.name} (${o.code})`}
                    value={
                      bankFormBankCode
                        ? (getBranchList(bankFormBankCode).find(
                            (b) => b.name === bankForm.branch_name
                          ) ?? null)
                        : null
                    }
                    disabled={!bankFormBankCode}
                    onChange={(_, v) =>
                      setBankForm((p) => ({
                        ...p,
                        branch_name: v?.name ?? '',
                        branch_code: v?.code ?? ''
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="支店名"
                        placeholder={!bankFormBankCode ? '銀行を選択してください' : ''}
                      />
                    )}
                  />
                  <FormControl fullWidth>
                    <InputLabel>口座種別</InputLabel>
                    <Select
                      label="口座種別"
                      value={bankForm.bank_type ?? '1'}
                      onChange={(e) => setBankForm((p) => ({ ...p, bank_type: e.target.value }))}
                    >
                      <MenuItem value="1">普通</MenuItem>
                      <MenuItem value="2">当座</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="口座番号"
                    fullWidth
                    value={bankForm.bank_number ?? ''}
                    onChange={(e) => setBankForm((p) => ({ ...p, bank_number: e.target.value }))}
                    slotProps={{ htmlInput: { maxLength: 7, inputMode: 'numeric' } }}
                  />
                  <TextField
                    label="口座名義"
                    fullWidth
                    placeholder="カ）バーチャルテクノロジー"
                    value={bankForm.bank_name ?? ''}
                    onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input
                      type="checkbox"
                      id="bank-is-default"
                      checked={bankForm.is_default ?? false}
                      onChange={(e) => setBankForm((p) => ({ ...p, is_default: e.target.checked }))}
                    />
                    <label htmlFor="bank-is-default">デフォルト口座にする</label>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setBankDialogOpen(false)} disabled={savingBank}>
                  キャンセル
                </Button>
                <Button variant="contained" onClick={handleSaveBank} disabled={savingBank}>
                  {savingBank ? '保存中...' : '保存'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* 口座削除確認ダイアログ */}
            <Dialog open={!!bankDeleteTarget} onClose={() => setBankDeleteTarget(null)}>
              <DialogTitle>口座情報を削除</DialogTitle>
              <DialogContent>
                <Typography sx={{ mb: 2 }}>
                  以下の口座情報を削除しますか？
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', alignItems: 'baseline' }}>
                  {bankDeleteTarget?.bank_label && (
                    <>
                      <Typography variant="body2" color="text.secondary">ラベル</Typography>
                      <Typography variant="body2"><strong>{bankDeleteTarget.bank_label}</strong></Typography>
                    </>
                  )}
                  <Typography variant="body2" color="text.secondary">銀行名</Typography>
                  <Typography variant="body2">{bankDeleteTarget?.bank_title || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">支店名</Typography>
                  <Typography variant="body2">{bankDeleteTarget?.branch_name || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">口座種別</Typography>
                  <Typography variant="body2">{bankDeleteTarget?.bank_type === '2' ? '当座' : '普通'}</Typography>
                  <Typography variant="body2" color="text.secondary">口座番号</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{bankDeleteTarget?.bank_number || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">口座名義</Typography>
                  <Typography variant="body2">{bankDeleteTarget?.bank_name || '—'}</Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setBankDeleteTarget(null)} disabled={deletingBank}>
                  キャンセル
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={handleDeleteBank}
                  disabled={deletingBank}
                >
                  {deletingBank ? '削除中...' : '削除する'}
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}

        {/* タブ2: メンバーリスト */}
        {tab === 2 && (
          <>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                メンバーリスト
              </Typography>
              {isGroupAdmin && (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  メンバー追加
                </Button>
              )}
            </Box>

            {members.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">メンバーがいません</Typography>
              </Paper>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>メールアドレス</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>ロール</TableCell>
                        {isGroupAdmin && (
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">
                            操作
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((member) => (
                        <TableRow key={member.uid} hover>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={ROLE_LABELS[member.role] ?? member.role}
                              size="small"
                              color={ROLE_COLORS[member.role] ?? 'default'}
                            />
                          </TableCell>
                          {isGroupAdmin && (
                            <TableCell align="right">
                              <Tooltip title="編集">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => {
                                    setEditTarget(member)
                                    setEditRole(member.role)
                                  }}
                                >
                                  <ManageAccountsIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {member.role !== 'AD' && (
                                <Tooltip title="削除">
                                  <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => setDeleteTarget(member)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <AdminPagination
                  max_number={PAGE_SIZE}
                  current_count={members.length}
                  current_page={page}
                  onChange={(p: number) => setPage(p)}
                />
              </>
            )}
          </>
        )}

        {/* タブ3: 参加申請 */}
        {tab === 3 && isGroupAdmin && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>参加申請一覧</Typography>
            {requestsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : requestList.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">申請はありません</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} sx={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>メールアドレス</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requestList.map((r) => (
                      <TableRow key={r.uid} hover>
                        <TableCell>{r.email}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            disabled={handlingRequestUid === r.uid}
                            onClick={() => {
                              setApproveTarget({ uid: r.uid, email: r.email })
                              setApproveRole('ED')
                            }}
                            sx={{ mr: 1 }}
                          >
                            承認
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={handlingRequestUid === r.uid}
                            onClick={() => handleApproveOrReject(r.uid, 'reject')}
                          >
                            {handlingRequestUid === r.uid ? '処理中...' : '却下'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* タブ4: その他 */}
        {tab === 4 && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 非管理者: グループ脱退 */}
            {!isGroupAdmin && (
              <Paper sx={{ p: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  グループから脱退
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  グループを脱退すると、このグループのデータにアクセスできなくなります。
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={leavingGroup}
                  onClick={() => setGroupDeleteDialogOpen(true)}
                >
                  {leavingGroup ? '処理中...' : 'グループを脱退'}
                </Button>
              </Paper>
            )}
            {/* 管理者: グループ削除 */}
            {isGroupAdmin && (
              <Paper sx={{ p: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  グループの削除
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  グループを削除するとメンバーのグループ情報もすべてクリアされます。この操作は元に戻せません。
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setGroupDeleteDialogOpen(true)}
                >
                  グループを削除
                </Button>
              </Paper>
            )}
          </Box>
        )}

        {/* 企業情報・口座情報 編集ダイアログ */}
        <Dialog
          open={companyEditOpen}
          onClose={() => setCompanyEditOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>企業情報・口座情報を編集</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              {/* グループ名 */}
              <TextField
                label="グループ名（会社名）"
                fullWidth
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                sx={{ mb: 3 }}
              />

              {/* 企業情報 */}
              <Box sx={{ bgcolor: '#d1e9ff', p: 0.5, px: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  企業情報
                </Typography>
              </Box>
              <CompanyForm company={editCompany} setCompany={setEditCompany} />

            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanyEditOpen(false)} disabled={savingCompany}>
              キャンセル
            </Button>
            <Button variant="contained" onClick={handleSaveCompany} disabled={savingCompany}>
              {savingCompany ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* メンバー編集ダイアログ */}
        <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>メンバーを編集</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  メールアドレス
                </Typography>
                <Typography variant="body2">{editTarget?.email}</Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  ロール
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <MenuItem value="AD">管理者</MenuItem>
                  <MenuItem value="ED">編集者</MenuItem>
                  <MenuItem value="VI">閲覧のみ</MenuItem>
                </Select>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTarget(null)} disabled={!!updatingRole}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              disabled={!!updatingRole}
              onClick={async () => {
                if (!editTarget) return
                setUpdatingRole(editTarget.uid)
                const res = await updateGroupMemberRole(company_id, editTarget.uid, editRole)
                setUpdatingRole(null)
                if (res && 'error' in (res as any)) {
                  setSnackbar({
                    open: true,
                    message: (res as any).error?.message ?? 'ロール変更に失敗しました',
                    severity: 'error'
                  })
                } else {
                  setMembers((prev) =>
                    prev.map((m) => (m.uid === editTarget.uid ? { ...m, role: editRole } : m))
                  )
                  setSnackbar({ open: true, message: 'ロールを変更しました', severity: 'success' })
                  setEditTarget(null)
                }
              }}
            >
              {updatingRole ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* メンバー追加ダイアログ */}
        <Dialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>メンバーを追加</DialogTitle>
          <DialogContent>
            <TextField
              label="メールアドレス"
              fullWidth
              size="small"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMember()
              }}
              sx={{ mt: 1, mb: 2 }}
              placeholder="例: user@example.com"
              helperText="追加するユーザーのメールアドレスを入力してください"
            />
            <Select
              fullWidth
              size="small"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
            >
              <MenuItem value="AD">管理者</MenuItem>
              <MenuItem value="ED">編集者</MenuItem>
              <MenuItem value="VI">閲覧のみ</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)} disabled={adding}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={handleAddMember}
              disabled={adding || !newMemberEmail.trim()}
            >
              {adding ? '追加中...' : '追加'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* メンバー削除確認ダイアログ */}
        <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
          <DialogTitle>メンバーを削除</DialogTitle>
          <DialogContent>
            <Typography>
              <strong>{deleteTarget?.email}</strong> をグループから削除しますか？
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
              キャンセル
            </Button>
            <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
              {deleting ? '削除中...' : '削除する'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 承認ロール選択ダイアログ */}
        <Dialog open={!!approveTarget} onClose={() => setApproveTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>申請を承認</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="body2">
                <strong>{approveTarget?.email}</strong> を承認します。
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  付与するロール
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as 'ED' | 'VI')}
                >
                  <MenuItem value="ED">編集者</MenuItem>
                  <MenuItem value="VI">閲覧のみ</MenuItem>
                </Select>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApproveTarget(null)} disabled={handlingRequestUid === approveTarget?.uid}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              disabled={handlingRequestUid === approveTarget?.uid}
              onClick={async () => {
                if (!approveTarget) return
                const target = approveTarget
                setApproveTarget(null)
                await handleApproveOrReject(target.uid, 'approve', approveRole)
              }}
            >
              {handlingRequestUid === approveTarget?.uid ? '処理中...' : '承認する'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* グループ削除 / 脱退 確認ダイアログ */}
        <Dialog open={groupDeleteDialogOpen} onClose={() => setGroupDeleteDialogOpen(false)}>
          {isGroupAdmin ? (
            <>
              <DialogTitle>グループを削除</DialogTitle>
              <DialogContent>
                <Typography>
                  グループ{' '}
                  <strong>
                    {group?.company_name}（{group?.company_id}）
                  </strong>{' '}
                  を削除しますか？
                  <br />
                  メンバーのグループ情報もすべてクリアされます。この操作は元に戻せません。
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setGroupDeleteDialogOpen(false)} disabled={groupDeleting}>
                  キャンセル
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={handleGroupDelete}
                  disabled={groupDeleting}
                >
                  {groupDeleting ? '削除中...' : '削除する'}
                </Button>
              </DialogActions>
            </>
          ) : (
            <>
              <DialogTitle>グループを脱退</DialogTitle>
              <DialogContent>
                <Typography>
                  グループ{' '}
                  <strong>
                    {group?.company_name}（{group?.company_id}）
                  </strong>{' '}
                  から脱退しますか？
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setGroupDeleteDialogOpen(false)} disabled={leavingGroup}>
                  キャンセル
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  disabled={leavingGroup}
                  onClick={async () => {
                    if (!myUid) return
                    setLeavingGroup(true)
                    setGroupDeleteDialogOpen(false)
                    const res = await removeGroupMember(company_id, myUid)
                    setLeavingGroup(false)
                    if (res && 'error' in (res as any)) {
                      setSnackbar({
                        open: true,
                        message: (res as any).error?.message ?? '脱退に失敗しました',
                        severity: 'error'
                      })
                    } else {
                      router.push('/account/group')
                    }
                  }}
                >
                  {leavingGroup ? '処理中...' : '脱退する'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </>
  )
}
