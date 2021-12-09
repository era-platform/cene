#!/bin/env node
// build-demos.js
// Copyright 2016, 2017, 2021 Ross Angle.
// Released under the MIT License.
"use strict";

var cene = require( "./cene" );

// TODO: At the moment, this only does a fraction of what
// build-demos.sh does. We were keeping them in parity before, and we
// should probably do that again.

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/hello-world.cene"
], {
    out: "dist/demos/hello-world"
} );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/hello-world-js.cene"
], {
    out: "dist/demos/hello-world-js"
} );
require( "./dist/demos/hello-world-js/hello-world-sloppy" );
require( "./dist/demos/hello-world-js/hello-world-picky" );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/read-and-transform.cene"
], {
    in: "demos/read-and-transform-src",
    out: "dist/demos/read-and-transform"
} );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/import-example.cene"
], {
    in: "demos/import-example-src",
    out: "dist/demos/import-example"
} );
