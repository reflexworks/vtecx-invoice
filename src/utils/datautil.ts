import VtecxApp from '@/typings'
import { v4 as uuidv4 } from 'uuid'
import lzstring from 'lz-string'

/** 全角数字・マイナスを半角に変換 */
export const toHalfWidthNumber = (value: string): string =>
  value.replace(/[０-９－]/g, (c) =>
    c === '－' ? '-' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  )

/** 数値以外の文字を除去して数値に変換（保存時用・全角対応） */
export const toSafeNumber = (value: string | number): number => {
  const half = toHalfWidthNumber(String(value))
  const sign = half.startsWith('-') ? '-' : ''
  const cleaned = half.replace(/[^0-9]/g, '')
  const num = Number(sign + cleaned)
  return isNaN(num) ? 0 : num
}

/** 全角→半角変換後に数値以外の文字を除去して文字列で返す（入力時用） */
export const toNumericString = (value: string): string => {
  const half = toHalfWidthNumber(value)
  const sign = half.startsWith('-') ? '-' : ''
  const digits = half.replace(/[^0-9]/g, '')
  return sign + digits
}

/** 銀行名に「銀行」「信用金庫」等の種別が含まれていない場合に「銀行」を補完する */
export const formatBankTitle = (title?: string): string => {
  if (!title) return ''
  const suffixes = ['銀行', '信用金庫', '信用組合', '農業協同組合', '漁業協同組合', '信託銀行', '労働金庫']
  if (suffixes.some((s) => title.endsWith(s))) return title
  return title + '銀行'
}

export const bankTypeLabel = (type?: string): string => {
  const map: Record<string, string> = { '1': '普通', '2': '当座', '4': '貯蓄' }
  return map[type ?? ''] ?? type ?? ''
}

export const formatDate = (dateVal: string | number | undefined, fallback = '-'): string => {
  if (!dateVal) return fallback
  const s = String(dateVal)
  if (s.length !== 8) return s
  return `${s.substring(0, 4)}/${s.substring(4, 6)}/${s.substring(6, 8)}`
}

export const setTimeNotation = (time: string | undefined) => {
  if (!time) return undefined

  const h = parseInt(time.slice(0, 2))
  const over_time = h - 24
  const label = h >= 24 ? '翌' + (over_time < 10 ? '0' + over_time : over_time) : time.slice(0, 2)
  const m = time.slice(2, 4)
  return label + ':' + m
}

export const getUuid = () => {
  return uuidv4()
}

export const urlToFile = async (url: string, filename: string, mimeType: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const blob = await response.blob()
    return new File([blob], filename, { type: mimeType })
  } catch (error) {
    console.error('Error converting URL to File:', error)
    return null
  }
}

export const getParam = (param_str: any) => {
  const array: string[] = param_str.split('&')
  const obj: { [id: string]: string } = {}
  array.map((param: string) => {
    const key = param.split('=')[0]
    const value = param.split('=')[1]
    obj[key] = value
  })
  return obj
}

export const getParamStr = (param: any) => {
  const array: string[] = []
  Object.keys(param).forEach((key: string) => {
    if (param[key]) array.push(`${key}=${param[key]}`)
  })
  return array.join('&')
}

export const compressToEncodedURIComponent = (str: string) => {
  return lzstring.compressToEncodedURIComponent(str)
}

export const decompressFromEncodedURIComponent = (str: string) => {
  return lzstring.decompressFromEncodedURIComponent(str)
}

export interface transformModificationDataProps {
  modification: VtecxApp.Entry[]
  is_fixed?: boolean
  datetime_of_fixed?: string | undefined | null
}

export function formatTime(total_minutes: string) {
  const num: number = parseInt(total_minutes)
  const h = Math.floor(num / 60)
  const m = num % 60

  // 1桁の場合に「0」を埋める（例: 5分 → 05分）
  const hDisplay = String(h)
  const mDisplay = String(m).padStart(2, '0')

  const res = `${hDisplay !== '0' ? `${hDisplay}時間` : ''}${mDisplay}分`
  return res === '00分' ? 'なし' : res
}
export function formatTimeArray(total_minutes: string) {
  const num: number = parseInt(total_minutes)
  const h = Math.floor(num / 60)
  const m = num % 60

  // 1桁の場合に「0」を埋める（例: 5分 → 05分）
  const hDisplay = String(h)
  const mDisplay = String(m).padStart(2, '0')

  return [hDisplay, mDisplay]
}
