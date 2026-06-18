import { NextRequest } from 'next/server'
import { AdduserInfo, VtecxNext } from '@vtecx/vtecxnext'
import VtecxApp, { Entry } from 'typings'
import { URI_SETTINGS_ADDUSER, COMPANY_GROUP_PREFIX, COMPANY_ID_LEN, URI_INVOICE, URI_QUOTATION, URI_PURCHASE_ORDER } from '@/utils/apiconst'
import * as apiutil from '@/utils/apiutil'

/**
 * POSTメソッド
 * @param req リクエスト
 * @returns レスポンス
 */
export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api adduser] start. url=${req.url}`)

  try {
    const vtecxnext = new VtecxNext(req)

    // X-Requested-With ヘッダチェック
    let result = vtecxnext.checkXRequestedWith()
    if (result) {
      return result
    }

    console.log(`[api adduser] vtecxnext.adduser start.`)
    const reCaptchaToken: string = vtecxnext.getParameter('g-recaptcha-token') ?? ''
    console.log(`[api adduser] reCaptchaToken=${reCaptchaToken}`)
    //console.log('reCaptchaToken:', reCaptchaToken)

    // リクエストJSON取得
    const reqData: VtecxApp.Entry[] = await apiutil.getRequestJson(req)
    if (!reqData) {
      return vtecxnext.response(400, { feed: { title: 'Invalid argument.' } })
    }
    let emailSubject: string | undefined = '' //reqData.emailSubject
    let emailText: string | undefined = '' //reqData.emailText
    let emailHtml: string | undefined = '' //reqData.emailHtml
    if (!emailText && !emailHtml) {
      // メール読み込み
      const adduserMailEntry: Entry | undefined = await apiutil.getEntry(
        vtecxnext,
        URI_SETTINGS_ADDUSER
      )
      if (!adduserMailEntry) {
        console.log(`[api adduser] No email settings. ${URI_SETTINGS_ADDUSER}`)
        return vtecxnext.response(426, {
          feed: { title: `No email settings. ${URI_SETTINGS_ADDUSER}` }
        })
      }
      emailSubject = adduserMailEntry.title
      emailText = adduserMailEntry.summary
      emailHtml = adduserMailEntry.content?.______text
      if (!emailText && !emailHtml) {
        console.log(`[api adduser] No email settings. ${URI_SETTINGS_ADDUSER}`)
        return vtecxnext.response(426, {
          feed: { title: `No email settings. ${URI_SETTINGS_ADDUSER}` }
        })
      }
    }
    if (emailText) {
      // 変換
      emailText = apiutil.editMailTextVtecxnextUrl(emailText)
    }
    if (emailHtml) {
      // 変換
      emailHtml = apiutil.editMailTextVtecxnextUrl(emailHtml)
    }

    console.log('reqData:', reqData)
    const adduserData: AdduserInfo = {
      username: reqData[0].company?.email,
      pswd: reqData[0].summary,
      emailSubject: emailSubject,
      emailText: emailText,
      emailHtml: emailHtml
    }
    console.log('adduserData:', adduserData)
    //const resJson = await vtecxnext.adduser(adduserData, reCaptchaToken)
    //仮登録
    const resJson = await vtecxnext.adduserByAdmin([adduserData])

    const resStatus = 200

    console.log('resJson:', resJson)
    //resJson: { feed: { title: '65497' } }
    const uid = resJson.feed.title

    // morishita@virtual-tech.net 以外は $admin・$useradmin グループから除外
    const email = reqData[0].company?.email ?? ''
    if (email !== 'morishita@virtual-tech.net') {
      for (const groupPath of [`/_group/$admin/${uid}`, `/_group/$useradmin/${uid}`]) {
        try {
          await vtecxnext.deleteEntry(groupPath)
          console.log(`[api adduser] removed from group: ${groupPath}`)
        } catch (e) {
          console.log(`[api adduser] remove from group failed (non-fatal): ${groupPath} ${e}`)
        }
      }
    }

    const temp_user = await vtecxnext.getEntry('/_user/' + uid)
    if (!temp_user) {
      return vtecxnext.response(400, resJson)
    }

    // グループ設定 (group_action: 'create' | 'join' | 'skip')
    const group_action: string = (reqData[0] as any).group_action ?? 'skip'
    const join_company_id: string | undefined = (reqData[0] as any).company_id
    let company_group: VtecxApp.Company_group | undefined

    if (group_action === 'create') {
      try {
        // company_id採番（カウンタは /company_group に保持）
        const raw = await vtecxnext.allocids('/company_group', 1)
        const company_id = `${COMPANY_GROUP_PREFIX}${raw.padStart(COMPANY_ID_LEN, '0')}`
        const company_name = reqData[0].company?.company_name ?? company_id

        // グループマスタ登録 /_group/{company_id}（親フォルダ兼マスタ）
        await vtecxnext.put([{
          link: [{ ___rel: 'self', ___href: `/_group/${company_id}` }],
          title: company_name,
          company_group: { company_id, owner_id: String(uid) },
          company: reqData[0].company
        }])

        // オーナーをADメンバーとして登録（alias: /_group/{company_id}/AD/{uid} ↔ /_user/{uid}/group/{company_id}）
        const createMemberEntry: any = {
          link: [
            { ___rel: 'self', ___href: `/_group/${company_id}/AD/${uid}` },
            { ___rel: 'alternate', ___href: `/_user/${uid}/group/${company_id}` }
          ],
          title: company_name,
          company_group: { role: 'AD', company_id }
        }
        if (reqData[0].company != null) createMemberEntry.company = reqData[0].company
        await vtecxnext.put([createMemberEntry]).catch(() => {})

        // ACL付与 (invoice, quotation, purchase_order) - 企業配下フォルダのみ
        for (const uri of [URI_INVOICE, URI_QUOTATION, URI_PURCHASE_ORDER]) {
          // フォルダエントリを先に作成
          await vtecxnext.put([{ link: [{ ___rel: 'self', ___href: `${uri}/${company_id}` }] }]).catch(() => {})
          for (const { role, perm } of [
            { role: 'AD', perm: 'CRUD' },
            { role: 'ED', perm: 'CRUD' },
            { role: 'VI', perm: 'R' }
          ]) {
            await vtecxnext.addacl([{
              contributor: [{ uri: `urn:vte.cx:acl:/_group/${company_id}/${role},${perm}./` }],
              link: [{ ___rel: 'self', ___href: `${uri}/${company_id}` }]
            }]).catch(() => {})
          }
        }

        company_group = { company_id, owner_id: String(uid), role: 'AD' }
        console.log(`[api adduser] group created. company_id=${company_id}`)
      } catch (e) {
        console.log(`[api adduser] group create failed (non-fatal): ${e}`)
      }
    } else if (group_action === 'join' && join_company_id) {
      try {
        // グループマスタ取得 /_group/{company_id}
        const groupEntry = await vtecxnext.getEntry(`/_group/${join_company_id}`).catch(() => null)
        if (groupEntry?.company_group?.owner_id) {
          const company_name = groupEntry.title ?? join_company_id

          // EDメンバーとして登録（alias: /_group/{company_id}/ED/{uid} ↔ /_user/{uid}/group/{company_id}）
          const joinMemberEntry: any = {
            link: [
              { ___rel: 'self', ___href: `/_group/${join_company_id}/ED/${uid}` },
              { ___rel: 'alternate', ___href: `/_user/${uid}/group/${join_company_id}` }
            ],
            title: company_name,
            company_group: { role: 'ED', company_id: join_company_id }
          }
          if (groupEntry.company != null) joinMemberEntry.company = groupEntry.company
          await vtecxnext.put([joinMemberEntry]).catch(() => {})

          company_group = { company_id: join_company_id, owner_id: groupEntry.company_group.owner_id, role: 'ED' }
          console.log(`[api adduser] group joined. company_id=${join_company_id}`)
        } else {
          console.log(`[api adduser] group not found for join: ${join_company_id}`)
        }
      } catch (e) {
        console.log(`[api adduser] group join failed (non-fatal): ${e}`)
      }
    }

    const update_user_entry: VtecxApp.Entry = {
      ...temp_user,
      company: {
        ...reqData[0].company,
        ...(company_group ? { company_code: company_group.company_id } : {})
      },
      bank: {
        ...reqData[0].bank
      },
      user: {
        uid: uid,
        user_name: reqData[0].user?.user_name
      },
      ...(company_group ? { company_group } : {})
    }
    await vtecxnext.put([update_user_entry])
    console.log('[api adduser] end.')
    return vtecxnext.response(resStatus, [update_user_entry])
  } catch (e) {
    return apiutil.responseError(e, 'api adduser')
  }
}

/*
    
    {
    "title": "テストユーザ",
    "company": {
        "company_name": "テスト株式会社",
        "zip_code": "1600022",
        "prefecture": "東京都",
        "city": "新宿区新宿",
        "address_line1": "1-2-3",
        "building_name": "テストビル 5F",
        "tel": "03-1234-5678",
        "email": "morishita+2@virtual-tech.net"
    },
    "bank": {
        "bank_code": "1000",
        "bank_title": "信金中央金庫",
        "branch_code": "001",
        "branch_name": "北海道",
        "bank_type": "1",
        "bank_number": "1234567",
        "bank_name": "テスト タロウ"
    },
      "summary": "8h3pinILkIpkU2Qq/GRqawh1nNeUMTVFjWcDi6j3P2s="
    }
    
    */
