import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import { URI_BANK, BANK_CODE_LEN } from '@/utils/apiconst'

/** company_id が指定されている場合、グループメンバーか管理者かを検証してパスを返す */
const resolveOwner = async (vtecxnext: VtecxNext, company_id: string | null): Promise<string> => {
  const uid = await vtecxnext.uid()
  if (!company_id) return uid
  // グループメンバーチェック
  const membership = await vtecxnext.getEntry(`/_user/${uid}/group/${company_id}`).catch(() => null)
  if (membership) return company_id
  // 管理者チェック
  const isAdmin = await vtecxnext.isAdmin().catch(() => false)
  if (isAdmin) return company_id
  throw new Error('このグループへのアクセス権がありません。')
}

export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api bank get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const company_id = vtecxnext.getParameter('company_id') ?? null
    const owner = await resolveOwner(vtecxnext, company_id)
    const bank_code = vtecxnext.getParameter('bank_code')

    if (bank_code) {
      const entry = await vtecxnext.getEntry(`${URI_BANK}/${owner}/${bank_code}`)
      return vtecxnext.response(200, entry ? [entry] : [])
    } else {
      const feed: any = await vtecxnext.getFeed(`${URI_BANK}/${owner}/`)
      return vtecxnext.response(200, feed ?? { feed: {} })
    }
  } catch (e) {
    return apiutil.responseError(e, 'api bank get')
  }
}

export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api bank post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const company_id = vtecxnext.getParameter('company_id') ?? null
    const owner = await resolveOwner(vtecxnext, company_id)
    const reqData: any[] = await apiutil.getRequestJson(req)

    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const source = reqData[0]

    // 親フォルダを階層順に作成（既存でも無視）
    for (const uri of [URI_BANK, `${URI_BANK}/${owner}`]) {
      try {
        await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: uri }] }])
      } catch {
        // 既存の場合は無視
      }
    }

    const bank_code = (await apiutil.allocids(vtecxnext, `${URI_BANK}/${owner}`)).padStart(BANK_CODE_LEN, '0')

    if (source.bank?.is_default) {
      await clearDefault(vtecxnext, owner)
    }

    const entry: any = {
      link: [{ ___rel: 'self', ___href: `${URI_BANK}/${owner}/${bank_code}` }],
      bank: {
        bank_code,
        bank_label: source.bank?.bank_label ?? '',
        is_default: source.bank?.is_default ?? false,
        bank_title: source.bank?.bank_title ?? '',
        branch_code: source.bank?.branch_code ?? '',
        branch_name: source.bank?.branch_name ?? '',
        bank_type: source.bank?.bank_type ?? '',
        bank_number: source.bank?.bank_number ?? '',
        bank_name: source.bank?.bank_name ?? ''
      }
    }

    const result = await apiutil.post(vtecxnext, [entry])
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api bank post')
  }
}

export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api bank put] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const company_id = vtecxnext.getParameter('company_id') ?? null
    const owner = await resolveOwner(vtecxnext, company_id)
    const reqData: any[] = await apiutil.getRequestJson(req)

    if (!reqData || reqData.length === 0) {
      return vtecxnext.response(400, { feed: { title: 'データが空です。' } })
    }

    const source = reqData[0]
    const bank_code = source.bank?.bank_code
    if (!bank_code) {
      return vtecxnext.response(400, { feed: { title: '振込先コードが指定されていません。' } })
    }

    if (source.bank?.is_default) {
      await clearDefault(vtecxnext, owner, bank_code)
    }

    const entry: any = {
      link: [{ ___rel: 'self', ___href: `${URI_BANK}/${owner}/${bank_code}` }],
      bank: {
        bank_code,
        bank_label: source.bank?.bank_label ?? '',
        is_default: source.bank?.is_default ?? false,
        bank_title: source.bank?.bank_title ?? '',
        branch_code: source.bank?.branch_code ?? '',
        branch_name: source.bank?.branch_name ?? '',
        bank_type: source.bank?.bank_type ?? '',
        bank_number: source.bank?.bank_number ?? '',
        bank_name: source.bank?.bank_name ?? ''
      }
    }

    const result = await apiutil.put(vtecxnext, [entry])
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api bank put')
  }
}

export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api bank delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const company_id = vtecxnext.getParameter('company_id') ?? null
    const owner = await resolveOwner(vtecxnext, company_id)
    const bank_code = vtecxnext.getParameter('bank_code')
    if (!bank_code) {
      return vtecxnext.response(400, { feed: { title: '振込先コードが指定されていません。' } })
    }

    await vtecxnext.deleteEntry(`${URI_BANK}/${owner}/${bank_code}`)
    return vtecxnext.response(200, { feed: { title: '削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api bank delete')
  }
}

const clearDefault = async (vtecxnext: VtecxNext, uid: string, excludeCode?: string) => {
  try {
    const feed: any = await vtecxnext.getFeed(`${URI_BANK}/${uid}/`)
    const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
    for (const e of entries) {
      const b = e.bank
      if (!b || !b.is_default) continue
      if (excludeCode && b.bank_code === excludeCode) continue
      await vtecxnext.put([{ link: e.link, bank: { ...b, is_default: false } }])
    }
  } catch (e) {
    console.log(`[api bank clearDefault] error: ${e}`)
  }
}
