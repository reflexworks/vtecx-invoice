'use client'
import { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { getBankList, getBranchList } from '@/utils/bank-util'
import constant from '@/constants'
import { CompanyForm } from './company-form'

function SectionHeader({ label }: { label: string }) {
  return (
    <Box sx={{ bgcolor: '#d1e9ff', p: 0.5, px: 2, mb: 2, mt: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
    </Box>
  )
}

type AccountFormProps = {
  mode: 'add' | 'edit'
  // アカウント情報
  email: string
  onEmailChange?: (v: string) => void
  emailError?: string
  userName?: string
  onUserNameChange?: (v: string) => void
  userNameError?: string
  // パスワード（登録時のみ）
  password?: string
  onPasswordChange?: (v: string) => void
  passwordError?: string
  rePassword?: string
  onRePasswordChange?: (v: string) => void
  rePasswordError?: string
  onRePasswordBlur?: () => void
  onPasswordBlur?: () => void
  passwordMismatch?: boolean
  // 企業情報
  company: VtecxApp.Company
  setCompany: React.Dispatch<React.SetStateAction<VtecxApp.Company>>
  companyNameError?: string
  telError?: string
  // 振込先情報（編集時のみ：デフォルト口座名表示 + 一覧リンク）
  defaultBankLabel?: string
  defaultBank?: VtecxApp.Bank
  onGoBankList?: () => void
  // 振込先情報（追加時のみ）
  bank?: VtecxApp.Bank
  setBank?: React.Dispatch<React.SetStateAction<VtecxApp.Bank>>
  bankCode?: string
  setBankCode?: (code: string) => void
  // アカウント情報と企業情報の間に挿入するコンテンツ（追加時のみ）
  afterAccountInfo?: React.ReactNode
  // trueのとき企業情報・口座情報セクションを非表示
  hideCompanyBank?: boolean
}

export function AccountForm({
  mode,
  email,
  onEmailChange,
  emailError,
  userName,
  onUserNameChange,
  userNameError,
  password,
  onPasswordChange,
  passwordError,
  rePassword,
  onRePasswordChange,
  rePasswordError,
  onRePasswordBlur,
  onPasswordBlur,
  passwordMismatch = false,
  company,
  setCompany,
  companyNameError,
  telError,
  defaultBankLabel,
  defaultBank,
  onGoBankList,
  bank,
  setBank,
  bankCode,
  setBankCode,
  afterAccountInfo,
  hideCompanyBank = false
}: AccountFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showRePassword, setShowRePassword] = useState(false)

  return (
    <>
      {/* --- アカウント情報 --- */}
      <SectionHeader label="アカウント情報" />
      <Grid container spacing={3}>
        <Grid size={12}>
          <TextField
            label="メールアドレス"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => onEmailChange?.(e.target.value)}
            disabled={!onEmailChange}
            error={!!emailError}
            helperText={emailError}
            slotProps={mode === 'edit'
              ? { inputLabel: { shrink: true }, htmlInput: { autoComplete: 'new-password', name: 'account-email' } }
              : { htmlInput: { autoComplete: 'new-password', name: 'account-email' } }}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="ユーザ名"
            fullWidth
            value={userName ?? ''}
            onChange={(e) => onUserNameChange?.(e.target.value)}
            disabled={!onUserNameChange}
            error={!!userNameError}
            helperText={userNameError}
            slotProps={mode === 'edit'
              ? { inputLabel: { shrink: true }, htmlInput: { autoComplete: 'new-password', name: 'account-username' } }
              : { htmlInput: { autoComplete: 'new-password', name: 'account-username' } }}
          />
        </Grid>
        {mode === 'add' && (
          <>
            <Grid size={12}>
              <TextField
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password ?? ''}
                onChange={(e) => onPasswordChange?.(e.target.value)}
                onBlur={onPasswordBlur}
                error={!!passwordError || passwordMismatch}
                helperText={passwordError ?? constant.check_password_comment}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="パスワード（確認）"
                type={showRePassword ? 'text' : 'password'}
                fullWidth
                value={rePassword ?? ''}
                onChange={(e) => onRePasswordChange?.(e.target.value)}
                onBlur={onRePasswordBlur}
                error={!!rePasswordError}
                helperText={rePasswordError}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowRePassword(!showRePassword)} edge="end">
                          {showRePassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>
          </>
        )}
      </Grid>

      {afterAccountInfo}

      {/* --- 企業情報・口座情報（グループ未設定時は非表示） --- */}
      {!hideCompanyBank && (
        <>
          <SectionHeader label="企業情報" />
          <CompanyForm
            company={company}
            setCompany={setCompany}
            companyNameError={companyNameError}
            telError={telError}
          />

          {/* --- 振込先情報 --- */}
          <SectionHeader label="振込先情報" />
          {mode === 'edit' ? (
            <Grid container spacing={3}>
              <Grid size={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    デフォルト口座:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {defaultBankLabel ?? '未設定'}
                  </Typography>
                  <Button variant="outlined" size="small" onClick={onGoBankList}>
                    口座一覧へ
                  </Button>
                </Box>
              </Grid>
              {defaultBank && (
                <>
                  <Grid size={6}>
                    <TextField
                      variant="standard"
                      label="銀行名"
                      fullWidth
                      value={defaultBank.bank_title ?? ''}
                      disabled
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      variant="standard"
                      label="支店名"
                      fullWidth
                      value={
                        defaultBank.branch_name
                          ? `${defaultBank.branch_name}（${defaultBank.branch_code}）`
                          : ''
                      }
                      disabled
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      variant="standard"
                      label="口座種別"
                      fullWidth
                      value={defaultBank.bank_type === '2' ? '当座' : '普通'}
                      disabled
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={8}>
                    <TextField
                      variant="standard"
                      label="口座番号"
                      fullWidth
                      value={defaultBank.bank_number ?? ''}
                      disabled
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      variant="standard"
                      label="口座名義"
                      fullWidth
                      value={defaultBank.bank_name ?? ''}
                      disabled
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              <Grid size={12}>
                <Autocomplete
                  options={getBankList()}
                  getOptionLabel={(option) => `${option.name} (${option.code})`}
                  value={getBankList().find((b) => b.name === bank?.bank_title) ?? null}
                  onChange={(_, newValue) => {
                    setBank?.((prev) => ({
                      ...prev,
                      bank_title: newValue?.name ?? '',
                      bank_code: newValue?.code ?? '',
                      branch_name: '',
                      branch_code: ''
                    }))
                    setBankCode?.(newValue?.code ?? '')
                  }}
                  renderInput={(params) => <TextField {...params} label="銀行名" />}
                />
              </Grid>
              <Grid size={12}>
                <Autocomplete
                  options={bankCode ? getBranchList(bankCode) : []}
                  getOptionLabel={(option) => `${option.name} (${option.code})`}
                  value={
                    bankCode
                      ? (getBranchList(bankCode).find((b) => b.name === bank?.branch_name) ?? null)
                      : null
                  }
                  disabled={!bankCode}
                  onChange={(_, newValue) => {
                    setBank?.((prev) => ({
                      ...prev,
                      branch_name: newValue?.name ?? '',
                      branch_code: newValue?.code ?? ''
                    }))
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="支店名"
                      placeholder={!bankCode ? '銀行を選択してください' : ''}
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <FormControl fullWidth>
                  <InputLabel>口座種別</InputLabel>
                  <Select
                    label="口座種別"
                    value={bank?.bank_type ?? '1'}
                    onChange={(e) => setBank?.((prev) => ({ ...prev, bank_type: e.target.value }))}
                  >
                    <MenuItem value="1">普通</MenuItem>
                    <MenuItem value="2">当座</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <TextField
                  label="口座番号"
                  fullWidth
                  value={bank?.bank_number ?? ''}
                  onChange={(e) => setBank?.((prev) => ({ ...prev, bank_number: e.target.value }))}
                  slotProps={{
                    htmlInput: { maxLength: 7, pattern: '[0-9]*', inputMode: 'numeric' }
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="口座名義"
                  fullWidth
                  placeholder="カ）バーチャルテクノロジー"
                  value={bank?.bank_name ?? ''}
                  onChange={(e) => setBank?.((prev) => ({ ...prev, bank_name: e.target.value }))}
                />
              </Grid>
            </Grid>
          )}
        </>
      )}
    </>
  )
}
