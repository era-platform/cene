// era-staccato-lib-runner-mini.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.
//
// This file implements the main Cene runtime and built-in operators.


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
            "    \n" +
            "    return macLookupThen( " + arg + ", " +
                    "function ( stcLocal_arg ) {\n" +
            "        \n" +
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

function jsnCompare( a, b ) {
    function rank( x ) {
        var result = 0;
        if ( x === null )
            return result;
        result++;
        if ( typeof x === "number" && x < 0 )
            return result;
        result++;
        if ( x === 0 && 1 / x === 1 / -0 )
            return result;
        result++;
        if ( x !== x )
            return result;
        result++;
        if ( x === 0 && 1 / x === 1 / 0 )
            return result;
        result++;
        if ( typeof x === "number" && 0 < x )
            return result;
        result++;
        if ( typeof x === "string" )
            return result;
        result++;
        if ( isArray( x ) )
            return result;
        
        throw new Error();
    }
    function compareByBuiltIn( a, b ) {
        if ( a < b )
            return -1;
        if ( b < a )
            return 1;
        return 0;
    }
    var compareByRank = compareByBuiltIn( rank( a ), rank( b ) );
    if ( compareByRank !== 0 )
        return compareByRank;
    if ( typeof a === "string" || typeof a == "number" )
        return compareByBuiltIn( a, b );
    if ( isArray( a ) ) {
        // We compare by lexicographic order.
        for ( var i = 0, n = a.length, bn = b.length; i < n; i++ ) {
            if ( bn <= i )
                return 1;
            var compareElem = compareByBuiltIn( a[ i ], b[ i ] );
            if ( compareElem !== 0 )
                return compareElem;
        }
        return -1;
    }
    throw new Error();
}

