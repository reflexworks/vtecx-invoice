import { NextRequest } from 'next/server'
import { VtecxNext, VtecxNextError } from '@vtecx/vtecxnext'
import { getHtmlTemplate } from '@/pdf/pdf-invoice'
import * as apiutil from '@/utils/apiutil'
import { URI_GROUP_ADMIN } from '@/utils/apiconst'

type DynamicRoutingParam = {
  params: Promise<{ invoice_code: string }>
}

/**
 * 請求書PDF出力
 * GET /api/pdf/invoice/[invoice_code]
 */
export const GET = async (req: NextRequest, { params }: DynamicRoutingParam): Promise<Response> => {
  const { invoice_code } = await params
  console.log(`[api pdf/invoice] start. invoice_code=${invoice_code}`)

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

    if (!targetCompanyCode) {
      return vtecxnext.response(404, { feed: { title: '企業コードが設定されていません。' } })
    }

    const entry = await vtecxnext.getEntry(`/invoice/${targetCompanyCode}/${invoice_code}`).catch(() => null)
    if (!entry) {
      return vtecxnext.response(404, { feed: { title: '請求書が見つかりません。' } })
    }

    // グループエントリから企業情報・口座情報を取得
    const groupEntry = await vtecxnext.getEntry(`/_group/${targetCompanyCode}`).catch(() => null)

    const imgBase = `/_html/img/${targetCompanyCode}`
    const logoExists = await new VtecxNext(req).getcontent(`${imgBase}/logo.png`).catch(() => false)
    const stampExists = await new VtecxNext(req).getcontent(`${imgBase}/stamp.jpg`).catch(() => false)
    const logoKey = logoExists ? `${imgBase}/logo.png` : undefined
    const stampKey = stampExists ? `${imgBase}/stamp.jpg` : undefined
    const groupCompany = groupEntry?.company ?? entry.company ?? {}
    const groupBank = entry.bank ?? groupEntry?.bank ?? {}

    const invoiceData = {
      invoice_code,
      customer_name: entry.invoice?.customer_name ?? '',
      subject: entry.invoice?.subject ?? '',
      issue_date: entry.invoice?.issue_date,
      due_date: entry.invoice?.due_date,
      remarks: entry.invoice?.remarks ?? '',
      sub_total: entry.invoice?.sub_total ?? 0,
      tax_amount: entry.invoice?.tax_amount ?? 0,
      total_amount: entry.invoice?.total_amount ?? 0,
      records: (entry.record ?? []).map((r: any) => ({
        description: r.description ?? '',
        quantity: r.quantity ?? 0,
        unit_price: r.unit_price ?? 0,
        tax_rate: r.tax_rate ?? 10
      })),
      bank: groupBank,
      company: groupCompany,
      logoKey,
      stampKey
    }

    const file_name = `invoice_${invoice_code}.pdf`
    const raw = await getHtmlTemplate(invoiceData, file_name)
    const html = raw.replace(
      /<head[^>]*>[\s\S]*?<\/head>/i,
      `<head><meta name="pdf" content="title=${file_name}" /></head>`
    )
    await vtecxnext.toPdf(html, file_name)
  } catch (error) {
    if (error instanceof VtecxNextError) {
      console.log(`[api pdf/invoice] Error: status=${error.status} ${error.message}`)
      status = error.status
      resJson = { feed: { title: error.message } }
    } else {
      console.log(`[api pdf/invoice] Unexpected error: ${error}`)
      status = 503
      resJson = { feed: { title: 'Error occurred.' } }
    }
  }

  console.log(`[api pdf/invoice] end.`)
  return vtecxnext.response(status, resJson)
}

/**
 * 請求書PDF保存
 * POST /api/pdf/invoice/[invoice_code]
 */
export const POST = async (req: NextRequest, { params }: DynamicRoutingParam): Promise<Response> => {
  const { invoice_code } = await params
  console.log(`[api pdf/invoice post] start. invoice_code=${invoice_code}`)

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

    const entry = await vtecxnext.getEntry(`/invoice/${targetCompanyCode}/${invoice_code}`).catch(() => null)
    if (!entry) {
      return vtecxnext.response(404, { feed: { title: '請求書が見つかりません。' } })
    }

    const groupEntry = await vtecxnext.getEntry(`/_group/${targetCompanyCode}`).catch(() => null)
    const imgBase = `/_html/img/${targetCompanyCode}`
    const groupCompany = groupEntry?.company ?? entry.company ?? {}
    const groupBank = entry.bank ?? groupEntry?.bank ?? {}

    const invoiceData = {
      invoice_code,
      customer_name: entry.invoice?.customer_name ?? '',
      subject: entry.invoice?.subject ?? '',
      issue_date: entry.invoice?.issue_date,
      due_date: entry.invoice?.due_date,
      remarks: entry.invoice?.remarks ?? '',
      sub_total: entry.invoice?.sub_total ?? 0,
      tax_amount: entry.invoice?.tax_amount ?? 0,
      total_amount: entry.invoice?.total_amount ?? 0,
      records: (entry.record ?? []).map((r: any) => ({
        description: r.description ?? '',
        quantity: r.quantity ?? 0,
        unit_price: r.unit_price ?? 0,
        tax_rate: r.tax_rate ?? 10
      })),
      bank: groupBank,
      company: groupCompany,
      logoKey: `${imgBase}/logo.png`,
      stampKey: `${imgBase}/stamp.jpg`
    }

    const file_name = `invoice_${invoice_code}.pdf`
    const raw = await getHtmlTemplate(invoiceData, file_name)
    const html = raw.replace(
      /<head[^>]*>[\s\S]*?<\/head>/i,
      `<head><meta name="pdf" content="title=${file_name}" /></head>`
    )

    // 親フォルダを階層順に作成（既存でも無視）
    for (const folderPath of ['/pdf', '/pdf/invoice', `/pdf/invoice/${targetCompanyCode}`]) {
      try {
        await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: folderPath }] }])
      } catch {
        // 既存の場合は無視
      }
    }

    const savePath = `/pdf/invoice/${targetCompanyCode}/${invoice_code}.pdf`
    await vtecxnext.putPdf(savePath, html)

    console.log(`[api pdf/invoice post] saved. path=${savePath}`)
    return vtecxnext.response(200, { feed: { title: 'PDFを保存しました。' } })
  } catch (error) {
    return apiutil.responseError(error, 'api pdf/invoice post')
  }
}
