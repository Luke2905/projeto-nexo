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
