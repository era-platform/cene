#!/bin/bash

mkdir -p dist/demos/
cp buildlib/lathe.js dist/demos/
cp demos/cene.html dist/demos/
cp demos/hello-world-js-picky.html dist/demos/
cp demos/hello-world-js-sloppy.html dist/demos/
cp demos/reader.html dist/demos/
cp demos/unit-tests.html dist/demos/
cp src/cene-api.js dist/demos/
cp src/cene-runtime.js dist/demos/
cp src/era-code-gen-js.js dist/demos/
cp src/era-misc.js dist/demos/
cp src/era-misc-strmap-avl.js dist/demos/
cp src/era-reader.js dist/demos/
cp test/harness-first.js dist/demos/
cp test/harness-last.js dist/demos/
cp test/test-reader.js dist/demos/

node cene.js demos/hello-world.cene --out dist/demos/hello-world

node cene.js demos/hello-world-js.cene --out dist/demos/hello-world-js
node dist/demos/hello-world-js/hello-world-sloppy.js
node dist/demos/hello-world-js/hello-world-picky.js

node cene.js demos/read-and-transform.cene \
  --in demos/read-and-transform-src \
  --out dist/demos/read-and-transform

node cene.js demos/import-example.cene \
  --in demos/import-example-src \
  --out dist/demos/import-example

node cene.js --demo-cene

mkdir -p dist/gh-pages/
cp -r dist/demos dist/gh-pages/
cp index.html dist/gh-pages/
mkdir -p dist/gh-pages/assets/logo/
cp assets/logo/cene-5-compact-cropped-398x398.png dist/gh-pages/assets/logo/
cp assets/logo/cene-5-compact-favicon.png dist/gh-pages/assets/logo/
