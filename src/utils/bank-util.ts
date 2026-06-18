import zengin from 'zengin-code'

// 銀行リストの取得
export const getBankList = () => {
  return Object.keys(zengin).map((code) => ({
    code: code,
    name: zengin[code].name,
    kana: zengin[code].kana
  }))
}

// 特定銀行の支店リストの取得
export const getBranchList = (bankCode: string) => {
  const bank = zengin[bankCode]
  if (!bank) return []
  return Object.keys(bank.branches).map((code) => ({
    code: code,
    name: bank.branches[code].name,
    kana: bank.branches[code].kana
  }))
}
