import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import { URI_PURCHASE_ORDER, URI_GROUP_ADMIN } from '@/utils/apiconst'
import * as util from 'utils/commonutil'
import * as apiutil from 'utils/apiutil'

export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api purchase-order-page] start.`)
  try {
    const vtecxnext = new VtecxNext(req)

    const chkResult = vtecxnext.checkXRequestedWith()
    if (chkResult) return chkResult

    const numStr: string = util.toString(vtecxnext.getParameter('n'))
    const limitStr: string = util.toString(vtecxnext.getParameter('l'))
    const customer_name: string = util.toString(vtecxnext.getParameter('purchase_order.customer_name'))
    const status: string = util.toString(vtecxnext.getParameter('purchase_order.status'))
    const sortParam: string = util.toString(vtecxnext.getParameter('s'))
    const isCount: boolean = vtecxnext.hasParameter('c')
    console.log(
      `[api purchase-order-page] n=${numStr} l=${limitStr} c=${String(isCount)} customer_name=${customer_name} status=${status} s=${sortParam}`
    )

    const uid = await vtecxnext.uid()
    const groups = await apiutil.getGroups(vtecxnext)
    const isAdmin = Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
    const ownerUidParam = vtecxnext.getParameter('owner_id') ?? null
    const companyIdParam = vtecxnext.getParameter('company_id') ?? null
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(uid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      console.log(`[api purchase-order-page] company_code not found. uid=${uid}`)
      if (isCount) return vtecxnext.response(200, { feed: { title: '0' } })
      return vtecxnext.response(200, { feed: {} })
    }

    // ソート条件変換
    const INDEX_SORT_FIELDS = ['issue_date', 'delivery_date']
    const DIRECT_SORT_FIELDS = ['sub_total']
    let sortCondition = ''
    if (sortParam) {
      const lastDash = sortParam.lastIndexOf('-')
      const field = sortParam.substring(0, lastDash)
      const order = sortParam.substring(lastDash + 1)
      const fieldName = field.replace(/^purchase_order\./, '')
      if (INDEX_SORT_FIELDS.includes(fieldName)) {
        sortCondition = order === 'desc'
          ? `s=purchase_order.${fieldName}_desc&`
          : `s=purchase_order.${fieldName}&`
      } else if (DIRECT_SORT_FIELDS.includes(fieldName)) {
        sortCondition = `s=purchase_order.${fieldName}-${order}&`
      }
    }

    const customerNameCondition = customer_name
      ? `purchase_order.customer_name-ft-${encodeURIComponent(customer_name)}&`
      : ''
    const statusCondition = status
      ? `purchase_order.status-eq-${encodeURIComponent(status)}&`
      : ''
    const condition = customerNameCondition + statusCondition + sortCondition
    const basePath = `${URI_PURCHASE_ORDER}/${targetCompanyCode}`
    const uriBase = `${basePath}?f&${condition}`

    if (isCount) {
      const result = await vtecxnext.count(uriBase)
      return vtecxnext.response(200, { feed: { title: String(result) } })
    }

    if (!numStr) return vtecxnext.response(400, { feed: { title: 'page number is required.' } })
    const num = util.toNumber(numStr)
    if (!Number.isSafeInteger(num) || num < 1) return vtecxnext.response(400, { feed: { title: 'page number must be a positive number.' } })
    if (!limitStr) return vtecxnext.response(400, { feed: { title: 'limit is required.' } })
    const limit = util.toNumber(limitStr)
    if (!Number.isSafeInteger(limit) || limit < 1) return vtecxnext.response(400, { feed: { title: 'limit must be a positive number.' } })

    const uri = `${uriBase}l=${limitStr}`
    console.log(`[api purchase-order-page] uri=${uri}`)
    const result = await apiutil.getPageWithPagination(vtecxnext, uri, num)
    const resStatus = result ? 200 : 204
    console.log('[api purchase-order-page] end.')
    return vtecxnext.response(resStatus, result)
  } catch (e) {
    return apiutil.responseError(e, 'api purchase-order-page')
  }
}
