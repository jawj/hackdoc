// Generated by CoffeeScript 1.4.0

/*
HackDoc -- client-side PDF generation
George MacKerron
https://github.com/jawj/hackdoc
*/


(function() {
  var __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  this.lzwEnc = function(input, earlyChange) {
    var CLEAR, EOD, allBitsWritten, bitsPerValue, bytesUsed, c, clear, dict, i, maxValueWithBits, nextCode, nextVal, output, w, wc, write, _i, _len;
    if (earlyChange == null) {
      earlyChange = 1;
    }
    CLEAR = 256;
    EOD = 257;
    w = nextCode = dict = maxValueWithBits = null;
    output = new Uint8Array(input.length);
    allBitsWritten = 0;
    bitsPerValue = 9;
    clear = function() {
      w = '';
      nextCode = 0;
      dict = {};
      while (nextCode < 258) {
        dict[String.fromCharCode(nextCode)] = nextCode;
        nextCode++;
      }
      write(CLEAR);
      bitsPerValue = 9;
      return maxValueWithBits = (1 << bitsPerValue) - earlyChange;
    };
    write = function(value) {
      var bitPos, bitsToWrite, bytePos, newOutput, valueBitsWritten, writeValue;
      valueBitsWritten = 0;
      while (valueBitsWritten < bitsPerValue) {
        bytePos = Math.floor(allBitsWritten / 8);
        bitPos = allBitsWritten % 8;
        if (bytePos === output.length) {
          newOutput = new Uint8Array(output.length * 2);
          newOutput.set(output);
          output = newOutput;
        }
        if (bitPos > 0) {
          bitsToWrite = 8 - bitPos;
          writeValue = value >> (bitsPerValue - bitsToWrite);
        } else if (bitPos === 0 && (bitsToWrite = bitsPerValue - valueBitsWritten) >= 8) {
          writeValue = (value >> (bitsToWrite - 8)) & 0xff;
          bitsToWrite = 8;
        } else {
          writeValue = (value << (8 - bitsToWrite)) & 0xff;
        }
        output[bytePos] |= writeValue;
        valueBitsWritten += bitsToWrite;
        allBitsWritten += bitsToWrite;
      }
      return null;
    };
    clear();
    for (i = _i = 0, _len = input.length; _i < _len; i = ++_i) {
      c = input[i];
      nextVal = input[i - 3];
      if (i % 1800 === 0) {
        nextVal = 0;
      }
      c = c - nextVal;
      c %= 256;
      if (i < 1000) {
        console.log(c);
      }
      c = String.fromCharCode(c);
      wc = w + c;
      if (dict.hasOwnProperty(wc)) {
        w = wc;
      } else {
        dict[wc] = nextCode++;
        write(dict[w]);
        w = c;
        if (nextCode > maxValueWithBits) {
          if (bitsPerValue === 12) {
            write(dict[w]);
            clear();
          } else {
            bitsPerValue++;
            maxValueWithBits = (1 << bitsPerValue) - earlyChange;
          }
        }
      }
    }
    write(dict[w]);
    write(EOD);
    bytesUsed = Math.ceil(allBitsWritten / 8);
    return output.subarray(0, bytesUsed);
  };

  this.xhrImg = function(opts) {
    var tag;
    return tag = make({
      tag: 'img',
      src: opts.url,
      onload: function() {
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
      }
    });
  };

  this.PDFObj = (function() {

    function PDFObj(pdf, opts) {
      var part, parts, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4;
      if (opts == null) {
        opts = {};
      }
      if ((_ref = this.objNum) == null) {
        this.objNum = (_ref1 = opts.num) != null ? _ref1 : pdf.nextObjNum();
      }
      if ((_ref2 = this.ref) == null) {
        this.ref = "" + this.objNum + " 0 R";
      }
      if (!((opts.parts != null) || (opts.data != null))) {
        return;
      }
      parts = (_ref3 = opts.parts) != null ? _ref3 : [opts.data];
      this.parts = ["\n" + this.objNum + " 0 obj\n"].concat(__slice.call(parts), ["\nendobj\n"]);
      this.length = 0;
      _ref4 = this.parts;
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        part = _ref4[_i];
        this.length += part.length;
      }
      pdf.addObj(this);
    }

    return PDFObj;

  })();

  this.PDFStream = (function(_super) {

    __extends(PDFStream, _super);

    function PDFStream(pdf, opts) {
      var filter, stream;
      if (opts == null) {
        opts = {};
      }
      stream = opts.stream;
      if (opts.minify) {
        stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n');
      }
      filter = '';
      if (opts.lzw) {
        stream = new LZWCompressor(stream).result;
        filter = "\n/Filter /LZWDecode\n/DecodeParms << /EarlyChange 1 >>";
      }
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
      if (this.error != null) {
        return;
      }
      if (interlaceMethod !== 0 || (colorType === 4 || colorType === 6)) {
        if (opts.tag != null) {
          return new PDFImageViaCanvas(pdf, opts);
        } else {
          this.error = 'Unsupported interlacing and/or alpha channel in PNG, and no <img> tag supplied for <canvas> strategy';
          return;
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
            paletteObj = new PDFStream(pdf, {
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
                if (opts.tag != null) {
                  return new PDFImageViaCanvas(pdf, opts);
                } else {
                  this.error = 'Partial transparency (in tRNS chunk) unsupported in paletted PNG, and no <img> tag supplied for <canvas> strategy';
                  return;
                }
              }
            }
            mask += ' ]';
        }
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
      var alpha, alphaArr, alphaPos, alphaTrans, byteCount, canvas, ctx, i, pixelArr, rgbArr, rgbPos, smaskRef, smaskStream, _i, _ref;
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
      alphaArr = new Uint8Array(this.width * this.height);
      rgbPos = alphaPos = 0;
      byteCount = pixelArr.length;
      alphaTrans = false;
      for (i = _i = 0; _i < byteCount; i = _i += 4) {
        rgbArr[rgbPos++] = pixelArr[i];
        rgbArr[rgbPos++] = pixelArr[i + 1];
        rgbArr[rgbPos++] = pixelArr[i + 2];
        alpha = pixelArr[i + 3];
        alphaArr[alphaPos++] = alpha;
        alphaTrans || (alphaTrans = alpha !== 0xff);
      }
      smaskRef = '';
      if (alphaTrans && !opts.ignoreTransparency) {
        smaskStream = new PDFObj(pdf, {
          parts: ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace /DeviceGray\n/BitsPerComponent 8\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + alphaArr.length + "\n>>\nstream\n", alphaArr, "\nendstream"]
        });
        smaskRef = "\n/SMask " + smaskStream.ref;
      }
      rgbArr = lzwEnc(rgbArr);
      opts.parts = ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace /DeviceRGB\n/BitsPerComponent 8\n/Width " + this.width + "\n/Height " + this.height + "\n/Filter /LZWDecode /DecodeParms << /Predictor 2 /Colors 3 /Columns " + this.width + " >>\n/Length " + rgbArr.length + smaskRef + "\n>>\nstream\n", rgbArr, "\nendstream"];
      PDFImageViaCanvas.__super__.constructor.call(this, pdf, opts);
    }

    return PDFImageViaCanvas;

  })(PDFObj);

  this.PDFImage = (function() {

    function PDFImage(pdf, opts) {
      if ((opts.arrBuf != null) && PDFJPEG.identify(opts)) {
        return new PDFJPEG(pdf, opts);
      } else if ((opts.arrBuf != null) && PDFPNG.identify(opts)) {
        return new PDFPNG(pdf, opts);
      } else if (opts.tag != null) {
        return new PDFImageViaCanvas(pdf, opts);
      } else {
        this.error = 'No valid JPEG or PNG header in image, and no <img> tag supplied for <canvas> strategy';
      }
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
        sanitized += ((PDFText.metrics.codes[c] != null) && (PDFText.metrics.widths[fontName][c] != null)) || whitelist.indexOf(c) !== -1 ? c : rep;
      }
      return sanitized;
    };

    PDFText.ligaturize = function(s, fontName) {
      var k, re, v, _ref;
      _ref = PDFText.metrics.ligatures[fontName];
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
        hex += PDFText.metrics.codes[s.charAt(i)];
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
      widths = PDFText.metrics.widths[fontName];
      kerning = PDFText.metrics.kerning[fontName];
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
      var TJData, charCount, charSpace, charSpaceFactor, charStretch, commands, finishLine, fix, height, i, leading, line, lineData, linesData, minusLSpace, numLines, rSpace, scale, scaledLineWidth, scaledMaxWidth, scaledWidth, spaceCount, stretchFactor, width, willExceedHeight, willWrap, word, wordSpace, wordSpaceFactor, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
      if (opts == null) {
        opts = {};
      }
      if ((_ref = opts.maxWidth) == null) {
        opts.maxWidth = Infinity;
      }
      if ((_ref1 = opts.maxHeight) == null) {
        opts.maxHeight = Infinity;
      }
      if ((_ref2 = opts.lineHeight) == null) {
        opts.lineHeight = 1.3;
      }
      if ((_ref3 = opts.align) == null) {
        opts.align = 'left';
      }
      if ((_ref4 = opts.justify) == null) {
        opts.justify = {
          wordSpaceFactor: 0.45,
          charSpaceFactor: 0.40,
          stretchFactor: 0.15
        };
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
            _ref5 = opts.justify, wordSpaceFactor = _ref5.wordSpaceFactor, charSpaceFactor = _ref5.charSpaceFactor, stretchFactor = _ref5.stretchFactor;
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
      return this.objs.push(obj);
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

}).call(this);
