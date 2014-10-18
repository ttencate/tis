(function() {
  var
      doc = document,
      getElementById = 'getElementById',
      addEventListener = 'addEventListener',
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
        'xtvstqpsxtvs\\`}|x',
        'tqspqqpptqspY`xx\u007f',
        'LSOSLSOSKSNSKSNSLSOSLSOSKSNSKSNS'
      ],
      // First 2 invisible lines, then 20 visible lines, then 2 for the Next display.
      grid = [],
      shadowGrid = [],
      w = 10,
      h = 22,
      s = w*h+20,
      // x I J L O S T Z
      backgroundLUT = '080808 0dd 36f e80 dd0 0e0 c0c f22'.split(' '),
      // http://tetris.wikia.com/wiki/SRS
      //     1     2     4     8
      //    16    32    64   128
      //   256   512  1024  2048
      //  4096  8192 16384 32768
      shapes = [
        , // empty
        [240, 17476, 3840, 8738], // I
        [113, 550, 1136, 802], // J
        [116, 1570, 368, 547], // L
        [102, 102, 102, 102], // O
        [54, 1122, 864, 561], // S
        [114, 610, 624, 562], // T
        [99, 612, 1584, 306] // Z
      ],
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
      leftRightRepeatDelta = .15,
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
      gravityTimer, // between 0 and 1
      lockTimer = 0,
      bag = [],
      keysPressed = [],
      delta,
      lastFrame,
      i, j, x, y, tmp, tmp2, tmp3, tmp4,
      // TODO instructions, credits
      html = '<div id="tis-root" style="position:fixed;width:280px;height:400px;left:50%;top:50%;margin:-240px -160px;background:rgba(0,0,0,0.8);box-shadow:0 0 30px #000;border-radius:30px;padding:40px"><div id="tis-grid" style="background:#000;width:200px;height:400px;box-shadow:0 0 9px #222;">'
      ;

  doc[addEventListener]('DOMContentLoaded', function() {
    thirdVerse[2] += thirdVerse[2];
    for (i in music) {
      music[i] += music[i] + thirdVerse[i];
    }

    tmp2 = '" style="width:20px;height:20px;float:left;box-shadow:-2px -2px 8px rgba(0,0,0,0.4) inset, 0 0 2px #000 inset;"></div>';
    for (i = 0; i < s; i++) {
      grid.push(0);
      if (i > 19 && i < 220) {
        html += '<div id="tis-' + i + tmp2;
      }
    }

    html += '</div><div style="position:absolute;right:20px;top:40px;width:80px;color:#eee;font:normal 15px sans-serif"><div id="tis-status"></div>Next<div style="margin:8px 0;height:40px;box-shadow:0 0 9px #000;">';
    for (i = 220; i < s; i++) {
      if (i % w < 4) {
        html += '<div id="tis-' + i + tmp2;
      }
    }
    html += '</div></div></div>';

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
    // delta is voice index
    for (delta = 0; delta < 3; delta++) {
      for (i = 44, j = 0; j < music[delta].length; j++) {
        tmp3 = music[delta].charCodeAt(j) - (delta == 2 ? 64 : 32);
        x = 2 * Math.PI * (delta == 2 ? 55 : 261.63) * Math.pow(2, (tmp3 % 24) / 12) / 22050;
        tmp2 = [.2, .1, .1][delta];
        for (y = 0; y < 4593 * [1, 3, 2, 4][Math.floor(tmp3 / 24)]; y++) {
          tmp[i++] += 127 * ((!delta) + tmp2 * (Math.sin(y * x) > 0 ? 1 : -1));
          tmp2 *= 0.9999;
        }
      }
    }
    html += '<audio id="tis-music" src="' + URL.createObjectURL(new Blob([tmp], {type: 'audio/wav'})) + '" loop' + (location.hash == '#m' ? '' : ' autoplay') + '></audio>';

    tmp = doc.createElement('div');
    tmp.innerHTML = html;
    doc.body.appendChild(tmp);

    function isSolidAt(x, y, rotation, tetromino) {
      return currentTetromino &&
        (x&3) == x && (y&3) == y && // range check for [0, 4)
        (shapes[tetromino || currentTetromino][rotation] & (1 << (4 * y + x)));
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
          if (tmp3 = doc[getElementById]('tis-' + i)) {
            tmp3.style.background = '#' + (
                state == 1 && stateTime % 4 < 2 && linesClearing[y] ?
                'fff' :
                backgroundLUT[shadowGrid[i] % 8]);
            tmp3.style.opacity = shadowGrid[i] > 7 ? 0.2 : 1;
          }
        }
      }
      currentY = tmp;
      tmp = '<div style="text-align:right;font-size:150%">';
      doc[getElementById]('tis-status').innerHTML = 'Score' + tmp + score + '</div>Lines' + tmp + lines + '</div>Level' + tmp + level + '</div>';
    }

    function tryMove(posX, posY, rotation, doNotRender) {
      for (y = posY; y < posY+4; y++) {
        for (x = posX; x < posX+4; x++) {
          if (isSolidAt(x-posX, y-posY, rotation) &&
              (x < 0 || x >= w || y < 0 || y >= h || grid[y*w + x])) {
            return 0;
          }
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
      switch (state) {
        case 2:
          if (stateTime-- > 4 && !(stateTime % 4)) {
            for (x = 0; x < w; x++) {
              grid[stateTime*w/4 + x] = 1 + Math.floor(Math.random() * 7);
            }
            render();
          }
          break;

        case 1:
          if (--stateTime < 0) {
            for (y in linesClearing) {
              for (i = y*w+w-1; i >= 0; i--) {
                grid[i] = grid[i-w];
              }
            }
            state = 0;
          }
          render();
          break;

        case 0:
          // Handle keyboard input
          tmp4 = 1;
          for (tmp2 in keysPressed) {
            switch (parseInt(tmp2)) {
              case 37:
                // Left
                if (keysPressed[tmp2] < 0) break;
                keysPressed[tmp2] -= leftRightRepeatDelta;
                tryMove(currentX - 1, currentY, currentRotation);
                break;
              case 39:
                // Right
                if (keysPressed[tmp2] < 0) break;
                keysPressed[tmp2] -= leftRightRepeatDelta;
                tryMove(currentX + 1, currentY, currentRotation);
                break;
              case 38:
                // Up: hard drop
                if (keysPressed[tmp2]) break;
                while (tryMove(currentX, currentY + 1, currentRotation));
                lockTimer = 9;
                break;
              case 90: // z
              case 186: // ; (dvorak)
                // Rotate left
                tmp4 = -1; // 1 for right, -1 for left
              case 88: // x
              case 81: // q (dvorak)
                // Rotate right
                if (!keysPressed[tmp2]) {
                  for (i = 0; i < 5; i++) {
                    tmp = (currentTetromino == 1 ? wallKickTableI : wallKickTableRest).charCodeAt(((currentRotation + 4 + (tmp4-1)/2))%4 * 5 + i) - 32;
                    if (tryMove(currentX + tmp4 * ((tmp & 7) - 2), currentY + tmp4 * (2 - (tmp >> 3)), (currentRotation+4+tmp4) % 4)) {
                      break;
                    }
                  }
                }
                break;
            }
            keysPressed[tmp2] += delta;
          }

          // Apply gravity
          gravityTimer += Math.max(
              keysPressed[40] ? 0.2 : 0,
              // TODO tune speed (use spreadsheet?)
              delta * (level+1) / 1.5);
          if (gravityTimer > 1) {
            gravityTimer = 0;
            tryMove(currentX, currentY + 1, currentRotation);
          }

          if (!currentTetromino || lockTimer > 1) {
            // Lock it in place
            render();
            for (i = 0; i < s; i++) grid[i] = shadowGrid[i];

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
            score += [0, 100, 300, 500, 800][tmp2] * level;
            lines += tmp2;
            level = 1 + Math.floor(lines / 10);

            // Shuffle bag if needed
            if (bag.length < 2) {
              tmp = 1;
              for (i = 0; i < 7; i++) {
                j = 0;
                while (tmp & (1 << j)) {
                  j = Math.ceil(Math.random() * 7);
                }
                tmp |= 1 << j;
                bag.push(j);
              }
            }

            // Spawn new tetromino
            currentTetromino = bag.shift();
            gravityTimer = 0;
            if (!tryMove(3, 0, 0)) {
              // Game over
              state = 2;
              stateTime = 4*h;
            }
            render();
          }
          lockTimer += delta;
      }

      window.requestAnimationFrame(frame);
    }
    frame(0);

    function onKeyDown(e) {
      tmp = e.keyCode;
      if (tmp == 77) {
        tmp = doc[getElementById]('tis-music');
        if (tmp.paused) tmp.play(); else tmp.pause();  
      }
      if (!keysPressed[tmp]) {
        keysPressed[tmp] = 0;
      }
      // 37-40: arrow keys
      // 81, 88, 90, 186: rotation keys
      if (tmp > 36 && tmp < 41 || tmp == 88 || tmp == 88 || tmp == 90 || tmp == 186) {
        e.preventDefault();
      }
    }
    function onKeyUp(e) {
      delete keysPressed[e.keyCode];
    }
    doc[addEventListener]('keydown', onKeyDown);
    doc[addEventListener]('keyup', onKeyUp);
  });
})();
