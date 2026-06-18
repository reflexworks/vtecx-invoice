import React from 'react'
import { css_text_font } from '@/pdf/styles/css-common'
import { absTable, td } from '@/pdf/styles/layout'
import { addFigure, renderToStaticMarkup } from 'pdf/pdfutils'
import { bankTypeLabel, formatBankTitle } from '@/utils/datautil'

const ROW_H = 14
const HEADER_H = 30
const TOTAL_ROW_H = 2 * ROW_H + (ROW_H + 4) // 小計+消費税+合計行の合計高さ = 46

const TABLE_Y_FIRST = 550 // 1ページ目のテーブル開始Y座標 212以上にしないと明細が1行も入らない
const TABLE_Y_NEXT = 800 // 2ページ目以降のテーブル開始Y座標
const BOTTOM_Y = 30 // ページ下端余白

// 備考欄の各部高さ
const REMARKS_CONTENT_H = 60
const REMARKS_LABEL_H = 16
const REMARKS_REDUCED_H = 12
const REMARKS_GAP = 4

const HEADER_COLOR = '#2f4f7f' // テーブルヘッダー色
const SUB_BG_COLOR = '#fafafa' // 合計行の背景色

// ===== 1ページ目の絶対座標 =====
// 最大明細行数: テーブル高さ - ヘッダー - 合計行 - 備考欄 = 残り / ROW_H
const MAX_DATA_ROWS_FIRST = Math.floor(
  (TABLE_Y_FIRST -
    BOTTOM_Y -
    HEADER_H -
    TOTAL_ROW_H -
    REMARKS_GAP -
    REMARKS_REDUCED_H -
    REMARKS_LABEL_H -
    REMARKS_CONTENT_H) /
    ROW_H
)
// 明細データ行の下端Y座標 (= 合計テーブルの開始Y座標)
const TOTAL_Y_FIRST = TABLE_Y_FIRST - HEADER_H - MAX_DATA_ROWS_FIRST * ROW_H
// 備考欄各部の開始Y座標
const REMARKS_REDUCED_Y_FIRST = TOTAL_Y_FIRST - TOTAL_ROW_H - REMARKS_GAP
const REMARKS_LABEL_Y_FIRST = REMARKS_REDUCED_Y_FIRST - REMARKS_REDUCED_H
const REMARKS_CONTENT_Y_FIRST = REMARKS_LABEL_Y_FIRST - REMARKS_LABEL_H

// ===== 2ページ目以降の絶対座標 =====
// 最大明細行数: テーブル高さ - ヘッダー - 合計行 = 残り / ROW_H
const MAX_DATA_ROWS_NEXT = Math.floor((TABLE_Y_NEXT - BOTTOM_Y - HEADER_H - TOTAL_ROW_H) / ROW_H)
// 明細データ行の下端Y座標 (= 合計テーブルの開始Y座標)
const TOTAL_Y_NEXT = TABLE_Y_NEXT - HEADER_H - MAX_DATA_ROWS_NEXT * ROW_H

// 1ページ目の各セクションの絶対座標・幅 (x, y, w)
const _customerY = 758
const _subjectY = _customerY - 37
const _noticeY = _subjectY - 31
const _amountY = _noticeY - 27
const _bankY = _amountY - 28

//企業ロゴ
//const LOGO_W = 100
//const LOGO_H = 28
const LOGO_W = 110
const LOGO_H = 31
// ロゴ座標
// タイトル左: x=20, y=798
// 角印と同じ位置: x=510, y=655（現在）
const LOGO_X = 460 // = LAYOUT.pdf_info.x(310) + LAYOUT.pdf_info.w(260) - 60
const LOGO_Y = 681

const LAYOUT = {
  title: { x: 20, y: 808, w: 550 },
  pdf_info: { x: 310, y: 755, w: 260 },
  company: { x: 310, y: 681, w: 260 },
  customer: { x: 20, y: _customerY, w: 270 },
  subject: { x: 20, y: _subjectY, w: 270 },
  notice: { x: 20, y: _noticeY, w: 270 },
  amount: { x: 20, y: _amountY, w: 300 },
  bank: { x: 20, y: _bankY, w: 275 }
} as const

