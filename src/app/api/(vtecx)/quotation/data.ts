import { Entry } from 'typings'

/**
 * 見積書登録時のデータを編集
 * @param data 画面から送られてきたデータ（[entry]）
 * @param quotation_code 見積書コード（採番済み）
 * @returns VTECXの形式に整えたEntry配列
 */
export const editPostData = (data: any[], quotation_code: string, company_code: string, customerData?: { customer_code: string; customer_name: string; to_email: string; cc_email: string } | null): Entry[] => {
  const feed: Entry[] = []
  const source = data[0]

  const quotationEntry: any = {
    link: [
      {
        ___rel: 'self',
        ___href: `/quotation/${company_code}/${quotation_code}`
      }
    ],
    customer: customerData ?? (source.customer ?? undefined),
    quotation: {
      quotation_code: quotation_code,
      customer_name: source.quotation?.customer_name,
      subject: source.quotation?.subject,
      issue_date: source.quotation?.issue_date,
      delivery_date: source.quotation?.delivery_date,
      expiry_date: source.quotation?.expiry_date,
      payment_terms: source.quotation?.payment_terms,
      status: source.quotation?.status,
      remarks: source.quotation?.remarks,
      sub_total: Number(source.quotation?.sub_total),
      tax_amount: Number(source.quotation?.tax_amount),
      total_amount: Number(source.quotation?.total_amount)
    },
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
    record: (source.record || []).map((rec: any, index: number) => ({
      record_code: rec.record_code || `REC-${String(index + 1).padStart(2, '0')}`,
      description: rec.description,
      quantity: Number(rec.quantity),
      unit: rec.unit,
      unit_price: Number(rec.unit_price),
      tax_rate: rec.tax_rate != null ? Number(rec.tax_rate) : 10
    }))
  }

  feed.push(quotationEntry)
  return feed
}
