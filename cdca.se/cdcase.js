// Generated by CoffeeScript 1.4.0
(function() {
  var albumQuery, bgCol, fgCol, fix, font, fontBold, mm2pt, nAmerica, pageSize, pageSizes, pw, _ref, _ref1, _ref2;

  pageSizes = {
    a4: {
      w: 595,
      h: 842
    },
    letter: {
      w: 8.5 * 72,
      h: 11 * 72
    }
  };

  nAmerica = (_ref = (_ref1 = google.loader.ClientLocation) != null ? (_ref2 = _ref1.address) != null ? _ref2.country_code : void 0 : void 0) === 'US' || _ref === 'CA';

  pageSize = pageSizes[nAmerica ? 'letter' : 'a4'];

  bgCol = [0.9, 0.9, 0.9];

  fgCol = [0.5, 0.5, 0.5];

  if (true) {
    font = 'Helvetica';
    fontBold = 'Helvetica-Bold';
  } else {
    font = 'Times-Roman';
    fontBold = 'Times-Bold';
  }

  fix = function(n) {
    return n.toFixed(3).replace(/\.?0+$/, '');
  };

  mm2pt = function(mm) {
    return mm / 25.4 * 72;
  };

  pw = new ParallelWaiter(2, function(data) {
    var albumName, artist, artistFlow, artistPara, b, backContent, bs, dur, durFlow, durMatch, durMaxWidth, durRe, fontBoldObj, fontObj, frontContent, height, i, imgObj, k, len, maxSpineWidth, maxTrackHeight, maxTrackWidth, mediaBox, mins, name, nameFlow, namePara, num, numAndDurSize, numFlow, numMatch, numMaxWidth, numRe, pdf, secs, spineCommands, spineSize, spineSpace, spineXHeightFactor, t, totalWidth, track, trackCommands, trackData, trackSize, trackSpacing, trackText, tracks, u8a, v, _i, _j, _k, _l, _len, _len1, _ref3;
    pdf = new PDFAppend(data.pdf);
    imgObj = pdf.addImg(data.img);
    _ref3 = data.albumData.album, artist = _ref3.artist, albumName = _ref3.name;
    tracks = (function() {
      var _i, _len, _ref4, _results;
      _ref4 = data.albumData.album.tracks.track;
      _results = [];
      for (i = _i = 0, _len = _ref4.length; _i < _len; i = ++_i) {
        t = _ref4[i];
        mins = '' + Math.floor(t.duration / 60);
        secs = '' + t.duration % 60;
        if (secs.length < 2) {
          secs = '0' + secs;
        }
        _results.push("" + (i + 1) + ". " + t.name + " [" + mins + ":" + secs + "]");
      }
      return _results;
    })();
    trackText = tracks.join('\n');
    numRe = /^(\d+)\.\s+/;
    durRe = /\s+\[(\d+:\d+)\]\s*$/;
    trackData = (function() {
      var _i, _len, _ref4, _results;
      _ref4 = trackText.split('\n');
      _results = [];
      for (i = _i = 0, _len = _ref4.length; _i < _len; i = ++_i) {
        t = _ref4[i];
        numMatch = t.match(numRe);
        num = numMatch != null ? numMatch[1] : void 0;
        durMatch = t.match(durRe);
        dur = durMatch != null ? durMatch[1] : void 0;
        name = t.replace(numRe, '').replace(durRe, '');
        _results.push({
          num: num,
          name: name,
          dur: dur
        });
      }
      return _results;
    })();
    fontObj = pdf.addObj(font, {
      type: PDFBuiltInFont
    });
    fontBoldObj = pdf.addObj(fontBold, {
      type: PDFBuiltInFont
    });
    mediaBox = "[0 " + (pageSizes.a4.h - pageSize.h) + " " + pageSize.w + " " + pageSizes.a4.h + "]";
    frontContent = pdf.addObj("q  % colour block\n" + (bgCol.join(' ')) + " rg  % fill colour\n" + (fix(mm2pt(75))) + " " + (fix(pageSizes.a4.h - mm2pt(255))) + " " + (fix(mm2pt(120))) + " " + (fix(mm2pt(120))) + " re f  % rect, fill\nQ\n\nq  % small album art\n" + (fix(mm2pt(60))) + " 0 0 " + (fix(mm2pt(60))) + " " + (fix(mm2pt(165))) + " " + (fix(pageSizes.a4.h - mm2pt(225))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\n/AlbumArt Do\nQ\n\nq  % line around small album art\n0.25 w  " + (fgCol.join(' ')) + " RG  % line colour\n" + (fix(mm2pt(105))) + " " + (fix(pageSizes.a4.h - mm2pt(225))) + " " + (fix(mm2pt(60))) + " " + (fix(mm2pt(60))) + " re  S  % rect, stroke\nQ\n\nq  % big album art\n" + (fix(mm2pt(120))) + " 0 0 " + (fix(mm2pt(120))) + " " + (fix(mm2pt(195))) + " " + (fix(pageSizes.a4.h - mm2pt(135))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\n/AlbumArt Do\nQ", {
      type: PDFStream,
      minify: true
    });
    pdf.addObj("<<\n/Type /Page /Parent 3 0 R /Resources 6 0 R\n/Contents [" + frontContent.ref + " 4 0 R]\n/MediaBox " + mediaBox + "\n>>", {
      num: 2
    });
    pdf.addObj("<<\n/ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ] /ColorSpace << /Cs1 7 0 R /Cs2 9 0 R >>\n/Font <<\n  /Tc3.0 11 0 R /Tc4.1 13 0 R /Tc2.0 10 0 R /TT5.1 15 0 R /Tc1.0 8 0 R /Tc6.0 16 0 R\n  /Fnt " + fontObj.ref + " /FntBold " + fontBoldObj.ref + "\n>>\n/XObject << /AlbumArt " + imgObj.ref + " >>\n>>", {
      num: 6
    });
    artistPara = PDFText.preprocessPara(artist, font);
    namePara = PDFText.preprocessPara(albumName, fontBold);
    maxSpineWidth = mm2pt(100);
    spineXHeightFactor = font === 'Helvetica' ? 0.83 : 0.78;
    for (spineSize = _i = 10; _i >= 6; spineSize = --_i) {
      artistFlow = PDFText.flowPara(artistPara, spineSize, {
        lineHeight: 0
      });
      nameFlow = PDFText.flowPara(namePara, spineSize, {
        lineHeight: 0
      });
      spineSpace = spineSize * 0.5;
      totalWidth = artistFlow.width + spineSpace + nameFlow.width;
      if (totalWidth < maxSpineWidth) {
        break;
      }
    }
    spineCommands = "/Fnt " + spineSize + " Tf\n" + artistFlow.commands + "\n" + (artistFlow.width + spineSpace) + " 0 Td\n/FntBold " + spineSize + " Tf\n" + nameFlow.commands;
    maxTrackWidth = mm2pt(55);
    maxTrackHeight = mm2pt(87);
    for (_j = 0, _len = trackData.length; _j < _len; _j++) {
      track = trackData[_j];
      for (k in track) {
        v = track[k];
        if (v != null) {
          track["" + k + "Para"] = PDFText.preprocessPara(v, font);
        }
      }
    }
    for (trackSize = _k = 10; _k >= 6; trackSize = --_k) {
      numAndDurSize = trackSize - 2;
      trackCommands = '';
      height = 0;
      trackSpacing = trackSize / 5;
      for (_l = 0, _len1 = trackData.length; _l < _len1; _l++) {
        track = trackData[_l];
        if (track.numPara) {
          numMaxWidth = numAndDurSize * 20;
          numFlow = PDFText.flowPara(track.numPara, numAndDurSize, {
            lineHeight: 0,
            align: 'right',
            maxWidth: numMaxWidth
          });
          trackCommands += "/Fnt " + numAndDurSize + " Tf\n" + (-numMaxWidth - trackSize) + " 0 Td\n" + numFlow.commands + "\n" + (numMaxWidth + trackSize) + " 0 Td\n";
        }
        if (track.durPara) {
          durMaxWidth = maxTrackWidth + numAndDurSize * 4.5;
          durFlow = PDFText.flowPara(track.durPara, numAndDurSize, {
            lineHeight: 0,
            align: 'right',
            maxWidth: durMaxWidth
          });
          trackCommands += "/Fnt " + numAndDurSize + " Tf\n" + durFlow.commands + "\n";
        }
        nameFlow = PDFText.flowPara(track.namePara, trackSize, {
          maxWidth: maxTrackWidth,
          lineHeight: 1.15
        });
        trackCommands += "/Fnt " + trackSize + " Tf\n" + nameFlow.commands + "\n0 " + (fix(-trackSpacing)) + " Td\n";
        height += nameFlow.height + trackSpacing;
      }
      if (height < maxTrackHeight) {
        break;
      }
    }
    backContent = pdf.addObj("q  % colour block\n" + (bgCol.join(' ')) + " rg  % fill colour\n" + (fix(mm2pt(75))) + " " + (fix(pageSizes.a4.h - mm2pt(165))) + " " + (fix(mm2pt(117))) + " " + (fix(mm2pt(150))) + " re f  % rect, fill\nQ\n\nBT  % text down spine\n" + (fgCol.join(' ')) + " rg  % fill colour\n" + (fix(mm2pt(75) + (mm2pt(117) - totalWidth) / 2)) + " " + (fix(pageSizes.a4.h - mm2pt(15) - spineSize * spineXHeightFactor - (mm2pt(6.5) - spineSize) / 2)) + " Td\n" + spineCommands + "\n" + (fix(-artistFlow.width - spineSpace)) + " " + (fix(mm2pt(-143.5))) + " Td\n" + spineCommands + "\nET\n\nq  % track listing\n1 0 0 1 " + (fix(mm2pt(90))) + " " + (fix(pageSizes.a4.h - mm2pt(142))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\nBT\n" + trackCommands + "\nET\nQ", {
      type: PDFStream,
      minify: true
    });
    pdf.addObj("<<\n/Type /Page /Parent 3 0 R /Resources 24 0 R\n/Contents [" + backContent.ref + " 22 0 R]\n/MediaBox " + mediaBox + "\n>>", {
      num: 21
    });
    pdf.addObj("<<\n/ProcSet [ /PDF /Text ] /ColorSpace << /Cs2 9 0 R /Cs1 7 0 R >>\n/Font <<\n  /Tc10.0 29 0 R /TT8.1 27 0 R /Tc7.0 25 0 R /Tc9.0 28 0 R\n  /Fnt " + fontObj.ref + " /FntBold " + fontBoldObj.ref + "\n>>\n>>", {
      num: 24
    });
    bs = pdf.asBinaryString();
    len = bs.length;
    u8a = new Uint8Array((function() {
      var _m, _results;
      _results = [];
      for (i = _m = 0; 0 <= len ? _m < len : _m > len; i = 0 <= len ? ++_m : --_m) {
        _results.push(bs.charCodeAt(i) & 0xff);
      }
      return _results;
    })());
    b = new Blob([u8a], {
      type: 'application/pdf'
    });
    return make({
      tag: 'a',
      href: (typeof URL !== "undefined" && URL !== null ? URL : webkitURL).createObjectURL(b),
      text: 'PDF (Blob URL)',
      parent: get({
        tag: 'body'
      })
    });
  });

  albumQuery = 'http://ws.audioscrobbler.com/2.0/?' + 'api_key=2113885e020cefe1d72f95d8378d32c1&method=album.getinfo&format=json&callback=<cb>&' + location.search.substring(1);

  xhr({
    url: 'template.pdf',
    type: 'arraybuffer',
    success: function(req) {
      return pw.done({
        pdf: new Uint8Array(req.response)
      });
    }
  });

  jsonp({
    url: albumQuery,
    success: function(albumData) {
      var img, imgUrl, imgs, size, _i, _j, _len, _len1, _ref3, _ref4;
      imgs = {};
      _ref3 = albumData.album.image;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        img = _ref3[_i];
        imgs[img.size] = img['#text'];
      }
      _ref4 = w('mega extralarge large medium small');
      for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
        size = _ref4[_j];
        imgUrl = imgs[size];
        if (imgUrl != null) {
          break;
        }
      }
      return xhr({
        url: imgUrl.replace(/^http:\//, 'http://mackerron.com'),
        type: 'arraybuffer',
        success: function(req) {
          return pw.done({
            albumData: albumData,
            img: new Uint8Array(req.response)
          });
        }
      });
    }
  });

}).call(this);
