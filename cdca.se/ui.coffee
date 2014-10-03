angular.module 'cdca.se', ['ui.bootstrap', 'colorpicker.module']

.constant('brightnessThreshold', 180)

.factory 'lastfmService', ($http) ->
  query: (params) ->
    urlParts = 
      api_key: '2113885e020cefe1d72f95d8378d32c1'
      format: 'json'
      callback: 'JSON_CALLBACK'

    (urlParts[k] = v) for k, v of params
    search = ("#{encodeURIComponent k}=#{encodeURIComponent v}" for k, v of urlParts)
    url = "http://ws.audioscrobbler.com/2.0/?#{search.join '&'}"
    $http.jsonp(url)


.directive 'gmLoad', ($parse) -> 
  restrict: 'A'

  compile: ($element, attr) ->
    fn = $parse attr['gmLoad']
    (scope, element, attr) ->
      element.on 'load', (event) ->
        scope.$apply ->
          fn scope, {$event: event}


.directive 'colorSelect', (brightnessThreshold) ->
  restrict: 'AE'

  template: """
    <div>
      <div ng-repeat="color in colors track by $index" class="color-select-item" 
           ng-style="{'background-color': color}" 
           ng-class="{selected: $index == selectedIndex, light: colorIsLight(color), 
                      custom: $last && customizeLast != null, first: $first, last: $last}" 
           ng-click="clickedIndex($index)">
   
        <div ng-if="$last && customizeLast != null" 
             colorpicker ng-model="$parent.$parent.customColor" title="Select a custom colour"></div>   
      </div>
      <div style="clear: left;">
    </div>
  """

  scope:
    colors: '='
    selectedIndex: '='
    selectedColor: '='
    customizeLast: '@'

  link: ($scope, $element, $attrs) ->
    $scope.customColor = $scope.colors[$scope.colors.length - 1]

    $scope.$watch 'customColor', ->
      lastIndex = $scope.colors.length - 1
      $scope.colors[lastIndex] = $scope.customColor
      $scope.selectedColor = $scope.colors[$scope.selectedIndex]

    $scope.$watch 'selectedIndex', ->
      $scope.selectedColor = $scope.colors[$scope.selectedIndex]

    $scope.$watch 'colors', ->
      if $scope.selectedIndex > $scope.colors.length - 1 then $scope.selectedIndex = $scope.colors.length - 1
      $scope.selectedColor = $scope.colors[$scope.selectedIndex]

    $scope.clickedIndex = (i) ->
      $scope.selectedIndex = i
      $scope.selectedColor = $scope.colors[i]
    
    $scope.colorIsLight = (color) ->
      KCol.brightness(KCol.colourFromHexString color) > brightnessThreshold


.controller 'MainCtrl', ($http, $timeout, lastfmService, brightnessThreshold) ->
  self = @

  basicColours = ['#000', '#fff', '#888']
  @setColours = (colours = basicColours) -> 
    @fgColors = colours[..]
    @bgColors = colours[..]
    @fgColorIndex = 0
    @bgColorIndex = 1

  @setImgsrc = (imgsrc) ->
    @imgsrc = 'blank.png'
    @imgloading = no
    if imgsrc?
      @imgsrc = imgsrc
      @imgloading = yes

  @getImgsrc = ->
    if @imgsrc.match /\bblank\.png$/ then null else @imgsrc

  @imgLoaded = (event) ->
    @imgloading = no
    if @getImgsrc()?
      img = event.target
      @updateColours img
    
  @reset = ->
    @tracks = ''
    @setColours()
    @setImgsrc null
    @lastfmlink = "http://www.last.fm/api"
    
  @reset()

  nAmerica = google?.loader.ClientLocation?.address?.country_code in ['US', 'CA']
  @letterpaper = nAmerica
  @times = false

  examples = """Karine Polwart/Traces
    O'Hooley & Tidow/The Fragile
    Nick Drake/Five Leaves Left
    The Decemberists/The Crane Wife
    Belle & Sebastian/If You're Feeling Sinister
    Joni Mitchell/Blue
    Ben Folds Five/The Unauthorized Biography of Reinhold Messner
    The Beta Band/The Beta Band
    The Rolling Stones/Beggars Banquet
    Vampire Weekend/Contra
    The Beatles/Rubber Soul
    Laura Marling/A Creature I Don't Know""".split("\n").shuffle()

  exampleIndex = 0
  @example = ->
    example = examples[exampleIndex++]
    exampleIndex = 0 if exampleIndex >= examples.length
    [@artist, @album] = example.split '/'

  $http.get('artists.txt').success (artists) ->
    self.artistsHaystack = new Trigrams.Haystack artists.split "\n"

  @getAlbums = ->
    self.albumHaystack = null
    lastfmService.query(method: 'artist.gettopalbums', artist: @artist, autocorrect: '1').success (albumsData) ->
      albums = albumsData.topalbums.album
      albums.sort (x, y) -> if x.playcount < y.playcount then -1 else if x.playcount > y.playcount then 1 else 0
      albumNames = (album.name for album in albums)
      self.albumHaystack = new Trigrams.Haystack albumNames    

  @findAlbum = ->
    @reset()
    @tracklistloading = yes

    lastfmService.query(method: 'album.getinfo', artist: @artist, album: @album, autocorrect: '1').success (albumData) ->
      self.tracklistloading = no
      console.log albumData

      album = albumData.album

      self.artist = album.artist
      self.album = album.name
      self.lastfmlink = album.url

      if tracks = albumData.album.tracks?.track
        trackTexts = for t, i in tracks
          mins = '' + Math.floor(t.duration / 60)
          secs = '' + t.duration % 60
          secs = '0' + secs if secs.length < 2
          "#{i + 1}. #{t.name} [#{mins}:#{secs}]"
          
        self.tracks = trackTexts.join '\n'

      self.released = albumData.album.releasedate?.match(/\b\w+ (19|20)\d\d\b/)?[0]

      imgs = {}
      for img in albumData.album.image
        imgs[img.size] = img['#text']
      for size in w 'mega extralarge large medium small'
        imgUrl = imgs[size]
        break if imgUrl?
      if imgUrl?
        proxiedUrl = imgUrl.replace(/^http:\//, 'http://mackerron.com/cdcase.images.proxy')
        self.setImgsrc proxiedUrl

  @updateColours = (img) ->
    KCol.random = new MTwist(31415926).random
    imgColourObjs = KCol.colours img: img, includeColours: (KCol.colourFromHexString bc for bc in basicColours)
    imgColours = (KCol.hexStringFromColour ico for ico in imgColourObjs)
    colours = [imgColours[3..]..., basicColours...]
    @setColours colours
    @bgColorIndex = 0
    @fgColorIndex = colours.length - if KCol.brightness(imgColourObjs[3]) > brightnessThreshold then 3 else 2


  null

###
        $http.get(proxiedUrl, responseType: 'arraybuffer').success (arrBuf) ->
          self.imgsrc = proxiedUrl
          $timeout (->
            KCol.random = new MTwist(31415926).random
            colours = KCol.colours img: document.getElementById('coverart')
            console.log colours), 1000
###

  

