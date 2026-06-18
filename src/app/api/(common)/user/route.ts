import { NextRequest } from 'next/server'
import {
  VtecxNext,
  isVtecxNextError,
  VtecxNextError,
  AdduserInfo,
  ChangepassByAdminInfo
} from '@vtecx/vtecxnext'
import vtecxauth from '@vtecx/vtecxauth'
import VtecxApp, { Entry, Contributor } from 'typings'
import {
  URI_LOCAL_GOVERNMENT,
  URI_USER,
  AUTHORITY_ADMIN,
  AUTHORITY_USER,
  PSWD_LEN,
  ENABLE_STATUS_VALID,
  ENABLE_STATUS_DELETE,
  CAO_CODE,
  USERSTATUS_ACTIVATED,
  URI_SETTINGS_SIGNUP_COMPLETE,
  ASSISTANCE_TEAM_NONE,
  ASSISTANCE_TEAM_DMAT,
  ASSISTANCE_TEAM_DWAT,
  OCCUPATION_TYPE_HOSPITAL_PUBLIC,
  OCCUPATION_TYPE_HOSPITAL_OTHER,
  OCCUPATION_TYPE_WELFARE_PUBLIC,
  OCCUPATION_TYPE_WELFARE_OTHER,
  URI_SYSTEM_USER
} from '@/utils/apiconst'
import { email_regex } from '@/utils/checkutil'
import * as apiutil from '@/utils/apiutil'
import * as util from '@/utils/commonutil'

/**
 * ユーザ登録
 * @param req リクエスト
 * @returns レスポンス
 */
