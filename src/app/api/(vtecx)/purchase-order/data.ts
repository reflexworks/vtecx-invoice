import { Entry } from 'typings'

export const editPostData = (data: any[], purchase_order_code: string, company_code: string): Entry[] => {
  const source = data[0]

  const entry: any = {
    link: [{ ___rel: 'self', ___href: `/purchase_order/${company_code}/${purchase_order_code}` }],
    purchase_order: {
      purchase_order_code,
      customer_name: source.purchase_order?.customer_name,
      subject: source.purchase_order?.subject,
      issue_date: source.purchase_order?.issue_date,
      delivery_date: source.purchase_order?.delivery_date,
      delivery_location: source.purchase_order?.delivery_location,
      status: source.purchase_order?.status,
      remarks: source.purchase_order?.remarks,
      sub_total: Number(source.purchase_order?.sub_total),
      tax_amount: Number(source.purchase_order?.tax_amount),
      total_amount: Number(source.purchase_order?.total_amount)
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

  return [entry]
}
