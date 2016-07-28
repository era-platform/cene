= LVars in Cene

(TODO: Implement this design.)

Cene's LVars are inspired by the ones in Lindsey Kuper's dissertation "Lattice-based data structures for deterministic parallel and distributed computing" (available [from here](http://www.cs.indiana.edu/~lkuper/)), but they're a little different. Cene doesn't necessarily provide ways to implement every possible LVar, and yet the laws that Cene's LVars follow are also more permissive. (TODO: See if we should call them something else.)

In Cene, an LVar has a space of possible write values, and these form a bounded semilattice, but the program doesn't observe the combined values directly. Instead, the combined values determine what additional computations are run in later ticks. The join of two write values corresponds (homomorphically) to the union of two "sets" of computations spawned, and the unit of the write lattice corresponds to spawning zero computations. (TODO: Maybe the minimum could be nonzero sometimes, but is there a use for that? If we wanted the LVar to spawn some computations all the time, we could just spawn those as part of the process of obtaining the LVar.)

It's possible for LVar join to cause an error, but usually if (a + (b + c)) is an error by design (rather than by resource exhaustion), then ((a + b) + c) should be an error by design as well. Join errors when writing to an LVar must invalidate the externally visible effects of the entire period of time that the LVar is writable and invalidate all the externally visible effects it spawns.

Here's an example of an LVar lattice:

Values given when obtaining the LVar:
* A strict equality predicate for some equivalence class of values.
* Something that allows effects to be scheduled in a single specific later tick.

Write operations:
* Decide on a value.
* Add an opaque, effectful function that will be called with the decided-upon value in a particular later tick using the given scheduler. (By opaque, I mean a function that can't be destructured unless the interpreter does it.)
* (Combinations thereof. If two values are decided on that don't match according to the given equality predicate, an error occurs.)

As demonstrated with this example, Cene's LVars don't have threshold reads as a concept of their own, but instead treat them as being another kind of write. In the section on LVish, Kuper's dissertation extends LVars with support for asynchronous event handlers, and this should be straightforward to recreate in Cene. (The extensions of freezing and quiescence detection are probably not tenable in Cene. TODO: See what Cene can do to achieve the same purposes.)


== An LVar that drives the computation

The clock of a Cene live service might as well be an LVar it's watching. Since it's an LVar with no possible way to encounter a write error, the ticks it produces can interleave with user interaction (without any impossible requirement to undo the user interaction if there's an error).

In this model, timers could be set by writing callbacks to the clock LVar.


== Exotic time and computation

Potentially, certain LVars may offer timestamps, expiration bounds, and so on that follow an exotic notion of time. A single expression may operate in the intersection of multiple "time" axes. A good example is the timeline of infinitesimals in Magic: The Gathering's continuous effect layer system, where not only are the continuous effects consulted at each point in time during the events of the game, but to consult those effects, each one of the effects applies at a particular point in the process of applying the layers in order.

LVars aren't necessarily limited to spawning computations that run with eager evaluation. They may spawn reactive computations that run continuously for some duration. They may spawn computations that take values that are not yet completely determined; destructuring one may cause the computation to block until more details are available. Perhaps they'll even be able to spawn computations that act as assistants of the interpreter of another spawned computation. These features will be challenging to implement, so they might not be implemented any time soon, but Cene should be able to develop into them as it matures.
