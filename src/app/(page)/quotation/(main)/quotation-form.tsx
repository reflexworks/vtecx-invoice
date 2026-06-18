'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  Autocomplete,
  Select,
  MenuItem,
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
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { ja } from 'date-fns/locale'
import { format } from 'date-fns'
import { toNumericString, toSafeNumber } from '@/utils/datautil'
import * as browserutil from '@/utils/browserutil'

type CustomerOption = {
  customer_code: string
  customer_name: string
  to_email: string
  cc_email: string
}

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

type QuotationData = {
  quotation: {
    quotation_code: string
    customer_name: string
    subject: string
    issue_date: string
    delivery_date: Date | null
    expiry_date: Date | null
    payment_terms: string
    status: string
    remarks: string
    [key: string]: any
  }
  company: VtecxApp.Company
  record: RecordItem[]
  customer?: CustomerOption
}

const UNIT_OPTIONS = ['式', '個', '台', '本', '枚', '冊', 'セット', '時間', '日', 'ヶ月']

const PAYMENT_TERMS_OPTIONS = [
  '月末締め翌月末払い',
  '月末締め翌月25日払い',
  '15日締め翌月末払い',
  '20日締め翌月10日払い',
  '納品後即日払い',
  '納品後7日以内',
  '納品後30日以内',
  '前払い',
  '注文時50%・納品時50%'
]

