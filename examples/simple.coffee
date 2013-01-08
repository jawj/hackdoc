
# our version of simple PDF here: http://www.gnupdf.org/Introduction_to_PDF

pdf = new HackDoc

fontName = 'Times-Roman'
fontSize = 12

fontObj = new PDFFont pdf, name: fontName

contentStream = new PDFStream pdf, stream: """
  BT
  70 50 TD
  /F1 #{fontSize} Tf
  #{PDFText.flowPara(PDFText.preprocessPara('Hello world!', fontName), fontSize).commands}
  ET"""

# data-free declaration of pagesObj to break circular ref
pagesObj = new PDFObj pdf

pageObj = new PDFObj pdf, data: """<<
  /Type /Page
  /Parent #{pagesObj.ref}
  /Resources <<
    /Font << /F1 #{fontObj.ref} >>
  >>
  /Contents #{contentStream.ref}
  >>"""

# now re-construct pagesObj with data
PDFObj.call pagesObj, pdf, data: """<<
  /Type /Pages
  /MediaBox [ 0 0 200 200 ]
  /Count 1
  /Kids [ #{pageObj.ref} ]
  >>"""

rootObj = new PDFObj pdf, data: """
  <<
  /Type /Catalog
  /Pages #{pagesObj.ref}
  >>"""

pdf.root = rootObj.ref

blob = pdf.toBlob()
if window.URL?
  make tag: 'a', href: URL.createObjectURL(blob), text: 'PDF (object URL)', parent: get(tag: 'body'), onclick: ->
    if navigator.msSaveOrOpenBlob?
      navigator.msSaveOrOpenBlob blob, "simple.pdf"
else
  fr = new FileReader()
  fr.readAsDataURL blob
  fr.onload = ->
    make tag: 'a', href: fr.result, text: 'PDF (data URI)', parent: get(tag: 'body')
