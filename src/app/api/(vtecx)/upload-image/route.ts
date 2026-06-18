import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'

/** type ごとに拡張子を固定 */
const typeToExt: Record<string, string> = {
  logo: 'png',
  stamp: 'jpg'
}

const getImgPath = (companyId: string, type: string) => {
  const ext = typeToExt[type] ?? 'png'
  return `/_html/img/${companyId}/${type}.${ext}`
}

/** 画像プロキシ（img src として直接使用可能、X-Requested-With 不要） */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api upload-image get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const companyId = vtecxnext.getParameter('uid')
    const type = vtecxnext.getParameter('type')
    if (!companyId || !type) {
      return new Response('uid and type are required', { status: 400 })
    }

    const imgPath = getImgPath(companyId, type)
    console.log(`[api upload-image get] companyId=${companyId} type=${type} imgPath=${imgPath}`)

    const found = await vtecxnext.getcontent(imgPath).catch((e: any) => {
      console.log(`[api upload-image get] getcontent error: ${e?.message ?? e}`)
      return false
    })
    const vx = vtecxnext as any
    if (!found || !vx.bufferData) {
      return new Response('Not Found', { status: 404 })
    }

    const ext = typeToExt[type] ?? 'png'
    const extToMime: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
    }
    const contentType = extToMime[ext] ?? 'image/png'

    return new Response(vx.bufferData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60'
      }
    })
  } catch (e: any) {
    const msg = e?.message ?? String(e)
    console.error('[api upload-image get] error', msg)
    return new Response(msg, { status: 404 })
  }
}

/** 画像削除 */
export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api upload-image delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const companyId = vtecxnext.getParameter('uid')
    const type = vtecxnext.getParameter('type')

    if (!companyId || !type) {
      return vtecxnext.response(400, { feed: { title: 'uid と type は必須です。' } })
    }

    const imgPath = getImgPath(companyId, type)
    await vtecxnext.deletecontent(imgPath).catch(() => {})

    console.log(`[api upload-image delete] end. imgPath=${imgPath}`)
    return vtecxnext.response(200, { feed: { title: '削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api upload-image delete')
  }
}

/** 画像アップロード */
export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api upload-image put] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const companyId = vtecxnext.getParameter('uid')
    const type = vtecxnext.getParameter('type')

    if (!companyId || !type) {
      return vtecxnext.response(400, { feed: { title: 'uid と type は必須です。' } })
    }

    const imgDir = `/_html/img/${companyId}`
    const imgPath = `/_html/img/${companyId}/${type}.${typeToExt[type] ?? 'png'}`
    console.log(`[api upload-image put] imgPath=${imgPath}`)

    // 親フォルダが存在しない場合に備えて作成しておく
    await vtecxnext.putcontent(imgDir, undefined, new ArrayBuffer(0))
      .catch((e: any) => console.log(`[upload-image put] folder create error (non-fatal): ${e?.message ?? e}`))

    await vtecxnext.putcontent(imgPath)

    console.log(`[api upload-image put] end. imgPath=${imgPath}`)
    return vtecxnext.response(200, { feed: { title: 'アップロードしました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api upload-image put')
  }
}
