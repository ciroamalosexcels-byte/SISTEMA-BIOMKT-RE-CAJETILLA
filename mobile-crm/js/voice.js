(function () {
  var KEYWORDS = {
    nombre:        ['nombre'],
    empresa:       ['empresa'],
    telefono:      ['telefono', 'teléfono', 'tel', 'número', 'numero', 'celular'],
    direccion:     ['dirección', 'direccion'],
    observaciones: ['observaciones', 'observacion', 'nota', 'notas']
  };

  var allKeys = [];
  Object.keys(KEYWORDS).forEach(function (f) {
    KEYWORDS[f].forEach(function (k) { allKeys.push(k); });
  });

  var KEY_PATTERN = new RegExp('\\b(' + allKeys.join('|') + ')\\b', 'gi');

  function fieldForKeyword(kw) {
    var lower = kw.toLowerCase();
    for (var f in KEYWORDS) {
      if (KEYWORDS[f].indexOf(lower) !== -1) return f;
    }
    return null;
  }

  window.parseTranscript = function (text) {
    var result = { nombre: '', empresa: '', telefono: '', direccion: '', observaciones: '' };

    // Si no hay ninguna keyword, todo va a observaciones (el usuario edita la modal)
    KEY_PATTERN.lastIndex = 0;
    var hasKeywords = KEY_PATTERN.test(text);
    KEY_PATTERN.lastIndex = 0;

    var parts = text.split(KEY_PATTERN);

    // Sin keywords: fallback seguro a observaciones
    // Con keywords: texto ANTES del primer keyword va posicional (nombre → empresa),
    //               texto DESPUÉS de cada keyword va al campo correspondiente
    var currentField = hasKeywords ? null : 'observaciones';
    var positionalStep = 0;

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;

      var field = fieldForKeyword(part);
      if (field) {
        currentField = field;
      } else if (currentField !== null) {
        result[currentField] = (result[currentField] + ' ' + part).trim();
      } else {
        // Texto antes del primer keyword: nombre primero, luego empresa
        if (positionalStep === 0) { result.nombre  = (result.nombre  + ' ' + part).trim(); positionalStep = 1; }
        else                      { result.empresa = (result.empresa + ' ' + part).trim(); }
      }
    }

    if (result.telefono) result.telefono = result.telefono.replace(/[\s\-]/g, '');

    if (!result.telefono) {
      var m = text.match(/\b\d[\d\s\-]{6,}\b/);
      if (m) result.telefono = m[0].replace(/[\s\-]/g, '');
    }

    return result;
  };

  window.startVoice = function (onResult, onTranscript, onError) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Reconocimiento de voz no disponible. Usá Chrome en Android.');
      return null;
    }

    var recognition = new SR();
    recognition.lang = 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    var finalTranscript = '';
    var cancelled = false;

    recognition.onresult = function (e) {
      var interim = '';
      finalTranscript = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      if (onTranscript) onTranscript(finalTranscript || interim);
    };

    recognition.onend = function () {
      if (!cancelled && finalTranscript && onResult) {
        onResult(window.parseTranscript(finalTranscript));
      }
    };

    recognition.onerror = function (e) {
      console.error('[BIOMKT voice]', e.error);
      if (onError) onError(e.error);
    };

    recognition.start();
    recognition._cancel = function () { cancelled = true; };
    return recognition;
  };
})();
