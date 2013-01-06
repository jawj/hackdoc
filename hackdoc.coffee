
# TODO
# search manually for 'trailer' instead of lastIndexOf
# test PDFImageViaCanvas alpha transparency
# support other PNG transparency types?

Uint8ArrayReader::lastIndexOf = (binStr) ->
  seq = for c in binStr.split ''
    0xff & c.charCodeAt 0
  seqEnd = seq.length - 1
  dataEnd = @data.length - 1
  for dataPos in [dataEnd..0]
    for seqPos in [seqEnd..0]
      dataCompPos = dataPos - (seqEnd - seqPos)
      break unless @data[dataCompPos] is seq[seqPos]
      return dataCompPos if seqPos is 0
  return -1

class @PDFObj
  constructor: (pdf, parts, opts = {}, refOnly = no) ->
    #console.log pdf, opts, parts
    parts = [parts] unless parts.constructor is Array
    @objNum ?= opts.num ? pdf.nextObjNum()
    @ref ?= "#{@objNum} 0 R"
    return if refOnly
    @parts = ["\n#{@objNum} 0 obj\n", parts..., "\nendobj\n"]
    @length = 0
    (@length += part.length) for part in @parts
    pdf.addObj @
  

class @PDFStream extends PDFObj
  constructor: (pdf, stream, opts = {}) ->
    stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n') if opts.minify?
    super pdf, ["<<\n/Length #{stream.length}\n>>\nstream\n", stream, "\nendstream"], opts

class @PDFJPEG extends PDFObj  # adapted from Prawn
  @header = '\xff\xd8\xff'
  @sofBlocks = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
  @identify = (arrBuf) ->
    r = new Uint8ArrayReader new Uint8Array arrBuf
    r.binString(PDFJPEG.header.length) is PDFJPEG.header
  
  constructor: (pdf, jpegArrBuf, opts) ->
    jpeg = new Uint8Array jpegArrBuf
    r = new Uint8ArrayReader jpeg
    r.skip PDFJPEG.header.length + 1
    segmentLength = r.uint16be()
    r.skip segmentLength - 2
    
    while not r.eof()
      if r.uchar() isnt 0xff
        @error = 'Invalid marker in JPEG'
        return
      code = r.uchar()
      length = r.uint16be()
      if code in PDFJPEG.sofBlocks
        bits = r.uchar()
        @height = r.uint16be()
        @width = r.uint16be()
        channels = r.uchar()
        break
      r.skip(length - 2)
    
    decodeParam = ''
    colorSpace = switch channels
      when 1 then '/DeviceGray'
      when 3 then '/DeviceRGB'
      when 4
        decodeParam = '\n/Decode [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0]'  # really?
        '/DeviceCMYK'
      else @error = 'Unsupported number of channels in JPEG'
    return if @error?
    
    super pdf, ["""
      <<
      /Type /XObject
      /Subtype /Image
      /Filter /DCTDecode
      /ColorSpace #{colorSpace}
      /BitsPerComponent #{bits}
      /Width #{@width}
      /Height #{@height}
      /Length #{jpeg.length}#{decodeParam}
      >>
      stream\n""", jpeg, "\nendstream"], opts
  

