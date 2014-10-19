// We need an anonymous scope function because the keydown listener has to have
// access to nextCodeChar, and we don't want to store it globally. We could also
// store it on the handler function itself, but "arguments.callee" is awfully
// long...
(function() {
  var
      doc = document,
      addEventListener = 'addEventListener',
      charCodeAt = 'charCodeAt',
      keyCode = 'keyCode',
      keydown = 'keydown',

      nextCodeChar = 0;

  doc[addEventListener](keydown, function(e) {
    nextCodeChar = e[keyCode] == "&&((%'%'BA"[charCodeAt](nextCodeChar) ? nextCodeChar + 1 : 0;
    if (nextCodeChar > 9) {
      (function() {
        var
            win = window,

            createElement = 'createElement',
            removeEventListener = 'removeEventListener',
            keyup = 'keyup',

            math = Math,

            music = [
              // http://www.theoreticallycorrect.com/Helmholtz-Pitch-Numbering/
              //
              // Lowest note in treble: 60
              // Highest note in treble: 83
              //
              // Subtract 32, then:
              // - % 24 gives MIDI note number minus 60
              // - / 24 gives duration: eighth, dotted quarter, quarter, half
              // 
              // Other way:
              // note number - 28 + 24 * [0:eighth, 1:dotted quarter, 2:quarter, 3:half]
              //
              // http://i.ytimg.com/vi/bpBePVCUM7E/maxresdefault.jpg
              // https://www.youtube.com/watch?v=IBkH5_gLF8Q
              '`+,^,+Y),`.,C,^`\\Yq^.1e31H,01.,C,^`\\Yq',
              'T$$T,+)$),Y))<$TTYTl.).1^..D,\\.,<$TTTTT`',
              // All notes are eighths.
              // Subtract 64 to get MIDI note number - 33.
              'GNKNGNKNLSOSLSOSKSNSKSNSLSNSL@BCESOSESOSCOCOCOCOBNBN?J?J@CGL@@@@'
            ],
            thirdVerse = [
              // Treble voices
              'xtvstqpsxtvs\\`}|x',
              'tqspqqpptqspY`xx\u007f',
              // Bass voice
              'LSOSLSOSKSNSKSNSLSOSLSOSKSNSKSNS'
            ],

            // First 2 invisible lines, then 20 visible lines, then 2 for the Next display.
            grid = [],
            shadowGrid = [],
            w = 10,
            h = 22,
            s = w*h+20,

            // x I J L O S T Z
            colors = '080808 0dd 36f e80 dd0 0e0 c0c f22'.split(' '),

            // http://tetris.wikia.com/wiki/SRS
            //
            // Base-64 encoded string of bytes, consisting of 8 bytes for each tetromino.
            // Each 8-byte block is 4 words of 2 bytes, each word representing a rotation:
            //
            // 7 6 5 4 <- first byte
            // 3 2 1 0 <- first byte
            // 7 6 5 4 <- second byte
            // 3 2 1 0 <- second byte
            shapes = atob('8ABERAAPIiJxACYCcAQiA3QAIgZwASMCZgBmAGYAZgA2AGIEYAMxAnIAYgJwAjICYwBkAjAGMgE'),

            // Wall kick tables: http://tetrisconcept.net/wiki/SRS#Wall_Kicks
            //
            // Each table is represented as 4 * 5 characters.
            // The first 4 are for orientation 0, etc., and the 5 characters are the
            // possible offsets for a clockwise rotation from that orientation. (For
            // counterclockwise, just negate the values.)
            //
            // Subtract 32, then:
            // - bits 0-2 give x offset plus 2 (range: 0..4)
            // - bits 3-5 give INVERTED y offset plus 2 (range: 0..4)
            //   (inverted because the reference page above does that)
            //
            // y\x -2 -1  0 +1 +2
            // -2  sp  !  "  #  $
            // -1   (  )  *  +  ,
            //  0   0  1  2  3  4
            // +1   8  9  :  ;  <
            // +2   @  A  B  C  D
            wallKickTableI = '203(C214A,241<!230#8', // I
            wallKickTableRest = '219"!23+BC23;"#21)BA', // other blocks, including no-op O

            bag = [],
            currentTetromino,
            currentX,
            currentY,
            currentRotation,

            state = 0, // 0=PLAYING, 1=CLEARING, 2=LOST
            stateTime,
            linesClearing,

            score = 0,
            lines = 0,
            level = 1,

            delta,
            gravityTimer, // between 0 and 1
            lockTimer = 0,
            keysPressed = [],
            lastFrame,

            i, j, x, y, tmp, tmp2, tmp3, tmp4,

            divStyleMargin = '<div style="margin:',
            divEnd = '</div>',
            boxShadow = ';box-shadow:',

            html =
              divStyleMargin + '-270px -180px;position:fixed;width:360px;left:50%;top:50%;font:13px sans-serif;background:rgba(0,0,0,.8)' + boxShadow + '0 0 30px #000;border-radius:30px">' +
                divStyleMargin + '20px 40px;color:#888">' +
                  '<b><a href="http://github.com/ttencate/tis" style="color:inherit">Tis</a></b>: 4 kB of JavaScript<br><br>' +
                  'Left/right: move | Shift/Ctrl: rotate<br>' +
                  'Down/up: soft/hard drop | M: music | Esc: quit' +
                divEnd +
                divStyleMargin + '0 20px;float:right;width:80px;color:#eee;font-size:15px">' +
                  '<div id="tis-status">' + divEnd +
                  'Next' + divStyleMargin + '8px 0;height:40px' + boxShadow + '0 0 9px #000">'
            ;

        tmp2 = divStyleMargin + '0;width:20px;height:20px;float:left' + boxShadow + '-2px -2px 8px rgba(0,0,0,.4) inset,0 0 2px #000 inset" id="tis-';
        for (i = 220; i < s; i++) {
          if (i % w < 4) {
            html += tmp2 + i + '">' + divEnd;
          }
        }
        html +=   divEnd +
                divEnd +
                divStyleMargin + '0 40px 40px;background:#000;width:200px;height:400px' + boxShadow + '0 0 9px #222">';

        for (i = 0; i < s; i++) {
          grid.push(0);
          if (i > 19 && i < 220) {
            html += tmp2 + i + '">' + divEnd;
          }
        }

        html += divEnd +
              divEnd;
        tmp = doc[createElement]('div');
        tmp.innerHTML = html;
        doc.body.appendChild(html = tmp);

        // Music!
        tmp2 = 881856; // 4593 samples/eighth * 8 eighths/bar * 24 bars
        tmp = new Uint8Array(tmp2 + 44);
        // https://ccrma.stanford.edu/courses/422/projects/WaveFormat/
        tmp.set([
          0x52, 0x49, 0x46, 0x46, // "RIFF"
          (tmp2 + 36) & 0xff, ((tmp2 + 36) >> 8) & 0xff, ((tmp2 + 36) >> 16), 0, // data size + 36 (little-endian)
          0x57, 0x41, 0x56, 0x45, // "WAVE"
          
          0x66, 0x6d, 0x74, 0x20, // "fmt "
          16, 0, 0, 0, // size of this subchunk
          1, 0, // PCM
          1, 0, // mono
          34, 86, 0, 0, // sample rate: 22050 Hz
          34, 86, 0, 0, // byte rate: 22050 bytes/s
          1, 0, // block align
          8, 0, // bits per sample

          0x64, 0x61, 0x74, 0x61, // "data"
          tmp2 & 0xFF, (tmp2 >> 8) & 0xff, tmp2 >> 16, 0 // data size
        ]);
        thirdVerse[2] += thirdVerse[2];
        // delta is voice index; note that it is a string!
        for (delta in music) {
          music[delta] += music[delta] + thirdVerse[delta];
          for (i = 44, j = 0; j < music[delta].length; j++) {
            tmp3 = music[delta][charCodeAt](j) - (delta == 2 ? 64 : 32);
            // 2 * pi * 55 Hz / 22050 Hz = 0.0156723443
            // But we divide out the pi because we don't use sin:
            // 2 * 55 Hz / 22050 Hz = 0.0049886621
            x = .00499 * math.pow(2, (tmp3 % 24 + (delta == 2 ? 0 : 27)) / 12);
            tmp2 = [15, 9, 9][delta];
            for (y = 0; y < 4593 * [1, 3, 2, 4][~~(tmp3 / 24)]; y++) {
              // || works because we don't have the amplitude to reach sample value 0.
              // y * x is the phase times two: [0, 2).
              tmp[i++] = (tmp[i] || 127) + (y * x % 2 < 1 ? tmp2 : -tmp2);
              tmp2 *= 0.9999;
            }
          }
        }
        music = new Audio(URL.createObjectURL(new Blob([tmp], {type: 'audio/wav'})));
        music.loop = 1;
        if (location.hash != '#m') music.play();

        function isSolidAt(x, y, rotation, tetromino) {
          return currentTetromino &&
            !(x & ~3) && !(y & ~3) && // range check for [0, 4)
            (shapes[charCodeAt](8*(tetromino || currentTetromino) - 8 + 2*rotation + (y>>1)) & (1 << (4 * (y&1) + x)));
        }

        function render() {
          tmp = currentY;
          while (currentTetromino && tryMove(currentX, currentY+1, currentRotation, 1));
          for (y = 0; y < h+4; y++) {
            for (x = 0; x < w; x++) {
              i = y*w + x;
              if (y >= h) {
                grid[i] = isSolidAt(x, y-h, 0, bag[0]) ? bag[0] : 0;
              }
              shadowGrid[i] =
                isSolidAt(x-currentX, y-tmp, currentRotation) ? currentTetromino :
                isSolidAt(x-currentX, y-currentY, currentRotation) ? currentTetromino + 8 :
                grid[i] || 0;
              if (tmp3 = win['tis-' + i]) {
                tmp3 = tmp3.style;
                tmp3.background = '#' + (
                    state == 1 && stateTime % 4 < 2 && linesClearing[y] ?
                    'fff' :
                    colors[shadowGrid[i] % 8]);
                tmp3.opacity = shadowGrid[i] > 7 ? 0.2 : 1;
              }
            }
          }
          currentY = tmp;
          tmp = divStyleMargin + '0;text-align:right;font-size:150%">';
          win['tis-status'].innerHTML = 'Score' + tmp + score + divEnd + 'Lines' + tmp + lines + divEnd + 'Level' + tmp + level + divEnd;
        }

        function tryMove(posX, posY, rotation, doNotRender) {
          for (j = 0; x = (j&3), y = (j>>2), j < 16; j++) {
            if (isSolidAt(x, y, rotation) &&
                ((x += posX) < 0 || x >= w || (y += posY) < 0 || y >= h || grid[y*w + x])) {
              return;
            }
          }
          currentX = posX;
          currentY = posY;
          currentRotation = rotation;
          lockTimer = 0;
          doNotRender || render();
          return 1;
        }

        function frame(now) {
          delta = (now - lastFrame) / 1e3 || 0;
          if (delta > .1) delta = .1;
          lastFrame = now;
          if (state == 2) { // Game over
            if (stateTime-- > 4 && !(stateTime % 4)) {
              for (x = 0; x < w; x++) {
                grid[stateTime*w/4 + x] = 1 + ~~(math.random() * 7);
              }
              render();
            }
          } else if (state == 1) { // Clearing
            if (--stateTime < 0) {
              for (y in linesClearing) {
                for (i = y*w+w-1; i >= 0; i--) {
                  grid[i] = grid[i-w];
                }
              }
              state = 0;
            }
            render();
          } else { // state == 0: Regular gameplay
            // Handle keyboard input
            for (tmp2 in keysPressed) {
              if (tmp2 == 27) { // Quit
                doc.body.removeChild(html);
                doc[removeEventListener](keydown, onKeyDown);
                doc[removeEventListener](keyup, onKeyUp);
                music.pause();
                return;
              }
              if (tmp2 == 37) { // Left
                if (keysPressed[tmp2] >= 0) {
                  // TODO tweak left/right key repeat
                  keysPressed[tmp2] -= .15;
                  tryMove(currentX - 1, currentY, currentRotation);
                }
              }
              if (tmp2 == 39) { // Right
                // Right
                if (keysPressed[tmp2] >= 0) {
                  keysPressed[tmp2] -= .15;
                  tryMove(currentX + 1, currentY, currentRotation);
                }
              }
              if (tmp2 == 38) {
                // Up: hard drop
                if (!keysPressed[tmp2]) {
                  while (tryMove(currentX, currentY + 1, currentRotation));
                  lockTimer = 9;
                }
              }
              if (tmp2 == 16 || tmp2 == 17) {
                // Rotate
                // -1 for left, 1 for right
                tmp4 = 1 - 2 * (tmp2 == 17);
                if (!keysPressed[tmp2]) {
                  for (i = 0; i < 5; i++) {
                    tmp = (currentTetromino == 1 ? wallKickTableI : wallKickTableRest)[charCodeAt](((currentRotation + 4 + (tmp4-1)/2))%4 * 5 + i) - 32;
                    if (tryMove(currentX + tmp4 * ((tmp & 7) - 2), currentY + tmp4 * (2 - (tmp >> 3)), (currentRotation+4+tmp4) % 4)) {
                      break;
                    }
                  }
                }
              }
              keysPressed[tmp2] += delta;
            }

            // Apply gravity
            gravityTimer += math.max(
                keysPressed[40] ? 0.2 : 0,
                delta * math.pow(1.23, level));
            if (gravityTimer > 1) {
              gravityTimer = 0;
              tryMove(currentX, currentY + 1, currentRotation);
            }

            if (!currentTetromino || lockTimer > 1) {
              // Lock it in place; we assume that the render was just done
              for (i in grid) grid[i] = shadowGrid[i];

              // Find full rows
              tmp2 = 0;
              linesClearing = [];
              for (y = 0; y < h; y++) {
                tmp = 1;
                for (x = 0; x < w; x++) {
                  if (!grid[y*w + x]) {
                    tmp = 0;
                    break;
                  }
                }
                if (tmp) {
                  linesClearing[y] = 1;
                  tmp2++;
                  state = 1;
                  stateTime = 6;
                }
              }
              score += 100 * [0, 1, 3, 5, 8][tmp2] * level;
              lines += tmp2;
              level = 1 + ~~(lines / 10);

              // Shuffle bag if needed
              if (bag.length < 2) {
                // tmp is a bitmask that tracks which tetrominos we've already added.
                // bit 0 is just a sentinel, bits 1-7 correspond to tetrominos.
                for (tmp = 1; tmp != 255;) {
                  for (j = 0; tmp & (1 << j); j = math.ceil(math.random() * 7));
                  tmp |= 1 << j;
                  bag.push(j);
                }
              }

              // Spawn new tetromino
              currentTetromino = bag.shift();
              gravityTimer = 0;
              if (!tryMove(3, 0, 0)) {
                // Game over
                currentTetromino = 0;
                state = 2;
                stateTime = 4*h;
              }
            }
            lockTimer += delta;
          }

          requestAnimationFrame(frame);
        }
        frame(0);

        function onKeyDown(e) {
          tmp = e[keyCode];
          if (tmp == 77) {
            if (music.paused) music.play(); else music.pause();  
          }
          if (!keysPressed[tmp]) {
            keysPressed[tmp] = 0;
          }
          // 37-40: arrow keys
          // 81, 88, 90, 186: rotation keys
          if (tmp > 36 && tmp < 41 || tmp == 81 || tmp == 88 || tmp == 90 || tmp == 186) {
            e.preventDefault();
          }
        }

        function onKeyUp(e) {
          delete keysPressed[e[keyCode]];
        }

        doc[addEventListener](keydown, onKeyDown);
        doc[addEventListener](keyup, onKeyUp);
      })();
    }
  });
})();
