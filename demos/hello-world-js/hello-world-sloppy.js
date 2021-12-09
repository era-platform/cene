"use strict";
(function ( topLevelVars ) {

// era-misc-strmap-avl.js
// Copyright 2013-2015 Ross Angle. Released under the MIT License.
"use strict";


function strAvlRotateLesserToBigger( lesser, bigger, k, v, balance ) {
    // The depth of `bigger` should be exactly one less than `balance`
    // would suggest. Everything in `lesser` should be lesser than
    // `k`, and everything in `bigger` should be bigger.
    
    // The result's `depthDecreased` is stated relative to a supposed
    // original tree where `bigger` went one level deeper and
    // `balance` was accurate.
    
    if ( balance === "lesser" ) {
        // The "lmb" stands for "lesser minusBiggest_".
        var lmb = { key: k, val: v,
            shrunk: { depthDecreased: false, after: lesser } };
        
        // The "bp" stands for "bigger plusEntry_".
        var bp = { depthIncreased: false, after: bigger };
        
        while ( !(false
            || lmb.shrunk.depthDecreased
            || bp.depthIncreased
        ) ) {
            
            // TODO: This might do unnecessary comparisons, since we
            // already know the key is the least value in this
            // subtree. Stop that.
            bp = bp.after.plusEntry_( lmb.key, lmb.val );
            
            lmb = lmb.shrunk.after.minusBiggest_();
            if ( lmb === null )
                throw new Error();
        }
        
        return { depthDecreased: lmb.shrunk.depthDecreased,
            after: new StrAvlBranch_( lmb.shrunk.after, bp.after,
                lmb.key, lmb.val,
                lmb.shrunk.depthDecreased && bp.depthIncreased ?
                    "balanced" : "lesser" ) };
    } else if ( balance === "balanced" ) {
        return { depthDecreased: false, after:
            new StrAvlBranch_( lesser, bigger, k, v, "lesser" ) };
    } else if ( balance === "bigger" ) {
        return { depthDecreased: true, after:
            new StrAvlBranch_( lesser, bigger, k, v, "balanced" ) };
    } else {
        throw new Error();
    }
}
function strAvlRotateBiggerToLesser( lesser, bigger, k, v, balance ) {
    // The depth of `lesser` should be exactly one less than `balance`
    // would suggest. Everything in `lesser` should be lesser than
    // `k`, and everything in `bigger` should be bigger.
    
    // The result's `depthDecreased` is stated relative to a supposed
    // original tree where `lesser` went one level deeper and
    // `balance` was accurate.
    
    if ( balance === "lesser" ) {
        return { depthDecreased: true, after:
            new StrAvlBranch_( lesser, bigger, k, v, "balanced" ) };
    } else if ( balance === "balanced" ) {
        return { depthDecreased: false, after:
            new StrAvlBranch_( lesser, bigger, k, v, "bigger" ) };
    } else if ( balance === "bigger" ) {
        // The "bml" stands for "bigger minusLeast_".
        var bml = { key: k, val: v,
            shrunk: { depthDecreased: false, after: bigger } };
        
        // The "lp" stands for "lesser plusEntry_".
        var lp = { depthIncreased: false, after: lesser };
        
        while ( !(false
            || bml.shrunk.depthDecreased
            || lp.depthIncreased
        ) ) {
            
            // TODO: This might do unnecessary comparisons, since we
            // already know the key is the least value in this
            // subtree. Stop that.
            lp = lp.after.plusEntry_( bml.key, bml.val );
            
            bml = bml.shrunk.after.minusLeast_();
            if ( bml === null )
                throw new Error();
        }
        
        return { depthDecreased: bml.shrunk.depthDecreased,
            after: new StrAvlBranch_( lp.after, bml.shrunk.after,
                bml.key, bml.val,
                bml.shrunk.depthDecreased && lp.depthIncreased ?
                    "balanced" : "bigger" ) };
    } else {
        throw new Error();
    }
}

function StrAvlLeaf_() {}
StrAvlLeaf_.prototype.has = function ( k ) {
    return false;
};
StrAvlLeaf_.prototype.get = function ( k ) {
    return void 0;
};
StrAvlLeaf_.prototype.minusEntry_ = function ( k ) {
    return { depthDecreased: false, after: this };
};
StrAvlLeaf_.prototype.minusLeast_ = function () {
    return null;
};
StrAvlLeaf_.prototype.minusBiggest_ = function () {
    return null;
};
StrAvlLeaf_.prototype.plusEntry_ = function ( k, v ) {
    return { depthIncreased: true,
        after: new StrAvlBranch_( this, this, k, v, "balanced" ) };
};
// NOTE: This body takes its args as ( v, k ).
StrAvlLeaf_.prototype.any = function ( body ) {
    return false;
};
// NOTE: This body takes its args as ( v, k ).
StrAvlLeaf_.prototype.map = function ( func ) {
    return this;
};
function StrAvlBranch_( lesser, bigger, key, val, balance ) {
    this.lesser_ = lesser;
    this.bigger_ = bigger;
    this.key_ = key;
    this.val_ = val;
    this.balance_ = balance;
}
StrAvlBranch_.prototype.has = function ( k ) {
    return this.key_ === k ? true :
        k < this.key_ ? this.lesser_.has( k ) : this.bigger_.has( k );
};
StrAvlBranch_.prototype.get = function ( k ) {
    return this.key_ === k ? this.val_ :
        k < this.key_ ? this.lesser_.get( k ) : this.bigger_.get( k );
};
StrAvlBranch_.prototype.shrinkLesser_ = function ( lm ) {
    if ( !lm.depthDecreased )
        return { depthDecreased: false,
            after: new StrAvlBranch_( lm.after, this.bigger_,
                this.key_, this.val_, this.balance_ ) };
    return strAvlRotateBiggerToLesser(
        lm.after, this.bigger_, this.key_, this.val_, this.balance_ );
};
StrAvlBranch_.prototype.shrinkBigger_ = function ( bm ) {
    if ( !bm.depthDecreased )
        return { depthDecreased: false,
            after: new StrAvlBranch_( this.lesser_, bm.after,
                this.key_, this.val_, this.balance_ ) };
    return strAvlRotateLesserToBigger(
        this.lesser_, bm.after, this.key_, this.val_, this.balance_ );
};
StrAvlBranch_.prototype.minusEntry_ = function ( k ) {
    if ( this.key_ === k ) {
        if ( this.balance_ === "lesser" ) {
            var lmb = this.lesser_.minusBiggest_();
            if ( lmb === null )
                throw new Error();
            return { depthDecreased: lmb.shrunk.depthDecreased,
                after: new StrAvlBranch_(
                    lmb.shrunk.after, this.bigger_, lmb.key, lmb.val,
                    lmb.shrunk.depthDecreased ?
                        "balanced" : "lesser" ) };
        } else if ( this.balance_ === "balanced" ) {
            // When removing the root of a balanced tree, we err
            // toward having more elements on the lesser side.
            var bml = this.bigger_.minusLeast_();
            if ( bml === null )
                return { depthDecreased: true, after: this.lesser_ };
            return { depthDecreased: false,
                after: new StrAvlBranch_(
                    this.lesser_, bml.shrunk.after, bml.key, bml.val,
                    bml.shrunk.depthDecreased ?
                        "lesser" : "balanced" ) };
        } else if ( this.balance_ === "bigger" ) {
            var bml = this.bigger_.minusLeast_();
            if ( bml === null )
                throw new Error();
            return { depthDecreased: bml.shrunk.depthDecreased,
                after: new StrAvlBranch_(
                    this.lesser_, bml.shrunk.after, bml.key, bml.val,
                    bml.shrunk.depthDecreased ?
                        "balanced" : "bigger" ) };
        } else {
            throw new Error();
        }
    } else if ( k < this.key_ ) {
        return this.shrinkLesser_( this.lesser_.minusEntry_( k ) );
    } else {
        return this.shrinkBigger_( this.bigger_.minusEntry_( k ) );
    }
    return this;
};
StrAvlBranch_.prototype.minusLeast_ = function () {
    var lml = this.lesser_.minusLeast_();
    if ( lml === null )
        return { key: this.key_, val: this.val_,
            shrunk: { depthDecreased: true, after: this.bigger_ } };
    return { key: lml.key, val: lml.val,
        shrunk: this.shrinkLesser_( lml.shrunk ) };
};
StrAvlBranch_.prototype.minusBiggest_ = function () {
    var bmb = this.bigger_.minusBiggest_();
    if ( bmb === null )
        return { key: this.key_, val: this.val_,
            shrunk: { depthDecreased: true, after: this.lesser_ } };
    return { key: bmb.key, val: bmb.val,
        shrunk: this.shrinkBigger_( bmb.shrunk ) };
};
StrAvlBranch_.prototype.plusEntry_ = function ( k, v ) {
    if ( this.key_ === k )
        return { depthIncreased: false,
            after: new StrAvlBranch_(
                this.lesser_, this.bigger_, k, v, this.balance_ ) };
    if ( k < this.key_ ) {
        var subPlus = this.lesser_.plusEntry_( k, v );
        if ( !subPlus.depthIncreased )
            return { depthIncreased: false,
                after: new StrAvlBranch_( subPlus.after, this.bigger_,
                    this.key_, this.val_, this.balance_ ) };
        var rotated = strAvlRotateLesserToBigger(
            subPlus.after, this.bigger_,
            this.key_, this.val_, this.balance_ );
        return { depthIncreased: !rotated.depthDecreased,
            after: rotated.after };
    } else {
        var subPlus = this.bigger_.plusEntry_( k, v );
        if ( !subPlus.depthIncreased )
            return { depthIncreased: false,
                after: new StrAvlBranch_( this.lesser_, subPlus.after,
                    this.key_, this.val_, this.balance_ ) };
        var rotated = strAvlRotateBiggerToLesser(
            this.lesser_, subPlus.after,
            this.key_, this.val_, this.balance_ );
        return { depthIncreased: !rotated.depthDecreased,
            after: rotated.after };
    }
};
// NOTE: This body takes its args as ( v, k ).
StrAvlBranch_.prototype.any = function ( body ) {
    return body( this.val_, this.key_ ) ||
        this.lesser_.any( body ) || this.bigger_.any( body );
};
// NOTE: This body takes its args as ( v, k ).
StrAvlBranch_.prototype.map = function ( func ) {
    return new StrAvlBranch_(
        this.lesser_.map( func ), this.bigger_.map( func ),
        this.key_, func( this.val_, this.key_ ), this.balance_ );
};

function StrMap() {}
StrMap.prototype.init_ = function ( contents ) {
    this.contents_ = contents;
    return this;
};
function strMap() {
    return new StrMap().init_( new StrAvlLeaf_() );
}
StrMap.prototype.has = function ( k ) {
    return this.contents_.has( k );
};
StrMap.prototype.get = function ( k ) {
    return this.contents_.get( k );
};
StrMap.prototype.del = function ( k ) {
    this.contents_ = this.contents_.minusEntry_( k ).after;
    return this;
};
StrMap.prototype.set = function ( k, v ) {
    this.contents_ = this.contents_.plusEntry_( k, v ).after;
    return this;
};
StrMap.prototype.setObj = function ( obj ) {
    var self = this;
    objOwnEach( obj, function ( k, v ) {
        self.set( k, v );
    } );
    return this;
};
StrMap.prototype.setAll = function ( other ) {
    if ( !(other instanceof StrMap) )
        throw new Error();
    // TODO: Merge the trees more efficiently than this. We're using
    // AVL trees, which can supposedly merge in O( log (m + n) ) time,
    // but this operation is probably O( n * log (m + n) ).
    var self = this;
    other.each( function ( k, v ) {
        self.set( k, v );
    } );
    return this;
};
StrMap.prototype.delAll = function ( other ) {
    if ( !(other instanceof StrMap) )
        throw new Error();
    // TODO: Merge the trees more efficiently than this. We're using
    // AVL trees, which can supposedly merge in O( log (m + n) ) time,
    // but this operation is probably O( n * log (m + n) ).
    var self = this;
    other.each( function ( k, v ) {
        self.del( k );
    } );
    return this;
};
StrMap.prototype.copy = function () {
    return new StrMap().init_( this.contents_ );
};
StrMap.prototype.add = function ( k ) {
    return this.set( k, true );
};
StrMap.prototype.plusEntry = function ( k, v ) {
    return new StrMap().init_(
        this.contents_.plusEntry_( k, v ).after );
};
StrMap.prototype.plusObj = function ( other ) {
    return this.copy().setObj( other );
};
StrMap.prototype.plus = function ( other ) {
    return this.copy().setAll( other );
};
// TODO: Find a better name for this.
StrMap.prototype.plusTruth = function ( k ) {
    return this.copy().add( k );
};
// TODO: Find a better name for this.
StrMap.prototype.plusArrTruth = function ( arr ) {
    // TODO: Merge the trees more efficiently than this. We're using
    // AVL trees, which can supposedly merge in O( log (m + n) ) time,
    // but this operation is probably O( n * log (m + n) ).
    var result = this.copy();
    for ( var i = 0, n = arr.length; i < n; i++ )
        result.add( arr[ i ] );
    return result;
};
StrMap.prototype.minusEntry = function ( k ) {
    return new StrMap().init_(
        this.contents_.minusEntry_( k ).after );
};
StrMap.prototype.minus = function ( other ) {
    return this.copy().delAll( other );
};
// NOTE: This body takes its args as ( v, k ).
StrMap.prototype.any = function ( body ) {
    return this.contents_.any( body );
};
StrMap.prototype.hasAny = function () {
    return this.any( function ( v, k ) {
        return true;
    } );
};
StrMap.prototype.subset = function ( other ) {
    return !this.minus( other ).hasAny();
};
// NOTE: This body takes its args as ( k, v ).
StrMap.prototype.each = function ( body ) {
    this.any( function ( v, k ) {
        body( k, v );
        return false;
    } );
};
// NOTE: This body takes its args as ( v, k ).
StrMap.prototype.map = function ( func ) {
    return new StrMap().init_( this.contents_.map( func ) );
};



// era-misc.js
// Copyright 2013-2016 Ross Angle. Released under the MIT License.
"use strict";


// TODO: Decide whether to introduce a dependency on Lathe.js just for
// these utilities.
function defer( body ) {
    setTimeout( function () {
        body();
    }, 0 );
}
// NOTE: This body takes its args as ( v, k ).
function arrEach( arr, func ) {
    for ( var i = 0, n = arr.length; i < n; i++ )
        func( arr[ i ], i );
}
// NOTE: This body takes its args as ( v, k ).
function arrAny( arr, func ) {
    for ( var i = 0, n = arr.length; i < n; i++ ) {
        var result = func( arr[ i ], i );
        if ( result )
            return result;
    }
    return false;
}
// NOTE: This body takes its args as ( v, k ).
function arrAll( arr, func ) {
    for ( var i = 0, n = arr.length; i < n; i++ ) {
        var result = func( arr[ i ], i );
        if ( !result )
            return result;
        result = null;
    }
    return true;
}
// NOTE: This body takes its args as ( v, k ).
function arrMap( arr, func ) {
    var result = [];
    for ( var i = 0, n = arr.length; i < n; i++ )
        result.push( func( arr[ i ], i ) );
    return result;
}
// NOTE: This body takes its args as ( v, k ).
function arrMappend( arr, func ) {
    var result = [];
    for ( var i = 0, n = arr.length; i < n; i++ ) {
        var entries = func( arr[ i ], i );
        for ( var j = 0, m = entries.length; j < m; j++ )
            result.push( entries[ j ] );
    }
    return result;
}
// NOTE: This body takes its args as ( v, k ).
function arrKeep( arr, func ) {
    return arrMappend( arr, function ( v, k ) {
        return func( v, k ) ? [ v ] : [];
    } );
}
function hasOwn( obj, k ) {
    return {}.hasOwnProperty.call( obj, k );
}
// NOTE: This body takes its args as ( v, k ).
function objOwnAny( obj, body ) {
    for ( var k in obj )
        if ( hasOwn( obj, k ) ) {
            var result = body( obj[ k ], k );
            if ( result )
                return result;
        }
    return false;
}
// NOTE: This body takes its args as ( k, v ).
function objOwnEach( obj, body ) {
    objOwnAny( obj, function ( v, k ) {
        body( k, v );
        return false;
    } );
}
// NOTE: This body takes its args as ( k, v ).
function objOwnMap( obj, body ) {
    var result = {};
    objOwnEach( obj, function ( k, v ) {
        result[ k ] = body( k, v );
    } );
    return result;
}
function objPlus( var_args ) {
    var result = {};
    for ( var i = 0, n = arguments.length; i < n; i++ )
        objOwnEach( arguments[ i ], function ( k, v ) {
            result[ k ] = v;
        } );
    return result;
}
function isArray( x ) {
    return {}.toString.call( x ) === "[object Array]";
}
function isPrimString( x ) {
    return typeof x === "string";
}
if ( Object.getPrototypeOf )
    var likeObjectLiteral = function ( x ) {
        if ( x === null ||
            {}.toString.call( x ) !== "[object Object]" )
            return false;
        var p = Object.getPrototypeOf( x );
        return p !== null && typeof p === "object" &&
            Object.getPrototypeOf( p ) === null;
    };
else if ( {}.__proto__ !== void 0 )
    var likeObjectLiteral = function ( x ) {
        if ( x === null ||
            {}.toString.call( x ) !== "[object Object]" )
            return false;
        var p = x.__proto__;
        return p !== null && typeof p === "object" &&
            p.__proto__ === null;
    };
else
    var likeObjectLiteral = function ( x ) {
        return x !== null &&
            {}.toString.call( x ) === "[object Object]" &&
            x.constructor === {}.constructor;
    };
function sameTwo( a, b ) {
    return (a === 0 && b === 0) ? 1 / a === 1 / b :  // 0 and -0
        a !== a ? b !== b :  // NaN
        a === b;
}
function jsStrContentAllowingQuotes( string ) {
    return string.
        replace( /\\/g, "\\\\" ).replace( /\n/g, "\\n" ).
        replace( /\r/g, "\\r" ).replace( /\t/g, "\\t" ).
        replace( /\x08/g, "\\b" ).replace( /\f/g, "\\f" ).
        replace( /\0/g, "\\0" ).replace( /\v/g, "\\v" ).
        replace( /[^\u0020-\u007E]/g, function ( c ) {
            var code = c.charCodeAt( 0 ).toString( 16 ).toUpperCase();
            var n = code.length;
            return n <= 2 ?
                "\\x" + ("00" + code).substr( n ) :
                "\\u" + ("0000" + code).substr( n );
        } );
}
function jsStrDoubleQuoted( string ) {
    return "\"" +
        jsStrContentAllowingQuotes( string ).replace( /"/g, "\\\"" ) +
        "\"";
}
function jsStrSingleQuoted( string ) {
    return "'" +
        jsStrContentAllowingQuotes( string ).replace( /'/g, "\\'" ) +
        "'";
}
function jsStr( string ) {
    var doubleQuoteCount = (string.match( /\"/g ) || []).length;
    var singleQuoteCount = (string.match( /'/g ) || []).length;
    return singleQuoteCount < doubleQuoteCount ?
        jsStrSingleQuoted( string ) :
        // We use double quotes by default.
        jsStrDoubleQuoted( string );
}

// TODO: Put utilities like these in lathe.js.
function jsJson( json ) {
    return JSON.stringify( json ).
        replace( /\u2028/g, "\\u2028" )
        replace( /\u2029/g, "\\u2029" );
}
function getUnicodeCodePointAtCodeUnitIndex( string, codeUnitIndex ) {
    function inRange( min, pastMax ) {
        return function ( n ) {
            return min <= n && n < pastMax;
        };
    }
    var isHead = inRange( 0xD800, 0xDC00 );
    var isTrail = inRange( 0xDC00, 0xE000 );
    var replacement = {
        isReplaced: true,
        codePoint: 0xFFFD,
        charString: "\uFFFD"
    };
    var n = string.length;
    if ( n <= codeUnitIndex )
        throw new Error();
    var firstCodeUnit = string.charCodeAt( codeUnitIndex );
    if ( isHead( firstCodeUnit ) ) {
        if ( n <= codeUnitIndex + 1 )
            return replacement;
        var secondCodeUnit = string.charCodeAt( codeUnitIndex + 1 );
        if ( isHead( secondCodeUnit ) ) {
            return replacement;
        } else if ( isTrail( secondCodeUnit ) ) {
            return {
                isReplaced: false,
                codePoint: 0x10000 +
                    ((firstCodeUnit - 0xD800) << 10) +
                    (secondCodeUnit - 0xDC00),
                charString: string.charAt( codeUnitIndex ) +
                    string.charAt( codeUnitIndex + 1 )
            };
        } else {
            return replacement;
        }
    } else if ( isTrail( firstCodeUnit ) ) {
        return replacement;
    } else {
        return {
            isReplaced: false,
            codePoint: firstCodeUnit,
            charString: string.charAt( codeUnitIndex )
        };
    }
}
function anyUnicodeCodePoint( string, func ) {
    for ( var i = 0, n = string.length; i < n; ) {
        var codePointInfo =
            getUnicodeCodePointAtCodeUnitIndex( string, i );
        var result = func( codePointInfo );
        if ( result )
            return result;
        i += codePointInfo.charString.length;
    }
    return false;
}
function eachUnicodeCodePoint( string, func ) {
    anyUnicodeCodePoint( string, function ( codePointInfo ) {
        func( codePointInfo );
        return false;
    } );
}
function isValidUnicode( string ) {
    return !anyUnicodeCodePoint( string, function ( codePointInfo ) {
        return codePointInfo.isReplaced;
    } );
}
function toValidUnicode( string ) {
    var result = "";
    eachUnicodeCodePoint( string, function ( codePointInfo ) {
        result += codePointInfo.charString;
    } );
    return result;
}
function unicodeCodePointToString( codePoint ) {
    function inRange( min, pastMax ) {
        return function ( n ) {
            return min <= n && n < pastMax;
        };
    }
    var isHead = inRange( 0xD800, 0xDC00 );
    var isTrail = inRange( 0xDC00, 0xE000 );
    if ( !(0 <= codePoint && codePoint < 0x110000
        && !isHead( codePoint ) && !isTrail( codePoint )) )
        return null;
    if ( codePoint < 0x10000 )
        return String.fromCharCode( codePoint );
    return String.fromCharCode(
        0xD800 + ((codePoint - 0x10000) >>> 10),
        0xE000 + ((codePoint - 0x10000) & 0x3FF)
    );
}

// TODO: Come up with something better than this.
var naiveIsoCases = [];
function naiveIso( a, b ) {
    for ( var i = 0, n = naiveIsoCases.length; i < n; i++ ) {
        var result = naiveIsoCases[ i ]( naiveIso, a, b );
        if ( result !== null )
            return result;
    }
    return null;
}
naiveIsoCases.push( function ( recur, a, b ) {
    return sameTwo( a, b ) ? true : null;
} );
naiveIsoCases.push( function ( recur, a, b ) {
    return (isPrimString( a ) || isPrimString( b )) ? a === b : null;
} );
naiveIsoCases.push( function ( recur, a, b ) {
    if ( !(isArray( a ) && isArray( b )) )
        return (isArray( a ) || isArray( b )) ? false : null;
    var n = a.length;
    if ( n !== b.length )
        return false;
    for ( var i = 0; i < n; i++ ) {
        var subresult = recur( a[ i ], b[ i ] );
        if ( subresult !== true )
            return subresult;
    }
    return true;
} );
naiveIsoCases.push( function ( recur, a, b ) {
    if ( !(likeObjectLiteral( a ) && likeObjectLiteral( b )) )
        return (likeObjectLiteral( a ) || likeObjectLiteral( b )) ?
            false : null;
    if ( objOwnAny( a, function ( v, k ) {
        return !hasOwn( b, k );
    } ) || objOwnAny( b, function ( v, k ) {
        return !hasOwn( a, k );
    } ) )
        return false;
    var result = objOwnAny( a, function ( v, k ) {
        var subresult = recur( v, b[ k ] );
        if ( subresult !== true )
            return { val: subresult };
    } );
    return result ? result.val : true;
} );
naiveIsoCases.push( function ( recur, a, b ) {
    if ( !((a instanceof StrMap) && (b instanceof StrMap)) )
        return ((a instanceof StrMap) || (b instanceof StrMap)) ?
            false : null;
    if ( a.any( function ( v, k ) {
        return !b.has( k );
    } ) || b.any( function ( v, k ) {
        return !a.has( k );
    } ) )
        return false;
    var result = a.any( function ( v, k ) {
        var subresult = recur( v, b.get( k ) );
        if ( subresult !== true )
            return { val: subresult };
    } );
    return result ? result.val : true;
} );


var patternLang = {};
(function () {
    function Pat() {}
    Pat.prototype.init_ = function ( match ) {
        this.match_ = match;
        return this;
    };
    Pat.prototype.match = function ( data ) {
        return this.match_.call( {}, data );
    };
    
    patternLang.lit = function ( string ) {
        return new Pat().init_( function ( data ) {
            return data === string ? { val: strMap() } : null;
        } );
    };
    patternLang.str = function ( x ) {
        return new Pat().init_( function ( data ) {
            return isPrimString( data ) ?
                { val: strMap().set( x, data ) } : null;
        } );
    };
    var pat =
    patternLang.pat = function ( x ) {
        if ( x instanceof Pat ) {
            return x;
        } else if ( isPrimString( x ) ) {
            return new Pat().init_( function ( data ) {
                return { val: strMap().set( x, data ) };
            } );
        } else if ( isArray( x ) ) {
            var n = x.length;
            var pats = arrMap( x, function ( subx ) {
                return pat( subx );
            } );
            return new Pat().init_( function ( data ) {
                if ( !(isArray( data ) && data.length === n) )
                    return null;
                var result = strMap();
                for ( var i = 0; i < n; i++ ) {
                    var subresult = pats[ i ].match( data[ i ] );
                    if ( subresult === null )
                        return null;
                    // TODO: Figure out what to do when keys overlap.
                    // For now, we just avoid overlapping keys in
                    // practice.
                    result.setAll( subresult.val );
                }
                return { val: result };
            } );
        } else {
            throw new Error();
        }
    };
    patternLang.getMatch = function ( arrData, arrPat ) {
        return pat( arrPat ).match( arrData );
    };
})();

// TODO: Test all of this. The tests in test-bigint.js are a good
// start, but they're not very thorough. They don't even test negative
// numbers, for instance.
// TODO: Expose all of this to Penknife.
function BigInt() {}
BigInt.prototype.init_ = function ( sign, digits16Bit ) {
    this.sign_ = sign;
    this.digits_ = digits16Bit;
    return this;
};
BigInt.prototype.copy = function () {
    return new BigInt().init_( this.sign_, this.digits_.slice() );
};
BigInt.prototype.normalize_ = function () {
    var ds = this.digits_;
    for ( var i = ds.length - 1; 0 <= i; i-- ) {
        if ( ds[ i ] !== 0 )
            break;
        ds.pop();
    }
    if ( ds.length === 0 )
        this.sign_ = 1;
    return this;
};
BigInt.prototype.compareAbsTo = function ( other ) {
    var a = this.digits_;
    var b = other.digits_;
    var an = a.length;
    var bn = b.length;
    if ( an < bn )
        return -1;
    if ( bn < an )
        return 1;
    var len = an;
    for ( var i = len - 1; 0 <= i; i-- ) {
        var aDigit = a[ i ];
        var bDigit = b[ i ];
        if ( aDigit < bDigit )
            return -1;
        if ( bDigit < aDigit )
            return 1;
    }
    return 0;
};
BigInt.prototype.compareTo = function ( other ) {
    var as = this.sign_;
    var bs = other.sign_;
    if ( as < bs )
        return -1;
    if ( bs < as )
        return 1;
    var sign = as;
    return sign * this.compareAbsTo( other );
};
BigInt.prototype.zapPlus = function ( other ) {
    var a = this.digits_;
    var b = other.digits_;
    var an = a.length;
    var bn = b.length;
    if ( this.sign_ === other.sign_ ) {
        // NOTE: The possible values of `carry` are 0 and 1.
        var carry = 0;
        var i = 0;
        for ( ; i < bn; i++ ) {
            // NOTE: Even though we change the length of `a` here, we
            // don't need to update `an`.
            if ( an <= i )
                a.push( 0 );
            var digitSum = a[ i ] + b[ i ] + carry;
            a[ i ] = digitSum & 0xFFFF;
            carry = digitSum >>> 16;
        }
        for ( ; i < an; i++ ) {
            if ( carry === 0 )
                break;
            var digitSum = a[ i ] + carry;
            a[ i ] = digitSum & 0xFFFF;
            carry = digitSum >>> 16;
        }
        if ( carry !== 0 )
            a.push( 1 );
    } else {
        // NOTE: The possible values of `carry` are -1 and 0.
        var carry = 0;
        var i = 0;
        for ( ; i < bn; i++ ) {
            // NOTE: Even though we change the length of `a` here, we
            // don't need to update `an`.
            if ( an <= i )
                a.push( 0 );
            var digitSum = a[ i ] + 0x10000 - b[ i ] + carry;
            a[ i ] = digitSum & 0xFFFF;
            carry = (digitSum >>> 16) - 1;
        }
        for ( ; i < an; i++ ) {
            if ( carry === 0 )
                break;
            var digitSum = a[ i ] + 0x10000 + carry;
            a[ i ] = digitSum & 0xFFFF;
            carry = (digitSum >>> 16) - 1;
        }
        if ( carry === -1 ) {
            this.sign_ *= -1;
            for ( var i = 0, n = a.length; i < n; i++ )
                a[ i ] = ~a[ i ] & 0xFFFF;
            this.zapPlus( new BigInt().init_( -1, [ 1 ] ) );
        }
    }
    return this.normalize_();
};
BigInt.prototype.zapShiftLeft = function ( jsNumBits ) {
    if ( this.sign_ !== 1 )
        throw new Error();
    var remainder = jsNumBits % 16;
    var quotient = (jsNumBits - remainder) / 16;
    var a = this.digits_;
    if ( remainder !== 0 ) {
        var carry = 0x0000;
        for ( var i = 0, n = a.length; i < n; i++ ) {
            var shifted = a[ i ] << remainder;
            a[ i ] = (shifted & 0xFFFF) + carry;
            carry = shifted >>> 16;
        }
        if ( carry !== 0 )
            a.push( carry );
    }
    if ( a.length !== 0 )
        for ( var i = 0; i < quotient; i++ )
            a.unshift( 0 );
    return this;
};
BigInt.prototype.zapShiftRightWithRemainder = function ( jsNumBits ) {
    if ( this.sign_ !== 1 )
        throw new Error();
    var remainder = jsNumBits % 16;
    var quotient = (jsNumBits - remainder) / 16;
    var r = [];
    for ( var i = 0; i < quotient; i++ )
        r.push( this.digits_.shift() );
    this.zapShiftLeft( 16 - remainder );
    r.push( this.digits_.shift() >> (16 - remainder) );
    return { quotient: this,
        remainder: new BigInt().init_( 1, r ).normalize_() };
};
// TODO: Remove either zapTimes() or times(), depending on which one
// is more efficient.
BigInt.prototype.zapTimes = function ( other ) {
    // TODO: See if this can be more efficient.
    var finalSign = this.sign_ * other.sign_;
    this.sign_ = 1;
    var aBig = this.copy();
    this.digits_ = [];
    var b = other.digits_;
    for ( var i = 0, n = b.length; i < n; i++ ) {
        var bDigit = b[ i ];
        for ( var j = 0; bDigit !== 0; bDigit >>= 1, j++ )
            if ( (bDigit & 1) === 1 )
                this.zapPlus( aBig.copy().zapShiftLeft( j ) );
        aBig.zapShiftLeft( 16 );
    }
    this.sign_ = finalSign;
    return this;
};
BigInt.prototype.times = function ( other ) {
    // TODO: See if this can be more efficient.
    var a = this.digits_;
    var b = other.digits_;
    var an = a.length;
    var bn = b.length;
    var anm1 = an - 1;
    var bnm1 = bn - 1;
    var resultPlacesToCalculate = an + bn - 1;
    var result = new BigInt().init_( 1, [] );
    for ( var resultPlaceLeftToRight = 0;
        resultPlaceLeftToRight < resultPlacesToCalculate;
        resultPlaceLeftToRight++ ) {
        
        result.zapShiftLeft( 16 );
        
        for (
            var aPlace = anm1 - resultPlaceLeftToRight, bPlace = bnm1;
            aPlace < an; aPlace++, bPlace-- ) {
            
            if ( aPlace < 0 || bPlace < 0 )
                continue;
            var digitProduct = a[ aPlace ] * b[ bPlace ];
            result.zapPlus( new BigInt().init_( 1, [
                digitProduct & 0xFFFF,
                digitProduct >>> 16
            ] ).normalize_() );
        }
    }
    if ( this.sign_ !== other.sign_ )
        result.zapNeg();
    return result;
};
BigInt.prototype.zapAbs = function () {
    this.sign_ = 1;
    return this;
};
BigInt.prototype.zapNeg = function () {
    if ( this.digits_.length !== 0 )
        this.sign_ = -this.sign_;
    return this;
};
BigInt.prototype.dividedByTowardZeroWithRemainder =
    function ( other ) {
    
    // TODO: See if this can be more efficient.
    if ( other.digits_.length === 0 )
        throw new Error();
    var quotient = new BigInt().init_( 1, [] );
    var remainder = this.copy().zapAbs();
    var bAbs = other.copy().zapAbs();
    var b = bAbs.digits_;
    var bn = b.length;
    var bLast = b[ bn - 1 ];
    var bLastPlusOne = bLast + 1;
    while ( bAbs.compareTo( remainder ) <= 0 ) {
        var r = remainder.digits_;
        var rn = r.length;
        var digitDisparity = rn - bn;
        var rLast = r[ rn - 1 ];
        if ( rLast < bLast ) {
            // NOTE: We're multiplying instead of shifting so that the
            // result will always be positive.
            rLast = (rLast * 0x10000) + r[ rn - 2 ];
            digitDisparity--;
        }
        var quotientAtThisDisparity = ~~(rLast / bLastPlusOne);
        if ( quotientAtThisDisparity === 0 ) {
            quotientAtThisDisparity = 1;
            for ( var i = bn - 2; 0 <= i; i-- ) {
                if ( b[ i ] !== r[ i + digitDisparity ] ) {
                    quotientAtThisDisparity = 0;
                    break;
                }
            }
        }
        if ( quotientAtThisDisparity === 0 ) {
            remainder.zapPlus(
                bAbs.copy().
                    zapShiftLeft( 16 * digitDisparity - 1 ).
                    zapNeg() );
            quotient.zapPlus(
                new BigInt().init_( 1, [ 1 ] ).
                    zapShiftLeft( 16 * digitDisparity - 1 ) );
        } else {
            // TODO: Where this uses zapTimes(), see if times() would
            // be more efficient.
            remainder.zapPlus(
                new BigInt().init_( 1, [ quotientAtThisDisparity ] ).
                    zapTimes( bAbs ).
                    zapShiftLeft( 16 * digitDisparity ).
                    zapNeg() );
            quotient.zapPlus(
                new BigInt().init_( 1, [ quotientAtThisDisparity ] ).
                    zapShiftLeft( 16 * digitDisparity ) );
        }
    }
    
    // NOTE: These examples may clarify the following negations.
    //
    // 9 / 2 = 4 R 1
    // 9 / -2 = -4 R 1
    // -9 / 2 = -4 R -1
    // -9 / -2 = 4 R -1
    //
    // Intuitively, the product of the quotient and the divisor must
    // have the same sign as the dividend (since it must approximate
    // the dividend), but it will always have equal or lesser
    // magnitude. Thus the remainder must have the same sign as the
    // dividend to add to this magnitude.
    //
    if ( this.sign_ !== other.sign_ )
        quotient.zapNeg();
    if ( this.sign_ === -1 )
        remainder.zapNeg();
    
    return { quotient: quotient, remainder: remainder };
};
BigInt.prototype.toStringInRadix = function ( base ) {
    if ( !(2 <= base && base <= 16) )
        throw new Error();
    var alphabet = "0123456789ABCDEF".split( "" ).slice( 0, base );
    var bigBase = new BigInt().init_( 1, [ base ] );
    var result = "";
    var digitsLeft = this.copy().zapAbs();
    while ( digitsLeft.digits_.length !== 0 ) {
        var digitAndRest =
            digitsLeft.dividedByTowardZeroWithRemainder( bigBase );
        var digitValue = digitAndRest.remainder.digits_[ 0 ];
        if ( digitValue === void 0 )
            digitValue = 0;
        result = alphabet[ digitValue ] + result;
        digitsLeft = digitAndRest.quotient;
    }
    if ( result === "" )
        result = alphabet[ 0 ];
    else if ( this.sign_ === -1 )
        result = "-" + result;
    return result;
};
function bigIntFromStringInRadix( base, string ) {
    if ( !(2 <= base && base <= 16) )
        throw new Error();
    var alphabet = strMap();
    for ( var i = 0; i < base; i++ )
        alphabet.set( "0123456789ABCDEF".charAt( i ),
            new BigInt().init_( 1, [ i ] ).normalize_() );
    var bigBase = new BigInt().init_( 1, [ base ] );
    var i = 0, n = string.length;
    var sign = 1;
    var result = new BigInt().init_( 1, [] );
    if ( i < n && string.charAt( i ) === "-" ) {
        sign = -1;
        i++;
    }
    for ( ; i < n; i++ ) {
        var ch = string.charAt( i );
        var digitValue = alphabet.get( ch );
        if ( digitValue === void 0 )
            throw new Error();
        // TODO: Where this uses zapTimes(), see if times() would be
        // more efficient.
        result.zapTimes( bigBase ).zapPlus( digitValue );
    }
    if ( sign === -1 )
        result.zapNeg();
    return result;
}


function runWithSyncYokeAndMaxStack( rider, maxStack, body ) {
    var initialYoke = {
        rider: rider,
        internal: 0,
        bounce: function ( then ) {
            var self = this;
            if ( self.internal < maxStack ) {
                return then( {
                    rider: self.rider,
                    internal: self.internal + 1,
                    bounce: self.bounce
                } );
            } else {
                deferred.push( function () {
                    return then( {
                        rider: self.rider,
                        internal: 0,
                        bounce: self.bounce
                    } );
                } );
                return null;
            }
        }
    };
    var deferred = [ function () {
        return body( initialYoke, function ( yoke, result ) {
            return { rider: yoke.rider, result: result };
        } );
    } ];
    var riderAndResult = null;
    while ( riderAndResult === null && deferred.length !== 0 )
        riderAndResult = deferred.shift()();
    if ( riderAndResult === null || deferred.length !== 0 )
        throw new Error();
    return riderAndResult;
}
function runSyncYoke( rider, body ) {
    // TODO: Test to see what value is best for all browsers.
    // TODO: Put this constant somewhere more configurable.
    // NOTE: Firefox 28 breaks in the reader demo if this value
    // exceeds 217. Chrome 34 can handle 1236 sometimes, but it's
    // inconsistent, and its sweet spot seems to be around 500-1000.
    // IE 11 can handle 367 sometimes, but it's inconsistent.
    var maxStack = 100;
    return runWithSyncYokeAndMaxStack( rider, maxStack, body );
}
// TODO: See if we'll ever use this.
function runDebuggableSyncYoke( rider, body ) {
    return runWithSyncYokeAndMaxStack( rider, 1 / 0, body );
}
// TODO: Rename this.
function runWaitOne( yoke, then ) {
    return yoke.bounce( then );
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

function jsListShortFoldl( yoke, init, list, func, then ) {
    return runWaitOne( yoke, function ( yoke ) {
        if ( list === null )
            return then( yoke, init, !"exitedEarly" );
        return func( yoke, init, list.first,
            function ( yoke, init, exitedEarly ) {
            
            if ( exitedEarly )
                return then( yoke, init, !!"exitedEarly" );
            return jsListShortFoldl( yoke,
                init, list.rest, func, then );
        } );
    } );
}
function jsListFoldl( yoke, init, list, func, then ) {
    return jsListShortFoldl( yoke, init, list,
        function ( yoke, state, elem, then ) {
        
        return func( yoke, state, elem, function ( yoke, state ) {
            return then( yoke, state, !"exitedEarly" );
        } );
    }, function ( yoke, state, exitedEarly ) {
        return then( yoke, state );
    } );
}
// NOTE: This is guaranteed to have O( n ) time complexity in the
// length of the `backwardFirst` list, JS object allocation time
// notwithstanding.
function jsListRevAppend( yoke, backwardFirst, forwardSecond, then ) {
    return jsListFoldl( yoke, forwardSecond, backwardFirst,
        function ( yoke, forwardSecond, elem, then ) {
        
        return then( yoke, { first: elem, rest: forwardSecond } );
    }, then );
}
function jsListRev( yoke, list, then ) {
    return jsListRevAppend( yoke, list, null, then );
}
function jsListAppend( yoke, a, b, then ) {
    return jsListRev( yoke, a, function ( yoke, revA ) {
        return jsListRevAppend( yoke, revA, b, then );
    } );
}
function jsListFlattenOnce( yoke, list, then ) {
    return jsListFoldl( yoke, null, list,
        function ( yoke, revResult, elem, then ) {
        
        return jsListRevAppend( yoke, elem, revResult, then );
    }, function ( yoke, revResult ) {
        return jsListRev( yoke, revResult, then );
    } );
}
function jsListMap( yoke, list, func, then ) {
    return jsListFoldl( yoke, null, list,
        function ( yoke, revPast, elem, then ) {
        
        return func( yoke, elem, function ( yoke, elem ) {
            return then( yoke, { first: elem, rest: revPast } );
        } );
    }, function ( yoke, revResult ) {
        return jsListRev( yoke, revResult, then );
    } );
}
function jsListMappend( yoke, list, func, then ) {
    return jsListMap( yoke, list, func,
        function ( yoke, resultLists ) {
        
        return jsListFlattenOnce( yoke, resultLists, then );
    } );
}

function JsnMap() {}
JsnMap.prototype.init_ = function ( contents ) {
    this.contents_ = contents;
    return this;
};
function jsnMap() {
    return new JsnMap().init_( strMap() );
}
JsnMap.prototype.has = function ( k ) {
    return this.contents_.has( JSON.stringify( k ) );
};
JsnMap.prototype.get = function ( k ) {
    return this.contents_.get( JSON.stringify( k ) ).v;
};
JsnMap.prototype.del = function ( k ) {
    this.contents_.del( JSON.stringify( k ) );
    return this;
};
JsnMap.prototype.set = function ( k, v ) {
    this.contents_.set( JSON.stringify( k ), { k: k, v: v } );
    return this;
};
JsnMap.prototype.setObj = function ( obj ) {
    var self = this;
    objOwnEach( obj, function ( k, v ) {
        self.set( k, v );
    } );
    return this;
};
JsnMap.prototype.setAll = function ( other ) {
    if ( !(other instanceof JsnMap) )
        throw new Error();
    this.contents_.setAll( other.contents_ );
    return this;
};
JsnMap.prototype.delAll = function ( other ) {
    if ( !(other instanceof JsnMap) )
        throw new Error();
    this.contents_.delAll( other.contents_ );
    return this;
};
JsnMap.prototype.copy = function () {
    return new JsnMap().init_( this.contents_.copy() );
};
JsnMap.prototype.add = function ( k ) {
    return this.set( k, true );
};
JsnMap.prototype.plusEntry = function ( k, v ) {
    return this.copy().set( k, v );
};
JsnMap.prototype.plusObj = function ( other ) {
    return this.copy().setObj( other );
};
JsnMap.prototype.plus = function ( other ) {
    return this.copy().setAll( other );
};
// TODO: Find a better name for this.
JsnMap.prototype.plusTruth = function ( k ) {
    return this.copy().add( k );
};
// TODO: Find a better name for this.
JsnMap.prototype.plusArrTruth = function ( arr ) {
    // TODO: Merge the trees more efficiently than this. We're using
    // AVL trees, which can supposedly merge in O( log (m + n) ) time,
    // but this operation is probably O( n * log (m + n) ).
    var result = this.copy();
    for ( var i = 0, n = arr.length; i < n; i++ )
        result.add( arr[ i ] );
    return result;
};
JsnMap.prototype.minusEntry = function ( k ) {
    return this.copy().del( k );
};
JsnMap.prototype.minus = function ( other ) {
    return this.copy().delAll( other );
};
// NOTE: This body takes its args as ( v, k ).
JsnMap.prototype.any = function ( body ) {
    return this.contents_.any( function ( kv, k ) {
        return body( kv.v, kv.k );
    } );
};
JsnMap.prototype.hasAny = function () {
    return this.contents_.hasAny();
};
JsnMap.prototype.subset = function ( other ) {
    return !this.minus( other ).hasAny();
};
// NOTE: This body takes its args as ( k, v ).
JsnMap.prototype.each = function ( body ) {
    this.any( function ( v, k ) {
        body( k, v );
        return false;
    } );
};
// NOTE: This body takes its args as ( v, k ).
JsnMap.prototype.map = function ( func ) {
    return new JsnMap().init_( this.contents_.map(
        function ( kv, k ) {
        
        return { k: k, v: func( kv.v, kv.k ) };
    } ) );
};
// NOTE: This body takes its args as ( v, k ).
JsnMap.prototype.keep = function ( body ) {
    var result = jsnMap();
    this.each( function ( k, v ) {
        if ( body( v, k ) )
            result.set( k, v );
    } );
    return result;
};
// TODO: Add something corresponding to this to StrMap.
// NOTE: This body takes its args as ( k ).
JsnMap.prototype.mapKeys = function ( func ) {
    var result = jsnMap();
    this.each( function ( k, v ) {
        result.set( func( k ), v );
    } );
    return result;
};



// era-reader.js
// Copyright 2013-2016 Ross Angle. Released under the MIT License.
"use strict";

// This is a reader for Era's own dialect of s-expressions.
//
// After reading, the s-expression format is simple:
//
//   - An s-expression is either a list or an interpolated string.
//   - A list is either empty or an s-expression followed by a list.
//   - An interpolated string is an uninterpolated string, optionally
//     followed by an s-expression and an interpolated string.
//   - An uninterpolated string is a sequence of Unicode scalars
//     (integers 0x0..0x10FFFF but excluding UTF-16 surrogates
//     0xD800..0xDFFF).
//
// Before reading, the most complicated system is the string syntax.
// The design considerations for the string syntax actually impact
// most of the other parts of the syntax design.
//
// In the design of the overall syntax, we have several use cases in
// mind:
//
//   - Story: As someone who talks to people about code, I want to use
//     code snippets as diagrams in natural-language discussions.
//
//     - Problem: Some authorship systems would require me to take
//       screenshots or do export/import in order to properly copy and
//       paste between authored snippets and discussion.
//
//     - Solution: Like many programming langage syntaxes, Era's
//       syntax is edited as plain Unicode text. These days, plain
//       Unicode text is a widely used medium for natural language
//       communication.
//
//   - Story: As a programmer, I encounter nested structures all the
//     time, ranging from lambda calculus terms to loop bodies to data
//     structures. It would be nice if editing these trees were
//     straightforward.
//
//     - Problem: Most languages' code is plain-text-based, and plain
//       text is flat.
//
//     - Solution: This syntax follows in the tradition of the Lisp
//       family of languages by defining a single (a b c ...) nested
//       list syntax that can be used for various kinds of nesting.
//       Once a programmer adopts tools or habits for this syntax,
//       it's almost like the syntax is a tree rather than a list in
//       the first place.
//
//     - Problem: Actually, some of the nesting I'm dealing with is
//       very lopsided to the right, like monadic/continuation-passing
//       style, pointful function composition, or right-associative
//       algebraic operations.
//
//     - Solution: There's a (a b /c d) syntax, and it's shorthand for
//       (a b (c d)). Besides saving a ) here and there, since / and (
//       look so different, they don't have to follow the same
//       indentation convention. Continuation-passing style code can
//       be written one call per line, making it look like imperative
//       code. Pointful function composition can be written
//       (f/g/h ...).
//
//   - Story: As a programmer who uses a text-based programming
//     language, namely this one, I have the skills and tools to edit
//     plain text, and I'd like to take advantage of them.
//
//     - Problem: If I want to specify plain text assets for my
//       program to use, I don't want to switch to another editor
//       environment just to define those assets.
//
//     - Solution: Like lots of programming language syntaxes, Era's
//       syntax supports string literals \;qq[...]. A string literal
//       can contain *practically* any text, and that text will be
//       *mostly* reflected in the reader's final result.
//
//   - Story: As a programmer who uses a text-based programming
//     language, namely this one, I'd like to generate text-based code
//     sometimes. In fact, I'd like to generate code to generate code,
//     and so on.
//
//     - Problem: Most string syntaxes frustrate me because they
//       require me to write escape sequences in my code. Different
//       stages of generated code look completely different because I
//       have to write escape sequences for my escape sequences. Since
//       they look so different, I can't easily refactor my project in
//       ways that add or remove stages.
//
//     - Solution: This string syntax uses an escape sequences
//       \;qq[...] that looks exactly like the string syntax itself,
//       and the sole purpose of this escape sequence is for
//       generating code that contains this string syntax. Escape
//       sequences occurring inside these brackets are suppressed, so
//       \n generates "\n" rather than a newline, and so on. Thanks to
//       this, every stage of generated code looks almost entirely the
//       same.
//
//     - Problem: The escape sequence \;qq[...] generates both "\;qq["
//       and "]" in a single string, and sometimes I want to insert a
//       value in the middle. I could write this as a concatenation
//       bookended by one string that escapes \;qq[ as \^;qq\<` and
//       one that escapes ] as \>` but I'd rather not make such a
//       pervasive syntax replacement for such a focused insertion.
//
//     - Solution: There's an interpolation escape sequence \;uq;ls...
//       which lets s-expressions be interspersed with other string
//       parts at read time. This way both \;qq[ and ] can be part of
//       the same string literal, even if there's an interpolation in
//       the middle.
//
//     - Problem: Wouldn't that be suppressed like any other escape
//       sequence inside the \;qq[...] boundaries?
//
//     - Solution: All escape sequences can actually be un-suppressed
//       any number of levels by writing things like
//       \;uq;uq;uq;uq;ls... for example. The escape sequence
//       \;uq;ls... is actually \;ls... modified by \;uq and \;qq[...]
//       is \[...] modified by \;qq. The function of \;qq and \;uq is
//       to suppress and un-suppress escape sequences respectively.
//
//     - Problem: Different stages of code still look different
//       because some of them use \;uq;ls... while others have to use
//       \;uq;uq;uq;uq;ls... in its place. If I refactor my code to
//       add or remove a stage before or after all other stages, I'm
//       fine, but if I refactor it to add or remove a stage somewhere
//       in the middle, I have to go all over my code to add or remove
//       ";uq".
//
//     - Solution: You can use \;(wq foo);qq... to locally define the
//       name "foo" to refer to the current quasiquotation level
//       before you start a new one. Then you can use \;(rq foo)... to
//       rewind back to the original level. Altogether, you can write
//       \;(wq foo);qq[...\;(rq foo);ls(...)...] instead of
//       \;qq[...\;uq;ls(...)...] for example.
//
//     - Problem: I'm generating an \;uq;ls... interpolation sequence,
//       and I want to build the inserted s-expression by string
//       concatenation. However, that means it won't really be an
//       s-expression; it will have string interpolations interspersed
//       in its code. This means I can't necessarily count on the
//       reader to know where a suppressed \;uq;ls... begins and ends.
//
//     - Solution: That's definitely an issue if some of the strings
//       you're inserting have unmatched delimiters. Other cases
//       should be fine, because the syntax first parses the
//       s-expression using a "naive" mode which mostly matches the
//       syntax of strings.
//
//   - As a programmer whose programs contain error messages and
//     documentation, I'd like to write long strings of
//     natural-language prose.
//
//     - Problem: In most programming languages, if I want to be picky
//       about whitespace in a long string, then I have to make sure
//       not to insert any whitespace that I don't want the string to
//       contain. This gets in my way when I want to use indentation
//       and line breaks that match the surrounding code style.
//
//     - Solution: The \;qq[...] string syntax collapses all
//       whitespace. It also supports whitespace escapes for local
//       cases when that behavior is unwanted, such as blank lines
//       between natural-language paragraphs.
//
//     - Problem: Sometimes I do want to be picky about whitespace,
//       such as when I'm writing my natural-language prose in some
//       kind of markdown format.
//
//     - Solution: The \;yp;in[...] escape sequence lets you write a
//       span of preformatted text, where whitespace is not collapsed.
//       You can write \;qq;yp[...] if you want this setting to apply
//       to the whole string, and you can write \;np;in[...] around
//       any span of text that should not be considered preformatted.
//       (TODO: Actually implement \;in[...] so this can work.)
//
// The design we've settled on at this point is the following:

// <other safe> ::= ("=" | ";" | "'" | "," | "." | "/")
// <other> ::= (<other safe> | "\" | "(" | ")" | "[" | "]")
// <other delim> ::= (<other> | "`")
// <tx> ::= ...any printable character except <other delim>
// <nl> ::= ...any line break character or CRLF
// <ws> ::= ...any whitespace character except <nl>
// <end> ::= ...the end of the document
// <wsnl> ::= (<ws> | <nl>)
// <string element> ::= (<tx> | <other safe>)*
//   // Ambiguity resolution: Doesn't matter. (Actually, the entire
//   // reader syntax should have no ambiguity that makes a
//   // difference, unless there's a bug. That's what all the
//   // lookaheads are here to ensure.)
//
// <string element> ::= <wsnl>*
//   // Ambiguity resolution: Doesn't matter.
//   //
//   // If preformatting is off, this is a span of raw whitespace
//   // surrounded by lurking commands to normalize it along with all
//   // preceding and following raw whitespace. Otherwise, it's just a
//   // span of raw whitespace. Normalizing whitespace means turning
//   // one or more raw whitespace characters into a single space.
//
// <string element> ::= "[" <string element>* "]"
// <string element> ::= "(" <string element>* ")"
//   // This represents the contents surrounded by brackets.
//   //
//   // NOTE: This gives us delimiters we can use without any need to
//   // escape the same delimiters when they're used inside. This is
//   // useful for expression languages. We reserve two delimiters for
//   // use this way: The delimiter ( ) is very common for expression
//   // languages, and it's sometimes easier to type thanks to its use
//   // in English. The delimiter [ ] is unshifted on an American
//   // keyboard, and it's more visually distinct from ( ) than { }
//   // is. By not reserving the delimiter { } in the same way, we
//   // leave open the possibility of syntaxes where some delimiters
//   // don't need to be balanced, with one example being our own \{
//   // and \} escape sequences.
//
// <string element> ::= <string escape>
//
// <string escape> ::= "\" <escape>
//   // What this represents varies by the escape sequence.
//   //
//   // When processing an escape sequence, occurrences of whitespace
//   // and comments are ignored, delimiters are normalized, and
//   // occurrences of reader depth modifiers are collected.
//   // Occurrences of \;__ unflatten their first s-expressions, but
//   // these s-expressions may still be treated as string data as
//   // well.
//   //
//   // At any quasiquotation depth greater than the depths listed
//   // here, the escape sequences are suppressed, treated as
//   // uninterpreted string data.
//   //
//   // Occurrences of \_ at a depth of 0 or 1, where _ is an
//   // s-expression, unflatten their s-expressions.
//   //
//   // \^ \< \> \{ \} at a depth of 1 represent \ [ ] ( )
//   // \s \t \r \n at a depth of 1 represent space, tab, carriage
//   //   return, newline as non-raw whitespace, surrounded by lurking
//   //   commands to eliminate all preceding and following raw
//   //   whitespace.
//   // \c (meaning "concatenate") at a depth of 1 represents a
//   //   lurking command to eliminate all preceding and following raw
//   //   whitespace.
//   // \;in(_) (meaning "inline") represents its body's contents
//   //   without the brackets, unpeeked, surrounded with lurking
//   //   commands that inhibit other lurking commands from passing
//   //   through.
//   //   // TODO: Implement this.
//   // \=_ \;rm_ at a depth of 1 represent empty strings. This is
//   //   useful for comments.
//   // \(ch _) at a depth of 1 represents the Unicode scalar value
//   //   obtained by parsing the given string as a hexadecimal
//   //   number.
//   // \;ls_ (meaning "lists and strings") at a depth of 0, where _
//   //   is an s-expression, represents an interpolation of the given
//   //   s-expression into the string.
//
// <rm> ::= <ws>
//
// <rm> ::= "\" <escape>
//   // What this represents does not actually vary by the escape
//   // sequence, but the accepted escape sequences are listed below.
//   //
//   // When processing an escape sequence, occurrences of whitespace
//   // and comments are ignored, delimiters are normalized, and
//   // occurrences of reader depth modifiers are collected.
//   // Occurrences of \;__ unflatten their first s-expressions, but
//   // these s-expressions may still be treated as string data as
//   // well.
//   //
//   // \=_ \;rm_ at a depth of 0 represent comments.
//
// <rmnl> ::= (<rm> | <nl>)
//
// <escape> ::= <rmnl>* <escape>
//   // Ambiguity resolution: Doesn't matter.
// <escape> ::= ";" <escape> <escape>
//   // NOTE: The character ; suggests two-ness in its shape.
// <escape> ::=
//   lookahead("[" | "(" | "/" | "`" | <tx>)
//   <naive non-infix s-expression>
// <escape> ::=
//   "=" (<tx> | <ws> | <other delim>)* lookahead(<nl> | <end>)
// // NOTE: We don't have escape sequences \) or \] because any such
// // sequence would need to have both its characters escaped to be
// // represented as a string, since otherwise this syntax would
// // interpret the ) or ] in other ways.
// //
// // NOTE: We're specifically avoiding special-casing certain
// // characters in the syntax altogether:
// //
// //  ~ ! @ # $ % ^ & * _ + { } | : " < > ? are shifted on an
// //    American keyboard, so they're a last resort, and we've made
// //    them valid identifier characters. Identifier characters
// //    include Basic Latin letters and digits and the - character as
// //    well. Some identifiers are special-cased in escape sequences,
// //    in the spirit of reserved words.
// //
// //  ' , just haven't been used yet. However, they're specifically
// //    invalid as identifier characters just in case.
//
// <naive non-infix s-expression> ::= "[" <string element>* "]"
// <naive non-infix s-expression> ::= "(" <string element>* ")"
// <naive non-infix s-expression> ::=
//   "/" <string element>* lookahead("]" | ")")
// <naive non-infix s-expression> ::=
//   "`"? (<tx> | <string escape>)+
//   ("`" | lookahead(<wsnl> | <other> | <end>))
//
// <s-expression> ::=
//   <s-expression> <rmnl>* "." <non-infix s-expression>
//   // This represents a two-element list.
// <s-expression> ::= <non-infix s-expression>
// <non-infix s-expression> ::= <rmnl>* <non-infix s-expression>
//   // Ambiguity resolution: Doesn't matter.
// <non-infix s-expression> ::= "[" <s-expression>* <rmnl>* "]"
// <non-infix s-expression> ::= "(" <s-expression>* <rmnl>* ")"
// <non-infix s-expression> ::=
//   "/" <s-expression>* <rmnl>* lookahead("]" | ")")
// <non-infix s-expression> ::=
//   "`"? <tx>+ ("`" | lookahead(<wsnl> | <other> | <end>))
//   // This represents a string s-expression. It can only express
//   // certain strings.
//
// <non-infix s-expression> ::=
//   "`"? "\" <escape> ("`" | lookahead(<wsnl> | <other> | <end>))
//   // What this represents varies by the escape sequence.
//   //
//   // When processing an escape sequence, occurrences of whitespace
//   // and comments are ignored, delimiters are normalized, and
//   // occurrences of reader depth modifiers are collected.
//   // Occurrences of \;__ unflatten their first s-expressions, but
//   // these s-expressions may still be treated as string data as
//   // well.
//   //
//   // \_ at a depth of 0, where _ is an s-expression, unflattens its
//   //   s-expression, and it represents its s-expression value. This
//   //   is useful because it means the code (... \;qq/\/a b ...)
//   //   generates an s-expression equivalent to that generated by
//   //   (... \;qq/(a b ...)), but without requiring an extra ending
//   //   bracket.
//   //   //
//   //   // NOTE: It wouldn't be the same to write
//   //   // (... \;qq//a b ...) because / intentionally has no
//   //   // special meaning in a string. Existing textual syntaxes
//   //   // tend to use / for things like division, comments, and
//   //   // markup end tags, and if we had a special meaning for / it
//   //   // would be more cumbersome to generate these syntaxes.
//   //
//   // \(_) at a depth of 1 represents an interpolated string
//   //   s-expression. The contents are unpeeked. If preformatting is
//   //   off, the string is surrounded by lurking commands to
//   //   eliminate its leading and trailing whitespace. Whether
//   //   preformatting is on or not, the lurking commands in the
//   //   string are processed.
//
// <top-level s-expression> ::=
//   <top-level s-expression> <rm>* "." <non-infix s-expression>
//   // This represents a two-element list.
// <top-level s-expression> ::= <non-infix s-expression>
//
// <top level> ::= <top-level s-expression>* <rmnl>*
//   // This unflattens each s-expression, and it represents the
//   // sequence of their s-expression values. This sequence can be
//   // parsed incrementally from first to last.


// Reader depth modifiers:
//
// These modify escape sequences. For instance, \() can be modified as
// by ;qq by writing \;qq().
//
// ;yp (meaning "yes preformatting") turns preformatting on for as
//   long as the current quasiquotation depth lasts.
// ;np (meaning "no preformatting") turns preformatting on for as long
//   as the current quasiquotation depth lasts.
// ;qq (meaning "quasiquote") increases the depth by 1.
// ;uq (meaning "unquote") decreases the depth by 1.
// ;(wq _) (meaning "with current quasiquotation level") lets the
//   given string be bound to the current quasiquotation depth in the
//   quasiquotation depth environment for as long as the current
//   quasiquotation depth lasts.
// ;(lq _ _) (meaning "let quasiquotation level") looks up the
//   quasiquotation depth the second given string is bound to in the
//   quasiquotation depth environment, and it lets the first given
//   string be bound to that quasiquotation depth in the
//   quasiquotation depth environment for as long as the current
//   quasiquotation depth lasts.
//   // TODO: Implement this.
// ;(rq _) (meaning "restore quasiquotation level") looks up the
//   quasiquotation depth the given string is bound to in the
//   quasiquotation depth environment, and it decreases the
//   quasiquotation depth to that.

// NOTE: We give most escape sequences two-letter names because that
// that's a little more mnemonic than the traditional one-letter
// names. It also lets us use "l" and "o" without confusing them with
// digits, lets us avoid resorting to idiosyncratic capitalization,
// and gives us a three-character string like ";pr" we can grep for.
// For escapes dedicated to single characters, we use short escape
// sequences with punctuation like \< or letters like \t depending on
// whether the original character was already punctuation. The
// substitute punctuation helps it continue to stand out.

// Whenever an s-expression is unflattened, for the initial state of
// that unflattening, the quasiquotation depth is 0, the
// quasiquotation depth environment is empty, and preformatting is
// off. Until an s-expression is unflattened, it's just treated as
// string data, and it can contain string escape sequences that
// wouldn't be valid in an s-expression. This way, an s-expression can
// be built up by string concatenation.

// Whenever a delimited sequence of string elements is unpeeked, if
// any suppressed escape sequence in the string uses a / delimiter
// that ends at the same place the whole sequence ends, that
// suppressed / delimiter is converted to a suppressed [ ] or ( )
// delimiter corresponding to the whole sequence's closing delimiter.


function customStream( underlyingStream, read ) {
    var stream = {};
    stream.underlyingStream = underlyingStream;
    stream.peek = function ( yoke, then ) {
        return runWaitOne( yoke, function ( yoke ) {
        return read( yoke, underlyingStream,
            function ( yoke, underlyingStream, result ) {
        return runWaitOne( yoke, function ( yoke ) {
        
        var cachingStream = {};
        cachingStream.underlyingStream = underlyingStream;
        cachingStream.peek = function ( yoke, then ) {
            return runWaitOne( yoke, function ( yoke ) {
                return then( yoke, cachingStream, result );
            } );
        };
        cachingStream.read = function ( yoke, then ) {
            return runWaitOne( yoke, function ( yoke ) {
                return then( yoke,
                    customStream( underlyingStream, read ),
                    result );
            } );
        };
        return then( yoke, cachingStream, result );
        
        } );
        } );
        } );
    };
    stream.read = function ( yoke, then ) {
        return runWaitOne( yoke, function ( yoke ) {
        return read( yoke, underlyingStream,
            function ( yoke, underlyingStream, result ) {
        return runWaitOne( yoke, function ( yoke ) {
        
        return then( yoke,
            customStream( underlyingStream, read ),
            result );
        
        } );
        } );
        } );
    };
    return stream;
}
function streamPrepend( originalStream, element ) {
    var result = { ok: true, val: { val: element } };
    
    var stream = {};
    stream.underlyingStream = originalStream.underlyingStream;
    stream.peek = function ( yoke, then ) {
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, stream, result );
        } );
    };
    stream.read = function ( yoke, then ) {
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, originalStream, result );
        } );
    };
    return stream;
}
function listToStream( list ) {
    return customStream( list, function ( yoke, list, then ) {
        if ( list === null )
            return then( yoke, null, { ok: true, val: null } );
        else
            return then( yoke, list.rest, { ok: true, val:
                { val: list.first } } );
    } );
}
function stringToClassifiedTokenStream( locationHost, string ) {
    if ( !isValidUnicode( string ) )
        throw new Error();
    
    var n = string.length;
    
    return customStream( {
        locationHost: locationHost,
        index: 0,
        line: 0,
        justSawCarriageReturn: false,
        column: 0
    }, function ( yoke, state, then ) {
        if ( n <= state.index )
            return then( yoke, state, { ok: true, val: null } );
        var regex =
            /[ \t]+|[\r\n`=;',\.\\/()\[\]]|[^ \t\r\n`=;',\.\\/()\[\]]*/g;
        regex.lastIndex = state.index;
        var token = regex.exec( string )[ 0 ];
        var newState = {
            locationHost: state.locationHost,
            index: state.index + token.length,
            line:
                token === "\r"
                    || (token === "\n"
                        && !state.justSawCarriageReturn) ?
                    state.line + 1 :
                    state.line,
            justSawCarriageReturn: token === "\r",
            // TODO: Instead of using the JavaScript string length,
            // use the number of Unicode scalars.
            column: token === "\r" || token === "\n" ? 0 :
                state.column + token.length
        };
        return then( yoke, newState, { ok: true, val: { val: {
            tokenLocStart: state,
            tokenLocStop: newState,
            tokenLocToken: token
        } } } );
    } );
}
function exhaustStream( yoke, s, then ) {
    // This reads the remainder of the stream as a linked list.
    //
    // NOTE: Unlike most of the utilities in this file, if this
    // encounters an error, it returns the error message *along with*
    // the list of s-expressions already read.
    
    return loop( yoke, s, null );
    function loop( yoke, s, revList ) {
        return s.read( yoke, function ( yoke, s, result ) {
            
            if ( !result.ok )
                return jsListRev( yoke, revList,
                    function ( yoke, list ) {
                    
                    return then( yoke, s,
                        { ok: false, msg: result.msg, val: list } );
                } );
            
            if ( result.val === null )
                return jsListRev( yoke, revList,
                    function ( yoke, list ) {
                    
                    return then( yoke, s, { ok: true, val: list } );
                } );
            else
                return loop( yoke, s,
                    { first: result.val.val, rest: revList } );
        } );
    }
}

// NOTE: For this, `s` must be a classified token stream.
function readRestOfLine( yoke, s, revElements, then ) {
    return s.peek( yoke, function ( yoke, s, result ) {
        if ( !result.ok )
            return then( yoke, s, result );
        
        if ( result.val === null
            || /^[\r\n]$/.test( result.val.val.tokenLocToken ) )
            return jsListRev( yoke, revElements,
                function ( yoke, elements ) {
                
                return then( yoke, s, { ok: true, val: {
                    stop: result.val.val.tokenLocStart,
                    elements: elements
                } } );
            } );
        else
            return s.read( yoke, function ( yoke, s, result ) {
                if ( !result.ok )
                    return then( yoke, s, result );
                
                return readRestOfLine( yoke, s,
                    { first: { type: "scalars", val: result.val.val },
                        rest: revElements },
                    then );
            } );
    } );
}
// NOTE: For this, `s` must be a classified token stream.
function readBracketedStringElements( yoke, s,
    closeRegex, consume, revSoFar, then ) {
    
    return s.peek( yoke, function ( yoke, s, result ) {
        if ( !result.ok )
            return then( yoke, s, result );
        
        if ( result.val === null ) {
            return then( yoke, s, { ok: false, msg:
                "Expected a closing bracket, got end of document" } );
            
        } else if (
            closeRegex.test( result.val.val.tokenLocToken ) ) {
            
            if ( consume )
                return s.read( yoke, function ( yoke, s, result ) {
                    if ( !result.ok )
                        return then( yoke, s, result );
                    return next( yoke, s, result.val.val );
                } );
            else
                return next( yoke, s, result.val.val );
        } else {
            return readStringElement( yoke, s,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                if ( result.val === null )
                    throw new Error();
                return readBracketedStringElements( yoke, s,
                    closeRegex, consume,
                    { first: result.val.val, rest: revSoFar }, then );
            } );
        }
        
        function next( yoke, s, close ) {
            return jsListRev( yoke, revSoFar,
                function ( yoke, elements ) {
                
                return then( yoke, s, { ok: true, val:
                    { close: close, elements: elements } } );
            } );
        }
    } );
}
// NOTE: For this, `s` must be a classified token stream.
function readStringElement( yoke, s, then ) {
    return s.read( yoke, function ( yoke, s, result ) {
        if ( !result.ok )
            return then( yoke, s, result );
        
        if ( result.val === null )
            return then( yoke, s, result );
        
        var locatedToken = result.val.val;
        var c = locatedToken.tokenLocToken;
        if ( /^[)\]]$/.test( c ) )
            return then( yoke, s, { ok: false, msg:
                "Unmatched " + c + " in text" } );
        else if ( c === "\\" )
            return readEscape( yoke, s, function ( yoke, s, result ) {
                if ( !result.ok )
                    return then( yoke, s, result );
                return then( yoke, s, { ok: true, val:
                    { val:
                        { type: "escape",
                            punc: jsList( { type: "scalars",
                                val: locatedToken } ),
                            suffix: result.val } } } );
            } );
        else if ( c === "(" )
            return readBracketedStringElements( yoke, s,
                /^[)]$/, !!"consume", null,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                return then( yoke, s,
                    { ok: true, val:
                        { val:
                            { type: "textDelimited",
                                open: locatedToken,
                                close: result.val.close,
                                elements: result.val.elements } } } );
            } );
        else if ( c === "[" )
            return readBracketedStringElements( yoke, s,
                /^\]$/, !!"consume", null,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                return then( yoke, s,
                    { ok: true, val:
                        { val:
                            { type: "textDelimited",
                                open: locatedToken,
                                close: result.val.close,
                                elements: result.val.elements } } } );
            } );
        else
            return then( yoke, s, { ok: true, val:
                { val: { type: "scalars", val: locatedToken } } } );
    } );
}
// NOTE: For this, `s` must be a classified token stream.
function readNaiveSexpStringElements( yoke, s, revSoFar, then ) {
    return s.peek( yoke, function ( yoke, s, result ) {
        if ( !result.ok )
            return then( yoke, s, result );
        
        if ( result.val === null )
            return then( yoke, s, result );
        
        var locatedToken = result.val.val;
        var c = locatedToken.tokenLocToken;
        if ( /^[)\]]$/.test( c ) )
            return then( yoke, s, { ok: false, msg:
                "Unmatched " + c + " in s-expression" } );
        else if ( c === "." )
            return then( yoke, s, { ok: false, msg:
                "Expected s-expression, encountered . outside an " +
                "infix context" } );
        else if ( /^[=;',]$/.test( c ) )
            return then( yoke, s, { ok: false, msg:
                "Expected s-expression, encountered " + c } );
        else if ( /^[ \t\r\n]*$/.test( c ) )
            return readNaiveSexpStringElements( yoke, s,
                { first: { type: "scalars", val: locatedToken },
                    rest: revSoFar },
                then );
        else if ( /^[(\[]$/.test( c ) )
            return readStringElement( yoke, s,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                if ( result.val === null )
                    throw new Error();
                return next( yoke, s, result.val.val );
            } );
        else if ( c === "/" )
            return s.read( yoke, function ( yoke, s, result ) {
                return readBracketedStringElements( yoke, s,
                    /^[)\]]$/, !"consume", null,
                    function ( yoke, s, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    
                    if ( result.val.close.tokenLocToken === ")" )
                        return next( yoke, s,
                            { type: "textDelimited",
                                open: locatedToken,
                                close: result.val.close,
                                elements: result.val.elements } );
                    else if ( result.val.close.tokenLocToken === "]" )
                        return next( yoke, s,
                            { type: "textDelimited",
                                open: locatedToken,
                                close: result.val.close,
                                elements: result.val.elements } );
                    else
                        throw new Error();
                } );
            } );
        else if ( c === "`" )
            return s.read( yoke, function ( yoke, s, result ) {
                return readIdentifierStringElement( yoke, s, !"any",
                    { first: { type: "scalars", val: locatedToken },
                        rest: revSoFar } );
            } );
        else
            return readIdentifierStringElement( yoke, s, !"any",
                revSoFar );
        
        function next( yoke, s, last ) {
            if ( last.type !== "textDelimited" )
                throw new Error();
            return jsListRev( yoke, { first: last, rest: revSoFar },
                function ( yoke, elements ) {
                
                return then( yoke, s, { ok: true, val: {
                    stop: last.open.tokenLocToken === "/" ?
                        last.close.tokenLocStart :
                        last.close.tokenLocStop,
                    elements: elements
                } } );
            } );
        }
    } );
    
    function readIdentifierStringElement( yoke, s, any, revSoFar ) {
        return s.peek( yoke, function ( yoke, s, result ) {
            if ( !result.ok )
                return then( yoke, s, result );
            
            if ( result.val === null )
                return next( yoke, s, revSoFar );
            
            var locatedToken = result.val.val;
            var c = locatedToken.tokenLocToken;
            if ( /^[ \t\r\n=;',\./()\[\]]*$/.test( c ) )
                return next( yoke, s, locatedToken.tokenLocStart,
                    revSoFar );
            else if ( c === "`" )
                return s.read( yoke, function ( yoke, s, result ) {
                    return next( yoke, s, locatedToken.tokenLocStop, {
                        first: { type: "scalars", val: locatedToken },
                        rest: revSoFar
                    } );
                } );
            else if ( c === "\\" )
                return s.read( yoke, function ( yoke, s, result ) {
                    return readEscape( yoke, s,
                        function ( yoke, s, result ) {
                        
                        if ( !result.ok )
                            return then( yoke, s, result );
                        var locatedEscape = result.val;
                        return readIdentifierStringElement( yoke, s,
                            !!"any",
                            { first:
                                { type: "escape",
                                    punc: jsList( { type: "scalars", val: locatedToken } ),
                                    suffix: {
                                        escapeLocStart: locatedToken.tokenLocStart,
                                        escapeLocStop: locatedEscape.escapeLocStop,
                                        escapeLocEscape: locatedEscape.escapeLocEscape
                                    } },
                                    rest: revSoFar } );
                    } );
                } );
            else
                return s.read( yoke, function ( yoke, s, result ) {
                    return readIdentifierStringElement( yoke, s,
                        !!"any",
                        {
                            first: { type: "scalars",
                                val: locatedToken },
                            rest: revSoFar
                        } );
                } );
            
            function next( yoke, s, stop, revSoFar ) {
                if ( !any )
                    return then( yoke, s, { ok: false, msg:
                        "Expected s-expression, encountered ` with" +
                        "no identifier or \\ after it" } );
                return jsListRev( yoke, revSoFar,
                    function ( yoke, elements ) {
                    
                    return then( yoke, s, { ok: true, val: {
                        stop: stop,
                        elements: elements
                    } } );
                } );
            }
        } );
    }
}

// NOTE: In a few cases, stringElementsToString(),
// stringElementToString(), and escapeToString() may encode a value in
// a way that can't be parsed back in:
//
//   - The element contains a "comment" escape suffix, but it is not
//     in a context where its closing end-of-line or end-of-document
//     will be in the expected place.
//   - The value contains an "naiveSexp" escape suffix, and its
//     opening bracket is / but it is not in a context where its
//     closing bracket will be in the expected place.
//   - The element contains a "scalars" string element whose value is
//     \ ( ) [ ] or whitespace.
//
// If the value was created by parsing in the first place, these cases
// should be impossible anyway, aside from the fact that a "naiveSexp"
// whose opening bracket is / may run up to the end of the string.
function stringElementsToString( yoke, elements, then ) {
    return jsListMappend( yoke, elements,
        function ( yoke, element, then ) {
        
        return stringElementToString( yoke, element, then );
    }, then );
}
function escapeToString( yoke, locatedEsc, then ) {
    var esc = locatedEsc.escapeLocEscape;
    return runWaitOne( yoke, function ( yoke ) {
        if ( esc.type === "pair" ) {
            return escapeToString( yoke, esc.first,
                function ( yoke, first ) {
            return escapeToString( yoke, esc.second,
                function ( yoke, second ) {
            
            return jsListFlattenOnce( yoke,
                jsList( esc.punc, first, second ), then );
            
            } );
            } );
        } else if ( esc.type === "spaced" ) {
            return escapeToString( yoke, esc.suffix,
                function ( yoke, suffix ) {
            
            return jsListAppend( yoke, esc.punc, suffix, then );
            
            } );
        } else if ( esc.type === "commented" ) {
            return escapeToString( yoke, esc.comment,
                function ( yoke, comment ) {
            return escapeToString( yoke, esc.suffix,
                function ( yoke, suffix ) {
            
            return jsListFlattenOnce( yoke,
                jsList( esc.punc, comment, suffix ),
                then );
            
            } );
            } );
        } else if ( esc.type === "comment" ) {
            return jsListAppend( yoke, esc.punc, esc.elements, then );
        } else if ( esc.type === "naiveSexp" ) {
            return stringElementsToString( yoke, esc.elements, then );
        } else {
            throw new Error();
        }
    } );
}
function stringElementToString( yoke, element, then ) {
    if ( element.type === "escape" )
        return escapeToString( yoke, element.suffix,
            function ( yoke, elements ) {
            
            return jsListAppend( yoke, element.punc, elements, then );
        } );
    else if ( element.type === "textDelimited" )
        return stringElementsToString( yoke, element.elements,
            function ( yoke, elements ) {
            
            return jsListFlattenOnce( yoke, jsList(
                jsList( { type: "scalars", val: element.open } ),
                elements,
                element.open.tokenLocToken === "/" ?
                    jsList() :
                    jsList( { type: "scalars", val: element.close } )
            ), then );
        } );
    else if ( element.type === "scalars" )
        return runWaitOne( yoke, function ( yoke ) {
            return then( yoke, jsList( element ) );
        } );
    else
        throw new Error();
}


function nonemptyReaderStringListToLocatedToken( stringList ) {
    if ( stringList === null )
        throw new Error();
    var start = stringList.first.tokenLocStart;
    var stop;
    var token = "";
    var rest = stringList;
    for ( ; rest !== null; rest = rest.rest ) {
        token += rest.first.tokenLocToken;
        stop = rest.first.tokenLocStop;
    }
    return {
        tokenLocStart: start,
        tokenLocStop: stop,
        tokenLocToken: token
    };
}

function readerStringListToString( stringList ) {
    var result = "";
    var rest = stringList;
    for ( ; rest !== null; rest = rest.rest )
        result += rest.first.tokenLocToken;
    return result;
}

function readerStringNilToString( stringNil ) {
    return readerStringListToString( stringNil.exprLocExpr.string );
}

function readerExprPretty( locatedExpr ) {
    var expr = locatedExpr.exprLocExpr;
    if ( expr.type === "nil" ) {
        return "()";
    } else if ( expr.type === "cons" ) {
        if ( expr.rest.exprLocExpr.type === "nil" ) {
            if ( expr.first.exprLocExpr.type === "nil"
                || expr.first.exprLocExpr.type === "cons" ) {
                return "(/" +
                    readerExprPretty( expr.first ).substr( 1 );
            } else {
                return "(" + readerExprPretty( expr.first ) + ")";
            }
        } else if ( expr.rest.exprLocExpr.type === "cons" ) {
            return "(" + readerExprPretty( expr.first ) + " " +
                readerExprPretty( expr.rest ).substr( 1 );
        } else {
            throw new Error();
        }
    } else if (
        expr.type === "stringNil" || expr.type === "stringCons" ) {
        
        var s = "";
        var terps = [];
        var locatedE = locatedExpr;
        var e = expr;
        while ( e.type === "stringCons" ) {
            s += readerStringListToString( e.string ).
                // TODO: Remove the trailing ` when possible.
                replace( /\\/g, "\\^`" );
            // We temporarily represent interpolations using the
            // invalid escape sequence \'~. This lets us put all the
            // string contents into one JavaScript string, which lets
            // us discover matching brackets even if they have an
            // interpolation in between. Later on, we replace these
            // invalid escape sequences with the proper
            // interpolations.
            s += "\\'~";
            terps.push( readerExprPretty( e.interpolation ) );
            locatedE = e.rest;
            e = locatedE.exprLocExpr;
        }
        if ( e.type !== "stringNil" )
            throw new Error();
        // TODO: Remove the trailing ` when possible.
        s += readerStringNilToString(
            locatedE ).replace( /\\/g, "\\^`" );
        var lastTerpAtEnd = /\\'~$/.test( s );
        
        while ( true ) {
            // If there are matching brackets, we want to display them
            // as raw brackets rather than escape sequences. To do so,
            // we temporarily convert them to the invalid escape
            // sequences \'< \'> \'{ \'}, then escape all the
            // non-matching brackets, then replace these invalid
            // escape sequences with raw brackets again.
            var s2 = s.
                replace( /\[([^()\[\]]*)\]/g, "\\'<$1\\'>" ).
                replace( /\(([^()\[\]]*)\)/g, "\\'{$1\\'}" );
            if ( s === s2 )
                break;
            s = s2;
        }
        s = s.
            // TODO: Remove the trailing ` when possible.
            replace( /\[/g, "\\<`" ).replace( /\]/g, "\\>`" ).
            replace( /\(/g, "\\{`" ).replace( /\)/g, "\\}`" ).
            replace( /\\'</g, "[" ).replace( /\\'>/g, "]" ).
            replace( /\\'{/g, "(" ).replace( /\\'}/g, ")" ).
            replace( /[ \t\r\n]+[a-zA-Z]?/g, function ( whitespace ) {
                if ( /^ [a-zA-Z]?$/.test( whitespace ) )
                    return whitespace;
                // NOTE: We insert an underscore as a placeholder, and
                // then we safely convert it to a raw space after the
                // spaces have been replaced with explicit whitespace
                // escape sequences.
                // TODO: Remove the trailing ` when possible.
                return whitespace.
                    replace( /[a-zA-Z]/g, "_$&" ).
                    replace( / /g, "\\s`" ).
                    replace( /\t/g, "\\t`" ).
                    replace( /\r/g, "\\r`" ).
                    replace( /\n/g, "\\n`" ).
                    replace( /_/g, " " );
            } ).
            replace( /\\'~/g, function () {
                var terp = terps.shift();
                var m;
                if ( lastTerpAtEnd && terps.length === 0 ) {
                    if ( m = /^\\;qq\[(.*)\]$/.exec( terp ) )
                        return "\\;uq;ls`\\;qq/" + m[ 1 ];
                    else if ( m = /^\((.*)\)$/.exec( terp ) )
                        return "\\;uq;ls/" + m[ 1 ];
                    else
                        return "\\;uq;ls`" + terp;
                } else {
                    if ( /^\\;qq\[.*\]$/.test( terp ) )
                        // TODO: Remove the trailing ` when possible.
                        return "\\;uq;ls`" + terp + "`";
                    else if ( m = /^\((.*)\)$/.exec( terp ) )
                        return "\\;uq;ls" + terp;
                    else
                        // TODO: Remove the trailing ` when possible.
                        return "\\;uq;ls`" + terp + "`";
                }
            } );
        return /^[^ \t\r\n`=;',\./()\[\]]*$/.test( s ) ? s :
            "\\;qq[" + s + "]";
    } else {
        throw new Error();
    }
}

function readerJsStringPretty( jsString ) {
    return readerExprPretty( {
        exprLocStart: null,
        exprLocStop: null,
        exprLocExpr:
            { type: "stringNil", string:
                { first:
                    { tokenLocStart: null, tokenLocStop: null,
                        tokenLocToken: jsString },
                    rest: null } }
    } );
}

// NOTE: For this, `s` must be a classified token stream.
function readEscape( yoke, s, then ) {
    return s.peek( yoke, function ( yoke, s, result ) {
        
        if ( !result.ok )
            return then( yoke, s, result );
        
        if ( result.val === null )
            return then( yoke, s, { ok: false, msg:
                "Expected escape sequence suffix, got end of " +
                "document" } );
        
        var locatedToken = result.val.val;
        var c = locatedToken.tokenLocToken;
        
        if ( /^[ \t\r\n]+$/.test( c ) ) {
            return s.read( yoke, function ( yoke, s, result ) {
                if ( !result.ok )
                    return then( yoke, s, result );
                return readEscape( yoke, s,
                    function ( yoke, s, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    var suffix = result.val;
                    return then( yoke, s,
                        { ok: true, val: {
                            escapeLocStart:
                                locatedToken.tokenLocStart,
                            escapeLocStop: suffix.escapeLocStop,
                            escapeLocEscape:
                                { type: "spaced",
                                    punc: jsList( { type: "scalars", val: locatedToken } ),
                                    suffix: suffix }
                        } } );
                } );
            } );
        }
        
        if ( /^[)\]]$/.test( c ) )
            return then( yoke, s, { ok: false, msg:
                "Unmatched " + c + " in escape sequence suffix" } );
        else if ( /^[',\.]$/.test( c ) )
            return then( yoke, s, { ok: false, msg:
                "Expected escape sequence suffix, got " + c } );
        else if ( c === "\\" )
            return s.read( yoke, function ( yoke, s, result ) {
            return readEscape( yoke, s, function ( yoke, result ) {
                if ( !result.ok )
                    return then( yoke, s, result );
                var comment = result.val;
                return readEscape( yoke, s,
                    function ( yoke, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    var suffix = result.val;
                    return then( yoke, s,
                        { ok: true, val: {
                            escapeLocStart:
                                locatedToken.tokenLocStart,
                            escapeLocStop: suffix.escapeLocStop,
                            escapeLocEscape:
                                { type: "commented",
                                    punc: jsList( { type: "scalars", val: locatedToken } ),
                                    comment: comment,
                                    suffix: suffix }
                        } } );
                } );
            } );
            } );
        else if ( c === "=" )
            return s.read( yoke, function ( yoke, s, result ) {
            return readRestOfLine( yoke, s, null,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                return then( yoke, s, { ok: true, val: {
                    escapeLocStart: locatedToken.tokenLocStart,
                    escapeLocStop: result.val.stop,
                    escapeLocEscape:
                        { type: "comment",
                            punc: jsList( { type: "scalars",
                                val: locatedToken } ),
                            elements: result.val.elements }
                } } );
            } );
            } );
        else if ( c === ";" )
            return s.read( yoke, function ( yoke, s, result ) {
            return readEscape( yoke, s,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                var first = result.val;
                return readEscape( yoke, s,
                    function ( yoke, s, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    var second = result.val;
                    return then( yoke, s, { ok: true, val: {
                        escapeLocStart: locatedToken.tokenLocStart,
                        escapeLocStop: second.escapeLocStop,
                        escapeLocEscape:
                            { type: "pair",
                                punc: jsList( { type: "scalars",
                                    val: locatedToken } ),
                                first: first,
                                second: second }
                    } } );
                } );
            } );
            } );
        else
            return readNaiveSexpStringElements( yoke, s, null,
                function ( yoke, s, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                return then( yoke, s, { ok: true, val: {
                    escapeLocStart: locatedToken.tokenLocStart,
                    escapeLocStop: result.val.stop,
                    escapeLocEscape:
                        { type: "naiveSexp",
                            elements: result.val.elements }
                } } );
            } );
    } );
}

function traverseSpaced( yoke, prefix, locatedEsc, then ) {
    var esc = locatedEsc.escapeLocEscape;
    return runWaitOne( yoke, function ( yoke ) {
        if ( esc.type === "spaced" ) {
            return jsListAppend( yoke, prefix, esc.punc,
                function ( yoke, prefix ) {
                
                return traverseSpaced( yoke,
                    prefix, esc.suffix, then );
            } );
        } else if ( esc.type === "commented"
            && esc.comment.escapeLocEscape.type === "pair" ) {
            
            var invalidComment = function ( yoke ) {
                return then( yoke, { ok: false, msg:
                    // TODO: Describe the invalid escape. We'll need
                    // an error string that can get larger than
                    // JavaScript's strings.
                    "Expected a comment, got a different escape " +
                    "sequence" } );
            };
            
            var pair = esc.comment.escapeLocEscape;
            
            if ( pair.first.type !== "naiveSexp" )
                return invalidComment( yoke );
            
            var encompassingClosingBracket = null;
            return readNaiveSexp( yoke, pair.first.elements,
                encompassingClosingBracket,
                function ( yoke, first ) {
                
                if ( !(first.type === "stringNil"
                    && readerStringNilToString( first ) === "rm") )
                    return invalidComment( yoke );
                
                return escapeToString( yoke, esc.comment,
                    function ( yoke, comment ) {
                    
                    return jsListFlattenOnce( yoke, jsList(
                        prefix,
                        esc.punc,
                        comment
                    ), function ( yoke, prefix ) {
                        return traverseSpaced( yoke,
                            prefix, esc.suffix, then );
                    } );
                } );
            } );
        } else {
            return then( yoke, { ok: true,
                prefix: prefix,
                esc: locatedEsc } );
        }
    } );
}

function readerStrMapNormalizeKey( k ) {
    // NOTE: This only normalizes the first segment of the key. This
    // is called repeatedly as the key is iterated over.
    
    var segmentSize = 1000;
    var currentK = k;
    var first = "";
    while ( first.length < segmentSize && currentK !== null ) {
        first += currentK.first.token;
        currentK = currentK.rest;
    }
    if ( segmentSize < first.length ) {
        currentK =
            { first: first.substr( segmentSize ), rest: currentK };
        first = first.substr( 0, segmentSize );
    }
    if ( first.length !== 0 )
        currentK = { first: first, rest: currentK };
    return currentK;
}

function ReaderStrMap() {}
ReaderStrMap.prototype.init_ = function ( rootVal, children ) {
    this.rootVal_ = rootVal;
    this.children_ = children;
    return this;
};
function readerStrMap() {
    return new ReaderStrMap().init_( null, strMap() );
}
ReaderStrMap.prototype.plusTruth = function ( yoke, origK, then ) {
    var self = this;
    return runWaitOne( yoke, function ( yoke ) {
        var k = readerStrMapNormalizeKey( origK );
        if ( k === null )
            return then( yoke,
                new ReaderStrMap().init_(
                    { val: true }, self.children_ ) );
        var newChild = self.children_.has( k.first ) ?
            self.children_.get( k.first ) : readerStrMap();
        return newChild.plusTruth( yoke, k.rest,
            function ( yoke, newChild ) {
            
            return runWaitOne( yoke, function ( yoke ) {
                return then( yoke,
                    new ReaderStrMap().init_( self.rootVal_,
                        self.children_.plusEntry( k.first,
                            newChild ) ) );
            } );
        } );
    } );
};
ReaderStrMap.prototype.has = function ( yoke, origK, then ) {
    var self = this;
    return runWaitOne( yoke, function ( yoke ) {
        var k = readerStrMapNormalizeKey( origK );
        if ( k === null )
            return then( yoke, self.rootVal_ !== null );
        if ( !self.children_.has( k.first ) )
            return then( yoke, false );
        return self.children_.get( k.first ).has( yoke,
            k.rest, then );
    } );
};

// NOTE: For this, `s` must be a stream of readStringElement results.
function readSexpOrInfixOp( yoke, s,
    encompassingClosingBracket, then ) {
    // NOTE: This can result in a value of type "sexp",
    // "infixNewline", or "infixDot".
    
    return s.read( yoke, function ( yoke, s, result ) {
        if ( !result.ok )
            return then( yoke, s, result );
        
        if ( result.val === null ) {
            return then( yoke, s, result );
        } else if ( result.val.val.type === "escape" ) {
            var withQqStack = function ( yoke, qqStack, esc ) {
                
                return traverseSpaced( yoke, jsList(), esc,
                    function ( yoke, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    var esc = result.esc.escapeLocEscape;
                
                if ( esc.type === "pair" ) {
                    if ( esc.first.escapeLocEscape.type !==
                        "naiveSexp" )
                        return then( yoke, s, { ok: false, msg:
                            "Expected s-expression escape suffix, " +
                            "got = with a non-s-expression after it"
                            } );
                    
                    return readNaiveSexp( yoke,
                        esc.first.escapeLocEscape.elements,
                        encompassingClosingBracket,
                        function ( yoke, result ) {
                        
                        if ( !result.ok )
                            return then( yoke, s, result );
                        var locatedOp = result.val;
                        var op = locatedOp.exprLocExpr;
                    
                    var isNameOp = function ( name ) {
                        return op.type === "stringNil" &&
                            readerStringNilToString( locatedOp ) === name;
                    };
                    var isStringOp = function ( name ) {
                        return (
                            op.type === "cons"
                            && op.rest.exprLocExpr.type === "cons"
                            && op.rest.exprLocExpr.rest.exprLocExpr.
                                type === "nil"
                            && op.first.exprLocExpr.type ===
                                "stringNil"
                            && readerStringNilToString( op.first ) ===
                                name
                            && op.rest.exprLocExpr.first.exprLocExpr.
                                type === "stringNil"
                        );
                    };
                    var isDoubleStringOp = function ( name ) {
                        return (
                            op.type === "cons"
                            && op.rest.exprLocExpr.type === "cons"
                            && op.rest.exprLocExpr.rest.exprLocExpr.
                                type === "cons"
                            && op.rest.exprLocExpr.rest.exprLocExpr.
                                rest.type === "nil"
                            && op.first.exprLocExpr.type ===
                                "stringNil"
                            && readerStringNilToString( op.first ) ===
                                name
                            && op.rest.exprLocExpr.first.exprLocExpr.
                                type === "stringNil"
                            && op.rest.exprLocExpr.rest.exprLocExpr.
                                first.exprLocExpr.type === "stringNil"
                        );
                    };
                    
                    if ( isNameOp( "rm" ) ) {
                        if ( qqStack.uq !== null )
                            return then( yoke, s, { ok: false, msg:
                                "Expected s-expression escape " +
                                "suffix, got ;rm at nonzero depth"
                                } );
                        return readSexpOrInfixOp( yoke, s,
                            encompassingClosingBracket, then );
                    } else if ( isNameOp( "yp" ) ) {
                        return withQqStack( yoke, {
                            uq: qqStack.uq,
                            cache: qqStack.cache.plusObj( {
                                normalizingWhitespace: false
                            } )
                        }, esc.second );
                    } else if ( isNameOp( "np" ) ) {
                        return withQqStack( yoke, {
                            uq: qqStack.uq,
                            cache: qqStack.cache.plusObj( {
                                normalizingWhitespace: true
                            } )
                        }, esc.second );
                    } else if ( isNameOp( "in" ) ) {
                        return then( yoke, s, { ok: false, msg:
                            "Expected s-expression escape " +
                            "suffix, got ;in" } );
                    } else if ( isNameOp( "ls" ) ) {
                        return then( yoke, s, { ok: false, msg:
                            "Expected s-expression escape " +
                            "suffix, got ;ls" } );
                    } else if ( isNameOp( "qq" ) ) {
                        return withQqStack( yoke, {
                            uq: qqStack,
                            cache: qqStack.cache.plusObj( {
                                names: readerStrMap()
                            } )
                        }, esc.second );
                    } else if ( isNameOp( "uq" ) ) {
                        if ( qqStack.uq === null )
                            return then( yoke, s, { ok: false, msg:
                                "Expected s-expression escape " +
                                "suffix, got ;uq at zero depth" } );
                        return withQqStack( yoke,
                            qqStack.uq, esc.second );
                    } else if ( isStringOp( "wq" ) ) {
                        var name = op.rest.exprLocExpr.first.
                            exprLocExpr.string;
                        return qqStack.cache.get( "names" ).
                            plusTruth( yoke, name,
                                function ( yoke, names ) {
                            
                            return withQqStack( yoke, {
                                uq: qqStack.uq,
                                cache: qqStack.cache.plusObj( {
                                    names: names
                                } )
                            }, esc.second );
                        } );
                    } else if ( isDoubleStringOp( "lq" ) ) {
                        var va = op.rest.exprLocExpr.first.
                            exprLocExpr.string;
                        var val = op.rest.exprLocExpr.rest.
                            exprLocExpr.first.exprLocExpr.string;
                        // TODO: Implement this. We don't actually
                        // store "values" in the `names` map, but
                        // we'll have to start doing so.
                        return then( yoke, s, { ok: false, msg:
                            "Expected s-expression escape suffix, " +
                            "got ;(lq ...) which hasn't been " +
                            "implemented yet" } );
                    } else if ( isStringOp( "rq" ) ) {
                        var name = op.rest.exprLocExpr.first.
                            exprLocExpr.string;
                        var unwindingQqStack = function ( yoke,
                            qqStack ) {
                            
                            return qqStack.cache.get( "names" ).
                                has( yoke, name,
                                    function ( yoke, had ) {
                                
                                if ( had )
                                    return withQqStack( yoke, qqStack, esc.second );
                                else if ( qqStack.uq === null )
                                    return then( yoke, s, { ok: false, msg:
                                        "Expected s-expression escape suffix, encountered ;(rq ...) " +
                                        // TODO: Describe the unbound label. We'll need an error string
                                        // that can get larger than JavaScript's strings.
                                        "for an unbound label" } );
                                else
                                    return unwindingQqStack( yoke, qqStack.uq );
                            } );
                        };
                        return unwindingQqStack( yoke, qqStack );
                    } else {
                        return then( yoke, s, { ok: false, msg:
                            "Expected s-expression escape suffix, " +
                            // TODO: Describe the invalid escape.
                            // We'll need an error string that can get
                            // larger than JavaScript's strings.
                            "got ; for an invalid escape" } );
                    }
                    
                    } );
                } else if ( esc.type === "comment" ) {
                    return readSexpOrInfixOp( yoke, s,
                        encompassingClosingBracket, then );
                } else if ( esc.type === "naiveSexp" ) {
                    var isDelimited = esc.elements !== null &&
                        esc.elements.rest === null &&
                        esc.elements.first.type === "textDelimited";
                    if ( qqStack.uq === null ) {
                        return readNaiveSexp( yoke, esc.elements,
                            encompassingClosingBracket,
                            function ( yoke, result ) {
                            
                            if ( !result.ok )
                                return then( yoke, s, result );
                            return then( yoke, s, { ok: true, val:
                                { val:
                                    { type: "sexp", sexp: result.val } } } );
                        } );
                        
                    } else if (
                        qqStack.uq.uq === null && isDelimited ) {
                        
                        return readString( yoke,
                            esc.elements.first.elements,
                        {
                            uq: qqStack.uq,
                            cache: qqStack.cache.plusObj( {
                                encompassingClosingBracket:
                                    esc.elements.first.close,
                                encompassingClosingBracketIsInString:
                                    qqStack.cache.get( "encompassingClosingBracketIsInString" ) ||
                                        esc.elements.first.open.tokenLocToken !== "/"
                            } )
                        }, function ( yoke, result ) {
                            if ( !result.ok )
                                return then( yoke, s, result );
                            return then( yoke, s, { ok: true, val:
                                { val:
                                    { type: "sexp", sexp: result.val } } } );
                        } );
                    } else {
                        if ( isDelimited )
                            return then( yoke, { ok: false, msg:
                                "Expected s-expression escape " +
                                "suffix, encountered " +
                                esc.elements.first.open.
                                    tokenLocToken + " " +
                                "at a depth other than zero or one"
                            } );
                        else
                            return then( yoke, { ok: false, msg:
                                // TODO: Describe the invalid escape.
                                // We'll need an error string that can
                                // get larger than JavaScript's
                                // strings.
                                "Expected s-expression escape " +
                                "suffix, encountered an invalid " +
                                "escape" } );
                    }
                } else {
                    throw new Error();
                }
                
                } );
            };
            var readStringLurking = function ( yoke,
                elements, qqStack, then ) {
                
                return exhaustStream( yoke,
                    customStream( listToStream( elements ),
                        function ( yoke, s, then ) {
                        
                        return s.read( yoke,
                            function ( yoke, s, result ) {
                            
                            if ( !result.ok
                                || result.val === null
                                || result.val.val.type !== "scalars"
                                || result.val.val.val.tokenLocToken
                                    !== "\r" )
                                return then( yoke, s, result );
                            
                            var locatedToken = result.val.val.val;
                            
                            // We convert CRLF and CR to LF.
                            return s.peek( yoke,
                                function ( yoke, s, result ) {
                                
                                if ( !result.ok )
                                    return then( yoke, s, result );
                                
                                if ( result.val === null
                                    || result.val.val.type !== "scalars"
                                    || result.val.val.val.tokenLocToken !== "\n" )
                                    return next( yoke, s, locatedToken.tokenLocStop );
                                else
                                    return s.read( yoke, function ( yoke, s, result ) {
                                        if ( !result.ok )
                                            return then( yoke, s, result );
                                        return next( yoke, s, result.val.val.val.tokenLocStop );
                                    } );
                                
                                function next( yoke, s, tokenLocStop ) {
                                    return then( yoke, s,
                                        { ok: true, val:
                                            { val: { type: "scalars", val: {
                                                tokenLocStart: locatedToken.tokenLocStart,
                                                tokenLocStop: tokenLocStop,
                                                tokenLocToken: "\n"
                                            } } } } );
                                }
                            } );
                        } );
                        return readSexp( yoke, s,
                            !"heedCommandEnds", then );
                    } ),
                    function ( yoke, emptyStream, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, result );
                
                return jsListShortFoldl( yoke, null, result.val,
                    function ( yoke, revResult, element, then ) {
                    
                    function ret( yoke, list ) {
                        return jsListRevAppend( yoke, list, revResult,
                            function ( yoke, revResult ) {
                            
                            return then( yoke,
                                revResult, !"exitedEarly" );
                        } );
                    }
                    
                    if ( element.type === "escape" ) {
                        var readEscapeLurking = function ( yoke,
                            prefix, esc, qqStack, then ) {
                            
                            function ret( yoke, val ) {
                                return then( yoke, { ok: true, val:
                                    val } );
                            }
                            function unexpected( yoke, got ) {
                                if ( qqStack.uq === null )
                                    return then( yoke, { ok: false, msg:
                                        "Expected interpolation escape suffix, got " + got } );
                                else if ( qqStack.uq.uq === null )
                                    return then( yoke, { ok: false, msg:
                                        "Expected string escape suffix, got " + got } );
                                else
                                    return then( yoke, { ok: false, msg:
                                        "Expected suppressed escape suffix, got " + got } );
                            }
                            
                            return traverseSpaced( yoke, prefix, esc,
                                function ( yoke, result ) {
                                
                                if ( !result.ok )
                                    return then( yoke, result );
                                var prefix = result.prefix;
                                var locatedEsc = result.esc;
                                var esc = locatedEsc.escapeLocEscape;
                            
                            if ( esc.type === "pair" ) {
                                return readNaiveSexp( yoke, esc.first.escapeLocEscape.elements,
                                    encompassingClosingBracket,
                                    function ( yoke, result ) {
                                    
                                    if ( !result.ok )
                                        return then( yoke, result );
                                    var locatedOp = result.val;
                                    var op = locatedOp.exprLocExpr;
                                
                                var isNameOp = function ( name ) {
                                    return op.type === "stringNil" &&
                                        readerStringNilToString( locatedOp ) === name;
                                };
                                var isStringOp = function ( name ) {
                                    return (
                                        op.type === "cons"
                                        && op.rest.exprLocExpr.type === "cons"
                                        && op.rest.exprLocExpr.rest.exprLocExpr.type === "nil"
                                        && op.first.exprLocExpr.type === "stringNil"
                                        && readerStringNilToString( op.first ) === name
                                        && op.rest.exprLocExpr.first.exprLocExpr.type === "stringNil"
                                    );
                                };
                                var isDoubleStringOp = function ( name ) {
                                    return (
                                        op.type === "cons"
                                        && op.rest.exprLocExpr.type === "cons"
                                        && op.rest.exprLocExpr.rest.exprLocExpr.type === "cons"
                                        && op.rest.exprLocExpr.rest.exprLocExpr.rest.type === "nil"
                                        && op.first.exprLocExpr.type === "stringNil"
                                        && readerStringNilToString( op.first ) === name
                                        && op.rest.exprLocExpr.first.exprLocExpr.type === "stringNil"
                                        && op.rest.exprLocExpr.rest.exprLocExpr.first.exprLocExpr.type
                                            === "stringNil"
                                    );
                                };
                                
                                return jsListFlattenOnce( yoke, jsList(
                                    prefix,
                                    esc.punc,
                                    esc.first.escapeLocEscape.elements
                                ), function ( yoke, prefix ) {
                                
                                var retWithModifier = function ( yoke, result ) {
                                    if ( !result.ok )
                                        return then( yoke, result );
                                    
                                    return jsListAppend( yoke, prefix, result.val, ret );
                                };
                                
                                if ( isNameOp( "rm" ) ) {
                                    if ( qqStack.uq === null )
                                        return unexpected( yoke, ";rm" );
                                    else if ( qqStack.uq.uq === null )
                                        return ret( yoke, jsList() );
                                    else
                                        return readEscapeLurking( yoke,
                                            prefix, esc.second, qqStack, then );
                                } else if ( isNameOp( "yp" ) ) {
                                    return readEscapeLurking( yoke, prefix, esc.second, {
                                        uq: qqStack.uq,
                                        cache: qqStack.cache.plusObj( {
                                            normalizingWhitespace: false
                                        } )
                                    }, then );
                                } else if ( isNameOp( "np" ) ) {
                                    return readEscapeLurking( yoke, prefix, esc.second, {
                                        uq: qqStack.uq,
                                        cache: qqStack.cache.plusObj( {
                                            normalizingWhitespace: true
                                        } )
                                    }, then );
                                } else if ( isNameOp( "in" ) ) {
                                    // TODO: Implement this.
                                    return unexpected( yoke, ";in which hasn't been implemented yet" );
                                } else if ( isNameOp( "ls" ) ) {
                                    var second = esc.second.escapeLocEscape;
                                    if ( second.type !== "naiveSexp" )
                                        return unexpected( yoke,
                                            ";ls followed by a non-s-expression" );
                                    
                                    if ( qqStack.uq === null ) {
                                        return readNaiveSexp( yoke, second.elements,
                                            encompassingClosingBracket,
                                            function ( yoke, result ) {
                                            
                                            if ( !result.ok )
                                                return then( yoke, result );
                                            
                                            return ret( yoke,
                                                jsList( { type: "interpolation", val: result.val } ) );
                                        } );
                                    } else {
                                        return readStringLurking( yoke, second.elements, qqStack,
                                            function ( yoke, result ) {
                                            
                                            if ( !result.ok )
                                                return then( yoke, result );
                                            
                                            return jsListAppend( yoke, prefix, result.val, ret );
                                        } );
                                    }
                                } else if ( isNameOp( "qq" ) ) {
                                    return readEscapeLurking( yoke, prefix, esc.second, {
                                        uq: qqStack,
                                        cache: qqStack.cache.plusObj( {
                                            names: readerStrMap()
                                        } )
                                    }, then );
                                } else if ( isNameOp( "uq" ) ) {
                                    if ( qqStack.uq === null )
                                        return unexpected( yoke, ";uq at zero depth" );
                                    
                                    return readEscapeLurking( yoke,
                                        prefix, esc.second, qqStack.uq, then );
                                } else if ( isStringOp( "wq" ) ) {
                                    var name = op.rest.exprLocExpr.first.exprLocExpr.string;
                                    return qqStack.cache.get( "names" ).plusTruth( yoke, name,
                                        function ( yoke, names ) {
                                        
                                        return readEscapeLurking( yoke, prefix, esc.second, {
                                            uq: qqStack.uq,
                                            cache: qqStack.cache.plusObj( {
                                                names: names
                                            } )
                                        }, then );
                                    } );
                                } else if ( isDoubleStringOp( "lq" ) ) {
                                    var va = op.rest.exprLocExpr.first.exprLocExpr.string;
                                    var val = op.rest.exprLocExpr.rest.exprLocExpr.first.exprLocExpr.
                                        string;
                                    // TODO: Implement this. We don't actually store "values" in the
                                    // `names` map, but we'll have to start doing so.
                                    return unexpected( yoke,
                                        ";(lq ...) which hasn't been implemented yet" );
                                } else if ( isStringOp( "rq" ) ) {
                                    var name = op.rest.exprLocExpr.first.exprLocExpr.string;
                                    var unwindingQqStack = function ( yoke, qqStack ) {
                                        return qqStack.cache.get( "names" ).has( yoke, name,
                                            function ( yoke, had ) {
                                            
                                            if ( had )
                                                return readEscapeLurking( yoke,
                                                    prefix, esc.second, qqStack, then );
                                            else if ( qqStack.uq === null )
                                                return unexpected( yoke,
                                                    // TODO: Describe the unbound label. We'll need an
                                                    // error string that can get larger than
                                                    // JavaScript's strings.
                                                    ";(rq ...) for an unbound label" );
                                            else
                                                return unwindingQqStack( yoke, qqStack.uq );
                                        } );
                                    };
                                    return unwindingQqStack( yoke, qqStack );
                                } else {
                                    // TODO: Describe the invalid escape. We'll need an error string
                                    // that can get larger than JavaScript's strings.
                                    return unexpected( yoke, "; for an invalid escape" );
                                }
                                
                                } );
                                
                                } );
                            } else if ( esc.type === "comment" ) {
                                if ( qqStack.uq === null )
                                    return unexpected( yoke, "comment" );
                                else if ( qqStack.uq.uq === null )
                                    return ret( yoke, jsList() );
                                else
                                    return jsListFlattenOnce( yoke,
                                        jsList( prefix, esc.punc, esc.elements ), ret );
                            } else if ( esc.type === "naiveSexp" ) {
                                if ( qqStack.uq === null ) {
                                    // TODO: Describe the s-expression. We'll need an error string that
                                    // can get larger than JavaScript's strings.
                                    return unexpected( yoke, "an s-expression" );
                                } else if ( qqStack.uq.uq === null ) {
                                    return readNaiveSexp( yoke, esc.elements,
                                        encompassingClosingBracket,
                                        function ( yoke, result ) {
                                        
                                        if ( !result.ok )
                                            return then( yoke, result );
                                        var locatedOp = result.val;
                                        var op = locatedOp.exprLocExpr;
                                    
                                    var isNameOp = function ( name ) {
                                        return op.type === "stringNil" &&
                                            readerStringNilToString( locatedOp ) === name;
                                    };
                                    var isStringOp = function ( name ) {
                                        return (
                                            op.type === "cons"
                                            && op.rest.exprLocExpr.type === "cons"
                                            && op.rest.exprLocExpr.rest.exprLocExpr.type === "nil"
                                            && op.first.exprLocExpr.type === "stringNil"
                                            && readerStringNilToString( op.first ) === name
                                            && op.rest.exprLocExpr.first.exprLocExpr.type === "stringNil"
                                        );
                                    };
                                    
                                    var asciiToEl = function ( ascii ) {
                                        if ( ascii === "" )
                                            return jsList();
                                        if ( ascii.length !== 1 )
                                            throw new Error();
                                        return jsList( { type: "scalars", val: {
                                            tokenLocStart: locatedEsc.escapeLocStart,
                                            tokenLocStop: locatedEsc.escapeLocStop,
                                            tokenLocToken: ascii
                                        } } );
                                    };
                                    
                                    var explicitWhite = function ( yoke, meaning ) {
                                        return jsListFlattenOnce( yoke, jsList(
                                            jsList( { type: "lurkObliteratePreceding" } ),
                                            asciiToEl( meaning ),
                                            jsList( { type: "lurkObliterateFollowing" } )
                                        ), ret );
                                    };
                                    var simpleEscape = function ( yoke, meaning ) {
                                        return ret( yoke, asciiToEl( meaning ) );
                                    };
                                    
                                    if ( isNameOp( "s" ) ) {
                                        return explicitWhite( yoke, " " );
                                    } else if ( isNameOp( "t" ) ) {
                                        return explicitWhite( yoke, "\t" );
                                    } else if ( isNameOp( "r" ) ) {
                                        return explicitWhite( yoke, "\r" );
                                    } else if ( isNameOp( "n" ) ) {
                                        return explicitWhite( yoke, "\n" );
                                    } else if ( isNameOp( "c" ) ) {
                                        return explicitWhite( yoke, "" );
                                    } else if ( isNameOp( "^" ) ) {
                                        return simpleEscape( yoke, "\\" );
                                    } else if ( isNameOp( "<" ) ) {
                                        return simpleEscape( yoke, "[" );
                                    } else if ( isNameOp( ">" ) ) {
                                        return simpleEscape( yoke, "]" );
                                    } else if ( isNameOp( "{" ) ) {
                                        return simpleEscape( yoke, "(" );
                                    } else if ( isNameOp( "}" ) ) {
                                        return simpleEscape( yoke, ")" );
                                    } else if ( isStringOp( "ch" ) ) {
                                        var hex = readerStringNilToString( op.rest.exprLocExpr.first );
                                        if ( !(hex.length <= 6 && /^[01-9A-F]+$/.test( hex )) )
                                            return then( yoke, { ok: false, msg:
                                                "Encountered ;(ch ...) with something other than 1-6 " +
                                                "uppercase hex digits inside" } );
                                        
                                        var scalar = unicodeCodePointToString(
                                            parseInt( elementsString, 16 ) );
                                        
                                        if ( scalar === null )
                                            return then( yoke, { ok: false, msg:
                                                "Encountered ;(ch ...) denoting a number outside the " +
                                                "Unicode scalar range, such as a UTF-16 surrogate" } );
                                        
                                        return ret( yoke, jsList( { type: "scalars", val: {
                                            tokenLocStart: locatedEsc.escapeLocStart,
                                            tokenLocStop: locatedEsc.escapeLocStop,
                                            tokenLocToken: scalar
                                        } } ) );
                                    } else {
                                        // TODO: Describe the invalid escape. We'll need an error string
                                        // that can get larger than JavaScript's strings.
                                        return unexpected( yoke, "an invalid escape s-expression" );
                                    }
                                    
                                    } );
                                } else {
                                    return readStringLurking( yoke, esc.elements, qqStack,
                                        function ( yoke, result ) {
                                        
                                        if ( !result.ok )
                                            return then( yoke, result );
                                        
                                        return jsListAppend( yoke, prefix, result.val, ret );
                                    } );
                                }
                            } else {
                                throw new Error();
                            }
                            
                            } );
                        };
                        return readEscapeLurking( yoke,
                            element.punc,
                            element.suffix,
                            qqStack,
                            function ( yoke, result ) {
                            
                            if ( !result.ok )
                                return then( yoke,
                                    result, !!"exitedEarly" );
                            return ret( yoke, result.val );
                        } );
                    } else if ( element.type === "textDelimited" ) {
                        return readStringLurking( yoke,
                            element.elements, qqStack,
                            function ( yoke, result ) {
                            
                            if ( !result.ok )
                                return then( yoke,
                                    result, !!"exitedEarly" );
                            
                            return jsListFlattenOnce( yoke, jsList(
                                jsList(
                                    { type: "scalars", val: element.open } ),
                                result.val,
                                element.open.tokenLocToken === "/" ?
                                    jsList() :
                                    jsList( { type: "scalars", val: element.close } )
                            ), ret );
                        } );
                    } else if ( element.type === "scalars" ) {
                        var locatedToken = element.val;
                        var c = locatedToken.tokenLocToken;
                        if ( /^[ \t\r\n]+$/.test( c ) ) {
                            if ( qqStack.cache.
                                get( "normalizingWhitespace" ) )
                                return ret( yoke, jsList(
                                    { type: "lurkNormalize" },
                                    { type: "rawWhiteScalars", val: locatedToken }
                                ) );
                            else
                                return ret( yoke, jsList(
                                    { type: "rawWhiteScalars", val: locatedToken }
                                ) );
                        } else {
                            return ret( yoke, jsList( element ) );
                        }
                    } else {
                        throw new Error();
                    }
                }, function ( yoke, state, exitedEarly ) {
                    if ( exitedEarly )
                        return then( yoke, state );
                    return jsListRev( yoke, state,
                        function ( yoke, elements ) {
                        
                        return then( yoke, { ok: true, val:
                            elements } );
                    } );
                } );
                
                } );
            };
            var processLurkingCommands = function ( yoke,
                elements, then ) {
                
                function bankNormalization( yoke, state, then ) {
                    if ( state.normalizing
                        && state.revWhite !== null )
                        return jsListRev( yoke, state.revWhite,
                            function ( yoke, white ) {
                            
                            var bounds =
                                nonemptyReaderStringListToLocatedToken(
                                    white );
                            
                            return next( yoke,
                                jsList( { type: "scalars", val: {
                                    tokenLocStart: bounds.tokenLocStart,
                                    tokenLocStop: bounds.tokenLocStop,
                                    tokenLocToken: " "
                                } } ) );
                        } );
                    else
                        return next( yoke, state.revWhite );
                    
                    function next( yoke, revWhite ) {
                        return jsListAppend( yoke,
                            revWhite, state.revProcessed,
                            function ( yoke, revProcessed ) {
                            
                            return then( yoke,
                                { val: revProcessed } );
                        } );
                    }
                }
                
                return jsListFoldl( yoke, {
                    obliterating: false,
                    revProcessed: null
                }, elements, function ( yoke, state, element, then ) {
                    var defaultNextState = {
                        obliterating: false,
                        revProcessed:
                            { first: element,
                                rest: state.revProcessed }
                    };
                    var conditionalNextState =
                        state.obliterating ? state : defaultNextState;
                    
                    if ( element.type === "lurkObliteratePreceding" )
                        return then( yoke, conditionalNextState );
                    else if ( element.type ===
                        "lurkObliterateFollowing" )
                        return then( yoke, {
                            obliterating: true,
                            revProcessed: state.revProcessed
                        } );
                    else if ( element.type === "lurkNormalize" )
                        return then( yoke, conditionalNextState );
                    else if ( element.type === "rawWhiteScalars" )
                        return then( yoke, conditionalNextState );
                    else if ( element.type === "scalars" )
                        return then( yoke, defaultNextState );
                    else if ( element.type === "interpolation" )
                        return then( yoke, defaultNextState );
                    else
                        throw new Error();
                }, function ( yoke, state ) {
                
                return jsListFoldl( yoke, {
                    obliterating: false,
                    processed: null
                }, state.revProcessed,
                    function ( yoke, state, element, then ) {
                    
                    var defaultNextState = {
                        obliterating: false,
                        processed:
                            { first: element, rest: state.processed }
                    };
                    var conditionalNextState =
                        state.obliterating ? state : defaultNextState;
                    
                    if ( element.type === "lurkObliteratePreceding" )
                        return then( yoke, {
                            obliterating: true,
                            processed: state.processed
                        } );
                    else if ( element.type ===
                        "lurkObliterateFollowing" )
                        throw new Error();
                    else if ( element.type === "lurkNormalize" )
                        return then( yoke, conditionalNextState );
                    else if ( element.type === "rawWhiteScalars" )
                        return then( yoke, conditionalNextState );
                    else if ( element.type === "scalars" )
                        return then( yoke, defaultNextState );
                    else if ( element.type === "interpolation" )
                        return then( yoke, defaultNextState );
                    else
                        throw new Error();
                }, function ( yoke, state ) {
                
                return jsListFoldl( yoke, {
                    normalizing: false,
                    revWhite: null,
                    revProcessed: null
                }, state.processed,
                    function ( yoke, state, element, then ) {
                    
                    if ( element.type === "lurkObliteratePreceding" )
                        throw new Error();
                    else if ( element.type ===
                        "lurkObliterateFollowing" )
                        throw new Error();
                    else if ( element.type === "lurkNormalize" )
                        return then( yoke, {
                            normalizing: true,
                            revWhite: state.revWhite,
                            revProcessed: state.revProcessed
                        }, !"exitedEarly" );
                    else if ( element.type === "rawWhiteScalars" )
                        return then( yoke, {
                            normalizing: state.normalizing,
                            revWhite:
                                { first:
                                    { type: "scalars", val: element.val },
                                    rest: state.revWhite },
                            revProcessed: state.revProcessed
                        }, !"exitedEarly" );
                    else if ( element.type === "scalars" )
                        return bankAndAdd();
                    else if ( element.type === "interpolation" )
                        return bankAndAdd();
                    else
                        throw new Error();
                    
                    function bankAndAdd() {
                        return bankNormalization( yoke, state,
                            function ( yoke, maybeRevProcessed ) {
                            
                            if ( maybeRevProcessed === null )
                                return then( yoke,
                                    null, !!"exitedEarly" );
                            else
                                return then( yoke, {
                                    normalizing: false,
                                    revWhite: null,
                                    revProcessed: { first: element,
                                        rest: maybeRevProcessed.val }
                                }, !"exitedEarly" );
                        } );
                    }
                }, function ( yoke, state, exitedEarly ) {
                    
                    function err( yoke ) {
                        return then( yoke, { ok: false, msg:
                            "Encountered a nontrivial sequence of " +
                            "raw whitespace in a quasiquotation " +
                            "label" } );
                    }
                    
                    if ( exitedEarly )
                        return err( yoke );
                    return bankNormalization( yoke, state,
                        function ( yoke, maybeRevProcessed ) {
                        
                        if ( maybeRevProcessed === null )
                            return err( yoke );
                        else
                            return jsListRev( yoke,
                                maybeRevProcessed.val,
                                function ( yoke, processed ) {
                                
                                return then( yoke, { ok: true, val:
                                    processed } );
                            } );
                    } );
                } );
                
                } );
                
                } );
            };
            var readString = function ( yoke,
                elements, qqStack, then ) {
                
                return readStringLurking( yoke, elements, qqStack,
                    function ( yoke, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, result );
                    
                    if ( qqStack.cache.
                        get( "normalizingWhitespace" ) )
                        return jsListFlattenOnce( yoke, jsList(
                            jsList(
                                { type: "lurkObliterateFollowing" } ),
                            result.val,
                            jsList(
                                { type: "lurkObliteratePreceding" } )
                        ), next );
                    else
                        return next( yoke, result.val );
                    
                    function next( yoke, elements ) {
                        return processLurkingCommands( yoke, elements,
                            function ( yoke, result ) {
                            
                            if ( !result.ok )
                                return then( yoke, result );
                        
                        return jsListRev( yoke, result.val,
                            function ( yoke, revElements ) {
                        
                        function addLocation( sexp ) {
                            if ( sexp.type === "stringNil" ) {
                                if ( sexp.string === null ) {
                                    var loc =
                                        qqStack.cache.get( "encompassingClosingBracket" ).tokenLocStart;
                                    return {
                                        exprLocStart: loc,
                                        exprLocStop: loc,
                                        exprLocExpr: sexp
                                    };
                                } else {
                                    var locatedToken =
                                        nonemptyReaderStringListToLocatedToken( sexp.string );
                                    return {
                                        exprLocStart: locatedToken.tokenLocStart,
                                        exprLocStop: locatedToken.tokenLocStop,
                                        exprLocExpr: sexp
                                    };
                                }
                            } else if ( sexp.type === "stringCons" ) {
                                if ( sexp.string === null ) {
                                    return {
                                        exprLocStart: sexp.interpolation.exprLocStart,
                                        exprLocStop: sexp.rest.exprLocStop,
                                        exprLocExpr: sexp
                                    };
                                } else {
                                    var locatedToken =
                                        nonemptyReaderStringListToLocatedToken( sexp.string );
                                    return {
                                        exprLocStart: locatedToken.tokenLocStart,
                                        exprLocStop: sexp.rest.exprLocStop,
                                        exprLocExpr: sexp
                                    };
                                }
                            } else {
                                throw new Error();
                            }
                        }
                        
                        return jsListFoldl( yoke,
                            { type: "stringNil", string: null },
                            revElements,
                            function ( yoke, state, element, then ) {
                            
                            if ( element.type === "scalars" ) {
                                var string = { first: element.val, rest: state.string };
                                if ( state.type === "stringNil" )
                                    return then( yoke, { type: "stringNil", string: string } );
                                else if ( state.type === "stringCons" )
                                    return then( yoke,
                                        { type: "stringCons",
                                            string: string,
                                            interpolation: state.interpolation,
                                            rest: state.rest } );
                                else
                                    throw new Error();
                            } else if ( element.type ===
                                "interpolation" ) {
                                return then( yoke,
                                    { type: "stringCons",
                                        string: null,
                                        interpolation: element.val,
                                        rest: addLocation( state ) } );
                            } else {
                                throw new Error();
                            }
                        }, function ( yoke, result ) {
                        
                        return then( yoke, { ok: true, val:
                            addLocation( result ) } );
                        
                        } );
                        
                        } );
                        
                        } );
                    }
                } );
            };
            return withQqStack( yoke, {
                uq: null,
                cache: strMap().plusObj( {
                    names: readerStrMap(),
                    encompassingClosingBracket:
                        encompassingClosingBracket,
                    encompassingClosingBracketIsInString: false,
                    normalizingWhitespace: true
                } )
            }, result.val.val.suffix );
        } else if ( result.val.val.type === "textDelimited" ) {
            return readList( yoke,
                listToStream( result.val.val.elements ),
                result.val.val.open.tokenLocToken === "/" ?
                    encompassingClosingBracket :
                    result.val.val.close,
                function ( yoke, emptyElementsStream, result ) {
                
                if ( !result.ok )
                    return then( yoke, s, result );
                return then( yoke, s, { ok: true, val:
                    { val: { type: "sexp", sexp: result.val } } } );
            } );
        } else if ( result.val.val.type === "scalars" ) {
            var locatedToken = result.val.val.val;
            var c = locatedToken.tokenLocToken;
            
            var readIdentifierSymbol =
                function ( yoke, s, any, revElements ) {
                
                return s.peek( yoke, function ( yoke, s, result ) {
                    if ( !result.ok )
                        return then( yoke, s, result );
                    
                    if ( result.val === null
                        || result.val.val.type !== "scalars" )
                        return next( yoke, s, revElements );
                    
                    var c = result.val.val.val.tokenLocToken;
                    if ( /^[ \t\r\n=;',\./]*$/.test( c ) )
                        return next( yoke, s, revElements );
                    else if ( c === "`" )
                        return s.read( yoke,
                            function ( yoke, s, result ) {
                            
                            if ( !result.ok )
                                return then( yoke, s, result );
                            
                            return next( yoke, s, revElements );
                        } );
                    else
                        return s.read( yoke,
                            function ( yoke, s, result ) {
                            
                            if ( !result.ok )
                                return then( yoke, s, result );
                            
                            return readIdentifierSymbol( yoke, s,
                                !!"any",
                                { first: result.val.val.val,
                                    rest: revElements } );
                        } );
                    
                    function next( yoke, s, revElements ) {
                        if ( !any )
                            return then( yoke, s, { ok: false, msg:
                                "Expected s-expression, " +
                                "encountered ` with no identifier " +
                                "or \\ after it" } );
                        return jsListRev( yoke, revElements,
                            function ( yoke, elements ) {
                            
                            var locatedToken =
                                nonemptyReaderStringListToLocatedToken(
                                    elements );
                            return then( yoke, s, { ok: true, val:
                                { val:
                                    { type: "sexp", sexp: {
                                        exprLocStart: locatedToken.tokenLocStart,
                                        exprLocStop: locatedToken.tokenLocStop,
                                        exprLocExpr: { type: "stringNil", string: elements }
                                    } } } } );
                        } );
                    }
                } );
            };
            
            if ( /^[ \t]+$/.test( c ) ) {
                return readSexpOrInfixOp( yoke, s,
                    encompassingClosingBracket, then );
            } else if ( /^[\r\n]$/.test( c ) ) {
                return then( yoke, s, { ok: true, val:
                    { val: { type: "infixNewline" } } } );
            } else if ( /^[=;',]$/.test( c ) ) {
                return then( yoke, s, { ok: false, msg:
                    "Expected s-expression, got " + c } );
            } else if ( c === "/" ) {
                if ( encompassingClosingBracket === null )
                    return then( yoke, s, { ok: false, msg:
                        "Expected s-expression, got / with no " +
                        "encompassing closing bracket" } );
                return readList( yoke, s,
                    encompassingClosingBracket,
                    function ( yoke, s, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    return then( yoke, s, { ok: true, val:
                        { val:
                            { type: "sexp", sexp: result.val } } } );
                } );
            } else if ( c === "." ) {
                return then( yoke, s, { ok: true, val:
                    { val: { type: "infixDot" } } } );
            } else if ( c === "`" ) {
                return readIdentifierSymbol( yoke, s, !"any",
                    jsList() );
            } else {
                return readIdentifierSymbol( yoke, s, !!"any",
                    jsList( locatedToken ) );
            }
        } else {
            throw new Error();
        }
    } );
}
// NOTE: For this, `s` must be a stream of readSexpOrInfixOp results.
function readList( yoke, s, encompassingClosingBracket, then ) {
    // This reads the remainder of the stream as a list. It ignores
    // the "infixNewline" values, and it processes the "infixDot"
    // values.
    
    return exhaustStream( yoke,
        customStream(
            customStream( s, function ( yoke, s, then ) {
                return readSexpOrInfixOp( yoke, s,
                    encompassingClosingBracket, then );
            } ),
            function ( yoke, s, then ) {
                return readSexp( yoke, s, !"heedCommandEnds", then );
            }
        ),
        function ( yoke, emptyStream, result ) {
        
        var s = emptyStream.underlyingStream.underlyingStream;
        
        if ( !result.ok )
            return then( yoke, s, result );
        
        return jsListRev( yoke, result.val,
            function ( yoke, revJsList ) {
            
            return loop( yoke, revJsList, {
                exprLocStart: encompassingClosingBracket === null ?
                    null : encompassingClosingBracket.tokenLocStart,
                exprLocStop: encompassingClosingBracket === null ?
                    null : encompassingClosingBracket.tokenLocStop,
                exprLocExpr: { type: "nil" }
            } );
            function loop( yoke, revJsList, sexpList ) {
                return runWaitOne( yoke, function ( yoke ) {
                    if ( revJsList === null )
                        return then( yoke, s, { ok: true, val:
                            sexpList } );
                    else
                        return loop( yoke, revJsList.rest, {
                            exprLocStart:
                                revJsList.first.exprLocStart,
                            exprLocStop: sexpList.exprLocStop,
                            exprLocExpr:
                                { type: "cons",
                                    first: revJsList.first,
                                    rest: sexpList }
                        } );
                } );
            }
        } )
    } );
}
function readNaiveSexp( yoke,
    stringElements, encompassingClosingBracket, then ) {
    
    return readList( yoke, listToStream( stringElements ),
        encompassingClosingBracket,
        function ( yoke, emptyElementsStream, result ) {
        
        if ( !result.ok )
            return then( yoke, result );
        else if ( result.val.exprLocExpr.type !== "cons" )
            return then( yoke, { ok: false, msg:
                "Expected exactly one s-expression, got zero"
                } );
        else if ( result.val.exprLocExpr.rest.exprLocExpr.type !==
            "nil" )
            return then( yoke, { ok: false, msg:
                "Expected exactly one s-expression, got " +
                "more than one" } );
        
        return then( yoke, { ok: true, val:
            result.val.exprLocExpr.first } );
    } );
}
// NOTE: For this, `s` must be a stream of readSexpOrInfixOp results.
function readSexp( yoke, s, heedCommandEnds, then ) {
    return loop( yoke, s, null );
    function loop( yoke, s, maybeLhs, recentDot ) {
        return s.peek( yoke, function ( yoke, s, result ) {
            
            if ( !result.ok )
                return then( yoke, s, result );
            
            function complain() {
                return then( yoke, s, { ok: false, msg:
                    "Expected s-expression, encountered . outside " +
                    "an infix context" } );
            }
            
            if ( result.val === null ) {
                if ( recentDot )
                    return complain();
                return then( yoke, s, { ok: true, val: maybeLhs } );
            } else if ( result.val.val.type === "infixNewline" ) {
                return s.read( yoke, function ( yoke, s, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    
                    if ( maybeLhs !== null && heedCommandEnds ) {
                        if ( recentDot )
                            return complain();
                        return then( yoke, s, { ok: true, val:
                            maybeLhs } );
                    } else {
                        return loop( yoke, s, maybeLhs, recentDot );
                    }
                } );
            } else if ( result.val.val.type === "infixDot" ) {
                return s.read( yoke, function ( yoke, s, result ) {
                    
                    if ( !result.ok )
                        return then( yoke, s, result );
                    else if ( maybeLhs === null || recentDot )
                        return complain();
                    
                    return loop( yoke, s, maybeLhs, !!"recentDot" );
                } );
            } else if ( result.val.val.type === "sexp" ) {
                if ( recentDot )
                    return s.read( yoke,
                        function ( yoke, s, result ) {
                        
                        if ( !result.ok )
                            return then( yoke, s, result );
                        
                        var left = maybeLhs.val;
                        var right = result.val.val.sexp;
                        
                        return loop( yoke, s,
                            { val:
                                {
                                    exprLocStart: left.exprLocStart,
                                    exprLocStop: right.exprLocStop,
                                    exprLocExpr: { type: "cons", first: left, rest: {
                                        exprLocStart: right.exprLocStart,
                                        exprLocStop: right.exprLocStop,
                                        exprLocExpr: { type: "cons", first: right, rest: {
                                            exprLocStart: right.exprLocStop,
                                            exprLocStop: right.exprLocStop,
                                            exprLocExpr: { type: "nil" }
                                        } } } } } },
                            !"recentDot" );
                    } );
                else if ( maybeLhs !== null )
                    return then( yoke, s, { ok: true, val:
                        maybeLhs } );
                else
                    return s.read( yoke,
                        function ( yoke, s, result ) {
                        
                        if ( !result.ok )
                            return then( yoke, s, result );
                        
                        return loop( yoke, s,
                            { val: result.val.val.sexp },
                            !"recentDot" );
                    } );
            } else {
                throw new Error();
            }
        } );
    }
}

