// vte.cx PDF 用 共通ヘルパ（決定版）
import type React from 'react'

export type PdfStyle = React.CSSProperties & { [key: string]: string | number | undefined }

export function asPdfStyle<T extends Record<string, unknown>>(o: T): PdfStyle {
  const entries = Object.entries(o).map(([k, v]) => {
    if (typeof v === 'number' || typeof v === 'boolean') return [k, String(v)]
    return [k, (v ?? '') as any]
  })
  return Object.fromEntries(entries) as PdfStyle
}

export function absTopRightRaw(x: number, yTop: number, h = 0, pageH = 842) {
  return { absolutex: x, absolutey: pageH - (yTop + h) }
}

export function absRightTopWithMargin(
  x: number,
  yTop: number,
  h: number,
  pageH = 842,
  left = 36,
  top = 36
) {
  return asPdfStyle(absTopRightRaw(left + x, top + yTop, h, pageH))
}

export function absTopRight(x: number, yTop: number, h = 0, pageH = 842) {
  return asPdfStyle(absTopRightRaw(x, yTop, h, pageH))
}

/* ========================== ページ/文字 ========================== */

export const css_page = (opts: {
  pagesize?: string
  orientation?: 'portrait' | 'landscape'
  left?: number
  right?: number
  top?: number
  bottom?: number
  font?: 'HeiseiKakuGo-W5' | 'HeiseiMin-W3' | 'KozMinPro-Regular'
  fontsize?: number
  fontcolor?: string
  fontstyle?: string | string[]
  bgcolor?: string
}) => {
  const { fontstyle, ...rest } = opts
  return asPdfStyle({
    ...rest,
    ...(fontstyle ? { fontstyle: Array.isArray(fontstyle) ? fontstyle.join(',') : fontstyle } : {})
  })
}

export const css_text_font = (
  fontsize: number,
  space = 0,
  opts?: {
    font?: 'HeiseiKakuGo-W5' | 'HeiseiMin-W3' | 'KozMinPro-Regular'
    fontcolor?: string
    fontstyle?: string | string[]
    bgcolor?: string
  }
) => {
  const { fontstyle, ...rest } = opts || {}
  return asPdfStyle({
    fontsize,
    space,
    ...rest,
    ...(fontstyle ? { fontstyle: Array.isArray(fontstyle) ? fontstyle.join(',') : fontstyle } : {})
  })
}

/* ========================== テーブル ========================== */

export const css_td = (opts: {
  colspan?: number
  rowspan?: number
  pad?: { top?: number; left?: number; right?: number; bottom?: number }
  border?: number
  borderColor?: string
  sides?: Partial<{ top: boolean; left: boolean; right: boolean; bottom: boolean }>
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  nowrap?: boolean
  leading?: number
  space?: number
  font?: 'HeiseiKakuGo-W5' | 'HeiseiMin-W3' | 'KozMinPro-Regular'
  fontsize?: number
  fontcolor?: string
  bgcolor?: string
  fontstyle?: string | string[]
}) => {
  const { fontstyle, ...rest } = opts
  const s: Record<string, unknown> = {}
  if (rest.colspan) s.colspan = rest.colspan
  if (rest.rowspan) s.rowspan = rest.rowspan
  if (rest.pad?.top != null) s.paddingtop = rest.pad.top
  if (rest.pad?.left != null) s.paddingleft = rest.pad.left
  if (rest.pad?.right != null) s.paddingright = rest.pad.right
  if (rest.pad?.bottom != null) s.paddingbottom = rest.pad.bottom
  if (rest.border != null) s.border = rest.border
  if (rest.borderColor) s.bordercolor = rest.borderColor
  if (rest.sides?.top != null) s.top = rest.sides.top
  if (rest.sides?.left != null) s.left = rest.sides.left
  if (rest.sides?.right != null) s.right = rest.sides.right
  if (rest.sides?.bottom != null) s.bottom = rest.sides.bottom
  if (rest.align) s.align = rest.align
  if (rest.valign) s.valign = rest.valign
  if (rest.nowrap != null) s.nowrap = rest.nowrap
  if (rest.leading != null) s.leading = rest.leading
  if (rest.space != null) s.space = rest.space
  if (rest.font) s.font = rest.font
  if (rest.fontsize != null) s.fontsize = rest.fontsize
  if (rest.fontcolor) s.fontcolor = rest.fontcolor
  if (rest.bgcolor) s.bgcolor = rest.bgcolor
  if (fontstyle) s.fontstyle = Array.isArray(fontstyle) ? fontstyle.join(',') : fontstyle
  return asPdfStyle(s)
}

