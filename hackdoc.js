// Generated by CoffeeScript 1.8.0

/*
HackDoc -- client-side PDF generation
George MacKerron
https://github.com/jawj/hackdoc
 */
var PDFError, fontName, k, ligs, v, _ref,
  __slice = [].slice,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

PDFError = (function() {
  function PDFError(code, message) {
    this.code = code;
    this.message = message;
  }

  PDFError.codes = {
    PDF_INVALID: 1,
    IMAGE_INVALID: 2,
    IMAGE_UNSUPPORTED: 3,
    IMAGE_UNKNOWN: 4
  };

  return PDFError;

})();

this.PDFObj = (function() {
  PDFObj.create = function(pdf, opts) {
    return new this(pdf, opts);
  };

  function PDFObj(pdf, opts) {
    var _ref;
    if (opts == null) {
      opts = {};
    }
    this.objNum = (_ref = opts.num) != null ? _ref : pdf.nextObjNum();
    this.ref = "" + this.objNum + " 0 R";
    this.update(opts);
    pdf.addObj(this);
  }

  PDFObj.prototype.update = function(opts) {
    var part, parts, _i, _len, _ref, _ref1, _results;
    if (opts == null) {
      opts = {};
    }
    if (!((opts.parts != null) || (opts.data != null))) {
      return;
    }
    parts = (_ref = opts.parts) != null ? _ref : [opts.data];
    this.parts = ["\n" + this.objNum + " 0 obj\n"].concat(__slice.call(parts), ["\nendobj\n"]);
    this.length = 0;
    _ref1 = this.parts;
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      part = _ref1[_i];
      _results.push(this.length += part.length);
    }
    return _results;
  };

  return PDFObj;

})();

this.PDFStream = (function(_super) {
  __extends(PDFStream, _super);

  PDFStream.lzwEnc = function(input, earlyChange) {
    var allBitsWritten, bitsPerValue, bytesUsed, c, clear, dict, i, inString, keyPrefix, kpwc, len, maxValueWithBits, nextCode, output, w, wc, write, _i;
    if (earlyChange == null) {
      earlyChange = 1;
    }
    w = nextCode = dict = maxValueWithBits = null;
    inString = typeof input === 'string';
    output = new Uint8Array(input.length);
    allBitsWritten = 0;
    bitsPerValue = 9;
    keyPrefix = '#';
    write = function(value) {
      var bitPos, bitsToWrite, bytePos, newOutput, valueBitsWritten, writeValue;
      valueBitsWritten = 0;
      while (valueBitsWritten < bitsPerValue) {
        bytePos = Math.floor(allBitsWritten / 8);
        bitPos = allBitsWritten % 8;
        if (bytePos === output.length) {
          newOutput = new Uint8Array(output.length * 1.5);
          newOutput.set(output);
          output = newOutput;
        }
        if (bitPos > 0) {
          bitsToWrite = 8 - bitPos;
          writeValue = value >> (bitsPerValue - bitsToWrite);
          output[bytePos] |= writeValue;
        } else if ((bitsToWrite = bitsPerValue - valueBitsWritten) >= 8) {
          writeValue = (value >> (bitsToWrite - 8)) & 0xff;
          bitsToWrite = 8;
          output[bytePos] = writeValue;
        } else {
          writeValue = (value << (8 - bitsToWrite)) & 0xff;
          output[bytePos] |= writeValue;
        }
        valueBitsWritten += bitsToWrite;
        allBitsWritten += bitsToWrite;
      }
      return null;
    };
    clear = function() {
      w = '';
      nextCode = 0;
      dict = {};
      while (nextCode < 258) {
        dict[keyPrefix + String.fromCharCode(nextCode)] = nextCode;
        nextCode++;
      }
      write(256);
      bitsPerValue = 9;
      return maxValueWithBits = (1 << bitsPerValue) - earlyChange;
    };
    clear();
    len = input.length;
    for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
      c = inString ? input.charAt(i) : String.fromCharCode(input[i]);
      wc = w + c;
      kpwc = keyPrefix + wc;
      if (dict.hasOwnProperty(kpwc)) {
        w = wc;
      } else {
        dict[kpwc] = nextCode++;
        write(dict[keyPrefix + w]);
        w = c;
        if (nextCode > maxValueWithBits) {
          if (bitsPerValue === 12) {
            write(dict[keyPrefix + w]);
            clear();
          } else {
            bitsPerValue++;
            maxValueWithBits = (1 << bitsPerValue) - earlyChange;
          }
        }
      }
    }
    write(dict[keyPrefix + w]);
    write(257);
    bytesUsed = Math.ceil(allBitsWritten / 8);
    return output.subarray(0, bytesUsed);
  };

  function PDFStream(pdf, opts) {
    var filter, stream;
    if (opts == null) {
      opts = {};
    }
    stream = opts.stream;
    if (opts.minify) {
      stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n');
    }
    filter = opts.lzw ? (stream = this.constructor.lzwEnc(stream), '\n/Filter /LZWDecode') : '';
    opts.parts = ["<<\n/Length " + stream.length + filter + "\n>>\nstream\n", stream, "\nendstream"];
    PDFStream.__super__.constructor.call(this, pdf, opts);
  }

  return PDFStream;

})(PDFObj);

