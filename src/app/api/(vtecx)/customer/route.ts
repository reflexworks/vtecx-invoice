import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import { URI_GROUP_ADMIN, URI_CUSTOMER, CUSTOMER_CODE_PREFIX, CUSTOMER_CODE_LEN } from '@/utils/apiconst'

const isAdminUser = async (vtecxnext: VtecxNext): Promise<boolean> => {
  try {
    const groups = await apiutil.getGroups(vtecxnext)
    return Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
  } catch {
    return false
  }
}

/**
 * 顧客マスタ一覧取得 / 1件取得
 * GET /api/customer
 * GET /api/customer?customer_code=CUS00001
 * GET /api/customer?customer_name=株式会社
 */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api customer get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const customer_code = vtecxnext.getParameter('customer_code')
    const customer_name = vtecxnext.getParameter('customer_name')
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      return vtecxnext.response(200, { feed: {} })
    }

    if (customer_code) {
      const entry = await vtecxnext.getEntry(`${URI_CUSTOMER}/${targetCompanyCode}/${customer_code}`).catch(() => null)
      return vtecxnext.response(200, entry ? [entry] : [])
    }

    if (customer_name) {
      // full-text search（インデックス: customer.customer_name;^/customer）
      // ※ SDK に渡すパスに encodeURIComponent は不要（二重エンコードになるため）
      const ftFeed: any = await vtecxnext.getFeed(
        `${URI_CUSTOMER}/${targetCompanyCode}/?f&customer.customer_name-ft-${customer_name}&l=20`
      ).catch(() => null)
      const ftEntries: any[] = Array.isArray(ftFeed) ? ftFeed : []
      if (ftEntries.length > 0) {
        return vtecxnext.response(200, { feed: { entry: ftEntries } })
      }
      // インデックス未適用データのフォールバック: 全件取得→部分一致フィルタ
      const allFeed: any = await vtecxnext.getFeed(`${URI_CUSTOMER}/${targetCompanyCode}/`).catch(() => null)
      const allEntries: any[] = Array.isArray(allFeed) ? allFeed : []
      const filtered = allEntries.filter((e: any) =>
        e.customer?.customer_name?.includes(customer_name)
      )
      return vtecxnext.response(200, filtered.length > 0 ? { feed: { entry: filtered } } : { feed: {} })
    }

    const feed: any = await vtecxnext.getFeed(`${URI_CUSTOMER}/${targetCompanyCode}/`).catch(() => null)
    const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
    const result = entries.length > 0 ? { feed: { entry: entries } } : { feed: {} }
    console.log(`[api customer get] end. count=${entries.length}`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api customer get')
  }
}

/**
 * 顧客マスタ登録
 * POST /api/customer
 * body: [{ customer: { customer_name, to_email, cc_email } }]
 */
export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api customer post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const company_code = await apiutil.resolveCompanyId(vtecxnext, String(uid), false, companyIdParam, null)

    if (!company_code) {
      return vtecxnext.response(400, { feed: { title: 'グループに所属していません。' } })
    }

    const reqData: any[] = await apiutil.getRequestJson(req)
    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const customer = reqData[0].customer
    if (!customer?.customer_name) {
      return vtecxnext.response(400, { feed: { title: '顧客名は必須です。' } })
    }

    const range = await apiutil.allocids(vtecxnext, `${URI_CUSTOMER}/${company_code}`)
    const num = range.split(',')[0]
    const customer_code = `${CUSTOMER_CODE_PREFIX}${num.padStart(CUSTOMER_CODE_LEN, '0')}`

    // company_code フォルダを作成（既存の場合は無視）
    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${URI_CUSTOMER}/${company_code}` }] }])
    } catch {
      // 既存の場合は無視
    }

    const entry = {
      link: [{ ___rel: 'self', ___href: `${URI_CUSTOMER}/${company_code}/${customer_code}` }],
      customer: {
        customer_code,
        customer_name: customer.customer_name,
        to_email: customer.to_email ?? '',
        cc_email: customer.cc_email ?? ''
      },
      customer_email: Array.isArray(customer.customer_email) ? customer.customer_email : []
    }

    const result = await apiutil.put(vtecxnext, [entry])
    console.log(`[api customer post] end. customer_code=${customer_code}`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api customer post')
  }
}

/**
 * 顧客マスタ更新
 * PUT /api/customer
 * body: [{ customer: { customer_code, customer_name, to_email, cc_email } }]
 */
export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api customer put] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      return vtecxnext.response(400, { feed: { title: '企業コードが設定されていません。' } })
    }

    const reqData: any[] = await apiutil.getRequestJson(req)
    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const customer = reqData[0].customer
    if (!customer?.customer_code) {
      return vtecxnext.response(400, { feed: { title: '顧客コードが指定されていません。' } })
    }
    if (!customer?.customer_name) {
      return vtecxnext.response(400, { feed: { title: '顧客名は必須です。' } })
    }

    const existing = await vtecxnext.getEntry(`${URI_CUSTOMER}/${targetCompanyCode}/${customer.customer_code}`).catch(() => null)

    const entry = {
      link: [{ ___rel: 'self', ___href: `${URI_CUSTOMER}/${targetCompanyCode}/${customer.customer_code}` }],
      id: existing?.id,
      customer: {
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        to_email: customer.to_email ?? '',
        cc_email: customer.cc_email ?? ''
      },
      customer_email: Array.isArray(customer.customer_email)
        ? customer.customer_email
        : ((existing as any)?.customer_email ?? []),
      contributor: existing?.contributor
    }

    const result = await apiutil.put(vtecxnext, [entry])
    console.log(`[api customer put] end. customer_code=${customer.customer_code}`)
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api customer put')
  }
}

/**
 * 顧客マスタ削除
 * DELETE /api/customer?customer_code=CUS00001
 */
export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api customer delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const isAdmin = await isAdminUser(vtecxnext)
    const customer_code = vtecxnext.getParameter('customer_code')
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!customer_code) {
      return vtecxnext.response(400, { feed: { title: '顧客コードが指定されていません。' } })
    }
    if (!targetCompanyCode) {
      return vtecxnext.response(400, { feed: { title: '企業コードが設定されていません。' } })
    }

    await vtecxnext.deleteEntry(`${URI_CUSTOMER}/${targetCompanyCode}/${customer_code}`)
    console.log(`[api customer delete] end. customer_code=${customer_code}`)
    return vtecxnext.response(200, { feed: { title: '削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api customer delete')
  }
}
