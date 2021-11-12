#!/usr/bin/env node
//
// cene.js
//
// Copyright 2013-2017, 2021 Ross Angle. Released under the
// MIT License.
//
"use strict";

var fs = require( "fs" );
var $path = require( "path" );

var argparse = require( "argparse" );
var uglify = require( "uglify-js" );

var _ = require( "./buildlib/lathe" );
var ltf = require( "./buildlib/lathe-fs" );
var pkg = require( "./package.json" );


function readFile( filename ) {
    return fs.readFileSync( filename, "UTF-8" );
}
function readInternalFiles( filenames ) {
    return filenames.map( function ( filename ) {
        return readFile( $path.resolve( __dirname, filename ) );
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

// TODO: Put a utility like this in lathe.js.
function jsJsn( x ) {
    if ( typeof x === "string" )
        return _.jsStr( x );
    if ( _.likeArray( x ) )
        return "[" + _.arrMap( x, function ( item ) {
            return jsJsn( item );
        } ).join( "," ) + "]";
    if ( x === null )
        return "null";
    if ( typeof x === "number" ) {
        if ( x !== x )
            return "0/0";
        if ( x === -1 / 0 )
            return "-1/0";
        if ( x === 1 / 0 )
            return "1/0";
        if ( 1 / x === -1 / 0 )
            return "-0";
        return JSON.stringify( x );
    }
    throw new Error();
}


function runCeneSync(
    files, testFiles, displayTimeInfo, cliArgs, inRoot, outRoot,
    shouldMinify ) {
    
    if ( inRoot !== null && outRoot !== null ) (function () {
        function check( lineage, other ) {
            if ( lineage === other )
                throw new Error(
                    "The provided input and output directories " +
                    "overlap, which is not allowed." );
            var parent = $path.dirname( lineage );
            if ( parent !== lineage )
                check( parent, other );
        }
        var resolvedIn = $path.resolve( inRoot );
        var resolvedOut = $path.resolve( outRoot );
        check( resolvedIn, resolvedOut );
        check( resolvedOut, resolvedIn );
    })();
    
    var resolvedIn = inRoot === null ? null : $path.resolve( inRoot );
    var resolvedOut =
        outRoot === null ? null : $path.resolve( outRoot );
    
    
    var $cene = Function(
        readInternalFiles( [
            "src/era-misc-strmap-avl.js",
            "src/era-misc.js",
            "src/era-reader.js",
            "src/era-code-gen-js.js",
            "src/cene-runtime.js",
            "src/cene-api.js"
        ] ) + "\n" +
        "\n" +
        "\n" +
        "return {\n" +
        "    readAll: readAll,\n" +
        "    jsJson: jsJson,\n" +
        "    arrMap: arrMap,\n" +
        "    arrMappend: arrMappend,\n" +
        "    arrKeep: arrKeep,\n" +
        "    arrEach: arrEach,\n" +
        "    strMap: strMap,\n" +
        "    jsnMap: jsnMap,\n" +
        "    sinkNsGet: sinkNsGet,\n" +
        "    sinkNsRoot: sinkNsRoot,\n" +
        "    getFunctionImplementationCexprByFlatTag:\n" +
        "        getFunctionImplementationCexprByFlatTag,\n" +
        "    rootQualify: rootQualify,\n" +
        "    usingFuncDefNs: usingFuncDefNs,\n" +
        "    ceneApiUsingFuncDefNs: ceneApiUsingFuncDefNs\n" +
        "};\n"
    )();
    
    var startMillis = new Date().getTime();
    
    var textOfFiles = $cene.arrMap( files, function ( file ) {
        return readFile( file );
    } );
    var codeOfFiles = $cene.arrMappend( textOfFiles,
        function ( text ) {
        
        return $cene.readAll( { locationHostType: "top-level" },
            text );
    } );
    var codeOfTestFiles = $cene.arrMappend( testFiles,
        function ( file ) {
        
        return $cene.readAll( { locationHostType: "top-level" },
            readFile( file ) );
    } );
    var readMillis = new Date().getTime();
    
    var nss = {
        uniqueNs: $cene.sinkNsGet( "unique-ns", $cene.sinkNsRoot() ),
        definitionNs:
            $cene.sinkNsGet( "definition-ns", $cene.sinkNsRoot() ),
        qualify: $cene.rootQualify
    };
    var funcDefNs =
        $cene.sinkNsGet( "function-implementations-ns",
            $cene.sinkNsRoot() );
    
    function ensureDirSync( path ) {
        if ( fs.existsSync( path ) ) {
            if ( fs.statSync( path ).isDirectory() )
                return;
            throw new Error();
        }
        var resolvedPath = $path.resolve( path );
        var parent = $path.dirname( resolvedPath );
        if ( parent === resolvedPath )
            return;
        ensureDirSync( parent );
        fs.mkdirSync( path );
    }
    function fsPathGet( dirname, basename ) {
        if ( dirname === null )
            return null;
        // TODO: See if there's anything more we need to sanitize for.
        if ( /[/\\]|^\.\.?$/.test( basename ) )
            return null;
        var result = $path.resolve( dirname, basename );
        if ( $path.basename( result ) !== basename )
            return null;
        return result;
    }
    function pathGet( dirname, basename ) {
        return {
            logicalPath: [ "get", basename, dirname.logicalPath ],
            fsPath: fsPathGet( dirname.fsPath, basename )
        };
    }
    
    var usingDefNs = $cene.usingFuncDefNs( funcDefNs );
    
    var memoInputPathType = $cene.jsnMap();
    var memoInputPathDirectoryList = $cene.jsnMap();
    var memoInputPathBlobUtf8 = $cene.jsnMap();
    var memoOutputPathDirectory = $cene.jsnMap();
    var memoOutputPathBlobUtf8 = $cene.jsnMap();
    var onceDependenciesCompleteListeners = [];
    function recordMemoForEnsureDir( dir ) {
        if ( memoOutputPathDirectory.has( dir ) )
            return;
        memoOutputPathDirectory.set( dir, true );
        if ( dir[ 0 ] === "get" )
            recordMemoForEnsureDir( dir[ 2 ] );
    }
    function recordMemo( memoMap, key, body ) {
        if ( !memoMap.has( key ) )
            memoMap.set( key, body() );
        return memoMap.get( key );
    }
    
    var namespaceDefs = $cene.jsnMap();
    
    
    function runUglifyMinifier( code ) {
        return uglify.minify( code, {
            parse: { bare_returns: true },
            compress: { drop_debugger: false }
        } ).code;
    }
    
    function runNoopMinifier( code ) {
        return code;
    }
    
    var runDesiredMinifier =
        shouldMinify ? runUglifyMinifier : runNoopMinifier;
    
    
    function cexprToCode( cexpr, getConstructor ) {
        return "function ( rt ) {\n" +
            "return " + cexpr.toJsCode( {
                getConstructor: getConstructor,
                
                // TODO: Figure out a good way to let the user specify
                // a minifier to use for their own JS code (when
                // they're using the JavaScript FFI). We could still
                // use Uglify here for the most part, but we have some
                // unsafe Uglify features enabled, and they might mess
                // up the user's JavaScript code.
                //
//                minifyJs: runDesiredMinifier
                minifyJs: runNoopMinifier
                
            } ).minusFreeVars( [
                "rt",
                "SinkStruct",
                "SinkFn",
                "SinkForeign",
                "SinkClineStruct",
                "SinkFuseStruct",
                "sinkForeignStrFromJs",
                "ceneErr",
                "macLookupRet",
                "macLookupThen"
            ] ).assertNoFreeVars().toExpr() + ";\n" +
        "}";
    }
    
    function addTopLevelVars( topLevelVars, code ) {
        return runDesiredMinifier(
            "\"use strict\";\n" +
            "(function ( topLevelVars ) {\n" +
            "\n" +
            code + "\n" +
            "\n" +
            "})( {\n" +
            $cene.arrMap( topLevelVars, function ( va ) {
                if ( !/^[_$a-zA-Z][_$a-zA-Z01-9]*$/.test( va ) )
                    throw new Error();
                if ( va === "this" || va === "arguments" )
                    throw new Error();
                
                // We raise an error if the function bodies we need
                // wouldn't usually compile (particularly if the
                // variable name is a reserved word).
                Function( "return " + va + ";" );
                Function( "" + va + " = arguments[ 0 ];" );
                
                return (
                    "" + _.jsStr( "|" + va ) + ": {\n" +
                    "    get: function () {\n" +
                    "        return " + va + ";\n" +
                    "    },\n" +
                    "    set: function () {\n" +
                    "        " + va + " = arguments[ 0 ];\n" +
                    "    }\n" +
                    "}"
                );
            } ).join( ",\n" ) + "\n" +
            "} );\n"
        );
    }
    
    var ceneApiUsingDefNs =
        $cene.ceneApiUsingFuncDefNs( namespaceDefs, funcDefNs, {
            defer: function ( body ) {
                _.defer( body );
            },
            cliArguments: function () {
                return cliArgs;
            },
            cliInputDirectory: function () {
                return {
                    logicalPath: [ "in-root" ],
                    fsPath: resolvedIn
                };
            },
            cliOutputDirectory: function () {
                return {
                    logicalPath: [ "out-root" ],
                    fsPath: resolvedOut
                };
            },
            inputPathGet: function ( inputPath, name ) {
                return pathGet( inputPath, name );
            },
            inputPathType: function ( inputPath ) {
                return recordMemo(
                    memoInputPathType, inputPath.logicalPath,
                    function () {
                    
                    if ( inputPath.fsPath === null
                        || !fs.existsSync( inputPath.fsPath ) )
                        return { type: "missing" };
                    
                    var stat = fs.statSync( inputPath.fsPath );
                    if ( stat.isDirectory() )
                        return { type: "directory" };
                    else if ( stat.isFile() )
                        return { type: "blob" };
                    else
                        throw new Error();
                } );
            },
            inputPathDirectoryList: function ( inputPath ) {
                return recordMemo(
                    memoInputPathDirectoryList, inputPath.logicalPath,
                    function () {
                    
                    if ( inputPath.fsPath === null )
                        throw new Error();
                    return fs.readdirSync( inputPath.fsPath );
                } );
            },
            inputPathBlobUtf8: function ( inputPath ) {
                return recordMemo(
                    memoInputPathBlobUtf8, inputPath.logicalPath,
                    function () {
                    
                    if ( inputPath === null )
                        throw new Error();
                    return fs.readFileSync(
                        inputPath.fsPath, "utf-8" );
                } );
            },
            outputPathGet: function ( outputPath, name ) {
                return pathGet( outputPath, name );
            },
            outputPathDirectory: function ( outputPath ) {
                recordMemoForEnsureDir( outputPath.logicalPath );
                
                if ( outputPath.fsPath === null )
                    return;
                ensureDirSync( outputPath.fsPath );
            },
            outputPathBlobUtf8:
                function ( outputPath, outputString ) {
                
                if ( memoOutputPathDirectory.has(
                    outputPath.logicalPath ) )
                    throw new Error();
                if ( memoOutputPathBlobUtf8.has(
                    outputPath.logicalPath ) )
                    throw new Error();
                
                if ( outputPath.logicalPath[ 0 ] === "get" )
                    recordMemoForEnsureDir(
                        outputPath.logicalPath[ 2 ] );
                memoOutputPathBlobUtf8.set(
                    outputPath.logicalPath, true );
                
                if ( outputPath.fsPath === null )
                    return;
                var resolvedPath = $path.resolve( outputPath.fsPath );
                ensureDirSync( $path.dirname( resolvedPath ) );
                fs.writeFileSync(
                    resolvedPath, outputString, "utf-8" );
            },
            sloppyJavaScriptProgram:
                function ( cexpr, topLevelVars ) {
                
                function renderMap( map ) {
                    var result = "jsnMap()\n"
                    map.each( function ( k, v ) {
                        result += ".plusEntry( " +
                            $cene.jsJson( k ) + ", " +
                            $cene.jsJson( v ) + " )\n"
                    } );
                    return result;
                }
                
                return addTopLevelVars( topLevelVars,
                    readInternalFiles( [
                        "src/era-misc-strmap-avl.js",
                        "src/era-misc.js",
                        "src/era-reader.js",
                        "src/era-code-gen-js.js",
                        "src/cene-runtime.js",
                        "src/cene-api.js"
                    ] ) + "\n" +
                    "\n" +
                    "entrypointCallWithSyncJavaScriptMode( " +
                        jsJsn( cliArgs ) + ",\n" +
                        "topLevelVars,\n" +
                        
                        "[ " +
                        $cene.arrMap( textOfFiles, function ( text ) {
                            return _.jsStr( text );
                        } ).join( ", " ) +
                        " ],\n" +
                        "\n" +
                        renderMap( memoInputPathType ) + ",\n" +
                        renderMap( memoInputPathDirectoryList
                            ) + ",\n" +
                        renderMap( memoInputPathBlobUtf8 ) + ",\n" +
                        "\n" +
                        
                        // funcDefs
                        "[],\n" +
                        
                        "\n" +
                        cexprToCode( cexpr, function ( constructor ) {
                            return constructor;
                        } ) + "\n" +
                    ");\n" );
            },
            pickyJavaScriptProgram: function ( cexpr, topLevelVars ) {
                
                var cexprsToVisit = [ cexpr ];
                var constructorsSeen = $cene.strMap();
                var constructorsToVisit = [];
                var constructorImpls = $cene.strMap();
                var casesToVisit = [];
                var nextMinifiedMainTagNameNumber = 0;
                
                var visitor = {};
                visitor.addConstructor = function ( flatTag ) {
                    if ( constructorsSeen.has( flatTag ) )
                        return;
                    
                    constructorsSeen.set( flatTag, flatTag );
                    if ( shouldMinify ) {
                        var parsed = JSON.parse( flatTag );
                        var mainTagName = parsed[ 0 ];
                        if ( mainTagName[ 0 ] !== "n:main-core" ) {
                            constructorsSeen.set( flatTag,
                                JSON.stringify( [
                                    "" + nextMinifiedMainTagNameNumber,
                                    _.arrMap( parsed[ 1 ], function ( ignored, i ) {
                                        return "" + i;
                                    } )
                                ] ) );
                            nextMinifiedMainTagNameNumber++;
                        }
                    }
                    
                    constructorsToVisit.push( flatTag );
                    casesToVisit = $cene.arrKeep( casesToVisit,
                        function ( caseToVisit ) {
                        
                        if ( caseToVisit.flatTag === flatTag )
                            cexprsToVisit.push(
                                caseToVisit.then );
                        return caseToVisit.flatTag !== flatTag;
                    } );
                };
                visitor.addCase = function ( flatTag, then ) {
                    if ( constructorsSeen.has( flatTag ) )
                        cexprsToVisit.push( then );
                    else
                        casesToVisit.push(
                            { flatTag: flatTag, then: then } );
                };
                
                while ( true ) {
                    while ( cexprsToVisit.length !== 0 ) {
                        cexprsToVisit.shift().visitForCodePruning(
                            visitor );
                    }
                    if ( constructorsToVisit.length === 0 )
                        break;
                    var flatTag = constructorsToVisit.shift();
                    var implCexpr =
                        $cene.getFunctionImplementationCexprByFlatTag(
                            namespaceDefs, funcDefNs, flatTag );
                    if ( implCexpr !== null ) {
                        cexprsToVisit.push( implCexpr );
                        constructorImpls.set( flatTag, implCexpr );
                    }
                }
                
                var funcDefs = [];
                constructorImpls.each( function ( flatTag, cexpr ) {
                    funcDefs.push( "funcDefForEntrypoint( " +
                        _.jsStr( constructorsSeen.get( flatTag ) ) +
                        ", " +
                        cexprToCode( cexpr, function ( constructor ) {
                            return constructorsSeen.get(
                                constructor );
                        } ) + " )" );
                } );
                
                return addTopLevelVars( topLevelVars,
                    readInternalFiles( [
                        "src/era-misc-strmap-avl.js",
                        "src/era-misc.js",
                        
                        // NOTE: By commenting these out, we save on
                        // file size. Some parts of the code end up
                        // referring to global variables that don't
                        // exist, but those parts should all be
                        // unreachable at run time anyway.
//                        "src/era-reader.js",
//                        "src/era-code-gen-js.js",
                        
                        "src/cene-runtime.js",
                        "src/cene-api.js"
                    ] ) + "\n" +
                    "\n" +
                    "entrypointCallWithSyncJavaScriptMode( " +
                        
                        // cliArguments
                        "[], " +
                        
                        "topLevelVars, " +
                        
                        // textOfFiles
                        "[], " +
                        
                        // inputPathType
                        "jsnMap(), " +
                        
                        // inputPathDirectoryList
                        "jsnMap(), " +
                        
                        // inputPathBlobUtf8
                        "jsnMap(),\n" +
                        
                        "[\n" +
                        funcDefs.join( ",\n" ) + "\n" +
                        "],\n" +
                        
                        cexprToCode( cexpr, function ( constructor ) {
                            return constructorsSeen.get(
                                constructor );
                        } ) + " );\n" );
            },
            onceDependenciesComplete: function ( listener ) {
                onceDependenciesCompleteListeners.push( listener );
            },
            getTopLevelVar: function ( varName ) {
                throw new Error();
            },
            setTopLevelVar: function ( varName, val ) {
                throw new Error();
            }
        } );
    
    usingDefNs.addCoreMacros(
        namespaceDefs, nss.definitionNs, funcDefNs );
    usingDefNs.processCoreStructs( namespaceDefs, nss.definitionNs );
    ceneApiUsingDefNs.addCeneApi( nss.definitionNs, funcDefNs );
    
    usingDefNs.runTopLevelTryExprsSync( namespaceDefs, nss,
        [].concat( codeOfFiles, codeOfTestFiles ) );
    $cene.arrEach( onceDependenciesCompleteListeners,
        function ( listener ) {
        
        listener();
    } );
    
    var stopMillis = new Date().getTime();
    if ( displayTimeInfo ) {
        console.log(
            "Ran for " + (stopMillis - startMillis) / 1000 + " " +
            "seconds, broken down as follows:" );
        console.log(
            "- Spent " + (readMillis - startMillis) / 1000 + " " +
            "seconds reading the code." );
        console.log(
            "- Spent " + (stopMillis - readMillis) / 1000 + " " +
            "seconds processing it." );
    }
    
    return usingDefNs.rt.anyTestFailed;
}

var preludeFilenamesShort = [
    "prelude-util.cene"
];

var preludeFiles = _.arrMap( preludeFilenamesShort,
    function ( filenameShort ) {
    
    return $path.resolve( __dirname, "src/" + filenameShort );
} );

exports.preludeFiles = preludeFiles;

exports.runCeneSync = function ( files, opt_opts ) {
    var opts = _.opt( opt_opts ).or( {
        args: [],
        in: null,
        out: null,
        minify: false
    } ).bam();
    
    if ( !(_.likeArray( files )
        && _.arrAll( files, function ( file ) {
            return typeof file === "string";
        } )) )
        throw new Error();
    if ( !(_.likeArray( opts.args )
        && _.arrAll( opts.args, function ( arg ) {
            return typeof arg === "string";
        } )) )
        throw new Error();
    if ( !(opts.in === null || typeof opts.in === "string") )
        throw new Error();
    if ( !(opts.out === null || typeof opts.out === "string") )
        throw new Error();
    if ( typeof opts.minify !== "boolean" )
        throw new Error();
    
    runCeneSync( files, [], !"displayTimeInfo",
        opts.args, opts.in, opts.out, opts.minify );
};


if ( require.main === module ) {


var argParser = new argparse.ArgumentParser( {
    add_help: true,
    description: "The Cene programming language."
} );
argParser.add_argument( "-v", "--version", {
    action: "version",
    version: pkg.version
} );

// Primary interface
argParser.add_argument( "-i", "--in", {
    action: "store",
    help: "The file path to use as input, if any."
} );
argParser.add_argument( "-o", "--out", {
    action: "store",
    help: "The file path to use as output, if any."
} );
argParser.add_argument( "-m", "--minify", {
    action: "store_true",
    help: "Minify any generated JavaScript files."
} );
argParser.add_argument( "file", {
    nargs: "?",
    help: "The path to a Cene file to execute."
} );
argParser.add_argument( "args", {
    nargs: "*",
    help: "Additional arguments to pass to the Cene program."
} );

// Development interface
argParser.add_argument( "-c", "--demo-cene", {
    action: "store_true",
    help: "Compile dependencies of demos/cene.html."
} );
argParser.add_argument( "-E", "--test-era", {
    action: "store_true",
    help: "Era reader: Run unit tests."
} );
argParser.add_argument( "-C", "--test-cene", {
    action: "store_true",
    help: "Run a demo as a batch process."
} );

var args = argParser.parse_args();

var shouldExitWithErrorCode = false;
var tasks = [];


if ( args.test_era ) tasks.push( function ( then ) {
    var $test = Function(
        readInternalFiles( [
            "src/era-misc-strmap-avl.js",
            "src/era-misc.js",
            "test/harness-first.js",
            "src/era-reader.js",
            "test/test-reader.js",
            "test/harness-last.js"
        ] ) + "\n" +
        "\n" +
        "\n" +
        "return {\n" +
        "    runHarness: runHarness\n" +
        "};\n"
    )();
    
    $test.runHarness( function ( anyTestFailed ) {
        if ( anyTestFailed )
            shouldExitWithErrorCode = true;
        
        process.nextTick( function () {
            then();
        } );
    } );
} );


if ( args.demo_cene ) tasks.push( function ( then ) {
    arrEachAsyncNodeExn( [].concat(
        _.arrMap( preludeFilenamesShort, function ( name ) {
            return { dir: "src/", name: name };
        } ),
    [
        { dir: "lib-cene/", name: "quasiquote.cene" },
        { dir: "test/", name: "test.cene" }
    ] ), function ( i, file, then ) {
        ltf.readTextFile(
            $path.resolve( __dirname, file.dir + file.name ), "utf-8",
            function ( e, text ) {
            
            if ( e ) return void then( e );
            if ( text === null ) return void then( new Error() );
            
            ltf.writeTextFile(
                $path.resolve( __dirname,
                    "fin/" + file.name + ".js" ),
                "utf-8",
                "\"use strict\";\n" +
                "var eraPlatform = eraPlatform || {};\n" +
                "eraPlatform.ceneFiles = " +
                    "eraPlatform.ceneFiles || {};\n" +
                "eraPlatform.ceneFiles[ " +
                    _.jsStr( file.name ) + " ] =\n" +
                _.jsStr( text ) + ";\n",
                then );
        } );
    }, function ( e ) {
        if ( e ) return void then( e );
        
        console.log(
            "Copied Cene files to fin/ as JavaScript files." );
        then();
    } );
} );

if ( args.test_cene ) tasks.push( function ( then ) {
    var anyTestFailed =
        runCeneSync( preludeFiles,
            [ "lib-cene/quasiquote.cene", "test/test.cene" ],
            !!"displayTimeInfo", [], null, null, !"shouldMinify" );
    
    if ( anyTestFailed )
        shouldExitWithErrorCode = true;
    
    process.nextTick( function () {
        then();
    } );
} );

if ( args.file !== void 0 ) tasks.push( function ( then ) {
    var inRoot = args.in === void 0 ? null : args.in;
    var outRoot = args.out === void 0 ? null : args.out;
    var anyTestFailed =
        runCeneSync( preludeFiles.concat( [ args.file ] ), [],
            !!"displayTimeInfo", args.args, inRoot, outRoot,
            args.minify );
    
    if ( anyTestFailed )
        shouldExitWithErrorCode = true;
    
    process.nextTick( function () {
        then();
    } );
} );


if ( tasks.length === 0 ) {
    argParser.print_help();
} else {
    arrEachAsyncNodeExn( tasks, function ( i, task, then ) {
        task( then );
    }, function ( e ) {
        if ( e ) throw e;
        
        if ( shouldExitWithErrorCode ) {
            console.log( "" );
            console.log( "   *** Tests failed. ***" );
            console.log( "" );
            process.exitCode = 1;
        } else {
            // Do nothing.
        }
    } );
}


}
