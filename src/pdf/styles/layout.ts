// 絶対座標テーブル
export const absTable = (x: number, y: number, w: number, extra?: any): any => ({
  absolutex: String(x),
  absolutey: String(y),
  width: String(w),
  border: '0',
  left: 'false',
  right: 'false',
  top: 'false',
  bottom: 'false',
  ...extra
})

// TDスタイル ('LRTB' で各辺の罫線を指定)
export const td = (
  borders: string,
  align: 'left' | 'center' | 'right',
  height: number,
  bgcolor: string = '#FFFFFF',
  colspan: number = 1
): any => ({
  left: borders.includes('L') ? 'true' : 'false',
  right: borders.includes('R') ? 'true' : 'false',
  top: borders.includes('T') ? 'true' : 'false',
  bottom: borders.includes('B') ? 'true' : 'false',
  align,
  bgcolor,
  bordercolor: '#000000',
  valign: 'middle',
  height: String(height),
  colspan: String(colspan),
  rowspan: '1'
})