type InvoiceRecord = {
  description?: string
  quantity?: number
  unit_price?: number
  tax_rate?: number
}

type InvoiceEntry = {
  invoice_code: string
  customer_name: string
  subject: string
  issue_date?: number
  due_date?: number
  remarks?: string
  sub_total?: number
  tax_amount?: number
  total_amount?: number
  records: InvoiceRecord[]
  bank?: {
    bank_title?: string
    branch_name?: string
    bank_type?: string
    bank_number?: string
    bank_name?: string
  }
  company?: {
    company_name?: string
    zip_code?: string
    prefecture?: string
    city?: string
    address_line1?: string
    building_name?: string
    tel?: string
    registration_number?: string
  }
  logoKey?: string
  stampKey?: string
}

// 品名列の1行あたり全角文字数 (テーブル幅550 × 40% = 220px、font-size 9)
const DESCRIPTION_COL_CHARS = 24

/**
 * 品名の表示に必要な行数を計算する
 * 全角文字=1、半角文字=0.5 として換算
 */
const calcDescriptionLines = (description?: string): number => {
  if (!description) return 1
  let fullWidthEquiv = 0
  for (const ch of description) {
    fullWidthEquiv += ch.charCodeAt(0) > 0x7e ? 1 : 0.5
  }
  return Math.max(1, Math.ceil(fullWidthEquiv / DESCRIPTION_COL_CHARS))
}

/**
 * 明細行をページごとに分割する
 * 品名の文字数から必要行数を算出し、消費行数ベースでページ分割する
 * 非最終ページは MAX_DATA_ROWS - 1 を上限にし、最終行を注記専用行として確保する
 * 最終ページは MAX_DATA_ROWS まで使用可能
 */
const paginateRecords = (records: InvoiceRecord[]): InvoiceRecord[][] => {
  if (records.length === 0) return [[]]
  const pages: InvoiceRecord[][] = []
  let i = 0
  while (i < records.length) {
    const maxRows = pages.length === 0 ? MAX_DATA_ROWS_FIRST : MAX_DATA_ROWS_NEXT
    // 残りレコードの消費行数合計
    const remainingRowsNeeded = records
      .slice(i)
      .reduce((acc, r) => acc + calcDescriptionLines(r.description), 0)
    if (remainingRowsNeeded <= maxRows) {
      // 全残レコードがこのページに収まる → 最終ページ（注記行不要）
      pages.push(records.slice(i))
      i = records.length
    } else {
      // まだ次ページがある → 最後の1行を注記用に確保
      const effectiveMax = maxRows - 1
      let rowCount = 0
      let j = i
      while (j < records.length) {
        const lines = calcDescriptionLines(records[j].description)
        if (rowCount + lines > effectiveMax) break
        rowCount += lines
        j++
      }
      // 1件も入らない場合でも最低1件は含める
      if (j === i) j = i + 1
      pages.push(records.slice(i, j))
      i = j
    }
  }
  return pages
}

const formatDueDate = (dateVal?: number): string => {
  if (!dateVal) return ''
  const s = String(dateVal)
  if (s.length !== 8) return s
  const year = parseInt(s.substring(0, 4))
  const month = parseInt(s.substring(4, 6))
  const day = parseInt(s.substring(6, 8))
  const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(year, month - 1, day).getDay()]
  return `${year}年${month}月${day}日(${dow})`
}

