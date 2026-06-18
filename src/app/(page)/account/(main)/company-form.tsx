'use client'
import { Button, InputAdornment, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import VtecxApp from '@/typings'

type CompanyFormProps = {
  company: VtecxApp.Company
  setCompany: React.Dispatch<React.SetStateAction<VtecxApp.Company>>
  companyNameError?: string
  telError?: string
}

export function CompanyForm({ company, setCompany, companyNameError, telError }: CompanyFormProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <TextField
          label="企業名"
          fullWidth
          value={company.company_name ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, company_name: e.target.value }))}
          error={!!companyNameError}
          helperText={companyNameError}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="メールアドレス"
          type="email"
          fullWidth
          value={company.email ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, email: e.target.value }))}
          slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="電話番号"
          fullWidth
          placeholder="03-1234-5678"
          value={company.tel ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, tel: e.target.value }))}
          error={!!telError}
          helperText={telError}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="登録番号"
          fullWidth
          placeholder="T1234567890123"
          value={company.registration_number ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, registration_number: e.target.value }))}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="郵便番号"
          fullWidth
          placeholder="1234567"
          value={company.zip_code ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, zip_code: e.target.value }))}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    variant="text"
                    size="small"
                    onClick={async () => {
                      const raw = (company.zip_code ?? '').replace(/-/g, '')
                      if (raw.length !== 7) return
                      try {
                        const res = await fetch(
                          `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${raw}`
                        )
                        const json = await res.json()
                        const result = json.results?.[0]
                        if (result) {
                          setCompany((prev) => ({
                            ...prev,
                            prefecture: result.address1 ?? prev.prefecture,
                            city: (result.address2 ?? '') + (result.address3 ?? '')
                          }))
                        }
                      } catch (error) {
                        console.error('住所の取得に失敗しました', error)
                      }
                    }}
                  >
                    住所補完
                  </Button>
                </InputAdornment>
              )
            }
          }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="都道府県"
          fullWidth
          value={company.prefecture ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, prefecture: e.target.value }))}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="市区郡町村"
          fullWidth
          value={company.city ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, city: e.target.value }))}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="番地"
          fullWidth
          value={company.address_line1 ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, address_line1: e.target.value }))}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="建物名"
          fullWidth
          value={company.building_name ?? ''}
          onChange={(e) => setCompany((prev) => ({ ...prev, building_name: e.target.value }))}
        />
      </Grid>
    </Grid>
  )
}
