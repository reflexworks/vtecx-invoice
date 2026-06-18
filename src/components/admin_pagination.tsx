import Grid from '@mui/material/Grid2'
import { Stack, Pagination, Box, Typography } from '@mui/material'
import React from 'react'

export const AdminPagination = ({ max_number, current_count, current_page, onChange }: any) => {
  const [page_count, setPageCount] = React.useState(current_count)
  const [count, setCount] = React.useState(current_count)
  const [page, setPage] = React.useState(current_page)

  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    onChange(value)
  }

  React.useEffect(() => {
    const all_page = Math.ceil(current_count / max_number)
    setPageCount(all_page > 0 ? all_page : 1)
    setCount(current_count)
  }, [current_count, max_number])

  React.useEffect(() => {
    setPage(current_page)
  }, [current_page])

  return (
    count > 0 && (
      <Box paddingTop={2}>
        <Grid container>
          <Grid size={4}>
            <Typography variant="body2">全 {count}件</Typography>
          </Grid>
          <Grid size={8}>
            <Stack spacing={4} direction="row" justifyContent="end">
              <Pagination
                count={page_count}
                page={page}
                onChange={handleChange}
                variant="outlined"
                color="primary"
                shape="rounded"
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    )
  )
}
