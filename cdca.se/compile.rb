#!/usr/bin/env ruby

require 'nokogiri'

def pipe cmd, stdin
  IO.popen(cmd, 'w+') { |io| io.write(stdin); io.close_write; io.read }
end
def dataURIForImage url
  fileext = url.match(/[^.]+$/)[0]
  content = open(url, 'rb') { |f| f.read }
  "data:image/#{fileext};base64,#{[content].pack 'm0'}"
end

doc = Nokogiri::HTML File.open 'source.html'


# CSS

allcss = []
doc.css('link[rel="stylesheet"]').each do |tag|
  href = tag.attributes['href'].value
  puts "\n#{href}"
  css = File.read href
  unless href.match '.min.'
    puts ' - minify'
    css = pipe 'cleancss', css
    css.gsub! %r{(?<=url\()[^)]+(?=\))} do |url|
      if url.match %r{^data:|//} then url  # pass remote or already-base64 files through untouched
      else
        puts " - inline: #{url}"
        dataURIForImage url
      end
    end
  end
  tag.remove
  allcss << css
end
doc.css('head').first.add_child %{<style>#{allcss.join "\n"}</style>}


# JS

alljs = []
doc.css('script[src]').each do |tag|
  src = tag.attributes['src'].value
  next if src.match %r{//}  # don't touch remote scripts
  puts "\n#{src}"
  js = File.read src
  unless src.match '.min.'  # don't harass already-minified scripts
    if js.match 'angular'
      puts ' - annotate'
      js = pipe 'ng-annotate -a -', js
    end
    puts ' - minify'
    js = pipe 'java -jar /usr/local/closure-compiler/compiler.jar --compilation_level SIMPLE --language_in ECMASCRIPT5', js
  end
  js.gsub! %r{^\s*//#\s*sourceMappingURL\s*=.*$}, ''
  tag.remove
  alljs << js
end
doc.css('body').first.add_child %{<script>#{alljs.join "\n"}</script>}


# Images

doc.css('img[src]').each do |tag|
  src = tag.attributes['src'].value
  puts "\n#{src}"
  puts ' - inline'
  tag.attributes['src'].value = dataURIForImage src
end


# HTML

html = pipe 'html-minifier --remove-comments --collapse-whitespace --remove-redundant-attributes', doc.to_html
open('index.html', 'w') { |f| f.write html }
