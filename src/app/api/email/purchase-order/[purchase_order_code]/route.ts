import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import { getHtmlTemplate } from '@/pdf/pdf-purchase-order'
import * as apiutil from '@/utils/apiutil'
import { URI_GROUP_ADMIN } from '@/utils/apiconst'

type DynamicRoutingParam = {
  params: Promise<{ purchase_order_code: string }>
}

/**
 * 注文書PDFをメール送信
 * POST /api/email/purchase-order/[purchase_order_code]
 * body: { to: string | string[], cc?: string | string[], subject?: string, body?: string, company_id?: string, owner_id?: string }
 */
export const POST = async (req: NextRequest, { params }: DynamicRoutingParam): Promise<Response> => {
  const { purchase_order_code } = await params
  console.log(`[api email/purchase-order post] start. purchase_order_code=${purchase_order_code}`)

  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const myUid = await vtecxnext.uid()
    const groups = await apiutil.getGroups(vtecxnext).catch(() => [] as string[])
    const isAdmin = Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)

    const reqData = await apiutil.getRequestJson(req)
    const { to, cc, subject, body: bodyText } = reqData
    const ownerUidParam: string | null = reqData.owner_id ?? null
    const companyIdParam: string | null = reqData.company_id ?? null

    if (!to) {
      return vtecxnext.response(400, { feed: { title: '送信先メールアドレス（to）が必要です。' } })
    }

    const targetCompanyCode = await apiutil.resolveCompanyId(vtecxnext, String(myUid), isAdmin, companyIdParam, ownerUidParam)
    if (!targetCompanyCode) {
      return vtecxnext.response(404, { feed: { title: '企業コードが設定されていません。' } })
    }

    // 注文書データ取得
    const entry = await vtecxnext.getEntry(`/purchase_order/${targetCompanyCode}/${purchase_order_code}`).catch(() => null)
    if (!entry) {
      return vtecxnext.response(404, { feed: { title: '注文書が見つかりません。' } })
    }

    // PDFが未保存なら生成して保存する
    const pdfSavePath = `/pdf/purchase_order/${targetCompanyCode}/${purchase_order_code}.pdf`
    const pdfEntry = await vtecxnext.getEntry(pdfSavePath).catch(() => null)
    if (!pdfEntry) {
      console.log(`[api email/purchase-order post] PDF not found, generating... path=${pdfSavePath}`)
      const groupEntry = await vtecxnext.getEntry(`/_group/${targetCompanyCode}`).catch(() => null)
      const imgBase = `/_html/img/${targetCompanyCode}`
      const groupCompany = groupEntry?.company ?? entry.company ?? {}

      const purchaseOrderData = {
        purchase_order_code,
        customer_name: entry.purchase_order?.customer_name ?? '',
        subject: entry.purchase_order?.subject ?? '',
        issue_date: entry.purchase_order?.issue_date,
        delivery_date: entry.purchase_order?.delivery_date,
        delivery_location: entry.purchase_order?.delivery_location ?? '',
        remarks: entry.purchase_order?.remarks ?? '',
        sub_total: entry.purchase_order?.sub_total ?? 0,
        tax_amount: entry.purchase_order?.tax_amount ?? 0,
        total_amount: entry.purchase_order?.total_amount ?? 0,
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

      const file_name = `${purchase_order_code}.pdf`
      const raw = await getHtmlTemplate(purchaseOrderData, file_name)
      const html = raw.replace(
        /<head[^>]*>[\s\S]*?<\/head>/i,
        `<head><meta name="pdf" content="title=${file_name}" /></head>`
      )

      // 親フォルダを階層順に作成
      for (const folderPath of ['/pdf', '/pdf/purchase_order', `/pdf/purchase_order/${targetCompanyCode}`]) {
        try {
          await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: folderPath }] }])
        } catch {
          // 既存の場合は無視
        }
      }
      await vtecxnext.putPdf(pdfSavePath, html)
      console.log(`[api email/purchase-order post] PDF saved. path=${pdfSavePath}`)
    }

    // メール送信
    const customerName = entry.purchase_order?.customer_name ?? ''
    const defaultSubject = subject ?? `【注文書】${purchase_order_code}${customerName ? ` (${customerName})` : ''}`
    const notice = '\n\n※このメールは送信専用です。返信はなさらないでください。'
    const noticeHtml = '<p>※このメールは送信専用です。返信はなさらないでください。</p>'
    const baseBody = bodyText ?? `${customerName ? `${customerName} 様\n\n` : ''}注文書を送付いたします。\n添付のPDFをご確認ください。`
    const baseHtml = bodyText
      ? `<p>${bodyText.replace(/\n/g, '<br>')}</p>`
      : `${customerName ? `<p>${customerName} 様</p>` : ''}<p>注文書を送付いたします。<br>添付のPDFをご確認ください。</p>`
    const defaultBody = baseBody + notice
    const defaultHtml = baseHtml + noticeHtml

    const toList: string[] = Array.isArray(to) ? to : [to]
    const ccList: string[] | undefined = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined

    await vtecxnext.sendMail(
      {
        title: defaultSubject,
        summary: defaultBody,
        content: { ______text: defaultHtml }
      },
      toList,
      ccList,
      undefined,
      [pdfSavePath]
    )

    console.log(`[api email/purchase-order post] sent. purchase_order_code=${purchase_order_code} to=${toList.join(',')}`)
    return vtecxnext.response(200, { feed: { title: 'メールを送信しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api email/purchase-order post')
  }
}