this.PDFJPEG = (function(_super) {
  __extends(PDFJPEG, _super);

  PDFJPEG.header = '\xff\xd8\xff';

  PDFJPEG.sofBlocks = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf];

  PDFJPEG.identify = function(opts) {
    var r;
    r = new Uint8ArrayReader(new Uint8Array(opts.arrBuf));
    return r.binString(PDFJPEG.header.length) === PDFJPEG.header;
  };

  function PDFJPEG(pdf, opts) {
    var bits, channels, code, colorSpace, decodeParam, jpeg, length, r, segmentLength;
    jpeg = new Uint8Array(opts.arrBuf);
    r = new Uint8ArrayReader(jpeg);
    r.skip(PDFJPEG.header.length + 1);
    segmentLength = r.uint16be();
    r.skip(segmentLength - 2);
    while (!r.eof()) {
      if (r.uchar() !== 0xff) {
        this.error = 'Invalid marker in JPEG';
        return;
      }
      code = r.uchar();
      length = r.uint16be();
      if (__indexOf.call(PDFJPEG.sofBlocks, code) >= 0) {
        bits = r.uchar();
        this.height = r.uint16be();
        this.width = r.uint16be();
        channels = r.uchar();
        break;
      }
      r.skip(length - 2);
    }
    decodeParam = '';
    colorSpace = (function() {
      switch (channels) {
        case 1:
          return '/DeviceGray';
        case 3:
          return '/DeviceRGB';
        case 4:
          decodeParam = '\n/Decode [1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0]';
          return '/DeviceCMYK';
        default:
          return this.error = 'Unsupported number of channels in JPEG';
      }
    }).call(this);
    if (this.error != null) {
      return;
    }
    opts.parts = ["<<\n/Type /XObject\n/Subtype /Image\n/Filter /DCTDecode\n/ColorSpace " + colorSpace + "\n/BitsPerComponent " + bits + "\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + jpeg.length + decodeParam + "\n>>\nstream\n", jpeg, "\nendstream"];
    PDFJPEG.__super__.constructor.call(this, pdf, opts);
  }

  return PDFJPEG;

})(PDFObj);

this.PDFPNG = (function(_super) {
  __extends(PDFPNG, _super);

  PDFPNG.header = '\x89PNG\r\n\x1a\n';

  PDFPNG.identify = function(opts) {
    var r;
    r = new Uint8ArrayReader(new Uint8Array(opts.arrBuf));
    return r.binString(PDFPNG.header.length) === PDFPNG.header;
  };

  function PDFPNG(pdf, opts) {
    var alpha, bVal, bits, chunk, chunkSize, colorSpace, colorType, colors, compressionMethod, filterMethod, gVal, greyVal, i, idatLen, imageData, interlaceMethod, len, mask, palette, paletteObj, png, r, rVal, section, tr, trns, _i, _j, _len;
    png = new Uint8Array(opts.arrBuf);
    r = new Uint8ArrayReader(png);
    r.skip(PDFPNG.header.length);
    imageData = [];
    trns = null;
    while (!r.eof()) {
      chunkSize = r.uint32be();
      section = r.binString(4);
      switch (section) {
        case 'IHDR':
          this.width = r.uint32be();
          this.height = r.uint32be();
          bits = r.uchar();
          colorType = r.uchar();
          compressionMethod = r.uchar();
          filterMethod = r.uchar();
          interlaceMethod = r.uchar();
          r.skip(chunkSize - 13);
          break;
        case 'PLTE':
          palette = r.subarray(chunkSize);
          break;
        case 'IDAT':
          imageData.push(r.subarray(chunkSize));
          break;
        case 'tRNS':
          trns = r.subarray(chunkSize);
          break;
        case 'IEND':
          break;
        default:
          r.skip(chunkSize);
      }
      r.skip(4);
    }
    if (compressionMethod !== 0) {
      this.error = 'Unsupported compression in PNG';
    }
    if (filterMethod !== 0) {
      this.error = 'Unsupported filter in PNG';
    }
    if (interlaceMethod !== 0 || (colorType === 4 || colorType === 6)) {
      this.error = 'Unsupported interlacing and/or alpha channel in PNG';
    }
    if (this.error != null) {
      return;
    }
    mask = '';
    if ((trns != null) && !opts.ignoreTransparency) {
      tr = new Uint8ArrayReader(trns);
      switch (colorType) {
        case 0:
          greyVal = tr.uint16be();
          mask = "\n/Mask [ " + greyVal + " " + greyVal + " ]";
          break;
        case 2:
          rVal = tr.uint16be();
          gVal = tr.uint16be();
          bVal = tr.uint16be();
          mask = "\n/Mask [ " + rVal + " " + rVal + " " + gVal + " " + gVal + " " + bVal + " " + bVal + " ]";
          break;
        default:
          mask = '\n/Mask [';
          len = trns.length;
          for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
            alpha = tr.uchar();
            if (alpha === 0x00) {
              mask += " " + i + " " + i;
            } else if (alpha !== 0xff) {
              this.error = 'Partial transparency (in tRNS chunk) unsupported in paletted PNG';
              return;
            }
          }
          mask += ' ]';
      }
    }
    colors = (function() {
      switch (colorType) {
        case 0:
        case 3:
          return 1;
        case 2:
          return 3;
        default:
          return null;
      }
    })();
    colorSpace = (function() {
      switch (colorType) {
        case 0:
          return '/DeviceGray';
        case 2:
          return '/DeviceRGB';
        case 3:
          paletteObj = PDFStream.create(pdf, {
            stream: palette
          });
          return "[/Indexed /DeviceRGB " + (palette.length / 3 - 1) + " " + paletteObj.ref + "]";
        default:
          return this.error = 'Unsupported number of colours in PNG';
      }
    }).call(this);
    if (this.error != null) {
      return;
    }
    idatLen = 0;
    for (_j = 0, _len = imageData.length; _j < _len; _j++) {
      chunk = imageData[_j];
      idatLen += chunk.length;
    }
    opts.parts = ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace " + colorSpace + "\n/BitsPerComponent " + bits + "\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + idatLen + "\n/Filter /FlateDecode\n/DecodeParms <<\n  /Predictor 15\n  /Colors " + colors + "\n  /BitsPerComponent " + bits + "\n  /Columns " + this.width + "\n  >>" + mask + "\n>>\nstream\n"].concat(__slice.call(imageData), ["\nendstream"]);
    PDFPNG.__super__.constructor.call(this, pdf, opts);
  }

  return PDFPNG;

})(PDFObj);

