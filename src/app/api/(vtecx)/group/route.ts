import { NextRequest } from 'next/server'
import { VtecxNext } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import { URI_COMPANY_GROUP, COMPANY_GROUP_PREFIX, COMPANY_ID_LEN, URI_INVOICE, URI_QUOTATION } from '@/utils/apiconst'

/**
 * GET: グループ取得
 * ?company_id=C00001 → 単体取得
 * パラメータなし → 全グループ一覧
 */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group get] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const company_id = vtecxnext.getParameter('company_id')

    if (company_id) {
      // 単体取得
      const entry = await vtecxnext.getEntry(`/_group/${company_id}`).catch(() => null)
      if (!entry) {
        return vtecxnext.response(404, { feed: { title: '指定されたグループが見つかりません。' } })
      }
      console.log(`[api group get] end. company_id=${company_id}`)
      return vtecxnext.response(200, [entry])
    } else {
      const isAdmin = await vtecxnext.isAdmin().catch(() => false)
      if (isAdmin) {
        // システム管理者: /_group/ 直下を全件取得（company_id が C始まりのもののみ）
        const feed: any = await vtecxnext.getFeed(`/_group/`).catch(() => null)
        const allEntries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
        const entries = allEntries.filter((e: any) =>
          (e.company_group?.company_id ?? '').startsWith(COMPANY_GROUP_PREFIX)
        )
        console.log(`[api group get] end. admin list. count=${entries.length}`)
        return vtecxnext.response(200, entries.length > 0 ? { feed: { entry: entries } } : { feed: {} })
      } else {
        // 一般ユーザー: 自身の所属グループ /_user/{uid}/group/ を返す
        const uid = await vtecxnext.uid()
        const feed: any = await vtecxnext.getFeed(`/_user/${uid}/group/`).catch(() => null)
        const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
        console.log(`[api group get] end. user list. uid=${uid} count=${entries.length}`)
        return vtecxnext.response(200, entries.length > 0 ? { feed: { entry: entries } } : { feed: {} })
      }
    }
  } catch (e) {
    return apiutil.responseError(e, 'api group get')
  }
}

/**
 * POST: 新規グループ作成（管理者のみ）
 * body: { company_name, owner_id }
 * → company_idを採番してグループ登録、インデックス登録、vtecxグループ作成
 */
