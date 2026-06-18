'use client'

import { useEffect, useState } from 'react'
import { Alert, Box } from '@mui/material'
import PurchaseOrderForm from '../purchase-order-form'
import usePurchaseOrder from '../fetcher'
import { getGroupDetail } from '@/app/(page)/account/(main)/fetcher'
import { useActiveCompany } from '@/contexts/active-company-context'
import { useSearchParams } from 'next/navigation'

export default function PurchaseOrderAdd() {
  const { activeCompany } = useActiveCompany()
  const { postPurchaseOrder } = usePurchaseOrder({ companyId: activeCompany?.company_id })
  const [initialCompany, setInitialCompany] = useState<any>(undefined)
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
          グループに所属していないため、注文書を作成できません。グループに参加してください。
        </Alert>
      </Box>
    )
  }

  return (
    <PurchaseOrderForm
      onSave={postPurchaseOrder}
      initialCompany={initialCompany}
      initialCustomerName={initialCustomerName}
      imageUid={activeCompany.company_id}
    />
  )
}
