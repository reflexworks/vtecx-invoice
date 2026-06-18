export const css: any = {
  /**
   * ページ全体の設定
   */
  _page: {
    pagesize: 'A4',
    //ページの向き　portrait:縦
    orientation: 'portrait',
    //左側余白
    left: -30,
    //右側余白
    right: -30,
    //上側余白
    top: 30,
    //下側余白
    bottom: 30,
    //線の色
    linecolor: '#000000'
  },
  //ヘッダーの設定
  page_info_header: {
    //絶対座標横
    absolutex: '495',
    //絶対座標縦
    absolutey: '830',
    //横幅
    width: '80',
    align: 'right',
    left: 'false',
    right: 'false',
    top: 'false',
    bottom: 'false'
  },
  //タイトル
  title: {
    //絶対座標横
    absolutex: '20',
    //絶対座標縦
    absolutey: '830',
    //横幅
    width: '400',
    cellpadding: '0',
    border: '0'
  },
  /**
   * 発行日
   */
  issue_date_info: {
    //絶対座標横
    absolutex: '340',
    //絶対座標縦
    absolutey: '830',
    //横幅
    width: '200',
    align: 'right',
    size: '10',
    font: 'HeiseiKakuGo-W5',
    left: 'false',
    right: 'false',
    top: 'false',
    bottom: 'false'
  },

  /**
   * 明細テーブルヘッダの設定
   */
  records_th: {
    size: 20,
    left: 'true',
    right: 'true',
    top: 'true',
    bottom: 'true',
    align: 'center',
    bgcolor: '#BBBBBB',
    bordercolor: '#BBBBBB',
    valign: 'middle'
  },
  /**
   * 補足文テーブルの設定
   */
  supplement_table: {
    absolutex: '20',
    absolutey: '40',
    cellpadding: '0',
    width: '550',
    align: 'left',
    widths: '100',
    cols: '1'
  }
}

/**
 * 明細テーブルの設定
 * @returns
 */
export const css_records_table = () => {
  return {
    absolutex: '20',
    absolutey: '768',
    border: '0.5',
    bordercolor: '#BBBBBB',
    width: '550',
    widths: '20,20,60',
    height: '20',
    cols: '3',
    align: 'center',
    flame: 'box'
  }
}

/**
 *
 * @param _rowspan
 * @returns
 */
export const css_total_td_note = (_rowspan: any) => {
  return {
    colspan: '4',
    rowspan: '' + _rowspan,
    left: 'false',
    right: 'false',
    top: 'false',
    bottom: 'false'
  }
}

/**
 *
 * @param _text_align //文字の寄せ位置 left:左寄せ center:中央 その他の場合は右寄せ
 * @returns
 */
export const css_records_td = (
  _text_align: String,
  _is_multi?: boolean,
  is_first?: boolean,
  _is_end?: boolean
) => {
  const style: any = {
    size: '8',
    left: 'true',
    right: 'true',
    top: 'true',
    bottom: 'true',
    height: '18',
    bordercolor: '#BBBBBB',
    bgcolor: '#ffffff'
  }

  if (_is_multi) {
    if (is_first) {
      style.bottom = 'false'
    } else if (_is_end) {
      style.top = 'false'
    } else {
      style.top = 'false'
      style.bottom = 'false'
    }
  }

  if (_text_align === 'left') {
    style.align = 'left'
  } else if (_text_align === 'center') {
    style.align = 'center'
  } else {
    style.align = 'right'
  }
  return style
}
