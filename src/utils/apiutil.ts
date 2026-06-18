import { NextRequest } from 'next/server'
import {
  VtecxNext,
  isVtecxNextError,
  AdduserInfo,
  VtecxNextError,
  StatusMessage,
  ContentSignedUrl
} from '@vtecx/vtecxnext'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import {
  URI_SYSTEM_USER,
  URI_GROUP_ADMIN,
  URI_GROUP_USERADMIN,
  URI_GROUPADMIN_CAO,
  URI_GROUP_GROUPADMIN_PREFIX,
  URI_LOCAL_GOVERNMENT,
  URI_DISASTER,
  URI_RECIPIENT,
  URI_OCCUPATION,
  URI_POSITION,
  URI_USER,
  URI_ACTIVITY,
  URI_EXPENSE,
  URI_GROUP_SLASH,
  URI_ACTIVITY_MODIFICATION,
  URI_EXPENSE_MODIFICATION,
  URI_NUMBERING,
  URI_ITEM,
  DISASTER_CODE_PREFIX,
  DISASTER_CODE_LEN,
  OCCUPATION_CODE_PREFIX,
  OCCUPATION_CODE_LEN,
  POSITION_CODE_PREFIX,
  POSITION_CODE_LEN,
  ACTIVITY_CODE_PREFIX,
  ACTIVITY_CODE_LEN,
  ACTIVITY_CODE_SEQ_LEN,
  EXPENSE_CODE_PREFIX,
  EXPENSE_CODE_LEN,
  ITEM_CODE_LEN,
  MODIFICATION_SEQ_LEN,
  GETFEED_LIMIT,
  ENABLE_STATUS_VALID,
  DISASTER_STATUS_VALID,
  JOB_DESCRIPTION_SHELTER,
  JOB_DESCRIPTION_SUPPLIES,
  JOB_DESCRIPTION_WATER,
  JOB_DESCRIPTION_MEDICALCARE,
  JOB_DESCRIPTION_WELFARE,
  JOB_DESCRIPTION_OTHER,
  CAO_CODE,
  ITEM_CLASS_TRAVEL_EXPENSE,
  ITEM_CLASS_SUPPLIES_EXPENSE,
  ITEM_CLASS_FUEL_EXPENSE,
  ITEM_CLASS_PRINTING_EXPENSE,
  ITEM_CLASS_UTILITY_EXPENSE,
  ITEM_CLASS_REPAIR_EXPENSE,
  ITEM_CLASS_FOOD_EXPENSE,
  ITEM_CLASS_COMMUNICATION_EXPENSE,
  ITEM_CLASS_RENTAL_EXPENSE,
  ITEM_CLASS_SERVICE_ALLOWANCE,
  ITEM_CLASS_WAGE,
  ITEM_CLASS_ACCOMMODATION_EXPENSE,
  ITEM_CLASS_MEDICAL_SUPPLY,
  ITEM_CLASS_MEDICAL_EQUIPMENT_REPAIR_COST,
  ITEM_CLASS_WELFARE_CONSUMABLES,
  ITEM_CLASS_WELFARE_BUILDING_USE_FEE,
  ITEM_CLASS_WELFARE_EQUIPMENT_USE_FEE,
  ITEM_CLASS_WELFARE_UTILITY_EXPENSE,
  ITEM_CLASS_WELFARE_INSTALLATION_EXPENSE,
  OCCUPATION_TYPE_HOSPITAL_PUBLIC,
  OCCUPATION_TYPE_HOSPITAL_OTHER,
  OCCUPATION_TYPE_WELFARE_PUBLIC,
  OCCUPATION_TYPE_WELFARE_OTHER,
  FORMAT_DATE,
  FORMAT_HOUR_MIN,
  LOGIN_CAO,
  LOGIN_LOCAL_GOVERNMENT,
  LOGIN_STAFF,
  AUTHORITY_ADMIN,
  MAIL_REPLACE_ACCOUNT,
  MAIL_REPLACE_PASSWORD,
  MAIL_REPLACE_LOGIN_URL,
  MAIL_REPLACE_VTECXNEXT_URL,
  ASSISTANCE_TEAM_DMAT,
  ASSISTANCE_TEAM_DWAT,
  INVOICE_CODE_LEN,
  INVOICE_CODE_PREFIX,
  URI_INVOICE
} from './apiconst'
import { Entry, MessageResponse } from '../typings'
import * as util from './commonutil'
import * as base from './apibaseutil'

dayjs.extend(timezone)
dayjs.extend(utc)

//const REGEX_PHONE_HYPHEN = /^0\d{1,4}-\d{1,4}-\d{3,4}$/
/** フレームワークユーザ情報の親階層+スラッシュ (/_user/) */
const URI_SYSTEM_USER_SLASH = `${URI_SYSTEM_USER}/`
/** フレームワークユーザ情報の親階層文字数+1 (/_user/) */
const URI_SYSTEM_USER_SLASH_LEN = URI_SYSTEM_USER_SLASH.length

/** ログイン属性 */
type Role = {
  // 内閣府ユーザの場合true
  isCao: boolean
  // 所属自治体が都道府県の場合true
  isPrefecture: boolean
  // 内閣府ユーザか、自治体管理者の場合true
  isAdmin: boolean
}

/** exec BigQuery parameter */
export type BqParam = {
  // SQL
  sql: string
  // ?の部分に設定されるパラメータ
  values?: any[]
}

/** 更新タイプ判定戻り値 */
export type UpdateInfo = {
  // 入力エントリー
  inputEntry: Entry
  // 登録フラグ
  updateType: number
  // 更新の場合、現在のエントリー
  currentEntry?: Entry
}

/**
 * ログイン.
 * @param req リクエスト
 * @param vtecxnext VtecxNext
 * @returns レスポンスのステータスとメッセージ
 */
export const login = async (req: NextRequest, vtecxnext: VtecxNext): Promise<StatusMessage> => {
  let statusMessage: StatusMessage
  const totp: string = util.toString(vtecxnext.getParameter('totp'))
  console.log(`[api login] start. totp=${totp}`)
  if (!totp) {
    // リクエストヘッダからWSSEを取得
    const wsse: string | null = req.headers.get('x-wsse')
    const reCaptchaToken: string = util.toString(vtecxnext.getParameter('g-recaptcha-token'))
    console.log(`[api login] x-wsse=${wsse}`)
    if (wsse == null) {
      console.log(`[api login] x-wsse header is required.`)
      throw new VtecxNextError(400, 'Authentication is required.')
    }
    statusMessage = await vtecxnext.login(wsse, reCaptchaToken)
  } else {
    // ２段階認証
    const isTrustedDevice = vtecxnext.hasParameter('trusteddevice')
    statusMessage = await vtecxnext.loginWithTotp(totp, isTrustedDevice)
  }
  return statusMessage
}

/**
 * ログアウト.
 * @param req リクエスト
 * @param vtecxnext VtecxNext
 * @returns レスポンスのステータスとメッセージ
 */
export const logout = async (vtecxnext: VtecxNext): Promise<StatusMessage> => {
  try {
    return await vtecxnext.logout()
  } catch (e) {
    console.log(`[apiutil logout] Error occured. ${e}`)
    throw e
  }
}

/**
 * Feed検索.
 * @param vtecxnext VtecxNext
 * @param param キー+検索条件
 * @return Entry配列
 */
export const getFeed = async (
  vtecxnext: VtecxNext,
  param: string
): Promise<Entry[] | undefined> => {
  // エントリー取得
  try {
    return await vtecxnext.getFeed(param)
  } catch (e) {
    console.log(`[apiutil getFeed] Error occured. ${e}`)
    throw e
  }
}

/**
 * ページング.
 * ページのカーソルリスト作成(1ページ目指定の場合)+指定ページ取得
 * @param vtecxnext VtecxNext
 * @param param キー+検索条件
 * @param pageNum ページ番号
 * @return 対象ページのEntry配列
 */
export const getPageWithPagination = async (
  vtecxnext: VtecxNext,
  param: string,
  pageNum: number
): Promise<Entry[] | undefined> => {
  // エントリー取得
  try {
    return await vtecxnext.getPageWithPagination(param, pageNum)
  } catch (e) {
    console.log(`[apiutil getPageWithPagination] Error occured. ${e}`)
    throw e
  }
}

/**
 * 件数取得.
 * @param vtecxnext VtecxNext
 * @param param キー+検索条件
 * @return 件数
 */
export const count = async (vtecxnext: VtecxNext, param: string): Promise<number> => {
  try {
    const count = await vtecxnext.count(param)
    return count ? count : 0
  } catch (e) {
    console.log(`[apiutil count] Error occured. ${e}`)
    throw e
  }
}

/**
 * Entry検索
 * @param vtecxnext VtecxNext
 * @param param キー
 * @returns Entry
 */
export const getEntry = async (vtecxnext: VtecxNext, param: string): Promise<Entry | undefined> => {
  // エントリー取得
  try {
    return await vtecxnext.getEntry(param)
  } catch (e) {
    console.log(`[apiutil getEntry] Error occured. ${e}`)
    throw e
  }
}

/**
 * 採番
 * @param vtecxnext VtecxNext
 * @param param キー
 * @param num 採番数
 * @returns 採番値
 */
export const allocids = async (
  vtecxnext: VtecxNext,
  param: string,
  num?: number
): Promise<string> => {
  try {
    return await vtecxnext.allocids(param, num ? num : 1)
  } catch (e) {
    console.log(`[apiutil allocids] Error occured. ${e}`)
    throw e
  }
}

/**
 * 現在時刻を取得
 * @param vtecxnext VtecxNext
 * @returns 現在時刻
 */
export const now = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    return await vtecxnext.now()
  } catch (e) {
    console.log(`[apiutil now] Error occured. ${e}`)
    throw e
  }
}

/**
 * 登録.
 * @param vtecxnext VtecxNext
 * @param feed Feed
 * @returns 登録したFeed
 */
export const post = async (vtecxnext: VtecxNext, feed: Entry[]): Promise<Entry[]> => {
  try {
    const result = await vtecxnext.post(feed)
    if (result && Array.isArray(result)) {
      return result
    } else {
      console.log(
        `[apiutil post] Error occured. receive MessageResponse. ${JSON.stringify(result)}`
      )
      return []
    }
  } catch (e) {
    console.log(`[apiutil post] Error occured. ${e}`)
    throw e
  }
}

/**
 * BDB+BigQuery登録.
 * @param vtecxnext VtecxNext
 * @param feed Feed
 * @returns 登録したFeed
 */
