// penknife-to-js.js
// Copyright 2014 Ross Angle. Released under the MIT License.
"use strict";

// TODO: When this file is feature-complete, move its contents into
// era-penknife.js and try it out.


function strToSource( str ) {
    return JSON.stringify( str ).
        replace( /\u2028/g, "\\u2028" ).
        replace( /\u2029/g, "\\u2029" );
}
function testStrToSource( str ) {
    if ( str !== Function( "return " + strToSource( str ) + ";" )() )
        throw new Error();
}
testStrToSource( "foo" );
testStrToSource( "\u2028" );
testStrToSource( "\u2029" );

function natCompare( yoke, a, b, then ) {
    return runWaitOne( yoke, function ( yoke ) {
        if ( a.tag === "nil" && b.tag === "nil" )
            return then( yoke, 0 );
        if ( a.tag === "nil" )
            return then( yoke, -1 );
        if ( b.tag === "nil" )
            return then( yoke, 1 );
        return natCompare( yoke, a.ind( 0 ), b.ind( 0 ), then );
    } );
}

function jsListFromArr( arr ) {
    var result = null;
    for ( var i = arr.length - 1; 0 <= i; i-- )
        result = { first: arr[ i ], rest: result };
    return result;
}
function jsList( var_args ) {
    return jsListFromArr( arguments );
}

function jsListRevAppend( yoke, backwardFirst, forwardSecond, then ) {
    if ( backwardFirst === null )
        return then( yoke, forwardSecond );
    return runWaitOne( yoke, function ( yoke ) {
        return jsListRevAppend( yoke, backwardFirst.rest,
            { first: backwardFirst.first, rest: forwardSecond },
            then );
    } );
}
function jsListRev( yoke, list, then ) {
    return jsListRevAppend( yoke, list, null,
        function ( yoke, result ) {
        
        return then( yoke, result );
    } );
}
function jsListAppend( yoke, a, b, then ) {
    return jsListRev( yoke, a, function ( yoke, revA ) {
        return jsListRevAppend( yoke, revA, b,
            function ( yoke, result ) {
            
            return then( yoke, result );
        } );
    } );
}
function jsListFoldl( yoke, init, list, func, then ) {
    return go( yoke, init, list );
    function go( yoke, init, list ) {
        if ( list === null )
            return then( yoke, init );
        return runWaitOne( yoke, function ( yoke ) {
            return func( yoke, init, list.first,
                function ( yoke, combined ) {
                
                return go( yoke, combined, list.rest );
            } );
        } );
    }
}
function jsListFlattenOnce( yoke, list, then ) {
    return go( yoke, list, pkNil );
    function go( yoke, list, revResult ) {
        if ( list === null )
            return listRev( yoke, revResult,
                function ( yoke, result ) {
                
                return then( yoke, result );
            } );
        return listRevAppend( yoke, list.first, revResult,
            function ( yoke, revResult ) {
            
            return runWaitOne( yoke, function ( yoke ) {
                return go( yoke, list.rest, revResult );
            } );
        } );
    }
}
function jsListCount( yoke, list, func, then ) {
    return jsListFoldl( yoke, pkNil, list,
        function ( yoke, count, elem, then ) {
        
        if ( func( elem ) )
            return then( yoke, pk( "succ", count ) );
        return then( yoke, count );
    }, function ( yoke, count ) {
        return then( yoke, count );
    } );
}
function jsListLen( yoke, list, then ) {
    return jsListCount( yoke, list, function ( elem ) {
        return true;
    }, function ( yoke, count ) {
        return then( yoke, count );
    } );
}
function jsListMap( yoke, list, func, then ) {
    return jsListFoldl( yoke, null, list,
        function ( yoke, revPast, elem, then ) {
        
        return func( yoke, elem, function ( yoke, elem ) {
            return then( yoke, { first: elem, rest: revPast } );
        } );
    }, function ( yoke, revResult ) {
        return jsListRev( yoke, revResult, function ( yoke, result ) {
            return then( yoke, result );
        } );
    } );
}
function jsListMappend( yoke, list, func, then ) {
    return jsListMap( yoke, list, function ( yoke, elem, then ) {
        return func( yoke, elem, then );
    }, function ( yoke, resultLists ) {
        return jsListFlattenOnce( yoke, resultLists,
            function ( yoke, result ) {
            
            return then( yoke, result );
        } );
    } );
}
function jsListMapMultiWithLen( yoke, nat, lists, func, then ) {
    return go( yoke, nat, lists, null );
    function go( yoke, nat, lists, revResults ) {
        if ( nat.tag !== "succ" )
            return jsListRev( yoke, revResults,
                function ( yoke, results ) {
                
                return then( yoke, results );
            } );
        return jsListMap( yoke, lists, function ( yoke, list, then ) {
            return then( yoke, list.first );
        }, function ( yoke, firsts ) {
            return jsListMap( yoke, lists, function ( yoke, list ) {
                return pkRet( yoke, list.rest );
            }, function ( yoke, rests ) {
                return func( yoke, firsts,
                    function ( yoke, resultElem ) {
                    
                    return go( yoke, nat.ind( 0 ), rests,
                        pkCons( resultElem, revResults ) );
                } );
            } );
        } );
    }
}
function jsListMapMulti( yoke, lists, func, then ) {
    if ( lists === null )
        throw new Error();
    return jsListLen( yoke, lists.first, function ( yoke, len ) {
        return jsListMapMultiWithLen( yoke, len, lists,
            function ( yoke, elems, then ) {
            
            return func( yoke, elems, function ( yoke, resultElem ) {
                return then( yoke, resultElem );
            } );
        }, function ( yoke, result ) {
            return then( yoke, result );
        } );
    } );
}
function jsListMapTwo( yoke, a, b, func, then ) {
    return jsListMapMulti( yoke, jsList( a, b ),
        function ( yoke, elems, then ) {
        
        return func( yoke, elems.first, elems.rest.first,
            function ( yoke, resultElem ) {
            
            return then( yoke, resultElem );
        } );
    }, function ( yoke, result ) {
        return then( yoke, result );
    } );
}
function pkListToJsList( yoke, pkList, then ) {
    return listFoldlJsAsync( yoke, null, pkList,
        function ( yoke, revPast, elem, then ) {
        
        return then( yoke, { first: elem, rest: revPast } );
    }, function ( yoke, revResult ) {
        return jsListRev( yoke, revResult, function ( yoke, result ) {
            return then( yoke, result );
        } );
    } );
}
function natToJsList( yoke, nat, then ) {
    return runWaitOne( yoke, function ( yoke ) {
        if ( nat.tag !== "succ" )
            return then( yoke, null );
        return natToJsList( yoke, nat.ind( 0 ),
            function ( yoke, rest ) {
            
            return { first: null, rest: rest };
        } );
    } );
}

