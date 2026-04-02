// Borderly Action Extension — JavaScript preprocessor/finalizer
//
// This file runs in two phases:
// 1. run() — called before the extension UI loads, sends page info to Swift
// 2. finalize() — called after Swift returns, executes the fill script

var Action = function() {};

Action.prototype = {
    // Phase 1: Extract page info and send to Swift
    run: function(arguments) {
        arguments.completionFunction({
            "url": document.URL,
            "title": document.title
        });
    },

    // Phase 2: Execute the fill script returned by Swift
    finalize: function(arguments) {
        var fillScript = arguments["fillScript"];
        if (fillScript) {
            eval(fillScript);
        }
    }
};

var ExtensionPreprocessingJS = new Action;