this.PDFImageViaCanvas = (function(_super) {
  __extends(PDFImageViaCanvas, _super);

  function PDFImageViaCanvas(pdf, opts) {
    var alpha, alphaArr, alphaPos, alphaTrans, byteCount, canvas, ctx, filter, i, pixelArr, predict, rgbArr, rgbPos, rowBytes, smaskRef, smaskStream, _i, _ref;
    if (opts == null) {
      opts = {};
    }
    _ref = opts.tag, this.width = _ref.width, this.height = _ref.height;
    canvas = make({
      tag: 'canvas',
      width: this.width,
      height: this.height
    });
    ctx = canvas.getContext('2d');
    ctx.drawImage(opts.tag, 0, 0);
    pixelArr = (ctx.getImageData(0, 0, this.width, this.height)).data;
    rgbArr = new Uint8Array(this.width * this.height * 3);
    if (!opts.ignoreTransparency) {
      alphaArr = new Uint8Array(this.width * this.height);
    }
    alphaTrans = false;
    rgbPos = alphaPos = 0;
    byteCount = pixelArr.length;
    rowBytes = this.width * 4;
    for (i = _i = 0; _i < byteCount; i = _i += 4) {
      predict = opts.lzw && i % rowBytes !== 0;
      rgbArr[rgbPos++] = pixelArr[i] - (predict ? pixelArr[i - 4] : 0);
      rgbArr[rgbPos++] = pixelArr[i + 1] - (predict ? pixelArr[i - 3] : 0);
      rgbArr[rgbPos++] = pixelArr[i + 2] - (predict ? pixelArr[i - 2] : 0);
      if (!opts.ignoreTransparency) {
        alpha = pixelArr[i + 3];
        alphaTrans || (alphaTrans = alpha !== 0xff);
        alphaArr[alphaPos++] = alpha - (predict ? pixelArr[i - 1] : 0);
      }
    }
    smaskRef = alphaTrans ? (filter = opts.lzw ? (alphaArr = PDFStream.lzwEnc(alphaArr), "\n/Filter /LZWDecode /DecodeParms << /Predictor 2 /Colors 1 /Columns " + this.width + " >>") : '', smaskStream = PDFObj.create(pdf, {
      parts: ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace /DeviceGray\n/BitsPerComponent 8\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + alphaArr.length + filter + "\n>>\nstream\n", alphaArr, "\nendstream"]
    }), "\n/SMask " + smaskStream.ref) : '';
    filter = opts.lzw ? (rgbArr = PDFStream.lzwEnc(rgbArr), "\n/Filter /LZWDecode /DecodeParms << /Predictor 2 /Colors 3 /Columns " + this.width + " >>") : '';
    opts.parts = ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace /DeviceRGB\n/BitsPerComponent 8\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + rgbArr.length + smaskRef + filter + "\n>>\nstream\n", rgbArr, "\nendstream"];
    PDFImageViaCanvas.__super__.constructor.call(this, pdf, opts);
  }

  return PDFImageViaCanvas;

})(PDFObj);

