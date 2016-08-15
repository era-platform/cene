// era-cene-runtime.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.
//
// This file implements the main Cene runtime and built-in operators.


// NOTE: We've tagged code with "#GEN" if it generates JavaScript code
// strings directly.
//
// TODO: For each of these, make sure user-defined macros can produce
// these kinds of generated code with sufficient flexibility. If they
// have to look up the built-in macros to do it, that's probably not
// good enough; macro calls sometimes require namespaces when there's
// no namespace really needed for this task, etc.
//
// TODO: It would be nice to update the JavaScript FFI so that it's
// not repeatedly evaluating JavaScript code strings at run time. We
// can do this by having the JavaScript code strings executed at
// load time instead, but that means some of our generated code needs
// to have metadata saying what its load-time dependencies are.
//
// TODO: At some point we may want more than one compilation target,
// even without leaving JavaScript: For instance, the asynchronous
// `macLookupThen`/`macLookupRet` target we have now, a synchronous
// target, and a target specialized for continuous reactive
// programming. Unfortunately, if we do want all these targets, we may
// need to offer multiple implementations of each builtin as well, and
// that'll easily become difficult to maintain. See if there's
// anything we can do to prepare for these.


function stcIdentifier( identifier ) {
    // #GEN
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
    // #GEN
    var result = func;
    arrEach( argsArr, function ( arg ) {
        result =
            "macLookupThen( " + result + ", " +
                "function ( stcLocal_result ) {\n" +
            "    \n" +
            "    return macLookupThen( " + arg + ", " +
                    "function ( stcLocal_arg ) {\n" +
            "        \n" +
            "        return stcLocal_result.callStc( rt, " +
                        "stcLocal_arg );\n" +
            "    } );\n" +
            "} )";
    } );
    return result;
}

function stcCall( func, var_args ) {
    return stcCallArr( func, [].slice.call( arguments, 1 ) );
}

function stcFn( var_args ) {
    // #GEN
    var n = arguments.length;
    var vars = [].slice.call( arguments, 0, n - 1 );
    var body = arguments[ n - 1 ];
    var result = body;
    for ( var i = n - 2; 0 <= i; i-- ) {
        var va = vars[ i ];
        var vaIdentifier = stcIdentifier( va );
        result =
            "macLookupRet( " +
                "new StcFn( " +
                    "function ( rt, " + vaIdentifier + " ) { " +
                
                "return " + result + "; " +
            "} ) )";
    }
    return result;
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
        return 0;
    }
    throw new Error();
}

function nameCompare( a, b ) {
    return jsnCompare( a, b );
}

