'use client'

import * as browserutil from '@/utils/browserutil'
import React from 'react'
import VtecxApp from '@/typings'

const usePurchaseOrder = ({ companyId }: { companyId?: string }) => {
  const cParam = companyId ? `company_id=${companyId}` : ''
  const withCompany = (params: string) =>
    cParam ? (params ? `${params}&${cParam}` : cParam) : params

  const getPurchaseOrderPageList = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Entry[] = await browserutil.requestApi(
        'GET',
        'purchase-order-page',
        withCompany(option ?? '')
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [companyId])

  const getPurchaseOrderListCount = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Request = await browserutil.requestApi(
        'GET',
        'purchase-order-page',
        `${withCompany(option ?? '')}&c`.replace(/^&/, '')
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [companyId])

  const getPurchaseOrderData = async (id: string, ownerUid?: string) => {
    try {
      const params = [cParam, `purchase_order_code=${id}`, ownerUid ? `owner_id=${ownerUid}` : '']
        .filter(Boolean).join('&')
      return await browserutil.requestApi('GET', 'purchase-order', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const postPurchaseOrder = async (entry: any) => {
    try {
      return await browserutil.requestApi('POST', 'purchase-order', cParam, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const putPurchaseOrder = async (entry: any, ownerUid?: string) => {
    try {
      const params = [cParam, ownerUid ? `owner_id=${ownerUid}` : ''].filter(Boolean).join('&')
      return await browserutil.requestApi('PUT', 'purchase-order', params, JSON.stringify([entry]))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const deletePurchaseOrder = async (purchase_order_code: string, ownerUid?: string) => {
    try {
      const params = [cParam, `purchase_order_code=${purchase_order_code}`, ownerUid ? `owner_id=${ownerUid}` : '']
        .filter(Boolean).join('&')
      return await browserutil.requestApi('DELETE', 'purchase-order', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const downloadPurchaseOrderPdf = async (purchase_order_code: string, ownerUid?: string) => {
    const urlparam = [cParam, ownerUid ? `owner_id=${ownerUid}` : ''].filter(Boolean).join('&')
    try {
      const blob: Blob = await browserutil.requestApi('GET', `pdf/purchase-order/${purchase_order_code}`, urlparam)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${purchase_order_code}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const savePurchaseOrderPdf = async (purchase_order_code: string, ownerUid?: string) => {
    const urlparam = [cParam, ownerUid ? `owner_id=${ownerUid}` : ''].filter(Boolean).join('&')
    try {
      return await browserutil.requestApi('POST', `pdf/purchase-order/${purchase_order_code}`, urlparam)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const sendPurchaseOrderEmail = async (
    purchase_order_code: string,
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
      return await browserutil.requestApi('POST', `email/purchase-order/${purchase_order_code}`, '', JSON.stringify(body))
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  return {
    getPurchaseOrderPageList,
    getPurchaseOrderListCount,
    getPurchaseOrderData,
    postPurchaseOrder,
    putPurchaseOrder,
    deletePurchaseOrder,
    downloadPurchaseOrderPdf,
    savePurchaseOrderPdf,
    sendPurchaseOrderEmail
  }
}

export default usePurchaseOrder
