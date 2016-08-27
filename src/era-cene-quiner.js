// era-cene-quiner.js
// Copyright 2016 Ross Angle. Released under the MIT License.
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

function quinerCallWithSyncJavaScriptMode( constructorTag ) {
    var codeOfFiles = arrMappend( quinerTextOfFiles,
        function ( text ) {
        
        return readAll( text );
    } );
    
    var nss = {
        definitionNs: stcNsGet( "definition-ns", stcNsRoot() ),
        uniqueNs: stcNsGet( "unique-ns", stcNsRoot() )
    };
    var funcDefNs =
        stcNsGet( "function-implementations-ns", stcNsRoot() );
    
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
            sloppyJavaScriptQuine:
                function ( constructorTag, topLevelVars ) {
                
                return null;
            },
            onDependenciesComplete: function ( listener ) {
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
    
    usingDefNs.stcAddCoreMacros(
        namespaceDefs, nss.definitionNs, funcDefNs );
    usingDefNs.processCoreStructs( namespaceDefs, nss.definitionNs );
    ceneApiUsingDefNs.addCeneApi( nss.definitionNs, funcDefNs );
    
    runTopLevelMacLookupsSync( namespaceDefs, usingDefNs.rt,
        [].concat(
        
        usingDefNs.topLevelTryExprsToMacLookupThreads( nss,
            codeOfFiles ),
        [ { type: "jsEffectsThread", macLookupEffectsOfJsEffects:
            new Stc(
                JSON.stringify( [ constructorTag, [] ] ),
                []
            ).callStc( usingDefNs.rt,
                new StcForeign( "foreign",
                    ceneApiUsingDefNs.ceneClient ) ) } ]
    ) );
}
