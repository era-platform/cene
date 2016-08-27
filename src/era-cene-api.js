// era-cene-api.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.


var builtInApiStructsToAdd = [];

builtInStructAccumulator.val = builtInApiStructsToAdd;

var stcEncapsulatedString =
    builtInStruct( "encapsulated-string", "val" );
var stcFileTypeDirectory = builtInStruct( "file-type-directory" );
var stcFileTypeBlob = builtInStruct( "file-type-blob" );
var stcFileTypeMissing = builtInStruct( "file-type-missing" );

builtInStructAccumulator.val = null;

function ceneApiUsingFuncDefNs( namespaceDefs, funcDefNs, apiOps ) {
    
    var usingDefNs = usingFuncDefNs( funcDefNs );
    
    
    // Returns a function with a very boring .toString() result. We
    // use this to avoid sharing implementation details.
    function boringfn( func ) {
        function _( self, args ) {
            return func.apply( self, args );
        }
        return function(){return _(this, arguments)};
    }
    
    
    // Rationale:
    //
    // Implementing sealed values in JavaScript is a challenge.
    // WeakMap isn't widely supported yet, and it might have poor
    // performance even if it were. Symbol-named properties are even
    // worse; not only are they not widely supported, but they don't
    // even protect against scenarios involving Proxy objects. While
    // we might want to use WeakMap someday, for now we use closures
    // for privacy.
    //
    // We carefully invoke the closures at deterministic and boring
    // times, with no input, so that we don't expose any
    // implementation details. (If we need to pass values to the
    // function in a future version, we can do so by mutating
    // variables it captures.)
    //
    // When we invoke a wrapped value as a function to unwrap it, we
    // can't trust the result right away. We need to check it first,
    // but we can't perform most operations on it since it might be a
    // Proxy. So, we make the function have the side effect of
    // mutating another variable. That way, we know from the fact that
    // the variable is modified at all that the function must have
    // been created in this lexical scope, so we can trust it. As long
    // as we're modifying a variable, we ignore the function's result
    // altogether and just put the unwrapped value into that variable.
    
    var unwrappingResult = null;
    
    function wrapPrivate( unwrappedVal ) {
        return boringfn( function () {
            unwrappingResult = unwrappedVal;
        } );
    }
    
    function unwrapPrivate( wrappedVal ) {
        unwrappingResult = null;
        wrappedVal();
        if ( unwrappingResult === null )
            throw new Error();
        var result = unwrappingResult;
        unwrappingResult = null;
        return result;
    }
    
    function wrapTagged( tag ) {
        return function ( unwrappedVal ) {
            return wrapPrivate( { type: tag, val: unwrappedVal } );
        };
    }
    
    function unwrapTagged( tag ) {
        return function ( wrappedVal ) {
            var result = unwrapPrivate( wrappedVal );
            if ( result.type !== tag )
                throw new Error();
            return result.val;
        };
    }
    
    var wrapCene = wrapTagged( "cene" );
    var unwrapCene = unwrapTagged( "cene" );
    
    
    function eachConsList( list, body ) {
        for ( var e = list;
            stcCons.tags( e );
            e = stcCons.getProj( e, "cdr" )
        ) {
            body( stcCons.getProj( e, "car" ) );
        }
        if ( !stcNil.tags( e ) )
            throw new Error();
    }
    function mapConsListToArr( list, func ) {
        var result = [];
        eachConsList( list, function ( elem ) {
            result.push( func( elem ) );
        } );
        return result;
    }
    
    function runJsEffects( effects ) {
        if ( !(effects instanceof StcForeign
            && effects.purpose === "js-effects") )
            throw new Error();
        var effectsFunc = effects.foreignVal;
        return effectsFunc();
    }
    function simpleEffects( body ) {
        return new StcForeign( "effects", function ( rawMode ) {
            collectDefer( rawMode, {}, function ( rawMode ) {
                body( rawMode );
                return macLookupRet( new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    // Do nothing.
                    
                    return macLookupRet( stcNil.ofNow() );
                } ) );
            } );
            return macLookupRet( stcNil.ofNow() );
        } );
    }
    
    function deferAndRunMacLookup( body ) {
        apiOps.defer( function () {
            runTopLevelMacLookupsSync( namespaceDefs, usingDefNs.rt,
                [ {
                
                type: "jsEffectsThread",
                macLookupEffectsOfJsEffects:
                    macLookupThen( body(), function ( ignored ) {
                        return new StcForeign( "js-effects",
                            function () {
                            
                            return macLookupRet( stcNil.ofNow() );
                        } );
                    } )
            } ] );
        } );
    }
    
    
    var ceneClient = {};
    ceneClient.getTopLevelVar = boringfn( function ( varName ) {
        return apiOps.getTopLevelVar( varName );
    } );
    ceneClient.setTopLevelVar = boringfn( function ( varName, val ) {
        return apiOps.setTopLevelVar( varName, val );
    } );
    ceneClient.wrap = boringfn( function ( jsVal ) {
        return wrapCene( new StcForeign( "foreign", jsVal ) );
    } );
    ceneClient.maybeUnwrap = boringfn( function ( wrappedVal ) {
        var ceneVal = unwrapCene( wrappedVal );
        return (ceneVal instanceof StcForeign
            && ceneVal.purpose === "foreign"
        ) ? { val: ceneVal.foreignVal } : null;
    } );
    ceneClient.done = boringfn( function ( result ) {
        var unwrappedResult = unwrapCene( result );
        return wrapCene( new StcForeign( "js-effects", function () {
            return macLookupRet( unwrappedResult );
        } ) );
    } );
    ceneClient.then = boringfn( function ( effects, then ) {
        var effectsInternal = unwrapCene( effects );
        if ( !(effectsInternal instanceof StcForeign
            && effectsInternal.purpose === "js-effects") )
            throw new Error();
        var effectsFunc = effectsInternal.foreignVal;
        
        return wrapCene( new StcForeign( "js-effects", function () {
            return macLookupThen( effectsFunc(),
                function ( intermediate ) {
                
                return runJsEffects(
                    unwrapCene( then( wrapCene( intermediate ) ) ) );
            } );
        } ) );
    } );
    ceneClient.giveSync = boringfn( function ( val, ceneThen ) {
        var valUnwrapped = unwrapCene( val );
        var ceneThenUnwrapped = unwrapCene( ceneThen );
        
        return wrapCene( new StcForeign( "js-effects", function () {
            return macLookupThen(
                ceneThenUnwrapped.callStc( usingDefNs.rt,
                    valUnwrapped ),
                function ( effects ) {
                
                return runJsEffects( effects );
            } );
        } ) );
    } );
    ceneClient.giveAsync = boringfn( function ( val, ceneThen ) {
        var valUnwrapped = unwrapCene( val );
        var ceneThenUnwrapped = unwrapCene( ceneThen );
        
        return wrapCene( new StcForeign( "js-effects", function () {
            deferAndRunMacLookup( function () {
                return macLookupThen(
                    ceneThenUnwrapped.callStc( usingDefNs.rt,
                        valUnwrapped ),
                    function ( jsEffects ) {
                    
                    deferAndRunMacLookup( function () {
                        return runJsEffects( jsEffects );
                    } );
                    
                    return macLookupRet( stcNil.ofNow() );
                } );
            } );
            return macLookupRet( stcNil.ofNow() );
        } ) );
    } );
    ceneClient.defer = boringfn( function ( body ) {
        deferAndRunMacLookup( function () {
            return runJsEffects( body() );
        } );
    } );
    
    function addCeneApi( targetDefNs, funcDefNs ) {
        var dummyMode = usingDefNs.makeDummyMode();
        
        function fun( name, body ) {
            var sourceMainTagName =
                stcForeignStrFromJs( name ).getName();
            var repMainTagName = [ "n:main-core", name ];
            var constructorTagName =
                stcNameConstructorTagAlreadySorted(
                    repMainTagName, [] );
            addFunctionNativeDefinition(
                funcDefNs, dummyMode, constructorTagName,
                function ( rt, funcVal, argVal ) {
                
                return macLookupRet( body( rt, argVal ) );
            } );
            usingDefNs.processDefStruct( targetDefNs, dummyMode,
                sourceMainTagName, repMainTagName, [] );
        }
        
        function parseString( string ) {
            if ( !(string instanceof StcForeign
                && string.purpose === "string") )
                throw new Error();
            return string.foreignVal;
        }
        function unparseNonUnicodeString( string ) {
            if ( typeof string !== "string" )
                throw new Error();
            return stcForeignStrFromJs( toValidUnicode( string ) );
        }
        function parsePossiblyEncapsulatedString( string ) {
            if ( string instanceof StcForeign
                && string.purpose === "string" ) {
                var result = parseString( string ).jsStr;
                return function () {
                    return result;
                };
            } else if ( stcEncapsulatedString.tags( string ) ) {
                var stringInternal =
                    stcEncapsulatedString.getProj( string, "val" );
                if ( !(stringInternal instanceof StcForeign
                    && stringInternal.purpose ===
                        "encapsulated-string") )
                    throw new Error();
                return stringInternal.foreignVal;
            } else {
                throw new Error();
            }
        }
        
        function stcFnPure( func ) {
            return new StcFn( function ( rt, arg ) {
                return macLookupRet( func( rt, arg ) );
            } );
        }
        
        function rawModeSupportsObserveCli( rawMode ) {
            return isMacroOrUnitTestRawMode( rawMode );
        }
        function rawModeSupportsContributeCli( rawMode ) {
            return isMacroRawMode( rawMode );
        }
        
        arrEach( builtInApiStructsToAdd, function ( entry ) {
            usingDefNs.processDefStruct( targetDefNs, dummyMode,
                entry.sourceMainTagName, entry.repMainTagName,
                entry.projSourceToRep );
        } );
        
        fun( "cli-arguments", function ( rt, mode ) {
            assertMode( rawModeSupportsObserveCli, mode );
            
            var args = apiOps.cliArguments();
            return usingDefNs.stcArrayToConsList(
                arrMap( args, function ( arg ) {
                    return unparseNonUnicodeString( arg );
                } ) );
        } );
        
        fun( "cli-input-directory", function ( rt, mode ) {
            assertMode( rawModeSupportsObserveCli, mode );
            
            return new StcForeign( "input-path",
                apiOps.cliInputDirectory() );
        } );
        
        fun( "cli-output-directory", function ( rt, mode ) {
            assertMode( rawModeSupportsObserveCli, mode );
            
            return new StcForeign( "output-path",
                apiOps.cliOutputDirectory() );
        } );
        
        fun( "input-path-get", function ( rt, inputPath ) {
            return stcFnPure( function ( rt, name ) {
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                var nameInternal = parseString( name ).jsStr;
                
                return new StcForeign( "input-path",
                    apiOps.inputPathGet(
                        inputPath.foreignVal, nameInternal ) );
            } );
        } );
        
        fun( "input-path-type", function ( rt, mode ) {
            return stcFnPure( function ( rt, inputPath ) {
                assertMode( rawModeSupportsObserveCli, mode );
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                var type =
                    apiOps.inputPathType( inputPath.foreignVal );
                if ( type.type === "directory" )
                    return stcFileTypeDirectory.ofNow();
                else if ( type.type === "blob" )
                    return stcFileTypeBlob.ofNow();
                else if ( type.type === "missing" )
                    return stcFileTypeMissing.ofNow();
                else
                    throw new Error();
            } );
        } );
        
        fun( "input-path-directory-list", function ( rt, mode ) {
            return stcFnPure( function ( rt, inputPath ) {
                assertMode( rawModeSupportsObserveCli, mode );
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                return usingDefNs.stcArrayToConsList(
                    arrMap(
                        apiOps.inputPathDirectoryList(
                            inputPath.foreignVal ),
                        function ( basename ) {
                        
                        return unparseNonUnicodeString( basename );
                    } ) );
            } );
        } );
        
        fun( "input-path-blob-utf-8", function ( rt, mode ) {
            return stcFnPure( function ( rt, inputPath ) {
                assertMode( rawModeSupportsObserveCli, mode );
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                return unparseNonUnicodeString(
                    apiOps.inputPathBlobUtf8(
                        inputPath.foreignVal ) );
            } );
        } );
        
        fun( "output-path-get", function ( rt, outputPath ) {
            return stcFnPure( function ( rt, name ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var nameInternal = parseString( name ).jsStr;
                
                return new StcForeign( "output-path",
                    apiOps.outputPathGet(
                        outputPath.foreignVal, nameInternal ) );
            } );
        } );
        
        fun( "output-path-directory", function ( rt, outputPath ) {
            if ( !(outputPath instanceof StcForeign
                && outputPath.purpose === "output-path") )
                throw new Error();
            
            return simpleEffects( function ( rawMode ) {
                assertRawMode(
                    rawModeSupportsContributeCli, rawMode );
                apiOps.outputPathDirectory( outputPath.foreignVal );
            } );
        } );
        
        fun( "output-path-blob-utf-8", function ( rt, outputPath ) {
            return stcFnPure( function ( rt, outputString ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var getContent =
                    parsePossiblyEncapsulatedString( outputString );
                
                return simpleEffects( function ( rawMode ) {
                    assertRawMode(
                        rawModeSupportsContributeCli, rawMode );
                    
                    // TODO: Figure out if we actually need
                    // onceDependenciesComplete. We were already using
                    // defer to run these write effects after the read
                    // effects.
//                    apiOps.onceDependenciesComplete( function () {
                        apiOps.outputPathBlobUtf8(
                            outputPath.foreignVal, getContent() );
//                    } );
                } );
            } );
        } );
        
        fun( "cli-output-environment-variable-shadow",
            function ( rt, key ) {
            
            return stcFnPure( function ( rt, value ) {
                var keyInternal = parseString( key ).jsStr;
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    // TODO: Document the namespace path we're using
                    // for this,
                    // /cli-output-environment-variable-shadows/<key>.
                    // Maybe we don't actually need this to be a
                    // built-in function.
                    collectPutDefined( rawMode,
                        nsToDefiner( rt,
                            stcNsGet( keyInternal,
                                stcNsGet(
                                    "cli-output-environment-variable-shadows",
                                    defNs ) ) ),
                        value );
                    return macLookupRet( stcNil.ofNow() );
                } );
            } );
        } );
        
        fun( "sloppy-javascript-quine", function ( rt, mode ) {
            return stcFnPure( function ( rt, constructorTag ) {
                return stcFnPure( function ( rt, topLevelVars ) {
                    
                    assertMode( rawModeSupportsObserveCli, mode );
                    
                    if ( !(constructorTag instanceof StcForeign
                        && constructorTag.purpose === "name") )
                        throw new Error();
                    
                    var dedupVars = [];
                    var dedupVarsMap = {};
                    eachConsList( topLevelVars, function ( va ) {
                        var vaInternal = parseString( va ).jsStr;
                        var k = "|" + vaInternal;
                        if ( dedupVarsMap[ k ] )
                            return;
                        dedupVarsMap[ k ] = true;
                        dedupVars.push( vaInternal );
                    } );
                    
                    return stcEncapsulatedString.ofNow(
                        new StcForeign( "encapsulated-string",
                            function () {
                                return apiOps.sloppyJavaScriptQuine(
                                    constructorTag.foreignVal,
                                    dedupVars );
                            } ) );
                } );
            } );
        } );
        
        fun( "string-to-javascript-utf-16", function ( rt, string ) {
            return new StcForeign( "foreign",
                parseString( string ).jsStr );
        } );
        
        fun( "javascript-utf-16-to-string", function ( rt, string ) {
            if ( !(string instanceof StcForeign
                && string.purpose === "foreign") )
                throw new Error();
            
            return unparseNonUnicodeString( string.foreignVal );
        } );
        
        fun( "done-js-effects", function ( rt, result ) {
            return new StcForeign( "js-effects", function () {
                return macLookupRet( result );
            } );
        } );
        
        fun( "then-js-effects", function ( rt, jsEffects ) {
            return stcFnPure( function ( rt, then ) {
                if ( !(jsEffects instanceof StcForeign
                    && jsEffects.purpose === "js-effects") )
                    throw new Error();
                var effectsFunc = jsEffects.foreignVal;
                
                return new StcForeign( "js-effects", function () {
                    return macLookupThen( effectsFunc(),
                        function ( intermediate ) {
                        
                        return macLookupThen(
                            then.callStc( usingDefNs.rt,
                                intermediate ),
                            function ( jsEffects ) {
                            
                            return runJsEffects( jsEffects );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "give-unwrapped-js-effects", function ( rt, val ) {
            return stcFnPure( function ( rt, jsThen ) {
                
                if ( !(val instanceof StcForeign
                    && val.purpose === "foreign") )
                    throw new Error();
                var unwrappedVal = val.foreignVal;
                
                if ( !(jsThen instanceof StcForeign
                    && jsThen.purpose === "foreign") )
                    throw new Error();
                var then = jsThen.foreignVal;
                
                return new StcForeign( "js-effects", function () {
                    return runJsEffects(
                        unwrapCene( then( unwrappedVal ) ) );
                } );
            } );
        } );
        
        fun( "give-js-effects", function ( rt, val ) {
            return stcFnPure( function ( rt, jsThen ) {
                if ( !(jsThen instanceof StcForeign
                    && jsThen.purpose === "foreign") )
                    throw new Error();
                var then = jsThen.foreignVal;
                return new StcForeign( "js-effects", function () {
                    return runJsEffects(
                        unwrapCene( then( wrapCene( val ) ) ) );
                } );
            } );
        } );
        
        fun( "compile-function-js-effects", function ( rt, params ) {
            return stcFnPure( function ( rt, body ) {
                
                var paramsInternal = mapConsListToArr( params,
                    function ( param ) {
                        return parseString( param ).jsStr;
                    } );
                
                var bodyInternal = parseString( body ).jsStr;
                
                return new StcForeign( "js-effects", function () {
                    // TODO: Stop putting a potentially large array
                    // into an argument list like this.
                    return macLookupRet(
                        new StcForeign( "foreign",
                            Function.apply( null,
                                paramsInternal.concat(
                                    [ bodyInternal ] ) ) ) );
                } );
            } );
        } );
        
        usingDefNs.commitDummyMode( namespaceDefs, dummyMode );
    }
    
    return {
        ceneClient: ceneClient,
        addCeneApi: addCeneApi
    };
}
