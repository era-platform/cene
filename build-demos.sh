#!/bin/bash

node cene.js demos/hello-world.cene --out fin/hello-world

node cene.js demos/hello-world-js.cene --out fin/hello-world-js
node fin/hello-world-js/hello-world.js

node cene.js demos/read-and-transform.cene \
  --in demos/read-and-transform-src \
  --out fin/read-and-transform

node cene.js demos/import-example.cene \
  --in demos/import-example-src \
  --out fin/import-example
