// era-cene-api.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.


staccatoDeclarationState.cliOutputEnvironmentVariableShadows =
    strMap();

function ceneApiUsingDefinitionNs( macroDefNs ) {
    var usingDefNs = usingDefinitionNs( macroDefNs );
    
    var stcCons = stcType( macroDefNs, "cons", "car", "cdr" );
    var stcNil = stcType( macroDefNs, "nil" );
    var stcString = stcType( macroDefNs, "string", "val" );
    var stcName = stcType( macroDefNs, "name", "val" );
    var stcForeign = stcType( macroDefNs, "foreign", "val" );
    var stcAssoc = stcType( macroDefNs, "assoc", "key", "value" );
    
    function wrapCene( unwrappedVal ) {
        return { cene_: unwrappedVal };
    }
    
    function wrapJs( jsVal ) {
        return wrapCene( new StcForeign( "foreign", jsVal ) );
    }
    
    function maybeUnwrapCene( wrappedVal ) {
        return (typeof wrappedVal === "object"
            && wrappedVal !== null
            && {}.hasOwnProperty( wrappedVal, "cene_" )
        ) ? { val: wrappedVal.cene_ } : null;
    }
    
    function maybeUnwrapJs( wrappedVal ) {
        var maybeCene = maybeUnwrapCene( wrappedVal );
        return (maybeCene !== null
            && maybeCene.val instanceof StcForeign
            && maybeCene.val.purpose === "foreign"
        ) ? { val: maybeCene.val.foreignVal } : null;
    }
    
    var ceneClient = {};
    ceneClient.wrap = function ( jsVal ) {
        return wrapJs( jsVal );
    };
    ceneClient.maybeUnwrap = function ( wrappedVal ) {
        return maybeUnwrapJs( wrappedVal );
    };
    ceneClient.noEffects = function ( result ) {
        var unwrappedResult = maybeUnwrapCene( result ).val;
        return new StcForeign( "effects", function ( collector ) {
            return unwrappedResult;
        } );
    };
    ceneClient.bindEffects =
        function ( effectfulArg, funcReturningEffects ) {
        
        var argEffects = maybeUnwrapCene( effectfulArg ).val;
        if ( !(argEffects instanceof StcForeign
            && argEffects.purpose === "effects") )
            throw new Error();
        var argFunc = argEffects.foreignVal;
        
        var func = maybeUnwrapCene( funcReturningEffects ).val;
        
        return new StcForeign( "effects", function ( collector ) {
            var arg = argFunc( collector );
            
            var funcEffects = func.callStc( macroDefNs, arg );
            if ( !(funcEffects instanceof StcForeign
                && funcEffects.purpose === "effects") )
                throw new Error();
            var funcFunc = funcEffects.foreignVal;
            return funcFunc( collector );
        } );
    };
    ceneClient.fork = function ( jsMode ) {
        var unwrappedJsMode = maybeUnwrapCene( jsMode ).val;
        if ( !(unwrappedJsMode instanceof StcForeign
            && unwrappedJsMode.purpose === "mode"
            && !unwrappedJsMode.foreignVal.finished
            && unwrappedJsMode.foreignVal.type === "js") )
            throw new Error();
        
        return new StcForeign( "mode", {
            type: "js",
            managed: false,
            finished: false,
            safe: [],
            defer: [],
            unsafe: []
        } );
    };
    ceneClient.sync = function ( forkedMode ) {
        var unwrappedForkedMode = maybeUnwrapCene( forkedMode ).val;
        if ( !(unwrappedForkedMode instanceof StcForeign
            && unwrappedForkedMode.purpose === "mode"
            && !unwrappedForkedMode.foreignVal.finished
            && unwrappedForkedMode.foreignVal.type === "js"
            && unwrappedForkedMode.foreignVal.managed) )
            throw new Error();
        var modeVal = unwrappedForkedMode.foreignVal;
        return new StcForeign( "effects", function ( collector ) {
            arrEach( modeVal.safe, function ( entry ) {
                collector.addSafe( entry );
            } );
            arrEach( modeVal.defer, function ( entry ) {
                collector.defer( entry );
            } );
            arrEach( modeVal.unsafe, function ( entry ) {
                collector.addUnsafe( entry );
            } );
            throw new Error();
        } );
    };
    ceneClient.deferIntoTrampoline = function ( jsMode, then ) {
        var unwrappedJsMode = maybeUnwrapCene( jsMode ).val;
        if ( !(unwrappedJsMode instanceof StcForeign
            && unwrappedJsMode.purpose === "mode"
            && !unwrappedJsMode.foreignVal.finished
            && unwrappedJsMode.foreignVal.type === "js") )
            throw new Error();
        // TODO
        throw new Error();
    };
    ceneClient.trampolineIntoTrampoline =
        function ( jsMode, effects, thenSync ) {
        
        var unwrappedJsMode = maybeUnwrapCene( jsMode ).val;
        if ( !(unwrappedJsMode instanceof StcForeign
            && unwrappedJsMode.purpose === "mode"
            && !unwrappedJsMode.foreignVal.finished
            && unwrappedJsMode.foreignVal.type === "js") )
            throw new Error();
        // TODO
        throw new Error();
    };
    
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
        
        type( "encapsulated-string", [ "val" ] );
        type( "assoc", [ "key", "value" ] );
        type( "file-type-directory", [] );
        type( "file-type-blob", [] );
        type( "file-type-missing", [] );
        
        fun( "cli-arguments", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && !mode.foreignVal.finished
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            // TODO
            throw new Error();
        } );
        
        fun( "cli-input-environment-variables", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && !mode.foreignVal.finished
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            // TODO
            throw new Error();
        } );
        
        fun( "cli-input-directory", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && !mode.foreignVal.finished
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            // TODO
            throw new Error();
        } );
        
        fun( "cli-output-directory", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && !mode.foreignVal.finished
                && mode.foreignVal.type === "macro") )
                throw new Error();
            
            // TODO
            throw new Error();
        } );
        
        fun( "input-path-get", function ( inputPath ) {
            return new StcFn( function ( name ) {
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                var nameInternal = parseString( name );
                
                // TODO
                throw new Error();
            } );
        } );
        
        fun( "input-path-type", function ( mode ) {
            return new StcFn( function ( inputPath ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && !mode.foreignVal.finished
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                // TODO
                throw new Error();
            } );
        } );
        
        fun( "input-path-directory-list", function ( mode ) {
            return new StcFn( function ( inputPath ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && !mode.foreignVal.finished
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                // TODO
                throw new Error();
            } );
        } );
        
        fun( "input-path-blob-utf-8", function ( mode ) {
            return new StcFn( function ( inputPath ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && !mode.foreignVal.finished
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( !(inputPath instanceof StcForeign
                    && inputPath.purpose === "input-path") )
                    throw new Error();
                
                // TODO
                throw new Error();
            } );
        } );
        
        fun( "output-path-get", function ( outputPath ) {
            return new StcFn( function ( name ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                var nameInternal = parseString( name );
                
                // TODO
                throw new Error();
            } );
        } );
        
        fun( "output-path-directory", function ( outputPath ) {
            if ( !(outputPath instanceof StcForeign
                && outputPath.purpose === "output-path") )
                throw new Error();
            
            return new StcForeign( "effects", function ( collector ) {
                // TODO
                throw new Error();
            } );
        } );
        
        fun( "output-path-blob-utf-8", function ( outputPath ) {
            return new StcFn( function ( outputString ) {
                if ( !(outputPath instanceof StcForeign
                    && outputPath.purpose === "output-path") )
                    throw new Error();
                
                if ( outputString.tupleTag !==
                    stcString.getTupleTag() )
                    throw new Error();
                
                return new StcForeign( "effects",
                    function ( collector ) {
                    
                    // TODO
                    throw new Error();
                } );
            } );
        } );
        
        fun( "cli-output-environment-variable-shadow",
            function ( key ) {
            
            return new StcFn( function ( value ) {
                var keyInternal = parseString( key );
                var valueInternal = parseString( value );
                
                return new StcForeign( "effects",
                    function ( collector ) {
                    
                    if ( staccatoDeclarationState.
                        cliOutputEnvironmentVariableShadows.has(
                            keyInternal ) )
                        throw new Error();
                    collector.addSafe( function () {
                        staccatoDeclarationState.
                            cliOutputEnvironmentVariableShadows.put(
                                keyInternal, valueInternal );
                    } );
                    return stcNil.of();
                } );
            } );
        } );
        
        fun( "sloppy-javascript-quine", function ( mode ) {
            return new StcFn( function ( constructorName ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && !mode.foreignVal.finished
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( constructorName.tupleTag !==
                    stcName.getTupleTag() )
                    throw new Error();
                var constructorNameInternal =
                    stcName.getProj( name, "val" );
                if ( !(constructorNameInternal instanceof StcForeign
                    && constructorNameInternal.purpose === "name") )
                    throw new Error();
                
                // TODO: This should be the one place we create a
                // JavaScript mode without having access to one first.
                // TODO: Implement this.
                throw new Error();
            } );
        } );
        
        fun( "string-to-javascript-utf-16", function ( string ) {
            return new StcForeign( "foreign", parseString( string ) );
        } );
        
        fun( "javascript-utf-16-to-string", function ( string ) {
            if ( !(string instanceof StcForeign
                && string.purpose === "foreign"
                && typeof string.foreignVal === "string") )
                throw new Error();
            
            return stcString.ofNow(
                new StcForeign( "string",
                    toValidUnicode( string.foreignVal ) ) );
        } );
        
        fun( "trampoline-javascript", function ( mode ) {
            return new StcFn( function ( modeVar ) {
                return new StcFn( function ( clientVar ) {
                    return new StcFn( function ( env ) {
                        return new StcFn( function ( body ) {
                            if ( !(mode instanceof StcForeign
                                && mode.purpose === "mode"
                                && !mode.foreignVal.finished
                                && mode.foreignVal.type === "js") )
                                throw new Error();
                            
                            var modeVarInternal =
                                parseString( modeVar );
                            var clientVarInternal =
                                parseString( clientVar );
                            
                            var keys = [];
                            var vals = [];
                            for (
                                var currentEnv = env;
                                currentEnv.tupleTag ===
                                    stcCons.getTupleTag();
                                currentEnv = stcCons.getProj(
                                    currentEnv, "cdr" )
                            ) {
                                var assoc = stcCons.getProj(
                                    currentEnv, "car" );
                                if ( assoc.tupleTag !==
                                    stcAssoc.getTupleTag() )
                                    throw new Error();
                                keys.push(
                                    parseString(
                                        stcAssoc.getProj(
                                            assoc, "key" ) ) );
                                vals.push(
                                    parseString(
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
                            recordVar( modeVarInternal );
                            recordVar( clientVarInternal );
                            arrEach( keys, function ( key ) {
                                recordVar( key );
                            } );
                            
                            var bodyInternal = parseString( body );
                            
                            return new StcForeign( "effects",
                                function ( collector ) {
                                
                                // TODO
                                throw new Error();
//                                return stcNil.ofNow();
                            } );
                        } );
                    } );
                } );
            } );
        } );
    }
    
    return {
        addCeneApi: addCeneApi
    };
}
