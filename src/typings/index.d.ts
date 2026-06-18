export = VtecxApp
export as namespace VtecxApp

declare namespace VtecxApp {
	interface Request {
		feed: Feed
	}
	interface MessageResponse {
		feed: Feed
	}
	interface Feed {
		entry?: Entry[],
		title?: string,
		subtitle?: string,
		rights?: string
	}
	interface Entry {
		id?: string,
		title?: string,
		subtitle?: string,
		rights?: string,
		summary?: string,
		content?: Content,
		link?: Link[],
		contributor?: Contributor[],
		published?: string,
		updated?: string,
		invoice?:Invoice,
		record?:Record[],
		bank?:Bank,
		company?:Company,
		user?:User,
		quotation?:Quotation,
		company_group?:Company_group,
		purchase_order?:Purchase_order,
		customer?:Customer,
		customer_email?:Customer_email[]
	}
	interface Content {
		______text: string
	}
	interface Link {
		___href?: string,
		___rel?: string,
		___title?: string
	}
	interface Contributor {
		uri?: string,
		email?: string
	}
	interface Invoice {
		invoice_code?:string,
		customer_name?:string,
		subject?:string,
		issue_date?:number,
		due_date?:number,
		status?:string,
		remarks?:string,
		sub_total?:number,
		tax_amount?:number,
		total_amount?:number,
		issue_date_desc?:number,
		due_date_desc?:number,
		total_amount_desc?:number
	}
	interface Record {
		record_code?:string,
		description?:string,
		quantity?:number,
		unit?:string,
		unit_price?:number,
		tax_rate?:number
	}
	interface Bank {
		bank_code?:string,
		bank_title?:string,
		branch_code?:string,
		branch_name?:string,
		bank_type?:string,
		bank_number?:string,
		bank_name?:string,
		bank_label?:string,
		is_default?:boolean
	}
	interface Company {
		email?:string,
		company_code?:string,
		company_name?:string,
		zip_code?:string,
		prefecture?:string,
		city?:string,
		address_line1?:string,
		building_name?:string,
		tel?:string,
		fax?:string,
		registration_number?:string
	}
	interface User {
		uid?:string,
		user_name?:string
	}
	interface Quotation {
		quotation_code?:string,
		customer_name?:string,
		subject?:string,
		issue_date?:number,
		delivery_date?:number,
		expiry_date?:number,
		payment_terms?:string,
		status?:string,
		remarks?:string,
		sub_total?:number,
		tax_amount?:number,
		total_amount?:number,
		issue_date_desc?:number,
		total_amount_desc?:number
	}
	interface Company_group {
		company_id?:string,
		owner_id?:string,
		role?:string,
		status?:string,
		company_name?:string
	}
	interface Purchase_order {
		purchase_order_code?:string,
		customer_name?:string,
		subject?:string,
		issue_date?:number,
		delivery_date?:number,
		delivery_location?:string,
		status?:string,
		remarks?:string,
		sub_total?:number,
		tax_amount?:number,
		total_amount?:number,
		issue_date_desc?:number,
		total_amount_desc?:number
	}
	interface Customer {
		customer_code?:string,
		customer_name?:string,
		to_email?:string,
		cc_email?:string
	}
	interface Customer_email {
		email?:string,
		label?:string
	}
}