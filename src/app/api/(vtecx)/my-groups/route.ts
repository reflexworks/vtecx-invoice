import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'

/**
 * 自分の所属グループ一覧を返す
 * GET /api/my-groups
 * → /_user/{uid}/group/ のエイリアス一覧を返す
 * エイリアスエントリには title（会社名）と company_group（company_id, role）が含まれる
 */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api my-groups get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const myUid = await vtecxnext.uid()
    const targetUidParam = vtecxnext.getParameter('uid')
    // 管理者が他ユーザーを指定した場合はそのユーザーのグループを返す
    const uid = (targetUidParam && await vtecxnext.isAdmin().catch(() => false))
      ? targetUidParam
      : myUid

    const feed: any = await vtecxnext.getFeed(`/_user/${uid}/group/`).catch(() => null)
    const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])

    console.log(`[api my-groups get] end. uid=${uid} count=${entries.length}`)
    return vtecxnext.response(200, entries.length > 0 ? { feed: { entry: entries } } : { feed: {} })
  } catch (e) {
    return apiutil.responseError(e, 'api my-groups get')
  }
}