// TODO: Right now this abuses Pk#toString(), which doesn't support
// bigints. Even if that method did support bigints, this operation's
// steps between yoke waits would take unbounded time. Fix this.
function natToJsStringAsync( yoke, nat, then ) {
    return runWaitOne( yoke, function ( yoke ) {
        return then( yoke, "" + nat );
    } );
}

function natToGs( yoke, nat, then ) {
    return natToJsStringAsync( yoke, nat, function ( yoke, numStr ) {
        return then( yoke, "gs" + numStr );
    } );
}
function natToParam( yoke, nat, then ) {
    return natToJsStringAsync( yoke, nat, function ( yoke, numStr ) {
        return then( yoke, "param" + numStr );
    } );
}

function getGs( yoke, gsi, then ) {
    return natToGs( yoke, gsi, function ( yoke, varName ) {
        return then( yoke, pk( "succ", gsi ), varName );
    } );
}

// NOTE: So far, the generated code snippets depend on the following
// free variables:
//
// new Pk().init_
// pkNil
// pkCons
// pkList
// pkRuntime.getVal
// pkRuntime.callMethod
// pkStrNameRaw
// pkQualifiedName
// pkYep
// pkPairName
// pkStrUnsafe
// runWaitTry
// pkDup
// listLenIsNat
// yoke
// pkErr

