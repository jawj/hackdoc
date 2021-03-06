class ParallelWaiter  # waits for parallel async jobs
  constructor: (@waitingFor, @cb) -> @returnValues = {}
  await: (n = 1) -> @waitingFor += n
  done: (id, returnValue) ->
    @returnValues[id] = returnValue if id?
    @cb(@returnValues) if --@waitingFor is 0


xhr = (opts = {}) ->  # for IE6, and serious cross-browser wrangling, use jQuery!
  method = opts.method ? 'GET'
  req = new XMLHttpRequest()
  req.onreadystatechange = -> 
    if req.readyState is 4 and (req.status is 200 or not location.href.match /^https?:/)
      opts.success(req)
  req.overrideMimeType 'text/plain; charset=x-user-defined' if opts.binary
  req.overrideMimeType opts.mime if opts.mime?
  req.user = opts.user if opts.user?
  req.password = opts.password if opts.password?
  req.setRequestHeader k, v for k, v of opts.headers if opts.headers?
  req.open method, opts.url
  req.send opts.data
  yes

unicodeEscapeFromGlyphName = (gn) -> macRomanUnicodeEscapes[glyphNamesMacRoman[gn]]
toHex = (n) ->
  s = n.toString(16)
  s = '0' + s if s.length is 1
  s.toUpperCase()

fontNames = 'Helvetica Helvetica-Bold Helvetica-Oblique Helvetica-BoldOblique Times-Roman Times-Bold Times-Italic Times-BoldItalic'.split /\s+/
widths = {}
ligatures = {}
kerning = {}
macRomanUnicodeEscapes = {}
unicodeEscapesMacRoman = {}
macRomanGlyphNames = {}
glyphNamesMacRoman = {}
waiter = new ParallelWaiter fontNames.length + 2, (data) ->
  
  # MacRoman <-> unicode
  for line in data.MacRoman.split '\n'
    fields = line.match(/(\S+)\t(\S+)/)
    if fields?
      code = parseInt fields[1]
      uesc = fields[2].replace '0x', '\\u'
      macRomanUnicodeEscapes[code] = uesc
      unicodeEscapesMacRoman[uesc] = code
  console.log 'Mac Roman -> unicode', macRomanUnicodeEscapes, 'unicode -> Mac Roman', unicodeEscapesMacRoman
  
  # glyph names <-> MacRoman
  for line in data.PDFEncs.split '\n'
    fields = line.split /\s+/
    macRomanCode = +fields[4]
    continue unless macRomanCode
    glyphname = fields[1]
    macRomanGlyphNames[macRomanCode] = glyphname
    glyphNamesMacRoman[glyphname] = macRomanCode
  console.log 'Mac Roman -> glyph name', macRomanGlyphNames, 'glyph name -> Mac Roman', glyphNamesMacRoman
  
  # metrics etc
  for fontName, afm of data when fontName not in ['MacRoman', 'PDFEncs']
    fontWidths = widths[fontName] = {}
    fontLigs = ligatures[fontName] = {}
    fontKerning = kerning[fontName] = {}
    for line in afm.split '\n'
      fields = line.split ';'
      wx = name = ligs = null
      for field in fields
        wx ?= field.match(/\s*WX\s+(\S+)/)?[1]
        name ?= field.match(/\s*N\s+(\S+)/)?[1]
        lig = field.match(/\s*L\s+(\S+)\s+(\S+)/)
        if lig
          ligs ?= {}
          ligs[unicodeEscapeFromGlyphName lig[1]] = unicodeEscapeFromGlyphName lig[2]
        kpx = field.match(/\s*KPX\s+(\S+)\s+(\S+)\s+(\S+)/)
      if wx?
        uesc = unicodeEscapeFromGlyphName name
        fontWidths[uesc] = +wx if uesc?
        if uesc? and ligs?
          for k, v of ligs
            fontLigs[uesc + k] = v
      else if kpx?
        [name1, name2, kern] = kpx[1..3]
        uesc1 = unicodeEscapeFromGlyphName name1
        uesc2 = unicodeEscapeFromGlyphName name2
        if uesc1? and uesc2?
          fontKerning[uesc1] ?= {}
          fontKerning[uesc1][uesc2] = -kern
          #fontKerning[uesc1 + uesc2] = -kern    
  console.log 'widths', widths, 'kerning', kerning, 'ligatures', ligatures
  
  codes = {}
  for k, v of unicodeEscapesMacRoman
    codes[k] = toHex(v)
  
  document.getElementsByTagName('body')[0].appendChild document.createTextNode JSON.stringify({widths, kerning, ligatures, codes}).
    replace(/\\\\u.{4}/g, (m) -> 
      code = parseInt(m.substring(3), 16)
      if code >= 32 and code <= 126
        char = String.fromCharCode(code)
        char = '\\' + char if char in ['"', '\\']
        char
      else
        m.replace('\\\\', '\\')
    ).
    replace(/\}\,/g, '},\n')

