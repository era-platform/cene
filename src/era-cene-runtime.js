// era-cene-runtime.js
// Copyright 2015, 2016 Ross Angle. Released under the MIT License.
//
// This file implements the main Cene runtime and built-in operators.


// NOTE: We've tagged code with "#GEN" if it's part of the JavaScript
// compilation target.
//
// TODO: It would be nice to update the JavaScript FFI so that it's
// not repeatedly evaluating JavaScript code strings at run time. We
// can do this by having the JavaScript code strings executed at
// load time instead, but that means some of our generated code needs
// to have metadata saying what its load-time dependencies are. Let's
// use `JsCode#asStatic()` for this.
//
// TODO: At some point we may want more than one compilation target,
// even without leaving JavaScript: For instance, the asynchronous
// `macLookupThen`/`macLookupRet` target we have now, a synchronous
// target, and a target specialized for continuous reactive
// programming. Unfortunately, if we do want all these targets, we may
// need to offer multiple implementations of each builtin as well, and
// that'll easily become difficult to maintain. See if there's
// anything we can do to prepare for these.


function cgenIdentifier( identifier ) {
    // #GEN
    return "_cgen_" +
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
function jsCodeRetCgenVar( identifier ) {
    // #GEN
    return jsCode( jsCodeVar( "macLookupRet" ), "( ",
        jsCodeVar( cgenIdentifier( identifier ) ), " )" );
}


function cgenCallArr( func, argsArr ) {
    var result = func;
    arrEach( argsArr, function ( arg ) {
        result = new CexprCall( result, arg );
    } );
    return result;
}

function cgenCall( func, var_args ) {
    return cgenCallArr( func, [].slice.call( arguments, 1 ) );
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

function makeFlatTag( mainTagName, sortedProjNames ) {
    return JSON.stringify( [ mainTagName, sortedProjNames ] );
}
function cgenStructArr( repMainTagName, projSourceToRep ) {
    var sortedProjNames = arrMap( projSourceToRep,
        function ( entry, i ) {
        
        return { i: i, source: entry.source, rep: entry.rep };
    } ).sort( function ( a, b ) {
        return nameCompare( a.rep, b.rep );
    } );
    var repProjNamesToSortedIndices = jsnMap();
    var sourceProjNameStringsToRepSortedIndices = strMap();
    arrEach( sortedProjNames, function ( entry, i ) {
        var source = projSourceToRep[ entry.i ].source;
        
        repProjNamesToSortedIndices.set( entry.rep, i );
        
        var stringIndex = projOccCompared < 0 ? 2 : 3;
        if ( isArray( source )
            && source[ 0 ] === "n:$$qualified-name"
            && isArray( source[ 1 ] )
            && source[ 1 ][ 0 ] === "n:struct"
            && source[ 1 ][ 1 ] === projOccFlatTag
            && isPrimString( source[ 1 ][ stringIndex ] ) )
            sourceProjNameStringsToRepSortedIndices.set(
                source[ 1 ][ stringIndex ], i );
    } );
    var unsortedProjNames = arrMap( projSourceToRep,
        function ( entry, i ) {
        
        return {
            i: repProjNamesToSortedIndices.get( entry.rep ),
            source: entry.source,
            rep: entry.rep
        };
    } );
    var flatTag = makeFlatTag( repMainTagName,
        arrMap( sortedProjNames, function ( entry ) {
            return entry.rep;
        } ) );
    var n = projSourceToRep.length;
    
    var result = {};
    result.repMainTagName = repMainTagName;
    result.unsortedProjNames = unsortedProjNames;
    result.sortedProjNames = sortedProjNames;
    result.getFlatTag = function () {
        return flatTag;
    };
    result.tags = function ( x ) {
        return x instanceof SinkStruct && x.flatTag === flatTag;
    };
    result.getProj = function ( x, sourceProjName ) {
        if ( !(x instanceof SinkStruct && x.flatTag === flatTag) )
            throw new Error();
        var i = sourceProjNameStringsToRepSortedIndices.get(
            sourceProjName );
        if ( i === void 0 )
            throw new Error();
        return x.projVals[ i ];
    };
    result.ofArr = function ( args ) {
        if ( args.length !== n )
            throw new Error();
        
        return new CexprConstruct( repMainTagName,
            arrMap( sortedProjNames, function ( entry, i ) {
                return { name: entry.rep, expr: args[ entry.i ] };
            } ) );
    };
    result.of = function ( var_args ) {
        return this.ofArr( [].slice.call( arguments, 0 ) );
    };
    result.ofArrNow = function ( args ) {
        if ( args.length !== n )
            throw new Error();
        
        return new SinkStruct( flatTag,
            arrMap( sortedProjNames, function ( entry ) {
                return args[ entry.i ];
            } ) );
    };
    result.ofNow = function ( var_args ) {
        return this.ofArrNow( [].slice.call( arguments, 0 ) );
    };
    return result;
}

function sinkNsRoot() {
    return { name: [ "n:root" ] };
}
function sinkNameGet( stringOrName, parent ) {
    
    // TODO: Determine a good value for this.
    var maxRepetitions = 1000;
    
    return (parent[ 0 ] === "n:get"
        && parent[ 2 ] + 1 <= maxRepetitions
        && nameCompare( parent[ 1 ], stringOrName ) === 0) ?
        [ "n:get", stringOrName, parent[ 2 ] + 1, parent[ 3 ] ] :
        [ "n:get", stringOrName, 1, parent ];
}
function sinkNsGet( stringOrName, ns ) {
    return { name: sinkNameGet( stringOrName, ns.name ) };
}
function sinkNameConstructorTagAlreadySorted(
    mainTagName, projNames ) {
    
    var projTable = jsnMap();
    arrEach( projNames, function ( name ) {
        projTable.set( name, mkNil.ofNow() );
    } );
    return mkConstructorTag.ofNow(
        new SinkForeign( "name", mainTagName ),
        new SinkForeign( "table", projTable ) ).getName();
}
function sinkNameIsAncestor( ancestor, descendant ) {
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
        uniqueNs: sinkNsGet( stringOrName, nss.uniqueNs ),
        definitionNs: nss.definitionNs,
        qualify: nss.qualify
    };
}

function sinkNameSetEmpty() {
    return function ( name ) {
        return false;
    };
}
function sinkNameSetAll() {
    return function ( name ) {
        return true;
    };
}
function sinkNameSetUnion( a, b ) {
    return function ( name ) {
        return a( name ) || b( name );
    };
}
function sinkNameSetIntersection( a, b ) {
    return function ( name ) {
        return a( name ) && b( name );
    };
}
function sinkNameSetNot( nameSet ) {
    return function ( name ) {
        return !nameSet( name );
    };
}
function sinkNameSetNsDescendants( ns ) {
    return function ( name ) {
        return sinkNameIsAncestor( ns.name, name );
    };
}
function sinkNameSetContains( nameSet, name ) {
    return nameSet( name );
}

function sinkForeignInt( n ) {
    if ( n !== n || n + 1 === n || n - 1 === n )
        throw new Error();
    // We convert negative zero to positive zero.
    return new SinkForeign( "int", n === -0 ? 0 : n );
}

function sinkForeignStrFromJs( jsStr ) {
    return new SinkForeign( "string", {
        jsStr: jsStr,
        paddedStr: jsStr.replace( /[^\uD800-\uDE00]/g, "\x00$&" )
    } );
}
function sinkForeignStrFromPadded( paddedStr ) {
    return new SinkForeign( "string", {
        // NOTE: We use [\d\D] to match any character, even newlines.
        jsStr: paddedStr.replace( /\x00([\d\D])/g, '$1' ),
        paddedStr: paddedStr
    } );
}

var sinkForeignEffectsNil = new SinkForeign( "effects",
    function ( rawMode ) {
    
    return macLookupRet( mkNil.ofNow() );
} );

function macLookupRet( result ) {
    return { type: "ret", val: result };
}
function macLookupGet( definer, err ) {
    return { type: "get", definer: definer, err: err };
}
function macLookupFollowHeart( clamor ) {
    // NOTE: We could do this monadically like the rest of the
    // `macLookup...` operations -- and we're going to want to if we
    // want to support multiple `follow-heart` behaviors in a single
    // Cene language implementation -- but if we process the errors
    // here, we get somewhat better JavaScript stack traces.
    
    function unknownClamor() {
        throw new Error(
            "Can't follow my heart to an unknown clamor: " +
            clamor.pretty() );
    }
    
    if ( !mkClamorErr.tags( clamor ) )
        unknownClamor();
    var message = mkClamorErr.getProj( clamor, "message" );
    if ( !(message instanceof SinkForeign
        && message.purpose === "string") )
        unknownClamor();
    throw new Error( message.foreignVal.jsStr );
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


function prettifyFlatTag( flatTag ) {
    var parsed = JSON.parse( flatTag );
    var mainTagName = parsed[ 0 ];
    if ( mainTagName[ 0 ] === "n:main-core" )
        return mainTagName[ 1 ];
    else if ( mainTagName[ 0 ] === "n:main"
        && mainTagName[ 1 ][ 0 ] === "n:$$qualified-name" )
        return mainTagName[ 1 ][ 1 ];
    return flatTag;
}

function getFunctionImplementationEntryDefinerByFlatTag(
    funcDefNs, flatTag ) {
    
    var parsedTag = JSON.parse( flatTag );
    return getFunctionImplementationEntryDefiner( funcDefNs,
        sinkNameConstructorTagAlreadySorted(
            parsedTag[ 0 ], parsedTag[ 1 ] ) );
}

function getFunctionImplementationByFlatTag(
    funcDefNs, flatTag, then ) {
    
    return macLookupThen(
        macLookupGet(
            getFunctionImplementationEntryDefinerByFlatTag( funcDefNs,
                flatTag ),
            function () {
                throw new Error(
                    "No such function definition: " + flatTag );
            } ),
        function ( def ) {
        
        if ( !(def instanceof SinkForeign
            && def.purpose === "native-definition") )
            throw new Error();
        
        return then( def.foreignVal );
    } );
}

function getFunctionImplementationCexprByFlatTag(
    namespaceDefs, funcDefNs, flatTag ) {
    
    var visitable =
        definerToVisitable( namespaceDefs,
            getFunctionImplementationEntryDefinerByFlatTag( funcDefNs,
                flatTag ) );
    if ( visitable.dexAndValue === null )
        return null;
    var def = visitable.dexAndValue.value;
    
    if ( !(def instanceof SinkForeign
        && def.purpose === "native-definition") )
        throw new Error();
    
    return def.foreignVal.cexpr;
}

function SinkStruct( flatTag, opt_projVals ) {
    this.flatTag = flatTag;
    this.projVals = opt_projVals || [];
}
SinkStruct.prototype.affiliation = "none";
SinkStruct.prototype.callSink = function ( rt, arg ) {
    var self = this;
    
    // OPTIMIZATION: It would be ludicrous to run `JSON.parse()` on
    // every single function call, so we do an early check to see if
    // we already have access to the definition we would have blocked
    // on.
    var func = rt.functionDefs[ self.flatTag ];
    if ( func !== void 0 )
        return func( rt, self, arg );
    
    return getFunctionImplementationByFlatTag( rt.funcDefNs,
        self.flatTag,
        function ( def ) {
        
        var func = def.func;
        rt.functionDefs[ self.flatTag ] = func;
        return func( rt, self, arg );
    } );
};
SinkStruct.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkStruct.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkStruct.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkStruct.prototype.getName = function () {
    return [ "n:struct", this.flatTag ].concat(
        arrMap( this.projVals, function ( projVal ) {
            return projVal.getName();
        } ) );
};
SinkStruct.prototype.pretty = function () {
    return "(" + prettifyFlatTag( this.flatTag ) +
        arrMap( this.projVals, function ( projVal ) {
            return " " + projVal.pretty();
        } ).join( "" ) + ")";
};
function SinkFn( func ) {
    this.func = func;
}
SinkFn.prototype.affiliation = "none";
SinkFn.prototype.callSink = function ( rt, arg ) {
    var func = this.func;
    return func( rt, arg );
};
SinkFn.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFn.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFn.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkFn.prototype.getName = function () {
    throw new Error();
};
SinkFn.prototype.pretty = function () {
    return "(fn)";
};
function SinkForeign( purpose, foreignVal ) {
    this.purpose = purpose;
    this.foreignVal = foreignVal;
}
SinkForeign.prototype.affiliation = "none";
SinkForeign.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkForeign.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkForeign.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkForeign.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkForeign.prototype.getName = function () {
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
            "on a SinkForeign that didn't support it" );
    }
};
SinkForeign.prototype.pretty = function () {
    return this.purpose === "string" ?
        JSON.stringify( this.foreignVal.jsStr ) :
        "(foreign " + this.purpose + " " +
            JSON.stringify( this.foreignVal ) + ")";
};
function SinkClineByDex( dexToUse ) {
    if ( dexToUse.affiliation !== "dex" )
        throw new Error();
    this.dexToUse = dexToUse;
}
SinkClineByDex.prototype.affiliation = "cline";
SinkClineByDex.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineByDex.prototype.dexHas = function ( rt, x ) {
    return this.dexToUse.dexHas( rt, x );
};
SinkClineByDex.prototype.callCline = function ( rt, a, b ) {
    var self = this;
    
    return rt.dexHas( self.dexToUse, a, function ( hasA ) {
        if ( !hasA )
            return macLookupRet( mkNil.ofNow() );
    
    return rt.dexHas( self.dexToUse, b, function ( hasB ) {
        if ( !hasB )
            return macLookupRet( mkNil.ofNow() );
    
    var result = nameCompare( a.getName(), b.getName() );
    if ( result < 0 )
        return macLookupRet(
            mkYep.ofNow( new SinkForeign( "lt", null ) ) );
    if ( 0 < result )
        return macLookupRet(
            mkYep.ofNow( new SinkForeign( "gt", null ) ) );
    
    return macLookupRet( mkYep.ofNow( mkNil.ofNow() ) );
    
    } );
    
    } );
};
SinkClineByDex.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineByDex.prototype.getName = function () {
    return [ "n:cline-by-dex", this.dexToUse.getName() ];
};
SinkClineByDex.prototype.pretty = function () {
    return "(cline-by-dex " + this.dexToUse.pretty() + ")";
};
function SinkClineDefault( first, second ) {
    if ( !(first.affiliation === "cline"
        && second.affiliation === "cline") )
        throw new Error();
    this.first = first;
    this.second = second;
}
SinkClineDefault.prototype.affiliation = "cline";
SinkClineDefault.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineDefault.prototype.dexHas = function ( rt, x ) {
    var self = this;
    
    return macLookupThen( self.first.dexHas( rt, x ),
        function ( firstResult ) {
    
    if ( rt.toBoolean( firstResult ) )
        return macLookupRet( firstResult );
    
    return self.second.dexHas( rt, x );
    
    } );
};
SinkClineDefault.prototype.callCline = function ( rt, a, b ) {
    var self = this;
    
    return macLookupThen( self.first.callCline( rt, a, b ),
        function ( firstResult ) {
    
    if ( !mkYep.tags( firstResult )
        || !mkNil.tags( mkYep.getProj( firstResult, "yep" ) ) )
        return macLookupRet( firstResult );
    
    return self.second.callCline( rt, a, b );
    
    } );
};
SinkClineDefault.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineDefault.prototype.getName = function () {
    return [ "n:cline-default",
        this.first.getName(), this.second.getName() ];
};
SinkClineDefault.prototype.pretty = function () {
    return "(cline-default " +
        this.first.pretty() + " " + this.second.pretty() + ")";
};
function SinkClineGiveUp() {
    // We do nothing.
}
SinkClineGiveUp.prototype.affiliation = "cline";
SinkClineGiveUp.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineGiveUp.prototype.dexHas = function ( rt, x ) {
    return macLookupRet( mkNope.ofNow( mkNil.ofNow() ) );
};
SinkClineGiveUp.prototype.callCline = function ( rt, a, b ) {
    return macLookupRet( mkNil.ofNow() );
};
SinkClineGiveUp.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineGiveUp.prototype.getName = function () {
    return [ "n:cline-give-up" ];
};
SinkClineGiveUp.prototype.pretty = function () {
    return "(cline-give-up)";
};
function SinkDexByCline( clineToUse ) {
    if ( clineToUse.affiliation !== "cline" )
        throw new Error();
    this.clineToUse = clineToUse;
}
SinkDexByCline.prototype.affiliation = "dex";
SinkDexByCline.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexByCline.prototype.dexHas = function ( rt, x ) {
    return this.clineToUse.dexHas( rt, x );
};
SinkDexByCline.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexByCline.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexByCline.prototype.getName = function () {
    return [ "n:dex-by-cline", this.clineToUse.getName() ];
};
SinkDexByCline.prototype.pretty = function () {
    return "(dex-by-cline " + this.clineToUse.pretty() + ")";
};
function SinkClineStruct( expectedFlatTag, projClines ) {
    // NOTE: We originally avoided naming this field the same thing as
    // `flatTag` because we were doing some naive `x.flatTag === y`
    // checks. We might as well leave it this way to avoid confusion.
    this.expectedFlatTag = expectedFlatTag;
    this.projClines = projClines;
    
    arrEach( projClines, function ( projCline ) {
        if ( projCline.val.affiliation !== "cline" )
            throw new Error();
    } );
}
SinkClineStruct.prototype.affiliation = "cline";
SinkClineStruct.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineStruct.prototype.dexHas = function ( rt, x ) {
    var self = this;
    
    if ( !(x instanceof SinkStruct
        && x.flatTag === self.expectedFlatTag) )
        return macLookupRet( rt.fromBoolean( false ) );
    
    var n = self.projClines.length;
    return loop( 0 );
    function loop( i ) {
        if ( n <= i )
            return macLookupRet( rt.fromBoolean( true ) );
        var projCline = self.projClines[ i ];
        return macLookupThen(
            projCline.val.dexHas( rt, x.projVals[ projCline.i ] ),
            function ( result ) {
            
            if ( !rt.toBoolean( result ) )
                return macLookupRet( result );
            return loop( i + 1 );
        } );
    }
};
SinkClineStruct.prototype.callCline = function ( rt, a, b ) {
    var self = this;
    
    if ( !(a instanceof SinkStruct
        && a.flatTag === self.expectedFlatTag) )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkStruct
        && b.flatTag === self.expectedFlatTag) )
        return macLookupRet( mkNil.ofNow() );
    
    var n = self.projClines.length;
    return loop( 0 );
    function loop( i ) {
        if ( n <= i )
            return macLookupRet( mkYep.ofNow( mkNil.ofNow() ) );
        var projCline = self.projClines[ i ];
        return macLookupThen(
            projCline.val.callCline( rt,
                a.projVals[ projCline.i ],
                b.projVals[ projCline.i ] ),
            function ( result ) {
            
            if ( !mkYep.tags( result )
                || !mkNil.tags( mkYep.getProj( result, "yep" ) ) )
                return macLookupRet( result );
            return loop( i + 1 );
        } );
    }
};
SinkClineStruct.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineStruct.prototype.getName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ "n:cline-struct", JSON.parse( this.expectedFlatTag )
        ].concat( arrMap( this.projClines, function ( projCline ) {
            return [ projCline.i, projCline.val.getName() ];
        } ) );
};
SinkClineStruct.prototype.pretty = function () {
    return "(cline-struct " +
        prettifyFlatTag( this.expectedFlatTag ) + " " +
        arrMap( this.projClines, function ( projCline, i ) {
            return " " + projCline.i + ":" + projCline.val.pretty();
        } ).join( "" ) + ")";
};
function SinkDexCline() {
    // We do nothing.
}
SinkDexCline.prototype.affiliation = "dex";
SinkDexCline.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexCline.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean( x.affiliation === "cline" ) );
};
SinkDexCline.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexCline.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexCline.prototype.getName = function () {
    return [ "n:dex-cline" ];
};
SinkDexCline.prototype.pretty = function () {
    return "(dex-cline)";
};
function SinkDexDex() {
    // We do nothing.
}
SinkDexDex.prototype.affiliation = "dex";
SinkDexDex.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexDex.prototype.dexHas = function ( rt, x ) {
    return macLookupRet( rt.fromBoolean( x.affiliation === "dex" ) );
};
SinkDexDex.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexDex.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexDex.prototype.getName = function () {
    return [ "n:dex-dex" ];
};
SinkDexDex.prototype.pretty = function () {
    return "(dex-dex)";
};
function SinkDexMerge() {
    // We do nothing.
}
SinkDexMerge.prototype.affiliation = "dex";
SinkDexMerge.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexMerge.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean( x.affiliation === "merge" ) );
};
SinkDexMerge.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexMerge.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexMerge.prototype.getName = function () {
    return [ "n:dex-merge" ];
};
SinkDexMerge.prototype.pretty = function () {
    return "(dex-merge)";
};
function SinkDexFuse() {
    // We do nothing.
}
SinkDexFuse.prototype.affiliation = "dex";
SinkDexFuse.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexFuse.prototype.dexHas = function ( rt, x ) {
    return macLookupRet( rt.fromBoolean( x.affiliation === "fuse" ) );
};
SinkDexFuse.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexFuse.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexFuse.prototype.getName = function () {
    return [ "n:dex-fuse" ];
};
SinkDexFuse.prototype.pretty = function () {
    return "(dex-fuse)";
};
function SinkDexName() {
    // We do nothing.
}
SinkDexName.prototype.affiliation = "dex";
SinkDexName.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexName.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean(
            x instanceof SinkForeign && x.purpose === "name" ) );
};
SinkDexName.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexName.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexName.prototype.getName = function () {
    return [ "n:dex-name" ];
};
SinkDexName.prototype.pretty = function () {
    return "(dex-name)";
};
function SinkDexString() {
    // We do nothing.
}
SinkDexString.prototype.affiliation = "dex";
SinkDexString.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexString.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean(
            x instanceof SinkForeign && x.purpose === "string" ) );
};
SinkDexString.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexString.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexString.prototype.getName = function () {
    return [ "n:dex-string" ];
};
SinkDexString.prototype.pretty = function () {
    return "(dex-string)";
};
function SinkClineByOwnMethod( dexableGetMethod ) {
    this.dexableGetMethod = dexableGetMethod;
}
SinkClineByOwnMethod.prototype.affiliation = "cline";
SinkClineByOwnMethod.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineByOwnMethod.prototype.dexHas = function ( rt, x ) {
    return macLookupThen(
        mkDexable.getProj( this.dexableGetMethod, "val"
            ).callSink( rt, x ),
        function ( maybeOwnMethod ) {
    
    if ( mkNil.tags( maybeOwnMethod ) ) {
        return macLookupRet( rt.fromBoolean( false ) );
    } else if ( mkYep.tags( maybeOwnMethod ) ) {
        var method = mkYep.getProj( maybeOwnMethod, "val" );
        if ( method.affiliation !== "cline" )
            throw new Error();
        return method.dexHas( rt, x );
    } else {
        throw new Error();
    }
    
    } );
};
SinkClineByOwnMethod.prototype.callCline = function ( rt, a, b ) {
    var getMethod = mkDexable.getProj( this.dexableGetMethod, "val" );
    
    function getFrom( x, then ) {
        return macLookupThen( getMethod.callSink( rt, x ),
            function ( maybeOwnMethod ) {
            
            if ( mkNil.tags( maybeOwnMethod ) ) {
                return macLookupRet( mkNil.ofNow() );
            } else if ( mkYep.tags( maybeOwnMethod ) ) {
                var method = mkYep.getProj( maybeOwnMethod, "val" );
                if ( method.affiliation !== "cline" )
                    throw new Error();
                return then( method );
            } else {
                throw new Error();
            }
        } );
    }
    
    return getFrom( a, function ( methodA ) {
    return getFrom( b, function ( methodB ) {
    
    if ( nameCompare( methodA.getName(), methodB.getName() ) !== 0 )
        return macLookupRet( mkNil.ofNow() );
    
    return methodA.callCline( rt, a, b );
    
    } );
    } );
};
SinkClineByOwnMethod.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineByOwnMethod.prototype.getName = function () {
    return [ "n:cline-by-own-method",
        this.dexableGetMethod.getName() ];
};
SinkClineByOwnMethod.prototype.pretty = function () {
    return "(cline-by-own-method " +
        this.dexableGetMethod.pretty() + ")";
};
function SinkClineFix( dexableUnwrap ) {
    this.dexableUnwrap = dexableUnwrap;
}
SinkClineFix.prototype.affiliation = "cline";
SinkClineFix.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineFix.prototype.dexHas = function ( rt, x ) {
    return macLookupThen(
        mkDexable.getProj( this.dexableUnwrap, "val"
            ).callSink( rt, this ),
        function ( dex ) {
        
        if ( dex.affiliation !== "cline" )
            throw new Error();
        return dex.dexHas( rt, x );
    } );
};
SinkClineFix.prototype.callCline = function ( rt, a, b ) {
    return macLookupThen(
        mkDexable.getProj( this.dexableUnwrap, "val"
            ).callSink( rt, this ),
        function ( dex ) {
        
        if ( dex.affiliation !== "cline" )
            throw new Error();
        return dex.callCline( rt, a, b );
    } );
};
SinkClineFix.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineFix.prototype.getName = function () {
    return [ "n:cline-fix", this.dexableUnwrap.getName() ];
};
SinkClineFix.prototype.pretty = function () {
    return "(cline-fix " + this.dexableUnwrap.pretty() + ")";
};
function SinkDexTable( dexVal ) {
    this.dexVal = dexVal;
}
SinkDexTable.prototype.affiliation = "dex";
SinkDexTable.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkDexTable.prototype.dexHas = function ( rt, x ) {
    var self = this;
    
    if ( !(x instanceof SinkForeign && x.purpose === "table") )
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
SinkDexTable.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkDexTable.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkDexTable.prototype.getName = function () {
    return [ "n:dex-table", this.dexVal.getName() ];
};
SinkDexTable.prototype.pretty = function () {
    return "(dex-table " + this.dexVal.pretty() + ")";
};
function SinkClineInt() {
    // We do nothing.
}
SinkClineInt.prototype.affiliation = "cline";
SinkClineInt.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkClineInt.prototype.dexHas = function ( rt, x ) {
    return macLookupRet(
        rt.fromBoolean(
            x instanceof SinkForeign && x.purpose === "int" ) );
};
SinkClineInt.prototype.callCline = function ( rt, a, b ) {
    if ( !(a instanceof SinkForeign && a.purpose === "int") )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkForeign && b.purpose === "int") )
        return macLookupRet( mkNil.ofNow() );
    
    if ( a.foreignVal < b.foreignVal )
        return macLookupRet(
            mkYep.ofNow( mkYep.ofNow( mkNil.ofNow() ) ) );
    else if ( b.foreignVal < a.foreignVal )
        return macLookupRet(
            mkYep.ofNow( mkNope.ofNow( mkNil.ofNow() ) ) );
    else
        return macLookupRet( mkYep.ofNow( mkNil.ofNow() ) );
};
SinkClineInt.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkClineInt.prototype.getName = function () {
    return [ "n:cline-int" ];
};
SinkClineInt.prototype.pretty = function () {
    return "(cline-int)";
};
function SinkMergeByDex( dexToUse ) {
    if ( dexToUse.affiliation !== "dex" )
        throw new Error();
    this.dexToUse = dexToUse;
}
SinkMergeByDex.prototype.affiliation = "merge";
SinkMergeByDex.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkMergeByDex.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkMergeByDex.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkMergeByDex.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    return rt.dexHas( self.dexToUse, a, function ( hasA ) {
        if ( !hasA )
            return macLookupRet( mkNil.ofNow() );
    
    return rt.dexHas( self.dexToUse, b, function ( hasB ) {
        if ( !hasB )
            return macLookupRet( mkNil.ofNow() );
    
    return macLookupRet( mkYep.ofNow( a ) );
    
    } );
    
    } );
};
SinkMergeByDex.prototype.getName = function () {
    return [ "n:merge-by-dex", this.dexToUse.getName() ];
};
SinkMergeByDex.prototype.pretty = function () {
    return "(merge-by-dex " + this.dexToUse.pretty() + ")";
};
function SinkFuseByMerge( mergeToUse ) {
    if ( mergeToUse.affiliation !== "merge" )
        throw new Error();
    this.mergeToUse = mergeToUse;
}
SinkFuseByMerge.prototype.affiliation = "fuse";
SinkFuseByMerge.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseByMerge.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseByMerge.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseByMerge.prototype.fuse = function ( rt, a, b ) {
    return this.mergeToUse.fuse( rt, a, b );
};
SinkFuseByMerge.prototype.getName = function () {
    return [ "n:fuse-by-merge", this.mergeToUse.getName() ];
};
SinkFuseByMerge.prototype.pretty = function () {
    return "(fuse-by-merge " + this.mergeToUse.pretty() + ")";
};
function SinkFuseEffects() {
    // We do nothing.
}
SinkFuseEffects.prototype.affiliation = "fuse";
SinkFuseEffects.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseEffects.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseEffects.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseEffects.prototype.fuse = function ( rt, a, b ) {
    if ( !(a instanceof SinkForeign && a.purpose === "effects") )
        return macLookupRet( mkNil.ofNow() );
    var aFunc = a.foreignVal;
    if ( !(b instanceof SinkForeign && b.purpose === "effects") )
        return macLookupRet( mkNil.ofNow() );
    var bFunc = b.foreignVal;
    return macLookupRet(
        mkYep.ofNow(
            new SinkForeign( "effects", function ( rawMode ) {
                return macLookupThen( aFunc( rawMode ),
                    function ( ignored ) {
                    
                    return bFunc( rawMode );
                } );
            } ) ) );
};
SinkFuseEffects.prototype.getName = function () {
    return [ "n:fuse-effects" ];
};
SinkFuseEffects.prototype.pretty = function () {
    return "(fuse-effects)";
};
function SinkFuseIntByPlus() {
    // We do nothing.
}
SinkFuseIntByPlus.prototype.affiliation = "fuse";
SinkFuseIntByPlus.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseIntByPlus.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseIntByPlus.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseIntByPlus.prototype.fuse = function ( rt, a, b ) {
    if ( !(a instanceof SinkForeign && a.purpose === "int") )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkForeign && b.purpose === "int") )
        return macLookupRet( mkNil.ofNow() );
    return macLookupRet(
        mkYep.ofNow(
            sinkForeignInt( a.foreignVal + b.foreignVal ) ) );
};
SinkFuseIntByPlus.prototype.getName = function () {
    return [ "n:fuse-int-by-plus" ];
};
SinkFuseIntByPlus.prototype.pretty = function () {
    return "(fuse-int-by-plus)";
};
function SinkFuseIntByTimes() {
    // We do nothing.
}
SinkFuseIntByTimes.prototype.affiliation = "fuse";
SinkFuseIntByTimes.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseIntByTimes.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseIntByTimes.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseIntByTimes.prototype.fuse = function ( rt, a, b ) {
    if ( !(a instanceof SinkForeign && a.purpose === "int") )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkForeign && b.purpose === "int") )
        return macLookupRet( mkNil.ofNow() );
    return macLookupRet(
        mkYep.ofNow(
            sinkForeignInt( a.foreignVal * b.foreignVal ) ) );
};
SinkFuseIntByTimes.prototype.getName = function () {
    return [ "n:fuse-int-by-times" ];
};
SinkFuseIntByTimes.prototype.pretty = function () {
    return "(fuse-int-by-times)";
};
function SinkFuseNssetByUnion() {
    // We do nothing.
}
SinkFuseNssetByUnion.prototype.affiliation = "fuse";
SinkFuseNssetByUnion.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseNssetByUnion.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseNssetByUnion.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseNssetByUnion.prototype.fuse = function ( rt, a, b ) {
    if ( !(a instanceof SinkForeign && a.purpose === "nsset") )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkForeign && b.purpose === "nsset") )
        return macLookupRet( mkNil.ofNow() );
    return macLookupRet(
        mkYep.ofNow(
            new SinkForeign( "nsset",
                sinkNameSetUnion( a.foreignVal, b.foreignVal ) ) ) );
};
SinkFuseNssetByUnion.prototype.getName = function () {
    return [ "n:fuse-nsset-by-union" ];
};
SinkFuseNssetByUnion.prototype.pretty = function () {
    return "(fuse-nsset-by-union)";
};
function SinkFuseStruct(
    nameTag, prettyTag, affiliation, expectedFlatTag, projFuses ) {
    
    this.nameTag = nameTag;
    this.prettyTag = prettyTag;
    this.affiliation = affiliation;
    // NOTE: We originally avoided naming this field the same thing as
    // `flatTag` because we were doing some naive `x.flatTag === y`
    // checks. We might as well leave it this way to avoid confusion.
    this.expectedFlatTag = expectedFlatTag;
    this.projFuses = projFuses;
    
    arrEach( projFuses, function ( projFuse ) {
        if ( projFuse.val.affiliation !== affiliation )
            throw new Error();
    } );
}
SinkFuseStruct.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseStruct.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseStruct.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseStruct.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    if ( !(a instanceof SinkStruct
        && a.flatTag === self.expectedFlatTag) )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkStruct
        && b.flatTag === self.expectedFlatTag) )
        return macLookupRet( mkNil.ofNow() );
    
    var n = self.projFuses.length;
    return loop( 0, [] );
    function loop( i, fuseResults ) {
        if ( n <= i )
            return macLookupRet(
                mkYep.ofNow(
                    new SinkStruct( self.expectedFlatTag,
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
            
            if ( !mkYep.tags( fuseResult ) )
                return macLookupRet( mkNil.ofNow() );
            return loop( i + 1, fuseResults.concat( [ {
                i: projFuse.i,
                val: mkYep.getProj( fuseResult, "val" )
            } ] ) );
        } );
    }
};
SinkFuseStruct.prototype.getName = function () {
    // TODO: See if we can avoid this JSON.parse().
    return [ this.nameTag, JSON.parse( this.expectedFlatTag )
        ].concat( arrMap( this.projFuses, function ( projDex ) {
            return [ projDex.i, projDex.val.getName() ];
        } ) );
};
SinkFuseStruct.prototype.pretty = function () {
    return "(" + this.prettyTag + " " +
        prettifyFlatTag( this.expectedFlatTag ) +
        arrMap( this.projFuses, function ( projDex, i ) {
            return " " + projDex.i + ":" + projDex.val.pretty();
        } ).join( "" ) + ")";
};
function SinkFuseDefault(
    nameTag, prettyTag, affiliation, first, second ) {
    
    if ( first.affiliation !== affiliation )
        throw new Error();
    if ( second.affiliation !== affiliation )
        throw new Error();
    
    this.nameTag = nameTag;
    this.prettyTag = prettyTag;
    this.affiliation = affiliation;
    this.first = first;
    this.second = second;
}
SinkFuseDefault.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseDefault.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseDefault.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseDefault.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    return macLookupThen( self.first.fuse( rt, a, b ),
        function ( firstResult ) {
    
    if ( mkYep.tags( firstResult ) )
        return macLookupRet( firstResult );
    
    return self.second.fuse( rt, a, b );
    
    } );
};
SinkFuseDefault.prototype.getName = function () {
    return [ this.nameTag,
        this.first.getName(),
        this.second.getName() ];
};
SinkFuseDefault.prototype.pretty = function () {
    return "(" + this.prettyTag + " " +
        this.first.pretty() + " " +
        this.second.pretty() + ")";
};
function SinkFuseByOwnMethod(
    nameTag, prettyTag, affiliation, dexableGetMethod ) {
    
    this.nameTag = nameTag;
    this.prettyTag = prettyTag;
    this.affiliation = affiliation;
    this.dexableGetMethod = dexableGetMethod;
}
SinkFuseByOwnMethod.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseByOwnMethod.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseByOwnMethod.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseByOwnMethod.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    var getMethod = mkDexable.getProj( this.dexableGetMethod, "val" );
    
    function getFrom( x, then ) {
        return macLookupThen( getMethod.callSink( rt, x ),
            function ( maybeOwnMethod ) {
            
            if ( mkNil.tags( maybeOwnMethod ) ) {
                return macLookupRet( mkNil.ofNow() );
            } else if ( mkYep.tags( maybeOwnMethod ) ) {
                var method = mkYep.getProj( maybeOwnMethod, "val" );
                if ( method.affiliation !== self.affiliation )
                    throw new Error();
                return then( method );
            } else {
                throw new Error();
            }
        } );
    }
    
    return getFrom( a, function ( methodA ) {
    return getFrom( b, function ( methodB ) {
    
    if ( nameCompare( methodA.getName(), methodB.getName() ) !== 0 )
        return macLookupRet( mkNil.ofNow() );
    
    return methodA.fuse( rt, a, b );
    
    } );
    } );
};
SinkFuseByOwnMethod.prototype.getName = function () {
    return [ this.nameTag, this.dexableGetMethod.getName() ];
};
SinkFuseByOwnMethod.prototype.pretty = function () {
    return "(" + this.prettyTag + " " +
        this.dexableGetMethod.pretty() + ")";
};
function SinkFuseFix(
    nameTag, prettyTag, affiliation, dexableUnwrap ) {
    
    this.nameTag = nameTag;
    this.prettyTag = prettyTag;
    this.affiliation = affiliation;
    this.dexableUnwrap = dexableUnwrap;
}
SinkFuseFix.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseFix.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseFix.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseFix.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    return macLookupThen(
        mkDexable.getProj( self.dexableUnwrap, "val"
            ).callSink( rt, self ),
        function ( merge ) {
        
        if ( merge.affiliation !== self.affiliation )
            throw new Error();
        
        return merge.fuse( rt, a, b );
    } );
};
SinkFuseFix.prototype.getName = function () {
    return [ this.nameTag, this.dexableUnwrap.getName() ];
};
SinkFuseFix.prototype.pretty = function () {
    return "(" + this.prettyTag + " " +
        this.dexableUnwrap.pretty() + ")";
};
function SinkFuseTable( nameTag, prettyTag, affiliation, mergeVal ) {
    if ( mergeVal.affiliation !== affiliation )
        throw new Error();
    
    this.nameTag = nameTag;
    this.prettyTag = prettyTag;
    this.affiliation = affiliation;
    this.mergeVal = mergeVal;
}
SinkFuseTable.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkFuseTable.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkFuseTable.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkFuseTable.prototype.fuse = function ( rt, a, b ) {
    var self = this;
    
    if ( !(a instanceof SinkForeign && a.purpose === "table") )
        return macLookupRet( mkNil.ofNow() );
    if ( !(b instanceof SinkForeign && b.purpose === "table") )
        return macLookupRet( mkNil.ofNow() );
    
    var entries = [];
    a.foreignVal.plus( b.foreignVal ).each(
        function ( k, v ) {
        
        function get( table ) {
            var v = table.get( k );
            return v === void 0 ?
                mkNil.ofNow() :
                mkYep.ofNow( v );
        }
        entries.push(
            { k: k, a: get( a ), b: get( b ) } );
    } );
    var n = entries.length;
    return loop( 0, jsnMap() );
    function loop( i, table ) {
        if ( n <= i )
            return macLookupRet(
                mkYep.ofNow( new SinkForeign( "table", table ) ) );
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
SinkFuseTable.prototype.getName = function () {
    return [ this.nameTag, this.mergeVal.getName() ];
};
SinkFuseTable.prototype.pretty = function () {
    return "(" + this.prettyTag + " " + this.mergeVal.pretty() + ")";
};
function SinkCexpr( cexpr ) {
    this.cexpr = cexpr;
}
SinkCexpr.prototype.affiliation = "none";
SinkCexpr.prototype.callSink = function ( rt, arg ) {
    throw new Error();
};
SinkCexpr.prototype.dexHas = function ( rt, x ) {
    throw new Error();
};
SinkCexpr.prototype.callCline = function ( rt, a, b ) {
    throw new Error();
};
SinkCexpr.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkCexpr.prototype.getName = function () {
    return this.cexpr.getName();
};
SinkCexpr.prototype.pretty = function () {
    return this.cexpr.pretty();
};
function CexprVar( va ) {
    this.va = va;
}
CexprVar.prototype.getFreeVars = function () {
    return jsnMap().plusTruth( this.va );
};
CexprVar.prototype.visitForCodePruning = function ( visitor ) {
    // Do nothing.
};
CexprVar.prototype.toJsCode = function ( hasConstructor ) {
    return jsCodeRetCgenVar( this.va );
};
CexprVar.prototype.getName = function () {
    return [ "n:cexpr-var", this.va ];
};
CexprVar.prototype.pretty = function () {
    return "(cexpr-var " + JSON.stringify( this.va ) + ")";
};
function CexprReified( val ) {
    this.val = val;
}
CexprReified.prototype.getFreeVars = function () {
    return jsnMap();
};
CexprReified.prototype.visitForCodePruning = function ( visitor ) {
    // Do nothing.
};
CexprReified.prototype.toJsCode = function ( hasConstructor ) {
    // #GEN
    
    // For values that are strings, we actually encode them inline in
    // the generated code so that it's easier to debug the compiler
    // output.
    if ( this.val instanceof SinkForeign
        && this.val.purpose === "string" )
        return jsCode( jsCodeVar( "macLookupRet" ), "( ",
            jsCodeVar( "sinkForeignStrFromJs" ), "( " +
                jsStr( this.val.foreignVal.jsStr ) + " ) )" );
    
    return jsCodeReified( this.val );
};
CexprReified.prototype.getName = function () {
    return [ "n:cexpr-reified", this.val.getName() ];
};
CexprReified.prototype.pretty = function () {
    return "(cexpr-reified " + this.val.pretty() + ")";
};
function CexprLet( bindings, body ) {
    this.bindings = bindings;
    this.body = body;
}
CexprLet.prototype.getFreeVars = function () {
    var bindingsFreeVars = jsnMap();
    var bodyFreeVars = this.body.getFreeVars();
    arrEach( this.bindings, function ( binding, i ) {
        bodyFreeVars.del( binding.k );
        bindingsFreeVars.setAll( binding.v.getFreeVars() );
    } );
    return bindingsFreeVars.plus( bodyFreeVars );
};
CexprLet.prototype.visitForCodePruning = function ( visitor ) {
    arrEach( this.bindings, function ( binding, i ) {
        binding.v.visitForCodePruning( visitor );
    } );
    this.body.visitForCodePruning( visitor );
};
CexprLet.prototype.toJsCode = function ( hasConstructor ) {
    // #GEN
    var bindings = arrMap( this.bindings, function ( binding, i ) {
        return {
            innerVar: cgenIdentifier( binding.k ),
            obscureVar: "cgenLocal_" + i,
            jsCode: binding.v.toJsCode( hasConstructor )
        };
    } );
    var obscureVars = arrMap( bindings, function ( binding, i ) {
        return binding.obscureVar;
    } );
    var innerVars = arrMap( bindings, function ( binding, i ) {
        return binding.innerVar;
    } );
    arrEach( bindings, function ( binding, i ) {
        return binding.jsCode.assertNotFreeVars(
            obscureVars.concat( obscureVars ) );
    } );
    var body = this.body.toJsCode( hasConstructor ).assertNotFreeVars(
        obscureVars );
    
    var result = jsCode(
        "(function () {\n",
        arrMap( bindings, function ( binding, i ) {
            return jsCode(
                "var " + binding.innerVar + " = ",
                    jsCodeVar( binding.obscureVar ), ";\n" );
        } ),
        "return ", body.minusFreeVars( innerVars ), ";\n" +
        "})()" );
    for ( var i = bindings.length - 1; 0 <= i; i-- ) {
        var binding = bindings[ i ];
        result = jsCode( jsCodeVar( "macLookupThen" ), "( ",
            binding.jsCode, ", " +
            "function ( " + binding.obscureVar + " ) {\n" +
            "return ", result.minusFreeVars(
                [ binding.obscureVar ] ), ";\n" +
            "} )" );
    }
    
    return result;
};
CexprLet.prototype.getName = function () {
    return [ "n:cexpr-let" ].concat(
        arrMappend( this.bindings, function ( binding ) {
            return [ binding.k, binding.v.getName() ];
        } ),
        [ this.body.getName() ] );
};
CexprLet.prototype.pretty = function () {
    return "(cexpr-let " +
        arrMap( this.bindings, function ( binding ) {
            return JSON.stringify( binding.k ) + " " +
                binding.v.pretty() + " ";
        } ).join( "" ) + this.body.pretty() + ")";
};
function CexprCall( func, arg ) {
    this.func = func;
    this.arg = arg;
}
CexprCall.prototype.getFreeVars = function () {
    return this.func.getFreeVars().plus( this.arg.getFreeVars() );
};
CexprCall.prototype.visitForCodePruning = function ( visitor ) {
    this.func.visitForCodePruning( visitor );
    this.arg.visitForCodePruning( visitor );
};
CexprCall.prototype.toJsCode = function ( hasConstructor ) {
    // #GEN
    return jsCode(
        jsCodeVar( "macLookupThen" ), "( ",
            this.func.toJsCode( hasConstructor ), ", " +
            "function ( cgenLocal_result ) {\n" +
        "    \n" +
        "    return macLookupThen( ",
            this.arg.toJsCode( hasConstructor ).assertNotFreeVars(
                [ "cgenLocal_result" ] ), ", " +
                "function ( cgenLocal_arg ) {\n" +
        "        \n" +
        "        return cgenLocal_result.callSink( ",
                    jsCodeVar( "rt" ), ", " +
                    "cgenLocal_arg );\n" +
        "    } );\n" +
        "} )" );
};
CexprCall.prototype.getName = function () {
    return [ "n:cexpr-call",
        this.func.getName(), this.arg.getName() ];
};
CexprCall.prototype.pretty = function () {
    return "(cexpr-call " +
        this.func.pretty() + " " + this.arg.pretty() + ")";
};
function CexprCase( subject, mainTagName, bindings, then, els ) {
    var bindingsArr = [];
    bindings.each( function ( projName, localName ) {
        bindingsArr.push( { proj: projName, local: localName } );
    } );
    bindingsArr.sort( function ( a, b ) {
        return nameCompare( a.proj, b.proj );
    } );
    
    this.subject = subject;
    this.mainTagName = mainTagName;
    this.flatTag = makeFlatTag( mainTagName,
        arrMap( bindingsArr, function ( binding, i ) {
            return binding.proj;
        } ) );
    this.bindings = bindingsArr;
    this.then = then;
    this.els = els;
}
CexprCase.prototype.getFreeVars = function () {
    var localNames = jsnMap();
    arrEach( this.bindings, function ( binding, i ) {
        localNames.add( binding.local );
    } );
    return this.then.getFreeVars().minus( localNames ).
        plus( this.subject.getFreeVars() ).
        plus( this.els.getFreeVars() );
};
CexprCase.prototype.visitForCodePruning = function ( visitor ) {
    this.subject.visitForCodePruning( visitor );
    visitor.addCase( this.flatTag, this.then );
    this.els.visitForCodePruning( visitor );
};
CexprCase.prototype.toJsCode = function ( hasConstructor ) {
    // #GEN
    return jsCode( jsCodeVar( "macLookupThen" ), "( ",
        this.subject.toJsCode( hasConstructor ), ", " +
        "function ( cgenLocal_matchSubject ) { ",
        
        (hasConstructor( this.flatTag ) ? [
            "if ( cgenLocal_matchSubject instanceof ",
                jsCodeVar( "SinkStruct" ), " " +
                "&& cgenLocal_matchSubject.flatTag === " +
                    jsStr( this.flatTag ) + " " +
            ") return (function () { " +
                arrMap( this.bindings, function ( binding, i ) {
                    return "var " + cgenIdentifier( binding.local ) +
                        " = " +
                        "cgenLocal_matchSubject.projVals[ " +
                            i + " ]; ";
                } ).join( "" ) +
                "return ", this.then.toJsCode( hasConstructor
                ).assertNotFreeVars( [ "cgenLocal_matchSubject" ]
                ).minusFreeVars(
                    arrMap( this.bindings, function ( binding, i ) {
                        return cgenIdentifier( binding.local );
                    } ) ), "; " +
            "})(); "
        ] : ""),
        
        "return ", this.els.toJsCode( hasConstructor
        ).assertNotFreeVars( [ "cgenLocal_matchSubject" ] ), "; " +
    "} )" );
};
CexprCase.prototype.getName = function () {
    return [ "n:cexpr-case",
        this.subject.getName(), this.mainTagName
    ].concat(
        arrMappend( this.bindings, function ( binding, i ) {
            return [ binding.proj, binding.local ];
        } ),
        [ this.then.getName(), this.els.getName() ] );
};
CexprCase.prototype.pretty = function () {
    return "(cexpr-case " +
        this.subject.pretty() + " " +
        JSON.stringify( this.mainTagName ) + " " +
        arrMap( this.bindings, function ( binding, i ) {
            return JSON.stringify( binding.proj ) + " " +
                JSON.stringify( binding.local ) + " ";
        } ).join( "" ) +
        this.then.pretty() + " " +
        this.els.pretty() + ")";
};
function classCexprStructMapper(
    nameTag, prettyTag, genJsConstructor, visitForCodePruning ) {
    
    function CexprConstructMapper( mainTagName, projections ) {
        var projectionsWithSortedI =
            arrMap( projections, function ( projection, i ) {
                return {
                    name: projection.name,
                    expr: projection.expr,
                    sortedI: null
                };
            } );
        var sortedProjections =
            projectionsWithSortedI.slice().sort( function ( a, b ) {
                return nameCompare( a.name, b.name );
            } );
        arrEach( sortedProjections, function ( projection, i ) {
            projection.sortedI = i;
        } );
        
        this.mainTagName = mainTagName;
        this.flatTag = makeFlatTag( mainTagName,
            arrMap( sortedProjections, function ( projection, i ) {
                return projection.name;
            } ) );
        this.projections = projectionsWithSortedI;
    }
    CexprConstructMapper.prototype.getFreeVars = function () {
        var result = jsnMap();
        arrEach( this.projections, function ( projection, i ) {
            result.setAll( projection.expr.getFreeVars() );
        } );
        return result;
    };
    CexprConstructMapper.prototype.visitForCodePruning =
        function ( visitor ) {
        
        visitForCodePruning( visitor, this.flatTag );
        arrEach( this.projections, function ( projection, i ) {
            projection.expr.visitForCodePruning( visitor );
        } );
    };
    CexprConstructMapper.prototype.toJsCode =
        function ( hasConstructor ) {
        
        // #GEN
        var projectionVars = arrMap( this.projections,
            function ( projection, i ) {
            
            return "cgenLocal_proj" + i;
        } );
        var result = jsCode( jsCodeVar( "macLookupRet" ), "( ",
            genJsConstructor( this.flatTag,
                arrMap( projectionVars, function ( va ) {
                    return jsCodeVar( va );
                } ),
                arrMap( this.projections, function ( projection ) {
                    return projection.sortedI;
                } )
            ).minusFreeVars( projectionVars ), " )" );
        for ( var i = this.projections.length - 1; 0 <= i; i-- ) {
            var projVar =
                projectionVars[ this.projections[ i ].sortedI ];
            result = jsCode( jsCodeVar( "macLookupThen" ), "( ",
                this.projections[ i
                    ].expr.toJsCode( hasConstructor
                    ).assertNotFreeVars( projectionVars ),
                ", " +
                "function ( " + projVar + " ) {\n" +
            
            "return ", result, ";\n" +
            "} )" );
        }
        return result;
    };
    CexprConstructMapper.prototype.getName = function () {
        return [ nameTag, this.mainTagName ].concat(
            arrMappend( this.projections, function ( projection, i ) {
                return [ projection.name, projection.expr.getName() ];
            } ) );
    };
    CexprConstructMapper.prototype.pretty = function () {
        return "(" + prettyTag + " " +
            JSON.stringify( this.mainTagName ) + " " +
            arrMap( this.projections, function ( projection, i ) {
                return JSON.stringify( projection.name ) + " " +
                    JSON.stringify( projection.expr.pretty() );
            } ).join( " " ) + ")";
    };
    
    return CexprConstructMapper;
}
function classCexprStructMapperOrdered(
    nameTag, prettyTag, genJsConstructor ) {
    
    return classCexprStructMapper( nameTag, prettyTag,
        function ( flatTag, sortedProjections, order ) {
        
        return genJsConstructor(
            jsCode(
                jsStr( flatTag ) + ", " +
                "[ ", arrMappend( order, function ( sortedI, i ) {
                    return [ ", ", jsCode( "{ " +
                        "i: " + JSON.stringify( sortedI ) + ", " +
                        "val: ", sortedProjections[ sortedI ], " " +
                    "}" ) ];
                } ).slice( 1 ), " ]" ) );
    }, function ( visitor, flatTag ) {
        // Do nothing.
    } );
}
var CexprConstruct = classCexprStructMapper( "n:cexpr-construct",
    "cexpr-construct",
    function ( flatTag, sortedProjections, order ) {
    
    return jsCode( "new ", jsCodeVar( "SinkStruct" ), "( " +
        jsStr( flatTag ) + ", " +
        "[ ", arrMappend( sortedProjections, function ( proj, i ) {
            return [ ", ", proj ];
        } ).slice( 1 ), " ] )" );
}, function ( visitor, flatTag ) {
    visitor.addConstructor( flatTag );
} );
var CexprClineStruct = classCexprStructMapperOrdered(
    "n:cexpr-cline-struct", "cexpr-cline-struct",
    function ( args ) {
    
    return jsCode( "new ", jsCodeVar( "SinkClineStruct" ), "( ",
        args, " )" );
} );
var CexprMergeStruct = classCexprStructMapperOrdered(
    "n:cexpr-merge-struct", "cexpr-merge-struct",
    function ( args ) {
    
    return jsCode( "new ", jsCodeVar( "SinkFuseStruct" ), "( " +
        "\"n:merge-struct\", \"merge-struct\", \"merge\", ",
        args, " )" );
} );
var CexprFuseStruct = classCexprStructMapperOrdered(
    "n:cexpr-fuse-struct", "cexpr-fuse-struct",
    function ( args ) {
    
    return jsCode( "new ", jsCodeVar( "SinkFuseStruct" ), "( " +
        "\"n:fuse-struct\", \"fuse-struct\", \"fuse\", ",
        args, " )" );
} );
function CexprErr( msg ) {
    this.msg = msg;
}
CexprErr.prototype.getFreeVars = function () {
    return jsnMap();
};
CexprErr.prototype.visitForCodePruning = function ( visitor ) {
    visitor.addConstructor(
        makeFlatTag( [ "n:main-core", "follow-heart" ], [] ) );
};
CexprErr.prototype.toJsCode = function ( hasConstructor ) {
    return jsCode( jsCodeVar( "sinkErr" ), "( " +
        jsStr( this.msg ) + " )" );
};
CexprErr.prototype.getName = function () {
    // NOTE: We only have `CexprErr` for the sake of efficiency. For
    // other purposes, we can treat it as this other cexpr.
    return new CexprCall(
        new CexprConstruct( [ "n:main-core", "follow-heart" ], [] ),
        mkClamorErr.of(
            new CexprReified( sinkForeignStrFromJs( this.msg ) ) )
    ).getName();
};
CexprErr.prototype.pretty = function () {
    return "(cexpr-err " + jsStr( this.msg ) + ")";
};
function CexprFn( param, body ) {
    this.param = param;
    this.body = body;
}
CexprFn.prototype.getFreeVars = function () {
    return this.body.getFreeVars().minusEntry( this.param );
};
CexprFn.prototype.visitForCodePruning = function ( visitor ) {
    this.body.visitForCodePruning( visitor );
};
CexprFn.prototype.toJsCode = function ( hasConstructor ) {
    // #GEN
    var va = cgenIdentifier( this.param );
    return jsCode(
        jsCodeVar( "macLookupRet" ), "( " +
            "new ", jsCodeVar( "SinkFn" ), "( " +
                "function ( rt, " + va + " ) { " +
            
            "return ", this.body.toJsCode( hasConstructor
                ).minusFreeVars( [ "rt", va ] ), "; " +
        "} ) )" );
};
CexprFn.prototype.getName = function () {
    // NOTE: We only have `CexprFn` for the sake of efficiency.
    // However, the cexpr we would otherwise use involves a function
    // definition that we don't actually define right now, so there's
    // no cexpr we can use here.
    //
    // The `getName` of a cexpr is never called anyway, at this point.
    // The rest of the `getName` implementations here are just in case
    // we need them.
    //
    throw new Error();
};
CexprFn.prototype.pretty = function () {
    return "(cexpr-fn " +
        JSON.stringify( this.param ) + " " + this.body.pretty() + ")";
};


var builtInStructAccumulator = { val: null };
var projOccMainTagName = [ "n:main-core-projection-occurrence" ];
var projOccProjString =
    [ "n:proj-core-projection-occurrence-string" ];
var projOccProjMainTagName =
    [ "n:proj-core-projection-occurrence-main-tag-name" ];
var projOccFlatTag = makeFlatTag( projOccMainTagName, [
    projOccProjString,
    projOccProjMainTagName
].sort( function ( a, b ) {
    return nameCompare( a, b );
} ) );
var projOccCompared =
    nameCompare( projOccProjString, projOccProjMainTagName );
if ( projOccCompared === 0 )
    throw new Error();
function makeProjectionOccurrenceName( string, mainTagName ) {
    var compared =
        nameCompare( projOccProjString, projOccProjMainTagName );
    if ( projOccCompared < 0 )
        return [ "n:struct", projOccFlatTag,
        string.getName(), mainTagName.getName() ];
    else
        return [ "n:struct", projOccFlatTag,
        mainTagName.getName(), string.getName() ];
}
function builtInStruct( name, var_args ) {
    if ( name === "projection-occurrence" ) {
        // NOTE: We special-case this one because otherwise we'll have
        // infinitely long flatTags.
        
        var repMainTagName = projOccMainTagName;
        var of = function ( projName ) {
            return sinkNameQualify(
                makeProjectionOccurrenceName(
                    sinkForeignStrFromJs( projName ),
                    new SinkForeign( "name", repMainTagName ) ) );
        };
        var projSourceToRep = [ {
            source: of( arguments[ 1 ] ),
            rep: projOccProjString
        }, {
            source: of( arguments[ 2 ] ),
            rep: projOccProjMainTagName
        } ];
    } else {
        var repMainTagName = [ "n:main-core", name ];
        var projSourceToRep =
            arrMap( [].slice.call( arguments, 1 ),
                function ( projName ) {
                
                var source =
                    sinkNameQualify(
                        makeProjectionOccurrenceName(
                            sinkForeignStrFromJs( projName ),
                            new SinkForeign( "name", repMainTagName )
                        ) );
                return {
                    source: source,
                    rep: [ "n:proj-core", source, repMainTagName ]
                };
            } );
    }
    builtInStructAccumulator.val.push(
        function ( processDefStruct, definitionNs, dummyMode ) {
        
        var strName = sinkForeignStrFromJs( name );
        var macroMainTagName =
            sinkNameQualify(
                mkMacroOccurrence.ofNow( strName ).getName() );
        var sourceMainTagName =
            sinkNameQualify(
                mkConstructorOccurrence.ofNow( strName ).getName() );
        processDefStruct( definitionNs, dummyMode,
            macroMainTagName,
            sourceMainTagName, repMainTagName,
            projSourceToRep );
    } );
    return cgenStructArr( repMainTagName, projSourceToRep );
}

var builtInCoreStructsToAdd = [];

builtInStructAccumulator.val = builtInCoreStructsToAdd;

// These constructors are needed to build the unqualified variable
// names corresponding to literal strings.
//
// NOTE: The definition of `mkProjectionOccurrence` needs to come
// before all the others because the other `builtInStruct()` calls use
// it.
//
var mkProjectionOccurrence = builtInStruct( "projection-occurrence",
    "string", "main-tag-name" );
var mkMacroOccurrence = builtInStruct( "macro-occurrence", "string" );
var mkLocalOccurrence = builtInStruct( "local-occurrence", "string" );
var mkConstructorOccurrence =
    builtInStruct( "constructor-occurrence", "string" );

// These constructors are needed for interpreting the results of
// certain built-in operators, namely `isa` and the dex operations.
var mkYep = builtInStruct( "yep", "val" );
var mkNope = builtInStruct( "nope", "val" );

// This constructor is needed for constructing the kind of input to
// `follow-heart` that `err` passes in, so that alternatives to `err`
// can be implemented.
var mkClamorErr = builtInStruct( "clamor-err", "message" );

// This constructor is needed for constructing the input to certain
// operations.
var mkDexable = builtInStruct( "dexable", "dex", "val" );

// These constructors are needed for constructing a constructor
// glossary, which associates source-level names with a constructor's
// representation's names.
var mkAssoc = builtInStruct( "assoc", "key", "val" );
var mkConstructorGlossary = builtInStruct( "constructor-glossary",
    "main-tag", "source-to-rep" );

// This constructor is needed for constructing the input to certain
// operations.
var mkConstructorTag =
    builtInStruct( "constructor-tag", "main-tag", "projections" );

// This constructor is needed to deconstruct the result of
// `int-div-rounded-down`.
var mkCarried = builtInStruct( "carried", "main", "carry" );

// These constructors are needed to deconstruct the results of
// `optimized-regex-match-later`.
var mkRegexResultMatched =
    builtInStruct( "regex-result-matched", "stop" );
var mkRegexResultFailed = builtInStruct( "regex-result-failed" );
var mkRegexResultPassedEnd =
    builtInStruct( "regex-result-passed-end" );

// These s-expression constructors are needed so that macros can parse
// their s-expression arguments. The `cons` and `nil` constructors are
// also needed for parsing and generating projection lists.
var mkNil = builtInStruct( "nil" );
var mkCons = builtInStruct( "cons", "car", "cdr" );
var mkIstringNil = builtInStruct( "istring-nil", "string" );
var mkIstringCons = builtInStruct( "istring-cons",
    "string-past", "interpolated", "istring-rest" );
var mkForeign = builtInStruct( "foreign", "val" );

// This constructor is needed to deconstruct the scope values a macro
// has access to.
var mkScope =
    builtInStruct( "scope", "unique-ns", "def-ns", "qualify" );

// These occur in `(foreign ...)` s-expressions to signify that a
// value should be looked up by an arbitrary name or by immediate
// value instead of by the name of a literal string.
var mkObtainByUnqualifiedName =
    builtInStruct( "obtain-by-unqualified-name", "name" );
var mkObtainByQualifiedName =
    builtInStruct( "obtain-by-qualified-name", "name" );
var mkObtainDirectly = builtInStruct( "obtain-directly", "val" );

// This constructor is needed so that macros can parse their located
// syntax arguments.
var mkStx = builtInStruct( "stx", "stx-details", "s-expr" );

// This constructor is needed to deconstruct the result of certain
// operations.
var mkGetdef = builtInStruct( "getdef", "get", "def" );

builtInStructAccumulator.val = null;


function sinkTrivialStxDetails() {
    return new SinkForeign( "macro-stx-details", null );
}

function elementDefiner( name, ns ) {
    return { type: "contributedElement", namespace: ns, name: name };
}

function getClaimedDefiner( uniqueNs ) {
    return elementDefiner( "val",
        sinkNsGet( [ "n:$$claimed" ], uniqueNs ) );
}
function getConstructorGlossaryDefiner( definitionNs, name ) {
    return elementDefiner( name,
        sinkNsGet( [ "n:$$constructor-glossary" ], definitionNs ) );
}
function getMacroFunctionDefiner( definitionNs, name ) {
    return elementDefiner( name,
        sinkNsGet( [ "n:$$macro-string-reference" ], definitionNs ) );
}
function getFunctionImplementationsDefiner( definitionNs ) {
    return elementDefiner( "val",
        sinkNsGet( [ "n:$$function-implementations" ],
            definitionNs ) );
}
function getFunctionImplementationEntryDefiner(
    funcDefNs, constructorTagName ) {
    
    return elementDefiner( constructorTagName, funcDefNs );
}

function sinkNameQualify( unqualifiedName ) {
    return [ "n:$$qualified-name", unqualifiedName ];
}
var rootQualify = new SinkFn( function ( rt, unqualifiedName ) {
    if ( !(unqualifiedName instanceof SinkForeign
        && unqualifiedName.purpose === "name") )
        throw new Error();
    return macLookupRet(
        new SinkForeign( "name",
            sinkNameQualify( unqualifiedName.foreignVal ) ) );
} );

function parseMode( mode ) {
    if ( !(mode instanceof SinkForeign
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
function rawModeSupportsEval( rawMode ) {
    return isMacroOrUnitTestRawMode( rawMode );
}
function rawModeSupportsDefer( rawMode ) {
    return isMacroOrUnitTestRawMode( rawMode );
}
function rawModeSupportsContributeDefiner( definer ) {
    return function ( rawMode ) {
        
        if ( definer.type === "contributedElement"
            && !sinkNameSetContains(
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

function collectPutDefinedDexAndValue( rawMode,
    definer, dexAndValue ) {
    
    assertRawMode( rawModeSupportsContributeDefiner( definer ),
        rawMode );
    rawMode.putDefined.push(
        { definer: definer, dexAndValue: dexAndValue } );
}
function collectPutDefinedValue( rawMode, definer, value ) {
    collectPutDefinedDexAndValue( rawMode, definer,
        { satisfiesDex: false, value: value } );
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
function getContributionTable( namespaceDefs, name ) {
    if ( !namespaceDefs.has( name ) )
        namespaceDefs.set( name, {
            elements: jsnMap(),
            listeners: jsnMap()
        } );
    return namespaceDefs.get( name );
}
function getContributionEntry(
    namespaceDefs, namespaceName, entryName ) {
    
    var table =
        getContributionTable( namespaceDefs, namespaceName ).elements;
    if ( !table.has( entryName ) )
        table.set( entryName, {
            directListeners: [],
            visit: null,
            dexAndValue: null
        } );
    return table.get( entryName );
}
function definerToVisitable( namespaceDefs, definer ) {
    if ( definer.type === "contributedElement" ) {
        return getContributionEntry( namespaceDefs,
            definer.namespace.name, definer.name );
    } else if ( definer.type === "object" ) {
        return definer;
    } else {
        throw new Error();
    }
}
function runPuts( namespaceDefs, rt, rawMode ) {
    
    
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
    
    function sameDexAndValue( a, b ) {
        return (a.satisfiesDex && b.satisfiesDex
            && nameCompare( a.dexName, b.dexName ) === 0
            && nameCompare( a.valueName, b.valueName ) === 0);
    }
    
    var unique = !arrAny( rawMode.putDefined, function ( put ) {
        var visitable =
            definerToVisitable( namespaceDefs, put.definer );
        if ( visitable.visit === null ) {
            visitable.visit = put.dexAndValue;
            return false;
        } else {
            return !sameDexAndValue(
                visitable.visit, put.dexAndValue );
        }
    } );
    arrEach( rawMode.putDefined, function ( put ) {
        definerToVisitable( namespaceDefs, put.definer ).visit = null;
    } );
    if ( !unique )
        throw new Error();
    arrEach( rawMode.putDefined, function ( put ) {
        var visitable =
            definerToVisitable( namespaceDefs, put.definer );
        if ( visitable.dexAndValue !== null
            && !sameDexAndValue(
                visitable.dexAndValue, put.dexAndValue ) )
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
        put.definer.dexAndValue = put.dexAndValue;
    } );
    
    var listenersFired = [];
    
    // NOTE: This adds the `listenersFired` entries for preexisting
    // listeners and new elements.
    arrEach( putDefinedContributedElements, function ( put ) {
        var contribsTable = getContributionTable(
            namespaceDefs, put.definer.namespace.name );
        var contribsEntry = getContributionEntry( namespaceDefs,
            put.definer.namespace.name, put.definer.name );
        
        if ( contribsEntry.dexAndValue !== null )
            return;
        
        contribsEntry.dexAndValue = put.dexAndValue;
        
        arrEach( contribsEntry.directListeners, function ( dl ) {
            listenersFired.push( dl );
        } );
        contribsEntry.directListeners = null;
        
        var singletonTable = new SinkForeign( "table",
            jsnMap().plusEntry(
                put.definer.name, put.dexAndValue.value ) );
        contribsTable.listeners.each( function ( k, v ) {
            listenersFired.push( {
                type: "collectiveListener",
                attenuation: v.attenuation,
                computation: function () {
                    return v.listener.callSink( rt, singletonTable );
                }
            } );
        } );
    } );
    
    // NOTE: This adds the `listenersFired` entries for new listeners
    // and preexisting elements and also for new listeners and new
    // elements. It includes both old and new elements because the new
    // elements were already added above.
    arrEach( rawMode.putListener, function ( put ) {
        var contribs =
            getContributionTable( namespaceDefs, put.namespace.name );
        if ( contribs.listeners.has( put.name ) )
            throw new Error();
        var attenuation = {
            type: rawMode.type,
            unitTestId: rawMode.unitTestId,
            contributingOnlyTo: rawMode.contributingOnlyTo
        };
        contribs.listeners.set( put.name, listenerObj );
        contribs.elements.each( function ( k, v ) {
            listenersFired.push( {
                type: "collectiveListener",
                attenuation: attenuation,
                computation: function () {
                    return put.listener.callSink( rt,
                        new SinkForeign( "table",
                            jsnMap().plusEntry( k, v ) ) );
                }
            } );
        } );
    } );
    
    
    return listenersFired;
}
function runEffects( rawMode, effects ) {
    if ( !(effects instanceof SinkForeign
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
            
            var listenersFired =
                runPuts( namespaceDefs, rt, rawMode );
            arrEach( listenersFired, function ( listenerFired ) {
                if ( listenerFired.type === "directListener" ) {
                    threads.push( listenerFired.thread );
                } else if (
                    listenerFired.type === "collectiveListener" ) {
                    
                    addMacroThread( listenerFired.attenuation,
                        function ( rawMode ) {
                        
                        return macLookupThen(
                            listenerFired.computation(),
                            function ( effects ) {
                            
                            return currentlyMode( rawMode,
                                function () {
                                
                                return runEffects( rawMode, effects );
                            } );
                        } );
                    } );
                } else {
                    throw new Error();
                }
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
                contributingOnlyTo: sinkNameSetAll()
            }, thread.macLookupEffectsOfDefinitionEffects );
        } else if ( thread.type === "jsEffectsThread" ) {
            var monad = macLookupThen(
                thread.macLookupEffectsOfJsEffects,
                function ( effects ) {
                
                if ( !(effects instanceof SinkForeign
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
                    contributingOnlyTo: sinkNameSetEmpty(),
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
    
    // NOTE: This statistics-gathering code came in handy to notice an
    // optimization opportunity. The `getContributedElementFailure`
    // total was very high (1339630), so we moved threads that were
    // doing those blocking reads to be stored with the element entry,
    // instead of iterating over them every time we advanced the
    // threads. (We could probably optimize `getObjectFailure` in a
    // similar way, but we haven't bothered yet.)
    //
    // Here's the last outcome from when we had this code uncommented:
    //
    // {
    //     shallowRet: 0,
    //     shallowOther: 0,
    //     ret: 133957,
    //     getContributedElementSuccess: 11270,
    //     getObjectSuccess: 106,
    //     getContributedElementFailure: 6571,
    //     getObjectFailure: 15736,
    //     followHeart: 0,
    //     procureContributedElements: 0,
    //     then: 118453
    // }
    //
    // If anything's the bottleneck now, it seems to be `ret` or
    // `then`.
    //
//    var stats = {
//        shallowRet: 0,
//        shallowOther: 0,
//        ret: 0,
//        getContributedElementSuccess: 0,
//        getObjectSuccess: 0,
//        getContributedElementFailure: 0,
//        getObjectFailure: 0,
//        followHeart: 0,
//        procureContributedElements: 0,
//        then: 0
//    };
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
        
        if ( thread.monad.type === "then" ) {
            var then = thread.monad.then;
            if ( thread.monad.first.type === "get" ) {
                var definer = thread.monad.first.definer;
                
                currentlyThread( thread, function () {
                    assertRawMode(
                        rawModeSupportsObserveDefiner( definer ),
                        thread.rawMode );
                } );
                
                var visitable =
                    definerToVisitable( namespaceDefs, definer );
                
                if ( visitable.dexAndValue !== null ) {
//                    if ( definer.type === "contributedElement" ) {
//                        stats.getContributedElementSuccess++;
//                    } else if ( definer.type === "object" ) {
//                        stats.getObjectSuccess++;
//                    } else {
//                        throw new Error();
//                    }
                    return replaceThread(
                        currentlyThread( thread, function () {
                            return then(
                                visitable.dexAndValue.value );
                        } ) );
                } else {
                    if ( definer.type === "contributedElement" ) {
//                        stats.getContributedElementFailure++;
                        var contributionEntry = visitable;
                        contributionEntry.directListeners.push( {
                            type: "directListener",
                            thread: thread
                        } );
                        return replaceThread(
                            macLookupRet( sinkForeignEffectsNil ) );
                    } else if ( definer.type === "object" ) {
//                        stats.getObjectFailure++;
                        thread.failedAdvances++;
                        return false;
                    } else {
                        throw new Error();
                    }
                }
            } else if ( thread.monad.first.type === "ret" ) {
//                stats.ret++;
                return replaceThread(
                    currentlyThread( thread, function () {
                        return then( thread.monad.first.val );
                    } ) );
            } else if ( thread.monad.first.type === "then" ) {
//                stats.then++;
                return replaceThread( macLookupThen(
                    thread.monad.first.first,
                    function ( val ) {
                    
                    var firstThen = thread.monad.first.then;
                    return macLookupThen( firstThen( val ), then );
                } ) );
            } else if ( thread.monad.first.type ===
                "procureContributedElements" ) {
//                stats.procureContributedElements++;
                
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
                
                var result = new SinkForeign( "table",
                    getContributionTable( namespaceDefs,
                        thread.monad.first.namespace.name ).elements
                );
                return replaceThread(
                    currentlyThread( thread, function () {
                        return then( result );
                    } ) );
            } else {
                throw new Error();
            }
        } else if ( thread.monad.type === "ret" ) {
//            stats.shallowRet++;
            return true;
        } else if (
            thread.monad.type === "get"
            || thread.monad.type === "procureContributedElements" ) {
//            stats.shallowOther++;
            return replaceThread(
                macLookupThen( thread.monad, function ( ignored ) {
                    return macLookupRet( null );
                } ) );
        } else {
            throw new Error();
        }
    }
    
    function raiseErrorsForStalledThread( err ) {
        // TODO: Stop using `setTimeout` here. We don't typically use
        // `setTimeout` directly if we can use a user-supplied defer
        // procedure instead.
        setTimeout( function () {
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
    //
    // NOTE: Some of the threads aren't in the `threads` array, but
    // are instead scattered on individual entries in the
    // `namespaceDefs` data. We probably pay a bit of a performance
    // cost looking them up here, but the savings from not iterating
    // over all those dead threads during macroexpansion more than
    // makes up for it.
    //
    var hadError = false;
    arrEach( threads, function ( thread, i ) {
        if ( thread.isJs )
            return;
        
        raiseErrorsForStalledThread( thread.monad.first.err );
        hadError = true;
    } );
    namespaceDefs.each( function ( nsName, contributionTable ) {
        contributionTable.elements.each( function ( keyName, entry ) {
            if ( entry.directListeners === null )
                return;
            arrEach( entry.directListeners, function ( listener, i ) {
                if ( listener.type !== "directListener" )
                    throw new Error();
                raiseErrorsForStalledThread(
                    listener.thread.monad.first.err );
                hadError = true;
            } );
        } );
    } );
    if ( hadError ) {
        rt.anyTestFailed = true;
        return;
    }
    
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
        raiseErrorsForStalledThread( thread.monad.first.err );
        rt.anyTestFailed = true;
    } );
    
//    console.log( stats );
}

function cgenExecute( rt, expr ) {
    // #GEN
    
    // NOTE: When the code we generate for this has local
    // variables, we consistently prefix them with "cgenLocal_" or
    // "_cgen_". The latter is for variables that correspond to
    // variables in the original code.
    
    return expr.instantiate( {
        rt: rt,
        SinkStruct: SinkStruct,
        SinkFn: SinkFn,
        SinkForeign: SinkForeign,
        SinkClineStruct: SinkClineStruct,
        SinkFuseStruct: SinkFuseStruct,
        sinkForeignStrFromJs: sinkForeignStrFromJs,
        sinkErr: sinkErr,
        macLookupRet: macLookupRet,
        macLookupThen: macLookupThen
    } );
}

function cexprToSloppyJsCode( cexpr ) {
    return cexpr.toJsCode( function ( constructor ) {
        return true;
    } );
}

function callSinkMulti( rt, func, var_args ) {
    var args = arguments;
    var n = args.length;
    return loop( func, 2 );
    function loop( func, i ) {
        if ( n <= i )
            return macLookupRet( func );
        return macLookupThen( func.callSink( rt, args[ i ] ),
            function ( func ) {
                return loop( func, i + 1 );
            } );
    }
}

function addFunctionNativeDefinition(
    funcDefNs, rawMode, constructorTagName, impl ) {
    
    collectPutDefinedValue( rawMode,
        getFunctionImplementationEntryDefiner(
            funcDefNs, constructorTagName ),
        new SinkForeign( "native-definition", impl ) );
}
function addDefun( rt, funcDefNs, rawMode, name, argName, body ) {
    var constructorTagName =
        sinkNameConstructorTagAlreadySorted( name, [] );
    var cexpr =
        new CexprFn( [ "n:ignored" ], new CexprFn( argName, body ) );
    var impl = cgenExecute( rt, cexprToSloppyJsCode( cexpr ) );
    addFunctionNativeDefinition(
        funcDefNs, rawMode, constructorTagName,
        {
            cexpr: cexpr,
            func: function ( rt, func, arg ) {
                return macLookupThen( impl, function ( impl ) {
                    return callSinkMulti( rt, impl, func, arg );
                } );
            }
        } );
}

// TODO: Start using this to report errors instead of
// `throw new Error()` everywhere.
//
// Not all places that use `throw new Error()` should change to this.
// Some indicate bugs in the language implementation, and it might
// make sense to handle those differently.
//
function sinkErr( msg ) {
    return macLookupFollowHeart(
        mkClamorErr.ofNow( sinkForeignStrFromJs( msg ) ) );
}

function usingFuncDefNs( funcDefNs ) {
    // NOTE: The "rt" stands for "runtime." This carries things that
    // are relevant at run time.
    // TODO: See if we should add `namespaceDefs` to this.
    var rt = {};
    rt.funcDefNs = funcDefNs;
    rt.functionDefs = {};
    rt.anyTestFailed = false;
    rt.fromBoolean = function ( b ) {
        var nil = mkNil.ofNow();
        return b ? mkYep.ofNow( nil ) : mkNope.ofNow( nil );
    };
    rt.toBoolean = function ( b ) {
        return mkYep.tags( b );
    };
    rt.dexHas = function ( dex, x, then ) {
        return macLookupThen( dex.dexHas( rt, x ), function ( has ) {
            return then( rt.toBoolean( has ) );
        } );
    };
    
    function parseString( string ) {
        if ( !(string instanceof SinkForeign
            && string.purpose === "string") )
            throw new Error();
        return string.foreignVal;
    }
    
    function stxToObtainMethod( rt, nss, stx, stringToUnq, then ) {
        if ( !mkStx.tags( stx ) )
            return then( { type: "obtainInvalid" } );
        var sExpr = mkStx.getProj( stx, "s-expr" );
        
        function qualify( unqualifiedName ) {
            if ( !(unqualifiedName instanceof SinkForeign
                && unqualifiedName.purpose === "name") )
                throw new Error();
            return macLookupThen(
                nss.qualify.callSink( rt, unqualifiedName ),
                function ( qualifiedName ) {
                
                if ( !(qualifiedName instanceof SinkForeign
                    && qualifiedName.purpose === "name") )
                    throw new Error();
                return then( { type: "obtainByName",
                    name: qualifiedName.foreignVal } );
            } );
        }
        
        if ( mkForeign.tags( sExpr ) ) {
            var obtainMethod = mkForeign.getProj( sExpr, "val" );
            if ( mkObtainByQualifiedName.tags( obtainMethod ) ) {
                var name = mkObtainByQualifiedName.getProj(
                    obtainMethod, "name" );
                if ( !(name instanceof SinkForeign
                    && name.purpose === "name") )
                    throw new Error();
                return then( { type: "obtainByName",
                    name: name.foreignVal } );
            } else if (
                mkObtainByUnqualifiedName.tags( obtainMethod ) ) {
                
                return qualify(
                    mkObtainByQualifiedName.getProj(
                        obtainMethod, "name" ) );
            } else if ( mkObtainDirectly.tags( obtainMethod ) ) {
                return then( { type: "obtainDirectly",
                    val: mkObtainDirectly.getProj(
                        obtainMethod, "val" ) } );
            } else {
                throw new Error();
            }
        } else if ( mkIstringNil.tags( sExpr ) ) {
            var string = mkIstringNil.getProj( sExpr, "string" );
            if ( !(string instanceof SinkForeign
                && string.purpose === "string") )
                throw new Error();
            return qualify(
                new SinkForeign( "name",
                    stringToUnq( string ).getName() ) );
        } else {
            return then( { type: "obtainInvalid" } );
        }
    }
    
    function stxToMaybeName( rt, nss, stx, stringToUnq, then ) {
        return stxToObtainMethod( rt, nss, stx, stringToUnq,
            function ( obtainMethod ) {
            
            if ( obtainMethod.type === "obtainByName" )
                return then( obtainMethod.name );
            return then( null );
        } );
    }
    function stxToName( rt, nss, stx, stringToUnq, then ) {
        return stxToMaybeName( rt, nss, stx, stringToUnq,
            function ( name ) {
            
            if ( name === null )
                throw new Error();
            return then( name );
        } );
    }
    function stxToConstructorNames( rt, nss, stx, then ) {
        return stxToName( rt, nss, stx,
            function ( string ) {
                return mkMacroOccurrence.ofNow( string );
            },
            function ( macroMainTagName ) {
        return stxToName( rt, nss, stx,
            function ( string ) {
                return mkConstructorOccurrence.ofNow( string );
            },
            function ( sourceMainTagName ) {
        
        return then( macroMainTagName, sourceMainTagName );
        
        } );
        } );
    }
    
    function sinkConsListToArray( list ) {
        var result = [];
        var currentList = list;
        for ( ;
            mkCons.tags( currentList );
            currentList = mkCons.getProj( currentList, "cdr" )
        ) {
            result.push( mkCons.getProj( currentList, "car" ) );
        }
        if ( !mkNil.tags( currentList ) )
            throw new Error();
        return result;
    }
    
    function sinkConsListFromArray( arr ) {
        var result = mkNil.ofNow();
        for ( var i = arr.length - 1; 0 <= i; i-- )
            result = mkCons.ofNow( arr[ i ], result );
        return result;
    }
    
    function getStruct( definitionNs, sourceMainTagNameRep ) {
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
            
            if ( !mkConstructorGlossary.tags( constructorGlossary ) )
                throw new Error();
            var repMainTagName =
                mkConstructorGlossary.getProj( constructorGlossary,
                    "main-tag" );
            var sourceToRep =
                mkConstructorGlossary.getProj( constructorGlossary,
                    "source-to-rep" );
            
            if ( !(repMainTagName instanceof SinkForeign
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
                cgenStructArr( repMainTagName.foreignVal,
                    arrMap( sinkConsListToArray( sourceToRep ),
                        function ( entry ) {
                        
                        if ( !mkAssoc.tags( entry ) )
                            throw new Error();
                        var sourceName =
                            mkAssoc.getProj( entry, "key" );
                        var repName = mkAssoc.getProj( entry, "val" );
                        if ( !(sourceName instanceof SinkForeign
                            && sourceName.purpose === "name") )
                            throw new Error();
                        if ( !(repName instanceof SinkForeign
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
    
    function extractPattern( nss, body ) {
        if ( !mkCons.tags( body ) )
            throw new Error();
        
        var sourceMainTagNameRepExpr = mkCons.getProj( body, "car" );
        return stxToMaybeName( rt, nss, sourceMainTagNameRepExpr,
            function ( string ) {
                return mkConstructorOccurrence.ofNow( string );
            },
            function ( sourceMainTagNameRep ) {
            
            if ( sourceMainTagNameRep === null )
                throw new Error(
                    "Encountered a case branch with a source " +
                    "main tag name that wasn't a syntactic name: " +
                    sourceMainTagNameRepExpr.pretty() );
        
        return macLookupThen(
            getStruct( nss.definitionNs, sourceMainTagNameRep ),
            function ( struct ) {
            
            var remainingBody = mkCons.getProj( body, "cdr" );
            var localVars = [];
            var n = struct.sortedProjNames.length;
            
            return loop( 0, [], mkCons.getProj( body, "cdr" ) );
            function loop( i, localVars, remainingBody ) {
                if ( n <= i ) {
                    var bindingsMap = jsnMap();
                    arrEach( struct.sortedProjNames,
                        function ( projName, i ) {
                        
                        bindingsMap.set( projName.rep,
                            localVars[ projName.i ] );
                    } );
                    
                    var result = {};
                    result.struct = struct;
                    result.bindingsMap = bindingsMap;
                    result.remainingBody = remainingBody;
                    return macLookupRet( result );
                }
                
                if ( !mkCons.tags( remainingBody ) )
                    throw new Error();
                return stxToName( rt, nss,
                    mkCons.getProj( remainingBody, "car" ),
                    function ( string ) {
                        return mkLocalOccurrence.ofNow( string );
                    },
                    function ( localVar ) {
                    
                    return loop( i + 1,
                        localVars.concat( [ localVar ] ),
                        mkCons.getProj( remainingBody, "cdr" ) );
                } );
            }
        } );
        
        } );
    }
    
    // TODO: Make this expand multiple expressions concurrently.
    function cgenCaseletForRunner(
        nss, rawMode, maybeVa, matchSubject, body, then ) {
        
        var subjectVar = maybeVa !== null ? maybeVa.val :
            nssGet( nss, "subject-var" ).uniqueNs.name;
        
        function processTail( nss, rawMode, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            if ( !mkCons.tags( body1 ) )
                return macroexpand( nssGet( nss, "unique" ), rawMode,
                    mkCons.getProj( body, "car" ),
                    nssGet( nss, "outbox" ).uniqueNs,
                    then );
            
            return macLookupThen( extractPattern( nss, body ),
                function ( pattern ) {
            
            if ( !mkCons.tags( pattern.remainingBody ) )
                throw new Error();
            
            var thenNss = nssGet( nss, "then" );
            return macroexpand( nssGet( thenNss, "unique" ),
                rawMode,
                mkCons.getProj( pattern.remainingBody, "car" ),
                nssGet( thenNss, "outbox" ).uniqueNs,
                function ( rawMode, thenBranch ) {
            
            var els = mkCons.getProj( pattern.remainingBody, "cdr" );
            return processTail( nssGet( nss, "tail" ), rawMode, els,
                function ( rawMode, processedTail ) {
            
            return then( rawMode,
                new CexprCase(
                    new CexprVar( subjectVar ),
                    pattern.struct.repMainTagName,
                    pattern.bindingsMap,
                    thenBranch,
                    processedTail ) );
            
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
                new CexprLet(
                    [ { k: subjectVar, v: expandedSubject } ],
                    processedTail ) ) );
        
        } );
        } );
    }
    
    // TODO: Make this expand multiple expressions concurrently.
    function cgenCast( nss, rawMode, matchSubject, body, then ) {
        return macLookupThen( extractPattern( nss, body ),
            function ( pattern ) {
        
        if ( !mkCons.tags( pattern.remainingBody ) )
            throw new Error();
        var remainingBody1 =
            mkCons.getProj( pattern.remainingBody, "cdr" );
        if ( !mkCons.tags( remainingBody1 ) )
            throw new Error();
        var remainingBody2 = mkCons.getProj( remainingBody1, "cdr" );
        if ( mkCons.tags( remainingBody2 ) )
            throw new Error();
        
        var onCastErrNss = nssGet( nss, "on-cast-err" );
        return macroexpand( nssGet( onCastErrNss, "unique" ), rawMode,
            mkCons.getProj( pattern.remainingBody, "car" ),
            nssGet( onCastErrNss, "outbox" ).uniqueNs,
            function ( rawMode, onCastErr ) {
        var bodyNss = nssGet( nss, "body" );
        return macroexpand( nssGet( bodyNss, "unique" ), rawMode,
            mkCons.getProj( remainingBody1, "car" ),
            nssGet( bodyNss, "outbox" ).uniqueNs,
            function ( rawMode, body ) {
        var subjectNss = nssGet( nss, "subject" );
        return macroexpand( nssGet( subjectNss, "unique" ), rawMode,
            matchSubject,
            nssGet( subjectNss, "outbox" ).uniqueNs,
            function ( rawMode, expandedSubject ) {
        
        return macLookupThenRunEffects( rawMode,
            then(
                new CexprCase(
                    expandedSubject,
                    pattern.struct.repMainTagName,
                    pattern.bindingsMap,
                    body,
                    onCastErr ) ) );
        
        } );
        } );
        } );
        
        } );
    }
    
    function processFn( rt, nss, rawMode, body, then ) {
        if ( !mkCons.tags( body ) )
            throw new Error();
        var body1 = mkCons.getProj( body, "cdr" );
        if ( !mkCons.tags( body1 ) )
            return macroexpand( nssGet( nss, "unique" ), rawMode,
                mkCons.getProj( body, "car" ),
                nssGet( nss, "outbox" ).uniqueNs,
                then );
        
        var param = mkCons.getProj( body, "car" );
        return stxToMaybeName( rt, nss, param,
            function ( string ) {
                return mkLocalOccurrence.ofNow( string );
            },
            function ( paramName ) {
            
            if ( paramName === null )
                throw new Error(
                    "Called fn with a variable name that wasn't a " +
                    "syntactic name: " + param.pretty() );
            
            return processFn( rt, nss, rawMode, body1,
                function ( rawMode, processedRest ) {
                
                return then( rawMode,
                    new CexprFn( paramName, processedRest ) );
            } );
        } );
    }
    
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
            if ( !mkCons.tags( e ) ) {
                if ( !mkNil.tags( e ) )
                    throw new Error();
                
                return then( rawMode, revJsListToArr( revResult ) );
            }
            
            var firstNss = nssGet( currentNss, "first" );
            return macroexpand( nssGet( firstNss, "unique" ),
                rawMode,
                mkCons.getProj( e, "car" ),
                nssGet( firstNss, "outbox" ).uniqueNs,
                function ( rawMode, elemResult ) {
                
                return go( nssGet( currentNss, "rest" ), rawMode,
                    mkCons.getProj( e, "cdr" ),
                    { first: elemResult, rest: revResult } );
            } );
        }
    }
    
    function sinkFnPure( func ) {
        return new SinkFn( function ( rt, arg ) {
            return macLookupRet( func( rt, arg ) );
        } );
    }
    
    function nssClaim( rawMode, nss, forWhatMacro ) {
        collectPutDefinedValue( rawMode,
            getClaimedDefiner( nss.uniqueNs ),
            mkNil.ofNow() );
        return nssGet( nss, [ "n:$$claimed-for", forWhatMacro ] );
    }
    
    function parseScope( scope ) {
        if ( !mkScope.tags( scope ) )
            throw new Error();
        var uniqueNs = mkScope.getProj( scope, "unique-ns" );
        var defNs = mkScope.getProj( scope, "def-ns" );
        var qualify = mkScope.getProj( scope, "qualify" );
        if ( !(uniqueNs instanceof SinkForeign
            && uniqueNs.purpose === "ns") )
            throw new Error();
        if ( !(defNs instanceof SinkForeign
            && defNs.purpose === "ns") )
            throw new Error();
        
        return {
            uniqueNs: uniqueNs.foreignVal,
            definitionNs: defNs.foreignVal,
            qualify: qualify
        };
    }
    
    function addMacro(
        macroDefNs, rawMode, name, claim, macroFunctionImpl ) {
        
        collectPutDefinedValue( rawMode,
            getMacroFunctionDefiner( macroDefNs, name ),
            sinkFnPure( function ( rt, callerScope ) {
                return sinkFnPure( function ( rt, myStxDetails ) {
                    return sinkFnPure( function ( rt, body ) {
                        return new SinkFn( function ( rt, then ) {
                            var nss = parseScope( callerScope );
                            
                            return macLookupThen(
                                macroFunctionImpl( myStxDetails, body,
                                    function ( code ) {
                                    
                                    return then.callSink( rt,
                                        new SinkCexpr( code ) );
                                } ),
                                function ( effectsImpl ) {
                                
                                return macLookupRet(
                                    new SinkForeign( "effects", function ( rawMode ) {
                                        return effectsImpl( rawMode,
                                            nssClaim( rawMode, nss, claim ) );
                                    } ) );
                            } );
                        } );
                    } );
                } );
            } ) );
    }
    function addPureMacro(
        definitionNs, rawMode, name, claim, macroFunctionImpl ) {
        
        addMacro( definitionNs, rawMode, name, claim,
            function ( myStxDetails, body, then ) {
            
            return macLookupRet(
                macroFunctionImpl( myStxDetails, body, then ) );
        } );
    }
    
    function makeDummyMode() {
        return {
            type: "dummy-mode",
            unitTestId: null,
            contributingOnlyTo: sinkNameSetAll(),
            current: true,
            putDefined: [],
            putListener: []
        };
    }
    function commitDummyMode( namespaceDefs, rawMode ) {
        if ( rawMode.type !== "dummy-mode" )
            throw new Error();
        var listenersFired = runPuts( namespaceDefs, rt, rawMode );
        if ( listenersFired.length !== 0 )
            throw new Error();
    }
    
    function addCoreMacros( namespaceDefs, targetDefNs, funcDefNs ) {
        var dummyMode = makeDummyMode();
        
        function mac( name, body ) {
            var strName = sinkForeignStrFromJs( name );
            var qualifiedName =
                sinkNameQualify(
                    mkMacroOccurrence.ofNow( strName ).getName() );
            addPureMacro( targetDefNs, dummyMode, qualifiedName,
                [ "claim:primitive", name ], body );
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
            var repMainTagName = [ "n:main-core", sourceMainTagName ];
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
            processDefStruct( targetDefNs, dummyMode,
                macroMainTagName,
                sourceMainTagName, repMainTagName, [] );
        }
        function fun( name, body ) {
            effectfulFun( name, function ( rt, argVal ) {
                return macLookupRet( body( rt, argVal ) );
            } );
        }
        
        collectPutDefinedValue( dummyMode,
            getFunctionImplementationsDefiner( targetDefNs ),
            new SinkForeign( "ns", funcDefNs ) );
        
        mac( "def-struct", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            
            return function ( rawMode, nss ) {
                return stxToConstructorNames( rt, nss,
                    mkCons.getProj( body, "car" ),
                    function ( macroMainTagName, sourceMainTagName ) {
                
                return loop( [], body1 );
                function loop( projSourceToRep, remainingBody ) {
                    if ( mkNil.tags( remainingBody ) ) {
                        var repMainTagName =
                            [ "n:main", sourceMainTagName,
                                nss.uniqueNs.name ];
                        processDefStruct( nss.definitionNs, rawMode,
                            macroMainTagName,
                            sourceMainTagName, repMainTagName,
                            projSourceToRep );
                        
                        return macLookupThenRunEffects( rawMode,
                            then( mkNil.of() ) );
                    } else if ( mkCons.tags( remainingBody ) ) {
                        return stxToName( rt, nss,
                            mkCons.getProj( remainingBody, "car" ),
                            function ( string ) {
                                return mkProjectionOccurrence.ofNow(
                                    string, new SinkForeign( "name", repMainTagName ) );
                            },
                            function ( source ) {
                            
                            return loop(
                                [ {
                                    source: source,
                                    rep: [ "n:proj", source, repMainTagName, nss.uniqueNs.name ]
                                } ].concat( projSourceToRep ),
                                mkCons.getProj( remainingBody,
                                    "cdr" ) );
                        } );
                    } else {
                        throw new Error();
                    }
                }
                
                } );
            };
        } );
        
        mac( "defn", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            if ( !mkCons.tags( body1 ) )
                throw new Error();
            
            return function ( rawMode, nss ) {
                return stxToConstructorNames( rt, nss,
                    mkCons.getProj( body, "car" ),
                    function ( macroMainTagName, sourceMainTagName ) {
                return stxToName( rt, nss,
                    mkCons.getProj( body1, "car" ),
                    function ( string ) {
                        return mkLocalOccurrence.ofNow( string );
                    },
                    function ( firstArg ) {
                
                var repMainTagName =
                    [ "n:main", sourceMainTagName,
                        nssGet( nss, "constructor" ).uniqueNs.name ];
                processDefStruct( nss.definitionNs, rawMode,
                    macroMainTagName,
                    sourceMainTagName, repMainTagName, [] );
                return processFn( rt, nssGet( nss, "body" ), rawMode,
                    body1,
                    function ( rawMode, processedFn ) {
                    
                    collectDefer( rawMode, {}, function ( rawMode ) {
                        return macLookupThen(
                            macLookupGet(
                                getFunctionImplementationsDefiner(
                                    nss.definitionNs ) ),
                            function ( funcDefNs ) {
                            
                            if ( !(funcDefNs instanceof SinkForeign
                                && funcDefNs.purpose === "ns") )
                                throw new Error();
                            
                            addDefun( rt, funcDefNs.foreignVal,
                                rawMode,
                                repMainTagName,
                                firstArg,
                                cgenCall( processedFn,
                                    new CexprVar( firstArg ) ) );
                            
                            return macLookupRet(
                                sinkForeignEffectsNil );
                        } );
                    } );
                    
                    return macLookupThenRunEffects( rawMode,
                        then( mkNil.of() ) );
                } );
                
                } );
                } );
            };
        } );
        
        mac( "def-macro", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            if ( !mkCons.tags( body1 ) )
                throw new Error();
            
            return function ( rawMode, nss ) {
                return stxToName( rt, nss,
                    mkCons.getProj( body, "car" ),
                    function ( string ) {
                        return mkMacroOccurrence.ofNow( string );
                    },
                    function ( name ) {
                return processFn( rt, nss, rawMode, body1,
                    function ( rawMode, processedFn ) {
                return macLookupThen(
                    cgenExecute( rt,
                        cexprToSloppyJsCode( processedFn ) ),
                    function ( executedFn ) {
                return macLookupThen(
                    executedFn.callSink( rt,
                        mkScope.ofNow(
                            new SinkForeign( "ns", nss.uniqueNs ),
                            new SinkForeign( "ns", nss.definitionNs ),
                            nss.qualify ) ),
                    function ( curriedFn ) {
                
                collectPutDefinedValue( rawMode,
                    getMacroFunctionDefiner( nss.definitionNs, name ),
                    curriedFn );
                
                return macLookupThenRunEffects( rawMode,
                    then( mkNil.of() ) );
                
                } );
                } );
                } );
                } );
            };
        } );
        
        // TODO: See if we should design a different approach to unit
        // tests. Perhaps the results should be installed as
        // definitions somewhere. Perhaps we should be able to control
        // the order.
        //
        // TODO: Make this expand multiple expressions concurrently.
        //
        mac( "test-async", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            if ( !mkCons.tags( body1 ) )
                throw new Error();
            var body2 = mkCons.getProj( body1, "cdr" );
            if ( !mkCons.tags( body2 ) )
                throw new Error();
            var body3 = mkCons.getProj( body2, "cdr" );
            if ( mkCons.tags( body3 ) )
                throw new Error();
            
            return function ( rawMode, nss ) {
                
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
                                cgenExecute( rt,
                                    cexprToSloppyJsCode( expanded ) ),
                                function ( evaluated ) {
                                
                                return then( rawMode, evaluated );
                            } );
                        } );
                    } );
                    
                    return macLookupRet( mkNil.ofNow() );
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
                        unitTestId: rawMode.unitTestId,
                        visit: null,
                        dexAndValue: null
                    };
                    
                    collectDefer( rawMode, {}, function ( rawMode ) {
                        return macLookupThen(
                            macLookupGet( definer, function () {
                                throw new Error(
                                    "Never completed a side of a test-async" );
                            } ),
                            function ( defined ) {
                            
                            return macLookupRet(
                                new SinkForeign( "effects",
                                    function ( rawMode ) {
                                
                                return then( rawMode, defined );
                            } ) );
                            
                        } );
                    } );
                    
                    return macLookupThenRunEffects( rawMode,
                        evaluated.callSink( rt,
                            new SinkForeign( "definer", definer ) ) );
                    
                    } );
                    } );
                    } );
                }
                
                makeEvalExpr( nssGet( nss, "dex" ), rawMode,
                    mkCons.getProj( body, "car" ),
                    function ( rawMode, evalDex ) {
                return makeEvalExprAndRun( nssGet( nss, "a" ),
                    rawMode,
                    mkCons.getProj( body1, "car" ),
                    function ( rawMode, evalA ) {
                return makeEvalExprAndRun( nssGet( nss, "b" ),
                    rawMode,
                    mkCons.getProj( body2, "car" ),
                    function ( rawMode, evalB ) {
                
                collectDefer( rawMode, {
                    type: "unit-test",
                    unitTestId: nssGet( nss, "dex" ).uniqueNs.name,
                    contributingOnlyTo: sinkNameSetEmpty()
                }, function ( rawMode ) {
                return macLookupRet(
                    new SinkForeign( "effects", function ( rawMode ) {
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
                
                return macLookupRet( mkNil.ofNow() );
                
                } );
                } );
                } );
                } );
                } );
                } ) );
                } );
                
                return macLookupRet( mkNil.ofNow() );
                
                } );
                } );
                } );
                
                return macLookupThenRunEffects( rawMode,
                    then( mkNil.of() ) );
            };
        } );
        
        mac( "case", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            return function ( rawMode, nss ) {
                return cgenCaseletForRunner( nss, rawMode, null,
                    mkCons.getProj( body, "car" ),
                    mkCons.getProj( body, "cdr" ),
                    then );
            };
        } );
        
        mac( "caselet", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            if ( !mkCons.tags( body1 ) )
                throw new Error();
            
            return function ( rawMode, nss ) {
                return stxToName( rt, nss,
                    mkCons.getProj( body, "car" ),
                    function ( string ) {
                        return mkLocalOccurrence.ofNow( string );
                    },
                    function ( va ) {
                    
                    return cgenCaseletForRunner( nss, rawMode,
                        { val: va },
                        mkCons.getProj( body1, "car" ),
                        mkCons.getProj( body1, "cdr" ),
                        then );
                } );
            };
        } );
        
        mac( "cast", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            return function ( rawMode, nss ) {
                return cgenCast( nss, rawMode,
                    mkCons.getProj( body, "car" ),
                    mkCons.getProj( body, "cdr" ),
                    then );
            };
        } );
        
        mac( "c", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            
            return function ( rawMode, nss ) {
                var funcNss = nssGet( nss, "func" );
                // TODO: Make this expand multiple subexpressions
                // concurrently.
                return macroexpand( nssGet( funcNss, "unique" ),
                    rawMode,
                    mkCons.getProj( body, "car" ),
                    nssGet( funcNss, "outbox" ).uniqueNs,
                    function ( rawMode, expandedFunc ) {
                return macroexpandConsListToArr(
                    nssGet( nss, "args" ),
                    rawMode,
                    mkCons.getProj( body, "cdr" ),
                    function ( rawMode, expandedArgs ) {
                
                return macLookupThenRunEffects( rawMode,
                    then(
                        cgenCallArr( expandedFunc, expandedArgs ) ) );
                
                } );
                } );
            };
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
        
        function assertValidDexable( rt, x, then ) {
            if ( !mkDexable.tags( x ) )
                throw new Error();
            
            var dex = mkDexable.getProj( x, "dex" );
            var val = mkDexable.getProj( x, "val" );
            
            return rt.dexHas( dex, val, function ( has ) {
                if ( !has )
                    throw new Error();
                
                return then( val );
            } );
        }
        
        effectfulFun( "follow-heart", function ( rt, clamor ) {
            return macLookupFollowHeart( clamor );
        } );
        
        // OPTIMIZATION: While `err` could be derived instead of built
        // in, that seems to slow things down too much.
        mac( "err", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            if ( mkCons.tags( mkCons.getProj( body, "cdr" ) ) )
                throw new Error();
            return function ( rawMode, nss ) {
                return macLookupThenRunEffects( rawMode,
                    then(
                        new CexprErr(
                            stxToDefiniteString(
                                mkCons.getProj(
                                    body, "car" ) ).jsStr ) ) );
            };
        } );
        
        mac( "str", function ( myStxDetails, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            if ( mkCons.tags( mkCons.getProj( body, "cdr" ) ) )
                throw new Error();
            return function ( rawMode, nss ) {
                return macLookupThenRunEffects( rawMode,
                    then(
                        new CexprReified(
                            stxToDefiniteSinkString(
                                mkCons.getProj(
                                    body, "car" ) ) ) ) );
            };
        } );
        
        // NOTE:
        //
        // Conceptually, `fn` looks up a sub-namespace by a standard
        // key from the unique namespace it's expanded in, and that
        // sub-namespace's name is the constructor name it uses. The
        // standard key is consistent in every `fn` invocation, but it
        // is not directly available to Cene progams.
        //
        // What actually happens in this implementation is that `fn`
        // creates a `SinkFn` value which directly refers to a
        // JavaScript function call implementation, and no constructor
        // name is needed at all. This allows us to compile a Cene
        // program so that each `fn` becomes a JavaScript's anonymous
        // function, which seems to lead to better performance.
        //
        // These two semantic models are indistinguishable from Cene
        // code.
        //
        mac( "fn", function ( myStxDetails, body, then ) {
            return function ( rawMode, nss ) {
                return processFn( rt, nss, rawMode, body,
                    function ( rawMode, processedFn ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then( processedFn ) );
                } );
            };
        } );
        
        mac( "let", function ( myStxDetails, body, then ) {
            return function ( rawMode, nss ) {
                return loop( rawMode, nss, 0,
                    body, nssGet( nss, "bindings" ), [],
                    function ( rawMode, code ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then( code ) );
                } );
            };
            
            function loop( rawMode, nss, i,
                remainingBody, bindingsNss, bindings,
                then ) {
                
                if ( !mkCons.tags( remainingBody ) )
                    throw new Error();
                var remainingBody1 =
                    mkCons.getProj( remainingBody, "cdr" );
                if ( !mkCons.tags( remainingBody1 ) ) {
                    var bodyNss = nssGet( nss, "body" );
                    return macroexpand( nssGet( bodyNss, "unique" ),
                        rawMode,
                        mkCons.getProj( remainingBody, "car" ),
                        nssGet( bodyNss, "outbox" ).uniqueNs,
                        function ( rawMode, body ) {
                        
                        return then( rawMode,
                            new CexprLet( bindings, body ) );
                    } );
                }
                
                return stxToName( rt, nss,
                    mkCons.getProj( remainingBody, "car" ),
                    function ( string ) {
                        return mkLocalOccurrence.ofNow( string );
                    },
                    function ( va ) {
                
                var firstNss = nssGet( bindingsNss, "first" );
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    mkCons.getProj( remainingBody1, "car" ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, bindingVal ) {
                    
                    return loop( rawMode, nss, i + 1,
                        mkCons.getProj( remainingBody1, "cdr" ),
                        nssGet( bindingsNss, "rest" ),
                        bindings.concat(
                            [ { k: va, v: bindingVal } ] ),
                        then );
                } );
                
                } );
            }
        } );
        
        // TODO: Make this expand multiple subexpressions
        // concurrently.
        function structMapper( body, then, CexprConstructor ) {
            
            if ( !mkCons.tags( body ) )
                throw new Error();
            
            return function ( rawMode, nss ) {
                return stxToName( rt, nss,
                    mkCons.getProj( body, "car" ),
                    function ( string ) {
                        return mkConstructorOccurrence.ofNow(
                            string );
                    },
                    function ( sourceMainTagNameRep ) {
                return macLookupThen(
                    getStruct( nss.definitionNs,
                        sourceMainTagNameRep ),
                    function ( struct ) {
                
                return loop( nss, rawMode, struct, 0, null,
                    mkCons.getProj( body, "cdr" ) );
                
                } );
                } );
            };
            
            function loop( nss, rawMode, struct, i, revProjVals,
                remainingBody ) {
                
                var n = struct.unsortedProjNames.length;
                if ( n <= i )
                    return next( rawMode, struct,
                        revProjVals, remainingBody );
                
                if ( !mkCons.tags( remainingBody ) )
                    throw new Error(
                        "Expected more arguments to " +
                        JSON.stringify( sourceMainTagNameRep ) );
                
                var firstNss = nssGet( nss, "first" );
                
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    mkCons.getProj( remainingBody, "car" ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, projVal ) {
                    
                    return loop( nssGet( nss, "rest" ), rawMode,
                        struct,
                        i + 1,
                        { first:
                            { name: struct.unsortedProjNames[ i ].rep,
                                expr: projVal },
                            rest: revProjVals },
                        mkCons.getProj( remainingBody, "cdr" ) );
                } );
            }
            
            function next(
                rawMode, struct, revProjVals, remainingBody ) {
                
                if ( mkCons.tags( remainingBody ) )
                    throw new Error();
                
                return macLookupThenRunEffects( rawMode,
                    then(
                        new CexprConstructor( struct.repMainTagName,
                            revJsListToArr( revProjVals ) ) ) );
            }
        }
        
        mac( "cline-struct", function ( myStxDetails, body, then ) {
            return structMapper( body, then, CexprClineStruct );
        } );
        
        fun( "cline-by-dex", function ( rt, dex ) {
            return new SinkClineByDex( dex );
        } );
        
        fun( "cline-default", function ( rt, first ) {
            return sinkFnPure( function ( rt, second ) {
                return new SinkClineDefault( first, second );
            } );
        } );
        
        fun( "cline-give-up", function ( rt, ignored ) {
            return new SinkClineGiveUp();
        } );
        
        fun( "dex-by-cline", function ( rt, cline ) {
            return new SinkDexByCline( cline );
        } );
        
        fun( "dex-cline", function ( rt, ignored ) {
            return new SinkDexCline();
        } );
        
        fun( "dex-dex", function ( rt, ignored ) {
            return new SinkDexDex();
        } );
        
        fun( "dex-merge", function ( rt, ignored ) {
            return new SinkDexMerge();
        } );
        
        fun( "dex-fuse", function ( rt, ignored ) {
            return new SinkDexFuse();
        } );
        
        fun( "dex-name", function ( rt, ignored ) {
            return new SinkDexName();
        } );
        
        fun( "dex-string", function ( rt, ignored ) {
            return new SinkDexString();
        } );
        
        effectfulFun( "cline-by-own-method",
            function ( rt, dexableGetMethod ) {
            
            return assertValidDexable( rt, dexableGetMethod,
                function ( getMethod ) {
                
                return macLookupRet(
                    new SinkClineByOwnMethod( dexableGetMethod ) );
            } );
        } );
        
        effectfulFun( "cline-fix", function ( rt, dexableUnwrap ) {
            return assertValidDexable( rt, dexableUnwrap,
                function ( unwrap ) {
                
                return macLookupRet(
                    new SinkClineFix( dexableUnwrap ) );
            } );
        } );
        
        fun( "dex-table", function ( rt, dexVal ) {
            if ( dexVal.affiliation !== "dex" )
                throw new Error();
            return new SinkDexTable( dexVal );
        } );
        
        fun( "cline-int", function ( rt, ignored ) {
            return new SinkClineInt();
        } );
        
        fun( "call-cline", function ( rt, cline ) {
            return sinkFnPure( function ( rt, a ) {
                return new SinkFn( function ( rt, b ) {
                    if ( cline.affiliation !== "cline" )
                        throw new Error();
                    
                    return rt.dexHas( cline, a, function ( hasA ) {
                        if ( !hasA )
                            return macLookupRet( mkNil.ofNow() );
                    
                    return rt.dexHas( cline, b, function ( hasB ) {
                        if ( !hasB )
                            return macLookupRet( mkNil.ofNow() );
                    
                    return cline.callCline( rt, a, b );
                    
                    } );
                    
                    } );
                } );
            } );
        } );
        
        fun( "in-cline", function ( rt, cline ) {
            return new SinkFn( function ( rt, x ) {
                if ( cline.affiliation !== "cline" )
                    throw new Error();
                return cline.dexHas( rt, x );
            } );
        } );
        
        effectfulFun( "name-of", function ( rt, dexable ) {
            return assertValidDexable( rt, dexable, function ( x ) {
                return macLookupRet(
                    new SinkForeign( "name", x.getName() ) );
            } );
        } );
        
        fun( "merge-by-dex", function ( rt, dex ) {
            return new SinkMergeByDex( dex );
        } );
        
        mac( "merge-struct", function ( myStxDetails, body, then ) {
            return structMapper( body, then, CexprMergeStruct );
        } );
        
        fun( "merge-default", function ( rt, first ) {
            return sinkFnPure( function ( rt, second ) {
                return new SinkFuseDefault( "n:merge-default",
                    "merge-default", "merge",
                    first, second );
            } );
        } );
        
        effectfulFun( "merge-by-own-method",
            function ( rt, dexableGetMethod ) {
            
            return assertValidDexable( rt, dexableGetMethod,
                function ( getMethod ) {
                
                return macLookupRet(
                    new SinkFuseByOwnMethod( "n:merge-by-own-method",
                        "merge-by-own-method", "merge",
                        dexableGetMethod ) );
            } );
        } );
        
        effectfulFun( "merge-fix", function ( rt, dexableUnwrap ) {
            return assertValidDexable( rt, dexableUnwrap,
                function ( unwrap ) {
                
                return macLookupRet(
                    new SinkFuseFix( "n:merge-fix", "merge-fix",
                        "merge",
                        dexableUnwrap ) );
            } );
        } );
        
        fun( "merge-table", function ( rt, mergeVal ) {
            return new SinkFuseTable( "n:merge-table", "merge-table",
                "merge",
                mergeVal );
        } );
        
        fun( "call-merge", function ( rt, merge ) {
            return sinkFnPure( function ( rt, a ) {
                return new SinkFn( function ( rt, b ) {
                    if ( merge.affiliation !== "merge" )
                        throw new Error();
                    return merge.fuse( rt, a, b );
                } );
            } );
        } );
        
        fun( "fuse-by-merge", function ( rt, merge ) {
            return new SinkFuseByMerge( merge );
        } );
        
        mac( "fuse-struct", function ( myStxDetails, body, then ) {
            return structMapper( body, then, CexprFuseStruct );
        } );
        
        fun( "fuse-default", function ( rt, first ) {
            return sinkFnPure( function ( rt, second ) {
                return new SinkFuseDefault( "n:fuse-default",
                    "fuse-default", "fuse",
                    first, second );
            } );
        } );
        
        effectfulFun( "fuse-by-own-method",
            function ( rt, dexableGetMethod ) {
            
            return assertValidDexable( rt, dexableGetMethod,
                function ( getMethod ) {
                
                return macLookupRet(
                    new SinkFuseByOwnMethod( "n:fuse-by-own-method",
                        "fuse-by-own-method", "fuse",
                        dexableGetMethod ) );
            } );
        } );
        
        effectfulFun( "fuse-fix", function ( rt, dexableUnwrap ) {
            return assertValidDexable( rt, dexableUnwrap,
                function ( unwrap ) {
                
                return macLookupRet(
                    new SinkFuseFix( "n:fuse-fix", "fuse-fix", "fuse",
                        dexableUnwrap ) );
            } );
        } );
        
        fun( "fuse-table", function ( rt, fuseVal ) {
            return new SinkFuseTable( "n:fuse-table", "fuse-table",
                "fuse",
                fuseVal );
        } );
        
        fun( "fuse-int-by-plus", function ( rt, ignored ) {
            return new SinkFuseIntByPlus();
        } );
        
        fun( "fuse-int-by-times", function ( rt, ignored ) {
            return new SinkFuseIntByTimes();
        } );
        
        fun( "call-fuse", function ( rt, fuse ) {
            return sinkFnPure( function ( rt, a ) {
                return new SinkFn( function ( rt, b ) {
                    if ( fuse.affiliation !== "fuse" )
                        throw new Error();
                    return fuse.fuse( rt, a, b );
                } );
            } );
        } );
        
        fun( "table-empty", function ( rt, ignored ) {
            return new SinkForeign( "table", jsnMap() );
        } );
        
        fun( "table-shadow", function ( rt, key ) {
            return sinkFnPure( function ( rt, maybeVal ) {
                return sinkFnPure( function ( rt, table ) {
                    if ( !(key instanceof SinkForeign
                        && key.purpose === "name") )
                        throw new Error();
                    if ( !(table instanceof SinkForeign
                        && table.purpose === "table") )
                        throw new Error();
                    
                    if ( mkNil.tags( maybeVal ) )
                        return new SinkForeign( "table",
                            table.foreignVal.minusEntry(
                                key.foreignVal ) );
                    if ( mkYep.tags( maybeVal ) )
                        return new SinkForeign( "table",
                            table.foreignVal.plusEntry(
                                key.foreignVal,
                                mkYep.getProj( maybeVal, "val" ) ) );
                    throw new Error();
                } );
            } );
        } );
        
        fun( "table-get", function ( rt, key ) {
            return sinkFnPure( function ( rt, table ) {
                if ( !(key instanceof SinkForeign
                    && key.purpose === "name") )
                    throw new Error();
                var k = key.foreignVal;
                
                if ( !(table instanceof SinkForeign
                    && table.purpose === "table") )
                    throw new Error();
                
                if ( table.foreignVal.has( k ) )
                    return mkYep.ofNow( table.foreignVal.get( k ) );
                else
                    return mkNil.ofNow();
            } );
        } );
        
        fun( "table-zip", function ( rt, a ) {
            return sinkFnPure( function ( rt, b ) {
                return new SinkFn( function ( rt, combiner ) {
                    if ( !(a instanceof SinkForeign
                        && a.purpose === "table") )
                        throw new Error();
                    if ( !(b instanceof SinkForeign
                        && b.purpose === "table") )
                        throw new Error();
                    
                    var entries = [];
                    a.foreignVal.plus( b.foreignVal ).each(
                        function ( k, v ) {
                        
                        function get( table ) {
                            var v = table.get( k );
                            return v === void 0 ?
                                mkNil.ofNow() :
                                mkYep.ofNow( v );
                        }
                        entries.push(
                            { k: k, a: get( a ), b: get( b ) } );
                    } );
                    var n = entries.length;
                    return loop( 0, jsnMap() );
                    function loop( i, table ) {
                        if ( n <= i )
                            return macLookupRet(
                                new SinkForeign( "table", table ) );
                        var entry = entries[ i ];
                        return macLookupThen(
                            callSinkMulti( rt, combiner,
                                new SinkForeign( "table",
                                    jsnMap().plusEntry(
                                        entry.k, mkNil.ofNow() ) ),
                                entry.a,
                                entry.b ),
                            function ( v ) {
                            
                            if ( mkNil.tags( v ) )
                                return loop( i + 1, table );
                            else if ( mkYep.tags( v ) )
                                return loop( i + 1,
                                    table.plusEntry( entry.k, mkYep.getProj( v, "val" ) ) );
                            else
                                throw new Error();
                        } );
                    }
                } );
            } );
        } );
        
        fun( "tables-fuse", function ( rt, a ) {
            return sinkFnPure( function ( rt, b ) {
                return new SinkFn( function ( rt, fuse ) {
                    if ( !(a instanceof SinkForeign
                        && a.purpose === "table") )
                        throw new Error();
                    if ( !(b instanceof SinkForeign
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
                        return macLookupret( mkNil.ofNow() );
                    return loop( 1, vals[ 0 ] );
                    function loop( i, state ) {
                        if ( n <= i )
                            return macLookupRet(
                                mkYep.ofNow( state ) );
                        return macLookupThen(
                            fuse.fuse( rt, state, vals[ i ] ),
                            function ( state ) {
                            
                            if ( !mkYep.tags( state ) )
                                return macLookupRet( mkNil.ofNow() );
                            
                            return loop( i + 1,
                                mkYep.getProj( state, "val" ) );
                        } );
                    }
                } );
            } );
        } );
        
        fun( "int-zero", function ( rt, ignored ) {
            return sinkForeignInt( 0 );
        } );
        
        fun( "int-one", function ( rt, ignored ) {
            return sinkForeignInt( 1 );
        } );
        
        fun( "int-minus", function ( rt, a ) {
            return sinkFnPure( function ( rt, b ) {
                if ( !(a instanceof SinkForeign
                    && a.purpose === "int") )
                    throw new Error();
                if ( !(b instanceof SinkForeign
                    && b.purpose === "int") )
                    throw new Error();
                return sinkForeignInt( a.foreignVal - b.foreignVal );
            } );
        } );
        
        fun( "int-div-rounded-down", function ( rt, a ) {
            return sinkFnPure( function ( rt, b ) {
                if ( !(a instanceof SinkForeign
                    && a.purpose === "int") )
                    throw new Error();
                if ( !(b instanceof SinkForeign
                    && b.purpose === "int") )
                    throw new Error();
                
                if ( b.foreignVal === 0 )
                    return mkNil.ofNow();
                
                var div = Math.floor( a.foreignVal / b.foreignVal );
                var mod = a.foreignVal - div * b.foreignVal;
                return mkCarried.ofNow(
                    sinkForeignInt( div ),
                    sinkForeignInt( mod ) );
            } );
        } );
        
        fun( "string-length", function ( rt, string ) {
            var stringInternal = parseString( string ).paddedStr;
            if ( stringInternal.length % 2 !== 0 )
                throw new Error();
            return sinkForeignInt( stringInternal.length / 2 );
        } );
        
        fun( "string-empty", function ( rt, ignored ) {
            return sinkForeignStrFromJs( "" );
        } );
        
        fun( "string-singleton", function ( rt, unicodeScalar ) {
            if ( !(unicodeScalar instanceof SinkForeign
                && unicodeScalar.purpose === "int") )
                throw new Error();
            
            var result =
                unicodeCodePointToString( unicodeScalar.foreignVal );
            if ( result === null )
                throw new Error();
            
            return sinkForeignStrFromJs( result );
        } );
        
        function callSinkLater( rt, func, var_args ) {
            var args = [].slice.call( arguments, 2 );
            return new SinkForeign( "effects", function ( rawMode ) {
                collectDefer( rawMode, {}, function ( rawMode ) {
                    return callSinkMulti.apply( null,
                        [ rt, func ].concat( args ) );
                } );
                return macLookupRet( mkNil.ofNow() );
            } );
        }
        
        fun( "string-cut-later", function ( rt, string ) {
            return sinkFnPure( function ( rt, start ) {
                return sinkFnPure( function ( rt, stop ) {
                    return sinkFnPure( function ( rt, then ) {
                        
                        var stringInternal =
                            parseString( string ).paddedStr;
                        
                        if ( !(start instanceof SinkForeign
                            && start.purpose === "int") )
                            throw new Error();
                        var startInternal = start.foreignVal;
                        if ( !(stop instanceof SinkForeign
                            && stop.purpose === "int") )
                            throw new Error();
                        var stopInternal = stop.foreignVal;
                        
                        if ( !(0 <= startInternal
                            && startInternal <= stopInternal
                            && stopInternal * 2 <=
                                stringInternal.length) )
                            throw new Error();
                        
                        return callSinkLater( rt, then,
                            sinkForeignStrFromPadded(
                                stringInternal.substring(
                                    startInternal * 2, stopInternal * 2 ) ) );
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
            return sinkFnPure( function ( rt, start ) {
                var stringInternal = parseString( string ).paddedStr;
                
                if ( !(start instanceof SinkForeign
                    && start.purpose === "int") )
                    throw new Error();
                var startInternal = start.foreignVal;
                
                if ( !(0 <= startInternal
                    && startInternal * 2 < stringInternal.length) )
                    throw new Error();
                
                return sinkForeignInt(
                    parseSingleUnicodeScalar(
                        sinkForeignStrFromPadded(
                            stringInternal.substring(
                                startInternal * 2,
                                (startInternal + 1) * 2 ) ) ) );
            } );
        } );
        
        fun( "string-append-later", function ( rt, a ) {
            return sinkFnPure( function ( rt, b ) {
                return sinkFnPure( function ( rt, then ) {
                    var aInternal = parseString( a ).paddedStr;
                    var bInternal = parseString( b ).paddedStr;
                    
                    return callSinkLater( rt, then,
                        sinkForeignStrFromPadded(
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
            return new SinkForeign( "regex", function () {
                return regexTrivial( "\\d^" );
            } );
        } );
        
        fun( "regex-empty", function ( rt, ignored ) {
            return new SinkForeign( "regex", function () {
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
            
            return new SinkForeign( "regex", function () {
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
            
            return new SinkForeign( "regex", function () {
                return regexOptionalTrivial( "(?:\\d^" +
                    stringRep.replace( /[\d\D]{2}/g,
                        function ( scalarStr, i, stringRep ) {
                            return "|" + escapeRegex( scalarStr );
                        } ) + ")" );
            } );
        } );
        
        fun( "regex-one-in-range", function ( rt, a ) {
            return sinkFnPure( function ( rt, b ) {
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
                
                return new SinkForeign( "regex", function () {
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
            return new SinkForeign( "regex", function () {
                return regexOptionalTrivial( "[\\d\\D]{2}" );
            } );
        } );
        
        function compileRegex( regex ) {
            if ( !(regex instanceof SinkForeign
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
                    var compiled = new RegExp(
                        "(?:" +
                            necessary + "()|" +
                            optional( "" ) + "()|)",
                        "g" );
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
            return sinkFnPure( function ( rt, thenRegex ) {
                return sinkFnPure( function ( rt, elseRegex ) {
                    if ( !(conditionRegex instanceof SinkForeign
                        && conditionRegex.purpose === "regex") )
                        throw new Error();
                    if ( !(thenRegex instanceof SinkForeign
                        && thenRegex.purpose === "regex") )
                        throw new Error();
                    if ( !(elseRegex instanceof SinkForeign
                        && elseRegex.purpose === "regex") )
                        throw new Error();
                    
                    return new SinkForeign( "regex", function () {
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
            return sinkFnPure( function ( rt, bodyRegex ) {
                if ( !(conditionRegex instanceof SinkForeign
                    && conditionRegex.purpose === "regex") )
                    throw new Error();
                if ( !(bodyRegex instanceof SinkForeign
                    && bodyRegex.purpose === "regex") )
                    throw new Error();
                
                return new SinkForeign( "regex", function () {
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
            return sinkFnPure( function ( rt, conditionRegex ) {
                if ( !(bodyRegex instanceof SinkForeign
                    && bodyRegex.purpose === "regex") )
                    throw new Error();
                if ( !(conditionRegex instanceof SinkForeign
                    && conditionRegex.purpose === "regex") )
                    throw new Error();
                
                return new SinkForeign( "regex", function () {
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
            return sinkFnPure( function ( rt, then ) {
                if ( !(regex instanceof SinkForeign
                    && regex.purpose === "regex") )
                    throw new Error();
                var compiled = compileRegex( regex ).makeFunc();
                
                return callSinkLater( rt, then,
                    new SinkForeign( "optimized-regex", compiled ) );
            } );
        } );
        
        fun( "optimized-regex-match-later",
            function ( rt, optimizedRegex ) {
            
            return sinkFnPure( function ( rt, string ) {
                return sinkFnPure( function ( rt, start ) {
                    return sinkFnPure( function ( rt, stop ) {
                        return sinkFnPure( function ( rt, then ) {
                            
                            if ( !(optimizedRegex instanceof
                                    SinkForeign
                                && optimizedRegex.purpose ===
                                    "optimized-regex") )
                                throw new Error();
                            var regexFunc = optimizedRegex.foreignVal;
                            
                            var stringInternal =
                                parseString( string ).paddedStr;
                            
                            if ( !(start instanceof SinkForeign
                                && start.purpose === "int") )
                                throw new Error();
                            var startI = start.foreignVal;
                            
                            if ( !(stop instanceof SinkForeign
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
                                    mkRegexResultMatched.ofNow( sinkForeignInt( funcResult.stop ) );
                            else if ( funcResult.type === "failed" )
                                var result =
                                    mkRegexResultFailed.ofNow();
                            else if (
                                funcResult.type === "passedEnd" )
                                var result =
                                    mkRegexResultPassedEnd.ofNow();
                            else
                                throw new Error();
                            
                            return callSinkLater( rt, then, result );
                        } );
                    } );
                } );
            } );
        } );
        
        fun( "cexpr-var", function ( rt, va ) {
            if ( !(va instanceof SinkForeign
                && va.purpose === "name") )
                throw new Error();
            
            return new SinkCexpr( new CexprVar( va.foreignVal ) );
        } );
        
        fun( "cexpr-reified", function ( rt, val ) {
            return new SinkCexpr( new CexprReified( val ) );
        } );
        
        fun( "cexpr-let", function ( rt, bindings ) {
            return sinkFnPure( function ( rt, body ) {
                
                var varsSeen = jsnMap();
                var bindingsArr =
                    mapConsListToArr( bindings, function ( binding ) {
                        if ( !mkAssoc.tags( binding ) )
                            throw new Error();
                        var k = mkAssoc.getProj( binding, "key" );
                        var v = mkAssoc.getProj( binding, "val" );
                        if ( !(k instanceof SinkForeign
                            && k.purpose === "name") )
                            throw new Error();
                        if ( !(v instanceof SinkCexpr) )
                            throw new Error();
                        
                        if ( varsSeen.has( k.foreignVal ) )
                            throw new Error();
                        varsSeen.add( k.foreignVal );
                        
                        return { k: k.foreignVal, v: v.cexpr };
                    } );
                
                if ( !(body instanceof SinkCexpr) )
                    throw new Error();
                
                return new SinkCexpr(
                    new CexprLet( bindingsArr, body.cexpr ) );
            } );
        } );
        
        fun( "cexpr-call", function ( rt, func ) {
            return sinkFnPure( function ( rt, arg ) {
                if ( !(func instanceof SinkCexpr) )
                    throw new Error();
                if ( !(arg instanceof SinkCexpr) )
                    throw new Error();
                
                return new SinkCexpr(
                    new CexprCall( func.cexpr, arg.cexpr ) );
            } );
        } );
        
        fun( "cexpr-case", function ( rt, subject ) {
            return sinkFnPure( function ( rt, mainTagName ) {
                return sinkFnPure( function ( rt, bindings ) {
                    return sinkFnPure( function ( rt, then ) {
                        return sinkFnPure( function ( rt, els ) {
                            if ( !(subject instanceof SinkCexpr) )
                                throw new Error();
                            if ( !(mainTagName instanceof SinkForeign
                                && mainTagName.purpose === "name") )
                                throw new Error();
                            
                            if ( !(bindings instanceof SinkForeign
                                && bindings.purpose === "table") )
                                throw new Error();
                            var localsSeen = jsnMap();
                            var bindingsMap = bindings.foreignVal.map(
                                function ( localName, projName ) {
                                
                                if ( !(localName instanceof
                                        SinkForeign
                                    && localName.purpose === "name") )
                                    throw new Error();
                                
                                if ( localsSeen.has(
                                    localName.foreignVal ) )
                                    throw new Error();
                                localsSeen.add(
                                    localName.foreignVal );
                                return localName.foreignVal;
                            } );
                            
                            if ( !(then instanceof SinkCexpr) )
                                throw new Error();
                            if ( !(els instanceof SinkCexpr) )
                                throw new Error();
                            
                            return new SinkCexpr(
                                new CexprCase(
                                    subject.cexpr,
                                    mainTagName.foreignVal,
                                    bindingsMap,
                                    then.cexpr,
                                    els.cexpr ) );
                        } );
                    } );
                } );
            } );
        } );
        
        function makeCexprStructMapper(
            CexprStructMapper, mainTagName, projections ) {
            
            if ( !(mainTagName instanceof SinkForeign
                && mainTagName.purpose === "name") )
                throw new Error();
            
            var projNamesSeen = jsnMap();
            var projectionsArr = mapConsListToArr( projections,
                function ( projection ) {
                
                if ( !mkAssoc.tags( projection ) )
                    throw new Error();
                var projName = mkAssoc.getProj( projection, "key" );
                var expr = mkAssoc.getProj( projection, "val" );
                if ( !(projName instanceof SinkForeign
                    && projName.purpose === "name") )
                    throw new Error();
                if ( !(expr instanceof SinkCexpr) )
                    throw new Error();
                
                if ( projNamesSeen.has( projName.foreignVal ) )
                    throw new Error();
                projNamesSeen.add( projName.foreignVal );
                
                return { name: projName.foreignVal,
                    expr: expr.cexpr };
            } );
            
            return new SinkCexpr(
                new CexprStructMapper(
                    mainTagName.foreignVal, projectionsArr ) );
        }
        
        fun( "cexpr-construct", function ( rt, mainTagName ) {
            return sinkFnPure( function ( rt, projections ) {
                return makeCexprStructMapper(
                    CexprConstruct, mainTagName, projections );
            } );
        } );
        
        fun( "cexpr-cline-struct", function ( rt, mainTagName ) {
            return sinkFnPure( function ( rt, projections ) {
                return makeCexprStructMapper(
                    CexprClineStruct, mainTagName, projections );
            } );
        } );
        
        fun( "cexpr-merge-struct", function ( rt, mainTagName ) {
            return sinkFnPure( function ( rt, projections ) {
                return makeCexprStructMapper(
                    CexprMergeStruct, mainTagName, projections );
            } );
        } );
        
        fun( "cexpr-fuse-struct", function ( rt, mainTagName ) {
            return sinkFnPure( function ( rt, projections ) {
                return makeCexprStructMapper(
                    CexprFuseStruct, mainTagName, projections );
            } );
        } );
        
        fun( "eval-cexpr", function ( rt, mode ) {
            return new SinkFn( function ( rt, cexpr ) {
                assertMode( rawModeSupportsEval, mode );
                
                if ( !(cexpr instanceof SinkCexpr) )
                    throw new Error();
                
                if ( cexpr.cexpr.getFreeVars().hasAny() )
                    throw new Error();
                
                return cgenExecute( rt,
                    cexprToSloppyJsCode( cexpr.cexpr ) );
            } );
        } );
        
        // NOTE: This is the only way to establish a function behavior
        // for a struct that has more than zero projections.
        fun( "function-implementation-from-cexpr",
            function ( rt, cexpr ) {
            
            if ( !(cexpr instanceof SinkCexpr) )
                throw new Error();
            
            if ( cexpr.cexpr.getFreeVars().hasAny() )
                throw new Error();
            
            var impl = cgenExecute( rt,
                cexprToSloppyJsCode( cexpr.cexpr ) );
            
            return new SinkForeign( "native-definition", {
                cexpr: cexpr,
                func: function ( rt, func, arg ) {
                    return callSinkMulti( rt, impl, func, arg );
                }
            } );
        } );
        
        fun( "trivial-stx-details", function ( rt, ignored ) {
            return sinkTrivialStxDetails();
        } );
        
        fun( "nsset-empty", function ( rt, ignored ) {
            return new SinkForeign( "nsset", sinkNameSetEmpty() );
        } );
        
        fun( "fuse-nsset-by-union", function ( rt, ignored ) {
            return new FuseNssetByUnion();
        } );
        
        fun( "nsset-not", function ( rt, nsset ) {
            if ( !(nsset instanceof SinkForeign
                && nsset.purpose === "nsset") )
                throw new Error();
            
            return new SinkForeign( "nsset",
                sinkNameSetNot( nsset.foreignVal ) );
        } );
        
        fun( "nsset-ns-descendants", function ( rt, ns ) {
            if ( !(ns instanceof SinkForeign
                && ns.purpose === "ns") )
                throw new Error();
            
            return new SinkForeign( "nsset",
                sinkNameSetNsDescendants( ns.foreignVal ) );
        } );
        
        fun( "contributing-only-to", function ( rt, nsset ) {
            return sinkFnPure( function ( rt, effects ) {
                
                if ( !(nsset instanceof SinkForeign
                    && nsset.purpose === "nsset") )
                    throw new Error();
                var nameSet = nsset.foreignVal;
                
                if ( !(effects instanceof SinkForeign
                    && effects.purpose === "effects") )
                    throw new Error();
                
                return new SinkForeign( "effects",
                    function ( rawMode ) {
                    
                    collectDefer( rawMode, {
                        contributingOnlyTo: sinkNameSetIntersection(
                            rawMode.contributingOnlyTo, nameSet )
                    }, function ( rawMode ) {
                        return macLookupRet( effects );
                    } );
                    return macLookupRet( mkNil.ofNow() );
                } );
            } );
        } );
        
        fun( "procure-sub-ns-table", function ( rt, table ) {
            return new SinkFn( function ( rt, ns ) {
                if ( !(table instanceof SinkForeign
                    && table.purpose === "table") )
                    throw new Error();
                if ( !(ns instanceof SinkForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                return macLookupRet(
                    new SinkForeign( "table",
                        table.foreignVal.map( function ( v, k ) {
                            return new SinkForeign( "ns",
                                sinkNsGet( k, ns.foreignVal ) );
                        } ) ) );
            } );
        } );
        
        fun( "procure-name", function ( rt, mode ) {
            return sinkFnPure( function ( rt, ns ) {
                if ( !(ns instanceof SinkForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                
                assertMode( rawModeSupportsName( ns.foreignVal ),
                    mode );
                
                return new SinkForeign( "name", ns.foreignVal.name );
            } );
        } );
        
        function getdef( definer, err ) {
            return mkGetdef.ofNow(
                new SinkFn( function ( rt, mode ) {
                    assertMode(
                        rawModeSupportsObserveDefiner( definer ),
                        mode );
                    return macLookupGet( definer, err );
                } ),
                new SinkForeign( "definer", definer ) );
        }
        
        fun( "procure-contributed-element-getdef",
            function ( rt, ns ) {
            
            return new SinkFn( function ( rt, key ) {
                if ( !(ns instanceof SinkForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(key instanceof SinkForeign
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
            return sinkFnPure( function ( rt, key ) {
                return new SinkFn( function ( rt, listener ) {
                    if ( !(ns instanceof SinkForeign
                        && ns.purpose === "ns") )
                        throw new Error();
                    if ( !(key instanceof SinkForeign
                        && key.purpose === "name") )
                        throw new Error();
                    
                    return macLookupRet(
                        new SinkForeign( "effects",
                            function ( rawMode ) {
                        
                        collectPutListener( rawMode,
                            ns.foreignVal, key.foreignVal, listener );
                        return macLookupRet( mkNil.ofNow() );
                    } ) );
                } );
            } );
        } );
        
        fun( "procure-contributed-elements", function ( rt, mode ) {
            return new SinkFn( function ( rt, ns ) {
                if ( !(ns instanceof SinkForeign
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
        
        fun( "procure-claim", function ( rt, ns ) {
            if ( !(ns instanceof SinkForeign && ns.purpose === "ns") )
                throw new Error();
            return new SinkForeign( "effects", function ( rawMode ) {
                
                collectPutDefinedValue( rawMode,
                    getClaimedDefiner( ns.foreignVal ),
                    mkNil.ofNow() );
                return macLookupRet( mkNil.ofNow() );
            } );
        } );
        
        fun( "procure-constructor-glossary-getdef",
            function ( rt, ns ) {
            
            return sinkFnPure( function ( rt, sourceMainTagName ) {
                if ( !(ns instanceof SinkForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(sourceMainTagName instanceof SinkForeign
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
        
        fun( "copy-function-implementations",
            function ( rt, fromNs ) {
            
            return sinkFnPure( function ( rt, toNs ) {
                if ( !(fromNs instanceof SinkForeign
                    && fromNs.purpose === "ns") )
                    throw new Error();
                if ( !(toNs instanceof SinkForeign
                    && toNs.purpose === "ns") )
                    throw new Error();
                
                return new SinkForeign( "effects",
                    function ( rawMode ) {
                    
                    collectDefer( rawMode, {}, function ( rawMode ) {
                        return macLookupThen(
                            macLookupGet(
                                getFunctionImplementationsDefiner(
                                    fromNs ) ),
                            function ( funcDefNs ) {
                            
                            collectPutDefinedValue( rawMode,
                                getFunctionImplementationsDefiner(
                                    toNs ),
                                funcDefNs );
                            return macLookupRet( mkNil.ofNow() );
                        } );
                    } );
                    return macLookupRet( mkNil.ofNow() );
                } );
            } );
        } );
        
        fun( "procure-function-definer", function ( rt, ns ) {
            return new SinkFn( function ( rt, constructorTag ) {
                if ( !(ns instanceof SinkForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !mkConstructorTag.tags( constructorTag ) )
                    throw new Error();
                var mainTagName = mkConstructorTag.getProj(
                    constructorTag, "main-tag" );
                var projections = mkConstructorTag.getProj(
                    constructorTag, "projections" );
                if ( !(mainTagName instanceof SinkForeign
                    && mainTagName.purpose === "name") )
                    throw new Error();
                if ( !(projections instanceof SinkForeign
                    && projections.purpose === "table") )
                    throw new Error();
                projections.each( function ( k, v ) {
                    if ( !mkNil.tags( v ) )
                        throw new Error();
                } );
                
                return macLookupThen(
                    macLookupGet(
                        getFunctionImplementationsDefiner( ns ) ),
                    function ( funcDefNs ) {
                    
                    if ( !(funcDefNs instanceof SinkForeign
                        && funcDefNs.purpose === "ns") )
                        throw new Error();
                    
                    return macLookupRet(
                        new SinkForeign( "definer",
                            getFunctionImplementationEntryDefiner(
                                funcDefNs,
                                constructorTag.getName() ) ) );
                } );
            } );
        } );
        
        fun( "procure-macro-implementation-getdef",
            function ( rt, ns ) {
            
            return sinkFnPure( function ( rt, macroName ) {
                if ( !(ns instanceof SinkForeign
                    && ns.purpose === "ns") )
                    throw new Error();
                if ( !(macroName instanceof SinkForeign
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
            return new SinkForeign( "effects", function ( rawMode ) {
                return macLookupRet( mkNil.ofNow() );
            } );
        } );
        
        fun( "fuse-effects", function ( rt, ignored ) {
            return new SinkFuseEffects();
        } );
        
        fun( "later", function ( rt, effects ) {
            if ( !(effects instanceof SinkForeign
                && effects.purpose === "effects") )
                throw new Error();
            
            return new SinkForeign( "effects", function ( rawMode ) {
                collectDefer( rawMode, {}, function ( rawMode ) {
                    return macLookupRet( effects );
                } );
                return macLookupRet( mkNil.ofNow() );
            } );
        } );
        
        fun( "make-promise-later", function ( rt, then ) {
            return new SinkForeign( "effects", function ( rawMode ) {
                return runEffects( rawMode,
                    callSinkLater( rt, then,
                        getdef( {
                            type: "object",
                            unitTestId: rawMode.unitTestId,
                            visit: null,
                            dexAndValue: null
                        }, function () {
                            throw new Error(
                                "Never fulfilled a promise" );
                        } ) ) );
            } );
        } );
        
        fun( "definer-define", function ( rt, definer ) {
            return sinkFnPure( function ( rt, dex ) {
                return new SinkFn( function ( rt, value ) {
                    if ( !(definer instanceof SinkForeign
                        && definer.purpose === "definer") )
                        throw new Error();
                    
                    if ( dex.affiliation !== "dex" )
                        throw new Error();
                    
                    return rt.dexHas( dex, value, function ( has ) {
                        return macLookupRet(
                            new SinkForeign( "effects",
                                function ( rawMode ) {
                            
                            collectPutDefinedDexAndValue( rawMode,
                                definer.foreignVal,
                                has ? {
                                    satisfiesDex: true,
                                    dexName: dex.getName(),
                                    valueName: value.getName(),
                                    value: value
                                } : {
                                    satisfiesDex: false,
                                    value: value
                                } );
                            return macLookupRet( mkNil.ofNow() );
                        } ) );
                    } );
                } );
            } );
        } );
        
        fun( "assert-current-mode", function ( rt, mode ) {
            if ( !(mode instanceof SinkForeign
                && mode.purpose === "mode"
                && mode.foreignVal.current) )
                throw new Error();
            return mkNil.ofNow();
        } );
        
        fun( "get-mode", function ( rt, body ) {
            return new SinkForeign( "effects", function ( rawMode ) {
                return macLookupThenRunEffects( rawMode,
                    body.callSink( rt,
                        new SinkForeign( "mode", rawMode ) ) );
            } );
        } );
        
        fun( "read-all-force", function ( rt, string ) {
            return sinkConsListFromArray( arrMap(
                readAll( parseString( string ).jsStr ),
                function ( tryExpr ) {
                
                if ( !tryExpr.ok )
                    throw new Error( tryExpr.msg );
                
                return sinkFromReaderExpr(
                    sinkTrivialStxDetails(), tryExpr.val );
            } ) );
        } );
        
        commitDummyMode( namespaceDefs, dummyMode );
    }
    
    function macroexpandToDefiner(
        nss, rawMode, locatedExpr, outDefiner ) {
        
        collectDefer( rawMode, {}, function ( rawMode ) {
            return stxToObtainMethod( rt, nss, locatedExpr,
                function ( string ) {
                    return mkLocalOccurrence.ofNow( string );
                },
                function ( exprAppearance ) {
                
                function finishWithCexpr( cexpr ) {
                    return macLookupRet( new SinkForeign( "effects",
                        function ( rawMode ) {
                        
                        collectPutDefinedValue( rawMode, outDefiner,
                            cexpr );
                        return macLookupRet( mkNil.ofNow() );
                    } ) );
                }
                
                // TODO: Report better errors if an unbound local
                // variable is used. Currently, we report errors using
                // `JsCode#assertNoFreeVars()`, but that's not aware
                // of Cene variable names.
                if ( exprAppearance.type === "obtainByName" )
                    return finishWithCexpr(
                        new SinkCexpr(
                            new CexprVar( exprAppearance.name ) ) );
                
                if ( exprAppearance.type === "obtainDirectly" )
                    return finishWithCexpr( exprAppearance.val );
            
            if ( !mkStx.tags( locatedExpr ) )
                throw new Error();
            var sExpr = mkStx.getProj( locatedExpr, "s-expr" );
            if ( !mkCons.tags( sExpr ) )
                throw new Error();
            var macroNameStx = mkCons.getProj( sExpr, "car" );
            
            return stxToObtainMethod( rt, nss, macroNameStx,
                function ( string ) {
                    return mkMacroOccurrence.ofNow( string );
                },
                function ( macroAppearance ) {
                
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
            
            return callSinkMulti( rt, macroFunction,
                mkScope.ofNow(
                    new SinkForeign( "ns", nss.uniqueNs ),
                    new SinkForeign( "ns", nss.definitionNs ),
                    nss.qualify ),
                sinkTrivialStxDetails(),
                mkCons.getProj( sExpr, "cdr" ),
                sinkFnPure( function ( rt, macroResult ) {
                    return new SinkForeign( "effects",
                        function ( rawMode ) {
                        
                        collectPutDefinedValue( rawMode, outDefiner,
                            macroResult );
                        return macLookupRet( mkNil.ofNow() );
                    } );
                } ) );
            
            } );
            
            } );
            
            } );
        } );
        
        return macLookupRet( mkNil.ofNow() );
    }
    
    function macroexpand( nss, rawMode, locatedExpr, outNs, then ) {
        var definer = elementDefiner( "val", outNs );
        
        collectDefer( rawMode, {}, function ( rawMode ) {
            return macLookupThen(
                macLookupGet( definer, function () {
                    if ( !mkStx.tags( locatedExpr ) )
                        throw new Error();
                    var sExpr =
                        mkStx.getProj( locatedExpr, "s-expr" );
                    if ( !mkCons.tags( sExpr ) )
                        throw new Error();
                    var macroNameStx =
                        mkCons.getProj( sExpr, "car" );
                    throw new Error(
                        "Macro never completed: " +
                        macroNameStx.pretty() );
                } ),
                function ( macroResult ) {
                
                if ( !(macroResult instanceof SinkCexpr) )
                    throw new Error();
                return macLookupRet( new SinkForeign( "effects",
                    function ( rawMode ) {
                    
                    return then( rawMode, macroResult.cexpr );
                } ) );
            } );
        } );
        
        return macroexpandToDefiner( nss, rawMode, locatedExpr,
            definer );
    }
    
    function processDefStruct( definitionNs, rawMode,
        macroMainTagName, sourceMainTagName, repMainTagName,
        projSourceToRep ) {
        
        var n = projSourceToRep.length;
        var struct = cgenStructArr( repMainTagName, projSourceToRep );
        collectPutDefinedValue( rawMode,
            getConstructorGlossaryDefiner( definitionNs,
                sourceMainTagName ),
            mkConstructorGlossary.ofNow(
                new SinkForeign( "name", repMainTagName ),
                sinkConsListFromArray(
                    arrMap( struct.unsortedProjNames,
                        function ( entry ) {
                    
                    return mkAssoc.ofNow(
                        new SinkForeign( "name", entry.source ),
                        new SinkForeign( "name", entry.rep ) );
                } ) ) ) );
        // TODO: Make this expand multiple subexpressions
        // concurrently.
        addPureMacro( definitionNs, rawMode, macroMainTagName,
            [ "claim:struct" ],
            function ( myStxDetails, body, then ) {
            
            return function ( rawMode, nss ) {
                return loop( rawMode, nss, 0, null,
                    body, nssGet( nss, "projections" ) );
            };
            
            function loop( rawMode, nss, i, revProjVals,
                remainingBody, projectionsNss ) {
                
                if ( n <= i )
                    return next( rawMode, nss,
                        revProjVals, remainingBody );
                
                if ( !mkCons.tags( remainingBody ) )
                    throw new Error(
                        "Expected more arguments to " +
                        JSON.stringify( macroMainTagName ) );
                
                var firstNss = nssGet( projectionsNss, "first" );
                
                return macroexpand( nssGet( firstNss, "unique" ),
                    rawMode,
                    mkCons.getProj( remainingBody, "car" ),
                    nssGet( firstNss, "outbox" ).uniqueNs,
                    function ( rawMode, projVal ) {
                    
                    return loop( rawMode, nss, i + 1,
                        { first: projVal, rest: revProjVals },
                        mkCons.getProj( remainingBody, "cdr" ),
                        nssGet( projectionsNss, "rest" ) );
                } );
            }
            
            function next( rawMode, nss,
                revProjVals, remainingBody ) {
                
                return macroexpandConsListToArr(
                    nssGet( nss, "args" ),
                    rawMode,
                    remainingBody,
                    function ( rawMode, expandedArgs ) {
                    
                    return macLookupThenRunEffects( rawMode,
                        then(
                            cgenCallArr(
                                struct.ofArr(
                                    revJsListToArr( revProjVals ) ),
                                expandedArgs ) ) );
                } );
            }
        } );
    }
    
    function processCoreStructs( namespaceDefs, definitionNs ) {
        
        var dummyMode = makeDummyMode();
        
        arrEach( builtInCoreStructsToAdd, function ( entry ) {
            entry( processDefStruct, definitionNs, dummyMode );
        } );
        
        commitDummyMode( namespaceDefs, dummyMode );
    }
    
    function sinkFromReaderExpr( myStxDetails, readerExpr ) {
        if ( readerExpr.type === "nil" ) {
            return mkStx.ofNow( myStxDetails, mkNil.ofNow() );
        } else if ( readerExpr.type === "cons" ) {
            return mkStx.ofNow( myStxDetails,
                mkCons.ofNow(
                    sinkFromReaderExpr( myStxDetails,
                        readerExpr.first ),
                    mkStx.getProj(
                        sinkFromReaderExpr( myStxDetails,
                            readerExpr.rest ),
                        "s-expr" )
                ) );
        } else if ( readerExpr.type === "stringNil" ) {
            return mkStx.ofNow( myStxDetails,
                mkIstringNil.ofNow(
                    sinkForeignStrFromJs(
                        readerStringNilToString( readerExpr ) ) ) );
        } else if ( readerExpr.type === "stringCons" ) {
            return mkStx.ofNow( myStxDetails,
                mkIstringCons.ofNow(
                    sinkForeignStrFromJs(
                        readerStringListToString(
                            readerExpr.string ) ),
                    sinkFromReaderExpr( myStxDetails,
                        readerExpr.interpolation ),
                    mkStx.getProj(
                        sinkFromReaderExpr( myStxDetails,
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
                    sinkFromReaderExpr(
                        sinkTrivialStxDetails(), tryExpr.val ),
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
        addCoreMacros: addCoreMacros,
        processCoreStructs: processCoreStructs,
        topLevelTryExprsToMacLookupThreads:
            topLevelTryExprsToMacLookupThreads,
        runTopLevelTryExprsSync: runTopLevelTryExprsSync,
        
        // NOTE: These are only needed for era-cene-api.js.
        processDefStruct: processDefStruct,
        sinkConsListFromArray: sinkConsListFromArray,
        makeDummyMode: makeDummyMode,
        commitDummyMode: commitDummyMode
    };
}
