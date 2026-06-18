'use client'

import { useState, useEffect } from 'react'
import { Box, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, Backdrop, Chip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ReceiptIcon from '@mui/icons-material/Receipt'
import EmailIcon from '@mui/icons-material/Email'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import QuotationForm from '../../quotation-form'
import useQuotation from '../../fetcher'
import useInvoice from '@/app/(page)/invoice/(main)/fetcher'
import { getMyAccount } from '@/app/(page)/account/(main)/fetcher'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import EmailSendDialog from '@/components/EmailSendDialog'
import VtecxApp from '@/typings'

export default function QuotationEdit() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const uid = params?.uid as string
  const ownerUid = searchParams.get('owner') ?? undefined

  const [initialData, setInitialData] = useState<any>(undefined)
  const [rawEntry, setRawEntry] = useState<VtecxApp.Entry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const { activeCompany, loading: companyLoading } = useActiveCompany()
  const { canWrite } = usePermission()
  const { getQuotationData, putQuotation, deleteQuotation, downloadQuotationPdf, saveQuotationPdf, createInvoiceFromQuotation, sendQuotationEmail } = useQuotation({ companyId: activeCompany?.company_id })
  const { saveInvoicePdf } = useInvoice({ companyId: activeCompany?.company_id })

  useEffect(() => {
    if (!id || companyLoading) { if (!id) setIsLoading(false); return }
    const fetchData = async () => {
      const [res, accountRes] = await Promise.all([getQuotationData(id, ownerUid), getMyAccount()])

      if (res?.error) { setIsLoading(false); return }

      const entries: VtecxApp.Entry[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      const fetched = entries[0]
      if (!fetched) { setIsLoading(false); return }

      const accountEntries = Array.isArray(accountRes) ? accountRes : (accountRes?.feed?.entry ?? [])
      const accountEntry = accountEntries[0]
      const myCompany: VtecxApp.Company = accountEntry?.company ?? {}

      // 請求書作成用に生データを保持
      setRawEntry(fetched)

      const numToDateStr = (num?: number) => {
        if (!num) return ''
        const s = String(num)
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
      }

      setInitialData({
        quotation: {
          quotation_code: id,
          ...fetched.quotation,
          issue_date: numToDateStr(fetched.quotation?.issue_date),
          delivery_date: numToDateStr(fetched.quotation?.delivery_date),
          expiry_date: numToDateStr(fetched.quotation?.expiry_date)
        },
        record: fetched.record && fetched.record.length > 0
          ? fetched.record.map((r: VtecxApp.Record) => ({
              record_code: r.record_code ?? '',
              description: r.description ?? '',
              quantity: r.quantity ?? 0,
              unit: (r as any).unit ?? '式',
              unit_price: r.unit_price ?? 0,
              tax_rate: r.tax_rate != null ? r.tax_rate : 0
            }))
          : [{ record_code: 'REC-01', description: '', quantity: 0, unit: '式', unit_price: 0, tax_rate: 10 }],
        company: fetched.company ?? myCompany,
        customer: (fetched as any).customer ?? undefined
      })
      setIsLoading(false)
    }
    fetchData()
  }, [id, companyLoading])

  const handleCreateInvoice = async () => {
    if (!rawEntry) return
    setCreatingInvoice(true)
    setInvoiceDialogOpen(false)
    const res = await createInvoiceFromQuotation(rawEntry)

    if (res && 'error' in res) {
      setCreatingInvoice(false)
      setSnackbar({ open: true, message: (res as any).error?.message ?? '請求書の作成に失敗しました', severity: 'error' })
      return
    }

    // 見積書ステータスを「請求書作成済」に更新
    await putQuotation({
      quotation: { ...rawEntry.quotation, quotation_code: id, status: '請求書作成済' },
      company: rawEntry.company,
      record: rawEntry.record
    }, ownerUid)

    // 作成した請求書のコードを取得して編集画面へ遷移
    const created = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
    const invoiceCode = created[0]?.invoice?.invoice_code
    if (invoiceCode) await saveInvoicePdf(invoiceCode)
    setSnackbar({ open: true, message: '請求書を作成しました', severity: 'success' })
    setTimeout(() => {
      setCreatingInvoice(false)
      if (invoiceCode) {
        router.push(`/${uid}/invoice/${invoiceCode}`)
      }
    }, 2000)
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 4, pt: 4 }}>
        <Box>
          {!canWrite && (
            <Chip label="閲覧モード" color="info" size="small" variant="outlined" />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EmailIcon />}
            onClick={() => setEmailDialogOpen(true)}
            disabled={!id || isLoading}
          >
            メール送信
          </Button>
          {/* PDF保存ボタン（非表示） */}
          {canWrite && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ReceiptIcon />}
              onClick={() => setInvoiceDialogOpen(true)}
              disabled={!id || isLoading}
            >
              請求書を作成
            </Button>
          )}
        </Box>
      </Box>

      <QuotationForm
        key={id}
        initialData={initialData}
        isLoading={isLoading}
        quotationNo={id}
        imageUid={ownerUid || activeCompany?.company_id}
        onSave={async (entry) => {
          const result = await putQuotation(entry, ownerUid)
          if (!(result && 'error' in result)) saveQuotationPdf(id, ownerUid)
          return result
        }}
        onDownloadPdf={id ? () => downloadQuotationPdf(id, ownerUid) : undefined}
        readOnly={!canWrite}
      />

      {canWrite && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 4, pb: 4 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!id}
          >
            削除
          </Button>
        </Box>
      )}

      {/* 請求書作成中オーバーレイ */}
      <Backdrop open={creatingInvoice} sx={{ zIndex: 1300, color: '#fff', flexDirection: 'column', gap: 2 }}>
        <CircularProgress color="inherit" />
        <Typography variant="body1">請求書を作成中...</Typography>
      </Backdrop>

      {/* 請求書作成ダイアログ */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)}>
        <DialogTitle>請求書を作成</DialogTitle>
        <DialogContent>
          <Typography>
            見積番号: <strong>{id}</strong> から請求書を作成しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            見積書のステータスが「請求書作成済」に更新されます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)} disabled={creatingInvoice}>キャンセル</Button>
          <Button
            color="primary"
            variant="contained"
            disabled={creatingInvoice}
            onClick={handleCreateInvoice}
            startIcon={creatingInvoice ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {creatingInvoice ? '作成中...' : '作成する'}
          </Button>
        </DialogActions>
      </Dialog>

      <EmailSendDialog
        open={emailDialogOpen}
        docCode={id}
        docType="quotation"
        customerName={initialData?.quotation?.customer_name}
        companyId={activeCompany?.company_id}
        onClose={() => setEmailDialogOpen(false)}
        onSend={async (toList, options) => {
          const res = await sendQuotationEmail(id, toList, { ...options, ownerUid })
          if (!(res && 'error' in res)) {
            setSnackbar({ open: true, message: 'メールを送信しました', severity: 'success' })
          }
          return res
        }}
      />

      {/* 削除ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>見積書の削除</DialogTitle>
        <DialogContent>
          <Typography>
            見積番号: <strong>{id}</strong> を削除しますか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              const res = await deleteQuotation(id, ownerUid)
              setDeleting(false)
              if (res && 'error' in res) {
                setDeleteDialogOpen(false)
                setSnackbar({ open: true, message: (res as any).error?.message ?? '削除に失敗しました', severity: 'error' })
              } else {
                router.push(`/${uid}/quotation`)
              }
            }}
          >
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