xhr url: "ROMAN.TXT", success: (req) -> waiter.done 'MacRoman', req.responseText
xhr url: "pdfencs.txt", success: (req) -> waiter.done 'PDFEncs', req.responseText
for fontName in fontNames
  do (fontName, waiter) ->
    xhr url: "#{fontName}.afm", success: (req) -> waiter.done fontName, req.responseText


winANSICodeGlyphNames = [
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  '.notdef'
  'space'
  'exclam'
  'quotedbl'
  'numbersign'
  'dollar'
  'percent'
  'ampersand'
  'quotesingle'
  'parenleft'
  'parenright'
  'asterisk'
  'plus'
  'comma'
  'hyphen'
  'period'
  'slash'
  'zero'
  'one'
  'two'
  'three'
  'four'
  'five'
  'six'
  'seven'
  'eight'
  'nine'
  'colon'
  'semicolon'
  'less'
  'equal'
  'greater'
  'question'
  'at'
  'A'
  'B'
  'C'
  'D'
  'E'
  'F'
  'G'
  'H'
  'I'
  'J'
  'K'
  'L'
  'M'
  'N'
  'O'
  'P'
  'Q'
  'R'
  'S'
  'T'
  'U'
  'V'
  'W'
  'X'
  'Y'
  'Z'
  'bracketleft'
  'backslash'
  'bracketright'
  'asciicircum'
  'underscore'
  'grave'
  'a'
  'b'
  'c'
  'd'
  'e'
  'f'
  'g'
  'h'
  'i'
  'j'
  'k'
  'l'
  'm'
  'n'
  'o'
  'p'
  'q'
  'r'
  's'
  't'
  'u'
  'v'
  'w'
  'x'
  'y'
  'z'
  'braceleft'
  'bar'
  'braceright'
  'asciitilde'
  '.notdef'
  'Euro'
  '.notdef'
  'quotesinglbase'
  'florin'
  'quotedblbase'
  'ellipsis'
  'dagger'
  'daggerdbl'
  'circumflex'
  'perthousand'
  'Scaron'
  'guilsinglleft'
  'OE'
  '.notdef'
  'Zcaron'
  'fi'  # custom
  'fl'  # custom
  'quoteleft'
  'quoteright'
  'quotedblleft'
  'quotedblright'
  'bullet'
  'endash'
  'emdash'
  'tilde'
  'trademark'
  'scaron'
  'guilsinglright'
  'oe'
  '.notdef'
  'zcaron'
  'ydieresis'
  'space'
  'exclamdown'
  'cent'
  'sterling'
  'currency'
  'yen'
  'brokenbar'
  'section'
  'dieresis'
  'copyright'
  'ordfeminine'
  'guillemotleft'
  'logicalnot'
  'hyphen'
  'registered'
  'macron'
  'degree'
  'plusminus'
  'twosuperior'
  'threesuperior'
  'acute'
  'mu'
  'paragraph'
  'periodcentered'
  'cedilla'
  'onesuperior'
  'ordmasculine'
  'guillemotright'
  'onequarter'
  'onehalf'
  'threequarters'
  'questiondown'
  'Agrave'
  'Aacute'
  'Acircumflex'
  'Atilde'
  'Adieresis'
  'Aring'
  'AE'
  'Ccedilla'
  'Egrave'
  'Eacute'
  'Ecircumflex'
  'Edieresis'
  'Igrave'
  'Iacute'
  'Icircumflex'
  'Idieresis'
  'Eth'
  'Ntilde'
  'Ograve'
  'Oacute'
  'Ocircumflex'
  'Otilde'
  'Odieresis'
  'multiply'
  'Oslash'
  'Ugrave'
  'Uacute'
  'Ucircumflex'
  'Udieresis'
  'Yacute'
  'Thorn'
  'germandbls'
  'agrave'
  'aacute'
  'acircumflex'
  'atilde'
  'adieresis'
  'aring'
  'ae'
  'ccedilla'
  'egrave'
  'eacute'
  'ecircumflex'
  'edieresis'
  'igrave'
  'iacute'
  'icircumflex'
  'idieresis'
  'eth'
  'ntilde'
  'ograve'
  'oacute'
  'ocircumflex'
  'otilde'
  'odieresis'
  'divide'
  'oslash'
  'ugrave'
  'uacute'
  'ucircumflex'
  'udieresis'
  'yacute'
  'thorn'
  'ydieresis'
]

