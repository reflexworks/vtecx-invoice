import constant from '@/constants'
import VtecxApp from '@/typings'
import React from 'react'
import * as browserutil from '@/utils/browserutil'
import { getHashpass } from '@vtecx/vtecxauth'

/**
 * ログインユーザ自身のアカウント情報を取得
 */
export const getMyAccount = async () => {
  try {
    return await browserutil.requestApi('GET', 'account', 'me=1')
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * アカウント単体の取得
 * @param uid ユーザーID（メールアドレス）
 */
export const getAccountData = async (uid: string) => {
  try {
    return await browserutil.requestApi('GET', 'account', `uid=${encodeURIComponent(uid)}`)
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * アカウント登録
 * @param _entry 登録エントリ
 * @param reCaptchaToken reCAPTCHAトークン
 * @param password パスワード（平文）。指定した場合はハッシュ化して summary に格納しサーバーに渡す
 * @param group_action グループ操作 ('create' | 'join' | 'skip')
 * @param company_id グループに参加する場合の会社ID
 */
export const postAccount = async (
  _entry: any,
  reCaptchaToken: string,
  password?: string,
  group_action?: 'create' | 'join' | 'skip',
  company_id?: string
) => {
  const entry: any = { ..._entry }
  if (password) {
    entry.summary = getHashpass(password)
  }
  if (group_action) entry.group_action = group_action
  if (company_id) entry.company_id = company_id
  const param = reCaptchaToken ? `g-recaptcha-token=${reCaptchaToken}` : ''
  try {
    const res: VtecxApp.Entry[] = await browserutil.requestApi(
      'POST',
      `addcompany`,
      param,
      JSON.stringify([entry])
    )
    return res
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * 所属グループ一覧取得
 * @param uid 対象ユーザーUID（省略時は自分）
 */
export const getMyGroups = async (uid?: string) => {
  try {
    const param = uid ? `uid=${encodeURIComponent(uid)}` : ''
    return await browserutil.requestApi('GET', 'my-groups', param)
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ検索（会社IDで検索）
 * @param company_id 会社ID (例: C00001)
 */
export const searchGroup = async (company_id: string) => {
  try {
    return await browserutil.requestApi('GET', 'group', `company_id=${encodeURIComponent(company_id)}`)
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * 全グループ一覧取得
 */
export const getGroupList = async () => {
  try {
    return await browserutil.requestApi('GET', 'group', '')
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ詳細取得（メンバー一覧含む）
 * @param company_id 会社ID
 */
export const getGroupDetail = async (company_id: string) => {
  try {
    return await browserutil.requestApi('GET', `group/${encodeURIComponent(company_id)}`, '')
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループにメンバー追加
 * @param company_id 会社ID
 * @param uid メンバーUID
 * @param role ロール ('admin' | 'editor' | 'viewer')
 */
export const addGroupMember = async (company_id: string, emailOrUid: string, role: string) => {
  // 数値のみの場合はuid、それ以外はemailとして渡す
  const isNumeric = /^\d+$/.test(emailOrUid)
  const body = isNumeric
    ? { uid: emailOrUid, role }
    : { email: emailOrUid, role }
  try {
    return await browserutil.requestApi(
      'POST',
      `group/${encodeURIComponent(company_id)}`,
      '',
      JSON.stringify(body)
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループメンバーのロール変更
 * @param company_id 会社ID
 * @param uid メンバーUID
 * @param role 新ロール
 */
export const updateGroupMemberRole = async (company_id: string, uid: string, role: string) => {
  try {
    return await browserutil.requestApi(
      'PUT',
      `group/${encodeURIComponent(company_id)}`,
      '',
      JSON.stringify({ uid, role })
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループの企業情報更新（グループ管理者のみ）
 * @param company_id 会社ID
 * @param company_name 会社名
 * @param company 企業情報
 */
export const updateGroupCompany = async (
  company_id: string,
  company_name: string,
  company: VtecxApp.Company,
  bank?: VtecxApp.Bank
) => {
  try {
    return await browserutil.requestApi(
      'PUT',
      'group',
      `company_id=${encodeURIComponent(company_id)}`,
      JSON.stringify({ company_name, company, ...(bank != null ? { bank } : {}) })
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ削除（管理者のみ）
 * @param company_id 会社ID
 */
export const deleteGroup = async (company_id: string) => {
  try {
    return await browserutil.requestApi(
      'DELETE',
      'group',
      `company_id=${encodeURIComponent(company_id)}`
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループからメンバー削除
 * @param company_id 会社ID
 * @param member_uid 削除するメンバーUID
 */
export const removeGroupMember = async (company_id: string, member_uid: string) => {
  try {
    return await browserutil.requestApi(
      'DELETE',
      `group/${encodeURIComponent(company_id)}`,
      `member_uid=${encodeURIComponent(member_uid)}`
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * アカウント更新
 * @param uid ユーザーID（メールアドレス）
 * @param name アカウント名
 * @param company 企業情報
 * @param bank 振込先情報
 */
export const putAccount = async (
  uid: string,
  name: string,
  company?: VtecxApp.Company,
  bank?: VtecxApp.Bank,
  user_name?: string
) => {
  const body: any = { uid, name, company, bank, user_name }
  try {
    return await browserutil.requestApi('PUT', 'account', '', JSON.stringify(body))
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ口座一覧取得
 */
export const getGroupBankList = async (company_id: string) => {
  try {
    return await browserutil.requestApi('GET', 'bank', `company_id=${encodeURIComponent(company_id)}`)
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ口座登録
 */
export const postGroupBank = async (company_id: string, bank: VtecxApp.Bank) => {
  try {
    return await browserutil.requestApi(
      'POST',
      'bank',
      `company_id=${encodeURIComponent(company_id)}`,
      JSON.stringify([{ bank }])
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ口座更新
 */
export const putGroupBank = async (company_id: string, bank: VtecxApp.Bank) => {
  try {
    return await browserutil.requestApi(
      'PUT',
      'bank',
      `company_id=${encodeURIComponent(company_id)}`,
      JSON.stringify([{ bank }])
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループ口座削除
 */
export const deleteGroupBank = async (company_id: string, bank_code: string) => {
  try {
    return await browserutil.requestApi(
      'DELETE',
      'bank',
      `company_id=${encodeURIComponent(company_id)}&bank_code=${encodeURIComponent(bank_code)}`
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループへの参加申請を送信
 */
export const postGroupRequest = async (company_id: string) => {
  try {
    return await browserutil.requestApi(
      'POST',
      'group-request',
      `company_id=${encodeURIComponent(company_id)}`
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * グループへの申請一覧を取得（グループ管理者向け）
 */
export const getGroupRequests = async (company_id: string) => {
  try {
    return await browserutil.requestApi(
      'GET',
      'group-request',
      `company_id=${encodeURIComponent(company_id)}`
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * 自分が送った申請一覧を取得
 */
export const getMyGroupRequests = async () => {
  try {
    return await browserutil.requestApi('GET', 'group-request', '')
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * 申請を承認または却下（グループ管理者のみ）
 */
export const handleGroupRequest = async (
  company_id: string,
  uid: string,
  action: 'approve' | 'reject',
  role?: string
) => {
  try {
    let params = `company_id=${encodeURIComponent(company_id)}&uid=${encodeURIComponent(uid)}&action=${action}`
    if (role) params += `&role=${encodeURIComponent(role)}`
    return await browserutil.requestApi('PUT', 'group-request', params)
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

/**
 * 申請をキャンセル（申請者本人のみ）
 */
export const cancelGroupRequest = async (company_id: string) => {
  try {
    return await browserutil.requestApi(
      'DELETE',
      'group-request',
      `company_id=${encodeURIComponent(company_id)}`
    )
  } catch (err: any) {
    return browserutil.handleError(err)
  }
}

const useUser = ({}: {}) => {
  const getUserPageList = React.useCallback(async (option?: string) => {
    try {
      const data: VtecxApp.Entry[] = await browserutil.requestApi(
        'GET',
        `user-page`,
        `${option ? option : ''}`
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [])

  const getUserListCount = React.useCallback(async (option?: string) => {
    try {
      console.log('option:', option)
      const data: VtecxApp.Request = await browserutil.requestApi(
        'GET',
        `user-page`,
        `${option ? option + '&' : ''}c`
      )
      return data
    } catch (err: any) {
      return browserutil.handleError(err)
    }
  }, [])

  return {
    getUserPageList,
    getUserListCount
  }
}

export default useUser
