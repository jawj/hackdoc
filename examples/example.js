// Generated by CoffeeScript 1.6.2
(function() {
  var loadAssets, pw;

  loadAssets = function() {
    xhr({
      url: 'pdf/kernligimg.pdf',
      type: 'arraybuffer',
      success: function(req) {
        return pw.done({
          pdf: req.response
        });
      }
    });
    PDFImage.xhr({
      url: 'images/pound-coin.jpg',
      success: function(img) {
        return pw.done({
          jpeg: img
        });
      }
    });
    return PDFImage.xhr({
      url: 'images/basn6a08.png',
      success: function(img) {
        return pw.done({
          png: extend(img, {
            lzw: true
          })
        });
      }
    });
  };

  pw = new ParallelWaiter(3, function(data) {
    var contentStream, helvObj, jpegObj, pdf, pngObj, text1, text1full, text2, text2right, timesObj;

    pdf = new HackDoc(data.pdf);
    jpegObj = PDFImage.create(pdf, data.jpeg);
    pngObj = PDFImage.create(pdf, data.png);
    text1 = PDFText.preprocessPara('Affluent finance AWAY 6×6 £12 €13 – 15 x hello—again LOVE HATE YOU ME 123‰ Höhner 2πr. Lorem ipsum do-lor sit amet, consectetur adip-iscing elit. Ut eu ffffff nec nunf pellentesquelaoreeteuatnuncphasellusnonmagnai-arcu consequat tincidunt sit amet conv-allis eros. In pellen–tesque pellentesque felis, ac varius nulla vehicula id. Sed rut-rum, quam nec semper dapibus, mi lorem adipiscing lectus, vel bibendum lorem erat quis neque. pellentesquelaoreeteuatnuncphasellusnonmagnaidconesqyatys x', 'Times-Roman', false);
    text2 = PDFText.preprocessPara('The wind was a torrent of darkness among the gusty fleas, The moon was a ghostly galleon tossed upon cloudy seas, The road was a ribbon of moonlight over the purple moor, And the highwayman came riding— Riding—riding— The highwayman came fiding, up to the old inn-door.', 'Times-Roman');
    text1full = PDFText.flowPara(text1, 12, {
      maxWidth: 250,
      align: 'full',
      hyphenate: true
    });
    text2right = PDFText.flowPara(text2, 14, {
      maxWidth: 420,
      align: 'right'
    });
    contentStream = PDFStream.create(pdf, {
      stream: "q  0.7 0.7 0.7 RG  72 " + (600 + 12) + " 250 " + (-text1full.height) + " re S  Q\nBT\n  72 600 Td\n  /TR 12 Tf\n  " + text1full.commands + "\nET\nq  1 0.5 0 RG  " + (72 + 420 - text2right.width) + " " + (350 + 14) + " " + text2right.width + " " + (-text2right.height) + " re S  Q\nBT\n  72 350 Td\n  /TR 14 Tf\n  " + text2right.commands + "\n  0 -8 Td\n  " + (PDFText.flowPara(text2, 14, {
        maxWidth: 420,
        align: 'left'
      }).commands) + "\n  0 -8 Td\n  " + (PDFText.flowPara(text2, 14, {
        maxWidth: 420,
        align: 'full'
      }).commands) + "\n  0 -8 Td\n  " + (PDFText.flowPara(text2, 14, {
        maxWidth: 420,
        align: 'centre'
      }).commands) + "\nET\nq\n  72 0 0 72 400 400 cm  % scaleX 0 0 scaleY translateX translateY\n  /MyIm Do\nQ\nq\n  0.5 0.5 0.5 rg\n  380 620 112 32 re  f\n  72 0 0 72 400 600 cm  % scaleX 0 0 scaleY translateX translateY\n  /MyIm2 Do\nQ",
      lzw: true
    });
    PDFObj.create(pdf, {
      data: "<< \n/Type /Page \n/Parent 3 0 R\n/Resources 6 0 R\n/Contents [4 0 R " + contentStream.ref + "]\n/MediaBox [0 0 595 842]\n>>",
      num: 2
    });
    timesObj = PDFFont.create(pdf, {
      name: 'Times-Roman'
    });
    helvObj = PDFFont.create(pdf, {
      name: 'Helvetica'
    });
    PDFObj.create(pdf, {
      data: "<< \n/ProcSet [ /PDF /Text /ImageB /ImageC /ImageI ] /ColorSpace << /Cs1 7 0 R >> \n/Font <<\n  /TT1.0 8 0 R\n  /TR " + timesObj.ref + "\n  /H " + helvObj.ref + "\n  >> \n/XObject <<\n  /Im1 9 0 R\n  /MyIm " + jpegObj.ref + "\n  /MyIm2 " + pngObj.ref + "\n  >>\n>>",
      num: 6
    });
    return pdf.linkAsync('example.pdf', function(link) {
      link.appendChild(text('PDF'));
      return get({
        tag: 'body'
      }).appendChild(link);
    });
  });

  loadAssets();

}).call(this);

/*
//@ sourceMappingURL=example.map
*/
