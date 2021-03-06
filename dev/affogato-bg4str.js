// Generated by CoffeeScript 1.6.2
(function() {
  ({
    base64String: function(n, output) {
      var b64chars, chr1, chr2, chr3, i, len, padLen, padded, subarr, _i, _len;

      if (n == null) {
        n = Infinity;
      }
      if (output == null) {
        output = '';
      }
      b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
      len = Math.min(n, this.data.length - this.offset);
      padLen = (3 - len % 3) % 3;
      padded = new Uint8Array(len + padLen);
      subarr = this.data.subarray(this.offset, len);
      padded.set(subarr);
      for (i = _i = 0, _len = padded.length; _i < _len; i = _i += 3) {
        chr1 = padded[i];
        chr2 = padded[i + 1];
        chr3 = padded[i + 2];
        output += chars[chr1 >> 2];
        output += chars[((chr1 & 3) << 4) | (chr2 >> 4)];
        output += chars[((chr2 & 15) << 2) | (chr3 >> 6)];
        output += chars[chr3 & 63];
      }
      return output.substring(0, output.length - padLen) + '=='.substring(0, padLen);
    }
  });

}).call(this);

/*
//@ sourceMappingURL=affogato-bg4str.map
*/