unicodeEscapeWinANSICodes =
  '\\u0000': 0
  '\\u0001': 1
  '\\u0002': 2
  '\\u0003': 3
  '\\u0004': 4
  '\\u0005': 5
  '\\u0006': 6
  '\\u0007': 7
  '\\u0008': 8
  '\\u0009': 9
  '\\u000A': 10
  '\\u000B': 11
  '\\u000C': 12
  '\\u000D': 13
  '\\u000E': 14
  '\\u000F': 15
  '\\u0010': 16
  '\\u0011': 17
  '\\u0012': 18
  '\\u0013': 19
  '\\u0014': 20
  '\\u0015': 21
  '\\u0016': 22
  '\\u0017': 23
  '\\u0018': 24
  '\\u0019': 25
  '\\u001A': 26
  '\\u001B': 27
  '\\u001C': 28
  '\\u001D': 29
  '\\u001E': 30
  '\\u001F': 31
  '\\u0020': 32
  '\\u0021': 33
  '\\u0022': 34
  '\\u0023': 35
  '\\u0024': 36
  '\\u0025': 37
  '\\u0026': 38
  '\\u0027': 39
  '\\u0028': 40
  '\\u0029': 41
  '\\u002A': 42
  '\\u002B': 43
  '\\u002C': 44
  '\\u002D': 45
  '\\u002E': 46
  '\\u002F': 47
  '\\u0030': 48
  '\\u0031': 49
  '\\u0032': 50
  '\\u0033': 51
  '\\u0034': 52
  '\\u0035': 53
  '\\u0036': 54
  '\\u0037': 55
  '\\u0038': 56
  '\\u0039': 57
  '\\u003A': 58
  '\\u003B': 59
  '\\u003C': 60
  '\\u003D': 61
  '\\u003E': 62
  '\\u003F': 63
  '\\u0040': 64
  '\\u0041': 65
  '\\u0042': 66
  '\\u0043': 67
  '\\u0044': 68
  '\\u0045': 69
  '\\u0046': 70
  '\\u0047': 71
  '\\u0048': 72
  '\\u0049': 73
  '\\u004A': 74
  '\\u004B': 75
  '\\u004C': 76
  '\\u004D': 77
  '\\u004E': 78
  '\\u004F': 79
  '\\u0050': 80
  '\\u0051': 81
  '\\u0052': 82
  '\\u0053': 83
  '\\u0054': 84
  '\\u0055': 85
  '\\u0056': 86
  '\\u0057': 87
  '\\u0058': 88
  '\\u0059': 89
  '\\u005A': 90
  '\\u005B': 91
  '\\u005C': 92
  '\\u005D': 93
  '\\u005E': 94
  '\\u005F': 95
  '\\u0060': 96
  '\\u0061': 97
  '\\u0062': 98
  '\\u0063': 99
  '\\u0064': 100
  '\\u0065': 101
  '\\u0066': 102
  '\\u0067': 103
  '\\u0068': 104
  '\\u0069': 105
  '\\u006A': 106
  '\\u006B': 107
  '\\u006C': 108
  '\\u006D': 109
  '\\u006E': 110
  '\\u006F': 111
  '\\u0070': 112
  '\\u0071': 113
  '\\u0072': 114
  '\\u0073': 115
  '\\u0074': 116
  '\\u0075': 117
  '\\u0076': 118
  '\\u0077': 119
  '\\u0078': 120
  '\\u0079': 121
  '\\u007A': 122
  '\\u007B': 123
  '\\u007C': 124
  '\\u007D': 125
  '\\u007E': 126
  '\\u007F': 127
  '\\u20AC': 128
  '\\u201A': 130
  '\\u0192': 131
  '\\u201E': 132
  '\\u2026': 133
  '\\u2020': 134
  '\\u2021': 135
  '\\u02C6': 136
  '\\u2030': 137
  '\\u0160': 138
  '\\u2039': 139
  '\\u0152': 140
  '\\u017D': 142
  '\\u2018': 145
  '\\u2019': 146
  '\\u201C': 147
  '\\u201D': 148
  '\\u2022': 149
  '\\u2013': 150
  '\\u2014': 151
  '\\u02DC': 152
  '\\u2122': 153
  '\\u0161': 154
  '\\u203A': 155
  '\\u0153': 156
  '\\u017E': 158
  '\\u0178': 159
  '\\u00A0': 160
  '\\u00A1': 161
  '\\u00A2': 162
  '\\u00A3': 163
  '\\u00A4': 164
  '\\u00A5': 165
  '\\u00A6': 166
  '\\u00A7': 167
  '\\u00A8': 168
  '\\u00A9': 169
  '\\u00AA': 170
  '\\u00AB': 171
  '\\u00AC': 172
  '\\u00AD': 173
  '\\u00AE': 174
  '\\u00AF': 175
  '\\u00B0': 176
  '\\u00B1': 177
  '\\u00B2': 178
  '\\u00B3': 179
  '\\u00B4': 180
  '\\u00B5': 181
  '\\u00B6': 182
  '\\u00B7': 183
  '\\u00B8': 184
  '\\u00B9': 185
  '\\u00BA': 186
  '\\u00BB': 187
  '\\u00BC': 188
  '\\u00BD': 189
  '\\u00BE': 190
  '\\u00BF': 191
  '\\u00C0': 192
  '\\u00C1': 193
  '\\u00C2': 194
  '\\u00C3': 195
  '\\u00C4': 196
  '\\u00C5': 197
  '\\u00C6': 198
  '\\u00C7': 199
  '\\u00C8': 200
  '\\u00C9': 201
  '\\u00CA': 202
  '\\u00CB': 203
  '\\u00CC': 204
  '\\u00CD': 205
  '\\u00CE': 206
  '\\u00CF': 207
  '\\u00D0': 208
  '\\u00D1': 209
  '\\u00D2': 210
  '\\u00D3': 211
  '\\u00D4': 212
  '\\u00D5': 213
  '\\u00D6': 214
  '\\u00D7': 215
  '\\u00D8': 216
  '\\u00D9': 217
  '\\u00DA': 218
  '\\u00DB': 219
  '\\u00DC': 220
  '\\u00DD': 221
  '\\u00DE': 222
  '\\u00DF': 223
  '\\u00E0': 224
  '\\u00E1': 225
  '\\u00E2': 226
  '\\u00E3': 227
  '\\u00E4': 228
  '\\u00E5': 229
  '\\u00E6': 230
  '\\u00E7': 231
  '\\u00E8': 232
  '\\u00E9': 233
  '\\u00EA': 234
  '\\u00EB': 235
  '\\u00EC': 236
  '\\u00ED': 237
  '\\u00EE': 238
  '\\u00EF': 239
  '\\u00F0': 240
  '\\u00F1': 241
  '\\u00F2': 242
  '\\u00F3': 243
  '\\u00F4': 244
  '\\u00F5': 245
  '\\u00F6': 246
  '\\u00F7': 247
  '\\u00F8': 248
  '\\u00F9': 249
  '\\u00FA': 250
  '\\u00FB': 251
  '\\u00FC': 252
  '\\u00FD': 253
  '\\u00FE': 254
  '\\u00FF': 255

