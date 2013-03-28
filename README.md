Era
===

Are you tired of checking out of dependency hell time and time again?
Do you keep trying to run on platforms that fail to provide adequate
support for your grand features? Do your off-the-shelf solutions
surprise you with gaping holes, and can you never patch them over with
enough monkeys?

Currently in early stages of construction, the Era module system is
designed to last. If you want to lead your program into perfection
once and know it'll never disappoint you again, Era is meant for you.
Likewise if you want to do ongoing development without trampling over
others' simultaneous efforts.

Developing for Era isn't a sure indicator that we'll avoid building
cumbersome and divisive frameworks. We can always make our own messes.
The difference is that Era will often make it possible (with diligence
and sometimes deep insight) to stay out of many kinds of messes other
platforms bake in.

By the time Era is ready to use, it'll actually have two very
different parts: The module system, which will have the hard
theoretical properties that make this claim possible, and an
unexceptional surface syntax that will favor (naive!) reduction of
boilerplate.

The module system
-----------------

The Era module system is based on modeling a programming project as
three parts:

* The black-box library modules it needs. This collection is a set;
  neither ordering nor duplication matters, and the elements aren't
  even filed under unique keys.
* The platform the program runs on.
* The project-specific entrypoint behavior. While this is mostly for
  freshly written code, it's also for non-black-box dependencies such
  as copied-and-pasted code snippets.

### Black-box library modules

The focal point of the Era module system is its black-box library
support. There should never be a way to make a module that
interferes--intentionally or otherwise--with the functionality
provided by another module. This means there's no reason to uninstall
a module except to save space.

If a library module is installed but it depends on functionality that
isn't available, its own functionality will not be enabled.

### Platforms and entrypoints

Era is made for more than one kind of platform. Different Era
platforms can have innate, irreconcilable differences, such as their
support for parallelism, distributed programming, software
verification, etc. Each of these platforms has a particular kind of
application entrypoint it accepts.

Platform-specific functionality is made available to Era modules as
though it were provided by another module of unknown implementation.
Because of this, any Era library module can be installed on any Era
platform.

I like to think Era will support every platform we need in
practice. However, some extremely resource-constrained platforms may
not have the ability to store and query a set of Era modules at run
time.

Here I list the specific platforms I'll focus on.

### Platform: JavaScript-based imperative computation

On this platform, an application is something that you can access with
a Web browser or Node.js to run a computation. The computation can
have whatever imperative side effects are available to JavaScript, and
in particular I'll use this platform to generate JavaScript code and
to package up Era modules.

This is the first platform I aim to support, and perhaps even the only
one for a while. It has the potential to act as a bootstrap for itself
and other Era platform implementations. Thanks to Web browsers'
ubiquity, it'll be possible to run this bootstrap on a wide variety of
devices from the get-go.

### Platform: Total functional programming

Pure and total functions (i.e. functions with no side effects, not
even termination) are a popular ingredient in languages that are
designed to support theorem proving and software verification, such as
Coq and Agda.

Proofs are potentially an important aspect of the Era module system,
because supporting proofs means the module system doesn't have to be
stiflingly selective about the features it exposes to programmers.
Even if a modularity feature would threaten the invariants of the
module system, it's fine as long as everyone who uses the feature
provides a proof that they're using it safely.

The core functionality of the Era module system uses a total
functional programming style, so as to maximize its potential to
support software verification and advanced module system features.
That being said, for now Era's proof-theoretical strength is extremely
weak, maybe even too weak for some of the basic modularity features I
care about, so I'm not bothering to seek a proof of consistency yet.

### Platform: Reactive Demand Programming (RDP)

I believe in David Barbour's vision of a future where collaborative
live programming, distributed computation, and service mashups are
simple, intuitive, and performant thanks to a combination of
continuous reactive semantics and object-capability discipline. For
more about RDP, see <https://github.com/dmbarbour/Sirea>.

I haven't sketched out the details of how Era's module system would
incoporate and be incorporated into RDP. Still, the prospect of live
programming has encouraged me to keep the module-system-related
computations stable (changing infrequently during coding) and of low
computational complexity, so that they don't pile up on themselves as
a programmer works.

(If the only module communication feature this platform supports is
the ability to export and import definitions under particular names,
then I think dependency resolution will take negligibly more than
linear time and space (in terms of the size of the application
entrypoint and all installed library modules), and the bottleneck will
be storing the modules in the first place. On the other hand, checking
validity of a module will take unknown, perhaps unbounded time and
space complexity. I think any bound on this will imply a hard limit on
the proof-theoretical power of typechecking, at least on this
platform, and I'm not ready to design that limit yet.)

The surface syntax
------------------

For development of Era modules, I'm pursuing a lisp-2 surface syntax
with a hygienic macroexpansion phase that runs on the JavaScript
platform. It's a syntax that's meant to be easy for me to experiment
with and easy to write a formal specification of.

About this project
------------------

I'm releasing Era under the MIT license; see LICENSE.txt.