function stcTypeArr( repMainTagName, projSourceToRep ) {
    var sortedProjNames = arrMap( projSourceToRep,
        function ( entry, i ) {
        
        return { i: i, source: entry.source, rep: entry.rep };
    } ).sort( function ( a, b ) {
        return nameCompare( a.rep, b.rep );
    } );
    var sourceProjNamesToSortedIndices = jsnMap();
    arrEach( sortedProjNames, function ( entry, i ) {
        sourceProjNamesToSortedIndices.set(
            projSourceToRep[ entry.i ].source, i );
    } );
    var unsortedProjNames = arrMap( projSourceToRep,
        function ( entry, i ) {
        
        return {
            i: sourceProjNamesToSortedIndices.get( entry.source ),
            source: entry.source,
            rep: entry.rep
        };
    } );
    var tupleTag = JSON.stringify( stcNameTupleTagAlreadySorted(
        repMainTagName,
        arrMap( sortedProjNames, function ( entry ) {
            return entry.rep;
        } )
    ) );
    var n = projSourceToRep.length;
    
    var result = {};
    result.type = "stcType";
    result.repMainTagName = repMainTagName;
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
        var i = sourceProjNamesToSortedIndices.get( projStringyName );
        if ( i === void 0 )
            throw new Error();
        return stc.projVals[ i ];
    };
    result.ofArr = function ( args ) {
        // #GEN
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
        name: [ "n:root" ],
        shadows: jsnMap()
    };
}
function stcNameGet( stringOrName, parent ) {
    
    // TODO: Determine a good value for this.
    var maxRepetitions = 1000;
    
    return (parent[ 0 ] === "n:get"
        && parent[ 2 ] + 1 <= maxRepetitions
        && nameCompare( parent[ 1 ], stringOrName ) === 0) ?
        [ "n:get", stringOrName, parent[ 2 ] + 1, parent[ 3 ] ] :
        [ "n:get", stringOrName, 1, parent ];
}
function stcNsGet( stringOrName, ns ) {
    return ns.shadows.has( stringOrName ) ?
        ns.shadows.get( stringOrName ) : {
            name: stcNameGet( stringOrName, ns.name ),
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
    return [ "n:tuple-tag", tupleName, projNames ];
}
function stcNameIsAncestor( ancestor, descendant ) {
    var currentAncestor = ancestor;
    while ( true ) {
        if ( nameCompare( currentAncestor, descendant ) === 0 )
            return true;
        if ( !(isArray( currentAncestor )
            && currentAncestor[ 0 ] === "n:get") )
            return false;
        currentAncestor = currentAncestor[ 3 ];
    }
    return false;
}
// NOTE: The term "nss" is supposed to be the plural of "ns," which
// means "namespace."
function nssGet( nss, stringOrName ) {
    return {
        definitionNs: nss.definitionNs,
        uniqueNs: stcNsGet( stringOrName, nss.uniqueNs )
    };
}

function stcNameSetEmpty() {
    return function ( name ) {
        return false;
    };
}
function stcNameSetAll() {
    return function ( name ) {
        return true;
    };
}
function stcNameSetIntersection( a, b ) {
    return function ( name ) {
        return a( name ) && b( name );
    };
}
function stcNameSetNsDescendants( ns ) {
    return function ( name ) {
        return (stcNameIsAncestor( ns.name, name )
            && !ns.shadows.any( function ( v, k ) {
                return stcNameIsAncestor( stcNameGet( k, ns.name ),
                    name );
            } )
        ) || ns.shadows.any( function ( v, k ) {
            return stcNameSetNsDescendants( v )( name );
        } );
    };
}
function stcNameSetContains( nameSet, name ) {
    return nameSet( name );
}

function stcForeignInt( n ) {
    if ( n !== n || n + 1 === n || n - 1 === n )
        throw new Error();
    // We convert negative zero to positive zero.
    return new StcForeign( "int", n === -0 ? 0 : n );
}

function stcForeignStrFromJs( jsStr ) {
    return new StcForeign( "string", {
        jsStr: jsStr,
        paddedStr: jsStr.replace( /[^\uD800-\uDE00]/g, "\x00$&" )
    } );
}
function stcForeignStrFromPadded( paddedStr ) {
    return new StcForeign( "string", {
        // NOTE: We use [\d\D] to match any character, even newlines.
        jsStr: paddedStr.replace( /\x00([\d\D])/g, '$1' ),
        paddedStr: paddedStr
    } );
}

function macLookupRet( result ) {
    return { type: "ret", val: result };
}
function macLookupGet( definer, err ) {
    return { type: "get", definer: definer, err: err };
}
function macLookupProcureContributedElements( namespace, err ) {
    return { type: "procureContributedElements",
        namespace: namespace, err: err };
}
function macLookupThen( macLookupEffects, then ) {
    return { type: "then", first: macLookupEffects, then: then };
}

function fixYoke( yoke ) {
    yoke.bounce = function ( then ) {
        return then( yoke );
    };
    return yoke;
}
function macLookupYoke( rt ) {
    return fixYoke( { rt: rt } );
}


function prettifyTupleTag( tupleTag ) {
    return JSON.stringify(
        JSON.parse( tupleTag )[ 1 ][ 3 ][ 1 ][ 3 ][ 1 ] );
}

function Stc( tupleTag, opt_projVals ) {
    this.tupleTag = tupleTag;
    this.projVals = opt_projVals || [];
}
Stc.prototype.affiliation = "none";
Stc.prototype.callStc = function ( rt, arg ) {
    var self = this;
    
    // OPTIMIZATION: It would be ludicrous to run `JSON.parse()` on
    // every single function call, so we do an early check to see if
    // we already have access to the definition we would have blocked
    // on.
    var func = rt.functionDefs[ self.tupleTag ];
    if ( func !== void 0 )
        return func( rt, self, arg );
    
    return macLookupThen(
        macLookupGet(
            getFunctionCoercerDefiner( rt.defNs,
                JSON.parse( self.tupleTag ) ),
            function () {
                throw new Error(
                    "No such function definition: " + self.tupleTag );
            } ),
        function ( def ) {
        
        if ( !(def instanceof StcForeign
            && def.purpose === "native-definition") )
            throw new Error();
        
        var func = def.foreignVal;
        rt.functionDefs[ self.tupleTag ] = func;
        return func( rt, self, arg );
    } );
};
Stc.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
Stc.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
Stc.prototype.getName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ "n:struct", JSON.parse( this.tupleTag ) ].concat(
        arrMap( this.projVals, function ( projVal ) {
            return projVal.getName();
        } ) );
};
Stc.prototype.pretty = function () {
    return "(" + prettifyTupleTag( this.tupleTag ) +
        arrMap( this.projVals, function ( projVal ) {
            return " " + projVal.pretty();
        } ).join( "" ) + ")";
};
function StcFn( func ) {
    this.func = func;
}
StcFn.prototype.affiliation = "none";
StcFn.prototype.callStc = function ( rt, arg ) {
    var func = this.func;
    return func( rt, arg );
};
StcFn.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFn.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcFn.prototype.getName = function () {
    throw new Error();
};
StcFn.prototype.pretty = function () {
    return "(fn)";
};
function StcForeign( purpose, foreignVal ) {
    this.purpose = purpose;
    this.foreignVal = foreignVal;
}
StcForeign.prototype.affiliation = "none";
StcForeign.prototype.callStc = function ( rt, arg ) {
    var self = this;
    
    if ( self.purpose === "native-definition" )
        return macLookupRet( new StcFn( function ( rt, argVal ) {
            var func = self.foreignVal;
            return func( rt, arg, argVal );
        } ) );
    
    throw new Error();
};
StcForeign.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcForeign.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcForeign.prototype.getName = function () {
    if ( this.purpose === "string" ) {
        return this.foreignVal.jsStr;
    } else if ( this.purpose === "name" ) {
        return [ "n:name", this.foreignVal ];
    } else if ( this.purpose === "table" ) {
        var result = [ "n:table" ];
        this.foreignVal.each( function ( k, v ) {
            result.push( [ k, v ] );
        } );
        return result;
    } else if ( this.purpose === "int" ) {
        return [ "n:int", this.foreignVal ];
    } else {
        throw new Error(
            "Cene internal language error: Tried to call getName " +
            "on a StcForeign that didn't support it" );
    }
};
StcForeign.prototype.pretty = function () {
    return "(foreign " + this.purpose + " " +
        JSON.stringify( this.purpose === "string" ?
            this.foreignVal.jsStr :
            this.foreignVal ) + ")";
};
function StcDexDefault( first, second ) {
    if ( !(first.affiliation === "dex"
        && second.affiliation === "dex") )
        throw new Error();
    this.first = first;
    this.second = second;
}
StcDexDefault.prototype.affiliation = "dex";
StcDexDefault.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexDefault.prototype.dexHas = function ( rt, x ) {
    var self = this;
    
    return macLookupThen( self.first.dexHas( rt, x ),
        function ( firstResult ) {
    
    if ( rt.toBoolean( firstResult ) )
        return macLookupRet( firstResult );
    
    return self.second.dexHas( rt, x );
    
    } );
};
StcDexDefault.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexDefault.prototype.getName = function () {
    return [ "n:dex-default",
        this.first.getName(), this.second.getName() ];
};
StcDexDefault.prototype.pretty = function () {
    return "(dex-default " +
        this.first.pretty() + " " + this.second.pretty() + ")";
};
function StcDexGiveUp() {
    // We do nothing.
}
StcDexGiveUp.prototype.affiliation = "dex";
StcDexGiveUp.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexGiveUp.prototype.dexHas = function ( rt, x ) {
    return macLookupRet( stcNope.ofNow( stcNil.ofNow() ) );
};
StcDexGiveUp.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexGiveUp.prototype.getName = function () {
    return [ "n:dex-give-up" ];
};
StcDexGiveUp.prototype.pretty = function () {
    return "(dex-give-up)";
};
function StcDexStruct( expectedTupleTag, projDexes ) {
    // NOTE: We originally didn't name this field `tupleTag` because
    // we were doing some naive `x.tupleTag === y` checks. We might as
    // well leave it this way to avoid confusion.
    this.expectedTupleTag = expectedTupleTag;
    this.projDexes = projDexes;
}
StcDexStruct.prototype.affiliation = "dex";
StcDexStruct.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexStruct.prototype.dexHas = function ( rt, x ) {
    var self = this;
    
    if ( !(x instanceof Stc && x.tupleTag === self.expectedTupleTag) )
        return macLookupRet( stcNope.ofNow( stcNil.ofNow() ) );
    
    var n = self.projDexes.length;
    return loop( 0 );
    function loop( i ) {
        if ( n <= i )
            return macLookupRet( stcYep.ofNow( stcNil.ofNow() ) );
        var projDex = self.projDexes[ i ];
        return macLookupThen(
            projDex.val.dexHas( rt, x.projVals[ projDex.i ] ),
            function ( dexResult ) {
            
            if ( !rt.toBoolean( dexResult ) )
                return macLookupRet( dexResult );
            return loop( i + 1 );
        } );
    }
};
StcDexStruct.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexStruct.prototype.getName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ "n:dex-struct", JSON.parse( this.expectedTupleTag )
        ].concat( arrMap( this.projDexes, function ( projDex ) {
            return [ projDex.i, projDex.val.getName() ];
        } ) );
};
StcDexStruct.prototype.pretty = function () {
    return "(dex-struct " +
        prettifyTupleTag( this.expectedTupleTag ) +
        arrMap( this.projDexes, function ( projDex, i ) {
            return " " + projDex.i + ":" + projDex.val.pretty();
        } ).join( "" ) + ")";
};
function StcDexDex() {
    // We do nothing.
}
StcDexDex.prototype.affiliation = "dex";
StcDexDex.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexDex.prototype.dexHas = function ( rt, x ) {
    return macLookupRet( rt.fromBoolean( x.affiliation === "dex" ) );
};
StcDexDex.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexDex.prototype.getName = function () {
    return [ "n:dex-dex" ];
};
StcDexDex.prototype.pretty = function () {
    return "(dex-dex)";
};
function StcDexMerge() {
    // We do nothing.
}
StcDexMerge.prototype.affiliation = "dex";
StcDexMerge.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexMerge.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean( x.affiliation === "merge" ) );
};
StcDexMerge.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexMerge.prototype.getName = function () {
    return [ "n:dex-merge" ];
};
StcDexMerge.prototype.pretty = function () {
    return "(dex-merge)";
};
function StcDexFuse() {
    // We do nothing.
}
StcDexFuse.prototype.affiliation = "dex";
StcDexFuse.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexFuse.prototype.dexHas = function ( rt, x ) {
    return macLookupRet( rt.fromBoolean( x.affiliation === "fuse" ) );
};
StcDexFuse.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexFuse.prototype.getName = function () {
    return [ "n:dex-fuse" ];
};
StcDexFuse.prototype.pretty = function () {
    return "(dex-fuse)";
};
function StcDexName() {
    // We do nothing.
}
StcDexName.prototype.affiliation = "dex";
StcDexName.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexName.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean(
            x instanceof StcForeign && x.purpose === "name" ) );
};
StcDexName.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexName.prototype.getName = function () {
    return [ "n:dex-name" ];
};
StcDexName.prototype.pretty = function () {
    return "(dex-name)";
};
function StcDexString() {
    // We do nothing.
}
StcDexString.prototype.affiliation = "dex";
StcDexString.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexString.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean(
            x instanceof StcForeign && x.purpose === "string" ) );
};
StcDexString.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexString.prototype.getName = function () {
    return [ "n:dex-string" ];
};
StcDexString.prototype.pretty = function () {
    return "(dex-string)";
};
function StcDexByOwnMethod( dexableGetMethod ) {
    this.dexableGetMethod = dexableGetMethod;
}
StcDexByOwnMethod.prototype.affiliation = "dex";
StcDexByOwnMethod.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexByOwnMethod.prototype.dexHas = function ( rt, x ) {
    return macLookupThen(
        stcDexable.getProj( this.dexableGetMethod, "val"
            ).stcCall( rt, x ),
        function ( maybeOwnMethod ) {
    
    if ( stcNil.tags( maybeOwnMethod ) )
        return macLookupRet( rt.fromBoolean( false ) );
    else if ( stcYep.tags( maybeOwnMethod ) )
        return stcYep.getProj( ownMethod, "val" ).dexHas( rt, x );
    else
        throw new Error();
    
    } );
};
StcDexByOwnMethod.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexByOwnMethod.prototype.getName = function () {
    return [ "n:dex-by-own-method", this.dexableGetMethod.getName() ];
};
StcDexByOwnMethod.prototype.pretty = function () {
    return "(dex-by-own-method " +
        this.dexableGetMethod.pretty() + ")";
};
function StcDexFix( dexableUnwrap ) {
    this.dexableUnwrap = dexableUnwrap;
}
StcDexFix.prototype.affiliation = "dex";
StcDexFix.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexFix.prototype.dexHas = function ( rt, x ) {
    return macLookupThen(
        stcDexable.getProj( this.dexableUnwrap, "val"
            ).callStc( rt, this ),
        function ( dex ) {
        
        return dex.dexHas( rt, x );
    } );
};
StcDexFix.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexFix.prototype.getName = function () {
    return [ "n:dex-fix", this.dexableUnwrap.getName() ];
};
StcDexFix.prototype.pretty = function () {
    return "(dex-fix " + this.dexableUnwrap.pretty() + ")";
};
function StcDexTable( dexVal ) {
    this.dexVal = dexVal;
}
StcDexTable.prototype.affiliation = "dex";
StcDexTable.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexTable.prototype.dexHas = function ( rt, x ) {
    var self = this;
    
    if ( !(x instanceof StcForeign && x.purpose === "table") )
        return macLookupRet( rt.fromBoolean( false ) );
    
    var vals = [];
    x.foreignVal.each( function ( k, v ) {
        vals.push( v );
    } );
    var n = vals.length;
    return loop( 0 );
    function loop( i ) {
        if ( n <= i )
            return macLookupRet( rt.fromBoolean( true ) );
        return macLookupThen( self.dexVal.dexHas( rt, vals[ i ] ),
            function ( dexResult ) {
            
            if ( !rt.toBoolean( dexResult ) )
                return macLookupRet( dexResult );
            
            return loop( i + 1 );
        } );
    }
};
StcDexTable.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexTable.prototype.getName = function () {
    return [ "n:dex-table", this.dexVal.getName() ];
};
StcDexTable.prototype.pretty = function () {
    return "(dex-table " + this.dexVal.pretty() + ")";
};
function StcDexInt() {
    // We do nothing.
}
StcDexInt.prototype.affiliation = "dex";
StcDexInt.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcDexInt.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean(
            x instanceof StcForeign && x.purpose === "int" ) );
};
StcDexInt.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
StcDexInt.prototype.getName = function () {
    return [ "n:dex-int" ];
};
StcDexInt.prototype.pretty = function () {
    return "(dex-int)";
};
function StcMergeByDex( dexToUse ) {
    if ( dexToUse.affiliation !== "dex" )
        throw new Error();
    this.dexToUse = dexToUse;
}
StcMergeByDex.prototype.affiliation = "merge";
StcMergeByDex.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcMergeByDex.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcMergeByDex.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    return rt.dexHas( self.dexToUse, a, function ( hasA ) {
        if ( !hasA )
            return macLookupRet( stcNil.ofNow() );
    
    return rt.dexHas( self.dexToUse, b, function ( hasB ) {
        if ( !hasB )
            return macLookupRet( stcNil.ofNow() );
    
    return macLookupRet( stcYep.ofNow( a ) );
    
    } );
    
    } );
};
StcMergeByDex.prototype.getName = function () {
    return [ "n:merge-by-dex", this.dexToUse.getName() ];
};
StcMergeByDex.prototype.pretty = function () {
    return "(merge-by-dex " + this.dexToUse.pretty() + ")";
};
function StcFuseByMerge( mergeToUse ) {
    if ( mergeToUse.affiliation !== "merge" )
        throw new Error();
    this.mergeToUse = mergeToUse;
}
StcFuseByMerge.prototype.affiliation = "fuse";
StcFuseByMerge.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseByMerge.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseByMerge.prototype.fuse = function ( rt, a, b ) {
    return this.mergeToUse.fuse( rt, a, b );
};
StcFuseByMerge.prototype.getName = function () {
    return [ "n:fuse-by-merge", this.mergeToUse.getName() ];
};
StcFuseByMerge.prototype.pretty = function () {
    return "(fuse-by-merge " + this.mergeToUse.pretty() + ")";
};
function StcFuseIntByPlus() {
    // We do nothing.
}
StcFuseIntByPlus.prototype.affiliation = "fuse";
StcFuseIntByPlus.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseIntByPlus.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseIntByPlus.prototype.fuse = function ( rt, a, b ) {
    if ( !(a instanceof StcForeign && a.purpose === "int") )
        throw new Error();
    if ( !(b instanceof StcForeign && b.purpose === "int") )
        throw new Error();
    return macLookupRet(
        stcForeignInt( a.foreignVal + b.foreignVal ) );
};
StcFuseIntByPlus.prototype.getName = function () {
    return [ "n:fuse-int-by-plus" ];
};
StcFuseIntByPlus.prototype.pretty = function () {
    return "(fuse-int-by-plus)";
};
function StcFuseIntByTimes() {
    // We do nothing.
}
StcFuseIntByTimes.prototype.affiliation = "fuse";
StcFuseIntByTimes.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseIntByTimes.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseIntByTimes.prototype.fuse = function ( rt, a, b ) {
    if ( !(a instanceof StcForeign && a.purpose === "int") )
        throw new Error();
    if ( !(b instanceof StcForeign && b.purpose === "int") )
        throw new Error();
    return macLookupRet(
        stcForeignInt( a.foreignVal * b.foreignVal ) );
};
StcFuseIntByTimes.prototype.getName = function () {
    return [ "n:fuse-int-by-times" ];
};
StcFuseIntByTimes.prototype.pretty = function () {
    return "(fuse-int-by-times)";
};
function StcFuseStruct(
    nameTag, affiliation, expectedTupleTag, projFuses ) {
    
    this.nameTag = nameTag;
    this.affiliation = affiliation;
    // NOTE: We originally didn't name this field `tupleTag` because
    // we were doing some naive `x.tupleTag === y` checks. We might as
    // well leave it this way to avoid confusion.
    this.expectedTupleTag = expectedTupleTag;
    this.projFuses = projFuses;
    
    arrEach( projFuses, function ( projFuse ) {
        if ( projFuse.val.affiliation !== affiliation )
            throw new Error();
    } );
}
StcFuseStruct.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseStruct.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseStruct.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    if ( !(a instanceof Stc && a.tupleTag === self.expectedTupleTag) )
        return macLookupRet( stcNil.ofNow() );
    if ( !(b instanceof Stc && b.tupleTag === self.expectedTupleTag) )
        return macLookupRet( stcNil.ofNow() );
    
    var n = self.projFuses.length;
    return loop( 0, [] );
    function loop( i, fuseResults ) {
        if ( n <= i )
            return macLookupRet(
                stcYep.ofNow(
                    new Stc( self.expectedTupleTag,
                        arrMap( fuseResults.slice().sort(
                            function ( a, b ) {
                            
                            return a.i - b.i;
                        } ), function ( fuseResult ) {
                            return fuseResult.val;
                        } ) ) ) );
        var projFuse = self.projFuses[ i ];
        return macLookupThen(
            projFuse.val.fuse( rt,
                a.projVals[ projFuse.i ],
                b.projVals[ projFuse.i ] ),
            function ( fuseResult ) {
            
            if ( !stcYep.tags( fuseResult ) )
                return macLookupRet( stcNil.ofNow() );
            return loop( i + 1, fuseResults.concat( [ {
                i: projFuse.i,
                val: stcYep.getProj( fuseResult, "val" )
            } ] ) );
        } );
    }
};
StcFuseStruct.prototype.getName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ this.nameTag, JSON.parse( this.expectedTupleTag )
        ].concat( arrMap( this.projFuses, function ( projDex ) {
            return [ projDex.i, projDex.val.getName() ];
        } ) );
};
StcFuseStruct.prototype.pretty = function () {
    return "(" + this.nameTag + " " +
        prettifyTupleTag( this.expectedTupleTag ) +
        arrMap( this.projFuses, function ( projDex, i ) {
            return " " + projDex.i + ":" + projDex.val.pretty();
        } ).join( "" ) + ")";
};
function StcFuseDefault(
    nameTag, affiliation, first, second ) {
    
    if ( first.affiliation !== affiliation )
        throw new Error();
    if ( second.affiliation !== affiliation )
        throw new Error();
    
    this.nameTag = nameTag;
    this.affiliation = affiliation;
    this.first = first;
    this.second = second;
}
StcFuseDefault.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseDefault.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseDefault.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    return macLookupThen( self.first.fuse( rt, a, b ),
        function ( firstResult ) {
    
    if ( stcYep.tags( firstResult ) )
        return macLookupRet( firstResult );
    
    return self.second.fuse( rt, a, b );
    
    } );
};
StcFuseDefault.prototype.getName = function () {
    return [ this.nameTag,
        this.first.getName(),
        this.second.getName() ];
};
StcFuseDefault.prototype.pretty = function () {
    return "(" + this.nameTag + " " +
        this.first.pretty() + " " +
        this.second.pretty() + ")";
};
function StcFuseByOwnMethod(
    nameTag, affiliation, dexableGetMethod ) {
    
    this.nameTag = nameTag;
    this.affiliation = affiliation;
    this.dexableGetMethod = dexableGetMethod;
}
StcFuseByOwnMethod.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseByOwnMethod.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseByOwnMethod.prototype.fuse = function ( rt, a, b ) {
    var getMethod =
        stcDexable.getProj( this.dexableGetMethod, "val" );
    
    function getFrom( x, then ) {
        return macLookupThen( getMethod.stcCall( rt, x ),
            function ( maybeOwnMethod ) {
            
            if ( stcNil.tags( maybeOwnMethod ) ) {
                return macLookupRet( stcNil.of() );
            } else if ( stcYep.tags( maybeOwnMethod ) ) {
                var method = stcYep.getProj( maybeOwnMethod, "val" );
                if ( method.affiliation !== self.affiliation )
                    return macLookupRet( stcNil.of() );
                return then( method );
            } else {
                throw new Error();
            }
        } );
    }
    
    return getFrom( a, function ( methodA ) {
    return getFrom( b, function ( methodB ) {
    
    if ( nameCompare( methodA.getName(), methodB.getName() ) !== 0 )
        return macLookupRet( stcNil.of() );
    
    return methodA.fuse( rt, a, b );
    
    } );
    } );
};
StcFuseByOwnMethod.prototype.getName = function () {
    return [ this.nameTag, this.dexableGetMethod.getName() ];
};
StcFuseByOwnMethod.prototype.pretty = function () {
    return "(" + this.nameTag + " " +
        this.dexableGetMethod.pretty() + ")";
};
function StcFuseFix( nameTag, affiliation, dexableUnwrap ) {
    this.nameTag = nameTag;
    this.affiliation = affiliation;
    this.dexableUnwrap = dexableUnwrap;
}
StcFuseFix.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseFix.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseFix.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    return macLookupThen(
        stcDexable.getProj( self.dexableUnwrap, "val"
            ).callStc( rt, self ),
        function ( merge ) {
        
        if ( merge.affiliation !== self.affiliation )
            throw new Error();
        
        return merge.fuse( rt, a, b );
    } );
};
StcFuseFix.prototype.getName = function () {
    return [ this.nameTag, this.dexableUnwrap.getName() ];
};
StcFuseFix.prototype.pretty = function () {
    return "(" + this.nameTag + " " +
        this.dexableUnwrap.pretty() + ")";
};
function StcFuseTable( nameTag, affiliation, mergeVal ) {
    if ( mergeVal.affiliation !== affiliation )
        throw new Error();
    
    this.nameTag = nameTag;
    this.affiliation = affiliation;
    this.mergeVal = mergeVal;
}
StcFuseTable.prototype.callStc = function ( rt, arg ) {
    throw new Error();
};
StcFuseTable.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
StcFuseTable.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    if ( !(a instanceof StcForeign && a.purpose === "table") )
        throw new Error();
    if ( !(b instanceof StcForeign && b.purpose === "table") )
        throw new Error();
    
    var entries = [];
    a.foreignVal.plus( b.foreignVal ).each(
        function ( k, v ) {
        
        function get( table ) {
            var v = table.get( k );
            return v === void 0 ?
                stcNil.ofNow() :
                stcYep.ofNow( v );
        }
        entries.push(
            { k: k, a: get( a ), b: get( b ) } );
    } );
    var n = entries.length;
    return loop( 0, jsnMap() );
    function loop( i, table ) {
        if ( n <= i )
            return macLookupRet(
                new StcForeign( "table", table ) );
        var entry = entries[ i ];
        if ( entry.a === void 0 )
            return next( entry.b );
        if ( entry.b === void 0 )
            return next( entry.a );
        return macLookupThen(
            self.mergeVal.fuse( rt, entry.a, entry.b ), next );
        
        function next( v ) {
            return loop( i + 1, table.plusEntry( entry.k, v ) );
        }
    }
};
StcFuseTable.prototype.getName = function () {
    return [ this.nameTag, this.mergeVal.getName() ];
};
StcFuseTable.prototype.pretty = function () {
    return "(" + this.nameTag + " " + this.mergeVal.pretty() + ")";
};