function getGsAndFinishWithExpr( yoke,
    gensymIndex, expr, revStatements, then ) {
    
    var gsi = gensymIndex;
    return getGs( yoke, gsi, function ( yoke, gsi, resultVar ) {
        return then( yoke, gsi, { ok: true, val: {
            revStatements: {
                first: { type: "sync",
                    code: "var " + resultVar + " = " + expr + ";" },
                rest: revStatements
            },
            resultVar: resultVar
        } } );
    } );
}

function compileCallOnLiteral( yoke,
    gensymIndex, funcCode, literalArg, then ) {
    
    var gsi = gensymIndex;
    
    return compileLiteral( yoke, gsi, literalArg,
        function ( yoke, gsi, compiledArg ) {
        
        if ( !compiledArg.ok )
            return then( yoke, null, compiledArg );
    
    return getGsAndFinishWithExpr( yoke, gsi,
        "" + funcCode + "( " + compiledArg.resultVar + " )",
        compiledArg.revStatements,
        function ( yoke, gsi, compiledResult ) {
        
        return then( yoke, gsi, compiledResult );
    } );
    
    } );
}
function compileCallOnLiteral2( yoke,
    gensymIndex, funcCode, literalArg1, literalArg2, then ) {
    
    var gsi = gensymIndex;
    
    return compileLiteral( yoke, gsi, literalArg1,
        function ( yoke, gsi, compiledArg1 ) {
        
        if ( !compiledArg1.ok )
            return then( yoke, null, compiledArg1 );
    
    return compileLiteral( yoke, gsi, literalArg2,
        function ( yoke, gsi, compiledArg2 ) {
        
        if ( !compiledArg1.ok )
            return then( yoke, null, compiledArg2 );
    
    return jsListAppend( yoke,
        compiledArg2.revStatements,
        compiledArg1.revStatements,
        function ( yoke, revStatements ) {
    
    return getGsAndFinishWithExpr( yoke, gsi,
        "" + funcCode + "( " +
            compiledArg1.resultVar + ", " +
            compiledArg2.resultVar " );"
        revStatements,
        function ( yoke, gsi, compiledResult ) {
        
        return then( yoke, gsi, compiledResult );
    } );
    
    } );
    
    } );
}

function compileListOfVars( yoke, gensymIndex, elemVars, then ) {
    var gsi = gensymIndex;
    return jsListFoldl( yoke,
        {
            gsi: gsi,
            resultSoFar: { revStatements: null, resultVar: "pkNil" }
        },
        elemVars,
        function ( yoke, state, elemVar, then ) {
        
        return getGs( yoke, state.gsi,
            function ( yoke, gsi, resultVar ) {
            
            return then( yoke, { gsi: state.gsi, resultSoFar: {
                revStatements: {
                    first: "var " + resultVar + " = pkCons( " +
                        elemVar + ", " +
                        state.resultSoFar.resultVar + " );",
                    rest: state.resultSoFar.revStatements
                },
                resultVar: resultVar
            } } );
        } );
    }, function ( yoke, state ) {
        return then( yoke, state.gsi, state.resultSoFar );
    } )
}

// NOTE: The word "zoke" is just a play on words since it's basically
// a second "yoke." We could have named this variable "state," but
// we have a local variable named that.
function jsListRevMapWithStateAndErrors( yoke, zoke,
    elems, processElem, then ) {
    
    return jsListFoldl( yoke,
        { ok: true, val: { zoke: zoke, revProcessed: null } },
        elems,
        function ( yoke, state, elem, then ) {
        
        if ( !state.ok )
            return then( yoke, state );
        
        return processElem( yoke, state.val.zoke, elem,
            function ( yoke, zoke, compiledElem ) {
            
            if ( !compiledElem.ok )
                return then( yoke, compiledElem );
            
            return then( yoke, { ok: true, val: {
                zoke: zoke,
                revProcessed: { first: compiledElem.val,
                    rest: state.val.revProcessed }
            } } );
        } );
    }, function ( yoke, state ) {
        if ( !state.ok )
            return then( yoke, null, state );
        return then( yoke, state.zoke,
            { ok: true, val: state.revProcessed } );
    } );
}

function compileMapToVars( yoke,
    gensymIndex, elems, compileElem, then ) {
    
    var gsi = gensymIndex;
    return jsListRevMapWithStateAndErrors( yoke, gsi, elems,
        function ( yoke, gsi, elem, then ) {
        
        return compileElem( yoke, gsi, elem,
            function ( yoke, gsi, compiledElem ) {
            
            return then( yoke, gsi, compiledElem );
        } );
    }, function ( yoke, gsi, revCompiledElems ) {
        
        if ( !revCompiledElems.ok )
            return then( yoke, null, null, null, revCompiledElems );
    
    return jsListMappend( yoke, state.revCompiledElems,
        function ( yoke, compiledElem, then ) {
        
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, compiledElem.revStatements );
        } );
    }, function ( yoke, revStatements ) {
    return jsListMap( yoke, state.revCompiledElems,
        function ( yoke, compiledElem, then ) {
        
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, compiledElem.resultVar );
        } );
    }, function ( yoke, revElemVars ) {
    return jsListRev( yoke, revElemVars,
        function ( yoke, elemVars ) {
    
    return then( yoke, gsi, revStatements, elemVars,
        { ok: true, val: null } );
    
    } );
    } );
    } );
    
    } );
}