export const POST = async (
  req: NextRequest
): Promise<Response> => {
  console.log(`[api company post] start.`)
  try {
    const vtecxnext = new VtecxNext(req)

    // X-Requested-With ヘッダチェック
    const xresult = vtecxnext.checkXRequestedWith()
    if (xresult) {
      return xresult
    }

    console.log(`[api company post] acl check ok.`)

    // リクエストJSON取得
    const reqData: Entry[] | undefined = await apiutil.getRequestJson(req)
    // 入力チェック
    if (!reqData) {
      console.log(`[api company post] request data is empty.`)
      return vtecxnext.response(400, { feed: { title: 'Invalid argument.' } })
    }
    if (!Array.isArray(reqData)) {
      console.log(`[api company post] request data is not array. ${JSON.stringify(reqData)}`)
      return vtecxnext.response(400, { feed: { title: 'Invalid argument.' } })
    }
    const len = reqData.length
    if (len < 1) {
      console.log(`[api company post] entry length is less than 1. ${JSON.stringify(reqData)}`)
      return vtecxnext.response(400, { feed: { title: 'Invalid argument.' } })
    }

    // ユーザ情報チェック
    const promiseCheckUsers: Promise<Entry | undefined>[] = []
    for (const entry of reqData) {
      const resultCheck = checkInputUser(vtecxnext, entry)
      if (util.isResponse(resultCheck)) {
        console.log(`[api company post] checkInputUser failed.`)
        return resultCheck
      }
      if (!entry.company) {
        console.log(`[api company post] company name is required. ${JSON.stringify(entry)}`)
        return vtecxnext.response(400, { feed: { title: 'company name is required.' } })
      }

      // ユーザが登録済みかどうかチェック
      if (entry.company.email) {
        const promiseCheckUser = apiutil.getUserByEmail(
          vtecxnext,
          //local_government_code,
          entry.company.email,
          false,
          true
        )
        promiseCheckUsers.push(promiseCheckUser)
      }
    }

    // ユーザ存在チェックPromiseの確認
    /*
    for (const promise of promiseCheckUsers) {
      const result = await promise
      if (isVtecxNextError(result)) {
        throw result
      }
      if (result) {
        console.log(
          `[api company post] company does already exist. local government code = ${result.company?.local_government_code} ${JSON.stringify(reqData)}`
        )
        return vtecxnext.response(409, {
          feed: {
            title: `company does already exist. local government code = ${result.company?.local_government_code}`
          }
        })
      }
    }
    */

    console.log(`[api company post] input check ok.`)

    // メールテンプレートの取得
    let mailEntry: Entry | undefined
    try {
      mailEntry = await apiutil.getEntry(vtecxnext, URI_SETTINGS_SIGNUP_COMPLETE)
    } catch (e) {
      // Do nothing.
      console.log(
        `[api company post] Error occured by getEntry('${URI_SETTINGS_SIGNUP_COMPLETE}') ${e}`
      )
    }

    const adduserInfos: AdduserInfo[] = []
    const pswds: string[] = []
    for (const entry of reqData) {
      // クライアント提供のパスワードハッシュがあればそれを使用、なければ自動生成
      let pswd: string
      let phash: string
      if (entry.summary) {
        phash = entry.summary
        pswd = '' // 平文は不明のためメール本文には使用しない
      } else {
        pswd = apiutil.getRandomStr(PSWD_LEN)
        phash = vtecxauth.getHashpass(pswd)
      }
      pswds.push(pswd)
      const adduserInfo: AdduserInfo = {
        username: entry.company?.email,
        pswd: phash
      }
      if (mailEntry?.summary || mailEntry?.content?.______text) {
        adduserInfo.emailSubject = mailEntry.title
        const user_name = util.toString(entry.company?.email)
        //const authority = util.toString(entry.company?.authority)
        if (mailEntry.summary) {
          // 変換
          adduserInfo.emailText = apiutil.editMailText(user_name, pswd, mailEntry.summary)
        }
        if (mailEntry.content?.______text) {
          // 変換
          adduserInfo.emailHtml = apiutil.editMailText(
            user_name,
            pswd,
            mailEntry.content.______text
          )
        }
      }
      adduserInfos.push(adduserInfo)
    }
    console.log(`[api company post] create pswd ok.`)

    // TODO テスト用ログ。本番では必ず出力しないようにすること。
    //console.log(`[api company post] adduserInfos = ${JSON.stringify(adduserInfos)} pswds = ${pswds}}`)

    // vte.cxユーザ登録
    const uids: string[] = []
    const retryAdduserUids: string[] = []
    for (const adduserInfo of adduserInfos) {
      try {
        const adduserResult = await apiutil.adduserByGroupadmin(
          vtecxnext,
          [adduserInfo],
          '' //local_government_code
        )
        if (adduserResult.feed.title) {
          console.log(
            `[api company post] adduserByGroupadmin ok. uid = ${adduserResult.feed.title}`
          )
          uids.push(adduserResult.feed.title)
        } else {
          console.log(`[api company post] no uid. adduserInfo = ${JSON.stringify(adduserInfo)}`)
        }
      } catch (e) {
        if (isVtecxNextError(e) && e.status === 409) {
          const retryUids = await retryAdduser(vtecxnext, '', [adduserInfo], pswds)
          uids.push(...retryUids)
          retryAdduserUids.push(...retryUids)
        } else {
          throw e
        }
      }
    }
    console.log(`[api company post] retryAdduserUids=[${retryAdduserUids}] }`)

    // 本システムのユーザ情報登録
    // vte.cxユーザ登録で発行されたUIDを取得する
    const userFeed: Entry[] = []
    const addgroupUids: string[] = []
    for (let i = 0; i < len; i++) {
      const reqEntry = reqData[i]
      const uid = uids[i]
      const uri = '' //`${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_USER}/${uid}`
      const userAlias = `${URI_USER}/${uid}`
      console.log(`[api company post] uid=${uid} uri=${uri} userAlias=${userAlias} }`)
      let contributors: Contributor[] | undefined
      if (retryAdduserUids.indexOf(uid) < 0) {
        contributors = editUserContributors('', uid)
      } else {
        // 再登録で自治体が異なる場合、旧ユーザエントリーから/company/{UID}エイリアスを外す。
        const retryAdduserEntry = await apiutil.getEntry(vtecxnext, userAlias)
        console.log(
          `[api company post] uri = ${uri} userAlias = ${userAlias} retryAdduserEntry = ${JSON.stringify(retryAdduserEntry)}`
        )
        if (retryAdduserEntry && !retryAdduserEntry.id?.startsWith(uri)) {
          const removeAliasEntry = {
            link: [
              {
                ___rel: 'self',
                ___href: userAlias
              },
              {
                ___rel: 'alternate',
                ___href: ''
              }
            ],
            id: retryAdduserEntry.id
          }
          console.log(
            `[api company post] retryAdduserEntry's local_government is different. removeAliasEntry = ${JSON.stringify(removeAliasEntry)}`
          )
          userFeed.push(removeAliasEntry)
        }
      }
      const userEntry: VtecxApp.Entry = {
        link: [
          {
            ___rel: 'self',
            ___href: uri
          },
          {
            ___rel: 'alternate',
            ___href: userAlias
          }
        ],
        company: {
          company_name: reqEntry.company?.company_name,
          email: reqEntry.company?.email,
          tel: reqEntry.company?.tel
        }
      }
      if (contributors) {
        userEntry.contributor = contributors
      }
      userFeed.push(userEntry)

      /*
      // 権限が「管理者」の場合、グループ管理グループに参加する。
      if (reqEntry.company?.authority === AUTHORITY_ADMIN) {
        addgroupUids.push(uid)
      }
      */
    }

    /*
    // ユーザ情報登録
    const promisePutUser = apiutil.putBDBQ(vtecxnext, userFeed).catch((e) => {
      console.log(`[api company post] apiutil.put catch error.`)
      return e
    })
    */
    /*
    // 権限が「管理者」の場合、グループ管理グループに参加する
    let promiseAddgroup
    if (addgroupUids.length > 0) {
      const adminGroup = apiutil.getAdmingroup(local_government_code)
      promiseAddgroup = apiutil.addgroupByAdmin(vtecxnext, addgroupUids, adminGroup).catch((e) => {
        console.log(`[api company post] apiutil.addgroupByAdmin catch error.`)
        return e
      })
    }
    

    console.log(`[api company post] await promisePutUser.`)
    const putuserResult = await promisePutUser
    if (isVtecxNextError(putuserResult)) {
      throw putuserResult
    }
    console.log(`[api company post] await promiseAddgroup.`)
    if (promiseAddgroup) {
      const addgroupResult = await promiseAddgroup
      if (isVtecxNextError(addgroupResult)) {
        throw addgroupResult
      }
    }
      */

    // 戻り値にパスワードをセット
    const resStatus = 200
    const resJson: Entry[] = []
    /*
    for (let i = 0; i < len; i++) {
      const userEntry = putuserResult[i]
      const pswd = pswds[i]
      userEntry.subtitle = pswd
      resJson.push(userEntry)
    }
    */
    console.log('[api company post] end.')
    return vtecxnext.response(resStatus, resJson)
  } catch (e) {
    console.log(`[api company post] catch error.`)
    return apiutil.responseError(e, 'api company post')
  }
}

