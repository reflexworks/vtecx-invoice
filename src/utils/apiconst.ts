/** アカウント登録メール送信内容 */
export const URI_SETTINGS_ADDUSER = '/_settings/adduser'

export const INVOICE_CODE_PREFIX = 'INV'
/** 請求書マスタフォルダ /invoice/{請求書番号} */
export const URI_INVOICE = '/invoice'
/** 請求書コード桁数 (接頭辞を除く) */
export const INVOICE_CODE_LEN = 5

/** 会社グループ接頭辞 */
export const COMPANY_GROUP_PREFIX = 'C'
/** 会社IDコード桁数 */
export const COMPANY_ID_LEN = 5
/** 会社グループフォルダ（グループマスタ兼親フォルダ） */
export const URI_COMPANY_GROUP = '/_group'

export const QUOTATION_CODE_PREFIX = 'QUO'
/** 見積書マスタフォルダ /quotation/{見積書番号} */
export const URI_QUOTATION = '/quotation'
/** 見積書コード桁数 (接頭辞を除く) */
export const QUOTATION_CODE_LEN = 5

export const PURCHASE_ORDER_CODE_PREFIX = 'PO'
/** 注文書マスタフォルダ /purchase_order/{注文書番号} */
export const URI_PURCHASE_ORDER = '/purchase_order'
/** 注文書コード桁数 (接頭辞を除く) */
export const PURCHASE_ORDER_CODE_LEN = 5

export const CUSTOMER_CODE_PREFIX = 'CUS'
/** 顧客マスタフォルダ /customer/{company_id}/{顧客コード} */
export const URI_CUSTOMER = '/customer'
/** 顧客コード桁数 (接頭辞を除く) */
export const CUSTOMER_CODE_LEN = 5

/** 振込先マスタフォルダ /bank/{uid}/{採番} */
export const URI_BANK = '/bank'
/** 振込先コード桁数 */
export const BANK_CODE_LEN = 4

/** 内閣府コード */
export const CAO_CODE = '000000'
/** 初期アカウントパスワード一時保存フォルダ */
//export const URI_TMPINIT = '/tmpinit'
/** 初期アカウントパスワード格納接頭辞 */
//export const URN_PSWD_PREFIX = 'urn:vte.cx:val:'
/** 初期アカウントパスワード一時保存フォルダ */
export const URI_INITACCOUNT = '/initaccount'

/** 自治体マスタフォルダ /local_government/{自治体コード} */
export const URI_LOCAL_GOVERNMENT = '/local_government'
/** 災害マスタフォルダ /disaster/{災害コード} */
export const URI_DISASTER = '/disaster'
/** 被災自治体マスタフォルダ /disaster/{災害コード}/recipient/{自治体コード} */
export const URI_RECIPIENT = '/recipient'
/** ユーザマスタフォルダ /local_government/{自治体コード}/user */
export const URI_USER = '/_user'
/** 所属マスタフォルダ /local_government/{自治体コード}/occupation/{所属コード} */
export const URI_OCCUPATION = '/occupation'
/** 役職・職種マスタフォルダ /local_government/{自治体コード}/position/{役職・職種コード} */
export const URI_POSITION = '/position'
/** 各種報告フォルダ */
export const URI_REPORT = '/report'
/** 活動報告フォルダ /report/{災害コード}/activity */
export const URI_ACTIVITY = '/activity'
/** 活動報告 応援市区町村閲覧用フォルダ /report/{災害コード}/activity_municipality */
export const URI_ACTIVITY_MUNICIPALITY = '/activity_municipality'
/** 活動報告 応援都道府県閲覧用フォルダ /report/{災害コード}/activity_prefecture */
export const URI_ACTIVITY_PREFECTURE = '/activity_prefecture'
/** 活動報告 被災都道府県閲覧用フォルダ /report/{災害コード}/activity_recipient */
export const URI_ACTIVITY_RECIPIENT = '/activity_recipient'
/** 支出フォルダ /report/{災害コード}/expense */
export const URI_EXPENSE = '/expense'
/** 支出 応援市区町村閲覧用フォルダ /report/{災害コード}/expense_municipality */
export const URI_EXPENSE_MUNICIPALITY = '/expense_municipality'
/** 支出 応援都道府県閲覧用フォルダ /report/{災害コード}/expense_prefecture */
export const URI_EXPENSE_PREFECTURE = '/expense_prefecture'
/** 支出 被災都道府県閲覧用フォルダ /report/{災害コード}/expense_recipient */
export const URI_EXPENSE_RECIPIENT = '/expense_recipient'
/** 支出書類アップロードフォルダ /report/{災害コード}/expense_attachment */
export const URI_EXPENSE_ATTACHMENT = '/expense_attachment'
/** 支出書類アップロード 応援市区町村閲覧用フォルダ /report/{災害コード}/expense_attachment_municipality */
//export const URI_EXPENSE_ATTACHMENT_MUNICIPALITY = '/expense_attachment_municipality'
/** 支出書類アップロード 応援都道府県閲覧用フォルダ /report/{災害コード}/expense_attachment_prefecture */
//export const URI_EXPENSE_ATTACHMENT_PREFECTURE = '/expense_attachment_prefecture'
/** 支出書類アップロード 被災都道府県閲覧用フォルダ /report/{災害コード}/expense_attachment_recipient */
//export const URI_EXPENSE_ATTACHMENT_RECIPIENT = '/expense_attachment_recipient'
/** 日報修正依頼フォルダ /report/{災害コード}/activity_modification */
export const URI_ACTIVITY_MODIFICATION = '/activity_modification'
/** 支出修正依頼フォルダ /report/{災害コード}/expense_modification */
export const URI_EXPENSE_MODIFICATION = '/expense_modification'
/** 応援自治体報告フォルダ /report/{災害コード}/status_local_government */
export const URI_STATUS_LOCAL_GOVERNMENT = '/status_local_government'
/** 被災都道府県報告フォルダ /report/{災害コード}/status_recipient */
export const URI_STATUS_RECIPIENT = '/status_recipient'
/** 採番フォルダ /numbering */
export const URI_NUMBERING = '/numbering'
/** 品目マスタ /item */
export const URI_ITEM = '/item'
/** 自治体更新予約フォルダ /local_government_update_schedule/ */
export const URI_LOCAL_GOVERNMENT_UPDATE_SCHEDULE = '/local_government_update_schedule'