var builtInTypeAccumulator = { val: null };
function builtInType( tupleStringyName, var_args ) {
    var sourceMainTagName =
        stcForeignStrFromJs( tupleStringyName ).getName();
    var repMainTagName = [ "n:main-core", sourceMainTagName ];
    var projSourceToRep =
        arrMap( [].slice.call( arguments, 1 ), function ( projName ) {
            var source =
                stcForeignStrFromJs( projName ).getName();
            return {
                source: source,
                rep: [ "n:proj-core", source, sourceMainTagName ]
            };
        } );
    builtInTypeAccumulator.val.push( {
        sourceMainTagName: sourceMainTagName,
        repMainTagName: repMainTagName,
        projSourceToRep: projSourceToRep
    } );
    return stcTypeArr( repMainTagName, projSourceToRep );
}

var builtInCoreTypesToAdd = [];

builtInTypeAccumulator.val = builtInCoreTypesToAdd;

// These constructors are needed for interpreting the results of
// certain built-in operators, namely `isa` and the dex operations.
var stcYep = builtInType( "yep", "val" );
var stcNope = builtInType( "nope", "val" );

// This constructor is needed for constructing the input to certain
// operations.
var stcDexable = builtInType( "dexable", "dex", "val" );

// These constructors are needed for constructing a constructor
// glossary, which associates source-level names with a constructor's
// representation's names.
var stcAssoc = builtInType( "assoc", "key", "val" );
var stcConstructorGlossary = builtInType( "constructor-glossary",
    "main-tag", "source-to-rep" );

// This constructor is needed to deconstruct the result of
// `int-div-rounded-down`.
var stcCarried = builtInType( "carried", "main", "carry" );

// These constructors are needed to deconstruct the results of
// `optimized-regex-match-later`.
var stcRegexResultMatched =
    builtInType( "regex-result-matched", "stop" );
var stcRegexResultFailed = builtInType( "regex-result-failed" );
var stcRegexResultPassedEnd =
    builtInType( "regex-result-passed-end" );

// These s-expression constructors are needed so that macros can parse
// their s-expression arguments. The `cons` and `nil` constructors are
// also needed for parsing and generating projection lists.
var stcNil = builtInType( "nil" );
var stcCons = builtInType( "cons", "car", "cdr" );
var stcIstringNil = builtInType( "istring-nil", "string" );
var stcIstringCons = builtInType( "istring-cons",
    "string-past", "interpolated", "istring-rest" );
var stcForeign = builtInType( "foreign", "val" );

// These occur in `(foreign ...)` s-expressions to signify that a
// value should be looked up by an arbitrary name or by immediate
// value instead of by the name of a literal string.
var stcObtainByName = builtInType( "obtain-by-name", "name" );
var stcObtainDirectly = builtInType( "obtain-directly", "val" );

// This constructor is needed so that macros can parse their located
// syntax arguments.
var stcStx = builtInType( "stx", "stx-details", "s-expr" );

// This constructor is needed to deconstruct the result of certain
// operations.
var stcGetdef = builtInType( "getdef", "get", "def" );

builtInTypeAccumulator.val = null;


function stcTrivialStxDetails() {
    return new StcForeign( "macro-stx-details", null );
}

function elementDefiner( name, ns ) {
    return { type: "contributedElement", namespace: ns, name: name };
}

function getConstructorGlossaryDefiner( definitionNs, name ) {
    return elementDefiner( name,
        stcNsGet( [ "n:$$constructor-glossary" ], definitionNs ) );
}
function getMacroFunctionDefiner( definitionNs, name ) {
    return elementDefiner( name,
        stcNsGet( [ "n:$$macro-string-reference" ], definitionNs ) );
}
function getFunctionCoercerDefiner( definitionNs, tupleTagName ) {
    return elementDefiner( "val",
        stcNsGet( "call",
            stcNsGet( tupleTagName,
                stcNsGet( "functions", definitionNs ) ) ) );
}

function parseMode( mode ) {
    if ( !(mode instanceof StcForeign
        && mode.purpose === "mode") )
        throw new Error();
    return mode.foreignVal;
}
function assertRawMode( check, rawMode ) {
    if ( !rawMode.current )
        throw new Error();
    if ( !check( rawMode ) )
        throw new Error();
}
function assertMode( check, mode ) {
    assertRawMode( check, parseMode( mode ) );
}
function isMacroRawMode( rawMode ) {
    return rawMode.type === "macro";
}
function isUnitTestRawMode( rawMode ) {
    return rawMode.type === "unit-test";
}
function isMacroOrUnitTestRawMode( rawMode ) {
    return isMacroRawMode( rawMode ) || isUnitTestRawMode( rawMode );
}
function isMacroOrUnitTestOrJsRawMode( rawMode ) {
    return isMacroOrUnitTestRawMode( rawMode ) ||
        rawMode.type === "js";
}
function isMacroOrDummyRawMode( rawMode ) {
    return isMacroRawMode( rawMode ) || rawMode.type === "dummy-mode";
}
function rawModeSupportsDefer( rawMode ) {
    return isMacroOrUnitTestRawMode( rawMode );
}
function rawModeSupportsContributeDefiner( definer ) {
    return function ( rawMode ) {
        
        if ( definer.type === "contributedElement"
            && !stcNameSetContains(
                rawMode.contributingOnlyTo, definer.namespace ) )
            return false;
        
        if ( isMacroOrDummyRawMode( rawMode ) )
            return true;
        
        if ( isUnitTestRawMode( rawMode ) )
            return (definer.type === "object"
                && definer.unitTestId !== null
                && nameCompare(
                    definer.unitTestId, rawMode.unitTestId ) === 0);
        
        return false;
    };
}
function rawModeSupportsContribute( ns ) {
    return rawModeSupportsContributeDefiner( {
        type: "contributedElement",
        namespace: ns,
        name: null
    } );
}
function rawModeSupportsName( ns ) {
    return function ( rawMode ) {
        return isMacroOrUnitTestRawMode( rawMode );
    };
}
function rawModeSupportsObserveDefiner( definer ) {
    return function ( rawMode ) {
        // NOTE: We let JS through because it looks up defined values
        // when it does function calls.
        return isMacroOrUnitTestOrJsRawMode( rawMode );
    };
}
function rawModeSupportsObserveContributedElements( ns ) {
    return function ( rawMode ) {
        return isMacroOrUnitTestRawMode( rawMode ) &&
            !rawModeSupportsContribute( ns )( rawMode );
    };
}
function rawModeSupportsListen( ns ) {
    return function ( rawMode ) {
        return isMacroOrUnitTestRawMode( rawMode );
    };
}

