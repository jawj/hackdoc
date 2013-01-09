// Generated by CoffeeScript 1.4.0
(function() {
  var contentStream, fontName, fontObj, fontSize, pageObj, pagesObj, pdf, rootObj;

  pdf = new HackDoc;

  fontName = 'Times-Roman';

  fontSize = 12;

  fontObj = new PDFFont(pdf, {
    name: fontName
  });

  contentStream = new PDFStream(pdf, {
    stream: "BT\n70 50 TD\n/F1 " + fontSize + " Tf\n" + (PDFText.flowPara(PDFText.preprocessPara('Hello world!', fontName), fontSize).commands) + "\nET",
    lzw: true
  });

  pagesObj = new PDFObj(pdf);

  pageObj = new PDFObj(pdf, {
    data: "<<\n/Type /Page\n/Parent " + pagesObj.ref + "\n/Resources <<\n  /Font << /F1 " + fontObj.ref + " >>\n>>\n/Contents " + contentStream.ref + "\n>>"
  });

  PDFObj.call(pagesObj, pdf, {
    data: "<<\n/Type /Pages\n/MediaBox [ 0 0 200 200 ]\n/Count 1\n/Kids [ " + pageObj.ref + " ]\n>>"
  });

  rootObj = new PDFObj(pdf, {
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