function compileMapToList( yoke,
    gensymIndex, elems, compileElem, then ) {
    
    var gsi = gensymIndex;
    return compileMapToVars( yoke, gsi, elems, compileElem,
        function ( yoke, gsi, revStatements, elemVars, valid ) {
        
        if ( !valid.ok )
            return then( yoke, null, valid );
        
    return compileListOfVars( yoke, gsi, elemVars,
        function ( yoke, gsi, compiledElems ) {
    return jsListAppend( yoke,
        compiledElems.revStatements,
        revStatements,
        function ( yoke, revStatements ) {
    
    return then( yoke, gsi, { ok: true, val: {
        revStatements: revStatements,
        resultVar: compiledElems.resultVar
    } } );
    
    } );
    } );
    
    } );
}

function compileListToVars( yoke,
    gensymIndex, compiledList, len, then ) {
    
    var gsi = gensymIndex;
    return natToJsList( yoke, len, function ( yoke, len ) {
    return jsListRevMapWithStateAndErrors( yoke,
        { gsi: gsi, lastListVar: compiledList.resultVar },
        len,
        function ( yoke, state, ignored, then ) {
        
        return getGs( yoke, state.gsi,
            function ( yoke, gsi, restVar ) {
        return getGs( yoke, gsi,
            function ( yoke, gsi, elemVar ) {
        
        return then( yoke, { gsi: gsi, lastListVar: restVar },
            { ok: true, val: {
            
            revStatements: jsList( {
                type: "sync",
                code: "var " + restVar + " = " +
                    state.lastListVar + ".ind( 1 );"
            }, {
                type: "sync",
                code: "var " + elemVar + " = " +
                    state.lastListVar + ".ind( 0 );"
            } ),
            resultVar: elemVar
        } } );
        
        } );
        } );
    }, function ( yoke, state, revCompiledElems ) {
        
        if ( !revCompiledElems.ok )
            return then( yoke, null, null, null, revCompiledElems );
    
    return jsListMappend( yoke, revCompiledElems.val,
        function ( yoke, compiledElem, then ) {
        
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, compiledElem.revStatements );
        } );
    }, function ( yoke, compiledElemsRevStatements ) {
    return jsListMap( yoke, revCompiledElems.val,
        function ( yoke, compiledElem, then ) {
        
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, compiledElem.resultVar );
        } );
    }, function ( yoke, revCompiledElemVars ) {
    return jsListRev( yoke, revCompiledElemVars,
        function ( yoke, compiledElemVars ) {
    return jsListAppend( yoke,
        compiledElemsRevStatements,
        compiledList.revStatements,
        function ( yoke, revStatements ) {
    
    return then( yoke, state.gsi, revStatements, compiledElemVars,
        { ok: true, val: null } );
    
    } );
    } );
    } );
    } );
    
    } );
    } );
}

