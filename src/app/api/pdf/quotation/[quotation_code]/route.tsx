import { NextRequest } from 'next/server'
import { VtecxNext, VtecxNextError } from '@vtecx/vtecxnext'
import { getHtmlTemplate } from '@/pdf/pdf-quotation'
import * as apiutil from '@/utils/apiutil'
import { URI_GROUP_ADMIN } from '@/utils/apiconst'

type DynamicRoutingParam = {
  params: Promise<{ quotation_code: string }>
}

/**
 * 見積書PDF出力
 * GET /api/pdf/quotation/[quotation_code]
 */
export const GET = async (req: NextRequest, { params }: DynamicRoutingParam): Promise<Response> => {
  const { quotation_code } = await params
  console.log(`[api pdf/quotation] start. quotation_code=${quotation_code}`)

  const vtecxnext = new VtecxNext(req)
  let status = 200
  let resJson: any

  try {
    const myUid = await vtecxnext.uid()
    const groups = await apiutil.getGroups(vtecxnext).catch(() => [] as string[])
    const isAdmin = Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
    const ownerUidParam = req.nextUrl.searchParams.get('owner_id')
    const companyIdParam = req.nextUrl.searchParams.get('company_id')
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(myUid), isAdmin, companyIdParam, ownerUidParam)
    console.log(`[api pdf/quotation] myUid=${myUid} isAdmin=${isAdmin} companyIdParam=${companyIdParam} ownerUidParam=${ownerUidParam} → targetCompanyCode=${targetCompanyCode}`)

    if (!targetCompanyCode) {
      return vtecxnext.response(404, { feed: { title: '企業コードが設定されていません。' } })
    }

    const entryPath = `/quotation/${targetCompanyCode}/${quotation_code}`
    console.log(`[api pdf/quotation] getEntry: ${entryPath}`)
    const entry = await vtecxnext.getEntry(entryPath).catch((e: any) => {
      console.log(`[api pdf/quotation] getEntry error: ${e?.message ?? e}`)
      return null
    })
    if (!entry) {
      return vtecxnext.response(404, { feed: { title: '見積書が見つかりません。' } })
    }

    // グループエントリから企業情報を取得
    const groupEntry = await vtecxnext.getEntry(`/_group/${targetCompanyCode}`).catch(() => null)

    const imgBase = `/_html/img/${targetCompanyCode}`
    const logoKey = `${imgBase}/logo.png`
    const stampKey = `${imgBase}/stamp.jpg`
    const groupCompany = groupEntry?.company ?? entry.company ?? {}

    const quotationData = {
      quotation_code,
      customer_name: entry.quotation?.customer_name ?? '',
      subject: entry.quotation?.subject ?? '',
      issue_date: entry.quotation?.issue_date,
      delivery_date: entry.quotation?.delivery_date,
      expiry_date: entry.quotation?.expiry_date,
      payment_terms: entry.quotation?.payment_terms ?? '',
      remarks: entry.quotation?.remarks ?? '',
      sub_total: entry.quotation?.sub_total ?? 0,
      tax_amount: entry.quotation?.tax_amount ?? 0,
      total_amount: entry.quotation?.total_amount ?? 0,
      records: (entry.record ?? []).map((r: any) => ({
        description: r.description ?? '',
        quantity: r.quantity ?? 0,
        unit: r.unit ?? '式',
        unit_price: r.unit_price ?? 0,
        tax_rate: r.tax_rate ?? 10
      })),
      company: groupCompany,
      logoKey,
      stampKey
    }

    // 保存済みPDFがあればそちらを返す
    const savePath = `/pdf/quotation/${targetCompanyCode}/${quotation_code}.pdf`
    const ok = await vtecxnext.getcontent(savePath).catch(() => false)
    if (ok) {
      console.log(`[api pdf/quotation] served from saved PDF. path=${savePath}`)
      return vtecxnext.response(status, resJson)
    }

    // 保存済みPDFがない場合はその場で生成
    const file_name = `${quotation_code}.pdf`
    const raw = await getHtmlTemplate(quotationData, file_name)
    const html = raw.replace(
      /<head[^>]*>[\s\S]*?<\/head>/i,
      `<head><meta name="pdf" content="title=${file_name}" /></head>`
    )
    await vtecxnext.toPdf(html, file_name)
  } catch (error: any) {
    if (error instanceof VtecxNextError) {
      console.log(`[api pdf/quotation] Error: status=${error.status} ${error.message}`)
      status = error.status
      resJson = { feed: { title: error.message } }
    } else {
      console.log(`[api pdf/quotation] Unexpected error: ${error}`)
      status = 503
      resJson = { feed: { title: 'Error occurred.' } }
    }
  }

  console.log(`[api pdf/quotation] end.`)
  return vtecxnext.response(status, resJson)
}

