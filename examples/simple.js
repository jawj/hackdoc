// Generated by CoffeeScript 1.6.2
(function() {
  var contentStream, fontName, fontObj, fontSize, pageObj, pagesObj, pdf, rootObj;

  pdf = new HackDoc;

  fontName = 'Times-Roman';

  fontSize = 12;

  fontObj = PDFFont.create(pdf, {
    name: fontName
  });

  contentStream = PDFStream.create(pdf, {
    stream: "BT\n70 50 TD\n/F1 " + fontSize + " Tf\n" + (PDFText.flowPara(PDFText.preprocessPara('Hello world!', fontName), fontSize).commands) + "\nET",
    lzw: true
  });

  pagesObj = PDFObj.create(pdf);

  pageObj = PDFObj.create(pdf, {
    data: "<<\n/Type /Page\n/Parent " + pagesObj.ref + "\n/Resources <<\n  /Font << /F1 " + fontObj.ref + " >>\n>>\n/Contents " + contentStream.ref + "\n>>"
  });

  pagesObj.update({
    data: "<<\n/Type /Pages\n/MediaBox [ 0 0 200 200 ]\n/Count 1\n/Kids [ " + pageObj.ref + " ]\n>>"
  });

  rootObj = PDFObj.create(pdf, {
    data: "<<\n/Type /Catalog\n/Pages " + pagesObj.ref + "\n>>"
  });

  pdf.root = rootObj.ref;

  pdf.linkAsync('simple.pdf', function(link) {
    link.appendChild(text('PDF'));
    return get({
      tag: 'body'
    }).appendChild(link);
  });

}).call(this);

/*
//@ sourceMappingURL=simple.map
*/