/** ユーザフォルダ */
export const URI_SYSTEM_USER = '/_user'
/** グループフォルダ */
export const URI_GROUP = '/_group'
/** グループフォルダ+スラッシュ */
export const URI_GROUP_SLASH = `${URI_GROUP}/`
/** サービス管理者グループキー */
export const URI_GROUP_ADMIN = `${URI_GROUP}/$admin`
/** ユーザ管理者 */
export const URI_GROUP_USERADMIN = `${URI_GROUP}/$useradmin`
/** グループ管理者接頭辞 */
export const URI_GROUP_GROUPADMIN_PREFIX = `${URI_GROUP}/$groupadmin_`
/** 内閣府グループ管理者 */
export const URI_GROUPADMIN_CAO = `${URI_GROUP_GROUPADMIN_PREFIX}${CAO_CODE}`
/** ユーザ登録メール送信内容 */
export const URI_SETTINGS_SIGNUP_COMPLETE = '/_settings/signup_complete'
/** パスワードリセットメール送信内容 */
export const URI_SETTINGS_PASSRESET = '/_settings/passreset'

/** テーブル名: user */
export const TABLE_USER = 'user'
/** テーブル名: activity */
export const TABLE_ACTIVITY = 'activity'
/** テーブル名: expense */
export const TABLE_EXPENSE = 'expense'

/** 次ページがある場合のカーソルヘッダ */
export const HEADER_NEXTPAGE = 'x-vtecx-nextpage'

/** 災害コード接頭辞 */
export const DISASTER_CODE_PREFIX = 'D'
/** 災害コード桁数 (接頭辞を除く) */
export const DISASTER_CODE_LEN = 5
/** 所属コード接頭辞 */
export const OCCUPATION_CODE_PREFIX = 'O'
/** 所属コード桁数 (接頭辞を除く) */
export const OCCUPATION_CODE_LEN = 8
/** 役職・職種コード接頭辞 */
export const POSITION_CODE_PREFIX = 'P'
/** 役職・職種コード桁数 (接頭辞を除く) */
export const POSITION_CODE_LEN = 8
/** 日報コード接頭辞 */
export const ACTIVITY_CODE_PREFIX = 'A'
/** 日報コード桁数 (接頭辞を除く) */
export const ACTIVITY_CODE_LEN = 9
/** 日報コード連番桁数 (接頭辞を除く) */
export const ACTIVITY_CODE_SEQ_LEN = 3
/** 支出コード接頭辞 */
export const EXPENSE_CODE_PREFIX = 'E'
/** 支出コード桁数 (接頭辞を除く) */
export const EXPENSE_CODE_LEN = 12
/** 修正依頼連番桁数 */
export const MODIFICATION_SEQ_LEN = 3
/** 品目コード桁数 (接頭辞を除く) */
export const ITEM_CODE_LEN = 4

/** ページングでない一覧取得時の最大取得数 */
export const GETFEED_LIMIT = 5000

/** 有効ステータス : 削除 */
export const ENABLE_STATUS_DELETE = 0
/** 有効ステータス : 有効 */
export const ENABLE_STATUS_VALID = 1

