"use strict";
var rocketnia = rocketnia || {};
rocketnia.eraFiles = rocketnia.eraFiles || {};
rocketnia.eraFiles[ "era-quasiquote.cene" ] =
"\\= era-quasiquote.cene\n\\= Copyright 2015, 2016 Ross Angle. Released under the MIT License.\n\\=\n\\= See notes/quasiquotation.txt for thorough design details on the\n\\= kind of quasiquotation we're implementing here.\n\n\n(defn istring-map-any-foldl-later state istring combiner-later then\n  (cast istring istring-cons prefix interpolation rest\n    (c-later then /folding state istring)\n  /c combiner-later state interpolation /fn combiner-result\n  /case combiner-result\n    \n    yep result (c then combiner-result)\n    \n    folding state interpolation\n    (c-new istring-map-any-foldl-later state rest combiner-later\n    /fn recur-result\n    /c then /case recur-result\n      \n      yep result recur-result\n      \n      folding state rest\n      (folding state /istring-cons prefix interpolation rest)\n      \n      err.\\;qq[Internal error])\n    \n    err.\\;qq[Expected a combiner-result of type yep or folding]))\n\n(defn istring-map-any-later istring check-later then\n  (istring-map-any-foldl-later (nil) istring\n    (fn - elem then\n      (c check-later elem /fn check-result\n      /c then /case check-result\n        yep - check-result\n        nope val (folding (nil) val)\n        err.\\;qq[Expected a check-result of type yep or nope]))\n  /fn fold-result\n  /c then /case fold-result\n    yep - fold-result\n    folding - val nope.val\n    err.\\;qq[Internal error]))\n\n(defn istring-map-later istring func-later then\n  (istring-map-any-later istring\n    (fn elem then\n      (c func-later elem /fn result\n      /c then nope.result))\n  /fn result\n  /c then /proj1 nope result))\n\n(defn istring-append-later past rest then\n  (case past\n    \n    istring-nil past-suffix\n    (case rest\n      \n      istring-nil rest-suffix\n      (string-append-later past-suffix rest-suffix /fn appended\n      /c then istring-nil.appended)\n      \n      istring-cons prefix interpolation rest\n      (string-append-later past-suffix rest-suffix /fn appended\n      /c then /istring-cons appended interpolation rest)\n      \n      err.\\;qq[Expected a rest of type istring-nil or istring-cons])\n    \n    istring-cons prefix interpolation past-rest\n    (c-new istring-append-later past-rest rest /fn appended\n    /c then /istring-cons prefix interpolation appended)\n    \n    err.\\;qq[Expected a past of type istring-nil or istring-cons]))\n\n(def-type unwrapped val rewrap)\n\n(def-type qq-env-stack stack)\n(def-type qq-env-frame-qq)\n(def-type qq-env-frame-wq var)\n(def-type qq-env-frame-lq var layer)\n\n(defn qq-stack-uq qq-stack\n  (cast qq-stack cons frame rest (nil)\n  /case frame\n    qq-env-frame-qq yep.rest\n    qq-env-frame-wq - (c-new qq-stack-uq rest)\n    qq-env-frame-lq - - (c-new qq-stack-uq rest)\n    err.\\;qq[Encountered an unrecognized qq-env frame]))\n\n(defn qq-stack-rq level qq-stack-tentative-result qq-stack-remaining\n  (cast qq-stack-remaining cons frame rest\n    err.\\;qq[\n      Tried to restore a quasiquotation level that didn't exist]\n  /case frame\n    \n    qq-env-frame-qq (c-new qq-stack-rq level rest rest)\n    \n    qq-env-frame-wq var\n    (case (string-metacompare var level) nil\n      qq-stack-tentative-result\n    /c-new qq-stack-rq level qq-stack-tentative-result rest)\n    \n    qq-env-frame-lq var val\n    (case (string-metacompare var level) nil\n      (c-new qq-stack-rq val qq-stack-tentative-result rest)\n    /c-new qq-stack-rq level qq-stack-tentative-result rest)\n    \n    err.\\;qq[Encountered an unrecognized qq-env frame]))\n\n(defn parse-symbol unwrap expr\n  (cast (c unwrap expr) unwrapped unwrapped-expr rewrap-expr\n    err.\\;qq[Tried to parse a symbol that couldn't be unwrapped]\n  /cast unwrapped-expr istring-nil string\n    err.\\;qq[Tried to parse a symbol that wasn't a string]\n    string))\n\n(defn isa-list x\n  (or (isa nil x) (isa cons x)))\n\n(defn isa-istring x\n  (or (isa istring-nil x) (isa istring-cons x)))\n\n(defn parse-quasiquotation-escape-remainder-later\n  qq-env qq-stack-orig unwrap rewrap-suppressed expr then\n  \n  (cast qq-env qq-env-stack qq-stack\n    err.\\;qq[Expected a qq-env of type qq-env-stack]\n  /cast (c unwrap expr) unwrapped unwrapped-expr rewrap-expr\n    err.\\;qq[\n      Tried to parse a quasiquotation escape remainder that couldn't\n      be unwrapped]\n  /cast unwrapped-expr cons original-op rest\n    err.\\;qq[\n      Tried to parse a quasiquotation escape remainder that wasn't a\n      cons]\n  /let op (parse-symbol unwrap original-op)\n  /case (string-metacompare op str.-) nil\n    (cast rest cons expr rest\n      err.\\;qq[Not enough arguments to quasiquotation escape -]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape -]\n    /cast qq-stack-uq.qq-stack yep qq-stack-next\n      (later/c then /nope/c rewrap-expr /foreign yep.expr)\n    /c-new parse-quasiquotation-subexpr-later qq-env unwrap expr\n    /fn parsed\n    /case qq-stack-uq.qq-stack-orig nil\n      (cast qq-stack-uq.qq-stack-next nil\n        err.\\;qq[\n          Called quasiquotation escape - at a depth of more than one\n          from a starting depth of zero]\n      /c then parsed)\n    /c then /nope/c rewrap-suppressed /c rewrap-expr /cons original-op\n    /case parsed\n      \n      yep spliceable\n      (cast isa-list.spliceable yep -\n        err.\\;qq[\n          Tried to splice a non-list into a quasiquotation in a list\n          context]\n        spliceable)\n      \n      nope non-spliceable\n      (cons non-spliceable /nil)\n      \n      err.\\;qq[Internal error])\n  /case (string-metacompare op str.s-) nil\n    (cast rest cons expr rest\n      err.\\;qq[Not enough arguments to quasiquotation escape s-]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape s-]\n    /cast qq-stack-uq.qq-stack yep qq-stack-next\n      err.\\;qq[Called quasiquotation escape s- at a depth of zero]\n    /case qq-stack-uq.qq-stack-next nil\n      (c-new parse-quasiquotation-subexpr-later qq-env unwrap expr\n      /fn parsed\n      /cast parsed\n        nope non-splicing-to-splice\n        err.\\;qq[\n          Tried to splice into a call to quasiquotation escape s-]\n      /c then yep.non-splicing-to-splice)\n    /c-new parse-quasiquotation-subexpr-later qq-env unwrap expr\n    /fn parsed\n    /c then /nope/c rewrap-suppressed /c rewrap-expr /cons original-op\n    /case parsed\n      \n      yep spliceable\n      (cast isa-list.spliceable yep -\n        err.\\;qq[\n          Tried to splice a non-list into a quasiquotation in a list\n          context]\n        spliceable)\n      \n      nope non-spliceable\n      (cons non-spliceable /nil)\n      \n      err.\\;qq[Internal error])\n  /case (string-metacompare op str.qq) nil\n    (cast rest cons escape rest\n      err.\\;qq[Not enough arguments to quasiquotation escape qq]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape qq]\n    /c-new parse-quasiquotation-escape-remainder-later\n      (qq-env-stack/cons (qq-env-frame-qq) qq-stack)\n      qq-stack-orig\n      unwrap\n      (fn suppressed\n        (c rewrap-suppressed\n        /c rewrap-expr /cons original-op /cons suppressed /nil))\n      escape\n      then)\n  /case (string-metacompare op str.uq) nil\n    (cast rest cons escape rest\n      err.\\;qq[Not enough arguments to quasiquotation escape uq]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape uq]\n    /cast qq-stack-uq.qq-stack yep qq-stack-next\n      err.\\;qq[Tried to unquote more levels than were available]\n    /c-new parse-quasiquotation-escape-remainder-later\n      qq-env-stack.qq-stack-next\n      qq-stack-orig\n      unwrap\n      (fn suppressed\n        (c rewrap-suppressed\n        /c rewrap-expr /cons original-op /cons suppressed /nil))\n      escape\n      then)\n  /case (string-metacompare op str.wq) nil\n    (cast rest cons var rest\n      err.\\;qq[Not enough arguments to quasiquotation escape wq]\n    /cast rest cons escape rest\n      err.\\;qq[Not enough arguments to quasiquotation escape wq]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape wq]\n    /c-new parse-quasiquotation-escape-remainder-later\n      (qq-env-stack/cons (qq-env-frame-wq/parse-symbol unwrap var)\n        qq-stack)\n      qq-stack-orig\n      unwrap\n      (fn suppressed\n        (c rewrap-suppressed /c rewrap-expr\n        /cons original-op /cons var /cons suppressed /nil))\n      escape\n      then)\n  /case (string-metacompare op str.lq) nil\n    (cast rest cons var rest\n      err.\\;qq[Not enough arguments to quasiquotation escape lq]\n    /cast rest cons level rest\n      err.\\;qq[Not enough arguments to quasiquotation escape lq]\n    /cast rest cons escape rest\n      err.\\;qq[Not enough arguments to quasiquotation escape lq]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape lq]\n    /c-new parse-quasiquotation-escape-remainder-later\n      (qq-env-stack/cons\n        (qq-env-frame-lq (parse-symbol unwrap var)\n        /parse-symbol unwrap level)\n        qq-stack)\n      qq-stack-orig\n      unwrap\n      (fn suppressed\n        (c rewrap-suppressed /c rewrap-expr\n        /cons original-op\n        /cons var /cons level /cons suppressed /nil))\n      escape\n      then)\n  /case (string-metacompare op str.rq) nil\n    (cast rest cons level rest\n      err.\\;qq[Not enough arguments to quasiquotation escape rq]\n    /cast rest cons escape rest\n      err.\\;qq[Not enough arguments to quasiquotation escape rq]\n    /cast rest nil\n      err.\\;qq[Too many arguments to quasiquotation escape rq]\n    /c-new parse-quasiquotation-escape-remainder-later\n      (qq-env-stack/qq-stack-rq (parse-symbol unwrap level)\n        qq-stack qq-stack)\n      qq-stack-orig\n      unwrap\n      (fn suppressed\n        (c rewrap-suppressed /c rewrap-expr\n        /cons original-op /cons level /cons suppressed /nil))\n      escape\n      then)\n    err.\\;qq[\n      Tried to parse a quasiquotation escape remainder that wasn't\n      recognized]))\n\n(defn parse-quasiquotation-escape-later qq-env unwrap expr then\n  (cast qq-env qq-env-stack qq-stack\n    err.\\;qq[Expected a qq-env of type qq-env-stack]\n  /cast (c unwrap expr) unwrapped unwrapped-expr rewrap-expr\n    err.\\;qq[\n      Tried to parse a quasiquotation escape that couldn't be\n      unwrapped]\n  /cast unwrapped-expr cons first rest\n    err.\\;qq[\n      Tried to parse a quasiquotation escape that wasn't a cons]\n  /cast (string-metacompare (parse-symbol unwrap first) str.^) nil\n    err.\\;qq[\n      Tried to parse a quasiquotation escape where the first element\n      wasn't the string \\;qq[^]]\n  /cast rest cons remainder rest\n    err.\\;qq[\n      Tried to parse a quasiquotation escape with fewer than one\n      argument to ^]\n  /cast rest nil\n    err.\\;qq[\n      Tried to parse a quasiquotation escape with more than one\n      argument to ^]\n  /parse-quasiquotation-escape-remainder-later qq-env qq-stack unwrap\n    (fn suppressed /c rewrap-expr /cons first /cons suppressed /nil)\n    remainder\n    then))\n\n(defn parse-quasiquotation-subexpr-later qq-env unwrap expr then\n  (cast (c unwrap expr) unwrapped unwrapped-expr rewrap-expr\n    err.\\;qq[\n      Tried to parse a quasiquotation that couldn't be unwrapped]\n  /case\n    (cast unwrapped-expr cons first rest (nope/nil)\n    /cast (c unwrap first) unwrapped unwrapped-first rewrap-first\n      err.\\;qq[\n        Tried to parse a quasiquotation where the first element\n        couldn't be unwrapped]\n    /cast unwrapped-first istring-nil string (nope/nil)\n    /cast (string-metacompare string str.^) nil (nope/nil)\n    /yep/nil)\n    yep -\n    (parse-quasiquotation-escape-later qq-env unwrap expr then)\n  /let then (fn result /c then /nope/c rewrap-expr result)\n  /case isa-list.unwrapped-expr yep -\n    (let concat-unwrapped\n      (fix/fn concat-unwrapped unwrappeds\n        (case unwrappeds\n          \n          nil unwrappeds\n          \n          cons first rest\n          (case first\n            \n            yep spliceable\n            (cast (c unwrap spliceable) unwrapped spliceable -\n              err.\\;qq[\n                Tried to splice a value that couldn't be unwrapped\n                into a quasiquotation]\n            /cast isa-list.spliceable yep -\n              err.\\;qq[\n                Tried to splice a non-list into a quasiquotation in a\n                list context]\n            /append spliceable /c concat-unwrapped rest)\n            \n            nope non-spliceable\n            (cons non-spliceable /c concat-unwrapped rest)\n            \n            err.\\;qq[Internal error])\n          \n          err.\\;qq[Internal error]))\n    /map-later unwrapped-expr\n      (fn expr then\n        (c-new parse-quasiquotation-subexpr-later\n          qq-env unwrap expr then))\n    /fn parsed-expr\n    /c then /c concat-unwrapped parsed-expr)\n  \n  /case isa-istring.unwrapped-expr yep -\n    (let concat-unwrapped-later\n      (fix/fn concat-unwrapped-later unwrappeds then\n        (case unwrappeds\n          \n          istring-nil - (c-later then unwrappeds)\n          \n          istring-cons prefix interpolation rest\n          (case interpolation\n            \n            yep spliceable\n            (cast (c unwrap spliceable) unwrapped spliceable -\n              err.\\;qq[\n                Tried to splice a value that couldn't be unwrapped\n                into a quasiquotation]\n            /cast isa-istring.spliceable yep -\n              err.\\;qq[\n                Tried to splice a non-istring into a quasiquotation in\n                an istring context]\n            /c concat-unwrapped-later rest /fn rest\n            /istring-append-later spliceable rest /fn rest\n            /istring-append-later istring-nil.prefix rest then)\n            \n            nope non-spliceable\n            (c concat-unwrapped-later rest /fn rest\n            /c then /istring-cons prefix non-spliceable rest)\n            \n            err.\\;qq[Internal error])\n          \n          err.\\;qq[Internal error]))\n    /istring-map-later unwrapped-expr\n      (fn expr then\n        (c-new parse-quasiquotation-subexpr-later\n          qq-env unwrap expr then))\n    /fn parsed-expr\n    /c concat-unwrapped-later parsed-expr then)\n  \n  /case unwrapped-expr\n    foreign elem (c-later then /foreign nope.elem)\n    err.\\;qq[\n      Tried to parse a quasiquotation that wasn't an s-expression]))\n\n(defn unwrap-for-macro expr\n  (cast expr stx stx-details expr (nil)\n  /unwrapped expr /fn new-expr /stx stx-details new-expr))\n\n(defn parse-quasiquotation-for-macro-later expr then\n  (parse-quasiquotation-escape-later (qq-env-stack/nil)\n    (unwrap-for-macro)\n    expr\n  /fn parsed\n  /cast parsed nope non-spliceable\n    err.\\;qq[Tried to splice into the quasiquotation root]\n  /c then non-spliceable))\n\n(defn s-expr-leaves unwrap expr\n  (cast (c unwrap expr) unwrapped expr rewrap\n    err.\\;qq[\n      Tried to get the leaves of an expression that couldn't be\n      unwrapped]\n  /case expr nil\n    (nil)\n  /case expr cons first rest\n    (append\n      (c-new s-expr-leaves unwrap first)\n      (c-new s-expr-leaves unwrap /c rewrap rest))\n  /case expr istring-nil string\n    (nil)\n  /case expr istring-cons prefix interpolation rest\n    (append\n      (c-new s-expr-leaves unwrap interpolation)\n      (c-new s-expr-leaves unwrap /c rewrap rest))\n  /case expr foreign val\n    list.val\n    err.\\;qq[Expected an expr that was an s-expression]))\n\n(defn s-expr-splice-leaves-later unwrap expr leaves then\n  (cast (c unwrap expr) unwrapped unwrapped-expr rewrap\n    err.\\;qq[\n      Tried to splice the leaves of an expression that couldn't be\n      unwrapped]\n  /case unwrapped-expr nil\n    (later/c then nope.expr leaves)\n  /case unwrapped-expr cons first rest\n    (c-new s-expr-splice-leaves-later unwrap first leaves\n    /fn first leaves\n    /let first\n      (case first yep spliceable spliceable\n      /case first nope non-spliceable list.non-spliceable\n        err.\\;qq[Internal error])\n    /c-new s-expr-splice-leaves-later unwrap (c rewrap rest) leaves\n    /fn rest leaves\n    /cast rest nope rest\n      err.\\;qq[Expected an expr that had proper lists]\n    /cast (c unwrap rest) unwrapped rest -\n      err.\\;qq[\n        Encountered trouble unwrapping an expression that had been\n        rewrapped]\n    /c then (nope/c rewrap /append first rest) leaves)\n  /case unwrapped-expr istring-nil string\n    (later/c then nope.expr leaves)\n  /case unwrapped-expr istring-cons prefix interpolation rest\n    (c-new s-expr-splice-leaves-later unwrap interpolation leaves\n    /fn interpolation leaves\n    /c-new s-expr-splice-leaves-later unwrap rest leaves\n    /fn rest leaves\n    /cast rest nope rest\n      err.\\;qq[\n        Expected an expr that had proper interpolated strings]\n    /cast (c unwrap rest) unwrapped rest -\n      err.\\;qq[\n        Encountered trouble unwrapping an expression that had been\n        rewrapped]\n    /case interpolation yep spliceable\n      (istring-append-later spliceable rest /fn rest\n      /istring-append-later istring-nil.prefix rest /fn result\n      /c then /c rewrap result)\n    /case interpolation nope non-spliceable\n      (later/c then /c rewrap\n      /istring-cons prefix non-spliceable rest)\n      err.\\;qq[Internal error])\n  /case unwrapped-expr foreign val\n    (cast leaves cons leaf leaves\n      err.\\;qq[\n        Encountered more leaves in the s-expression than the list]\n    /cast (or (isa yep leaf) (isa nope leaf)) yep -\n      err.\\;qq[\n        Expected every leaf in the list to be of type yep or nope]\n    /later/c then leaf leaves)\n    err.\\;qq[Expected an expr that was an s-expression]))\n\n(defn unique-ns-spread unique-ns list combiner\n  (cast list cons first rest (nil)\n  /cons (c combiner (ns-get str.first unique-ns) first)\n  /c-new unique-ns-spread (ns-get str.rest unique-ns) rest combiner))\n\n(def-macro qlet unique-ns definition-ns my-stx-details args then\n  (cast args cons body args\n    err.\\;qq[Called qlet without any arguments]\n  /cast args nil\n    err.\\;qq[Called qlet with more than one argument]\n  /parse-quasiquotation-for-macro-later body /fn body\n  /get-mode/fn mode\n  /let s (fn it /stx my-stx-details it)\n  /let spread-leaves\n    (unique-ns-spread (ns-get str.bindings unique-ns)\n      (s-expr-leaves (unwrap-for-macro) body)\n    /fn unique-ns leaf\n      (pair (c s /foreign/procure-name mode unique-ns) leaf))\n  /s-expr-splice-leaves-later (unwrap-for-macro) body\n    (map spread-leaves /fn spread-leaf\n      (cast spread-leaf pair var leaf\n        err.\\;qq[Internal error]\n      /case leaf\n        yep interpolation nope.var\n        nope naturally-foreign (nope/c s /foreign naturally-foreign)\n        err.\\;qq[Internal error]))\n  /fn body leaves\n  /cast leaves nil\n    err.\\;qq[Internal error]\n  /cast body nope body\n    err.\\;qq[Internal error]\n  /basic-pure-macro (ns-get str.body unique-ns)\n    definition-ns my-stx-details then\n  /fn unique-ns s mac\n  /c s /c mac str.let /append\n    (mappend spread-leaves /fn spread-leaf\n      (cast spread-leaf pair var leaf\n        err.\\;qq[Internal error]\n      /case leaf\n        yep interpolation (list var interpolation)\n        nope naturally-foreign (nil)\n        err.\\;qq[Internal error]))\n    list.body))\n";
