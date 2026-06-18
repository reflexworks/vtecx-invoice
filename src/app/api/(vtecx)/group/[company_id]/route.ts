import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import { URI_COMPANY_GROUP } from '@/utils/apiconst'

const URI_USER = '/_user'

// /_group/{company_id}/{role}/{uid}
const memberGroupPath = (company_id: string, role: string, uid: string) =>
  `/_group/${company_id}/${role}/${uid}`

// /_user/{uid}/group/{company_id}
const memberUserPath = (uid: string, company_id: string) => `${URI_USER}/${uid}/group/${company_id}`

/**
 * グループインデックスとメンバー情報を取得
 * GET /api/group/[company_id]
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
): Promise<Response> => {
  console.log(`[api group/[company_id] get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const { company_id } = await params

    // グループインデックス取得
    const groupEntry = await vtecxnext
      .getEntry(`${URI_COMPANY_GROUP}/${company_id}`)
      .catch(() => null)
    if (!groupEntry) {
      return vtecxnext.response(404, { feed: { title: 'グループが見つかりません。' } })
    }

    // 各ロールフォルダからメンバー一覧取得 & 現在ユーザーのロール確認
    const myUid = await vtecxnext.uid()
    const roles = ['AD', 'ED', 'VI']
    const allMembers: any[] = []
    let myRole: string | null = null
    for (const role of roles) {
      const feed: any = await vtecxnext.getFeed(`/_group/${company_id}/${role}/`).catch(() => null)
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      for (const m of entries) {
        const href: string = m.link?.find((l: any) => l.___rel === 'self')?.___href ?? ''
        const uid = href.split('/').pop() ?? ''
        if (uid === String(myUid)) myRole = role
        // subtitle にメールアドレスが埋め込まれていればそれを使用（非管理者でも表示可能）
        // 埋め込みがない場合は /_user/{uid} を取得してフォールバック
        let email: string = m.subtitle ?? ''
        let company_name: string = ''
        if (!email && uid) {
          const userEntry: any = await vtecxnext.getEntry(`${URI_USER}/${uid}`).catch(() => null)
          email = userEntry?.company?.email ?? uid
          company_name = userEntry?.company?.company_name ?? ''
        }
        allMembers.push({ uid, role, email, company_name })
      }
    }

    console.log(
      `[api group/[company_id] get] end. company_id=${company_id} members=${allMembers.length} my_role=${myRole}`
    )
    return vtecxnext.response(200, {
      group: { ...groupEntry, company_group: { ...groupEntry.company_group, company_id } },
      members: allMembers,
      my_role: myRole,
      my_uid: String(myUid),
      bank: groupEntry.bank ?? null
    })
  } catch (e) {
    return apiutil.responseError(e, 'api group/[company_id] get')
  }
}

/**
 * メンバー追加
 * POST /api/group/[company_id]
 * body: { uid, role }
 */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
): Promise<Response> => {
  console.log(`[api group/[company_id] post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const myUidForCheck = await vtecxnext.uid()
    const isAdmin = await vtecxnext.isAdmin()

    const { company_id } = await params
    const reqData = await apiutil.getRequestJson(req)
    const { uid: uidParam, email, role } = reqData
    console.log(`[api group/[company_id] post] request: ${JSON.stringify(reqData)}`)

    // emailからuid解決（バックエンドで処理）
    let uid: string = uidParam ?? ''
    if (!uid && email) {
      // /_user/{email} で直接取得を試みる
      let userByEmail = await vtecxnext.getEntry(`${URI_USER}/${email}`).catch(() => null)
      // 取得できない場合は /_user/ フィード全件からメールアドレスで検索
      if (!userByEmail) {
        const feed: any = await vtecxnext.getFeed(`${URI_USER}/`).catch(() => null)
        const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
        userByEmail =
          entries.find(
            (e: any) =>
              e.title === email ||
              e.company?.email === email ||
              e.contributor?.some((c: any) => c.email === email)
          ) ?? null
      }
      if (!userByEmail) {
        return vtecxnext.response(404, {
          feed: { title: '指定されたメールアドレスのユーザーが見つかりません。' }
        })
      }
      // user.uid（addcompanyで設定）→ idのパスから数値抽出
      const fromUser = userByEmail?.user?.uid != null ? String(userByEmail.user.uid) : null
      const fromId = userByEmail?.id?.split('/').pop()?.split(',')[0]
      uid = fromUser ?? (fromId && /^\d+$/.test(fromId) ? fromId : '')
      if (!uid) {
        return vtecxnext.response(400, {
          feed: { title: 'ユーザーIDを解決できませんでした。管理者に連絡してください。' }
        })
      }
      console.log(`[api group/[company_id] post] resolved uid=${uid} from email=${email}`)
    }

    if (!uid) {
      return vtecxnext.response(400, { feed: { title: 'uidまたはemailが必要です。' } })
    }

    // 自分自身への追加でなく管理者でもない場合は拒否
    const isSelf = String(myUidForCheck) === String(uid)
    if (!isSelf && !isAdmin) {
      return vtecxnext.response(403, {
        feed: { title: '他のユーザーの追加は管理者のみ可能です。' }
      })
    }

    // 既にメンバーかチェック
    const roles = ['AD', 'ED', 'VI']
    for (const r of roles) {
      const existing = await vtecxnext
        .getEntry(memberGroupPath(company_id, r, uid))
        .catch(() => null)
      if (existing) {
        return vtecxnext.response(409, { feed: { title: '既に所属済のメンバーです。' } })
      }
    }

    const groupEntry = await vtecxnext
      .getEntry(`${URI_COMPANY_GROUP}/${company_id}`)
      .catch(() => null)
    if (!groupEntry) {
      return vtecxnext.response(404, { feed: { title: 'グループが見つかりません。' } })
    }
    const owner_id = groupEntry.company_group?.owner_id
    const assignedRole = role ?? 'ED'

    // alias機能でメンバー追加
    // self:      /_group/{company_id}/{role}/{uid}
    // alternate: /_user/{uid}/group/{company_id}
    // title・subtitle・company・company_group をエントリに含める
    // subtitle にユーザーのメールアドレスを保存（非管理者でも参照可能にするため）
    const userEntry = await vtecxnext.getEntry(`${URI_USER}/${uid}`).catch(() => null)
    const userEmail: string = userEntry?.company?.email ?? ''
    const memberEntry: any = {
      link: [
        { ___rel: 'self', ___href: memberGroupPath(company_id, assignedRole, uid) },
        { ___rel: 'alternate', ___href: memberUserPath(uid, company_id) }
      ],
      title: groupEntry.title ?? company_id,
      subtitle: userEmail,
      company_group: { role: assignedRole, company_id }
    }
    if (groupEntry.company != null) memberEntry.company = groupEntry.company
    console.log(`[api group/[company_id] post] put member (alias): ${JSON.stringify(memberEntry)}`)
    await vtecxnext.put([memberEntry])
    if (userEntry) {
      await vtecxnext
        .put([
          {
            ...userEntry,
            company_group: { company_id, owner_id, role: assignedRole }
          }
        ])
        .catch(() => {})
    }

    console.log(`[api group/[company_id] post] end. uid=${uid} role=${assignedRole}`)
    return vtecxnext.response(200, { feed: { title: 'メンバーを追加しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group/[company_id] post')
  }
}

/**
 * メンバーのロール変更
 * PUT /api/group/[company_id]
 * body: { uid, role }
 */
export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
): Promise<Response> => {
  console.log(`[api group/[company_id] put] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const isAdmin = await vtecxnext.isAdmin()
    if (!isAdmin) {
      return vtecxnext.response(403, { feed: { title: 'ロール変更は管理者のみ可能です。' } })
    }

    const { company_id } = await params
    const reqData = await apiutil.getRequestJson(req)
    const { uid, role } = reqData
    console.log(`[api group/[company_id] put] request: ${JSON.stringify(reqData)}`)

    if (!uid || !role) {
      return vtecxnext.response(400, { feed: { title: 'uidとroleが必要です。' } })
    }

    const groupEntry = await vtecxnext
      .getEntry(`${URI_COMPANY_GROUP}/${company_id}`)
      .catch(() => null)
    if (!groupEntry) {
      return vtecxnext.response(404, { feed: { title: 'グループが見つかりません。' } })
    }
    const owner_id = groupEntry.company_group?.owner_id

    // 現在のロールを特定して旧エントリ削除
    const prevRoles = ['AD', 'ED', 'VI']
    for (const prevRole of prevRoles) {
      const existing = await vtecxnext
        .getEntry(memberGroupPath(company_id, prevRole, uid))
        .catch(() => null)
      if (existing) {
        console.log(
          `[api group/[company_id] put] delete old member: ${memberGroupPath(company_id, prevRole, uid)}`
        )
        await vtecxnext.deleteEntry(memberGroupPath(company_id, prevRole, uid)).catch(() => {})
        break
      }
    }

    // 新ロールで再登録（alias）
    // title・company・company_group をエントリに含めることで /_user/{uid}/group/ 一覧から情報を取得可能にする
    const memberEntry: any = {
      link: [
        { ___rel: 'self', ___href: memberGroupPath(company_id, role, uid) },
        { ___rel: 'alternate', ___href: memberUserPath(uid, company_id) }
      ],
      title: groupEntry.title ?? company_id,
      company_group: { role, company_id }
    }
    if (groupEntry.company != null) memberEntry.company = groupEntry.company
    console.log(`[api group/[company_id] put] put member (alias): ${JSON.stringify(memberEntry)}`)
    await vtecxnext.put([memberEntry])

    // ユーザエントリのグループ情報も更新
    const userEntry = await vtecxnext.getEntry(`${URI_USER}/${uid}`).catch(() => null)
    if (userEntry) {
      await vtecxnext
        .put([
          {
            ...userEntry,
            company_group: { ...(userEntry.company_group ?? {}), company_id, owner_id, role }
          }
        ])
        .catch(() => {})
    }

    console.log(`[api group/[company_id] put] end. uid=${uid} role=${role}`)
    return vtecxnext.response(200, { feed: { title: 'ロールを変更しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group/[company_id] put')
  }
}

/**
 * メンバー削除
 * DELETE /api/group/[company_id]?member_uid=xxx
 */
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
): Promise<Response> => {
  console.log(`[api group/[company_id] delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const myUidForDelete = await vtecxnext.uid()
    const isAdmin = await vtecxnext.isAdmin()

    const { company_id } = await params
    const member_uid = vtecxnext.getParameter('member_uid')

    if (!member_uid) {
      return vtecxnext.response(400, { feed: { title: 'member_uidが必要です。' } })
    }

    // 自分自身の削除（脱退）でなく管理者でもない場合は拒否
    const isSelfDelete = String(myUidForDelete) === String(member_uid)
    if (!isSelfDelete && !isAdmin) {
      return vtecxnext.response(403, {
        feed: { title: '他のメンバーの削除は管理者のみ可能です。' }
      })
    }

    // ロールを特定して該当エントリ削除（aliasにより /_user/{uid}/group/{company_id} も自動削除）
    const roles = ['AD', 'ED', 'VI']
    for (const role of roles) {
      const path = memberGroupPath(company_id, role, member_uid)
      const existing = await vtecxnext.getEntry(path).catch(() => null)
      if (existing) {
        console.log(`[api group/[company_id] delete] deleteEntry: ${path}`)
        await vtecxnext.deleteEntry(path)
        break
      }
    }

    // エイリアス削除により /_user/{member_uid}/group/{company_id} も自動削除される

    // ユーザエントリのグループ情報をクリア
    const userEntry = await vtecxnext.getEntry(`${URI_USER}/${member_uid}`).catch(() => null)
    if (userEntry) {
      const updated = { ...userEntry }
      delete updated.company_group
      await vtecxnext.put([updated]).catch(() => {})
    }

    console.log(`[api group/[company_id] delete] end. member_uid=${member_uid}`)
    return vtecxnext.response(200, { feed: { title: 'メンバーを削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group/[company_id] delete')
  }
}
