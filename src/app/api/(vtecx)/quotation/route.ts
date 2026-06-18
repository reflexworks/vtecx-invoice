import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import * as data from './data'
import { URI_GROUP_ADMIN, URI_QUOTATION, URI_CUSTOMER } from '@/utils/apiconst'

/**
 * 顧客マスタから customer_name で顧客データを取得する
 */
const findCustomerByName = async (vtecxnext: VtecxNext, company_code: string, customer_name: string) => {
  try {
    const feed: any = await vtecxnext.getFeed(
      `${URI_CUSTOMER}/${company_code}/?f&customer.customer_name-ft-${customer_name}&l=20`
    ).catch(() => null)
    const entries: any[] = Array.isArray(feed) ? feed : []
    const found = entries.find((e: any) => e.customer?.customer_name === customer_name)
    if (found) return found.customer

    // フォールバック: 全件取得して完全一致
    const allFeed: any = await vtecxnext.getFeed(`${URI_CUSTOMER}/${company_code}/`).catch(() => null)
    const allEntries: any[] = Array.isArray(allFeed) ? allFeed : []
    return allEntries.find((e: any) => e.customer?.customer_name === customer_name)?.customer ?? null
  } catch {
    return null
  }
}

/**
 * 顧客マスタに未登録であれば customer_name で自動登録する
 */
const ensureCustomerExists = async (vtecxnext: VtecxNext, company_code: string, customer_name: string): Promise<void> => {
  try {
    // 全文検索で既存顧客を確認
    const feed: any = await vtecxnext.getFeed(
      `${URI_CUSTOMER}/${company_code}/?f&customer.customer_name-ft-${customer_name}&l=1`
    ).catch(() => null)
    const entries: any[] = Array.isArray(feed) ? feed : []

    // 完全一致する顧客が既に存在する場合はスキップ
    const exists = entries.some((e: any) => e.customer?.customer_name === customer_name)
    if (exists) return

    // フォールバック: 全件取得して部分一致確認（ft未ヒット対策）
    if (entries.length === 0) {
      const allFeed: any = await vtecxnext.getFeed(`${URI_CUSTOMER}/${company_code}/`).catch(() => null)
      const allEntries: any[] = Array.isArray(allFeed) ? allFeed : []
      if (allEntries.some((e: any) => e.customer?.customer_name === customer_name)) return
    }

    // 顧客フォルダを作成（既存の場合は無視）
    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${URI_CUSTOMER}/${company_code}` }] }])
    } catch { /* 既存の場合は無視 */ }

    const customer_code = await apiutil.numberingCustomerCode(vtecxnext)
    await vtecxnext.put([{
      link: [{ ___rel: 'self', ___href: `${URI_CUSTOMER}/${company_code}/${customer_code}` }],
      customer: { customer_code, customer_name, to_email: '', cc_email: '' }
    }])
    console.log(`[ensureCustomerExists] registered. customer_name=${customer_name} customer_code=${customer_code}`)
  } catch (e) {
    // 顧客マスタ登録失敗は見積書保存の成功に影響させない
    console.error(`[ensureCustomerExists] failed. customer_name=${customer_name}`, e)
  }
}

const isAdminUser = async (vtecxnext: VtecxNext): Promise<boolean> => {
  try {
    const groups = await apiutil.getGroups(vtecxnext)
    return Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
  } catch {
    return false
  }
}

export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api quotation get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const quotation_code = vtecxnext.getParameter('quotation_code')
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      console.log(`[api quotation get] company_code not found. uid=${uid}`)
      return vtecxnext.response(200, { feed: {} })
    }

    if (quotation_code) {
      const entry = await vtecxnext.getEntry(`${URI_QUOTATION}/${targetCompanyCode}/${quotation_code}`).catch(() => null)
      console.log(`[api quotation get] end. single entry.`)
      return vtecxnext.response(200, entry ? [entry] : [])
    } else {
      const feed: any = await vtecxnext.getFeed(`${URI_QUOTATION}/${targetCompanyCode}/`)
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      const result = entries.length > 0 ? { feed: { entry: entries } } : { feed: {} }
      console.log(`[api quotation get] end. list. count=${entries.length}`)
      return vtecxnext.response(200, result)
    }
  } catch (e) {
    return apiutil.responseError(e, 'api quotation get')
  }
}

export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api quotation post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const company_code = await apiutil.resolveCompanyId(vtecxnext, String(uid), false, companyIdParam, null)

    if (!company_code) {
      return vtecxnext.response(400, { feed: { title: 'グループに所属していません。グループに参加してから見積書を作成してください。' } })
    }

    const reqData: any[] = await apiutil.getRequestJson(req)
    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const quotation = reqData[0].quotation
    if (!quotation || !quotation.customer_name) {
      return vtecxnext.response(400, { feed: { title: '宛名は必須です。' } })
    }

    const quotation_code: string = reqData[0].quotation?.quotation_code
      ? reqData[0].quotation.quotation_code
      : await apiutil.numberingQuotationCode(vtecxnext)

    // company_code フォルダを作成（既存の場合は無視）
    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${URI_QUOTATION}/${company_code}` }] }])
    } catch {
      // 既存の場合は無視
    }

    await ensureCustomerExists(vtecxnext, company_code, quotation.customer_name)
    // クライアントが選択済み顧客データを送った場合はそれを使用、なければマスタから検索
    const customerData = reqData[0].customer ?? await findCustomerByName(vtecxnext, company_code, quotation.customer_name)

    const feed = data.editPostData(reqData, quotation_code, company_code, customerData)
    const result = await apiutil.post(vtecxnext, feed)

    console.log(`[api quotation post] end. quotation_code=${quotation_code} company_code=${company_code}`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api quotation post')
  }
}

export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api quotation put] start.`)
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

    const quotation_code: string = reqData[0].quotation?.quotation_code
    if (!quotation_code) {
      return vtecxnext.response(400, { feed: { title: '見積書コードが指定されていません。' } })
    }

    const customer_name = reqData[0].quotation?.customer_name
    if (customer_name) await ensureCustomerExists(vtecxnext, targetCompanyCode, customer_name)
    const customerData = customer_name ? await findCustomerByName(vtecxnext, targetCompanyCode, customer_name) : null

    const feed = data.editPostData(reqData, quotation_code, targetCompanyCode, customerData)
    const result = await apiutil.put(vtecxnext, feed)

    console.log(`[api quotation put] end.`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api quotation put')
  }
}

export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api quotation delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const quotation_code = vtecxnext.getParameter('quotation_code')
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!quotation_code) {
      return vtecxnext.response(400, { feed: { title: '見積書コードが指定されていません。' } })
    }
    if (!targetCompanyCode) {
      return vtecxnext.response(400, { feed: { title: '企業コードが設定されていません。' } })
    }

    await vtecxnext.deleteEntry(`${URI_QUOTATION}/${targetCompanyCode}/${quotation_code}`)
    console.log(`[api quotation delete] end. quotation_code=${quotation_code}`)
    return vtecxnext.response(200, { feed: { title: '削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api quotation delete')
  }
}