function nameCompare( a, b ) {
    return jsnCompare( a, b );
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
    var unsortedProjNames = arrMap( projNames, function ( name, i ) {
        return { i: projNamesToSortedIndices[ "|" + name ],
            name: name };
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
    result.unsortedProjNames = unsortedProjNames;
    result.sortedProjNames = sortedProjNames;
    result.getTupleTag = function () {
        return tupleTag;
    };
    result.tags = function ( x ) {
        return x instanceof Stc && x.tupleTag === tupleTag;
    };
    result.getProj = function ( stc, projStringyName ) {
        if ( !(stc instanceof Stc
            && stc.tupleTag === tupleTag) )
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
            "new Stc( " + jsStr( tupleTag ) + ", [ " +
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
    
    // TODO: Determine a good value for this.
    var maxRepetitions = 1000;
    
    return ns.shadows.has( stringOrName ) ?
        ns.shadows.get( stringOrName ) : {
            name:
                (ns.name[ 0 ] === "get"
                    && ns.name[ 2 ] + 1 <= maxRepetitions
                    && nameCompare( ns.name[ 1 ], stringOrName ) ===
                        0) ?
                    [ "get", stringOrName, ns.name[ 2 ] + 1,
                        ns.name[ 3 ] ] :
                    [ "get", stringOrName, 1, ns.name ],
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

function macLookupRet( result ) {
    return { type: "ret", val: result };
}
function macLookupGet( name, err ) {
    return { type: "get", name: name, err: err };
}
function macLookupThen( macLookupEffects, then ) {
    return { type: "then", first: macLookupEffects, then: then };
}


var staccatoDeclarationState = {};
staccatoDeclarationState.namespaceDefs = jsnMap();
staccatoDeclarationState.functionDefs = {};

var nextCmpRank = 1;

function prettifyTupleTag( tupleTag ) {
    return JSON.stringify(
        JSON.parse( tupleTag )[ 1 ][ 3 ][ 1 ][ 3 ][ 1 ] );
}

function stcIncomparable(
    definitionNs, leftComparable, rightComparable ) {
    
    if ( leftComparable && rightComparable )
        return null;
    
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    var stcCmpResultIncomparable =
        stcType( definitionNs, "cmp-result-incomparable",
            "left-is-comparable", "right-is-comparable" );
    
    var nil = stcNil.ofNow();
    
    function fromBoolean( b ) {
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    }
    
    return stcCmpResultIncomparable.ofNow(
        fromBoolean( leftComparable ),
        fromBoolean( rightComparable ) );
}

function stcCmpCmpables( definitionNs, a, b ) {
    var stcCmpable = stcType( definitionNs, "cmpable", "cmp", "val" );
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcCmpResultIncomparable =
        stcType( definitionNs, "cmp-result-incomparable",
            "left-is-comparable", "right-is-comparable" );
    
    function toBoolean( b ) {
        return stcYep.tags( b );
    }
    
    var aCmp = stcCmpable.getProj( a, "cmp" );
    var bCmp = stcCmpable.getProj( b, "cmp" );
    return macLookupThen( aCmp.cmpThis( definitionNs, bCmp ),
        function ( cmpResult ) {
        
        if ( stcYep.tags( cmpResult )
            && stcNil.tags( stcYep.getProj( cmpResult, "val" ) ) )
            return aCmp.cmp( definitionNs,
                stcCmpable.getProj( a, "val" ),
                stcCmpable.getProj( b, "val" ) );
        
        if ( stcCmpResultIncomparable.tags( cmpResult ) ) {
            if ( toBoolean(
                stcCmpResultIncomparable.getProj( cmpResult,
                    "left-is-comparable" ) ) ) {
                
                return oneSide( aCmp, a );
                
            } else if ( toBoolean(
                stcCmpResultIncomparable.getProj( cmpResult,
                    "right-is-comparable" ) ) ) {
                
                return oneSide( bCmp, b );
            }
        }
        
        return macLookupRet( cmpResult );
        
        function oneSide( cmp, x ) {
            return macLookupThen(
                cmp.cmpHas( definitionNs,
                    stcCmpable.getProj( x, "val" ) ),
                function ( valResult ) {
                
                return macLookupRet( toBoolean( valResult ) ?
                    cmpResult :
                    stcIncomparable( definitionNs, false, false ) );
            } );
        }
    } );
}

function Stc( tupleTag, opt_projNames ) {
    this.tupleTag = tupleTag;
    this.projNames = opt_projNames || [];
}
Stc.prototype.callStc = function ( definitionNs, arg ) {
    var self = this;
    
    // OPTIMIZATION: It would be ludicrous to run `JSON.parse()` on
    // every single function call, so we do an early check to see if
    // we already have access to the definition we would have blocked
    // on.
    var func = staccatoDeclarationState.functionDefs[ self.tupleTag ];
    if ( func !== void 0 )
        return func( self, arg );
    
    var callName =
        stcNsGet( "call",
            stcNsGet( JSON.parse( self.tupleTag ),
                stcNsGet( "functions", definitionNs ) ) ).name;
    return macLookupThen(
        macLookupGet( callName, function () {
            throw new Error(
                "No such function definition: " + self.tupleTag );
        } ),
        function ( def ) {
        
        if ( !(def instanceof StcForeign
            && def.purpose === "native-definition") )
            throw new Error();
        
        var func = def.foreignVal;
        staccatoDeclarationState.functionDefs[ self.tupleTag ] = func;
        return func( self, arg );
    } );
};
Stc.prototype.cmp = function ( definitionNs, a, b ) {
    throw new Error();
};
Stc.prototype.cmpHas = function ( definitionNs, x ) {
    throw new Error();
};
Stc.prototype.cmpThis = function ( definitionNs, other ) {
    throw new Error();
};
Stc.prototype.toName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ "struct", JSON.parse( this.tupleTag ) ].concat(
        arrMap( this.projNames, function ( projName ) {
            return projName.toName();
        } ) );
};
Stc.prototype.pretty = function () {
    return "(" + prettifyTupleTag( this.tupleTag ) +
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
StcFn.prototype.cmp = function ( definitionNs, a, b ) {
    throw new Error();
};
StcFn.prototype.cmpHas = function ( definitionNs, x ) {
    throw new Error();
};
StcFn.prototype.cmpThis = function ( definitionNs, other ) {
    throw new Error();
};
StcFn.prototype.toName = function () {
    throw new Error();
};
StcFn.prototype.pretty = function () {
    return "(fn)";
};
function StcForeign( purpose, foreignVal ) {
    this.purpose = purpose;
    this.foreignVal = foreignVal;
}
StcForeign.prototype.callStc = function ( definitionNs, arg ) {
    var self = this;
    
    if ( self.purpose === "native-definition" )
        return macLookupRet( new StcFn( function ( argVal ) {
            var func = self.foreignVal;
            return func( arg, argVal );
        } ) );
    
    throw new Error();
};
StcForeign.prototype.cmp = function ( definitionNs, a, b ) {
    throw new Error();
};
StcForeign.prototype.cmpHas = function ( definitionNs, x ) {
    throw new Error();
};
StcForeign.prototype.cmpThis = function ( definitionNs, other ) {
    throw new Error();
};
StcForeign.prototype.toName = function () {
    if ( this.purpose === "string" || this.purpose === "name" )
        return this.foreignVal;
    
    throw new Error();
};
StcForeign.prototype.pretty = function () {
    return "(foreign " + this.purpose + " " +
        JSON.stringify( this.foreignVal ) + ")";
};
function StcCmpDefault( first, second ) {
    if ( !(stcIsCmp( first ) && stcIsCmp( second )) )
        throw new Error();
    this.first = first;
    this.second = second;
}
StcCmpDefault.prototype.cmpRank = nextCmpRank++;
StcCmpDefault.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpDefault.prototype.cmp = function ( definitionNs, a, b ) {
    var self = this;
    
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcCmpResultIncomparable =
        stcType( definitionNs, "cmp-result-incomparable",
            "left-is-comparable", "right-is-comparable" );
    
    function toBoolean( b ) {
        return stcYep.tags( b );
    }
    
    return macLookupThen( self.first.cmp( definitionNs, a, b ),
        function ( firstResult ) {
    
    if ( !stcCmpResultIncomparable.tags( firstResult ) )
        return macLookupRet( firstResult );
    
    return macLookupThen( self.second.cmp( definitionNs, a, b ),
        function ( secondResult ) {
    
    if ( stcCmpResultIncomparable.tags( secondResult )
        && !(
            (toBoolean( stcCmpResultIncomparable.getProj(
                secondResult, "left-is-comparable" ) )
                && !toBoolean( stcCmpResultIncomparable.getProj(
                    firstResult, "left-is-comparable" ) ))
            || (toBoolean( stcCmpResultIncomparable.getProj(
                secondResult, "right-is-comparable" ) )
                && !toBoolean( stcCmpResultIncomparable.getProj(
                    firstResult, "right-is-comparable" ) ))
        ) )
        return macLookupRet( firstResult );
    
    if ( toBoolean( stcCmpResultIncomparable.getProj( firstResult,
        "left-is-comparable" ) ) )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "lt", null ) ) );
    if ( toBoolean( stcCmpResultIncomparable.getProj( firstResult,
        "right-is-comparable" ) ) )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "gt", null ) ) );
    return macLookupRet( secondResult );
    
    } );
    
    } );
};
StcCmpDefault.prototype.cmpHas = function ( definitionNs, x ) {
    var self = this;
    
    var stcYep = stcType( definitionNs, "yep", "val" );
    
    return macLookupThen( self.first.cmpHas( definitionNs, x ),
        function ( firstResult ) {
    
    if ( stcYep.tags( firstResult ) )
        return macLookupRet( firstResult );
    
    return self.second.cmpHas( definitionNs, x );
    
    } );
};
StcCmpDefault.prototype.cmpThis = function ( definitionNs, other ) {
    var self = this;
    var stcNil = stcType( definitionNs, "nil" );
    
    return macLookupThen(
        self.first.cmpThis( definitionNs, other.first ),
        function ( firstResult ) {
        
        if ( !stcNil.tags( firstResult ) )
            return macLookupRet( firstResult );
        
        return self.second.cmpThis( definitionNs, other.second );
    } );
};
StcCmpDefault.prototype.toName = function () {
    return [ "cmp-default",
        this.first.toName(), this.second.toName() ];
};
StcCmpDefault.prototype.pretty = function () {
    return "(cmp-default " +
        this.first.pretty() + " " + this.second.pretty() + ")";
};
function StcCmpGiveUp() {
    // We do nothing.
}
StcCmpGiveUp.prototype.cmpRank = nextCmpRank++;
StcCmpGiveUp.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpGiveUp.prototype.cmp = function ( definitionNs, a, b ) {
    return macLookupRet(
        stcIncomparable( definitionNs, false, false ) );
};
StcCmpDefault.prototype.cmpHas = function ( definitionNs, x ) {
    var stcNil = stcType( definitionNs, "nil" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    
    return macLookupRet( stcNope.ofNow( stcNil.of() ) );
};
StcCmpGiveUp.prototype.cmpThis = function ( definitionNs, other ) {
    var stcNil = stcType( definitionNs, "nil" );
    return macLookupRet( stcNil.ofNow() );
};
StcCmpGiveUp.prototype.toName = function () {
    return [ "cmp-give-up" ];
};
StcCmpGiveUp.prototype.pretty = function () {
    return "(cmp-give-up)";
};
function StcCmpStruct( expectedTupleTag, projCmps ) {
    // NOTE: We originally didn't name this field `tupleTag` because
    // we were doing some naive `x.tupleTag === y` checks. We might as
    // well leave it this way to avoid confusion.
    this.expectedTupleTag = expectedTupleTag;
    this.projCmps = projCmps;
}
StcCmpStruct.prototype.cmpRank = nextCmpRank++;
StcCmpStruct.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpStruct.prototype.cmp = function ( definitionNs, a, b ) {
    var self = this;
    
    var incomparable = stcIncomparable( definitionNs,
        a instanceof Stc && a.tupleTag === self.expectedTupleTag,
        b instanceof Stc && b.tupleTag === self.expectedTupleTag );
    if ( incomparable !== null )
        return macLookupRet( incomparable );
    
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcCmpResultIncomparable =
        stcType( definitionNs, "cmp-result-incomparable",
            "left-is-comparable", "right-is-comparable" );
    
    function toBoolean( b ) {
        return stcYep.tags( b );
    }
    
    var n = self.projCmps.length;
    return loop( 0 );
    function loop( i ) {
        if ( i <= n )
            return macLookupRet( stcYep.ofNow( stcNil.ofNow() ) );
        var projCmp = self.projCmps[ i ];
        return macLookupThen(
            projCmp.cmp.cmp( definitionNs,
                a.projNames[ projCmp.i ],
                b.projNames[ projCmp.i ] ),
            function ( cmpResult ) {
            
            if ( stcYep.tags( cmpResult )
                && stcNil.tags( stcYep.getProj( cmpResult, "yep" ) ) )
                return loop( i + 1 );
            
            if ( stcCmpResultIncomparable.tags( cmpResult ) ) {
                if ( toBoolean(
                    stcCmpResultIncomparable.getProj( cmpResult,
                        "left-is-comparable" ) ) ) {
                    
                    return loopOneSide( a, cmpResult, i + 1 );
                    
                } else if ( toBoolean(
                    stcCmpResultIncomparable.getProj( cmpResult,
                        "right-is-comparable" ) ) ) {
                    
                    return loopOneSide( b, cmpResult, i + 1 );
                }
            }
            
            return macLookupRet( cmpResult );
        } );
    }
    function loopOneSide( x, resultIfComparable, i ) {
        if ( i <= n )
            return macLookupRet( resultIfComparable );
        var projCmp = self.projCmps[ i ];
        return macLookupThen(
            projCmp.cmp.cmpHas( definitionNs,
                x.projNames[ projCmp.i ] ),
            function ( cmpResult ) {
            
            if ( !toBoolean( cmpResult ) )
                return macLookupRet(
                    stcIncomparable( definitionNs, false, false ) );
            
            return loopOneSide( x, resultIfComparable, i + 1 );
        } );
    }
};
StcCmpStruct.prototype.cmpHas = function ( definitionNs, x ) {
    var self = this;
    
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    
    if ( !(x instanceof Stc && x.tupleTag === self.expectedTupleTag) )
        return macLookupRet( stcNope.ofNow( stcNil.ofNow() ) );
    
    var n = self.projCmps.length;
    return loop( 0 );
    function loop( i ) {
        if ( i <= n )
            return macLookupRet( stcYep.ofNow( stcNil.ofNow() ) );
        var projCmp = self.projCmps[ i ];
        return macLookupThen(
            projCmp.cmp.cmpHas( definitionNs,
                x.projNames[ projCmp.i ] ),
            function ( cmpResult ) {
            
            if ( stcNope.tags( cmpResult ) )
                return macLookupRet( cmpResult );
            return loop( i + 1 );
        } );
    }
};
StcCmpStruct.prototype.cmpThis = function ( definitionNs, other ) {
    var self = this;
    
    if ( self.expectedTupleTag < other.expectedTupleTag )
        return macLookupRet( new StcForeign( "lt", null ) );
    if ( other.expectedTupleTag < self.expectedTupleTag )
        return macLookupRet( new StcForeign( "gt", null ) );
    
    var stcNil = stcType( definitionNs, "nil" );
    var n = self.projCmps.length;
    for ( var i = 0; i < n; i++ ) {
        var selfI = self.projCmps[ i ].i;
        var otherI = other.projCmps[ i ].i;
        if ( selfI < otherI )
            return macLookupRet( new StcForeign( "lt", null ) );
        if ( otherI < selfI )
            return macLookupRet( new StcForeign( "gt", null ) );
    }
    return loopOverCmps( 0 );
    function loopOverCmps( i ) {
        if ( i <= n )
            return macLookupRet( stcNil.ofNow() );
        var selfCmp = self.projCmps[ i ].cmp;
        var otherCmp = other.projCmps[ i ].cmp;
        return macLookupThen(
            selfCmp.cmp.cmpThis( definitionNs, otherCmp ),
            function ( cmpResult ) {
            
            if ( !stcNil.tags( cmpResult ) )
                return macLookupRet( cmpResult );
            return loopOverCmps( i + 1 );
        } );
    }
};
StcCmpStruct.prototype.toName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ "cmp-struct", JSON.parse( this.expectedTupleTag )
        ].concat( arrMap( this.projCmps, function ( projCmp ) {
            return [ projCmp.i, projCmp.cmp.toName() ];
        } ) );
};
StcCmpStruct.prototype.pretty = function () {
    return "(cmp-struct " +
        prettifyTupleTag( this.expectedTupleTag ) +
        arrMap( this.projCmps, function ( projCmp, i ) {
            return " " + projCmp.i + ":" + projCmp.cmp.pretty();
        } ).join( "" ) + ")";
};
function StcCmpCmp() {
    // We do nothing.
}
StcCmpCmp.prototype.cmpRank = nextCmpRank++;
StcCmpCmp.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpCmp.prototype.cmp = function ( definitionNs, a, b ) {
    var incomparable =
        stcIncomparable( definitionNs, stcIsCmp( a ), stcIsCmp( b ) );
    if ( incomparable !== null )
        return macLookupRet( incomparable );
    var stcYep = stcType( definitionNs, "yep", "val" );
    if ( a.cmpRank < b.cmpRank )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "lt", null ) ) );
    if ( b.cmpRank < a.cmpRank )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "gt", null ) ) );
    return a.cmpThis( definitionNs, b );
};
StcCmpCmp.prototype.cmpHas = function ( definitionNs, x ) {
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    
    var nil = stcNil.ofNow();
    
    function fromBoolean( b ) {
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    }
    
    return macLookupRet( fromBoolean( stcIsCmp( x ) ) );
};
StcCmpCmp.prototype.cmpThis = function ( definitionNs, other ) {
    var stcNil = stcType( definitionNs, "nil" );
    return macLookupRet( stcNil.ofNow() );
};
StcCmpCmp.prototype.toName = function () {
    return [ "cmp-cmp" ];
};
StcCmpCmp.prototype.pretty = function () {
    return "(cmp-cmp)";
};
function StcCmpName() {
    // We do nothing.
}
StcCmpName.prototype.cmpRank = nextCmpRank++;
StcCmpName.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpName.prototype.cmp = function ( definitionNs, a, b ) {
    var incomparable = stcIncomparable( definitionNs,
        a instanceof StcForeign && a.purpose === "name",
        b instanceof StcForeign && b.purpose === "name" );
    if ( incomparable !== null )
        return macLookupRet( incomparable );
    
    var stcYep = stcType( definitionNs, "yep", "val" );
    
    var result = nameCompare( a.foreignVal, b.foreignVal );
    if ( result < 0 )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "lt", null ) ) );
    if ( 0 < result )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "gt", null ) ) );
    
    var stcNil = stcType( definitionNs, "nil" );
    
    return macLookupRet( stcYep.ofNow( stcNil.ofNow() ) );
};
StcCmpName.prototype.cmpHas = function ( definitionNs, x ) {
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    
    var nil = stcNil.ofNow();
    
    function fromBoolean( b ) {
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    }
    
    return macLookupRet(
        fromBoolean(
            x instanceof StcForeign && x.purpose === "name" ) );
};
StcCmpName.prototype.cmpThis = function ( definitionNs, other ) {
    var stcNil = stcType( definitionNs, "nil" );
    return macLookupRet( stcNil.ofNow() );
};
StcCmpCmp.prototype.toName = function () {
    return [ "cmp-name" ];
};
StcCmpName.prototype.pretty = function () {
    return "(cmp-name)";
};
function StcCmpString() {
    // We do nothing.
}
StcCmpString.prototype.cmpRank = nextCmpRank++;
StcCmpString.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpString.prototype.cmp = function ( definitionNs, a, b ) {
    var incomparable = stcIncomparable( definitionNs,
        a instanceof StcForeign && a.purpose === "string",
        b instanceof StcForeign && b.purpose === "string" );
    if ( incomparable !== null )
        return macLookupRet( incomparable );
    
    var stcYep = stcType( definitionNs, "yep", "val" );
    
    // NOTE: We compare by UTF-16 encoding for efficiency, but we
    // don't expose it to user code because that would commit us to
    // the complexity of UTF-16.
    if ( a.foreignVal < b.foreignVal )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "lt", null ) ) );
    if ( b.foreignVal < a.foreignVal )
        return macLookupRet(
            stcYep.ofNow( new StcForeign( "gt", null ) ) );
    
    var stcNil = stcType( definitionNs, "nil" );
    
    return macLookupRet( stcYep.ofNow( stcNil.ofNow() ) );
};
StcCmpString.prototype.cmpHas = function ( definitionNs, x ) {
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    
    var nil = stcNil.ofNow();
    
    function fromBoolean( b ) {
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    }
    
    return macLookupRet(
        fromBoolean(
            x instanceof StcForeign && x.purpose === "string" ) );
};
StcCmpString.prototype.cmpThis = function ( definitionNs, other ) {
    var stcNil = stcType( definitionNs, "nil" );
    return macLookupRet( stcNil.ofNow() );
};
StcCmpCmp.prototype.toName = function () {
    return [ "cmp-string" ];
};
StcCmpString.prototype.pretty = function () {
    return "(cmp-string)";
};
function StcCmpWithOwnMethod( cmpableGetMethod ) {
    this.cmpableGetMethod = cmpableGetMethod;
}
StcCmpWithOwnMethod.prototype.cmpRank = nextCmpRank++;
StcCmpWithOwnMethod.prototype.callStc = function ( definitionNs,
    arg ) {
    
    throw new Error();
};
StcCmpWithOwnMethod.prototype.cmp = function ( definitionNs, a, b ) {
    var stcCmpable = stcType( definitionNs, "cmpable", "cmp", "val" );
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    var stcCmpResultIncomparable =
        stcType( definitionNs, "cmp-result-incomparable",
            "left-is-comparable", "right-is-comparable" );
    
    var nil = stcNil.ofNow();
    
    function fromBoolean( b ) {
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    }
    function toBoolean( b ) {
        return stcYep.tags( b );
    }
    
    var getMethod =
        stcCmpable.getProj( this.cmpableGetMethod, "val" );
    
    return macLookupThen( getMethod.stcCall( definitionNs, a ),
        function ( maybeOwnMethodA ) {
    return macLookupThen( getMethod.stcCall( definitionNs, b ),
        function ( maybeOwnMethodB ) {
    
    var isYepA = stcYep.tags( maybeOwnMethodA );
    var isYepB = stcYep.tags( maybeOwnMethodB );
    var incomparable =
        stcIncomparable( definitionNs, isYepA, isYepB );
    if ( incomparable !== null ) {
        if ( isYepA )
            return oneSide( incomparable,
                stcYep.getProj( maybeOwnMethodA, "val" ),
                a );
        else if ( isYepB )
            return oneSide( incomparable,
                stcYep.getProj( maybeOwnMethodB, "val" ),
                b );
        else
            return macLookupRet( incomparable );
    }
    
    var methodA = stcYep.getProj( maybeOwnMethodA, "val" );
    var methodB = stcYep.getProj( maybeOwnMethodB, "val" );
    
    return macLookupThen(
        new StcCmpCmp().cmp( definitionNs, methodA, methodB ),
        function ( methodCmpResult ) {
    
    if ( stcYep.tags( methodCmpResult )
        && stcNil.tags( stcYep.getProj( methodCmpResult, "val" ) ) )
        return methodA.cmp( definitionNs, a, b );
    
    if ( stcCmpResultIncomparable.tags( methodCmpResult ) ) {
        if ( toBoolean(
            stcCmpResultIncomparable.getProj( methodCmpResult,
                "left-is-comparable" ) ) ) {
            
            return oneSide( methodCmpResult, methodA, a );
            
        } else if ( toBoolean(
            stcCmpResultIncomparable.getProj( methodCmpResult,
                "right-is-comparable" ) ) ) {
            
            return oneSide( methodCmpResult, methodB, b );
        }
    }
    
    return macLookupRet( methodCmpResult );
    
    } );
    } );
    
    } );
    
    function oneSide( cmpResult, method, x ) {
        return macLookupThen( method.cmpHas( definitionNs, x ),
            function ( valResult ) {
            
            return macLookupRet( toBoolean( valResult ) ?
                cmpResult :
                stcIncomparable( definitionNs, false, false ) );
        } );
    }
};
StcCmpWithOwnMethod.prototype.cmpHas = function ( definitionNs, x ) {
    var stcCmpable = stcType( definitionNs, "cmpable", "cmp", "val" );
    var stcNil = stcType( definitionNs, "nil" );
    var stcYep = stcType( definitionNs, "yep", "val" );
    var stcNope = stcType( definitionNs, "nope", "val" );
    
    var nil = stcNil.ofNow();
    
    function fromBoolean( b ) {
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    }
    
    return macLookupThen(
        stcCmpable.getProj( this.cmpableGetMethod, "val"
            ).stcCall( definitionNs, x ),
        function ( maybeOwnMethod ) {
    
    if ( stcNil.tags( maybeOwnMethod ) )
        return macLookupRet( fromBoolean( false ) );
    else if ( stcYep.tags( maybeOwnMethod ) )
        return stcYep.getProj( ownMethod, "val"
            ).cmpHas( definitionNs, x );
    else
        throw new Error();
    
    } );
};
StcCmpWithOwnMethod.prototype.cmpThis = function ( definitionNs,
    other ) {
    
    return stcCmpCmpables( definitionNs,
        this.cmpableGetMethod,
        other.cmpableGetMethod );
};
StcCmpWithOwnMethod.prototype.toName = function () {
    return [ "cmp-with-own-method", this.cmpableGetMethod.toName() ];
};
StcCmpWithOwnMethod.prototype.pretty = function () {
    return "(cmp-with-own-method " +
        this.cmpableGetMethod.pretty() + ")";
};
function StcCmpFix( cmpableUnwrap ) {
    this.cmpableUnwrap = cmpableUnwrap;
}
StcCmpFix.prototype.cmpRank = nextCmpRank++;
StcCmpFix.prototype.callStc = function ( definitionNs, arg ) {
    throw new Error();
};
StcCmpFix.prototype.cmp = function ( definitionNs, a, b ) {
    var stcCmpable = stcType( definitionNs, "cmpable", "cmp", "val" );
    
    return macLookupThen(
        stcCmpable.getProj( this.cmpableUnwrap, "val"
            ).callStc( definitionNs, this ),
        function ( cmp ) {
        
        return cmp.cmp( definitionNs, a, b );
    } );
};
StcCmpFix.prototype.cmpHas = function ( definitionNs, x ) {
    var stcCmpable = stcType( definitionNs, "cmpable", "cmp", "val" );
    
    return macLookupThen(
        stcCmpable.getProj( this.cmpableUnwrap, "val"
            ).callStc( definitionNs, this ),
        function ( cmp ) {
        
        return cmp.cmpHas( definitionNs, x );
    } );
};
StcCmpFix.prototype.cmpThis = function ( definitionNs, other ) {
    return stcCmpCmpables( definitionNs,
        this.cmpableUnwrap,
        other.cmpableUnwrap );
};
StcCmpFix.prototype.toName = function () {
    return [ "cmp-fix", this.cmpableUnwrap.toName() ];
};
StcCmpFix.prototype.pretty = function () {
    return "(cmp-fix " + this.cmpableUnwrap.pretty() + ")";
};