export const postBDBQ = async (vtecxnext: VtecxNext, feed: Entry[]): Promise<Entry[]> => {
  try {
    const result = await vtecxnext.postBDBQ(feed)
    if (result && Array.isArray(result)) {
      return result
    } else {
      console.log(
        `[apiutil postBDBQ] Error occured. receive MessageResponse. ${JSON.stringify(result)}`
      )
      return []
    }
  } catch (e) {
    console.log(`[apiutil postBDBQ] Error occured. ${e}`)
    throw e
  }
}

/**
 * 更新.
 * @param vtecxnext VtecxNext
 * @param feed Feed
 * @returns 更新したFeed
 */
export const put = async (vtecxnext: VtecxNext, feed: Entry[]): Promise<Entry[]> => {
  try {
    const result = await vtecxnext.put(feed)
    if (result && Array.isArray(result)) {
      return result
    } else {
      console.log(`[apiutil put] Error occured. receive MessageResponse. ${JSON.stringify(result)}`)
      return []
    }
  } catch (e) {
    console.log(`[apiutil put] Error occured. ${e}`)
    throw e
  }
}

/**
 * BDB+BigQuery更新.
 * @param vtecxnext VtecxNext
 * @param feed Feed
 * @returns 更新したFeed
 */
export const putBDBQ = async (vtecxnext: VtecxNext, feed: Entry[]): Promise<Entry[]> => {
  try {
    const result = await vtecxnext.putBDBQ(feed)
    if (result && Array.isArray(result)) {
      return result
    } else {
      console.log(
        `[apiutil putBDBQ] Error occured. receive MessageResponse. ${JSON.stringify(result)}`
      )
      return []
    }
  } catch (e) {
    console.log(`[apiutil putBDBQ] Error occured. ${e}`)
    throw e
  }
}

/**
 * 更新.
 * @param vtecxnext VtecxNext
 * @param feed Feed
 * @returns 更新したFeed
 */
export const deleteEntries = async (vtecxnext: VtecxNext, feed: Entry[]): Promise<void> => {
  try {
    await vtecxnext.deleteEntries(feed)
  } catch (e) {
    console.log(`[apiutil deleteEntries] Error occured. ${e}`)
    throw e
  }
}

/**
 * フォルダ削除
 * @param vtecxnext VtecxNext
 * @param key 削除フォルダキー
 */
export const deleteFolder = async (vtecxnext: VtecxNext, key: string): Promise<void> => {
  try {
    await vtecxnext.deleteFolder(key)
  } catch (e) {
    console.log(`[apiutil deleteFolder] key=${key} Error occured. ${e}`)
    throw e
  }
}

/**
 * BigQueryのデータを削除
 * @param vtecxnext VtecxNext
 * @param keys キーリスト
 * @param async 非同期の場合true
 * @returns 削除成功時true
 */
export const deleteBQ = async (vtecxnext: VtecxNext, keys: string[], async?: boolean) => {
  try {
    return await vtecxnext.deleteBQ(keys, async)
  } catch (e) {
    console.log(`[apiutil deleteBQ] Error occured. ${e}`)
    throw e
  }
}

/**
 * BDB+BigQuery削除.
 * @param vtecxnext VtecxNext
 * @param keys 削除キーリスト
 * @returns 削除成功時true
 */
export const deleteBDBQ = async (vtecxnext: VtecxNext, keys: string[]): Promise<boolean> => {
  try {
    return await vtecxnext.deleteBDBQ(keys)
  } catch (e) {
    console.log(`[apiutil deleteBDBQ] Error occured. ${e}`)
    throw e
  }
}

/**
 * グループ管理者によるユーザ登録.
 * @param vtecxnext VtecxNext
 * @param adduserInfos 登録ユーザ情報
 * @param groupname グループ名
 * @returns UIDリストメッセージ
 */
export const adduserByGroupadmin = async (
  vtecxnext: VtecxNext,
  adduserInfos: AdduserInfo[],
  groupname: string
): Promise<MessageResponse> => {
  try {
    return await vtecxnext.adduserByGroupadmin(adduserInfos, groupname)
  } catch (e) {
    console.log(`[apiutil adduserByGroupadmin] Error occured. ${e}`)
    throw e
  }
}

/**
 * ユーザを無効にする
 * @param vtecxnext vtecxnext
 * @param uids UIDリスト
 * @returns
 */
export const revokeusers = async (vtecxnext: VtecxNext, uids: string[]) => {
  try {
    return await vtecxnext.revokeusers(undefined, uids, true)
  } catch (e) {
    console.log(`[apiutil revokeusers] Error occured. ${e}`)
    throw e
  }
}

/**
 * グループ管理者によるグループ追加.
 * @param vtecxnext VtecxNext
 * @param uids グループに参加するUIDリスト
 * @param group グループキー
 * @returns UIDリストメッセージ
 */
export const addgroupByAdmin = async (
  vtecxnext: VtecxNext,
  uids: string[],
  group: string
): Promise<Entry[]> => {
  return await vtecxnext.addGroupByAdmin(uids, group).catch((e) => {
    console.log(`[apiutil addgroupByAdmin] catch error. ${e}`)
    throw e
  })
}

/**
 * グループ管理者によるグループ削除.
 * @param vtecxnext VtecxNext
 * @param uids グループに参加するUIDリスト
 * @param group グループキー
 * @returns 削除したグループエントリーリスト
 */
export const removegroupByAdmin = async (
  vtecxnext: VtecxNext,
  uids: string[],
  group: string
): Promise<Entry[]> => {
  return await vtecxnext.leaveGroupByAdmin(uids, group).catch((e) => {
    console.log(`[apiutil removegroupByAdmin] catch error.`)
    throw e
  })
}

/**
 * 署名付きアップロードURL取得.
 * @param vtecxnext VtecxNext
 * @param parentUri 親キー
 * @returns 署名付きアップロードURL
 */
export const getSignedUrlToPostContent = async (
  vtecxnext: VtecxNext,
  parentUri: string
): Promise<ContentSignedUrl> => {
  return await vtecxnext.getSignedUrlToPostContent(parentUri).catch((e) => {
    console.log(`[apiutil getSignedUrlToPostContent] catch error.`)
    throw e
  })
}

/**
 * 署名付きダウンロードURL取得.
 * @param vtecxnext VtecxNext
 * @param uri キー
 * @returns 署名付きダウンロードURL
 */
export const getSignedUrlToGetContent = async (
  vtecxnext: VtecxNext,
  uri: string
): Promise<ContentSignedUrl> => {
  return await vtecxnext.getSignedUrlToGetContent(uri).catch((e) => {
    console.log(`[apiutil getSignedUrlToGetContent] catch error.`)
    throw e
  })
}

/**
 * メール送信.
 * @param vtecxnext VtecxNext
 * @param entry メールエントリー
 * @param to 送信先メールアドレス
 * @returns true
 */
export const sendMail = async (
  vtecxnext: VtecxNext,
  entry: Entry,
  to: string[]
): Promise<boolean> => {
  try {
    return await vtecxnext.sendMail(entry, to)
  } catch (e) {
    console.log(`[apiutil sendMail] Error occured. ${e}`)
    throw e
  }
}

/**
 * 災害データを取得.
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param checkEnabled ステータスが有効なもののみ返却する場合true
 * @return Entry
 */
export const getDisaster = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  checkEnabled?: boolean
): Promise<Entry | undefined> => {
  return undefined
  /*
  const param = `${URI_DISASTER}/${disaster_code}`
  try {
    const entry = await getEntry(vtecxnext, param)
    if (entry && checkEnabled && entry.disaster?.disaster_status !== 1) {
      return undefined
    }
    return entry
  } catch (e) {
    console.log(`[apiutil getDisaster] Error occured. ${e}`)
    throw e
  }
  */
}

/**
 * 災害一覧を取得.
 * @param vtecxnext VtecxNext
 * @param limitStr 件数
 * @return Entry配列
 */
export const getDisasterList = async (
  vtecxnext: VtecxNext,
  limitStr?: string,
  disaster_name?: string
): Promise<Entry[] | undefined> => {
  const param = `${URI_DISASTER}?${disaster_name ? 'disaster.disaster_name-ft-' + disaster_name : 's=disaster.disaster_date_desc'}&disaster.disaster_status=${DISASTER_STATUS_VALID}&l=${limitStr ? limitStr : GETFEED_LIMIT}`
  try {
    return await getFeed(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getDisasterList] Error occured. ${e}`)
    throw e
  }
}

/**
 * 災害データと被災自治体情報を取得.
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @return Entry
 */
export const getDisasterAndRecipients = async (
  vtecxnext: VtecxNext,
  disaster_code: string
): Promise<Entry[] | undefined> => {
  try {
    let resFeed: Entry[] | undefined
    // 1件目は災害情報 /disaster/{災害コード}
    const disasterEntry = await getDisaster(vtecxnext, disaster_code)
    if (disasterEntry) {
      resFeed = [disasterEntry]
      // 2件目以降は被災自治体 /disaster/{災害コード}/recipient/{自治体コード}
      const recipientEntries = await getRecipientList(vtecxnext, disaster_code)
      if (recipientEntries) {
        resFeed.push(...recipientEntries)
      }
    }
    return resFeed
  } catch (e) {
    console.log(`[apiutil getDisasterAndRecipients] Error occured. ${e}`)
    throw e
  }
}

/**
 * 都道府県一覧を取得.
 * @param vtecxnext VtecxNext
 * @return Entry配列
 */
export const getPrefectureList = async (vtecxnext: VtecxNext): Promise<Entry[] | undefined> => {
  const param = `${URI_LOCAL_GOVERNMENT}?local_government.is_prefecture=true&local_government.enabled_status=${ENABLE_STATUS_VALID}&l=${GETFEED_LIMIT}`
  try {
    return await getFeed(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getPrefectureList] Error occured. ${e}`)
    throw e
  }
}

/**
 * 都道府県配下の市区町村一覧を取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 都道府県の自治体コード
 * @return Entry配列
 */
