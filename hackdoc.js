// Generated by CoffeeScript 1.4.0
(function() {
  var __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  this.xhrImg = function(opts) {
    return xhr({
      type: 'arraybuffer',
      url: opts.url,
      success: function(req) {
        var arrBuf, imgBlob, imgUrl, tag;
        arrBuf = req.response;
        imgBlob = new Blob([new Uint8Array(arrBuf)]);
        imgUrl = (typeof URL !== "undefined" && URL !== null ? URL : webkitURL).createObjectURL(imgBlob);
        return tag = make({
          tag: 'img',
          src: imgUrl,
          onload: function() {
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

    function PDFObj(pdf, parts, opts) {
      var part, _i, _len, _ref, _ref1;
      if (opts == null) {
        opts = {};
      }
      if (parts.constructor !== Array) {
        parts = [parts];
      }
      this.objNum = (_ref = opts.num) != null ? _ref : pdf.nextObjNum();
      this.ref = "" + this.objNum + " 0 R";
      this.parts = ["\n" + this.objNum + " 0 obj\n"].concat(__slice.call(parts), ["\nendobj\n"]);
      this.length = 0;
      _ref1 = this.parts;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        part = _ref1[_i];
        this.length += part.length;
      }
      pdf.addObj(this);
    }

    return PDFObj;

  })();

  this.PDFStream = (function(_super) {

    __extends(PDFStream, _super);

    function PDFStream(pdf, stream, opts) {
      if (opts == null) {
        opts = {};
      }
      if (opts.minify != null) {
        stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n');
      }
      PDFStream.__super__.constructor.call(this, pdf, ["<<\n/Length " + stream.length + "\n>>\nstream\n", stream, "\nendstream"], opts);
    }

    return PDFStream;

  })(PDFObj);

  this.PDFJPEG = (function(_super) {

    __extends(PDFJPEG, _super);

    PDFJPEG.header = '\xff\xd8\xff';

    PDFJPEG.sofBlocks = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf];

    PDFJPEG.identify = function(arrBuf) {
      var r;
      r = new Uint8ArrayReader(new Uint8Array(arrBuf));
      return r.binString(PDFJPEG.header.length) === PDFJPEG.header;
    };

    function PDFJPEG(pdf, jpegArrBuf, opts) {
      var bits, channels, code, colorSpace, decodeParam, jpeg, length, r, segmentLength;
      jpeg = new Uint8Array(jpegArrBuf);
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
      PDFJPEG.__super__.constructor.call(this, pdf, ["<<\n/Type /XObject\n/Subtype /Image\n/Filter /DCTDecode\n/ColorSpace " + colorSpace + "\n/BitsPerComponent " + bits + "\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + jpeg.length + decodeParam + "\n>>\nstream\n", jpeg, "\nendstream"], opts);
    }

    return PDFJPEG;

  })(PDFObj);

  this.PDFPNG = (function(_super) {

    __extends(PDFPNG, _super);

    PDFPNG.header = '\x89PNG\r\n\x1a\n';

    PDFPNG.identify = function(arrBuf) {
      var r;
      r = new Uint8ArrayReader(new Uint8Array(arrBuf));
      return r.binString(PDFPNG.header.length) === PDFPNG.header;
    };

    function PDFPNG(pdf, pngArrBuf, opts) {
      var bits, chunkSize, colorSpace, colorType, colors, compressionMethod, filterMethod, imageData, interlaceMethod, palette, paletteObj, png, r, section;
      png = new Uint8Array(pngArrBuf);
      r = new Uint8ArrayReader(png);
      r.skip(PDFPNG.header.length);
      imageData = [];
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
          return new PDFImageViaCanvas(pdf, opts.tag, opts);
        } else {
          this.error = 'Unsupported interlacing and/or alpha channel in PNG, , and no <img> tag supplied for <canvas> strategy';
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
            paletteObj = new PDFStream(pdf, palette);
            return "[/Indexed /DeviceRGB " + (palette.length / 3 - 1) + " " + paletteObj.ref + "]";
          default:
            return this.error = 'Unsupported number of colours in PNG';
        }
      }).call(this);
      if (this.error != null) {
        return;
      }
      PDFPNG.__super__.constructor.call(this, pdf, ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace " + colorSpace + "\n/BitsPerComponent " + bits + "\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + imageData.length + "\n/Filter /FlateDecode\n/DecodeParms <<\n  /Predictor 15\n  /Colors " + colors + "\n  /BitsPerComponent " + bits + "\n  /Columns " + this.width + "\n  >>\n>>\nstream\n"].concat(__slice.call(imageData), ["\nendstream\n"]), opts);
    }

    return PDFPNG;

  })(PDFObj);

  this.PDFImageViaCanvas = (function(_super) {

    __extends(PDFImageViaCanvas, _super);

    function PDFImageViaCanvas(pdf, loadedImgTag, opts) {
      var alpha, alphaArr, alphaPos, alphaTrans, byteCount, canvas, ctx, i, j, pixelArr, rgbArr, rgbPos, smaskRef, smaskStream, _i, _j;
      if (opts == null) {
        opts = {};
      }
      this.width = loadedImgTag.width, this.height = loadedImgTag.height;
      canvas = make({
        tag: 'canvas',
        width: this.width,
        height: this.height
      });
      ctx = canvas.getContext('2d');
      ctx.drawImage(loadedImgTag, 0, 0);
      pixelArr = (ctx.getImageData(0, 0, this.width, this.height)).data;
      rgbArr = new Uint8Array(this.width * this.height * 3);
      alphaArr = new Uint8Array(this.width * this.height);
      rgbPos = alphaPos = 0;
      byteCount = pixelArr.length;
      alphaTrans = false;
      for (i = _i = 0; _i < byteCount; i = _i += 4) {
        for (j = _j = 0; _j < 3; j = ++_j) {
          rgbArr[rgbPos++] = pixelArr[i + j];
        }
        alpha = pixelArr[i + 3];
        alphaArr[alphaPos++] = alpha;
        alphaTrans || (alphaTrans = alpha !== 0xff);
      }
      smaskRef = '';
      if (alphaTrans) {
        smaskStream = new PDFObj(pdf, ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace /DeviceGray\n/BitsPerComponent 8\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + alphaArr.length + "\n>>\nstream\n", alphaArr, "\nendstream"]);
        smaskRef = "\n/SMask " + smaskStream.ref;
      }
      PDFImageViaCanvas.__super__.constructor.call(this, pdf, ["<<\n/Type /XObject\n/Subtype /Image\n/ColorSpace /DeviceRGB\n/BitsPerComponent 8\n/Width " + this.width + "\n/Height " + this.height + "\n/Length " + rgbArr.length + smaskRef + "\n>>\nstream\n", rgbArr, "\nendstream"], opts);
    }

    return PDFImageViaCanvas;

  })(PDFObj);

  this.PDFImage = (function() {

    function PDFImage(pdf, opts) {
      var arrBuf, tag;
      arrBuf = opts.arrBuf, tag = opts.tag;
      if (arrBuf != null) {
        if (PDFJPEG.identify(arrBuf)) {
          return new PDFJPEG(pdf, arrBuf, opts);
        } else if (PDFPNG.identify(arrBuf)) {
          return new PDFPNG(pdf, arrBuf, opts);
        }
      } else if (tag != null) {
        return new PDFImageViaCanvas(pdf, tag, opts);
      } else {
        this.error = 'No valid JPEG or PNG header in image, and no <img> tag supplied for <canvas> strategy';
      }
    }

    return PDFImage;

  })();

  this.PDFFont = (function(_super) {

    __extends(PDFFont, _super);

    function PDFFont(pdf, fontName, opts) {
      PDFFont.__super__.constructor.call(this, pdf, ["<<\n/Type /Font \n/Subtype /Type1\n/BaseFont /" + fontName + "\n/Encoding <<\n  /Type /Encoding\n  /BaseEncoding /MacRomanEncoding\n  /Differences [219 /Euro]\n  >>\n>>"], opts);
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

  this.PDFAppend = (function() {

    PDFAppend.zeroPad = function(n, len) {
      var str, zeroes;
      zeroes = '0000000000';
      str = '' + n;
      return zeroes.substring(0, len - str.length) + str;
    };

    PDFAppend.randomId = function() {
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

    function PDFAppend(basePDFArrBuf) {
      var r, trailer, trailerPos;
      this.objs = [];
      this.basePDF = new Uint8Array(basePDFArrBuf);
      this.baseLen = this.basePDF.length;
      trailerPos = function(pdf) {
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
      };
      r = new Uint8ArrayReader(this.basePDF);
      r.seek(trailerPos(this.basePDF));
      trailer = r.binString();
      this.nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1];
      this.root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1];
      this.info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1];
      this.id = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1];
      this.baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1];
    }

    PDFAppend.prototype.nextObjNum = function() {
      return this.nextFreeObjNum++;
    };

    PDFAppend.prototype.addObj = function(obj) {
      return this.objs.push(obj);
    };

    PDFAppend.prototype.toBlob = function() {
      var bodyParts, consecutiveObjSets, currentSet, lastObjNum, o, objOffset, os, trailer, xref, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
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
          xref += "" + (PDFAppend.zeroPad(objOffset, 10)) + " 00000 n \n";
          objOffset += o.length;
        }
      }
      trailer = "\ntrailer\n<<\n/Root " + this.root + "\n/Info " + this.info + "\n/Prev " + this.baseStartXref + "\n/Size " + this.nextFreeObjNum + "\n/ID [<" + this.id + "> <" + (PDFAppend.randomId()) + ">]\n>>\n\nstartxref\n" + objOffset + "\n%%EOF";
      return new Blob([this.basePDF].concat(__slice.call(bodyParts), [xref], [trailer]), {
        type: 'application/pdf'
      });
    };

    return PDFAppend;

  })();

}).call(this);
