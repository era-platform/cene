// era-cene-api.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.


staccatoDeclarationState.cliOutputEnvironmentVariableShadows =
    strMap();

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
        unwrappingResult = null;
        return unwrappingResult;
    }
    
    function wrapTagged( tag ) {
        return function ( unwrappedVal ) {
            return wrapPrivate( unwrappedVal );
        };
    }
    
    function unwrapTagged( tag ) {
        return function ( wrappedVal ) {
            var result = unwrapPrivate( wrappedVal );
            if ( result.type !== tag )
                throw new Error();
            return result;
        };
    }
    
    var wrapCene = wrapTagged( "cene" );
    var unwrapCene = unwrapTagged( "cene" );
    
    
    function runEffects( rawMode, effects ) {
        if ( !(effects instanceof StcForeign
            && effects.purpose === "effects") )
            throw new Error();
        var effectsFunc = effects.foreignVal;
        return effectsFunc( rawMode );
    }
    function wrapEffects( body ) {
        return wrapCene( new StcForeign( "effects", body ) );
    }
    function simpleEffects( body ) {
        return new StcForeign( "effects", function ( rawMode ) {
            collectDefer( rawMode, function ( rawMode ) {
                body();
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    // Do nothing.
                } );
            } );
        } );
    }
    
    
    var ceneClient = {};
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
        return wrapEffects( function ( rawMode ) {
            return unwrappedResult;
        } );
    } );
    ceneClient.doThen = boringfn( function ( effects, then ) {
        var effectsInternal = unwrapCene( effects );
        if ( !(effectsInternal instanceof StcForeign
            && effectsInternal.purpose === "effects") )
            throw new Error();
        var effectsFunc = effectsInternal.foreignVal;
        
        return wrapEffects( function ( rawMode ) {
            return runEffects( rawMode,
                unwrapCene(
                    then( wrapCene( effectsFunc( rawMode ) ) ) ) );
        } );
    } );
    ceneClient.doCall = boringfn( function ( func, arg, then ) {
        var funcUnwrapped = unwrapCene( func );
        var argUnwrapped = unwrapCene( arg );
        
        return wrapEffects( function ( rawMode ) {
            return runEffects( rawMode,
                unwrapCene(
                    then(
                        wrapCene(
                            funcUnwrapped.callStc( macroDefNs,
                                argUnwrapped ) ) ) ) );
        } );
    } );
    ceneClient.fork = boringfn( function ( jsMode ) {
        var unwrappedJsMode = unwrapCene( jsMode );
        if ( !(unwrappedJsMode instanceof StcForeign
            && unwrappedJsMode.purpose === "mode"
            && unwrappedJsMode.foreignVal.current
            && unwrappedJsMode.foreignVal.type === "js") )
            throw new Error();
        
        return wrapCene( new StcForeign( "mode", {
            type: "js",
            finished: null,
            current: true,
            safe: [],
            defer: [],
            managed: false
        } ) );
    } );
    ceneClient.doSync = boringfn( function ( forkedMode ) {
        var unwrappedForkedMode = unwrapCene( forkedMode );
        if ( !(unwrappedForkedMode instanceof StcForeign
            && unwrappedForkedMode.purpose === "mode"
            && unwrappedForkedMode.foreignVal.current
            && unwrappedForkedMode.foreignVal.type === "js"
            && unwrappedForkedMode.foreignVal.managed) )
            throw new Error();
        var modeVal = unwrappedForkedMode.foreignVal;
        return wrapEffects( function ( rawMode ) {
            transferModesToFrom( rawMode, modeVal );
            return stcNil.ofNow();
        } );
    } );
    ceneClient.deferIntoTrampoline = boringfn(
        function ( jsMode, then ) {
        
        var unwrappedJsMode = unwrapCene( jsMode );
        if ( !(unwrappedJsMode instanceof StcForeign
            && unwrappedJsMode.purpose === "mode"
            && unwrappedJsMode.foreignVal.current
            && unwrappedJsMode.foreignVal.type === "js") )
            throw new Error();
        function createNextMode( rawMode ) {
            return {
                type: "js",
                finished: null,
                current: true,
                safe: [],
                defer: [],
                managed: false
            };
        }
        var newRawMode = createNextMode( unwrappedJsMode.foreignVal );
        apiOps.defer( function () {
            runEffects( newRawMode,
                unwrapCene(
                    then(
                        wrapCene(
                            new StcForeign( "mode",
                                newRawMode ) ) ) ) );
            runTrampoline( newRawMode, apiOps.defer, createNextMode );
        } );
    } );
    
    function addCeneApi( targetDefNs ) {
        function type( tupleName, projNames ) {
            usingDefNs.processDefType(
                targetDefNs, tupleName, projNames );
        }
        function mac( name, body ) {
            stcAddMacro( targetDefNs, name, body );
        }
        function fun( name, body ) {
            var constructorTag = stcConstructorTag( targetDefNs,
                stcConstructorName( targetDefNs, name ) );
            var tupleTagName =
                stcNameTupleTagAlreadySorted( constructorTag, [] );
            var tupleTag = JSON.stringify( tupleTagName );
            // TODO: Also add an entry to `namespaceDefs`. We should
            // create an appropriate `stc-def-foreign`.
            staccatoDeclarationState.functionDefs[ tupleTag ] =
                function ( projectionVals, argVal ) {
                
                return body( argVal );
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
        
        fun( "cli-input-environment-variables", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            var envArr = [];
            objOwnEach( apiOps.cliInputEnvironmentVariables(),
                function ( k, v ) {
                
                envArr.push(
                    stcAssoc.ofNow(
                        unparseNonUnicodeString( k ),
                        unparseNonUnicodeString( v ) ) );
            } );
            return usingDefNs.stcArrayToConsList( envArr );
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
            return new StcFn( function ( name ) {
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
            return new StcFn( function ( inputPath ) {
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
            return new StcFn( function ( inputPath ) {
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
                        function ( inputPath ) {
                        
                        return new StcForeign( "input-path",
                            inputPath );
                    } ) );
            } );
        } );
        
        fun( "input-path-blob-utf-8", function ( mode ) {
            return new StcFn( function ( inputPath ) {
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
            return new StcFn( function ( name ) {
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
            return new StcFn( function ( outputString ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var getContent =
                    parsePossiblyEncapsulatedString( outputString );
                
                return simpleEffects( function () {
                    apiOps.onceDependenciesComplete( function () {
                        apiOps.outputPathBlobUtf8(
                            outputPath.foreignVal, getContent() );
                    } );
                } );
            } );
        } );
        
        fun( "cli-output-environment-variable-shadow",
            function ( key ) {
            
            return new StcFn( function ( value ) {
                var keyInternal = parseString( key );
                var getValueInternal =
                    parsePossiblyEncapsulatedString( value );
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    if ( staccatoDeclarationState.
                        cliOutputEnvironmentVariableShadows.has(
                            keyInternal ) )
                        throw new Error();
                    collectSafe( rawMode, function () {
                        apiOps.onceDependenciesComplete( function () {
                            staccatoDeclarationState.
                                cliOutputEnvironmentVariableShadows.
                                    put( keyInternal,
                                        getValueInternal() );
                        } );
                    } );
                    return stcNil.of();
                } );
            } );
        } );
        
        fun( "sloppy-javascript-quine", function ( mode ) {
            return new StcFn( function ( constructorTag ) {
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
                if ( !(constructorTagInternal instanceof StcForeign
                    && constructorTagInternal.purpose === "name") )
                    throw new Error();
                
                return stcEncapsulatedString.ofNow(
                    new StcForeign( "encapsulated-string",
                        function () {
                            return apiOps.sloppyJavaScriptQuine(
                                constructorTagInternal.foreignVal );
                        } ) );
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
        
        fun( "javascript-sync", function ( clientVar ) {
            return new StcFn( function ( env ) {
                return new StcFn( function ( body ) {
                    
                    var clientVarInternal = parseString( clientVar );
                    
                    var keys = [];
                    var vals = [];
                    for (
                        var currentEnv = env;
                        currentEnv.tupleTag === stcCons.getTupleTag();
                        currentEnv =
                            stcCons.getProj( currentEnv, "cdr" )
                    ) {
                        var assoc =
                            stcCons.getProj( currentEnv, "car" );
                        if ( assoc.tupleTag !==
                            stcAssoc.getTupleTag() )
                            throw new Error();
                        keys.push(
                            parseString(
                                stcAssoc.getProj( assoc, "key" ) ) );
                        vals.push(
                            wrapCene(
                                stcAssoc.getProj(
                                    assoc, "value" ) ) );
                    }
                    if ( currentEnv.tupleTag !==
                        stcNil.getTupleTag() )
                        throw new Error();
                    
                    var allVars = {};
                    function recordVar( va ) {
                        var k = "|" + va;
                        if ( allVars[ k ] )
                            throw new Error();
                        allVars[ k ] = true;
                    }
                    recordVar( clientVarInternal );
                    arrEach( keys, function ( key ) {
                        recordVar( key );
                    } );
                    
                    var bodyInternal = parseString( body );
                    
                    // TODO: Stop putting a potentially large array
                    // into an argument list like this.
                    var compiledJs = Function.apply( null, [
                        clientVarInternal
                    ].concat( keys ).concat( [
                        bodyInternal
                    ] ) );
                    
                    return new StcForeign( "effects",
                        function ( rawMode ) {
                        
                        if ( !(rawMode.current
                            && rawMode.type === "js") )
                            throw new Error();
                        
                        return runEffects( rawMode,
                            unwrapCene(
                                compiledJs.apply( null,
                                    [ ceneClient ].concat(
                                        vals ) ) ) );
                    } );
                } );
            } );
        } );
    }
    
    return {
        addCeneApi: addCeneApi
    };
}