/**
 * 見積書PDF保存
 * POST /api/pdf/quotation/[quotation_code]
 */
export const POST = async (req: NextRequest, { params }: DynamicRoutingParam): Promise<Response> => {
  const { quotation_code } = await params
  console.log(`[api pdf/quotation post] start. quotation_code=${quotation_code}`)

  const vtecxnext = new VtecxNext(req)

  try {
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const myUid = await vtecxnext.uid()
    const groups = await apiutil.getGroups(vtecxnext).catch(() => [] as string[])
    const isAdmin = Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
    const ownerUidParam = req.nextUrl.searchParams.get('owner_id')
    const companyIdParam = req.nextUrl.searchParams.get('company_id')
    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(myUid), isAdmin, companyIdParam, ownerUidParam)

    if (!targetCompanyCode) {
      return vtecxnext.response(404, { feed: { title: '企業コードが設定されていません。' } })
    }

    const entryPath = `/quotation/${targetCompanyCode}/${quotation_code}`
    const entry = await vtecxnext.getEntry(entryPath).catch(() => null)
    if (!entry) {
      return vtecxnext.response(404, { feed: { title: '見積書が見つかりません。' } })
    }

    const groupEntry = await vtecxnext.getEntry(`/_group/${targetCompanyCode}`).catch(() => null)
    const imgBase = `/_html/img/${targetCompanyCode}`
    const groupCompany = groupEntry?.company ?? entry.company ?? {}

    const quotationData = {
      quotation_code,
      customer_name: entry.quotation?.customer_name ?? '',
      subject: entry.quotation?.subject ?? '',
      issue_date: entry.quotation?.issue_date,
      delivery_date: entry.quotation?.delivery_date,
      expiry_date: entry.quotation?.expiry_date,
      payment_terms: entry.quotation?.payment_terms ?? '',
      remarks: entry.quotation?.remarks ?? '',
      sub_total: entry.quotation?.sub_total ?? 0,
      tax_amount: entry.quotation?.tax_amount ?? 0,
      total_amount: entry.quotation?.total_amount ?? 0,
      records: (entry.record ?? []).map((r: any) => ({
        description: r.description ?? '',
        quantity: r.quantity ?? 0,
        unit: r.unit ?? '式',
        unit_price: r.unit_price ?? 0,
        tax_rate: r.tax_rate ?? 10
      })),
      company: groupCompany,
      logoKey: `${imgBase}/logo.png`,
      stampKey: `${imgBase}/stamp.jpg`
    }

    const file_name = `${quotation_code}.pdf`
    const raw = await getHtmlTemplate(quotationData, file_name)
    const html = raw.replace(
      /<head[^>]*>[\s\S]*?<\/head>/i,
      `<head><meta name="pdf" content="title=${file_name}" /></head>`
    )

    // 親フォルダを階層順に作成（既存でも無視）
    for (const folderPath of ['/pdf', '/pdf/quotation', `/pdf/quotation/${targetCompanyCode}`]) {
      try {
        await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: folderPath }] }])
      } catch {
        // 既存の場合は無視
      }
    }

    // PDFを保存
    const savePath = `/pdf/quotation/${targetCompanyCode}/${quotation_code}.pdf`
    await vtecxnext.putPdf(savePath, html)

    console.log(`[api pdf/quotation post] saved. path=${savePath}`)
    return vtecxnext.response(200, { feed: { title: `PDFを保存しました。` } })
  } catch (error) {
    return apiutil.responseError(error, 'api pdf/quotation post')
  }
}
