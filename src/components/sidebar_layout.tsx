'use client'
import React from 'react'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Select,
  MenuItem,
  FormControl
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import DescriptionIcon from '@mui/icons-material/Description'
import LogoutIcon from '@mui/icons-material/Logout'
import BuildIcon from '@mui/icons-material/Build'
import GroupsIcon from '@mui/icons-material/Groups'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import ContactsIcon from '@mui/icons-material/Contacts'
import { useRouter, usePathname } from 'next/navigation'
import * as browserutil from '@/utils/browserutil'
import { ReCaptchaProvider } from 'next-recaptcha-v3'
import { ActiveCompanyProvider, useActiveCompany } from '@/contexts/active-company-context'
import { UserProvider, useUser } from '@/contexts/user-context'



const drawerWidth = 240

type Props = {
  children: React.ReactNode
}

function SidebarContent({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { uid: contextUid, isAdmin, accountEditId } = useUser()
  const { companies, activeCompany, setActiveCompany } = useActiveCompany()

  // パスに数値UIDが含まれる場合はそちらを優先（見積書・請求書ページ用）
  const pathUid = (() => {
    const firstSegment = pathname.split('/').filter(Boolean)[0] ?? ''
    return /^\d+$/.test(firstSegment) ? firstSegment : null
  })()
  const uid = pathUid ?? contextUid

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  const navItems = [
    ...(uid ? [
      { text: '見積書一覧', icon: <DescriptionIcon />, path: `/${uid}/quotation` },
      { text: '請求書一覧', icon: <RequestQuoteIcon />, path: `/${uid}/invoice` },
      { text: '注文書一覧', icon: <ShoppingCartIcon />, path: `/${uid}/purchase_order` },
      { text: '顧客マスタ', icon: <ContactsIcon />, path: `/${uid}/customer` },
    ] : []),
    { text: 'アカウント管理', icon: <PeopleIcon />, path: isAdmin === false && accountEditId ? `/account/edit/${accountEditId}` : '/account' },
    { text: '所属グループ一覧', icon: <GroupsIcon />, path: '/account/group' },
    ...(isLocalhost && uid ? [{ text: 'データ移行パッチ', icon: <BuildIcon />, path: `/${uid}/migrate` }] : []),
  ]

  const handleLogout = async () => {
    try {
      await browserutil.requestApi('GET', 'logout', '')
    } catch {
      // エラーでも画面遷移する
    }
    router.push('/login')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#1e293b',
            color: 'white'
          }
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#38bdf8' }}>
            Admin Console
          </Typography>
        </Box>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

        {/* グループ選択 */}
        {companies.length > 0 && (
          <Box sx={{ px: 2, py: 1.5 }}>
            {companies.length === 1 ? (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                {activeCompany?.company_name}
              </Typography>
            ) : (
              <FormControl fullWidth size="small">
                <Select
                  value={activeCompany?.company_id ?? ''}
                  onChange={(e) => {
                    const found = companies.find((c) => c.company_id === e.target.value)
                    if (found) setActiveCompany(found)
                  }}
                  sx={{
                    color: 'white',
                    fontSize: '0.8rem',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.6)' },
                    '.MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  {companies.map((c) => (
                    <MenuItem key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path || pathname.startsWith(item.path + '/')}
                onClick={() => router.push(item.path)}
              >
                <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ color: 'white' }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="ログアウト" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  )
}

export default function SidebarLayout({ children }: Props) {
  const reCaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY ?? ''
  return (
    <ReCaptchaProvider reCaptchaKey={reCaptchaKey} language="ja">
      <UserProvider>
        <ActiveCompanyProvider>
          <SidebarContent>{children}</SidebarContent>
        </ActiveCompanyProvider>
      </UserProvider>
    </ReCaptchaProvider>
  )
}
