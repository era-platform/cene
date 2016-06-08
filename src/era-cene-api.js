// era-cene-api.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.


function ceneApiUsingDefinitionNs( macroDefNs, apiOps ) {
    var usingDefNs = usingDefinitionNs( macroDefNs );
    
    var stcCons = stcType( macroDefNs, "cons", "car", "cdr" );
    var stcNil = stcType( macroDefNs, "nil" );
    var stcString = stcType( macroDefNs, "string", "val" );
    var stcName = stcType( macroDefNs, "name", "val" );
    var stcForeign = stcType( macroDefNs, "foreign", "val" );
    var stcAssoc = stcType( macroDefNs, "assoc", "key", "value" );
    var stcEncapsulatedString =
        stcType( macroDefNs, "encapsulated-string", "val" );
    var stcFileTypeDirectory =
        stcType( macroDefNs, "file-type-directory" );
    var stcFileTypeBlob = stcType( macroDefNs, "file-type-blob" );
    var stcFileTypeMissing =
        stcType( macroDefNs, "file-type-missing" );
    
    
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
            e.tupleTag === stcCons.getTupleTag();
            e = stcCons.getProj( e, "cdr" )
        ) {
            body( stcCons.getProj( e, "car" ) );
        }
        if ( e.tupleTag !== stcNil.getTupleTag() )
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
            collectDefer( rawMode, function ( rawMode1 ) {
                body();
                return macLookupRet( new StcForeign( "effects",
                    function ( rawMode2 ) {
                    
                    // NOTE: This uses object identity.
                    if ( rawMode1 !== rawMode2 )
                        throw new Error();
                    
                    // Do nothing.
                    
                    return macLookupRet( stcNil.ofNow() );
                } ) );
            } );
            return macLookupRet( stcNil.ofNow() );
        } );
    }
    
    function deferAndRunMacLookup( body ) {
        apiOps.defer( function () {
            runTopLevelMacLookupsSync( [ {
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
                ceneThenUnwrapped.callStc( macroDefNs, valUnwrapped ),
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
                    ceneThenUnwrapped.callStc( macroDefNs,
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
    
    function addCeneApi( targetDefNs ) {
        function type( tupleName, projNames ) {
            usingDefNs.processDefType(
                targetDefNs, tupleName, projNames );
        }
        function fun( name, body ) {
            var constructorTag = stcConstructorTag( targetDefNs,
                stcConstructorName( targetDefNs, name ) );
            var tupleTagName =
                stcNameTupleTagAlreadySorted( constructorTag, [] );
            var tupleTag = JSON.stringify( tupleTagName );
            // TODO: Add a real entry to `namespaceDefs`. We should
            // create an appropriate `stc-def-foreign`.
            addBogusFunctionStaccatoDefinition(
                targetDefNs, tupleTagName );
            staccatoDeclarationState.functionDefs[ tupleTag ] =
                function ( projectionVals, argVal ) {
                
                return macLookupRet( body( argVal ) );
            };
            usingDefNs.processDefType( targetDefNs, name, [] );
        }
        
        function parseString( string ) {
            if ( string.tupleTag !== stcString.getTupleTag() )
                throw new Error();
            var stringInternal = stcString.getProj( string, "val" );
            if ( !(stringInternal instanceof StcForeign
                && stringInternal.purpose === "string") )
                throw new Error();
            return stringInternal.foreignVal;
        }
        function unparseNonUnicodeString( string ) {
            if ( typeof string !== "string" )
                throw new Error();
            return stcString.ofNow(
                new StcForeign( "string",
                    toValidUnicode( string ) ) );
        }
        function parsePossiblyEncapsulatedString( string ) {
            if ( string.tupleTag === stcString.getTupleTag() ) {
                var result = parseString( string );
                return function () {
                    return result;
                };
            } else if ( string.tupleTag ===
                stcEncapsulatedString.getTupleTag() ) {
                
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
            return new StcFn( function ( arg ) {
                return macLookupRet( func( arg ) );
            } );
        }
        
        type( "encapsulated-string", [ "val" ] );
        type( "assoc", [ "key", "value" ] );
        type( "file-type-directory", [] );
        type( "file-type-blob", [] );
        type( "file-type-missing", [] );
        
        fun( "cli-arguments", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            var args = apiOps.cliArguments();
            return usingDefNs.stcArrayToConsList(
                arrMap( args, function ( arg ) {
                    return unparseNonUnicodeString( arg );
                } ) );
        } );
        
        fun( "cli-input-directory", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            return new StcForeign( "input-path",
                apiOps.cliInputDirectory() );
        } );
        
        fun( "cli-output-directory", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            return new StcForeign( "output-path",
                apiOps.cliOutputDirectory() );
        } );
        
        fun( "input-path-get", function ( inputPath ) {
            return stcFnPure( function ( name ) {
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                var nameInternal = parseString( name );
                
                return new StcForeign( "input-path",
                    apiOps.inputPathGet(
                        inputPath.foreignVal, nameInternal ) );
            } );
        } );
        
        fun( "input-path-type", function ( mode ) {
            return stcFnPure( function ( inputPath ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && mode.foreignVal.current
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
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
        
        fun( "input-path-directory-list", function ( mode ) {
            return stcFnPure( function ( inputPath ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && mode.foreignVal.current
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
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
        
        fun( "input-path-blob-utf-8", function ( mode ) {
            return stcFnPure( function ( inputPath ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && mode.foreignVal.current
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                return unparseNonUnicodeString(
                    apiOps.inputPathBlobUtf8(
                        inputPath.foreignVal ) );
            } );
        } );
        
        fun( "output-path-get", function ( outputPath ) {
            return stcFnPure( function ( name ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var nameInternal = parseString( name );
                
                return new StcForeign( "output-path",
                    apiOps.outputPathGet(
                        outputPath.foreignVal, nameInternal ) );
            } );
        } );
        
        fun( "output-path-directory", function ( outputPath ) {
            if ( !(outputPath instanceof StcForeign
                && outputPath.purpose === "output-path") )
                throw new Error();
            
            return simpleEffects( function () {
                apiOps.outputPathDirectory( outputPath.foreignVal );
            } );
        } );
        
        fun( "output-path-blob-utf-8", function ( outputPath ) {
            return stcFnPure( function ( outputString ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var getContent =
                    parsePossiblyEncapsulatedString( outputString );
                
                return simpleEffects( function () {
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
            function ( key ) {
            
            return stcFnPure( function ( value ) {
                var keyInternal = parseString( key );
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    // TODO: Document the namespace path we're using
                    // for this,
                    // /cli-output-environment-variable-shadows/<key>.
                    // Maybe we don't actually need this to be a
                    // built-in function.
                    collectPut( rawMode,
                        stcNsGet( keyInternal,
                            stcNsGet(
                                "cli-output-environment-variable-shadows",
                                defNs ) ),
                        value );
                    return macLookupRet( stcNil.ofNow() );
                } );
            } );
        } );
        
        fun( "sloppy-javascript-quine", function ( mode ) {
            return stcFnPure( function ( constructorTag ) {
                return stcFnPure( function ( topLevelVars ) {
                    
                    if ( !(mode instanceof StcForeign
                        && mode.purpose === "mode"
                        && mode.foreignVal.current
                        && mode.foreignVal.type === "macro") )
                        throw new Error();
                    
                    if ( constructorTag.tupleTag !==
                        stcName.getTupleTag() )
                        throw new Error();
                    var constructorTagInternal =
                        stcName.getProj( constructorTag, "val" );
                    if ( !(constructorTagInternal instanceof
                            StcForeign
                        && constructorTagInternal.purpose ===
                            "name") )
                        throw new Error();
                    
                    var dedupVars = [];
                    var dedupVarsMap = {};
                    eachConsList( topLevelVars, function ( va ) {
                        var vaInternal = parseString( va );
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
                                    constructorTagInternal.foreignVal,
                                    dedupVars );
                            } ) );
                } );
            } );
        } );
        
        fun( "string-to-javascript-utf-16", function ( string ) {
            return new StcForeign( "foreign", parseString( string ) );
        } );
        
        fun( "javascript-utf-16-to-string", function ( string ) {
            if ( !(string instanceof StcForeign
                && string.purpose === "foreign") )
                throw new Error();
            
            return unparseNonUnicodeString( string.foreignVal );
        } );
        
        fun( "done-js-effects", function ( result ) {
            return new StcForeign( "js-effects", function () {
                return macLookupRet( result );
            } );
        } );
        
        fun( "then-js-effects", function ( jsEffects ) {
            return stcFnPure( function ( then ) {
                if ( !(jsEffects instanceof StcForeign
                    && jsEffects.purpose === "js-effects") )
                    throw new Error();
                var effectsFunc = jsEffects.foreignVal;
                
                return new StcForeign( "js-effects", function () {
                    return macLookupThen( effectsFunc(),
                        function ( intermediate ) {
                        
                        return macLookupThen(
                            then.callStc( macroDefNs, intermediate ),
                            function ( jsEffects ) {
                            
                            return runJsEffects( jsEffects );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "give-unwrapped-js-effects", function ( val ) {
            return stcFnPure( function ( jsThen ) {
                
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
        
        fun( "give-js-effects", function ( val ) {
            return stcFnPure( function ( jsThen ) {
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
        
        fun( "compile-function-js-effects", function ( params ) {
            return stcFnPure( function ( body ) {
                
                var paramsInternal = mapConsListToArr( params,
                    function ( param ) {
                        return parseString( param );
                    } );
                
                var bodyInternal = parseString( body );
                
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
    }
    
    return {
        ceneClient: ceneClient,
        addCeneApi: addCeneApi
    };
}
