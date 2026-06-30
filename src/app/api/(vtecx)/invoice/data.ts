import { Entry } from 'typings' // または適切な型定義パス
//import { CAO_CODE } from '@/utils/apiconst'

/**
 * 請求書登録時のデータを編集
 * @param data 画面から送られてきたデータ（[entry]）
 * @param invoice_code 請求書コード（採番済み）
 * @returns VTECXの形式に整えたEntry配列
 */
export const editPostData = (data: any[], invoice_code: string, company_code: string): Entry[] => {
  const feed: Entry[] = []
  const source = data[0]

  // 1. 請求書メインデータ (invoice)
  const invoiceEntry: any = {
    link: [
      {
        ___rel: 'self',
        ___href: `/invoice/${company_code}/${invoice_code}`
      }
    ],
    // アクセス権限の設定 (参考ソースの作法を継承)
    //contributor: [
    //{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' },
    //{ uri: `urn:vte.cx:acl:/_group/${CAO_CODE},CRUDE/` },
    // { uri: 'urn:vte.cx:acl:+,RE/' }
    //],
    invoice: {
      invoice_code: invoice_code,
      customer_name: source.invoice?.customer_name,
      subject: source.invoice?.subject,
      issue_date: source.invoice?.issue_date,
      due_date: source.invoice?.due_date,
      status: source.invoice?.status, // || 'draft',
      remarks: source.invoice?.remarks,
      sub_total: Number(source.invoice?.sub_total),
      tax_amount: Number(source.invoice?.tax_amount),
      total_amount: Number(source.invoice?.total_amount)
    },
    quotation: source.quotation?.quotation_code
      ? { quotation_code: source.quotation.quotation_code }
      : undefined,
    bank: source.bank
      ? {
          bank_code: source.bank.bank_code,
          bank_title: source.bank.bank_title,
          branch_code: source.bank.branch_code,
          branch_name: source.bank.branch_name,
          bank_type: source.bank.bank_type,
          bank_number: source.bank.bank_number,
          bank_name: source.bank.bank_name,
          due_date: source.bank.due_date
        }
      : undefined,
    company: source.company
      ? {
          company_name: source.company.company_name,
          zip_code: source.company.zip_code,
          prefecture: source.company.prefecture,
          city: source.company.city,
          address_line1: source.company.address_line1,
          building_name: source.company.building_name,
          tel: source.company.tel,
          registration_number: source.company.registration_number
        }
      : undefined,
    // 明細データ (record)
    record: (source.record || []).map((rec: any, index: number) => ({
      record_code: rec.record_code || `REC-${String(index + 1).padStart(2, '0')}`,
      description: rec.description,
      quantity: Number(rec.quantity),
      unit: rec.unit,
      unit_price: Number(rec.unit_price),
      tax_rate: rec.tax_rate != null ? Number(rec.tax_rate) : 10
    }))

    /*
    record: (source.record || []).map((rec: any, index: number) => ({
      record_code: rec.record_code || `REC-${String(index + 1).padStart(2, '0')}`,
      description: rec.description,
      quantity: Number(rec.quantity),
      unit_price: Number(rec.unit_price)
    }))
    */
  }

  console.log(invoiceEntry)

  feed.push(invoiceEntry)

  return feed
}
