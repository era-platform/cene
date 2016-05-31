// era-staccato-lib-runner-mini.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.
//
// This is alternative JavaScript code to support running
// era-staccato-lib.stc. Most of it comes from
// era-staccato-lib-runner.js.
//
// The distinction of this file is that it processes a "mini" version
// of Staccato, which actually does not have most of the distinctive
// run time characteristics that make Staccato a worthwhile language.
// This "mini" Staccato dialect is effectively just for generating
// JavaScript.
//
// See era-staccato.js for more information about what Staccato is.


var stcNextGensymI = 0;
function stcGensym() {
    return "gs-" + stcNextGensymI++;
}


function stcIdentifier( identifier ) {
    return "_stc_" +
        JSON.stringify( identifier ).replace( /[^a-z01-9]/g,
            function ( c ) {
            
            if ( c === "-" )
                return "__";
            var hexWithExcess = "0000" +
                c.charCodeAt( 0 ).toString( 16 ).toUpperCase();
            return "_" +
                hexWithExcess.substring( hexWithExcess.length - 4 );
        } );
}

function stcCallArr( func, argsArr ) {
    var result = func;
    arrEach( argsArr, function ( arg ) {
        result =
            "macLookupThen( " + result + ", " +
                "function ( stcLocal_result ) {\n" +
            "    \n"
            "    return macLookupThen( " + arg + ", " +
                    "function ( stcLocal_arg ) {\n" +
            "        \n"
            "        return stcLocal_result.callStc( " +
                        "definitionNs, stcLocal_arg );\n" +
            "    } );\n" +
            "} )";
    } );
    return result;
}

function stcCall( func, var_args ) {
    return stcCallArr( func, [].slice.call( arguments, 1 ) );
}

function stcFn( var_args ) {
    var n = arguments.length;
    var vars = [].slice.call( arguments, 0, n - 1 );
    var body = arguments[ n - 1 ];
    var result = body;
    for ( var i = n - 2; 0 <= i; i-- ) {
        var va = vars[ i ];
        var vaIdentifier = stcIdentifier( va );
        result =
            "macLookupRet( " +
                "new StcFn( function ( " + vaIdentifier + " ) { " +
                
                "return " + result + "; " +
            "} ) )";
    }
    return result;
}

function stcConstructorName( definitionNs, stringyName ) {
    if ( typeof stringyName !== "string" )
        return stringyName;
    return stcNsGet( "name",
        stcNsGet( stringyName,
            stcNsGet( "constructor-names", definitionNs ) ) ).name;
}

function stcConstructorTag( definitionNs, constructorName ) {
    return stcNsGet( "tag",
        stcNsGet( constructorName,
            stcNsGet( "constructors", definitionNs ) ) ).name;
}

function stcProjectionName(
    definitionNs, constructorName, stringyName ) {
    
    if ( typeof stringyName !== "string" )
        return stringyName;
    return stcNsGet( "name",
        stcNsGet( stringyName,
            stcNsGet( "projection-names",
                stcNsGet( constructorName,
                    stcNsGet( "constructors",
                        definitionNs ) ) ) ) ).name;
}

function stcMacroName( definitionNs, stringyName ) {
    if ( typeof stringyName !== "string" )
        return stringyName;
    return stcNsGet( "name",
        stcNsGet( stringyName,
            stcNsGet( "macro-names", definitionNs ) ) ).name;
}

function nameCompare( a, b ) {
    if ( typeof a === "string" ) {
        if ( typeof b === "string" ) {
            return a < b ? -1 : b < a ? 1 : 0;
        } else if ( b[ 0 ] === "tuple-tag" ) {
            return -1;
        } else if ( b[ 0 ] === "root" ) {
            // NOTE: We let strings come before the root name because
            // that ordering remains stable even if we implement the
            // root name as a `get` name.
            return -1;
        } else if ( b[ 0 ] === "get" ) {
            return -1;
        } else {
            throw new Error();
        }
    } else if ( a[ 0 ] === "tuple-tag" ) {
        if ( typeof b === "string" ) {
            return 1;
        } else if ( b[ 0 ] === "tuple-tag" ) {
            var compareTupleNames = nameCompare( a[ 1 ], b[ 1 ] );
            if ( compareTupleNames !== 0 )
                return compareTupleNames;
            if ( a[ 2 ].length < b[ 2 ].length )
                return -1;
            if ( b[ 2 ].length < a[ 2 ].length )
                return 1;
            return (arrAny( a[ 2 ], function ( aProj, i ) {
                var bProj = b[ i ];
                var compareProjNames = nameCompare( aProj, bProj );
                return compareProjNames === 0 ? false :
                    { val: compareProjNames };
            } ) || { val: 0 }).val;
        } else if ( b[ 0 ] === "root" ) {
            return -1;
        } else if ( b[ 0 ] === "get" ) {
            return -1;
        } else {
            throw new Error();
        }
    } else if ( a[ 0 ] === "root" ) {
        if ( typeof b === "string" ) {
            return 1;
        } else if ( b[ 0 ] === "tuple-tag" ) {
            return 1;
        } else if ( b[ 0 ] === "root" ) {
            return 0;
        } else if ( b[ 0 ] === "get" ) {
            return -1;
        } else {
            throw new Error();
        }
    } else if ( a[ 0 ] === "get" ) {
        if ( typeof b === "string" ) {
            return 1;
        } else if ( b[ 0 ] === "tuple-tag" ) {
            return 1;
        } else if ( b[ 0 ] === "root" ) {
            return 1;
        } else if ( b[ 0 ] === "get" ) {
            // NOTE: This ends up ordering the names in a breath-first
            // way. If we needed any ordering in particular, it
            // probably wouldn't be this one, but for now an arbitrary
            // order is fine.
            var compareParents = nameCompare( a[ 2 ], b[ 2 ] );
            if ( compareParents !== 0 )
                return compareParents;
            return nameCompare( a[ 1 ], b[ 1 ] );
        } else {
            throw new Error();
        }
    } else {
        throw new Error();
    }
}

function stcTypeArr(
    definitionNs, tupleStringyName, projStringyNames ) {
    
    var constructorName =
        stcConstructorName( definitionNs, tupleStringyName );
    var tupleName =
        stcConstructorTag( definitionNs, constructorName );
    var projNames = arrMap( projStringyNames, function ( stringy ) {
        return stcProjectionName(
            definitionNs, constructorName, stringy );
    } );
    var sortedProjNames = arrMap( projNames, function ( name, i ) {
        return { i: i, name: name };
    } ).sort( function ( a, b ) {
        return nameCompare( a.name, b.name );
    } );
    var projNamesToSortedIndices = {};
    arrEach( sortedProjNames, function ( entry, i ) {
        var stringy = projStringyNames[ entry.i ];
        if ( typeof stringy !== "string" )
            return;
        projNamesToSortedIndices[ "|" + stringy ] = i;
    } );
    var tupleTag = JSON.stringify( stcNameTupleTagAlreadySorted(
        tupleName,
        arrMap( sortedProjNames, function ( entry ) {
            return entry.name;
        } )
    ) );
    var n = projNames.length;
    
    var result = {};
    result.type = "stcType";
    result.tupleName = tupleName;
    result.unsortedProjNames = projNames;
    result.sortedProjNames = sortedProjNames;
    result.getTupleTag = function () {
        return tupleTag;
    };
    result.getProj = function ( stc, projStringyName ) {
        if ( !(stc instanceof Stc) )
            throw new Error();
        if ( stc.tupleTag !== tupleTag )
            throw new Error();
        var i = projNamesToSortedIndices[ "|" + projStringyName ];
        if ( i === void 0 )
            throw new Error();
        return stc.projNames[ i ];
    };
    result.ofArr = function ( args ) {
        if ( args.length !== n )
            throw new Error();
        
        var projectionVals =
            arrMap( sortedProjNames, function ( entry ) {
                return args[ entry.i ];
            } );
        
        var result = "macLookupRet( " +
            "new Stc( " + JSON.stringify( tupleTag ) + ", [ " +
                arrMap( projectionVals, function ( entry, i ) {
                    return "stcLocal_proj" + i;
                } ).join( ", " ) +
            " ] ) )";
        for ( var i = projectionVals.length - 1; 0 <= i; i-- )
            result = "macLookupThen( " + projectionVals[ i ] + ", " +
                "function ( stcLocal_proj" + i + " ) {\n" +
            
            "return " + result + ";\n" +
            "} )";
        return result;
    };
    result.of = function ( var_args ) {
        return this.ofArr( [].slice.call( arguments, 0 ) );
    };
    result.ofArrNow = function ( args ) {
        if ( args.length !== n )
            throw new Error();
        
        return new Stc( tupleTag,
            arrMap( sortedProjNames, function ( entry ) {
                return args[ entry.i ];
            } ) );
    };
    result.ofNow = function ( var_args ) {
        return this.ofArrNow( [].slice.call( arguments, 0 ) );
    };
    return result;
}