function stcIsCmp( x ) {
    return x.cmpRank !== void 0;
}
function compareStc( a, b ) {
    var incomparableAtBest = false;
    var queue = [ { a: a, b: b } ];
    while ( queue.length !== 0 ) {
        var entry = queue.shift();
        if ( entry.a instanceof Stc && entry.b instanceof Stc ) {
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
            
        } else if ( entry.a instanceof StcCmpDefault
            && entry.b instanceof StcCmpDefault ) {
            
            queue.push( { a: entry.a.first, b: entry.b.first } );
            queue.push( { a: entry.a.second, b: entry.b.second } );
            
        } else if ( entry.a instanceof StcCmpGiveUp
            && entry.b instanceof StcCmpGiveUp ) {
            
            // Do nothing.
            
        } else if ( entry.a instanceof StcCmpStruct
            && entry.b instanceof StcCmpStruct ) {
            
            if ( entry.a.expectedTupleTag !==
                entry.b.expectedTupleTag )
                return false;
            var n = entry.a.projCmps.length;
            if ( n !== entry.b.projCmps.length )
                throw new Error();
            for ( var i = 0; i < n; i++ ) {
                var entryA = entry.a.projCmps[ i ];
                var entryB = entry.b.projCmps[ i ];
                if ( entryA.i !== entryB.i )
                    return false;
                queue.push( { a: entryA.cmp, b: entryB.cmp } );
            }
            
        } else if ( entry.a instanceof StcCmpCmp
            && entry.b instanceof StcCmpCmp ) {
            
            // Do nothing.
            
        } else if ( entry.a instanceof StcCmpName
            && entry.b instanceof StcCmpName ) {
            
            // Do nothing.
            
        } else if ( entry.a instanceof StcCmpString
            && entry.b instanceof StcCmpString ) {
            
            // Do nothing.
            
        } else if ( stcIsCmp( entry.a ) && stcIsCmp( entry.b ) ) {
            return false;
        } else {
            incomparableAtBest = true;
        }
    }
    return incomparableAtBest ? null : true;
}

