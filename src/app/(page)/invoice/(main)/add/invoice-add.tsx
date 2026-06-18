'use client'

import { useEffect, useState } from 'react'
import { Alert, Box } from '@mui/material'
import InvoiceForm from '../invoice-form'
import useInvoice from '../fetcher'
import { getGroupDetail } from '@/app/(page)/account/(main)/fetcher'
import { useActiveCompany } from '@/contexts/active-company-context'
import { useSearchParams } from 'next/navigation'
import VtecxApp from '@/typings'

export default function InvoiceAdd() {
  const { activeCompany } = useActiveCompany()
  const { postInvoice, saveInvoicePdf } = useInvoice({ companyId: activeCompany?.company_id })
  const [initialCompany, setInitialCompany] = useState<VtecxApp.Company | undefined>()
  const searchParams = useSearchParams()
  const initialCustomerName = searchParams.get('customer_name') ?? undefined

  useEffect(() => {
    if (!activeCompany?.company_id) return
    getGroupDetail(activeCompany.company_id).then((res: any) => {
      const company = res?.group?.company
      if (company) setInitialCompany(company)
    })
  }, [activeCompany?.company_id])

  if (!activeCompany) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          グループに所属していないため、請求書を作成できません。グループに参加してください。
        </Alert>
      </Box>
    )
  }

  const handleSave = async (entry: VtecxApp.Entry) => {
    const result = await postInvoice(entry)
    if (result && 'error' in result) return result
    const invoiceCode = Array.isArray(result)
      ? result[0]?.invoice?.invoice_code
      : result?.feed?.entry?.[0]?.invoice?.invoice_code
    if (invoiceCode) saveInvoicePdf(invoiceCode)
    return result
  }

  return <InvoiceForm onSave={handleSave} initialCompany={initialCompany} initialCustomerName={initialCustomerName} imageUid={activeCompany.company_id} />
}