unicodeWinANSIHex =
  '\u0000': '00'
  '\u0001': '01'
  '\u0002': '02'
  '\u0003': '03'
  '\u0004': '04'
  '\u0005': '05'
  '\u0006': '06'
  '\u0007': '07'
  '\u0008': '08'
  '\u0009': '09'
  '\u000A': '0A'
  '\u000B': '0B'
  '\u000C': '0C'
  '\u000D': '0D'
  '\u000E': '0E'
  '\u000F': '0F'
  '\u0010': '10'
  '\u0011': '11'
  '\u0012': '12'
  '\u0013': '13'
  '\u0014': '14'
  '\u0015': '15'
  '\u0016': '16'
  '\u0017': '17'
  '\u0018': '18'
  '\u0019': '19'
  '\u001A': '1A'
  '\u001B': '1B'
  '\u001C': '1C'
  '\u001D': '1D'
  '\u001E': '1E'
  '\u001F': '1F'
  '\u0020': '20'
  '\u0021': '21'
  '\u0022': '22'
  '\u0023': '23'
  '\u0024': '24'
  '\u0025': '25'
  '\u0026': '26'
  '\u0027': '27'
  '\u0028': '28'
  '\u0029': '29'
  '\u002A': '2A'
  '\u002B': '2B'
  '\u002C': '2C'
  '\u002D': '2D'
  '\u002E': '2E'
  '\u002F': '2F'
  '\u0030': '30'
  '\u0031': '31'
  '\u0032': '32'
  '\u0033': '33'
  '\u0034': '34'
  '\u0035': '35'
  '\u0036': '36'
  '\u0037': '37'
  '\u0038': '38'
  '\u0039': '39'
  '\u003A': '3A'
  '\u003B': '3B'
  '\u003C': '3C'
  '\u003D': '3D'
  '\u003E': '3E'
  '\u003F': '3F'
  '\u0040': '40'
  '\u0041': '41'
  '\u0042': '42'
  '\u0043': '43'
  '\u0044': '44'
  '\u0045': '45'
  '\u0046': '46'
  '\u0047': '47'
  '\u0048': '48'
  '\u0049': '49'
  '\u004A': '4A'
  '\u004B': '4B'
  '\u004C': '4C'
  '\u004D': '4D'
  '\u004E': '4E'
  '\u004F': '4F'
  '\u0050': '50'
  '\u0051': '51'
  '\u0052': '52'
  '\u0053': '53'
  '\u0054': '54'
  '\u0055': '55'
  '\u0056': '56'
  '\u0057': '57'
  '\u0058': '58'
  '\u0059': '59'
  '\u005A': '5A'
  '\u005B': '5B'
  '\u005C': '5C'
  '\u005D': '5D'
  '\u005E': '5E'
  '\u005F': '5F'
  '\u0060': '60'
  '\u0061': '61'
  '\u0062': '62'
  '\u0063': '63'
  '\u0064': '64'
  '\u0065': '65'
  '\u0066': '66'
  '\u0067': '67'
  '\u0068': '68'
  '\u0069': '69'
  '\u006A': '6A'
  '\u006B': '6B'
  '\u006C': '6C'
  '\u006D': '6D'
  '\u006E': '6E'
  '\u006F': '6F'
  '\u0070': '70'
  '\u0071': '71'
  '\u0072': '72'
  '\u0073': '73'
  '\u0074': '74'
  '\u0075': '75'
  '\u0076': '76'
  '\u0077': '77'
  '\u0078': '78'
  '\u0079': '79'
  '\u007A': '7A'
  '\u007B': '7B'
  '\u007C': '7C'
  '\u007D': '7D'
  '\u007E': '7E'
  '\u007F': '7F'
  '\u20AC': '80'
  '\u201A': '82'
  '\u0192': '83'
  '\u201E': '84'
  '\u2026': '85'
  '\u2020': '86'
  '\u2021': '87'
  '\u02C6': '88'
  '\u2030': '89'
  '\u0160': '8A'
  '\u2039': '8B'
  '\u0152': '8C'
  '\u017D': '8E'
  '\u2018': '91'
  '\u2019': '92'
  '\u201C': '93'
  '\u201D': '94'
  '\u2022': '95'
  '\u2013': '96'
  '\u2014': '97'
  '\u02DC': '98'
  '\u2122': '99'
  '\u0161': '9A'
  '\u203A': '9B'
  '\u0153': '9C'
  '\u017E': '9E'
  '\u0178': '9F'
  '\u00A0': 'A0'
  '\u00A1': 'A1'
  '\u00A2': 'A2'
  '\u00A3': 'A3'
  '\u00A4': 'A4'
  '\u00A5': 'A5'
  '\u00A6': 'A6'
  '\u00A7': 'A7'
  '\u00A8': 'A8'
  '\u00A9': 'A9'
  '\u00AA': 'AA'
  '\u00AB': 'AB'
  '\u00AC': 'AC'
  '\u00AD': 'AD'
  '\u00AE': 'AE'
  '\u00AF': 'AF'
  '\u00B0': 'B0'
  '\u00B1': 'B1'
  '\u00B2': 'B2'
  '\u00B3': 'B3'
  '\u00B4': 'B4'
  '\u00B5': 'B5'
  '\u00B6': 'B6'
  '\u00B7': 'B7'
  '\u00B8': 'B8'
  '\u00B9': 'B9'
  '\u00BA': 'BA'
  '\u00BB': 'BB'
  '\u00BC': 'BC'
  '\u00BD': 'BD'
  '\u00BE': 'BE'
  '\u00BF': 'BF'
  '\u00C0': 'C0'
  '\u00C1': 'C1'
  '\u00C2': 'C2'
  '\u00C3': 'C3'
  '\u00C4': 'C4'
  '\u00C5': 'C5'
  '\u00C6': 'C6'
  '\u00C7': 'C7'
  '\u00C8': 'C8'
  '\u00C9': 'C9'
  '\u00CA': 'CA'
  '\u00CB': 'CB'
  '\u00CC': 'CC'
  '\u00CD': 'CD'
  '\u00CE': 'CE'
  '\u00CF': 'CF'
  '\u00D0': 'D0'
  '\u00D1': 'D1'
  '\u00D2': 'D2'
  '\u00D3': 'D3'
  '\u00D4': 'D4'
  '\u00D5': 'D5'
  '\u00D6': 'D6'
  '\u00D7': 'D7'
  '\u00D8': 'D8'
  '\u00D9': 'D9'
  '\u00DA': 'DA'
  '\u00DB': 'DB'
  '\u00DC': 'DC'
  '\u00DD': 'DD'
  '\u00DE': 'DE'
  '\u00DF': 'DF'
  '\u00E0': 'E0'
  '\u00E1': 'E1'
  '\u00E2': 'E2'
  '\u00E3': 'E3'
  '\u00E4': 'E4'
  '\u00E5': 'E5'
  '\u00E6': 'E6'
  '\u00E7': 'E7'
  '\u00E8': 'E8'
  '\u00E9': 'E9'
  '\u00EA': 'EA'
  '\u00EB': 'EB'
  '\u00EC': 'EC'
  '\u00ED': 'ED'
  '\u00EE': 'EE'
  '\u00EF': 'EF'
  '\u00F0': 'F0'
  '\u00F1': 'F1'
  '\u00F2': 'F2'
  '\u00F3': 'F3'
  '\u00F4': 'F4'
  '\u00F5': 'F5'
  '\u00F6': 'F6'
  '\u00F7': 'F7'
  '\u00F8': 'F8'
  '\u00F9': 'F9'
  '\u00FA': 'FA'
  '\u00FB': 'FB'
  '\u00FC': 'FC'
  '\u00FD': 'FD'
  '\u00FE': 'FE'
  '\u00FF': 'FF'
