// Invoice_SCO202509X_withStampAlign_fixed.tsx
import React from 'react'
import {
  css_page,
  css_table,
  css_td,
  css_text_font,
  asPdfStyle,
  absRightTopWithMargin
} from './css'

/** ====== ノブ（ここだけで微調整） ====== */
const pageH = 842
const M = { left: 36, right: 36, top: 36, bottom: 36 }

// 見出し
const TITLE = { x: 236, y: 6, h: 24 }

// 左カラム（宛先/件名/期日/注意）
const L_INFO = { x: 0, y: 68, w: 300, widths: [3, 9] as number[] }

// 右カラム（発行情報／会社情報）
const GAP = 6
const R_W = 523 - (L_INFO.w + GAP)
const R_TOP = { x: L_INFO.x + L_INFO.w + GAP, y: 68, w: R_W, widths: [4, 6] as number[] }
const R_BTM = { x: R_TOP.x, y: 128, w: R_W, widths: [4, 6] as number[] }

// 印影
const STAMP = { key: 'https://morishita-invoice.vte.cx/img/stamp.png', w: 72, h: 72 }

// ★ ご請求金額ボックス：明示的に“上へ”固定（必要に応じてここを微調整）
const AMT_TBL = { x: 0, y: 180, w: L_INFO.w } // ← 以前は 148 付近。上げる=数値を小さく

// 明細
const ITEMS = { x: 0, y: 330, w: 523, widths: [2, 5, 2, 2, 3, 3, 2] as number[] }
const BLANK_ROWS = 10
/** ====================================== */

