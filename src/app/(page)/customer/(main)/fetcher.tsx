'use client'

import * as browserutil from '@/utils/browserutil'
import { clearApiCache } from '@/utils/browserutil'
const useCustomer = ({ companyId }: { companyId?: string }) => {
  const cParam = companyId ? `company_id=${companyId}` : ''
  const withCompany = (params: string) =>
    cParam ? (params ? `${params}&${cParam}` : cParam) : params

  const getCustomerList = async () => {
    try {
      return await browserutil.requestApi('GET', 'customer', cParam)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const searchCustomerByName = async (customer_name: string) => {
    try {
      const params = withCompany(`customer_name=${encodeURIComponent(customer_name)}`)
      return await browserutil.requestApi('GET', 'customer', params)
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  type CustomerEmail = { email: string; label: string }

  const postCustomer = async (customer: { customer_name: string; customer_email?: CustomerEmail[] }) => {
    try {
      const res = await browserutil.requestApi('POST', 'customer', cParam, JSON.stringify([{ customer }]))
      clearApiCache('customer')
      return res
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const putCustomer = async (customer: { customer_code: string; customer_name: string; customer_email?: CustomerEmail[] }) => {
    try {
      const res = await browserutil.requestApi('PUT', 'customer', cParam, JSON.stringify([{ customer }]))
      clearApiCache('customer')
      return res
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  const deleteCustomer = async (customer_code: string) => {
    try {
      const res = await browserutil.requestApi('DELETE', 'customer', withCompany(`customer_code=${customer_code}`))
      clearApiCache('customer')
      return res
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }

  return {
    getCustomerList,
    searchCustomerByName,
    postCustomer,
    putCustomer,
    deleteCustomer
  }
}

export default useCustomer
