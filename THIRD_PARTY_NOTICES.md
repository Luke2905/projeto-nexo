# Portuguese game vocabulary

The generated Portuguese vocabulary is derived from VERO (Verificador
Ortográfico Livre), by Raimundo Santos Moura and contributors, distributed
as dictionary-pt 4.0.0. The source dictionary and affix files are licensed
under LGPL-3.0 OR MPL-2.0, separately from this application's MIT license.
Original copyright and license notices are preserved in
[licenses/dictionary-pt.txt](licenses/dictionary-pt.txt).

Sources and license:
- https://github.com/wooorm/dictionaries/tree/main/dictionaries/pt
- https://github.com/LibreOffice/dictionaries/tree/master/pt_BR
- https://www.mozilla.org/en-US/MPL/2.0/

Changes performed by scripts/build-lexicon.mjs: expand inflections using
nspell 2.1.5 (MIT), select single-word forms, fold case and accents, remove
duplicates, sort and gzip. Pinned source packages and the generator are
available through package-lock.json and scripts/build-lexicon.mjs.

# Portuguese semantic rankings

The generated semantic-neighbour rankings are derived from NILC Portuguese
Word Embeddings, GloVe 50 dimensions, trained by the NILC NLP group on a
1.39-billion-token Portuguese corpus. The source embeddings are distributed
under CC BY 4.0 and are not bundled with the application. This application
ships only the transformed nearest-neighbour indices produced by
scripts/build-semantic-ranks.mjs.

Sources and license:
- https://huggingface.co/nilc-nlp/glove-50d
- https://github.com/nathanshartmann/portuguese_word_embeddings
- https://creativecommons.org/licenses/by/4.0/