/** 明細テーブルヘッダ行 */
const renderTableHeader = () => (
  <tr>
    <td style={td('LRTB', 'center', HEADER_H, HEADER_COLOR)}>
      <div style={{ ...css_text_font(9, 1, false, false, true), color: '#FFFFFF' }}>No</div>
    </td>
    <td style={td('LRTB', 'center', HEADER_H, HEADER_COLOR)}>
      <div style={{ ...css_text_font(9, 1, false, false, true), color: '#FFFFFF' }}>品名</div>
    </td>
    <td style={td('LRTB', 'center', HEADER_H, HEADER_COLOR)}>
      <div style={{ ...css_text_font(9, 1, false, false, true), color: '#FFFFFF' }}>数量</div>
    </td>
    <td style={td('LRTB', 'center', HEADER_H, HEADER_COLOR)}>
      <div style={{ ...css_text_font(8, 1, false, false, true), color: '#FFFFFF' }}>単価(税抜)</div>
    </td>
    <td style={td('LRTB', 'center', HEADER_H, HEADER_COLOR)}>
      <div style={{ ...css_text_font(8, 1, false, false, true), color: '#FFFFFF' }}>税率</div>
    </td>
    <td style={td('LRTB', 'center', HEADER_H, HEADER_COLOR)}>
      <div style={{ ...css_text_font(8, 1, false, false, true), color: '#FFFFFF' }}>金額(税抜)</div>
    </td>
  </tr>
)

/** 明細データ行 */
const renderRecordRows = (records: InvoiceRecord[], startIndex: number) =>
  records.map((r, i) => {
    const amount = (r.quantity ?? 0) * (r.unit_price ?? 0)
    const isReduced = r.tax_rate === 8
    const taxRateLabel = r.tax_rate === 0 ? '無し' : `${r.tax_rate ?? 10}%`
    const rowH = calcDescriptionLines(r.description) * ROW_H
    return (
      <tr key={startIndex + i}>
        <td style={td('LRTB', 'center', rowH)}>
          <div style={css_text_font(9)}>{startIndex + i + 1}</div>
        </td>
        <td style={{ ...td('LRTB', 'left', rowH), verticalAlign: 'top', padding: '3px 4px' }}>
          <div style={css_text_font(9)}>
            {r.description ?? ''}
            {isReduced ? ' ※' : ''}
          </div>
        </td>
        <td style={td('LRTB', 'right', rowH)}>
          <div style={css_text_font(9)}>{addFigure(String(r.quantity ?? 0))}</div>
        </td>
        <td style={td('LRTB', 'right', rowH)}>
          <div style={css_text_font(9)}>{addFigure(String(r.unit_price ?? 0))}</div>
        </td>
        <td style={td('LRTB', 'center', rowH)}>
          <div style={css_text_font(9)}>{taxRateLabel}</div>
        </td>
        <td style={td('LRTB', 'right', rowH)}>
          <div style={css_text_font(9)}>{addFigure(String(amount))}</div>
        </td>
      </tr>
    )
  })

/** 空行（パディング用）。showNextPageNote=true の場合、最終行の品名列に次ページ注記を表示 */
const renderEmptyRows = (count: number, showNextPageNote: boolean = false) =>
  Array.from({ length: count }, (_, i) => {
    const isNoteRow = showNextPageNote && i === count - 1
    return (
      <tr key={`empty-${i}`}>
        <td style={td('LRTB', 'center', ROW_H)}>
          <div style={css_text_font(9)}> </div>
        </td>
        <td style={td('LRTB', 'left', ROW_H)}>
          {isNoteRow ? (
            <div style={css_text_font(7)}>※次ページ以降に小計、消費税、合計金額の記載有</div>
          ) : (
            <div style={css_text_font(9)}> </div>
          )}
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(9)}> </div>
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(9)}> </div>
        </td>
        <td style={td('LRTB', 'center', ROW_H)}>
          <div style={css_text_font(9)}> </div>
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(9)}> </div>
        </td>
      </tr>
    )
  })