function readAll( locationHost, string ) {
    return runSyncYoke( null, function ( yoke, then ) {
        return exhaustStream( yoke, customStream(
            customStream(
                customStream(
                    stringToClassifiedTokenStream(
                        locationHost, string ),
                    function ( yoke, s, then ) {
                        return readStringElement( yoke, s, then );
                    }
                ),
                function ( yoke, s, then ) {
                    var encompassingClosingBracket = null;
                    return readSexpOrInfixOp( yoke, s,
                        encompassingClosingBracket, then );
                }
            ),
            function ( yoke, s, then ) {
                return readSexp( yoke, s,
                    !!"heedCommandEnds", then );
            }
        ), function ( yoke, emptyStream, result ) {
            return jsListRev( yoke, result.val,
                function ( yoke, revVals ) {
                
                return loop( yoke, revVals,
                    result.ok ? [] :
                        [ { ok: false, msg: result.msg } ] );
                function loop( yoke, revVals, arr ) {
                    return runWaitOne( yoke, function ( yoke ) {
                        if ( revVals === null )
                            return then( yoke, arr );
                        else
                            return loop( yoke, revVals.rest,
                                [ { ok: true, val: revVals.first }
                                    ].concat( arr ) );
                    } );
                }
            } );
        } );
    } ).result;
}



