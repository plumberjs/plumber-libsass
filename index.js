var operation = require('plumber').operation;
var Report = require('plumber').Report;

var highland = require('highland');
var sass = require('node-sass');
var path = require('path');
var extend = require('extend');

// Unwanted minimisation options
var minimisationOptions = ['compressed', 'compact'];

module.exports = function(options) {
    options = options || {};

    // Abort if any illegal option provided
    if (minimisationOptions.indexOf(options.outputStyle) !== -1) {
        throw new Error('The plumber-sass operation should not be used to minimise, please use plumber-mincss instead');
    }

    // FIXME: restore supervisor?
    // FIXME: using operation.parallelFlatMap causes tests and examples to fail?
    return operation(function(resources) {
        return resources.flatMap(function(resource) {
            // TODO: map extra options (filename, paths, etc)?
            var compiledCss = resource.withType('css');

            return highland(function (push) {
                var resourcePath = resource.path();
                try {
                    var data = sass.renderSync(extend({}, options, {
                        data: resource.data(),
                        includePaths: resourcePath && [path.dirname(resourcePath.absolute())]
                    }));
                    push(null, data);
                } catch (error) {
                    push(error);
                } finally {
                    push(null, highland.nil);
                }
            }).map(function(out) {
                return compiledCss.withData(out);
            }).errors(function(error, push) {
                // TODO: Get more error info from node-sass somehow. Parse error
                // error: String
                // Catch and map Sass error
                var errorReport = new Report({
                    resource: resource,
                    type: 'error', // FIXME: ?
                    success: false,
                    errors: [{
                        message: error
                    }]
                });
                push(null, errorReport);
            });
        });
    });
};