/**
 * ユーザ情報のACL設定を編集
 * @param local_government_code 自治体コード
 * @param uid UID
 */
const editUserContributors = (local_government_code: string, uid: string): Contributor[] => {
  // /local_government/{自治体コード}/company/{UID}
  // contributor
  //   /_group/$groupadmin_000000,CRUDE
  //   {UID},RUE
  //   /_group/000000,RE
  //   /_group/$groupadmin_{自治体コード},CRUDE
  //   /_group/$groupadmin_*,RE
  const contributors: Contributor[] = []
  contributors.push({ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' })
  contributors.push({ uri: `urn:vte.cx:acl:/_group/$groupadmin_${CAO_CODE},CRUDE` })
  contributors.push({ uri: `urn:vte.cx:acl:${uid},RUE` })
  contributors.push({ uri: `urn:vte.cx:acl:/_group/${CAO_CODE},RE` })
  contributors.push({ uri: `urn:vte.cx:acl:/_group/$groupadmin_*,RE` })
  if (local_government_code !== CAO_CODE) {
    contributors.push({ uri: `urn:vte.cx:acl:/_group/$groupadmin_${local_government_code},CRUDE` })
  }
  return contributors
}

/**
 * ユーザ再登録.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param adduserInfos ユーザ登録情報
 * @param pswds パスワード
 * @return uid
 */
const retryAdduser = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  adduserInfos: AdduserInfo[],
  pswds: string[]
): Promise<string[]> => {
  // キー:adduserInfosのインデックス、値:UID
  const idxUids: { [key: string]: string } = {}
  // アカウント存在チェックを行い、登録済みか未登録かを判定
  const promiseList = []
  const len = adduserInfos.length
  for (const adduserInfo of adduserInfos) {
    const promise = apiutil.getUserByEmail(vtecxnext, util.toString(adduserInfo.username), true)
    promiseList.push(promise)
  }

  const reAdduserIdxes: number[] = []
  const reAdduserInfos: AdduserInfo[] = []
  for (let i = 0; i < len; i++) {
    const userEntry = await promiseList[i]
    if (userEntry) {
      // 登録済み
      const uid = '' //util.toString(userEntry.company?.uid)
      const account = util.editAccount(util.toString(userEntry.company?.email))
      /*
      if (userEntry.company?.enabled_status === ENABLE_STATUS_VALID) {
        // 念のためシステムユーザ情報のステータスを確認
        const userStatus = await vtecxnext.userstatus(account)
        console.log(`[api company retryAdduser] userStatus = ${userStatus}`)
        if (userStatus === USERSTATUS_ACTIVATED) {
          console.log(`[api company retryAdduser] Duplicated key. account = ${account}`)
          // 有効データなので409を返す
          throw new VtecxNextError(409, `Duplicated key. account = ${account}`)
        }
      }
      */
      // ユーザをActivateにする
      console.log(`[api company retryAdduser] activateuser start. account = ${account}`)
      await vtecxnext.activateuser(account)
      // パスワードを変更する
      console.log(`[api company retryAdduser] changepassByAdmin start. account = ${account}`)
      const phash = vtecxauth.getHashpass(pswds[i])
      const changepassByAdminInfo: ChangepassByAdminInfo = {
        uid: uid,
        pswd: phash
      }
      await vtecxnext.changepassByAdmin([changepassByAdminInfo])
      idxUids[String(i)] = uid
      // 元管理ユーザの場合、一旦管理グループから外す
      /*
      if (userEntry.company?.authority === AUTHORITY_ADMIN) {
        await vtecxnext.leaveGroupByAdmin([uid], apiutil.getAdmingroup(local_government_code))
      }
      */
    } else {
      // 未登録なのでadduserをもう一度実行
      reAdduserIdxes.push(i)
      reAdduserInfos.push(adduserInfos[i])
    }
  }

  console.log(`[api company retryAdduser] reAdduserIdxes = ${JSON.stringify(reAdduserIdxes)}`)
  console.log(`[api company retryAdduser] reAdduserInfos = ${JSON.stringify(reAdduserInfos)}`)

  if (reAdduserInfos.length > 0) {
    const adduserResult = await apiutil.adduserByGroupadmin(
      vtecxnext,
      reAdduserInfos,
      local_government_code
    )
    const uids = adduserResult.feed.title?.split(',') ?? []
    for (let j = 0; j < uids.length; j++) {
      const idx = reAdduserIdxes[j]
      idxUids[String(idx)] = util.toString(uids[j])
    }
  }

  console.log(`[api company retryAdduser] idxUids = ${JSON.stringify(idxUids)}`)

  const retUids: string[] = []
  for (let i = 0; i < len; i++) {
    const retUid = idxUids[String(i)]
    retUids.push(retUid)
  }
  return retUids
}

/**
 * ユーザ取得.
 * @param req リクエスト
 * @returns ユーザデータ
 */
export const GET = async (req: NextRequest): Promise<Response> => {
  console.log(`[api company get] start. `)
  try {
    const vtecxnext = new VtecxNext(req)

    // X-Requested-With ヘッダチェック
    let xresult = vtecxnext.checkXRequestedWith()
    if (xresult) {
      return xresult
    }

    // ユーザ一覧取得
    if (vtecxnext.hasParameter('list')) {
      await apiutil.checkGroupadmin(vtecxnext, '')
      const entries = await apiutil.getFeed(vtecxnext, `${URI_SYSTEM_USER}?n=100`)
      return vtecxnext.response(entries ? 200 : 204, { feed: { entry: entries ?? [] } })
    }

    // UIDを取得
    let uid: string = util.toString(vtecxnext.getParameter('uid'))
    let email: string | undefined
    let isCheckAdmin: boolean = false
    // 入力チェック
    if (util.isBlank(uid)) {
      // メールアドレス指定
      if (vtecxnext.hasParameter('email')) {
        email = util.toString(vtecxnext.getParameter('email'))
        isCheckAdmin = true
      } else {
        // ログインユーザのユーザ情報を取得
        uid = await vtecxnext.uid()
      }
    } else {
      isCheckAdmin = true
    }
    if (isCheckAdmin) {
      // パラメータ指定の場合、管理者ACLチェック
      const isCao = false //local_government_code === CAO_CODE
      if (isCao) {
        // ログインユーザが内閣府ユーザかどうか(ユーザ管理者も可)
        await apiutil.checkGroupCao(vtecxnext, true)
      } else {
        // ログインユーザの自治体の管理者かどうか
        await apiutil.checkGroupadmin(vtecxnext, '')
      }
    }

    console.log(`[api company get] uid=${uid} email=${email}`)

    // エントリー取得
    let resJson
    if (!email) {
      resJson = await apiutil.getUserInfo(vtecxnext, '', uid)
    } else {
      resJson = await apiutil.getUserByEmail(vtecxnext, email, false)
    }
    const resStatus = resJson ? 200 : 204
    console.log('[api company get] end.')
    return vtecxnext.response(resStatus, resJson)
  } catch (e) {
    return apiutil.responseError(e, 'api company get')
  }
}

/**
 * 入力チェック
 * @param vtecxnext VtecxNext
 * @param entry ユーザエントリー
 * @returns エラーの場合Response
 */

const checkInputUser = (vtecxnext: VtecxNext, entry: Entry): Response | undefined => {
  if (!entry.company || !entry.company.company_name) {
    console.log(`[api company post] company name is required. ${JSON.stringify(entry)}`)
    return vtecxnext.response(400, { feed: { title: 'company name is required.' } })
  }
  if (!entry.company.email) {
    console.log(`[api company post] email is required. ${JSON.stringify(entry)}`)
    return vtecxnext.response(400, { feed: { title: 'email is required.' } })
  }
  if (!entry.company.tel) {
    console.log(`[api company post] tel is required. ${JSON.stringify(entry)}`)
    return vtecxnext.response(400, { feed: { title: 'tel is required.' } })
  }
  // emailのメール形式チェック
  if (!email_regex.test(entry.company.email)) {
    console.log(`[api company post] email is not an email address format. ${JSON.stringify(entry)}`)
    return vtecxnext.response(400, { feed: { title: 'email is not an email address format.' } })
  }
  // phoneの形式チェック
  if (!apiutil.checkPhone(entry.company.tel)) {
    console.log(`[api company post] tel is not an tel number format. ${JSON.stringify(entry)}`)
    return vtecxnext.response(400, { feed: { title: 'tel is not an tel number format.' } })
  }
}
