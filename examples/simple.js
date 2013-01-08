// Generated by CoffeeScript 1.4.0
(function() {
  var blob, contentStream, fontName, fontObj, fontSize, fr, pageObj, pagesObj, pdf, rootObj;

  pdf = new HackDoc;

  fontName = 'Times-Roman';

  fontSize = 12;

  fontObj = new PDFFont(pdf, {
    name: fontName
  });

  contentStream = new PDFStream(pdf, {
    stream: "BT\n70 50 TD\n/F1 " + fontSize + " Tf\n" + (PDFText.flowPara(PDFText.preprocessPara('Hello world!', fontName), fontSize).commands) + "\nET"
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

  blob = pdf.toBlob();

  if (window.URL != null) {
    make({
      tag: 'a',
      href: URL.createObjectURL(blob),
      text: 'PDF (object URL)',
      parent: get({
        tag: 'body'
      }),
      onclick: function() {
        if (navigator.msSaveOrOpenBlob != null) {
          return navigator.msSaveOrOpenBlob(blob, "simple.pdf");
        }
      }
    });
  } else {
    fr = new FileReader();
    fr.readAsDataURL(blob);
    fr.onload = function() {
      return make({
        tag: 'a',
        href: fr.result,
        text: 'PDF (data URI)',
        parent: get({
          tag: 'body'
        })
      });
    };
  }

}).call(this);
