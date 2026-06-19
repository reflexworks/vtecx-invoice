import React from 'react'
import { css_text_font } from '@/pdf/styles/css-common'
import { absTable, td } from '@/pdf/styles/layout'
import { addFigure, renderToStaticMarkup } from 'pdf/pdfutils'

const ROW_H = 14
const HEADER_H = 30
const TOTAL_ROW_H = 2 * ROW_H + (ROW_H + 4)

const TABLE_Y_FIRST = 530
const TABLE_Y_NEXT = 800
const BOTTOM_Y = 30

const REMARKS_CONTENT_H = 60
const REMARKS_LABEL_H = 16
const REMARKS_REDUCED_H = 12
const REMARKS_GAP = 4

const HEADER_COLOR = '#2f4f7f'
const SUB_BG_COLOR = '#fafafa'

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
const TOTAL_Y_FIRST = TABLE_Y_FIRST - HEADER_H - MAX_DATA_ROWS_FIRST * ROW_H
const REMARKS_REDUCED_Y_FIRST = TOTAL_Y_FIRST - TOTAL_ROW_H - REMARKS_GAP
const REMARKS_LABEL_Y_FIRST = REMARKS_REDUCED_Y_FIRST - REMARKS_REDUCED_H
const REMARKS_CONTENT_Y_FIRST = REMARKS_LABEL_Y_FIRST - REMARKS_LABEL_H

const MAX_DATA_ROWS_NEXT = Math.floor((TABLE_Y_NEXT - BOTTOM_Y - HEADER_H - TOTAL_ROW_H) / ROW_H)
const TOTAL_Y_NEXT = TABLE_Y_NEXT - HEADER_H - MAX_DATA_ROWS_NEXT * ROW_H

const _customerY = 758
const _subjectY = _customerY - 37
const _noticeY = _subjectY - 31
const _amountY = _noticeY - 27
const _termsY = _amountY - 28

const LOGO_W = 110
const LOGO_H = 31
const LOGO_X = 460
const LOGO_Y = 684

const LAYOUT = {
  title: { x: 20, y: 808, w: 550 },
  pdf_info: { x: 310, y: 755, w: 260 },
  company: { x: 310, y: 685, w: 260 },
  customer: { x: 20, y: _customerY, w: 270 },
  subject: { x: 20, y: _subjectY, w: 270 },
  notice: { x: 20, y: _noticeY, w: 270 },
  amount: { x: 20, y: _amountY, w: 300 },
  terms: { x: 20, y: _termsY, w: 275 }
} as const

type QuotationRecord = {
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  tax_rate?: number
}

type QuotationEntry = {
  quotation_code: string
  customer_name: string
  subject: string
  issue_date?: number
  delivery_date?: number
  expiry_date?: number
  payment_terms?: string
  remarks?: string
  sub_total?: number
  tax_amount?: number
  total_amount?: number
  records: QuotationRecord[]
  company?: {
    company_name?: string
    zip_code?: string
    prefecture?: string
    city?: string
    address_line1?: string
    building_name?: string
    tel?: string
  }
  logoKey?: string
  stampKey?: string
}

// 品名列の1行あたり全角文字数
const DESCRIPTION_COL_CHARS = 22

const calcDescriptionLines = (description?: string): number => {
  if (!description) return 1
  let fullWidthEquiv = 0
  for (const ch of description) {
    fullWidthEquiv += ch.charCodeAt(0) > 0x7e ? 1 : 0.5
  }
  return Math.max(1, Math.ceil(fullWidthEquiv / DESCRIPTION_COL_CHARS))
}

