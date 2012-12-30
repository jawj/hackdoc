
class @PDFObj
  constructor: (@objNum, contents) ->
    @ref = "#{@objNum} 0 R"
    @binaryString = """\n
      #{@objNum} 0 obj
      #{contents}
      endobj
      """
  

class @PDFStream extends PDFObj
  constructor: (objNum, stream) ->
    super objNum, """
      <<
      /Length #{stream.length}
      >>
      stream
      #{stream}
      endstream"""
  

class @PDFJPEG extends PDFObj  # adapted from Prawn
  @header = '\xff\xd8\xff'
  @sofBlocks = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
  @identify = (jpeg) ->
    r = new BinStringReader jpeg
    r.chars(PDFJPEG.header.length) is PDFJPEG.header
  
  constructor: (objNum, jpeg) ->
    r = new BinStringReader jpeg
    unless r.chars(PDFJPEG.header.length) is PDFJPEG.header
      @error = 'Invalid header in JPEG'
      return
      
    r.skip 1
    segmentLength = r.uint16be()
    r.skip(segmentLength - 2)
    
    while not r.eof()
      if r.uchar() isnt 0xff
        @error = 'Invalid marker in JPEG'
        return
      code = r.uchar()
      length = r.uint16be()
      if code in PDFJPEG.sofBlocks
        bits = r.uchar()
        height = r.uint16be()
        width = r.uint16be()
        channels = r.uchar()
        break
      r.skip(length - 2)
    
    decodeParam = ''
    colorSpace = switch channels
      when 1 then 'DeviceGray'
      when 3 then 'DeviceRGB'
      when 4
        decodeParam = '/Decode [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0]'
        'DeviceCMYK'
      else @error = 'Unsupported number of channels in JPEG'
    return if @error?
    
    super objNum, """
      <<
      /Type /XObject
      /Subtype /Image
      /Filter /DCTDecode
      /ColorSpace /#{colorSpace}
      /BitsPerComponent #{bits}
      /Width #{width}
      /Height #{height}
      /Length #{jpeg.length}
      #{decodeParam}
      >>
      stream
      #{jpeg}
      endstream"""
  

class @PDFPNG extends PDFObj  # adapted from Prawn
  
  # works: 1-bit, 2-bit, 4-bit, 8-bit, 16-bit grayscale
  # works: 8-bit, 16-bit RGB
  # works: 1-bit, 2-bit, 4-bit, 8-bit paletted
  # doesn't work: interlaced (error returned)
  # doesn't work: alpha transparency (error returned)
  # not honoured: palette/index transparency (tRNS)
  
  @header = '\x89PNG\r\n\x1a\n'
  @identify = (png) ->
    r = new BinStringReader png
    r.chars(PDFPNG.header.length) is PDFPNG.header
  
  constructor: (objNum, png, pdf) ->
    r = new BinStringReader png
    unless r.chars(PDFPNG.header.length) is PDFPNG.header
      @error = 'Invalid header in PNG'
      return
      
    while not r.eof()
      chunkSize = r.uint32be()
      section = r.chars 4
      switch section
        when 'IHDR'  # see http://www.w3.org/TR/PNG-Chunks.html#C.IHDR
          width = r.uint32be()
          height = r.uint32be()
          bits = r.uchar()
          colorType = r.uchar()
          compressionMethod = r.uchar()
          filterMethod = r.uchar()
          interlaceMethod = r.uchar()
          r.skip(chunkSize - 13)  # probably 0
        when 'PLTE'
          palette = r.chars chunkSize
        when 'IDAT'
          imageData = r.chars chunkSize
        when 'IEND'
          break
        else 
          r.skip chunkSize
      r.skip 4  # chunk CRC
    
    @error = 'Unsupported compression in PNG' if compressionMethod isnt 0  # only 0 is in PNG spec
    @error = 'Unsupported filter in PNG' if filterMethod isnt 0            # ditto
    @error = 'Unsupported interlacing in PNG' if interlaceMethod isnt 0    # don't support Adam7 (1)
    @error = 'Unsupported alpha channel in PNG' if colorType in [4, 6]     # don't support alpha transparency
    return if @error?
    
    colors = switch colorType
      when 0, 3 then 1  # 0 = grayscale, 3 = palette
      when 2 then 3     # 2 = RGB
      else null
      
    colorSpace = switch colorType
      when 0 then '/DeviceGray'
      when 2 then '/DeviceRGB'
      when 3
        paletteObj = pdf.addObj palette, null, PDFStream
        "[/Indexed /DeviceRGB #{palette.length / 3 - 1} #{paletteObj.ref}]"
      else @error = 'Unsupported number of colours in PNG'
    return if @error?
    
    super objNum, """
      <<
      /Type /XObject
      /Subtype /Image
      /ColorSpace #{colorSpace}
      /BitsPerComponent #{bits}
      /Width #{width}
      /Height #{height}
      /Length #{imageData.length}
      /Filter /FlateDecode
      /DecodeParms <<
        /Predictor 15
        /Colors #{colors}
        /BitsPerComponent #{bits}
        /Columns #{width}
        >>
      >>
      stream
      #{imageData}
      endstream"""
  