export const Invoice_SCO202509X_v2: React.FC = () => (
  <div
    className="_page"
    style={css_page({
      pagesize: 'A4',
      orientation: 'portrait',
      left: M.left,
      right: M.right,
      top: M.top,
      bottom: M.bottom,
      font: 'HeiseiKakuGo-W5',
      fontsize: 12,
      fontcolor: '#222222',
      bgcolor: '#FAFAFA'
    })}
  >
    {/* 見出し */}
    <p
      style={asPdfStyle({
        ...css_text_font(22, 0, { fontstyle: 'bold' }),
        ...absRightTopWithMargin(TITLE.x, TITLE.y, TITLE.h, pageH, M.left, M.top)
      })}
    >
      請求書
    </p>

    {/* 左カラム：宛先/件名/期日/注意 */}
    <table
      style={css_table({
        cols: 2,
        width: L_INFO.w,
        widths: L_INFO.widths,
        abs: { x: M.left + L_INFO.x, yTop: M.top + L_INFO.y, pageH },
        border: { width: 0.5, color: '#BDBDBD' },
        cellpad: { all: 4 },
        align: 'left',
        valign: 'middle',
        fontsize: 11,
        nowrap: false
      })}
    >
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>宛先</span>
        </td>
        <td>
          <span>〇〇株式会社 御中</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>件名</span>
        </td>
        <td>
          <span>最新技術動向調査支援</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>振込期日</span>
        </td>
        <td>
          <span>2025年10月末日</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>注意</span>
        </td>
        <td>
          <p style={css_text_font(9, 0)}>振込手数料は御社のご負担にてお願いいたします。</p>
        </td>
      </tr>
    </table>

    {/* 宛先の真下：ご請求金額（★固定 yTop=132） */}
    <table
      style={css_table({
        cols: 1,
        width: AMT_TBL.w,
        widths: [1],
        abs: { x: M.left + AMT_TBL.x, yTop: M.top + AMT_TBL.y, pageH },
        border: { width: 0.8, color: '#555555' },
        cellpad: { all: 6 },
        align: 'left',
        valign: 'middle'
      })}
    >
      <tr>
        <td style={css_td({ bgcolor: '#FFF3CD' })}>
          <p style={css_text_font(10, 0, { fontcolor: '#444' })}>ご請求金額（税込）</p>
          <p style={css_text_font(22, 0, { fontstyle: 'bold', fontcolor: '#D35400' })}>¥121,000</p>
        </td>
      </tr>
    </table>

    {/* 右カラム：発行情報 */}
    <table
      style={css_table({
        cols: 2,
        width: R_TOP.w,
        widths: R_TOP.widths,
        abs: { x: M.left + R_TOP.x, yTop: M.top + R_TOP.y, pageH },
        border: { width: 0.5, color: '#BDBDBD' },
        cellpad: { all: 3 },
        align: 'left',
        valign: 'middle',
        fontsize: 10,
        nowrap: false
      })}
    >
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>発行日</span>
        </td>
        <td>
          <span>2025/9/30</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>請求番号</span>
        </td>
        <td>
          <span>SCO202509</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>登録番号</span>
        </td>
        <td>
          <span>T123456</span>
        </td>
      </tr>
    </table>

    {/* 右カラム：会社情報 + 印影（印影セルのみ枠線ゼロ） */}
    <table
      style={css_table({
        cols: 2,
        width: R_BTM.w,
        widths: R_BTM.widths,
        abs: { x: M.left + R_BTM.x, yTop: M.top + R_BTM.y, pageH },
        border: { width: 0.5, color: '#BDBDBD' },
        cellpad: { all: 3 },
        align: 'left',
        valign: 'middle',
        fontsize: 10,
        nowrap: false
      })}
    >
      <tr>
        <td style={css_td({ colspan: 2, bgcolor: '#FFF7E6', fontstyle: 'bold' })}>
          <span>有限会社テスト</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>住所</span>
        </td>
        <td>
          <p style={css_text_font(9, 0)}>〒123-4567 東京都千代田区1-2-3</p>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>電話</span>
        </td>
        <td>
          <span>090-1233-5678</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ bgcolor: '#EEF4FF', fontstyle: 'bold' })}>
          <span>振込先</span>
        </td>
        <td>
          <p style={css_text_font(9, 0)}>〇〇銀行 〇〇支店</p>
          <p style={css_text_font(9, 0)}>普通 123456</p>
          <p style={css_text_font(9, 0)}>（ユ）テスト</p>
        </td>
      </tr>
      <tr>
        <td
          style={css_td({
            colspan: 2,
            align: 'right',
            border: 0,
            sides: { top: false, left: false, right: false, bottom: false }
          })}
        >
          <img src={STAMP.key} style={asPdfStyle({ plainwidth: STAMP.w, plainheight: STAMP.h })} />
        </td>
      </tr>
    </table>

    {/* 明細 */}
    <table
      style={css_table({
        cols: 7,
        width: ITEMS.w,
        widths: ITEMS.widths,
        abs: { x: M.left + ITEMS.x, yTop: M.top + ITEMS.y, pageH },
        border: { width: 0.5, color: '#999999' },
        cellpad: { all: 3 },
        align: 'center',
        valign: 'middle',
        fontsize: 10,
        nowrap: false
      })}
    >
      {/* ヘッダ */}
      <tr>
        {['日付', '内容', '数量', '単位', '単価（税抜）', '金額（税抜）', '税率'].map((t, i) => (
          <td key={i} style={css_td({ fontstyle: 'bold', bgcolor: '#EEF4FF' })}>
            <span>{t}</span>
          </td>
        ))}
      </tr>

      {/* サンプル1行 */}
      <tr>
        <td>
          <span>2025/9/30</span>
        </td>
        <td style={css_td({ align: 'left' })}>
          <span>調査支援</span>
        </td>
        <td>
          <span>1</span>
        </td>
        <td>
          <span>式</span>
        </td>
        <td style={css_td({ align: 'right' })}>
          <span>¥110,000</span>
        </td>
        <td style={css_td({ align: 'right' })}>
          <span>¥110,000</span>
        </td>
        <td>
          <span>10%</span>
        </td>
      </tr>

      {/* 空白行（全角スペース1つ） */}
      {Array.from({ length: BLANK_ROWS }).map((_, idx) => (
        <tr key={`blank-${idx}`}>
          {Array.from({ length: 7 }).map((__, i) => (
            <td key={i}>
              <span>　</span>
            </td>
          ))}
        </tr>
      ))}

      {/* 小計/税/合計 */}
      <tr>
        <td style={css_td({ colspan: 6, align: 'right', bgcolor: '#F7F7F7' })}>
          <span>小計</span>
        </td>
        <td style={css_td({ align: 'right' })}>
          <span>¥110,000</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ colspan: 6, align: 'right', bgcolor: '#F7F7F7' })}>
          <span>消費税</span>
        </td>
        <td style={css_td({ align: 'right' })}>
          <span>¥11,000</span>
        </td>
      </tr>
      <tr>
        <td style={css_td({ colspan: 6, align: 'right', bgcolor: '#FFF0F0', fontstyle: 'bold' })}>
          <span>合計</span>
        </td>
        <td style={css_td({ align: 'right', bgcolor: '#FFF0F0', fontstyle: 'bold' })}>
          <span>¥121,000</span>
        </td>
      </tr>

      {/* 空き1行 */}
      <tr>
        <td style={css_td({ colspan: 7 })}>
          <span>　</span>
        </td>
      </tr>

      {/* 税率区分（外枠なし、内側のみ線） */}
      <tr>
        <td style={css_td({ colspan: 7, align: 'left' })}>
          <table
            style={css_table({
              cols: 4,
              width: 420,
              widths: [3, 3, 3, 3] as number[],
              border: { width: 0.8, color: '#999999' },
              cellpad: { all: 3 },
              align: 'center',
              valign: 'middle',
              fontsize: 10,
              nowrap: true
            })}
          >
            <tr>
              {['税率区分', '10%対象', '8%対象', '消費税'].map((t, i) => (
                <td
                  key={i}
                  style={css_td({
                    fontstyle: 'bold',
                    bgcolor: '#EEF4FF',
                    sides: {
                      top: false,
                      left: i === 0 ? false : true,
                      right: i === 3 ? false : true,
                      bottom: true
                    }
                  })}
                >
                  <span>{t}</span>
                </td>
              ))}
            </tr>
            <tr>
              {['※は軽減税率対象です。', '¥110,000', '¥0', '¥11,000'].map((v, i) => (
                <td
                  key={i}
                  style={css_td({
                    sides: {
                      top: true,
                      left: i === 0 ? false : true,
                      right: i === 3 ? false : true,
                      bottom: false
                    }
                  })}
                >
                  <span>{v}</span>
                </td>
              ))}
            </tr>
          </table>
        </td>
      </tr>

      {/* 備考（外枠なし、区切り線のみ） */}
      <tr>
        <td style={css_td({ colspan: 7, align: 'left' })}>
          <table
            style={css_table({
              cols: 1,
              width: 523,
              widths: [1],
              border: { width: 0.8, color: '#999999' },
              cellpad: { all: 6 },
              align: 'left',
              valign: 'middle'
            })}
          >
            <tr>
              <td
                style={css_td({
                  bgcolor: '#EEF4FF',
                  fontstyle: 'bold',
                  sides: { top: false, left: false, right: false, bottom: true }
                })}
              >
                <span>備考</span>
              </td>
            </tr>
            <tr>
              <td
                style={css_td({ sides: { top: true, left: false, right: false, bottom: false } })}
              >
                <p style={css_text_font(10, 0)}>
                  住所：〒123-4567 東京都千代田区1-2-3　/　電話：090-1234-5678
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
)

/** ====== SSRユーティリティ ====== */
export const renderToStaticMarkup = async (component: any) => {
  const ReactDOMServer = (await import('react-dom/server')).default
  return ReactDOMServer.renderToStaticMarkup(component)
}

export const getHtmlTemplate = async (file_name: string) => {
  const element = (
    <html>
      <head>
        <meta name="pdf" content={'title=' + file_name} />
      </head>
      <body>
        <Invoice_SCO202509X_v2 />
      </body>
    </html>
  )
  return renderToStaticMarkup(element)
}