// era-code-gen-js.js
// Copyright 2016 Ross Angle. Released under the MIT License.
"use strict";

// This file defines `jsCode()`, `jsCodeVar()`, and `jsCodeReified()`,
// which can be used as a way to generate and invoke JavaScript
// expressions with reified first-class values and tracking of free
// variables. These utilities return a `JsCode` object, which has
// several useful methods.
//
// Notably, the `JsCode#asStatic()` method transforms code that has no
// free variables so that it runs at the beginning of the compiled
// code, so that the same computation is not performed over and over.
// Multiple expressions transformed this way run in the order they
// would have appeared in the generated code if they hadn't been made
// static.

// TODO: This file is unused for now, but let's refactor Cene to use
// it so we can factor out non-macro ways for Cene code to obtain and
// manipulate compiled expressions.

function jsCode_toFreeVars_( freeVars ) {
    return isArray( freeVars ) && arrAll( freeVars, function ( va ) {
        return isPrimString( va );
    } ) ? strMap().plusArrTruth( freeVars ) : freeVars;
}

function JsCode() {}
JsCode.prototype.init_ = function (
    freeVars, staticExprs, getCode ) {
    
    this.freeVars_ = freeVars;
    this.staticExprs_ = staticExprs;
    this.getCode_ = getCode;
    return this;
};
JsCode.prototype.withFreeVars_ = function ( freeVars ) {
    return new JsCode().init_(
        freeVars, this.staticExprs_, this.getCode_ );
};
JsCode.prototype.plusFreeVars = function ( freeVars ) {
    return this.withFreeVars_(
        this.freeVars_.plus( jsCode_toFreeVars_( freeVars ) ) );
};
JsCode.prototype.minusFreeVars = function ( freeVars ) {
    return this.withFreeVars_(
        this.freeVars_.minus( jsCode_toFreeVars_( freeVars ) ) );
};
JsCode.prototype.assertNotFreeVars = function ( freeVars ) {
    var self = this;
    jsCode_toFreeVars_( freeVars ).each( function ( va, truth ) {
        if ( self.freeVars_.has( va ) )
            throw new Error();
    } );
    return self;
};
JsCode.prototype.assertNoFreeVars = function () {
    if ( this.freeVars_.hasAny() ) {
        var freeVars = [];
        this.freeVars_.each( function ( va, truth ) {
            freeVars.push( va );
        } );
        throw new Error(
            "Encountered " +
            (freeVars.length === 1 ?
                "an unbound variable" :
                "unbound variables") + " " +
            "when generating JavaScript code: " +
            freeVars.join( ", " ) );
    }
    return this;
};
function jsCodeSingleStatic_( staticExpr ) {
    return new JsCode().init_( strMap(), [ staticExpr ],
        function ( staticVars ) {
        
        if ( staticVars.length !== 1 )
            throw new Error();
        return staticVars[ 0 ];
    } );
}
JsCode.prototype.asStatic = function () {
    this.assertNoFreeVars();
    return jsCodeSingleStatic_( { type: "expr", expr: this } );
};
JsCode.prototype.toExpr_ = function (
    disallowedGensyms, reifiedVars, reifiedVals ) {
    
    var gensymNumber = 0;
    function nextGensym() {
        while ( true ) {
            var candidate = "gs" + gensymNumber++;
            if ( !disallowedGensyms.has( candidate ) )
                return candidate;
        }
    }
    
    function toExpr( code ) {
        var result = "(function () {";
        var staticVars = [];
        arrEach( code.staticExprs_, function ( staticExpr ) {
            if ( staticExpr.type === "expr" ) {
                var exprCode = toExpr( staticExpr.expr );
            } else if ( staticExpr.type === "reified" ) {
                var reifiedVar = nextGensym();
                reifiedVars.push( reifiedVar );
                reifiedVals.push( staticExpr.val );
                var exprCode = reifiedVar;
            } else {
                throw new Error();
            }
            var staticVar = nextGensym();
            result +=
                "    var " + staticVar + " = " + exprCode + ";\n";
            staticVars.push( staticVar );
        } );
        var getCode = code.getCode_;
        result +=
            "    return " + getCode( staticVars ) + ";\n" +
            "})()";
        return result;
    }
    
    return toExpr( this );
};
JsCode.prototype.toExpr = function () {
    this.assertNoFreeVars();
    
    var reifiedVars = [];
    var expr = this.toExpr_( strMap(), reifiedVars, [] );
    if ( reifiedVars.length !== 0 )
        throw new Error();
    return expr;
};
JsCode.prototype.toFunction = function ( paramVarsArr ) {
    if ( !isArray( paramVarsArr ) )
        throw new Error();
    this.minusFreeVars( paramVarsArr ).assertNoFreeVars();
    
    var disallowedGensyms = strMap().plusArrTruth( paramVarsArr );
    var reifiedVars = [];
    var reifiedVals = [];
    var expr =
        this.toExpr_( disallowedGensyms, reifiedVars, reifiedVals );
    
    var compiled =
        Function.apply( null, reifiedVars.concat( paramVarsArr, [
            "return " + expr + ";"
        ] ) );
    
    return function ( var_args ) {
        var paramValsArr = [].slice.call( arguments );
        return compiled.apply( this,
            reifiedVals.concat( paramValsArr ) );
    }
};
JsCode.prototype.instantiate = function ( envObj ) {
    var vars = [];
    var vals = [];
    objOwnEach( envObj, function ( va, val ) {
        vars.push( va );
        vals.push( val );
    } );
    return this.toFunction( vars ).apply( null, vals );
};
JsCode.prototype.toFunctionExpr_ = function ( paramVarsArr, minify ) {
    if ( !isArray( paramVarsArr ) )
        throw new Error();
    this.minusFreeVars( paramVarsArr ).assertNoFreeVars();
    
    var disallowedGensyms = strMap().plusArrTruth( paramVarsArr );
    var reifiedVars = [];
    var expr = this.toExpr_( disallowedGensyms, reifiedVars, [] );
    if ( reifiedVars.length !== 0 )
        throw new Error();
    
    return "Function( " + jsStr( minify(
        "return function ( " + paramVarsArr.join( ", " ) + " ) {\n" +
        "return " + expr + ";\n" +
        "};\n"
    ) ) + " )()";
};
// TODO: See if we'll ever use this.
JsCode.prototype.toInstantiateExpr = function ( envObj, minify ) {
    var vars = [];
    var vals = [];
    objOwnEach( envObj, function ( va, val ) {
        vars.push( va );
        vals.push( val );
    } );
    return this.toFunctionExpr_( vars, minify ) + "( " +
        vals.join( ", " ) + " )";
};
JsCode.prototype.toString = function () {
    throw new Error( "Tried to convert a JsCode object to a string" );
};
function jsCode( var_args ) {
    var freeVars = strMap();
    var staticExprs = [];
    var segments = [];
    
    addArg( [].slice.call( arguments ) );
    function addArg( arg ) {
        if ( isArray( arg ) ) {
            arrEach( arg, function ( arg, i ) {
                addArg( arg );
            } );
        } else if ( isPrimString( arg ) ) {
            segments.push( { size: 0, func: function ( staticVars ) {
                return arg;
            } } );
            
        } else if ( typeof arg === "object"
            && arg instanceof JsCode ) {
            
            staticExprs = staticExprs.concat( arg.staticExprs_ );
            freeVars = freeVars.plus( arg.freeVars_ );
            segments.push( { size: arg.staticExprs_.length,
                func: arg.getCode_ } );
        } else {
            throw new Error();
        }
    }
    
    return new JsCode().init_( freeVars, staticExprs,
        function ( staticVars ) {
        
        var result = "";
        var i = 0;
        var n = staticVars.length;
        arrEach( segments, function ( segment ) {
            var nextI = i + segment.size;
            if ( n < nextI )
                throw new Error();
            var func = segment.func;
            result += func( staticVars.slice( i, nextI ) );
            i = nextI;
        } );
        if ( i !== n )
            throw new Error();
        return result;
    } );
}
function jsCodeVar( va ) {
    if ( !isPrimString( va ) )
        throw new Error();
    return jsCode( va ).plusFreeVars( [ va ] );
}
function jsCodeReified( val ) {
    return jsCodeSingleStatic_( { type: "reified", val: val } );
}



