'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Box, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DescriptionIcon from '@mui/icons-material/Description'
import EmailIcon from '@mui/icons-material/Email'

import InvoiceForm from '../../invoice-form'
import useInvoice from '../../fetcher'
import { getMyAccount } from '@/app/(page)/account/(main)/fetcher'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import { InvoiceCopyDialog } from '../../invoice-copy-dialog'
import EmailSendDialog from '@/components/EmailSendDialog'
import VtecxApp from '@/typings'

export default function InvoiceEdit() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const uid = params?.uid as string
  const ownerUid = searchParams.get('owner') ?? undefined

  const [initialData, setInitialData] = useState<any>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const { activeCompany, loading: companyLoading } = useActiveCompany()
  const { canWrite } = usePermission()
  const { getInvoiceData, putInvoice, downloadInvoicePdf, copyInvoice, existsInvoice, deleteInvoice, saveInvoicePdf, sendInvoiceEmail } = useInvoice({ companyId: activeCompany?.company_id })

  useEffect(() => {
    if (!id || companyLoading) return
    const fetchData = async () => {
      const [res, accountRes] = await Promise.all([getInvoiceData(id, ownerUid), getMyAccount()])
      if (res?.error) {
        setIsLoading(false)
        return
      }
      const entries: VtecxApp.Entry[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      const fetched = entries[0]
      if (!fetched) {
        setIsLoading(false)
        return
      }
      const accountEntries = Array.isArray(accountRes) ? accountRes : (accountRes?.feed?.entry ?? [])
      const accountEntry = accountEntries[0]
      const myCompany: VtecxApp.Company = accountEntry?.company ?? {}
      const numToDateStr = (num?: number) => {
        if (!num) return ''
        const s = String(num)
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
      }
      setInitialData({
        invoice: { invoice_code: id, ...fetched.invoice, issue_date: numToDateStr(fetched.invoice?.issue_date) },
        record:
          fetched.record && fetched.record.length > 0
            ? fetched.record.map((r: VtecxApp.Record) => ({
                record_code: r.record_code ?? '',
                description: r.description ?? '',
                quantity: r.quantity ?? 0,
                unit_price: r.unit_price ?? 0,
                tax_rate: r.tax_rate != null ? r.tax_rate : 0
              }))
            : [{ record_code: 'REC-01', description: '', quantity: 0, unit_price: 0 }],
        bank: {
          ...fetched.bank,
          due_date: fetched.invoice?.due_date
        },
        company: {
            ...(fetched.company ?? myCompany),
            registration_number: fetched.company?.registration_number ?? myCompany.registration_number
          },
        quotation: fetched.quotation
      })
      setIsLoading(false)
    }
    fetchData()
  }, [id, companyLoading])

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 4, pt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!canWrite && (
            <Chip label="閲覧モード" color="info" size="small" variant="outlined" />
          )}
          {initialData?.quotation?.quotation_code && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DescriptionIcon />}
              onClick={() => router.push(`/${uid}/quotation/edit/${initialData.quotation.quotation_code}`)}
            >
              元の見積書: {initialData.quotation.quotation_code}
            </Button>
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
          {canWrite && (
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => setCopyDialogOpen(true)}
              disabled={!id}
            >
              複写して新規作成
            </Button>
          )}
        </Box>
      </Box>

      <InvoiceForm
        key={id}
        initialData={initialData}
        isLoading={isLoading}
        invoiceNo={id}
        imageUid={ownerUid || activeCompany?.company_id}
        onSave={async (entry) => {
          const result = await putInvoice(entry, ownerUid)
          if (!(result && 'error' in result)) saveInvoicePdf(id, ownerUid)
          return result
        }}
        onDownloadPdf={() => downloadInvoicePdf(id, ownerUid)}
        backPath={initialData?.quotation?.quotation_code ? `/${uid}/invoice` : undefined}
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

      <EmailSendDialog
        open={emailDialogOpen}
        docCode={id}
        docType="invoice"
        customerName={initialData?.invoice?.customer_name}
        companyId={activeCompany?.company_id}
        onClose={() => setEmailDialogOpen(false)}
        onSend={async (toList, options) => {
          const res = await sendInvoiceEmail(id, toList, { ...options, ownerUid })
          if (!(res && 'error' in res)) {
            setSnackbar({ open: true, message: 'メールを送信しました', severity: 'success' })
          }
          return res
        }}
      />

      <InvoiceCopyDialog
        open={copyDialogOpen}
        sourceInvoiceCode={id}
        customerName={initialData?.invoice?.customer_name ?? ''}
        checkExists={existsInvoice}
        onClose={() => setCopyDialogOpen(false)}
        onCopy={async (newInvoiceCode, newDueDate) => {
          const res = await copyInvoice(id, newInvoiceCode, newDueDate, ownerUid)
          if (res && 'error' in res) {
            setSnackbar({ open: true, message: res.error?.message ?? '複写に失敗しました', severity: 'error' })
          } else {
            setCopyDialogOpen(false)
            setSnackbar({ open: true, message: '請求書を複写しました', severity: 'success' })
            router.push(`/${uid}/invoice`)
          }
        }}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>請求書の削除</DialogTitle>
        <DialogContent>
          <Typography>
            請求書No: <strong>{id}</strong> を削除しますか？
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
              const res = await deleteInvoice(id, ownerUid)
              setDeleting(false)
              if (res && 'error' in res) {
                setDeleteDialogOpen(false)
                setSnackbar({ open: true, message: res.error?.message ?? '削除に失敗しました', severity: 'error' })
              } else {
                router.refresh()
                router.push(`/${uid}/invoice`)
              }
            }}
          >
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  )
}
