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
                var exprCode = toExpr( staticExpr );
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
JsCode.prototype.toFunctionExpr = function ( paramVarsArr ) {
    if ( !isArray( paramVarsArr ) )
        throw new Error();
    this.minusFreeVars( paramVarsArr ).assertNoFreeVars();
    
    var disallowedGensyms = strMap().plusArrTruth( paramVarsArr );
    var reifiedVars = [];
    var expr = this.toExpr_( disallowedGensyms, reifiedVars, [] );
    if ( reifiedVars.length !== 0 )
        throw new Error();
    
    return "Function( " + arrMap( paramVarsArr.concat( [
        "return " + expr + ";"
    ] ), function ( str ) {
        return jsStr( str );
    } ).join( ", " ) + " )";
};
JsCode.prototype.toInstantiateExpr = function ( envObj ) {
    var vars = [];
    var vals = [];
    objOwnEach( envObj, function ( va, val ) {
        vars.push( va );
        vals.push( val );
    } );
    return this.toFunctionExpr( vars ) + "( " +
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