export const getMunicipalityList = async (
  vtecxnext: VtecxNext,
  local_government_code: string
): Promise<Entry[] | undefined> => {
  const param = `${URI_LOCAL_GOVERNMENT}/${getPrefecture2digits(local_government_code)}*?local_government.is_prefecture=false&enabled_status=${ENABLE_STATUS_VALID}&l=${GETFEED_LIMIT}`
  try {
    return await getFeed(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getMunicipalityList] Error occured. ${e}`)
    throw e
  }
}

/**
 * 自治体情報を1件取得
 * @param vtecxnext
 * @param local_government_code 自治体コード
 * @param isEnabled 有効ステータスが有効の場合のみ返す
 * @returns 自治体情報
 */
export const getLocalGovernment = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  isEnabled?: boolean
): Promise<Entry> => {
  return {}
  /*
  const param = getLocalGovernmentUri(local_government_code)
  try {
    const result = await getEntry(vtecxnext, param)
    if (!result) {
      // 存在しない場合はエラー
      throw new VtecxNextError(
        400,
        `local government code does not exist. ${local_government_code}`
      )
    }
    if (isEnabled && !result.local_government?.enabled_status) {
      // 削除済みの場合はエラー
      throw new VtecxNextError(400, `local government code was removed. ${local_government_code}`)
    }
    return result
  } catch (e) {
    console.log(`[apiutil getLocalGovernment] Error occured. ${e}`)
    throw e
  }
  */
}

/**
 * 被災自治体を取得.
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param local_government_code 自治体コード
 * @return 被災自治体Entry
 */
export const getRecipient = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  local_government_code: string
): Promise<Entry | undefined> => {
  return undefined
  /*
  const param = `${URI_DISASTER}/${disaster_code}${URI_RECIPIENT}/${local_government_code}`
  //console.log(`[apiutil getRecipient] getEntry param = ${param}`)
  try {
    const entry = await getEntry(vtecxnext, param)
    //console.log(`[apiutil getRecipient] getEntry param = ${param} entry = ${JSON.stringify(entry)}`)
    if (entry && entry.recipient?.enabled_status === ENABLE_STATUS_VALID) {
      return entry
    }
  } catch (e) {
    console.log(`[apiutil getRecipient] Error occured. ${e}`)
    throw e
  }
  */
}

/**
 * 被災自治体マスタ一覧を取得.
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param local_government_code 都道府県コード(任意)
 * @return Entry配列
 */
export const getRecipientMasterList = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  local_government_code?: string
): Promise<Entry[] | undefined> => {
  const param = `${URI_DISASTER}/${disaster_code}${URI_RECIPIENT}${local_government_code ? '/' + getPrefecture2digits(local_government_code) + '*' : ''}?recipient.enabled_status=${ENABLE_STATUS_VALID}`
  try {
    return await getFeed(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getRecipientMasterList] Error occured. ${e}`)
    throw e
  }
}

/**
 * 被災自治体マスタ＋自治体マスタ情報を取得.
 * @param vtecxnext
 * @return Entry配列
 */
export const getRecipientList = async (
  vtecxnext: VtecxNext,
  disaster_code: string
): Promise<Entry[] | undefined> => {
  // 被災自治体マスタを検索
  /*
  const recipientEntries = await getRecipientMasterList(vtecxnext, disaster_code)
  const promiseList: { [key: string]: Promise<Entry> } = {}
  if (recipientEntries) {
    for (const recipientEntry of recipientEntries) {
      const local_government_code = getLocalGovernmentCodeByRecipient(recipientEntry)
      // 自治体取得処理はPromiseのまま保持
      promiseList[local_government_code] = getLocalGovernment(vtecxnext, local_government_code)
    }

    // Promiseをawait
    for (const recipientEntry of recipientEntries) {
      const local_government_code = getLocalGovernmentCodeByRecipient(recipientEntry)
      if (local_government_code) {
        const promise = promiseList[local_government_code]
        const result = await promise
        recipientEntry.local_government = result.local_government
      } else {
        console.log(
          `[apiutil getRecipientList] local_government_code is empty.(2) ${JSON.stringify(recipientEntry)}`
        )
      }
    }
    return recipientEntries
  }
  */
  return undefined
}

/**
 * 被災自治体マスタのキーから自治体コードを取得
 *   /disaster/{災害コード}/recipient/{自治体コード}
 * @param recipientEntry 被災自治体エントリー
 * @return 自治体コード
 */
export const getLocalGovernmentCodeByRecipient = (recipientEntry: Entry): string => {
  const uri = util.getUri(recipientEntry)
  if (uri) {
    const idx = uri.lastIndexOf('/')
    if (idx > 0) {
      return uri.substring(idx + 1)
    }
  }
  return ''
}

/**
 * 所属一覧を取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @return Entry配列
 */
export const getOccupationList = async (
  vtecxnext: VtecxNext,
  local_government_code: string
): Promise<Entry[] | undefined | VtecxNextError> => {
  // /local_government/{自治体コード}/occupation
  const param = `${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_OCCUPATION}?enabled_status=${ENABLE_STATUS_VALID}&l=${GETFEED_LIMIT}`
  try {
    return await vtecxnext.getFeed(param)
  } catch (e) {
    console.log(`[apiutil getOccupationList] catch error. ${e}`)
    throw e
  }
}

/**
 * 所属データを1件取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param occupation_code 所属コード
 * @return Entry
 */
export const getOccupation = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  occupation_code: string
): Promise<Entry | undefined> => {
  // /local_government/{自治体コード}/occupation/{所属コード}
  const param = `${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_OCCUPATION}/${occupation_code}`
  try {
    return await getEntry(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getOccupation] Error occured. ${e}`)
    throw e
  }
}

/**
 * 役職・職種一覧を取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param position_type 役職・職種区分
 * @return Entry配列
 */
export const getPositionList = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  position_type?: string
): Promise<Entry[] | undefined> => {
  // /local_government/{自治体コード}/position
  const param = `${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_POSITION}?enabled_status=${ENABLE_STATUS_VALID}&l=${GETFEED_LIMIT}${position_type ? '&position.position_type=' + position_type : ''}`
  try {
    return await getFeed(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getPositionList] Error occured. ${e}`)
    throw e
  }
}

/**
 * 役職・職種データを1件取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param position_code 役職・職種コード
 * @return Entry
 */