/** 税率区分サマリー＋小計・消費税・合計テーブル（絶対座標で配置・1テーブルに統合） */
const renderTotalTable = (data: InvoiceEntry, y: number) => {
  const sub10 = data.records.reduce(
    (sum, r) => (r.tax_rate === 10 || r.tax_rate == null ? sum + (r.quantity ?? 0) * (r.unit_price ?? 0) : sum),
    0
  )
  const sub8 = data.records.reduce(
    (sum, r) => (r.tax_rate === 8 ? sum + (r.quantity ?? 0) * (r.unit_price ?? 0) : sum),
    0
  )
  const tax10 = Math.floor(sub10 * 0.1)
  const tax8 = Math.floor(sub8 * 0.08)
  // 列幅: 税率区分(18%) 消費税(13%) 金額税抜(14%) 空白(17%) ラベル(20%) 金額(18%) = 100%
  return (
    <table
      style={
        {
          absolutex: '20',
          absolutey: String(y),
          border: '0.5',
          bordercolor: '#000000',
          width: '550',
          widths: '18,13,14,17,20,18',
          cols: '6',
          align: 'center'
        } as any
      }
    >
      <tr>
        <td style={td('LRTB', 'center', ROW_H, HEADER_COLOR)}>
          <div style={{ ...css_text_font(8, undefined, false, false, true), color: '#FFFFFF' }}>
            税率区分
          </div>
        </td>
        <td style={td('LRTB', 'right', ROW_H, HEADER_COLOR)}>
          <div style={{ ...css_text_font(8, undefined, false, false, true), color: '#FFFFFF' }}>
            消費税
          </div>
        </td>
        <td style={td('LRTB', 'right', ROW_H, HEADER_COLOR)}>
          <div style={{ ...css_text_font(8, undefined, false, false, true), color: '#FFFFFF' }}>
            金額（税抜）
          </div>
        </td>
        <td style={td('RT', 'right', ROW_H)}>
          <div style={css_text_font(9)}></div>
        </td>
        <td style={td('LRTB', 'right', ROW_H, SUB_BG_COLOR)}>
          <div style={css_text_font(9)}>小計</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(9)}>¥ {addFigure(String(data.sub_total ?? 0))}</div>
        </td>
      </tr>
      <tr>
        <td style={td('LRTB', 'left', ROW_H)}>
          <div style={css_text_font(8)}>10%対象</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(8)}>¥ {addFigure(String(tax10))}</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(8)}>¥ {addFigure(String(sub10))}</div>
        </td>
        <td style={td('R', 'right', ROW_H)}>
          <div style={css_text_font(9)}></div>
        </td>
        <td style={td('LRTB', 'right', ROW_H, SUB_BG_COLOR)}>
          <div style={css_text_font(9)}>消費税</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H)}>
          <div style={css_text_font(9)}>¥ {addFigure(String(data.tax_amount ?? 0))}</div>
        </td>
      </tr>
      <tr>
        <td style={td('LRTB', 'left', ROW_H + 4)}>
          <div style={css_text_font(8)}>8%対象 ※</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H + 4)}>
          <div style={css_text_font(8)}>¥ {addFigure(String(tax8))}</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H + 4)}>
          <div style={css_text_font(8)}>¥ {addFigure(String(sub8))}</div>
        </td>
        <td style={td('R', 'right', ROW_H + 4)}>
          <div style={css_text_font(9)}></div>
        </td>
        <td style={td('LRTB', 'right', ROW_H + 4, SUB_BG_COLOR)}>
          <div style={css_text_font(10, 1, false, false, true)}>{'合計金額(税込)'}</div>
        </td>
        <td style={td('LRTB', 'right', ROW_H + 4, SUB_BG_COLOR)}>
          <div style={css_text_font(9, undefined, false, false, true)}>
            ¥ {addFigure(String(data.total_amount ?? 0))}
          </div>
        </td>
      </tr>
      <tr>
        <td style={td('', 'left', REMARKS_REDUCED_H, undefined, 3)}>
          <div style={css_text_font(7)}>※は軽減税率対象です。</div>
        </td>
        <td style={td('', 'left', REMARKS_REDUCED_H)}>
          <div style={css_text_font(7)}></div>
        </td>
        <td style={td('', 'left', REMARKS_REDUCED_H)}>
          <div style={css_text_font(7)}></div>
        </td>
        <td style={td('', 'left', REMARKS_REDUCED_H)}>
          <div style={css_text_font(7)}></div>
        </td>
      </tr>
    </table>
  )
}