// cene-runtime.js
// Copyright 2015-2017 Ross Angle. Released under the MIT License.
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
            throw new Error(
                "Tried to get from " + x.pretty() + " using " +
                "projection " + sourceProjName + " of constructor " +
                flatTag );
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
    if ( macLookupEffects === void 0 )
        throw new Error(
            "Cene language internal error: Forgot to return an " +
            "\"effects\" monadic computation value somewhere" );
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
        && mainTagName[ 1 ][ 0 ] === "n:$$qualified-name"
        && mainTagName[ 1 ][ 1 ][ 0 ] === "n:struct"
        && mainTagName[ 1 ][ 1 ][ 1 ] ===
            mkConstructorOccurrence.getFlatTag() )
        return mainTagName[ 1 ][ 1 ][ 2 ];
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

function clineRateThen( rt, clineOrDex, x, then ) {
    return macLookupThen( clineOrDex.clineRate( rt, x ),
        function ( maybeRating ) {
        
        if ( maybeRating === null )
            return macLookupRet( null );
        
        return then( maybeRating );
    } );
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
SinkStruct.prototype.clineRate = function ( rt, x ) {
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
SinkFn.prototype.clineRate = function ( rt, x ) {
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
SinkForeign.prototype.clineRate = function ( rt, x ) {
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
            "Cene language internal error: Tried to call getName " +
            "on a SinkForeign that didn't support it" );
    }
};
SinkForeign.prototype.pretty = function () {
    return this.purpose === "string" ?
        JSON.stringify( this.foreignVal.jsStr ) :
        this.purpose === "stx" ?
        "(stx " + this.foreignVal.stxDetails.pretty() + " " +
            this.foreignVal.sExprLayer.pretty() + ")" :
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
SinkClineByDex.prototype.clineRate = function ( rt, x ) {
    var self = this;
    
    return rt.dexHas( self.dexToUse, x, function ( hasX ) {
        if ( !hasX )
            return macLookupRet( null );
    
    return macLookupRet( {
        compatible: [ "clineTriviallyCompatible" ],
        prepared: x.getName(),
        func: function ( rt, a, b ) {
            var result = nameCompare( a, b );
            if ( result < 0 )
                return mkYep.ofNow( new SinkForeign( "lt", null ) );
            if ( 0 < result )
                return mkYep.ofNow( new SinkForeign( "gt", null ) );
            
            return mkYep.ofNow( mkNil.ofNow() );
        }
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
    
    // NOTE: We invoke both branches just so that if the second one
    // diverges, then this computation also diverges. In order for us
    // to be able to sort tables without having to compare every
    // single combination of two elements, we want to risk divergence
    // of `cline-by-own-method` and `cline-fix` in the individual
    // rating step, not the comparison step.
    return macLookupThen( self.first.dexHas( rt, x ),
        function ( firstResult ) {
    return macLookupThen( self.second.dexHas( rt, x ),
        function ( secondResult ) {
    
    return macLookupRet(
        rt.fromBoolean(
            rt.toBoolean( firstResult ) ||
                rt.toBoolean( secondResult ) ) );
    
    } );
    } );
};
SinkClineDefault.prototype.clineRate = function ( rt, x ) {
    var self = this;
    
    return macLookupThen( self.first.clineRate( rt, x ),
        function ( first ) {
    return macLookupThen( self.second.clineRate( rt, x ),
        function ( second ) {
    
    if ( first === null && second === null )
        return macLookupRet( null );
    
    return macLookupRet( {
        compatible: [ "clineTriviallyCompatible" ],
        prepared: { first: first, second: second },
        func: function ( rt, a, b ) {
            if ( a.first !== null && b.first === null )
                return mcYep.ofNow( mkYep.ofNow( mkNil.ofNow() ) );
            if ( a.first === null && b.first !== null )
                return mcYep.ofNow( mkNope.ofNow( mkNil.ofNow() ) );
            
            function tryComparingBy( a, b, then ) {
                if ( a === null || b === null
                    || jsnCompare(
                        a.compatible, b.compatible ) !== 0 )
                    return then();
                var func = a.func;
                var result = func( rt, a.prepared, b.prepared );
                if ( !mkYep.tags( result )
                    || !mkNil.tags(
                        mkYep.getProj( result, "yep" ) ) )
                    return result;
                return then();
            }
            
            return tryComparingBy( a.first, b.first, function () {
            return tryComparingBy( a.second, b.second, function () {
            
            return mkNil.ofNow();
            
            } );
            } );
        }
    } );
    
    } );
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
SinkClineGiveUp.prototype.clineRate = function ( rt, x ) {
    return macLookupRet( null );
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
SinkDexByCline.prototype.clineRate = function ( rt, x ) {
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
    return loop( 0, true );
    function loop( i, result ) {
        if ( n <= i )
            return macLookupRet( rt.fromBoolean( result ) );
        var projCline = self.projClines[ i ];
        return macLookupThen(
            projCline.val.dexHas( rt, x.projVals[ projCline.i ] ),
            function ( subResult ) {
            
            // NOTE: Even if `subResult` is false, we still compute
            // the rest of the projections' results. This way, if any
            // of them diverge, then this computation also diverges.
            // In order for us to be able to sort tables without
            // having to compare every single combination of two
            // elements, we want to risk divergence of
            // `cline-by-own-method` and `cline-fix` in the individual
            // rating step, not the comparison step.
            
            return loop( i + 1, result && subResult );
        } );
    }
};
SinkClineStruct.prototype.clineRate = function ( rt, x ) {
    var self = this;
    
    if ( !(x instanceof SinkStruct
        && x.flatTag === self.expectedFlatTag) )
        return macLookupRet( null );
    
    var n = self.projClines.length;
    return loop( 0, [] );
    function loop( i, projRatings ) {
        if ( n <= i )
            return macLookupRet( {
                compatible: [ "clineStruct" ].concat(
                    arrMap( projRatings, function ( projRating, i ) {
                        return projRating.compatible;
                    } ) ),
                prepared: projRatings,
                func: function ( rt, a, b ) {
                    for ( var i = 0; i < n; i++ ) {
                        var func = a[ i ].func;
                        var result = func( rt,
                            a[ i ].prepared,
                            b[ i ].prepared );
                        
                        if ( !mkYep.tags( result )
                            || !mkNil.tags(
                                mkYep.getProj( result, "yep" ) ) )
                            return result;
                    }
                    return mkYep.ofNow( mkNil.ofNow() );
                }
            } );
        
        var projCline = self.projClines[ i ];
        return clineRateThen( rt, projCline.val,
            x.projVals[ projCline.i ],
            function ( rating ) {
            
            return loop( i + 1, projRatings.concat( [ rating ] ) );
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
SinkDexCline.prototype.clineRate = function ( rt, x ) {
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
SinkDexDex.prototype.clineRate = function ( rt, x ) {
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
SinkDexMerge.prototype.clineRate = function ( rt, x ) {
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
SinkDexFuse.prototype.clineRate = function ( rt, x ) {
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
SinkDexName.prototype.clineRate = function ( rt, x ) {
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
SinkDexString.prototype.clineRate = function ( rt, x ) {
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
SinkClineByOwnMethod.prototype.clineRate = function ( rt, x ) {
    return macLookupThen(
        mkDexable.getProj( this.dexableGetMethod, "val"
            ).callSink( rt, x ),
        function ( maybeOwnMethod ) {
    
    if ( mkNil.tags( maybeOwnMethod ) ) {
        return macLookupRet( null );
    } else if ( mkYep.tags( maybeOwnMethod ) ) {
        var method = mkYep.getProj( maybeOwnMethod, "val" );
        if ( method.affiliation !== "cline" )
            throw new Error();
        return clineRateThen( rt, method, x, function ( rating ) {
            return macLookupRet( {
                compatible:
                    [ "clineByOwnMethod",
                        method.getName(), rating.compatible ],
                prepared: rating.prepared,
                func: rating.func
            } );
        } );
    } else {
        throw new Error();
    }
    
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
SinkClineFix.prototype.clineRate = function ( rt, x ) {
    return macLookupThen(
        mkDexable.getProj( this.dexableUnwrap, "val"
            ).callSink( rt, this ),
        function ( dex ) {
        
        if ( dex.affiliation !== "cline" )
            throw new Error();
        return dex.clineRate( rt, x );
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
SinkDexTable.prototype.clineRate = function ( rt, x ) {
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
SinkClineInt.prototype.clineRate = function ( rt, x ) {
    if ( !(x instanceof SinkForeign && x.purpose === "int") )
        return macLookupRet( null );
    
    return macLookupRet( {
        compatible: [ "clineTriviallyCompatible" ],
        prepared: x.foreignVal,
        func: function ( rt, a, b ) {
            if ( a < b )
                return mkYep.ofNow( mkYep.ofNow( mkNil.ofNow() ) );
            else if ( b < a )
                return mkYep.ofNow( mkNope.ofNow( mkNil.ofNow() ) );
            else
                return mkYep.ofNow( mkNil.ofNow() );
        }
    } );
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
SinkMergeByDex.prototype.clineRate = function ( rt, x ) {
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
SinkFuseByMerge.prototype.clineRate = function ( rt, x ) {
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
SinkFuseEffects.prototype.clineRate = function ( rt, x ) {
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
SinkFuseIntByPlus.prototype.clineRate = function ( rt, x ) {
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
SinkFuseIntByTimes.prototype.clineRate = function ( rt, x ) {
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
SinkFuseNssetByUnion.prototype.clineRate = function ( rt, x ) {
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
SinkFuseStruct.prototype.clineRate = function ( rt, x ) {
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
// TODO: Hmm, `merge-default` and `fuse-default` don't actually
// operate on everything in their domains. Let's remove these or
// redesign them.
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
SinkFuseDefault.prototype.clineRate = function ( rt, x ) {
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
SinkFuseByOwnMethod.prototype.clineRate = function ( rt, x ) {
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
SinkFuseFix.prototype.clineRate = function ( rt, x ) {
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
SinkFuseTable.prototype.clineRate = function ( rt, x ) {
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
SinkCexpr.prototype.clineRate = function ( rt, x ) {
    throw new Error();
};
SinkCexpr.prototype.fuse = function ( rt, a, b ) {
    throw new Error();
};
SinkCexpr.prototype.getName = function () {
    // NOTE: Even though we don't support `getName` on cexpr values,
    // we still maintain a `getName` method for most of them.
    throw new Error( "Tried to get the name of a cexpr" );
//    return this.cexpr.getName();
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
CexprVar.prototype.toJsCode = function ( options ) {
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
CexprReified.prototype.toJsCode = function ( options ) {
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
CexprLet.prototype.toJsCode = function ( options ) {
    // #GEN
    var bindings = arrMap( this.bindings, function ( binding, i ) {
        return {
            innerVar: cgenIdentifier( binding.k ),
            obscureVar: "cgenLocal_" + i,
            jsCode: binding.v.toJsCode( options )
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
    var body = this.body.toJsCode( options ).assertNotFreeVars(
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
CexprCall.prototype.toJsCode = function ( options ) {
    // #GEN
    return jsCode(
        jsCodeVar( "macLookupThen" ), "( ",
            this.func.toJsCode( options ), ", " +
            "function ( cgenLocal_result ) {\n" +
        "    \n" +
        "    return macLookupThen( ",
            this.arg.toJsCode( options ).assertNotFreeVars(
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
CexprCase.prototype.toJsCode = function ( options ) {
    // #GEN
    var minifiedFlatTag = options.getConstructor( this.flatTag );
    return jsCode( jsCodeVar( "macLookupThen" ), "( ",
        this.subject.toJsCode( options ), ", " +
        "function ( cgenLocal_matchSubject ) { ",
        
        (minifiedFlatTag === void 0 ? "" : [
            "if ( cgenLocal_matchSubject instanceof ",
                jsCodeVar( "SinkStruct" ), " " +
                "&& cgenLocal_matchSubject.flatTag === " +
                    jsStr( minifiedFlatTag ) + " " +
            ") return (function () { " +
                arrMap( this.bindings, function ( binding, i ) {
                    return "var " + cgenIdentifier( binding.local ) +
                        " = " +
                        "cgenLocal_matchSubject.projVals[ " +
                            i + " ]; ";
                } ).join( "" ) +
                "return ", this.then.toJsCode( options
                ).assertNotFreeVars( [ "cgenLocal_matchSubject" ]
                ).minusFreeVars(
                    arrMap( this.bindings, function ( binding, i ) {
                        return cgenIdentifier( binding.local );
                    } ) ), "; " +
            "})(); "
        ]),
        
        "return ", this.els.toJsCode( options ).assertNotFreeVars(
            [ "cgenLocal_matchSubject" ] ), "; " +
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
function CexprLocated( stxDetails, body ) {
    this.stxDetails = stxDetails;
    this.body = body;
}
CexprLocated.prototype.getFreeVars = function () {
    return this.body.getFreeVars();
};
CexprLocated.prototype.visitForCodePruning = function ( visitor ) {
    this.body.visitForCodePruning( visitor );
};
CexprLocated.prototype.toJsCode = function ( options ) {
    // TODO: See how the `stxDetails` should affect the code output.
    // It should probably have to do with JavaScript source maps.
    return this.body.toJsCode( options );
};
CexprLocated.prototype.getName = function () {
    // NOTE: There's no particular way we'd like to represent
    // `stxDetails` as a name, so we just don't implement this one.
    // This does mean that almost every cexpr a Cene program deals
    // with will be impossible to invoke `getName` on.
    throw new Error( "Tried to get the name of a cexpr-located" );
};
CexprLocated.prototype.pretty = function () {
    return "(cexpr-located " +
        JSON.stringify( this.stxDetails ) + " " +
        this.body.pretty() + ")";
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
    CexprConstructMapper.prototype.toJsCode = function ( options ) {
        // #GEN
        var projectionVars = arrMap( this.projections,
            function ( projection, i ) {
            
            return "cgenLocal_proj" + i;
        } );
        var result = jsCode( jsCodeVar( "macLookupRet" ), "( ",
            genJsConstructor( options.getConstructor( this.flatTag ),
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
                this.projections[ i ].expr.toJsCode( options
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
        function ( minifiedFlatTag, sortedProjections, order ) {
        
        return genJsConstructor(
            jsCode(
                jsStr( minifiedFlatTag ) + ", " +
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
    function ( minifiedFlatTag, sortedProjections, order ) {
    
    return jsCode( "new ", jsCodeVar( "SinkStruct" ), "( " +
        jsStr( minifiedFlatTag ) + ", " +
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
CexprErr.prototype.toJsCode = function ( options ) {
    return jsCode( jsCodeVar( "ceneErr" ), "( " +
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
CexprFn.prototype.toJsCode = function ( options ) {
    // #GEN
    var va = cgenIdentifier( this.param );
    return jsCode(
        jsCodeVar( "macLookupRet" ), "( " +
            "new ", jsCodeVar( "SinkFn" ), "( " +
                "function ( rt, " + va + " ) { " +
            
            "return ", this.body.toJsCode( options ).minusFreeVars(
                [ "rt", va ] ), "; " +
        "} ) )" );
};
CexprFn.prototype.getName = function () {
    // NOTE: We only have `CexprFn` for the sake of efficiency.
    // However, the cexpr we would otherwise use involves a function
    // definition that we don't actually define right now, so there's
    // no cexpr we can use here.
    throw new Error( "Tried to get the name of a cexpr-fn" );
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

// This constructor is needed to deconstruct the result of certain
// operations.
var mkGetdef = builtInStruct( "getdef", "get", "def" );

builtInStructAccumulator.val = null;


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
function isFfiSandboxRawMode( rawMode ) {
    return rawMode.type === "ffi-sandbox";
}
function isMacroOrUnitTestRawMode( rawMode ) {
    return isMacroRawMode( rawMode ) || isUnitTestRawMode( rawMode );
}
function isMacroOrUnitTestOrFfiSandboxRawMode( rawMode ) {
    return isMacroOrUnitTestRawMode( rawMode ) ||
        isFfiSandboxRawMode( rawMode );
}
function isMacroOrUnitTestOrFfiSandboxOrJsRawMode( rawMode ) {
    return isMacroOrUnitTestOrFfiSandboxRawMode( rawMode ) ||
        rawMode.type === "js";
}
function isMacroOrDummyRawMode( rawMode ) {
    return isMacroRawMode( rawMode ) || rawMode.type === "dummy-mode";
}
function rawModeSupportsEval( rawMode ) {
    return isMacroOrUnitTestRawMode( rawMode );
}
function rawModeSupportsDefer( rawMode ) {
    return isMacroOrUnitTestOrFfiSandboxRawMode( rawMode );
}
function rawModeSupportsContributeDefiner( definer ) {
    return function ( rawMode ) {
        
        if ( definer.type === "contributedElement"
            && !sinkNameSetContains(
                rawMode.contributingOnlyTo, definer.namespace ) )
            return false;
        
        if ( isMacroOrDummyRawMode( rawMode ) )
            return true;
        
        if ( isUnitTestRawMode( rawMode )
            && definer.type === "object"
            && definer.unitTestId !== null
            && nameCompare(
                definer.unitTestId, rawMode.unitTestId ) === 0 )
            return true;
        
        if ( isFfiSandboxRawMode( rawMode )
            && definer.type === "object"
            && definer.ffiSandboxId !== null
            && definer.ffiSandboxId === rawMode.ffiSandboxId )
            return true;
        
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
        return isMacroOrUnitTestOrFfiSandboxOrJsRawMode( rawMode );
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
            ffiSandboxId: partialAttenuation.ffiSandboxId !== void 0 ?
                partialAttenuation.ffiSandboxId :
                rawMode.ffiSandboxId,
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
            ffiSandboxId: rawMode.ffiSandboxId,
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
        throw new Error(
            "Tried to call `runEffects` on " + effects.pretty() );
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
            ffiSandboxId: attenuation.ffiSandboxId,
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
            addMacroThread( thread.attenuation,
                thread.macLookupEffectsOfDefinitionEffects );
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
                    ffiSandboxId: null,
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
                throw new Error(
                    "Internal error: Unrecognized " +
                    "thread.monad.first: " +
                    JSON.stringify( thread.monad.first ) );
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
        if ( err === null )
            return;
        
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
    
    function raiseErrorsForCertainStalledThreads( threadFilter ) {
        // NOTE: Some of the threads aren't in the `threads` array,
        // but are instead scattered on individual entries in the
        // `namespaceDefs` data. We probably pay a bit of a
        // performance cost looking them up here, but the savings from
        // not iterating over all those dead threads during
        // macroexpansion more than makes up for it.
        
        var hadError = false;
        arrEach( threads, function ( thread, i ) {
            if ( !threadFilter( thread ) )
                return;
            
            raiseErrorsForStalledThread( thread.monad.first.err );
            hadError = true;
        } );
        namespaceDefs.each( function ( nsName, contributionTable ) {
            contributionTable.elements.each(
                function ( keyName, entry ) {
                
                if ( entry.directListeners === null )
                    return;
                arrEach( entry.directListeners,
                    function ( listener, i ) {
                    
                    if ( listener.type !== "directListener" )
                        throw new Error();
                    raiseErrorsForStalledThread(
                        listener.thread.monad.first.err );
                    hadError = true;
                } );
            } );
        } );
        return hadError;
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
    if ( raiseErrorsForCertainStalledThreads( function ( thread ) {
        return !thread.isJs;
    } ) ) {
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
    if ( raiseErrorsForCertainStalledThreads( function ( thread ) {
        return true;
    } ) ) {
        rt.anyTestFailed = true;
        return;
    }
    
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
        ceneErr: ceneErr,
        macLookupRet: macLookupRet,
        macLookupThen: macLookupThen
    } );
}

function cexprToSloppyJsCode( cexpr ) {
    return cexpr.toJsCode( {
        getConstructor: function ( constructor ) {
            return constructor;
        },
        minifyJs: function ( code ) {
            return code;
        }
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
function ceneErr( msg ) {
    return macLookupFollowHeart(
        mkClamorErr.ofNow( sinkForeignStrFromJs( msg ) ) );
}

function funcDefForEntrypoint( flatTag, calculateFuncImpl ) {
    return function ( rawMode, funcDefNs ) {
        collectPutDefinedValue( rawMode,
            getFunctionImplementationEntryDefinerByFlatTag(
                funcDefNs, flatTag ),
            new SinkForeign( "native-definition", {
                cexpr: null,
                func: function ( rt, func, arg ) {
                    return macLookupThen( calculateFuncImpl( rt ),
                        function ( impl ) {
                        
                        return callSinkMulti( rt, impl, func, arg );
                    } );
                }
            } ) );
    };
}

function entrypointCallWithSyncJavaScriptMode(
    cliArguments, topLevelVars, textOfFiles, inputPathType,
    inputPathDirectoryList, inputPathBlobUtf8, funcDefs,
    calculateFunc ) {
    
    var codeOfFiles = arrMappend( textOfFiles, function ( text ) {
        return readAll( { locationHostType: "top-level" }, text );
    } );
    
    var nss = {
        uniqueNs: sinkNsGet( "unique-ns", sinkNsRoot() ),
        definitionNs: sinkNsGet( "definition-ns", sinkNsRoot() ),
        qualify: rootQualify
    };
    var funcDefNs =
        sinkNsGet( "function-implementations-ns", sinkNsRoot() );
    
    var usingDefNs = usingFuncDefNs( funcDefNs );
    
    function defer( body ) {
        // TODO: Improve this.
        setTimeout( function () {
            body();
        }, 0 );
    }
    
    var namespaceDefs = jsnMap();
    
    var ceneApiUsingDefNs =
        ceneApiUsingFuncDefNs( namespaceDefs, funcDefNs, {
            defer: function ( body ) {
                defer( body );
            },
            cliArguments: function () {
                return cliArguments;
            },
            cliInputDirectory: function () {
                return [ "in-root" ];
            },
            cliOutputDirectory: function () {
                return [ "out-root" ];
            },
            inputPathGet: function ( inputPath, name ) {
                return [ "get", name, inputPath ];
            },
            inputPathType: function ( inputPath ) {
                if ( !inputPathType.has( inputPath ) )
                    throw new Error();
                return inputPathType.get( inputPath );
            },
            inputPathDirectoryList: function ( inputPath ) {
                if ( !inputPathDirectoryList.has( inputPath ) )
                    throw new Error();
                return inputPathDirectoryList.get( inputPath );
            },
            inputPathBlobUtf8: function ( inputPath ) {
                if ( !inputPathBlobUtf8.has( inputPath ) )
                    throw new Error();
                return inputPathBlobUtf8.get( inputPath );
            },
            outputPathGet: function ( outputPath, name ) {
                return [ "get", name, outputPath ];
            },
            outputPathDirectory: function ( outputPath ) {
                // Do nothing.
            },
            outputPathBlobUtf8:
                function ( outputPath, outputString ) {
                
                // Do nothing.
            },
            sloppyJavaScriptProgram:
                function ( cexpr, topLevelVars ) {
                
                return null;
            },
            pickyJavaScriptProgram: function ( cexpr, topLevelVars ) {
                return null;
            },
            onceDependenciesComplete: function ( listener ) {
                // Do nothing.
            },
            getTopLevelVar: function ( varName ) {
                var k = "|" + varName;
                if ( !hasOwn( topLevelVars, k ) )
                    throw new Error();
                return topLevelVars[ k ].get();
            },
            setTopLevelVar: function ( varName, val ) {
                var k = "|" + varName;
                if ( !hasOwn( topLevelVars, k ) )
                    throw new Error();
                return topLevelVars[ k ].set( val );
            }
        } );
    
    usingDefNs.addCoreMacros(
        namespaceDefs, nss.definitionNs, funcDefNs );
    usingDefNs.processCoreStructs( namespaceDefs, nss.definitionNs );
    ceneApiUsingDefNs.addCeneApi( nss.definitionNs, funcDefNs );
    
    var dummyMode = usingDefNs.makeDummyMode();
    arrEach( funcDefs, function ( funcDef, i ) {
        funcDef( dummyMode, funcDefNs );
    } );
    usingDefNs.commitDummyMode( namespaceDefs, dummyMode );
    
    runTopLevelMacLookupsSync( namespaceDefs, usingDefNs.rt,
        [].concat(
        
        usingDefNs.topLevelTryExprsToMacLookupThreads( nss,
            codeOfFiles ),
        [ { type: "jsEffectsThread", macLookupEffectsOfJsEffects:
            macLookupThen( calculateFunc( usingDefNs.rt ),
                function ( func ) {
                
                return func.callSink( usingDefNs.rt,
                    new SinkForeign( "foreign",
                        ceneApiUsingDefNs.ceneClient ) );
            } ) } ]
    ) );
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
    
    function parseStxDetails( stxDetails ) {
        if ( !(stxDetails instanceof SinkForeign
            && stxDetails.purpose === "stx-details") )
            throw new Error();
        return stxDetails.foreignVal;
    }
    
    function stxToObtainMethod( rt, nss, stx, stringToUnq, then ) {
        if ( !(stx instanceof SinkForeign && stx.purpose === "stx") )
            return then( { type: "obtainInvalid" } );
        var sExpr = stx.foreignVal.sExprLayer;
        
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
    
    function cgenCaseletForRunner(
        nss, rawMode, maybeVa, matchSubject, body, then ) {
        
        var subjectVar = maybeVa !== null ? maybeVa.val :
            nssGet( nss, "subject-var" ).uniqueNs.name;
        
        function processTail( nss, rawMode, body, then ) {
            if ( !mkCons.tags( body ) )
                throw new Error();
            var body1 = mkCons.getProj( body, "cdr" );
            if ( !mkCons.tags( body1 ) )
                return then( rawMode,
                    macroexpandLazy( nss, rawMode,
                        mkCons.getProj( body, "car" ) ) );
            
            return macLookupThen( extractPattern( nss, body ),
                function ( pattern ) {
            
            if ( !mkCons.tags( pattern.remainingBody ) )
                throw new Error();
            
            var forceThenBranch =
                macroexpandLazy( nssGet( nss, "then" ), rawMode,
                    mkCons.getProj( pattern.remainingBody, "car" ) );
            
            var els = mkCons.getProj( pattern.remainingBody, "cdr" );
            return processTail( nssGet( nss, "tail" ), rawMode, els,
                function ( rawMode, forceProcessedTail ) {
            
            return then( rawMode, function ( rawMode, then ) {
                return forceThenBranch( rawMode,
                    function ( rawMode, thenBranch ) {
                return forceProcessedTail( rawMode,
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
            
            } );
            
            } );
        }
        
        var forceSubject =
            macroexpandLazy( nssGet( nss, "subject" ), rawMode,
                matchSubject );
        
        return processTail( nssGet( nss, "tail" ), rawMode, body,
            function ( rawMode, forceProcessedTail ) {
        return forceSubject( rawMode,
            function ( rawMode, expandedSubject ) {
        return forceProcessedTail( rawMode,
            function ( rawMode, processedTail ) {
        
        return macLookupThenRunEffects( rawMode,
            then(
                new CexprLet(
                    [ { k: subjectVar, v: expandedSubject } ],
                    processedTail ) ) );
        
        } );
        } );
        } );
    }
    
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
        
        return macroexpandMulti( nss, rawMode, {
            "on-cast-expr":
                mkCons.getProj( pattern.remainingBody, "car" ),
            body: mkCons.getProj( remainingBody1, "car" ),
            subject: matchSubject
        }, function ( rawMode, expanded ) {
        
        return macLookupThenRunEffects( rawMode,
            then(
                new CexprCase(
                    expanded.subject,
                    pattern.struct.repMainTagName,
                    pattern.bindingsMap,
                    expanded.body,
                    expanded[ "on-cast-expr" ] ) ) );
        
        } );
        
        } );
    }
    
    function processFn( rt, nss, rawMode, body, then ) {
        if ( !mkCons.tags( body ) )
            throw new Error();
        var body1 = mkCons.getProj( body, "cdr" );
        if ( !mkCons.tags( body1 ) )
            return macroexpand( nss, rawMode,
                mkCons.getProj( body, "car" ),
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
    
    function macroexpandConsListToArrLazy( nss, rawMode, list ) {
        
        var force = [];
        var currentNss = nss;
        var e = list;
        while ( mkCons.tags( e ) ) {
            force.push(
                macroexpandLazy( nssGet( currentNss, "first" ),
                    rawMode,
                    mkCons.getProj( e, "car" ) ) );
            currentNss = nssGet( currentNss, "rest" );
            e = mkCons.getProj( e, "cdr" );
        }
        if ( !mkNil.tags( e ) )
            throw new Error();
        
        var n = force.length;
        
        return function ( rawMode, then ) {
            return go( rawMode, 0, null );
            function go( rawMode, i, revResult ) {
                if ( n <= i )
                    return then( rawMode,
                        revJsListToArr( revResult ) );
                
                return force[ i ]( rawMode,
                    function ( rawMode, elemResult ) {
                    
                    return go( rawMode, i + 1,
                        { first: elemResult, rest: revResult } );
                } );
            }
        };
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
            ffiSandboxId: null,
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
                
                function makeEvalExpr( nss, rawMode, expr ) {
                    var force = macroexpandLazy( nss, rawMode, expr );
                    return function ( rawMode, then ) {
                        return force( rawMode,
                            function ( rawMode, expanded ) {
                            
                            return macLookupThen(
                                cgenExecute( rt,
                                    cexprToSloppyJsCode( expanded ) ),
                                function ( evaluated ) {
                                
                                return then( rawMode, evaluated );
                            } );
                        } );
                    };
                }
                
                function makeEvalExprAndRun( nss, rawMode, expr ) {
                    var evalExpr = makeEvalExpr( nss, rawMode, expr );
                    
                    return function ( rawMode, then ) {
                        return evalExpr( rawMode,
                            function ( rawMode, evaluated ) {
                        
                        var definer = {
                            type: "object",
                            ffiSandboxId: rawMode.ffiSandboxId,
                            unitTestId: rawMode.unitTestId,
                            visit: null,
                            dexAndValue: null
                        };
                        
                        collectDefer( rawMode, {},
                            function ( rawMode ) {
                            
                            return macLookupThen(
                                macLookupGet( definer, function () {
                                    throw new Error( "Never completed a side of a test-async" );
                                } ),
                                function ( defined ) {
                                
                                return macLookupRet(
                                    new SinkForeign( "effects", function ( rawMode ) {
                                    
                                    return then( rawMode, defined );
                                } ) );
                                
                            } );
                        } );
                        
                        return macLookupThenRunEffects( rawMode,
                            evaluated.callSink( rt,
                                new SinkForeign( "definer",
                                    definer ) ) );
                        
                        } );
                    };
                }
                
                var evalDex =
                    makeEvalExpr( nssGet( nss, "dex" ), rawMode,
                        mkCons.getProj( body, "car" ) );
                var evalA =
                    makeEvalExprAndRun( nssGet( nss, "a" ), rawMode,
                        mkCons.getProj( body1, "car" ) );
                var evalB =
                    makeEvalExprAndRun( nssGet( nss, "b" ), rawMode,
                        mkCons.getProj( body2, "car" ) );
                
                collectDefer( rawMode, {
                    type: "unit-test",
                    ffiSandboxId: null,
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
                var forceFunc =
                    macroexpandLazy( nssGet( nss, "func" ), rawMode,
                        mkCons.getProj( body, "car" ) );
                var forceArgs =
                    macroexpandConsListToArrLazy(
                        nssGet( nss, "args" ),
                        rawMode,
                        mkCons.getProj( body, "cdr" ) );
                
                return forceFunc( rawMode,
                    function ( rawMode, expandedFunc ) {
                return forceArgs( rawMode,
                    function ( rawMode, expandedArgs ) {
                
                return macLookupThenRunEffects( rawMode,
                    then(
                        cgenCallArr( expandedFunc, expandedArgs ) ) );
                
                } );
                } );
            };
        } );
        
        function stxToDefiniteSinkString( stx ) {
            if ( !(stx instanceof SinkForeign
                && stx.purpose === "stx") )
                throw new Error();
            var istringNil = stx.foreignVal.sExprLayer;
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
                
                var unforcedBindings = [];
                var bindingsNss = nss;
                var remainingBody = body;
                while ( true ) {
                    if ( !mkCons.tags( remainingBody ) )
                        throw new Error();
                    var remainingBody1 =
                        mkCons.getProj( remainingBody, "cdr" );
                    if ( !mkCons.tags( remainingBody1 ) )
                        break;
                    
                    unforcedBindings.push( {
                        k: mkCons.getProj( remainingBody, "car" ),
                        v: macroexpandLazy(
                            nssGet( bindingsNss, "first" ), rawMode,
                            mkCons.getProj( remainingBody1, "car" ) )
                    } );
                    bindingsNss = nssGet( bindingsNss, "rest" );
                    remainingBody =
                        mkCons.getProj( remainingBody1, "cdr" );
                }
                
                var forceBody =
                    macroexpandLazy( nssGet( nss, "body" ), rawMode,
                        mkCons.getProj( remainingBody, "car" ) );
                
                var n = unforcedBindings.length;
                
                return resolveNames( nss, 0, null,
                    function ( revBindings ) {
                return forceBindings( rawMode, revBindings, null,
                    function ( rawMode, bindings ) {
                return forceBody( rawMode,
                    function ( rawMode, body ) {
                
                return macLookupThenRunEffects( rawMode,
                    then(
                        new CexprLet(
                            revJsListToArr( bindings ).reverse(),
                            body ) ) );
                
                } );
                } );
                } );
                
                function resolveNames( nss, i, revBindings, then ) {
                    
                    if ( n <= i )
                        return then( revBindings );
                    
                    return stxToName( rt, nss,
                        unforcedBindings[ i ].k,
                        function ( string ) {
                            return mkLocalOccurrence.ofNow( string );
                        },
                        function ( va ) {
                        
                        return resolveNames( nss, i + 1, {
                            first:
                                { k: va, v: unforcedBindings[ i ].v },
                            rest: revBindings
                        }, then );
                    } );
                }
                
                function forceBindings( rawMode, revUnforcedBindings,
                    forcedBindings, then ) {
                    
                    if ( revUnforcedBindings === null )
                        return then( rawMode, forcedBindings );
                    
                    return revUnforcedBindings.first.v( rawMode,
                        function ( rawMode, forcedBinding ) {
                        
                        return forceBindings( rawMode,
                            revUnforcedBindings.rest,
                            {
                                first: {
                                  k: revUnforcedBindings.first.k,
                                  v: forcedBinding
                                },
                                rest: forcedBindings
                            },
                            then );
                    } );
                }
            };
        } );
        
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
                
                
                var force = [];
                var currentNss = nss;
                var remainingBody = mkCons.getProj( body, "cdr" );
                arrEach( struct.unsortedProjNames, function ( name ) {
                    if ( !mkCons.tags( remainingBody ) )
                        throw new Error(
                            "Expected more arguments to " +
                            JSON.stringify( sourceMainTagNameRep ) );
                    
                    force.push(
                        macroexpandLazy(
                            nssGet( currentNss, "first" ),
                            rawMode,
                            mkCons.getProj(
                                remainingBody, "car" ) ) );
                    currentNss = nssGet( currentNss, "rest" );
                    remainingBody =
                        mkCons.getProj( remainingBody, "cdr" );
                } );
                if ( mkCons.tags( remainingBody ) )
                    throw new Error();
                
                return loop( rawMode, struct, 0, force, null );
                
                } );
                } );
            };
            
            function loop( rawMode, struct, i, force, revProjVals ) {
                
                var n = struct.unsortedProjNames.length;
                if ( n <= i )
                    return macLookupThenRunEffects( rawMode,
                        then(
                            new CexprConstructor(
                                struct.repMainTagName,
                                revJsListToArr( revProjVals ) ) ) );
                
                return force[ i ]( rawMode,
                    function ( rawMode, projVal ) {
                    
                    return loop( rawMode, struct, i + 1, force,
                        { first:
                            { name: struct.unsortedProjNames[ i ].rep,
                                expr: projVal },
                            rest: revProjVals } );
                } );
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
                    
                    return macLookupThen( cline.clineRate( rt, a ),
                        function ( aRating ) {
                        
                        if ( aRating === null )
                            return macLookupRet( mkNil.ofNow() );
                    
                    return macLookupThen( cline.clineRate( rt, b ),
                        function ( bRating ) {
                        
                        if ( bRating === null )
                            return macLookupRet( mkNil.ofNow() );
                    
                    // TODO: This currently allows a
                    // `cline-by-own-method` to compare A and B and to
                    // compare C and D, but to reject comparing A and
                    // C. Make this an error instead. We might as well
                    // switch to a system where clines compare using a
                    // method call rather than doing `clineRate` first
                    // while we're at it.
                    if ( jsnCompare(
                            aRating.compatible,
                            bRating.compatible
                        ) !== 0 )
                        return macLookupRet( mkNil.ofNow() );
                    var func = aRating.func;
                    return macLookupRet(
                        func( rt,
                            aRating.prepared,
                            bRating.prepared ) );
                    
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
        
        fun( "table-map-fuse", function ( rt, table ) {
            return sinkFnPure( function ( rt, fuse ) {
                return new SinkFn( function ( rt, func ) {
                    if ( fuse.affiliation !== "fuse" )
                        throw new Error();
                    if ( !(table instanceof SinkForeign
                        && table.purpose === "table") )
                        throw new Error();
                    
                    var keys = [];
                    table.foreignVal.each( function ( k, v ) {
                        // TODO: See if we can avoid this
                        // JSON.parse(). Why do we even need it in the
                        // first place?
                        keys.push(
                            new SinkForeign( "name",
                                JSON.parse( k ) ) );
                    } );
                    var n = keys.length;
                    return loop( 0, null );
                    function loop( i, maybeFused ) {
                        if ( n <= i )
                            return macLookupRet(
                                maybeFused === null ?
                                    mkNil.ofNow() :
                                    mkYep.ofNow( maybeFused.val ) );
                        return macLookupThen(
                            func.callSink( rt, keys[ i ] ),
                            function ( v ) {
                            
                            if ( maybeFused === null )
                                return loop( i + 1, { val: v } );
                            
                            return macLookupThen(
                                fuse.fuse( rt, maybeFused.val, v ),
                                function ( v ) {
                                
                                if ( !mkYep.tags( state ) )
                                    return macLookupRet( mkNil.ofNow() );
                                
                                return loop( i + 1, { val: v } );
                            } );
                        } );
                    }
                } );
            } );
        } );
        
        fun( "table-sort", function ( rt, cline ) {
            return new SinkFn( function ( rt, table ) {
                if ( cline.affiliation !== "cline" )
                    throw new Error();
                if ( !(table instanceof SinkForeign
                    && table.purpose === "table") )
                    throw new Error();
                
                var entries = [];
                table.foreignVal.each( function ( k, v ) {
                    entries.push( { k: k, v: v } );
                } );
                var n = entries.length;
                return loop( 0, [] );
                function loop( i, ratings ) {
                    if ( n <= i )
                        return next( ratings );
                    var entry = entries[ i ];
                    return macLookupThen(
                        cline.clineRate( rt, entry.v ),
                        function ( maybeRating ) {
                        
                        if ( maybeRating === null )
                            return macLookupRet( mkNil.ofNow() );
                        
                        return loop( i + 1,
                            ratings.concat( [ {
                                k: entry.k,
                                v: entry.v,
                                rating: maybeRating
                            } ] ) );
                    } );
                }
                
                function next( ratings ) {
                    
                    function compareRatings( a, b ) {
                        if ( jsnCompare(
                                a.compatible, b.compatible ) !== 0 )
                            return null;
                        var func = a.func;
                        var result =
                            func( rt, a.prepared, b.prepared );
                        if ( !mkYep.tags( result ) )
                            return null;
                        var comparison = mkYep.getProj( result, yep );
                        if ( mkYep.tags( comparison ) )
                            return -1;
                        if ( mkNope.tags( comparison ) )
                            return 1;
                        return 0;
                    }
                    function compareEntries( a, b ) {
                        return compareRatings( a.rating, b.rating );
                    }
                    
                    // TODO: Currently, we do a sort using whatever
                    // comparisons JavaScript wants to do, and then we
                    // go through the list and compare each rating to
                    // build our partitioned ranks. See if we want to
                    // do this in a cheaper way.
                    
                    var sortedRatings = ratings.slice().sort(
                        function ( a, b ) {
                            return compareEntries( a, b ) || 0;
                        } );
                    
                    var result = mkNil.ofNow();
                    var currentTable = jsnMap();
                    var currentRepresentative = null;
                    for ( var i = n - 1; 0 <= i; i-- ) {
                        var entry = sortedRatings[ i ];
                        if ( currentRepresentative === null ) {
                            currentTable.set( entry.k, entry.v );
                            currentRepresentative = entry.rating;
                        } else {
                            var comparison =
                                compareRatings( entry.rating,
                                    currentRepresentative );
                            if ( comparison === null )
                                return macLookupRet( mkNil.ofNow() );
                            if ( comparison !== 0 ) {
                                result = mkCons.ofNow(
                                    new SinkForeign( "table", currentTable ),
                                    result );
                                currentTable = jsnMap();
                                currentRepresentative = entry.rating;
                            }
                            currentTable.set( entry.k, entry.v );
                        }
                    }
                    if ( currentRepresentative !== null )
                        result = mkCons.ofNow(
                            new SinkForeign( "table", currentTable ),
                            result );
                    return macLookupRet( mkYep.ofNow( result ) );
                }
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
            return new SinkForeign( "regex", {
                hasEmpty: false,
                getData: function () {
                    return regexTrivial( "\\d^" );
                }
            } );
        } );
        
        fun( "regex-empty", function ( rt, ignored ) {
            return new SinkForeign( "regex", {
                hasEmpty: true,
                getData: function () {
                    return regexTrivial( "" );
                }
            } );
        } );
        
        function escapeRegex( jsStr ) {
            return jsStr.replace( /[\\^$.|?*+()[\]{}]/g, "\\$&" );
        }
        function escRegexSet( jsStr ) {
            return jsStr.replace( /[\\^\-[\]]/g, "\\$&" );
        }
        
        fun( "regex-from-string", function ( rt, string ) {
            var stringRep = parseString( string ).paddedStr;
            
            return new SinkForeign( "regex", {
                hasEmpty: stringRep.length === 0,
                getData: function () {
                    return {
                        optional: function ( next ) {
                            return stringRep.replace( /[\d\D]{2}/g,
                                function ( scalarStr, i, stringRep ) {
                                    return "(?:" +
                                        escapeRegex( scalarStr );
                                } ) +
                                next +
                                stringRep.replace( /[\d\D]{2}/g,
                                    "|$$)" );
                        },
                        necessary: escapeRegex( stringRep )
                    };
                }
            } );
        } );
        
        fun( "regex-one-in-string", function ( rt, string ) {
            var stringRep = parseString( string ).paddedStr;
            
            return new SinkForeign( "regex", {
                hasEmpty: false,
                getData: function () {
                    return regexOptionalTrivial( "(?:\\d^" +
                        stringRep.replace( /[\d\D]{2}/g,
                            function ( scalarStr, i, stringRep ) {
                                return "|" + escapeRegex( scalarStr );
                            } ) + ")" );
                }
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
                
                return new SinkForeign( "regex", {
                    hasEmpty: false,
                    getData: function () {
                        return regexOptionalTrivial( a0 === b0 ?
                            escapeRegex( a0 ) +
                                (a1 === b1 ?
                                    escapeRegex( a1 ) :
                                    "[" + escRegexSet( a1 ) + "-" + escRegexSet( b1 ) + "]") :
                            "(?:" + escapeRegex( a0 ) +
                                "[" + escRegexSet( a1 ) + "-\\uFFFF" +
                                    "]|" +
                                (a0 + 1 === b0 ? "" :
                                    "[" + escRegexSet( a0 + 1 ) + "-" + escRegexSet( b0 - 1 ) +
                                        "][\\d\\D]|") +
                                escapeRegex( a1 ) +
                                "[\\x00-" + escRegexSet( b1 ) + "])"
                            );
                    }
                } );
            } );
        } );
        
        fun( "regex-one", function ( rt, ignored ) {
            return new SinkForeign( "regex", {
                hasEmpty: false,
                getData: function () {
                    return regexOptionalTrivial( "[\\d\\D]{2}" );
                }
            } );
        } );
        
        function compileRegexData( regexData ) {
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
                
                var makeFunc = regexData.makeFunc;
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
                    var conditionRegexFunc =
                        conditionRegex.foreignVal.getData;
                    
                    if ( !(thenRegex instanceof SinkForeign
                        && thenRegex.purpose === "regex") )
                        throw new Error();
                    var thenRegexFunc = thenRegex.foreignVal.getData;
                    
                    if ( !(elseRegex instanceof SinkForeign
                        && elseRegex.purpose === "regex") )
                        throw new Error();
                    var elseRegexFunc = elseRegex.foreignVal.getData;
                    
                    return new SinkForeign( "regex", {
                        hasEmpty:
                          (conditionRegex.foreignVal.hasEmpty
                            && thenRegex.foreignVal.hasEmpty
                          ) || elseRegex.foreignVal.hasEmpty,
                        getData: function () {
                            var cCompiled =
                                compileRegexData(
                                    conditionRegexFunc() );
                            var tCompiled =
                                compileRegexData( thenRegexFunc() );
                            var eCompiled =
                                compileRegexData( elseRegexFunc() );
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
                        }
                    } );
                } );
            } );
        } );
        
        fun( "regex-while", function ( rt, conditionRegex ) {
            return sinkFnPure( function ( rt, bodyRegex ) {
                
                if ( !(conditionRegex instanceof SinkForeign
                    && conditionRegex.purpose === "regex") )
                    throw new Error();
                var conditionRegexFunc =
                    conditionRegex.foreignVal.getData;
                
                if ( !(bodyRegex instanceof SinkForeign
                    && bodyRegex.purpose === "regex") )
                    throw new Error();
                var bodyRegexFunc = bodyRegex.foreignVal.getData;
                
                if ( conditionRegex.foreignVal.hasEmpty
                    && bodyRegex.foreignVal.hasEmpty )
                    return ceneErr(
                        "Did not expect both condition and body to " +
                        "match the empty string" );
                
                return new SinkForeign( "regex", {
                    hasEmpty: true,
                    getData: function () {
                        var cCompiled =
                            compileRegexData(
                                conditionRegexFunc() );
                        var bCompiled =
                            compileRegexData( bodyRegexFunc() );
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
                                    while ( true ) {
                                        var cResult = cFunc( string, thisStart, stop );
                                        if ( cResult.type === "failed" )
                                            return { type: "matched", stop: thisStart };
                                        else if ( cResult.type === "passedEnd" )
                                            return cResult;
                                        
                                        var bResult = bFunc( string, cResult.stop, stop );
                                        if ( bResult.type !== "matched" )
                                            return bResult;
                                        
                                        if ( thisStart === bResult.stop )
                                            throw new Error(
                                                "Internal error: It turns out condition and body can " +
                                                "both match the empty string after all" );
                                        
                                        thisStart = bResult.stop;
                                    }
                                };
                            }
                        };
                    }
                } );
            } );
        } );
        
        fun( "regex-until", function ( rt, bodyRegex ) {
            return sinkFnPure( function ( rt, conditionRegex ) {
                
                if ( !(bodyRegex instanceof SinkForeign
                    && bodyRegex.purpose === "regex") )
                    throw new Error();
                var bodyRegexFunc = bodyRegex.foreignVal.getData;
                
                if ( !(conditionRegex instanceof SinkForeign
                    && conditionRegex.purpose === "regex") )
                    throw new Error();
                var conditionRegexFunc =
                    conditionRegex.foreignVal.getData;
                
                if ( bodyRegex.foreignVal.hasEmpty )
                    return ceneErr(
                        "Did not expect body to match the empty " +
                        "string" );
                
                return new SinkForeign( "regex", {
                    hasEmpty: conditionRegex.foreignVal.hasEmpty,
                    getData: function () {
                        var bCompiled =
                            compileRegexData( bodyRegexFunc() );
                        var cCompiled =
                            compileRegexData(
                                conditionRegexFunc() );
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
                                    while ( true ) {
                                        var cResult = cFunc( string, thisStart, stop );
                                        if ( cResult.type !== "failed" )
                                            return cResult;
                                        
                                        var bResult = bFunc( string, thisStart, stop );
                                        if ( bResult.type !== "matched" )
                                            return bResult;
                                        
                                        if ( thisStart === bResult.stop )
                                            throw new Error(
                                                "Internal error: It turns out body can match the " +
                                                "empty string after all" );
                                        
                                        thisStart = bResult.stop;
                                    }
                                };
                            }
                        };
                    }
                } );
            } );
        } );
        
        fun( "regex-has-empty", function ( rt, regex ) {
            if ( !(regex instanceof SinkForeign
                && regex.purpose === "regex") )
                throw new Error();
            return rt.fromBoolean( regex.foreignVal.hasEmpty );
        } );
        
        fun( "optimize-regex-later", function ( rt, regex ) {
            return sinkFnPure( function ( rt, then ) {
                if ( !(regex instanceof SinkForeign
                    && regex.purpose === "regex") )
                    throw new Error();
                var regexFunc = regex.foreignVal.getData;
                var compiled =
                    compileRegexData( regexFunc() ).makeFunc();
                
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
        
        fun( "cexpr-located", function ( rt, stxDetails ) {
            return sinkFnPure( function ( rt, body ) {
                if ( !(body instanceof SinkCexpr) )
                    throw new Error();
                
                return new SinkCexpr(
                    new CexprLocated( parseStxDetails( stxDetails ),
                        body.cexpr ) );
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
        
        fun( "isa-stx", function ( rt, val ) {
            return rt.fromBoolean(
                val instanceof SinkForeign && val.purpose === "stx" );
        } );
        
        fun( "stx-details-from-stx", function ( rt, stx ) {
            if ( !(stx instanceof SinkForeign
                && stx.purpose === "stx") )
                throw new Error();
            return stx.foreignVal.stxDetails;
        } );
        
        fun( "s-expr-layer-from-stx", function ( rt, stx ) {
            if ( !(stx instanceof SinkForeign
                && stx.purpose === "stx") )
                throw new Error();
            return stx.foreignVal.sExprLayer;
        } );
        
        fun( "stx-from-details-and-layer", function ( rt, details ) {
            return sinkFnPure( function ( rt, layer ) {
                return new SinkForeign( "stx", {
                    stxDetails: details,
                    sExprLayer: layer
                } );
            } );
        } );
        
        fun( "stx-details-empty", function ( rt, ignored ) {
            return new SinkForeign( "stx-details", [] );
        } );
        
        fun( "stx-details-join", function ( rt, outer ) {
            return sinkFnPure( function ( rt, inner ) {
                return new SinkForeign( "stx-details",
                    [].concat( parseStxDetails( outer ),
                        parseStxDetails( inner ) ) );
            } );
        } );
        
        fun( "stx-details-macro-call",
            function ( rt, callStxDetails ) {
            
            return sinkFnPure( function ( rt, macroNameStxDetails ) {
                return new SinkForeign( "stx-details", [ {
                    type: "stx-details-macro-call",
                    callStxDetails: parseStxDetails( callStxDetails ),
                    macroNameStxDetails:
                        parseStxDetails( macroNameStxDetails )
                } ] );
            } );
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
                            ffiSandboxId: rawMode.ffiSandboxId,
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
                readAll( { locationHostType: "read-all-force" },
                    parseString( string ).jsStr ),
                function ( tryExpr ) {
                
                if ( !tryExpr.ok )
                    throw new Error( tryExpr.msg );
                
                return sinkFromReaderExpr( function ( start, stop ) {
                    return new SinkForeign( "stx-details", [ {
                        type: "read-all-force",
                        start: start,
                        stop: stop
                    } ] );
                }, tryExpr.val );
            } ) );
        } );
        
        // TODO: This is handy for debugging. See if we should add it,
        // at least provisionally. Maybe its semantics could be based
        // on `follow-heart`.
//        fun( "log", function ( rt, val ) {
//            console.log( val.pretty() );
//            return val;
//        } );
        
        commitDummyMode( namespaceDefs, dummyMode );
    }
    
    function macroexpandToDefiner(
        nss, rawMode, locatedExpr, outDefiner ) {
        
        if ( !(locatedExpr instanceof SinkForeign
            && locatedExpr.purpose === "stx") )
            throw new Error(
                "Tried to macroexpand " + locatedExpr.pretty() );
        var expressionStxDetails = locatedExpr.foreignVal.stxDetails;
        
        function finishWithCexpr( cexpr ) {
            return macLookupRet( new SinkForeign( "effects",
                function ( rawMode ) {
                
                if ( !(cexpr instanceof SinkCexpr) )
                    throw new Error();
                
                collectPutDefinedValue( rawMode, outDefiner,
                    new SinkCexpr(
                        new CexprLocated(
                            parseStxDetails( expressionStxDetails ),
                            cexpr.cexpr ) ) );
                return macLookupRet( mkNil.ofNow() );
            } ) );
        }
        
        collectDefer( rawMode, {}, function ( rawMode ) {
            return stxToObtainMethod( rt, nss, locatedExpr,
                function ( string ) {
                    return mkLocalOccurrence.ofNow( string );
                },
                function ( exprAppearance ) {
                
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
            
            var sExpr = locatedExpr.foreignVal.sExprLayer;
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
                new SinkForeign( "stx-details", [ {
                    type: "stx-details-macro-call",
                    callStxDetails:
                        parseStxDetails( expressionStxDetails ),
                    macroNameStxDetails:
                        parseStxDetails(
                            macroNameStx.foreignVal.stxDetails )
                } ] ),
                mkCons.getProj( sExpr, "cdr" ),
                new SinkFn( function ( rt, macroResult ) {
                    return finishWithCexpr( macroResult );
                } ) );
            
            } );
            
            } );
            
            } );
        } );
        
        return macLookupRet( mkNil.ofNow() );
    }
    
    function macroexpandLazy( nss, rawMode, locatedExpr ) {
        var definer =
            elementDefiner( "val", nssGet( nss, "outbox" ).uniqueNs );
        
        // We spawn a thread just to report errors if the macro call
        // doesn't complete.
        collectDefer( rawMode, {}, function ( rawMode ) {
            return macLookupThen(
                macLookupGet( definer, function () {
                    if ( !(locatedExpr instanceof SinkForeign
                        && locatedExpr.purpose === "stx") )
                        throw new Error();
                    var sExpr = locatedExpr.foreignVal.sExprLayer;
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
                return macLookupRet( sinkForeignEffectsNil );
            } );
        } );
        
        macroexpandToDefiner( nssGet( nss, "uniique" ), rawMode,
            locatedExpr, definer );
        
        return function ( rawMode, then ) {
            collectDefer( rawMode, {}, function ( rawMode ) {
                return macLookupThen(
                    // We're already reporting an error in the thread
                    // above if this get doesn't work, so we pass in
                    // `null` as the error-throwing function here.
                    macLookupGet( definer, null ),
                    function ( macroResult ) {
                    
                    if ( !(macroResult instanceof SinkCexpr) )
                        throw new Error();
                    return macLookupRet( new SinkForeign( "effects",
                        function ( rawMode ) {
                        
                        return then( rawMode, macroResult.cexpr );
                    } ) );
                } );
            } );
            
            return macLookupRet( mkNil.ofNow() );
        };
    }
    
    function macroexpandMulti( nss, rawMode, locatedExprs, then ) {
        
        var locatedExprsArr = [];
        objOwnEach( locatedExprs, function ( k, locatedExpr ) {
            locatedExprsArr.push( {
                k: k,
                force:
                    macroexpandLazy( nssGet( nss, k ), rawMode,
                        locatedExpr )
            } );
        } );
        var n = locatedExprsArr.length;
        
        collectDefer( rawMode, {}, function ( rawMode ) {
            return macLookupRet( new SinkForeign( "effects",
                function ( rawMode ) {
                
                return loop( rawMode, 0, null );
            } ) );
            function loop( rawMode, i, revResults ) {
                if ( n <= i ) {
                    var result = {};
                    arrEach( revJsListToArr( revResults ),
                        function ( entry ) {
                        
                        result[ entry.k ] = entry.v;
                    } );
                    return then( rawMode, result );
                }
                
                var entry = locatedExprsArr[ i ];
                var force = entry.force;
                
                return force( rawMode,
                    function ( rawMode, cexpr ) {
                    
                    return loop( rawMode, i + 1, {
                        first: { k: entry.k, v: cexpr },
                        rest: revResults
                    } );
                } );
            }
        } );
        
        return macLookupRet( mkNil.ofNow() );
    }
    
    function macroexpand( nss, rawMode, locatedExpr, then ) {
        var force = macroexpandLazy( nss, rawMode, locatedExpr );
        return force( rawMode, then );
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
        addPureMacro( definitionNs, rawMode, macroMainTagName,
            [ "claim:struct" ],
            function ( myStxDetails, body, then ) {
            
            return function ( rawMode, nss ) {
                
                var forceProj = [];
                var remainingBody = body;
                var projectionsNss = nssGet( nss, "projections" );
                for ( var i = 0; i < n; i++ ) {
                    if ( !mkCons.tags( remainingBody ) )
                        throw new Error(
                            "Expected more arguments to " +
                            JSON.stringify( macroMainTagName ) );
                    
                    forceProj.push(
                        macroexpandLazy(
                            nssGet( projectionsNss, "first" ),
                            rawMode,
                            mkCons.getProj(
                                remainingBody, "car" ) ) );
                    remainingBody =
                        mkCons.getProj( remainingBody, "cdr" );
                    projectionsNss = nssGet( projectionsNss, "rest" );
                }
                
                var forceArgs =
                    macroexpandConsListToArrLazy(
                        nssGet( nss, "args" ),
                        rawMode,
                        remainingBody );
                
                return loop( rawMode, 0, null );
                function loop( rawMode, i, revProjVals ) {
                    
                    if ( n <= i )
                        return forceArgs( rawMode,
                            function ( rawMode, expandedArgs ) {
                            
                            return macLookupThenRunEffects( rawMode,
                                then(
                                    cgenCallArr( struct.ofArr( revJsListToArr( revProjVals ) ),
                                        expandedArgs ) ) );
                        } );
                    
                    return forceProj[ i ]( rawMode,
                        function ( rawMode, projVal ) {
                        
                        return loop( rawMode, i + 1,
                            { first: projVal, rest: revProjVals } );
                    } );
                }
            };
        } );
    }
    
    function processCoreStructs( namespaceDefs, definitionNs ) {
        
        var dummyMode = makeDummyMode();
        
        arrEach( builtInCoreStructsToAdd, function ( entry ) {
            entry( processDefStruct, definitionNs, dummyMode );
        } );
        
        commitDummyMode( namespaceDefs, dummyMode );
    }
    
    function sinkFromReaderExpr( getStxDetails, locatedReaderExpr ) {
        var myStxDetails = getStxDetails(
            locatedReaderExpr.exprLocStart,
            locatedReaderExpr.exprLocStop );
        var readerExpr = locatedReaderExpr.exprLocExpr;
        if ( readerExpr.type === "nil" ) {
            return new SinkForeign( "stx", {
                stxDetails: myStxDetails,
                sExprLayer: mkNil.ofNow()
            } );
        } else if ( readerExpr.type === "cons" ) {
            return new SinkForeign( "stx", {
                stxDetails: myStxDetails,
                sExprLayer:
                    mkCons.ofNow(
                        sinkFromReaderExpr( getStxDetails,
                            readerExpr.first ),
                        sinkFromReaderExpr( getStxDetails,
                            readerExpr.rest ).foreignVal.sExprLayer )
            } );
        } else if ( readerExpr.type === "stringNil" ) {
            return new SinkForeign( "stx", {
                stxDetails: myStxDetails,
                sExprLayer:
                    mkIstringNil.ofNow(
                        sinkForeignStrFromJs(
                            readerStringNilToString(
                                locatedReaderExpr ) ) )
            } );
        } else if ( readerExpr.type === "stringCons" ) {
            return new SinkForeign( "stx", {
                stxDetails: myStxDetails,
                sExprLayer:
                    mkIstringCons.ofNow(
                        sinkForeignStrFromJs(
                            readerStringListToString(
                                readerExpr.string ) ),
                        sinkFromReaderExpr( getStxDetails,
                            readerExpr.interpolation ),
                        sinkFromReaderExpr( getStxDetails,
                            readerExpr.rest ).foreignVal.sExprLayer )
            } );
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
                    sinkFromReaderExpr( function ( start, stop ) {
                        return new SinkForeign( "stx-details", [ {
                            type: "top-level",
                            start: start,
                            stop: stop
                        } ] );
                    }, tryExpr.val ),
                    function ( rawMode, code ) {
                    
                    return macLookupRet( null );
                } );
            } );
            
            remainingNss = nssGet( thisRemainingNss, "rest" );
        } );
        return arrMap( macLookupEffectsArr, function ( effects ) {
            return { type: "topLevelDefinitionThread",
                attenuation: {
                    type: "macro",
                    ffiSandboxId: null,
                    unitTestId: null,
                    contributingOnlyTo: sinkNameSetAll()
                },
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
        
        // NOTE: These are only needed for cene-api.js.
        addPureMacro: addPureMacro,
        processDefStruct: processDefStruct,
        sinkConsListFromArray: sinkConsListFromArray,
        makeDummyMode: makeDummyMode,
        commitDummyMode: commitDummyMode
    };
}



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
                    // `sloppy-javascript-program` and
                    // `picky-javascript-program` respectively. If we
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
        
        fun( "sloppy-javascript-program", function ( rt, mode ) {
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
                                return apiOps.sloppyJavaScriptProgram(
                                    cexpr.cexpr,
                                    dedupVars );
                            } ) );
                } );
            } );
        } );
        
        fun( "picky-javascript-program", function ( rt, mode ) {
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
                                return apiOps.pickyJavaScriptProgram(
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
            if ( !(stx instanceof SinkForeign
                && stx.purpose === "stx") )
                throw new Error();
            var istringNil = stx.foreignVal.sExprLayer;
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


entrypointCallWithSyncJavaScriptMode( [],
topLevelVars,
[ "\\= prelude-util.cene\n\\= Copyright 2015-2017 Ross Angle. Released under the MIT License.\n\n\n\\= ===== Lists, boolean tags, and macro utilities ====================\n\n(def-struct pair first second)\n\n\\= TODO: Find a better name for this.\n(def-struct folding state val)\n\n(defn map-any-foldl state list combiner\n  (cast list cons first rest (folding state list)\n  /caselet combiner-result (c combiner state first)\n    \n    yep result combiner-result\n    \n    folding state first\n    (caselet recur-result (map-any-foldl state rest combiner)\n      yep result recur-result\n      folding state rest (folding state /cons first rest)\n      err.\\;qq[Internal error])\n    \n    err.\\;qq[\n      Expected a combiner-result of that was a yep or a folding]))\n\n(defn map-any list check\n  (caselet fold-result\n    (map-any-foldl (nil) list /fn - elem\n      (caselet check-result (c check elem)\n        yep - check-result\n        nope val (folding (nil) val)\n        err.\\;qq[Expected a check-result that was a yep or a nope]))\n    yep - fold-result\n    folding - val nope.val\n    err.\\;qq[Internal error]))\n\n(defn any-foldl state list combiner\n  (cast list cons first rest nope.state\n  /caselet combiner-result (c combiner state first)\n    yep result combiner-result\n    nope result (any-foldl result rest combiner)\n    err.\\;qq[Expected a combiner-result that was a yep or a nope]))\n\n(defn foldl state list combiner\n  (cast list cons first rest state\n  /foldl (c combiner state first) rest combiner))\n\n(defn dex-give-up -\n  (dex-by-cline/cline-give-up/nil))\n\n(defn dex-default a b\n  (dex-by-cline/cline-default cline-by-dex.a cline-by-dex.b))\n\n(defn dex-int -\n  (dex-by-cline/cline-int/nil))\n\n(defn in-dex dex x\n  (in-cline cline-by-dex.dex x))\n\n(defn call-dex dex a b\n  (call-cline cline-by-dex.dex a b))\n\n(defn table-get-singleton table\n  (cast\n    (table-map-fuse table (fuse-by-merge/merge-by-dex/dex-name/nil)\n    /fn key key)\n    yep key\n    (nil)\n  /table-get key table))\n\n(defn ns-get key ns\n  (cast\n    (table-get-singleton/procure-sub-ns-table\n      (table-shadow\n        (name-of/dexable (dex-default (dex-string/nil) (dex-name/nil))\n          key)\n        (yep/nil)\n      /table-empty/nil)\n      ns)\n    yep result\n    err.\\;qq[Internal error]\n    result))\n\n(defn ns-path ns path\n  (foldl ns path /fn ns component\n    (ns-get component ns)))\n\n(defn double-any-foldl state list-a list-b combiner\n  (cast list-a cons first-a rest-a nope.state\n  /cast list-b cons first-b rest-b nope.state\n  /caselet combiner-result (c combiner state first-a first-b)\n    yep result combiner-result\n    nope result (double-any-foldl result list-a list-b combiner)\n    err.\\;qq[Expected a combiner-result that was a yep or a nope]))\n\n(defn rev-append rev-past rest\n  (foldl rest rev-past /fn state elem /cons elem state))\n\n(defn rev source\n  (rev-append source /nil))\n\n(defn foldr list state combiner\n  (foldl state rev.list /fn state elem /c combiner elem state))\n\n(defn join-effects a b\n  (cast (call-fuse (fuse-effects/nil) a b) yep result\n    err.\\;qq[Expected both parts to be monadic computations]\n    result))\n\n(defn stx-to-obtain-method scope stx string-to-unq\n  (cast scope scope - -b qualify\n    err.\\;qq[Expected a scope value that was a scope]\n  /cast isa-stx.stx yep -\n    err.\\;qq[Expected a stx value that was a located s-expression]\n  /case s-expr-layer-from-stx.stx\n    \n    foreign val\n    (yep/case val\n      \n      obtain-by-unqualified-name name\n      (obtain-by-qualified-name/c qualify name)\n      \n      obtain-by-qualified-name name val\n      \n      val)\n    \n    istring-nil string\n    (yep/obtain-by-qualified-name\n    /c qualify /c string-to-unq string)\n    \n  /nil))\n\n(defn stx-to-maybe-name scope stx string-to-unq\n  (cast (stx-to-obtain-method scope stx string-to-unq)\n    yep obtain-method (nil)\n  /cast obtain-method obtain-by-qualified-name name (nil)\n    yep.name))\n\n(defn stx-to-name scope stx string-to-unq\n  (cast (stx-to-maybe-name scope stx string-to-unq) yep name\n    err.\\;qq[Expected a syntactic name]\n    name))\n\n(defn compile-expression-later scope expression then\n  (cast scope scope unique-ns def-ns qualify\n    err.\\;qq[Expected a scope that was a scope]\n  /cast isa-stx.expression yep -\n    err.\\;qq[Expected an expression that was a located s-expression]\n  /let macro-call s-expr-layer-from-stx.expression\n  /let expression-stx-details stx-details-from-stx.expression\n  /let then\n    (fn result /c then /cexpr-located expression-stx-details result)\n  /later/get-mode/fn mode\n  /case\n    (cast\n      (stx-to-obtain-method scope expression /fn string\n        (name-of/dexable\n          (dex-by-cline/cline-struct local-occurrence\n          /cline-by-dex/dex-string/nil)\n        /local-occurrence string))\n      yep obtain-method (nil)\n    /case obtain-method\n      obtain-directly cexpr yep.cexpr\n      obtain-by-qualified-name name (yep/cexpr-var name)\n    /nil)\n    yep cexpr\n    (c then cexpr)\n  /cast macro-call cons macro-name macro-body\n    err.\\;qq[Expected an expression that was a macro call]\n  /cast isa-stx.macro-name yep -\n    err.\\;qq[Expected a macro name that was a located s-expression]\n  /let macro-name-stx-details stx-details-from-stx.macro-name\n  /let macro-impl\n    (let obtain-method-err\n      (fn -\n        err.\\;qq[\n          Expected a macro call with a macro name that was a literal\n          string, a foreign obtain-by-unqualified-name, a foreign\n          obtain-by-qualified-name, or a foreign obtain-directly])\n    /cast\n      (stx-to-obtain-method scope macro-name /fn string\n        (name-of/dexable\n          (dex-by-cline/cline-struct macro-occurrence\n          /cline-by-dex/dex-string/nil)\n        /macro-occurrence string))\n      yep obtain-method (c obtain-method-err /nil)\n    /case obtain-method\n      \n      obtain-directly macro-function macro-function\n      \n      obtain-by-qualified-name name\n      (cast (procure-macro-implementation-getdef def-ns name)\n        getdef macro-get macro-definer\n        err.\\;qq[Internal error]\n      /c macro-get mode)\n      \n    /c obtain-method-err /nil)\n  /c macro-impl scope\n    (stx-details-macro-call\n      expression-stx-details macro-name-stx-details)\n    macro-body\n    then))\n\n(defn scope-get string scope\n  (cast scope scope unique-ns def-ns qualify\n    err.\\;qq[Expected a scope that was a scope]\n  /scope (ns-get string unique-ns) def-ns qualify))\n\n(defn scope-claim scope\n  (cast scope scope unique-ns def-ns qualify\n    err.\\;qq[Expected a scope that was a scope]\n  /procure-claim unique-ns))\n\n(defn c-later func arg\n  \\= NOTE: We don't just do `(later/c func arg)`, because we want the\n  \\= actual execution of `(c func arg)` to happen in a later tick.\n  (later/get-mode/fn - /c func arg))\n\n(defn basic-macro home-scope caller-scope my-stx-details then body\n  (cast home-scope scope home-unique-ns home-def-ns home-qualify\n    err.\\;qq[Expected a home-scope that was a scope]\n  /join-effects scope-claim.caller-scope\n  /later/get-mode/fn mode\n  /let s (fn it /stx-from-details-and-layer my-stx-details it)\n  /let mac\n    (fn mode str rest\n      (cast\n        (procure-macro-implementation-getdef home-def-ns\n        /c home-qualify\n        /name-of/dexable\n          (dex-by-cline/cline-struct macro-occurrence\n          /cline-by-dex/dex-string/nil)\n        /macro-occurrence str)\n        getdef macro-get macro-definer\n        err.\\;qq[Internal error]\n      /c s /cons (c s /foreign/obtain-directly/c macro-get mode)\n        rest))\n  /c body (scope-get str.body caller-scope) s mac /fn expression\n  /compile-expression-later (scope-get str.compilation caller-scope)\n    expression then))\n\n(defn basic-pure-macro\n  home-scope caller-scope my-stx-details then body\n  \n  (basic-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac then\n  /get-mode/fn mode\n  /c then /c body mode caller-scope s /c mac mode))\n\n(defn basic-nil-macro\n  home-scope caller-scope my-stx-details then body\n  \n  (basic-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac then\n  /join-effects (c body caller-scope s mac)\n  /later/get-mode/fn mode /let mac (c mac mode)\n  /c then /c mac str.nil /nil))\n\n(def-macro list home-scope caller-scope my-stx-details args then\n  (basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /foldr args (c mac str.nil /nil) /fn first rest\n    (c mac str.cons /cons first /cons rest /nil)))\n\n(def-macro proj1 home-scope caller-scope my-stx-details args then\n  (cast args cons constructor args\n    err.\\;qq[Called proj1 with too few args]\n  /cast args cons subject args\n    err.\\;qq[Called proj1 with too few args]\n  /cast args nil\n    err.\\;qq[Called proj1 with too many args]\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /cast caller-scope\n    scope caller-unique-ns caller-def-ns caller-qualify\n    err.\\;qq[Internal error]\n  /let var\n    (c s /foreign/obtain-by-qualified-name\n    /procure-name mode /ns-get str.var caller-unique-ns)\n  /c mac str.cast /list subject constructor var\n    (c mac str.err /list/c s /istring-nil str.\\;qq[Internal error])\n    var))\n\n(def-macro dex-struct home-scope caller-scope my-stx-details args then\n  (cast args cons constructor proj-dexes\n    err.\\;qq[Called dex-struct with too few args]\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /c mac str.dex-by-cline /list\n  /c mac str.cline-struct /cons constructor\n  /map proj-dexes /fn proj-dex\n    (c mac str.cline-by-dex /list proj-dex)))\n\n(defn append past rest\n  (rev-append rev.past rest))\n\n(defn map list func\n  (rev/foldl (nil) list /fn state elem /cons (c func elem) state))\n\n(defn fix func arg\n  (c func fix.func arg))\n\n(defn validate-constructor-glossary glossary\n  (cast glossary constructor-glossary main-tag source-to-rep\n    err.\\;qq[\n      Encountered a constructor glossary that wasn't a\n      constructor-glossary]\n  /cast (in-dex (dex-name/nil) main-tag) yep -\n    err.\\;qq[\n      Encountered a constructor glossary whose main tag name wasn't a\n      name]\n  /let check-list\n    (fix/fn check-list sources-seen reps-seen list\n      (case list\n        \n        nil glossary\n        \n        cons first rest\n        (cast first assoc source rep\n          err.\\;qq[\n            Encountered a constructor glossary with a source-to-rep\n            entry that wasn't an assoc]\n        /cast (in-dex (dex-name/nil) source) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a source-level\n            projection name that wasn't a name]\n        /cast (in-dex (dex-name/nil) rep) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a\n            representation-level projection name that wasn't a name]\n        /case (table-get source sources-seen) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a duplicate\n            source-level projection name]\n        /case (table-get rep reps-seen) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a duplicate\n            representation-level projection name]\n        /c check-list\n          (table-shadow source (yep/nil) sources-seen)\n          (table-shadow rep (yep/nil) reps-seen)\n          rest)\n        \n        err.\\;qq[\n          Encountered a constructor glossary whose source-to-rep\n          mapping wasn't a proper list]))\n  /c check-list (table-empty/nil) (table-empty/nil) source-to-rep))\n\n(def-macro isa home-scope caller-scope my-stx-details args then\n  (cast args cons constructor args\n    err.\\;qq[Called isa with too few args]\n  /cast args cons subject args\n    err.\\;qq[Called isa with too few args]\n  /cast args nil\n    err.\\;qq[Called isa with too many args]\n  /cast isa-stx.constructor yep -\n    err.\\;qq[Expected a constructor that was a located s-expression]\n  /let constructor-stx-details stx-details-from-stx.constructor\n  /cast\n    (stx-to-maybe-name caller-scope constructor /fn string\n      (name-of/dexable\n        (dex-struct constructor-occurrence /dex-string/nil)\n      /constructor-occurrence string))\n    yep constructor\n    err.\\;qq[Expected a constructor that was a syntactic name]\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /cast caller-scope\n    scope caller-unique-ns caller-def-ns caller-qualify\n    err.\\;qq[Internal error]\n  /cast\n    (procure-constructor-glossary-getdef caller-def-ns constructor)\n    getdef get-glossary -\n    err.\\;qq[Internal error]\n  /cast (validate-constructor-glossary/c get-glossary mode)\n    constructor-glossary main-tag source-to-rep\n    err.\\;qq[Internal error]\n  /c mac str.case /cons subject\n  /cons\n    (stx-from-details-and-layer\n      (stx-details-join my-stx-details constructor-stx-details)\n    /foreign/obtain-by-qualified-name constructor)\n  /append\n    (map source-to-rep /fn assoc\n      (cast assoc assoc source rep\n        err.\\;qq[Internal error]\n      /c s /foreign/obtain-by-qualified-name/procure-name mode\n      /ns-get rep /ns-get str.vars caller-unique-ns))\n  /list\n    (c mac str.yep /list/c mac str.nil /list)\n    (c mac str.nope /list/c mac str.nil /list)))\n\n\\= Macro calls appearing inside an `(after-cwa ...)` form will be able\n\\= to depend on anything that uses `procure-contributed-elements`\n\\= during macroexpansion, and they won't be able to do fulfill a\n\\= `procure-contributed-element-getdef` definer at all. The \"cwa\"\n\\= stands for \"closed world assumption.\"\n\\=\n\\= TODO: Use this. Once we're using it, we'll probably have other\n\\= assorted tools for doing closed world assumption extensibility at\n\\= macroexpansion time, so we might want to move them all to their own\n\\= section.\n\\=\n(def-macro after-cwa home-scope caller-scope my-stx-details args then\n  (cast caller-scope scope caller-unique-ns - -b\n    err.\\;qq[Internal error]\n  /cast args cons body args\n    err.\\;qq[Called after-cwa with too few arguments]\n  /cast args nil\n    err.\\;qq[Called after-cwa with too many arguments]\n  /contributing-only-to nsset-ns-descendants.caller-unique-ns\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n    body))\n\n(defn double-foldl state list-a list-b combiner\n  (proj1 nope\n  /double-any-foldl state list-a list-b /fn state elem-a elem-b\n    (nope/c combiner state elem-a elem-b)))\n\n(defn mappend list func\n  (rev/foldl (nil) list /fn state elem\n    (rev-append (c func elem) state)))\n\n(defn keep list check\n  (mappend list /fn elem\n    (case (c check elem) yep -\n      list.elem\n      (nil))))\n\n(defn any list check\n  (any-foldl (nil) list /fn state elem\n    (caselet check-result (c check elem)\n      yep result check-result\n      nope result (nope/nil)\n      err.\\;qq[Expected a check-result that was a yep or a nope])))\n\n(defn double-any list-a list-b check\n  (double-any-foldl (nil) list-a list-b /fn state elem-a elem-b\n    (caselet check-result (c check elem-a elem-b)\n      yep result check-result\n      nope result (nope/nil)\n      err.\\;qq[Expected a check-result that was a yep or a nope])))\n\n(defn foldl-later state list combiner-later then\n  (cast list cons first rest\n    (c-later then state)\n  /c combiner-later state first /fn state\n  /foldl-later state rest combiner-later then))\n\n(defn map-later list func-later then\n  (foldl-later (nil) list\n    (fn state elem then\n      (c func-later elem /fn elem\n      /c then /cons elem state))\n  /fn rev-elems\n  /c then rev.rev-elems))\n\n(defn not yep-nope\n  (case yep-nope\n    yep val nope.val\n    nope val yep.val\n    err.\\;qq[Expected a yep-nope that was a yep or a nope]))\n\n(defn or a b\n  (case a yep - a\n  /case b yep - b\n  /nope/nil))\n\n(defn and-lazy a get-b\n  (case a nope - a\n  /let b (c get-b /nil)\n  /case b nope - b\n  /yep/nil))\n\n(defn and a b\n  (and-lazy a /fn - b))\n\n(defn xor a b\n  (case a yep -\n    (case b yep - (nope/nil) a)\n    (case b yep - b (nope/nil))))\n\n(defn yep-nope-swap a b\n  (case a yep - b not.b))\n\n(defn all list check\n  (not/any list /fn elem /not/c check elem))\n\n(def-struct rev-cut-result rev-past rest)\n\n(defn maybe-rev-cut list-to-measure-by list-to-cut\n  (case\n    (any-foldl (rev-cut-result (nil) list-to-cut) list-to-measure-by\n    /fn state ignored-elem\n      (cast state rev-cut-result rev-past rest\n        err.\\;qq[Internal error]\n      /cast rest cons first rest (yep/nil)\n      /nope/rev-cut-result (cons first rev-past) rest))\n    yep - (nil)\n    nope rev-cut-result yep.rev-cut-result\n    err.\\;qq[Internal error]))\n\n(defn rev-cut list-to-measure-by list-to-cut\n  (cast (maybe-rev-cut list-to-measure-by list-to-cut) yep result\n    err.\\;qq[\n      Expected a list-to-measure-by no longer than the list-to-cut]\n    result))\n\n(def-struct cut-result past rest)\n\n(defn maybe-cut list-to-measure-by list-to-cut\n  (cast (maybe-rev-cut list-to-measure-by list-to-cut)\n    yep rev-cut-result\n    (nil)\n  /cast rev-cut-result rev-cut-result rev-past rest\n    err.\\;qq[Internal error]\n  /yep/cut-result rev.rev-past rest))\n\n(defn cdr list\n  (cast list cons first rest\n    err.\\;qq[Expected a list that was a cons]\n    rest))\n\n(defn tails lists\n  (case (all lists /fn list /isa cons list) yep -\n    (tails/map lists /cdr)\n    lists))\n\n\\= NOTE: This utility isn't so much for modularity as it is a\n\\= convenient way to load another file in the project's input\n\\= directory as though its contents appeared inside the current file.\n\\=\n(def-macro import home-scope caller-scope my-stx-details args then\n  (basic-nil-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac\n  /get-mode/fn mode\n  /let path\n    (foldl cli-input-directory.mode args /fn dirname basename\n      (cast isa-stx.basename yep -\n        err.\\;qq[Called import with non-syntax]\n      /cast s-expr-layer-from-stx.basename istring-nil basename\n        err.\\;qq[\n          Called import with something other than a string literal]\n      /input-path-get dirname basename))\n  /cast\n    (foldr (read-all-force/input-path-blob-utf-8 mode path)\n      (folding caller-scope /no-effects/nil)\n    /fn expr state\n      (cast state folding scope launch-rest\n        err.\\;qq[Internal error]\n      /folding (scope-get str.rest scope)\n      /join-effects launch-rest\n      /compile-expression-later (scope-get str.first scope) expr /fn -\n      /no-effects/nil))\n    folding scope launch-rest\n    err.\\;qq[Internal error]\n    \n    launch-rest))\n\n\n\\= ===== Comparison utilities ========================================\n\n\\= Compares two names. For inequal names, the result will be in a\n\\= format user-level code does not know how to deconstruct. For equal\n\\= names, the result will be (nil).\n(defn name-metacompare a b\n  (case (call-dex (dex-name/nil) a b)\n    yep result result\n    err.\\;qq[Called name-metacompare with non-name values]))\n\n\\= Compares two strings. For inequal strings, the result will be in a\n\\= format user-level code does not know how to deconstruct. For equal\n\\= strings, the result will be (nil).\n(defn string-metacompare a b\n  (case (call-dex (dex-string/nil) a b)\n    yep result result\n    err.\\;qq[Called string-metacompare with non-string values]))\n", '\\= hello-world-js.cene\n\\= Copyright 2016, 2021 Ross Angle. Released under the MIT License.\n\n\\= You can execute this file like so at the command line:\n\\=\n\\=   $ cene demos/hello-world-js.cene --out dist/demos/hello-world-js\n\\=\n\\= This Cene program creates its output path as a directory, creates\n\\= the file hello-world.js under that directory, and writes to that\n\\= file so it contains JavaScript code that logs "Hello, world!".\n\\=\n\\= That example command line specifies the output directory as\n\\= dist/demos/hello-world-js, so the file will be located at\n\\= dist/demos/hello-world-js/hello-world.js.\n\n\n(def-macro go home-scope caller-scope my-stx-details args then\n  (cast home-scope scope - home-def-ns home-qualify\n    err.\\;qq[Internal error]\n  /basic-nil-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac\n  /get-mode/fn mode\n  /let cexpr\n    (cast\n      (procure-constructor-glossary-getdef home-def-ns\n      /c home-qualify\n      /name-of/dexable\n        (dex-struct constructor-occurrence /dex-string/nil)\n      /constructor-occurrence str.js-main)\n      getdef get def\n      err.\\;qq[Internal error]\n    /cast (c get mode)\n      constructor-glossary main-tag proj-source-to-rep\n      err.\\;qq[Internal error]\n    /cexpr-construct main-tag /list)\n  /let outdir (cli-output-directory mode)\n  /join-effects\n    (output-path-blob-utf-8\n      (output-path-get outdir str.\\;qq[hello-world-sloppy.js])\n    /sloppy-javascript-program mode cexpr /list)\n  /join-effects\n    (output-path-blob-utf-8\n      (output-path-get outdir str.\\;qq[hello-world-picky.js])\n    /picky-javascript-program mode cexpr /list)\n  /no-effects/nil))\n\n(go)\n\n(defn compile-give-unwrapped-js-effects param js-val body\n  (then-js-effects\n    (compile-function-js-effects (cons param /nil) body)\n  /fn body\n  /give-unwrapped-js-effects js-val body))\n\n(defn js-main client\n  (then-js-effects js.\\;qq[console.log("Hello, `js`!");] /fn -\n  /compile-give-unwrapped-js-effects str.client client str.\\;qq/\n  \n  console.log( "Hello, `compile-give-unwrapped-js-effects`!" );\n  \n  return client.done( client.wrap( null ) );\n  \n  ))\n' ],

jsnMap()
,
jsnMap()
,
jsnMap()
,

[],

function ( rt ) {
return (function () {    return macLookupRet( new SinkStruct( '[["n:main",["n:$$qualified-name",["n:struct","[[\\"n:main-core\\",\\"constructor-occurrence\\"],[[\\"n:proj-core\\",[\\"n:$$qualified-name\\",[\\"n:struct\\",\\"[[\\\\\\"n:main-core-projection-occurrence\\\\\\"],[[\\\\\\"n:proj-core-projection-occurrence-main-tag-name\\\\\\"],[\\\\\\"n:proj-core-projection-occurrence-string\\\\\\"]]]\\",[\\"n:name\\",[\\"n:main-core\\",\\"constructor-occurrence\\"]],\\"string\\"]],[\\"n:main-core\\",\\"constructor-occurrence\\"]]]]","js-main"]],["n:get","constructor",1,["n:get",["n:$$claimed-for",["claim:primitive","defn"]],1,["n:get","uniique",1,["n:get","first",1,["n:get","rest",65,["n:get","unique-ns",1,["n:root"]]]]]]]],[]]', [  ] ) );
})();
}
);


})( {

} );