function stcNsRoot() {
    return {
        name: [ "root" ],
        shadows: jsnMap()
    };
}
function stcNsGet( stringOrName, ns ) {
    return ns.shadows.has( stringOrName ) ?
        ns.shadows.get( stringOrName ) : {
            name: [ "get", stringOrName, ns.name ],
            shadows: jsnMap()
        };
}
function stcNsShadow( stringOrName, subNs, ns ) {
    return {
        name: ns.name,
        shadows: ns.shadows.plusEntry( stringOrName, subNs )
    };
}
function stcNameTupleTagAlreadySorted( tupleName, projNames ) {
    return [ "tuple-tag", tupleName, projNames ];
}
// NOTE: The term "nss" is supposed to be the plural of "ns," which
// means "namespace."
function nssGet( nss, stringOrName ) {
    return {
        definitionNs: nss.definitionNs,
        uniqueNs: stcNsGet( stringOrName, nss.uniqueNs )
    };
}

function stcType( definitionNs, tupleStringyName, var_args ) {
    return stcTypeArr( definitionNs, tupleStringyName,
        [].slice.call( arguments, 2 ) );
}


var staccatoDeclarationState = {};
staccatoDeclarationState.namespaceDefs = jsnMap();
staccatoDeclarationState.functionDefs = {};
function Stc( tupleTag, opt_projNames ) {
    this.tupleTag = tupleTag;
    this.projNames = opt_projNames || [];
}
Stc.prototype.callStc = function ( definitionNs, arg ) {
    // TODO: Look up the function implementation from `namespaceDefs`
    // /functions/<tupleTag>/staccato, at least when there's no entry
    // in `functionDefs`.
    var func = staccatoDeclarationState.functionDefs[ this.tupleTag ];
    return func( this.projNames, arg );
};
Stc.prototype.pretty = function () {
    return "(" +
        JSON.stringify(
            JSON.parse( this.tupleTag )[ 1 ][ 2 ][ 1 ][ 2 ][ 1 ] ) +
        arrMap( this.projNames, function ( elem, i ) {
            return " " + elem.pretty();
        } ).join( "" ) + ")";
};
function StcFn( func ) {
    this.func = func;
}
StcFn.prototype.callStc = function ( definitionNs, arg ) {
    var func = this.func;
    return func( arg );
};
StcFn.prototype.pretty = function () {
    return "(fn)";
};
function StcForeign( purpose, foreignVal ) {
    this.purpose = purpose;
    this.foreignVal = foreignVal;
}
StcForeign.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcForeign.prototype.pretty = function () {
    return "(foreign " + this.purpose + " " +
        JSON.stringify( this.foreignVal ) + ")";
};

function compareStc( a, b ) {
    var incomparableAtBest = false;
    var queue = [ { a: a, b: b } ];
    while ( queue.length !== 0 ) {
        var entry = queue.shift();
        if ( !(entry.a instanceof Stc && entry.b instanceof Stc) ) {
            incomparableAtBest = true;
            continue;
        }
        if ( entry.a.tupleTag !== entry.b.tupleTag )
            return false;
        var n = entry.a.projNames.length;
        if ( n !== entry.b.projNames.length )
            throw new Error();
        for ( var i = 0; i < n; i++ )
            queue.push( {
                a: entry.a.projNames[ i ],
                b: entry.b.projNames[ i ]
            } );
    }
    return incomparableAtBest ? null : true;
}

function stcTrivialStxDetails() {
    return new StcForeign( "macro-stx-details", null );
}

function assertMacroDoesNotExist( definitionNs, name ) {
    var resolvedMacroName = stcMacroName( definitionNs, name );
    var macroFunctionName =
        stcNsGet( "function",
            stcNsGet( resolvedMacroName,
                stcNsGet( "macros", definitionNs ) ) ).name;
    if ( staccatoDeclarationState.namespaceDefs.has(
        macroFunctionName ) )
        throw new Error();
    return macroFunctionName;
}

function collectSafe( rawMode, item ) {
    rawMode.safe.push( item );
}
function collectDefer( rawMode, item ) {
    rawMode.defer.push( item );
}
function runTrampoline( rawMode, defer, createNextMode, afterDefer ) {
    rawMode.finished = true;
    if ( rawMode.safe.length !== 0 ) {
        // NOTE: All the safe operations are commutative with each
        // other even though they're in JavaScript, so any order is
        // fine. We use first-in-first-out.
        return macLookupThen( rawMode.safe.shift()(),
            function ( ignored ) {
            
            return runTrampoline(
                rawMode, defer, createNextNode, afterDefer );
        } );
    }
    var n = 0;
    while ( rawMode.defer.length !== 0 ) (function () {
        n++;
        
        // TODO: Choose a deferred operation based on a much more
        // annoying principle than first-in-first-out. If people rely
        // on this, the monad won't be commutative.
        var body = rawMode.defer.shift();
        defer( function () {
            var nextMode = createNextMode( rawMode );
            
            return macLookupThen( body( nextMode ),
                function ( effects ) {
            
            if ( !(effects instanceof StcForeign
                && effects.purpose === "effects") )
                throw new Error();
            var effectsFunc = effects.foreignVal;
            
            return macLookupThen( effectsFunc( nextMode ),
                function ( ignored ) {
            
            return runTrampoline( nextMode, defer, createNextMode,
                function () {
                
                n--;
                if ( n === 0 )
                    defer( function () {
                        return afterDefer();
                    } );
                return macLookupRet( null );
            } );
            
            } );
            
            } );
        } );
    })();
    if ( n === 0 )
        defer( function () {
            return afterDefer();
        } );
    return macLookupRet( null );
}
function transferModesToFrom( rawModeTarget, rawModeSource ) {
    rawModeSource.finished = true;
    collectSafe( rawModeTarget, function () {
        if ( !rawModeSource.current )
            throw new Error();
        rawModeSource.current = false;
        
        while ( rawModeSource.safe.length !== 0 )
            rawModeTarget.safe.push( rawModeSource.safe.shift() );
        rawModeSource.safe = rawModeTarget.safe;
        
        while ( rawModeSource.defer.length !== 0 )
            rawModeTarget.defer.push( rawModeSource.defer.shift() );
        rawModeSource.defer = rawModeTarget.defer;
        
        return macLookupRet( null );
    } );
}

