import { Box } from '@mui/material'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '会員登録完了 | 請求書アプリ'
}

const MainLayout = ({ children }: any) => {
  return (
    <Box paddingLeft={3} paddingRight={3}>
      {children}
    </Box>
  )
}

export default MainLayout