function stcTrivialStxDetails() {
    return new StcForeign( "macro-stx-details", null );
}

function getMacroFunctionNamespace( definitionNs, name ) {
    return stcNsGet( "function",
        stcNsGet( stcMacroName( definitionNs, name ),
            stcNsGet( "macros", definitionNs ) ) );
}

function collectPut( rawMode, namespace, value ) {
    rawMode.put.push( { namespace: namespace, value: value } );
}
function collectDefer( rawMode, item ) {
    rawMode.defer.push( item );
}
function runPuts( rawMode ) {
    var seenAlready = jsnMap();
    arrEach( rawMode.put, function ( put ) {
        if ( staccatoDeclarationState.namespaceDefs.has(
            put.namespace.name ) )
            throw new Error();
        if ( seenAlready.has( put.namespace.name ) )
            throw new Error();
        seenAlready.set( put.namespace.name, true );
    } );
    arrEach( rawMode.put, function ( put ) {
        staccatoDeclarationState.namespaceDefs.set(
            put.namespace.name, put.value );
    } );
}
function runEffects( rawMode, effects ) {
    if ( !(effects instanceof StcForeign
        && effects.purpose === "effects") )
        throw new Error();
    var effectsFunc = effects.foreignVal;
    return effectsFunc( rawMode );
}
function macLookupThenRunEffects( rawMode, effects ) {
    return macLookupThen( effects, function ( effects ) {
        return runEffects( rawMode, effects );
    } );
}

function runTopLevelMacLookupsSync( originalThreads ) {
    
    function currentlyMode( rawMode, body ) {
        rawMode.current = true;
        var result = body();
        rawMode.current = false;
        return result;
    }
    function currentlyThread( thread, body ) {
        if ( thread.isJs )
            return body();
        return currentlyMode( thread.rawMode, body );
    }
    
    var threads = [];
    
    function addMacroThread( thread ) {
        var rawMode = {
            type: "macro",
            current: false,
            put: [],
            defer: []
        };
        var monad = macLookupThen( macLookupRet( null ),
            function ( ignored ) {
        return macLookupThen(
            currentlyMode( rawMode, function () {
                return thread( rawMode );
            } ),
            function ( ignored ) {
            
            runPuts( rawMode );
            arrEach( rawMode.defer, function ( thread ) {
                addMacroThread( function ( rawMode ) {
                    return macLookupThen( thread(),
                        function ( effects ) {
                        
                        return currentlyMode( rawMode, function () {
                            return runEffects( rawMode, effects );
                        } );
                    } );
                } );
            } );
            
            return macLookupRet( null );
        } );
        } );
        
        threads.push( {
            isJs: false,
            failedAdvances: 0,
            rawMode: rawMode,
            monad: monad
        } );
    }
    
    arrEach( originalThreads, function ( thread ) {
        if ( thread.type === "topLevelDefinitionThread" ) {
            addMacroThread(
                thread.macLookupEffectsOfDefinitionEffects );
        } else if ( thread.type === "jsEffectsThread" ) {
            var monad = macLookupThen(
                thread.macLookupEffectsOfJsEffects,
                function ( effects ) {
                
                if ( !(effects instanceof StcForeign
                    && effects.purpose === "js-effects") )
                    throw new Error();
                var effectsFunc = effects.foreignVal;
                return effectsFunc();
            } );
            
            threads.push( {
                isJs: true,
                failedAdvances: 0,
                rawMode: null,
                monad: monad
            } );
        } else {
            throw new Error();
        }
    } );
    
    function advanceThread( i ) {
        var thread = threads[ i ];
        
        function replaceThread( monad ) {
            threads[ i ] = {
                isJs: thread.isJs,
                failedAdvances: 0,
                rawMode: thread.rawMode,
                monad: monad
            };
            return true;
        }
        
        if ( thread.monad.type === "ret" ) {
            return true;
        } else if ( thread.monad.type === "get" ) {
            return replaceThread(
                macLookupThen( thread.monad, function ( ignored ) {
                    return null;
                } ) );
        } else if ( thread.monad.type === "then" ) {
            var then = thread.monad.then;
            if ( thread.monad.first.type === "ret" ) {
                return replaceThread(
                    currentlyThread( thread, function () {
                        return then( thread.monad.first.val );
                    } ) );
            } else if ( thread.monad.first.type === "get" ) {
                if ( staccatoDeclarationState.namespaceDefs.has(
                    thread.monad.first.name ) ) {
                    
                    return replaceThread(
                        currentlyThread( thread, function () {
                            return then(
                                staccatoDeclarationState.
                                    namespaceDefs.get(
                                        thread.monad.first.name ) );
                        } ) );
                } else {
                    thread.failedAdvances++;
                    return false;
                }
            } else if ( thread.monad.first.type === "then" ) {
                return replaceThread( macLookupThen(
                    thread.monad.first.first,
                    function ( val ) {
                    
                    var firstThen = thread.monad.first.then;
                    return macLookupThen( firstThen( val ), then );
                } ) );
            } else {
                throw new Error();
            }
        } else {
            throw new Error();
        }
    }
    
    function raiseErrorsForStalledThread( thread ) {
        // TODO: Stop using `setTimeout` here. We don't typically use
        // `setTimeout` directly if we can use a user-supplied defer
        // procedure instead.
        setTimeout( function () {
            var err = thread.monad.first.err;
            
            // TODO: Throwing an error and then catching it and
            // logging it like this is a little odd. See if we should
            // refactor this. For a while, we just threw an error, but
            // that made Node.js terminate with whatever error was
            // thrown first, which wasn't usually the most helpful
            // one.
            try {
                err();
                throw new Error(
                    "Encountered a `macLookupGet` that didn't " +
                    "throw an error." );
            } catch ( e ) {
                console.error( e );
            }
        }, 0 );
    }
    
    function arrAnyButKeepGoing( arr, func ) {
        var result = false;
        arrEach( arr, function ( item, i ) {
            if ( func( item, i ) )
                result = true;
        } );
        return result;
    }
    
    // We advance every thread except those which can perform
    // JavaScript side effects. We don't want to perform JavaScript
    // side effects if there's a "load-time" error on the way.
    while ( arrAnyButKeepGoing( threads.slice(),
        function ( thread, i ) {
        
        if ( thread.isJs )
            return false;
        
        return advanceThread( i );
    } ) ) {
        
        // OPTIMIZATION: In between full passes, we do short passes
        // over the most likely threads to be able to advance.
        threads.sort( function ( a, b ) {
            var compareIsJs = (b.isJs ? 1 : 0) - (a.isJs ? 1 : 0);
            if ( compareIsJs !== 0 )
                return compareIsJs;
            
            return b.failedAdvances - a.failedAdvances;
        } );
        var start;
        while (
            start = threads.length - ~~Math.sqrt( threads.length ),
            arrAnyButKeepGoing( threads.slice( start ),
                function ( thread, i ) {
                
                if ( thread.isJs )
                    return false;
                
                return advanceThread( start + i );
            } )
        ) {
            threads = arrKeep( threads, function ( thread ) {
                if ( thread.isJs )
                    return true;
                
                return thread.monad.type !== "ret";
            } );
        }
        
        threads = arrKeep( threads, function ( thread ) {
            if ( thread.isJs )
                return true;
            
            return thread.monad.type !== "ret";
        } );
    }
    
    // We raise errors for any threads that have stalled due to
    // blocking on definitions that will never come.
    if ( arrAnyButKeepGoing( threads, function ( thread ) {
        if ( thread.isJs )
            return false;
        
        raiseErrorsForStalledThread( thread );
        return true;
    } ) )
        return;
    
    // If no threads have stalled, we advance every thread, now
    // including the threads which can perform JavaScript side
    // effects.
    while ( arrAnyButKeepGoing( threads.slice(),
        function ( thread, i ) {
        
        return advanceThread( i );
    } ) ) {
        threads = arrKeep( threads, function ( thread ) {
            return thread.monad.type !== "ret";
        } );
    }
    
    // We raise errors for any threads that have stalled due to
    // blocking on definitions that will never come.
    arrEach( threads.slice(), function ( thread ) {
        raiseErrorsForStalledThread( thread );
    } );
}

function stcExecute( definitionNs, expr ) {
    return Function(
        "definitionNs", "Stc", "StcFn", "StcForeign", "StcCmpStruct",
        "macLookupRet", "macLookupThen",
        
        // NOTE: When the code we generate for this has local
        // variables, we consistently prefix them with "stcLocal_" or
        // "_stc_". The latter is for variables that correspond to
        // variables in the original code.
        "return " + expr + ";"
        
    )( definitionNs, Stc, StcFn, StcForeign, StcCmpStruct,
        macLookupRet, macLookupThen );
}

function addFunctionNativeDefinition(
    defNs, rawMode, tupleTagName, impl ) {
    
    collectPut( rawMode,
        stcNsGet( "call",
            stcNsGet( tupleTagName,
                stcNsGet( "functions", defNs ) ) ),
        new StcForeign( "native-definition", impl ) );
}
function stcAddDefun( nss, rawMode, name, argName, body ) {
    var tupleTagName = stcNameTupleTagAlreadySorted( name, [] );
    var innerFunc = stcExecute( nss.definitionNs,
        "function ( " + stcIdentifier( argName ) + " ) { " +
            "return " + body + "; " +
        "}" );
    addFunctionNativeDefinition( nss.definitionNs, rawMode,
        tupleTagName,
        function ( funcVal, argVal ) {
        
        return innerFunc( argVal );
    } );
}

