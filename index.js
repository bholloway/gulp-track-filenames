var path = require('path');
var through = require('through2');
var minimatch = require('minimatch');

/**
 * Create an instance.
 * @returns {{create: function, replace: function}}
 */
module.exports = function() {
  'use strict';
  var sessions = [ ];
  return {

    /**
     * Create an session that is separated from others.
     * This is important to ensure that order is preserved when associating `before` with `after`.
     * @returns {{before: function, after: function, replace: function}}
     */
    create: function() {
      var before  = [ ];
      var after   = [ ];
      var session = {

        /**
         * Note file names from the input stream as those before transformation.
         * Outputs a stream of the same files.
         * @returns {stream.Through} A through stream that performs the operation of a gulp stream
         */
        before: function() {
          return through.obj(function(file, encode, done){
            before.push(path.resolve(file.path));  // enforce correct path format for the platform
            this.push(file);
            done();
          });
        },

        /**
         * Note file names from the input stream as those after transformation.
         * Order must be preserved so as to correctly match the corresponding before files.
         * Outputs a stream of the same files.
         * @returns {stream.Through} A through stream that performs the operation of a gulp stream
         */
        after: function() {
          return through.obj(function(file, encode, done){
            var source = minimatch.makeRe(file.path).source
              .replace(/^\^|\$$/g, '')        // match text anywhere on the line by removing line start/end
              .replace(/\\\//g, '[\\\\\\/]'); // detect any platform path format
            after.push(source);
            this.push(file);
            done();
          });
        },

        /**
         * Replace occurrences of <code>after</code> file names with the corresponding <code>before</code> file names
         * for only the current session.
         * @param {string} text The input text to replace
         * @returns {string} The result of the replacement
         */
        replace: function(text) {
          for (var i = Math.min(before.length, after.length) - 1; i >= 0; i--) {
          var regexp = new RegExp(after[i], 'gm');
            text = text.replace(regexp, before[i]);
          }
          return text;
        }
	    };
      sessions.push(session);
      return session;
    },

    /**
     * Replace occurrences of <code>after</code> file names with the corresponding <code>before</code> file names
     * across all sessions.
     * @param {string} text The input text to replace
     * @returns {string} The result of the replacement
     */
	  replace: function(text) {
      sessions.forEach(function(session) {
	      text = session.replace(text);
      });
      return text;
    }
  };
}
