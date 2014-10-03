
Array::append = (a) -> 
  @push x for x in a
  @

Array::prepend = (a) -> 
  @unshift x for x in a
  @

Array::flatten = (arr = []) ->
  for item in @
    if Array.isArray(item) then item.flatten arr
    else arr.push item
  arr

Array::shuffle = (randomFunc = Math.random) ->
  length = @length;
  shuffled = new Array length
  for item, index in @
    rand = Math.floor(randomFunc() * (index + 1))
    rand = index if rand > index  # stop a VERY occasional error: # https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    if rand isnt index then shuffled[index] = shuffled[rand]
    shuffled[rand] = @[index]
  shuffled