export const css_table = (opts: {
  cols: number
  width?: number
  widths?: number[] | readonly number[] | string
  abs?: { x: number; yTop: number; h?: number; pageH?: number }
  cellpad?: { all?: number; top?: number; left?: number; right?: number; bottom?: number }
  border?: { width?: number; color?: string }
  sidesDefault?: Partial<{ top: boolean; left: boolean; right: boolean; bottom: boolean }>
  bgColor?: string
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  nowrap?: boolean
  leading?: number
  space?: number
  indentLeft?: number
  indentRight?: number
  font?: 'HeiseiKakuGo-W5' | 'HeiseiMin-W3' | 'KozMinPro-Regular'
  fontsize?: number
  fontcolor?: string
  fontstyle?: string | string[]
}) => {
  const s: Record<string, unknown> = { cols: opts.cols }
  if (opts.width != null) s.width = opts.width
  if (opts.widths) s.widths = Array.isArray(opts.widths) ? opts.widths.join(',') : opts.widths
  if (opts.abs) {
    const { x, yTop, h = 0, pageH = 842 } = opts.abs
    const { absolutex, absolutey } = absTopRightRaw(x, yTop, h, pageH)
    s.absolutex = absolutex
    s.absolutey = absolutey
  }
  if (opts.cellpad?.all != null) s.cellpadding = opts.cellpad.all
  if (opts.cellpad?.top != null) s.paddingtop = opts.cellpad.top
  if (opts.cellpad?.left != null) s.paddingleft = opts.cellpad.left
  if (opts.cellpad?.right != null) s.paddingright = opts.cellpad.right
  if (opts.cellpad?.bottom != null) s.paddingbottom = opts.cellpad.bottom
  if (opts.border?.width != null) s.border = opts.border.width
  if (opts.border?.color) s.bordercolor = opts.border.color
  if (opts.sidesDefault?.top != null) s.top = opts.sidesDefault.top
  if (opts.sidesDefault?.left != null) s.left = opts.sidesDefault.left
  if (opts.sidesDefault?.right != null) s.right = opts.sidesDefault.right
  if (opts.sidesDefault?.bottom != null) s.bottom = opts.sidesDefault.bottom
  if (opts.bgColor) s.bgcolor = opts.bgColor
  if (opts.align) s.align = opts.align
  if (opts.valign) s.valign = opts.valign
  if (opts.nowrap != null) s.nowrap = opts.nowrap
  if (opts.leading != null) s.leading = opts.leading
  if (opts.space != null) s.space = opts.space
  if (opts.indentLeft != null) s.indent = opts.indentLeft
  if (opts.indentRight != null) s.indentright = opts.indentRight
  if (opts.font) s.font = opts.font
  if (opts.fontsize != null) s.fontsize = opts.fontsize
  if (opts.fontcolor) s.fontcolor = opts.fontcolor
  if (opts.fontstyle)
    s.fontstyle = Array.isArray(opts.fontstyle) ? opts.fontstyle.join(',') : opts.fontstyle
  return asPdfStyle(s)
}

/* ========================== 図形/線（_page直下） ========================== */

function yFromTop(yTop: number, pageH = 842) {
  return pageH - yTop
}
function withMargin(x: number, yTop: number, pageH = 842, m = { left: 36, top: 36 }) {
  const X = m.left + x
  const YTop = m.top + yTop
  return { x: X, yTop: YTop, yPdf: yFromTop(YTop, pageH) }
}

export const lineTopLeft = (opts: {
  x1: number
  y1Top: number
  x2: number
  y2Top: number
  pageH?: number
  margin?: { left: number; top: number }
  linewidth?: number
  color?: string
  linedushon?: number
  linedushoff?: number
}) => {
  const pageH = opts.pageH ?? 842
  const m = opts.margin ?? { left: 36, top: 36 }
  const p1 = withMargin(opts.x1, opts.y1Top, pageH, m)
  const p2 = withMargin(opts.x2, opts.y2Top, pageH, m)
  return asPdfStyle({
    x1: p1.x,
    y1: p1.yPdf,
    x2: p2.x,
    y2: p2.yPdf,
    linewidth: opts.linewidth ?? 1,
    color: opts.color ?? '#000000',
    linedushon: opts.linedushon,
    linedushoff: opts.linedushoff
  })
}

export const rectangleTopLeft = (opts: {
  x: number
  yTop: number
  width: number
  height: number
  pageH?: number
  margin?: { left: number; top: number }
  linewidth?: number
  color?: string
  colorfill?: string
  linedushon?: number
  linedushoff?: number
}) => {
  const pageH = opts.pageH ?? 842
  const m = opts.margin ?? { left: 36, top: 36 }
  const abs = withMargin(opts.x, opts.yTop + opts.height, pageH, m)
  return asPdfStyle({
    linewidth: opts.linewidth ?? 1,
    width: opts.width,
    height: opts.height,
    color: opts.color ?? '#000000',
    colorfill: opts.colorfill ?? '#FFFFFF',
    absolutex: abs.x,
    absolutey: abs.yPdf,
    linedushon: opts.linedushon,
    linedushoff: opts.linedushoff
  })
}

export const circleTopLeft = (opts: {
  cx: number
  cyTop: number
  radius: number
  pageH?: number
  margin?: { left: number; top: number }
  linewidth?: number
  color?: string
  colorfill?: string
  linedushon?: number
  linedushoff?: number
}) => {
  const pageH = opts.pageH ?? 842
  const m = opts.margin ?? { left: 36, top: 36 }
  const c = withMargin(opts.cx, opts.cyTop, pageH, m)
  return asPdfStyle({
    linewidth: opts.linewidth ?? 1,
    radius: opts.radius,
    color: opts.color ?? '#000000',
    colorfill: opts.colorfill ?? '#FFFFFF',
    absolutex: c.x,
    absolutey: c.yPdf,
    linedushon: opts.linedushon,
    linedushoff: opts.linedushoff
  })
}

/* ========================== PDFメタ ========================== */

type PdfMeta = Partial<{
  title: string
  author: string
  subject: string
  keywords: string
  password: string
  ownerpassword: string
  allowprinting: boolean
  allowmodifycontents: boolean
  allowcopy: boolean
  allowmodifyannotations: boolean
  allowfillin: boolean
  allowscreenreaders: boolean
  allowassembly: boolean
  version: '1.2' | '1.3' | '1.4' | '1.5' | '1.6' | '1.7'
  signature: string
  signaturepassword: string
  signaturereason: string
  signaturelocation: string
  timestamp: string
  timestampusername: string
  timestamppassword: string
}>
export function buildPdfMeta(m: PdfMeta) {
  const kv = Object.entries(m)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${String(v)}`)
  return kv.join(',')
}
