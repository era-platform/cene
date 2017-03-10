#!/bin/env node
// build-demos.js
// Copyright 2016, 2017 Ross Angle. Released under the MIT License.
"use strict";

var cene = require( "./cene" );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/hello-world.cene"
], {
    out: "fin/hello-world"
} );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/hello-world-js.cene"
], {
    out: "fin/hello-world-js"
} );
require( "./fin/hello-world-js/hello-world-sloppy" );
require( "./fin/hello-world-js/hello-world-picky" );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/read-and-transform.cene"
], {
    in: "demos/read-and-transform-src",
    out: "fin/read-and-transform"
} );

cene.runCeneSync( [
    "src/prelude-util.cene",
    "demos/import-example.cene"
], {
    in: "demos/import-example-src",
    out: "fin/import-example"
} );
