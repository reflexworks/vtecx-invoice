import {
  URI_LOCAL_GOVERNMENT,
  URI_DISASTER,
  URI_RECIPIENT,
  URI_OCCUPATION,
  URI_POSITION,
  URI_GROUP,
  URI_USER,
  URI_REPORT,
  URI_ACTIVITY,
  URI_EXPENSE,
  URI_ACTIVITY_MODIFICATION,
  URI_EXPENSE_MODIFICATION,
  URI_STATUS_LOCAL_GOVERNMENT,
  URI_STATUS_RECIPIENT,
  URI_LOCAL_GOVERNMENT_UPDATE_SCHEDULE,
  URI_INITACCOUNT
} from './apiconst'
import * as util from './commonutil'

/** 半角数字 (0始まりもOK) */
//const REGEX_NUMBER = /^[0-9]+$/ //正規表現、終始半角数字で1文字以上の文字列を示す
const REGEX_NUMBER = /^\d+$/ //正規表現、終始半角数字で1文字以上の文字列を示す
/** 電話番号 */
const REGEX_PHONE_NUMBERS = /^0\d{9,10}$/

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
  let uri = `${URI_REPORT}/${disaster_code}${URI_ACTIVITY}`
  if (local_government_code) {
    uri += `/${local_government_code}`
    if (uid) {
      uri += `/${uid}`
      if (activity_code) {
        uri += `/${activity_code}-`
        if (activity_code_seq) {
          uri += activity_code_seq
        }
      }
    }
  }
  return uri
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
  let uri = `${URI_REPORT}/${disaster_code}${URI_EXPENSE}`
  if (local_government_code) {
    uri += `/${local_government_code}`
    if (uid) {
      uri += `/${uid}`
      if (expense_code) {
        uri += `/${expense_code}`
      }
    }
  }
  return uri
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
  let uri = `${URI_REPORT}/${disaster_code}${URI_STATUS_LOCAL_GOVERNMENT}`
  if (prefecture) {
    uri += `/${prefecture}`
    if (local_government_code) {
      uri += `/${local_government_code}`
    }
  }
  return uri
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
  let uri = `${URI_REPORT}/${disaster_code}${URI_STATUS_RECIPIENT}`
  if (recipientPrefecture) {
    uri += `/${recipientPrefecture}`
    if (prefecture) {
      uri += `/${prefecture}`
    }
  }
  return uri
}

/**
 * 自治体マスタのキーを取得
 * @param local_government_code 自治体コード
 * @returns 自治体マスタのキー
 */
export const getLocalGovernmentUri = (local_government_code: string) => {
  return `${URI_LOCAL_GOVERNMENT}/${local_government_code}`
}

/**
 * ユーザマスタのキーを取得
 * /local_government/{自治体コード}/user/{UID}
 * @param local_government_code 自治体コード
 * @param uid UID
 * @returns ユーザマスタのキー
 */
export const getUserUri = (local_government_code?: string, uid?: string) => {
  let uri = `${URI_LOCAL_GOVERNMENT}`
  if (local_government_code) {
    uri += `/${local_government_code}${URI_USER}`
    if (uid) {
      uri += `/${uid}`
    }
  }
  return uri
}

/**
 * 所属マスタのキーを取得
 * /local_government/{自治体コード}/occupation/{所属コード}
 * @param local_government_code 自治体コード
 * @param occupation_code 所属コード
 * @returns 所属マスタのキー
 */
export const getOccupationUri = (local_government_code?: string, occupation_code?: string) => {
  let uri = `${URI_LOCAL_GOVERNMENT}`
  if (local_government_code) {
    uri += `/${local_government_code}${URI_OCCUPATION}`
    if (occupation_code) {
      uri += `/${occupation_code}`
    }
  }
  return uri
}

/**
 * 役職・職種マスタのキーを取得
 * /local_government/{自治体コード}/position/{役職コード}
 * @param local_government_code 自治体コード
 * @param position_code 役職・職種コード
 * @returns 役職・職種マスタのキー
 */