const paginateRecords = (records: QuotationRecord[]): QuotationRecord[][] => {
  if (records.length === 0) return [[]]
  const pages: QuotationRecord[][] = []
  let i = 0
  while (i < records.length) {
    const maxRows = pages.length === 0 ? MAX_DATA_ROWS_FIRST : MAX_DATA_ROWS_NEXT
    const remainingRowsNeeded = records
      .slice(i)
      .reduce((acc, r) => acc + calcDescriptionLines(r.description), 0)
    if (remainingRowsNeeded <= maxRows) {
      pages.push(records.slice(i))
      i = records.length
    } else {
      const effectiveMax = maxRows - 1
      let rowCount = 0
      let j = i
      while (j < records.length) {
        const lines = calcDescriptionLines(records[j].description)
        if (rowCount + lines > effectiveMax) break
        rowCount += lines
        j++
      }
      if (j === i) j = i + 1
      pages.push(records.slice(i, j))
      i = j
    }
  }
  return pages
}

const formatDate = (dateVal?: number): string => {
  if (!dateVal) return ''
  const s = String(dateVal)
  if (s.length !== 8) return s
  const year = parseInt(s.substring(0, 4))
  const month = parseInt(s.substring(4, 6))
  const day = parseInt(s.substring(6, 8))
  return `${year}年${month}月${day}日`
}

/** 明細テーブルヘッダ行 (No / 品名 / 数量 / 単位 / 単価(税抜) / 税率 / 金額(税抜)) */
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
      <div style={{ ...css_text_font(9, 1, false, false, true), color: '#FFFFFF' }}>単位</div>
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
const renderRecordRows = (records: QuotationRecord[], startIndex: number) =>
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
        <td style={td('LRTB', 'center', rowH)}>
          <div style={css_text_font(9)}>{r.unit ?? '式'}</div>
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

/** 空行（パディング用） */
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
        <td style={td('LRTB', 'center', ROW_H)}>
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