/** 災害ステータス : 停止 */
export const DISASTER_STATUS_DELETE = 0
/** 災害ステータス : 稼働中 */
export const DISASTER_STATUS_VALID = 1

/** 権限 : 管理者 */
export const AUTHORITY_ADMIN = '1'
/** 権限 : 一般ユーザ */
export const AUTHORITY_USER = '2'
/** パスワード文字列長 */
export const PSWD_LEN = 10

/** 所属分類 : その他 */
export const OCCUPATION_TYPE_NORMAL = '1'
/** 所属分類 : 国公立病院・日赤 */
export const OCCUPATION_TYPE_HOSPITAL_PUBLIC = '2'
/** 所属分類 : 国公立病院・日赤以外 */
export const OCCUPATION_TYPE_HOSPITAL_OTHER = '3'
/** 所属分類 : DMAT (災害派遣医療チーム Disaster Medical Assistance Team) */ // (2026.1.22 持ち方変更)
//export const OCCUPATION_TYPE_DMAT = '4'
/** 所属分類 : 福祉チーム(国の機関に準じる機関) */
export const OCCUPATION_TYPE_WELFARE_PUBLIC = '5'
/** 所属分類 : 福祉チーム(国の機関に準じる機関以外) */
export const OCCUPATION_TYPE_WELFARE_OTHER = '6'

/** 役職・職種区分 : 役職 */
export const POSITION_TYPE_POST = '1'
/** 役職・職種区分 : 職種 */
export const POSITION_TYPE_JOB = '2'

/** 災害派遣チーム : チーム参加なし */
export const ASSISTANCE_TEAM_NONE = '0'
/** 災害派遣チーム : DMAT */
export const ASSISTANCE_TEAM_DMAT = '1'
/** 災害派遣チーム : DWAT */
export const ASSISTANCE_TEAM_DWAT = '2'

// 活動区分	 job_description
// 1:避難所の設置・運営、2:支援物資の荷捌き・搬送、3:飲料水の供給、4:医療、9:その他
/** 活動区分 : 避難所の設置・運営 */
export const JOB_DESCRIPTION_SHELTER = '1'
/** 活動区分 : 支援物資の荷捌き・搬送 */
export const JOB_DESCRIPTION_SUPPLIES = '2'
/** 活動区分 : 飲料水の供給 */
export const JOB_DESCRIPTION_WATER = '3'
/** 活動区分 : 医療 */
export const JOB_DESCRIPTION_MEDICALCARE = '4'
/** 活動区分 : 福祉サービスの提供 */
export const JOB_DESCRIPTION_WELFARE = '5'
/** 活動区分 : その他 */
export const JOB_DESCRIPTION_OTHER = '9'

// 費用種類 item_class
// 01:旅費、02:消耗品費、03:燃料費、04:印刷製本費、05:光熱水費、06:修繕費、07:食糧費、08:通信運搬費、09:使用料及び賃借料、10:職員手当、11:賃金
// 91:医薬品，治療材料、92:医療機器の修繕費
/** 費用種類 : 旅費 */
export const ITEM_CLASS_TRAVEL_EXPENSE = '01'
/** 費用種類 : 消耗品費 */
export const ITEM_CLASS_SUPPLIES_EXPENSE = '02'
/** 費用種類 : 燃料費 */
export const ITEM_CLASS_FUEL_EXPENSE = '03'
/** 費用種類 : 印刷製本費 */
export const ITEM_CLASS_PRINTING_EXPENSE = '04'
/** 費用種類 : 光熱水費 */
export const ITEM_CLASS_UTILITY_EXPENSE = '05'
/** 費用種類 : 修繕費 */
export const ITEM_CLASS_REPAIR_EXPENSE = '06'
/** 費用種類 : 食糧費 */
export const ITEM_CLASS_FOOD_EXPENSE = '07'
/** 費用種類 : 通信運搬費 */
export const ITEM_CLASS_COMMUNICATION_EXPENSE = '08'
/** 費用種類 : 使用料及び賃借料 */
export const ITEM_CLASS_RENTAL_EXPENSE = '09'
/** 費用種類 : 職員手当(時間外勤務手当) */
export const ITEM_CLASS_SERVICE_ALLOWANCE = '10'
/** 費用種類 : 賃金 */
export const ITEM_CLASS_WAGE = '11'
/** 費用種類 : 宿泊費 */
export const ITEM_CLASS_ACCOMMODATION_EXPENSE = '12'
/** 費用種類 : (福祉サービス)消耗機材費 */
export const ITEM_CLASS_WELFARE_CONSUMABLES = '71'
/** 費用種類 : (福祉サービス)建物の使用謝金 */
export const ITEM_CLASS_WELFARE_BUILDING_USE_FEE = '72'
/** 費用種類 : (福祉サービス)器物の使用謝金、借上費、購入費 */
export const ITEM_CLASS_WELFARE_EQUIPMENT_USE_FEE = '73'
/** 費用種類 : (福祉サービス)光熱水費 */
export const ITEM_CLASS_WELFARE_UTILITY_EXPENSE = '74'
/** 費用種類 : (福祉サービス)仮設便所等の設置費 */
export const ITEM_CLASS_WELFARE_INSTALLATION_EXPENSE = '75'
/** 費用種類 : (医療)医薬品，治療材料 */
export const ITEM_CLASS_MEDICAL_SUPPLY = '91'
/** 費用種類 : (医療)医療機器の修繕費 */
export const ITEM_CLASS_MEDICAL_EQUIPMENT_REPAIR_COST = '92'