this.PDFImage = (function() {
  PDFImage.xhr = function(opts) {
    var tag;
    tag = make({
      tag: 'img',
      crossOrigin: 'anonymous'
    });
    tag.src = opts.url;
    return tag.onload = function() {
      return xhr({
        type: 'arraybuffer',
        url: opts.url,
        success: function(req) {
          var arrBuf;
          arrBuf = req.response;
          return opts.success({
            arrBuf: arrBuf,
            tag: tag
          });
        }
      });
    };
  };

  PDFImage.create = function(pdf, opts) {
    var img;
    if (opts == null) {
      opts = {};
    }
    img = (opts.arrBuf != null) && PDFJPEG.identify(opts) ? PDFJPEG.create(pdf, opts) : (opts.arrBuf != null) && PDFPNG.identify(opts) ? PDFPNG.create(pdf, opts) : void 0;
    if ((img == null) || (img.error != null)) {
      img = (opts.tag != null) && opts.tag.width > 0 ? PDFImageViaCanvas.create(pdf, opts) : new this;
    }
    return img;
  };

  function PDFImage() {
    this.error = 'Image is not a supported JPEG or PNG, and <img> tag not supplied, not loaded, or not a browser-supported image';
  }

  return PDFImage;

})();

this.PDFFont = (function(_super) {
  __extends(PDFFont, _super);

  function PDFFont(pdf, opts) {
    opts.data = "<<\n/Type /Font \n/Subtype /Type1\n/BaseFont /" + opts.name + "\n/Encoding <<\n  /Type /Encoding\n  /BaseEncoding /MacRomanEncoding\n  /Differences [219 /Euro]\n  >>\n>>";
    PDFFont.__super__.constructor.call(this, pdf, opts);
  }

  return PDFFont;

})(PDFObj);