export const getPositionUri = (local_government_code?: string, position_code?: string) => {
  let uri = `${URI_LOCAL_GOVERNMENT}`
  if (local_government_code) {
    uri += `/${local_government_code}${URI_POSITION}`
    if (position_code) {
      uri += `/${position_code}`
    }
  }
  return uri
}

/**
 * 被災自治体マスタのキーを取得
 * /disaster/{災害コード}/recipient/{自治体コード}
 * @param disaster_code 災害コード
 * @param local_government_code 自治体コード
 */
export const getRecipientUri = (disaster_code: string, local_government_code?: string): string => {
  let uri = `${URI_DISASTER}/${disaster_code}${URI_RECIPIENT}`
  if (local_government_code) {
    uri += `/${local_government_code}`
  }
  return uri
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
  let uri: string = `${URI_REPORT}/${disaster_code}${URI_ACTIVITY_MODIFICATION}/${local_government_code}`
  if (activity_code) {
    uri += `/${activity_code}-`
    if (activity_code_seq) {
      uri += `${activity_code_seq}`
      if (modification_seq) {
        uri += `/${modification_seq}`
      }
    }
  }
  return uri
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
  let uri: string = `${URI_REPORT}/${disaster_code}${URI_EXPENSE_MODIFICATION}/${local_government_code}`
  if (expense_code) {
    uri += `/${expense_code}`
    if (modification_seq) {
      uri += `/${modification_seq}`
    }
  }
  return uri
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
  return `${URI_LOCAL_GOVERNMENT_UPDATE_SCHEDULE}/${date_of_enforcement}-${update_local_government_code}-${String(update_type)}`
}

/**
 * 初期アカウント情報のキーを取得
 * /initaccount/{自治体コード}
 * @param local_government_code 自治体コード
 */
export const getInitaccountUri = (local_government_code?: string): string => {
  let uri = URI_INITACCOUNT
  if (local_government_code) {
    uri += `/${local_government_code}`
  }
  return uri
}

/**
 * グループ管理者のグループキーを取得.
 * @param local_government_code 自治体コード
 */
export const getAdmingroup = (local_government_code: string): string => {
  return `${URI_GROUP}/$groupadmin_${local_government_code}`
}

/**
 * yyyyMMdd形式かどうかチェック
 * @param datestr 日付形式文字列
 * @return true:yyyyMMdd形式、false:形式エラー
 */
export const isDate = (datestr: string): boolean => {
  if (datestr && datestr.length === 8) {
    const yyyy = datestr.substring(0, 4)
    const mm = datestr.substring(4, 6)
    const dd = datestr.substring(6)
    const editDateStr = `${yyyy}-${mm}-${dd}`
    const time = Date.parse(editDateStr)
    //console.log(`[apiutil isDate] editDateStr = ${editDateStr}`)
    if (isNaN(time)) {
      return false // 日付形式エラー
    }
    // 上記のチェックだと31日がない月でもtrueが返るので、さらに妥当性チェック
    const formattedDate = getFormattedDate(new Date(time))
    //console.log(`[apiutil isDate] formattedDate = ${formattedDate}`)
    return editDateStr === formattedDate
  }
  return false
}

/**
 * Date型オブジェクトを yyyy-MM-dd 文字列に変換する。
 * @param date Date型オブジェクト
 * @returns yyyy-MM-dd文字列
 */
const getFormattedDate = (date: Date) => {
  return date.toISOString().split('T')[0]
}

/**
 * HHmm形式かどうかチェック
 * @param datestr 日付形式文字列
 * @return true:HHmm形式、false:形式エラー
 */
export const isTime = (datestr: string): boolean => {
  if (!datestr) {
    return false
  }
  const regexp = new RegExp(/^([01][0-9]|2[0-3])([0-5][0-9])$/)
  return regexp.test(datestr)
}