function stcErr( msg ) {
    return "(function () { " +
        "throw new Error( " + jsStr( msg ) + " ); " +
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
    var stcForeign = stcType( macroDefNs, "foreign", "val" );
    var stcCmpable = stcType( macroDefNs, "cmpable", "cmp", "val" );
    
    function callStcMulti( func, var_args ) {
        var args = arguments;
        var n = args.length;
        return loop( func, 1 );
        function loop( func, i ) {
            if ( n <= i )
                return macLookupRet( func );
            return macLookupThen(
                func.callStc( macroDefNs, args[ i ] ),
                function ( func ) {
                    return loop( func, i + 1 );
                } );
        }
    }
    
    function parseString( string ) {
        if ( !(string instanceof StcForeign
            && string.purpose === "string") )
            throw new Error();
        return string.foreignVal;
    }
    
    function stxToMaybeName( stx ) {
        if ( !stcStx.tags( stx ) )
            return null;
        var sExpr = stcStx.getProj( stx, "s-expr" );
        if ( stcForeign.tags( sExpr ) ) {
            var name = stcForeign.getProj( sExpr, "val" );
            if ( !(name instanceof StcForeign
                && name.purpose === "name") )
                throw new Error();
            return name.foreignVal;
        } else if ( stcIstringNil.tags( sExpr ) ) {
            return parseString(
                stcIstringNil.getProj( sExpr, "string" ) );
        } else {
            return null;
        }
    }
    
    function stcConsListToArray( stc ) {
        var result = [];
        for ( var currentStc = stc;
            stcCons.tags( currentStc );
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
            macLookupGet( projListName, function () {
                throw new Error(
                    "No such type: " + JSON.stringify( tupleName ) );
            } ),
            function ( projList ) {
            
            return macLookupRet(
                stcTypeArr( definitionNs, tupleName,
                    arrMap( stcConsListToArray( projList ),
                        function ( projName ) {
                        
                        if ( !(projName instanceof StcForeign
                            && projName.purpose === "name") )
                            throw new Error();
                        return projName.foreignVal;
                    } ) ) );
        } );
    }
    
    function extractPattern( definitionNs, body ) {
        if ( !stcCons.tags( body ) )
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
                if ( !stcCons.tags( remainingBody ) )
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
    
    // TODO: Make this expand multiple expressions concurrently.
    function stcCaseletForRunner(
        nss, rawMode, maybeVa, matchSubject, body, then ) {
        
        function processTail( nss, rawMode, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                return macroexpand( nssGet( nss, "unique" ), rawMode,
                    stcCons.getProj( body, "car" ),
                    nssGet( nss, "outbox" ).uniqueNs,
                    function ( rawMode, expanded ) {
                    
                    return then( rawMode,
                        "return " + expanded + "; " );
                } );
            
            return macLookupThen(
                extractPattern( nss.definitionNs, body ),
                function ( pattern ) {
            
            if ( !stcCons.tags( pattern.remainingBody ) )
                throw new Error();
            
            var thenNss = nssGet( nss, "then" );
            return macroexpand( nssGet( thenNss, "unique" ),
                rawMode,
                stcCons.getProj( pattern.remainingBody, "car" ),
                nssGet( thenNss, "outbox" ).uniqueNs,
                function ( rawMode, thenBranch ) {
            
            var els = stcCons.getProj( pattern.remainingBody, "cdr" );
            
            return processTail( nssGet( nss, "tail" ), rawMode, els,
                function ( rawMode, processedTail ) {
            
            return then( rawMode, "if ( " +
                "stcLocal_matchSubject instanceof Stc " +
                "&& stcLocal_matchSubject.tupleTag === " +
                    jsStr( pattern.type.getTupleTag() ) + " " +
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
                "return " + thenBranch + "; " +
            "})(); " + processedTail );
            
            } );
            
            } );
            
            } );
        }
        
        var subjectNss = nssGet( nss, "subject" );
        return macroexpand( nssGet( subjectNss, "unique" ), rawMode,
            matchSubject,
            nssGet( subjectNss, "outbox" ).uniqueNs,
            function ( rawMode, expandedSubject ) {
        return processTail( nssGet( nss, "tail" ), rawMode, body,
            function ( rawMode, processedTail ) {
        
        return macLookupThenRunEffects( rawMode,
            then(
                "macLookupThen( " + expandedSubject + ", " +
                    "function ( stcLocal_matchSubject ) { " +
                    
                    (maybeVa === null ? "" :
                        "var " +
                            stcIdentifier( maybeVa.val ) + " = " +
                            "stcLocal_matchSubject; ") +
                    processedTail +
                "} )" ) );
        
        } );
        } );
    }
    
    // TODO: Make this expand multiple expressions concurrently.
    function stcCast( nss, rawMode, matchSubject, body, then ) {
        return macLookupThen(
            extractPattern( nss.definitionNs, body ),
            function ( pattern ) {
        
        if ( !stcCons.tags( pattern.remainingBody ) )
            throw new Error();
        var remainingBody1 =
            stcCons.getProj( pattern.remainingBody, "cdr" );
        if ( !stcCons.tags( remainingBody1 ) )
            throw new Error();
        var remainingBody2 = stcCons.getProj( remainingBody1, "cdr" );
        if ( stcCons.tags( remainingBody2 ) )
            throw new Error();
        
        var onCastErrNss = nssGet( nss, "on-cast-err" );
        return macroexpand( nssGet( onCastErrNss, "unique" ), rawMode,
            stcCons.getProj( pattern.remainingBody, "car" ),
            nssGet( onCastErrNss, "outbox" ).uniqueNs,
            function ( rawMode, onCastErr ) {
        var bodyNss = nssGet( nss, "body" );
        return macroexpand( nssGet( bodyNss, "unique" ), rawMode,
            stcCons.getProj( remainingBody1, "car" ),
            nssGet( bodyNss, "outbox" ).uniqueNs,
            function ( rawMode, body ) {
        var subjectNss = nssGet( nss, "subject" );
        return macroexpand( nssGet( subjectNss, "unique" ), rawMode,
            matchSubject,
            nssGet( subjectNss, "outbox" ).uniqueNs,
            function ( rawMode, expandedSubject ) {
        
        return macLookupThenRunEffects( rawMode,
            then(
                "macLookupThen( " + expandedSubject + ", " +
                    "function ( stcLocal_matchSubject ) { " +
                    
                    "if ( stcLocal_matchSubject instanceof Stc " +
                        "&& stcLocal_matchSubject.tupleTag === " +
                            jsStr( pattern.type.getTupleTag() ) +
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
                        "return " + body + "; " +
                    "})(); " +
                    "return " + onCastErr + "; " +
                "} )" ) );
        
        } );
        } );
        } );
        
        } );
    }
    
    function processFn( nss, rawMode, body, then ) {
        if ( !stcCons.tags( body ) )
            throw new Error();
        var body1 = stcCons.getProj( body, "cdr" );
        if ( !stcCons.tags( body1 ) )
            return macroexpand( nssGet( nss, "unique" ), rawMode,
                stcCons.getProj( body, "car" ),
                nssGet( nss, "outbox" ).uniqueNs,
                then );
        var param = stcCons.getProj( body, "car" );
        var paramName = stxToMaybeName( param );
        if ( paramName === null )
            throw new Error(
                "Called fn with a variable name that wasn't a " +
                "syntactic name: " + param.pretty() );
        return processFn( nss, rawMode, body1,
            function ( rawMode, processedRest ) {
            
            return then( rawMode,
                stcFn( paramName, processedRest ) );
        } );
    }
    
    function mapConsListToArr( list, func ) {
        var result = [];
        for ( var e = list;
            stcCons.tags( e );
            e = stcCons.getProj( e, "cdr" )
        ) {
            result.push( func( stcCons.getProj( e, "car" ) ) );
        }
        if ( !stcNil.tags( e ) )
            throw new Error();
        return result;
    }
    
    function revJsListToArr( jsList ) {
        var result = [];
        for ( var toGo = jsList; toGo !== null; toGo = toGo.rest )
            result.unshift( toGo.first );
        return result;
    }
    
    // TODO: Make this expand multiple expressions concurrently.
    function macroexpandConsListToArr( nss, rawMode, list, then ) {
        return go( nss, rawMode, list, null );
        function go( currentNss, rawMode, e, revResult ) {
            if ( !stcCons.tags( e ) ) {
                if ( !stcNil.tags( e ) )
                    throw new Error();
                
                return then( rawMode, revJsListToArr( revResult ) );
            }
            
            var firstNss = nssGet( currentNss, "first" );
            return macroexpand( nssGet( firstNss, "unique" ),
                rawMode,
                stcCons.getProj( e, "car" ),
                nssGet( firstNss, "outbox" ).uniqueNs,
                function ( rawMode, elemResult ) {
                
                return go( nssGet( currentNss, "rest" ), rawMode,
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
    
    function stcAddMacro(
        definitionNs, rawMode, name, macroFunctionImpl ) {
        
        collectPut( rawMode,
            getMacroFunctionNamespace( definitionNs, name ),
            stcFnPure( function ( uniqueNs ) {
                return stcFnPure( function ( definitionNs ) {
                    return stcFnPure( function ( myStxDetails ) {
                        return stcFnPure( function ( body ) {
                            return new StcFn( function ( then ) {
                                if ( !(uniqueNs instanceof StcForeign
                                    && uniqueNs.purpose === "ns") )
                                    throw new Error();
                                if ( !(definitionNs instanceof
                                        StcForeign
                                    && definitionNs.purpose === "ns") )
                                    throw new Error();
                                
                                return macroFunctionImpl( {
                                    definitionNs: definitionNs.foreignVal,
                                    uniqueNs: uniqueNs.foreignVal
                                }, myStxDetails, body, function ( code ) {
                                    return then.callStc( macroDefNs,
                                        new StcForeign( "compiled-code", code ) );
                                } );
                            } );
                        } );
                    } );
                } );
            } ) );
    }
    function stcAddPureMacro(
        definitionNs, rawMode, name, macroFunctionImpl ) {
        
        stcAddMacro( definitionNs, rawMode, name,
            function ( nss, myStxDetails, body, then ) {
            
            return macLookupRet(
                macroFunctionImpl( nss, myStxDetails, body, then ) );
        } );
    }
    
    function makeDummyMode() {
        return {
            type: "dummy-mode",
            put: []
        };
    }
    function commitDummyMode( rawMode ) {
        if ( rawMode.type !== "dummy-mode" )
            throw new Error();
        runPuts( rawMode );
    }
    
    function stcAddCoreMacros( targetDefNs ) {
        
        var dummyMode = makeDummyMode();
        
        function mac( name, body ) {
            stcAddPureMacro( targetDefNs, dummyMode, name, body );
        }
        function effectfulMac( name, body ) {
            stcAddMacro( targetDefNs, dummyMode, name, body );
        }
        function effectfulFun( name, body ) {
            var constructorTag = stcConstructorTag( targetDefNs,
                stcConstructorName( targetDefNs, name ) );
            var tupleTagName =
                stcNameTupleTagAlreadySorted( constructorTag, [] );
            addFunctionNativeDefinition(
                targetDefNs, dummyMode, tupleTagName,
                function ( funcVal, argVal ) {
                
                return body( argVal );
            } );
            processDefType( targetDefNs, dummyMode, name, [] );
        }
        function fun( name, body ) {
            effectfulFun( name, function ( argVal ) {
                return macLookupRet( body( argVal ) );
            } );
        }
        
        mac( "def-type", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            
            var tupleName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( tupleName === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                var projNames = mapConsListToArr( body1,
                    function ( projName ) {
                        var projStringyName =
                            stxToMaybeName( projName );
                        if ( projStringyName === null )
                            throw new Error();
                        return projStringyName;
                    } );
                
                processDefType(
                    nss.definitionNs, rawMode, tupleName, projNames );
                return macLookupThenRunEffects( rawMode,
                    then( stcNil.of() ) );
            } );
        } );
        
        mac( "defn", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
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
                return processFn( nss, rawMode, body1,
                    function ( rawMode, processedFn ) {
                    
                    stcAddDefun( nss, rawMode,
                        stcConstructorTag( nss.definitionNs,
                            stcConstructorName(
                                nss.definitionNs, name ) ),
                        firstArg,
                        stcCall( processedFn,
                            "macLookupRet( " +
                                stcIdentifier( firstArg ) + " )"
                            ) );
                    processDefType(
                        nss.definitionNs, rawMode, name, [] );
                    
                    return macLookupThenRunEffects( rawMode,
                        then( stcNil.of() ) );
                } );
            } );
        } );
        
        // TODO: Write documentation for this in docs.md and/or
        // cene-design-goals.txt.
        mac( "def-macro", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            
            var name =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( name === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                return processFn( nss, rawMode, body1,
                    function ( rawMode, processedFn ) {
                return macLookupThen(
                    stcExecute( nss.definitionNs, processedFn ),
                    function ( executedFn ) {
                
                collectPut( rawMode,
                    getMacroFunctionNamespace(
                        nss.definitionNs, name ),
                    executedFn );
                
                return macLookupThenRunEffects( rawMode,
                    then( stcNil.of() ) );
                
                } );
                } );
            } );
        } );
        
        // TODO: See if we should design a different approach to unit
        // tests. Perhaps they should allow asynchronous computation.
        // Perhaps they should use a custom comparator. Perhaps the
        // results should be installed as definitions somewhere.
        //
        // TODO: Make this expand multiple expressions concurrently.
        //
        mac( "test", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( stcCons.tags( body2 ) )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                var aNss = nssGet( nss, "a" );
                // NOTE: This is the only place we ignore
                // `macroexpand`'s result.
                macroexpand( nssGet( aNss, "unique" ), rawMode,
                    stcCons.getProj( body, "car" ),
                    nssGet( aNss, "outbox" ).uniqueNs,
                    function ( rawMode, expandedA ) {
                return macLookupThen(
                    evalStcForTest( nss.definitionNs, expandedA ),
                    function ( a ) {
                var bNss = nssGet( nss, "b" );
                return macroexpand( nssGet( bNss, "unique" ), rawMode,
                    stcCons.getProj( body1, "car" ),
                    nssGet( bNss, "outbox" ).uniqueNs,
                    function ( rawMode, expandedB ) {
                return macLookupThen(
                    evalStcForTest( nss.definitionNs, expandedB ),
                    function ( b ) {
                
                var match = compareStc( a, b );
                
                // NOTE: This can be true, false, or null.
                if ( match === true )
                    console.log( "Test succeeded" );
                else
                    console.log(
                        "Test failed: Expected " +
                        b.pretty() + ", got " + a.pretty() );
                
                return macLookupRet( stcNil.ofNow() );
                
                } );
                } );
                } );
                } );
                return macLookupThenRunEffects( rawMode,
                    then( stcNil.of() ) );
            } );
        } );
        
        mac( "case", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            return new StcForeign( "effects", function ( rawMode ) {
                return stcCaseletForRunner( nss, rawMode, null,
                    stcCons.getProj( body, "car" ),
                    stcCons.getProj( body, "cdr" ),
                    then );
            } );
        } );
        
        mac( "caselet", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            var va = stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( va === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                return stcCaseletForRunner( nss, rawMode, { val: va },
                    stcCons.getProj( body1, "car" ),
                    stcCons.getProj( body1, "cdr" ),
                    then );
            } );
        } );
        
        mac( "cast", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            return new StcForeign( "effects", function ( rawMode ) {
                return stcCast( nss, rawMode,
                    stcCons.getProj( body, "car" ),
                    stcCons.getProj( body, "cdr" ),
                    then );
            } );
        } );
        
        mac( "isa", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( stcCons.tags( body2 ) )
                throw new Error();
            var tupleNameExpr = stcCons.getProj( body, "car" );
            var tupleName = stxToMaybeName( tupleNameExpr );
            if ( tupleName === null )
                throw new Error(
                    "Encountered an isa with a tuple name that " +
                    "wasn't a syntactic name: " +
                    tupleNameExpr.pretty() );
            
            return new StcForeign( "effects", function ( rawMode ) {
                return macroexpand( nssGet( nss, "unique" ), rawMode,
                    stcCons.getProj( body1, "car" ),
                    nssGet( nss, "outbox" ).uniqueNs,
                    function ( rawMode, expandedBody ) {
                return macLookupThen(
                    getType( nss.definitionNs, tupleName ),
                    function ( type ) {
                
                return macLookupThenRunEffects( rawMode,
                    then(
                        "macLookupThen( " + expandedBody + ", " +
                            "function ( stcLocal_body ) {\n" +
                        "    \n" +
                        "    return stcLocal_body instanceof Stc " +
                                "&& stcLocal_body.tupleTag === " +
                                    jsStr( type.getTupleTag() ) + " ? " +
                                stcYep.of( stcNil.of() ) + " : " +
                                stcNope.of( stcNil.of() ) + ";\n" +
                        "} )" ) );
                
                } );
                } );
            } );
        } );
        
        mac( "proj1", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( stcCons.tags( body2 ) )
                throw new Error();
            
            var va = stcStx.ofNow( myStxDetails,
                stcForeign.ofNow(
                    new StcForeign( "name",
                        nssGet( nss, "var" ).uniqueNs.name ) ) );
            return new StcForeign( "effects", function ( rawMode ) {
                return stcCast( nssGet( nss, "cast" ), rawMode,
                    stcCons.getProj( body1, "car" ),
                    stcArrayToConsList( [
                        stcCons.getProj( body, "car" ),
                        va,
                        stcStx.ofNow( myStxDetails,
                            stcArrayToConsList( [
                                stcStx.ofNow( myStxDetails,
                                    stcForeign.ofNow(
                                        new StcForeign( "name",
                                            stcMacroName( macroDefNs, "err" ) ) ) ),
                                stcStx.ofNow( myStxDetails,
                                    stcIstringNil.ofNow(
                                        new StcForeign( "string", "Internal error" ) ) )
                            ] ) ),
                        va
                    ] ),
                    then );
            } );
        } );
        
        mac( "c", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                var funcNss = nssGet( nss, "func" );
                // TODO: Make this expand multiple subexpressions
                // concurrently.
                return macroexpand( nssGet( funcNss, "unique" ),
                    rawMode,
                    stcCons.getProj( body, "car" ),
                    nssGet( funcNss, "outbox" ).uniqueNs,
                    function ( rawMode, expandedFunc ) {
                return macroexpandConsListToArr(
                    nssGet( nss, "args" ),
                    rawMode,
                    stcCons.getProj( body, "cdr" ),
                    function ( rawMode, expandedArgs ) {
                
                return macLookupThenRunEffects( rawMode,
                    then(
                        stcCallArr( expandedFunc, expandedArgs ) ) );
                
                } );
                } );
            } );
        } );
        
        mac( "c-new", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            var tupleName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( tupleName === null )
                throw new Error();
            var type = stcType( nss.definitionNs, tupleName );
            
            return new StcForeign( "effects", function ( rawMode ) {
                return macroexpandConsListToArr( nss, rawMode,
                    stcCons.getProj( body, "cdr" ),
                    function ( rawMode, expandedArgs ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then(
                            stcCallArr( type.of(), expandedArgs ) ) );
                } );
            } );
        } );
        
        function stxToDefiniteString( stx ) {
            if ( !stcStx.tags( stx ) )
                throw new Error();
            var istringNil = stcStx.getProj( stx, "s-expr" );
            if ( !stcIstringNil.tags( istringNil ) )
                throw new Error();
            return parseString(
                stcIstringNil.getProj( istringNil, "string" ) );
        }
        
        function assertValidCmpable( x, then ) {
            if ( !stcCmpable.tags( x ) )
                throw new Error();
            
            var cmp = stcCmpable.getProj( x, "cmp" );
            var val = stcCmpable.getProj( x, "val" );
            
            return macLookupThen( cmp.cmpHas( macroDefNs, val ),
                function ( has ) {
                
                if ( stcNope.tags( has ) )
                    throw new Error();
                
                return then();
            } );
        }
        
        mac( "err", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            if ( stcCons.tags( stcCons.getProj( body, "cdr" ) ) )
                throw new Error();
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupThenRunEffects( rawMode,
                    then(
                        stcErr(
                            stxToDefiniteString(
                                stcCons.getProj(
                                    body, "car" ) ) ) ) );
            } );
        } );
        
        mac( "str", function ( nss, myStxDetails, body, then ) {
            if ( !stcCons.tags( body ) )
                throw new Error();
            if ( stcCons.tags( stcCons.getProj( body, "cdr" ) ) )
                throw new Error();
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupThenRunEffects( rawMode,
                    then(
                        "macLookupRet( " +
                            "new StcForeign( \"string\", " +
                                jsStr(
                                    stxToDefiniteString( stcCons.getProj( body, "car" ) ) ) +
                            " ) )" ) );
            } );
        } );
        
        mac( "fn", function ( nss, myStxDetails, body, then ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return processFn( nss, rawMode, body,
                    function ( rawMode, processedFn ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then( processedFn ) );
                } );
            } );
        } );
        
        mac( "let", function ( nss, myStxDetails, body, then ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return loop(
                    rawMode, 0, body, nssGet( nss, "bindings" ), "",
                    function ( rawMode, code ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then( code ) );
                } );
            } );
            
            function loop(
                rawMode, i, remainingBody, bindingsNss,
                obscureVarsCode, then ) {
                
                if ( !stcCons.tags( remainingBody ) )
                    throw new Error();
                var remainingBody1 =
                    stcCons.getProj( remainingBody, "cdr" );
                if ( !stcCons.tags( remainingBody1 ) ) {
                    var bodyNss = nssGet( nss, "body" );
                    return macroexpand( nssGet( bodyNss, "unique" ),
                        rawMode,
                        stcCons.getProj( remainingBody, "car" ),
                        nssGet( bodyNss, "outbox" ).uniqueNs,
                        function ( rawMode, body ) {
                        
                        return then( rawMode,
                            "(function () {\n" +
                            obscureVarsCode +
                            "return " + body + ";\n" +
                            "})()" );
                    } );
                }
                var va = stxToMaybeName(
                    stcCons.getProj( remainingBody, "car" ) );
                if ( va === null )
                    throw new Error();
                
                var firstNss = nssGet( bindingsNss, "first" );
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    stcCons.getProj( remainingBody1, "car" ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, bindingVal ) {
                    
                    var innerVar = stcIdentifier( va );
                    var obscureVar = "stcLocal_" + i;
                    
                    return loop( rawMode, i + 1,
                        stcCons.getProj( remainingBody1, "cdr" ),
                        nssGet( bindingsNss, "rest" ),
                        obscureVarsCode +
                            "var " + innerVar + " = " +
                                obscureVar + ";\n",
                        function ( rawMode, loopResult ) {
                        
                        return then( rawMode,
                            "macLookupThen( " + bindingVal + ", " +
                                "function ( " +
                                    obscureVar + " ) {\n" +
                            "return " + loopResult + ";\n" +
                            "} )" );
                    } );
                } );
            }
        } );
        
        // TODO: Make this expand multiple subexpressions
        // concurrently.
        // TODO: Add documentation of this somewhere.
        effectfulMac( "cmp-struct",
            function ( nss, myStxDetails, body, then ) {
            
            if ( !stcCons.tags( body ) )
                throw new Error();
            var tupleName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( tupleName === null )
                throw new Error();
            
            return macLookupThen(
                getType( nss.definitionNs, tupleName ),
                function ( type ) {
                
                return macLookupRet( new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    return loop( nss, rawMode, type, 0, null,
                        stcCons.getProj( body, "cdr" ) );
                } ) );
            } );
            
            function loop( nss, rawMode, type, i, revProjVals,
                remainingBody ) {
                
                var n = type.unsortedProjNames.length;
                if ( n <= i )
                    return next( rawMode, type,
                        revProjVals, remainingBody );
                
                if ( !stcCons.tags( remainingBody ) )
                    throw new Error(
                        "Expected more arguments to " +
                        JSON.stringify( tupleName ) );
                
                var firstNss = nssGet( nss, "first" );
                
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    stcCons.getProj( remainingBody, "car" ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, projVal ) {
                    
                    return loop( nssGet( nss, "rest" ), rawMode, type,
                        i + 1,
                        { first:
                            { i: type.unsortedProjNames[ i ].i,
                                cmp: projVal },
                            rest: revProjVals },
                        stcCons.getProj( remainingBody, "cdr" ) );
                } );
            }
            
            function next(
                rawMode, type, revProjVals, remainingBody ) {
                
                if ( stcCons.tags( remainingBody ) )
                    throw new Error();
                
                var projVals = revJsListToArr( revProjVals );
                
                var result = "macLookupRet( " +
                    "new StcCmpStruct( " +
                        jsStr( type.getTupleTag() ) + ", " +
                        "[ " +
                        
                        arrMap( projVals, function ( entry, i ) {
                            return "{ " +
                                "i: " +
                                    JSON.stringify( entry.i ) + ", " +
                                "cmp: stcLocal_proj" + i + " " +
                            "}";
                        } ).join( ", " ) +
                    " ] ) )";
                for ( var i = projVals.length - 1; 0 <= i; i-- )
                    result = "macLookupThen( " +
                        projVals[ i ].cmp + ", " +
                        "function ( stcLocal_proj" + i + " ) {\n" +
                    
                    "return " + result + ";\n" +
                    "} )";
                return macLookupThenRunEffects( rawMode,
                    then( result ) );
            }
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "cmp-default", function ( first ) {
            return stcFnPure( function ( second ) {
                return new StcCmpDefault( first, second );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "cmp-give-up", function ( ignored ) {
            return new StcCmpGiveUp();
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "cmp-cmp", function ( ignored ) {
            return new StcCmpCmp();
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "cmp-name", function ( ignored ) {
            return new StcCmpName();
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "cmp-string", function ( ignored ) {
            return new StcCmpString();
        } );
        
        // TODO: Add documentation of this somewhere.
        effectfulFun( "cmp-with-own-method",
            function ( cmpableGetMethod ) {
            
            return assertValidCmpable( cmpableGetMethod, function () {
                return macLookupRet(
                    new StcCmpWithOwnMethod( cmpableGetMethod ) );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        effectfulFun( "cmp-fix", function ( cmpableUnwrap ) {
            return assertValidCmpable( cmpableUnwrap, function () {
                return macLookupRet( new StcCmpFix( cmpableUnwrap ) );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "call-cmp", function ( cmp ) {
            return stcFnPure( function ( a ) {
                return new StcFn( function ( b ) {
                    return cmp.cmp( macroDefNs, a, b );
                } );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "in-cmp", function ( cmp ) {
            return new StcFn( function ( x ) {
                return cmp.cmpHas( macroDefNs, x );
            } );
        } );
        
        var macLookupYoke = {
            bounce: function ( then ) {
                return then( macLookupYoke );
            }
        };
        
        // TODO: Add documentation of this somewhere.
        fun( "table-empty", function ( keyCmp ) {
            if ( !stcIsCmp( keyCmp ) )
                throw new Error();
            
            return new StcForeign( "table", {
                keyCmp: keyCmp,
                contents: avlMap( function ( yoke, a, b, then ) {
                    return macLookupThen(
                        keyCmp.cmp( macroDefNs, a, b ),
                        function ( cmpResult ) {
                        
                        if ( !stcYep.tags( cmpResult ) )
                            throw new Error();
                        var internal =
                            stcYep.getProj( cmpResult, "val" );
                        
                        if ( stcNil.tags( internal ) )
                            return then( yoke, 0 );
                        if ( internal instanceof StcForeign
                            && internal.purpose === "lt" )
                            return then( yoke, -1 );
                        if ( internal instanceof StcForeign
                            && internal.purpose === "gt" )
                            return then( yoke, 1 );
                        
                        throw new Error();
                    } );
                } )
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "table-shadow", function ( key ) {
            return stcFnPure( function ( maybeVal ) {
                return new StcFn( function ( table ) {
                    if ( !(table instanceof StcForeign
                        && table.purpose === "table") )
                        throw new Error();
                    
                    return macLookupThen(
                        table.foreignVal.keyCmp.cmpHas( macroDefNs,
                            key ),
                        function ( comparable ) {
                        
                        if ( stcNope.tags( comparable ) )
                            throw new Error();
                        
                        if ( stcNil.tags( maybeVal ) )
                            return table.foreignVal.contents.minusEntry( macLookupYoke,
                                key, next );
                        if ( stcYep.tags( maybeVal ) )
                            return table.foreignVal.contents.plusEntry( macLookupYoke,
                                key,
                                stcYep.getProj( maybeVal, "val" ),
                                next );
                        throw new Error();
                        
                        function next( yoke, contents ) {
                            return macLookupRet(
                                new StcForeign( "table", {
                                    keyCmp: table.foreignVal.keyCmp,
                                    contents: contents
                                } ) );
                        }
                    } );
                } );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "table-get", function ( key ) {
            return new StcFn( function ( table ) {
                if ( !(table instanceof StcForeign
                    && table.purpose === "table") )
                    throw new Error();
                
                return macLookupThen(
                    table.foreignVal.keyCmp.cmpHas( macroDefNs,
                        key ),
                    function ( comparable ) {
                    
                    if ( stcNope.tags( comparable ) )
                        throw new Error();
                    
                    return table.foreignVal.contents.getMaybe( macLookupYoke,
                        key,
                        function ( yoke, maybeResult ) {
                        
                        return macLookupRet( maybeResult === null ?
                            stcNil.ofNow() :
                            stcYep.ofNow( maybeResult.val ) );
                    } );
                } );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "table-key-cmp", function ( table ) {
            if ( !(table instanceof StcForeign
                && table.purpose === "table") )
                throw new Error();
            
            return table.foreignVal.keyCmp;
        } );
        
        // TODO: Add documentation of this somewhere.
        fun( "table-default", function ( first ) {
            return new StcFn( function ( second ) {
                if ( !(first instanceof StcForeign
                    && first.purpose === "table") )
                    throw new Error();
                if ( !(second instanceof StcForeign
                    && second.purpose === "table") )
                    throw new Error();
                
                return macLookupThen(
                    first.foreignVal.keyCmp.cmpThis( macroDefNs,
                        second.foreignVal.keyCmp ),
                    function ( cmpsMatch ) {
                    
                    if ( !stcNil.tags( cmpsMatch ) )
                        throw new Error();
                
                return first.foreignVal.contents.plus( macLookupYoke,
                    second.foreignVal.contents,
                    function ( yoke, contents ) {
                
                return macLookupRet( new StcForeign( "table", {
                    keyCmp: first.foreignVal.keyCmp,
                    contents: contents
                } ) );
                
                } );
                
                } );
            } );
        } );
        
        fun( "string-append", function ( a ) {
            return stcFnPure( function ( b ) {
                return new StcForeign( "string",
                    parseString( a ) + parseString( b ) );
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
                return new StcForeign( "name",
                    stcNameTupleTagAlreadySorted(
                        stcConstructorTag( macroDefNs,
                            tupleStringyName ),
                        projStringyNames.sort( function ( a, b ) {
                            return nameCompare( a, b );
                        } ) ) );
            } );
        } );
        
        // TODO: Add documentation of this somewhere.
        // NOTE: This is the only way to establish a function behavior
        // for a struct that has more than zero projections.
        fun( "function-implementation-opaque", function ( impl ) {
            return new StcForeign( "native-definition",
                function ( funcVal, argVal ) {
                
                return callStcMulti( impl, funcVal, argVal );
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
        
        // TODO: Document this somewhere.
        fun( "procure-sub-ns", function ( cmp ) {
            return stcFnPure( function ( key ) {
                return new StcFn( function ( ns ) {
                    return macLookupThen(
                        cmp.cmpHas( macroDefNs, key ),
                        function ( valid ) {
                        
                        if ( stcNope.tags( valid ) )
                            throw new Error();
                        
                        return macLookupRet(
                            new StcForeign( "ns",
                                stcNsGet( key.toName(),
                                    ns.foreignVal ) ) );
                    } );
                } );
            } );
        } );
        
        // TODO: Document this somewhere.
        fun( "shadow-procure-sub-ns", function ( cmp ) {
            return stcFnPure( function ( key ) {
                return stcFnPure( function ( subNs ) {
                    return new StcFn( function ( ns ) {
                        return macLookupThen(
                            cmp.cmpHas( macroDefNs, key ),
                            function ( valid ) {
                            
                            if ( stcNope.tags( valid ) )
                                throw new Error();
                            
                            if ( !(subNs instanceof StcForeign
                                && subNs.purpose === "ns") )
                                throw new Error();
                            
                            if ( !(ns instanceof StcForeign
                                && ns.purpose === "ns") )
                                throw new Error();
                            
                            return macLookupRet(
                                new StcForeign( "ns",
                                    stcNsShadow( key.toName(), subNs.foreignVal, ns.foreignVal ) ) );
                        } );
                    } );
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
                
                return new StcForeign( "name", ns.foreignVal.name );
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
        
        fun( "procure-put-defined", function ( ns ) {
            return stcFnPure( function ( value ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    if ( rawMode.type !== "macro" )
                        throw new Error();
                    
                    collectPut( rawMode, ns.foreignVal, value );
                    return macLookupRet( stcNil.ofNow() );
                } );
            } );
        } );
        
        fun( "no-effects", function ( ignored ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupRet( stcNil.ofNow() );
            } );
        } );
        
        fun( "join-effects", function ( a ) {
            return stcFnPure( function ( b ) {
                if ( !(a instanceof StcForeign
                    && a.purpose === "effects") )
                    throw new Error();
                var aFunc = a.foreignVal;
                if ( !(b instanceof StcForeign
                    && b.purpose === "effects") )
                    throw new Error();
                var bFunc = b.foreignVal;
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    return macLookupThen( aFunc( rawMode ),
                        function ( ignored ) {
                        
                        return bFunc( rawMode );
                    } );
                } );
            } );
        } );
        
        // TODO: Document this in docs.md and/or
        // cene-design-goals.txt. It's a (later ...) monadic side
        // effect that runs the inner effects in a future mode. This
        // has two purposes: Multiples of these can be concurrent with
        // each other, and their errors will not retroactively
        // invalidate effects from the current mode.
        fun( "later", function ( effects ) {
            if ( !(effects instanceof StcForeign
                && effects.purpose === "effects") )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                collectDefer( rawMode, function () {
                    return macLookupRet( effects );
                } );
                return macLookupRet( stcNil.ofNow() );
            } );
        } );
        
        fun( "assert-current-modality", function ( mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current) )
                throw new Error();
            return stcNil.ofNow();
        } );
        
        fun( "compile-expression", function ( uniqueNs ) {
            return stcFnPure( function ( definitionNs ) {
                return stcFnPure( function ( stx ) {
                    return stcFnPure( function ( outNs ) {
                        if ( !(uniqueNs instanceof StcForeign
                            && uniqueNs.purpose === "ns") )
                            throw new Error();
                        
                        if ( !(definitionNs instanceof StcForeign
                            && definitionNs.purpose === "ns") )
                            throw new Error();
                        
                        if ( !(outNs instanceof StcForeign
                            && outNs.purpose === "ns") )
                            throw new Error();
                        
                        return new StcForeign( "effects",
                            function ( rawMode ) {
                            
                            if ( !(rawMode.current
                                && rawMode.type === "macro") )
                                throw new Error();
                            
                            return macroexpand( {
                                definitionNs: definitionNs.foreignVal,
                                uniqueNs: uniqueNs.foreignVal
                            }, rawMode, stx, outNs.foreignVal,
                                function ( rawMode, result ) {
                                
                                return macLookupRet( null );
                            } );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "get-mode", function ( body ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupThenRunEffects( rawMode,
                    body.callStc( macroDefNs,
                        new StcForeign( "mode", rawMode ) ) );
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
        
        commitDummyMode( dummyMode );
    }
    
    function macroexpand( nss, rawMode, locatedExpr, outNs, then ) {
        collectDefer( rawMode, function () {
            var identifier = stxToMaybeName( locatedExpr );
            if ( identifier !== null )
                return macLookupRet( new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    // TODO: Report better errors if an unbound local
                    // variable is used. Currently, we just generate
                    // the JavaScript code for the variable anyway.
                    collectPut( rawMode, outNs,
                        new StcForeign( "compiled-code",
                            "macLookupRet( " +
                                stcIdentifier(
                                    identifier ) + " )" ) );
                    return macLookupRet( stcNil.ofNow() );
                } ) );
            if ( !stcStx.tags( locatedExpr ) )
                throw new Error();
            var sExpr = stcStx.getProj( locatedExpr, "s-expr" );
            if ( !stcCons.tags( sExpr ) )
                throw new Error();
            var macroNameStx = stcCons.getProj( sExpr, "car" );
            var macroName = stxToMaybeName( macroNameStx );
            if ( macroName === null )
                throw new Error();
            var resolvedMacroName =
                stcMacroName( nss.definitionNs, macroName );
            var macroFunctionName =
                stcNsGet( "function",
                    stcNsGet( resolvedMacroName,
                        stcNsGet( "macros",
                            nss.definitionNs ) ) ).name;
            
            return macLookupThen(
                macLookupGet( macroFunctionName, function () {
                    throw new Error(
                        "No such macro: " +
                        JSON.stringify( macroName ) );
                } ),
                function ( macroFunction ) {
            
            return callStcMulti( macroFunction,
                new StcForeign( "ns", nss.uniqueNs ),
                new StcForeign( "ns", nss.definitionNs ),
                stcTrivialStxDetails(),
                stcCons.getProj( sExpr, "cdr" ),
                stcFnPure( function ( macroResult ) {
                    return new StcForeign( "effects",
                        function ( rawMode ) {
                        
                        collectPut( rawMode, outNs, macroResult );
                        return macLookupRet( stcNil.ofNow() );
                    } );
                } ) );
            
            } );
        } );
        collectDefer( rawMode, function () {
            return macLookupThen(
                macLookupGet( outNs.name, function () {
                    if ( !stcStx.tags( locatedExpr ) )
                        throw new Error();
                    var sExpr =
                        stcStx.getProj( locatedExpr, "s-expr" );
                    if ( !stcCons.tags( sExpr ) )
                        throw new Error();
                    var macroNameStx =
                        stcCons.getProj( sExpr, "car" );
                    throw new Error(
                        "Macro never completed: " +
                        macroNameStx.pretty() );
                } ),
                function ( macroResult ) {
                
                if ( !(macroResult instanceof StcForeign
                    && macroResult.purpose === "compiled-code") )
                    throw new Error();
                return macLookupRet( new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    return then( rawMode, macroResult.foreignVal );
                } ) );
            } );
        } );
        
        return macLookupRet( stcNil.ofNow() );
    }
    
    function processDefType(
        definitionNs, rawMode, tupleName, projNames ) {
        
        var n = projNames.length;
        var type = stcTypeArr( definitionNs, tupleName, projNames );
        var constructorName =
            stcConstructorName( definitionNs, tupleName );
        collectPut( rawMode,
            stcNsGet( "projection-list",
                stcNsGet( constructorName,
                    stcNsGet( "constructors", definitionNs ) ) ),
            stcArrayToConsList( arrMap( type.unsortedProjNames,
                function ( entry ) {
                
                return new StcForeign( "name", entry.name );
            } ) ) );
        // TODO: Make this expand multiple subexpressions
        // concurrently.
        stcAddPureMacro( definitionNs, rawMode, tupleName,
            function ( nss, myStxDetails, body, then ) {
            
            return new StcForeign( "effects", function ( rawMode ) {
                return loop( rawMode, 0, null, body,
                    nssGet( nss, "projections" ) );
            } );
            
            function loop( rawMode, i, revProjVals, remainingBody,
                projectionsNss ) {
                
                if ( n <= i )
                    return next( rawMode,
                        revProjVals, remainingBody );
                
                if ( !stcCons.tags( remainingBody ) )
                    throw new Error(
                        "Expected more arguments to " +
                        JSON.stringify( tupleName ) );
                
                var firstNss = nssGet( projectionsNss, "first" );
                
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    stcCons.getProj( remainingBody, "car" ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, projVal ) {
                    
                    return loop( rawMode, i + 1,
                        { first: projVal, rest: revProjVals },
                        stcCons.getProj( remainingBody, "cdr" ),
                        nssGet( projectionsNss, "rest" ) );
                } );
            }
            
            function next( rawMode, revProjVals, remainingBody ) {
                return macroexpandConsListToArr(
                    nssGet( nss, "args" ),
                    rawMode,
                    remainingBody,
                    function ( rawMode, expandedArgs ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then(
                            stcCallArr(
                                type.ofArr(
                                    revJsListToArr( revProjVals ) ),
                                expandedArgs ) ) );
                } );
            }
        } );
    }
    
    function processCoreTypes( definitionNs ) {
        
        var dummyMode = makeDummyMode();
        
        function type( tupleName, projNames ) {
            processDefType(
                definitionNs, dummyMode, tupleName, projNames );
        }
        
        // These constructors are needed for interpreting the results
        // of certain built-in operators, namely `isa` and the cmp
        // operations.
        type( "yep", [ "val" ] );
        type( "nope", [ "val" ] );
        // TODO: Add documentation for this somewhere.
        type( "cmp-result-incomparable",
            [ "left-is-comparable", "right-is-comparable" ] );
        
        // This constructor is needed for constructing the input to
        // certain operations, namely `cmp-with-own-method` and
        // `cmp-fix`.
        // TODO: Add documentation for this somewhere.
        type( "cmpable", [ "cmp", "val" ] );
        
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
        
        commitDummyMode( dummyMode );
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
                    new StcForeign( "string",
                        readerStringNilToString( readerExpr ) ) ) );
        } else if ( readerExpr.type === "stringCons" ) {
            return stcStx.ofNow( myStxDetails,
                stcIstringCons.ofNow(
                    new StcForeign( "string",
                        readerStringListToString(
                            readerExpr.string ) ),
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
                var firstNss = nssGet( thisRemainingNss, "first" );
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    readerExprToStc(
                        stcTrivialStxDetails(), tryExpr.val ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, code ) {
                    
                    return macLookupRet( null );
                } );
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
        stcArrayToConsList: stcArrayToConsList,
        makeDummyMode: makeDummyMode,
        commitDummyMode: commitDummyMode
    };
}
