
###
HackDoc -- client-side PDF generation
George MacKerron
https://github.com/jawj/hackdoc
###

# PDF ref: http://wwwimages.adobe.com/www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/PDF32000_2008.pdf

class PDFError
  constructor: (@code, @message) -> # nowt
  @codes =
    PDF_INVALID:        1
    IMAGE_INVALID:      2
    IMAGE_UNSUPPORTED:  3
    IMAGE_UNKNOWN:      4

class @PDFObj
  @create = (pdf, opts) -> new @(pdf, opts)
  
  constructor: (pdf, opts = {}) ->
    @objNum = opts.num ? pdf.nextObjNum()
    @ref = "#{@objNum} 0 R"
    @update opts
    pdf.addObj @
  
  update: (opts = {}) ->
    return unless opts.parts? or opts.data?
    parts = opts.parts ? [opts.data]
    @parts = ["\n#{@objNum} 0 obj\n", parts..., "\nendobj\n"]
    @length = 0
    (@length += part.length) for part in @parts
  

class @PDFStream extends PDFObj
  @lzwEnc = (input, earlyChange = 1) ->
    w = nextCode = dict = maxValueWithBits = null  # scope
    inString = typeof input is 'string'
    output = new Uint8Array input.length
    allBitsWritten = 0
    bitsPerValue = 9  # used to write CLEAR in first call to clear()
    keyPrefix = '#'   # so that compressing repeated 'hasOwnProperty', '__proto__' etc. is OK
    
    write = (value) ->  # writes 9- to 12-bit values
      valueBitsWritten = 0
      while valueBitsWritten < bitsPerValue
        bytePos = Math.floor(allBitsWritten / 8)
        bitPos = allBitsWritten % 8
        if bytePos is output.length  # we're overflowing our ArrayBuffer, so make a bigger one
          newOutput = new Uint8Array (output.length * 1.5)
          newOutput.set output
          output = newOutput
        if bitPos > 0  # writing at right of byte
          bitsToWrite = 8 - bitPos
          writeValue = value >> (bitsPerValue - bitsToWrite)
          output[bytePos] |= writeValue
        else if (bitsToWrite = bitsPerValue - valueBitsWritten) >= 8  # writing a whole byte
          writeValue = (value >> (bitsToWrite - 8)) & 0xff
          bitsToWrite = 8
          output[bytePos] = writeValue
        else  # writing at left of byte
          writeValue = (value << (8 - bitsToWrite)) & 0xff
          output[bytePos] |= writeValue
        valueBitsWritten += bitsToWrite
        allBitsWritten += bitsToWrite
      null
    
    clear = ->
      w = ''
      nextCode = 0
      dict = {}
      while nextCode < 258
        dict[keyPrefix + String.fromCharCode nextCode] = nextCode
        nextCode++
      write 256  # CLEAR, using old bitsPerValue
      bitsPerValue = 9
      maxValueWithBits = (1 << bitsPerValue) - earlyChange
    
    clear()
    
    len = input.length
    for i in [0...len]
      c = if inString then input.charAt i else String.fromCharCode input[i]
      wc = w + c
      kpwc = keyPrefix + wc
      if dict.hasOwnProperty kpwc
        w = wc
      else
        dict[kpwc] = nextCode++
        write dict[keyPrefix + w]
        w = c
        if nextCode > maxValueWithBits
          if bitsPerValue is 12
            write dict[keyPrefix + w]
            clear()
          else
            bitsPerValue++
            maxValueWithBits = (1 << bitsPerValue) - earlyChange
    
    write dict[keyPrefix + w]
    write 257  # EOD
    bytesUsed = Math.ceil(allBitsWritten / 8)
    output.subarray 0, bytesUsed
  
  constructor: (pdf, opts = {}) ->
    # opts: minify, lzw
    stream = opts.stream
    stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n') if opts.minify  # removes comments and blank lines
    filter = if opts.lzw
      stream = @constructor.lzwEnc stream
      '\n/Filter /LZWDecode'
    else ''
    opts.parts = ["""
      <<
      /Length #{stream.length}#{filter}
      >>
      stream\n""", stream, "\nendstream"]
    
    super pdf, opts
  

class @PDFJPEG extends PDFObj  # adapted from Prawn
  @header = '\xff\xd8\xff'
  @sofBlocks = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
  @identify = (opts) ->
    r = new Uint8ArrayReader new Uint8Array opts.arrBuf
    r.binString(PDFJPEG.header.length) is PDFJPEG.header
  
  constructor: (pdf, opts) ->
    jpeg = new Uint8Array opts.arrBuf
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
        decodeParam = '\n/Decode [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0]'  # from Prawn -- why?
        '/DeviceCMYK'
      else @error = 'Unsupported number of channels in JPEG'
    return if @error?
    
    opts.parts = ["""
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
      stream\n""", jpeg, "\nendstream"]
    
    super pdf, opts
  