/**
 * 文字列が数字のみで構成されているかどうか
 * @param val 文字列
 * @returns 文字列が数字のみで構成されている場合true
 */
export const isNumberChars = (val: string): boolean => {
  return REGEX_NUMBER.test(val)
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
  if (!local_government_code || local_government_code.length !== 6) {
    return false
  }
  if (!isNumberChars(local_government_code)) {
    return false
  }
  const code12 = local_government_code.substring(0, 2)
  let numCode12: number
  if (code12.startsWith('0')) {
    numCode12 = Number(code12.substring(1))
  } else {
    numCode12 = Number(code12)
  }
  if (numCode12 < 1 || numCode12 > 47) {
    return false
  }
  const code6 = local_government_code.substring(5)
  if (code6 !== String(getCheckDigit(local_government_code))) {
    //console.log(`[apiutil isLocalGovernmentCode] ng5 code6=${code6}`)
    return false
  }
  return true
}

/**
 * 自治体コードが正しい都道府県コードかどうかチェック
 * @param local_government_code 自治体コード
 * @returns 都道府県コードの場合true、違う場合false
 */
export const isPrefecture = (local_government_code: string): boolean => {
  if (!isLocalGovernmentCode(local_government_code)) {
    return false
  }
  const code345 = local_government_code.substring(2, 5)
  if (code345 !== '000') {
    return false
  }
  return true
}

/**
 * 自治体コードのチェックディジット値を返す
 * @param local_government_code 自治体コード
 * @returns チェックディジット値
 */
const getCheckDigit = (local_government_code: string): number => {
  const multiplyAdd =
    util.toNumber(local_government_code.substring(0, 1)) * 6 +
    util.toNumber(local_government_code.substring(1, 2)) * 5 +
    util.toNumber(local_government_code.substring(2, 3)) * 4 +
    util.toNumber(local_government_code.substring(3, 4)) * 3 +
    util.toNumber(local_government_code.substring(4, 5)) * 2
  let digit: number
  if (multiplyAdd === 0) {
    digit = 0
  } else if (multiplyAdd < 11) {
    digit = 11 - multiplyAdd
  } else {
    // 11で割った余りを求める
    const remainder = multiplyAdd % 11
    // 11と余り数字との差の下1桁の数字を検査数字とする。
    digit = 11 - remainder
    while (digit >= 10) {
      digit = digit - 10
    }
  }
  //console.log(`[apiutil getCheckDigit] digit=${String(digit)}`)
  return digit
}

/**
 * 電話番号形式かどうかチェック
 * @param phone 電話番号
 * @returns 形式が正しければtrue
 */
export const checkPhone = (phone: string) => {
  //if (phone.indexOf('-') > -1) {
  //  return REGEX_PHONE_HYPHEN.test(phone)
  //} else {
  return REGEX_PHONE_NUMBERS.test(phone)
  //}
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
  //console.log(`[apiutil culcPrefectureCode] start. localGovernmentCode = ${localGovernmentCode}`)
  const tmpPrefecture5digits = `${getPrefecture2digits(local_government_code)}000`
  const digit = getCheckDigit(tmpPrefecture5digits)
  const prefectureCode = `${tmpPrefecture5digits}${util.toString(digit)}`
  //console.log(`[apiutil culcPrefectureCode] end. prefectureCode = ${prefectureCode}`)
  return prefectureCode
}

/**
 * 自治体コードから、都道府県をあらわす先頭2桁を取得
 * @param local_government_code 自治体コード
 */
export const getPrefecture2digits = (local_government_code: string) => {
  return local_government_code.substring(0, 2)
}

/**
 * ランダム文字列を生成.
 * @param length 文字列長
 * @returns ランダム文字列
 */
export const getRandomStr = (length: number) => {
  //return randomBytes(len).toString('base64').substring(0, len)
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?'

  const allChars = upper + lower + digits + symbols
  let password = ''

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * allChars.length)
    password += allChars[index]
  }

  return password
}
