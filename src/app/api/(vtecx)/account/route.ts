import { NextRequest } from 'next/server'
import { VtecxNext, AdduserInfo, isVtecxNextError, ChangepassByAdminInfo } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import { email_regex } from '@/utils/checkutil'
import { URI_GROUP_ADMIN } from '@/utils/apiconst'

/** /_user/ フォルダ */
const URI_USER = '/_user/'

export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api account get] start.`)

  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const uid = vtecxnext.getParameter('uid')
    const me = vtecxnext.hasParameter('me')

    if (me) {
      // ログインユーザ自身の情報を取得
      const myUid = await vtecxnext.uid()
      const entry = await vtecxnext.getEntry(`${URI_USER}${myUid}`)
      const groups = await vtecxnext.getGroups().catch(() => [] as string[])
      const isAdmin = Array.isArray(groups) && groups.includes(URI_GROUP_ADMIN)
      console.log(`[api account get] end. me entry. myUid=${myUid} isAdmin=${isAdmin}`)
      return vtecxnext.response(200, entry ? [{ ...entry, _isAdmin: isAdmin }] : [])
    } else if (uid) {
      // 単体取得
      const entry = await vtecxnext.getEntry(`${URI_USER}${uid}`)
      console.log(`[api account get] end. single entry.`)
      return vtecxnext.response(200, entry ? [entry] : [])
    } else {
      // 一覧取得
      const feed = await vtecxnext.getFeed(URI_USER)
      console.log(`[api account get] end. list.`)
      return vtecxnext.response(200, feed ?? { feed: {} })
    }
  } catch (e) {
    return apiutil.responseError(e, 'api account get')
  }
}

export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api account post] start.`)

  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const reqData = await apiutil.getRequestJson(req)
    const { email, pswd, name } = reqData

    // 入力チェック
    if (!email || !pswd) {
      return vtecxnext.response(400, { feed: { title: 'メールアドレスとパスワードは必須です。' } })
    }
    if (!email_regex.test(email)) {
      return vtecxnext.response(400, { feed: { title: 'メールアドレスの形式が不正です。' } })
    }

    // vte.cxユーザ登録
    const adduserInfo: AdduserInfo = { username: email, pswd }
    let uid: string | undefined
    try {
      const adduserResult = await vtecxnext.adduserByAdmin([adduserInfo])
      uid = adduserResult?.feed?.title
      console.log(`[api account post] adduser ok. uid = ${uid}`)
    } catch (e) {
      if (isVtecxNextError(e) && e.status === 409) {
        // ユーザが既に存在する場合：アクティブ化してパスワードを更新
        console.log(`[api account post] user already exists. activateuser start. email = ${email}`)
        await vtecxnext.activateuser(email)
        // 既存エントリからuidを取得してパスワードを変更
        const existingEntry = await vtecxnext.getEntry(`${URI_USER}${email}`)
        const existingUid = existingEntry?.id?.split('/').pop()
        if (existingUid) {
          const changepassInfo: ChangepassByAdminInfo = { uid: existingUid, pswd }
          await vtecxnext.changepassByAdmin([changepassInfo])
        }
        uid = existingUid
        console.log(`[api account post] reactivated user. uid = ${uid}`)
      } else {
        throw e
      }
    }

    // アカウント名を設定
    const userEntry = {
      link: [{ ___rel: 'self', ___href: `${URI_USER}${email}` }],
      title: name ?? email
    }
    await vtecxnext.put([userEntry])

    // 作成したユーザーが自身のエントリを更新できるよう CRUD ACL を付与
    if (uid) {
      const numericUid = String(uid).split(',')[0]
      try {
        await vtecxnext.addacl([{
          contributor: [{ uri: `urn:vte.cx:acl:${numericUid},CRUD` }],
          link: [{ ___rel: 'self', ___href: `${URI_USER}${numericUid}` }]
        }])
        console.log(`[api account post] addacl ok. uid=${numericUid}`)
      } catch (e) {
        console.log(`[api account post] addacl failed (non-fatal): ${e}`)
      }
    }

    console.log('[api account post] end.')
    return vtecxnext.response(200, [userEntry])
  } catch (e) {
    return apiutil.responseError(e, 'api account post')
  }
}

export const PUT = async (req: NextRequest): Promise<Response> => {
  console.log(`[api account put] start.`)

  try {
    const vtecxnext = new VtecxNext(req)

    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) return xresult

    const reqData = await apiutil.getRequestJson(req)
    const { uid, name, company, bank, user_name } = reqData

    if (!uid) {
      return vtecxnext.response(400, { feed: { title: 'uidは必須です。' } })
    }

    // 管理者以外は自分のエントリのみ更新可能
    const isAdmin = await vtecxnext.isAdmin()
    if (!isAdmin) {
      const myUid = await vtecxnext.uid()
      if (String(myUid) !== String(uid)) {
        return vtecxnext.response(403, { feed: { title: '他のユーザーのアカウントは更新できません。' } })
      }
    }

    // アカウント名・企業情報・振込先情報を更新
    const userEntry: any = {
      link: [{ ___rel: 'self', ___href: `${URI_USER}${uid}` }],
      title: name,
      company,
      bank,
      user: { user_name }
    }

    const result = await vtecxnext.put([userEntry])

    console.log('[api account put] end.')
    return vtecxnext.response(200, result)
  } catch (e) {
    return apiutil.responseError(e, 'api account put')
  }
}
