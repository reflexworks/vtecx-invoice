import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import { getHtmlTemplate } from '@/pdf/pdf-quotation'
import * as apiutil from '@/utils/apiutil'
import { URI_GROUP_ADMIN } from '@/utils/apiconst'

type DynamicRoutingParam = {
  params: Promise<{ quotation_code: string }>
}

/**
 * 見積書PDFをメール送信
 * POST /api/email/quotation/[quotation_code]
 * body: { to: string | string[], cc?: string | string[], subject?: string, body?: string, company_id?: string, owner_id?: string }
 */
export const POST = async (req: NextRequest, { params }: DynamicRoutingParam): Promise<Response> => {
  const { quotation_code } = await params
  console.log(`[api email/quotation post] start. quotation_code=${quotation_code}`)

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

    // 見積書データ取得
    const entry = await vtecxnext.getEntry(`/quotation/${targetCompanyCode}/${quotation_code}`).catch(() => null)
    if (!entry) {
      return vtecxnext.response(404, { feed: { title: '見積書が見つかりません。' } })
    }

    // PDFが未保存なら生成して保存する
    const pdfSavePath = `/pdf/quotation/${targetCompanyCode}/${quotation_code}.pdf`
    const pdfEntry = await vtecxnext.getEntry(pdfSavePath).catch(() => null)
    if (!pdfEntry) {
      console.log(`[api email/quotation post] PDF not found, generating... path=${pdfSavePath}`)
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

      // 親フォルダを階層順に作成
      for (const folderPath of ['/pdf', '/pdf/quotation', `/pdf/quotation/${targetCompanyCode}`]) {
        try {
          await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: folderPath }] }])
        } catch {
          // 既存の場合は無視
        }
      }
      await vtecxnext.putPdf(pdfSavePath, html)
      console.log(`[api email/quotation post] PDF saved. path=${pdfSavePath}`)
    }

    // メール送信
    const customerName = entry.quotation?.customer_name ?? ''
    const defaultSubject = subject ?? `【見積書】${quotation_code}${customerName ? ` (${customerName})` : ''}`
    const notice = '\n\n※このメールは送信専用です。返信はなさらないでください。'
    const noticeHtml = '<p>※このメールは送信専用です。返信はなさらないでください。</p>'
    const baseBody = bodyText ?? `${customerName ? `${customerName} 様\n\n` : ''}見積書を送付いたします。\n添付のPDFをご確認ください。`
    const baseHtml = bodyText
      ? `<p>${bodyText.replace(/\n/g, '<br>')}</p>`
      : `${customerName ? `<p>${customerName} 様</p>` : ''}<p>見積書を送付いたします。<br>添付のPDFをご確認ください。</p>`
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

    console.log(`[api email/quotation post] sent. quotation_code=${quotation_code} to=${toList.join(',')}`)
    return vtecxnext.response(200, { feed: { title: 'メールを送信しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api email/quotation post')
  }
}
