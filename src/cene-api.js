// cene-api.js
// Copyright 2015-2017 Ross Angle. Released under the MIT License.


var builtInApiStructsToAdd = [];

builtInStructAccumulator.val = builtInApiStructsToAdd;

var mkEncapsulatedString =
    builtInStruct( "encapsulated-string", "val" );
var mkFileTypeDirectory = builtInStruct( "file-type-directory" );
var mkFileTypeBlob = builtInStruct( "file-type-blob" );
var mkFileTypeMissing = builtInStruct( "file-type-missing" );

builtInStructAccumulator.val = null;

function CexprJs( code ) {
    this.code = code;
}
CexprJs.prototype.getFreeVars = function () {
    return jsnMap();
};
CexprJs.prototype.visitForCodePruning = function ( visitor ) {
    // Do nothing.
};
CexprJs.prototype.toJsCode = function ( options ) {
    // #GEN
    return jsCode(
        jsCodeVar( "macLookupRet" ), "( " +
            "new ", jsCodeVar( "SinkForeign" ), "( \"js-effects\", " +
                "function () {\n" +
        
        "    return macLookupRet( " +
                "new SinkForeign( \"foreign\", ",
                    jsCode(
                        // TODO: See if we should treat `Function` as
                        // a free variable here.
                        "Function( " +
                            jsStr( options.minifyJs( this.code ) ) +
                            " )"
                    ).asStatic(), "() ) );\n" +
        "} ) )" );
};
CexprJs.prototype.getName = function () {
    return [ "n:cexpr-js", this.code ];
};
CexprJs.prototype.pretty = function () {
    return "(cexpr-js " + JSON.stringify( this.code ) + ")";
};

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
            mkCons.tags( e );
            e = mkCons.getProj( e, "cdr" )
        ) {
            body( mkCons.getProj( e, "car" ) );
        }
        if ( !mkNil.tags( e ) )
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
        if ( !(effects instanceof SinkForeign
            && effects.purpose === "js-effects") )
            throw new Error();
        var effectsFunc = effects.foreignVal;
        return effectsFunc();
    }
    function simpleEffects( body ) {
        return new SinkForeign( "effects", function ( rawMode ) {
            collectDefer( rawMode, {}, function ( rawMode ) {
                body( rawMode );
                return macLookupRet( new SinkForeign( "effects",
                    function ( rawMode ) {
                    
                    // Do nothing.
                    
                    return macLookupRet( mkNil.ofNow() );
                } ) );
            } );
            return macLookupRet( mkNil.ofNow() );
        } );
    }
    
    function deferAndRunMacLookup( body ) {
        apiOps.defer( function () {
            runTopLevelMacLookupsSync( namespaceDefs, usingDefNs.rt,
                [ {
                
                type: "jsEffectsThread",
                macLookupEffectsOfJsEffects:
                    macLookupThen( body(), function ( ignored ) {
                        return macLookupRet(
                            new SinkForeign( "js-effects",
                                function () {
                            
                            return macLookupRet( mkNil.ofNow() );
                        } ) );
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
        return wrapCene( new SinkForeign( "foreign", jsVal ) );
    } );
    ceneClient.maybeUnwrap = boringfn( function ( wrappedVal ) {
        var ceneVal = unwrapCene( wrappedVal );
        return (ceneVal instanceof SinkForeign
            && ceneVal.purpose === "foreign"
        ) ? { val: ceneVal.foreignVal } : null;
    } );
    ceneClient.done = boringfn( function ( result ) {
        var unwrappedResult = unwrapCene( result );
        return wrapCene( new SinkForeign( "js-effects", function () {
            return macLookupRet( unwrappedResult );
        } ) );
    } );
    ceneClient.then = boringfn( function ( effects, then ) {
        var effectsInternal = unwrapCene( effects );
        if ( !(effectsInternal instanceof SinkForeign
            && effectsInternal.purpose === "js-effects") )
            throw new Error();
        var effectsFunc = effectsInternal.foreignVal;
        
        return wrapCene( new SinkForeign( "js-effects", function () {
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
        
        return wrapCene( new SinkForeign( "js-effects", function () {
            return macLookupThen(
                ceneThenUnwrapped.callSink( usingDefNs.rt,
                    valUnwrapped ),
                function ( effects ) {
                
                return runJsEffects( effects );
            } );
        } ) );
    } );
    ceneClient.giveAsync = boringfn( function ( val, ceneThen ) {
        var valUnwrapped = unwrapCene( val );
        var ceneThenUnwrapped = unwrapCene( ceneThen );
        
        return wrapCene( new SinkForeign( "js-effects", function () {
            deferAndRunMacLookup( function () {
                return macLookupThen(
                    ceneThenUnwrapped.callSink( usingDefNs.rt,
                        valUnwrapped ),
                    function ( jsEffects ) {
                    
                    deferAndRunMacLookup( function () {
                        return runJsEffects( jsEffects );
                    } );
                    
                    return macLookupRet( mkNil.ofNow() );
                } );
            } );
            return macLookupRet( mkNil.ofNow() );
        } ) );
    } );
    ceneClient.defer = boringfn( function ( body ) {
        deferAndRunMacLookup( function () {
            return runJsEffects( unwrapCene( body() ) );
        } );
    } );
    
    function addCeneApi( targetDefNs, funcDefNs ) {
        var dummyMode = usingDefNs.makeDummyMode();
        
        function mac( name, body ) {
            var strName = sinkForeignStrFromJs( name );
            var qualifiedName =
                sinkNameQualify(
                    mkMacroOccurrence.ofNow( strName ).getName() );
            usingDefNs.addPureMacro( targetDefNs, dummyMode,
                qualifiedName, [ "claim:primitive", name ], body );
        }
        function effectfulFun( name, body ) {
            var strName = sinkForeignStrFromJs( name );
            var macroMainTagName =
                sinkNameQualify(
                    mkMacroOccurrence.ofNow( strName ).getName() );
            var sourceMainTagName =
                sinkNameQualify(
                    mkConstructorOccurrence.ofNow(
                        strName ).getName() );
            var repMainTagName = [ "n:main-core", name ];
            var constructorTagName =
                sinkNameConstructorTagAlreadySorted(
                    repMainTagName, [] );
            addFunctionNativeDefinition(
                funcDefNs, dummyMode, constructorTagName,
                {
                    cexpr: null,
                    func: function ( rt, funcVal, argVal ) {
                        return body( rt, argVal );
                    }
                } );
            usingDefNs.processDefStruct( targetDefNs, dummyMode,
                macroMainTagName,
                sourceMainTagName, repMainTagName, [] );
        }
        function fun( name, body ) {
            effectfulFun( name, function ( rt, argVal ) {
                return macLookupRet( body( rt, argVal ) );
            } );
        }
        
        function parseString( string ) {
            if ( !(string instanceof SinkForeign
                && string.purpose === "string") )
                throw new Error();
            return string.foreignVal;
        }
        function unparseNonUnicodeString( string ) {
            if ( typeof string !== "string" )
                throw new Error();
            return sinkForeignStrFromJs( toValidUnicode( string ) );
        }
        function parsePossiblyEncapsulatedString( string ) {
            if ( string instanceof SinkForeign
                && string.purpose === "string" ) {
                var result = parseString( string ).jsStr;
                return function () {
                    return result;
                };
            } else if ( mkEncapsulatedString.tags( string ) ) {
                var stringInternal =
                    mkEncapsulatedString.getProj( string, "val" );
                if ( !(stringInternal instanceof SinkForeign
                    && stringInternal.purpose ===
                        "encapsulated-string") )
                    throw new Error();
                return stringInternal.foreignVal;
            } else {
                throw new Error();
            }
        }
        
        function sinkFnPure( func ) {
            return new SinkFn( function ( rt, arg ) {
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
            entry(
                usingDefNs.processDefStruct, targetDefNs, dummyMode );
        } );
        
        var observeFilesystemDefiner =
            elementDefiner( "val",
                sinkNsGet( [ "n:$$observe-filesystem" ],
                    targetDefNs ) );
        collectPutDefinedValue( dummyMode, observeFilesystemDefiner,
            mkNil.ofNow() );
        
        // NOTE: We use `observeFilesystem()` to make sure the Cene
        // code doesn't do things that observe the filesystem unless
        // it has a compatible mode and as long as it can observe the
        // original top-level definition namespace. (TODO: A future
        // extension to the language might allow parts of the Cene
        // code to declare that they will no longer observe the
        // top-level definition namespace, at which point this becomes
        // a meaningful thing to check. Once that future extension
        // exists, mention it here as the reason we're doing this.)
        function observeFilesystem( mode, then ) {
            assertMode( rawModeSupportsObserveCli, mode );
            return macLookupThen(
                macLookupGet( observeFilesystemDefiner, function () {
                    throw new Error();
                } ),
                function ( ignored ) {
                    return macLookupRet( then() );
                } );
        }
        
        // NOTE: We use `claimOutputDir()` and `claimOutputPath()` to
        // make sure the Cene code doesn't try to output to the same
        // filesystem path twice unless they're both creating
        // directories, and also to make sure the Cene code isn't
        // violating a prior `contributing-only-to` that prohibits it
        // from contributing to the original top-level definition
        // namespace.
        
        var claimOutputDir_dexAndValue_ = {
            satisfiesDex: true,
            dexName:
                new SinkDexByCline(
                    new SinkClineStruct( mkNil.getFlatTag(), [] )
                ).getName(),
            valueName: mkNil.ofNow().getName(),
            value: mkNil.ofNow()
        };
        
        function claimOutputDir( rawMode, nameParts ) {
            var remainingNameParts = nameParts.slice();
            while ( true ) {
                collectPutDefinedDexAndValue( rawMode,
                    elementDefiner(
                        [ "n:output-path" ].concat(
                            remainingNameParts ),
                        sinkNsGet( [ "n:$$out-filesystem" ],
                            targetDefNs ) ),
                    claimOutputDir_dexAndValue_ );
                if ( remainingNameParts.length === 0 )
                    return;
                remainingNameParts.pop();
            }
        }
        function claimOutputPath( rawMode, outputPath ) {
            assertRawMode( rawModeSupportsContributeCli, rawMode );
            
            var nameParts = outputPath.foreignVal.nameParts;
            
            collectPutDefinedValue( rawMode,
                elementDefiner(
                    [ "n:output-path" ].concat( nameParts ),
                    sinkNsGet( [ "n:$$out-filesystem" ],
                        targetDefNs ) ),
                mkNil.ofNow() );
            
            var n = nameParts.length;
            if ( n !== 0 )
                claimOutputDir( rawMode,
                    nameParts.slice( 0, n - 1 ) );
        }
        
        fun( "cli-arguments", function ( rt, mode ) {
            assertMode( rawModeSupportsObserveCli, mode );
            
            var args = apiOps.cliArguments();
            return usingDefNs.sinkConsListFromArray(
                arrMap( args, function ( arg ) {
                    return unparseNonUnicodeString( arg );
                } ) );
        } );
        
        fun( "cli-input-directory", function ( rt, mode ) {
            assertMode( rawModeSupportsObserveCli, mode );
            
            return new SinkForeign( "input-path",
                apiOps.cliInputDirectory() );
        } );
        
        fun( "cli-output-directory", function ( rt, mode ) {
            assertMode( rawModeSupportsObserveCli, mode );
            
            return new SinkForeign( "output-path", {
                nameParts: [],
                apiDelegate: apiOps.cliOutputDirectory()
            } );
        } );
        
        fun( "input-path-get", function ( rt, inputPath ) {
            return sinkFnPure( function ( rt, name ) {
                if ( !(inputPath instanceof SinkForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                var nameInternal = parseString( name ).jsStr;
                
                return new SinkForeign( "input-path",
                    apiOps.inputPathGet(
                        inputPath.foreignVal, nameInternal ) );
            } );
        } );
        
        fun( "input-path-type", function ( rt, mode ) {
            return new SinkFn( function ( rt, inputPath ) {
                return observeFilesystem( mode, function () {
                    if ( !(inputPath instanceof SinkForeign
                        && inputPath.purpose === "input-path") )
                        throw new Error();
                    
                    var type =
                        apiOps.inputPathType( inputPath.foreignVal );
                    if ( type.type === "directory" )
                        return mkFileTypeDirectory.ofNow();
                    else if ( type.type === "blob" )
                        return mkFileTypeBlob.ofNow();
                    else if ( type.type === "missing" )
                        return mkFileTypeMissing.ofNow();
                    else
                        throw new Error();
                } );
            } );
        } );
        
        fun( "input-path-directory-list", function ( rt, mode ) {
            return new SinkFn( function ( rt, inputPath ) {
                return observeFilesystem( mode, function () {
                    if ( !(inputPath instanceof SinkForeign
                        && inputPath.purpose === "input-path") )
                        throw new Error();
                    
                    return usingDefNs.sinkConsListFromArray(
                        arrMap(
                            apiOps.inputPathDirectoryList(
                                inputPath.foreignVal ),
                            function ( basename ) {
                            
                            return unparseNonUnicodeString(
                                basename );
                        } ) );
                } );
            } );
        } );
        
        fun( "input-path-blob-utf-8", function ( rt, mode ) {
            return new SinkFn( function ( rt, inputPath ) {
                return observeFilesystem( mode, function () {
                    if ( !(inputPath instanceof SinkForeign
                        && inputPath.purpose === "input-path") )
                        throw new Error();
                    
                    return unparseNonUnicodeString(
                        apiOps.inputPathBlobUtf8(
                            inputPath.foreignVal ) );
                } );
            } );
        } );
        
        fun( "output-path-get", function ( rt, outputPath ) {
            return sinkFnPure( function ( rt, name ) {
                if ( !(outputPath instanceof SinkForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var nameInternal = parseString( name ).jsStr;
                
                return new SinkForeign( "output-path", {
                    nameParts: outputPath.foreignVal.nameParts.concat(
                        nameInternal ),
                    apiDelegate: apiOps.outputPathGet(
                        outputPath.foreignVal.apiDelegate,
                        nameInternal )
                } );
            } );
        } );
        
        fun( "output-path-directory", function ( rt, outputPath ) {
            if ( !(outputPath instanceof SinkForeign
                && outputPath.purpose === "output-path") )
                throw new Error();
            
            return simpleEffects( function ( rawMode ) {
                assertRawMode( rawModeSupportsContributeCli,
                    rawMode );
                claimOutputDir( rawMode, outputPath );
                apiOps.outputPathDirectory(
                    outputPath.foreignVal.apiDelegate );
            } );
        } );
        
        fun( "output-path-blob-utf-8", function ( rt, outputPath ) {
            return sinkFnPure( function ( rt, outputString ) {
                if ( !(outputPath instanceof SinkForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var getContent =
                    parsePossiblyEncapsulatedString( outputString );
                
                return simpleEffects( function ( rawMode ) {
                    assertRawMode( rawModeSupportsContributeCli,
                        rawMode );
                    claimOutputPath( rawMode, outputPath );
                    // NOTE: We use `onceDependenciesComplete()` to
                    // wait until all the file reads and function
                    // definitions have finished. That way, we know
                    // all of them to include in files generated by
                    // `sloppy-javascript-quine` and
                    // `picky-javascript-quine` respectively. If we
                    // didn't wait to do this, we would miss some.
                    apiOps.onceDependenciesComplete( function () {
                        apiOps.outputPathBlobUtf8(
                            outputPath.foreignVal.apiDelegate,
                            getContent() );
                    } );
                } );
            } );
        } );
        
        fun( "cli-output-environment-variable-shadow",
            function ( rt, key ) {
            
            return sinkFnPure( function ( rt, value ) {
                var keyInternal = parseString( key ).jsStr;
                parsePossiblyEncapsulatedString( value );
                
                return new SinkForeign( "effects",
                    function ( rawMode ) {
                    
                    collectPutDefinedValue( rawMode,
                        elementDefiner( keyInternal,
                            sinkNsGet(
                                [ "n:$$cli-output-environment-variable-shadows" ],
                                targetDefNs ) ),
                        value );
                    return macLookupRet( mkNil.ofNow() );
                } );
            } );
        } );
        
        fun( "sloppy-javascript-quine", function ( rt, mode ) {
            return sinkFnPure( function ( rt, cexpr ) {
                return sinkFnPure( function ( rt, topLevelVars ) {
                    
                    assertMode( rawModeSupportsObserveCli, mode );
                    
                    if ( !(cexpr instanceof SinkCexpr) )
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
                    
                    return mkEncapsulatedString.ofNow(
                        new SinkForeign( "encapsulated-string",
                            function () {
                                return apiOps.sloppyJavaScriptQuine(
                                    cexpr.cexpr,
                                    dedupVars );
                            } ) );
                } );
            } );
        } );
        
        fun( "picky-javascript-quine", function ( rt, mode ) {
            return sinkFnPure( function ( rt, cexpr ) {
                return sinkFnPure( function ( rt, topLevelVars ) {
                    
                    assertMode( rawModeSupportsObserveCli, mode );
                    
                    if ( !(cexpr instanceof SinkCexpr) )
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
                    
                    return mkEncapsulatedString.ofNow(
                        new SinkForeign( "encapsulated-string",
                            function () {
                                return apiOps.pickyJavaScriptQuine(
                                    cexpr.cexpr,
                                    dedupVars );
                            } ) );
                } );
            } );
        } );
        
        fun( "string-to-javascript-utf-16", function ( rt, string ) {
            return new SinkForeign( "foreign",
                parseString( string ).jsStr );
        } );
        
        fun( "javascript-utf-16-to-string", function ( rt, string ) {
            if ( !(string instanceof SinkForeign
                && string.purpose === "foreign") )
                throw new Error();
            
            return unparseNonUnicodeString( string.foreignVal );
        } );
        
        fun( "done-js-effects", function ( rt, result ) {
            return new SinkForeign( "js-effects", function () {
                return macLookupRet( result );
            } );
        } );
        
        fun( "then-js-effects", function ( rt, jsEffects ) {
            return sinkFnPure( function ( rt, then ) {
                if ( !(jsEffects instanceof SinkForeign
                    && jsEffects.purpose === "js-effects") )
                    throw new Error();
                var effectsFunc = jsEffects.foreignVal;
                
                return new SinkForeign( "js-effects", function () {
                    return macLookupThen( effectsFunc(),
                        function ( intermediate ) {
                        
                        return macLookupThen(
                            then.callSink( rt, intermediate ),
                            function ( jsEffects ) {
                            
                            return runJsEffects( jsEffects );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "later-js-effects",
            function ( rt, effectsForWritingJsEffects ) {
            
            return new SinkForeign( "js-effects", function () {
                
                // NOTE: This relies on object identity.
                var ffiSandboxId = {};
                
                var definer = {
                    type: "object",
                    ffiSandboxId: ffiSandboxId,
                    unitTestId: null,
                    visit: null,
                    dexAndValue: null
                };
                
                return macLookupThen(
                    effectsForWritingJsEffects.callSink( rt,
                        new SinkForeign( "definer", definer ) ),
                    function ( effects ) {
                    
                    if ( !(effects instanceof SinkForeign
                        && effects.purpose === "effects") )
                        throw new Error();
                    
                    runTopLevelMacLookupsSync( namespaceDefs, rt, [ {
                        type: "topLevelDefinitionThread",
                        attenuation: {
                            type: "ffi-sandbox",
                            ffiSandboxId: ffiSandboxId,
                            unitTestId: null,
                            contributingOnlyTo: sinkNameSetEmpty()
                        },
                        macLookupEffectsOfDefinitionEffects:
                            function ( rawMode ) {
                            
                            return runEffects( rawMode, effects );
                        }
                    } ] );
                    
                    return macLookupThen(
                        macLookupGet( definer, function () {
                            throw new Error(
                                "Never fulfilled a " +
                                "later-js-effects promise" );
                        } ),
                        function ( jsEffects ) {
                        
                        return runJsEffects( jsEffects );
                    } );
                } );
            } );
        } );
        
        fun( "give-unwrapped-js-effects", function ( rt, val ) {
            return sinkFnPure( function ( rt, jsThen ) {
                
                if ( !(val instanceof SinkForeign
                    && val.purpose === "foreign") )
                    throw new Error();
                var unwrappedVal = val.foreignVal;
                
                if ( !(jsThen instanceof SinkForeign
                    && jsThen.purpose === "foreign") )
                    throw new Error();
                var then = jsThen.foreignVal;
                
                return new SinkForeign( "js-effects", function () {
                    return runJsEffects(
                        unwrapCene( then( unwrappedVal ) ) );
                } );
            } );
        } );
        
        fun( "give-js-effects", function ( rt, val ) {
            return sinkFnPure( function ( rt, jsThen ) {
                if ( !(jsThen instanceof SinkForeign
                    && jsThen.purpose === "foreign") )
                    throw new Error();
                var then = jsThen.foreignVal;
                return new SinkForeign( "js-effects", function () {
                    return runJsEffects(
                        unwrapCene( then( wrapCene( val ) ) ) );
                } );
            } );
        } );
        
        function stxToDefiniteSinkString( stx ) {
            if ( !mkStx.tags( stx ) )
                throw new Error();
            var istringNil = mkStx.getProj( stx, "s-expr" );
            if ( !mkIstringNil.tags( istringNil ) )
                throw new Error();
            var result = mkIstringNil.getProj( istringNil, "string" );
            parseString( result );
            return result;
        }
        function stxToDefiniteString( stx ) {
            return parseString( stxToDefiniteSinkString( stx ) );
        }
        
        fun( "cexpr-js", function ( rt, code ) {
            var codeInternal = parseString( code ).jsStr;
            return new SinkCexpr( new CexprJs( codeInternal ) );
        } );
        
        mac( "js", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            if ( mkCons.tags( mkCons.getProj( body, "cdr" ) ) )
                throw new Error();
            return function ( rawMode, nss ) {
                return macLookupThenRunEffects( rawMode,
                    then(
                        new CexprJs(
                            stxToDefiniteString(
                                mkCons.getProj(
                                    body, "car" ) ).jsStr ) ) );
            };
        } );
        
        fun( "compile-function-js-effects", function ( rt, params ) {
            return sinkFnPure( function ( rt, body ) {
                
                var paramsInternal = mapConsListToArr( params,
                    function ( param ) {
                        return parseString( param ).jsStr;
                    } );
                
                var bodyInternal = parseString( body ).jsStr;
                
                return new SinkForeign( "js-effects", function () {
                    // TODO: Stop putting a potentially large array
                    // into an argument list like this.
                    return macLookupRet(
                        new SinkForeign( "foreign",
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
