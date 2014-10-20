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

Implementation notes
--------------------

To keep the code at least somewhat sane, it relies on
[UglifyJS](https://github.com/mishoo/UglifyJS) for variable renaming, brace
removal and more such niceties. However, there was still plenty to be done by
hand.