function macLookupRet( result ) {
    return { type: "ret", val: result };
}
function macLookupGet( name, err ) {
    return { type: "get", name: name, err: err };
}
function macLookupThen( macLookupEffects, then ) {
    return { type: "then", first: macLookupEffects, then: then };
}
function runMacLookups( macLookupEffectsArr ) {
    // TODO NOW: Finish implementing this, and use it.
    
    var threads = [].slice.call( macLookupEffectsArr );
    while ( threads.length !== 0 ) {
        var thread = threads.shift();
        if ( thread.type === "ret" ) {
            // TODO
        } else if ( thread.type === "get" ) {
            // TODO
        } else if ( thread.type === "then" ) {
            // TODO
        } else {
            throw new Error();
        }
    }
}
function runTopLevelMacLookupsSync( threads ) {
    arrEach( threads, function ( thread ) {
        if ( thread.type === "topLevelDefinitionThread" ) {
            var macLookupEffect = thread.topLevelDefinitionThread;
            
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
            // TODO NOW: Somehow run the macLookup effects resulting
            // from this macLookupThen call.
            macLookupThen( macLookupEffect( rawMode ),
                function ( ignored ) {
            macLookupThen(
                runTrampoline( rawMode, defer, createNextMode,
                    function () {
                    
                    done = true;
                    
                    return macLookupRet( null );
                } ),
                function ( ignored ) {
            
            return loop();
            function loop() {
                if ( deferred.length !== 0 ) {
                    return macLookupThen( deferred.shift()(),
                        function ( ignored ) {
                        
                        return loop();
                    } );
                } else {
                    if ( !done )
                        throw new Error( "Not done" );
                    
                    return macLookupRet( null );
                }
            }
            
            } );
            } );
            
        } else if ( thread.type === "jsEffectsThread" ) {
            var effects = thread.macLookupEffectsOfJsEffects;
            
            // TODO NOW: Somehow run the macLookup effects represented
            // by `effects`.
            
            if ( !(effects instanceof StcForeign
                && effects.purpose === "js-effects") )
                throw new Error();
            var effectsFunc = effects.foreignVal;
            effectsFunc();
        } else {
            throw new Error();
        }
    } );
}

function stcExecute( definitionNs, expr ) {
    return Function(
        "definitionNs", "Stc", "StcFn", "StcForeign", "macLookupRet",
        "macLookupThen",
        
        // NOTE: When the code we generate for this has local
        // variables, we consistently prefix them with "stcLocal_" or
        // "_stc_". The latter is for variables that correspond to
        // variables in the original code.
        "return " + expr + ";"
        
    )( definitionNs, Stc, StcFn, StcForeign, macLookupRet,
        macLookupThen );
}

function stcAddDefun( nss, name, argName, body ) {
    var tupleTagName = stcNameTupleTagAlreadySorted( name, [] );
    var tupleTag = JSON.stringify( tupleTagName );
    var staccatoName =
        stcNsGet( "staccato",
            stcNsGet( tupleTagName,
                stcNsGet( "functions", nss.definitionNs ) ) );
    var innerFunc = stcExecute( nss.definitionNs,
        "function ( " + stcIdentifier( argName ) + " ) { " +
            "return " + body + "; " +
        "}" );
    // TODO: Also add an entry to `namespaceDefs`. This naive Staccato
    // implementation doesn't do a full desugaring, so we can't create
    // the correct `stc-def`, but let's at least create an appropriate
    // `stc-def-foreign`.
    staccatoDeclarationState.functionDefs[ tupleTag ] =
        function ( projectionVals, argVal ) {
        
        return innerFunc( argVal );
    };
}

function stcErr( msg ) {
    return "(function () { " +
        "throw new Error( " + JSON.stringify( msg ) + " ); " +
    "})()";
}

function evalStcForTest( definitionNs, expr ) {
    return stcExecute( definitionNs, expr );
}

