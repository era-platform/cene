// era-cene-quiner.js
// Copyright 2016 Ross Angle. Released under the MIT License.
"use strict";

var quinerCliArguments = [];
var quinerCliInputEnvironmentVariables = {};
var quinerTextOfFiles = [];
var quinerInputPathType = jsnMap();
var quinerInputPathDirectoryList = jsnMap();
var quinerInputPathBlobUtf8 = jsnMap();
// TODO: See if we actually need to do quines at JavaScript run time.
// It's at least nice to have this around just in case.
var quinerQuine = null;

function quinerCallWithSyncJavaScriptMode( constructorTag ) {
    var codeOfFiles = $stc.arrMap( textOfFiles, function ( text ) {
        return $stc.readAll( text );
    } );
    
    var nss = {
        definitionNs: stcNsGet( "definition-ns", stcNsRoot() ),
        uniqueNs: stcNsGet( "unique-ns", stcNsRoot() )
    };
    
    var usingDefNs = usingDefinitionNs( nss.definitionNs );
    
    var ceneApiUsingDefNs =
        ceneApiUsingDefinitionNs( nss.definitionNs, {
            defer: function ( body ) {
                _.defer( body );
            },
            cliArguments: function () {
                return quinerCliArguments;
            },
            cliInputEnvironmentVariables: function () {
                return quinerCliInputEnvironmentVariables;
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
            
            // NOTE: This comment is here in case we do a search for
            // mode inside quotes.
            //
            // "mode"
            //
            var rawMode = {
                type: "macro",
                finished: null,
                current: true,
                safe: [],
                defer: []
            };
            usingDefNs.macroexpandTopLevel( nssGet( nss, "first" ),
                rawMode,
                usingDefNs.readerExprToStc( stcTrivialStxDetails(),
                    tryExpr.val ) );
            runTrampoline( rawMode, function ( body ) {  // defer
                _.defer( body );
            }, function ( rawMode ) {  // createNextMode
                return {
                    type: "macro",
                    finished: null,
                    current: true,
                    safe: [],
                    defer: []
                };
            } );
            
            nss = nssGet( nss, "rest" );
            return false;
        } );
    }
    
    if ( arrAll( codeOfFiles, function ( code ) {
        return runCode( code );
    } ) ) {
        $stc.runAllDefs();
    } else {
        throw new Error();
    }
    
    var rawMode = {
        type: "js",
        finished: null,
        current: true,
        safe: [],
        defer: [],
        managed: true
    };
    new Stc( JSON.stringify( [ constructorTag, [] ] ), [] ).
        callStc( nss.definitionNs,
            new StcForeign( "mode", rawMode ) );
    $stc.runTrampoline( rawMode, function ( body ) {  // defer
        _.defer( body );
    }, function ( rawMode ) {  // createNextMode
        return {
            type: "js",
            finished: null,
            current: true,
            safe: [],
            defer: [],
            managed: true
        };
    } );
}
