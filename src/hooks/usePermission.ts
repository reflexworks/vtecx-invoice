import { useUser } from '@/contexts/user-context'
import { useActiveCompany } from '@/contexts/active-company-context'

type Permission = {
  /** 作成・更新・削除が可能（AD / ED / システム管理者） */
  canWrite: boolean
  /** グループ管理が可能（AD / システム管理者） */
  canManageGroup: boolean
  /** システム管理者かどうか */
  isAdmin: boolean
  /** 現在のグループロール（AD / ED / VI / null） */
  role: string | null
}

/**
 * ログイン中ユーザーの権限を返すフック。
 * - canWrite: AD・ED・システム管理者は true
 * - canManageGroup: AD・システム管理者は true
 */
export function usePermission(): Permission {
  const { isAdmin } = useUser()
  const { activeCompany } = useActiveCompany()
  const role = activeCompany?.role ?? null

  return {
    canWrite: isAdmin || role === 'AD' || role === 'ED',
    canManageGroup: isAdmin || role === 'AD',
    isAdmin,
    role
  }
}
