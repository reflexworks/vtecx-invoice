'use client'
import VtecxApp from '@/typings'
import * as browserutil from '@/utils/browserutil'
import React from 'react'

const useInvoice = ({ companyId }: { companyId?: string }) => {
  const cParam = companyId ? `company_id=${companyId}` : ''
  const withCompany = (params: string) =>
    cParam ? (params ? `${params}&${cParam}` : cParam) : params

  const getInvoiceList = async () => {
    try {
      return await browserutil.requestApi('GET', 'invoice', cParam)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const getInvoicePageList = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Entry[] = await browserutil.requestApi(
        'GET',
        'invoice-page',
        withCompany(option ?? '')
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [companyId])

  const getInvoiceData = async (id: string, ownerUid?: string) => {
    try {
      const params = withCompany(`invoice_code=${id}${ownerUid ? `&owner_id=${ownerUid}` : ''}`)
      return await browserutil.requestApi('GET', 'invoice', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const postInvoice = async (entry: VtecxApp.Entry) => {
    try {
      return await browserutil.requestApi('POST', 'invoice', cParam, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const putInvoice = async (entry: VtecxApp.Entry, ownerUid?: string) => {
    try {
      const params = withCompany(ownerUid ? `owner_id=${ownerUid}` : '')
      return await browserutil.requestApi('PUT', 'invoice', params, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const downloadInvoicePdf = async (invoice_code: string, ownerUid?: string) => {
    try {
      const qParts = [ownerUid ? `owner_id=${ownerUid}` : '', cParam].filter(Boolean)
      const urlparam = qParts.join('&')
      const blob: Blob = await browserutil.requestApi('GET', `pdf/invoice/${invoice_code}`, urlparam)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice_code}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const getInvoiceListCount = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Request = await browserutil.requestApi(
        'GET',
        'invoice-page',
        `${withCompany(option ?? '')}&c`.replace(/^&/, '')
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [companyId])

  const deleteInvoice = async (invoice_code: string, ownerUid?: string) => {
    try {
      const params = withCompany(`invoice_code=${invoice_code}${ownerUid ? `&owner_id=${ownerUid}` : ''}`)
      return await browserutil.requestApi('DELETE', 'invoice', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const existsInvoice = async (invoice_code: string, ownerUid?: string): Promise<boolean> => {
    try {
      const params = withCompany(`invoice_code=${invoice_code}${ownerUid ? `&owner_id=${ownerUid}` : ''}`)
      const data = await browserutil.requestApi('GET', 'invoice', params)
      const entries = Array.isArray(data) ? data : (data?.feed?.entry ?? [])
      return entries.length > 0
    } catch {
      return false
    }
  }

  const copyInvoice = async (sourceId: string, newInvoiceCode: string, newDueDate: Date, ownerUid?: string) => {
    try {
      const source = await getInvoiceData(sourceId, ownerUid)
      const entries = Array.isArray(source) ? source : (source?.feed?.entry ?? [])
      const entry: VtecxApp.Entry = entries[0]
      if (!entry) throw new Error('複写元の請求書が見つかりません')

      const y = newDueDate.getFullYear()
      const m = String(newDueDate.getMonth() + 1).padStart(2, '0')
      const d = String(newDueDate.getDate()).padStart(2, '0')
      const dueDateNum = parseInt(`${y}${m}${d}`)

      const today = new Date()
      const ty = today.getFullYear()
      const tm = String(today.getMonth() + 1).padStart(2, '0')
      const td = String(today.getDate()).padStart(2, '0')
      const issueDateNum = parseInt(`${ty}${tm}${td}`)

      const newEntry: VtecxApp.Entry = {
        invoice: {
          ...entry.invoice,
          invoice_code: newInvoiceCode,
          issue_date: issueDateNum,
          due_date: dueDateNum,
          status: 'draft'
        },
        bank: entry.bank,
        company: entry.company,
        record: (entry.record ?? []).map((r: any) => ({ ...r }))
      }

      return await browserutil.requestApi('POST', 'invoice', cParam, JSON.stringify([newEntry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const saveInvoicePdf = async (invoice_code: string, ownerUid?: string) => {
    try {
      const qParts = [ownerUid ? `owner_id=${ownerUid}` : '', cParam].filter(Boolean)
      const urlparam = qParts.join('&')
      return await browserutil.requestApi('POST', `pdf/invoice/${invoice_code}`, urlparam)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const sendInvoiceEmail = async (
    invoice_code: string,
    to: string[],
    options?: { cc?: string[]; subject?: string; body?: string; ownerUid?: string }
  ) => {
    try {
      const body: Record<string, any> = { to }
      if (options?.cc && options.cc.length > 0) body.cc = options.cc
      if (options?.subject) body.subject = options.subject
      if (options?.body) body.body = options.body
      if (options?.ownerUid) body.owner_id = options.ownerUid
      if (companyId) body.company_id = companyId
      return await browserutil.requestApi('POST', `email/invoice/${invoice_code}`, '', JSON.stringify(body))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  return {
    getInvoiceList,
    getInvoiceListCount,
    postInvoice,
    putInvoice,
    getInvoiceData,
    getInvoicePageList,
    downloadInvoicePdf,
    copyInvoice,
    existsInvoice,
    deleteInvoice,
    saveInvoicePdf,
    sendInvoiceEmail
  }
}

export default useInvoice
