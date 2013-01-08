base64String: (n = Infinity, output = '') ->
  b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split ''
  len = Math.min n, @data.length - @offset
  padLen = (3 - len % 3) % 3  # equivalent: [0, 2, 1][len % 3]
  padded = new Uint8Array len + padLen
  subarr = @data.subarray @offset, len
  padded.set subarr  # any remaining elements will be zero, as we wish
  for chr1, i in padded by 3
    chr2 = padded[i + 1]
    chr3 = padded[i + 2]
    output += chars[chr1 >> 2]
    output += chars[((chr1 & 3) << 4) | (chr2 >> 4)]
    output += chars[((chr2 & 15) << 2) | (chr3 >> 6)]
    output += chars[chr3 & 63]
  output.substring(0, output.length - padLen) + '=='.substring(0, padLen)