function usingDefinitionNs( macroDefNs ) {
    var stcCons = stcType( macroDefNs, "cons", "car", "cdr" );
    var stcNil = stcType( macroDefNs, "nil" );
    var stcIstringNil =
        stcType( macroDefNs, "istring-nil", "string" );
    var stcIstringCons = stcType( macroDefNs, "istring-cons",
        "string-past", "interpolated", "istring-rest" );
    var stcYep = stcType( macroDefNs, "yep", "val" );
    var stcNope = stcType( macroDefNs, "nope", "val" );
    var stcStx =
        stcType( macroDefNs, "stx", "stx-details", "s-expr" );
    var stcString = stcType( macroDefNs, "string", "val" );
    var stcName = stcType( macroDefNs, "name", "val" );
    var stcForeign = stcType( macroDefNs, "foreign", "val" );
    
    function callStcMulti( func, var_args ) {
        var args = arguments;
        var n = args.length;
        return loop( func, 0 );
        function loop( func, i ) {
            if ( n <= i )
                return macLookupRet( func );
            return macLookupThen( func.call( macroDefNs, args[ i ] ),
                function ( func ) {
                    return loop( func, i + 1 );
                } );
        }
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
    
    function stxToMaybeName( stx ) {
        if ( stx.tupleTag !== stcStx.getTupleTag() )
            return null;
        var sExpr = stcStx.getProj( stx, "s-expr" );
        if ( sExpr.tupleTag === stcForeign.getTupleTag() ) {
            var name = stcForeign.getProj( sExpr, "val" );
            if ( name.tupleTag !== stcName.getTupleTag() )
                throw new Error();
            var nameInternal = stcName.getProj( name, "val" );
            if ( !(nameInternal instanceof StcForeign
                && nameInternal.purpose === "name") )
                throw new Error();
            return nameInternal.foreignVal;
        } else if ( sExpr.tupleTag === stcIstringNil.getTupleTag() ) {
            return parseString(
                stcIstringNil.getProj( sExpr, "string" ) );
        } else {
            return null;
        }
    }
    
    function stcConsListToArray( stc ) {
        var result = [];
        for ( var currentStc = stc;
            currentStc.tupleTag === stcCons.getTupleTag();
            currentStc = stcCons.getProj( currentStc, "cdr" )
        ) {
            result.push( stcCons.getProj( currentStc, "car" ) );
        }
        return result;
    }
    
    function stcArrayToConsList( arr ) {
        var result = stcNil.ofNow();
        for ( var i = arr.length - 1; 0 <= i; i-- )
            result = stcCons.ofNow( arr[ i ], result );
        return result;
    }
    
    function getType( definitionNs, tupleName ) {
        var constructorName =
            stcConstructorName( definitionNs, tupleName );
        var projListName =
            stcNsGet( "projection-list",
                stcNsGet( constructorName,
                    stcNsGet( "constructors", definitionNs ) ) ).name;
        return macLookupThen(
            macLookupGet( projListName,
                function () {
                    throw new Error(
                        "No such type: " +
                        JSON.stringify( tupleName ) );
                } ),
            function ( projList ) {
            
            return macLookupRet(
                stcTypeArr( definitionNs, tupleName,
                    arrMap( stcConsListToArray( projList ),
                        function ( projName ) {
                        
                        if ( projName.tupleTag !==
                            stcName.getTupleTag() )
                            throw new Error();
                        var projNameInternal =
                            stcName.getProj( projName, "val" );
                        if ( !(projNameInternal instanceof StcForeign
                            && projNameInternal.purpose === "name") )
                            throw new Error();
                        return projNameInternal.foreignVal;
                    } ) ) );
        } );
    }
    
    function extractPattern( definitionNs, body ) {
        if ( body.tupleTag !== stcCons.getTupleTag() )
            throw new Error();
        var tupleNameExpr = stcCons.getProj( body, "car" );
        var tupleName = stxToMaybeName( tupleNameExpr );
        if ( tupleName === null )
            throw new Error(
                "Encountered a case branch with a tuple name that " +
                "wasn't a syntactic name: " +
                tupleNameExpr.pretty() );
        
        return macLookupThen( getType( definitionNs, tupleName ),
            function ( type ) {
            
            var remainingBody = stcCons.getProj( body, "cdr" );
            var localVars = [];
            var n = type.sortedProjNames.length;
            for ( var i = 0; i < n; i++ ) {
                if ( remainingBody.tupleTag !==
                    stcCons.getTupleTag() )
                    throw new Error();
                var localVar = stxToMaybeName(
                    stcCons.getProj( remainingBody, "car" ) );
                if ( localVar === null )
                    throw new Error();
                localVars.push( localVar );
                remainingBody =
                    stcCons.getProj( remainingBody, "cdr" );
            }
            
            var result = {};
            result.type = type;
            result.localVars = localVars;
            result.remainingBody = remainingBody;
            return macLookupRet( result );
        } );
    }
    
    function stcCaseletForRunner(
        nss, rawMode, maybeVa, matchSubject, body ) {
        
        function processTail( nss, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                return macLookupThen(
                    macroexpand( nss, rawMode,
                        stcCons.getProj( body, "car" ) ),
                    function ( expanded ) {
                    
                    return macLookupRet(
                        "return " + expanded + "; " );
                } );
            
            return macLookupThen(
                extractPattern( nss.definitionNs, body ),
                function ( pattern ) {
            
            if ( pattern.remainingBody.tupleTag !==
                stcCons.getTupleTag() )
                throw new Error();
            
            return macLookupThen(
                macroexpand( nssGet( nss, "then" ),
                    rawMode,
                    stcCons.getProj( pattern.remainingBody, "car" ) ),
                function ( then ) {
            
            var els = stcCons.getProj( pattern.remainingBody, "cdr" );
            
            return macLookupThen(
                processTail( nssGet( nss, "tail" ), els ),
                function ( processedTail ) {
            
            return macLookupRet( "if ( " +
                "stcLocal_matchSubject.tupleTag === " +
                    JSON.stringify( pattern.type.getTupleTag() ) +
                    " " +
            ") return (function () { " +
                arrMap( pattern.type.sortedProjNames,
                    function ( entry, i ) {
                    
                    return "var " +
                        stcIdentifier(
                            pattern.localVars[ entry.i ] ) +
                        " = " +
                        "stcLocal_matchSubject.projNames[ " +
                            i + " ]; ";
                } ).join( "" ) +
                "return " + then + "; " +
            "})(); " + processedTail );
            
            } );
            
            } );
            
            } );
        }
        
        return macLookupThen(
            macroexpand( nssGet( nss, "subject" ),
                rawMode, matchSubject ),
            function ( expandedSubject ) {
        return macLookupThen(
            processTail( nssGet( nss, "tail" ), body ),
            function ( processedTail ) {
        
        return macLookupRet(
            "macLookupThen( " + expandedSubject + ", " +
                "function ( stcLocal_matchSubject ) { " +
                
                (maybeVa === null ? "" :
                    "var " + stcIdentifier( maybeVa.val ) + " = " +
                        "stcLocal_matchSubject; ") +
                processedTail +
            "} )" );
        
        } );
        } );
    }
    
    function stcCast( nss, rawMode, matchSubject, body ) {
        return macLookupThen(
            extractPattern( nss.definitionNs, body ),
            function ( pattern ) {
        
        if ( pattern.remainingBody.tupleTag !==
            stcCons.getTupleTag() )
            throw new Error();
        var remainingBody1 =
            stcCons.getProj( pattern.remainingBody, "cdr" );
        if ( remainingBody1.tupleTag !== stcCons.getTupleTag() )
            throw new Error();
        var remainingBody2 = stcCons.getProj( remainingBody1, "cdr" );
        if ( remainingBody2.tupleTag === stcCons.getTupleTag() )
            throw new Error();
        
        return macLookupThen(
            macroexpand( nssGet( nss, "on-cast-err" ),
                rawMode,
                stcCons.getProj( pattern.remainingBody, "car" ) ),
            function ( onCastErr ) {
        return macLookupThen(
            macroexpand( nssGet( nss, "body" ),
                rawMode,
                stcCons.getProj( remainingBody1, "car" ) ),
            function ( body ) {
        return macLookupThen(
            macroexpand( nssGet( nss, "subject" ),
                rawMode, matchSubject ),
            function ( expandedSubject ) {
        
        return macLookupRet(
            "macLookupThen( " + expandedSubject + ", " +
                "function ( stcLocal_matchSubject ) { " +
                
                "if ( stcLocal_matchSubject.tupleTag === " +
                    JSON.stringify(
                        pattern.type.getTupleTag() ) + " " +
                ") return (function () { " +
                    arrMap( pattern.type.sortedProjNames,
                        function ( entry, i ) {
                        
                        return "var " +
                            stcIdentifier(
                                pattern.localVars[ entry.i ] ) +
                            " = " +
                            "stcLocal_matchSubject.projNames[ " +
                                i + " ]; ";
                    } ).join( "" ) +
                    "return " + body + "; " +
                "})(); " +
                "return " + onCastErr + "; " +
            "} )" );
        
        } );
        } );
        } );
        
        } );
    }
    
    function processFn( nss, rawMode, body ) {
        if ( body.tupleTag !== stcCons.getTupleTag() )
            throw new Error();
        var body1 = stcCons.getProj( body, "cdr" );
        if ( body1.tupleTag !== stcCons.getTupleTag() )
            return macroexpand( nss, rawMode,
                stcCons.getProj( body, "car" ) );
        var param = stcCons.getProj( body, "car" );
        var paramName = stxToMaybeName( param );
        if ( paramName === null )
            throw new Error(
                "Called fn with a variable name that wasn't a " +
                "syntactic name: " + param.pretty() );
        return macLookupThen( processFn( nss, rawMode, body1 ),
            function ( processedRest ) {
            
            return macLookupRet( stcFn( paramName, processedRest ) );
        } );
    }
    
    function mapConsListToArr( list, func ) {
        var result = [];
        for ( var e = list;
            e.tupleTag === stcCons.getTupleTag();
            e = stcCons.getProj( e, "cdr" )
        ) {
            result.push( func( stcCons.getProj( e, "car" ) ) );
        }
        if ( e.tupleTag !== stcNil.getTupleTag() )
            throw new Error();
        return result;
    }
    
    function revJsListToArr( jsList ) {
        var result = [];
        for ( var toGo = jsList; toGo !== null; toGo = toGo.rest )
            result.unshift( toGo.first );
        return result;
    }
    
    function mapmConsListToArrWithNss( nss, list, func ) {
        return go( nss, list, null );
        function go( currentNss, e, revResult ) {
            if ( e.tupleTag !== stcCons.getTupleTag() ) {
                if ( e.tupleTag !== stcNil.getTupleTag() )
                    throw new Error();
                
                return macLookupRet( revJsListToArr( revResult ) );
            }
            
            return macLookupThen(
                func( nssGet( currentNss, "first" ),
                    stcCons.getProj( e, "car" ) ),
                function ( elemResult ) {
                
                return go( nssGet( currentNss, "rest" ),
                    stcCons.getProj( e, "cdr" ),
                    { first: elemResult, rest: revResult } );
            } );
        }
    }
    
    function stcFnPure( func ) {
        return new StcFn( function ( arg ) {
            return macLookupRet( func( arg ) );
        } );
    }
    
    function stcAddEffectfulMacro(
        definitionNs, name, macroFunctionImpl ) {
        
        var macroFunctionName =
            assertMacroDoesNotExist( definitionNs, name );
        staccatoDeclarationState.namespaceDefs.set( macroFunctionName,
            stcFnPure( function ( mode ) {
                return stcFnPure( function ( uniqueNs ) {
                    return stcFnPure( function ( definitionNs ) {
                        return stcFnPure( function ( myStxDetails ) {
                            return stcFnPure( function ( body ) {
                                if ( !(mode instanceof StcForeign
                                    && mode.purpose === "mode"
                                    && mode.foreignVal.current
                                    && mode.foreignVal.type ===
                                        "macro") )
                                    throw new Error();
                                if ( !(uniqueNs instanceof StcForeign
                                    && uniqueNs.purpose === "ns") )
                                    throw new Error();
                                if ( !(definitionNs instanceof
                                        StcForeign
                                    && definitionNs.purpose === "ns") )
                                    throw new Error();
                                
                                return new StcForeign( "effects",
                                    function ( rawMode ) {
                                    
                                    // NOTE: This uses object identity.
                                    if ( mode.foreignVal !== rawMode )
                                        throw new Error();
                                    
                                    var effects = macroFunctionImpl( {
                                        definitionNs: definitionNs.foreignVal,
                                        uniqueNs: uniqueNs.foreignVal
                                    }, rawMode, myStxDetails, body );
                                    if ( !(effects instanceof StcForeign
                                        && effects.purpose === "effects") )
                                        throw new Error();
                                    var effectsFunc = effects.foreignVal;
                                    return effectsFunc( rawMode );
                                } );
                            } );
                        } );
                    } );
                } );
            } ) );
    }
    function stcAddMacro( definitionNs, name, macroFunctionImpl ) {
        stcAddEffectfulMacro( definitionNs, name,
            function ( nss, rawMode, myStxDetails, body ) {
            
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupThen(
                    macroFunctionImpl(
                        nss, rawMode, myStxDetails, body ),
                    function ( macroResult ) {
                    
                    return macLookupRet(
                        new StcForeign( "compiled-code",
                            macroResult ) );
                } );
            } );
        } );
    }
    
    function stcAddCoreMacros( targetDefNs ) {
        function effectfulMac( name, body ) {
            stcAddEffectfulMacro( targetDefNs, name, body );
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
                
                return macLookupRet( body( argVal ) );
            };
            processDefType( targetDefNs, name, [] );
        }
        
        effectfulMac( "def-type",
            function ( nss, rawMode, myStxDetails, body ) {
            
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            
            var tupleName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( tupleName === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                collectSafe( rawMode, function () {
                    assertMacroDoesNotExist(
                        nss.definitionNs, tupleName );
                    
                    var projNames = mapConsListToArr( body1,
                        function ( projName ) {
                            var projStringyName =
                                stxToMaybeName( projName );
                            if ( projStringyName === null )
                                throw new Error();
                            return projStringyName;
                        } );
                    processDefType(
                        nss.definitionNs, tupleName, projNames );
                    
                    return macLookupRet( null );
                } );
                return macLookupRet(
                    new StcForeign( "compiled-code", stcNil.of() ) );
            } );
        } );
        
        effectfulMac( "defn",
            function ( nss, rawMode, myStxDetails, body ) {
            
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            
            var name =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( name === null )
                throw new Error();
            
            var firstArg =
                stxToMaybeName( stcCons.getProj( body1, "car" ) );
            if ( name === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                collectSafe( rawMode, function () {
                    assertMacroDoesNotExist( nss.definitionNs, name );
                    
                    return macLookupThen(
                        processFn( nss, rawMode, body1 ),
                        function ( processedFn ) {
                        
                        stcAddDefun( nss,
                            stcConstructorTag( nss.definitionNs,
                                stcConstructorName(
                                    nss.definitionNs, name ) ),
                            firstArg,
                            stcCall( processedFn,
                                "macLookupRet( " +
                                    stcIdentifier( firstArg ) + " )"
                                ) );
                        processDefType( nss.definitionNs, name, [] );
                        
                        return macLookupRet( null );
                    } );
                } );
                return macLookupRet(
                    new StcForeign( "compiled-code", stcNil.of() ) );
            } );
        } );
        
        effectfulMac( "def-macro",
            function ( nss, rawMode, myStxDetails, body ) {
            
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            
            var name =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( name === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                collectSafe( rawMode, function () {
                    return macLookupThen(
                        processFn( nss, rawMode, body1 ),
                        function ( processedFn ) {
                        
                        var macroFunctionName =
                            assertMacroDoesNotExist(
                                nss.definitionNs, name );
                        staccatoDeclarationState.namespaceDefs.set(
                            macroFunctionName,
                            stcExecute( nss.definitionNs,
                                processedFn ) );
                        
                        return macLookupRet( null );
                    } );
                } );
                return macLookupRet(
                    new StcForeign( "compiled-code", stcNil.of() ) );
            } );
        } );
        
        // TODO: This doesn't really fit the side effect model. Design
        // a different approach to unit tests.
        effectfulMac( "test",
            function ( nss, rawMode, myStxDetails, body ) {
            
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( body2.tupleTag === stcCons.getTupleTag() )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                collectSafe( rawMode, function () {
                    return macLookupThen(
                        macroexpand( nssGet( nss, "a" ),
                            rawMode,
                            stcCons.getProj( body, "car" ) ),
                        function ( expandedA ) {
                    
                    var a =
                        evalStcForTest( nss.definitionNs, expandedA );
                    
                    return macLookupThen(
                        macroexpand( nssGet( nss, "b" ),
                            rawMode,
                            stcCons.getProj( body1, "car" ) ),
                        function ( expandedB ) {
                    
                    var b =
                        evalStcForTest( nss.definitionNs, expandedB );
                    
                    var match = compareStc( a, b );
                    
                    // NOTE: This can be true, false, or null.
                    if ( match === true )
                        console.log( "Test succeeded" );
                    else
                        console.log(
                            "Test failed: Expected " +
                            b.pretty() + ", got " + a.pretty() );
                    
                    return macLookupRet( null );
                    
                    } );
                    
                    } );
                } );
                return macLookupRet(
                    new StcForeign( "compiled-code", stcNil.of() ) );
            } );
        } );
        
        mac( "case", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            return stcCaseletForRunner( nss, rawMode, null,
                stcCons.getProj( body, "car" ),
                stcCons.getProj( body, "cdr" ) );
        } );
        
        mac( "caselet", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var va = stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( va === null )
                throw new Error();
            
            return stcCaseletForRunner( nss, rawMode, { val: va },
                stcCons.getProj( body1, "car" ),
                stcCons.getProj( body1, "cdr" ) );
        } );
        
        mac( "cast", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            return stcCast( nss, rawMode,
                stcCons.getProj( body, "car" ),
                stcCons.getProj( body, "cdr" ) );
        } );
        
        mac( "isa", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( body2.tupleTag === stcCons.getTupleTag() )
                throw new Error();
            var tupleNameExpr = stcCons.getProj( body, "car" );
            var tupleName = stxToMaybeName( tupleNameExpr );
            if ( tupleName === null )
                throw new Error(
                    "Encountered an isa with a tuple name that " +
                    "wasn't a syntactic name: " +
                    tupleNameExpr.pretty() );
            
            return macLookupThen(
                macroexpand( nss, rawMode,
                    stcCons.getProj( body1, "car" ) ),
                function ( expandedBody ) {
            return macLookupThen(
                getType( nss.definitionNs, tupleName ),
                function ( type ) {
            
            return macLookupRet(
                "macLookupThen( " + expandedBody + ", " +
                    "function ( stcLocal_body ) {\n" +
                "    \n" +
                "    return stcLocal_body.tupleTag === " +
                        JSON.stringify( type.getTupleTag() ) + " ? " +
                        stcYep.of( stcNil.of() ) + " : " +
                        stcNope.of( stcNil.of() ) + ";\n" +
                "} )" );
            
            } );
            } );
        } );
        
        mac( "proj1", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( body1.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( body2.tupleTag === stcCons.getTupleTag() )
                throw new Error();
            
            var va = stcStx.ofNow( myStxDetails,
                stcForeign.ofNow(
                    stcName.ofNow(
                        new StcForeign( "name",
                            nssGet( nss, "var" ).uniqueNs.name ) ) ) );
            return stcCast( nssGet( nss, "cast" ), rawMode,
                stcCons.getProj( body1, "car" ),
                stcArrayToConsList( [
                    stcCons.getProj( body, "car" ),
                    va,
                    stcStx.ofNow( myStxDetails,
                        stcArrayToConsList( [
                            stcStx.ofNow( myStxDetails,
                                stcForeign.ofNow(
                                    stcName.ofNow(
                                        new StcForeign( "name", stcMacroName( macroDefNs, "err" ) ) ) ) ),
                            stcStx.ofNow( myStxDetails,
                                stcIstringNil.ofNow(
                                    stcString.ofNow(
                                        new StcForeign( "string", "Internal error" ) ) ) )
                        ] ) ),
                    va
                ] ) );
        } );
        
        mac( "c", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            
            return macLookupThen(
                macroexpand( nssGet( nss, "func" ), rawMode,
                    stcCons.getProj( body, "car" ) ),
                function ( expandedFunc ) {
            return macLookupThen(
                mapmConsListToArrWithNss( nssGet( nss, "args" ),
                    stcCons.getProj( body, "cdr" ),
                    function ( nss, expr ) {
                    
                    return macroexpand( nss, rawMode, expr );
                } ),
                function ( expandedArgs ) {
            
            return macLookupRet(
                stcCallArr( expandedFunc, expandedArgs ) );
            
            } );
            } );
        } );
        
        mac( "c-new", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            var tupleName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( tupleName === null )
                throw new Error();
            var type = stcType( nss.definitionNs, tupleName );
            
            return macLookupThen(
                mapmConsListToArrWithNss( nss,
                    stcCons.getProj( body, "cdr" ),
                    function ( nss, expr ) {
                    
                    return macroexpand( nss, rawMode, expr );
                } ),
                function ( expandedArgs ) {
                
                return macLookupRet(
                    stcCallArr( type.of(), expandedArgs ) );
            } );
        } );
        
        function stxToDefiniteString( stx ) {
            if ( stx.tupleTag !== stcStx.getTupleTag() )
                throw new Error();
            var istringNil = stcStx.getProj( stx, "s-expr" );
            if ( istringNil.tupleTag !== stcIstringNil.getTupleTag() )
                throw new Error();
            return parseString(
                stcIstringNil.getProj( istringNil, "string" ) );
        }
        
        mac( "err", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            if ( stcCons.getProj( body, "cdr" ).tupleTag ===
                stcCons.getTupleTag() )
                throw new Error();
            return macLookupRet(
                stcErr(
                    stxToDefiniteString(
                        stcCons.getProj( body, "car" ) ) ) );
        } );
        
        mac( "str", function ( nss, rawMode, myStxDetails, body ) {
            if ( body.tupleTag !== stcCons.getTupleTag() )
                throw new Error();
            if ( stcCons.getProj( body, "cdr" ).tupleTag ===
                stcCons.getTupleTag() )
                throw new Error();
            return macLookupRet(
                stcString.of(
                    "macLookupRet( new StcForeign( \"string\", " +
                        JSON.stringify(
                            stxToDefiniteString(
                                stcCons.getProj( body, "car" ) ) ) +
                    " ) )" ) );
        } );
        
        mac( "fn", function ( nss, rawMode, myStxDetails, body ) {
            return processFn( nss, rawMode, body );
        } );
        
        mac( "let", function ( nss, rawMode, myStxDetails, body ) {
            return loop( body, nssGet( nss, "bindings" ) );
            function loop( remainingBody, bindingsNss ) {
                if ( remainingBody.tupleTag !==
                    stcCons.getTupleTag() )
                    throw new Error();
                var remainingBody1 =
                    stcCons.getProj( remainingBody, "cdr" );
                if ( remainingBody1.tupleTag !==
                    stcCons.getTupleTag() )
                    return macroexpand( nssGet( nss, "body" ),
                        rawMode,
                        stcCons.getProj( remainingBody, "car" ) );
                var va = stxToMaybeName(
                    stcCons.getProj( remainingBody, "car" ) );
                if ( va === null )
                    throw new Error();
                
                return macLookupThen(
                    macroexpand( nssGet( bindingsNss, "first" ),
                        rawMode,
                        stcCons.getProj( remainingBody1, "car" ) ),
                    function ( bindingVal ) {
                    
                    return macLookupThen(
                        loop(
                            stcCons.getProj( remainingBody1, "cdr" ),
                            nssGet( bindingsNss, "rest" ) ),
                        function ( loopResult ) {
                        
                        return macLookupRet(
                            "macLookupThen( " + bindingVal + ", " +
                                "function ( " +
                                    stcIdentifier( va ) + " ) {\n" +
                            "return " + loopResult + ";\n" +
                            "} )" );
                    } );
                } );
            }
        } );
        
        fun( "string-metacompare", function ( a ) {
            return stcFnPure( function ( b ) {
                var aParsed = parseString( a );
                var bParsed = parseString( b );
                
                // NOTE: We compare by UTF-16 encoding for efficiency,
                // but we don't expose it to user code because that
                // would commit us to the complexity of UTF-16.
                if ( aParsed < bParsed )
                    return new StcForeign( "lt", null );
                if ( bParsed < aParsed )
                    return new StcForeign( "gt", null );
                return stcNil.ofNow();
            } );
        } );
        
        fun( "string-append", function ( a ) {
            return stcFnPure( function ( b ) {
                return stcString.ofNow(
                    new StcForeign( "string",
                        parseString( a ) + parseString( b ) ) );
            } );
        } );
        
        fun( "name-metacompare", function ( a ) {
            return stcFnPure( function ( b ) {
                if ( a.tupleTag !== stcName.getTupleTag() )
                    throw new Error();
                var aInternal = stcName.getProj( a, "val" );
                if ( !(aInternal instanceof StcForeign
                    && aInternal.purpose === "name") )
                    throw new Error();
                
                if ( b.tupleTag !== stcName.getTupleTag() )
                    throw new Error();
                var bInternal = stcName.getProj( a, "val" );
                if ( !(bInternal instanceof StcForeign
                    && bInternal.purpose === "name") )
                    throw new Error();
                
                var result = nameCompare(
                    aInternal.foreignVal, bInternal.foreignVal );
                
                if ( result < 0 )
                    return new StcForeign( "lt", null );
                if ( 0 < result )
                    return new StcForeign( "gt", null );
                return stcNil.ofNow();
            } );
        } );
        
        fun( "make-tuple-tag", function ( tupleName ) {
            return stcFnPure( function ( projNames ) {
                var tupleStringyName = stxToMaybeName( tupleName );
                if ( tupleStringyName === null )
                    throw new Error();
                if ( typeof tupleStringyName === "string" )
                    throw new Error();
                var projStringyNames = mapConsListToArr( projNames,
                    function ( projName ) {
                        var projStringyName =
                            stxToMaybeName( projStringyName );
                        if ( projStringyName === null )
                            throw new Error();
                        if ( typeof projStringyName === "string" )
                            throw new Error();
                        return projStringyName;
                    } );
                return stcName.ofNow(
                    new StcForeign( "name",
                        stcNameTupleTagAlreadySorted(
                            stcConstructorTag( macroDefNs,
                                tupleStringyName ),
                            projStringyNames.sort( function ( a, b ) {
                                return nameCompare( a, b );
                            } ) ) ) );
            } );
        } );
        
        fun( "macro-stx-details", function ( mode ) {
            return stcFnPure( function ( uniqueNs ) {
                return stcFnPure( function ( definitionNs ) {
                    return stcFnPure( function ( stx ) {
                        return stcTrivialStxDetails();
                    } );
                } );
            } );
        } );
        
        fun( "ns-get-name", function ( name ) {
            return stcFnPure( function ( ns ) {
                if ( name.tupleTag !== stcName.getTupleTag() )
                    throw new Error();
                var nameInternal = stcName.getProj( name, "val" );
                if ( !(nameInternal instanceof StcForeign
                    && nameInternal.purpose === "name") )
                    throw new Error();
                
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return new StcForeign( "ns",
                    stcNsGet( nameInternal.foreignVal,
                        ns.foreignVal ) );
            } );
        } );
        
        fun( "ns-get-string", function ( string ) {
            return stcFnPure( function ( ns ) {
                var stringParsed = parseString( string );
                
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return new StcForeign( "ns",
                    stcNsGet( stringParsed, ns.foreignVal ) );
            } );
        } );
        
        fun( "ns-shadow-name", function ( name ) {
            return stcFnPure( function ( subNs ) {
                return stcFnPure( function ( ns ) {
                    if ( name.tupleTag !== stcName.getTupleTag() )
                        throw new Error();
                    var nameInternal = stcName.getProj( name, "val" );
                    if ( !(nameInternal instanceof StcForeign
                        && nameInternal.purpose === "name") )
                        throw new Error();
                    
                    if ( !(subNs instanceof StcForeign
                        && subNs.purpose === "ns") )
                        throw new Error();
                    
                    if ( !(ns instanceof StcForeign
                        && ns.purpose === "ns") )
                        throw new Error();
                    
                    return new StcForeign( "ns",
                        stcNsShadow( nameInternal.foreignVal,
                            subNs.foreignVal, ns.foreignVal ) );
                } );
            } );
        } );
        
        fun( "ns-shadow-string", function ( string ) {
            return stcFnPure( function ( subNs ) {
                return stcFnPure( function ( ns ) {
                    var stringParsed = parseString( string );
                    
                    if ( !(subNs instanceof StcForeign
                        && subNs.purpose === "ns") )
                        throw new Error();
                    
                    if ( !(ns instanceof StcForeign
                        && ns.purpose === "ns") )
                        throw new Error();
                    
                    return new StcForeign( "ns",
                        stcNsShadow( stringParsed,
                            subNs.foreignVal, ns.foreignVal ) );
                } );
            } );
        } );
        
        fun( "procure-name", function ( mode ) {
            return stcFnPure( function ( ns ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && mode.foreignVal.current
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return stcName.ofNow(
                    new StcForeign( "name", ns.foreignVal.name ) );
            } );
        } );
        
        fun( "procure-defined", function ( mode ) {
            return new StcFn( function ( ns ) {
                if ( !(mode instanceof StcForeign
                    && mode.purpose === "mode"
                    && mode.foreignVal.current
                    && mode.foreignVal.type === "macro") )
                    throw new Error();
                
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return macLookupGet( ns.foreignVal.name,
                    function () {
                        throw new Error(
                            "No such defined value: " +
                            JSON.stringify( ns.foreignVal.name ) );
                    } );
            } );
        } );
        
        fun( "procure-put-defined", function ( mode ) {
            return stcFnPure( function ( ns ) {
                return stcFnPure( function ( value ) {
                    return stcFnPure( function ( then ) {
                        if ( !(mode instanceof StcForeign
                            && mode.purpose === "mode"
                            && mode.foreignVal.current
                            && mode.foreignVal.type === "macro") )
                            throw new Error();
                        
                        if ( !(ns instanceof StcForeign
                            && ns.purpose === "ns") )
                            throw new Error();
                        
                        return new StcForeign( "effects",
                            function ( rawMode ) {
                            
                            // NOTE: This uses object identity.
                            if ( mode.foreignVal !== rawMode )
                                throw new Error();
                            
                            if ( staccatoDeclarationState.
                                namespaceDefs.has(
                                    ns.foreignVal.name ) )
                                throw new Error();
                            collectSafe( rawMode, function () {
                                staccatoDeclarationState.
                                    namespaceDefs.set( ns.foreignVal.name, value );
                                
                                return macLookupRet( null );
                            } );
                            collectDefer( rawMode,
                                function ( rawMode ) {
                                
                                return then.callStc( macroDefNs,
                                    new StcForeign( "mode", rawMode ) );
                            } );
                            return macLookupRet( stcNil.ofNow() );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "no-effects", function ( val ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupRet( val );
            } );
        } );
        
        fun( "bind-effects", function ( monad ) {
            return stcFnPure( function ( then ) {
                if ( !(monad instanceof StcForeign
                    && monad.purpose === "effects") )
                    throw new Error();
                var argFunc = monad.foreignVal;
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    return macLookupThen( argFunc( rawMode ),
                        function ( arg ) {
                    return macLookupThen( then.callStc( arg ),
                        function ( funcEffects ) {
                    
                    if ( !(funcEffects instanceof StcForeign
                        && funcEffects.purpose === "effects") )
                        throw new Error();
                    var funcFunc = funcEffects.foreignVal;
                    return funcFunc( rawMode );
                    
                    } );
                    } );
                } );
            } );
        } );
        
        fun( "assert-current-modality", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current) )
                throw new Error();
            return stcNil.ofNow();
        } );
        
        fun( "compile-expression", function ( mode ) {
            return stcFnPure( function ( uniqueNs ) {
                return stcFnPure( function ( definitionNs ) {
                    return stcFnPure( function ( stx ) {
                        return stcFnPure( function ( then ) {
                            if ( !(mode instanceof StcForeign
                                && mode.purpose === "mode"
                                && mode.foreignVal.current
                                && mode.foreignVal.type === "macro") )
                                throw new Error();
                            
                            if ( !(uniqueNs instanceof StcForeign
                                && uniqueNs.purpose === "ns") )
                                throw new Error();
                            
                            if ( !(definitionNs instanceof StcForeign
                                && definitionNs.purpose === "ns") )
                                throw new Error();
                            
                            return new StcForeign( "effects",
                                function ( rawMode ) {
                                
                                // NOTE: This uses object identity.
                                if ( mode.foreignVal !== rawMode )
                                    throw new Error();
                                
                                collectDefer( rawMode,
                                    function ( rawMode ) {
                                    
                                    return then.callStc( macroDefNs,
                                        new StcForeign( "mode", rawMode ) );
                                } );
                                
                                return macLookupThen(
                                    macroexpand( {
                                        definitionNs: definitionNs.foreignVal,
                                        uniqueNs: uniqueNs.foreignVal
                                    }, rawMode, stx ),
                                    function ( expandedResult ) {
                                    
                                    return macLookupRet(
                                        new StcForeign( "compiled-code", expandedResult ) );
                                } );
                            } );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "read-all-force", function ( string ) {
            return stcArrayToConsList( arrMap(
                readAll( parseString( string ) ),
                function ( tryExpr ) {
                
                if ( !tryExpr.ok )
                    throw new Error( tryExpr.msg );
                
                return readerExprToStc(
                    stcTrivialStxDetails(), tryExpr.val );
            } ) );
        } );
    }
    
    function macroexpand( nss, rawMode, locatedExpr ) {
        var identifier = stxToMaybeName( locatedExpr );
        if ( identifier !== null )
            return macLookupRet(
                "macLookupRet( " +
                    stcIdentifier( identifier ) + " )" );
        if ( locatedExpr.tupleTag !== stcStx.getTupleTag() )
            throw new Error();
        var sExpr = stcStx.getProj( locatedExpr, "s-expr" );
        if ( sExpr.tupleTag !== stcCons.getTupleTag() )
            throw new Error();
        var macroName =
            stxToMaybeName( stcCons.getProj( sExpr, "car" ) );
        if ( macroName === null )
            throw new Error();
        var resolvedMacroName =
            stcMacroName( nss.definitionNs, macroName );
        var macroFunctionName =
            stcNsGet( "function",
                stcNsGet( resolvedMacroName,
                    stcNsGet( "macros", nss.definitionNs ) ) ).name;
        
        return macLookupThen(
            macLookupGet( macroFunctionName,
                function () {
                    throw new Error(
                        "No such macro: " +
                        JSON.stringify( macroName ) );
                } ),
            function ( macroFunction ) {
        
        var newRawMode = {
            type: "macro",
            finished: null,
            current: true,
            safe: [],
            defer: []
        };
        
        return macLookupThen(
            callStcMulti( macroFunction,
                new StcForeign( "mode", newRawMode ),
                new StcForeign( "ns", nss.uniqueNs ),
                new StcForeign( "ns", nss.definitionNs ),
                stcTrivialStxDetails(),
                stcCons.getProj( sExpr, "cdr" ),
                stcCons.getProj( sExpr, "cdr" ) ),
            function ( macroResultEffects ) {
        
        if ( !(macroResultEffects instanceof StcForeign
            && macroResultEffects.purpose === "effects") )
            throw new Error();
        var macroResultFunc = macroResultEffects.foreignVal;
        
        return macLookupThen( macroResultFunc( newRawMode ),
            function ( macroResult ) {
        
        if ( !(macroResult instanceof StcForeign
            && macroResult.purpose === "compiled-code") )
            throw new Error();
        transferModesToFrom( rawMode, newRawMode );
        return macLookupRet( macroResult.foreignVal );
        
        } );
        
        } );
        
        } );
    }
    
    function processDefType( definitionNs, tupleName, projNames ) {
        var n = projNames.length;
        var type = stcTypeArr( definitionNs, tupleName, projNames );
        var constructorName =
            stcConstructorName( definitionNs, tupleName );
        var projListName =
            stcNsGet( "projection-list",
                stcNsGet( constructorName,
                    stcNsGet( "constructors", definitionNs ) ) ).name;
        if ( staccatoDeclarationState.namespaceDefs.has(
            projListName ) )
            throw new Error();
        staccatoDeclarationState.namespaceDefs.set( projListName,
            stcArrayToConsList( arrMap( type.unsortedProjNames,
                function ( name ) {
                
                return stcName.ofNow(
                    new StcForeign( "name", name ) );
            } ) ) );
        stcAddMacro( definitionNs, tupleName,
            function ( nss, rawMode, myStxDetails, body ) {
            
            return loop(
                0, null, body, nssGet( nss, "projections" ) );
            function loop(
                i, revProjVals, remainingBody, projectionsNss ) {
                
                if ( n <= i )
                    return next( revProjVals, remainingBody );
                
                if ( remainingBody.tupleTag !==
                    stcCons.getTupleTag() )
                    throw new Error(
                        "Expected more arguments to " +
                        JSON.stringify( tupleName ) );
                
                return macLookupThen(
                    macroexpand( nssGet( projectionsNss, "first" ),
                        rawMode,
                        stcCons.getProj( remainingBody, "car" ) ),
                    function ( projVal ) {
                    
                    return loop( i + 1,
                        { first: projVal, rest: revProjVals },
                        stcCons.getProj( remainingBody, "cdr" ),
                        nssGet( projectionsNss, "rest" ) );
                } );
            }
            
            function next( revProjVals, remainingBody ) {
                return macLookupThen(
                    mapmConsListToArrWithNss( nssGet( nss, "args" ),
                        remainingBody,
                        function ( nss, expr ) {
                        
                        return macroexpand( nss, rawMode, expr );
                    } ),
                    function ( expandedArgs ) {
                    
                    return macLookupRet(
                        stcCallArr(
                            type.ofArr(
                                revJsListToArr( revProjVals ) ),
                            expandedArgs ) );
                } );
            }
        } );
    }
    
    function processCoreTypes( definitionNs ) {
        
        function type( tupleName, projNames ) {
            processDefType( definitionNs, tupleName, projNames );
        }
        
        // These constructors are needed so that macros can generate
        // raw Staccato code.
        // TODO: See if we should keep the ones marked "sugar".
        type( "return", [ "val" ] );
        type( "call", [ "func", "arg" ] );
        type( "stc-def-foreign", [ "tuple-tag", "foreign" ] );
        type( "stc-def",
            [ "tuple-name", "opt-proj-pattern", "case-list" ] );
        type( "stc-let-case", [ "var", "case-list" ] );
        type( "stc-match", [
            "tuple-name", "opt-proj-pattern", "get-expr", "case-list"
            ] );
        type( "stc-any", [ "get-expr" ] );
        type( "stc-let-bindings-nil", [] );
        type( "stc-let-bindings-cons",
            [ "var", "get-expr", "let-bindings-expr" ] );
        type( "stc-proj-nil", [] );
        type( "stc-proj-cons",
            [ "proj-name", "get-expr", "proj-expr" ] );
        // sugar
        type( "stc-let-def", [ "def", "get-expr" ] );
        type( "stc-let", [ "let-bindings-expr", "get-expr" ] );
        type( "stc-local", [ "var" ] );
        type( "stc-foreign", [ "foreign" ] );
        type( "stc-do-what-you-think-is-best", [] );
        type( "stc-tuple", [ "tuple-name", "proj-expr" ] );
        // sugar
        type( "stc-save-root", [ "save-root", "get-expr" ] );
        // sugar
        type( "stc-save", [
            "save-root", "call-tuple-name",
            "call-func", "tuple-name", "opt-proj-pattern",
            "call-arg", "var", "arg" ] );
        // sugar
        type( "stc-fn",
            [ "tuple-name", "opt-proj-pattern", "case-list" ] );
        // sugar
        type( "stc-proj-pattern-omitted", [ "namespace" ] );
        type( "stc-proj-pattern", [ "proj-pattern" ] );
        type( "stc-proj-pattern-nil", [] );
        type( "stc-proj-pattern-cons",
            [ "proj-name", "var", "proj-pattern" ] );
        
        // These constructors are needed for interpreting the results
        // of certain built-in operators, namely `isa` for now.
        type( "yep", [ "val" ] );
        type( "nope", [ "val" ] );
        
        // These s-expression constructors are needed so that macros
        // can parse their s-expression arguments. The `cons` and
        // `nil` constructors are also needed for parsing and
        // generating projection lists.
        type( "nil", [] );
        type( "cons", [ "car", "cdr" ] );
        type( "istring-nil", [ "string" ] );
        type( "istring-cons",
            [ "string-past", "interpolated", "istring-rest" ] );
        type( "foreign", [ "val" ] );
        
        // This constructor is needed so that macros can parse their
        // located syntax arguments.
        type( "stx", [ "stx-details", "s-expr" ] );
        
        // These constructors aren't strictly needed, but several
        // built-in operators use these constructors so that it's more
        // convenient for user-level code to detect what type of value
        // it's dealing with.
        type( "string", [ "val" ] );
        type( "name", [ "val" ] );
    }
    
    function readerExprToStc( myStxDetails, readerExpr ) {
        if ( readerExpr.type === "nil" ) {
            return stcStx.ofNow( myStxDetails, stcNil.ofNow() );
        } else if ( readerExpr.type === "cons" ) {
            return stcStx.ofNow( myStxDetails,
                stcCons.ofNow(
                    readerExprToStc( myStxDetails, readerExpr.first ),
                    stcStx.getProj(
                        readerExprToStc( myStxDetails,
                            readerExpr.rest ),
                        "s-expr" )
                ) );
        } else if ( readerExpr.type === "stringNil" ) {
            return stcStx.ofNow( myStxDetails,
                stcIstringNil.ofNow(
                    stcString.ofNow(
                        new StcForeign( "string",
                            readerStringNilToString(
                                readerExpr ) ) ) ) );
        } else if ( readerExpr.type === "stringCons" ) {
            return stcStx.ofNow( myStxDetails,
                stcIstringCons.ofNow(
                    stcString.ofNow(
                        new StcForeign( "string",
                            readerStringListToString(
                                readerExpr.string ) ) ),
                    readerExprToStc( myStxDetails,
                        readerExpr.interpolation ),
                    stcStx.getProj(
                        readerExprToStc( myStxDetails,
                            readerExpr.rest ),
                        "s-expr" ) ) );
        } else {
            throw new Error();
        }
    }
    
    function topLevelTryExprsToMacLookupThreads( nss, tryExprs ) {
        var macLookupEffectsArr = [];
        var remainingNss = nss;
        arrEach( tryExprs, function ( tryExpr ) {
            if ( !tryExpr.ok )
                throw new Error( tryExpr.msg );
            
            var thisRemainingNss = remainingNss;
            
            macLookupEffectsArr.push( function ( rawMode ) {
                return macroexpand(
                    nssGet( thisRemainingNss, "first" ),
                    rawMode,
                    readerExprToStc(
                        stcTrivialStxDetails(), tryExpr.val ) );
            } );
            
            remainingNss = nssGet( thisRemainingNss, "rest" );
        } );
        return arrMap( macLookupEffectsArr, function ( effects ) {
            return { type: "topLevelDefinitionThread",
                macLookupEffectsOfDefinitionEffects: effects };
        } );
    }
    
    function runTopLevelTryExprsSync( nss, tryExprs ) {
        runTopLevelMacLookupsSync(
            topLevelTryExprsToMacLookupThreads( nss, tryExprs ) );
    }
    
    return {
        stcAddCoreMacros: stcAddCoreMacros,
        processCoreTypes: processCoreTypes,
        topLevelTryExprsToMacLookupThreads:
            topLevelTryExprsToMacLookupThreads,
        runTopLevelTryExprsSync: runTopLevelTryExprsSync,
        
        // NOTE: These are only needed for era-cene-api.js.
        processDefType: processDefType,
        stcArrayToConsList: stcArrayToConsList
    };
}