const DEFAULT_RECORD: RecordItem = {
  record_code: 'REC-01',
  description: '',
  quantity: 0,
  unit: '式',
  unit_price: 0,
  tax_rate: 10
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

const DEFAULT_DATA: QuotationData = {
  quotation: {
    quotation_code: '',
    customer_name: '',
    subject: '',
    issue_date: '',
    delivery_date: null,
    expiry_date: null,
    payment_terms: '',
    status: 'draft',
    remarks: ''
  },
  company: { ...DEFAULT_COMPANY },
  record: [{ ...DEFAULT_RECORD }]
}

type Props = {
  initialData?: QuotationData
  initialCompany?: VtecxApp.Company
  initialCustomerName?: string
  isLoading?: boolean
  quotationNo?: string
  imageUid?: string
  onSave: (entry: VtecxApp.Entry) => Promise<any>
  onDownloadPdf?: () => Promise<any>
  readOnly?: boolean
}

export default function QuotationForm({
  initialData,
  initialCompany,
  initialCustomerName,
  isLoading = false,
  imageUid,
  onSave,
  onDownloadPdf,
  readOnly = false
}: Props) {
  const router = useRouter()
  const params = useParams()
  const uid = params?.uid as string
  const isComposingRef = useRef(false)

  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const customerSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchCustomers = useCallback(async (name: string) => {
    if (!name.trim() || !imageUid) { setCustomerOptions([]); return }
    setCustomerSearching(true)
    try {
      const res = await browserutil.requestApi('GET', 'customer', `customer_name=${encodeURIComponent(name)}&company_id=${imageUid}`)
      const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ? (Array.isArray(res.feed.entry) ? res.feed.entry : [res.feed.entry]) : [])
      setCustomerOptions(entries.map((e: any) => e.customer).filter(Boolean))
    } catch {
      setCustomerOptions([])
    }
    setCustomerSearching(false)
  }, [imageUid])

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({ open: false, message: '', severity: 'success' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false)
  const [data, setData] = useState<QuotationData>(DEFAULT_DATA)
  const [errors, setErrors] = useState<ErrorState>({})
  const [logoError, setLogoError] = useState(false)
  const [stampError, setStampError] = useState(false)

  useEffect(() => {
    setLogoError(false)
    setStampError(false)
  }, [imageUid])

  useEffect(() => {
    if (initialData) {
      const strToDate = (s: any) => (s ? new Date(s) : null)
      setData({
        ...initialData,
        quotation: {
          ...initialData.quotation,
          delivery_date: strToDate(initialData.quotation.delivery_date),
          expiry_date: strToDate(initialData.quotation.expiry_date)
        },
        record: initialData.record.map((r) => ({
          ...r,
          unit: r.unit ?? '式',
          tax_rate: r.tax_rate != null ? r.tax_rate : 0
        }))
      })
    } else {
      setData((prev) => ({
        ...prev,
        quotation: {
          ...prev.quotation,
          issue_date: new Date().toISOString().split('T')[0],
          ...(initialCustomerName ? { customer_name: initialCustomerName } : {})
        },
        ...(initialCompany ? { company: { ...DEFAULT_COMPANY, ...initialCompany } } : {})
      }))
    }
  }, [initialData, initialCompany, initialCustomerName])

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }))

  const totals = useMemo(() => {
    let subTotal10 = 0
    let subTotal8 = 0
    let subTotal0 = 0
    data.record.forEach((r) => {
      const amount = toSafeNumber(r.quantity) * toSafeNumber(r.unit_price)
      if (r.tax_rate === 8) subTotal8 += amount
      else if (r.tax_rate === 0) subTotal0 += amount
      else subTotal10 += amount
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

  const handleQuotationChange = (field: string, value: string) => {
    setIsDirty(true)
    setData((prev) => ({ ...prev, quotation: { ...prev.quotation, [field]: value } }))
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
    const newRecords = [...data.record]
    let newValue: string | number
    if (field === 'tax_rate') {
      newValue = Number(value)
    } else {
      newValue = value
    }
    newRecords[index] = { ...newRecords[index], [field]: newValue }
    setIsDirty(true)
    setData((prev) => ({ ...prev, record: newRecords }))

    if (errors.records?.[index]?.[field as keyof (typeof errors.records)[number]]) {
      setErrors((prev) => {
        const newRecordsErrors = { ...prev.records }
        const updatedRowErrors = { ...newRecordsErrors[index] }
        delete (updatedRowErrors as any)[field]
        if (Object.keys(updatedRowErrors).length === 0) delete newRecordsErrors[index]
        else newRecordsErrors[index] = updatedRowErrors
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
    const { quotation, record } = data

    if (!quotation.customer_name.trim()) newErrors.customer_name = '宛名を入力してください'

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

    const dateToNum = (d: Date | string | null | undefined) =>
      d ? Number(format(typeof d === 'string' ? new Date(d) : d, 'yyyyMMdd')) : undefined

    const entry: VtecxApp.Entry = {
      quotation: {
        ...data.quotation,
        issue_date: dateToNum(data.quotation.issue_date),
        delivery_date: dateToNum(data.quotation.delivery_date),
        expiry_date: dateToNum(data.quotation.expiry_date),
        sub_total: totals.subTotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount
      },
      company: { ...data.company },
      record: data.record.map((r) => ({
        ...r,
        quantity: toSafeNumber(r.quantity),
        unit_price: toSafeNumber(r.unit_price),
        tax_rate: r.tax_rate
      })),
      ...(data.customer ? { customer: data.customer } : {})
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
      setSnackbar({ open: true, message: '見積書を正常に保存しました！', severity: 'success' })
      setTimeout(() => router.push(`/${uid}/quotation`), 1000)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => router.back()}
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
              見 積 書
            </Typography>

            <Grid container spacing={4}>
              {/* 左: 宛先・件名・金額・納期等 */}
              <Grid item xs={12} md={7}>
                <Box sx={{ mb: 4 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      borderBottom: '1px solid #000',
                      mb: 1,
                      width: '100%'
                    }}
                  >
                    <Autocomplete
                      freeSolo
                      options={customerOptions}
                      value={data.customer ?? data.quotation.customer_name}
                      getOptionLabel={(option) =>
                        typeof option === 'string' ? option : option.customer_name
                      }
                      isOptionEqualToValue={(option, value) =>
                        typeof value === 'string'
                          ? option.customer_name === value
                          : option.customer_code === value.customer_code
                      }
                      onChange={(_, newValue) => {
                        if (newValue && typeof newValue !== 'string') {
                          // ドロップダウンから顧客を選択
                          setData((prev) => ({
                            ...prev,
                            quotation: { ...prev.quotation, customer_name: newValue.customer_name },
                            customer: newValue
                          }))
                          setIsDirty(true)
                          if (errors.customer_name) setErrors({ ...errors, customer_name: undefined })
                        }
                      }}
                      onInputChange={(_, newValue, reason) => {
                        if (reason === 'reset') return
                        handleQuotationChange('customer_name', newValue)
                        // 手入力時は選択済み顧客をクリア
                        setData((prev) => ({ ...prev, customer: undefined }))
                        if (errors.customer_name) setErrors({ ...errors, customer_name: undefined })
                        if (customerSearchTimerRef.current) clearTimeout(customerSearchTimerRef.current)
                        customerSearchTimerRef.current = setTimeout(() => searchCustomers(newValue), 300)
                      }}
                      disabled={readOnly}
                      sx={{ flexGrow: 1 }}
                      renderInput={(acParams) => (
                        <TextField
                          {...acParams}
                          variant="standard"
                          error={!!errors.customer_name}
                          helperText={errors.customer_name}
                          InputProps={{
                            ...acParams.InputProps,
                            sx: { fontSize: '1.2rem', fontWeight: 'bold', '& input': { pb: 0.5 } },
                            disableUnderline: true,
                            endAdornment: customerSearching
                              ? <CircularProgress size={16} sx={{ mr: 1 }} />
                              : null
                          }}
                        />
                      )}
                    />
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 'bold', ml: 1, whiteSpace: 'nowrap' }}
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
                      value={data.quotation.subject}
                      onChange={(e) => handleQuotationChange('subject', e.target.value)}
                      disabled={readOnly}
                      InputProps={{ disableUnderline: true }}
                    />
                  </Box>

                  <Typography sx={{ mt: 6 }}>下記の通り、お見積り申し上げます。</Typography>

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
                      お見積り金額（税込）：
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 'bold', flexGrow: 1, textAlign: 'right' }}
                    >
                      ¥ {totals.totalAmount.toLocaleString()}-
                    </Typography>
                  </Box>

                  {/* 納期・支払条件・有効期限 */}
                  <Box sx={{ mt: 2, border: '1px solid #ccc', width: '75%' }}>
                    {(
                      [
                        { label: '納期', field: 'delivery_date' as const, isDate: true },
                        { label: '支払条件', field: 'payment_terms' as const, isDate: false },
                        { label: '有効期限', field: 'expiry_date' as const, isDate: true }
                      ] as const
                    ).map((row) => (
                      <Box
                        key={row.field}
                        sx={{
                          display: 'flex',
                          borderBottom: '1px solid #ccc',
                          '&:last-child': { borderBottom: 'none' }
                        }}
                      >
                        <Box
                          sx={{
                            width: 100,
                            bgcolor: '#f0f4ff',
                            display: 'flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 0.5,
                            flexShrink: 0
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {row.label}
                          </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1, px: 1, py: 0.5 }}>
                          {row.field === 'payment_terms' ? (
                            <Autocomplete
                              freeSolo
                              options={PAYMENT_TERMS_OPTIONS}
                              value={data.quotation.payment_terms}
                              onInputChange={(_, newValue, reason) => {
                              if (reason === 'reset') return
                              handleQuotationChange('payment_terms', newValue)
                            }}
                              disabled={readOnly}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  variant="standard"
                                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                                  inputProps={{ ...params.inputProps, style: { fontSize: 13 } }}
                                />
                              )}
                            />
                          ) : (
                            <DatePicker
                              format="yyyy/MM/dd"
                              value={data.quotation[row.field] as Date | null}
                              disabled={readOnly}
                              onChange={(newValue) =>
                                setData((prev) => ({
                                  ...prev,
                                  quotation: { ...prev.quotation, [row.field]: newValue }
                                }))
                              }
                              slotProps={{
                                textField: {
                                  variant: 'standard',
                                  fullWidth: true,
                                  slotProps: {
                                    input: { disableUnderline: true },
                                    htmlInput: { style: { fontSize: 13 } }
                                  }
                                }
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* 右: 見積日・番号・会社情報 */}
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
                  {data.quotation.quotation_code && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      見積番号 : {data.quotation.quotation_code}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    見積日 : {formatIssueDate(data.quotation.issue_date)}
                  </Typography>

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

            {/* 明細テーブル */}
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
                    <TableCell align="center">No</TableCell>
                    <TableCell>品名</TableCell>
                    <TableCell align="center">数量</TableCell>
                    <TableCell align="center">単位</TableCell>
                    <TableCell align="right">単価（税抜）</TableCell>
                    <TableCell align="center">税率</TableCell>
                    <TableCell align="right">金額（税抜）</TableCell>
                    <TableCell align="center">削除</TableCell>
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
                              handleRecordChange(index, 'quantity', isComposingRef.current ? e.target.value : toNumericString(e.target.value))
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
                          <Autocomplete
                            freeSolo
                            options={UNIT_OPTIONS}
                            value={item.unit}
                            onInputChange={(_, newValue, reason) => { if (reason === 'reset') return; handleRecordChange(index, 'unit', newValue) }}
                            disabled={readOnly}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="standard"
                                slotProps={{
                                  htmlInput: { ...params.inputProps, style: { textAlign: 'center', fontSize: 13 } }
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="text"
                            variant="standard"
                            value={item.unit_price ?? ''}
                            onChange={(e) =>
                              handleRecordChange(index, 'unit_price', isComposingRef.current ? e.target.value : toNumericString(e.target.value))
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
                        <TableCell align="right">{amount.toLocaleString()}</TableCell>
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
                  {!readOnly && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 1 }}>
                        <Button startIcon={<AddIcon />} onClick={addRow} size="small">
                          行を追加
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* 小計/消費税/合計 */}
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
                    お見積り金額（税込）
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

            {/* 備考 */}
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
                value={data.quotation.remarks}
                onChange={(e) => handleQuotationChange('remarks', e.target.value)}
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
    </LocalizationProvider>
  )
}
