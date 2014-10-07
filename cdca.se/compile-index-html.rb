#!/usr/bin/env ruby

def pipe cmd, stdin
  IO.popen(cmd, 'w+') { |io| io.write(stdin); io.close_write; io.read }
end

# HTML

html = File.read('source.html')
html = pipe 'html-minifier --remove-comments --collapse-whitespace --remove-redundant-attributes', html

# CSS

allStyle = ''
html.gsub!(%r{<link\s+[^>]*href="[^"]+\.css"[^>]*>\s*}) do |tag|
  css = tag.match(/(?<=href=").+(?=")/)[0]
  puts
  puts css
  style = File.read css
  if ! css.match(%r{[.]min[.]})  # don't harass already-minified styles
    style = pipe('cleancss', style)
    style.gsub!(/(?<=url\()[^)]+(?=\))/) do |url|
      if url.match %r{^data:|//}  # don't touch remote or already-base64 files
        url
      else
        content = open(url, 'rb') { |f| f.read }
        ext = url.match(/[^.]+$/)[0]
        "data:image/#{ext};base64,#{[content].pack('m').gsub(/\s+/, '')}"
      end
    end
  end
  allStyle += style
  ''
end

htmlParts = html.split '</head>'  # cannot do this with sub! because of interpreting of replacement string
html = htmlParts[0] + "<style>#{allStyle}</style>\n</head>" + htmlParts[1]

# JS

allSrc = ''
html.gsub!(%r{<script src="[^"]+"></script>\s*}) do |tag|
  js = tag.match(/(?<=").+(?=")/)[0]
  if js.match(%r{//})  # don't try to minify remote scripts
    tag
  else
    puts
    puts js
    src = File.read js
    if ! js.match(%r{[.]min[.]})  # don't harass already-minified scripts
      if src.match /angular/
        puts ' - annotating'
  	    src = pipe 'ng-annotate -a -', src
      end
      puts ' - minifying'
      src = pipe 'java -jar /usr/local/closure-compiler/compiler.jar --compilation_level SIMPLE --language_in ECMASCRIPT5', src
    end
    src.gsub! %r{^//#\s*sourceMappingURL\s*=.*$}, ''
    allSrc += src + "\n"
    ''
  end
end

htmlParts = html.split '</body>'  # cannot do this with sub! because of interpreting of replacement string!
html = htmlParts[0] + "<script>#{allSrc}</script>\n</body>" + htmlParts[1]


open('index.html', 'w') { |f| f.write(html) }