export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const reqData = await apiutil.getRequestJson(req)
    const { company_name } = reqData
    let { owner_id } = reqData
    console.log(`[api group post] request body: ${JSON.stringify(reqData)}`)

    // owner_id 未指定の場合は現在のユーザーを使用
    if (!owner_id) {
      owner_id = String(await vtecxnext.uid())
    }

    // [1] company_id 採番（採番カウンタは /company_group に保持）
    const raw = await vtecxnext.allocids('/company_group', 1)
    const company_id = `${COMPANY_GROUP_PREFIX}${raw.padStart(COMPANY_ID_LEN, '0')}`
    console.log(`[api group post] [1] allocids → company_id=${company_id}`)

    // [2] グループマスタ登録 PUT /_group/${company_id}
    // /_group/${company_id} を親フォルダ兼グループマスタとして使用（/company_group は廃止）
    const groupEntry: any = {
      link: [{ ___rel: 'self', ___href: `/_group/${company_id}` }],
      title: company_name ?? company_id,
      company_group: {
        company_id,
        owner_id: String(owner_id)
      }
    }
    console.log(`[api group post] [2] PUT /_group/${company_id}`, JSON.stringify(groupEntry))
    await vtecxnext.put([groupEntry])
    console.log(`[api group post] [2] done`)

    // [3] ロールフォルダ作成 PUT /_group/${company_id}/{AD|ED|VI}
    const roles = ['AD', 'ED', 'VI']
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      const groupPath = `/_group/${company_id}/${role}`
      try {
        const folderEntry = { link: [{ ___rel: 'self', ___href: groupPath }] }
        console.log(`[api group post] [3-${i + 1}] PUT ${groupPath} (ロールフォルダ)`)
        await vtecxnext.put([folderEntry])
        console.log(`[api group post] [3-${i + 1}] done`)
      } catch (e) {
        console.log(`[api group post] [3-${i + 1}] FAILED (non-fatal): path=${groupPath}`, e)
      }
    }

    // [4] オーナーをADに追加 PUT /_group/${company_id}/AD/${owner_id} (alias)
    //     self:      /_group/${company_id}/AD/${owner_id}
    //     alternate: /_user/${owner_id}/group/${company_id}
    // title と company_group をエントリに含めることで /_user/{uid}/group/ 一覧から会社名・ロールを取得可能にする
    try {
      const ownerMemberEntry: any = {
        link: [
          { ___rel: 'self', ___href: `/_group/${company_id}/AD/${owner_id}` },
          { ___rel: 'alternate', ___href: `/_user/${owner_id}/group/${company_id}` }
        ],
        title: company_name ?? company_id,
        company_group: { role: 'AD', company_id }
      }
      if (groupEntry.company != null) ownerMemberEntry.company = groupEntry.company
      console.log(`[api group post] [4] PUT /_group/${company_id}/AD/${owner_id} (alias → /_user/${owner_id}/group/${company_id})`)
      await vtecxnext.put([ownerMemberEntry])
      console.log(`[api group post] [4] done`)
    } catch (e) {
      console.log(`[api group post] [4] FAILED (non-fatal):`, e)
    }

    // [5] ACL付与 (admin/editor → CRUD, viewer → R) × (invoice, quotation)
    // /invoice/{company_id}, /quotation/{company_id} 配下のみ付与（上位継承により配下全体に適用）
    for (const uri of [URI_INVOICE, URI_QUOTATION]) {
      // フォルダエントリを先に作成（存在しないとaddaclが失敗する）
      try {
        await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${uri}/${company_id}` }] }])
        console.log(`[api group post] [5] PUT ${uri}/${company_id} done`)
      } catch (e) {
        console.log(`[api group post] [5] PUT ${uri}/${company_id} FAILED (non-fatal)`, e)
      }
      for (const { role, perm } of [
        { role: 'AD', perm: 'CRUD' },
        { role: 'ED', perm: 'CRUD' },
        { role: 'VI', perm: 'R' }
      ]) {
        try {
          await vtecxnext.addacl([{
            contributor: [{ uri: `urn:vte.cx:acl:/_group/${company_id}/${role},${perm}./` }],
            link: [{ ___rel: 'self', ___href: `${uri}/${company_id}` }]
          }])
          console.log(`[api group post] [5] addacl uri=${uri}/${company_id} group=/_group/${company_id}/${role} perm=${perm}./`)
        } catch (e) {
          console.log(`[api group post] [5] FAILED (non-fatal): uri=${uri}/${company_id} role=${role}`, e)
        }
      }
    }

    // [6] グループ画像フォルダ作成 + ACL設定 (/img/{company_id})
    try {
      await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `/_html/img/${company_id}` }] }])
      await vtecxnext.putcontent(`/img/${company_id}`, undefined, new ArrayBuffer(0))
      // 管理者: CRUD、全員: R（PDFエンジンが画像を読み取れるよう *,R./ を付与）
      await vtecxnext.addacl([{
        contributor: [{ uri: `urn:vte.cx:acl:/_group/${company_id}/AD,CRUD./` }],
        link: [{ ___rel: 'self', ___href: `/img/${company_id}` }]
      }])
      await vtecxnext.addacl([{
        contributor: [{ uri: `urn:vte.cx:acl:*,R./` }],
        link: [{ ___rel: 'self', ___href: `/img/${company_id}` }]
      }])
      console.log(`[api group post] [6] img folder created. company_id=${company_id}`)
    } catch (e) {
      console.log(`[api group post] [6] img folder creation failed (non-fatal):`, e)
    }

    console.log(`[api group post] end. company_id=${company_id}`)
    return vtecxnext.response(200, [{ ...groupEntry, company_group: { company_id, owner_id: String(owner_id) } }])
  } catch (e) {
    return apiutil.responseError(e, 'api group post')
  }
}

/**
 * PUT: グループの企業情報更新（グループ管理者 or システム管理者のみ）
 * ?company_id=C00001
 * body: { company_name?, company: {...} }
 */
export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group put] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const company_id = vtecxnext.getParameter('company_id')
    if (!company_id) {
      return vtecxnext.response(400, { feed: { title: 'company_idが必要です。' } })
    }

    // 権限チェック: システム管理者 or グループ管理者(AD)
    const uid = await vtecxnext.uid()
    const isAdmin = await vtecxnext.isAdmin()
    const isGroupAdmin = !!(await vtecxnext.getEntry(`/_group/${company_id}/AD/${uid}`).catch(() => null))
    if (!isAdmin && !isGroupAdmin) {
      return vtecxnext.response(403, { feed: { title: 'グループ情報の編集はグループ管理者のみ可能です。' } })
    }

    const groupEntry = await vtecxnext.getEntry(`${URI_COMPANY_GROUP}/${company_id}`).catch(() => null)
    if (!groupEntry) {
      return vtecxnext.response(404, { feed: { title: 'グループが見つかりません。' } })
    }

    const reqData = await apiutil.getRequestJson(req)
    const { company_name, company, bank } = reqData

    const updated = {
      ...groupEntry,
      ...(company_name != null ? { title: company_name } : {}),
      ...(company != null ? { company } : {}),
      ...(bank != null ? { bank } : {})
    }
    await vtecxnext.put([updated])

    // 全メンバーのエイリアスエントリ（/_group/{company_id}/{role}/{uid}）にも company を反映
    const updatedCompany = company ?? groupEntry.company
    const updatedTitle = company_name ?? groupEntry.title ?? company_id
    if (updatedCompany != null || company_name != null) {
      const memberRoles = ['AD', 'ED', 'VI']
      for (const r of memberRoles) {
        const feed: any = await vtecxnext.getFeed(`/_group/${company_id}/${r}/`).catch(() => null)
        const memberEntries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
        for (const m of memberEntries) {
          const selfHref: string = m.link?.find((l: any) => l.___rel === 'self')?.___href ?? ''
          const memberUid = selfHref.split('/').pop() ?? ''
          if (!memberUid) continue
          try {
            await vtecxnext.put([{
              ...m,
              title: updatedTitle,
              ...(updatedCompany != null ? { company: updatedCompany } : {})
            }])
          } catch (e) {
            console.log(`[api group put] update member alias failed (non-fatal): uid=${memberUid}`, e)
          }
        }
      }
    }

    console.log(`[api group put] end. company_id=${company_id}`)
    return vtecxnext.response(200, { feed: { title: 'グループ情報を更新しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group put')
  }
}

/**
 * DELETE: グループ削除（管理者のみ）
 * ?company_id=C00001
 * - /company_group/{company_id} 削除
 * - /_group/{company_id}/ 以下のフォルダ削除
 * - 各メンバーのユーザエントリから company_group をクリア
 */
export const DELETE = async (req: NextRequest): Promise<Response> => {
  console.log(`[api group delete] start.`)
  try {
    const vtecxnext = new VtecxNext(req)
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const isAdmin = await vtecxnext.isAdmin()
    if (!isAdmin) {
      return vtecxnext.response(403, { feed: { title: 'グループ削除は管理者のみ可能です。' } })
    }

    const company_id = vtecxnext.getParameter('company_id')
    if (!company_id) {
      return vtecxnext.response(400, { feed: { title: 'company_idが必要です。' } })
    }
    console.log(`[api group delete] company_id=${company_id}`)

    // 各ロールフォルダのメンバーのユーザエントリから company_group をクリア
    const roles = ['AD', 'ED', 'VI']
    for (const role of roles) {
      const feed: any = await vtecxnext.getFeed(`/_group/${company_id}/${role}/`).catch(() => null)
      const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
      for (const m of entries) {
        const href: string = m.link?.find((l: any) => l.___rel === 'self')?.___href ?? ''
        const uid = href.split('/').pop() ?? ''
        if (!uid) continue
        const userEntry = await vtecxnext.getEntry(`/_user/${uid}`).catch(() => null)
        if (userEntry) {
          const updated = { ...userEntry }
          delete updated.company_group
          console.log(`[api group delete] clear company_group for uid=${uid}`)
          await vtecxnext.put([updated]).catch(() => {})
        }
        // エイリアス削除により /_user/${uid}/group/${company_id} も自動削除される
      }
      // ロールフォルダを削除
      try {
        console.log(`[api group delete] deleteFolder: /_group/${company_id}/${role}`)
        await vtecxnext.deleteFolder(`/_group/${company_id}/${role}`)
      } catch (e) {
        console.log(`[api group delete] deleteFolder failed (non-fatal): /_group/${company_id}/${role} ${e}`)
      }
    }

    // /_group/{company_id} フォルダ削除（グループマスタ兼親フォルダなので削除でマスタも消える）
    try {
      console.log(`[api group delete] deleteFolder: /_group/${company_id}`)
      await vtecxnext.deleteFolder(`/_group/${company_id}`)
    } catch (e) {
      console.log(`[api group delete] deleteFolder parent failed (non-fatal): ${e}`)
    }

    console.log(`[api group delete] end. company_id=${company_id}`)
    return vtecxnext.response(200, { feed: { title: 'グループを削除しました。' } })
  } catch (e) {
    return apiutil.responseError(e, 'api group delete')
  }
}
