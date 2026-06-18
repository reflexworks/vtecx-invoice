import { Entry } from '../typings'

/**
 * 値をstring型で返す.
 * @param tmpVal 値
 * @return stringの値
 */
export const toString = (tmpVal: any): string => {
  return !isBlank(tmpVal) ? String(tmpVal) : ''
}

/**
 * 値をnumber型で返す。空の場合、defaultValが指定されていなければエラー。
 * @param tmpVal 値
 * @param defaultVal 値が指定されていない場合の返却値。この値が指定されていればエラーとしない。undefined指定は無効。エラーとなる。
 * @return numberの値
 */
export const toNumber = (tmpVal: any, defaultVal?: number): number => {
  let errMsg = `Not numeric. ${tmpVal}`
  if (!isBlank(tmpVal)) {
    try {
      return Number(tmpVal)
    } catch (e) {
      if (isError(e)) {
        errMsg = e.message
      }
    }
  } else if (defaultVal !== undefined) {
    return defaultVal
  }
  throw new CommonError(400, errMsg)
}

/**
 * 値をboolean型で返す.空はエラー.
 * @param tmpVal 値
 * @return booleanの値
 */
export const toBoolean = (tmpVal: string): boolean => {
  let errMsg = `Not boolean. ${tmpVal}`
  if (!isBlank(tmpVal)) {
    try {
      return tmpVal.toLowerCase() === 'true'
    } catch (e) {
      if (isError(e)) {
        errMsg = e.message
      }
    }
  }
  throw new CommonError(400, errMsg)
}

/**
 * 文字列をArrayBufferに変換する.
 * @param tmpStr 文字列
 * @returns ArrayBuffer
 */
export const toArrayBuffer = (tmpStr: string): Uint8Array => {
  return new TextEncoder().encode(tmpStr)
}

/**
 * BigQueryでテーブル名指定の場合の型変換を行う.
 * @param tablenamesStr 値
 * @return テーブル名リスト
 */
export const getBqTablenames = (tablenamesStr: string): any => {
  if (!tablenamesStr) {
    return null
  }
  const tablenames: any = {}
  const tmp = tablenamesStr.split(',')
  for (const tablenameInfo of tmp) {
    const idx = tablenameInfo.indexOf(':')
    if (idx < 1) {
      throw new CommonError(400, `Invalid tablenames of BigQuery. ${tablenamesStr}`)
    }
    const entityName: string = tablenameInfo.substring(0, idx)
    tablenames[entityName] = tablenameInfo.substring(idx + 1)
  }
  console.log(`[getBqTablenames] tablenames = ${JSON.stringify(tablenames)}`)
  return tablenames
}

/**
 * Feedの先頭のEntryを取得.
 * @param data デフォルトでは配列、strictモードの場合連想配列のfeed.entry。
 * @returns Feedの先頭のEntry
 */
export const getFirstEntry = (data: any): any => {
  const entries = getEntries(data)
  if (entries && entries.length > 0) {
    return entries[0]
  } else {
    return null
  }
}

/**
 * Feedの先頭のEntryを取得.
 * @param data デフォルトでは配列、strictモードの場合連想配列のfeed.entry。
 * @returns Feedの先頭のEntry
 */
export const getEntries = (data: any): Array<any> | null => {
  //data.feed.entry[0].title
  if (data) {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        return data
      }
    } else {
      if ('feed' in data && 'entry' in data.feed && data.feed.entry.length > 0) {
        return data.feed.entry
      }
    }
  }
  return null
}

/**
 * null、undefined、空文字の判定
 * @param val チェック値
 * @returns null、undefined、空文字の場合true
 */
export const isBlank = (val: any): boolean => {
  if (val === null || val === undefined || val === '') {
    return true
  }

  return false
}

/**
 * リクエストURLから指定されたパラメータを取り除いたクエリパラメータを返却.
 * @param requestUrl リクエストURL
 * @param names 除去対象パラメータ
 * @returns 編集したクエリパラメータ
 */