class @PDFPNG extends PDFObj  # adapted from Prawn
  # works: 1-bit, 2-bit, 4-bit, 8-bit, 16-bit grayscale
  # works: 8-bit, 16-bit RGB
  # works: 1-bit, 2-bit, 4-bit, 8-bit paletted
  # doesn't work: interlaced (error returned)
  # doesn't work: alpha transparency (error returned)
  # not honoured: tRNS-block palette/index transparency
  
  @header = '\x89PNG\r\n\x1a\n'
  @identify = (arrBuf) ->
    r = new Uint8ArrayReader new Uint8Array arrBuf
    r.binString(PDFPNG.header.length) is PDFPNG.header
    
  constructor: (pdf, pngArrBuf, opts) ->
    png = new Uint8Array pngArrBuf
    r = new Uint8ArrayReader png
    r.skip PDFPNG.header.length
    
    imageData = []
    while not r.eof()
      chunkSize = r.uint32be()
      section = r.binString 4
      switch section
        when 'IHDR'  # see http://www.w3.org/TR/PNG-Chunks.html#C.IHDR
          @width = r.uint32be()
          @height = r.uint32be()
          bits = r.uchar()
          colorType = r.uchar()
          compressionMethod = r.uchar()
          filterMethod = r.uchar()
          interlaceMethod = r.uchar()
          r.skip(chunkSize - 13)  # probably 0
        when 'PLTE'
          palette = r.subarray chunkSize
        when 'IDAT'
          imageData.push r.subarray chunkSize
        when 'IEND'
          break
        else 
          r.skip chunkSize
      r.skip 4  # chunk CRC
    
    @error = 'Unsupported compression in PNG' if compressionMethod isnt 0  # only 0 is in PNG spec
    @error = 'Unsupported filter in PNG' if filterMethod isnt 0            # ditto
    return if @error?
    
    return new PDFImageViaCanvas pdf, pngArrBuf, opts if interlaceMethod isnt 0 or colorType in [4, 6]
    
    colors = switch colorType
      when 0, 3 then 1  # 0 = grayscale, 3 = palette
      when 2 then 3     # 2 = RGB
      else null
      
    colorSpace = switch colorType
      when 0 then '/DeviceGray'
      when 2 then '/DeviceRGB'
      when 3
        paletteObj = new PDFStream pdf, palette
        "[/Indexed /DeviceRGB #{palette.length / 3 - 1} #{paletteObj.ref}]"
      else @error = 'Unsupported number of colours in PNG'
    return if @error?
    
    super pdf, ["""
      <<
      /Type /XObject
      /Subtype /Image
      /ColorSpace #{colorSpace}
      /BitsPerComponent #{bits}
      /Width #{@width}
      /Height #{@height}
      /Length #{imageData.length}
      /Filter /FlateDecode
      /DecodeParms <<
        /Predictor 15
        /Colors #{colors}
        /BitsPerComponent #{bits}
        /Columns #{@width}
        >>
      >>
      stream\n""", imageData..., "\nendstream\n"], opts
  

class PDFImageViaCanvas extends PDFObj
  constructor: (pdf, imgArrBuf, opts = {}) ->
    super pdf, '', opts, yes  # call super constructor with no content so that ref is available
    pdf.taskStarted()
    
    imgBlob = new Blob [new Uint8Array imgArrBuf]
    imgUrl = (URL ? webkitURL).createObjectURL imgBlob
    img = make tag: 'img', src: imgUrl
    img.onload = =>
      @width = img.width
      @height = img.height
      canvas = make tag: 'canvas', width: @width, height: @height
      ctx = canvas.getContext '2d'
      ctx.drawImage img, 0, 0
      pixelArr = (ctx.getImageData 0, 0, @width, @height).data
      rgbArr   = new Uint8Array @width * @height * 3
      alphaArr = new Uint8Array @width * @height
      rgbPos = alphaPos = 0
      byteCount = pixelArr.length
      opacityAlwaysFull = yes
      for i in [0...byteCount] by 4
        for j in [0...3]
          rgbArr[rgbPos++] = pixelArr[i + j]
        alpha = pixelArr[i + 3]
        alphaArr[alphaPos++] = alpha
        opacityAlwaysFull = no if alpha isnt 0xff
      
      smaskRef = ''
      unless opacityAlwaysFull
        smaskStream = new PDFObj pdf, ["""
          <<
          /Type /XObject
          /Subtype /Image
          /ColorSpace /DeviceGray
          /BitsPerComponent 8
          /Width #{@width}
          /Height #{@height}
          /Length #{alphaArr.length}
          >>
          stream\n""", alphaArr, "\nendstream\n"]
        smaskRef = "\n/SMask #{smaskStream.ref}"
      
      # simulate calling super constructor, with real content this time
      PDFObj.call @, pdf, ["""
        <<
        /Type /XObject
        /Subtype /Image
        /ColorSpace /DeviceRGB
        /BitsPerComponent 8
        /Width #{@width}
        /Height #{@height}
        /Length #{rgbArr.length}#{smaskRef}
        >>
        stream\n""", rgbArr, "\nendstream\n"], opts
      
      pdf.taskCompleted()

class @PDFImage
  constructor: (pdf, arrBuf, opts) ->
    if PDFJPEG.identify arrBuf 
      return new PDFJPEG pdf, arrBuf, opts
    else if PDFPNG.identify arrBuf 
      return new PDFPNG pdf, arrBuf, opts
    else 
      @error = 'No valid JPEG or PNG header in image'
  