/** 備考欄（1ページ目固定Y座標） */
const renderFirstPageRemarks = (data: InvoiceEntry) => {
  return (
    <>
      <table style={absTable(20, REMARKS_LABEL_Y_FIRST, 100)}>
        <tr>
          <td style={td('', 'left', REMARKS_LABEL_H)}>
            <div style={css_text_font(9, 1, false, false, true)}>備考</div>
          </td>
        </tr>
      </table>
      <table style={absTable(20, REMARKS_CONTENT_Y_FIRST, 550)}>
        <tr>
          <td
            style={{
              ...td('LRTB', 'left', REMARKS_CONTENT_H),
              valign: 'top',
              verticalAlign: 'top',
              padding: '8px'
            }}
          >
            <div style={{ ...css_text_font(9), lineHeight: '1.5' }}>{data.remarks ?? ''}</div>
          </td>
        </tr>
      </table>
    </>
  )
}

/** ページ番号 */
const renderPageNumber = (pageNum: number, totalPages: number) => (
  <table style={absTable(490, 835, 80)}>
    <tr>
      <td style={td('', 'right', 14)}>
        <div style={css_text_font(8)}>
          {pageNum} / {totalPages}
        </div>
      </td>
    </tr>
  </table>
)

const getFirstPage = (
  data: InvoiceEntry,
  records: InvoiceRecord[],
  isLastPage: boolean,
  pageNum: number,
  totalPages: number
) => {
  const company = data.company ?? {}
  const formatZip = (zip?: string) => (zip ? zip.replace(/^(\d{3})(\d{4})$/, '$1-$2') : '')
  const addressLine1 = company.zip_code ? `〒${formatZip(company.zip_code)}` : ''
  const addressLine2 = [company.prefecture, company.city, company.address_line1]
    .filter(Boolean)
    .join('')
  const usedRows = records.reduce((acc, r) => acc + calcDescriptionLines(r.description), 0)
  const emptyRows = MAX_DATA_ROWS_FIRST - usedRows

  return (
    <div
      className="_page"
      style={
        {
          pagesize: 'A4',
          orientation: 'portrait',
          left: -30,
          right: -30,
          top: 30,
          bottom: 30,
          linecolor: '#000000'
        } as any
      }
    >
      {/* ===== 左上: 企業ロゴ（絶対座標、タイトルテーブルより前に描画） ===== */}
      {data.logoKey ? (
        <img
          src={data.logoKey}
          width={LOGO_W}
          height={LOGO_H}
          style={{ absolutex: String(LOGO_X), absolutey: String(LOGO_Y) } as any}
        />
      ) : null}

      {/* ===== タイトル ===== */}
      <table style={absTable(LAYOUT.title.x, LAYOUT.title.y, LAYOUT.title.w)}>
        <tr>
          <td
            style={{
              ...td('', 'center', LOGO_H),
              bgcolor: undefined,
              backgroundColor: 'transparent',
              valign: 'middle',
              paddingLeft: `${LOGO_W + 10}px`
            }}
          >
            <div style={{ ...css_text_font(18, 8, false, false), valign: undefined }}>
              {'御　請　求　書'}
            </div>
          </td>
        </tr>
      </table>

      {/* ===== 右側: 請求No・発行日 ===== */}
      {
        <table style={absTable(LAYOUT.pdf_info.x, LAYOUT.pdf_info.y, LAYOUT.pdf_info.w)}>
          <tr>
            <td style={td('', 'right', 7)}>
              <div style={css_text_font(9)}>御請求No : {data.invoice_code}</div>
            </td>
          </tr>
          {data.company?.registration_number ? (
            <tr>
              <td style={td('', 'right', 7)}>
                <div style={css_text_font(9)}>登録番号 : {data.company.registration_number}</div>
              </td>
            </tr>
          ) : null}
          <tr>
            <td style={td('', 'right', 7)}>
              <div style={css_text_font(9)}>
                発行日 :{' '}
                {(() => {
                  const d = new Date()
                  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
                })()}
              </div>
            </td>
          </tr>
        </table>
      }

      {/* ===== 右側: 角印（電話番号の下） ===== */}
      {/* company y=655, 行高さ合計73px(building_nameなし) → 電話番号下端: 655-73=582, 角印高さ40px → y=582-40-4=538 */}
      {data.stampKey ? (
        <img
          src={data.stampKey}
          width={40}
          height={40}
          style={
            {
              absolutex: String(LAYOUT.pdf_info.x + LAYOUT.pdf_info.w - 40),
              absolutey: '565'
            } as any
          }
        />
      ) : null}

      {/* ===== 右側: 会社情報 ===== */}
      <table style={absTable(LAYOUT.company.x, LAYOUT.company.y, LAYOUT.company.w)}>
        <tr>
          <td style={td('', 'right', 23)}>
            <div style={{ ...css_text_font(12, 1, false, false, true), paddingRight: '40px' }}>
              {company.company_name ?? ''}
            </div>
          </td>
        </tr>
        <tr>
          <td style={td('', 'right', 10)}>
            <div style={{ ...css_text_font(8), paddingRight: '10px' }}>{addressLine1}</div>
          </td>
        </tr>
        <tr>
          <td style={td('', 'right', 10)}>
            <div style={{ ...css_text_font(8), paddingRight: '10px' }}>{addressLine2}</div>
          </td>
        </tr>
        {company.building_name ? (
          <tr>
            <td style={td('', 'right', 10)}>
              <div style={{ ...css_text_font(8), paddingRight: '10px' }}>
                {company.building_name}
              </div>
            </td>
          </tr>
        ) : null}
        <tr>
          <td style={td('', 'right', 10)}>
            <div style={{ ...css_text_font(8), paddingRight: '10px' }}>
              TEL : {company.tel ?? ''}
            </div>
          </td>
        </tr>
      </table>

      {/* ===== 左側1: 宛先 ===== */}
      <table style={absTable(LAYOUT.customer.x, LAYOUT.customer.y, LAYOUT.customer.w)}>
        <tr>
          <td style={td('B', 'left', 28)}>
            <div style={css_text_font(13, 1, false, false, true)}>{data.customer_name}　御中</div>
          </td>
        </tr>
      </table>

      {/* ===== 左側2: 件名 ===== */}
      <table style={absTable(LAYOUT.subject.x, LAYOUT.subject.y, LAYOUT.subject.w)}>
        <tr>
          <td style={td('B', 'left', 22)}>
            <div style={css_text_font(9)}>{`件　名 : ${data.subject}`}</div>
          </td>
        </tr>
      </table>

      {/* ===== 左側3: 下記文 ===== */}
      <table style={absTable(LAYOUT.notice.x, LAYOUT.notice.y, LAYOUT.notice.w)}>
        <tr>
          <td style={td('', 'left', 18)}>
            <div style={css_text_font(9)}>下記の通り御請求申し上げます。</div>
          </td>
        </tr>
      </table>

      {/* ===== 左側4: 御請求金額 ===== */}
      <table style={absTable(LAYOUT.amount.x, LAYOUT.amount.y, LAYOUT.amount.w)}>
        <tr>
          <td style={{ ...td('B', 'left', 22), valign: 'top' }}>
            <div style={{ ...css_text_font(14, 1, false, false, true), valign: undefined }}>
              御請求金額：¥ {addFigure(String(data.total_amount ?? 0))}-
            </div>
          </td>
        </tr>
      </table>

      {/* ===== 左側5: 振込先・振込期日 ===== */}
      {data.bank ? (
        <table
          style={absTable(LAYOUT.bank.x, LAYOUT.bank.y, LAYOUT.bank.w, {
            cols: '2',
            widths: '25,75'
          })}
        >
          {/* 振込先行 */}
          <tr>
            <td style={td('LRTB', 'center', 45)}>
              <div style={css_text_font(8)}>振込先</div>
            </td>
            <td style={{ ...td('LRTB', 'left', 45), padding: '6px 10px' }}>
              <div style={{ ...css_text_font(9, 0.5, false, false), marginBottom: '2px' }}>
                {formatBankTitle(data.bank.bank_title)}　{data.bank.branch_name}支店
              </div>
              <div style={css_text_font(9)}>{bankTypeLabel(data.bank.bank_type)}</div>
              <div style={css_text_font(9)}>
                {data.bank.bank_number}　/　口座名義：{data.bank.bank_name}
              </div>
            </td>
          </tr>
          {/* 振込期日行 */}
          <tr>
            <td style={td('LRTB', 'center', 22)}>
              <div style={css_text_font(8)}>振込期日</div>
            </td>
            <td style={{ ...td('LRTB', 'left', 22), padding: '0 10px' }}>
              <div style={css_text_font(9)}>{formatDueDate(data.due_date)}</div>
            </td>
          </tr>
        </table>
      ) : null}

      {/* ===== 明細テーブル（データ行 + 空行パディング） ===== */}
      <table
        style={
          {
            absolutex: '20',
            absolutey: String(TABLE_Y_FIRST),
            border: '0.5',
            bordercolor: '#000000',
            width: '550',
            widths: '5,40,9,21,7,18',
            cols: '6',
            align: 'center'
          } as any
        }
      >
        {renderTableHeader()}
        {renderRecordRows(records, 0)}
        {renderEmptyRows(emptyRows, !isLastPage)}
      </table>

      {/* ===== 合計（最終ページのみ） ===== */}
      {isLastPage ? renderTotalTable(data, TOTAL_Y_FIRST) : null}

      {/* ===== 備考欄（1ページ目は常に表示） ===== */}
      {renderFirstPageRemarks(data)}

      {/* ===== ページ番号 ===== */}
      {renderPageNumber(pageNum, totalPages)}
    </div>
  )
}