export const removeParam = (requestUrl: string, names: string[]): string => {
  const idx0 = requestUrl.indexOf('?')
  if (idx0 < 0) {
    return ''
  }
  let tmpQueryparam: string = requestUrl.substring(idx0 + 1)
  //console.log(`[testutil removeParam] tmpQueryparam=${tmpQueryparam}`)

  for (const name of names) {
    if (tmpQueryparam.startsWith(`${name}=`)) {
      // 指定パラメータが先頭の場合
      const idx3 = tmpQueryparam.indexOf('&')
      if (idx3 < 0) {
        tmpQueryparam = ''
      } else {
        tmpQueryparam = tmpQueryparam.substring(idx3 + 1)
      }
    } else {
      const idx = tmpQueryparam.indexOf(`&${name}=`)
      if (idx > -1) {
        let param = tmpQueryparam.substring(0, idx)
        const startIdx = idx + name.length + 2
        const idx2 = tmpQueryparam.indexOf('&', startIdx)
        if (idx2 >= startIdx) {
          if (param) {
            param += '&'
          }
          param += tmpQueryparam.substring(idx2 + 1)
        }
        tmpQueryparam = param
      }
    }
  }
  if (tmpQueryparam) {
    tmpQueryparam = '?' + tmpQueryparam
  }
  //console.log(`[testutil removeParam] end. tmpQueryparam=${tmpQueryparam}`)
  return tmpQueryparam
}

/**
 * 配列のシャローコピー (配列は別オブジェクト、中身は参照のため元の配列と同じオブジェクト)
 * @param array 配列
 * @returns シャローコピーした配列
 */
export const shallowCopyArray = (array: any[] | undefined): any[] | null => {
  // selectedChapter.upperlayer ? selectedChapter.upperlayer.map((x) => x) : []
  if (array === undefined || array === null) {
    return null
  }
  return [...array] // スプレッド構文(シャローコピー)
}

/**
 * Entryからキーを取得
 *   link.___rel = 'self' の link.___href の値を返す。
 * @param entry Entry
 * @returns キー
 */
export const getUri = (entry: Entry): string => {
  if (entry && entry.link) {
    for (const link of entry.link) {
      if (link.___rel === 'self') {
        return toString(link.___href)
      }
    }
  }
  return ''
}

/**
 * IDからキーを取得
 *   リビジョンを除いたキー部分を返却する
 * @param id ID
 * @returns キー
 */
export const getIdUri = (id: string): string => {
  if (id) {
    const idx = id.indexOf(',')
    if (idx > -1) {
      return id.substring(0, idx)
    }
  }
  return ''
}

/**
 * キーの親階層を返却
 * @param uri キー
 * @returns キーの親階層
 */
export const getParentUri = (uri: string): string => {
  if (uri) {
    const idx = uri.lastIndexOf('/')
    if (idx > 0) {
      return uri.substring(0, idx)
    }
  }
  return ''
}

/**
 * エイリアスリストを返却
 * @param entry エントリー
 * @returns エイリアスリスト
 */
export const getAlias = (entry: Entry): string[] | undefined => {
  if (!entry.link) {
    return undefined
  }
  const aliases: string[] = []
  for (const link of entry.link) {
    if (link.___rel === 'alternate' && link.___href) {
      aliases.push(link.___href)
    }
  }
  if (aliases.length > 0) {
    return aliases
  }
  return undefined
}

/**
 * entryにキーを設定.
 *   link.___rel='self'の'___href'にキーを設定する。
 * @param entry Entry
 * @param uri キー
 * @returns キーを設定したEntry
 */
export const setLinkUri = (entry: Entry, uri: string): Entry => {
  if (!uri) {
    return entry
  }
  let retEntry: Entry
  if (entry) {
    retEntry = entry
  } else {
    retEntry = {}
  }
  let idx: number | undefined
  if (!retEntry.link) {
    retEntry.link = []
  } else {
    const len = retEntry.link.length
    for (let i = 0; i < len; i++) {
      const tmpLink = retEntry.link[i]
      if (tmpLink.___rel === 'self') {
        idx = i
      }
    }
  }
  if (idx === undefined) {
    retEntry.link.push({ ___rel: 'self', ___href: uri })
  } else {
    retEntry.link[idx].___href = uri
  }
  //console.log(`[setLinkUri] retEntry=${JSON.stringify(retEntry)}`)
  return retEntry
}

/**
 * idの形式かどうかチェック
 *   /xxx/yyy,{revision}
 * @param id ID
 * @returns id形式であればtrue
 */
export const isIdFormat = (id: string) => {
  const pattern = /^\/.+,[0-9]+/
  if (id && pattern.test(id) && id.indexOf('//') === -1) {
    return true
  }
  return false
}

/**
 * 文字列が正数かどうかチェック
 * 0はfalseを返す
 * @param str 文字列
 * @returns 正数の場合true、異なる場合false
 */
export const isPositiveNumber = (str: string): boolean => {
  //console.log(`[checPositiveNumber] start. str = ${str}`)
  const checkIfNumber = /^[1-9]\d*$/ //正規表現、終始半角数字で1文字以上の文字列を示す
  const result = checkIfNumber.test(str)
  //console.log(`[checPositiveNumber] end. result = ${result}`)
  return result
}

