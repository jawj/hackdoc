// Generated by CoffeeScript 1.6.2
(function() {
  var _ref, _ref1,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  this.extend = function() {
    var dest, k, src, srcs, v, _i, _len;

    dest = arguments[0], srcs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = srcs.length; _i < _len; _i++) {
      src = srcs[_i];
      for (k in src) {
        v = src[k];
        dest[k] = v;
      }
    }
    return dest;
  };

  this.w = function(str) {
    return str.split(/\s+/);
  };

  this.b64 = function(input, output) {
    var chars, chr1, chr2, chr3, i, len, padLen, padded;

    if (output == null) {
      output = '';
    }
    chars = b64.chars;
    len = input.length;
    padLen = (3 - len % 3) % 3;
    padded = padLen === 0 ? input : input + '\x00\x00'.substring(0, padLen);
    i = 0;
    while (i < len) {
      chr1 = padded.charCodeAt(i++) & 255;
      chr2 = padded.charCodeAt(i++) & 255;
      chr3 = padded.charCodeAt(i++) & 255;
      output += chars[chr1 >> 2];
      output += chars[((chr1 & 3) << 4) | (chr2 >> 4)];
      output += chars[((chr2 & 15) << 2) | (chr3 >> 6)];
      output += chars[chr3 & 63];
    }
    if (padLen === 0) {
      return output;
    } else {
      return output.substring(0, output.length - padLen) + '=='.substring(0, padLen);
    }
  };

  b64.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');

  this.cls = function(el, opts) {
    var addClasses, c, classHash, classes, hasClasses, k, removeClasses, toggleClasses, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2, _ref3;

    if (opts == null) {
      opts = {};
    }
    classHash = {};
    classes = el.className.match(cls.re);
    if (classes != null) {
      for (_i = 0, _len = classes.length; _i < _len; _i++) {
        c = classes[_i];
        classHash[c] = true;
      }
    }
    hasClasses = (_ref = opts.has) != null ? _ref.match(cls.re) : void 0;
    if (hasClasses != null) {
      for (_j = 0, _len1 = hasClasses.length; _j < _len1; _j++) {
        c = hasClasses[_j];
        if (!classHash[c]) {
          return false;
        }
      }
      return true;
    }
    addClasses = (_ref1 = opts.add) != null ? _ref1.match(cls.re) : void 0;
    if (addClasses != null) {
      for (_k = 0, _len2 = addClasses.length; _k < _len2; _k++) {
        c = addClasses[_k];
        classHash[c] = true;
      }
    }
    removeClasses = (_ref2 = opts.remove) != null ? _ref2.match(cls.re) : void 0;
    if (removeClasses != null) {
      for (_l = 0, _len3 = removeClasses.length; _l < _len3; _l++) {
        c = removeClasses[_l];
        delete classHash[c];
      }
    }
    toggleClasses = (_ref3 = opts.toggle) != null ? _ref3.match(cls.re) : void 0;
    if (toggleClasses != null) {
      for (_m = 0, _len4 = toggleClasses.length; _m < _len4; _m++) {
        c = toggleClasses[_m];
        if (classHash[c]) {
          delete classHash[c];
        } else {
          classHash[c] = true;
        }
      }
    }
    el.className = ((function() {
      var _results;

      _results = [];
      for (k in classHash) {
        _results.push(k);
      }
      return _results;
    })()).join(' ');
    return null;
  };

  cls.re = /\S+/g;

  this.get = function(opts) {
    var el, els, hasCls, inside, tag, _ref, _ref1, _ref2, _ref3;

    if (opts == null) {
      opts = {};
    }
    inside = (_ref = opts.inside) != null ? _ref : document;
    tag = (_ref1 = opts.tag) != null ? _ref1 : '*';
    if (opts.id != null) {
      return inside.getElementById(opts.id);
    }
    hasCls = opts.cls != null;
    if (hasCls && tag === '*' && (inside.getElementsByClassName != null)) {
      return inside.getElementsByClassName(opts.cls);
    }
    els = inside.getElementsByTagName(tag);
    if (hasCls) {
      els = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = els.length; _i < _len; _i++) {
          el = els[_i];
          if (cls(el, {
            has: opts.cls
          })) {
            _results.push(el);
          }
        }
        return _results;
      })();
    }
    if ((opts.multi == null) && (_ref2 = tag.toLowerCase(), __indexOf.call(get.uniqueTags, _ref2) >= 0)) {
      return (_ref3 = els[0]) != null ? _ref3 : null;
    } else {
      return els;
    }
  };

  get.uniqueTags = 'html body frameset head title base'.split(' ');

  this.text = function(t) {
    return document.createTextNode('' + t);
  };

  this.make = function(opts) {
    var c, k, t, v, _i, _len, _ref;

    if (opts == null) {
      opts = {};
    }
    t = document.createElement((_ref = opts.tag) != null ? _ref : 'div');
    for (k in opts) {
      if (!__hasProp.call(opts, k)) continue;
      v = opts[k];
      switch (k) {
        case 'tag':
          continue;
        case 'parent':
          v.appendChild(t);
          break;
        case 'kids':
          for (_i = 0, _len = v.length; _i < _len; _i++) {
            c = v[_i];
            if (c != null) {
              t.appendChild(c);
            }
          }
          break;
        case 'prevSib':
          v.parentNode.insertBefore(t, v.nextSibling);
          break;
        case 'text':
          t.appendChild(text(v));
          break;
        case 'cls':
          t.className = v;
          break;
        default:
          t[k] = v;
      }
    }
    return t;
  };

  this.xhr = function(opts) {
    var k, method, req, v, _ref, _ref1;

    if (opts == null) {
      opts = {};
    }
    method = (_ref = opts.method) != null ? _ref : 'GET';
    req = new XMLHttpRequest();
    req.onreadystatechange = function() {
      if (req.readyState === 4 && (req.status === 200 || !location.href.match(/^https?:/))) {
        return opts.success(req);
      }
    };
    if (opts.mime != null) {
      req.overrideMimeType(opts.mime);
    }
    if (opts.user != null) {
      req.user = opts.user;
    }
    if (opts.password != null) {
      req.password = opts.password;
    }
    if (opts.headers != null) {
      _ref1 = opts.headers;
      for (k in _ref1) {
        v = _ref1[k];
        req.setRequestHeader(k, v);
      }
    }
    req.open(method, opts.url);
    if (opts.type === 'binString') {
      req.overrideMimeType('text/plain; charset=x-user-defined');
    } else if (opts.type != null) {
      req.responseType = opts.type;
    }
    req.send(opts.data);
    return true;
  };

  this.noop = function(x) {
    return x;
  };

  this.jsonp = function(opts) {
    var callbackName, url, _ref, _ref1;

    callbackName = (_ref = opts.callback) != null ? _ref : '_JSONPCallback_' + jsonp.callbackNum++;
    url = opts.url.replace('<cb>', callbackName);
    window[callbackName] = (_ref1 = opts.success) != null ? _ref1 : noop;
    return make({
      tag: 'script',
      src: url,
      parent: get({
        tag: 'head'
      })
    });
  };

  jsonp.callbackNum = 0;

  this.ParallelWaiter = (function() {
    function ParallelWaiter(waitingFor, cb) {
      this.waitingFor = waitingFor;
      this.cb = cb;
      this.returnValues = {};
    }

    ParallelWaiter.prototype.await = function(n) {
      if (n == null) {
        n = 1;
      }
      return this.waitingFor += n;
    };

    ParallelWaiter.prototype.done = function(returnValues) {
      var k, v;

      for (k in returnValues) {
        v = returnValues[k];
        this.returnValues[k] = v;
      }
      if (--this.waitingFor === 0) {
        return this.cb(this.returnValues);
      }
    };

    return ParallelWaiter;

  })();

  this.BinReader = (function() {
    function BinReader(data) {
      this.data = data;
      this.offset = 0;
    }

    BinReader.prototype.skip = function(n) {
      this.offset += n;
      return this;
    };

    BinReader.prototype.seek = function(n) {
      this.offset = n;
      return this;
    };

    BinReader.prototype.binString = function(n, str) {
      var end, i, _i;

      if (n == null) {
        n = Infinity;
      }
      if (str == null) {
        str = '';
      }
      end = Math.min(n, this.data.length - this.offset);
      for (i = _i = 0; 0 <= end ? _i < end : _i > end; i = 0 <= end ? ++_i : --_i) {
        str += String.fromCharCode(this.uchar());
      }
      return str;
    };

    BinReader.prototype.uint16be = function() {
      return (this.uchar() << 8) + this.uchar();
    };

    BinReader.prototype.uint32be = function() {
      return (this.uint16be() << 16) + this.uint16be();
    };

    BinReader.prototype.eof = function() {
      return this.offset >= this.data.length;
    };

    return BinReader;

  })();

  this.BinStringReader = (function(_super) {
    __extends(BinStringReader, _super);

    function BinStringReader() {
      _ref = BinStringReader.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    BinStringReader.prototype.uchar = function() {
      return this.data.charCodeAt(this.offset++) & 0xff;
    };

    return BinStringReader;

  })(BinReader);

  this.Uint8ArrayReader = (function(_super) {
    __extends(Uint8ArrayReader, _super);

    function Uint8ArrayReader() {
      _ref1 = Uint8ArrayReader.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    Uint8ArrayReader.prototype.uchar = function() {
      return this.data[this.offset++];
    };

    Uint8ArrayReader.prototype.subarray = function(n) {
      return this.data.subarray(this.offset, (this.offset += n));
    };

    return Uint8ArrayReader;

  })(BinReader);

}).call(this);

/*
//@ sourceMappingURL=affogato.map
*/