const getContinuationPage = (
  data: InvoiceEntry,
  records: InvoiceRecord[],
  startIndex: number,
  isLastPage: boolean,
  pageNum: number,
  totalPages: number
) => {
  const usedRows = records.reduce((acc, r) => acc + calcDescriptionLines(r.description), 0)
  const emptyRows = MAX_DATA_ROWS_NEXT - usedRows
  return (
    <div
      className="_page"
      style={
        {
          pagesize: 'A4',
          orientation: 'portrait',
          left: -30,
          right: -30,
          top: 30,
          bottom: 30,
          linecolor: '#000000'
        } as any
      }
    >
      {/* ===== 明細テーブル（続き）（データ行 + 空行パディング） ===== */}
      <table
        style={
          {
            absolutex: '20',
            absolutey: String(TABLE_Y_NEXT),
            border: '0.5',
            bordercolor: '#000000',
            width: '550',
            widths: '5,40,9,21,7,18',
            cols: '6',
            align: 'center'
          } as any
        }
      >
        {renderTableHeader()}
        {renderRecordRows(records, startIndex)}
        {renderEmptyRows(emptyRows, !isLastPage)}
      </table>

      {/* ===== 合計（最終ページのみ） ===== */}
      {isLastPage ? renderTotalTable(data, TOTAL_Y_NEXT) : null}

      {/* ===== ページ番号 ===== */}
      {renderPageNumber(pageNum, totalPages)}
    </div>
  )
}

export const getHtmlTemplate = async (data: InvoiceEntry, file_name: string): Promise<string> => {
  console.log(data)
  const pages = paginateRecords(data.records)

  const totalPages = pages.length
  let startIndex = 0
  const pageElements: React.ReactNode[] = pages.map((pageRecords, i) => {
    const isLastPage = i === pages.length - 1
    const pageNum = i + 1
    const element =
      i === 0
        ? getFirstPage(data, pageRecords, isLastPage, pageNum, totalPages)
        : getContinuationPage(data, pageRecords, startIndex, isLastPage, pageNum, totalPages)
    startIndex += pageRecords.length
    return element
  })

  const html = (
    <html>
      <head>
        <meta name="pdf" content={'title=' + file_name} />
      </head>
      <body>{pageElements}</body>
    </html>
  )

  return await renderToStaticMarkup(html)
}
