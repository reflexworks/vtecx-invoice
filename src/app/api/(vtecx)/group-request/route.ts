import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'

const URI_USER = '/_user'
const URI_GROUP = '/_group'

// /_group/{company_id}/request/{uid}
const requestPath = (company_id: string, uid: string) =>
  `${URI_GROUP}/${company_id}/request/${uid}`

// /_user/{uid}/group_request/{company_id}
const userRequestPath = (uid: string, company_id: string) =>
  `${URI_USER}/${uid}/group_request/${company_id}`

/**
 * GET: 申請一覧取得
 * ?company_id=C00001 → グループへの申請一覧（グループ管理者のみ）
 * パラメータなし → 自分が送った申請一覧
 */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group-request get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const company_id = vtecxnext.getParameter('company_id')

    if (company_id) {
      // グループへの申請一覧（グループ管理者 or システム管理者のみ）
      const isAdmin = await vtecxnext.isAdmin()
      const isGroupAdmin = !!(await vtecxnext
        .getEntry(`${URI_GROUP}/${company_id}/AD/${uid}`)
        .catch(() => null))
      if (!isAdmin && !isGroupAdmin) {
        return vtecxnext.response(403, { feed: { title: '申請一覧の取得はグループ管理者のみ可能です。' } })
      }

      const feed = (await vtecxnext.getFeed(`${URI_GROUP}/${company_id}/request/`).catch(() => null)) as any
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      console.log(`[api group-request get] end. company_id=${company_id} count=${entries.length}`)
      return vtecxnext.response(200, entries.length > 0 ? entries : [])
    } else {
      // 自分の申請一覧
      const feed: any = await vtecxnext
        .getFeed(`${URI_USER}/${uid}/group_request/`)
        .catch(() => null)
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      console.log(`[api group-request get] end. uid=${uid} own requests count=${entries.length}`)
      return vtecxnext.response(200, entries.length > 0 ? entries : [])
    }
  } catch (e) {
    return apiutil.responseError(e, 'api group-request get')
  }
}

/**
 * POST: グループへの参加申請
 * ?company_id=C00001
 */
export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group-request post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const company_id = vtecxnext.getParameter('company_id')
    if (!company_id) {
      return vtecxnext.response(400, { feed: { title: 'company_idが必要です。' } })
    }

    // グループ存在確認
    const groupEntry = await vtecxnext
      .getEntry(`${URI_GROUP}/${company_id}`)
      .catch(() => null)
    if (!groupEntry) {
      return vtecxnext.response(404, { feed: { title: 'グループが見つかりません。' } })
    }

    // 既にメンバーかチェック
    const roles = ['AD', 'ED', 'VI']
    for (const role of roles) {
      const existing = await vtecxnext
        .getEntry(`${URI_GROUP}/${company_id}/${role}/${uid}`)
        .catch(() => null)
      if (existing) {
        return vtecxnext.response(409, { feed: { title: '既にこのグループのメンバーです。' } })
      }
    }

    // 申請済みかチェック
    const existingRequest = await vtecxnext
      .getEntry(requestPath(company_id, String(uid)))
      .catch(() => null)
    if (existingRequest) {
      return vtecxnext.response(409, { feed: { title: '既に申請済みです。' } })
    }

    // ユーザー情報・グループ名取得
    const [userEntry, groupEntryForName] = await Promise.all([
      vtecxnext.getEntry(`${URI_USER}/${uid}`).catch(() => null),
      vtecxnext.getEntry(`${URI_GROUP}/${company_id}`).catch(() => null),
    ])
    const email = userEntry?.company?.email ?? userEntry?.title ?? String(uid)
    const groupName: string = (groupEntryForName as any)?.title ?? company_id

    // 親フォルダが存在しない場合は作成（エイリアスの両パス分）
    const requestFolderPath = `${URI_GROUP}/${company_id}/request`
    const userRequestFolderPath = `${URI_USER}/${uid}/group_request`

    const [existingRequestFolder, existingUserRequestFolder] = await Promise.all([
      vtecxnext.getEntry(requestFolderPath).catch(() => null),
      vtecxnext.getEntry(userRequestFolderPath).catch(() => null),
    ])

    const foldersToCreate: any[] = []
    if (!existingRequestFolder) foldersToCreate.push({ link: [{ ___rel: 'self', ___href: requestFolderPath }] })
    if (!existingUserRequestFolder) foldersToCreate.push({ link: [{ ___rel: 'self', ___href: userRequestFolderPath }] })
    if (foldersToCreate.length > 0) {
      await vtecxnext.put(foldersToCreate)
    }

    // 申請エントリ登録（alias）
    // self:      /_group/{company_id}/request/{uid}
    // alternate: /_user/{uid}/group_request/{company_id}
    const requestEntry: any = {
      link: [
        { ___rel: 'self', ___href: requestPath(company_id, String(uid)) },
        { ___rel: 'alternate', ___href: userRequestPath(String(uid), company_id) }
      ],
      title: email,
      company_group: { company_id, status: 'pending', company_name: groupName },
      user: { uid: String(uid) }
    }
    console.log(`[api group-request post] put request: ${JSON.stringify(requestEntry)}`)
    await vtecxnext.put([requestEntry])

    console.log(`[api group-request post] end. company_id=${company_id} uid=${uid}`)
    return vtecxnext.response(200, { feed: { title: '参加申請を送信しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group-request post')
  }
}