class @PDFFont extends PDFObj
  constructor: (pdf, fontName, opts) ->
    super pdf, ["""
      <<
      /Type /Font 
      /Subtype /Type1
      /BaseFont /#{fontName}
      /Encoding <<
        /Type /Encoding
        /BaseEncoding /MacRomanEncoding
        /Differences [219 /Euro]
        >>
      >>
      """], opts
  

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
  
  @flowPara = (para, fontSize, opts = {}) ->
    opts.maxWidth   ?= Infinity
    opts.maxHeight  ?= Infinity
    opts.lineHeight ?= 1.3
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
      rSpace = scaledMaxWidth - scaledLineWidth
      minusLSpace = switch opts.align
        when 'right' then fix(- rSpace) + ' '
        when 'centre', 'center' then fix(- rSpace / 2) + ' '
        else ''  # left and full
      if opts.align is 'full'
        if i is numLines - 1 and rSpace >= 0  # do nothing to last line unless too long
          wordSpace = charSpace = 0
          charStretch = 100
        else
          {wordSpaceFactor, charSpaceFactor, stretchFactor} = opts.justify
          if spaceCount is 0  # reapportion factors if there are no spaces (avoids / 0)
            wordSpace = 0
            charSpaceFactor *= 1 / (1 - wordSpaceFactor)
            stretchFactor   *= 1 / (1 - wordSpaceFactor)
          else
            wordSpace = wordSpaceFactor * rSpace / spaceCount / scale
          charSpace = charSpaceFactor * rSpace / (charCount - 1) / scale
          charStretch = 100 / (1 - (rSpace * stretchFactor / scaledMaxWidth))
        commands += "#{fix wordSpace} Tw #{fix charSpace} Tc #{fix charStretch} Tz "
      
      TJData = (word.TJData for word in line)
      commands += "[ #{minusLSpace}#{TJData.join('').replace /> </g, ''}] TJ T*\n"
    
    width = scaledWidth / scale
    width = scaledMaxWidth / scale if opts.align is 'full' and scaledMaxWidth / scale < width
    {commands, para, width, height}
  

class @PDFAppend
  @zeroPad = (n, len) ->
    zeroes = '0000000000'  # for len up to 10
    str = '' + n
    zeroes.substring(0, len - str.length) + str
  
  @randomId = ->
    (Math.floor(Math.random() * 15.99).toString(16) for i in [0..31]).join ''
  
  constructor: (basePDFArrBuf) ->
    @awaitingTaskCount = 0
    @readyListeners = []
    
    @objs = []
    @basePDF = new Uint8Array basePDFArrBuf
    @baseLen = @basePDF.length
    
    reader = new Uint8ArrayReader @basePDF
    reader.seek reader.lastIndexOf 'trailer'
    trailer = reader.binString()
    
    @nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1]
    @root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1]
    @info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1]
    @id = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1]
    @baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1]
  
  taskStarted: -> @awaitingTaskCount++
  taskCompleted: -> 
    if --@awaitingTaskCount is 0
      func() for func in @readyListeners
  
  addReadyListener: (func) ->
    if @awaitingTaskCount is 0 then func()
    else @readyListeners.push func
  
  nextObjNum: -> @nextFreeObjNum++
  addObj: (obj) -> @objs.push obj
  toBlob: ->
    @objs.sort (a, b) -> a.objNum - b.objNum
    bodyParts = [].concat (o.parts for o in @objs)...
    
    consecutiveObjSets = []
    lastObjNum = null
    for o in @objs
      consecutiveObjSets.push (currentSet = []) unless lastObjNum? and o.objNum is lastObjNum + 1
      currentSet.push o
      lastObjNum = o.objNum
    xref = """
      \nxref
      0 1
      0000000000 65535 f \n"""
    objOffset = @baseLen
    for os in consecutiveObjSets
      xref += "#{os[0].objNum} #{os.length}\n"
      for o in os
        xref += "#{PDFAppend.zeroPad objOffset, 10} 00000 n \n"
        objOffset += o.length
    
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
    new Blob [@basePDF, bodyParts..., xref, trailer], type: 'application/pdf'
  

