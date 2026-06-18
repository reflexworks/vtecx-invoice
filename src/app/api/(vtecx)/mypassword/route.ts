import { NextRequest } from 'next/server'
import { VtecxNext, ChangepassByAdminInfo } from '@vtecx/vtecxnext'
import * as apiutil from '@/utils/apiutil'
import { ChangePass } from '@/typings/apiarguments'

/**
 * POSTメソッド: 認証済みユーザーのパスワード変更
 * @param req リクエスト
 * @returns レスポンス
 */
export const POST = async (req: NextRequest): Promise<Response> => {
  console.log(`[api mypassword] start.`)
  try {
    const vtecxnext = new VtecxNext(req)

    // X-Requested-With ヘッダチェック
    let result = vtecxnext.checkXRequestedWith()
    if (result) {
      return result
    }

    // リクエストJSON取得
    const data: ChangePass | undefined = await apiutil.getRequestJson(req)
    if (!data || !data.newpswd) {
      return vtecxnext.response(400, { feed: { title: '新しいパスワードを入力してください。' } })
    }

    // 現在のユーザーUID取得
    const uid = await vtecxnext.uid()
    console.log(`[api mypassword] uid=${uid}`)

    // パスワード変更
    console.log(`[api mypassword] vtecxnext.changepassByAdmin start.`)
    const changepassInfo: ChangepassByAdminInfo = { uid: String(uid), pswd: data.newpswd }
    const resJson = await vtecxnext.changepassByAdmin([changepassInfo])

    console.log('[api mypassword] end.')
    return vtecxnext.response(200, resJson)
  } catch (e) {
    return apiutil.responseError(e, 'api mypassword')
  }
}