/**
 * PUT: 申請の承認 or 却下（グループ管理者のみ）
 * ?company_id=C00001&uid=xxx&action=approve|reject
 */
export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group-request put] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const myUid = await vtecxnext.uid()
    const isAdmin = await vtecxnext.isAdmin()
    const company_id = vtecxnext.getParameter('company_id')
    const targetUid = vtecxnext.getParameter('uid')
    const action = vtecxnext.getParameter('action') // 'approve' | 'reject'
    const role = vtecxnext.getParameter('role') ?? 'ED' // 'ED' | 'VI'

    if (!company_id || !targetUid || !action) {
      return vtecxnext.response(400, { feed: { title: 'company_id, uid, action が必要です。' } })
    }
    if (action !== 'approve' && action !== 'reject') {
      return vtecxnext.response(400, { feed: { title: 'action は approve または reject を指定してください。' } })
    }
    if (action === 'approve' && role !== 'ED' && role !== 'VI') {
      return vtecxnext.response(400, { feed: { title: 'role は ED または VI を指定してください。' } })
    }

    // 権限チェック
    const isGroupAdmin = !!(await vtecxnext
      .getEntry(`${URI_GROUP}/${company_id}/AD/${myUid}`)
      .catch(() => null))
    if (!isAdmin && !isGroupAdmin) {
      return vtecxnext.response(403, { feed: { title: '承認・却下はグループ管理者のみ可能です。' } })
    }

    // 申請エントリ確認
    const requestEntry = await vtecxnext
      .getEntry(requestPath(company_id, targetUid))
      .catch(() => null)
    if (!requestEntry) {
      return vtecxnext.response(404, { feed: { title: '申請が見つかりません。' } })
    }

    if (action === 'reject') {
      // 申請エントリのステータスを rejected に更新（削除しない）
      const updatedEntry: any = {
        ...requestEntry,
        company_group: { ...requestEntry.company_group, status: 'rejected' }
      }
      await vtecxnext.put([updatedEntry])
      console.log(`[api group-request put] rejected. company_id=${company_id} uid=${targetUid}`)
      return vtecxnext.response(200, { feed: { title: '申請を却下しました。' } })
    }

    if (action === 'approve') {
      // グループのエントリ取得
      const groupEntry = await vtecxnext
        .getEntry(`${URI_GROUP}/${company_id}`)
        .catch(() => null)
      if (!groupEntry) {
        return vtecxnext.response(404, { feed: { title: 'グループが見つかりません。' } })
      }
      const owner_id = groupEntry.company_group?.owner_id
      const assignedRole = role

      // ユーザエントリ取得（メールアドレスをメンバーエントリに埋め込むため）
      const userEntry = await vtecxnext.getEntry(`${URI_USER}/${targetUid}`).catch(() => null)
      const userEmail: string = userEntry?.company?.email ?? ''

      // メンバーとして追加（alias）
      // subtitle にメールアドレスを保存（非管理者でも参照可能にするため）
      const memberEntry: any = {
        link: [
          { ___rel: 'self', ___href: `${URI_GROUP}/${company_id}/${assignedRole}/${targetUid}` },
          { ___rel: 'alternate', ___href: `${URI_USER}/${targetUid}/group/${company_id}` }
        ],
        title: groupEntry.title ?? company_id,
        subtitle: userEmail,
        company_group: { role: assignedRole, company_id }
      }
      if (groupEntry.company != null) memberEntry.company = groupEntry.company
      await vtecxnext.put([memberEntry])
      if (userEntry) {
        await vtecxnext
          .put([{ ...userEntry, company_group: { company_id, owner_id, role: assignedRole } }])
          .catch(() => {})
      }

      console.log(`[api group-request put] approved. company_id=${company_id} uid=${targetUid}`)
    }

    // 承認時のみ申請エントリ削除（aliasにより /_user/{uid}/group_request/{company_id} も自動削除）
    await vtecxnext.deleteEntry(requestPath(company_id, targetUid))

    return vtecxnext.response(200, { feed: { title: '申請を承認しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group-request put')
  }
}

/**
 * DELETE: 申請のキャンセル（申請者本人のみ）
 * ?company_id=C00001
 */
export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group-request delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = await vtecxnext.uid()
    const company_id = vtecxnext.getParameter('company_id')
    if (!company_id) {
      return vtecxnext.response(400, { feed: { title: 'company_idが必要です。' } })
    }

    const existing = await vtecxnext
      .getEntry(requestPath(company_id, String(uid)))
      .catch(() => null)
    if (!existing) {
      return vtecxnext.response(404, { feed: { title: '申請が見つかりません。' } })
    }

    await vtecxnext.deleteEntry(requestPath(company_id, String(uid)))

    console.log(`[api group-request delete] end. company_id=${company_id} uid=${uid}`)
    return vtecxnext.response(200, { feed: { title: '申請をキャンセルしました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group-request delete')
  }
}
