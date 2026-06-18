'use client'

import { useState, useEffect } from 'react'
import { Box, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EmailIcon from '@mui/icons-material/Email'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import PurchaseOrderForm from '../../purchase-order-form'
import usePurchaseOrder from '../../fetcher'
import { getMyAccount } from '@/app/(page)/account/(main)/fetcher'
import { useActiveCompany } from '@/contexts/active-company-context'
import { usePermission } from '@/hooks/usePermission'
import EmailSendDialog from '@/components/EmailSendDialog'

export default function PurchaseOrderEdit() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const uid = params?.uid as string
  const ownerUid = searchParams.get('owner') ?? undefined

  const [initialData, setInitialData] = useState<any>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const { activeCompany, loading: companyLoading } = useActiveCompany()
  const { canWrite } = usePermission()
  const { getPurchaseOrderData, putPurchaseOrder, deletePurchaseOrder, downloadPurchaseOrderPdf, sendPurchaseOrderEmail } = usePurchaseOrder({ companyId: activeCompany?.company_id })

  useEffect(() => {
    if (!id || companyLoading) { if (!id) setIsLoading(false); return }
    const fetchData = async () => {
      const [res, accountRes] = await Promise.all([getPurchaseOrderData(id, ownerUid), getMyAccount()])

      if (res?.error) { setIsLoading(false); return }

      const entries: any[] = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      const fetched = entries[0]
      if (!fetched) { setIsLoading(false); return }

      const accountEntries = Array.isArray(accountRes) ? accountRes : (accountRes?.feed?.entry ?? [])
      const myCompany = accountEntries[0]?.company ?? {}

      const numToDateStr = (num?: number) => {
        if (!num) return ''
        const s = String(num)
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
      }

      setInitialData({
        purchase_order: {
          purchase_order_code: id,
          ...fetched.purchase_order,
          issue_date: numToDateStr(fetched.purchase_order?.issue_date),
          delivery_date: numToDateStr(fetched.purchase_order?.delivery_date)
        },
        record: fetched.record && fetched.record.length > 0
          ? fetched.record.map((r: any) => ({
              record_code: r.record_code ?? '',
              description: r.description ?? '',
              quantity: r.quantity ?? 0,
              unit: r.unit ?? '式',
              unit_price: r.unit_price ?? 0,
              tax_rate: r.tax_rate != null ? r.tax_rate : 10
            }))
          : [{ record_code: 'REC-01', description: '', quantity: 0, unit: '式', unit_price: 0, tax_rate: 10 }],
        company: fetched.company ?? myCompany
      })
      setIsLoading(false)
    }
    fetchData()
  }, [id, companyLoading])

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 4, pt: 4 }}>
        <Box>
          {!canWrite && <Chip label="閲覧モード" color="info" size="small" variant="outlined" />}
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
        </Box>
      </Box>

      <PurchaseOrderForm
        key={id}
        initialData={initialData}
        isLoading={isLoading}
        purchaseOrderNo={id}
        imageUid={ownerUid || activeCompany?.company_id}
        onSave={async (entry) => putPurchaseOrder(entry, ownerUid)}
        onDownloadPdf={id ? () => downloadPurchaseOrderPdf(id, ownerUid) : undefined}
        readOnly={!canWrite}
      />

      {canWrite && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 4, pb: 4 }}>
          <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
            onClick={() => setDeleteDialogOpen(true)} disabled={!id}>
            削除
          </Button>
        </Box>
      )}

      <EmailSendDialog
        open={emailDialogOpen}
        docCode={id}
        docType="purchase_order"
        customerName={initialData?.purchase_order?.customer_name}
        companyId={activeCompany?.company_id}
        onClose={() => setEmailDialogOpen(false)}
        onSend={async (toList, options) => {
          const res = await sendPurchaseOrderEmail(id, toList, { ...options, ownerUid })
          if (!(res && 'error' in res)) {
            setSnackbar({ open: true, message: 'メールを送信しました', severity: 'success' })
          }
          return res
        }}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>注文書の削除</DialogTitle>
        <DialogContent>
          <Typography>注文書No: <strong>{id}</strong> を削除しますか？</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>キャンセル</Button>
          <Button color="error" variant="contained" disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              const res = await deletePurchaseOrder(id, ownerUid)
              setDeleting(false)
              if (res && 'error' in res) {
                setDeleteDialogOpen(false)
                setSnackbar({ open: true, message: (res as any).error?.message ?? '削除に失敗しました', severity: 'error' })
              } else {
                router.push(`/${uid}/purchase_order`)
              }
            }}>
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