function compileDups( yoke,
    gensymIndex, compiledSource, numberOfDups, then ) {
    
    var gsi = gensymIndex;
    
    return compileLiteral( yoke, gsi, numberOfDups,
        function ( yoke, gsi, compiledNumberOfDups ) {
        
        if ( !compiledNumberOfDups.ok )
            return then( yoke,
                null, null, null, compiledNumberOfDups );
    
    return jsListAppend( yoke,
        compiledNumberOfDups.val.revStatements,
        compiledSource.val.revStatements,
        function ( yoke, revStatements ) {
    return getGs( yoke, gsi, function ( yoke, gsi, callbackVar ) {
    return getGs( yoke, gsi, function ( yoke, gsi, dupsVar ) {
    return compileListToVars( yoke, gsi,
        {
            revStatements: {
                first: {
                    type: "async",
                    callbackVar: callbackVar,
                    resultVar: dupsVar,
                    code:
                        "runWaitTry( yoke, function ( yoke ) {\n" +
                        "    return pkDup( yoke, " +
                                compiledSource.resultVar + ", " +
                                compiledNumberOfDups.val.resultVar +
                                " " +
                            ");\n" +
                        "}, " + callbackVar + " )"
                },
                rest: revStatements
            },
            resultVar: dupsVar
        },
        numberOfDups,
        function ( yoke,
            gsi, revStatements, compiledDupVars, valid ) {
        
        if ( !valid.ok )
            return then( yoke, null, null, null, valid );
    
    return then( yoke, gsi, revStatements, compiledDupVars,
        { ok: true, val: null } );
    
    } );
    } );
    } );
    } );
    
    } );
}

