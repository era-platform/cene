// cene-quiner.js
// Copyright 2016, 2017 Ross Angle. Released under the MIT License.
"use strict";

var quinerCliArguments = [];
var quinerTextOfFiles = [];
var quinerInputPathType = jsnMap();
var quinerInputPathDirectoryList = jsnMap();
var quinerInputPathBlobUtf8 = jsnMap();
// TODO: See if we actually need to do quines at JavaScript run time.
// It's at least nice to have `quinerQuine` around just in case.
var quinerQuine = null;
var quinerTopLevelVars = null;

var quinerFuncDefs = [];

function quinerAddFuncDef( flatTag, calculateFuncImpl ) {
    quinerFuncDefs.push( function ( rawMode, funcDefNs ) {
        collectPutDefinedValue( rawMode,
            getFunctionImplementationEntryDefinerByFlatTag(
                funcDefNs, flatTag ),
            new SinkForeign( "native-definition", {
                cexpr: null,
                func: function ( rt, func, arg ) {
                    return macLookupThen( calculateFuncImpl( rt ),
                        function ( impl ) {
                        
                        return callSinkMulti( rt, impl, func, arg );
                    } );
                }
            } ) );
    } );
}

function quinerCallWithSyncJavaScriptMode( calculateFunc ) {
    var codeOfFiles = arrMappend( quinerTextOfFiles,
        function ( text ) {
        
        return readAll( { locationHostType: "top-level" }, text );
    } );
    
    var nss = {
        uniqueNs: sinkNsGet( "unique-ns", sinkNsRoot() ),
        definitionNs: sinkNsGet( "definition-ns", sinkNsRoot() ),
        qualify: rootQualify
    };
    var funcDefNs =
        sinkNsGet( "function-implementations-ns", sinkNsRoot() );
    
    var usingDefNs = usingFuncDefNs( funcDefNs );
    
    function defer( body ) {
        // TODO: Improve this.
        setTimeout( function () {
            body();
        }, 0 );
    }
    
    var namespaceDefs = jsnMap();
    
    var ceneApiUsingDefNs =
        ceneApiUsingFuncDefNs( namespaceDefs, funcDefNs, {
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
            sloppyJavaScriptQuine: function ( cexpr, topLevelVars ) {
                return null;
            },
            pickyJavaScriptQuine: function ( cexpr, topLevelVars ) {
                return null;
            },
            onceDependenciesComplete: function ( listener ) {
                // Do nothing.
            },
            getTopLevelVar: function ( varName ) {
                var k = "|" + varName;
                if ( !hasOwn( quinerTopLevelVars, k ) )
                    throw new Error();
                return quinerTopLevelVars[ k ].get();
            },
            setTopLevelVar: function ( varName, val ) {
                var k = "|" + varName;
                if ( !hasOwn( quinerTopLevelVars, k ) )
                    throw new Error();
                return quinerTopLevelVars[ k ].set( val );
            }
        } );
    
    usingDefNs.addCoreMacros(
        namespaceDefs, nss.definitionNs, funcDefNs );
    usingDefNs.processCoreStructs( namespaceDefs, nss.definitionNs );
    ceneApiUsingDefNs.addCeneApi( nss.definitionNs, funcDefNs );
    
    var dummyMode = usingDefNs.makeDummyMode();
    arrEach( quinerFuncDefs, function ( funcDef, i ) {
        funcDef( dummyMode, funcDefNs );
    } );
    usingDefNs.commitDummyMode( namespaceDefs, dummyMode );
    
    runTopLevelMacLookupsSync( namespaceDefs, usingDefNs.rt,
        [].concat(
        
        usingDefNs.topLevelTryExprsToMacLookupThreads( nss,
            codeOfFiles ),
        [ { type: "jsEffectsThread", macLookupEffectsOfJsEffects:
            macLookupThen( calculateFunc( usingDefNs.rt ),
                function ( func ) {
                
                return func.callSink( usingDefNs.rt,
                    new SinkForeign( "foreign",
                        ceneApiUsingDefNs.ceneClient ) );
            } ) } ]
    ) );
}
