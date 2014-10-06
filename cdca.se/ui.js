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
}).controller('MainCtrl', function($http, $timeout, lastfmService, brightnessThreshold, makePDF) {
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
      self.pdfTemplate = pdfTemplate;
      return makePDF(self);
    });
  };
  return null;
});

//# sourceMappingURL=ui.js.map