function compileLiteral( yoke, gensymIndex, pkVal, then ) {
    var gsi = gensymIndex;
    
    function waitErr( yoke, message ) {
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, null, { ok: false, val: message } );
        } );
    }
    
    if ( pkVal.isLinear() ) {
        // NOTE: This case would technically be unnecessary if we
        // checked for nonlinear-as-linear instead, but we might as
        // well get it out of the way early on, since we can.
        return waitErr( yoke,
            "Tried to compile a literal value that was linear" );
    } else if ( pkVal.tag === "nil" ) {
        return then( yoke, gsi, { ok: true, val: {
            revStatements: null,
            resultVar: "pkNil"
        } } );
    } else if ( pkVal.tag === "cons" ) {
        return compileCallOnLiteral2( yoke, gsi,
            "pkCons", pkVal.ind( 0 ), pkVal.ind( 1 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( pkVal.tag === "string" ) {
        return getGsAndFinishWithExpr( yoke, gsi,
            "pkStrUnsafe( " +
                strToSource( pkVal.special.jsStr ) + ")",
            null,
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( pkVal.tag === "string-name" ) {
        return compileCallOnLiteral( yoke, gsi,
            "pkStrNameRaw", pkVal.ind( 0 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( pkVal.tag === "pair-name" ) {
        return compileCallOnLiteral2( yoke, gsi,
            "pkPairName", pkVal.ind( 0 ), pkVal.ind( 1 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( pkVal.tag === "qualified-name" ) {
        return compileCallOnLiteral( yoke, gsi,
            "pkQualifiedName", pkVal.ind( 0 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( pkVal.tag === "yep" ) {
        return compileCallOnLiteral( yoke, gsi,
            "pkYep", pkVal.ind( 0 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( pkVal.tag === "linear-as-nonlinear" ) {
        return waitErr( yoke,
            "Tried to compile a literal linear-as-nonlinear" );
    } else if ( pkVal.tag === "token" ) {
        return waitErr( yoke, "Tried to compile a literal token" );
    } else if ( pkVal.tag === "fn" ) {
        return waitErr( yoke, "Tried to compile a literal fn" );
    } else {
        // NOTE: At this point, we know pkIsStruct( pkVal ) is true.
        return pkListToJsList( yoke, pkGetArgs( pkVal ),
            function ( yoke, literalArgs ) {
        return compileMapToList( yoke, gsi, literalArgs,
            function ( yoke, gsi, literalArg, then ) {
            
            return compileLiteral( yoke, gsi, literalArg,
                function ( yoke, gsi, compiledArg ) {
                
                return then( yoke, gsi, compiledArg );
            } );
        }, function ( yoke, gsi, compiledArgs ) {
            if ( !compiledArgs.ok )
                return then( yoke, null, compiledArgs );
        
        return getGsAndFinishWithExpr( yoke, gsi,
            "new Pk().init_( null, " +
                strToSource( pkVal.tag ) + ", " +
                compiledArgs.val.resultVar + ", " +
                compiledArgs.val.resultVar + ".isLinear(), {} )",
            compiledArgs.val.revStatements,
            function ( yoke, gsi, compiledResult ) {
        
        return then( yoke, gsi, compiledResult );
        
        } );
        
        } );
        } );
    }
}

function compileEssence(
    yoke, gensymIndex, numParams, essence, then ) {
    
    var gsi = gensymIndex;
    
    if ( essence.tag === "literal-essence" ) {
        return compileLiteral( yoke, gsi, essence.ind( 0 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( essence.tag === "main-essence" ) {
        return compileCallOnLiteral( yoke, gsi,
            "pkRuntime.getVal", essence.ind( 0 ),
            function ( yoke, gsi, compiled ) {
            
            return then( yoke, gsi, compiled );
        } );
    } else if ( essence.tag === "call-essence" ) {
        return compileEssence( yoke, gsi, numParams, essence.ind( 0 ),
            function ( yoke, gsi, compiledOp ) {
            
            if ( !compiledOp.ok )
                return then( yoke, null, compiledOp );
        
        return pkListToJsList( yoke, essence.ind( 1 ),
            function ( yoke, argEssences ) {
        return compileMapToList( yoke, gsi, argEssences,
            function ( yoke, gsi, argEssence, then ) {
            
            return compileEssence( yoke, gsi, numParams, argEssence,
                function ( yoke, gsi, compiledArg ) {
                
                return then( yoke, null, compiledArg );
            } );
        }, function ( yoke, gsi, compiledArgs ) {
            if ( !compiledArgs.ok )
                return then( yoke, null, compiledArgs );
        
        return getGs( yoke, gsi, function ( yoke, gsi, callbackVar ) {
        return getGs( yoke, gsi, function ( yoke, gsi, resultVar ) {
        
        return then( yoke, gsi, { ok: true, val: {
            revStatements: {
                first: {
                    type: "async",
                    callbackVar: callbackVar,
                    resultVar: resultVar,
                    code:
                        "runWaitTry( yoke, function ( yoke ) {\n" +
                        "    return pkRuntime.callMethod( yoke, " +
                                "\"call\", " +
                                "pkList( " +
                                    compiledOp.val.resultVar + ", " +
                                    compiledArgs.val.resultVar + " " +
                                ") " +
                            ");\n" +
                        "}, " + callbackVar + " )"
                },
                rest: compiledArgs.val.revStatements
            },
            resultVar: resultVar
        } } );
        
        } );
        } );
        
        } );
        } );
        
        } );
    } else if ( essence.tag === "param-essence" ) {
        var i = essence.ind( 0 );
        return natCompare( yoke, i, numParams,
            function ( yoke, compared ) {
            
            if ( !(compared < 0) )
                return then( yoke, null, { ok: false, val:
                    "Tried to compile a param-essence which had an " +
                    "index that was out of range" } );
        
            return natToParam( yoke, i, function ( yoke, resultVar ) {
                return then( yoke, gsi, { ok: true, val: {
                    revStatements: null,
                    resultVar: resultVar
                } } );
            } );
        } );
    } else if ( essence.tag === "fn-essence" ) {
        // TODO: Implement this.
    } else if ( essence.tag === "essence-for-if" ) {
        // TODO: Implement this.
    } else if ( essence.tag === "let-list-essence" ) {
        var sourceEssence = essence.ind( 0 );
        var captureEssences = essence.ind( 1 );
        var numbersOfDups = essence.ind( 2 );
        var bodyEssence = essence.ind( 3 );
        return compileEssence( yoke, gsi, numParams, sourceEssence,
            function ( yoke, gsi, compiledSource ) {
            
            if ( !compiledSource.ok )
                return then( yoke, null, compiledSource );
        
        return pkListToJsList( yoke, captureEssences,
            function ( yoke, captureEssences ) {
        return compileMapToVars( yoke, gsi, captureEssences,
            function ( yoke, gsi, argEssence, then ) {
            
            return compileEssence( yoke, gsi, numParams, argEssence,
                function ( yoke, gsi, compiledArg ) {
                
                return then( yoke, gsi, compiledArg );
            } );
        }, function ( yoke,
            gsi, captureVarsRevStatements, captureVars, valid ) {
            
            if ( !valid.ok )
                return then( yoke, null, valid );
        
        return listLen( yoke, numbersOfDups,
            function ( yoke, numberOfElems ) {
        return compileLiteral( yoke, gsi, numberOfElems,
            function ( yoke, gsi, compiledNumberOfElems ) {
            
            if ( !compiledNumberOfElems.ok )
                return then( yoke, null, compiledNumberOfElems );
        
        return getGs( yoke, gsi, function ( yoke, gsi, callbackVar ) {
        return getGs( yoke, gsi, function ( yoke, gsi, ignoredVar ) {
        return compileListToVars( yoke, gsi,
            {
                revStatements: {
                    first: {
                        type: "async",
                        callbackVar: callbackVar,
                        resultVar: ignoredVar,
                        code:
"runWaitTry( yoke, function ( yoke ) {\n" +
"    return listLenIsNat( yoke, " +
        compiledSource.val.resultVar + ", " +
        compiledNumberOfElems.val.resultVar + ",\n" +
"        function ( yoke, valid ) {\n" +
"        \n" +
"        if ( !valid )\n" +
"            return pkErr( yoke,\n" +
"                \"Got the wrong number of elements when \" +\n" +
"                \"destructuring a list\" );\n" +
"        return pkRet( yoke, pkNil );\n" +
"    } );\n" +
"}, " + callbackVar + " )"
                    },
                    rest: compiledNumberOfElems.val.revStatements
                },
                resultVar: compiledSource.val.resultVar
            },
            numberOfElems,
            function ( yoke,
                gsi, elemsRevStatements, elemVars, valid ) {
            
            if ( !valid.ok )
                return then( yoke, null, valid );
        
        return pkListToJsList( yoke, numbersOfDups,
            function ( yoke, numbersOfDups ) {
        return jsListMapTwo( yoke, elemVars, numbersOfDups,
            function ( yoke, elemVar, numberOfDups, then ) {
            
            return runWaitOne( yoke, function ( yoke ) {
                return then( yoke, {
                    elemVar: elemVar,
                    numberOfDups: numberOfDups
                } );
            } );
        }, function ( yoke, elemVarsAndNumbersOfDups ) {
        return jsListRevMapWithStateAndErrors( yoke, gsi,
            elemVarsAndNumbersOfDups,
            function ( yoke, gsi, entry, then ) {
            
            return compileDups( yoke, gsi,
                { revStatements: null, resultVar: entry.elemVar },
                entry.numberOfDups,
                function ( yoke,
                    gsi, revStatements, dupVars, valid ) {
                
                if ( !valid.ok )
                    return then( yoke, null, valid );
                
                return then( yoke, gsi, { ok: true, val: {
                    revStatements: revStatements,
                    dupVars: dupVars
                } } );
            } );
        }, function ( yoke, state, revCompiledDups ) {
            
            if ( !revCompiledDups.ok )
                return then( yoke, null, revCompiledDups );
        
        return jsListMappend( yoke, revCompiledDups.val,
            function ( yoke, compiledDupList, then ) {
            
            return runWaitOne( yoke, function ( yoke ) {
                return then( yoke, compiledDupList.revStatements );
            } );
        }, function ( yoke, compiledDupListsRevStatements ) {
        return jsListFlattenOnce( yoke, jsList(
            // TODO: Compile bodyEssence, and execute it here.
            // TODO: Unroll the captureVars and the revCompiledDups
            // into param variables.
            compiledDupListsRevStatements,
            elemsRevStatements,
            captureVarsRevStatements,
            compiledSource.val.revStatements
        ), function ( yoke, revStatements ) {
        
        // TODO: Implement this.
        
        } );
        } );
        
        } );
        } );
        } );
        
        } );
        } );
        } );
        
        } );
        } );
        
        } );
        } );
        
        } );
    } else {
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, null, { ok: false, val:
                "Tried to compile a value that wasn't of a " +
                "recognized essence type" } );
        } );
    }
}
