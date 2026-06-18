'use client'

import VtecxApp from '@/typings'
import * as browserutil from '@/utils/browserutil'
import React from 'react'

const useQuotation = ({ companyId }: { companyId?: string }) => {
  const cParam = companyId ? `company_id=${companyId}` : ''
  const withCompany = (params: string) =>
    cParam ? (params ? `${params}&${cParam}` : cParam) : params

  const getQuotationList = async () => {
    try {
      return await browserutil.requestApi('GET', 'quotation', cParam)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const getQuotationPageList = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Entry[] = await browserutil.requestApi(
        'GET',
        'quotation-page',
        withCompany(option ?? '')
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [companyId])

  const getQuotationListCount = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Request = await browserutil.requestApi(
        'GET',
        'quotation-page',
        `${withCompany(option ?? '')}&c`.replace(/^&/, '')
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [companyId])

  const getQuotationData = async (id: string, ownerUid?: string) => {
    try {
      const params = withCompany(`quotation_code=${id}${ownerUid ? `&owner_id=${ownerUid}` : ''}`)
      return await browserutil.requestApi('GET', 'quotation', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const postQuotation = async (entry: VtecxApp.Entry) => {
    try {
      return await browserutil.requestApi('POST', 'quotation', cParam, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const putQuotation = async (entry: VtecxApp.Entry, ownerUid?: string) => {
    try {
      const params = withCompany(ownerUid ? `owner_id=${ownerUid}` : '')
      return await browserutil.requestApi('PUT', 'quotation', params, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const deleteQuotation = async (quotation_code: string, ownerUid?: string) => {
    try {
      const params = withCompany(`quotation_code=${quotation_code}${ownerUid ? `&owner_id=${ownerUid}` : ''}`)
      return await browserutil.requestApi('DELETE', 'quotation', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const createInvoiceFromQuotation = async (quotationEntry: VtecxApp.Entry) => {
    try {
      const q = quotationEntry.quotation ?? {}

      let defaultBank: VtecxApp.Bank | undefined
      try {
        const bankRes = await browserutil.requestApi('GET', 'bank', cParam)
        const bankEntries: VtecxApp.Entry[] = Array.isArray(bankRes) ? bankRes : (bankRes?.feed?.entry ?? [])
        defaultBank = bankEntries.map((e: any) => e.bank as VtecxApp.Bank).find((b) => b?.is_default)
      } catch {
        // 口座取得失敗時は無視
      }

      const entry: VtecxApp.Entry = {
        invoice: {
          customer_name: q.customer_name,
          subject: q.subject,
          issue_date: q.issue_date,
          due_date: q.delivery_date,
          status: 'draft',
          remarks: q.remarks,
          sub_total: q.sub_total,
          tax_amount: q.tax_amount,
          total_amount: q.total_amount
        },
        quotation: { quotation_code: q.quotation_code },
        bank: defaultBank
          ? ({
              bank_code: defaultBank.bank_code,
              bank_title: defaultBank.bank_title,
              branch_code: defaultBank.branch_code,
              branch_name: defaultBank.branch_name,
              bank_type: defaultBank.bank_type,
              bank_number: defaultBank.bank_number,
              bank_name: defaultBank.bank_name
            } as any)
          : undefined,
        company: quotationEntry.company,
        record: (quotationEntry.record ?? []).map((r: any) => ({
          record_code: r.record_code,
          description: r.description,
          quantity: r.quantity,
          unit_price: r.unit_price,
          tax_rate: r.tax_rate
        }))
      }
      return await browserutil.requestApi('POST', 'invoice', cParam, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const downloadQuotationPdf = async (quotation_code: string, ownerUid?: string) => {
    try {
      const qParts = [ownerUid ? `owner_id=${ownerUid}` : '', cParam].filter(Boolean)
      const urlparam = qParts.join('&')
      const blob: Blob = await browserutil.requestApi('GET', `pdf/quotation/${quotation_code}`, urlparam)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quotation_code}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const saveQuotationPdf = async (quotation_code: string, ownerUid?: string) => {
    try {
      const qParts = [ownerUid ? `owner_id=${ownerUid}` : '', cParam].filter(Boolean)
      const urlparam = qParts.join('&')
      return await browserutil.requestApi('POST', `pdf/quotation/${quotation_code}`, urlparam)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const existsQuotation = async (quotation_code: string, ownerUid?: string): Promise<boolean> => {
    try {
      const params = withCompany(`quotation_code=${quotation_code}${ownerUid ? `&owner_id=${ownerUid}` : ''}`)
      const data = await browserutil.requestApi('GET', 'quotation', params)
      const entries = Array.isArray(data) ? data : (data?.feed?.entry ?? [])
      return entries.length > 0
    } catch {
      return false
    }
  }

  const sendQuotationEmail = async (
    quotation_code: string,
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
      return await browserutil.requestApi('POST', `email/quotation/${quotation_code}`, '', JSON.stringify(body))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  return {
    getQuotationList,
    getQuotationPageList,
    getQuotationListCount,
    getQuotationData,
    postQuotation,
    putQuotation,
    deleteQuotation,
    createInvoiceFromQuotation,
    downloadQuotationPdf,
    saveQuotationPdf,
    existsQuotation,
    sendQuotationEmail
  }
}

export default useQuotation
