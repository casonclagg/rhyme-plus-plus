'use strict';

var fs = require('fs');
var Lazy = require('lazy');
var path = require('path');
var _ = require('lodash');

var dictFile = path.join(__dirname, 'data/cmudict.dict');

var RE_CONSONANT = /^[^AEIOU]/i;
var RE_VOWEL = /^[AEIOU]/i;

// the last group of either "consonant, vowel(s)" or "vowel, "consonant(s)"
var lastGroup = exports.lastGroup = function (ws) {
  var re = RE_VOWEL;

  if (RE_CONSONANT.test(ws[ws.length - 1])) {
    re = RE_CONSONANT;
  }

  for (var i = ws.length - 1; i >= 0; i--) {
    if (!ws[i].match(re)) {
      break;
    }
  }

  return ws.slice(i).join(' ');
};

// active rhyming region: slice off the leading consonants
var active = exports.active = function (ws) {
  var firstNonConsonant = _.findIndex(ws, function (w) {
    return !w.match(RE_CONSONANT);
  });

  return ws.slice(firstNonConsonant).join(' ');
};

var Rhyme = exports.Rhyme = function rhyme() {
  this.dict = new Map();
};

Rhyme.prototype.load = function (cb, dictFileDirect) {
  var stream = fs.createReadStream(dictFileDirect || dictFile);

  stream.on('end', function () {
    cb();
  });

  var self = this;

  // Lazy is probably no longer needed
  new Lazy(stream).lines.map(String).forEach(function (line) {
    if (line.match(/^[A-Z]/i)) {
      var words = line.split(/\s+/);
      var word = words[0].replace(/\(\d+\)$/, '').toUpperCase();

      if (!self.dict.has(word)) {
        self.dict.set(word, []);
      }

      self.dict.get(word).push(words.slice(1));
    }
  });
};

Rhyme.prototype.pronounce = function (word) {
  return this.dict.get(word.toUpperCase());
};

Rhyme.prototype.syllables = function (word) {
  var pronounciations = this.pronounce(word);

  return pronounciations && pronounciations[0].filter(function (phoneme) {
    return phoneme.match(RE_VOWEL);
  }).length;
};

Rhyme.prototype.rhyme = function (word) {
  word = word.toUpperCase();

  if (!this.dict.has(word)) {
    return [];
  }

  var mapped = this.dict.get(word).map(active);
  var rhymes = [];

  for (let [w, pronounciations] of this.dict.entries()) {
    if (w === word) {
      continue;
    }

    var some = pronounciations.some(function (p) {
      return mapped.indexOf(active(p)) !== -1;
    });

    if (some) {
      rhymes.push(w);
    }
  }

  return rhymes;
};

// TODO: look up what these numbers mean, e.g. EH0 vs. EH1 in instead/forehead
function removeNumbers(pronounciation) {
  return pronounciation.map(function (phoneme) {
    return phoneme.replace(/[0-9]+$/g, '');
  });
}

Rhyme.prototype.applyRhymeFn = function (fn, word1, word2) {
  var pronounciations1 = this.dict.get(word1.toUpperCase());
  var pronounciations2 = this.dict.get(word2.toUpperCase());

  // reject if rhymes not possible
  if (!pronounciations1 || !pronounciations2 ||
      pronounciations1 === pronounciations2) {
    return false;
  }

  pronounciations1 = pronounciations1.map(removeNumbers);
  pronounciations2 = pronounciations2.map(removeNumbers);

  var mapped = pronounciations1.map(fn);

  var foundRhyme = pronounciations2.some(function (pronounciation) {
    return mapped.indexOf(fn(pronounciation)) !== -1;
  });

  return foundRhyme;
};

Rhyme.prototype.doesLastGroupRhyme = function (word1, word2) {
  return this.applyRhymeFn(lastGroup, word1, word2);
};

Rhyme.prototype.doesRhyme = function (word1, word2) {
  return this.applyRhymeFn(active, word1, word2);
};

Rhyme.prototype.findRhymes = function (words) {
  // see if words rhyme
  var rhymes = [];

  for (var w = 0; w < words.length - 1; w++) {
    for (var w2 = w + 1; w2 < words.length; w2++) {
      if (this.doesRhyme(words[w], words[w2])) {
        rhymes.push([words[w], words[w2]]);
      }
    }
  }

  return rhymes;
};

Rhyme.prototype.alliteration = function (word) {
  word = word.toUpperCase();

  if (!this.dict.has(word)) {
    return [];
  }

  function firstSlice(ws) {
    // active rhyming region: slice off the trailing consonants
    for (var i = ws.length - 1; i > 0; i--) {
      if (!ws[i].match(RE_CONSONANT)) {
        break;
      }
    }

    ws.splice(i + 1);

    return ws.join(' ');
  }

  var mapped = this.dict.get(word).map(firstSlice);
  var rhymes = [];

  for (let [w, pronounciations] of this.dict.entries()) {
    if (w === word) {
      continue;
    }

    var some = pronounciations.some(function (p) {
      return mapped.indexOf(firstSlice(p)) !== -1;
    });

    if (some) {
      rhymes.push(w);
    }
  }

  return rhymes;
};