class @PDFText
  @sanitize = (s, fontName, rep = '_', whitelist = '') ->
    sanitized = ''
    for i in [0...s.length]
      c = s.charAt i
      sanitized += if (PDFText.metrics.codes[c]? and PDFText.metrics.widths[fontName][c]?) or whitelist.indexOf(c) isnt -1 then c else rep
    sanitized
  
  @ligaturize = (s, fontName) ->
    for k, v of PDFText.metrics.ligatures[fontName]
      re = new RegExp k, 'g'
      s = s.replace re, v
    s
  
  @hexString = (s, hex = '<') ->
    for i in [0...s.length]
      hex += PDFText.metrics.codes[s.charAt i]
    hex + '>'
  
  @paragraphize = (s) -> s.split /\r\n|\r|\n/
  @wordify = (s) -> 
    words = s.match /[^ —–-]*[—–-]? */g
    words.pop()  # since last match always empty
    words
  
  @widthify = (words, fontName) ->
    widths = PDFText.metrics.widths[fontName]
    kerning = PDFText.metrics.kerning[fontName]
    
    for word, i in words
      nextWord = words[i + 1]
      nextWordChar = nextWord?.charAt(0)
      word += nextWordChar ? ' '
      
      midWidth = endWidth = charCount = spaceCount = 0
      seenSpace = no
      str = TJData = ''
      
      for i in [0...(word.length - 1)]  # exclude final char, which is part of next word (or a space)
        char = word.charAt i
        nextChar = word.charAt(i + 1)
        
        seenSpace ||= char is ' '
        charWidth = widths[char]
        midWidth += charWidth 
        endWidth += charWidth unless seenSpace
        charCount++
        spaceCount++ if seenSpace
        
        str += char
        
        kernWidth = kerning[char]?[nextChar]
        if kernWidth?
          TJData += "#{PDFText.hexString str} #{kernWidth} "
          str = ''
          midWidth -= kernWidth
          endWidth -= kernWidth unless seenSpace
      
      TJData += "#{PDFText.hexString str} " if str.length > 0
      {TJData, midWidth, endWidth, charCount, spaceCount}
  
  @preprocessPara = (s, fontName, ligatures = yes) ->  
    ligaturize = if ligatures then PDFText.ligaturize else noop  # NB. disable ligatures if using full justification
    PDFText.widthify(PDFText.wordify(ligaturize(PDFText.sanitize(s, fontName), fontName)), fontName)
  
  @flowPara = (para, fontSize, opts) ->
    opts.maxWidth   ?= Infinity
    opts.maxHeight  ?= Infinity
    opts.lineHeight ?= 1.25
    opts.align      ?= 'left'  # or 'right', 'centre', 'full' (in which case, remember: disable ligatures)
    opts.justify    ?= {wordSpaceFactor: 0.45, charSpaceFactor: 0.40, stretchFactor: 0.15}
    
    scale = 1000 / fontSize
    
    para = para[0..]  # copy
    scaledMaxWidth = opts.maxWidth * scale
    leading = fontSize * opts.lineHeight
    scaledWidth = height = scaledLineWidth = charCount = spaceCount = 0
    line = []
    linesData = []
    
    fix = (n) -> n.toFixed(3).replace /\.?0+$/, ''
    finishLine = ->
      lastWord = line[line.length - 1]
      scaledLineWidth += lastWord.endWidth - lastWord.midWidth
      charCount -= lastWord.spaceCount
      spaceCount -= lastWord.spaceCount
      linesData.push {line, scaledLineWidth, charCount, spaceCount}
      height += leading
    
    while para.length > 0
      word = para.shift()
      willWrap = scaledLineWidth + word.endWidth > scaledMaxWidth and line.length > 0
      if willWrap
        finishLine()
        willExceedHeight = height + leading > opts.maxHeight
        if willExceedHeight
          para.unshift word
          break
        else
          line = []
          scaledLineWidth = charCount = spaceCount = 0
          
      line.push word
      scaledLineWidth += word.midWidth
      charCount += word.charCount
      spaceCount += word.spaceCount
      
      finishLine() if para.length is 0
    
    scaledWidth = 0
    commands = "#{fix leading} TL 0 Tw 0 Tc 100 Tz\n"
    numLines = linesData.length
    for lineData, i in linesData
      {line, scaledLineWidth, charCount, spaceCount} = lineData
      scaledWidth = scaledLineWidth if scaledLineWidth > scaledWidth
      minusRSpace = scaledLineWidth - scaledMaxWidth
      minusLSpace = switch opts.align
        when 'right' then fix(minusRSpace) + ' '
        when 'centre', 'center' then fix(minusRSpace / 2) + ' '
        else ''  # left and full
      if opts.align is 'full'
        if i is numLines - 1 and minusRSpace < 0  # do nothing to last line unless too long
          wordSpace = charSpace = 0
          charStretch = 100
        else
          {wordSpaceFactor, charSpaceFactor, stretchFactor} = opts.justify
          if spaceCount is 0  # reapportion factors if there are no spaces (avoids / 0)
            wordSpace = 0
            charSpaceFactor *= 1 / (1 - wordSpaceFactor)
            stretchFactor   *= 1 / (1 - wordSpaceFactor)
          else
            wordSpace = - wordSpaceFactor * minusRSpace / spaceCount / scale
          charSpace = - charSpaceFactor * minusRSpace / (charCount - 1) / scale
          charStretch = 100 / (1 - (- minusRSpace * stretchFactor / scaledMaxWidth))
        commands += "#{fix wordSpace} Tw #{fix charSpace} Tc #{fix charStretch} Tz "
      
      TJData = (word.TJData for word in line)
      commands += "[ #{minusLSpace}#{TJData.join('').replace /> </g, ''}] TJ T*\n"
    
    width = scaledWidth / scale
    {commands, para, width, height}
  

