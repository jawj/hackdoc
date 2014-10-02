
@KCol =
  colours: (opts) ->  # opts.img is the only required option
    opts[k] ?= v for k, v of KCol.defaults

    pixelArr = KCol.pixelArray opts
    samples = opts.sampleFunc pixelArr, opts  
    means = KCol.startingValues samples, opts
    KCol.iterate means, samples, opts unless means.length < opts.k
    means.sort (a, b) -> a.sampleCount < b.sampleCount  # sort most 'representative' first
    means = opts.includeColours.concat means if opts.includeColours?
    means = KCol.eliminateSimilar means, opts
    KCol.rgbRound mean for mean in means

  pixelArray: (opts) ->
    {width, height} = opts.img
    throw 'Input must be a loaded image' unless opts.img?.width > 0
    canvas = make {tag: 'canvas', width, height}
    ctx = canvas.getContext '2d'
    ctx.drawImage opts.img, 0, 0
    pixels = ctx.getImageData 0, 0, width, height
    pixels.data

  randomPixelSamples: (pixelArr, opts) ->
    pixelCount = pixelArr.length / 4
    for i in [0...opts.numSamples]
      offset = KCol.randInt(pixelCount) * 4
      {r: pixelArr[offset], g: pixelArr[offset + 1], b: pixelArr[offset + 2]}
  
  gridwisePixelSamples: (pixelArr, opts) ->
    # note: if ctx.imageSmoothingEnabled was universal (ahem, IE), it would be nicer, quicker,
    # and use less memory just to drawImage a small copy and use that data directly
    {width, height} = opts.img
    aspect = width / height
    vSamples = Math.round Math.sqrt opts.numSamples / aspect
    hSamples = Math.round vSamples * aspect
    vBandSize = height / vSamples
    hBandSize = width / hSamples
    samples = []
    for vs in [0...vSamples]
      y = Math.round vs * vBandSize + vBandSize / 2
      yOffset = y * width * 4
      for hs in [0...hSamples]
        x = Math.round hs * hBandSize + hBandSize / 2
        offset = yOffset + x * 4
        samples.push {r: pixelArr[offset], g: pixelArr[offset + 1], b: pixelArr[offset + 2]}
    samples

  startingValues: (samples, opts) ->
    means = []
    for i in [0...opts.k]
      for attempt in [0...opts.meanAttempts]
        dupe = no
        mean = samples[KCol.randInt samples.length]
        for prevMean in means
          dupe = mean.r is prevMean.r and mean.g is prevMean.g and mean.b is prevMean.b
          break if dupe
        break unless dupe
      break if dupe
      means.push mean
    means
  
  iterate: (means, samples, opts) ->
    for i in [0...opts.iterations]

      # reset count and component sums
      for mean in means
        mean.sampleCount = mean.rSum = mean.gSum = mean.bSum = 0

      # find nearest mean for each sample
      for sample in samples
        minDistSq = Infinity
        for mean in means
          rDiff = sample.r - mean.r
          gDiff = sample.g - mean.g
          bDiff = sample.b - mean.b
          distSq = rDiff * rDiff + gDiff * gDiff + bDiff * bDiff
          if distSq < minDistSq
            nearestMean = mean
            minDistSq = distSq

        # add sample values to nearest mean's component sums and count
        nearestMean.sampleCount += 1
        nearestMean.rSum += sample.r
        nearestMean.gSum += sample.g
        nearestMean.bSum += sample.b

      # recalcuate mean from component sums and count
      for mean in means when mean.sampleCount > 0
        mean.r = mean.rSum / mean.sampleCount
        mean.g = mean.gSum / mean.sampleCount
        mean.b = mean.bSum / mean.sampleCount
    
    null
  
  eliminateSimilar: (means, opts) ->
    distinctMeans = []
    for mean, i in means
      similar = no
      for j in [0...i]
        prevMean = means[j]
        if KCol.colourDistance(mean, prevMean) < opts.minDistance
          similar = yes
          break
      distinctMeans.push mean unless similar 
    distinctMeans
  
  randInt: (lt) ->  # returns int between 0 and lt - 1 
    Math.floor(KCol.random() * lt * 0.999999999999)  # because Math.random() occasionally returns 1

  colourDistance: (c1, c2) ->  # 0 - 100, see http://compuphase.com/cmetric.htm
    rMean = (c1.r + c2.r) / 2
    r = c1.r - c2.r
    g = c1.g - c2.g
    b = c1.b - c2.b
    Math.sqrt((2 + rMean / 256) * r * r + 4 * g * g + (2 + (255 - rMean) / 256) * b * b) / 7.64834

  brightness: (c) ->  # 0 - 255, see http://www.nbdtech.com/Blog/archive/2008/04/27/Calculating-the-Perceived-Brightness-of-a-Color.aspx
    Math.sqrt c.r * c.r * 0.241 + c.g * c.g * 0.691 + c.b * c.b * 0.068

  rgbRound: (rgb) ->
    {r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b)}
  
  colourFromHexString: (str) ->
    rgb = str.match /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i
    return {r: parseInt(rgb[1], 16), g: parseInt(rgb[2], 16), b: parseInt(rgb[3], 16)} if rgb
    rgb = str.match /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i
    return {r: parseInt(rgb[1] + rgb[1], 16), g: parseInt(rgb[2] + rgb[2], 16), b: parseInt(rgb[3] + rgb[3], 16)} if rgb
    throw "Invalid colour string '#{str}'"
    

@KCol.defaults =
  k:            5     # max number of colours to extract
  sampleFunc:   KCol.randomPixelSamples  # random or gridwise are built in
  numSamples:   400   # how many pixels to sample from full image
  meanAttempts: 50    # no. of times we try to find unique starting values within samples
  iterations:   30    # most pics converge in 15 - 25; the rest change little subsequently
  minDistance:  10    # eliminate colours from output that are closer together than this

@KCol.random = Math.random