class @PDFPNG extends PDFObj 
  # tested with: 
  # 1-bit, 2-bit, 4-bit, 8-bit, 16-bit grayscale; 8-bit, 16-bit RGB; 1-bit, 2-bit, 4-bit, 8-bit paletted
  
  # some images aren't supported:
  # - if opts.tag exists, they're punted to PDFImageViaCanvas
  # - otherwise the error property is set
  
  # unsupported images are those with:
  # - Adam7 interlacing
  # - alpha transparency (even if opts.ignoreTransparency is set)
  # - simple (tRNS) transparency /and/ paletted color type /and/ any color that's partially transparent
  #   (unless opts.ignoreTransparency is true)
  
  # references:
  # https://github.com/prawnpdf/prawn/blob/master/lib/prawn/images/png.rb
  # http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html
  # https://miktex.svn.sourceforge.net/svnroot/miktex/miktex/trunk/Programs/DviWare/xdvipdfmx/pngimage.c
  
  @header = '\x89PNG\r\n\x1a\n'
  @identify = (opts) ->
    r = new Uint8ArrayReader new Uint8Array opts.arrBuf
    r.binString(PDFPNG.header.length) is PDFPNG.header
  
  constructor: (pdf, opts) ->
    png = new Uint8Array opts.arrBuf
    r = new Uint8ArrayReader png
    r.skip PDFPNG.header.length
    
    imageData = []
    trns = null
    while not r.eof()
      chunkSize = r.uint32be()
      section = r.binString 4
      switch section
        when 'IHDR'
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
        when 'tRNS'
          trns = r.subarray chunkSize
        when 'IEND'
          break
        else 
          r.skip chunkSize
      r.skip 4  # chunk CRC
    
    @error = 'Unsupported compression in PNG' unless compressionMethod is 0  # only 0 is in PNG spec
    @error = 'Unsupported filter in PNG' unless filterMethod is 0            # ditto
    @error = 'Unsupported interlacing and/or alpha channel in PNG' if interlaceMethod isnt 0 or colorType in [4, 6]
    return if @error?
    
    mask = ''
    if trns? and not opts.ignoreTransparency
      tr = new Uint8ArrayReader trns
      switch colorType
        when 0  # grayscale
          greyVal = tr.uint16be()
          mask = "\n/Mask [ #{greyVal} #{greyVal} ]"
        when 2  # RGB (NB. Chrome PDF viewer screws this up for 16-bit RGB)
          rVal = tr.uint16be()
          gVal = tr.uint16be()
          bVal = tr.uint16be()
          mask = "\n/Mask [ #{rVal} #{rVal} #{gVal} #{gVal} #{bVal} #{bVal} ]"
        else  # 3, paletted (we can manage this as long as everything is fully opaque or fully transparent)
          mask = '\n/Mask ['
          len = trns.length
          for i in [0...len]
            alpha = tr.uchar()
            if alpha is 0x00
              mask += " #{i} #{i}"
            else if alpha isnt 0xff  # not 0 or ff => partial transparency, which can't be recreated with /Mask
              @error = 'Partial transparency (in tRNS chunk) unsupported in paletted PNG'
              return
          mask += ' ]'
    
    colors = switch colorType
      when 0, 3 then 1  # 0 = grayscale, 3 = paletted
      when 2 then 3     # 2 = RGB
      else null
    
    colorSpace = switch colorType
      when 0 then '/DeviceGray'
      when 2 then '/DeviceRGB'
      when 3
        paletteObj = PDFStream.create pdf, stream: palette
        "[/Indexed /DeviceRGB #{palette.length / 3 - 1} #{paletteObj.ref}]"
      else @error = 'Unsupported number of colours in PNG'
    return if @error?
    
    idatLen = 0
    (idatLen += chunk.length) for chunk in imageData
    
    opts.parts = ["""
      <<
      /Type /XObject
      /Subtype /Image
      /ColorSpace #{colorSpace}
      /BitsPerComponent #{bits}
      /Width #{@width}
      /Height #{@height}
      /Length #{idatLen}
      /Filter /FlateDecode
      /DecodeParms <<
        /Predictor 15
        /Colors #{colors}
        /BitsPerComponent #{bits}
        /Columns #{@width}
        >>#{mask}
      >>
      stream\n""", imageData..., "\nendstream"]
    
    super pdf, opts
  

