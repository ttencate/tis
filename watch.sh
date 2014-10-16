#!/bin/bash

# Requires inotify-tools, node.js and uglify.js:
#
# $ sudo apt-get install inotify-tools node
# $ npm install uglify-js

function minify() {
  `npm bin`/uglifyjs --lint --compress --mangle < tis.js > tis.min.js && \
    echo -n 'Byte count: ' && \
    wc -c < tis.min.js
}

while true; do
  minify
  inotifywait -q -e close_write tis.js
done
