var chai = require('chai');
chai.should();

var fs = require('fs');

var runOperation = require('plumber-util-test').runOperation;
var completeWithResources = require('plumber-util-test').completeWithResources;
var runAndCompleteWith = require('plumber-util-test').runAndCompleteWith;

var Resource = require('plumber').Resource;
var Report = require('plumber').Report;

var sass = require('..');

function createResource(params) {
    return new Resource(params);
}

function resourcesError() {
  chai.assert(false, "error in resources observable");
}


describe('sass', function(){
    // var supervisor;

    // beforeEach(function() {
    //     supervisor = new Supervisor();
    //     supervisor.dependOn = sinon.spy();
    // });


    it('should be a function', function(){
        sass.should.be.a('function');
    });

    it('should return a function', function(){
        sass().should.be.a('function');
    });

    it('should throw an error if passed a minimisation option', function(){
        (function() {
            sass({outputStyle: 'compressed'});
        }).should.throw('The plumber-sass operation should not be used to minimise, please use plumber-mincss instead');

        (function() {
            sass({outputStyle: 'compact'});
        }).should.throw('The plumber-sass operation should not be used to minimise, please use plumber-mincss instead');
    });

    // TODO: test options

    describe('when passed a SCSS file', function() {
        var transformedResources;
        var mainData = fs.readFileSync('test/fixtures/main.scss').toString();

        beforeEach(function() {
            transformedResources = runOperation(sass(), [
                createResource({path: 'test/fixtures/main.scss', type: 'scss', data: mainData})
            ]).resources;
        });

        it('should return a single resource with a CSS filename', function(done){
            completeWithResources(transformedResources, function(resources) {
                resources.length.should.equal(1);
                resources[0].filename().should.equal('main.css');
            }, resourcesError, done);
        });

        it('should return a resource with CSS data', function(done){
            var outputMain = fs.readFileSync('test/fixtures/output-main.css').toString();
            completeWithResources(transformedResources, function(resources) {
                resources[0].data().should.equal(outputMain);
            }, resourcesError, done);
        });
    });


    describe('when passed a resource with invalid Sass syntax', function() {

        it('should return an error report if missing closing bracket', function(done){
            var missingClosingBracket = createResource({
                path: 'test/fixtures/concatenated.scss',
                type: 'scss',
                data: '.foo {'
            });

            runAndCompleteWith(sass(), [missingClosingBracket], function(reports) {
                reports.length.should.equal(1);
                reports[0].should.be.instanceof(Report);
                reports[0].writtenResource.should.equal(missingClosingBracket);
                reports[0].type.should.equal('error');
                reports[0].success.should.equal(false);
                reports[0].errors[0].message.should.equal('source string:1: error: invalid property name\n');
            }, resourcesError, done);
        });


        it('should return an error report if using undeclared var', function(done){
            var missingClosingBracket = createResource({
                path: 'test/fixtures/concatenated.scss',
                type: 'scss',
                data: '.foo {\n  border: @missing;\n}'
            });

            runAndCompleteWith(sass(), [missingClosingBracket], function(reports) {
                reports.length.should.equal(1);
                reports[0].should.be.instanceof(Report);
                reports[0].writtenResource.should.equal(missingClosingBracket);
                reports[0].type.should.equal('error');
                reports[0].success.should.equal(false);
                reports[0].errors[0].message.should.equal('source string:2: error: error reading values after :\n');
            }, resourcesError, done);
        });
    });
});
