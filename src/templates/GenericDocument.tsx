import React from 'react'
import { renderToStaticMarkup } from 'pdf/pdfutils'

export const getHtmlTemplate = async (file_name: string): Promise<string> => {
  const html = (
    <html>
      <head>
        <meta name="pdf" content={'title=' + file_name} />
      </head>
      <body>
        <div>GenericDocument</div>
      </body>
    </html>
  )
  return await renderToStaticMarkup(html)
}
