
@w = (str) -> str.split /\s+/
@b64 = (input, output = '') ->
  chars = b64.chars
  len = input.length
  padLen = (3 - len % 3) % 3  # equivalent: [0, 2, 1][len % 3]
  padded = if padLen is 0 then input else input + '\x00\x00'.substring(0, padLen)
  i = 0
  while i < len
    chr1 = padded.charCodeAt(i++) & 255
    chr2 = padded.charCodeAt(i++) & 255
    chr3 = padded.charCodeAt(i++) & 255
    output += chars[chr1 >> 2]
    output += chars[((chr1 & 3) << 4) | (chr2 >> 4)]
    output += chars[((chr2 & 15) << 2) | (chr3 >> 6)]
    output += chars[chr3 & 63]
  if padLen is 0 then output 
  else output.substring(0, output.length - padLen) + '=='.substring(0, padLen)
  
b64.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split ''

@cls = (el, opts = {}) ->
  classHash = {}  
  classes = el.className.match(cls.re)
  if classes?
    (classHash[c] = yes) for c in classes
  hasClasses = opts.has?.match(cls.re)
  if hasClasses?
    (return no unless classHash[c]) for c in hasClasses
    return yes
  addClasses = opts.add?.match(cls.re)
  if addClasses?
    (classHash[c] = yes) for c in addClasses
  removeClasses = opts.remove?.match(cls.re)
  if removeClasses?
    delete classHash[c] for c in removeClasses
  toggleClasses = opts.toggle?.match(cls.re)
  if toggleClasses?
    for c in toggleClasses
      if classHash[c] then delete classHash[c] else classHash[c] = yes
  el.className = (k for k of classHash).join ' '
  null
  
cls.re = /\S+/g

@get = (opts = {}) ->  
  inside = opts.inside ? document
  tag = opts.tag ? '*'
  if opts.id?
    return inside.getElementById opts.id
  hasCls = opts.cls?
  if hasCls and tag is '*' and inside.getElementsByClassName?
    return inside.getElementsByClassName opts.cls
  els = inside.getElementsByTagName tag
  if hasCls then els = (el for el in els when cls el, has: opts.cls)
  if not opts.multi? and tag.toLowerCase() in get.uniqueTags then els[0] ? null else els
  
get.uniqueTags = 'html body frameset head title base'.split(' ')

@text = (t) -> document.createTextNode '' + t
@make = (opts = {}) ->
  t = document.createElement opts.tag ? 'div'
  for own k, v of opts
    switch k
      when 'tag' then continue
      when 'parent' then v.appendChild t
      when 'kids' then t.appendChild c for c in v when c?
      when 'prevSib' then v.parentNode.insertBefore t, v.nextSibling
      when 'text' then t.appendChild text v
      when 'cls' then t.className = v
      else t[k] = v
  t

@xhr = (opts = {}) ->
  method = opts.method ? 'GET'
  req = new XMLHttpRequest()
  req.onreadystatechange = -> 
    if req.readyState is 4 and (req.status is 200 or not location.href.match /^https?:/)
      opts.success(req)
  if opts.type is 'binString'
    req.overrideMimeType 'text/plain; charset=x-user-defined'
  else if opts.type?
    req.responseType = opts.type
  req.overrideMimeType opts.mime if opts.mime?
  req.user = opts.user if opts.user?
  req.password = opts.password if opts.password?
  req.setRequestHeader k, v for k, v of opts.headers if opts.headers?
  req.open method, opts.url
  req.send opts.data
  yes

@noop = (x) -> x
@jsonp = (opts) ->
  callbackName = opts.callback ? '_JSONPCallback_' + jsonp.callbackNum++
  url = opts.url.replace '<cb>', callbackName
  window[callbackName] = opts.success ? noop
  make tag: 'script', src: url, parent: (get tag: 'head')
  
jsonp.callbackNum = 0

class @ParallelWaiter  # waits for parallel async jobs
  constructor: (@waitingFor, @cb) -> @returnValues = {}
  await: (n = 1) -> @waitingFor += n
  done: (returnValues) ->
    (@returnValues[k] = v) for k, v of returnValues
    @cb(@returnValues) if --@waitingFor is 0

class @BinReader
  constructor: (@data) -> @offset = 0
  skip: (n) -> @offset += n
  seek: (n) -> @offset = n
  chars: (n = Infinity, str = '') ->
    end = Math.min n, @data.length - @offset
    for i in [0...end]
      str += String.fromCharCode @uchar()
    str
  uint16be: -> (@uchar() << 8) + @uchar()
  uint32be: -> (@uint16be() << 16) + @uint16be()
  eof: -> @offset >= @data.length

class @BinStringReader extends BinReader
  uchar: -> @data.charCodeAt(@offset++) & 0xff

class @Uint8ArrayReader extends BinReader 
  # keeps position, and compatible with older browsers than DataView
  uchar: -> @data[@offset++]
  subarray: (n) -> @data.subarray @offset, (@offset += n)
    
