"use strict";
var eraPlatform = eraPlatform || {};
eraPlatform.ceneFiles = eraPlatform.ceneFiles || {};
eraPlatform.ceneFiles[ "prelude-util.cene" ] =
"\\= prelude-util.cene\n\\= Copyright 2015-2017 Ross Angle. Released under the MIT License.\n\n\n\\= ===== Lists, boolean tags, and macro utilities ====================\n\n(def-struct pair first second)\n\n\\= TODO: Find a better name for this.\n(def-struct folding state val)\n\n(defn map-any-foldl state list combiner\n  (cast list cons first rest (folding state list)\n  /caselet combiner-result (c combiner state first)\n    \n    yep result combiner-result\n    \n    folding state first\n    (caselet recur-result (map-any-foldl state rest combiner)\n      yep result recur-result\n      folding state rest (folding state /cons first rest)\n      err.\\;qq[Internal error])\n    \n    err.\\;qq[\n      Expected a combiner-result of that was a yep or a folding]))\n\n(defn map-any list check\n  (caselet fold-result\n    (map-any-foldl (nil) list /fn - elem\n      (caselet check-result (c check elem)\n        yep - check-result\n        nope val (folding (nil) val)\n        err.\\;qq[Expected a check-result that was a yep or a nope]))\n    yep - fold-result\n    folding - val nope.val\n    err.\\;qq[Internal error]))\n\n(defn any-foldl state list combiner\n  (cast list cons first rest nope.state\n  /caselet combiner-result (c combiner state first)\n    yep result combiner-result\n    nope result (any-foldl result rest combiner)\n    err.\\;qq[Expected a combiner-result that was a yep or a nope]))\n\n(defn foldl state list combiner\n  (cast list cons first rest state\n  /foldl (c combiner state first) rest combiner))\n\n(defn dex-give-up -\n  (dex-by-cline/cline-give-up/nil))\n\n(defn dex-default a b\n  (dex-by-cline/cline-default cline-by-dex.a cline-by-dex.b))\n\n(defn dex-int -\n  (dex-by-cline/cline-int/nil))\n\n(defn in-dex dex x\n  (in-cline cline-by-dex.dex x))\n\n(defn call-dex dex a b\n  (call-cline cline-by-dex.dex a b))\n\n(defn table-get-singleton table\n  (cast\n    (table-map-fuse table (fuse-by-merge/merge-by-dex/dex-name/nil)\n    /fn key key)\n    yep key\n    (nil)\n  /table-get key table))\n\n(defn ns-get key ns\n  (cast\n    (table-get-singleton/procure-sub-ns-table\n      (table-shadow\n        (name-of/dexable (dex-default (dex-string/nil) (dex-name/nil))\n          key)\n        (yep/nil)\n      /table-empty/nil)\n      ns)\n    yep result\n    err.\\;qq[Internal error]\n    result))\n\n(defn ns-path ns path\n  (foldl ns path /fn ns component\n    (ns-get component ns)))\n\n(defn double-any-foldl state list-a list-b combiner\n  (cast list-a cons first-a rest-a nope.state\n  /cast list-b cons first-b rest-b nope.state\n  /caselet combiner-result (c combiner state first-a first-b)\n    yep result combiner-result\n    nope result (double-any-foldl result list-a list-b combiner)\n    err.\\;qq[Expected a combiner-result that was a yep or a nope]))\n\n(defn rev-append rev-past rest\n  (foldl rest rev-past /fn state elem /cons elem state))\n\n(defn rev source\n  (rev-append source /nil))\n\n(defn foldr list state combiner\n  (foldl state rev.list /fn state elem /c combiner elem state))\n\n(defn join-effects a b\n  (cast (call-fuse (fuse-effects/nil) a b) yep result\n    err.\\;qq[Expected both parts to be monadic computations]\n    result))\n\n(defn stx-to-obtain-method scope stx string-to-unq\n  (cast scope scope - -b qualify\n    err.\\;qq[Expected a scope value that was a scope]\n  /cast stx stx - sexpr\n    err.\\;qq[Expected a stx value that was a stx]\n  /case sexpr\n    \n    foreign val\n    (yep/case val\n      \n      obtain-by-unqualified-name name\n      (obtain-by-qualified-name/c qualify name)\n      \n      obtain-by-qualified-name name val\n      \n      val)\n    \n    istring-nil string\n    (yep/obtain-by-qualified-name\n    /c qualify /c string-to-unq string)\n    \n  /nil))\n\n(defn stx-to-maybe-name scope stx string-to-unq\n  (cast (stx-to-obtain-method scope stx string-to-unq)\n    yep obtain-method (nil)\n  /cast obtain-method obtain-by-qualified-name name (nil)\n    yep.name))\n\n(defn stx-to-name scope stx string-to-unq\n  (cast (stx-to-maybe-name scope stx string-to-unq) yep name\n    err.\\;qq[Expected a syntactic name]\n    name))\n\n(defn compile-expression-later scope expression then\n  (cast scope scope unique-ns def-ns qualify\n    err.\\;qq[Expected a scope that was a scope]\n  /cast expression stx expression-stx-details macro-call\n    err.\\;qq[Expected an expression that was a stx]\n  /let then\n    (fn result /c then /cexpr-located expression-stx-details result)\n  /later/get-mode/fn mode\n  /case\n    (cast\n      (stx-to-obtain-method scope expression /fn string\n        (name-of/dexable\n          (dex-by-cline/cline-struct local-occurrence\n          /cline-by-dex/dex-string/nil)\n        /local-occurrence string))\n      yep obtain-method (nil)\n    /case obtain-method\n      obtain-directly cexpr yep.cexpr\n      obtain-by-qualified-name name (yep/cexpr-var name)\n    /nil)\n    yep cexpr\n    (c then cexpr)\n  /cast macro-call cons macro-name macro-body\n    err.\\;qq[Expected an expression that was a macro call]\n  /cast macro-name stx macro-name-stx-details -\n    err.\\;qq[Expected a macro name that was a stx]\n  /let macro-impl\n    (let obtain-method-err\n      (fn -\n        err.\\;qq[\n          Expected a macro call with a macro name that was a literal\n          string, a foreign obtain-by-unqualified-name, a foreign\n          obtain-by-qualified-name, or a foreign obtain-directly])\n    /cast\n      (stx-to-obtain-method scope macro-name /fn string\n        (name-of/dexable\n          (dex-by-cline/cline-struct macro-occurrence\n          /cline-by-dex/dex-string/nil)\n        /macro-occurrence string))\n      yep obtain-method (c obtain-method-err /nil)\n    /case obtain-method\n      \n      obtain-directly macro-function macro-function\n      \n      obtain-by-qualified-name name\n      (cast (procure-macro-implementation-getdef def-ns name)\n        getdef macro-get macro-definer\n        err.\\;qq[Internal error]\n      /c macro-get mode)\n      \n    /c obtain-method-err /nil)\n  /c macro-impl scope\n    (stx-details-macro-call\n      expression-stx-details macro-name-stx-details)\n    macro-body\n    then))\n\n(defn scope-get string scope\n  (cast scope scope unique-ns def-ns qualify\n    err.\\;qq[Expected a scope that was a scope]\n  /scope (ns-get string unique-ns) def-ns qualify))\n\n(defn scope-claim scope\n  (cast scope scope unique-ns def-ns qualify\n    err.\\;qq[Expected a scope that was a scope]\n  /procure-claim unique-ns))\n\n(defn c-later func arg\n  \\= NOTE: We don't just do `(later/c func arg)`, because we want the\n  \\= actual execution of `(c func arg)` to happen in a later tick.\n  (later/get-mode/fn - /c func arg))\n\n(defn basic-macro home-scope caller-scope my-stx-details then body\n  (cast home-scope scope home-unique-ns home-def-ns home-qualify\n    err.\\;qq[Expected a home-scope that was a scope]\n  /join-effects scope-claim.caller-scope\n  /later/get-mode/fn mode\n  /let s (fn it /stx my-stx-details it)\n  /let mac\n    (fn mode str rest\n      (cast\n        (procure-macro-implementation-getdef home-def-ns\n        /c home-qualify\n        /name-of/dexable\n          (dex-by-cline/cline-struct macro-occurrence\n          /cline-by-dex/dex-string/nil)\n        /macro-occurrence str)\n        getdef macro-get macro-definer\n        err.\\;qq[Internal error]\n      /c s /cons (c s /foreign/obtain-directly/c macro-get mode)\n        rest))\n  /c body (scope-get str.body caller-scope) s mac /fn expression\n  /compile-expression-later (scope-get str.compilation caller-scope)\n    expression then))\n\n(defn basic-pure-macro\n  home-scope caller-scope my-stx-details then body\n  \n  (basic-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac then\n  /get-mode/fn mode\n  /c then /c body mode caller-scope s /c mac mode))\n\n(defn basic-nil-macro\n  home-scope caller-scope my-stx-details then body\n  \n  (basic-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac then\n  /join-effects (c body caller-scope s mac)\n  /later/get-mode/fn mode /let mac (c mac mode)\n  /c then /c mac str.nil /nil))\n\n(def-macro list home-scope caller-scope my-stx-details args then\n  (basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /foldr args (c mac str.nil /nil) /fn first rest\n    (c mac str.cons /cons first /cons rest /nil)))\n\n(def-macro proj1 home-scope caller-scope my-stx-details args then\n  (cast args cons constructor args\n    err.\\;qq[Called proj1 with too few args]\n  /cast args cons subject args\n    err.\\;qq[Called proj1 with too few args]\n  /cast args nil\n    err.\\;qq[Called proj1 with too many args]\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /cast caller-scope\n    scope caller-unique-ns caller-def-ns caller-qualify\n    err.\\;qq[Internal error]\n  /let var\n    (c s /foreign/obtain-by-qualified-name\n    /procure-name mode /ns-get str.var caller-unique-ns)\n  /c mac str.cast /list subject constructor var\n    (c mac str.err /list/c s /istring-nil str.\\;qq[Internal error])\n    var))\n\n(def-macro dex-struct home-scope caller-scope my-stx-details args then\n  (cast args cons constructor proj-dexes\n    err.\\;qq[Called dex-struct with too few args]\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /c mac str.dex-by-cline /list\n  /c mac str.cline-struct /cons constructor\n  /map proj-dexes /fn proj-dex\n    (c mac str.cline-by-dex /list proj-dex)))\n\n(defn append past rest\n  (rev-append rev.past rest))\n\n(defn map list func\n  (rev/foldl (nil) list /fn state elem /cons (c func elem) state))\n\n(defn fix func arg\n  (c func fix.func arg))\n\n(defn validate-constructor-glossary glossary\n  (cast glossary constructor-glossary main-tag source-to-rep\n    err.\\;qq[\n      Encountered a constructor glossary that wasn't a\n      constructor-glossary]\n  /cast (in-dex (dex-name/nil) main-tag) yep -\n    err.\\;qq[\n      Encountered a constructor glossary whose main tag name wasn't a\n      name]\n  /let check-list\n    (fix/fn check-list sources-seen reps-seen list\n      (case list\n        \n        nil glossary\n        \n        cons first rest\n        (cast first assoc source rep\n          err.\\;qq[\n            Encountered a constructor glossary with a source-to-rep\n            entry that wasn't an assoc]\n        /cast (in-dex (dex-name/nil) source) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a source-level\n            projection name that wasn't a name]\n        /cast (in-dex (dex-name/nil) rep) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a\n            representation-level projection name that wasn't a name]\n        /case (table-get source sources-seen) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a duplicate\n            source-level projection name]\n        /case (table-get rep reps-seen) yep -\n          err.\\;qq[\n            Encountered a constructor glossary with a duplicate\n            representation-level projection name]\n        /c check-list\n          (table-shadow source (yep/nil) sources-seen)\n          (table-shadow rep (yep/nil) reps-seen)\n          rest)\n        \n        err.\\;qq[\n          Encountered a constructor glossary whose source-to-rep\n          mapping wasn't a proper list]))\n  /c check-list (table-empty/nil) (table-empty/nil) source-to-rep))\n\n(def-macro isa home-scope caller-scope my-stx-details args then\n  (cast args cons constructor args\n    err.\\;qq[Called isa with too few args]\n  /cast args cons subject args\n    err.\\;qq[Called isa with too few args]\n  /cast args nil\n    err.\\;qq[Called isa with too many args]\n  /cast constructor stx constructor-stx-details -\n    err.\\;qq[Expected a constructor that was a stx]\n  /cast\n    (stx-to-maybe-name caller-scope constructor /fn string\n      (name-of/dexable\n        (dex-struct constructor-occurrence /dex-string/nil)\n      /constructor-occurrence string))\n    yep constructor\n    err.\\;qq[Expected a constructor that was a syntactic name]\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n  /cast caller-scope\n    scope caller-unique-ns caller-def-ns caller-qualify\n    err.\\;qq[Internal error]\n  /cast\n    (procure-constructor-glossary-getdef caller-def-ns constructor)\n    getdef get-glossary -\n    err.\\;qq[Internal error]\n  /cast (validate-constructor-glossary/c get-glossary mode)\n    constructor-glossary main-tag source-to-rep\n    err.\\;qq[Internal error]\n  /c mac str.case /cons subject\n  /cons\n    (stx (stx-details-join my-stx-details constructor-stx-details)\n    /foreign/obtain-by-qualified-name constructor)\n  /append\n    (map source-to-rep /fn assoc\n      (cast assoc assoc source rep\n        err.\\;qq[Internal error]\n      /c s /foreign/obtain-by-qualified-name/procure-name mode\n      /ns-get rep /ns-get str.vars caller-unique-ns))\n  /list\n    (c mac str.yep /list/c mac str.nil /list)\n    (c mac str.nope /list/c mac str.nil /list)))\n\n\\= Macro calls appearing inside an `(after-cwa ...)` form will be able\n\\= to depend on anything that uses `procure-contributed-elements`\n\\= during macroexpansion, and they won't be able to do fulfill a\n\\= `procure-contributed-element-getdef` definer at all. The \"cwa\"\n\\= stands for \"closed world assumption.\"\n\\=\n\\= TODO: Use this. Once we're using it, we'll probably have other\n\\= assorted tools for doing closed world assumption extensibility at\n\\= macroexpansion time, so we might want to move them all to their own\n\\= section.\n\\=\n(def-macro after-cwa home-scope caller-scope my-stx-details args then\n  (cast caller-scope scope caller-unique-ns - -b\n    err.\\;qq[Internal error]\n  /cast args cons body args\n    err.\\;qq[Called after-cwa with too few arguments]\n  /cast args nil\n    err.\\;qq[Called after-cwa with too many arguments]\n  /contributing-only-to nsset-ns-descendants.caller-unique-ns\n  /basic-pure-macro home-scope caller-scope my-stx-details then\n  /fn mode caller-scope s mac\n    body))\n\n(defn double-foldl state list-a list-b combiner\n  (proj1 nope\n  /double-any-foldl state list-a list-b /fn state elem-a elem-b\n    (nope/c combiner state elem-a elem-b)))\n\n(defn mappend list func\n  (rev/foldl (nil) list /fn state elem\n    (rev-append (c func elem) state)))\n\n(defn keep list check\n  (mappend list /fn elem\n    (case (c check elem) yep -\n      list.elem\n      (nil))))\n\n(defn any list check\n  (any-foldl (nil) list /fn state elem\n    (caselet check-result (c check elem)\n      yep result check-result\n      nope result (nope/nil)\n      err.\\;qq[Expected a check-result that was a yep or a nope])))\n\n(defn double-any list-a list-b check\n  (double-any-foldl (nil) list-a list-b /fn state elem-a elem-b\n    (caselet check-result (c check elem-a elem-b)\n      yep result check-result\n      nope result (nope/nil)\n      err.\\;qq[Expected a check-result that was a yep or a nope])))\n\n(defn foldl-later state list combiner-later then\n  (cast list cons first rest\n    (c-later then state)\n  /c combiner-later state first /fn state\n  /foldl-later state rest combiner-later then))\n\n(defn map-later list func-later then\n  (foldl-later (nil) list\n    (fn state elem then\n      (c func-later elem /fn elem\n      /c then /cons elem state))\n  /fn rev-elems\n  /c then rev.rev-elems))\n\n(defn not yep-nope\n  (case yep-nope\n    yep val nope.val\n    nope val yep.val\n    err.\\;qq[Expected a yep-nope that was a yep or a nope]))\n\n(defn or a b\n  (case a yep - a\n  /case b yep - b\n  /nope/nil))\n\n(defn and-lazy a get-b\n  (case a nope - a\n  /let b (c get-b /nil)\n  /case b nope - b\n  /yep/nil))\n\n(defn and a b\n  (and-lazy a /fn - b))\n\n(defn xor a b\n  (case a yep -\n    (case b yep - (nope/nil) a)\n    (case b yep - b (nope/nil))))\n\n(defn yep-nope-swap a b\n  (case a yep - b not.b))\n\n(defn all list check\n  (not/any list /fn elem /not/c check elem))\n\n(def-struct rev-cut-result rev-past rest)\n\n(defn maybe-rev-cut list-to-measure-by list-to-cut\n  (case\n    (any-foldl (rev-cut-result (nil) list-to-cut) list-to-measure-by\n    /fn state ignored-elem\n      (cast state rev-cut-result rev-past rest\n        err.\\;qq[Internal error]\n      /cast rest cons first rest (yep/nil)\n      /nope/rev-cut-result (cons first rev-past) rest))\n    yep - (nil)\n    nope rev-cut-result yep.rev-cut-result\n    err.\\;qq[Internal error]))\n\n(defn rev-cut list-to-measure-by list-to-cut\n  (cast (maybe-rev-cut list-to-measure-by list-to-cut) yep result\n    err.\\;qq[\n      Expected a list-to-measure-by no longer than the list-to-cut]\n    result))\n\n(def-struct cut-result past rest)\n\n(defn maybe-cut list-to-measure-by list-to-cut\n  (cast (maybe-rev-cut list-to-measure-by list-to-cut)\n    yep rev-cut-result\n    (nil)\n  /cast rev-cut-result rev-cut-result rev-past rest\n    err.\\;qq[Internal error]\n  /yep/cut-result rev.rev-past rest))\n\n(defn cdr list\n  (cast list cons first rest\n    err.\\;qq[Expected a list that was a cons]\n    rest))\n\n(defn tails lists\n  (case (all lists /fn list /isa cons list) yep -\n    (tails/map lists /cdr)\n    lists))\n\n\\= NOTE: This utility isn't so much for modularity as it is a\n\\= convenient way to load another file in the project's input\n\\= directory as though its contents appeared inside the current file.\n\\=\n(def-macro import home-scope caller-scope my-stx-details args then\n  (basic-nil-macro home-scope caller-scope my-stx-details then\n  /fn caller-scope s mac\n  /get-mode/fn mode\n  /let path\n    (foldl cli-input-directory.mode args /fn dirname basename\n      (cast basename stx - basename\n        err.\\;qq[Called import with non-syntax]\n      /cast basename istring-nil basename\n        err.\\;qq[\n          Called import with something other than a string literal]\n      /input-path-get dirname basename))\n  /cast\n    (foldr (read-all-force/input-path-blob-utf-8 mode path)\n      (folding caller-scope /no-effects/nil)\n    /fn expr state\n      (cast state folding scope launch-rest\n        err.\\;qq[Internal error]\n      /folding (scope-get str.rest scope)\n      /join-effects launch-rest\n      /compile-expression-later (scope-get str.first scope) expr /fn -\n      /no-effects/nil))\n    folding scope launch-rest\n    err.\\;qq[Internal error]\n    \n    launch-rest))\n\n\n\\= ===== Comparison utilities ========================================\n\n\\= Compares two names. For inequal names, the result will be in a\n\\= format user-level code does not know how to deconstruct. For equal\n\\= names, the result will be (nil).\n(defn name-metacompare a b\n  (case (call-dex (dex-name/nil) a b)\n    yep result result\n    err.\\;qq[Called name-metacompare with non-name values]))\n\n\\= Compares two strings. For inequal strings, the result will be in a\n\\= format user-level code does not know how to deconstruct. For equal\n\\= strings, the result will be (nil).\n(defn string-metacompare a b\n  (case (call-dex (dex-string/nil) a b)\n    yep result result\n    err.\\;qq[Called string-metacompare with non-string values]))\n";