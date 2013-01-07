
# TODO
# - load a JPEG, a GIF, and _all_ PNG test suite images in same doc
# - make it less random and horrible!
# - use PDF 1.5 (to make SMask use compliant)

loadAssets = ->
  xhr url: 'pdf/kernligimg.pdf', type: 'arraybuffer', success: (req) -> pw.done pdf: req.response
  xhrImg url: 'images/pound-coin.jpg', success: (img) -> pw.done jpeg: img
  xhrImg url: 'images/basn6a08.png',   success: (img) -> pw.done png:  img

pw = new ParallelWaiter 3, (data) ->
  pdf = new PDFAppend data.pdf
  jpegObj = new PDFImage pdf, data.jpeg
  pngObj  = new PDFImage pdf, data.png
  
  text1 = PDFText.preprocessPara 'Affluent finance AWAY 6×6 £12 €13 – 15 x hello—again LOVE HATE YOU ME 123‰ Höhner 2πr. Lorem ipsum do-lor sit amet, consectetur adip-iscing elit. Ut eu ffffff nec nunf pellentesquelaoreeteuatnuncphasellusnonmagnai-arcu consequat tincidunt sit amet conv-allis eros. In pellen–tesque pellentesque felis, ac varius nulla vehicula id. Sed rut-rum, quam nec semper dapibus, mi lorem adipiscing lectus, vel bibendum lorem erat quis neque. pellentesquelaoreeteuatnuncphasellusnonmagnaidconesqyatys x', 'Times-Roman', no
  
  text2 = PDFText.preprocessPara 'The wind was a torrent of darkness among the gusty fleas, The moon was a ghostly galleon tossed upon cloudy seas, The road was a ribbon of moonlight over the purple moor, And the highwayman came riding— Riding—riding— The highwayman came fiding, up to the old inn-door.', 'Times-Roman' 
  
  text1full  = PDFText.flowPara text1, 12, maxWidth: 250, align: 'full'
  text2right = PDFText.flowPara text2, 14, maxWidth: 420, align: 'right'
  
  # add a new object -- an extra content stream
  contentStream = new PDFStream pdf, stream: """
    q  0.7 0.7 0.7 RG  72 #{600 + 12} 250 #{- text1full.height} re S  Q
    BT
      72 600 Td
      /TR 12 Tf
      #{text1full.commands}
    ET
    q  1 0.5 0 RG  #{72 + 420 - text2right.width} #{350 + 14} #{text2right.width} #{- text2right.height} re S  Q
    BT
      72 350 Td
      /TR 14 Tf
      #{text2right.commands}
      0 -8 Td
      #{PDFText.flowPara(text2, 14, {maxWidth: 420, align: 'left'}).commands}
      0 -8 Td
      #{PDFText.flowPara(text2, 14, {maxWidth: 420, align: 'full'}).commands}
      0 -8 Td
      #{PDFText.flowPara(text2, 14, {maxWidth: 420, align: 'centre'}).commands}
    ET
    q
      72 0 0 72 400 400 cm  % scaleX 0 0 scaleY translateX translateY
      /MyIm Do
    Q
    q
      0.5 0.5 0.5 rg
      380 620 112 32 re  f
      72 0 0 72 400 600 cm  % scaleX 0 0 scaleY translateX translateY
      /MyIm2 Do
    Q
    """
  
  # replace page object, with one change: adding a reference to our new content
  new PDFObj pdf, data: """
    << 
    /Type /Page 
    /Parent 3 0 R
    /Resources 6 0 R
    /Contents [4 0 R #{contentStream.ref}]
    /MediaBox [0 0 595 842]
    >>
    """, num: 2
  
  # add references to Helvetica and Times as new objects
  timesObj = new PDFFont pdf, name: 'Times-Roman'
  helvObj  = new PDFFont pdf, name: 'Helvetica'
  
  # replace page resources object, adding references to our new fonts and images
  new PDFObj pdf, data: """
    << 
    /ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ] /ColorSpace << /Cs1 7 0 R >> 
    /Font <<
      /TT1.0 8 0 R
      /TR #{timesObj.ref}
      /H #{helvObj.ref}
      >> 
    /XObject <<
      /Im1 9 0 R
      /MyIm #{jpegObj.ref}
      /MyIm2 #{pngObj.ref}
      >>
    >>
    """, num: 6
  
  blob = pdf.toBlob()
  make tag: 'a', href: (URL ? webkitURL).createObjectURL(blob), text: 'PDF', parent: get(tag: 'body'), onclick: ->
    if navigator.msSaveOrOpenBlob?
      navigator.msSaveOrOpenBlob blob, "example.pdf"

loadAssets()