this.PDFText = (function() {
  function PDFText() {}

  PDFText.sanitize = function(s, fontName, rep, whitelist) {
    var c, i, sanitized, _i, _ref;
    if (rep == null) {
      rep = '_';
    }
    if (whitelist == null) {
      whitelist = '';
    }
    sanitized = '';
    for (i = _i = 0, _ref = s.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      c = s.charAt(i);
      sanitized += ((PDFMetrics.codes[c] != null) && (PDFMetrics.widths[fontName][c] != null)) || whitelist.indexOf(c) !== -1 ? c : rep;
    }
    return sanitized;
  };

  PDFText.ligaturize = function(s, fontName) {
    var k, re, v, _ref;
    _ref = PDFMetrics.ligatures[fontName];
    for (k in _ref) {
      v = _ref[k];
      re = new RegExp(k, 'g');
      s = s.replace(re, v);
    }
    return s;
  };

  PDFText.hexString = function(s, hex) {
    var i, _i, _ref;
    if (hex == null) {
      hex = '<';
    }
    for (i = _i = 0, _ref = s.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      hex += PDFMetrics.codes[s.charAt(i)];
    }
    return hex + '>';
  };

  PDFText.paragraphize = function(s) {
    return s.split(/\r\n|\r|\n/);
  };

  PDFText.wordify = function(s) {
    var words;
    words = s.match(/[^ —–-]*[—–-]? */g);
    words.pop();
    return words;
  };

  PDFText.widthify = function(words, fontName) {
    var TJData, char, charCount, charWidth, endWidth, i, kernWidth, kerning, midWidth, nextChar, nextWord, nextWordChar, seenSpace, spaceCount, str, widths, word, _i, _j, _len, _ref, _ref1, _results;
    widths = PDFMetrics.widths[fontName];
    kerning = PDFMetrics.kerning[fontName];
    _results = [];
    for (i = _i = 0, _len = words.length; _i < _len; i = ++_i) {
      word = words[i];
      nextWord = words[i + 1];
      nextWordChar = nextWord != null ? nextWord.charAt(0) : void 0;
      word += nextWordChar != null ? nextWordChar : ' ';
      midWidth = endWidth = charCount = spaceCount = 0;
      seenSpace = false;
      str = TJData = '';
      for (i = _j = 0, _ref = word.length - 1; 0 <= _ref ? _j < _ref : _j > _ref; i = 0 <= _ref ? ++_j : --_j) {
        char = word.charAt(i);
        nextChar = word.charAt(i + 1);
        seenSpace || (seenSpace = char === ' ');
        charWidth = widths[char];
        midWidth += charWidth;
        if (!seenSpace) {
          endWidth += charWidth;
        }
        charCount++;
        if (seenSpace) {
          spaceCount++;
        }
        str += char;
        kernWidth = (_ref1 = kerning[char]) != null ? _ref1[nextChar] : void 0;
        if (kernWidth != null) {
          TJData += "" + (PDFText.hexString(str)) + " " + kernWidth + " ";
          str = '';
          midWidth -= kernWidth;
          if (!seenSpace) {
            endWidth -= kernWidth;
          }
        }
      }
      if (str.length > 0) {
        TJData += "" + (PDFText.hexString(str)) + " ";
      }
      _results.push({
        TJData: TJData,
        midWidth: midWidth,
        endWidth: endWidth,
        charCount: charCount,
        spaceCount: spaceCount
      });
    }
    return _results;
  };

  PDFText.preprocessPara = function(s, fontName, ligatures) {
    var ligaturize;
    if (ligatures == null) {
      ligatures = true;
    }
    ligaturize = ligatures ? PDFText.ligaturize : noop;
    return PDFText.widthify(PDFText.wordify(ligaturize(PDFText.sanitize(s, fontName), fontName)), fontName);
  };

  PDFText.flowPara = function(para, fontSize, opts) {
    var TJData, charCount, charSpace, charSpaceFactor, charStretch, commands, finishLine, fix, height, i, leading, line, lineData, linesData, minusLSpace, numLines, rSpace, scale, scaledLineWidth, scaledMaxWidth, scaledWidth, spaceCount, stretchFactor, width, willExceedHeight, willWrap, word, wordSpace, wordSpaceFactor, _i, _len, _ref;
    if (opts == null) {
      opts = {};
    }
    if (opts.maxWidth == null) {
      opts.maxWidth = Infinity;
    }
    if (opts.maxHeight == null) {
      opts.maxHeight = Infinity;
    }
    if (opts.lineHeight == null) {
      opts.lineHeight = 1.3;
    }
    if (opts.align == null) {
      opts.align = 'left';
    }
    if (opts.justify == null) {
      opts.justify = {
        wordSpaceFactor: 0.45,
        charSpaceFactor: 0.40,
        stretchFactor: 0.15
      };
    }
    if (opts.hyphenate == null) {
      opts.hyphenate = false;
    }
    if (opts.hyphLength == null) {
      opts.hyphLength = 0.8;
    }
    scale = 1000 / fontSize;
    para = para.slice(0);
    scaledMaxWidth = opts.maxWidth * scale;
    leading = fontSize * opts.lineHeight;
    scaledWidth = height = scaledLineWidth = charCount = spaceCount = 0;
    line = [];
    linesData = [];
    fix = function(n) {
      return n.toFixed(3).replace(/\.?0+$/, '');
    };
    finishLine = function() {
      var lastWord;
      lastWord = line[line.length - 1];
      scaledLineWidth += lastWord.endWidth - lastWord.midWidth;
      if (opts.hyphenate && scaledLineWidth < opts.hyphLength * scaledMaxWidth) {
        console.log('hyphenate after: ', lastWord, 'hyphenate: ', word);
      }
      charCount -= lastWord.spaceCount;
      spaceCount -= lastWord.spaceCount;
      linesData.push({
        line: line,
        scaledLineWidth: scaledLineWidth,
        charCount: charCount,
        spaceCount: spaceCount
      });
      return height += leading;
    };
    while (para.length > 0) {
      word = para.shift();
      willWrap = scaledLineWidth + word.endWidth > scaledMaxWidth && line.length > 0;
      if (willWrap) {
        finishLine();
        willExceedHeight = height + leading > opts.maxHeight;
        if (willExceedHeight) {
          para.unshift(word);
          break;
        } else {
          line = [];
          scaledLineWidth = charCount = spaceCount = 0;
        }
      }
      line.push(word);
      scaledLineWidth += word.midWidth;
      charCount += word.charCount;
      spaceCount += word.spaceCount;
      if (para.length === 0) {
        finishLine();
      }
    }
    scaledWidth = 0;
    commands = "" + (fix(leading)) + " TL 0 Tw 0 Tc 100 Tz\n";
    numLines = linesData.length;
    for (i = _i = 0, _len = linesData.length; _i < _len; i = ++_i) {
      lineData = linesData[i];
      line = lineData.line, scaledLineWidth = lineData.scaledLineWidth, charCount = lineData.charCount, spaceCount = lineData.spaceCount;
      if (scaledLineWidth > scaledWidth) {
        scaledWidth = scaledLineWidth;
      }
      rSpace = scaledMaxWidth - scaledLineWidth;
      minusLSpace = (function() {
        switch (opts.align) {
          case 'right':
            return fix(-rSpace) + ' ';
          case 'centre':
          case 'center':
            return fix(-rSpace / 2) + ' ';
          default:
            return '';
        }
      })();
      if (opts.align === 'full') {
        if (i === numLines - 1 && rSpace >= 0) {
          wordSpace = charSpace = 0;
          charStretch = 100;
        } else {
          _ref = opts.justify, wordSpaceFactor = _ref.wordSpaceFactor, charSpaceFactor = _ref.charSpaceFactor, stretchFactor = _ref.stretchFactor;
          if (spaceCount === 0) {
            wordSpace = 0;
            charSpaceFactor *= 1 / (1 - wordSpaceFactor);
            stretchFactor *= 1 / (1 - wordSpaceFactor);
          } else {
            wordSpace = wordSpaceFactor * rSpace / spaceCount / scale;
          }
          charSpace = charSpaceFactor * rSpace / (charCount - 1) / scale;
          charStretch = 100 / (1 - (rSpace * stretchFactor / scaledMaxWidth));
        }
        commands += "" + (fix(wordSpace)) + " Tw " + (fix(charSpace)) + " Tc " + (fix(charStretch)) + " Tz ";
      }
      TJData = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = line.length; _j < _len1; _j++) {
          word = line[_j];
          _results.push(word.TJData);
        }
        return _results;
      })();
      commands += "[ " + minusLSpace + (TJData.join('').replace(/> </g, '')) + "] TJ T*\n";
    }
    width = scaledWidth / scale;
    if (opts.align === 'full' && scaledMaxWidth / scale < width) {
      width = scaledMaxWidth / scale;
    }
    return {
      commands: commands,
      para: para,
      width: width,
      height: height
    };
  };

  return PDFText;

})();

