'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import { useRouter, useParams } from 'next/navigation'
import * as browserutil from '@/utils/browserutil'
import { toNumericString, toSafeNumber, formatBankTitle } from '@/utils/datautil'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { ja } from 'date-fns/locale'
import { format, lastDayOfMonth, addMonths, setDate } from 'date-fns'

type ErrorState = {
  customer_name?: string
  subject?: string
  records?: { [key: number]: { description?: string; quantity?: string; unit_price?: string } }
}

type RecordItem = {
  record_code: string
  description: string
  quantity: number | string
  unit: string
  unit_price: number | string
  tax_rate: number // 10, 8, or 0
}

type InvoiceData = {
  invoice: {
    invoice_code: string
    customer_code: string
    customer_name: string
    subject: string
    issue_date: string
    due_date: string
    status: string
    remarks: string
    [key: string]: any
  }
  bank: BankFormData
  company: VtecxApp.Company
  record: RecordItem[]
}

type BankFormData = Omit<VtecxApp.Bank, 'due_date'> & {
  due_date: Date | null
}

const DEFAULT_RECORD: RecordItem = {
  record_code: 'REC-01',
  description: '',
  quantity: 0,
  unit: '式',
  unit_price: 0,
  tax_rate: 10
}

const DEFAULT_BANK: BankFormData = {
  bank_title: '',
  branch_name: '',
  bank_type: '普通',
  bank_number: '',
  bank_name: '',
  due_date: null
}

const DEFAULT_COMPANY: VtecxApp.Company = {
  email: '',
  company_name: '',
  zip_code: '',
  prefecture: '',
  city: '',
  address_line1: '',
  building_name: '',
  tel: ''
}

const DEFAULT_DATA: InvoiceData = {
  invoice: {
    invoice_code: '',
    customer_code: '',
    customer_name: '',
    subject: '',
    issue_date: '',
    due_date: '',
    status: 'draft',
    remarks: ''
  },
  bank: { ...DEFAULT_BANK },
  company: { ...DEFAULT_COMPANY },
  record: [{ ...DEFAULT_RECORD }]
}

type Props = {
  initialData?: InvoiceData
  initialCompany?: VtecxApp.Company
  initialCustomerName?: string
  isLoading?: boolean
  invoiceNo?: string
  imageUid?: string
  onSave: (entry: VtecxApp.Entry) => Promise<any>
  onDownloadPdf?: () => Promise<any>
  backPath?: string
  readOnly?: boolean
}