function collectPutDefined( rawMode, definer, value ) {
    assertRawMode( rawModeSupportsContributeDefiner( definer ),
        rawMode );
    rawMode.putDefined.push( { definer: definer, value: value } );
}
function collectPutListener( rawMode, namespace, name, listener ) {
    assertRawMode( rawModeSupportsListen( namespace ), rawMode );
    rawMode.putListener.push(
        { namespace: namespace, name: name, listener: listener } );
}
function collectDefer( rawMode, partialAttenuation, body ) {
    assertRawMode( rawModeSupportsDefer, rawMode );
    rawMode.defer.push( {
        attenuation: {
            type: partialAttenuation.type !== void 0 ?
                partialAttenuation.type :
                rawMode.type,
            unitTestId: partialAttenuation.unitTestId !== void 0 ?
                partialAttenuation.unitTestId :
                rawMode.unitTestId,
            contributingOnlyTo:
                partialAttenuation.contributingOnlyTo !== void 0 ?
                    partialAttenuation.contributingOnlyTo :
                    rawMode.contributingOnlyTo
        },
        body: body
    } );
}
function runPuts( namespaceDefs, rawMode ) {
    
    
    // First we do sanity checks to make sure the puts are not
    // overlapping and don't conflict with existing state.
    
    function assertJsnUnique( arr, getJsn ) {
        var seenAlready = jsnMap();
        arrEach( arr, function ( put ) {
            var jsn = getJsn( put );
            if ( seenAlready.has( jsn ) )
                throw new Error();
            seenAlready.set( jsn, true );
        } );
    }
    
    arrEach( rawMode.putDefined, function ( put ) {
        var type = put.definer.type;
        if ( !(type === "contributedElement" || type === "object") )
            throw new Error();
    } );
    var putDefinedContributedElements =
        arrKeep( rawMode.putDefined, function ( put ) {
            return put.definer.type === "contributedElement";
        } );
    var putDefinedObjects =
        arrKeep( rawMode.putDefined, function ( put ) {
            return put.definer.type === "object";
        } );
    
    assertJsnUnique( putDefinedContributedElements, function ( put ) {
        var nsName = put.definer.namespace.name;
        if ( namespaceDefs.has( nsName )
            && namespaceDefs.get( nsName
                ).elements.has( put.definer.name ) )
            throw new Error();
        return [ nsName, put.definer.name ];
    } );
    
    var unique = !arrAny( putDefinedObjects, function ( put ) {
        if ( put.definer.visited )
            return true;
        put.definer.visited = true;
        return false;
    } );
    arrEach( putDefinedObjects, function ( put ) {
        put.definer.visited = false;
    } );
    if ( !unique )
        throw new Error();
    arrEach( putDefinedObjects, function ( put ) {
        if ( put.definer.value !== null )
            throw new Error();
    } );
    
    assertJsnUnique( rawMode.putListener, function ( put ) {
        var nsName = put.namespace.name;
        if ( namespaceDefs.has( nsName )
            && namespaceDefs.get( nsName ).listeners.has( put.name ) )
            throw new Error();
        return [ nsName, put.name ];
    } );
    
    
    // Now that we know the puts are valid, we follow through on them.
    
    arrEach( putDefinedObjects, function ( put ) {
        put.definer.value = { val: put.value };
    } );
    
    var listenersFired = [];
    
    function getContributionTable( name ) {
        if ( !namespaceDefs.has( name ) )
            namespaceDefs.set( name, {
                elements: jsnMap(),
                listeners: jsnMap()
            } );
        return namespaceDefs.get( name );
    }
    
    // NOTE: This adds the `listenersFired` entries for preexisting
    // listeners and new elements.
    arrEach( putDefinedContributedElements, function ( put ) {
        var contribs =
            getContributionTable( put.definer.namespace.name );
        if ( contribs.elements.has( put.definer.name ) )
            throw new Error();
        contribs.elements.set( put.definer.name, put.value );
        var singletonTable = new StcForeign( "table",
            jsnMap().plusEntry( put.definer.name, put.value ) );
        contribs.listeners.each( function ( k, v ) {
            listenersFired.push(
                { singletonTable: singletonTable, listener: v } );
        } );
    } );
    
    // NOTE: This adds the `listenersFired` entries for new listeners
    // and preexisting elements and also for new listeners and new
    // elements. It includes both old and new elements because the new
    // elements were already added above.
    arrEach( rawMode.putListener, function ( put ) {
        var contribs = getContributionTable( put.namespace.name );
        if ( contribs.listeners.has( put.name ) )
            throw new Error();
        var listenerObj = {
            attenuation: {
                type: rawMode.type,
                unitTestId: rawMode.unitTestId,
                contributingOnlyTo: rawMode.contributingOnlyTo
            },
            listener: put.listener
        };
        contribs.listeners.set( put.name, listenerObj );
        contribs.elements.each( function ( k, v ) {
            listenersFired.push( {
                singletonTable: new StcForeign( "table",
                    jsnMap().plusEntry( k, v ) ),
                listener: listenerObj
            } );
        } );
    } );
    
    
    return listenersFired;
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

function runTopLevelMacLookupsSync(
    namespaceDefs, rt, originalThreads ) {
    
    function currentlyMode( rawMode, body ) {
        rawMode.current = true;
        var result = body();
        rawMode.current = false;
        return result;
    }
    function currentlyThread( thread, body ) {
        return currentlyMode( thread.rawMode, body );
    }
    
    var threads = [];
    
    function addMacroThread( attenuation, thread ) {
        var rawMode = {
            type: attenuation.type,
            unitTestId: attenuation.unitTestId,
            contributingOnlyTo: attenuation.contributingOnlyTo,
            current: false,
            putDefined: [],
            putListener: [],
            defer: []
        };
        
        var monad = macLookupThen( macLookupRet( null ),
            function ( ignored ) {
        return macLookupThen(
            currentlyMode( rawMode, function () {
                return thread( rawMode );
            } ),
            function ( ignored ) {
            
            var listenersFired = runPuts( namespaceDefs, rawMode );
            arrEach( listenersFired, function ( listenerFired ) {
                addMacroThread( listenerFired.listener.attenuation,
                    function ( rawMode ) {
                    
                    return macLookupThen(
                        listenerFired.listener.listener.callStc( rt,
                            listenerFired.singletonTable ),
                        function ( effects ) {
                        
                        return currentlyMode( rawMode, function () {
                            return runEffects( rawMode, effects );
                        } );
                    } );
                } );
            } );
            arrEach( rawMode.defer, function ( deferred ) {
                addMacroThread( deferred.attenuation,
                    function ( rawMode ) {
                    
                    var body = deferred.body;
                    return macLookupThen( body( rawMode ),
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
            addMacroThread( {
                type: "macro",
                unitTestId: null,
                contributingOnlyTo: stcNameSetAll()
            }, thread.macLookupEffectsOfDefinitionEffects );
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
                rawMode: {
                    type: "js",
                    unitTestId: null,
                    contributingOnlyTo: stcNameSetEmpty(),
                    current: true,
                    putDefined: [],
                    putListener: []
                },
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
        } else if ( thread.monad.type === "get"
            || thread.monad.type === "procureContributedElements" ) {
            return replaceThread(
                macLookupThen( thread.monad, function ( ignored ) {
                    return macLookupRet( null );
                } ) );
        } else if ( thread.monad.type === "then" ) {
            var then = thread.monad.then;
            if ( thread.monad.first.type === "ret" ) {
                return replaceThread(
                    currentlyThread( thread, function () {
                        return then( thread.monad.first.val );
                    } ) );
            } else if ( thread.monad.first.type === "get" ) {
                
                var definer = thread.monad.first.definer;
                
                currentlyThread( thread, function () {
                    assertRawMode(
                        rawModeSupportsObserveDefiner( definer ),
                        thread.rawMode );
                } );
                
                if ( definer.type === "contributedElement" ) {
                    var maybeValue = null;
                    var k = definer.namespace.name;
                    if ( namespaceDefs.has( k ) ) {
                        var contributions = namespaceDefs.get( k );
                        if ( contributions.elements.has(
                            definer.name ) )
                            maybeValue = { val:
                                contributions.elements.get(
                                    definer.name ) };
                    }
                } else if ( definer.type === "object" ) {
                    var maybeValue = definer.value;
                } else {
                    throw new Error();
                }
                
                if ( maybeValue !== null ) {
                    return replaceThread(
                        currentlyThread( thread, function () {
                            return then( maybeValue.val );
                        } ) );
                } else {
                    thread.failedAdvances++;
                    return false;
                }
            } else if ( thread.monad.first.type ===
                "procureContributedElements" ) {
                
                // We check that the current thread has stopped
                // contributing to this state.
                currentlyThread( thread, function () {
                    assertRawMode(
                        rawModeSupportsObserveContributedElements(
                            thread.monad.first.namespace ),
                        thread.rawMode );
                } );
                
                // We wait for all the other threads to stop
                // contributing to this state.
                if ( arrAny( threads, function ( otherThread ) {
                    return rawModeSupportsContribute(
                        thread.monad.first.namespace
                    )( otherThread.rawMode );
                } ) ) {
                    thread.failedAdvances++;
                    return false;
                }
                
                var result = new StcForeign( "table",
                    (namespaceDefs.get(
                        thread.monad.first.namespace.name )
                        || { elements: jsnMap() }).elements );
                return replaceThread(
                    currentlyThread( thread, function () {
                        return then( result );
                    } ) );
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
        rt.anyTestFailed = true;
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
        rt.anyTestFailed = true;
    } );
}

function stcExecute( rt, expr ) {
    // #GEN
    return Function(
        "rt", "Stc", "StcFn", "StcForeign", "StcDexStruct",
        "StcFuseStruct", "stcForeignStrFromJs", "macLookupRet",
        "macLookupThen",
        
        // NOTE: When the code we generate for this has local
        // variables, we consistently prefix them with "stcLocal_" or
        // "_stc_". The latter is for variables that correspond to
        // variables in the original code.
        "return " + expr + ";"
        
    )( rt, Stc, StcFn, StcForeign, StcDexStruct,
        StcFuseStruct, stcForeignStrFromJs, macLookupRet,
        macLookupThen );
}

function addFunctionNativeDefinition(
    defNs, rawMode, tupleTagName, impl ) {
    
    collectPutDefined( rawMode,
        getFunctionCoercerDefiner( defNs, tupleTagName ),
        new StcForeign( "native-definition", impl ) );
}
function stcAddDefun( rt, defNs, rawMode, name, argName, body ) {
    // #GEN
    var tupleTagName = stcNameTupleTagAlreadySorted( name, [] );
    var innerFunc = stcExecute( rt,
        "function ( rt, " + stcIdentifier( argName ) + " ) { " +
            "return " + body + "; " +
        "}" );
    addFunctionNativeDefinition( defNs, rawMode, tupleTagName,
        function ( rt, funcVal, argVal ) {
        
        return innerFunc( rt, argVal );
    } );
}

function stcErr( msg ) {
    // #GEN
    return "(function () { " +
        "throw new Error( " + jsStr( msg ) + " ); " +
    "})()";
}

function evalStcForTest( rt, expr ) {
    return stcExecute( rt, expr );
}

function usingDefinitionNs( macroDefNs ) {
    // NOTE: The "rt" stands for "runtime." This carries things that
    // are relevant at run time.
    // TODO: See if we should add `namespaceDefs` to this.
    var rt = {};
    rt.defNs = macroDefNs;
    rt.functionDefs = {};
    rt.anyTestFailed = false;
    rt.fromBoolean = function ( b ) {
        var nil = stcNil.ofNow();
        return b ? stcYep.ofNow( nil ) : stcNope.ofNow( nil );
    };
    rt.toBoolean = function ( b ) {
        return stcYep.tags( b );
    };
    rt.dexHas = function ( dex, x, then ) {
        return macLookupThen( dex.dexHas( rt, x ), function ( has ) {
            return then( rt.toBoolean( has ) );
        } );
    };
    
    function callStcMulti( rt, func, var_args ) {
        var args = arguments;
        var n = args.length;
        return loop( func, 2 );
        function loop( func, i ) {
            if ( n <= i )
                return macLookupRet( func );
            return macLookupThen( func.callStc( rt, args[ i ] ),
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
    
    function stxToObtainMethod( stx ) {
        if ( !stcStx.tags( stx ) )
            return { type: "obtainInvalid" };
        var sExpr = stcStx.getProj( stx, "s-expr" );
        if ( stcForeign.tags( sExpr ) ) {
            var obtainMethod = stcForeign.getProj( sExpr, "val" );
            if ( stcObtainByName.tags( obtainMethod ) ) {
                var name =
                    stcObtainByName.getProj( obtainMethod, "name" );
                if ( !(name instanceof StcForeign
                    && name.purpose === "name") )
                    throw new Error();
                return { type: "obtainByName",
                    name: name.foreignVal };
            } else if ( stcObtainDirectly.tags( obtainMethod ) ) {
                return { type: "obtainDirectly", val:
                    stcObtainDirectly.getProj(
                        obtainMethod, "val" ) };
            } else {
                throw new Error();
            }
        } else if ( stcIstringNil.tags( sExpr ) ) {
            var string = stcIstringNil.getProj( sExpr, "string" );
            if ( !(string instanceof StcForeign
                && string.purpose === "string") )
                throw new Error();
            return { type: "obtainByName", name: string.getName() };
        } else {
            return { type: "obtainInvalid" };
        }
    }
    
    function stxToMaybeName( stx ) {
        var obtainMethod = stxToObtainMethod( stx );
        if ( obtainMethod.type === "obtainByName" )
            return obtainMethod.name;
        return null;
    }
    
    function stcConsListToArray( stc ) {
        var result = [];
        var currentStc = stc;
        for ( ;
            stcCons.tags( currentStc );
            currentStc = stcCons.getProj( currentStc, "cdr" )
        ) {
            result.push( stcCons.getProj( currentStc, "car" ) );
        }
        if ( !stcNil.tags( currentStc ) )
            throw new Error();
        return result;
    }
    
    function stcArrayToConsList( arr ) {
        var result = stcNil.ofNow();
        for ( var i = arr.length - 1; 0 <= i; i-- )
            result = stcCons.ofNow( arr[ i ], result );
        return result;
    }
    
    function getType( definitionNs, sourceMainTagNameRep ) {
        return macLookupThen(
            macLookupGet(
                getConstructorGlossaryDefiner(
                    definitionNs, sourceMainTagNameRep ),
                function () {
                    throw new Error(
                        "No such constructor: " +
                        JSON.stringify( sourceMainTagNameRep ) );
                } ),
            function ( constructorGlossary ) {
            
            if ( !stcConstructorGlossary.tags( constructorGlossary ) )
                throw new Error();
            var repMainTagName =
                stcConstructorGlossary.getProj( constructorGlossary,
                    "main-tag" );
            var sourceToRep =
                stcConstructorGlossary.getProj( constructorGlossary,
                    "source-to-rep" );
            
            if ( !(repMainTagName instanceof StcForeign
                && repMainTagName.purpose === "name") )
                throw new Error();
            
            var sourceNames = jsnMap();
            var repNames = jsnMap();
            function addUnique( map, key ) {
                if ( map.has( key ) )
                    throw new Error();
                map.add( key );
            }
            
            return macLookupRet(
                stcTypeArr( repMainTagName.foreignVal,
                    arrMap( stcConsListToArray( sourceToRep ),
                        function ( entry ) {
                        
                        if ( !stcAssoc.tags( entry ) )
                            throw new Error();
                        var sourceName =
                            stcAssoc.getProj( entry, "key" );
                        var repName =
                            stcAssoc.getProj( entry, "val" );
                        if ( !(sourceName instanceof StcForeign
                            && sourceName.purpose === "name") )
                            throw new Error();
                        if ( !(repName instanceof StcForeign
                            && repName.purpose === "name") )
                            throw new Error();
                        addUnique(
                            sourceNames, sourceName.foreignVal );
                        addUnique( repNames, repName.foreignVal );
                        return {
                            source: sourceName.foreignVal,
                            rep: repName.foreignVal
                        };
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
        
        // #GEN
        
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
                        "stcLocal_matchSubject.projVals[ " +
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
        // #GEN
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
                                "stcLocal_matchSubject.projVals[ " +
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
        return new StcFn( function ( rt, arg ) {
            return macLookupRet( func( rt, arg ) );
        } );
    }
    
    function stcAddMacro(
        definitionNs, rawMode, name, macroFunctionImpl ) {
        
        collectPutDefined( rawMode,
            getMacroFunctionDefiner( definitionNs, name ),
            stcFnPure( function ( rt, uniqueNs ) {
                return stcFnPure( function ( rt, definitionNs ) {
                    return stcFnPure( function ( rt, myStxDetails ) {
                        return stcFnPure( function ( rt, body ) {
                            return new StcFn( function ( rt, then ) {
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
                                    return then.callStc( rt,
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
            unitTestId: null,
            contributingOnlyTo: stcNameSetAll(),
            current: true,
            putDefined: [],
            putListener: []
        };
    }
    function commitDummyMode( namespaceDefs, rawMode ) {
        if ( rawMode.type !== "dummy-mode" )
            throw new Error();
        var listenersFired = runPuts( namespaceDefs, rawMode );
        if ( listenersFired.length !== 0 )
            throw new Error();
    }
    
    function stcAddCoreMacros( namespaceDefs, targetDefNs ) {
        
        var dummyMode = makeDummyMode();
        
        function mac( name, body ) {
            stcAddPureMacro( targetDefNs, dummyMode, name, body );
        }
        function effectfulMac( name, body ) {
            stcAddMacro( targetDefNs, dummyMode, name, body );
        }
        function effectfulFun( name, body ) {
            var sourceMainTagName =
                stcForeignStrFromJs( name ).getName();
            var repMainTagName = [ "n:main-core", sourceMainTagName ];
            var tupleTagName =
                stcNameTupleTagAlreadySorted( repMainTagName, [] );
            addFunctionNativeDefinition(
                targetDefNs, dummyMode, tupleTagName,
                function ( rt, funcVal, argVal ) {
                
                return body( rt, argVal );
            } );
            processDefStruct( targetDefNs, dummyMode,
                sourceMainTagName, repMainTagName, [] );
        }
        function fun( name, body ) {
            effectfulFun( name, function ( rt, argVal ) {
                return macLookupRet( body( rt, argVal ) );
            } );
        }
        
        mac( "def-struct",
            function ( nss, myStxDetails, body, then ) {
            
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            
            var sourceMainTagName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( sourceMainTagName === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                var repMainTagName =
                    [ "n:main", sourceMainTagName,
                        nss.uniqueNs.name ];
                processDefStruct( nss.definitionNs, rawMode,
                    sourceMainTagName, repMainTagName,
                    mapConsListToArr( body1, function ( projName ) {
                        var source = stxToMaybeName( projName );
                        if ( source === null )
                            throw new Error();
                        return {
                            source: source,
                            rep:
                                [ "n:proj", source, sourceMainTagName,
                                    nss.uniqueNs.name ]
                        };
                    } ) );
                return macLookupThenRunEffects( rawMode,
                    then( stcNil.of() ) );
            } );
        } );
        
        mac( "defn", function ( nss, myStxDetails, body, then ) {
            // #GEN
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            
            var sourceMainTagName =
                stxToMaybeName( stcCons.getProj( body, "car" ) );
            if ( sourceMainTagName === null )
                throw new Error();
            
            var firstArg =
                stxToMaybeName( stcCons.getProj( body1, "car" ) );
            if ( firstArg === null )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                var repMainTagName =
                    [ "n:main", sourceMainTagName,
                        nssGet( nss, "constructor" ).uniqueNs.name ];
                processDefStruct( nss.definitionNs, rawMode,
                    sourceMainTagName, repMainTagName, [] );
                return processFn( nssGet( nss, "body" ), rawMode,
                    body1,
                    function ( rawMode, processedFn ) {
                    
                    stcAddDefun( rt, nss.definitionNs, rawMode,
                        repMainTagName,
                        firstArg,
                        stcCall( processedFn,
                            "macLookupRet( " +
                                stcIdentifier( firstArg ) + " )"
                            ) );
                    
                    return macLookupThenRunEffects( rawMode,
                        then( stcNil.of() ) );
                } );
            } );
        } );
        
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
                return macLookupThen( stcExecute( rt, processedFn ),
                    function ( executedFn ) {
                
                collectPutDefined( rawMode,
                    getMacroFunctionDefiner( nss.definitionNs, name ),
                    executedFn );
                
                return macLookupThenRunEffects( rawMode,
                    then( stcNil.of() ) );
                
                } );
                } );
            } );
        } );
        
        // TODO: See if we should design a different approach to unit
        // tests. Perhaps the results should be installed as
        // definitions somewhere. Perhaps we should be able to control
        // the order.
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
            if ( !stcCons.tags( body2 ) )
                throw new Error();
            var body3 = stcCons.getProj( body2, "cdr" );
            if ( stcCons.tags( body3 ) )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                
                function evalExpr( nss, rawMode, expr, then ) {
                    return macroexpand(
                        nssGet( nss, "unique" ),
                        rawMode,
                        expr,
                        nssGet( nss, "outbox" ).uniqueNs,
                        function ( rawMode, expanded ) {
                        
                        return macLookupThen(
                            evalStcForTest( rt, expanded ),
                            function ( evaluated ) {
                            
                            return then( rawMode, evaluated );
                        } );
                    } );
                }
                
                // NOTE: This `evalExpr` call is the only place we
                // ignore `macroexpand`'s result.
                evalExpr( nssGet( nss, "dex" ), rawMode,
                    stcCons.getProj( body, "car" ),
                    function ( rawMode, dex ) {
                return evalExpr( nssGet( nss, "a" ), rawMode,
                    stcCons.getProj( body1, "car" ),
                    function ( rawMode, a ) {
                return evalExpr( nssGet( nss, "b" ), rawMode,
                    stcCons.getProj( body2, "car" ),
                    function ( rawMode, b ) {
                return rt.dexHas( dex, a, function ( hasA ) {
                return rt.dexHas( dex, b, function ( hasB ) {
                
                var succeeded = hasA && hasB &&
                    nameCompare( a.getName(), b.getName() ) === 0;
                if ( succeeded )
                    console.log( "Test succeeded" );
                else if ( !hasA && !hasB )
                    console.log(
                        "Test failed: Expected things that matched " +
                        dex.pretty() + ", got " + a.pretty() + " " +
                        "and " + b.pretty() );
                else
                    console.log(
                        "Test failed: Expected " +
                        b.pretty() + ", got " + a.pretty() );
                
                if ( !succeeded )
                    rt.anyTestFailed = true;
                
                return macLookupRet( stcNil.ofNow() );
                
                } );
                } );
                } );
                } );
                } );
                
                return macLookupThenRunEffects( rawMode,
                    then( stcNil.of() ) );
            } );
        } );
        
        // TODO: See if we should design a different approach to unit
        // tests. Perhaps the results should be installed as
        // definitions somewhere. Perhaps we should be able to control
        // the order.
        //
        // TODO: Make this expand multiple expressions concurrently.
        //
        mac( "test-async",
            function ( nss, myStxDetails, body, then ) {
            
            if ( !stcCons.tags( body ) )
                throw new Error();
            var body1 = stcCons.getProj( body, "cdr" );
            if ( !stcCons.tags( body1 ) )
                throw new Error();
            var body2 = stcCons.getProj( body1, "cdr" );
            if ( !stcCons.tags( body2 ) )
                throw new Error();
            var body3 = stcCons.getProj( body2, "cdr" );
            if ( stcCons.tags( body3 ) )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                
                function makeEvalExpr( nss, rawMode, expr, then ) {
                    
                    // NOTE: This is the only place we ignore
                    // `macroexpand`'s return value.
                    macroexpand(
                        nssGet( nss, "unique" ),
                        rawMode,
                        expr,
                        nssGet( nss, "outbox" ).uniqueNs,
                        function ( rawMode, expanded ) {
                        
                        return then( rawMode,
                            function ( rawMode, then ) {
                            
                            return macLookupThen(
                                evalStcForTest( rt, expanded ),
                                function ( evaluated ) {
                                
                                return then( rawMode, evaluated );
                            } );
                        } );
                    } );
                    
                    return macLookupRet( stcNil.ofNow() );
                }
                
                function makeEvalExprAndRun(
                    nss, rawMode, expr, then ) {
                    
                    return makeEvalExpr( nss, rawMode, expr,
                        function ( rawMode, evalExpr ) {
                    return then( rawMode, function ( rawMode, then ) {
                    return evalExpr( rawMode,
                        function ( rawMode, evaluated ) {
                    
                    var definer = {
                        type: "object",
                        visited: false,
                        unitTestId: rawMode.unitTestId,
                        value: null
                    };
                    
                    collectDefer( rawMode, {}, function ( rawMode ) {
                        return macLookupThen(
                            macLookupGet( definer, function () {
                                throw new Error(
                                    "Never completed a side of a test-async" );
                            } ),
                            function ( defined ) {
                            
                            return macLookupRet(
                                new StcForeign( "effects",
                                    function ( rawMode ) {
                                
                                return then( rawMode, defined );
                            } ) );
                            
                        } );
                    } );
                    
                    return macLookupThenRunEffects( rawMode,
                        evaluated.callStc( rt,
                            new StcForeign( "definer", definer ) ) );
                    
                    } );
                    } );
                    } );
                }
                
                makeEvalExpr( nssGet( nss, "dex" ), rawMode,
                    stcCons.getProj( body, "car" ),
                    function ( rawMode, evalDex ) {
                return makeEvalExprAndRun( nssGet( nss, "a" ),
                    rawMode,
                    stcCons.getProj( body1, "car" ),
                    function ( rawMode, evalA ) {
                return makeEvalExprAndRun( nssGet( nss, "b" ),
                    rawMode,
                    stcCons.getProj( body2, "car" ),
                    function ( rawMode, evalB ) {
                
                collectDefer( rawMode, {
                    type: "unit-test",
                    unitTestId: nssGet( nss, "dex" ).uniqueNs.name,
                    contributingOnlyTo: stcNameSetEmpty()
                }, function ( rawMode ) {
                return macLookupRet(
                    new StcForeign( "effects", function ( rawMode ) {
                return evalDex( rawMode, function ( rawMode, dex ) {
                return evalA( rawMode, function ( rawMode, a ) {
                return evalB( rawMode, function ( rawMode, b ) {
                return rt.dexHas( dex, a, function ( hasA ) {
                return rt.dexHas( dex, b, function ( hasB ) {
                
                var succeeded = hasA && hasB &&
                    nameCompare( a.getName(), b.getName() ) === 0;
                if ( succeeded )
                    console.log( "Test succeeded" );
                else if ( !hasA && !hasB )
                    console.log(
                        "Test failed: Expected things that matched " +
                        dex.pretty() + ", got " + a.pretty() + " " +
                        "and " + b.pretty() );
                else
                    console.log(
                        "Test failed: Expected " +
                        b.pretty() + ", got " + a.pretty() );
                
                if ( !succeeded )
                    rt.anyTestFailed = true;
                
                return macLookupRet( stcNil.ofNow() );
                
                } );
                } );
                } );
                } );
                } );
                } ) );
                } );
                
                return macLookupRet( stcNil.ofNow() );
                
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
            // #GEN
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
        
        function stxToDefiniteString( stx ) {
            if ( !stcStx.tags( stx ) )
                throw new Error();
            var istringNil = stcStx.getProj( stx, "s-expr" );
            if ( !stcIstringNil.tags( istringNil ) )
                throw new Error();
            return parseString(
                stcIstringNil.getProj( istringNil, "string" ) );
        }
        
        function assertValidDexable( rt, x, then ) {
            if ( !stcDexable.tags( x ) )
                throw new Error();
            
            var dex = stcDexable.getProj( x, "dex" );
            var val = stcDexable.getProj( x, "val" );
            
            return rt.dexHas( dex, val, function ( has ) {
                if ( !has )
                    throw new Error();
                
                return then( val );
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
                                    body, "car" ) ).jsStr ) ) );
            } );
        } );
        
        mac( "str", function ( nss, myStxDetails, body, then ) {
            // #GEN
            if ( !stcCons.tags( body ) )
                throw new Error();
            if ( stcCons.tags( stcCons.getProj( body, "cdr" ) ) )
                throw new Error();
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupThenRunEffects( rawMode,
                    then(
                        "macLookupRet( " +
                            "stcForeignStrFromJs( " +
                                jsStr(
                                    stxToDefiniteString( stcCons.getProj( body, "car" ) ).jsStr ) +
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
            // #GEN
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
        function structMapper( nss, body, then, genJsConstructor ) {
            
            // #GEN
            
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
                                val: projVal },
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
                    genJsConstructor(
                        jsStr( type.getTupleTag() ) + ", " +
                        "[ " +
                        
                        arrMap( projVals, function ( entry, i ) {
                            return "{ " +
                                "i: " +
                                    JSON.stringify( entry.i ) + ", " +
                                "val: stcLocal_proj" + i + " " +
                            "}";
                        } ).join( ", " ) + " " +
                    "]" ) + " )";
                for ( var i = projVals.length - 1; 0 <= i; i-- )
                    result = "macLookupThen( " +
                        projVals[ i ].val + ", " +
                        "function ( stcLocal_proj" + i + " ) {\n" +
                    
                    "return " + result + ";\n" +
                    "} )";
                return macLookupThenRunEffects( rawMode,
                    then( result ) );
            }
        }
        
        effectfulMac( "dex-struct",
            function ( nss, myStxDetails, body, then ) {
            
            // #GEN
            
            return structMapper( nss, body, then, function ( args ) {
                return "new StcDexStruct( " + args + " )";
            } );
        } );
        
        fun( "dex-default", function ( rt, first ) {
            return stcFnPure( function ( rt, second ) {
                return new StcDexDefault( first, second );
            } );
        } );
        
        fun( "dex-give-up", function ( rt, ignored ) {
            return new StcDexGiveUp();
        } );
        
        fun( "dex-dex", function ( rt, ignored ) {
            return new StcDexDex();
        } );
        
        fun( "dex-merge", function ( rt, ignored ) {
            return new StcDexMerge();
        } );
        
        fun( "dex-fuse", function ( rt, ignored ) {
            return new StcDexFuse();
        } );
        
        fun( "dex-name", function ( rt, ignored ) {
            return new StcDexName();
        } );
        
        fun( "dex-string", function ( rt, ignored ) {
            return new StcDexString();
        } );
        
        effectfulFun( "dex-by-own-method",
            function ( rt, dexableGetMethod ) {
            
            return assertValidDexable( rt, dexableGetMethod,
                function ( getMethod ) {
                
                return macLookupRet(
                    new StcDexByOwnMethod( dexableGetMethod ) );
            } );
        } );
        
        effectfulFun( "dex-fix", function ( rt, dexableUnwrap ) {
            return assertValidDexable( rt, dexableUnwrap,
                function ( unwrap ) {
                
                return macLookupRet( new StcDexFix( dexableUnwrap ) );
            } );
        } );
        
        fun( "dex-table", function ( rt, dexVal ) {
            if ( dexVal.affiliation !== "dex" )
                throw new Error();
            return new StcDexTable( dexVal );
        } );
        
        fun( "dex-int", function ( rt, ignored ) {
            return new StcDexInt();
        } );
        
        fun( "call-dex", function ( rt, dex ) {
            return stcFnPure( function ( rt, a ) {
                return new StcFn( function ( rt, b ) {
                    return rt.dexHas( dex, a, function ( hasA ) {
                        if ( !hasA )
                            return macLookupRet( stcNil.ofNow() );
                    
                    return rt.dexHas( dex, b, function ( hasB ) {
                        if ( !hasB )
                            return macLookupRet( stcNil.ofNow() );
                    
                    var result =
                        nameCompare( a.getName(), b.getName() );
                    if ( result < 0 )
                        return macLookupRet(
                            stcYep.ofNow(
                                new StcForeign( "lt", null ) ) );
                    if ( 0 < result )
                        return macLookupRet(
                            stcYep.ofNow(
                                new StcForeign( "gt", null ) ) );
                    
                    return macLookupRet(
                        stcYep.ofNow( stcNil.ofNow() ) );
                    
                    } );
                    
                    } );
                } );
            } );
        } );
        
        fun( "in-dex", function ( rt, dex ) {
            return new StcFn( function ( rt, x ) {
                return dex.dexHas( rt, x );
            } );
        } );
        
        effectfulFun( "name-of", function ( rt, dexable ) {
            return assertValidDexable( rt, dexable, function ( x ) {
                return macLookupRet(
                    new StcForeign( "name", x.getName() ) );
            } );
        } );
        
        fun( "merge-by-dex", function ( rt, dex ) {
            return new StcMergeByDex( dex );
        } );
        
        effectfulMac( "merge-struct",
            function ( nss, myStxDetails, body, then ) {
            
            // #GEN
            
            return structMapper( nss, body, then, function ( args ) {
                return "new StcFuseStruct( " +
                    "\"merge-struct\", \"merge\", " + args + " )";
            } );
        } );
        
        fun( "merge-default", function ( rt, first ) {
            return stcFnPure( function ( rt, second ) {
                return new StcFuseDefault( "merge-default", "merge",
                    first, second );
            } );
        } );
        
        effectfulFun( "merge-by-own-method",
            function ( rt, dexableGetMethod ) {
            
            return assertValidDexable( rt, dexableGetMethod,
                function ( getMethod ) {
                
                return macLookupRet(
                    new StcFuseByOwnMethod( "merge-by-own-method",
                        "merge",
                        dexableGetMethod ) );
            } );
        } );
        
        effectfulFun( "merge-fix", function ( rt, dexableUnwrap ) {
            return assertValidDexable( rt, dexableUnwrap,
                function ( unwrap ) {
                
                return macLookupRet(
                    new StcFuseFix( "merge-fix", "merge",
                        dexableUnwrap ) );
            } );
        } );
        
        fun( "merge-table", function ( rt, mergeVal ) {
            return new StcFuseTable( "merge-table", "merge",
                mergeVal );
        } );
        
        fun( "call-merge", function ( rt, merge ) {
            return stcFnPure( function ( rt, a ) {
                return new StcFn( function ( rt, b ) {
                    if ( merge.affiliation !== "merge" )
                        throw new Error();
                    return merge.fuse( rt, a, b );
                } );
            } );
        } );
        
        fun( "fuse-by-merge", function ( rt, merge ) {
            return new StcFuseByMerge( merge );
        } );
        
        effectfulMac( "fuse-struct",
            function ( nss, myStxDetails, body, then ) {
            
            // #GEN
            
            return structMapper( nss, body, then, function ( args ) {
                return "new StcFuseStruct( " +
                    "\"fuse-struct\", \"fuse\", " + args + " )";
            } );
        } );
        
        fun( "fuse-default", function ( rt, first ) {
            return stcFnPure( function ( rt, second ) {
                return new StcFuseDefault( "fuse-default", "fuse",
                    first, second );
            } );
        } );
        
        effectfulFun( "fuse-by-own-method",
            function ( rt, dexableGetMethod ) {
            
            return assertValidDexable( rt, dexableGetMethod,
                function ( getMethod ) {
                
                return macLookupRet(
                    new StcFuseByOwnMethod( "fuse-by-own-method",
                        "fuse",
                        dexableGetMethod ) );
            } );
        } );
        
        effectfulFun( "fuse-fix", function ( rt, dexableUnwrap ) {
            return assertValidDexable( rt, dexableUnwrap,
                function ( unwrap ) {
                
                return macLookupRet(
                    new StcFuseFix( "fuse-fix", "fuse",
                        dexableUnwrap ) );
            } );
        } );
        
        fun( "fuse-table", function ( rt, fuseVal ) {
            return new StcFuseTable( "fuse-table", "fuse", fuseVal );
        } );
        
        fun( "fuse-int-by-plus", function ( rt, ignored ) {
            return new StcFuseIntByPlus();
        } );
        
        fun( "fuse-int-by-times", function ( rt, ignored ) {
            return new StcFuseIntByTimes();
        } );
        
        fun( "call-fuse", function ( rt, fuse ) {
            return stcFnPure( function ( rt, a ) {
                return new StcFn( function ( rt, b ) {
                    if ( fuse.affiliation !== "fuse" )
                        throw new Error();
                    return fuse.fuse( rt, a, b );
                } );
            } );
        } );
        
        fun( "table-empty", function ( rt, ignored ) {
            return new StcForeign( "table", jsnMap() );
        } );
        
        fun( "table-shadow", function ( rt, key ) {
            return stcFnPure( function ( rt, maybeVal ) {
                return stcFnPure( function ( rt, table ) {
                    if ( !(key instanceof StcForeign
                        && key.purpose === "name") )
                        throw new Error();
                    if ( !(table instanceof StcForeign
                        && table.purpose === "table") )
                        throw new Error();
                    
                    if ( stcNil.tags( maybeVal ) )
                        return new StcForeign( "table",
                            table.foreignVal.minusEntry(
                                key.foreignVal ) );
                    if ( stcYep.tags( maybeVal ) )
                        return new StcForeign( "table",
                            table.foreignVal.plusEntry(
                                key.foreignVal,
                                stcYep.getProj( maybeVal, "val" ) ) );
                    throw new Error();
                } );
            } );
        } );
        
        fun( "table-get", function ( rt, key ) {
            return stcFnPure( function ( rt, table ) {
                if ( !(key instanceof StcForeign
                    && key.purpose === "name") )
                    throw new Error();
                var k = key.foreignVal;
                
                if ( !(table instanceof StcForeign
                    && table.purpose === "table") )
                    throw new Error();
                
                if ( table.foreignVal.has( k ) )
                    return stcYep.ofNow( table.foreignVal.get( k ) );
                else
                    return stcNil.ofNow();
            } );
        } );
        
        fun( "table-zip", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                return new StcFn( function ( rt, combiner ) {
                    if ( !(a instanceof StcForeign
                        && a.purpose === "table") )
                        throw new Error();
                    if ( !(b instanceof StcForeign
                        && b.purpose === "table") )
                        throw new Error();
                    
                    var entries = [];
                    a.foreignVal.plus( b.foreignVal ).each(
                        function ( k, v ) {
                        
                        function get( table ) {
                            var v = table.get( k );
                            return v === void 0 ?
                                stcNil.ofNow() :
                                stcYep.ofNow( v );
                        }
                        entries.push(
                            { k: k, a: get( a ), b: get( b ) } );
                    } );
                    var n = entries.length;
                    return loop( 0, jsnMap() );
                    function loop( i, table ) {
                        if ( n <= i )
                            return macLookupRet(
                                new StcForeign( "table", table ) );
                        var entry = entries[ i ];
                        return macLookupThen(
                            callStcMulti( rt, combiner,
                                new StcForeign( "table",
                                    jsnMap().plusEntry(
                                        entry.k, stcNil.ofNow() ) ),
                                entry.a,
                                entry.b ),
                            function ( v ) {
                            
                            if ( stcNil.tags( v ) )
                                return loop( i + 1, table );
                            else if ( stcYep.tags( v ) )
                                return loop( i + 1,
                                    table.plusEntry( entry.k, stcYep.getProj( v, "val" ) ) );
                            else
                                throw new Error();
                        } );
                    }
                } );
            } );
        } );
        
        fun( "tables-fuse", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                return new StcFn( function ( rt, fuse ) {
                    if ( !(a instanceof StcForeign
                        && a.purpose === "table") )
                        throw new Error();
                    if ( !(b instanceof StcForeign
                        && b.purpose === "table") )
                        throw new Error();
                    if ( fuse.affiliation !== "fuse" )
                        throw new Error();
                    
                    var vals = [];
                    a.foreignVal.each( function ( k, v ) {
                        vals.push( v );
                    } );
                    b.foreignVal.each( function ( k, v ) {
                        vals.push( v );
                    } );
                    var n = vals.length;
                    if ( n === 0 )
                        return macLookupret( stcNil.ofNow() );
                    return loop( 1, vals[ 0 ] );
                    function loop( i, state ) {
                        if ( n <= i )
                            return macLookupRet(
                                stcYep.ofNow( state ) );
                        return macLookupThen(
                            fuse.fuse( rt, state, vals[ i ] ),
                            function ( state ) {
                            
                            if ( !stcYep.tags( state ) )
                                return macLookupRet( stcNil.ofNow() );
                            
                            return loop( i + 1,
                                stcYep.getProj( state, "val" ) );
                        } );
                    }
                } );
            } );
        } );
        
        fun( "int-zero", function ( rt, ignored ) {
            return stcForeignInt( 0 );
        } );
        
        fun( "int-one", function ( rt, ignored ) {
            return stcForeignInt( 1 );
        } );
        
        // TODO: See if we should make this available as a dex
        // (becoming the first dex with a visible order to it) or as a
        // merge (in the form of a max or min operation).
        fun( "int-compare", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                if ( !(a instanceof StcForeign
                    && a.purpose === "int") )
                    throw new Error();
                if ( !(b instanceof StcForeign
                    && b.purpose === "int") )
                    throw new Error();
                
                if ( a.foreignVal < b.foreignVal )
                    return stcYep.ofNow( stcNil.ofNow() );
                else if ( b.foreignVal < a.foreignVal )
                    return stcNope.ofNow( stcNil.ofNow() );
                else
                    return stcNil.ofNow();
            } );
        } );
        
        fun( "int-minus", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                if ( !(a instanceof StcForeign
                    && a.purpose === "int") )
                    throw new Error();
                if ( !(b instanceof StcForeign
                    && b.purpose === "int") )
                    throw new Error();
                return stcForeignInt( a.foreignVal - b.foreignVal );
            } );
        } );
        
        fun( "int-div-rounded-down", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                if ( !(a instanceof StcForeign
                    && a.purpose === "int") )
                    throw new Error();
                if ( !(b instanceof StcForeign
                    && b.purpose === "int") )
                    throw new Error();
                
                if ( b.foreignVal === 0 )
                    return stcNil.ofNow();
                
                var div = Math.floor( a.foreignVal / b.foreignVal );
                var mod = a.foreignVal - div * b.foreignVal;
                return stcCarried.ofNow(
                    stcForeignInt( div ),
                    stcForeignInt( mod ) );
            } );
        } );
        
        fun( "string-length", function ( rt, string ) {
            var stringInternal = parseString( string ).paddedStr;
            if ( stringInternal.length % 2 !== 0 )
                throw new Error();
            return stcForeignInt( stringInternal.length / 2 );
        } );
        
        fun( "string-empty", function ( rt, ignored ) {
            return stcForeignStrFromJs( "" );
        } );
        
        fun( "string-singleton", function ( rt, unicodeScalar ) {
            if ( !(unicodeScalar instanceof StcForeign
                && unicodeScalar.purpose === "int") )
                throw new Error();
            
            var result = unicodeCodePointToString( unicodeScalar );
            if ( result === null )
                throw new Error();
            
            return stcForeignStrFromJs( result );
        } );
        
        function callStcLater( rt, func, var_args ) {
            var args = [].slice.call( arguments, 2 );
            return new StcForeign( "effects", function ( rawMode ) {
                collectDefer( rawMode, {}, function ( rawMode ) {
                    return callStcMulti.apply( null,
                        [ rt, func ].concat( args ) );
                } );
                return macLookupRet( stcNil.ofNow() );
            } );
        }
        
        fun( "string-cut-later", function ( rt, string ) {
            return stcFnPure( function ( rt, start ) {
                return stcFnPure( function ( rt, stop ) {
                    return stcFnPure( function ( rt, then ) {
                        
                        var stringInternal =
                            parseString( string ).paddedStr;
                        
                        if ( !(start instanceof StcForeign
                            && start.purpose === "int") )
                            throw new Error();
                        if ( !(stop instanceof StcForeign
                            && stop.purpose === "int") )
                            throw new Error();
                        
                        if ( !(0 <= start
                            && start <= stop
                            && stop * 2 <= stringInternal.length) )
                            throw new Error();
                        
                        return callStcLater( rt, then,
                            stcForeignStrFromPadded(
                                stringInternal.substring(
                                    start * 2, stop * 2 ) ) );
                    } );
                } );
            } );
        } );
        
        function parseSingleUnicodeScalar( string ) {
            var parsedString = parseString( string );
            if ( parsedString.paddedStr.length !== 2 )
                throw new Error();
            
            return anyUnicodeCodePoint( parsedString.jsStr,
                function ( codePointInfo ) {
                
                return { val: codePointInfo.codePoint };
            } ).val;
        }
        
        fun( "string-get-unicode-scalar", function ( rt, string ) {
            return stcFnPure( function ( rt, start ) {
                var stringInternal = parseString( string ).paddedStr;
                
                if ( !(start instanceof StcForeign
                    && start.purpose === "int") )
                    throw new Error();
                
                if ( !(0 <= start
                    && start * 2 < stringInternal.length) )
                    throw new Error();
                
                return stcForeignInt(
                    parseSingleUnicodeScalar(
                        stcForeignStrFromPadded(
                            stringInternal.substring(
                                start * 2, (start + 1) * 2 ) ) ) );
            } );
        } );
        
        fun( "string-append-later", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                return stcFnPure( function ( rt, then ) {
                    var aInternal = parseString( a ).paddedStr;
                    var bInternal = parseString( b ).paddedStr;
                    
                    return callStcLater( rt, then,
                        stcForeignStrFromPadded(
                            aInternal + bInternal ) );
                } );
            } );
        } );
        
        function regexTrivial( regex ) {
            return {
                optional: function ( next ) {
                    return regex + next;
                },
                necessary: regex
            };
        }
        
        function regexOptionalTrivial( necessary ) {
            return {
                optional: function ( next ) {
                    return "(?:" + necessary + next + "|$)";
                },
                necessary: necessary
            };
        }
        
        fun( "regex-give-up", function ( rt, ignored ) {
            return new StcForeign( "regex", function () {
                return regexTrivial( "\\d^" );
            } );
        } );
        
        fun( "regex-empty", function ( rt, ignored ) {
            return new StcForeign( "regex", function () {
                return regexTrivial( "" );
            } );
        } );
        
        function escapeRegex( jsStr ) {
            return jsStr.replace( /[\\^$.|?*+()[\]{}]/g, "\\$&" );
        }
        function escRegexSet( jsStr ) {
            return jsStr.replace( /[\\^-[\]]/g, "\\$&" );
        }
        
        fun( "regex-from-string", function ( rt, string ) {
            var stringRep = parseString( string ).paddedStr;
            
            return new StcForeign( "regex", function () {
                return {
                    optional: function ( next ) {
                        return stringRep.replace( /[\d\D]{2}/g,
                            function ( scalarStr, i, stringRep ) {
                                return "(?:" +
                                    escapeRegex( scalarStr );
                            } ) +
                            next +
                            stringRep.replace( /[\d\D]{2}/g, "|$$)" );
                    },
                    necessary: escapeRegex( stringRep )
                };
            } );
        } );
        
        fun( "regex-one-in-string", function ( rt, string ) {
            var stringRep = parseString( string ).paddedStr;
            
            return new StcForeign( "regex", function () {
                return regexOptionalTrivial( "(?:\\d^" +
                    stringRep.replace( /[\d\D]{2}/g,
                        function ( scalarStr, i, stringRep ) {
                            return "|" + escapeRegex( scalarStr );
                        } ) + ")" );
            } );
        } );
        
        fun( "regex-one-in-range", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
                var aScalar = parseSingleUnicodeScalar( a );
                var bScalar = parseSingleUnicodeScalar( b );
                
                if ( !(aScalar <= bScalar) )
                    throw new Error();
                
                var aParsed = parseString( a ).paddedStr;
                var bParsed = parseString( b ).paddedStr;
                var a0 = aParsed.charAt( 0 );
                var a1 = aParsed.charAt( 1 );
                var b0 = bParsed.charAt( 0 );
                var b1 = bParsed.charAt( 1 );
                
                return new StcForeign( "regex", function () {
                    return regexOptionalTrivial( a0 === b0 ?
                        escapeRegex( a0 ) +
                            (a1 === b1 ?
                                escapeRegex( a1 ) :
                                "[" + escRegexSet( a1 ) + "-" +
                                    escRegexSet( b1 ) + "]") :
                        "(?:" + escapeRegex( a0 ) +
                            "[" + escRegexSet( a1 ) + "-\\uFFFF]|" +
                            (a0 + 1 === b0 ? "" :
                                "[" + escRegexSet( a0 + 1 ) + "-" +
                                    escRegexSet( b0 - 1 ) + "][\\d\\D]|") +
                            escapeRegex( a1 ) +
                            "[\\x00-" + escRegexSet( b1 ) + "])" );
                } );
            } );
        } );
        
        fun( "regex-one", function ( rt, ignored ) {
            return new StcForeign( "regex", function () {
                return regexOptionalTrivial( "[\\d\\D]{2}" );
            } );
        } );
        
        function compileRegex( regex ) {
            if ( !(regex instanceof StcForeign
                && regex.purpose === "regex") )
                throw new Error();
            var regexFunc = regex.foreignVal;
            var regexData = regexFunc();
            
            var optional = regexData.optional;
            if ( optional === void 0 )
                optional = null;
            var necessary = regexData.necessary;
            if ( necessary === void 0 )
                necessary = null;
            
            function makeFunc() {
                if ( optional !== null && necessary !== null ) {
                    // NOTE: There's a difference between `(?:_|)` and
                    // `_?` when `_` contains capture groups. The
                    // latter discards the groups if `_` matches an
                    // empty string.
                    var compiled = new RegExp( "(?:" +
                        necessary + "()|" +
                        optional( "" ) + "()|)" );
                    return function ( string, start, stop ) {
                        compiled.lastIndex = start * 2;
                        var s = string.length === stop * 2 ?
                            string :
                            string.substring( 0, stop * 2 );
                        var match = compiled.exec( s );
                        var matchedNec = match[ 1 ] !== void 0;
                        var matchedOpt = match[ 2 ] !== void 0;
                        var length2 = match[ 0 ].length;
                        if ( length2 % 2 !== 0 )
                            throw new Error();
                        
                        if ( matchedNec )
                            return { type: "matched",
                                stop: start + length2 / 2 };
                        else if ( matchedOpt )
                            return { type: "passedEnd" };
                        else
                            return { type: "failed" };
                    };
                }
                
                var makeFunc = regexDta.makeFunc;
                if ( makeFunc !== void 0 )
                    return makeFunc();
                
                throw new Error();
            }
            
            return {
                optional: optional,
                necessary: necessary,
                makeFunc: makeFunc
            };
        }
        
        fun( "regex-if", function ( rt, conditionRegex ) {
            return stcFnPure( function ( rt, thenRegex ) {
                return stcFnPure( function ( rt, elseRegex ) {
                    if ( !(conditionRegex instanceof StcForeign
                        && conditionRegex.purpose === "regex") )
                        throw new Error();
                    if ( !(thenRegex instanceof StcForeign
                        && thenRegex.purpose === "regex") )
                        throw new Error();
                    if ( !(elseRegex instanceof StcForeign
                        && elseRegex.purpose === "regex") )
                        throw new Error();
                    
                    return new StcForeign( "regex", function () {
                        var cCompiled =
                            compileRegex( conditionRegex );
                        var tCompiled = compileRegex( thenRegex );
                        var eCompiled = compileRegex( elseRegex );
                        var cOpt = cCompiled.optional;
                        var tOpt = tCompiled.optional;
                        var eOpt = eCompiled.optional;
                        var cNec = cCompiled.necessary;
                        var tNec = tCompiled.necessary;
                        var eNec = eCompiled.necessary;
                        
                        return {
                            optional:
                                cNec === null ? null :
                                cOpt === null ? null :
                                tOpt === null ? null :
                                eOpt === null ? null :
                                function ( next ) {
                                    return "(?:" +
                                        "(?!" + cNec + ")(?:" +
                                            
                                            // We may run out of room matching the condition.
                                            cOpt( "" ) + "|" +
                                            
                                            // We may match the else clause.
                                            eOpt( next ) +
                                        ")|" +
                                        
                                        // We may match the then clause.
                                        cNec + tOpt( next ) +
                                    ")";
                                },
                            necessary:
                                cNec === null ? null :
                                tNec === null ? null :
                                eNec === null ? null :
                                "(?:" +
                                    
                                    // We may match the then clause.
                                    cNec + tNec + "|" +
                                    
                                    // We may match the else clause.
                                    "(?!" + cNec + ")" + eNec +
                                ")",
                            makeFunc: function () {
                                var cFunc = cCompiled.makeFunc();
                                var tFunc = tCompiled.makeFunc();
                                var eFunc = eCompiled.makeFunc();
                                
                                return function ( string, start, stop ) {
                                    var cResult = cFunc( string, start, stop );
                                    
                                    if ( cResult.type === "matched" )
                                        return tFunc( string, cResult.stop, stop );
                                    else if ( cResult.type === "failed" )
                                        return eFunc( string, start, stop );
                                    else
                                        return cResult;
                                };
                            }
                        };
                    } );
                } );
            } );
        } );
        
        fun( "regex-while", function ( rt, conditionRegex ) {
            return stcFnPure( function ( rt, bodyRegex ) {
                if ( !(conditionRegex instanceof StcForeign
                    && conditionRegex.purpose === "regex") )
                    throw new Error();
                if ( !(bodyRegex instanceof StcForeign
                    && bodyRegex.purpose === "regex") )
                    throw new Error();
                
                return new StcForeign( "regex", function () {
                    var cCompiled = compileRegex( conditionRegex );
                    var bCompiled = compileRegex( bodyRegex );
                    var cOpt = cCompiled.optional;
                    var bOpt = bCompiled.optional;
                    var cNec = cCompiled.necessary;
                    var bNec = bCompiled.necessary;
                    
                    return {
                        optional:
                            cNec === null ? null :
                            cOpt === null ? null :
                            bNec === null ? null :
                            bOpt === null ? null :
                            function ( next ) {
                                return "(?:" + cNec + bNec + ")*(?:" +
                                    "(?!" + cNec + ")(?:" +
                                        
                                        // We may run out of room matching the condition.
                                        cOpt( "" ) + "|" +
                                        
                                        // We may have a complete match.
                                        next +
                                    ")|" +
                                    
                                    // We may run out of room matching the body.
                                    cNec + "(?!" + bNec + ")" + bOpt( "" ) +
                                ")";
                            },
                        necessary:
                            cNec === null ? null :
                            bNec === null ? null :
                            "(?:" + cNec + bNec + ")*" +
                            "(?!" + cNec + ")",
                        makeFunc: function () {
                            var cFunc = cCompiled.makeFunc();
                            var bFunc = bCompiled.makeFunc();
                            
                            return function ( string, start, stop ) {
                                var thisStart = start;
                                var encounteredEmpty = false;
                                while ( true ) {
                                    var cResult = cFunc( string, thisStart, stop );
                                    if ( cResult.type === "failed" )
                                        return { type: "matched", stop: thisStart };
                                    else if ( cResult.type === "passedEnd" )
                                        return cResult;
                                    
                                    if ( encounteredEmpty )
                                        return { type: "failed" };
                                    
                                    var bResult = bFunc( string, cResult.stop, stop );
                                    if ( bResult.type !== "matched" )
                                        return bResult;
                                    
                                    if ( thisStart === bResult.stop )
                                        encounteredEmpty = true;
                                    
                                    thisStart = bResult.stop;
                                }
                            };
                        }
                    };
                } );
            } );
        } );
        
        fun( "regex-until", function ( rt, bodyRegex ) {
            return stcFnPure( function ( rt, conditionRegex ) {
                if ( !(bodyRegex instanceof StcForeign
                    && bodyRegex.purpose === "regex") )
                    throw new Error();
                if ( !(conditionRegex instanceof StcForeign
                    && conditionRegex.purpose === "regex") )
                    throw new Error();
                
                return new StcForeign( "regex", function () {
                    var bCompiled = compileRegex( bodyRegex );
                    var cCompiled = compileRegex( conditionRegex );
                    var bOpt = bCompiled.optional;
                    var cOpt = cCompiled.optional;
                    var bNec = bCompiled.necessary;
                    var cNec = cCompiled.necessary;
                    
                    return {
                        optional:
                            bNec === null ? null :
                            bOpt === null ? null :
                            cNec === null ? null :
                            cOpt === null ? null :
                            function ( next ) {
                                return "(?:" +
                                    "(?!" + cOpt( "" ) + ")" + bNec +
                                ")*(?:" +
                                    "(?!" + cNec + ")(?:" +
                                        
                                        // We may run out of room matching the condition.
                                        cOpt( "" ) + "|" +
                                        
                                        // We may run out of room matching the body.
                                        "(?!" + bNec + ")" + bOpt( "" ) +
                                    ")|" +
                                    
                                    // We may have a complete match.
                                    cNec + next +
                                ")";
                            },
                        necessary:
                            bNec === null ? null :
                            cNec === null ? null :
                            "(?:(?!" + cNec + ")" + bNec + ")*" +
                            cNec,
                        makeFunc: function () {
                            var bFunc = bCompiled.makeFunc();
                            var cFunc = cCompiled.makeFunc();
                            
                            return function ( string, start, stop ) {
                                var thisStart = start;
                                var encounteredEmpty = false;
                                while ( true ) {
                                    var cResult = cFunc( string, thisStart, stop );
                                    if ( cResult.type !== "failed" )
                                        return cResult;
                                    
                                    if ( encounteredEmpty )
                                        return { type: "failed" };
                                    
                                    var bResult = bFunc( string, cResult.stop, stop );
                                    if ( bResult.type !== "matched" )
                                        return bResult;
                                    
                                    if ( thisStart === bResult.stop )
                                        encounteredEmpty = true;
                                    
                                    thisStart = bResult.stop;
                                }
                            };
                        }
                    };
                } );
            } );
        } );
        
        fun( "optimize-regex-later", function ( rt, regex ) {
            return stcFnPure( function ( rt, then ) {
                if ( !(regex instanceof StcForeign
                    && regex.purpose === "regex") )
                    throw new Error();
                var compiled = compileRegex( regex ).makeFunc();
                
                return callStcLater( rt, then,
                    new StcForeign( "optimized-regex", compiled ) );
            } );
        } );
        
        fun( "optimized-regex-match-later",
            function ( rt, optimizedRegex ) {
            
            return stcFnPure( function ( rt, string ) {
                return stcFnPure( function ( rt, start ) {
                    return stcFnPure( function ( rt, stop ) {
                        return stcFnPure( function ( rt, then ) {
                            
                            if ( !(optimizedRegex instanceof
                                    StcForeign
                                && optimizedRegex.purpose ===
                                    "optimized-regex") )
                                throw new Error();
                            var regexFunc = optimizedRegex.foreignVal;
                            
                            var stringInternal =
                                parseString( string ).paddedStr;
                            
                            if ( !(start instanceof StcForeign
                                && start.purpose === "int") )
                                throw new Error();
                            var startI = start.foreignVal;
                            
                            if ( !(stop instanceof StcForeign
                                && stop.purpose === "int") )
                                throw new Error();
                            var stopI = stop.foreignVal;
                            
                            if ( !(0 <= startI
                                && startI <= stopI
                                && stopI * 2 <=
                                    stringInternal.length) )
                                throw new Error();
                            
                            var funcResult = regexFunc(
                                stringInternal, startI, stopI );
                            
                            if ( funcResult.type === "matched" )
                                var result =
                                    stcRegexResultMatched.ofNow( stcForeignInt( funcResult.stop ) );
                            else if ( funcResult.type === "failed" )
                                var result =
                                    stcRegexResultFailed.ofNow();
                            else if (
                                funcResult.type === "passedEnd" )
                                var result =
                                    stcRegexResultPassedEnd.ofNow();
                            else
                                throw new Error();
                            
                            return callStcLater( rt, then, result );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "make-tuple-tag", function ( rt, mainTagName ) {
            return stcFnPure( function ( rt, projNames ) {
                if ( !(mainTagName instanceof StcForeign
                    && mainTagName.purpose === "name") )
                    throw new Error();
                var projStringyNames = mapConsListToArr( projNames,
                    function ( projName ) {
                        if ( !(projName instanceof StcForeign
                            && projName.purpose === "name") )
                            throw new Error();
                        return projName.foreignVal;
                    } );
                return new StcForeign( "name",
                    stcNameTupleTagAlreadySorted(
                        mainTagName.foreignVal,
                        projStringyNames.sort( function ( a, b ) {
                            return nameCompare( a, b );
                        } ) ) );
            } );
        } );
        
        // NOTE: This is the only way to establish a function behavior
        // for a struct that has more than zero projections.
        fun( "function-implementation-opaque", function ( rt, impl ) {
            return new StcForeign( "native-definition",
                function ( rt, funcVal, argVal ) {
                
                return callStcMulti( rt, impl, funcVal, argVal );
            } );
        } );
        
        fun( "macro-stx-details", function ( rt, mode ) {
            return stcFnPure( function ( rt, uniqueNs ) {
                return stcFnPure( function ( rt, definitionNs ) {
                    return stcFnPure( function ( rt, stx ) {
                        return stcTrivialStxDetails();
                    } );
                } );
            } );
        } );
        
        fun( "contributing-only-to", function ( rt, ns ) {
            return stcFnPure( function ( rt, effects ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(effects instanceof StcForeign
                    && effects.purpose === "effects") )
                    throw new Error();
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    collectDefer( rawMode, {
                        contributingOnlyTo: stcNameSetIntersection(
                            rawMode.contributingOnlyTo,
                            stcNameSetNsDescendants(
                                ns.foreignVal ) )
                    }, function ( rawMode ) {
                        return macLookupRet( effects );
                    } );
                    return macLookupRet( stcNil.ofNow() );
                } );
            } );
        } );
        
        fun( "procure-sub-ns-table", function ( rt, table ) {
            return new StcFn( function ( rt, ns ) {
                if ( !(table instanceof StcForeign
                    && table.purpose === "table") )
                    throw new Error();
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return macLookupRet(
                    new StcForeign( "table",
                        table.foreignVal.map( function ( v, k ) {
                            return new StcForeign( "ns",
                                stcNsGet( k, ns.foreignVal ) );
                        } ) ) );
            } );
        } );
        
        fun( "shadow-procure-sub-ns-table", function ( rt, table ) {
            return new StcFn( function ( rt, ns ) {
                if ( !(table instanceof StcForeign
                    && table.purpose === "table") )
                    throw new Error();
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                var result = ns.foreignVal;
                
                table.each( function ( k, subNs ) {
                    if ( !(subNs instanceof StcForeign
                        && subNs.purpose === "ns") )
                        throw new Error();
                    result =
                        stcNsShadow( k, subNs.foreignVal, result );
                } );
                
                return macLookupRet( new StcForeign( "ns", result ) );
            } );
        } );
        
        fun( "procure-name", function ( rt, mode ) {
            return stcFnPure( function ( rt, ns ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                assertMode( rawModeSupportsName( ns.foreignVal ),
                    mode );
                
                return new StcForeign( "name", ns.foreignVal.name );
            } );
        } );
        
        function getdef( definer, err ) {
            return stcGetdef.ofNow(
                new StcFn( function ( rt, mode ) {
                    assertMode(
                        rawModeSupportsObserveDefiner( definer ),
                        mode );
                    return macLookupGet( definer, err );
                } ),
                new StcForeign( "definer", definer ) );
        }
        
        fun( "procure-contributed-element-getdef",
            function ( rt, ns ) {
            
            return new StcFn( function ( rt, key ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(key instanceof StcForeign
                    && key.purpose === "name") )
                    throw new Error();
                
                return macLookupRet(
                    getdef( {
                        type: "contributedElement",
                        namespace: ns.foreignVal,
                        name: key.foreignVal
                    }, function () {
                        throw new Error(
                            "No such defined value: " +
                            ns.pretty() + " element " +
                            key.pretty() );
                    } ) );
            } );
        } );
        
        fun( "procure-contribute-listener", function ( rt, ns ) {
            return stcFnPure( function ( rt, key ) {
                return new StcFn( function ( rt, listener ) {
                    if ( !(ns instanceof StcForeign
                        && ns.purpose === "ns") )
                        throw new Error();
                    if ( !(key instanceof StcForeign
                        && key.purpose === "name") )
                        throw new Error();
                    
                    return macLookupRet(
                        new StcForeign( "effects",
                            function ( rawMode ) {
                        
                        collectPutListener( rawMode,
                            ns.foreignVal, key.foreignVal, listener );
                        return macLookupRet( stcNil.ofNow() );
                    } ) );
                } );
            } );
        } );
        
        fun( "procure-contributed-elements", function ( rt, mode ) {
            return new StcFn( function ( rt, ns ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                assertMode(
                    rawModeSupportsObserveContributedElements(
                        ns.foreignVal ),
                    mode );
                
                return macLookupProcureContributedElements(
                    ns.foreignVal,
                    function () {
                        throw new Error(
                            "No such defined value: " +
                            JSON.stringify( ns.foreignVal.name ) );
                    } );
            } );
        } );
        
        fun( "procure-constructor-glossary-getdef",
            function ( rt, ns ) {
            
            return stcFnPure( function ( rt, sourceMainTagName ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(sourceMainTagName instanceof StcForeign
                    && sourceMainTagName.purpose === "name") )
                    throw new Error();
                
                return getdef(
                    getConstructorGlossaryDefiner( ns.foreignVal,
                        sourceMainTagName.foreignVal ),
                    function () {
                        throw new Error(
                            "No such constructor: " +
                            ns.pretty() + " constructor " +
                            macroName.pretty() );
                    } );
            } );
        } );
        
        fun( "procure-macro-implementation-getdef",
            function ( rt, ns ) {
            
            return stcFnPure( function ( rt, macroName ) {
                if ( !(ns instanceof StcForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(macroName instanceof StcForeign
                    && macroName.purpose === "name") )
                    throw new Error();
                
                return getdef(
                    getMacroFunctionDefiner( ns.foreignVal,
                        macroName.foreignVal ),
                    function () {
                        throw new Error(
                            "No such macro: " + ns.pretty() + " " +
                            "macro " + macroName.pretty() );
                    } );
            } );
        } );
        
        fun( "no-effects", function ( rt, ignored ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupRet( stcNil.ofNow() );
            } );
        } );
        
        fun( "join-effects", function ( rt, a ) {
            return stcFnPure( function ( rt, b ) {
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
        
        fun( "later", function ( rt, effects ) {
            if ( !(effects instanceof StcForeign
                && effects.purpose === "effects") )
                throw new Error();
            
            return new StcForeign( "effects", function ( rawMode ) {
                collectDefer( rawMode, {}, function ( rawMode ) {
                    return macLookupRet( effects );
                } );
                return macLookupRet( stcNil.ofNow() );
            } );
        } );
        
        fun( "make-promise-later", function ( rt, then ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return runEffects( rawMode,
                    callStcLater( rt, then,
                        getdef( {
                            type: "object",
                            visited: false,
                            unitTestId: rawMode.unitTestId,
                            value: null
                        }, function () {
                            throw new Error(
                                "Never fulfilled a promise" );
                        } ) ) );
            } );
        } );
        
        fun( "definer-define", function ( rt, definer ) {
            return stcFnPure( function ( rt, value ) {
                if ( !(definer instanceof StcForeign
                    && definer.purpose === "definer") )
                    throw new Error();
                
                return new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    collectPutDefined( rawMode, definer.foreignVal,
                        value );
                    return macLookupRet( stcNil.ofNow() );
                } );
            } );
        } );
        
        fun( "assert-current-mode", function ( rt, mode ) {
            if ( !(mode instanceof StcForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current) )
                throw new Error();
            return stcNil.ofNow();
        } );
        
        fun( "compile-expression", function ( rt, uniqueNs ) {
            return stcFnPure( function ( rt, definitionNs ) {
                return stcFnPure( function ( rt, stx ) {
                    return stcFnPure( function ( rt, outDefiner ) {
                        if ( !(uniqueNs instanceof StcForeign
                            && uniqueNs.purpose === "ns") )
                            throw new Error();
                        
                        if ( !(definitionNs instanceof StcForeign
                            && definitionNs.purpose === "ns") )
                            throw new Error();
                        
                        if ( !(outDefiner instanceof StcForeign
                            && outDefiner.purpose === "definer") )
                            throw new Error();
                        
                        return new StcForeign( "effects",
                            function ( rawMode ) {
                            
                            return macroexpandToDefiner( {
                                definitionNs: definitionNs.foreignVal,
                                uniqueNs: uniqueNs.foreignVal
                            }, rawMode, stx, outDefiner.foreignVal );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "get-mode", function ( rt, body ) {
            return new StcForeign( "effects", function ( rawMode ) {
                return macLookupThenRunEffects( rawMode,
                    body.callStc( rt,
                        new StcForeign( "mode", rawMode ) ) );
            } );
        } );
        
        fun( "read-all-force", function ( rt, string ) {
            return stcArrayToConsList( arrMap(
                readAll( parseString( string ).jsStr ),
                function ( tryExpr ) {
                
                if ( !tryExpr.ok )
                    throw new Error( tryExpr.msg );
                
                return readerExprToStc(
                    stcTrivialStxDetails(), tryExpr.val );
            } ) );
        } );
        
        commitDummyMode( namespaceDefs, dummyMode );
    }
    
    function macroexpandToDefiner(
        nss, rawMode, locatedExpr, outDefiner ) {
        
        // #GEN
        collectDefer( rawMode, {}, function ( rawMode ) {
            var identifier = stxToMaybeName( locatedExpr );
            if ( identifier !== null )
                return macLookupRet( new StcForeign( "effects",
                    function ( rawMode ) {
                    
                    // TODO: Report better errors if an unbound local
                    // variable is used. Currently, we just generate
                    // the JavaScript code for the variable anyway.
                    collectPutDefined( rawMode, outDefiner,
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
            var macroAppearance = stxToObtainMethod( macroNameStx );
            if ( macroAppearance.type === "obtainInvalid" )
                throw new Error();
            
            return macLookupThen(
                macroAppearance.type === "obtainByName" ?
                    macLookupGet(
                        getMacroFunctionDefiner( nss.definitionNs,
                            macroAppearance.name ),
                        function () {
                            throw new Error(
                                "No such macro: " +
                                JSON.stringify(
                                    macroAppearance.name ) );
                        } ) :
                macroAppearance.type === "obtainDirectly" ?
                    macLookupRet( macroAppearance.val ) :
                    (function () {
                        throw new Error();
                    })(),
                function ( macroFunction ) {
            
            return callStcMulti( rt, macroFunction,
                new StcForeign( "ns", nss.uniqueNs ),
                new StcForeign( "ns", nss.definitionNs ),
                stcTrivialStxDetails(),
                stcCons.getProj( sExpr, "cdr" ),
                stcFnPure( function ( rt, macroResult ) {
                    return new StcForeign( "effects",
                        function ( rawMode ) {
                        
                        collectPutDefined( rawMode, outDefiner,
                            macroResult );
                        return macLookupRet( stcNil.ofNow() );
                    } );
                } ) );
            
            } );
        } );
        
        return macLookupRet( stcNil.ofNow() );
    }
    
    function macroexpand( nss, rawMode, locatedExpr, outNs, then ) {
        var definer = elementDefiner( "val", outNs );
        
        collectDefer( rawMode, {}, function ( rawMode ) {
            return macLookupThen(
                macLookupGet( definer, function () {
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
        
        return macroexpandToDefiner( nss, rawMode, locatedExpr,
            definer );
    }
    
    function processDefStruct( definitionNs, rawMode,
        sourceMainTagName, repMainTagName, projSourceToRep ) {
        
        var n = projSourceToRep.length;
        var type = stcTypeArr( repMainTagName, projSourceToRep );
        collectPutDefined( rawMode,
            getConstructorGlossaryDefiner( definitionNs,
                sourceMainTagName ),
            stcConstructorGlossary.ofNow(
                new StcForeign( "name", repMainTagName ),
                stcArrayToConsList( arrMap( type.unsortedProjNames,
                    function ( entry ) {
                    
                    return stcAssoc.ofNow(
                        new StcForeign( "name", entry.source ),
                        new StcForeign( "name", entry.rep ) );
                } ) ) ) );
        // TODO: Make this expand multiple subexpressions
        // concurrently.
        stcAddPureMacro( definitionNs, rawMode, sourceMainTagName,
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
                        JSON.stringify( sourceMainTagName ) );
                
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
    
    function processCoreTypes( namespaceDefs, definitionNs ) {
        
        var dummyMode = makeDummyMode();
        
        arrEach( builtInCoreTypesToAdd, function ( entry ) {
            processDefStruct( definitionNs, dummyMode,
                entry.sourceMainTagName, entry.repMainTagName,
                entry.projSourceToRep );
        } );
        
        commitDummyMode( namespaceDefs, dummyMode );
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
                    stcForeignStrFromJs(
                        readerStringNilToString( readerExpr ) ) ) );
        } else if ( readerExpr.type === "stringCons" ) {
            return stcStx.ofNow( myStxDetails,
                stcIstringCons.ofNow(
                    stcForeignStrFromJs(
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
    
    function runTopLevelTryExprsSync( namespaceDefs, nss, tryExprs ) {
        runTopLevelMacLookupsSync( namespaceDefs, rt,
            topLevelTryExprsToMacLookupThreads( nss, tryExprs ) );
    }
    
    return {
        rt: rt,
        stcAddCoreMacros: stcAddCoreMacros,
        processCoreTypes: processCoreTypes,
        topLevelTryExprsToMacLookupThreads:
            topLevelTryExprsToMacLookupThreads,
        runTopLevelTryExprsSync: runTopLevelTryExprsSync,
        
        // NOTE: These are only needed for era-cene-api.js.
        getType: getType,
        processDefStruct: processDefStruct,
        stcArrayToConsList: stcArrayToConsList,
        makeDummyMode: makeDummyMode,
        commitDummyMode: commitDummyMode
    };
}