this.xPDFText = (function() {
  function xPDFText() {}

  xPDFText.Word = (function() {
    Word.parasFromText = function(s) {
      return s.split(/\r\n|\r|\n/);
    };

    Word.wordsFromPara = function(s, fontName, ligatures) {
      var i, w, words, _i, _len, _results;
      words = s.match(/[^ —–-]*[—–-]? */g);
      words.pop();
      _results = [];
      for (i = _i = 0, _len = words.length; _i < _len; i = ++_i) {
        w = words[i];
        _results.push(new Word(w, words[i + 1], fontName, ligatures));
      }
      return _results;
    };

    Word.hexify = function(s, hex) {
      var i, len, _i;
      if (hex == null) {
        hex = '<';
      }
      len = s.length;
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        hex += PDFMetrics.codes[s.charAt(i)];
      }
      return hex + '>';
    };

    function Word(str, after, fontName, ligatures) {
      var c, char, charWidth, i, kernWidth, kerning, lastCharIndex, len, lig, ligStr, nextChar, rawStr, re, seenSpace, widths, word, _i, _j, _k, _len, _ref, _ref1, _ref2, _ref3, _ref4;
      this.fontName = fontName;
      if (ligatures == null) {
        ligatures = true;
      }
      rawStr = '';
      len = str.length;
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        c = str.charAt(i);
        rawStr += (PDFMetrics.codes[c] != null) && (PDFMetrics.widths[this.fontName][c] != null) ? c : '_';
      }
      ligStr = rawStr;
      if (ligatures) {
        _ref = PDFMetrics.ligatureRegExps[this.fontName];
        for (_j = 0, _len = _ref.length; _j < _len; _j++) {
          _ref1 = _ref[_j], re = _ref1.re, lig = _ref1.lig;
          ligStr = ligStr.replace(re, lig);
        }
      }
      this.rawStr = rawStr;
      if (ligStr !== rawStr) {
        this.ligStr = ligStr;
      }
      if (after != null) {
        this.charAfter = after.charAt(0);
      }
      word = ((_ref2 = this.ligStr) != null ? _ref2 : this.rawStr) + ((_ref3 = this.charAfter) != null ? _ref3 : ' ');
      this.midWidth = this.endWidth = this.charCount = this.spaceCount = 0;
      this.commands = str = '';
      seenSpace = false;
      widths = PDFMetrics.widths[fontName];
      kerning = PDFMetrics.kerning[fontName];
      lastCharIndex = word.length - 1;
      for (i = _k = 0; 0 <= lastCharIndex ? _k < lastCharIndex : _k > lastCharIndex; i = 0 <= lastCharIndex ? ++_k : --_k) {
        char = word.charAt(i);
        nextChar = word.charAt(i + 1);
        seenSpace || (seenSpace = char === ' ');
        charWidth = widths[char];
        this.midWidth += charWidth;
        if (!seenSpace) {
          this.endWidth += charWidth;
        }
        this.charCount++;
        if (seenSpace) {
          this.spaceCount++;
        }
        str += char;
        kernWidth = (_ref4 = kerning[char]) != null ? _ref4[nextChar] : void 0;
        if (kernWidth != null) {
          this.commands += "" + (this.constructor.hexify(str)) + " " + kernWidth + " ";
          str = '';
          this.midWidth -= kernWidth;
          if (!seenSpace) {
            this.endWidth -= kernWidth;
          }
        }
      }
      if (str.length > 0) {
        this.commands += "" + (this.constructor.hexify(str)) + " ";
      }
    }

    return Word;

  })();

  xPDFText.Flow = (function() {
    Flow.prototype.defaults = {
      maxWidth: Infinity,
      maxHeight: Infinity,
      lineHeight: 1.3,
      align: 'left',
      justifyOpts: {
        stretchFactor: 0.2,
        charSpaceFactor: 0
      }
    };

    function Flow(words, fontSize, opts) {
      var charCount, finishLine, fix, leading, lineWords, scale, scaledLineWidth, scaledMaxWidth, scaledWidth, spaceCount, willExceedHeight, willWrap, word;
      this.opts = extend({}, defaults, opts);
      scale = 1000 / fontSize;
      words = words.slice(0);
      scaledMaxWidth = this.opts.maxWidth * scale;
      leading = fontSize * this.opts.lineHeight;
      this.height = scaledWidth = scaledLineWidth = charCount = spaceCount = 0;
      lineWords = [];
      this.lines = [];
      fix = function(n) {
        return n.toFixed(3).replace(/\.?0+$/, '');
      };
      finishLine = function() {
        var lastWord;
        lastWord = lineWords[lineWords.length - 1];
        scaledLineWidth += lastWord.endWidth - lastWord.midWidth;
        charCount -= lastWord.spaceCount;
        spaceCount -= lastWord.spaceCount;
        this.lines.push(new Line(lineWords, scaledLineWidth, charCount, spaceCount));
        return this.height += leading;
      };
      while (words.length > 0) {
        word = para.shift();
        willWrap = scaledLineWidth + word.endWidth > scaledMaxWidth && line.length > 0;
        if (willWrap) {
          finishLine();
          willExceedHeight = height + leading > this.opts.maxHeight;
          if (willExceedHeight) {
            para.unshift(word);
            break;
          } else {
            lineWords = [];
            scaledLineWidth = charCount = spaceCount = 0;
          }
        }
        lineWords.push(word);
        scaledLineWidth += word.midWidth;
        charCount += word.charCount;
        spaceCount += word.spaceCount;
        if (words.length === 0) {
          finishLine();
        }
      }
      this.remainingWords = words;
      this.width = scaledWidth / scale;
      if (this.opts.align === 'full' && scaledMaxWidth / scale < this.width) {
        this.width = scaledMaxWidth / scale;
      }
    }

    Flow.prototype.toCommands = function() {
      var line;
      return ("" + (fix(leading)) + " TL 0 Tw 0 Tc 100 Tz\n") + ((function() {
        var _i, _len, _ref, _results;
        _ref = this.lines;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          line = _ref[_i];
          _results.push(line);
        }
        return _results;
      }).call(this)).join("\n");
    };

    return Flow;

  })();

  xPDFText.Line = (function() {
    function Line(words, scaledWidth, charCount, spaceCount) {
      this.words = words;
      this.scaledWidth = scaledWidth;
      this.charCount = charCount;
      this.spaceCount = spaceCount;
    }

    Line.prototype.toCommands = function() {
      var TJData, charCount, charSpace, charSpaceFactor, charStretch, line, minusLSpace, rSpace, scaledLineWidth, scaledWidth, spaceCount, stretchFactor, word, wordSpace, wordSpaceFactor, _ref;
      scaledWidth = 0;
      line = lineData.line, scaledLineWidth = lineData.scaledLineWidth, charCount = lineData.charCount, spaceCount = lineData.spaceCount;
      if (scaledLineWidth > scaledWidth) {
        scaledWidth = scaledLineWidth;
      }
      rSpace = scaledMaxWidth - scaledLineWidth;
      minusLSpace = (function() {
        switch (opts.align) {
          case 'right':
            return fix(-rSpace) + ' ';
          case 'centre':
          case 'center':
            return fix(-rSpace / 2) + ' ';
          default:
            return '';
        }
      })();
      if (opts.align === 'full') {
        if (i === numLines - 1 && rSpace >= 0) {
          wordSpace = charSpace = 0;
          charStretch = 100;
        } else {
          _ref = opts.justify, wordSpaceFactor = _ref.wordSpaceFactor, charSpaceFactor = _ref.charSpaceFactor, stretchFactor = _ref.stretchFactor;
          if (spaceCount === 0) {
            wordSpace = 0;
            charSpaceFactor *= 1 / (1 - wordSpaceFactor);
            stretchFactor *= 1 / (1 - wordSpaceFactor);
          } else {
            wordSpace = wordSpaceFactor * rSpace / spaceCount / scale;
          }
          charSpace = charSpaceFactor * rSpace / (charCount - 1) / scale;
          charStretch = 100 / (1 - (rSpace * stretchFactor / scaledMaxWidth));
        }
        commands += "" + (fix(wordSpace)) + " Tw " + (fix(charSpace)) + " Tc " + (fix(charStretch)) + " Tz ";
      }
      TJData = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = line.length; _i < _len; _i++) {
          word = line[_i];
          _results.push(word.TJData);
        }
        return _results;
      })();
      return commands += "[ " + minusLSpace + (TJData.join('').replace(/> </g, '')) + "] TJ T*\n";
    };

    return Line;

  })();

  return xPDFText;

})();

