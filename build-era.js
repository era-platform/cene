#!/bin/env node
// build-era.js
// Copyright 2013-2015 Ross Angle. Released under the MIT License.
"use strict";

var fs = require( "fs" );

var argparse = require( "argparse" );

var _ = require( "./buildlib/lathe" );
var ltf = require( "./buildlib/lathe-fs" );


function readFile( filename ) {
    return fs.readFileSync( filename, "UTF-8" );
}
function readFiles( filenames ) {
    return filenames.map( function ( filename ) {
        return readFile( filename );
    } ).join( "\n\n\n" );
}

function arrEachAsyncNodeExn( arr, asyncFunc, then ) {
    loop( 0 );
    function loop( i ) {
        if ( arr.length <= i )
            return void then();
        return asyncFunc( i, arr[ i ], function ( e ) {
            if ( e ) return void then( e );
            loop( i + 1 );
        } );
    }
}



if ( require.main === module ) {


process.chdir( __dirname );

var argParser = new argparse.ArgumentParser( {
    version: "0.0.1",
    addHelp: true,
    description: "The Era programming systems."
} );
argParser.addArgument( [ "-s", "--build-staccato" ], {
    action: "storeTrue",
    help:
        "Staccato: Compile dependencies of " +
        "demos/staccato-runner-mini.html."
} );
argParser.addArgument( [ "-E", "--test-era" ], {
    action: "storeTrue",
    help: "Era reader: Run unit tests."
} );
argParser.addArgument( [ "-S", "--test-mini-staccato" ], {
    action: "storeTrue",
    help:
        "Mini Staccato, a subset of a macro-capable Staccato: Run " +
        "a demo."
} );
var args = argParser.parseArgs();

var tasks = [];


if ( args.test_era ) tasks.push( function ( then ) {
    Function( readFiles( [
        "src/era-misc-strmap-avl.js",
        "src/era-misc.js",
        "test/harness-first.js",
        "src/era-reader.js",
        "test/test-reader.js",
        "test/harness-last.js"
    ] ) )();
    
    process.nextTick( function () {
        then();
    } );
} );


if ( args.build_staccato ) tasks.push( function ( then ) {
    arrEachAsyncNodeExn( [
        { dir: "src/", name: "era-staccato-lib.stc" },
        { dir: "src/", name: "era-staccato-self-compiler.stc" },
        { dir: "test/", name: "test.stc" }
    ], function ( i, file, then ) {
        ltf.readTextFile( file.dir + file.name, "utf-8",
            function ( e, text ) {
            
            if ( e ) return void then( e );
            if ( text === null ) return void then( new Error() );
            
            ltf.writeTextFile( "fin/" + file.name + ".js", "utf-8",
                "\"use strict\";\n" +
                "var rocketnia = rocketnia || {};\n" +
                "rocketnia.eraFiles = rocketnia.eraFiles || {};\n" +
                "rocketnia.eraFiles[ " +
                    _.jsStr( file.name ) + " ] =\n" +
                _.jsStr( text ) + ";\n",
                then );
        } );
    }, function ( e ) {
        if ( e ) return void then( e );
        
        console.log(
            "Copied Staccato files to fin/ as JavaScript files." );
        then();
    } );
} );

if ( args.test_mini_staccato ) tasks.push( function ( then ) {
    
    var $stc = Function(
        readFiles( [
            "src/era-misc-strmap-avl.js",
            "src/era-misc.js",
            "src/era-reader.js",
            "src/era-staccato-lib-runner-mini.js"
        ] ) + "\n" +
        "\n" +
        "\n" +
        "return {\n" +
        "    readAll: readAll,\n" +
        "    arrAny: arrAny,\n" +
        "    stcNsGet: stcNsGet,\n" +
        "    stcNsRoot: stcNsRoot,\n" +
        "    nssGet: nssGet,\n" +
        "    usingDefinitionNs: usingDefinitionNs,\n" +
        "    stcTrivialStxDetails: stcTrivialStxDetails,\n" +
        "    runAllDefs: runAllDefs\n" +
        "};\n"
    )();
    
    var startMillis = new Date().getTime();
    
    var libCode =
        $stc.readAll( readFile( "src/era-staccato-lib.stc" ) );
    var selfCompilerCode = $stc.readAll(
        readFile( "src/era-staccato-self-compiler.stc" ) );
    var testCode =
        $stc.readAll( readFile( "test/test.stc" ) );
    var readMillis = new Date().getTime();
    
    var nss = {
        definitionNs:
            $stc.stcNsGet( "definition-ns", $stc.stcNsRoot() ),
        uniqueNs: $stc.stcNsGet( "unique-ns", $stc.stcNsRoot() )
    };
    
    var usingDefNs = $stc.usingDefinitionNs( nss.definitionNs );
    
    usingDefNs.stcAddCoreMacros( nss.definitionNs );
    usingDefNs.processCoreTypes( nss.definitionNs );
    
    function runCode( code ) {
        return !$stc.arrAny( code, function ( tryExpr ) {
            if ( !tryExpr.ok ) {
                console.err( tryExpr.msg );
                return true;
            }
            
            usingDefNs.macroexpandTopLevel(
                $stc.nssGet( nss, "first" ),
                usingDefNs.readerExprToStc(
                    $stc.stcTrivialStxDetails(),
                    tryExpr.val ) );
            nss = $stc.nssGet( nss, "rest" );
            return false;
        } );
    }
    
    if ( runCode( libCode ) && runCode( selfCompilerCode ) ) {
        $stc.runAllDefs();
        runCode( testCode );
    }
    
    var stopMillis = new Date().getTime();
    console.log(
        "Ran for " + (stopMillis - startMillis) / 1000 + " " +
        "seconds, broken down as follows:" );
    console.log(
        "- Spent " + (readMillis - startMillis) / 1000 + " seconds " +
        "reading the code." );
    console.log(
        "- Spent " + (stopMillis - readMillis) / 1000 + " seconds " +
        "processing it." );
    
    process.nextTick( function () {
        then();
    } );
} );


if ( tasks.length === 0 ) {
    argParser.printHelp();
} else {
    arrEachAsyncNodeExn( tasks, function ( i, task, then ) {
        task( then );
    }, function ( e ) {
        if ( e ) throw e;
        
        // Do nothing.
    } );
}


}
