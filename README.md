Use at your own risk.

# rhyme-plus-plus-plus

    let rhyme = new Rhyme()
    rhyme.load(() => {

        let a = rhyme.rhyme("trouble")
        console.log(a)
    })

# Things it can do...

r.rhyme(word)
-------------

Returns all rhymes for `word`.

r.pronounce(word)
-----------------

Shows how to pronounce `word` using
[CMU's pronouncing dictionary phonemes
](http://www.speech.cs.cmu.edu/cgi-bin/cmudict).

r.syllables(word)
-----------------

Counts the syllables in `word` using the phonemes in `r.pronounce` and some
heuristics.

r.alliteration(word)
-----------------

Returns alliterative words, which begin with the same syllable as `word`.

r.doRhyme(word1, word2)
-----------------

Returns whether these words could rhyme (for example: read and feed, read and fed).

r.findRhymes(words)
-----------------

Searches the words array for pairs of rhyming words. Returns an array of pairs.
