#!/bin/env node
// build-demos.js
// Copyright 2016 Ross Angle. Released under the MIT License.
"use strict";

var cene = require( "./cene" );

cene.runCeneSync( [
    "src/era-staccato-lib.stc",
    "demos/hello-world.cene"
], {
    out: "fin/hello-world"
} );

cene.runCeneSync( [
    "src/era-staccato-lib.stc",
    "demos/hello-world-js.cene"
], {
    out: "fin/hello-world-js"
} );
require( "./fin/hello-world-js/hello-world" );

cene.runCeneSync( [
    "src/era-staccato-lib.stc",
    "demos/read-and-transform.cene"
], {
    in: "demos/read-and-transform-src",
    out: "fin/read-and-transform"
} );

cene.runCeneSync( [
    "src/era-staccato-lib.stc",
    "demos/import-example.cene"
], {
    in: "demos/import-example-src",
    out: "fin/import-example"
} );
