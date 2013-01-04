
pageSizes = 
  a4:
    w: 595
    h: 842
  letter:
    w: 8.5 * 72
    h: 11 * 72

nAmerica = google.loader.ClientLocation?.address?.country_code in ['US', 'CA']
pageSize = pageSizes[if nAmerica then 'letter' else 'a4']

bgCol = [0.9, 0.9, 0.9]
fgCol = [0.5, 0.5, 0.5]

if yes
  font     = 'Helvetica'
  fontBold = 'Helvetica-Bold'
else
  font     = 'Times-Roman'
  fontBold = 'Times-Bold'

fix = (n) -> n.toFixed(3).replace /\.?0+$/, ''
mm2pt = (mm) -> mm / 25.4 * 72

pw = new ParallelWaiter 2, (data) ->

  pdf = new PDFAppend data.pdf
  imgObj = pdf.addImg data.img
  
  {artist, name: albumName} = data.albumData.album
  # artist += ' ' + artist + ' ' + artist + ' ' + artist  # test long artist/album names
  # albumName += ' ' + albumName + ' ' + albumName + ' ' + albumName
  
  tracks = for t, i in data.albumData.album.tracks.track
    mins = '' + Math.floor(t.duration / 60)
    secs = '' + t.duration % 60
    secs = '0' + secs if secs.length < 2
    # t.name += ' ' + t.name +  ' ' + t.name  # test long track names
    "#{i + 1}. #{t.name} [#{mins}:#{secs}]"
    
  trackText = tracks.join '\n'
  # trackText += '\n' + trackText + '\n' + trackText  # test long list
  
  numRe = /^(\d+)\.\s+/
  durRe = /\s+\[(\d+:\d+)\]\s*$/
  trackData = for t, i in trackText.split '\n'
    numMatch = t.match numRe
    num = numMatch?[1]
    durMatch = t.match durRe
    dur = durMatch?[1]
    name = t.replace(numRe, '').replace(durRe, '')
    {num, name, dur}  
  
  
  # add reference to fonts as new objects
  fontObj     = pdf.addObj font,     type: PDFBuiltInFont
  fontBoldObj = pdf.addObj fontBold, type: PDFBuiltInFont
  
  mediaBox = "[0 #{pageSizes.a4.h - pageSize.h} #{pageSize.w} #{pageSizes.a4.h}]"
  
  # front insert
  
  # content stream for front insert
  frontContent = pdf.addObj """
    q  % colour block
    #{bgCol.join ' '} rg  % fill colour
    #{fix mm2pt 75} #{fix pageSizes.a4.h - mm2pt 255} #{fix mm2pt 120} #{fix mm2pt 120} re f  % rect, fill
    Q
    
    q  % small album art
    #{fix mm2pt 60} 0 0 #{fix mm2pt 60} #{fix mm2pt 165} #{fix pageSizes.a4.h - mm2pt 225} cm  % scaleX 0 0 scaleY trnslX trnslY cm
    0 1 -1 0 0 0 cm  % rotate 90deg a-cw
    /AlbumArt Do
    Q
    
    q  % line around small album art
    0.25 w  #{fgCol.join ' '} RG  % line colour
    #{fix mm2pt 105} #{fix pageSizes.a4.h - mm2pt 225} #{fix mm2pt 60} #{fix mm2pt 60} re  S  % rect, stroke
    Q
    
    q  % big album art
    #{fix mm2pt 120} 0 0 #{fix mm2pt 120} #{fix mm2pt 195} #{fix pageSizes.a4.h - mm2pt 135} cm  % scaleX 0 0 scaleY trnslX trnslY cm
    0 1 -1 0 0 0 cm  % rotate 90deg a-cw
    /AlbumArt Do
    Q
    """, type: PDFStream, minify: yes
  
  # replace page 1 object, adding a reference to our new content and fiddling with MediaBox in case of letter paper
  pdf.addObj """
    <<
    /Type /Page /Parent 3 0 R /Resources 6 0 R
    /Contents [#{frontContent.ref} 4 0 R]
    /MediaBox #{mediaBox}
    >>
    """, num: 2
  
  # replace page 1 resources object, adding references to our new fonts and images (and all ProcSets)
  pdf.addObj """
    <<
    /ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ] /ColorSpace << /Cs1 7 0 R /Cs2 9 0 R >>
    /Font <<
      /Tc3.0 11 0 R /Tc4.1 13 0 R /Tc2.0 10 0 R /TT5.1 15 0 R /Tc1.0 8 0 R /Tc6.0 16 0 R
      /Fnt #{fontObj.ref} /FntBold #{fontBoldObj.ref}
    >>
    /XObject << /AlbumArt #{imgObj.ref} >>
    >>
    """, num: 6
  
  # back insert
  
  artistPara = PDFText.preprocessPara artist,    font
  namePara   = PDFText.preprocessPara albumName, fontBold
  maxSpineWidth = mm2pt 100
  spineXHeightFactor = if font is 'Helvetica' then 0.83 else 0.78
  
  for spineSize in [10..6]
    artistFlow = PDFText.flowPara artistPara, spineSize, lineHeight: 0
    nameFlow   = PDFText.flowPara namePara,   spineSize, lineHeight: 0
    spineSpace = spineSize * 0.5
    totalWidth = artistFlow.width + spineSpace + nameFlow.width
    break if totalWidth < maxSpineWidth
  
  spineCommands = """
    /Fnt #{spineSize} Tf
    #{artistFlow.commands}
    #{artistFlow.width + spineSpace} 0 Td
    /FntBold #{spineSize} Tf
    #{nameFlow.commands}
    """
  
  maxTrackWidth  = mm2pt 55
  maxTrackHeight = mm2pt 87
  
  for track in trackData
    for k, v of track
      track["#{k}Para"] = PDFText.preprocessPara v, font if v?
  
  for trackSize in [10..6]
    numAndDurSize = trackSize - 2
    trackCommands = ''
    height = 0
    trackSpacing = trackSize / 5
    for track in trackData
      if track.numPara
        numMaxWidth = numAndDurSize * 20
        numFlow = PDFText.flowPara track.numPara, numAndDurSize, lineHeight: 0, align: 'right', maxWidth: numMaxWidth
        trackCommands += """
          /Fnt #{numAndDurSize} Tf
          #{-numMaxWidth - trackSize} 0 Td
          #{numFlow.commands}
          #{numMaxWidth + trackSize} 0 Td\n
          """
      if track.durPara
        durMaxWidth = maxTrackWidth + numAndDurSize * 4.5
        durFlow = PDFText.flowPara track.durPara, numAndDurSize, lineHeight: 0, align: 'right', maxWidth: durMaxWidth
        trackCommands += """
          /Fnt #{numAndDurSize} Tf
          #{durFlow.commands}\n
          """
      nameFlow = PDFText.flowPara track.namePara, trackSize, maxWidth: maxTrackWidth, lineHeight: 1.15
      trackCommands += """
        /Fnt #{trackSize} Tf
        #{nameFlow.commands}
        0 #{fix -trackSpacing} Td\n
        """
      height += nameFlow.height + trackSpacing
    break if height < maxTrackHeight
  
  # content stream for back insert
  backContent = pdf.addObj """
    q  % colour block
    #{bgCol.join ' '} rg  % fill colour
    #{fix mm2pt 75} #{fix pageSizes.a4.h - mm2pt 165} #{fix mm2pt 117} #{fix mm2pt 150} re f  % rect, fill
    Q
    
    BT  % text down spine
    #{fgCol.join ' '} rg  % fill colour
    #{fix mm2pt(75) + (mm2pt(117) - totalWidth) / 2} #{fix pageSizes.a4.h - mm2pt(15) - spineSize * spineXHeightFactor - (mm2pt(6.5) - spineSize) / 2} Td
    #{spineCommands}
    #{fix -artistFlow.width - spineSpace} #{fix mm2pt(-143.5)} Td
    #{spineCommands}
    ET
    
    q  % track listing
    1 0 0 1 #{fix mm2pt 90} #{fix pageSizes.a4.h - mm2pt 142} cm  % scaleX 0 0 scaleY trnslX trnslY cm
    0 1 -1 0 0 0 cm  % rotate 90deg a-cw
    BT
    #{trackCommands}
    ET
    Q
    """, type: PDFStream, minify: yes
      
  # replace page 2 object, adding a reference to our new content and fiddling with MediaBox in case of letter paper
  pdf.addObj """
    <<
    /Type /Page /Parent 3 0 R /Resources 24 0 R
    /Contents [#{backContent.ref} 22 0 R]
    /MediaBox #{mediaBox}
    >>
    """, num: 21
  
  # replace page 2 resources object, adding references to our new fonts
  pdf.addObj """
    <<
    /ProcSet [ /PDF /Text ] /ColorSpace << /Cs2 9 0 R /Cs1 7 0 R >>
    /Font <<
      /Tc10.0 29 0 R /TT8.1 27 0 R /Tc7.0 25 0 R /Tc9.0 28 0 R
      /Fnt #{fontObj.ref} /FntBold #{fontBoldObj.ref}
    >>
    >>
    """, num: 24
  
  # make tag: 'a', href: pdf.asDataURI(), text: 'PDF (data URI)', parent: get(tag: 'body')
  
  bs = pdf.asBinaryString()
  len = bs.length
  u8a = new Uint8Array (bs.charCodeAt(i) & 0xff for i in [0...len])
  b = new Blob [u8a], type: 'application/pdf'
  make tag: 'a', href: (URL ? webkitURL).createObjectURL(b), text: 'PDF (Blob URL)', parent: get(tag: 'body')

albumQuery = 'http://ws.audioscrobbler.com/2.0/?' + 
  'api_key=2113885e020cefe1d72f95d8378d32c1&method=album.getinfo&format=json&callback=<cb>&' + 
  location.search.substring 1

xhr url: 'template.pdf', binary: yes, success: (req) -> pw.done pdf: req.responseText
jsonp url: albumQuery, success: (albumData) ->
  imgs = {}
  for img in albumData.album.image
    imgs[img.size] = img['#text']
  for size in w 'mega extralarge large medium small'
    imgUrl = imgs[size]
    break if imgUrl?
  xhr url: imgUrl.replace(/^http:\//, 'http://mackerron.com'), binary: yes, success: (req) ->
    pw.done albumData: albumData, img: req.responseText
  