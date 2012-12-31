
pw = new ParallelWaiter 3, (data) ->
  pdf = new PDFAppend data.pdfStr
  
  jpegObj = pdf.addImg data.jpegStr
  pngObj  = pdf.addImg data.pngStr
  
  text1 = PDFText.preprocessPara 'Affluent finance AWAY 6×6 £12 €13 – 15 x hello—again LOVE HATE YOU ME 123‰ Höhner 2πr. Lorem ipsum do-lor sit amet, consectetur adip-iscing elit. Ut eu ffffff nec nunf pellentesquelaoreeteuatnuncphasellusnonmagnai-arcu consequat tincidunt sit amet conv-allis eros. In pellen–tesque pellentesque felis, ac varius nulla vehicula id. Sed rut-rum, quam nec semper dapibus, mi lorem adipiscing lectus, vel bibendum lorem erat quis neque. pellentesquelaoreeteuatnuncphasellusnonmagnaidconesqyatys x', 'Times-Roman', no
  
  text2 = PDFText.preprocessPara 'The wind was a torrent of darkness among the gusty fleas, The moon was a ghostly galleon tossed upon cloudy seas, The road was a ribbon of moonlight over the purple moor, And the highwayman came riding— Riding—riding— The highwayman came fiding, up to the old inn-door.', 'Times-Roman' 
  
  text1full  = PDFText.flowPara text1, 12, maxWidth: 250, align: 'full'
  text2right = PDFText.flowPara text2, 14, maxWidth: 420, align: 'right'
  
  # add a new object -- an extra content stream
  contentStream = pdf.addObj """
    q  1 0.5 0 RG  72 600 250 #{- text1full.height} re S  Q
    BT
      72 600 Td
      /TR 12 Tf
      #{text1full.commands}
    ET
    q  1 0.5 0 RG  72 350 420 #{- text2right.height} re S  Q
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
      72 0 0 72 400 600 cm  % scaleX 0 0 scaleY translateX translateY
      /MyIm2 Do  
    Q
    """, null, PDFStream
  
  # replace page object, with one change: adding a reference to our new content
  pdf.addObj """
    << 
    /Type /Page 
    /Parent 3 0 R
    /Resources 6 0 R
    /Contents [4 0 R #{contentStream.ref}]
    /MediaBox [0 0 595 842]
    >>
    """, 2
  
  # add references to Helvetica and Times as new objects
  timesObj = pdf.addObj 'Times-Roman', null, PDFBuiltInFont
  helvObj  = pdf.addObj 'Helvetica', null, PDFBuiltInFont
  
  # replace page resources object, adding references to our new fonts and images
  pdf.addObj """
    << 
    /ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ]
    /ColorSpace <<
      /Cs1 7 0 R
    >> 
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
    """, 6
  
  make tag: 'a', href: pdf.asDataURI(), text: 'PDF', parent: get(tag: 'body')

xhr url: 'pdf/kernligimg.pdf', binary: yes, success: (req) -> pw.done 'pdfStr',  req.responseText
xhr url: 'images/pound-coin.jpg', binary: yes, success: (req) -> pw.done 'jpegStr', req.responseText
xhr url: 'images/basn3p01.png',   binary: yes, success: (req) -> pw.done 'pngStr',  req.responseText