this.HackDoc = (function() {
  HackDoc.zeroPad = function(n, len) {
    var str, zeroes;
    zeroes = '0000000000';
    str = '' + n;
    return zeroes.substring(0, len - str.length) + str;
  };

  HackDoc.randomId = function() {
    var i;
    return ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; _i <= 31; i = ++_i) {
        _results.push(Math.floor(Math.random() * 15.99).toString(16));
      }
      return _results;
    })()).join('');
  };

  function HackDoc(basePDFArrBufOrVersion) {
    var r, trailer, trailerPos;
    if (basePDFArrBufOrVersion == null) {
      basePDFArrBufOrVersion = '1.4';
    }
    this.objs = [];
    this.id = HackDoc.randomId();
    this.appending = typeof basePDFArrBufOrVersion === 'string' ? (this.basePDF = new Blob(["%PDF-" + basePDFArrBufOrVersion + "\n\u0080\u07ff\n"]), this.baseLen = this.basePDF.size, this.nextFreeObjNum = 1, false) : (this.basePDF = new Uint8Array(basePDFArrBufOrVersion), this.baseLen = this.basePDF.length, trailerPos = function(pdf) {
      var a, char, e, i, l, pos, r, t, _ref;
      _ref = (function() {
        var _i, _len, _ref, _results;
        _ref = 'traile'.split('');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          char = _ref[_i];
          _results.push(char.charCodeAt(0));
        }
        return _results;
      })(), t = _ref[0], r = _ref[1], a = _ref[2], i = _ref[3], l = _ref[4], e = _ref[5];
      pos = pdf.length;
      while (--pos >= 6) {
        if (pdf[pos] === r && pdf[pos - 1] === e && pdf[pos - 2] === l && pdf[pos - 3] === i && pdf[pos - 4] === a && pdf[pos - 5] === r && pdf[pos - 6] === t) {
          return pos;
        }
      }
    }, r = new Uint8ArrayReader(this.basePDF), trailer = r.seek(trailerPos(this.basePDF)).binString(), this.nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1], this.root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1], this.info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1], this.prevId = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1], this.baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1], true);
  }

  HackDoc.prototype.nextObjNum = function() {
    return this.nextFreeObjNum++;
  };

  HackDoc.prototype.addObj = function(obj) {
    if (__indexOf.call(this.objs, obj) < 0) {
      return this.objs.push(obj);
    }
  };

  HackDoc.prototype.toBlob = function() {
    var allParts, bodyParts, consecutiveObjSets, currentSet, lastObjNum, o, objOffset, os, p, trailer, trailerPart, u8, xref, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    this.objs.sort(function(a, b) {
      return a.objNum - b.objNum;
    });
    bodyParts = (_ref = []).concat.apply(_ref, (function() {
      var _i, _len, _ref, _results;
      _ref = this.objs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        o = _ref[_i];
        _results.push(o.parts);
      }
      return _results;
    }).call(this));
    consecutiveObjSets = [];
    lastObjNum = null;
    _ref1 = this.objs;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      o = _ref1[_i];
      if (!((lastObjNum != null) && o.objNum === lastObjNum + 1)) {
        consecutiveObjSets.push((currentSet = []));
      }
      currentSet.push(o);
      lastObjNum = o.objNum;
    }
    xref = "\nxref\n0 1\n0000000000 65535 f \n";
    objOffset = this.baseLen;
    for (_j = 0, _len1 = consecutiveObjSets.length; _j < _len1; _j++) {
      os = consecutiveObjSets[_j];
      xref += "" + os[0].objNum + " " + os.length + "\n";
      for (_k = 0, _len2 = os.length; _k < _len2; _k++) {
        o = os[_k];
        xref += "" + (HackDoc.zeroPad(objOffset, 10)) + " 00000 n \n";
        objOffset += o.length;
      }
    }
    trailerPart = this.appending ? "/Prev " + this.baseStartXref + "\n/ID [<" + this.prevId + "> <" + this.id + ">]" : "/ID [<" + this.id + "> <" + this.id + ">]";
    if (this.info) {
      trailerPart += "\n/Info " + this.info;
    }
    trailer = "\ntrailer\n<<\n" + trailerPart + "\n/Root " + this.root + "\n/Size " + this.nextFreeObjNum + "\n>>\n\nstartxref\n" + objOffset + "\n%%EOF";
    allParts = [this.basePDF].concat(__slice.call(bodyParts), [xref], [trailer]);
    if (new Blob([new Uint8Array(0)]).size !== 0) {
      allParts = (function() {
        var _l, _len3, _results;
        _results = [];
        for (_l = 0, _len3 = allParts.length; _l < _len3; _l++) {
          p = allParts[_l];
          if (p.buffer != null) {
            if (p.length === p.buffer.byteLength) {
              _results.push(p.buffer);
            } else {
              u8 = new Uint8Array(p.length);
              u8.set(p);
              _results.push(u8.buffer);
            }
          } else {
            _results.push(p);
          }
        }
        return _results;
      })();
    }
    return new Blob(allParts, {
      type: 'application/pdf'
    });
  };

  HackDoc.prototype.linkAsync = function(filename, cb) {
    var blob, fr;
    blob = this.toBlob();
    if (window.URL != null) {
      return cb(make({
        tag: 'a',
        href: URL.createObjectURL(blob),
        onclick: function() {
          if (navigator.msSaveOrOpenBlob != null) {
            navigator.msSaveOrOpenBlob(blob, filename);
            return false;
          }
        }
      }));
    } else {
      fr = new FileReader();
      fr.readAsDataURL(blob);
      return fr.onload = function() {
        return cb(make({
          tag: 'a',
          href: fr.result,
          onclick: function() {
            if (navigator.appVersion.indexOf('Safari') !== -1) {
              return false;
            }
          }
        }));
      };
    }
  };

  return HackDoc;

})();

PDFMetrics.ligatureRegExps = {};

_ref = PDFMetrics.ligatures;
for (fontName in _ref) {
  ligs = _ref[fontName];
  PDFMetrics.ligatureRegExps[fontName] = (function() {
    var _results;
    _results = [];
    for (k in ligs) {
      v = ligs[k];
      _results.push({
        re: new RegExp(k, 'g'),
        lig: v
      });
    }
    return _results;
  })();
}

//# sourceMappingURL=hackdoc.js.map
