export const NEXT_PAGE_MESSAGE = '※次ページ以降に合計記載'

/**
 * テキスト用
 * @param fontsize 文字の大きさ
 * @param space 文字同士の空白
 * @param underline TRUE:下線部を引く FALSE: 下線部を引かない
 * @param italic TRUE:文字を斜体にする FALSE: 文字を斜体にしない
 * @param bold　TRUE:文字を太字にする FALSE: 文字を太字にしない
 * @param strikethru TRUE:文字の上に取消線を表示する FALSE: 取消線を非表示
 * @returns
 */
export const css_text_font = (
  fontsize: number,
  space?: number,
  underline?: boolean,
  italic?: boolean,
  bold?: boolean,
  strikethru?: boolean
): any => {
  const font_style_list: any = {
    //下線部
    underline: underline,
    //斜体
    italic: italic,
    //太字
    bold: bold,
    //取消線
    strikethru: strikethru
  }
  let font_style = ''
  Object.keys(font_style_list).forEach((_key: string) => {
    if (font_style_list[_key] === true) {
      if (font_style !== '') {
        font_style += ','
      }
      font_style += _key
    }
  })

  return {
    fontsize: String(fontsize),
    space: space ? String(space) : undefined,
    fontstyle: font_style,
    valign: 'middle'
  }
}

/**
 *
 * @param line 囲い線のフラグ 文字列にLを含めれば左側、Rを含めれば右側、Tを含めれば上側、Bを含めれば下側に囲い線を出す
 * @param colspan 結合する列数
 * @param rowspan 結合する行数
 * @param text_align 文字の寄せ位置
 * @param bgcolor 背景色
 * @param height 縦幅のサイズ
 * @returns
 */
export const css_records_th = (
  line: string,
  colspan?: number,
  rowspan?: number,
  text_align?: 'left' | 'center' | 'right',
  bgcolor?: string,
  height?: number
) => {
  let left_line = line && line.indexOf('L') >= 0 ? 'true' : 'false'
  let right_line = line && line.indexOf('R') >= 0 ? 'true' : 'false'
  let top_line = line && line.indexOf('T') >= 0 ? 'true' : 'false'
  let bottom_line = line && line.indexOf('B') >= 0 ? 'true' : 'false'

  return {
    left: left_line,
    right: right_line,
    top: top_line,
    bottom: bottom_line,
    align: text_align || 'center',
    bgcolor: bgcolor || '#FFFFFF',
    bordercolor: '#000000',
    valign: 'middle',
    colspan: colspan ? String(colspan) : '1',
    rowspan: rowspan ? String(rowspan) : '1',
    height: height ? String(height) : '30'
  }
}

/**
 * @param line 囲い線のフラグ 文字列にLを含めれば左側、Rを含めれば右側、Tを含めれば上側、Bを含めれば下側に囲い線を出す
 * @param colspan 結合する列数
 * @param rowspan 結合する行数
 * @param text_align 文字の寄せ位置
 * @returns
 */
export const css_records_breakdown_th = (
  line: string,
  colspan?: number,
  rowspan?: number,
  text_align?: string,
  bgcolor?: string
) => {
  let left_line = line && line.indexOf('L') >= 0 ? 'true' : 'false'
  let right_line = line && line.indexOf('R') >= 0 ? 'true' : 'false'
  let top_line = line && line.indexOf('T') >= 0 ? 'true' : 'false'
  let bottom_line = line && line.indexOf('B') >= 0 ? 'true' : 'false'

  return {
    left: left_line,
    right: right_line,
    top: top_line,
    bottom: bottom_line,
    align: text_align || 'center',
    bgcolor: bgcolor || '#FFFFFF',
    bordercolor: '#000000',
    valign: 'middle',
    colspan: String(colspan),
    rowspan: rowspan ? String(rowspan) : '1'
  }
}

/**
 *
 * @param line 囲い線のフラグ 引数の文字列にLを含めれば左側、Rを含めれば右側、Tを含めれば上側、Bを含めれば下側に囲い線を出す
 * @param colspan 結合する列数
 * @param rowspan 結合する行数
 * @param text_align 文字の寄せ位置
 * @param bgcolor 背景色
 * @param height 縦幅のサイズ
 * @param valign 垂直方向の表示デフォルト位置 top, middle, bottomのどれか。デフォルトはtop
 */
export const css_records_td = (
  line: string,
  colspan?: number,
  rowspan?: number,
  text_align?: 'left' | 'center' | 'right',
  bgcolor?: string,
  height?: number,
  valign?: string
) => {
  let left_line = line && line.indexOf('L') >= 0 ? 'true' : 'false'
  let right_line = line && line.indexOf('R') >= 0 ? 'true' : 'false'
  let top_line = line && line.indexOf('T') >= 0 ? 'true' : 'false'
  let bottom_line = line && line.indexOf('B') >= 0 ? 'true' : 'false'

  return {
    left: left_line,
    right: right_line,
    top: top_line,
    bottom: bottom_line,
    align: text_align || 'center',
    bgcolor: bgcolor || '#FFFFFF',
    bordercolor: '#000000',
    valign: valign || 'middle',
    colspan: colspan ? String(colspan) : '1',
    rowspan: rowspan ? String(rowspan) : '1',
    height: height ? String(height) : '30'
  }
}

/**
 * 点線を引く関数
 * @param x_start 横開始位置
 * @param x_end 横終了位置
 * @param y_start 縦開始位置
 * @param y_end 縦終了位置
 * @param _color 線の色
 * @returns
 */
export const css_dotted_line = (
  x_start: number,
  x_end: number,
  y_start: number,
  y_end: number,
  _color?: string
): any => {
  return {
    x1: String(x_start),
    y1: String(y_start),
    x2: String(x_end),
    y2: String(y_end),
    linedushon: '0.3',
    linedushoff: '0.3',
    color: _color || '#000000'
  }
}
