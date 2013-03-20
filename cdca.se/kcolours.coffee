
@kColours = (imgTag, opts = {}) ->

  opts.k ?= 5
  opts.numSamples ?= 500
  opts.sampleAttempts ?= opts.numSamples / 2

  # most pics converge in 15 - 25 iterations, and those that don't change little subsequently
  opts.iterations ?= 30   

  # randomness setup
  Math.seedrandom opts.rngSeed if opts.rngSeed?
  almostOne = 0.999999999999  # because Math.random() occasionally returns 1
  randInt = (lt) -> Math.floor(Math.random() * almostOne * lt)  # returns int between 0 and lt - 1

  # make <canvas> and get pixel array
  {width, height} = imgTag
  canvas = make {tag: 'canvas', width, height}
  ctx = canvas.getContext '2d'
  ctx.drawImage imgTag, 0, 0
  pixelArr = (ctx.getImageData 0, 0, width, height).data
  
  # sample pixels at random
  pixelCount = width * height
  samples = for i in [0...opts.numSamples]
    offset = randInt(pixelCount) * 4
    {r: pixelArr[offset], g: pixelArr[offset + 1], b: pixelArr[offset + 2]}
  
  # select k initial 'means' at random from samples
  means = []
  for i in [0...opts.k]
    for attempt in [0...opts.sampleAttempts]
      dupe = no
      mean = samples[randInt opts.numSamples]
      for prevMean in means
        dupe = mean.r is prevMean.r and mean.g is prevMean.g and mean.b is prevMean.b
        break if dupe
      break unless dupe
    break if dupe
    means.push mean
  
  # main loop
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

  means.sort((a, b) -> a.sampleCount < b.sampleCount)  # most 'representative' first
  {r: Math.round(mean.r), g: Math.round(mean.g), b: Math.round(mean.b)} for mean in means
  
  # TODO: eliminate/merge very similar colours?
  # sort lightest first: means.sort((a, b) -> a.r + a.g + a.b < b.r + b.g + b.b)