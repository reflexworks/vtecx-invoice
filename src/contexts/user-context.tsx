'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMyAccount } from '@/app/(page)/account/(main)/fetcher'

type UserContextType = {
  uid: string | null
  isAdmin: boolean
  accountEditId: string | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({
  uid: null,
  isAdmin: false,
  accountEditId: null,
  loading: true
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accountEditId, setAccountEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyAccount()
      .then((res: any) => {
        const entries = Array.isArray(res) ? res : (res?.feed?.entry ?? [])
        const entry = entries[0]
        const uidVal = entry?.user?.uid ?? entry?.id?.split('/').pop()?.split(',')[0]
        if (uidVal) {
          setUid(String(uidVal))
          setAccountEditId(String(uidVal))
        }
        setIsAdmin(entry?._isAdmin === true)
      })
      .catch(() => {
        setIsAdmin(false)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <UserContext.Provider value={{ uid, isAdmin, accountEditId, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
