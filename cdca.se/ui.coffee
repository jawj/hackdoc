angular.module 'cdca.se', ['ui.bootstrap', 'colorpicker.module']

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


.directive 'colorSelect', ->

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

  restrict: 'AE'

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

    $scope.clickedIndex = (i) ->
      $scope.selectedIndex = i
      $scope.selectedColor = $scope.colors[i]
    
    $scope.colorIsLight = (color) ->
      KCol.brightness(KCol.colourFromHexString color) > 180


.controller 'MainCtrl', ($http, $timeout, lastfmService) ->
  self = @

  nAmerica = google?.loader.ClientLocation?.address?.country_code in ['US', 'CA']
  @letterpaper = nAmerica
  @times = false

  @fgColors = ['#000', '#fff', '#888']
  @fgColorIndex = 0

  @bgColors = ['#000', '#fff', '#888']
  @bgColorIndex = 1

  @example = ->
    example = examples[Math.floor(Math.random() * examples.length)]
    [@artist, @album] = example.split '/'

  $http.get('artists.txt').success (artists) ->
    self.artistsHaystack = new Trigrams.Haystack artists.split "\n"

  examples = """Karine Polwart/Traces
    O'Hooley & Tidow/The Fragile
    Nick Drake/Five Leaves Left
    The Decemberists/The Crane Wife
    Belle & Sebastian/If You're Feeling Sinister
    Joni Mitchell/Blue
    Ben Folds Five/The Unauthorized Biography of Reinhold Messner
    The Beta Band/The Beta Band""".split "\n"

  @getAlbums = ->
    self.albumHaystack = null
    lastfmService.query(method: 'artist.gettopalbums', artist: @artist, autocorrect: '1').success (albumsData) ->
      albums = albumsData.topalbums.album
      albums.sort (x, y) -> if x.playcount < y.playcount then -1 else if x.playcount > y.playcount then 1 else 0
      albumNames = (album.name for album in albums)
      self.albumHaystack = new Trigrams.Haystack albumNames

  @findAlbum = ->
    lastfmService.query(method: 'album.getinfo', artist: @artist, album: @album, autocorrect: '1').success (albumData) ->
      console.log albumData
      imgs = {}
      for img in albumData.album.image
        imgs[img.size] = img['#text']
      for size in w 'mega extralarge large medium small'
        imgUrl = imgs[size]
        break if imgUrl?
      if imgUrl?
        proxiedUrl = imgUrl.replace(/^http:\//, 'http://mackerron.com/cdcase.images.proxy')
        $http.get(proxiedUrl, responseType: 'arraybuffer').success (arrBuf) ->
          self.imgsrc = proxiedUrl
          $timeout (->
            KCol.random = new MTwist(31415926).random
            colours = KCol.colours img: document.getElementById('coverart')
            console.log colours), 1000
  null
  

