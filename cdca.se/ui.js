// Generated by CoffeeScript 1.8.0
var __slice = [].slice;

angular.module('cdca.se', ['ui.bootstrap', 'colorpicker.module']).constant('brightnessThreshold', 180).factory('lastfmService', function($http) {
  return {
    query: function(params) {
      var k, search, url, urlParts, v;
      urlParts = {
        api_key: '2113885e020cefe1d72f95d8378d32c1',
        format: 'json',
        callback: 'JSON_CALLBACK'
      };
      for (k in params) {
        v = params[k];
        urlParts[k] = v;
      }
      search = (function() {
        var _results;
        _results = [];
        for (k in urlParts) {
          v = urlParts[k];
          _results.push("" + (encodeURIComponent(k)) + "=" + (encodeURIComponent(v)));
        }
        return _results;
      })();
      url = "http://ws.audioscrobbler.com/2.0/?" + (search.join('&'));
      return $http.jsonp(url);
    }
  };
}).directive('gmLoad', function($parse) {
  return {
    restrict: 'A',
    compile: function($element, attr) {
      var fn;
      fn = $parse(attr['gmLoad']);
      return function(scope, element, attr) {
        return element.on('load', function(event) {
          return scope.$apply(function() {
            return fn(scope, {
              $event: event
            });
          });
        });
      };
    }
  };
}).directive('colorSelect', function(brightnessThreshold) {
  return {
    restrict: 'AE',
    template: " <div>\n   <div ng-repeat=\"color in colors track by $index\" class=\"color-select-item\" \n        ng-style=\"{'background-color': color}\" \n        ng-class=\"{selected: $index == selectedIndex, light: colorIsLight(color), \n                   custom: $last && customizeLast != null, first: $first, last: $last}\" \n        ng-click=\"clickedIndex($index)\">\n\n     <div ng-if=\"$last && customizeLast != null\" \n          colorpicker ng-model=\"$parent.$parent.customColor\" title=\"Select a custom colour\"></div>   \n   </div>\n   <div style=\"clear: left;\">\n </div>",
    scope: {
      colors: '=',
      selectedIndex: '=',
      selectedColor: '=',
      customizeLast: '@'
    },
    link: function($scope, $element, $attrs) {
      $scope.customColor = $scope.colors[$scope.colors.length - 1];
      $scope.$watch('customColor', function() {
        var lastIndex;
        lastIndex = $scope.colors.length - 1;
        $scope.colors[lastIndex] = $scope.customColor;
        return $scope.selectedColor = $scope.colors[$scope.selectedIndex];
      });
      $scope.$watch('selectedIndex', function() {
        return $scope.selectedColor = $scope.colors[$scope.selectedIndex];
      });
      $scope.$watch('colors', function() {
        if ($scope.selectedIndex > $scope.colors.length - 1) {
          $scope.selectedIndex = $scope.colors.length - 1;
        }
        return $scope.selectedColor = $scope.colors[$scope.selectedIndex];
      });
      $scope.clickedIndex = function(i) {
        $scope.selectedIndex = i;
        return $scope.selectedColor = $scope.colors[i];
      };
      return $scope.colorIsLight = function(color) {
        return KCol.brightness(KCol.colourFromHexString(color)) > brightnessThreshold;
      };
    }
  };
}).controller('MainCtrl', function($http, $timeout, lastfmService, brightnessThreshold) {
  var basicColours, exampleIndex, examples, nAmerica, self, _ref, _ref1, _ref2;
  self = this;
  basicColours = ['#000', '#fff', '#888'];
  this.setColours = function(colours) {
    if (colours == null) {
      colours = basicColours;
    }
    this.fgColors = colours.slice(0);
    this.bgColors = colours.slice(0);
    this.fgColorIndex = 0;
    return this.bgColorIndex = 1;
  };
  this.setImgsrc = function(imgsrc) {
    this.imgsrc = 'blank.png';
    this.imgloading = false;
    if (imgsrc != null) {
      this.imgsrc = imgsrc;
      return this.imgloading = true;
    }
  };
  this.getImgsrc = function() {
    if (this.imgsrc.match(/\bblank\.png$/)) {
      return null;
    } else {
      return this.imgsrc;
    }
  };
  this.imgLoaded = function(event) {
    this.imgloading = false;
    if (this.getImgsrc() != null) {
      this.imgTag = event.target;
      this.updateColours(this.imgTag);
      return $http.get(this.imgsrc, {
        responseType: 'arraybuffer'
      }).success(function(arrBuf) {
        return self.imgArrBuf = arrBuf;
      });
    }
  };
  this.reset = function() {
    this.tracks = '';
    this.setColours();
    this.setImgsrc(null);
    return this.lastfmlink = "http://www.last.fm/api";
  };
  this.reset();
  nAmerica = (_ref = typeof google !== "undefined" && google !== null ? (_ref1 = google.loader.ClientLocation) != null ? (_ref2 = _ref1.address) != null ? _ref2.country_code : void 0 : void 0 : void 0) === 'US' || _ref === 'CA';
  this.letterpaper = nAmerica;
  this.times = false;
  examples = "Karine Polwart/Traces\nO'Hooley & Tidow/The Fragile\nNick Drake/Five Leaves Left\nThe Decemberists/The Crane Wife\nBelle & Sebastian/If You're Feeling Sinister\nJoni Mitchell/Blue\nBen Folds Five/The Unauthorized Biography of Reinhold Messner\nThe Beta Band/The Beta Band\nThe Rolling Stones/Beggars Banquet\nVampire Weekend/Contra\nThe Beatles/Rubber Soul\nLaura Marling/A Creature I Don't Know\nThe Shins/Wincing the Night Away".split("\n").shuffle();
  exampleIndex = 0;
  this.example = function() {
    var example, _ref3;
    example = examples[exampleIndex++];
    if (exampleIndex >= examples.length) {
      exampleIndex = 0;
    }
    return _ref3 = example.split('/'), this.artist = _ref3[0], this.album = _ref3[1], _ref3;
  };
  $http.get('artists.txt').success(function(artists) {
    return self.artistsHaystack = new Trigrams.Haystack(artists.split("\n"));
  });
  this.getAlbums = function() {
    self.albumHaystack = null;
    return lastfmService.query({
      method: 'artist.gettopalbums',
      artist: this.artist,
      autocorrect: '1'
    }).success(function(albumsData) {
      var album, albumNames, albums;
      albums = albumsData.topalbums.album;
      albums.sort(function(x, y) {
        if (x.playcount < y.playcount) {
          return -1;
        } else if (x.playcount > y.playcount) {
          return 1;
        } else {
          return 0;
        }
      });
      albumNames = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = albums.length; _i < _len; _i++) {
          album = albums[_i];
          _results.push(album.name);
        }
        return _results;
      })();
      return self.albumHaystack = new Trigrams.Haystack(albumNames);
    });
  };
  this.findAlbum = function() {
    this.reset();
    this.tracklistloading = true;
    return lastfmService.query({
      method: 'album.getinfo',
      artist: this.artist,
      album: this.album,
      autocorrect: '1'
    }).success(function(albumData) {
      var album, i, img, imgUrl, imgs, mins, proxiedUrl, secs, size, t, trackTexts, tracks, _i, _j, _len, _len1, _ref3, _ref4, _ref5, _ref6, _ref7;
      self.tracklistloading = false;
      album = albumData.album;
      self.artist = album.artist;
      self.album = album.name;
      self.lastfmlink = album.url;
      self.released = (_ref3 = albumData.album.releasedate) != null ? (_ref4 = _ref3.match(/\b\w+ (19|20)\d\d\b/)) != null ? _ref4[0] : void 0 : void 0;
      if (tracks = (_ref5 = albumData.album.tracks) != null ? _ref5.track : void 0) {
        trackTexts = (function() {
          var _i, _len, _results;
          _results = [];
          for (i = _i = 0, _len = tracks.length; _i < _len; i = ++_i) {
            t = tracks[i];
            mins = '' + Math.floor(t.duration / 60);
            secs = '' + t.duration % 60;
            if (secs.length < 2) {
              secs = '0' + secs;
            }
            _results.push("" + (i + 1) + ". " + t.name + " [" + mins + ":" + secs + "]");
          }
          return _results;
        })();
        self.tracks = trackTexts.join('\n');
      }
      imgs = {};
      _ref6 = albumData.album.image;
      for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
        img = _ref6[_i];
        imgs[img.size] = img['#text'];
      }
      _ref7 = w('mega extralarge large medium small');
      for (_j = 0, _len1 = _ref7.length; _j < _len1; _j++) {
        size = _ref7[_j];
        imgUrl = imgs[size];
        if (imgUrl != null) {
          break;
        }
      }
      if (imgUrl != null) {
        proxiedUrl = imgUrl.replace(/^http:\//, 'http://mackerron.com/cdcase.images.proxy');
        return self.setImgsrc(proxiedUrl);
      }
    });
  };
  this.updateColours = function(img) {
    var bc, bgColor, colours, ico, imgColourObjs, imgColours;
    KCol.random = new MTwist(31415926).random;
    imgColourObjs = KCol.colours({
      img: img,
      includeColours: (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = basicColours.length; _i < _len; _i++) {
          bc = basicColours[_i];
          _results.push(KCol.colourFromHexString(bc));
        }
        return _results;
      })()
    });
    imgColours = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = imgColourObjs.length; _i < _len; _i++) {
        ico = imgColourObjs[_i];
        _results.push(KCol.hexStringFromColour(ico));
      }
      return _results;
    })();
    colours = __slice.call(imgColours.slice(3)).concat(__slice.call(basicColours));
    this.setColours(colours);
    this.bgColorIndex = 0;
    bgColor = KCol.colourFromHexString(colours[this.bgColorIndex]);
    return this.fgColorIndex = colours.length - (KCol.brightness(bgColor) > brightnessThreshold ? 3 : 2);
  };
  this.makePDF = function() {
    return $http.get('template.pdf', {
      responseType: 'arraybuffer'
    }).success(function(pdfTemplate) {
      var artistFlow, artistPara, backContent, bgCol, dur, durFlow, durMatch, durMaxWidth, durRe, fgCol, filename, fix, font, fontBold, fontBoldObj, fontObj, frontContent, height, i, imgObj, imgOpts, insideFlow, insidePara, insideSize, insideText, k, maxSpineWidth, maxTrackHeight, maxTrackWidth, mediaBox, mm2pt, name, nameFlow, namePara, num, numAndDurSize, numFlow, numMatch, numMaxWidth, numRe, pageSize, pageSizes, pdf, spineCommands, spineSize, spineSpace, spineXHeightFactor, t, totalWidth, track, trackCommands, trackData, trackSize, trackSpacing, v, _i, _j, _k, _l, _len, _len1;
      pdf = new HackDoc(pdfTemplate);
      fix = function(n) {
        return n.toFixed(3).replace(/\.?0+$/, '');
      };
      mm2pt = function(mm) {
        return mm / 25.4 * 72;
      };
      imgOpts = {
        arrBuf: self.imgArrBuf,
        tag: self.imgTag,
        ignoreTransparency: true
      };
      imgObj = PDFImage.create(pdf, imgOpts);
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
      pageSize = pageSizes[self.letter ? 'letter' : 'a4'];
      if (self.times) {
        font = 'Times-Roman';
        fontBold = 'Times-Bold';
      } else {
        font = 'Helvetica';
        fontBold = 'Helvetica-Bold';
      }
      bgCol = KCol.colourFromHexString(self.bgColor);
      fgCol = KCol.colourFromHexString(self.fgColor);
      bgCol = [bgCol.r / 255, bgCol.g / 255, bgCol.b / 255];
      fgCol = [fgCol.r / 255, fgCol.g / 255, fgCol.b / 255];
      insideText = typeof releaseStr !== "undefined" && releaseStr !== null ? "Released: " + releaseStr : '';
      insideSize = 10;
      insideFlow = PDFText.preprocessPara(insideText, font);
      insidePara = PDFText.flowPara(insideFlow, insideSize, {
        maxWidth: fix(mm2pt(100))
      });
      numRe = /^(\d+)\.\s+/;
      durRe = /\s+\[(\d+:\d+)\]\s*$/;
      trackData = (function() {
        var _i, _len, _ref3, _results;
        _ref3 = self.tracks.split('\n');
        _results = [];
        for (i = _i = 0, _len = _ref3.length; _i < _len; i = ++_i) {
          t = _ref3[i];
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
      fontObj = PDFFont.create(pdf, {
        name: font
      });
      fontBoldObj = PDFFont.create(pdf, {
        name: fontBold
      });
      mediaBox = "[0 " + (pageSizes.a4.h - pageSize.h) + " " + pageSize.w + " " + pageSizes.a4.h + "]";
      frontContent = PDFStream.create(pdf, {
        stream: "q  % colour block\n" + (bgCol.join(' ')) + " rg  % fill colour\n" + (fix(mm2pt(75))) + " " + (fix(pageSizes.a4.h - mm2pt(255))) + " " + (fix(mm2pt(120))) + " " + (fix(mm2pt(120))) + " re f  % rect, fill\nQ\n\nq  % small album art\n" + (fix(mm2pt(60))) + " 0 0 " + (fix(mm2pt(60))) + " " + (fix(mm2pt(165))) + " " + (fix(pageSizes.a4.h - mm2pt(225))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\n/AlbumArt Do\nQ\n\nq  % line around small album art\n0.25 w  " + (fgCol.join(' ')) + " RG  % line colour\n" + (fix(mm2pt(105))) + " " + (fix(pageSizes.a4.h - mm2pt(225))) + " " + (fix(mm2pt(60))) + " " + (fix(mm2pt(60))) + " re  S  % rect, stroke\nQ\n\nq  % big album art\n" + (fix(mm2pt(120))) + " 0 0 " + (fix(mm2pt(120))) + " " + (fix(mm2pt(195))) + " " + (fix(pageSizes.a4.h - mm2pt(135))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\n/AlbumArt Do\nQ\n\nq  % release date\n1 0 0 1 " + (fix(mm2pt(83))) + " " + (fix(pageSizes.a4.h - mm2pt(248))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\nBT\n/Fnt " + insideSize + " Tf\n" + insidePara.commands + "\nET\nQ",
        minify: true
      });
      PDFObj.create(pdf, {
        data: "<<\n/Type /Page /Parent 3 0 R /Resources 6 0 R\n/Contents [" + frontContent.ref + " 4 0 R]\n/MediaBox " + mediaBox + "\n>>",
        num: 2
      });
      PDFObj.create(pdf, {
        data: "<<\n/ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ] /ColorSpace << /Cs1 7 0 R /Cs2 9 0 R >>\n/Font <<\n  /Tc3.0 11 0 R /Tc4.1 13 0 R /Tc2.0 10 0 R /TT5.1 15 0 R /Tc1.0 8 0 R /Tc6.0 16 0 R\n  /Fnt " + fontObj.ref + "\n  >>\n/XObject << /AlbumArt " + imgObj.ref + " >>\n>>",
        num: 6
      });
      artistPara = PDFText.preprocessPara(self.artist, font);
      namePara = PDFText.preprocessPara(self.album, fontBold);
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
      backContent = PDFStream.create(pdf, {
        stream: "q  % colour block\n" + (bgCol.join(' ')) + " rg  % fill colour\n" + (fix(mm2pt(75))) + " " + (fix(pageSizes.a4.h - mm2pt(165))) + " " + (fix(mm2pt(117))) + " " + (fix(mm2pt(150))) + " re f  % rect, fill\nQ\n\nBT  % text down spine\n" + (fgCol.join(' ')) + " rg  % fill colour\n" + (fix(mm2pt(75) + (mm2pt(117) - totalWidth) / 2)) + " " + (fix(pageSizes.a4.h - mm2pt(15) - spineSize * spineXHeightFactor - (mm2pt(6.5) - spineSize) / 2)) + " Td\n" + spineCommands + "\n" + (fix(-artistFlow.width - spineSpace)) + " " + (fix(mm2pt(-143.5))) + " Td\n" + spineCommands + "\nET\n\nq  % track listing\n1 0 0 1 " + (fix(mm2pt(90))) + " " + (fix(pageSizes.a4.h - mm2pt(142))) + " cm  % scaleX 0 0 scaleY trnslX trnslY cm\n0 1 -1 0 0 0 cm  % rotate 90deg a-cw\nBT\n" + trackCommands + "\nET\nQ",
        minify: true
      });
      PDFObj.create(pdf, {
        data: "<<\n/Type /Page /Parent 3 0 R /Resources 24 0 R\n/Contents [" + backContent.ref + " 22 0 R]\n/MediaBox " + mediaBox + "\n>>",
        num: 21
      });
      PDFObj.create(pdf, {
        data: "<<\n/ProcSet [ /PDF /Text ] /ColorSpace << /Cs2 9 0 R /Cs1 7 0 R >>\n/Font <<\n  /Tc10.0 29 0 R /TT8.1 27 0 R /Tc7.0 25 0 R /Tc9.0 28 0 R\n  /Fnt " + fontObj.ref + " /FntBold " + fontBoldObj.ref + "\n  >>\n>>",
        num: 24
      });
      filename = ("" + self.artist + " " + self.album).toLowerCase().replace(/\s+/g, '_').replace(/\W+/g, '') + '.pdf';
      return pdf.linkAsync(filename, function(link) {
        link.appendChild(text('PDF'));
        return get({
          tag: 'body'
        }).appendChild(link);
      });
    });
  };
  return null;
});

//# sourceMappingURL=ui.js.map
