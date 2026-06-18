import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import { URI_INVOICE, URI_GROUP_ADMIN } from '@/utils/apiconst'
import * as util from 'utils/commonutil'
import * as apiutil from 'utils/apiutil'

/**
 * 請求書リスト取得処理.
 * @param req リクエスト
 * @returns 初期アカウントのパスワード
 */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api invoice-page] start.`)
  try {
    const vtecxnext = new VtecxNext(req)

    // X-Requested-With ヘッダチェック
    let chkResult = vtecxnext.checkXRequestedWith()
    if (chkResult) {
      return chkResult
    }

    // 内閣府グループ参加チェック
    //await apiutil.checkGroupCao(vtecxnext)

    // パラメータ取得
    const numStr: string = util.toString(vtecxnext.getParameter('n'))
    const limitStr: string = util.toString(vtecxnext.getParameter('l'))
    const customer_name: string = util.toString(vtecxnext.getParameter('invoice.customer_name'))
    const status: string = util.toString(vtecxnext.getParameter('invoice.status'))
    const sortParam: string = util.toString(vtecxnext.getParameter('s'))
    const isCount: boolean = vtecxnext.hasParameter('c')
    console.log(
      `[api invoice-page] n=${numStr} l=${limitStr} c=${String(isCount)} customer_name=${customer_name} status=${status} s=${sortParam}`
    )

    const uid = await vtecxnext.uid()
    const groups = await apiutil.getGroups(vtecxnext)
    const isAdmin = Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      console.log(`[api invoice-page] company_code not found. uid=${uid}`)
      if (isCount) return vtecxnext.response(200, { feed: { title: '0' } })
      return vtecxnext.response(200, { feed: {} })
    }

    // ソート条件変換
    // INDEX_SORT_FIELDS: テンプレートの _desc インデックスを使うフィールド
    //   desc → "s=invoice.fieldname_desc&"
    //   asc  → フィールド名のみ（vtecx が "-asc" を付加）
    // DIRECT_SORT_FIELDS: fieldname-direction をそのまま渡すフィールド
    //   → "s=invoice.fieldname-direction&"
    const INDEX_SORT_FIELDS = ['issue_date', 'due_date']
    const DIRECT_SORT_FIELDS = ['sub_total']
    let sortCondition = ''
    if (sortParam) {
      const lastDash = sortParam.lastIndexOf('-')
      const field = sortParam.substring(0, lastDash)       // e.g. "invoice.issue_date"
      const order = sortParam.substring(lastDash + 1)      // e.g. "desc"
      const fieldName = field.replace(/^invoice\./, '')    // e.g. "issue_date"
      if (INDEX_SORT_FIELDS.includes(fieldName)) {
        if (order === 'desc') {
          sortCondition = `s=invoice.${fieldName}_desc&`
        } else {
          sortCondition = `s=invoice.${fieldName}&`        // vtecx が "-asc" を付加
        }
      } else if (DIRECT_SORT_FIELDS.includes(fieldName)) {
        sortCondition = `s=invoice.${fieldName}-${order}&` // e.g. "s=invoice.sub_total-desc&"
      }
      // 未定義フィールドはデフォルト順（キー昇順）
    }

    // キーと検索条件
    const customerNameCondition = customer_name
      ? `invoice.customer_name-ft-${encodeURIComponent(customer_name)}&`
      : ''
    const statusCondition = status
      ? `invoice.status-eq-${encodeURIComponent(status)}&`
      : ''
    const condition = customerNameCondition + statusCondition + sortCondition
    const basePath = `${URI_INVOICE}/${targetCompanyCode}`
    const uriBase = `${basePath}?${condition}`

    // cオプション指定の場合、件数取得
    if (isCount) {
      console.log(`[api invoice-page] count start.`)
      return await count(vtecxnext, uriBase)
    }

    // 入力チェック
    if (!numStr) {
      console.log(`[api invoice-page] page number is required.`)
      return vtecxnext.response(400, { feed: { title: 'page number is required.' } })
    }
    const num = util.toNumber(numStr)
    if (!Number.isSafeInteger(num) || num < 1) {
      console.log(`[api invoice-page] page number must be a positive number.`)
      return vtecxnext.response(400, { feed: { title: 'page number must be a positive number.' } })
    }
    if (!limitStr) {
      console.log(`[api invoice-page] limit is required.`)
      return vtecxnext.response(400, { feed: { title: 'limit is required.' } })
    }
    const limit = util.toNumber(limitStr)
    if (!Number.isSafeInteger(limit) || limit < 1) {
      console.log(`[api invoice-page] limit must be a positive number.`)
      return vtecxnext.response(400, { feed: { title: 'limit must be a positive number.' } })
    }

    // ページ取得
    console.log(
      `[api invoice-page] paging start. n=${numStr} l=${limitStr} condition: ${condition}`
    )
    const uri = `${uriBase}l=${limitStr}`
    console.log('uri:', uri)
    const result = await apiutil.getPageWithPagination(vtecxnext, uri, num)
    const resJson = result
    const resStatus = resJson ? 200 : 204
    console.log('[api invoice-page] end.')
    return vtecxnext.response(resStatus, resJson)
  } catch (e) {
    return apiutil.responseError(e, 'api invoice-page')
  }
}

/**
 * 件数取得
 * @param vtecxnext vtecxnext
 * @param uri キーと検索条件
 */
const count = async (vtecxnext: VtecxNext, uri: string): Promise<Response> => {
  console.log('[api invoice count] start.')
  console.log('[api invoice count] count start')
  const result = await vtecxnext.count(uri)
  console.log('[api invoice count] count end')
  const resStatus = 200
  const resJson = { feed: { title: String(result) } }
  console.log('[api invoice count] end.')
  return vtecxnext.response(resStatus, resJson)
}
