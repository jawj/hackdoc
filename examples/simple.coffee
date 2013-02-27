
# our version of simple PDF here: http://www.gnupdf.org/Introduction_to_PDF

pdf = new HackDoc

fontName = 'Times-Roman'
fontSize = 12

fontObj = PDFFont.create pdf, name: fontName

contentStream = PDFStream.create pdf, stream: """
  BT
  70 50 TD
  /F1 #{fontSize} Tf
  #{PDFText.flowPara(PDFText.preprocessPara('Hello world!', fontName), fontSize).commands}
  ET""", lzw: yes

# data-free declaration of pagesObj to break circular ref
pagesObj = PDFObj.create pdf

pageObj = PDFObj.create pdf, data: """<<
  /Type /Page
  /Parent #{pagesObj.ref}
  /Resources <<
    /Font << /F1 #{fontObj.ref} >>
  >>
  /Contents #{contentStream.ref}
  >>"""

# now update pagesObj with data
pagesObj.update data: """<<
  /Type /Pages
  /MediaBox [ 0 0 200 200 ]
  /Count 1
  /Kids [ #{pageObj.ref} ]
  >>"""

rootObj = PDFObj.create pdf, data: """
  <<
  /Type /Catalog
  /Pages #{pagesObj.ref}
  >>"""

pdf.root = rootObj.ref

pdf.linkAsync 'simple.pdf', (link) ->
  link.appendChild text 'PDF'
  get(tag: 'body').appendChild link
