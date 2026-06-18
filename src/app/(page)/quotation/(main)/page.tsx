'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyAccount } from '@/app/(page)/account/(main)/fetcher'

export default function QuotationRedirect() {
  const router = useRouter()
  useEffect(() => {
    getMyAccount().then((res: any) => {
      const entries = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
      const entry = entries[0]
      const uid = entry?.user?.uid ?? entry?.id?.split('/').pop()?.split(',')[0]
      if (uid) router.replace(`/${uid}/quotation`)
    }).catch(() => {})
  }, [])
  return null
}