export default function InvoiceForm({
  initialData,
  initialCompany,
  initialCustomerName,
  isLoading = false,
  invoiceNo,
  imageUid,
  onSave,
  backPath,
  onDownloadPdf,
  readOnly = false
}: Props) {
  const router = useRouter()
  const params = useParams()
  const uid = params?.uid as string
  const isComposingRef = useRef(false)

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({ open: false, message: '', severity: 'success' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false)
  const { confirmNavigation, ConfirmDialog } = useUnsavedChangesGuard(isDirty, 'edit')
  const [data, setData] = useState<InvoiceData>(DEFAULT_DATA)
  const [errors, setErrors] = useState<ErrorState>({})
  const [logoError, setLogoError] = useState(false)
  const [stampError, setStampError] = useState(false)

  useEffect(() => {
    setLogoError(false)
    setStampError(false)
  }, [imageUid])
  const [bankMasterList, setBankMasterList] = useState<VtecxApp.Bank[]>([])
  const [selectedBankMasterCode, setSelectedBankMasterCode] = useState<string>('')

  // 振込先マスタ一覧取得
  useEffect(() => {
    const params = imageUid ? `company_id=${imageUid}` : ''
    browserutil
      .requestApi('GET', 'bank', params)
      .then((res: any) => {
        const entries: VtecxApp.Entry[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
        const list = entries.map((e: any) => e.bank as VtecxApp.Bank).filter(Boolean)
        setBankMasterList(list)
        // デフォルト口座を初期選択（initialDataがない新規作成時のみ）
        if (!initialData) {
          const defaultBank = list.find((b) => b.is_default)
          if (defaultBank?.bank_code) {
            setSelectedBankMasterCode(defaultBank.bank_code)
            setData((prev) => ({
              ...prev,
              bank: {
                ...DEFAULT_BANK,
                bank_code: defaultBank.bank_code,
                bank_title: defaultBank.bank_title ?? '',
                branch_code: defaultBank.branch_code ?? '',
                branch_name: defaultBank.branch_name ?? '',
                bank_type: defaultBank.bank_type ?? '1',
                bank_number: defaultBank.bank_number ?? '',
                bank_name: defaultBank.bank_name ?? '',
                due_date: null
              }
            }))
          }
        } else {
          // 編集時: bank_codeで一致するものを選択
          const masterCode = (initialData.bank as any)?.bank_code
          if (masterCode) setSelectedBankMasterCode(masterCode)
        }
      })
      .catch(() => {})
  }, [imageUid])

  useEffect(() => {
    if (initialData) {
      const rawDueDate = initialData.bank?.due_date
      let dueDateObj: Date | null = null
      if (rawDueDate) {
        const s = String(rawDueDate)
        dueDateObj = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`)
      }
      const normalized = {
        ...initialData,
        bank: { ...DEFAULT_BANK, ...initialData.bank, due_date: dueDateObj },
        record: initialData.record.map((r) => ({ ...r, tax_rate: r.tax_rate != null ? r.tax_rate : 0 }))
      }
      setData(normalized)
      setIsDirty(false)
    } else {
      setData((prev) => ({
        ...prev,
        invoice: {
          ...prev.invoice,
          issue_date: new Date().toISOString().split('T')[0],
          ...(initialCustomerName ? { customer_name: initialCustomerName } : {})
        },
        ...(initialCompany ? { company: { ...DEFAULT_COMPANY, ...initialCompany } } : {})
      }))
    }
  }, [initialData, initialCompany, initialCustomerName])

  const handleBankMasterSelect = (bankCode: string) => {
    setIsDirty(true)
    setSelectedBankMasterCode(bankCode)
    const selected = bankMasterList.find((b) => b.bank_code === bankCode)
    if (selected) {
      setData((prev) => ({
        ...prev,
        bank: {
          ...prev.bank,
          bank_code: selected.bank_code,
          bank_title: selected.bank_title ?? '',
          branch_code: selected.branch_code ?? '',
          branch_name: selected.branch_name ?? '',
          bank_type: selected.bank_type ?? '1',
          bank_number: selected.bank_number ?? '',
          bank_name: selected.bank_name ?? ''
        }
      }))
    }
  }

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }))

  const totals = useMemo(() => {
    let subTotal10 = 0
    let subTotal8 = 0
    let subTotal0 = 0
    data.record.forEach((r) => {
      const amount = toSafeNumber(r.quantity) * toSafeNumber(r.unit_price)
      if (r.tax_rate === 8) {
        subTotal8 += amount
      } else if (r.tax_rate === 0) {
        subTotal0 += amount
      } else {
        subTotal10 += amount
      }
    })
    const tax10 = Math.floor(subTotal10 * 0.1)
    const tax8 = Math.floor(subTotal8 * 0.08)
    const subTotal = subTotal10 + subTotal8 + subTotal0
    const taxAmount = tax10 + tax8
    return {
      subTotal,
      subTotal10,
      subTotal8,
      tax10,
      tax8,
      taxAmount,
      totalAmount: subTotal + taxAmount
    }
  }, [data.record])

  const handleInvoiceChange = (field: string, value: string) => {
    setIsDirty(true)
    setData((prev) => ({ ...prev, invoice: { ...prev.invoice, [field]: value } }))
  }

  const setCalculatedDate = (type: 'next_end' | 'two_next_end' | 'next_15') => {
    setIsDirty(true)
    const now = new Date()
    let targetDate: Date
    switch (type) {
      case 'next_end':
        targetDate = lastDayOfMonth(addMonths(now, 1))
        break
      case 'two_next_end':
        targetDate = lastDayOfMonth(addMonths(now, 2))
        break
      case 'next_15':
        targetDate = setDate(addMonths(now, 1), 15)
        break
      default:
        return
    }
    setData((prev) => ({ ...prev, bank: { ...prev.bank, due_date: targetDate } }))
  }

  const formatIssueDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}/${m}/${day}`
  }

  const handleRecordChange = (index: number, field: string, value: string | number) => {
    setIsDirty(true)
    const newRecords = [...data.record]
    const newValue = field === 'tax_rate' ? Number(value) : value
    newRecords[index] = { ...newRecords[index], [field]: newValue }
    setData((prev) => ({ ...prev, record: newRecords }))

    if (errors.records?.[index]?.[field as keyof (typeof errors.records)[number]]) {
      setErrors((prev) => {
        const newRecordsErrors = { ...prev.records }
        const updatedRowErrors = { ...newRecordsErrors[index] }
        delete (updatedRowErrors as any)[field]
        if (Object.keys(updatedRowErrors).length === 0) {
          delete newRecordsErrors[index]
        } else {
          newRecordsErrors[index] = updatedRowErrors
        }
        return { ...prev, records: newRecordsErrors }
      })
    }
  }

  const removeRow = (index: number) => {
    if (data.record.length <= 1) return
    setIsDirty(true)
    setData((prev) => ({ ...prev, record: prev.record.filter((_, i) => i !== index) }))
  }

  const addRow = () => {
    setIsDirty(true)
    setData((prev) => ({
      ...prev,
      record: [
        ...prev.record,
        {
          record_code: `REC-0${prev.record.length + 1}`,
          description: '',
          quantity: 0,
          unit: '式',
          unit_price: 0,
          tax_rate: 10
        }
      ]
    }))
  }

  const handleSave = async () => {
    const newErrors: ErrorState = {}
    const { invoice, record } = data

    if (!invoice.customer_name.trim()) {
      newErrors.customer_name = '宛名を入力してください'
    }

    const recordErrors: { [key: number]: any } = {}
    record.forEach((item, index) => {
      const rowErrors: any = {}
      if (!item.description.trim()) rowErrors.description = '品名を入力してください'
      if (Object.keys(rowErrors).length > 0) recordErrors[index] = rowErrors
    })

    if (Object.keys(recordErrors).length > 0) newErrors.records = recordErrors
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      setSnackbar({
        open: true,
        message: '入力内容に不備があります。赤枠の箇所を確認してください。',
        severity: 'error'
      })
      return
    }

    const { due_date: dueDateObj, ...bankRest } = data.bank
    const entry: VtecxApp.Entry = {
      ...data,
      invoice: {
        ...data.invoice,
        issue_date: data.invoice.issue_date
          ? Number(format(new Date(data.invoice.issue_date), 'yyyyMMdd'))
          : undefined,
        due_date: dueDateObj ? Number(format(dueDateObj, 'yyyyMMdd')) : undefined,
        sub_total: totals.subTotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount
      },
      bank: {
        ...bankRest
      },
      company: { ...data.company },
      record: data.record.map((r) => ({
        ...r,
        quantity: toSafeNumber(r.quantity),
        unit_price: toSafeNumber(r.unit_price),
        tax_rate: r.tax_rate
      }))
    }

    setIsSubmitting(true)
    const result = await onSave(entry)

    if (result && 'error' in result) {
      setIsSubmitting(false)
      setSnackbar({
        open: true,
        message: result.error.message || '保存に失敗しました',
        severity: 'error'
      })
    } else {
      setIsDirty(false)
      setSnackbar({ open: true, message: '請求書を正常に保存しました！', severity: 'success' })
      setTimeout(() => router.push(`/${uid}/invoice`), 1000)
    }
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%', boxShadow: 3 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {ConfirmDialog}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          onClick={() =>
            confirmNavigation(() => (backPath ? router.push(backPath) : router.back()))
          }
          sx={{ bgcolor: 'white' }}
        >
          一覧に戻る
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {onDownloadPdf && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => isDirty ? setPdfConfirmOpen(true) : onDownloadPdf()}
              disabled={isSubmitting}
            >
              PDFダウンロード
            </Button>
          )}
          {!readOnly && (
            <Button
              variant="contained"
              color="primary"
              sx={{ px: 4 }}
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : '保存する'}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ position: 'relative' }}>
        {(isLoading || isSubmitting) && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255,255,255,0.6)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Paper sx={{ p: 6, borderRadius: 2, minHeight: '100%' }}>
          <Typography
            variant="h4"
            align="center"
            sx={{ fontWeight: 'bold', mb: 6, letterSpacing: 8 }}
          >
            御 請 求 書
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    borderBottom: '1px solid #000',
                    mb: 1,
                    width: '100%' // 親の幅いっぱいに広げる
                  }}
                >
                  <TextField
                    variant="standard"
                    value={data.invoice.customer_name}
                    onChange={(e) => {
                      handleInvoiceChange('customer_name', e.target.value)
                      if (errors.customer_name) setErrors({ ...errors, customer_name: undefined })
                    }}
                    error={!!errors.customer_name}
                    helperText={errors.customer_name}
                    disabled={readOnly}
                    sx={{ flexGrow: 1 }}
                    InputProps={{
                      sx: {
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        '& input': { pb: 0.5 }
                      },
                      disableUnderline: true
                    }}
                  />

                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 'bold',
                      ml: 1, // 宛名との間に最低限の余白を作る
                      whiteSpace: 'nowrap' // 改行を防ぐ
                    }}
                  >
                    御中
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #000',
                    mt: 4,
                    py: 1
                  }}
                >
                  <Typography sx={{ whiteSpace: 'nowrap', mr: 2 }}>件 名 :</Typography>
                  <TextField
                    fullWidth
                    variant="standard"
                    value={data.invoice.subject}
                    onChange={(e) => handleInvoiceChange('subject', e.target.value)}
                    disabled={readOnly}
                    InputProps={{ disableUnderline: true }}
                  />
                </Box>

                <Typography sx={{ mt: 6 }}>下記の通り御請求申し上げます。</Typography>

                <Box
                  sx={{
                    mt: 2,
                    display: 'flex',
                    alignItems: 'baseline',
                    borderBottom: '2px solid #000',
                    pb: 0.5
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    御請求金額：
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 'bold', flexGrow: 1, textAlign: 'right' }}
                  >
                    ¥ {totals.totalAmount.toLocaleString()}-
                  </Typography>
                </Box>
                <Box sx={{ mt: 2, p: 1.5, border: '1px solid #000', maxWidth: 680 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}
                  >
                    【振込先】
                  </Typography>
                  {/* 振込先選択ドロップダウン */}
                  <Box sx={{ mb: 1 }}>
                    <FormControl variant="standard" size="small" sx={{ minWidth: 280 }}>
                      <InputLabel>振込先を選択</InputLabel>
                      <Select
                        value={selectedBankMasterCode}
                        onChange={(e) => handleBankMasterSelect(e.target.value)}
                        label="振込先を選択"
                        disabled={readOnly}
                      >
                        <MenuItem value="">
                          <em>未選択</em>
                        </MenuItem>
                        {bankMasterList.map((b) => (
                          <MenuItem key={b.bank_code} value={b.bank_code ?? ''}>
                            {b.bank_label}
                            {b.is_default ? '（デフォルト）' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {/* 選択中の口座情報表示 */}
                  {selectedBankMasterCode && (
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1, pl: 0.5 }}
                    >
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          variant="standard"
                          label="銀行名"
                          value={formatBankTitle(data.bank.bank_title)}
                          size="small"
                          disabled
                          sx={{ width: 180 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                          variant="standard"
                          label="支店名"
                          value={
                            data.bank.branch_name
                              ? `${data.bank.branch_name}（${data.bank.branch_code}）`
                              : ''
                          }
                          size="small"
                          disabled
                          sx={{ width: 180 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          variant="standard"
                          label="口座種別"
                          value={data.bank.bank_type === '2' ? '当座' : '普通'}
                          size="small"
                          disabled
                          sx={{ width: 80 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <TextField
                          variant="standard"
                          label="口座番号"
                          value={data.bank.bank_number ?? ''}
                          size="small"
                          disabled
                          sx={{ width: 160 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Box>
                      <TextField
                        variant="standard"
                        label="口座名義"
                        value={data.bank.bank_name ?? ''}
                        size="small"
                        disabled
                        sx={{ width: 360 }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  )}
                  {/* 振込期日 */}
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                      振込期日
                    </Typography>
                    {!readOnly && (
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                        {(
                          [
                            { type: 'next_end', label: '翌月末' },
                            { type: 'two_next_end', label: '翌々月末' },
                            { type: 'next_15', label: '翌月15日' }
                          ] as const
                        ).map((item) => (
                          <Button
                            key={item.type}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem', py: 0.2 }}
                            onClick={() => setCalculatedDate(item.type)}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </Box>
                    )}
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                      <DatePicker
                        label="期日を選択"
                        format="yyyy年MM月dd日"
                        value={data.bank.due_date}
                        disabled={readOnly}
                        onChange={(newValue: Date | null) => {
                          setIsDirty(true)
                          setData((prev) => ({
                            ...prev,
                            bank: { ...prev.bank, due_date: newValue }
                          }))
                        }}
                        slotProps={{
                          textField: {
                            size: 'small',
                            variant: 'standard',
                            fullWidth: true,
                            placeholder: '日付を選択してください'
                          }
                        }}
                        sx={{ width: 200 }}
                      />
                    </LocalizationProvider>
                  </Box>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  position: 'relative'
                }}
              >
                {data.invoice.invoice_code && (
                  <Typography variant="body2">請求番号 : {data.invoice.invoice_code}</Typography>
                )}
                {data.company.registration_number && (
                  <Typography variant="body2">
                    登録番号 : {data.company.registration_number}
                  </Typography>
                )}

                <Typography variant="body2">
                  発行日 : {formatIssueDate(data.invoice.issue_date)}
                </Typography>
                {data.invoice.customer_code && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    顧客番号 : {data.invoice.customer_code}
                  </Typography>
                )}
                {imageUid && !logoError && (
                  <Box sx={{ mb: 1, mt: 2 }}>
                    <img
                      src={`/api/upload-image?uid=${encodeURIComponent(imageUid)}&type=logo`}
                      alt="ロゴ"
                      style={{ maxWidth: 200, maxHeight: 60, objectFit: 'contain' }}
                      onError={() => setLogoError(true)}
                    />
                  </Box>
                )}
                <Typography variant="caption" display="block">
                  {data.company.company_name}
                </Typography>
                <Typography variant="caption">
                  〒{data.company.zip_code?.replace(/^(\d{3})(\d{4})$/, '$1-$2')}
                </Typography>
                <Typography variant="caption">
                  {data.company.prefecture}
                  {data.company.city}
                  {data.company.address_line1}
                </Typography>
                <Typography variant="caption">{data.company.building_name}</Typography>
                <Typography variant="caption">{`TEL : ${data.company.tel}`}</Typography>

                {imageUid && !stampError && (
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={`/api/upload-image?uid=${encodeURIComponent(imageUid)}&type=stamp`}
                      alt="角印"
                      style={{ width: 60, height: 60, objectFit: 'contain' }}
                      onError={() => setStampError(true)}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          <TableContainer
            sx={{
              mt: 6,
              border: '1px solid #e0e0e0',
              maxHeight: 400,
              overflowY: 'auto',
              scrollbarGutter: 'stable'
            }}
          >
            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: 330 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 50 }} />
              </colgroup>
              <TableHead sx={{ bgcolor: '#f0f7ff' }}>
                <TableRow>
                  <TableCell align="center" sx={{ width: 40 }}>
                    No
                  </TableCell>
                  <TableCell sx={{ width: 330 }}>品名</TableCell>
                  <TableCell align="center" sx={{ width: 60 }}>
                    数量
                  </TableCell>
                  <TableCell align="center" sx={{ width: 90 }}>
                    単位
                  </TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    単価（税抜）
                  </TableCell>
                  <TableCell align="center" sx={{ width: 90 }}>
                    税率
                  </TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    金額（税抜）
                  </TableCell>
                  <TableCell align="center" sx={{ width: 50 }}>
                    削除
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.record.map((item, index) => {
                  const rowErrors = errors.records?.[index]
                  const amount = toSafeNumber(item.quantity) * toSafeNumber(item.unit_price)
                  return (
                    <TableRow key={index}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          variant="standard"
                          value={item.description}
                          onChange={(e) => handleRecordChange(index, 'description', e.target.value)}
                          error={!!rowErrors?.description}
                          helperText={rowErrors?.description}
                          disabled={readOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="text"
                          variant="standard"
                          value={item.quantity ?? ''}
                          onChange={(e) =>
                            handleRecordChange(
                              index,
                              'quantity',
                              isComposingRef.current
                                ? e.target.value
                                : toNumericString(e.target.value)
                            )
                          }
                          onCompositionStart={() => { isComposingRef.current = true }}
                          onCompositionEnd={(e) => {
                            isComposingRef.current = false
                            handleRecordChange(index, 'quantity', toNumericString((e.target as HTMLInputElement).value))
                          }}
                          inputProps={{ style: { textAlign: 'center' }, inputMode: 'numeric' }}
                          disabled={readOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          variant="standard"
                          value={item.unit ?? ''}
                          onChange={(e) => handleRecordChange(index, 'unit', e.target.value)}
                          inputProps={{ style: { textAlign: 'center' } }}
                          disabled={readOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="text"
                          variant="standard"
                          value={item.unit_price ?? ''}
                          onChange={(e) =>
                            handleRecordChange(
                              index,
                              'unit_price',
                              isComposingRef.current
                                ? e.target.value
                                : toNumericString(e.target.value)
                            )
                          }
                          onCompositionStart={() => { isComposingRef.current = true }}
                          onCompositionEnd={(e) => {
                            isComposingRef.current = false
                            handleRecordChange(index, 'unit_price', toNumericString((e.target as HTMLInputElement).value))
                          }}
                          inputProps={{ style: { textAlign: 'right' }, inputMode: 'numeric' }}
                          disabled={readOnly}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Select
                          variant="standard"
                          value={item.tax_rate}
                          onChange={(e) => handleRecordChange(index, 'tax_rate', Number(e.target.value))}
                          size="small"
                          sx={{ fontSize: '0.8rem' }}
                          disabled={readOnly}
                        >
                          <MenuItem value={10}>10%</MenuItem>
                          <MenuItem value={8}>8%</MenuItem>
                          <MenuItem value={0}>無し</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        {amount.toLocaleString()}
                      </TableCell>
                      <TableCell align="center">
                        {!readOnly && (
                          <Button
                            onClick={() => removeRow(index)}
                            color="error"
                            size="small"
                            disabled={data.record.length <= 1}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* 行追加 */}
                {!readOnly && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 1 }}>
                      <Button startIcon={<AddIcon />} onClick={addRow} size="small">
                        行を追加
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 小計/消費税/合計（常に表示） */}
          <Table
            size="small"
            sx={{ tableLayout: 'fixed', border: '1px solid #e0e0e0', borderTop: 'none' }}
          >
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 330 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 50 }} />
            </colgroup>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} align="right" sx={{ bgcolor: '#f5f5f5', border: 'none' }}>
                  小計
                </TableCell>
                <TableCell align="right">¥ {totals.subTotal.toLocaleString()}-</TableCell>
                <TableCell sx={{ border: 'none' }} />
              </TableRow>
              <TableRow>
                <TableCell colSpan={6} align="right" sx={{ bgcolor: '#f5f5f5', border: 'none' }}>
                  消費税
                </TableCell>
                <TableCell align="right">¥ {totals.taxAmount.toLocaleString()}-</TableCell>
                <TableCell sx={{ border: 'none' }} />
              </TableRow>
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="right"
                  sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold', border: 'none' }}
                >
                  御請求金額
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ¥ {totals.totalAmount.toLocaleString()}-
                </TableCell>
                <TableCell sx={{ border: 'none' }} />
              </TableRow>
            </TableBody>
          </Table>

          {/* 税率区分サマリー */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ※は軽減税率対象です。
            </Typography>
            <Table size="small" sx={{ mt: 1, width: 'auto', minWidth: 300 }}>
              <TableHead sx={{ bgcolor: '#f0f7ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>税率区分</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', py: 0.5 }}>
                    消費税
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', py: 0.5 }}>
                    金額（税抜）
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>10%対象</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    ¥{totals.tax10.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    ¥{totals.subTotal10.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>8%対象</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    ¥{totals.tax8.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    ¥{totals.subTotal8.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Box sx={{ bgcolor: '#d1e9ff', p: 0.5, px: 2, width: 'fit-content', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                備考
              </Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={data.invoice.remarks}
              onChange={(e) => handleInvoiceChange('remarks', e.target.value)}
              disabled={readOnly}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                bgcolor: '#f8f9fa',
                p: 1
              }}
            />
          </Box>
        </Paper>
      </Box>

      <Dialog open={pdfConfirmOpen} onClose={() => setPdfConfirmOpen(false)}>
        <DialogTitle>PDFダウンロードの確認</DialogTitle>
        <DialogContent>
          <Typography>
            変更内容が保存されていないため、古い情報のPDFが出力されます。
            <br />
            よろしいですか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ※変更内容を適用して出力したい場合は、「保存する」ボタンを押してからPDFダウンロードボタンを押してください。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfConfirmOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => { setPdfConfirmOpen(false); onDownloadPdf?.() }}
          >
            PDFダウンロード
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
