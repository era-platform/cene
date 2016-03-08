// era-cene-quiner.js
// Copyright 2016 Ross Angle. Released under the MIT License.
"use strict";

var quinerCliArguments = [];
var quinerTextOfFiles = [];
var quinerInputPathType = jsnMap();
var quinerInputPathDirectoryList = jsnMap();
var quinerInputPathBlobUtf8 = jsnMap();
// TODO: See if we actually need to do quines at JavaScript run time.
// It's at least nice to have this around just in case.
var quinerQuine = null;

function quinerCallWithSyncJavaScriptMode( constructorTag ) {
    var codeOfFiles = arrMap( quinerTextOfFiles, function ( text ) {
        return readAll( text );
    } );
    
    var nss = {
        definitionNs: stcNsGet( "definition-ns", stcNsRoot() ),
        uniqueNs: stcNsGet( "unique-ns", stcNsRoot() )
    };
    
    var usingDefNs = usingDefinitionNs( nss.definitionNs );
    
    function defer( body ) {
        // TODO: Improve this.
        setTimeout( function () {
            body();
        }, 0 );
    }
    
    var ceneApiUsingDefNs =
        ceneApiUsingDefinitionNs( nss.definitionNs, {
            defer: function ( body ) {
                defer( body );
            },
            cliArguments: function () {
                return quinerCliArguments;
            },
            cliInputDirectory: function () {
                return [ "in-root" ];
            },
            cliOutputDirectory: function () {
                return [ "out-root" ];
            },
            inputPathGet: function ( inputPath, name ) {
                return [ "get", name, inputPath ];
            },
            inputPathType: function ( inputPath ) {
                if ( !quinerInputPathType.has( inputPath ) )
                    throw new Error();
                return quinerInputPathType.get( inputPath );
            },
            inputPathDirectoryList: function ( inputPath ) {
                if ( !quinerInputPathDirectoryList.has( inputPath ) )
                    throw new Error();
                return quinerInputPathDirectoryList.get( inputPath );
            },
            inputPathBlobUtf8: function ( inputPath ) {
                if ( !quinerInputPathBlobUtf8.has( inputPath ) )
                    throw new Error();
                return quinerInputPathBlobUtf8.get( inputPath );
            },
            outputPathGet: function ( outputPath, name ) {
                return [ "get", name, outputPath ];
            },
            outputPathDirectory: function ( outputPath ) {
                // Do nothing.
            },
            outputPathBlobUtf8:
                function ( outputPath, outputString ) {
                
                // Do nothing.
            },
            sloppyJavaScriptQuine: function ( constructorTag ) {
                return null;
            },
            onDependenciesComplete: function ( listener ) {
                // Do nothing.
            }
        } );
    
    usingDefNs.stcAddCoreMacros( nss.definitionNs );
    usingDefNs.processCoreTypes( nss.definitionNs );
    ceneApiUsingDefNs.addCeneApi( nss.definitionNs );
    
    function runCode( code ) {
        return !arrAny( code, function ( tryExpr ) {
            if ( !tryExpr.ok ) {
                console.error( tryExpr.msg );
                return true;
            }
            
            var deferred = [];
            
            function defer( body ) {
                deferred.push( body );
            }
            function createNextMode( rawMode ) {
                // NOTE: This comment is here in case we do a search
                // for mode inside quotes.
                //
                // "mode"
                //
                return {
                    type: "macro",
                    finished: null,
                    current: true,
                    safe: [],
                    defer: []
                };
            }
            var rawMode = createNextMode( null );
            var done = false;
            usingDefNs.macroexpandTopLevel( nssGet( nss, "first" ),
                rawMode,
                usingDefNs.readerExprToStc( stcTrivialStxDetails(),
                    tryExpr.val ) );
            runTrampoline( rawMode, defer, createNextMode,
                function () {
                
                done = true;
            } );
            while ( deferred.length !== 0 )
                deferred.shift()();
            if ( !done )
                throw new Error( "Not done" );
            
            nss = nssGet( nss, "rest" );
            return false;
        } );
    }
    
    if ( arrAll( codeOfFiles, function ( code ) {
        return runCode( code );
    } ) ) {
        runAllDefs();
    } else {
        throw new Error();
    }
    
    function createNextMode( rawMode ) {
        return {
            type: "js",
            finished: null,
            current: true,
            safe: [],
            defer: [],
            managed: true
        };
    }
    var rawMode = createNextMode( null );
    var effects = new Stc(
        JSON.stringify(
            stcNameTupleTagAlreadySorted( constructorTag, [] ) ),
        []
    ).callStc( nss.definitionNs, new StcForeign( "mode", rawMode ) );
    if ( !(effects instanceof StcForeign
        && effects.purpose === "effects") )
        throw new Error();
    var effectsFunc = effects.foreignVal;
    effectsFunc( rawMode );
    runTrampoline( rawMode, defer, createNextMode, function () {
        // Do nothing.
    } );
}
