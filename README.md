# Cene

[![Travis build](https://travis-ci.org/rocketnia/era-cene.svg?branch=master)](https://travis-ci.org/rocketnia/era-cene)

[Run some Cene code in your browser, logging to the console.](https://rocketnia.github.io/era-cene/demos/cene.html)

[Run some reader unit tests in your browser, logging to the console.](https://rocketnia.github.io/era-cene/demos/unit-tests.html)

[Run the reader in your browser. This page is interactive!](https://rocketnia.github.io/era-cene/demos/reader.html)

Programming is an activity of last resort; as soon as we're programming, we're not directly in the field, in the moment, acting and responding as our needs arise. Yet we find ourselves in a new kind of field, a new kind of moment, where it starts to look valuable to solve the problem that is now at hand -- programming itself. Thus we eventually build things that are sophisticated enough to be programming languages of their own, but sadly they're incompatible with all the languages that came before. Cene fixes that. Cene is a programming language that's designed so that if you find yourself implementing a programming language, you can make a slight detour and implement Cene all over again instead.

Cene offers simple approaches to several problems that programming languages often fail to solve.

Cene's **collapsed brackets** are a simple syntactic feature that allows deep conditionals and continuation-passing code to be written as linear code blocks:

```
(if condition-1
  alternative-1
  (if condition-2
    alternative-2
    alternative-3))

(if condition-1
  alternative-1
/if condition-2
  alternative-2
  alternative-3)

(do-thing-1
  (fn result-1
    (do-thing-2 result-1
      (fn result-2
        (do-thing-3 result-1 result-2)))))

(do-thing-1 /fn result-1
/do-thing-2 result-1 /fn result-2
/do-thing-3 result-1 result-2)
```

Since Cene makes continuation-passing style so much more palatable, Cene's **side effects** are monadic, with asynchronous callbacks if they're observable to the outside world. If they're not observable to the outside world, they use a world-passing style instead. Cene calls worlds "modes" to call to mind modal logic. (**TODO**: That's probably an incorrect usage. Just use the name "world" instead.)

```
\= Copies one tree of UTF-8 files to another file tree recursively.
(defn copy-paths mode in out
  \= We read and branch on the type of the input file.
  (case (input-path-type mode in)
    
    \= If it's a directory, we loop over the directory listing.
    file-type-directory
    (foldr (input-path-directory-list mode in) (no-effects/nil)
    /fn item then
      \= We invoke a copy recursively, and in the meantime we proceed
      \= with other effects in the loop.
      (join-effects
        (c-new copy-paths mode
          (input-path-get in item)
          (output-path-get out item))
        then))
    
    \= If it's a blob, we read the blob as UTF-8 text and write it to
    \= the output path.
    file-type-blob
    (output-path-blob-utf-8 out /input-path-blob-utf-8 mode in)
    
  \= If we don't recognize the type of file, we just do nothing with
  \= it.
  /no-effects/nil))
```

Cene's **homoiconic syntax** and **macro support** mean the built-in operators of the language don't look particularly better than the user-defined ones. This means you can focus on the operations you actually use rather than the ones the language anticipated that you'd use.

Cene supports sophisticated **quasiquotation for strings**. Cene code be moved into and out of Cene string literals without having to escape special characters, because the Cene string literal syntax is `\;qq[...]`, and the same syntax doubles as an escape sequence dedicated to the purpose of generating Cene code strings. Together with string interpolations, **quasiquotation variables**, and collapsed brackets, we can write in a code-generating continuation-passing style if we ever really need to for some reason:

```
(do-thing-1 /fn result-1
  \;qq[
    (do-thing-2 \;uq;ls`result-1` /fn result-2
      \;qq[(do-thing-3 \;uq;uq;ls`result-1` \;uq;ls`result-2`)])])

(do-thing-1 /fn result-1 \;(wq r1);qq/
\/do-thing-2 \;(rq r1);ls`result-1` /fn result-2 \;(wq r2);qq/
\/do-thing-3 \;(rq r1);ls`result-1` \;(rq r2);ls`result-2`)
```

Cene's quasiquotation for s-expressions will be just as full-featured.

Cene's first-class values all have the same capabilities: A value can be invoked as a function, and it can expose its contained values if the client can guess its name. Conceptually, even Cene's anonymous functions have names, but the names are just impossible to obtain (and therefore impossible to guess).

Cene has **namespace** support, which lets you make certain names impossible to obtain in certain files. Using this, you can enforce full encapsulation of your own data structures. Even the core data structures should be impossible to distinguish from ones that have been encapsulated this way, so Cene's design is consistent with a **reflective tower** of language implementations all running as part of the same program. This in turn means that if you find yourself implementing a new programming language for any reason, if it's anything like Cene, you will likely be able to continue development without sudden changes to your development flow. This support for **smooth language development** is the main driver behind Cene's design.

Even Cene's **command-line tool** is designed to invoke Cene code that implements a compiler (or more generally a build system). The Cene code is given a source directory, an output directory, and command line arguments. The Cene-to-JavaScript compiler is provided not as a command-line tool of its own, but as one of the built-in functions that helps this Cene code write content to its output directory.

## Effects and error handling in Cene

Cene side effects were demonstrated above already, but here's the nitty-gritty:

Cene code is rather pure. Any Cene expression is referentially transparent and deterministic unless it stops prematurely due to resource exhaustion. Cene computations support general recursion and can therefore diverge, but divergence is treated as resource exhaustion.

When Cene needs to model side effects, it uses monads and world-passing techniques. These techniques are in full force when writing Cene macros, which have the power to read and write definitions and files as they go along. Cene code that interacts with JavaScript just uses a monad with the power to execute JavaScript code.

Currently, Cene code can terminate with an error at any time. This is considered a way to cause resource exhaustion on purpose; it's just a nicer alternative to an explicit infinite loop. Other basic operators in Cene use this mechanism for their dynamic errors.

Cene's approach to errors may be more flexible in the future. There's a plan for Cene code to be able to interact with its interpreter when it's having trouble, but we'll need to implement an interpreter that cares about these interactions before this will actually be useful. Once we have these, applications which make frequent use of custom interpreters and quoted/reified code will end up working a lot like dynamic scope, which will give the error handling system a flavor much like Common Lisp's condition/restart system.

## Concessions

As [the overall Era project](https://github.com/rocketnia/era) goes along, textual syntaxes like Cene's will eventually be regarded as a relic, replaced by monotonic code databases and hypertext syntaxes. Cene makes particular concessions for modern-day tools, namely text editors, command lines, and JavaScript runtimes.

## Installation and usage

Install Node.js. Recent versions of Node.js come with npm.

Depending on your needs, you may want to install Cene locally or globally:

```
npm install cene
npm install --global cene
```

A global installation lets you easily invoke cene at the command line:

```
cene my-build.cene --in my-src-dir/ --out my-output-dir/ arg1 arg2
```

For a complete example project written in Cene, check out [Cene Scaffold](https://github.com/rocketnia/cene-scaffold) and follow the installation instructions in its readme.

Cene also supports being loaded as a Node.js library. It has only two exports:

```
var cene = require( "cene" );
cene.runCeneSync( cene.preludeFiles.concat( [ "my-build.cene" ] ), {
    args: [ "arg1", "arg2" ],
    in: "my-src-dir/",
    out: "my-output-dir/"
} );
```

If you use this technique to run Cene, it's a little bit more flexible than the command-line tool. You can supply more than one filename of your own to be executed in sequence, and you can choose not to include the prelude files, which the Cene command-line tool always includes.

## Branding

Cene is named for _-cene_, a suffix that refers to eras, since Cene is part of [the Era project](https://github.com/rocketnia/era). The resemblance to "Scheme" and the potential for wordplay with "seen," "scene," "sing," "sink," "obscene," and "zine" are just side benefits. Yes, I just spoiled all those puns for you. Go on and use the puns anyway, now fully equipped with the awareness of how stale they're going to get. A stale pun is still a good pun in the right context.

The brand image I imagine for Cene will have layers: In the meta layer, cartoon characters weild a mallet and a marker over a holographic void of pinks, yellows, and greens. In the marker-drawn layer, deep dark gray and pure white are punctuated by stamp symbols, gears, and dotted lines in luminescent red. When the gears hatch, cartoon vines grow out of them in a calm, neutral green. These cartoon vines are the brand image I have in mind for the Era project's eventual OS/IDE/visual programming language, so they should appear only for Cene projects that implement modular, reactive, or UI functionality as building blocks for Era.

Within Cene's implementation code, Cene is still largely going by the abbreviation "stc," which stands for Staccato. I named Staccato for a particular lambda-lifting desugaring phase that made all remaining functions take constant time. Programming in raw Staccato was tiresome, and eventually the shortcuts and optimizations I was using bypassed the desugaring phase altogether, so I renamed the project. (**TODO**: Finish renaming.)

## About this project

Cene is released under the MIT license. See LICENSE.txt.
