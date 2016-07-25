// harness-last.js (part of Era)
// Copyright 2013 Ross Angle. Released under the MIT License.
"use strict";


function runHarness( then ) {
    var anyTestFailed = false;
    var testsPassedInARow = 0;
    function resetTestsPassedInARow() {
        if ( testsPassedInARow !== 0 )
            debugLog(
                "A streak of " + testsPassedInARow + " tests " +
                "passed." );
        testsPassedInARow = 0;
    }
    function run( i ) {
        if ( !(i < unitTests.length) ) {
            resetTestsPassedInARow();
            then( anyTestFailed );
            return;
        }
        var unitTest = unitTests[ i ];
        unitTest( function ( errorMessage ) {
            if ( errorMessage === null ) {
                testsPassedInARow++;
            } else {
                anyTestFailed = true;
                resetTestsPassedInARow();
                debugLog( errorMessage );
            }
            run( i + 1 );
        } )
    }
    run( 0 );
}
