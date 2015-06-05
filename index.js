'use strict';

var fs = require('fs');
var Lazy = require('lazy');
var path = require('path');
var _ = require('lodash');

var dictFile = path.join(__dirname, '/data/cmudict.0.7a');

var activeSloppy = exports.activeSloppy = function (ws, fuzz) {
  // active rhyming region: slice off the leading consonants
  var lastConsonant = _.findLastIndex(ws, function (w) {
    return w.match(/^[^AEIOU]/i);
  });

  lastConsonant -= Math.min(fuzz, ws.length - lastConsonant);

  return ws.slice(lastConsonant).join(' ');
};

var active = exports.active = function (ws) {
  // active rhyming region: slice off the leading consonants
  var firstNonConsonant = _.findIndex(ws, function (w) {
    return !w.match(/^[^AEIOU]/i);
  });

  return ws.slice(firstNonConsonant).join(' ');
};

exports.loadData = function (cb, dictFileDirect) {
  var self = {};
  var dict = {};

  self.pronounce = function (word) {
    return dict[word.toUpperCase()];
  };

  self.syllables = function (word) {
    var prose = self.pronounce(word);
    return prose && prose[0].filter(function (ph) {
      return ph.match(/^[AEIOU]/);
    }).length;
  };

  self.rhyme = function (word) {
    word = word.toUpperCase();

    if (!dict[word]) {
      return [];
    }

    var xs = dict[word].reduce(function (acc, w) {
      acc[active(w)] = true;
      return acc;
    }, {});

    var rhymes = [];

    Object.keys(dict).forEach(function (w) {
      if (w === word) {
        return;
      }

      var some = dict[w].some(function (p) {
        return xs[active(p)];
      });

      if (some) {
        rhymes.push(w);
      }
    }, []);

    return rhymes;
  };

  self.doRhymeSloppy = function (word1, word2, optionalFuzz) {
    if (!optionalFuzz) {
      optionalFuzz = 0;
    }

    word1 = word1.toUpperCase();
    word2 = word2.toUpperCase();

    var rhyme1 = dict[word1];
    var rhyme2 = dict[word2];

    // reject if rhymes not possible
    if (!rhyme1 || !rhyme2 || rhyme1 === rhyme2) {
      return false;
    }

    var xs = rhyme1.reduce(function (acc, w) {
      acc[activeSloppy(w, optionalFuzz)] = true;
      return acc;
    }, {});

    var foundRhyme = rhyme2.some(function (p) {
      return xs[activeSloppy(p, optionalFuzz)];
    });

    return foundRhyme;
  };

  self.doRhyme = function(word1, word2) {
    // find words in rhyming dictionary
    word1 = word1.toUpperCase();
    word2 = word2.toUpperCase();

    var rhyme1 = dict[word1];
    var rhyme2 = dict[word2];

    // reject if rhymes not possible
    if (!rhyme1 || !rhyme2 || rhyme1 === rhyme2) {
      return false;
    }

    var xs = rhyme1.reduce(function (acc, w) {
      acc[active(w)] = true;
      return acc;
    }, {});

    var foundRhyme = rhyme2.some(function (p) {
      return xs[active(p)];
    });

    return foundRhyme;
  };

  self.findRhymes = function(words) {
    // see if words rhyme
    var rhymes = [];

    for (var w = 0; w < words.length - 1; w++) {
      for (var w2 = w + 1; w2 < words.length; w2++) {
        if (this.doRhyme(words[w], words[w2])) {
          rhymes.push([words[w], words[w2]]);
        }
      }
    }

    return rhymes;
  };

  self.alliteration = function (word) {
    word = word.toUpperCase();

    if (!dict[word]) {
      return [];
    }

    function firstSlice(ws) {
      // active rhyming region: slice off the trailing consonants
      for (var i = ws.length - 1; i > 0; i--) {
        if (!ws[i].match(/^[^AEIOU]/i)) {
          break;
        }
      }

      ws.splice(i + 1);

      return ws.join(' ');
    }

    var xs = dict[word].reduce(function (acc, w) {
      acc[firstSlice(w)] = true;
      return acc;
    }, {});

    var rhymes = [];

    Object.keys(dict).forEach(function (w) {
      if (w === word) {
        return;
      }

      var some = dict[w].some(function (p) {
        return xs[firstSlice(p)];
      });

      if (some) {
        rhymes.push(w);
      }
    }, []);

    return rhymes;
  };

  var s = fs.createReadStream(dictFileDirect || dictFile);

  s.on('end', function () {
    cb(self);
  });

  new Lazy(s).lines.map(String).forEach(function (line) {
    if (line.match(/^[A-Z]/i)) {
      var words = line.split(/\s+/);
      var w = words[0].replace(/\(\d+\)$/, '');

      if (!dict[w]) {
        dict[w] = [];
      }

      dict[w].push(words.slice(1));
    }
  });
};