class @PDFBuiltInFont extends PDFObj
  constructor: (objNum, fontName) ->
     # encoding matches metrics.js
    super objNum, """
      <<
      /Type /Font 
      /Subtype /Type1
      /BaseFont /#{fontName}
      /Encoding <<
        /Type /Encoding
        /BaseEncoding /MacRomanEncoding
        /Differences [219 /Euro]
        >>
      >>"""
  

class @PDFAppend
  @zeroPad = (n, len) ->
    # for len up to 10
    zeroes = '0000000000'
    str = '' + n
    zeroes.substring(0, len - str.length) + str
  
  @randomId = ->
    (Math.floor(Math.random() * 15.99).toString(16) for i in [0..31]).join ''
  
  constructor: (@basePDF) ->
    @objs = []    
    @baseLen = @basePDF.length
    trailer = @basePDF.substring @basePDF.lastIndexOf 'trailer'
    @nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1]
    @root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1]
    @info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1]
    @id = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1]
    @baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1]
  
  addObj: (content, objNum, objType = PDFObj) ->
    objNum ?= @nextFreeObjNum++
    obj = new objType objNum, content, @
    @objs.push obj unless obj.error?
    obj
  
  asBinaryString: ->
    @objs.sort (a, b) -> a.objNum - b.objNum
    body = (o.binaryString for o in @objs).join ''
    
    consecutiveObjSets = []
    lastObjNum = null
    for o in @objs
      consecutiveObjSets.push (currentSet = []) unless lastObjNum? and o.objNum is lastObjNum + 1
      currentSet.push o
      lastObjNum = o.objNum
    xref = """\n
      xref
      0 1
      0000000000 65535 f \n"""
    objOffset = @baseLen
    for os in consecutiveObjSets
      xref += "#{os[0].objNum} #{os.length}\n"
      for o in os
        xref += "#{PDFAppend.zeroPad objOffset, 10} 00000 n \n"
        objOffset += o.binaryString.length
    
    trailer = """\ntrailer
      <<
      /Root #{@root}
      /Info #{@info}
      /Prev #{@baseStartXref}
      /Size #{@nextFreeObjNum}
      /ID [<#{@id}> <#{PDFAppend.randomId()}>]
      >>
      
      startxref
      #{objOffset}
      %%EOF
    """
    @basePDF + body + xref + trailer
  
  asDataURI: ->
    b64 @asBinaryString(), 'data:application/pdf;base64,'
  

