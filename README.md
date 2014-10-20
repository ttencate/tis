Tis
===

[**Play Tis here**, with the source code in the background.](http://ttencate.github.io/tis)

Tis is a self-contained Tetris® clone in 4 kB of pure JavaScript (ECMAScript
5). This includes code to generate the necessary HTML markup and inline CSS.

Tis can be embedded into any web page by simply adding a `<script>` tag. It can
then be invoked as an easter egg using the Konami code.

Features
--------

Tis has nearly all of the features you might expect from a modern Tetris:

- All seven tetromino shapes.
- Block movement and rotation.
- Key repeats.
- Soft and hard drop.
- Ghost piece.
- Lock delay.
- Bag-of-seven random generator.
- Animated line clearing.
- Look-ahead to the upcoming block.
- Wall kicks.
- Infinite levels, with corresponding speed increase.
- Score, depending on level and number of lines cleared at once.
- Animated game-over screen.
- Sound effects.
- Music with two treble voices and a bass voice.

Missing features
----------------

- Points for T-spins and split line clears.
- A hold area.
- Multiple look-ahead.

Deploying
---------

Simply grab `tis.min.js` from this repository, put it on your webserver
somewhere, and put the following just before the `</body>` tag in your HTML:

    <script src="/path/to/tis.min.js"></script>

Visitors of your web page will now get a nice surprise when they type the
[Konami code](https://en.wikipedia.org/wiki/Konami_Code).

Implementation notes
--------------------

To keep the code at least somewhat sane, it relies on
[UglifyJS](https://github.com/mishoo/UglifyJS) for variable renaming, brace
removal and more such niceties. However, there was still plenty to be done by
hand. This section describes some of the tricks used.

### HTML/CSS

- Extracting common parts of HTML and CSS into strings, for example the string
  `'<div style="margin:'`.
- Using `pc` instead of `px` in the CSS; one pica is 16 pixels.

### Game data

- The music is encoded as a string of characters, where each character
  represents both the pitch and the duration of a single note.
- The tetromino shapes in their respective orientations are encoded as
  bitmasks, but because we can't efficiently encode bytes above 127 in UTF-8,
  they are encoded in base-64 instead.
- Wall kick tables are encoded as a string, where each character encodes a
  single x and y offset.
- Tetromino colours are encoded in a single string of `#fff`-style hex values
  (without the `#` of course), separated by the character `9`. We use a digit
  because it doesn't require quotes when passing to `Array.split()`.
- Sound effects are encoded as a single number, packing a few bits for decay
  speed, a few for initial frequency, and a few more for another frequency that
  kicks in after 1000 (`1e3`) samples.

### JavaScript

- Names of global objects (`window`, `document`) and of frequently used
  fields/methods are stored in variables to make access shorter.
- Instead of `document.getElementById(...)`, use the fact that element IDs are
  also registered on the `window` object: `window[...]`.
- Because `var` declarations are costly, do them only once at the top-level
  scope, and reuse variables as much as possible. This does make it difficult
  to safely invoke functions.
- Inline as many functions as possible, because `function` is an awfully long
  word that cannot be shortened.
- Let `undefined` be the desired initial value of variables as much as
  possible, so we don't need to initialize them.
- Be aware of the `for(i in a)` syntax as an alternative to `for(i=0;i<n;i++)`.
  However, this isn't always shorter, because the traditional `for` loop lets
  you put more stuff inside the initialization, condition and increment part.
- Put assignments inside expressions where possible: instead of `x++;y=2*x`
  write `y=2*x++`.
- Instead of `x>=0&&x<4`, write `!(x&~3)`. This works even if `x` is negative.
- Use `~~(a+b)` instead of `Math.floor(a+b)` to cast to integer. `0|(a+b)` also
  works.
- For somewhat arbitrary constants, `9` is better than `10`, `99` better than
  `100`.
- `switch`/`case` is extremely verbose, especially if you need `break` (i.e.
  almost always). Just use `if`/`else if` instead.
- There is even one `goto`-like label, to `break` out of two `for` loops at the
  same time. This is the only thing labels in JavaScript can be used for.
