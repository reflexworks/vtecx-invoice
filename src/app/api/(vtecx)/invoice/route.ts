import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import * as data from './data'
import { URI_GROUP_ADMIN, URI_INVOICE } from '@/utils/apiconst'

const isAdminUser = async (vtecxnext: VtecxNext): Promise<boolean> => {
  try {
    const groups = await apiutil.getGroups(vtecxnext)
    return Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
  } catch {
    return false
  }
}

export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api invoice get] start.`)

  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const invoice_code = vtecxnext.getParameter('invoice_code')
    const ownerUidParam = vtecxnext.getParameter('owner_id')
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam ?? null)

    if (!targetCompanyCode) {
      console.log(`[api invoice get] company_code not found. uid=${uid}`)
      return vtecxnext.response(200, { feed: {} })
    }

    if (invoice_code) {
      const entry = await vtecxnext.getEntry(`${URI_INVOICE}/${targetCompanyCode}/${invoice_code}`).catch(() => null)
      console.log(`[api invoice get] end. single entry.`)
      return vtecxnext.response(200, entry ? [entry] : [])
    } else {
      const feed: any = await vtecxnext.getFeed(`${URI_INVOICE}/${targetCompanyCode}/`)
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      const result = entries.length > 0 ? { feed: { entry: entries } } : { feed: {} }
      console.log(`[api invoice get] end. list. count=${entries.length}`)
      return vtecxnext.response(200, result)
    }
  } catch (e) {
    return apiutil.responseError(e, 'api invoice get')
  }
}

export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api invoice post] start.`)

  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const company_code = await apiutil.resolveCompanyId(vtecxnext, String(uid), false, companyIdParam, null)

    if (!company_code) {
      return vtecxnext.response(400, { feed: { title: 'グループに所属していません。グループに参加してから請求書を作成してください。' } })
    }

    const reqData: any[] = await apiutil.getRequestJson(req)

    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const invoice = reqData[0].invoice
    if (!invoice || !invoice.customer_name) {
      return vtecxnext.response(400, { feed: { title: '宛名は必須です。' } })
    }

    const invoice_code: string = reqData[0].invoice?.invoice_code
      ? reqData[0].invoice.invoice_code
      : await apiutil.numberingInvoiceCode(vtecxnext)

    // company_code フォルダを作成（既存の場合は無視）
    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${URI_INVOICE}/${company_code}` }] }])
    } catch {
      // 既存の場合は無視
    }

    const feed = data.editPostData(reqData, invoice_code, company_code)
    console.log(`[api invoice post] invoice_code=${invoice_code} company_code=${company_code} feed=${JSON.stringify(feed)}`)

    const result = await apiutil.post(vtecxnext, feed)
    console.log(`[api invoice post] result=${JSON.stringify(result)}`)

    console.log('[api invoice post] end.')
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api invoice post')
  }
}

export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api invoice delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const invoice_code = vtecxnext.getParameter('invoice_code')
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!invoice_code) {
      return vtecxnext.response(400, { feed: { title: '請求書コードが指定されていません。' } })
    }
    if (!targetCompanyCode) {
      return vtecxnext.response(400, { feed: { title: '企業コードが設定されていません。' } })
    }

    await vtecxnext.deleteEntry(`${URI_INVOICE}/${targetCompanyCode}/${invoice_code}`)
    console.log(`[api invoice delete] end. invoice_code=${invoice_code}`)
    return vtecxnext.response(200, { feed: { title: '削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api invoice delete')
  }
}

export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api invoice put] start.`)

  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      return vtecxnext.response(400, { feed: { title: '企業コードが設定されていません。' } })
    }

    const reqData: any[] = await apiutil.getRequestJson(req)

    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const invoice_code: string = reqData[0].invoice?.invoice_code
    if (!invoice_code) {
      return vtecxnext.response(400, { feed: { title: '請求書コードが指定されていません。' } })
    }

    const feed = data.editPostData(reqData, invoice_code, targetCompanyCode)
    const result = await apiutil.put(vtecxnext, feed)

    console.log('[api invoice put] end.')
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api invoice put')
  }
}