/** 日報・支出承認ステータス 1:承認 */
export const APPROVAL_STATUS_APPROVED = 1
/** 日報・支出承認ステータス 3:未承認(承認待ち) */
export const APPROVAL_STATUS_UNAPPROVED = 3
/** 日報・支出承認ステータス 8:未紐付け */
export const APPROVAL_STATUS_NOTLINKED = 8
/** 日報・支出承認ステータス 9:修正依頼中 */
export const APPROVAL_STATUS_PENDING = 9

/** 報告完了ステータス 3:未完了 */
export const REPORT_STATUS_INCOMPLETE = 3
/** 報告完了ステータス 1:完了 */
export const REPORT_STATUS_COMPLETE = 1

/** 報告承認ステータス 3:未承認 */
export const REPORT_APPROVE_STATUS_UNAPPROVED = 3
/** 報告承認ステータス 1:承認 */
export const REPORT_APPROVE_STATUS_APPROVED = 1

/** 自治体タイプ 1:応援自治体(市区町村) */
export const TYPE_MUNICIPALITY = '1'
/** 自治体タイプ 2:応援自治体(都道府県) */
export const TYPE_PREFECTURE = '2'
/** 自治体タイプ 3:被災自治体(都道府県) */
export const TYPE_RECIPIENT = '3'
/** 自治体タイプ 4:内閣府 */
export const TYPE_CAO = '4'

/** システムのユーザステータス : 本登録 */
export const USERSTATUS_ACTIVATED = 'Activated'
/** システムのユーザステータス : 無効 */
export const USERSTATUS_REVOKED = 'Revoked'

/** 自治体管理ログインユーザ情報取得のタイプ: 応援都道府県 */
export const LOGINUSER_TYPE_PREFECTURE = 'prefecture'
/** 自治体管理ログインユーザ情報取得のタイプ: 応援市区町村 */
export const LOGINUSER_TYPE_MUNICIPALITY = 'local_government'
/** 自治体管理ログインユーザ情報取得のタイプ: 被災自治体 */
export const LOGINUSER_TYPE_RECIPIENT = 'local_government_recipient'

/** Entry更新の削除オプション */
export const PARAM_DELETE = '?_delete'

/** link rel: self */
export const REL_SELF = 'self'
/** link rel: alternate */
export const REL_ALTERNATE = 'alternate'

/** ユーザ登録メール送信内容: ログイン画面URI: 内閣府管理画面 */
export const LOGIN_CAO = '/cao/login'
/** ユーザ登録メール送信内容: ログイン画面URI: 自治体管理画面 */
export const LOGIN_LOCAL_GOVERNMENT = '/local-government/select-disaster'
/** ユーザ登録メール送信内容: ログイン画面URI: 日報アプリ */
export const LOGIN_STAFF = '/report/select-disaster'
/** ユーザ登録メール送信置換文字列: アカウント */
export const MAIL_REPLACE_ACCOUNT = '${ACCOUNT}'
/** ユーザ登録メール送信置換文字列: パスワード */
export const MAIL_REPLACE_PASSWORD = '${PASSWORD}'
/** ユーザ登録メール送信置換文字列: ログイン画面URL */
export const MAIL_REPLACE_LOGIN_URL = '${LOGIN_URL}'
/** ユーザ登録メール送信置換文字列: vtecxnextサーバURL */
export const MAIL_REPLACE_VTECXNEXT_URL = '${VTECXNEXT_URL}'

/** 更新フラグ:新規登録 */
export const INSERT: number = 1
/** 更新フラグ:更新 */
export const UPDATE: number = 2
/** 更新フラグ:更新なし */
export const DONOTHING: number = 0

/** 自治体更新区分: 1:新設 */
export const UPDATE_TYPE_ESTABLISH = 1
/** 自治体更新区分: 2:編入 */
export const UPDATE_TYPE_INCORPORATE = 2
/** 自治体更新区分: 3:名称変更 */
export const UPDATE_TYPE_CHANGENAME = 3

/** 日付フォーマット */
export const FORMAT_DATE = 'YYYYMMDD'
/** 時分フォーマット */
export const FORMAT_HOUR_MIN = 'HHmm'
