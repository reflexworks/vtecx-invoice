'use client'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as browserutil from '@/utils/browserutil'

export type CompanyInfo = {
  company_id: string
  company_name: string
  role: string
}

type ActiveCompanyContextType = {
  companies: CompanyInfo[]
  activeCompany: CompanyInfo | null
  setActiveCompany: (company: CompanyInfo) => void
  loading: boolean
}

const ActiveCompanyContext = createContext<ActiveCompanyContextType>({
  companies: [],
  activeCompany: null,
  setActiveCompany: () => {},
  loading: true
})

const STORAGE_KEY = 'activeCompanyId'

export function ActiveCompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<CompanyInfo[]>([])
  const [activeCompany, setActiveCompanyState] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // 1. /_user/{uid}/groups/ から所属グループ一覧を取得
        const res: any = await browserutil.requestApi('GET', 'my-groups', '').catch(() => null)
        const entries: any[] = Array.isArray(res)
          ? res
          : (res?.feed?.entry ?? [])
        let list: CompanyInfo[] = entries.map((e: any) => ({
          company_id: e.company_group?.company_id ?? '',
          company_name: e.title ?? e.company_group?.company_id ?? '',
          role: e.company_group?.role ?? ''
        })).filter((c) => c.company_id)

        // 2. groups/ が空の場合はアカウント情報の company_group をフォールバックとして使用
        if (list.length === 0) {
          const accountRes: any = await browserutil.requestApi('GET', 'account', 'me=1').catch(() => null)
          const accountEntries: any[] = Array.isArray(accountRes)
            ? accountRes
            : (accountRes?.feed?.entry ?? [])
          const account = accountEntries[0]
          const company_id = account?.company_group?.company_id
          if (company_id) {
            // グループインデックスから会社名を取得
            const groupRes: any = await browserutil.requestApi('GET', 'group', `company_id=${encodeURIComponent(company_id)}`).catch(() => null)
            const groupEntries: any[] = Array.isArray(groupRes) ? groupRes : (groupRes?.feed?.entry ?? [])
            const groupName = groupEntries[0]?.title ?? company_id
            list = [{
              company_id,
              company_name: groupName,
              role: account?.company_group?.role ?? ''
            }]
          }
        }

        setCompanies(list)

        if (list.length > 0) {
          const savedId = typeof window !== 'undefined'
            ? localStorage.getItem(STORAGE_KEY)
            : null
          const saved = savedId ? list.find((c) => c.company_id === savedId) : null
          setActiveCompanyState(saved ?? list[0])
        }
      } catch {
        // 無視
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const setActiveCompany = useCallback((company: CompanyInfo) => {
    setActiveCompanyState(company)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, company.company_id)
    }
  }, [])

  return (
    <ActiveCompanyContext.Provider value={{ companies, activeCompany, setActiveCompany, loading }}>
      {children}
    </ActiveCompanyContext.Provider>
  )
}

export function useActiveCompany() {
  return useContext(ActiveCompanyContext)
}
