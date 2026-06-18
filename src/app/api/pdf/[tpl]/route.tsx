import { NextRequest } from 'next/server'
import { VtecxNext, VtecxNextError } from '@vtecx/vtecxnext'
import dayjs from 'dayjs'

/** <head> を強制的に <meta name="pdf"> のみへ差し替える */
function forceHeadMetaOnly(html: string, metaContent: string) {
  const meta = `<meta name="pdf" content="${metaContent}" />`
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, `<head>${meta}</head>`)
  }
  return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${meta}</head>`)
}

/** /api/pdf/[tpl]?mode=html で最終HTML表示、/api/pdf/[tpl] でPDF出力 */
export const GET = async (req: NextRequest): Promise<Response> => {
  const url = new URL(req.url)
  const tpl = url.pathname.split('/').pop() || 'GenericDocument'
  const mode = url.searchParams.get('mode') // 'html' ならHTML返却

  const vtecxnext = new VtecxNext(req)
  let status = 200
  let resJson: any

  try {
    const mod = await import(`../../../../../templates/${tpl}`)
    const getHtmlTemplate = mod.getHtmlTemplate as (file: string) => Promise<string>
    const file = `${tpl}-${dayjs().format('YYYYMMDDHHmmss')}.pdf`
    let html = await getHtmlTemplate(file)

    // ここで <head> を安全化（<meta name="pdf"> 1個のみ）
    html = forceHeadMetaOnly(html, `title=${file}`)

    if (mode === 'html') {
      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    }

    await vtecxnext.toPdf(html, file)
  } catch (err) {
    if (err instanceof VtecxNextError) {
      status = err.status
      resJson = { feed: { title: err.message } }
    } else {
      status = 503
      resJson = { feed: { title: 'Unexpected error' } }
    }
  }

  return vtecxnext.response(status, resJson)
}