/** 税率区分サマリー＋小計・消費税・合計テーブル */
const renderTotalTable = (data: QuotationEntry, y: number) => {
  const sub10 = data.records.reduce(
    (sum, r) =>
      r.tax_rate === 10 || r.tax_rate == null ? sum + (r.quantity ?? 0) * (r.unit_price ?? 0) : sum,
    0
  )
  const sub8 = data.records.reduce(
    (sum, r) => (r.tax_rate === 8 ? sum + (r.quantity ?? 0) * (r.unit_price ?? 0) : sum),
    0
  )
  const tax10 = Math.floor(sub10 * 0.1)
  const tax8 = Math.floor(sub8 * 0.08)
  return (
    <table
      style={
        {
          absolutex: '20',
          absolutey: String(y),
          border: '0.5',
          bordercolor: '#000000',
          width: '550',
          widths: '18,13,14,19,20,16',
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
          <div style={css_text_font(10, 1, false, false, true)}>{'お見積り金額(税込)'}</div>
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
const renderFirstPageRemarks = (data: QuotationEntry) => {
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
  data: QuotationEntry,
  records: QuotationRecord[],
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
      {/* ===== 企業ロゴ ===== */}
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
              {'見　積　書'}
            </div>
          </td>
        </tr>
      </table>

      {/* ===== 右側: 見積番号・見積日 ===== */}
      <table style={absTable(LAYOUT.pdf_info.x, LAYOUT.pdf_info.y, LAYOUT.pdf_info.w)}>
        <tr>
          <td style={td('', 'right', 18)}>
            <div style={css_text_font(9)}>見積番号 : {data.quotation_code}</div>
          </td>
        </tr>
        <tr>
          <td style={td('', 'right', 18)}>
            <div style={css_text_font(9)}>
              見積日 :{' '}
              {data.issue_date
                ? formatDate(data.issue_date)
                : (() => {
                    const d = new Date()
                    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
                  })()}
            </div>
          </td>
        </tr>
      </table>

      {/* ===== 右側: 角印（電話番号の下） ===== */}
      {data.stampKey ? (
        <img
          src={data.stampKey}
          width={40}
          height={40}
          style={
            {
              absolutex: String(LAYOUT.pdf_info.x + LAYOUT.pdf_info.w - 40),
              absolutey: '555'
            } as any
          }
        />
      ) : null}

      {/* ===== 右側: 会社情報 ===== */}
      <table style={absTable(LAYOUT.company.x, LAYOUT.company.y, LAYOUT.company.w)}>
        <tr>
          <td style={td('', 'right', 25)}>
            <div style={{ ...css_text_font(12, 1, false, false, true), paddingRight: '40px' }}>
              {company.company_name ?? ''}
            </div>
          </td>
        </tr>
        <tr>
          <td style={td('', 'right', 16)}>
            <div style={{ ...css_text_font(8), paddingRight: '10px' }}>{addressLine1}</div>
          </td>
        </tr>
        <tr>
          <td style={td('', 'right', 16)}>
            <div style={{ ...css_text_font(8), paddingRight: '10px' }}>{addressLine2}</div>
          </td>
        </tr>
        {company.building_name ? (
          <tr>
            <td style={td('', 'right', 16)}>
              <div style={{ ...css_text_font(8), paddingRight: '10px' }}>
                {company.building_name}
              </div>
            </td>
          </tr>
        ) : null}
        <tr>
          <td style={td('', 'right', 16)}>
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
            <div style={css_text_font(9)}>下記の通り、お見積り申し上げます。</div>
          </td>
        </tr>
      </table>

      {/* ===== 左側4: お見積り金額 ===== */}
      <table style={absTable(LAYOUT.amount.x, LAYOUT.amount.y, LAYOUT.amount.w)}>
        <tr>
          <td style={{ ...td('B', 'left', 22), valign: 'top' }}>
            <div style={{ ...css_text_font(14, 1, false, false, true), valign: undefined }}>
              お見積り金額：¥ {addFigure(String(data.total_amount ?? 0))}-
            </div>
          </td>
        </tr>
      </table>

      {/* ===== 左側5: 納期・支払条件・有効期限 ===== */}
      <table
        style={absTable(LAYOUT.terms.x, LAYOUT.terms.y, LAYOUT.terms.w, {
          cols: '2',
          widths: '25,75'
        })}
      >
        <tr>
          <td style={td('LRTB', 'center', 22)}>
            <div style={css_text_font(8)}>納期</div>
          </td>
          <td style={{ ...td('LRTB', 'left', 22), padding: '0 10px' }}>
            <div style={css_text_font(9)}>{formatDate(data.delivery_date)}</div>
          </td>
        </tr>
        <tr>
          <td style={td('LRTB', 'center', 22)}>
            <div style={css_text_font(8)}>支払条件</div>
          </td>
          <td style={{ ...td('LRTB', 'left', 22), padding: '0 10px' }}>
            <div style={css_text_font(9)}>{data.payment_terms ?? ''}</div>
          </td>
        </tr>
        <tr>
          <td style={td('LRTB', 'center', 22)}>
            <div style={css_text_font(8)}>有効期限</div>
          </td>
          <td style={{ ...td('LRTB', 'left', 22), padding: '0 10px' }}>
            <div style={css_text_font(9)}>{formatDate(data.expiry_date)}</div>
          </td>
        </tr>
      </table>

      {/* ===== 明細テーブル ===== */}
      <table
        style={
          {
            absolutex: '20',
            absolutey: String(TABLE_Y_FIRST),
            border: '0.5',
            bordercolor: '#000000',
            width: '550',
            widths: '5,37,9,8,18,7,16',
            cols: '7',
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
  data: QuotationEntry,
  records: QuotationRecord[],
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
      <table
        style={
          {
            absolutex: '20',
            absolutey: String(TABLE_Y_NEXT),
            border: '0.5',
            bordercolor: '#000000',
            width: '550',
            widths: '5,37,9,8,18,7,16',
            cols: '7',
            align: 'center'
          } as any
        }
      >
        {renderTableHeader()}
        {renderRecordRows(records, startIndex)}
        {renderEmptyRows(emptyRows, !isLastPage)}
      </table>

      {isLastPage ? renderTotalTable(data, TOTAL_Y_NEXT) : null}

      {renderPageNumber(pageNum, totalPages)}
    </div>
  )
}

export const getHtmlTemplate = async (data: QuotationEntry, file_name: string): Promise<string> => {
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
    return <React.Fragment key={`page-${i}`}>{element}</React.Fragment>
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
