/**
 * 全角から半角への変革関数
 * 入力値の英数記号を半角変換して返却
 */
const toHalfWidth = (str_val: string) => {
  // 半角変換
  const halfVal = str_val.replace(/[！-～]/g, (tmp_str) => {
    // 文字コードをシフト
    return String.fromCharCode(tmp_str.charCodeAt(0) - 0xfee0)
  })
  return halfVal
}

/**
 * 金額用。カンマを付ける関数。
 * @param num_val
 * @returns
 */
export const addFigure = (num_val: string): string => {
  num_val = '' + num_val

  // 空の場合そのまま返却
  if (num_val === '') {
    return ''
  }

  // 全角から半角へ変換し、既にカンマが入力されていたら事前に削除
  num_val = toHalfWidth(num_val).replace(/,/g, '').trim()

  // 数値でなければ''を返却
  if (!/^[+|-]?(\d*)(\.\d+)?$/.test(num_val)) {
    return ''
  }

  // 整数部分と小数部分に分割
  let num_data = num_val.toString().split('.')

  // 整数部分を3桁カンマ区切りへ
  num_data[0] = Number(num_data[0])
    .toString()
    .replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,')

  // 小数部分と結合して返却
  return num_data.join('.')
}

/**
 * 文字列と一行あたりの限界文字数を渡し、分割して返す関数
 *
 * @param value 文字列
 * @param maxlength 一行あたりの限界文字数
 * @returns
 */
export const getLengthSplit = (value: string, maxlength: number): string[] => {
  let array: string[] = []

  if (!value) {
    array.push('')
    return array
  }

  let result = 0
  let row_str = ''
  for (let i = 0; i < value.length; i++) {
    let string = value.charCodeAt(i)

    let count = 2
    if (
      (string >= 0x00 && string < 0x81) ||
      string === 0xf8f0 ||
      (string >= 0xff61 && string < 0xffa0) ||
      (string >= 0xf8f1 && string < 0xf8f4)
    ) {
      //半角文字の場合は1を加算
      count = 1
    } else {
      //それ以外の文字の場合は2を加算
    }

    row_str = row_str + value[i]
    if ((array.length + 1) * maxlength <= result + count) {
      array.push(row_str)
      row_str = ''
    } else if (i + 1 === value.length) {
      array.push(row_str)
    }
    result = result + count
  }
  //結果を返す
  return array
}

export const CommonDateSlash = (value: any, insert?: string) => {
  const insert_value = insert ? insert : '/'
  if (value.length === 8) {
    const year = value.slice(0, 4)
    const month = value.slice(4, 6)
    const day = value.slice(6, 8)
    return year + insert_value + month + insert_value + day
  } else if (value.length === 17) {
    const year = value.slice(0, 4)
    const month = value.slice(4, 6)
    const day = value.slice(6, 8)
    const time = value.slice(9, 17)
    return year + insert_value + month + insert_value + day + ' ' + time
  } else {
    return value
  }
}

export const renderToStaticMarkup = async (component: any) => {
  const ReactDOMServer = (await import('react-dom/server')).default
  const staticMarkup = ReactDOMServer.renderToStaticMarkup(component)
  return staticMarkup
}

export interface record {
  [key: string]: any
}