class @PDFImageViaCanvas extends PDFObj
  constructor: (pdf, opts = {}) ->  
    # opts: lzw, ignoreTransparency
    
    {@width, @height} = opts.tag
    canvas = make tag: 'canvas', width: @width, height: @height
    ctx = canvas.getContext '2d'
    ctx.drawImage opts.tag, 0, 0
    pixelArr = (ctx.getImageData 0, 0, @width, @height).data
    
    rgbArr   = new Uint8Array @width * @height * 3  # not in-place using subarray, as data is a standard Array in IE
    alphaArr = new Uint8Array @width * @height unless opts.ignoreTransparency
    alphaTrans = no
    rgbPos = alphaPos = 0
    byteCount = pixelArr.length
    rowBytes = @width * 4
    
    for i in [0...byteCount] by 4
      predict = opts.lzw and i % rowBytes isnt 0
      rgbArr[rgbPos++] = pixelArr[i]     - if predict then pixelArr[i - 4] else 0
      rgbArr[rgbPos++] = pixelArr[i + 1] - if predict then pixelArr[i - 3] else 0
      rgbArr[rgbPos++] = pixelArr[i + 2] - if predict then pixelArr[i - 2] else 0
      unless opts.ignoreTransparency
        alpha = pixelArr[i + 3]
        alphaTrans ||= alpha isnt 0xff
        alphaArr[alphaPos++] = alpha     - if predict then pixelArr[i - 1] else 0
            
    smaskRef = if alphaTrans
      filter = if opts.lzw
        alphaArr = PDFStream.lzwEnc alphaArr
        "\n/Filter /LZWDecode /DecodeParms << /Predictor 2 /Colors 1 /Columns #{@width} >>"
      else ''
      
      smaskStream = PDFObj.create pdf, parts: ["""
        <<
        /Type /XObject
        /Subtype /Image
        /ColorSpace /DeviceGray
        /BitsPerComponent 8
        /Width #{@width}
        /Height #{@height}
        /Length #{alphaArr.length}#{filter}
        >>
        stream\n""", alphaArr, "\nendstream"]
      
      "\n/SMask #{smaskStream.ref}"
    else ''
    
    filter = if opts.lzw
      rgbArr = PDFStream.lzwEnc rgbArr
      "\n/Filter /LZWDecode /DecodeParms << /Predictor 2 /Colors 3 /Columns #{@width} >>"
    else ''
    
    opts.parts = ["""
      <<
      /Type /XObject
      /Subtype /Image
      /ColorSpace /DeviceRGB
      /BitsPerComponent 8
      /Width #{@width}
      /Height #{@height}
      /Length #{rgbArr.length}#{smaskRef}#{filter}
      >>
      stream\n""", rgbArr, "\nendstream"]
    
    super pdf, opts
  

class @PDFImage
  @xhr = (opts) ->
    tag = make tag: 'img', crossOrigin: 'anonymous'
    tag.src = opts.url  # must be set after crossOrigin attribute, hence separate
    tag.onload = -> 
      xhr type: 'arraybuffer', url: opts.url, success: (req) ->  # should be from cache
        arrBuf = req.response
        opts.success {arrBuf, tag}
    
  
  @create = (pdf, opts = {}) ->
    img = if opts.arrBuf? and PDFJPEG.identify opts 
      PDFJPEG.create pdf, opts
    else if opts.arrBuf? and PDFPNG.identify opts 
      PDFPNG.create pdf, opts
    if not img? or img.error?
      img = if opts.tag? and opts.tag.width > 0
        PDFImageViaCanvas.create pdf, opts
      else
        new @
    img
  
  constructor: ->
    @error = 'Image is not a supported JPEG or PNG, and <img> tag not supplied, not loaded, or not a browser-supported image'
  

class @PDFFont extends PDFObj
  constructor: (pdf, opts) ->
    opts.data = """
      <<
      /Type /Font 
      /Subtype /Type1
      /BaseFont /#{opts.name}
      /Encoding <<
        /Type /Encoding
        /BaseEncoding /MacRomanEncoding
        /Differences [219 /Euro]
        >>
      >>"""
    super pdf, opts
  

