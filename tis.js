document.addEventListener('DOMContentLoaded', function() {
  document.body.innerHTML += '<div id="tis-root" style="position:fixed;width:280px;height:400px;left:50%;top:50%;margin:-240px -160px;background:rgba(0,0,0,0.8);box-shadow:0 0 30px #000;border-radius:30px;padding:40px"><div id="tis-grid" style="background:#000;width:200px;height:400px;box-shadow:0 0 10px #222;"></div><div id="tis-status" style="position:absolute;right:20px;top:40px;width:80px;color:#eee;font:normal 15px sans-serif"></div></div>';
  var gridElt = document.getElementById('tis-grid'),
      gridElts = [],
      statusElt,
      // http://newt.phys.unsw.edu.au/jw/notes.html
      //
      // Subtract 64, then:
      // - bits 0-3 are MIDI note number - 68 (G#, lowest note in the tune)
      // - bits 4-5 are duration: eighth, dotted quarter, quarter, half
      //
      //         1/8 3/8 1/4 1/2
      // G# =  0  @   P   `   p
      // A  =  1  A   Q   a   q
      // Bb =  2  B   R   b   r
      // ...                 
      // A5 = 13  M   ]   m   }
      //
      // http://i.ytimg.com/vi/bpBePVCUM7E/maxresdefault.jpg
      music = 'hCDfDCaADhFDSDfhdaQDVImKIXDhFDcCDfhdaq',
      grid = [],
      shadowGrid = [],
      w = 10,
      h = 22,
      s = w*h,
      // I J L O S T Z
      backgroundLUT = '#080808 #0dd #36f #e80 #dd0 #0e0 #c0c #f22 #002c2c #0a1433 #301b00 #2c2c00 #003000 #290029 #330707'.split(' '),
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
        [99, 612, 1584, 306]], // Z
      leftRightRepeatDelta = 150,
      currentTetromino,
      currentX,
      currentY,
      currentRotation,
      state = 0, // 0=PLAYING, 1=LOST
      fillRows,
      score = 0,
      lines = 0,
      level = 1,
      gravityTimer, // between 0 and 1
      bag = [],
      keysPressed = [],
      delta,
      lastFrame,
      i, j, x, y, tmp, tmp2, tmp3
      ;
  music = music + music + 'xtvstqpsxtvsdh}|';

  for (i = 0; i < s; i++) {
    grid.push(0);
    if (i > 19) {
      gridElt.innerHTML += '<div id="tis-' + i + '" style="width:20px;height:20px;float:left;box-shadow:-2px -2px 8px rgba(0,0,0,0.4) inset, 0 0 2px #000 inset;"></div>';
    }
  }

  // Music!
  // Tempo: 144 bpm, 4/4, 24 bars -> 40 seconds
  // TODO bassline
  tmp2 = 40*22050;
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
  for (i = 44, j = 0; j < music.length; j++) {
    tmp3 = music.charCodeAt(j) - 64;
    x = 2 * Math.PI * 440 * Math.pow(2, (tmp3 & 15) / 12) / 22050;
    j > 75 && (x /= 2);
    tmp2 = j > 75 ? 0.8 : 1;
    for (y = 0; y < [4593, 13781, 9187, 18375][tmp3 >> 4]; y++) {
      tmp[i++] = tmp2 * (Math.sin(y * x) > 0 ? 255 : 0) + (1-tmp2) * 127;
      tmp2 *= j > 75 ? 0.99997 : 0.9999;
    }
  }
  document.body.innerHTML += '<audio id="tis-music" src="' + URL.createObjectURL(new Blob([tmp], {type: 'audio/wav'})) + '" autoplay loop></audio>';
 
  // Modifying document.innerHTML replaces the entire body, so pick up elements
  // at a late stage.
  statusElt = document.getElementById('tis-status');
  for (i = 20; i < s; i++) {
    gridElts[i] = document.getElementById('tis-' + i);
  }

  function isSolidAt(x, y, rotation) {
    return currentTetromino &&
      //(x&15) == x && (y&15) == y && // range check for [0, 16)
      x >= 0 && x < 4 && y >= 0 && y < 4 &&
      (shapes[currentTetromino][rotation] & (1 << (4 * y + x)));
  }

  function render() {
    for (tmp = currentY; currentTetromino && !isBlocked(currentX, tmp+1, currentRotation); tmp++);
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y*w + x;
        shadowGrid[i] =
          isSolidAt(x-currentX, y-currentY, currentRotation) ? currentTetromino :
          isSolidAt(x-currentX, y-tmp, currentRotation) ? currentTetromino + 7 :
          grid[i] || 0;
        if (gridElts[i]) {
          gridElts[i].style.background = backgroundLUT[shadowGrid[i]];
        }
      }
    }
    tmp = '<div style="text-align:right;font-size:150%">';
    statusElt.innerHTML = 'Score' + tmp + score + '</div>Lines' + tmp + lines + '</div>Level' + tmp + level + '</div>';
  }

  // XXX can probably shrink this by doing tryMove(dx, dy, dr) instead
  function isBlocked(posX, posY, rotation) {
    for (y = posY; y < posY+4; y++) {
      for (x = posX; x < posX+4; x++) {
        if (isSolidAt(x-posX, y-posY, rotation) &&
            (x < 0 || x >= w || y < 0 || y >= h || grid[y*w + x])) {
          return 1;
        }
      }
    }
    return 0;
  }

  function spawn() {
    // Shuffle bag if needed
    // TODO show next piece
    if (!bag.length) {
      for (i = 0; i < 7; i++) {
        bag[i] = i+1;
      }
      for (i = 0; i < 7; i++) {
        j = Math.floor(Math.random() * 7);
        tmp = bag[j]; bag[j] = bag[i]; bag[i] = tmp;
      }
    }

    // Spawn new tetromino
    currentTetromino = bag.shift();
    currentX = 3;
    currentY = 0;
    currentRotation = 0;
    gravityTimer = 0;

    render();
  }
  spawn();

  function frame(now) {
    delta = (now - lastFrame) || 0;
    lastFrame = now;
    switch (state) {
      case 1:
        if (fillRows > 1) {
          for (x = 0; x < w; x++) {
            grid[fillRows*w + x] = 1 + Math.floor(Math.random() * 7);
          }
          render();
          fillRows--;
        }
        break;

      case 0:
        for (tmp2 in keysPressed) {
          switch (parseInt(tmp2)) {
            case 37: // left
              if (keysPressed[tmp2] < 0) break;
              keysPressed[tmp2] -= leftRightRepeatDelta;
              if (!isBlocked(currentX - 1, currentY, currentRotation)) currentX--;
              break;
            case 39: // right
              if (keysPressed[tmp2] < 0) break;
              keysPressed[tmp2] -= leftRightRepeatDelta;
              if (!isBlocked(currentX + 1, currentY, currentRotation)) currentX++;
              break;
            case 38: // up
              // Hard drop
              if (keysPressed[tmp2]) break;
              while (!isBlocked(currentX, currentY + 1, currentRotation)) currentY++;
              gravityTimer = 1;
              break;
            case 90: // z
            case 186: // ; (dvorak)
              // TODO wall kicks
              // http://web.archive.org/web/20081216145551/http://www.the-shell.net/img/srs_study.html
              if (!keysPressed[tmp2] && !isBlocked(currentX, currentY, (currentRotation+3) % 4)) currentRotation = (currentRotation+3)%4;
              break;
            case 88: // x
            case 81: // q (dvorak)
              if (!keysPressed[tmp2] && !isBlocked(currentX, currentY, (currentRotation+1) % 4)) currentRotation = (currentRotation+1)%4;
              break;
          }
          keysPressed[tmp2] += delta;
          render();
        }

        gravityTimer += Math.max(
            keysPressed[40] ? 0.2 : 0,
            delta * (level+1) / 1500);
        if (gravityTimer > 1) {
          gravityTimer = 0;
          if (!isBlocked(currentX, currentY + 1, currentRotation)) {
            currentY++;
          } else {
            // Lock it in place
            // TODO lock delay
            render();
            for (i = 0; i < s; i++) grid[i] = shadowGrid[i];

            // Find full rows
            tmp2 = 0;
            for (y = 0; y < h; y++) {
              tmp = 1;
              for (x = 0; x < w; x++) {
                if (!grid[y*w + x]) {
                  tmp = 0;
                  break;
                }
              }
              if (tmp) {
                // Clear line
                // TODO animation
                tmp2++;
                for (i = y*w+w-1; i >= 0; i--) {
                  grid[i] = grid[i-w];
                }
              }
            }
            score += [0, 100, 300, 500, 800][tmp2] * level;
            lines += tmp2;
            level = 1 + Math.floor(lines / 10);

            spawn();

            if (isBlocked(currentX, currentY, currentRotation)) {
              // Game over
              document.removeEventListener('keydown', onKeyDown);
              state = 1;
              fillRows = h;
            }
          }
          render();
        }
    }

    window.requestAnimationFrame(frame);
  }
  frame(0);

  function onKeyDown(e) {
    if (e.keyCode == 77) {
      tmp = document.getElementById('tis-music');
      if (tmp.paused) tmp.play(); else tmp.pause();  
    }
    if (!keysPressed[e.keyCode]) {
      keysPressed[e.keyCode] = 0;
    }
    // TODO preventDefault()
  }
  function onKeyUp(e) {
    delete keysPressed[e.keyCode];
  }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
});