/**
 * 文字列がtrue/falseかどうかチェック
 * @param str 文字列
 * @returns 文字列がtrue/falseであればtrue
 */
export const isBoolean = (str: string): boolean => {
  if (str) {
    const strLowerCase = str.toLowerCase()
    if (strLowerCase === 'true' || strLowerCase === 'false') {
      return true
    }
  }
  return false
}

/**
 * 指定されたメールアドレスをアカウント形式に変換
 *   1. 指定されたメールアドレスを小文字に変換。
 *   2. アカウント利用可能文字 英数字、ハイフン(-)、アンダースコア(_)、@、$、ドット(.) 以外を削除。
 *   3. メールアドレスの@より前の文字列について、ドット(.)を削除。
 */
export const editAccount = (str: string): string => {
  if (!str) {
    return str
  }
  const pattern = /[^A-Za-z0-9\-_@\\$\\.]/g
  let tmp = str.toLocaleLowerCase()
  tmp = tmp.replace(pattern, '')
  const idx = tmp.indexOf('@')
  if (idx > 0) {
    let tmpPart1 = tmp.substring(0, idx)
    const tmpPart2 = tmp.substring(idx)
    const pattern2 = /\./g
    tmpPart1 = tmpPart1.replace(pattern2, '')
    tmp = `${tmpPart1}${tmpPart2}`
  }
  return tmp
}

/**
 * URIエンコードを行う。
 * +が`%20`にエンコードされるので、`%2B`に変換する。
 * @param str
 * @returns
 */
export const encodeURIPlus = (str: string): string => {
  if (!str) {
    return str
  }
  let ret = encodeURIComponent(str)
  const pattern = /%20/g
  return ret.replace(pattern, '%2B')
}

/**
 * Error型かどうかチェック
 * インターフェースの判定には型ガード関数を使う
 * @param value チェックオブジェクト
 * @returns Error型の場合true
 */
export const isError = (value: unknown): value is Error => {
  // 値がオブジェクトであるかの判定
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const { name, message } = value as Record<keyof Error, unknown>
  // nameプロパティーが文字列型かを判定
  if (typeof name !== 'string') {
    return false
  }
  // messageプロパティーが文字列型かを判定
  if (typeof message !== 'string') {
    return false
  }
  return true
}

/**
 * Response型かどうかチェック
 * インターフェースの判定には型ガード関数を使う
 * @param value チェックオブジェクト
 * @returns Response型の場合true
 */
export const isResponse = (value: unknown): value is Response => {
  // 値がオブジェクトであるかの判定
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const { body, bodyUsed, headers, ok, redirected, status, statusText, url } = value as Record<
    keyof Response,
    unknown
  >
  //console.log(`[isResponse] start.`)
  if (typeof body !== 'object') {
    //console.log(`[isResponse] false: typeof body !== 'object'`)
    return false
  }
  if (typeof bodyUsed !== 'boolean') {
    //console.log(`[isResponse] false: typeof bodyUsed !== 'boolean'`)
    return false
  }
  if (typeof headers !== 'object') {
    //console.log(`[isResponse] false: typeof headers !== 'object'`)
    return false
  }
  if (typeof ok !== 'boolean') {
    //console.log(`[isResponse] false: typeof ok !== 'boolean'`)
    return false
  }
  if (typeof redirected !== 'boolean') {
    //console.log(`[isResponse] false: typeof redirected !== 'boolean'`)
    return false
  }
  if (typeof status !== 'number') {
    //console.log(`[isResponse] false: typeof status !== 'number'`)
    return false
  }
  if (typeof statusText !== 'string') {
    //console.log(`[isResponse] false: typeof statusText !== 'string'`)
    return false
  }
  if (typeof url !== 'string') {
    //console.log(`[isResponse] false: typeof url !== 'string'`)
    return false
  }
  //console.log(`[isResponse] true`)
  return true
}

/**
 * 数値がnullまたはundefinedの場合0を返す
 * @param num 数値
 * @returns 数値。nullまたはundefinedの場合0を返す。
 */
export const nullToZero = (num: number): number => {
  if (num === null || num === undefined) {
    return 0
  }
  return num
}

/**
 * 指定時間スリープする
 * @param millisec 待機時間(ms)
 */
export const sleep = (millisec: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, millisec))
}

// --------------------------------------
/**
 * Error returned from api route
 */
export class CommonError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'CommonError'
    this.status = status
  }
}