class @PDFText
  @sanitize = (s, fontName, rep = '_', whitelist = '') ->
    sanitized = ''
    for i in [0...s.length]
      c = s.charAt i
      sanitized += if (PDFMetrics.codes[c]? and PDFMetrics.widths[fontName][c]?) or whitelist.indexOf(c) isnt -1 then c else rep
    sanitized
  
  @ligaturize = (s, fontName) ->
    for k, v of PDFMetrics.ligatures[fontName]
      re = new RegExp k, 'g'
      s = s.replace re, v
    s
  
  @hexString = (s, hex = '<') ->
    for i in [0...s.length]
      hex += PDFMetrics.codes[s.charAt i]
    hex + '>'
  
  @paragraphize = (s) -> s.split /\r\n|\r|\n/
  @wordify = (s) -> 
    words = s.match /[^ —–-]*[—–-]? */g
    words.pop()  # since last match always empty
    words
  
  @widthify = (words, fontName) ->
    widths = PDFMetrics.widths[fontName]
    kerning = PDFMetrics.kerning[fontName]
    
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
    opts.hyphenate  ?= no
    opts.hyphLength ?= 0.8
    
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
      
      # hyphenate
      if opts.hyphenate and scaledLineWidth < opts.hyphLength * scaledMaxWidth
        console.log 'hyphenate after: ', lastWord, 'hyphenate: ', word
        
      
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
  

class @xPDFText
  class @Word
    @parasFromText = (s) -> s.split /\r\n|\r|\n/
    @wordsFromPara = (s, fontName, ligatures) -> 
      words = s.match /[^ —–-]*[—–-]? */g
      words.pop()  # since last match always empty
      new Word(w, words[i + 1], fontName, ligatures) for w, i in words
    
    @hexify = (s, hex = '<') ->
      len = s.length
      for i in [0...len]
        hex += PDFMetrics.codes[s.charAt i]
      hex + '>'
    
    constructor: (str, after, @fontName, ligatures = yes) ->
      rawStr = ''
      len = str.length
      for i in [0...len]
        c = str.charAt i
        rawStr += if PDFMetrics.codes[c]? and PDFMetrics.widths[@fontName][c]? then c else '_'
      
      ligStr = rawStr
      if ligatures
        for {re, lig} in PDFMetrics.ligatureRegExps[@fontName]
          ligStr = ligStr.replace re, lig
      
      @rawStr = rawStr
      @ligStr = ligStr if ligStr isnt rawStr  # only store if different (unusual)
      @charAfter = after.charAt 0 if after?
      
      word = (@ligStr ? @rawStr) + (@charAfter ? ' ')
      @midWidth = @endWidth = @charCount = @spaceCount = 0
      @commands = str = ''
      seenSpace = no
      widths = PDFMetrics.widths[fontName]
      kerning = PDFMetrics.kerning[fontName]
      
      lastCharIndex = word.length - 1  # exclude final char, which is part of next word (or a space)
      for i in [0...lastCharIndex]  
        char = word.charAt i
        nextChar = word.charAt(i + 1)
        seenSpace ||= char is ' '
        charWidth = widths[char]
        @midWidth += charWidth 
        @endWidth += charWidth unless seenSpace
        @charCount++
        @spaceCount++ if seenSpace
        str += char
        kernWidth = kerning[char]?[nextChar]
        if kernWidth?
          @commands += "#{@constructor.hexify str} #{kernWidth} "
          str = ''
          @midWidth -= kernWidth
          @endWidth -= kernWidth unless seenSpace
        
      @commands += "#{@constructor.hexify str} " if str.length > 0
    
  
  class @Flow
    defaults: 
      maxWidth:       Infinity
      maxHeight:      Infinity
      lineHeight:     1.3
      align:          'left'  # or 'right', 'centre', 'full'
      justifyOpts:
        # wordSpaceFactor:  0.8  # = 1 - stretchFactor - charSpaceFactor
        stretchFactor:    0.2
        charSpaceFactor:  0    # seems generally frowned on
      
    constructor: (words, fontSize, opts) ->
      @opts = extend {}, defaults, opts
      scale = 1000 / fontSize
      words = words[..]  # copy
      scaledMaxWidth = @opts.maxWidth * scale
      leading = fontSize * @opts.lineHeight
      @height = scaledWidth = scaledLineWidth = charCount = spaceCount = 0
      lineWords = []
      @lines = []
      
      fix = (n) -> n.toFixed(3).replace /\.?0+$/, ''
      finishLine = ->
        lastWord = lineWords[lineWords.length - 1]
        scaledLineWidth += lastWord.endWidth - lastWord.midWidth
        charCount -= lastWord.spaceCount
        spaceCount -= lastWord.spaceCount
        @lines.push new Line lineWords, scaledLineWidth, charCount, spaceCount
        @height += leading
        
      while words.length > 0
        word = para.shift()
        willWrap = scaledLineWidth + word.endWidth > scaledMaxWidth and line.length > 0
        if willWrap
          finishLine()
          willExceedHeight = height + leading > @opts.maxHeight
          if willExceedHeight
            para.unshift word
            break
          else
            lineWords = []
            scaledLineWidth = charCount = spaceCount = 0
        
        lineWords.push word
        scaledLineWidth += word.midWidth
        charCount += word.charCount
        spaceCount += word.spaceCount
        
        finishLine() if words.length is 0
        
      @remainingWords = words
      @width = scaledWidth / scale
      @width = scaledMaxWidth / scale if @opts.align is 'full' and scaledMaxWidth / scale < @width
     
    toCommands: ->
      "#{fix leading} TL 0 Tw 0 Tc 100 Tz\n" + (line for line in @lines).join "\n"
  
  class @Line
    constructor: (@words, @scaledWidth, @charCount, @spaceCount) ->
      
      
    toCommands: ->
      scaledWidth = 0
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