export const getPosition = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  position_code: string
): Promise<Entry | undefined> => {
  // /local_government/{自治体コード}/position/{役職・職種コード}
  const param = `${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_POSITION}/${position_code}`
  try {
    return await getEntry(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getPosition] Error occured. ${e}`)
    throw e
  }
}

/**
 * ユーザデータを1件取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param uid UID
 * @param isFuzzy 存在しない場合、/user/{UID} も検索する場合true
 * @return Entry
 */
export const getUser = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  uid: string,
  isFuzzy?: boolean
): Promise<Entry | undefined> => {
  return undefined
  /*
  // /local_government/{自治体コード}/user/{UID}
  const userKey = `${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_USER}/${uid}`
  //console.log(`[apiutil getUser] userKey = ${userKey}`)
  try {
    const userEntry = await getEntry(vtecxnext, userKey)
    if (userEntry && userEntry.user?.enabled_status === ENABLE_STATUS_VALID) {
      return userEntry
    } else if (isFuzzy) {
      // /user/{UID} を検索
      const userUidKey = `${URI_USER}/${uid}`
      return await getEntry(vtecxnext, userUidKey)
    }
    return undefined
  } catch (e) {
    throw e
  }
  */
}

/**
 * ユーザデータを1件取得.
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param email メールアドレス
 * @param returnInvalid 削除データも返却する場合true
 * @param isFuzzy 存在しない場合、/user/{UID} も検索する場合true
 * @return Entry
 */
export const getUserByEmail = async (
  vtecxnext: VtecxNext,
  //local_government_code: string,
  email: string,
  returnInvalid?: boolean,
  isFuzzy?: boolean
): Promise<Entry | undefined> => {
  return undefined
  /*
  // /local_government/{自治体コード}/user/{UID}
  let param = `${URI_LOCAL_GOVERNMENT}/${local_government_code}${URI_USER}?user.email=${util.encodeURIPlus(email)}`
  console.log(`[apiutil getUserByEmail] param = ${param}`)
  try {
    const feed = await getFeed(vtecxnext, param)
    if (feed && Array.isArray(feed) && feed.length > 0) {
      const userEntry = feed[0]
      if (userEntry && (returnInvalid || userEntry.user?.enabled_status === ENABLE_STATUS_VALID)) {
        if (!userEntry || !userEntry.user) {
          return undefined
        }
        return await getUserInfoNames(vtecxnext, userEntry)
      }
    }
    if (isFuzzy) {
      // /user?user.email={メールアドレス} でFeed検索
      param = `${URI_USER}?user.email=${util.encodeURIPlus(email)}`
      console.log(`[apiutil getUserByEmail] user alias param = ${param}`)
      const userAliasFeed = await getFeed(vtecxnext, param)
      //console.log(`[apiutil getUserByEmail] user alias feed = ${JSON.stringify(userAliasFeed)}`)
      if (userAliasFeed && Array.isArray(userAliasFeed) && userAliasFeed.length > 0) {
        const tmpUserEntry = userAliasFeed[0]
        if (
          tmpUserEntry &&
          (returnInvalid || tmpUserEntry.user?.enabled_status === ENABLE_STATUS_VALID)
        ) {
          if (!tmpUserEntry || !tmpUserEntry.user) {
            return undefined
          }
          return await getUserInfoNames(vtecxnext, tmpUserEntry)
        }
      }
    }
    return undefined
  } catch (e) {
    throw e
  }
  */
}

/**
 * ユーザデータを1件取得
 * 自治体名、所属名、役職・職種名も取得する。
 * ユーザ情報からメールアドレス、電話番号等を除く。
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param uid UID
 * @param occupation_code 所属コード
 * @param isFuzzy 存在しない場合、/user/{UID} も検索する場合true
 * @returns ユーザデータと各コードの名称
 */
export const getPublicUserInfo = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  uid: string,
  occupation_code?: string,
  isFuzzy?: boolean
): Promise<Entry | undefined> => {
  return undefined
  /*
  try {
    const userInfoEntry = await getUserInfo(
      vtecxnext,
      local_government_code,
      uid,
      occupation_code,
      isFuzzy
    )
    if (userInfoEntry && userInfoEntry.user) {
      // ユーザ情報からメールアドレス、電話番号等を除く
      userInfoEntry.user = {
        local_government_code: userInfoEntry.user.local_government_code,
        uid: userInfoEntry.user.uid,
        user_name: userInfoEntry.user.user_name,
        authority: userInfoEntry.user.authority,
        occupation_code: userInfoEntry.user.occupation_code,
        position_code: userInfoEntry.user.position_code,
        assistance_team: userInfoEntry.user.assistance_team,
        enabled_status: userInfoEntry.user.enabled_status
      }
    }
    return { ...userInfoEntry }
  } catch (e) {
    throw e
  }
  */
}

/**
 * ユーザデータを1件取得
 * 自治体名、所属名、役職・職種名も取得する。
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param uid UID
 * @param occupation_code 所属コード
 * @param isFuzzy 存在しない場合、/user/{UID} も検索する場合true
 * @returns ユーザデータと各コードの名称
 */
export const getUserInfo = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  uid: string,
  occupation_code?: string,
  isFuzzy?: boolean
): Promise<Entry | undefined> => {
  return undefined
  /*
  try {
    const userEntry = await getUser(vtecxnext, local_government_code, uid, isFuzzy)
    if (!userEntry || !userEntry.user) {
      return undefined
    }
    return await getUserInfoNames(vtecxnext, userEntry, occupation_code)
  } catch (e) {
    throw e
  }
  */
}

/**
 * ユーザマスタが持つ各コードの名称を取得
 * @param vtecxnext VtecxNext
 * @param userEntry ユーザマスタデータ
 * @param occupation_code 所属コード(日報・支出に設定された所属を使用する場合)
 * @returns 名称を設定したエントリー
 */
const getUserInfoNames = async (
  vtecxnext: VtecxNext,
  userEntry: Entry,
  occupation_code?: string
): Promise<Entry | undefined> => {
  return undefined
  /*
  if (!userEntry.user || !userEntry.user.local_government_code) {
    return undefined
  }
  const local_government_code = userEntry.user.local_government_code
  let promiseLocalGovernment = getLocalGovernment(vtecxnext, local_government_code)
  let promiseOccupation: Promise<Entry | undefined> | undefined = undefined
  let promisePosition: Promise<Entry | undefined> | undefined = undefined
  let tmp_occupation_code = occupation_code || userEntry.user.occupation_code
  if (tmp_occupation_code) {
    promiseOccupation = getOccupation(vtecxnext, local_government_code, tmp_occupation_code)
  }
  if (userEntry.user.position_code) {
    promisePosition = getPosition(vtecxnext, local_government_code, userEntry.user.position_code)
  }

  const localGovernmentEntry = await promiseLocalGovernment
  if (localGovernmentEntry) {
    userEntry.local_government = localGovernmentEntry.local_government
  }
  if (promiseOccupation) {
    const occupationEntry = await promiseOccupation
    if (occupationEntry) {
      userEntry.occupation = occupationEntry.occupation
    }
  }
  if (promisePosition) {
    const positionEntry = await promisePosition
    if (positionEntry) {
      userEntry.position = positionEntry.position
    }
  }
  return userEntry
  */
}

/**
 * 品目一覧を取得.
 * @param vtecxnext VtecxNext
 * @param item_class 費用種別
 * @return Entry配列
 */
export const getItemList = async (
  vtecxnext: VtecxNext,
  item_class?: string
): Promise<Entry[] | undefined | VtecxNextError> => {
  // /item/{品目コード}
  const param = `${URI_ITEM}${item_class ? '/' + item_class + '*' : ''}?enabled_status=${ENABLE_STATUS_VALID}&l=${GETFEED_LIMIT}`
  try {
    return await vtecxnext.getFeed(param)
  } catch (e) {
    console.log(`[apiutil getItemList] catch error. ${e}`)
    throw e
  }
}

/**
 * 品目データを1件取得.
 * @param vtecxnext VtecxNext
 * @param item_purchased 品目コード
 * @return Entry
 */
export const getItem = async (
  vtecxnext: VtecxNext,
  item_purchased: string
): Promise<Entry | undefined> => {
  // /item/{品目コード}
  const param = `${URI_ITEM}/${item_purchased}`
  try {
    return await getEntry(vtecxnext, param)
  } catch (e) {
    console.log(`[apiutil getItem] Error occured. ${e}`)
    throw e
  }
}

/**
 * 災害コード採番
 * @param vtecxnext VtecxNext
 * @returns 災害コード
 */
export const numberingDisasterCode = async (vtecxnext: VtecxNext): Promise<string> => {
  // 採番
  try {
    const disaster_code = await allocids(vtecxnext, URI_DISASTER)
    return `${DISASTER_CODE_PREFIX}${disaster_code.padStart(DISASTER_CODE_LEN, '0')}`
  } catch (e) {
    console.log(`[apiutil numberingDisasterCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 所属コード採番
 * @param vtecxnext VtecxNext
 * @param num 採番数
 * @returns 所属コード
 */
export const numberingOccupationCode = async (
  vtecxnext: VtecxNext,
  num: number
): Promise<string[]> => {
  // 採番URI /numbering/occupation
  const allocidsUri = `${URI_NUMBERING}${URI_OCCUPATION}`
  try {
    const str = await allocids(vtecxnext, allocidsUri, num)
    const codes: string[] = []
    const strParts = str.split(',')
    for (const strPart of strParts) {
      const code = `${OCCUPATION_CODE_PREFIX}${strPart.padStart(OCCUPATION_CODE_LEN, '0')}`
      codes.push(code)
    }
    return codes
  } catch (e) {
    console.log(`[apiutil numberingOccupationCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 役職・職種コード採番
 * @param vtecxnext VtecxNext
 * @param num 採番数
 * @returns 役職・職種コード
 */
export const numberingPositionCode = async (
  vtecxnext: VtecxNext,
  num: number
): Promise<string[]> => {
  // 採番URI /numbering/position
  const allocidsUri = `${URI_NUMBERING}${URI_POSITION}`
  try {
    const str = await allocids(vtecxnext, allocidsUri, num)
    const codes: string[] = []
    const strParts = str.split(',')
    for (const strPart of strParts) {
      const code = `${POSITION_CODE_PREFIX}${strPart.padStart(POSITION_CODE_LEN, '0')}`
      codes.push(code)
    }
    return codes
  } catch (e) {
    console.log(`[apiutil numberingPositionCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 日報コード採番
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param num 採番数
 * @returns [0]日報コード、[1〜]日報コード連番
 */
export const numberingActivityCode = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  num: number
): Promise<string[]> => {
  // 採番URI /numbering/{災害コード}/activity
  // 日報コード: "A"+9桁 災害コードごとに発番
  const allocidsUri = `${URI_NUMBERING}/${disaster_code}${URI_ACTIVITY}`
  try {
    let str = await allocids(vtecxnext, allocidsUri)
    const activity_code = `${ACTIVITY_CODE_PREFIX}${str.padStart(ACTIVITY_CODE_LEN, '0')}`
    const seqList: string[] = await numberingActivityCodeSeq(
      vtecxnext,
      disaster_code,
      activity_code,
      num
    )
    const codes: string[] = [activity_code, ...seqList]
    return codes
  } catch (e) {
    console.log(`[apiutil numberingActivityCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 日報コード連番採番
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param activity_code 日報コード
 * @param num 採番数
 * @returns 日報コード連番リスト
 */
export const numberingActivityCodeSeq = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  activity_code: string,
  num: number
): Promise<string[]> => {
  // 採番URI /numbering/{災害コード}/activity/{日報コード}
  const allocidsUri = `${URI_NUMBERING}/${disaster_code}${URI_ACTIVITY}`
  const codes: string[] = []
  // 連番: 「災害コード+日報コード+連番」で一意となる。
  const seqUri = `${allocidsUri}/${activity_code}`
  try {
    const str = await allocids(vtecxnext, seqUri, num)
    const strParts = str.split(',')
    for (const strPart of strParts) {
      const seq = strPart.padStart(ACTIVITY_CODE_SEQ_LEN, '0')
      codes.push(seq)
    }
    return codes
  } catch (e) {
    console.log(`[apiutil numberingActivityCodeSeq] Error occured. ${e}`)
    throw e
  }
}

/**
 * 支出コード採番
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param len 採番数
 * @returns 支出コード
 */
export const numberingExpenseCode = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  len: number
): Promise<string[]> => {
  // 採番URI /numbering/{災害コード}/expense
  // 支出コード: "E"+12桁 災害コードごとに発番
  const allocidsUri = `${URI_NUMBERING}/${disaster_code}${URI_EXPENSE}`
  try {
    const str = await allocids(vtecxnext, allocidsUri, len)
    let parts: string[]
    if (len <= 1) {
      parts = [str]
    } else {
      parts = str.split(',')
    }
    const codes: string[] = []
    for (const code of parts) {
      codes.push(`${EXPENSE_CODE_PREFIX}${code.padStart(EXPENSE_CODE_LEN, '0')}`)
    }
    return codes
  } catch (e) {
    console.log(`[apiutil numberingExpenseCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 日報修正依頼連番採番
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param activity_code 日報コード
 * @param activity_code_seq 日報コード連番
 * @returns 日報修正依頼連番
 */
export const numberingActivityModificationCode = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  activity_code: string,
  activity_code_seq: string
): Promise<string> => {
  // 採番URI /numbering/{災害コード}/activity_modification/{日報コード}-{連番}
  // 日報修正依頼コード: 3桁 災害コード・日報コード・日報コード連番ごとに発番
  const allocidsUri = `${URI_NUMBERING}/${disaster_code}${URI_ACTIVITY_MODIFICATION}/${activity_code}-${activity_code_seq}`
  try {
    let str = await allocids(vtecxnext, allocidsUri)
    return str.padStart(MODIFICATION_SEQ_LEN, '0')
  } catch (e) {
    console.log(`[apiutil numberingActivityModificationCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 支出修正依頼連番採番
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param expense_code 支出コード
 * @returns 支出修正依頼連番
 */
export const numberingExpenseModificationCode = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  expense_code: string
): Promise<string> => {
  // 採番URI /numbering/{災害コード}/expense_modification/{支出コード}
  // 日報修正依頼コード: 3桁 災害コード・支出コードごとに発番
  const allocidsUri = `${URI_NUMBERING}/${disaster_code}${URI_EXPENSE_MODIFICATION}/${expense_code}`
  try {
    let str = await allocids(vtecxnext, allocidsUri)
    return str.padStart(MODIFICATION_SEQ_LEN, '0')
  } catch (e) {
    console.log(`[apiutil numberingExpenseModificationCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 品目コード採番
 * @param vtecxnext VtecxNext
 * @param item_class 費用種類
 * @param len 採番数
 * @returns 支出コード
 */
export const numberingItemCode = async (
  vtecxnext: VtecxNext,
  item_class: string,
  len: number
): Promise<string[]> => {
  // 採番URI /numbering/item/{費用種類}
  // 品目コード: 費用種類2桁+4桁数字
  const allocidsUri = `${URI_NUMBERING}${URI_ITEM}/${item_class}`
  try {
    const str = await allocids(vtecxnext, allocidsUri, len)
    let parts: string[]
    if (len <= 1) {
      parts = [str]
    } else {
      parts = str.split(',')
    }
    const codes: string[] = []
    for (const code of parts) {
      codes.push(`${item_class}${code.padStart(ITEM_CODE_LEN, '0')}`)
    }
    return codes
  } catch (e) {
    console.log(`[apiutil numberingItemCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * リクエストデータ取得
 * @param req リクエスト
 * @returns リクエストデータ
 */
export const getRequestJson = async (req: NextRequest): Promise<any> => {
  // リクエストJSON取得
  const contentLength: number = util.toNumber(req.headers.get('content-length'), 0)
  let data: any | undefined
  if (contentLength > 0) {
    try {
      data = await req.json()
    } catch (error) {
      let resErrMsg: string
      if (util.isError(error)) {
        resErrMsg = `${error.name}: ${error.message}`
      } else {
        resErrMsg = 'Error occured by req.json()'
      }
      console.log(`[apiutil getRequestJson] input error. ${resErrMsg}`)
      throw new VtecxNextError(400, resErrMsg)
    }
  }

  // 入力チェック
  if (!data) {
    console.log(`[apiutil getRequestJson] request data is empty.`)
    throw new VtecxNextError(400, 'Invalid argument.')
  }
  // 配列でない場合もあるためコメントアウト。(passresetなど)
  //if (!Array.isArray(data)) {
  //  console.log(`[apiutil getRequestJson] request feed is not array. ${JSON.stringify(data)}`)
  //  throw new VtecxNextError(400, 'Invalid argument.')
  //}

  return data
}

/**
 * エラーレスポンスを生成
 * @param e エラー
 * @param procName 処理名(ログ用)
 * @returns エラーレスポンス
 */
export const responseError = (e: unknown, procName: string): Response => {
  let resStatus: number = 503
  let resErrMsg: string
  if (isVtecxNextError(e)) {
    resStatus = e.status
    resErrMsg = e.message
    console.log(`[${procName}] Error occued. VtecxNextError: ${resErrMsg}`)
  } else if (util.isError(e)) {
    resErrMsg = `${e.name} ${e.message}`
    console.log(`[${procName}] Error occued. ${resErrMsg}`)
  } else {
    resErrMsg = 'Unexpected error.'
    console.log(`[${procName}] Error occued. ${resErrMsg} ${e}`)
  }
  const resData = { feed: { title: resErrMsg } }
  const resHeaders = { 'content-type': 'application/json' }
  return new Response(JSON.stringify(resData), {
    status: resStatus,
    headers: resHeaders
  })
}

/**
 * ランダム文字列を生成.
 * @param length 文字列長
 * @returns ランダム文字列
 */
export const getRandomStr = (length: number) => {
  return base.getRandomStr(length)
}

/**
 * グループ管理者のグループキーを取得.
 * @param local_government_code 自治体コード
 */
export const getAdmingroup = (local_government_code: string): string => {
  return base.getAdmingroup(local_government_code)
}

/**
 * yyyyMMdd形式かどうかチェック
 * @param datestr 日付形式文字列
 * @return true:yyyyMMdd形式、false:形式エラー
 */
export const isDate = (datestr: string): boolean => {
  return base.isDate(datestr)
}

/**
 * HHmm形式かどうかチェック
 * @param datestr 日付形式文字列
 * @param isEnd 翌日時間(`2400`を加算した値)を許可する場合true
 * @return true:HHmm形式、false:形式エラー
 */
export const isTime = (datestr: string, isEnd?: boolean): boolean => {
  let checkDatestr: string
  if (isEnd) {
    // 深夜勤務で翌日にまたがる場合、24:00を加算した値を設定するため2400をマイナスする。
    if (datestr.length === 4 && util.isPositiveNumber(datestr) && Number(datestr) >= 2400) {
      checkDatestr = String(Number(datestr) - 2400).padStart(4, '0')
    } else {
      checkDatestr = datestr
    }
  } else {
    checkDatestr = datestr
  }
  //console.log(
  //  `[apiutil isTime] datestr=${datestr} isTime=${String(isEnd)} checkDatestr=${checkDatestr}`
  //)
  return base.isTime(checkDatestr)
}

/**
 * 文字列が数字のみで構成されているかどうか
 * @param val 文字列
 * @returns 文字列が数字のみで構成されている場合true
 */
export const isNumberChars = (val: string): boolean => {
  return base.isNumberChars(val)
}

/**
 * 自治体コードかどうかチェック
 *  * 数値かどうか
 *  * 桁数チェック
 *  * チェックディジットチェック
 * @param local_government_code チェックする自治体コード
 * @returns 自治体コードの場合true
 */
export const isLocalGovernmentCode = (local_government_code: string): boolean => {
  return base.isLocalGovernmentCode(local_government_code)
}

/**
 * 自治体コードが正しい都道府県コードかどうかチェック
 * @param local_government_code 自治体コード
 * @returns 都道府県コードの場合true、違う場合false
 */
export const isPrefecture = (local_government_code: string): boolean => {
  return base.isPrefecture(local_government_code)
}

/**
 * 電話番号形式かどうかチェック
 * @param phone 電話番号
 * @returns 形式が正しければtrue
 */
export const checkPhone = (phone: string) => {
  return base.checkPhone(phone)
}

/**
 * 自治体コードから都道府県コードを算出
 *   * 第１桁及び第２桁の番号 ： 各都道府県を意味する。
 *   * 第３桁、第４桁及び第５桁の番号 ： 000 の場合を除き、各市区町村、一部
事務組合、地方開発事業団及び広域連合（以下「一部事務組合等」という。）を
意味する。
 *   * 第６桁の番号 ： 検査数字を示す。
 *       １桁から第５桁までの数字に、それぞれ６．５．４．３．２を乗じて算出した積の和を求め、
 *       その和を１１で除し、商と剰余（以下「余り数字」という。）を求めて、１１と余り数字との差の
 *       下１桁の数字を検査数字とする。
 *       ただし、積の和が１１より小なるときは、検査数字は、１１から積の和を控除した数字と
する。
 * @param local_government_code 自治体コード
 * @returns 都道府県コード
 */
export const culcPrefectureCode = (local_government_code: string): string => {
  return base.culcPrefectureCode(local_government_code)
}

/**
 * 自治体コードから、都道府県をあらわす先頭2桁を取得
 * @param local_government_code 自治体コード
 */
export const getPrefecture2digits = (local_government_code: string) => {
  return base.getPrefecture2digits(local_government_code)
}

/**
 * プロパティから値を取得
 * @param name プロパティ名
 */
export const property = async (vtecxnext: VtecxNext, name: string): Promise<string | null> => {
  try {
    return await vtecxnext.property(name)
  } catch (e) {
    console.log(`[apiutil property] Error occured. ${e}`)
    throw e
  }
}

/**
 * サブクエリを取得
 * @param dataset データセット名
 * @param tablename テーブル名
 * @param isKeyPrefix key条件を設定する場合true
 * @returns 検索SQL
 */
export const getSubquery = (dataset: string, tablename: string, isKeyPrefix?: boolean) => {
  const selecttable = `${dataset}.${tablename}`
  return `select * from ${selecttable} as f 
inner join (
select key, max(updated) as updated 
from ${selecttable}${isKeyPrefix ? ' where key like ?' : ''} group by key) as k 
on f.updated = k.updated and f.key = k.key 
where f.deleted = false`
}

/**
 * ページング条件を取得
 *   LIMIT {1ページあたりの件数} OFFSET {1ページあたりの件数×(ページ番号-1)}
 * @returns
 */
export const getSelectLimit = () => {
  return ` limit ? offset ?`
}

/**
 * ページング時のオフセットを取得
 *   1ページあたりの件数×(ページ番号-1)
 * @param limit 1ページあたりの件数
 * @param pagenum ページ番号
 * @returns オフセット
 */
export const getOffset = (limit: number, pagenum: number) => {
  return limit * (pagenum - 1)
}

/**
 * BigQueryのデータセット名を取得.
 * プロパティを検索して値を取得する。
 * @returns BigQueryのデータセット名
 */
export const getDataset = async (vtecxnext: VtecxNext) => {
  try {
    return await property(vtecxnext, '_bigquery.dataset')
  } catch (e) {
    console.log(`[apiutil getDataset] Error occured. ${e}`)
    throw e
  }
}

/**
 * getSelectSqlを使用したSQLで取得したBigQuery検索結果から、BigQuery独自の項目を削除する。
 * @param pRow 検索結果1件
 * @returns 検索結果からBigQuery独自の項目を削除した連想配列
 */
export const deleteBigQueryColumn = (pRow: any): any => {
  const row = { ...pRow }
  delete row.key
  delete row.updated
  delete row.deleted
  delete row.id
  delete row.key_1
  delete row.updated_1
  return row
}

/**
 * アカウントをキーにフレームワークのユーザ情報を取得.
 * @param vtecxnext vtecxnext
 * @param account アカウント
 * @returns フレームワークのユーザ情報Entry
 */
export const getSystemUserEntryByAccount = async (
  vtecxnext: VtecxNext,
  account: string
): Promise<Entry | undefined> => {
  const editAccount = util.editAccount(account)
  const param = `${URI_SYSTEM_USER}?title=${editAccount}`
  try {
    const systemUsers = await vtecxnext.getFeed(param)
    if (systemUsers && Array.isArray(systemUsers) && systemUsers.length > 0) {
      return systemUsers[0]
    }
    return undefined
  } catch (e) {
    throw e
  }
}

/**
 * UIDをキーにフレームワークのユーザ情報を取得.
 * @param vtecxnext vtecxnext
 * @param uid アカウント
 * @returns フレームワークのユーザ情報Entry
 */
export const getSystemUserEntryByUid = async (
  vtecxnext: VtecxNext,
  uid: string
): Promise<Entry | undefined> => {
  const param = `${URI_SYSTEM_USER}/${uid}`
  try {
    return await vtecxnext.getEntry(param)
  } catch (e) {
    console.log(`[apiutil getSystemUserEntryByUid] Error occured. ${e}`)
    throw e
  }
}

/**
 * フレームワークのユーザ情報からUIDを取得
 * @param systemUserEntry フレームワークのユーザ情報
 * @returns UID
 */
export const getUidBySystemUserEntry = (systemUserEntry: Entry): string => {
  const uri = util.getUri(systemUserEntry)
  if (uri && uri.startsWith(URI_SYSTEM_USER_SLASH)) {
    return uri.substring(URI_SYSTEM_USER_SLASH_LEN)
  }
  return ''
}

/**
 * UID取得
 * @param vtecxnext VtecxNext
 * @returns ログインUID
 */
export const uid = async (vtecxnext: VtecxNext) => {
  try {
    return await vtecxnext.uid()
  } catch (e) {
    console.log(`[apiutil uid] Error occured. ${e}`)
    throw e
  }
}

/**
 * ログインチェック
 * ログインしていない場合はエラーがスローされる
 * @param vtecxnext VtecxNext
 */
export const checkLogin = async (vtecxnext: VtecxNext) => {
  try {
    await vtecxnext.uid()
  } catch (e) {
    //console.log(`[apiutil checkLogin] Error occured. ${e}`)
    throw e
  }
}

/**
 * ログインユーザの参加グループを取得.
 * @param vtecxnext VtecxNext
 * @returns グループ一覧
 */
export const getGroups = async (vtecxnext: VtecxNext) => {
  return vtecxnext.getGroups()
}

/**
 * グループ管理者かどうかのチェック
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 * @param isStrict サービス管理者、ユーザ管理者、内閣府管理者もグループ管理者でなければ不可。
 */
export const checkGroupadmin = async (
  vtecxnext: VtecxNext,
  local_government_code: string,
  isStrict?: boolean
) => {
  //console.log(`[apiutil checkGroupadmin] start.`)
  try {
    const groups = await getGroups(vtecxnext)
    //console.log(`[apiutil checkGroupadmin] groups = ${JSON.stringify(groups)}`)
    const groupadminGroup = getGroupadminGroup(local_government_code)
    let isGroupadmin = false
    if (groups) {
      for (const group of groups) {
        if (group === groupadminGroup) {
          isGroupadmin = true
          break
        }
        // サービス管理者、ユーザ管理者、内閣府管理者はチェックを抜ける
        if (
          !isStrict &&
          (group === URI_GROUP_ADMIN ||
            group === URI_GROUP_USERADMIN ||
            group === URI_GROUPADMIN_CAO)
        ) {
          isGroupadmin = true
          break
        }
      }
    }
    if (!isGroupadmin) {
      throw new VtecxNextError(403, `Access denied.`)
    }
  } catch (e) {
    if (isVtecxNextError(e)) {
      console.log(
        `[apiutil checkGroupadmin] Error occured. status=${e.status} ${e.name}: ${e.message}`
      )
    } else if (util.isError(e)) {
      console.log(`[apiutil checkGroupadmin] Error occured. ${e.name}: ${e.message}`)
    } else {
      console.log(`[apiutil checkGroupadmin] Error occured. ${e}`)
    }
    throw e
  }
}

/**
 * 内閣府グループかどうかのチェック
 * @param vtecxnext VtecxNext
 * @param isUseradmin ユーザ管理者を許可する
 */
export const checkGroupCao = async (vtecxnext: VtecxNext, isUseradmin?: boolean) => {
  //console.log(`[apiutil checkGroupCao] start.`)
  try {
    const groups = await getGroups(vtecxnext)
    //console.log(`[apiutil checkGroupCao] groups = ${JSON.stringify(groups)}`)
    const groupCao = `${URI_GROUP_SLASH}${CAO_CODE}`
    let isGroupCao = false
    if (groups) {
      for (const group of groups) {
        if (group === groupCao) {
          isGroupCao = true
          break
        }
        // サービス管理者、内閣府管理者はチェックを抜ける
        if (group === URI_GROUP_ADMIN || group === URI_GROUPADMIN_CAO) {
          isGroupCao = true
          break
        }
        // ユーザ管理者も許可する場合
        if (isUseradmin && group === URI_GROUP_USERADMIN) {
          isGroupCao = true
          break
        }
      }
    }
    if (!isGroupCao) {
      throw new VtecxNextError(403, `Access denied.`)
    }
  } catch (e) {
    console.log(`[apiutil checkGroupCao] Error occured. ${e}`)
    throw e
  }
}

/**
 * 指定された自治体グループに参加しているかどうかのチェック
 * @param vtecxnext VtecxNext
 * @param local_government_code 自治体コード
 */
export const checkGroupLocalGovernment = async (
  vtecxnext: VtecxNext,
  local_government_code: string
) => {
  try {
    const groups = await getGroups(vtecxnext)
    //console.log(`[apiutil checkGroupLocalGovernment] groups = ${JSON.stringify(groups)}`)
    const groupLocalGovernment = `${URI_GROUP_SLASH}${local_government_code}`
    let isGroupLocalGovernment = false
    if (groups) {
      for (const group of groups) {
        if (group === groupLocalGovernment) {
          isGroupLocalGovernment = true
          break
        }
        // サービス管理者、ユーザ管理者、内閣府管理者はチェックを抜ける
        if (
          group === URI_GROUP_ADMIN ||
          group === URI_GROUP_USERADMIN ||
          group === URI_GROUPADMIN_CAO
        ) {
          isGroupLocalGovernment = true
          break
        }
      }
    }
    if (!isGroupLocalGovernment) {
      throw new VtecxNextError(403, `Access denied.`)
    }
  } catch (e) {
    console.log(`[apiutil checkGroupLocalGovernment] Error occured. ${e}`)
    throw e
  }
}

/**
 * 内閣府ユーザか、自治体管理者か、自治体活動者かどうかをチェック
 * @param vtecxnext VtecxNext
 * @param login_local_government_code ログイン者の自治体コード
 * @param isRecipient 被災自治体の場合true
 * @param ログイン属性(内閣府ユーザか、都道府県管理者かどうか)
 */
export const checkRole = async (
  vtecxnext: VtecxNext,
  login_local_government_code: string,
  isRecipient: boolean
): Promise<Role> => {
  const isCao = login_local_government_code === CAO_CODE
  const isLoginPrefecture = isPrefecture(login_local_government_code)
  let isAdmin = false
  // ACLチェック
  if (isCao) {
    // ログインユーザが内閣府ユーザかどうか
    try {
      await checkGroupCao(vtecxnext)
      isAdmin = true
    } catch (e) {
      throw e
    }
  } else {
    try {
      // ログインユーザの自治体の管理者かどうか
      await checkGroupadmin(vtecxnext, login_local_government_code)
      isAdmin = true
    } catch (e) {
      if (isVtecxNextError(e) && e.status === 403 && !isRecipient) {
        // ログインユーザの自治体の活動者かどうか
        await checkGroupLocalGovernment(vtecxnext, login_local_government_code)
      } else {
        throw e
      }
    }
  }
  return { isCao: isCao, isPrefecture: isLoginPrefecture, isAdmin: isAdmin }
}

/**
 * 指定された自治体のグループ管理グループを取得
 * @param local_government_code 自治体コード
 * @returns グループ管理グループ
 */
export const getGroupadminGroup = (local_government_code: string) => {
  return `${URI_GROUP_GROUPADMIN_PREFIX}${local_government_code}`
}

/**
 * グループ管理者グループより自治体コードを取得
 * グループ管理者でない場合、403エラーをスローする。
 * @param vtecxnext VtecxNext
 * @returns 自治体コード
 */
export const getLocalGovernmentCodeByGroupadmin = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    const groups = await getGroups(vtecxnext)
    //console.log(`[apiutil getLocalGovernmentCodeByGroupadmin] groups = ${JSON.stringify(groups)}`)
    let local_government_code
    if (groups) {
      for (const group of groups) {
        if (group.startsWith(URI_GROUP_GROUPADMIN_PREFIX)) {
          const tmp = group.substring(URI_GROUP_GROUPADMIN_PREFIX.length)
          // グループ名が自治体コードかどうか
          if (isLocalGovernmentCode(tmp)) {
            local_government_code = tmp
            break
          }
        }
      }
    }
    if (local_government_code) {
      return local_government_code
    }
    throw new VtecxNextError(403, `Access denied.`)
  } catch (e) {
    console.log(`[apiutil getLocalGovernmentCodeByGroupadmin] Error occured. ${e}`)
    throw e
  }
}

/**
 * グループより自治体コードを取得
 * グループ参加者でない場合、403エラーをスローする。
 * @param vtecxnext VtecxNext
 * @returns 自治体コード
 */
export const getLocalGovernmentCodeByGroup = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    const groups = await getGroups(vtecxnext)
    //console.log(`[apiutil getLocalGovernmentCodeByGroup] groups = ${JSON.stringify(groups)}`)
    if (groups) {
      for (const group of groups) {
        if (group.startsWith(URI_GROUP_SLASH)) {
          const groupName = group.substring(URI_GROUP_SLASH.length)
          //console.log(`[apiutil getLocalGovernmentCodeByGroup] groupName = ${groupName}`)
          // グループ名が自治体コードかどうか
          if (isLocalGovernmentCode(groupName)) {
            return groupName
          }
        }
      }
    }
    console.log(`[apiutil getLocalGovernmentCodeByGroup] no local government group`)
    throw new VtecxNextError(403, `Access denied.`)
  } catch (e) {
    console.log(`[apiutil getLocalGovernmentCodeByGroup] Error occured. ${e}`)
    throw e
  }
}

/**
 * 休憩時間チェック
 * ・0か正の数値であること
 * ・勤務時間を超えないこと
 * @param breaktime 休憩時間
 * @param date_of_activity 活動月日
 * @param starttime_of_work 勤務時間開始
 * @param endtime_of_work 勤務時間終了
 */
export const isBreaktime = (
  breaktime: string,
  date_of_activity: string,
  starttime_of_work: string,
  endtime_of_work: string
) => {
  // 0はOK
  if (breaktime === '0') {
    return true
  }
  // 負数はNG
  if (!util.isPositiveNumber(breaktime)) {
    return false
  }
  // 勤務時間を超えないこと
  const worktime = dayjs(
    `${date_of_activity}${endtime_of_work}`,
    `${FORMAT_DATE}${FORMAT_HOUR_MIN}`
  ).diff(
    dayjs(`${date_of_activity}${starttime_of_work}`, `${FORMAT_DATE}${FORMAT_HOUR_MIN}`),
    'minute'
  )
  console.log(`[apiutil isBreaktime] worktime = ${String(worktime)}`)
  return worktime > util.toNumber(breaktime)
}

/**
 * 活動区分チェック
 * 1:避難所の設置・運営、2:支援物資の荷捌き・搬送、3:飲料水の供給、4:医療、9:その他
 * 4:医療は医療従事者のみ指定可
 * 5:福祉サービスは福祉チームのみ指定可
 * @param job_description 活動区分
 * @param occupation_type 所属分類
 */
export const isJobDescription = (job_description: string, occupation_type?: string) => {
  if (
    job_description === JOB_DESCRIPTION_SHELTER ||
    job_description === JOB_DESCRIPTION_SUPPLIES ||
    job_description === JOB_DESCRIPTION_WATER ||
    job_description === JOB_DESCRIPTION_OTHER
  ) {
    return true
  }
  if (
    !occupation_type ||
    occupation_type === OCCUPATION_TYPE_HOSPITAL_PUBLIC ||
    occupation_type === OCCUPATION_TYPE_HOSPITAL_OTHER
  ) {
    if (job_description === JOB_DESCRIPTION_MEDICALCARE) {
      return true
    }
  }
  if (
    !occupation_type ||
    occupation_type === OCCUPATION_TYPE_WELFARE_PUBLIC ||
    occupation_type === OCCUPATION_TYPE_WELFARE_OTHER
  ) {
    if (job_description === JOB_DESCRIPTION_WELFARE) {
      return true
    }
  }
  return false
}

/**
 * 費用種類が正しいかチェック
 * 91:医薬品，治療材料、92:医療機器の修繕費 は救護班のみ指定可
 * 71:消耗機材費、72:建物の使用謝金、73:器物の使用謝金、借上費、購入費、74:光熱水費、75:仮設便所等の設置費 は福祉チームのみ指定可
 * 災害派遣チーム(DMAT,DWAT)は01,10,11,12しか選択できない
 * @param item_class 費用種類
 * @param occupation_type 所属分類
 * @param assistance_team 災害派遣チーム
 * @returns 費用種類が正しい場合true
 */
export const isItemClass = (
  item_class: string,
  occupation_type?: string,
  assistance_team?: string
): boolean => {
  if (assistance_team === ASSISTANCE_TEAM_DMAT || assistance_team === ASSISTANCE_TEAM_DWAT) {
    // 災害派遣チーム(DMAT,DWAT)は01:旅費、10:職員手当(時間外勤務手当)、11:賃金、12:宿泊費しか選択できない
    if (
      item_class === ITEM_CLASS_TRAVEL_EXPENSE ||
      item_class === ITEM_CLASS_SERVICE_ALLOWANCE ||
      item_class === ITEM_CLASS_WAGE ||
      item_class === ITEM_CLASS_ACCOMMODATION_EXPENSE
    ) {
      return true
    }
  } else {
    // 災害派遣チームでない活動者
    if (
      item_class === ITEM_CLASS_TRAVEL_EXPENSE ||
      item_class === ITEM_CLASS_SUPPLIES_EXPENSE ||
      item_class === ITEM_CLASS_FUEL_EXPENSE ||
      item_class === ITEM_CLASS_PRINTING_EXPENSE ||
      item_class === ITEM_CLASS_UTILITY_EXPENSE ||
      item_class === ITEM_CLASS_REPAIR_EXPENSE ||
      item_class === ITEM_CLASS_FOOD_EXPENSE ||
      item_class === ITEM_CLASS_COMMUNICATION_EXPENSE ||
      item_class === ITEM_CLASS_RENTAL_EXPENSE ||
      item_class === ITEM_CLASS_SERVICE_ALLOWANCE ||
      item_class === ITEM_CLASS_WAGE
    ) {
      return true
    }
    // 91、92は救護班(病院)しか選択できない
    if (
      !occupation_type ||
      occupation_type === OCCUPATION_TYPE_HOSPITAL_PUBLIC ||
      occupation_type === OCCUPATION_TYPE_HOSPITAL_OTHER
    ) {
      if (
        item_class === ITEM_CLASS_MEDICAL_SUPPLY ||
        item_class === ITEM_CLASS_MEDICAL_EQUIPMENT_REPAIR_COST ||
        item_class === ITEM_CLASS_ACCOMMODATION_EXPENSE
      ) {
        return true
      }
    }
    // 71〜75は福祉チームしか選択できない
    if (
      !occupation_type ||
      occupation_type === OCCUPATION_TYPE_WELFARE_PUBLIC ||
      occupation_type === OCCUPATION_TYPE_WELFARE_OTHER
    ) {
      if (
        item_class === ITEM_CLASS_WELFARE_CONSUMABLES ||
        item_class === ITEM_CLASS_WELFARE_BUILDING_USE_FEE ||
        item_class === ITEM_CLASS_WELFARE_EQUIPMENT_USE_FEE ||
        item_class === ITEM_CLASS_WELFARE_UTILITY_EXPENSE ||
        item_class === ITEM_CLASS_WELFARE_INSTALLATION_EXPENSE ||
        item_class === ITEM_CLASS_ACCOMMODATION_EXPENSE
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * 品目コード形式が正しいかチェック
 * データの正否は判定しない。
 * @param item_purchased 品目コード
 * @returns 品目コード形式が正しい場合true
 */
export const isItemPurchasedFormat = (item_purchased: string): boolean => {
  // 6桁でなければエラー
  if (item_purchased.length !== 2 + ITEM_CODE_LEN) {
    return false
  }
  // 先頭2桁の費用種類チェック
  return isItemClass(item_purchased.substring(0, 2))
}

/**
 * 画面表示用日報コードを取得
 *   `{応援自治体コード(市区町村)}-{被災自治体コード上2桁}-{日報コード}`
 * @param local_government_code 応援自治体コード(市区町村)
 * @param local_government_recipient 被災自治体コード
 * @param activity_code 日報コード
 */
export const getActivityId = (
  local_government_code: string,
  local_government_recipient: string,
  activity_code: string
) => {
  return `${local_government_code}-${getPrefecture2digits(local_government_recipient)}-${activity_code}`
}

/**
 * 自治体コード先頭2桁から、都道府県の自治体コードを生成
 * @param prefecture2digits 自治体コード先頭2桁
 * @returns 都道府県の自治体コード
 */
export const getPrefectureCodeBy2digits = (prefecture2digits: string) => {
  // 引数が2桁の数値かどうか
  if (prefecture2digits.length !== 2) {
    throw new VtecxNextError(400, `invalid prefecture 2 digits. ${prefecture2digits}`)
  }
  if (!isNumberChars(prefecture2digits)) {
    throw new VtecxNextError(400, `invalid prefecture 2 digits. ${prefecture2digits}`)
  }
  return culcPrefectureCode(prefecture2digits)
}

/**
 * 被災都道府県かどうか判定
 * @param vtecxnext VtecxNext
 * @param disaster_code 災害コード
 * @param local_government_code 自治体コード
 * @returns 被災都道府県の場合true
 */
export const isRecipientPrefecture = async (
  vtecxnext: VtecxNext,
  disaster_code: string,
  local_government_code: string
): Promise<boolean> => {
  try {
    // /disaster/{災害コード}/recipient/{自治体コード}
    const result = await getRecipientMasterList(vtecxnext, disaster_code, local_government_code)
    console.log(`[apiutil isRecipient] result = ${JSON.stringify(result)}`)
    if (result && Array.isArray(result) && result.length > 0) {
      return true
    }
    return false
  } catch (e) {
    console.log(`[apiutil isRecipientPrefecture] Error occured. ${e}`)
    throw e
  }
}

/**
 * IDチェック
 * 形式チェック、キーとの整合性
 * @param id ID
 * @param uri キー(IDキーとの一致チェックを行う場合指定)
 */
export const checkId = (id: string, uri?: string): void => {
  if (!util.isIdFormat(id)) {
    throw new VtecxNextError(400, `invalid id format. ${id}`)
  }
  if (uri) {
    const idx = id.indexOf(',')
    if (uri !== id.substring(0, idx)) {
      console.log(`[api user delete] key and id are inconsistent. key=${uri} id=${id}`)
      throw new VtecxNextError(400, `key and id are inconsistent. key=${uri} id=${id}`)
    }
  }
}

/**
 * 現在日時をYYYYMMDDHHmmss形式で返却
 * @returns YYYYMMDDHHmmss形式の現在日時
 */
export const getNowStr = (): string => {
  const now = new Date()
  return dayjs(now).tz('Asia/Tokyo').format(`YYYYMMDDHHmmss`)
}

/**
 * 日報データのキーを取得
 * /report/{災害コード}/activity/{応援自治体コード}/{UID}/{日報コード}-{連番}
 * @param disaster_code 災害コード
 * @param local_government_code 自治体コード
 * @param uid UID
 * @param activity_code 日報コード
 * @param activity_code_seq 日報コード連番
 */
export const getActivityKeyUri = (
  disaster_code: string,
  local_government_code?: string,
  uid?: string,
  activity_code?: string,
  activity_code_seq?: string
) => {
  return base.getActivityKeyUri(
    disaster_code,
    local_government_code,
    uid,
    activity_code,
    activity_code_seq
  )
}

/**
 * 支出データのキーを取得
 * /report/{災害コード}/expense/{応援自治体コード}/{UID}/{支出コード}
 * @param disaster_code 災害コード
 * @param local_government_code 自治体コード
 * @param uid UID
 * @param expense_code 支出コード
 */
export const getExpenseKeyUri = (
  disaster_code: string,
  local_government_code?: string,
  uid?: string,
  expense_code?: string
) => {
  return base.getExpenseKeyUri(disaster_code, local_government_code, uid, expense_code)
}

/**
 * 応援市区町村・都道府県報告のキーを取得
 * @param disaster_code 災害コード
 * @param prefecture 応援都道府県コード
 * @param local_government_code 応援市区町村コード
 * @returns 応援市区町村・都道府県報告のキー
 */
export const getReportStatusUri = (
  disaster_code: string,
  prefecture?: string,
  local_government_code?: string
) => {
  return base.getReportStatusUri(disaster_code, prefecture, local_government_code)
}

/**
 * 被災都道府県報告のキーまたは、応援都道府県のエイリアスを取得
 * /report/{災害コード}/status_recipient/{被災都道府県コード}/{応援都道府県コード}
 * @param disaster_code 災害コード
 * @param recipientPrefecture 被災都道府県コード
 * @param prefecture 応援都道府県コード
 * @returns 被災都道府県報告のキーまたは、応援都道府県のエイリアス
 */
export const getReportStatusRecipientUri = (
  disaster_code: string,
  recipientPrefecture?: string,
  prefecture?: string
) => {
  return base.getReportStatusRecipientUri(disaster_code, recipientPrefecture, prefecture)
}

/**
 * 自治体マスタのキーを取得
 * @param local_government_code 自治体コード
 * @returns 自治体マスタのキー
 */
export const getLocalGovernmentUri = (local_government_code: string) => {
  return base.getLocalGovernmentUri(local_government_code)
}

/**
 * ユーザマスタのキーを取得
 * /local_government/{自治体コード}/user/{UID}
 * @param local_government_code 自治体コード
 * @param uid UID
 * @returns ユーザマスタのキー
 */
export const getUserUri = (local_government_code?: string, uid?: string) => {
  return base.getUserUri(local_government_code, uid)
}

/**
 * 所属マスタのキーを取得
 * /local_government/{自治体コード}/occupation/{所属コード}
 * @param local_government_code 自治体コード
 * @param occupation_code 所属コード
 * @returns 所属マスタのキー
 */
export const getOccupationUri = (local_government_code?: string, occupation_code?: string) => {
  return base.getOccupationUri(local_government_code, occupation_code)
}

/**
 * 役職・職種マスタのキーを取得
 * /local_government/{自治体コード}/position/{役職コード}
 * @param local_government_code 自治体コード
 * @param position_code 役職・職種コード
 * @returns 役職・職種マスタのキー
 */
export const getPositionUri = (local_government_code?: string, position_code?: string) => {
  return base.getPositionUri(local_government_code, position_code)
}

/**
 * 被災自治体マスタのキーを取得
 * /disaster/{災害コード}/recipient/{自治体コード}
 * @param disaster_code
 * @param local_government_code
 */
export const getRecipientUri = (disaster_code: string, local_government_code?: string): string => {
  return base.getRecipientUri(disaster_code, local_government_code)
}

/**
 * 日報修正依頼データのキーを取得.
 * /report/{災害コード}/activity_modification/{応援自治体コード}/{日報コード}-{連番}/{連番}
 * @param disaster_code 災害コード
 * @param local_government_code 応援自治体コード
 * @param activity_code 日報コード
 * @param activity_code_seq 日報コード連番
 * @param modification_seq 修正依頼連番
 */
export const getActivityModificationUri = (
  disaster_code: string,
  local_government_code: string,
  activity_code?: string,
  activity_code_seq?: string,
  modification_seq?: string
): string => {
  return base.getActivityModificationUri(
    disaster_code,
    local_government_code,
    activity_code,
    activity_code_seq,
    modification_seq
  )
}

/**
 * 支出修正依頼データのキーを取得.
 * /report/{災害コード}/expense_modification/{応援自治体コード}/{支出コード}/{連番}
 * @param disaster_code 災害コード
 * @param local_government_code 応援自治体コード
 * @param expense_code 支出コード
 * @param modification_seq 修正依頼連番
 */
export const getExpenseModificationUri = (
  disaster_code: string,
  local_government_code: string,
  expense_code?: string,
  modification_seq?: string
): string => {
  return base.getExpenseModificationUri(
    disaster_code,
    local_government_code,
    expense_code,
    modification_seq
  )
}

/**
 * 自治体更新予約のキーを取得
 * /local_government_update_schedule/{施行年月日(YYYYMMDD)}-{新設・既存自治体コード}-{自治体更新区分}
 * @param date_of_enforcement 施行年月日(YYYYMMDD)
 * @param update_local_government_code 新設・既存自治体コード
 * @param update_type 自治体更新区分
 */
export const getUpdateLocalGovernmentUri = (
  date_of_enforcement: string,
  update_local_government_code: string,
  update_type: number
): string => {
  return base.getUpdateLocalGovernmentUri(
    date_of_enforcement,
    update_local_government_code,
    update_type
  )
}

/**
 * 初期アカウント情報のキーを取得
 * /initaccount/{自治体コード}
 * @param local_government_code 自治体コード
 */
export const getInitaccountUri = (local_government_code?: string): string => {
  return base.getInitaccountUri(local_government_code)
}

/**
 * 西暦YYYYMMDD形式の日付を和暦(RYY.MM.DD)形式に変換する
 * @param dateStr YYYYMMDD形式の日付
 * @returns RYY.MM.DD形式の日付
 */
export const convertToWareki = (dateStr: string): string => {
  if (!/^\d{8}$/.test(dateStr)) {
    throw new VtecxNextError(400, 'Invalid date format. Expected YYYYMMDD.')
  }

  const year = parseInt(dateStr.slice(0, 4), 10)
  const month = parseInt(dateStr.slice(4, 6), 10)
  const day = parseInt(dateStr.slice(6, 8), 10)
  const date = new Date(year, month - 1, day)

  // 和暦で表示（例：令和6年4月15日）
  const formatter = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const formatted = formatter.format(date) // 例: "令和6年04月15日"

  // "令和6年04月15日" → "R06.04.15" に変換
  const eraMap: Record<string, string> = {
    令和: 'R',
    平成: 'H',
    昭和: 'S',
    大正: 'T',
    明治: 'M'
  }

  let match = formatted.match(/(明治|大正|昭和|平成|令和)(\d+)\/(\d{2})\/(\d{2})/)
  if (!match) {
    match = formatted.match(/(明治|大正|昭和|平成|令和)(\d+)年(\d{2})月(\d{2})日/)
    if (!match) {
      throw new Error('Failed to parse formatted Japanese era date.')
    }
  }

  const [, eraName, eraYear, mm, dd] = match
  const shortEra = eraMap[eraName]

  return `${shortEra}${eraYear}.${mm}.${dd}`
}

/**
 * 分単位の値を、{時間}:{分(2桁0埋め)}に変換する。
 * @param minutes 分
 */
export const convertMinutesToHHMM = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const paddedMinutes = String(mins).padStart(2, '0')
  return `${String(hours)}:${paddedMinutes}`
}

/**
 * メール本文のテンプレートにユーザの値をセットする
 * @param local_government_code 自治体コード
 * @param user_name アカウント
 * @param pswd パスワード
 * @param authority 権限
 * @param text メール本文
 * @returns 編集したメール本文
 */
export const editMailText = (user_name: string, pswd: string, text: string) => {
  let url: string = util.toString(process.env.NEXT_PUBLIC_VTECXNEXT_URL)

  url += LOGIN_STAFF

  let tmpText = editMailTextVtecxnextUrl(text)
  tmpText = tmpText.replaceAll(MAIL_REPLACE_ACCOUNT, user_name)
  tmpText = tmpText.replaceAll(MAIL_REPLACE_PASSWORD, pswd)
  tmpText = tmpText.replaceAll(MAIL_REPLACE_LOGIN_URL, url)
  return tmpText
}

/**
 * メール本文のテンプレートに VTECXNEXT_URL の値をセットする
 * @param text メール本文
 * @returns 編集したメール本文
 */
export const editMailTextVtecxnextUrl = (text: string) => {
  const url: string = util.toString(process.env.NEXT_PUBLIC_VTECXNEXT_URL)
  return text.replaceAll(MAIL_REPLACE_VTECXNEXT_URL, url)
}

/**
 * 請求書コード採番
 * @param vtecxnext VtecxNext
 * @returns 請求書コード
 */
export const numberingInvoiceCode = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    const invoice_code = await allocids(vtecxnext, URI_INVOICE)
    return `${INVOICE_CODE_PREFIX}${invoice_code.padStart(INVOICE_CODE_LEN, '0')}`
  } catch (e) {
    console.log(`[apiutil numberingInvoiceCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 見積書コード採番
 * @param vtecxnext VtecxNext
 * @returns 見積書コード
 */
export const numberingQuotationCode = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    const { URI_QUOTATION, QUOTATION_CODE_PREFIX, QUOTATION_CODE_LEN } =
      await import('@/utils/apiconst')
    const quotation_code = await allocids(vtecxnext, URI_QUOTATION)
    return `${QUOTATION_CODE_PREFIX}${quotation_code.padStart(QUOTATION_CODE_LEN, '0')}`
  } catch (e) {
    console.log(`[apiutil numberingQuotationCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 注文書コード採番
 */
export const numberingPurchaseOrderCode = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    const { URI_PURCHASE_ORDER, PURCHASE_ORDER_CODE_PREFIX, PURCHASE_ORDER_CODE_LEN } =
      await import('@/utils/apiconst')
    const code = await allocids(vtecxnext, URI_PURCHASE_ORDER)
    return `${PURCHASE_ORDER_CODE_PREFIX}${code.padStart(PURCHASE_ORDER_CODE_LEN, '0')}`
  } catch (e) {
    console.log(`[apiutil numberingPurchaseOrderCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * 顧客コード採番
 */
export const numberingCustomerCode = async (vtecxnext: VtecxNext): Promise<string> => {
  try {
    const { URI_CUSTOMER, CUSTOMER_CODE_PREFIX, CUSTOMER_CODE_LEN } =
      await import('@/utils/apiconst')
    const code = await allocids(vtecxnext, URI_CUSTOMER)
    return `${CUSTOMER_CODE_PREFIX}${code.padStart(CUSTOMER_CODE_LEN, '0')}`
  } catch (e) {
    console.log(`[apiutil numberingCustomerCode] Error occured. ${e}`)
    throw e
  }
}

/**
 * UID から company_code を取得する
 * /_user/{uid} の company.company_code を返す
 * @param vtecxnext VtecxNext
 * @param uid 数値UID
 * @returns company_code（未設定の場合は uid をそのまま返す）
 */
export const getCompanyCode = async (vtecxnext: VtecxNext, uid: string): Promise<string | null> => {
  try {
    const entry = await vtecxnext.getEntry(`/_user/${uid}`).catch(() => null)
    return entry?.company?.company_code ?? null
  } catch {
    return null
  }
}

/**
 * リクエストから使用する company_id を解決する（複数グループ対応）
 *
 * 解決順序:
 * 1. 管理者 + owner_id 指定 → owner_id ユーザのグループから解決（company_id 指定があればそのまま使用）
 * 2. company_id 指定あり → /_user/{uid}/groups/{company_id} の存在確認でアクセス権を検証
 * 3. company_id 指定なし → /_user/{uid}/groups/ の先頭エントリを使用
 * 4. フォールバック → getCompanyCode（後方互換）
 *
 * @param vtecxnext VtecxNext
 * @param uid 現在のユーザUID
 * @param isAdmin 管理者フラグ
 * @param companyIdParam リクエストの company_id パラメータ
 * @param ownerUidParam リクエストの owner_id パラメータ（管理者用）
 * @returns 解決された company_id（アクセス不可・未所属の場合は null）
 */
export const resolveCompanyId = async (
  vtecxnext: VtecxNext,
  uid: string,
  isAdmin: boolean,
  companyIdParam: string | null,
  ownerUidParam: string | null
): Promise<string | null> => {
  // 管理者が owner_id を指定している場合はそのユーザのグループから解決
  if (isAdmin && ownerUidParam) {
    if (companyIdParam) return companyIdParam
    // ownerUidParam が会社ID形式（英字始まり）の場合はそのまま返す
    if (/^[A-Za-z]/.test(ownerUidParam)) return ownerUidParam
    const targetUid = ownerUidParam
    const feed: any = await vtecxnext.getFeed(`/_user/${targetUid}/group/`).catch(() => null)
    const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
    if (entries.length > 0) {
      return entries[0]?.company_group?.company_id ?? null
    }
    return getCompanyCode(vtecxnext, targetUid)
  }

  if (companyIdParam) {
    // 管理者は company_id をそのまま返す
    if (isAdmin) return companyIdParam
    // アクセス権を確認: /_user/{uid}/group/{company_id} エントリが存在するか
    const membership = await vtecxnext.getEntry(`/_user/${uid}/group/${companyIdParam}`).catch(() => null)
    if (membership) return companyIdParam
    // フォールバック: ユーザエントリの company_group を確認（既存ユーザ対応）
    const userEntry = await vtecxnext.getEntry(`/_user/${uid}`).catch(() => null)
    if (userEntry?.company_group?.company_id === companyIdParam) return companyIdParam
    return null
  }

  // company_id 未指定 → /_user/{uid}/group/ の先頭を使用
  const feed: any = await vtecxnext.getFeed(`/_user/${uid}/group/`).catch(() => null)
  const entries: any[] = feed?.feed?.entry ?? (Array.isArray(feed) ? feed : [])
  if (entries.length > 0) {
    return entries[0]?.company_group?.company_id ?? null
  }

  // フォールバック: ユーザエントリの company_group を確認（既存ユーザ対応）
  const userEntry = await vtecxnext.getEntry(`/_user/${uid}`).catch(() => null)
  if (userEntry?.company_group?.company_id) return userEntry.company_group.company_id

  // 後方互換: company.company_code を使用
  return getCompanyCode(vtecxnext, uid)
}
