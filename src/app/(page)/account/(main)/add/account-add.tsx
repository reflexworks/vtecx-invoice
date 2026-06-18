'use client'
import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  CircularProgress,
  Chip
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupsIcon from '@mui/icons-material/Groups'
import { useRouter } from 'next/navigation'
import { postAccount, searchGroup } from '../fetcher'
import { email_regex, password_regexp } from '@/utils/checkutil'
import constant from '@/constants'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { useReCaptcha } from 'next-recaptcha-v3'
import { AccountForm } from '../account-form'
import VtecxApp from '@/typings'

type GroupAction = 'skip' | 'create' | 'join'

type AuthForm = {
  email: string
  password: string
  rePassword: string
}

type FormErrors = Partial<
  Record<keyof AuthForm | 'user_name' | 'company_name' | 'tel' | 'join_company_id', string>
>

const EMPTY_COMPANY: VtecxApp.Company = {
  company_name: '',
  zip_code: '',
  prefecture: '',
  city: '',
  address_line1: '',
  building_name: '',
  tel: ''
}

export default function AccountNew() {
  const router = useRouter()
  const { loaded, executeRecaptcha } = useReCaptcha()

  const [auth, setAuth] = useState<AuthForm>({ email: '', password: '', rePassword: '' })
  const [userName, setUserName] = useState('')
  const [company, setCompany] = useState<VtecxApp.Company>(EMPTY_COMPANY)
  const [bank, setBank] = useState<VtecxApp.Bank>({ bank_type: '1' })
  const [bankCode, setBankCode] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groupAction, setGroupAction] = useState<GroupAction>('skip')
  const [joinCompanyId, setJoinCompanyId] = useState('')
  const [groupLookupStatus, setGroupLookupStatus] = useState<
    'idle' | 'loading' | 'found' | 'notfound'
  >('idle')
  const [groupName, setGroupName] = useState('')
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const isDirty =
    auth.email !== '' ||
    auth.password !== '' ||
    auth.rePassword !== '' ||
    Object.values(company).some((v) => v !== '')

  const { confirmNavigation, ConfirmDialog } = useUnsavedChangesGuard(isDirty, 'add')

  const setAuthField = (field: keyof AuthForm, value: string) => {
    setAuth((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!email_regex.test(auth.email)) e.email = '有効なメールアドレスを入力してください'
    if (!userName.trim()) e.user_name = 'ユーザ名を入力してください'
    if (!password_regexp.test(auth.password)) e.password = constant.check_password_comment
    if (auth.password !== auth.rePassword) e.rePassword = 'パスワードが一致しません'
    if (groupAction === 'create') {
      if (!company.company_name?.trim()) e.company_name = '企業名を入力してください'
      if (!company.tel?.trim()) e.tel = '電話番号を入力してください'
    }
    if (groupAction === 'join') {
      if (!joinCompanyId.trim()) e.join_company_id = 'グループIDを入力してください'
      else if (groupLookupStatus !== 'found')
        e.join_company_id = '「検索」ボタンでグループを確認してください'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLookupGroup = async () => {
    if (!joinCompanyId.trim()) return
    setGroupLookupStatus('loading')
    setGroupName('')
    const res = await searchGroup(joinCompanyId.trim())
    if (res && !('error' in (res as any))) {
      const entries = Array.isArray(res) ? res : ((res as any)?.feed?.entry ?? [])
      const entry = entries[0]
      if (entry) {
        setGroupName(entry.title ?? entry.company_group?.company_id ?? joinCompanyId)
        setGroupLookupStatus('found')
        setErrors((prev) => ({ ...prev, join_company_id: undefined }))
      } else {
        setGroupLookupStatus('notfound')
      }
    } else {
      setGroupLookupStatus('notfound')
    }
  }

  const handleFillDebug = () => {
    setAuth({
      email: 'morishita+2@virtual-tech.net',
      password: 'Test1234!!',
      rePassword: 'Test1234!!'
    })
    setCompany({
      company_name: 'テスト株式会社',
      zip_code: '1600022',
      prefecture: '東京都',
      city: '新宿区新宿',
      address_line1: '1-2-3',
      building_name: 'テストビル 5F',
      tel: '03-1234-5678'
    })
  }

  const handleSave = async () => {
    if (!validate()) return
    if (!loaded || !executeRecaptcha) {
      setSnackbar({
        open: true,
        message: '認証システムの準備ができていません。少し待ってから再度お試しください。',
        severity: 'error'
      })
      return
    }
    setIsSubmitting(true)
    try {
      const reCaptchaToken = await executeRecaptcha('adduser')
      if (!reCaptchaToken) throw new Error('reCAPTCHA トークンの生成に失敗しました')
      const result = await postAccount(
        { company: { ...company, email: auth.email }, bank, user: { user_name: userName.trim() } },
        reCaptchaToken,
        auth.password,
        groupAction,
        groupAction === 'join' ? joinCompanyId.trim() : undefined
      )
      if (result && 'error' in (result as any)) {
        const errorResult = result as any
        setSnackbar({
          open: true,
          message: errorResult.error?.message || '登録に失敗しました',
          severity: 'error'
        })
      } else {
        setSnackbar({ open: true, message: 'アカウントを登録しました', severity: 'success' })
        setTimeout(() => router.push('/account'), 3000)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setSnackbar({
        open: true,
        message: '通信エラーが発生しました。時間を置いて再度お試しください。',
        severity: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
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
        <Button
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          onClick={() => confirmNavigation(() => router.back())}
          sx={{ bgcolor: 'white' }}
        >
          一覧に戻る
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="secondary" onClick={handleFillDebug}>
            デバッグ入力
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSubmitting}
            sx={{ px: 4, fontWeight: 'bold' }}
          >
            {isSubmitting ? '登録中...' : '登録する'}
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
          アカウント登録
        </Typography>
        <AccountForm
          mode="add"
          email={auth.email}
          onEmailChange={(v) => setAuthField('email', v)}
          emailError={errors.email}
          userName={userName}
          onUserNameChange={(v) => {
            setUserName(v)
            if (errors.user_name) setErrors((prev) => ({ ...prev, user_name: undefined }))
          }}
          userNameError={errors.user_name}
          password={auth.password}
          onPasswordChange={(v) => setAuthField('password', v)}
          passwordError={errors.password}
          onPasswordBlur={() => {
            if (auth.rePassword && auth.password !== auth.rePassword) {
              setErrors((prev) => ({ ...prev, rePassword: 'パスワードが一致しません' }))
            } else {
              setErrors((prev) => ({ ...prev, rePassword: undefined }))
            }
          }}
          passwordMismatch={!!errors.rePassword}
          rePassword={auth.rePassword}
          onRePasswordChange={(v) => setAuthField('rePassword', v)}
          rePasswordError={errors.rePassword}
          onRePasswordBlur={() => {
            if (auth.rePassword && auth.password !== auth.rePassword) {
              setErrors((prev) => ({ ...prev, rePassword: 'パスワードが一致しません' }))
            } else {
              setErrors((prev) => ({ ...prev, rePassword: undefined }))
            }
          }}
          company={company}
          setCompany={setCompany}
          companyNameError={errors.company_name}
          telError={errors.tel}
          bank={bank}
          setBank={setBank}
          bankCode={bankCode}
          setBankCode={setBankCode}
          hideCompanyBank={groupAction === 'skip' || groupAction === 'join'}
          afterAccountInfo={
            <>
              {/* グループ設定 */}
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
              <Box sx={{ px: 1, mb: 1 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                    このアカウントをグループに関連付けますか？
                  </FormLabel>
                  <RadioGroup
                    value={groupAction}
                    onChange={(e) => {
                      setGroupAction(e.target.value as GroupAction)
                      setGroupLookupStatus('idle')
                      setGroupName('')
                      setErrors((prev) => ({ ...prev, join_company_id: undefined }))
                    }}
                  >
                    <FormControlLabel
                      value="skip"
                      control={<Radio size="small" />}
                      label="スキップ（後で設定）"
                    />
                    <FormControlLabel
                      value="create"
                      control={<Radio size="small" />}
                      label="新規グループの作成する（このユーザーがグループ管理者になります）"
                    />
                    <FormControlLabel
                      value="join"
                      control={<Radio size="small" />}
                      label="既存グループに参加する"
                    />
                  </RadioGroup>
                </FormControl>

                {groupAction === 'join' && (
                  <Box sx={{ mt: 2 }}>
                    {groupLookupStatus !== 'found' ? (
                      // 検索前：グループID入力フォーム
                      <Box
                        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}
                      >
                        <TextField
                          label="グループID"
                          placeholder="C00001"
                          size="small"
                          value={joinCompanyId}
                          onChange={(e) => {
                            setJoinCompanyId(e.target.value)
                            setGroupLookupStatus('idle')
                            setGroupName('')
                            setErrors((prev) => ({ ...prev, join_company_id: undefined }))
                          }}
                          error={!!errors.join_company_id}
                          helperText={errors.join_company_id}
                          sx={{ width: 180 }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleLookupGroup}
                          disabled={groupLookupStatus === 'loading' || !joinCompanyId.trim()}
                          sx={{ mt: 0.5 }}
                        >
                          {groupLookupStatus === 'loading' ? (
                            <CircularProgress size={16} />
                          ) : (
                            '検索'
                          )}
                        </Button>
                        {groupLookupStatus === 'notfound' && (
                          <Chip
                            label="グループが見つかりません"
                            color="error"
                            size="small"
                            sx={{ mt: 0.75 }}
                          />
                        )}
                      </Box>
                    ) : (
                      // 検索済み：グループ名を読み取り専用で表示
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
                      >
                        <Chip
                          label={joinCompanyId}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <TextField
                          label="参加グループ名"
                          size="small"
                          value={groupName}
                          disabled
                          sx={{ width: 280 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setGroupLookupStatus('idle')
                            setGroupName('')
                            setJoinCompanyId('')
                            setErrors((prev) => ({ ...prev, join_company_id: undefined }))
                          }}
                        >
                          変更
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {groupAction === 'create' && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      グループIDが自動発番されます。登録後に確認できます。
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          }
        />
      </Paper>
    </Box>
  )
}