class @HackDoc
  @zeroPad = (n, len) ->
    zeroes = '0000000000'  # for len up to 10
    str = '' + n
    zeroes.substring(0, len - str.length) + str
  
  @randomId = ->
    (Math.floor(Math.random() * 15.99).toString(16) for i in [0..31]).join ''
  
  constructor: (basePDFArrBufOrVersion = '1.4') ->
    @objs = []
    @id = HackDoc.randomId()
    @appending = if typeof basePDFArrBufOrVersion is 'string'
      @basePDF = new Blob ["%PDF-#{basePDFArrBufOrVersion}\n\u0080\u07ff\n"]  # these 2 unicode chars in utf8 -> 4 bytes >= 128
      @baseLen = @basePDF.size
      @nextFreeObjNum = 1
      # @root must (and @info may) be set to obj refs manually
      no
      
    else
      @basePDF = new Uint8Array basePDFArrBufOrVersion
      @baseLen = @basePDF.length
      
      trailerPos = (pdf) ->
        [t, r, a, i, l, e] = (char.charCodeAt(0) for char in 'traile'.split '')
        pos = pdf.length
        while (--pos >= 6)
          return pos if pdf[pos] is r and pdf[pos - 1] is e and pdf[pos - 2] is l and 
            pdf[pos - 3] is i and pdf[pos - 4] is a and pdf[pos - 5] is r and pdf[pos - 6] is t
      
      r = new Uint8ArrayReader @basePDF
      trailer = r.seek(trailerPos @basePDF).binString()
      
      @nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1]
      @root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1]
      @info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1]
      @prevId = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1]
      @baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1]
      yes
  
  nextObjNum: -> @nextFreeObjNum++
  addObj: (obj) -> @objs.push obj unless obj in @objs
  toBlob: () ->
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
        xref += "#{HackDoc.zeroPad objOffset, 10} 00000 n \n"
        objOffset += o.length
    
    trailerPart = if @appending
      """
      /Prev #{@baseStartXref}
      /ID [<#{@prevId}> <#{@id}>]
      """
    else
      "/ID [<#{@id}> <#{@id}>]"
    
    trailerPart += "\n/Info #{@info}" if @info
    
    trailer = """\ntrailer
      <<
      #{trailerPart}
      /Root #{@root}
      /Size #{@nextFreeObjNum}
      >>
      
      startxref
      #{objOffset}
      %%EOF
    """
    
    allParts = [@basePDF, bodyParts..., xref, trailer]
    
    if new Blob([new Uint8Array 0]).size isnt 0  # Safari helpfully adds a Uint8Array to Blob as '[object Uint8Array]'
      allParts = for p in allParts
        if p.buffer?  # not worried about strings etc.
          if p.length is p.buffer.byteLength then p.buffer  # view is of whole of backing buffer, just use that
          else  # arrayview is a subarray with a larger backing buffer, so need to create a smaller one
            u8 = new Uint8Array p.length
            u8.set p
            u8.buffer
        else p
    
    new Blob allParts, type: 'application/pdf'
  
  linkAsync: (filename, cb) ->
    blob = @toBlob()
    if window.URL?
      cb make tag: 'a', href: URL.createObjectURL(blob), onclick: ->
        if navigator.msSaveOrOpenBlob?
          navigator.msSaveOrOpenBlob blob, filename
          return no
    else
      fr = new FileReader()
      fr.readAsDataURL blob
      fr.onload = ->
        cb make tag: 'a', href: fr.result, onclick: ->
          return no if navigator.appVersion.indexOf('Safari') isnt -1  # Safari crashes on clicking a long data URI


PDFMetrics.ligatureRegExps = {}
for fontName, ligs of PDFMetrics.ligatures
  PDFMetrics.ligatureRegExps[fontName] = for k, v of ligs
    {re: new RegExp(k, 'g'), lig: v}

