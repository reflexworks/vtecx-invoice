import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import * as data from './data'
import { URI_GROUP_ADMIN, URI_PURCHASE_ORDER } from '@/utils/apiconst'

const isAdminUser = async (vtecxnext: VtecxNext): Promise<boolean> => {
  try {
    const groups = await apiutil.getGroups(vtecxnext)
    return Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
  } catch {
    return false
  }
}

export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api purchase-order get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const purchase_order_code = vtecxnext.getParameter('purchase_order_code')
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      return vtecxnext.response(200, { feed: {} })
    }

    if (purchase_order_code) {
      const entry = await vtecxnext.getEntry(`${URI_PURCHASE_ORDER}/${targetCompanyCode}/${purchase_order_code}`).catch(() => null)
      return vtecxnext.response(200, entry ? [entry] : [])
    } else {
      const feed: any = await vtecxnext.getFeed(`${URI_PURCHASE_ORDER}/${targetCompanyCode}/`)
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      const result = entries.length > 0 ? { feed: { entry: entries } } : { feed: {} }
      return vtecxnext.response(200, result)
    }
  } catch (e) {
    return apiutil.responseError(e, 'api purchase-order get')
  }
}

export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api purchase-order post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const company_code = await apiutil.resolveCompanyId(vtecxnext, String(uid), false, companyIdParam, null)

    if (!company_code) {
      return vtecxnext.response(400, { feed: { title: 'グループに所属していません。グループに参加してから注文書を作成してください。' } })
    }

    const reqData: any[] = await apiutil.getRequestJson(req)
    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    if (!reqData[0].purchase_order?.customer_name) {
      return vtecxnext.response(400, { feed: { title: '宛名は必須です。' } })
    }

    const purchase_order_code: string = reqData[0].purchase_order?.purchase_order_code
      ? reqData[0].purchase_order.purchase_order_code
      : await apiutil.numberingPurchaseOrderCode(vtecxnext)

    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${URI_PURCHASE_ORDER}` }] }])
    } catch { /* 既存の場合は無視 */ }
    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${URI_PURCHASE_ORDER}/${company_code}` }] }])
    } catch { /* 既存の場合は無視 */ }

    const feed = data.editPostData(reqData, purchase_order_code, company_code)
    const result = await apiutil.post(vtecxnext, feed)

    console.log(`[api purchase-order post] end. purchase_order_code=${purchase_order_code}`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api purchase-order post')
  }
}

export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api purchase-order put] start.`)
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

    const purchase_order_code: string = reqData[0].purchase_order?.purchase_order_code
    if (!purchase_order_code) {
      return vtecxnext.response(400, { feed: { title: '注文書コードが指定されていません。' } })
    }

    const feed = data.editPostData(reqData, purchase_order_code, targetCompanyCode)
    const result = await apiutil.put(vtecxnext, feed)

    console.log(`[api purchase-order put] end.`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api purchase-order put')
  }
}

export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api purchase-order delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const purchase_order_code = vtecxnext.getParameter('purchase_order_code')
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!purchase_order_code) {
      return vtecxnext.response(400, { feed: { title: '注文書コードが指定されていません。' } })
    }
    if (!targetCompanyCode) {
      return vtecxnext.response(400, { feed: { title: '企業コードが設定されていません。' } })
    }

    await vtecxnext.deleteEntry(`${URI_PURCHASE_ORDER}/${targetCompanyCode}/${purchase_order_code}`)
    return vtecxnext.response(200, { feed: { title: '削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api purchase-order delete')
  }
}
