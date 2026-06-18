'use client'

import { useEffect, useState } from 'react'
import { Alert, Box } from '@mui/material'
import QuotationForm from '../quotation-form'
import useQuotation from '../fetcher'
import { getGroupDetail } from '@/app/(page)/account/(main)/fetcher'
import { useActiveCompany } from '@/contexts/active-company-context'
import { useSearchParams } from 'next/navigation'
import VtecxApp from '@/typings'

export default function QuotationAdd() {
  const { activeCompany } = useActiveCompany()
  const { postQuotation, saveQuotationPdf } = useQuotation({ companyId: activeCompany?.company_id })
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
          グループに所属していないため、見積書を作成できません。グループに参加してください。
        </Alert>
      </Box>
    )
  }

  const handleSave = async (entry: VtecxApp.Entry) => {
    const result = await postQuotation(entry)
    if (result && 'error' in result) return result
    const quotationCode = Array.isArray(result)
      ? result[0]?.quotation?.quotation_code
      : result?.feed?.entry?.[0]?.quotation?.quotation_code
    if (quotationCode) saveQuotationPdf(quotationCode)
    return result
  }

  return <QuotationForm onSave={handleSave} initialCompany={initialCompany} initialCustomerName={initialCustomerName} imageUid={activeCompany.company_id} />
}
