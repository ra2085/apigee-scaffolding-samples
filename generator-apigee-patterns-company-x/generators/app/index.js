var fsy = require('fs');
var Generator = require('yeoman-generator');
var chalk = require('chalk');
var execSync = require('child_process').execSync;
var libxslt = require('libxslt');
var SwaggerParser = require('swagger-parser');

module.exports = class extends Generator {
       
    prompting() {
        
    this.log(require('yosay')('This is a sample implementation for a basic scaffolding tool.'));
    this.log(chalk.magenta(
        'Remember:'
    ));
    this.log(chalk.magenta('1. Your API is the first user interface of your application'));
    this.log(chalk.magenta('2. Your API comes first, then the implementation'));
    this.log(chalk.magenta('3. Your API should be self-descriptive'));
    
    return this.prompt([{
      type    : 'input',
      name    : 'name',
      message : 'Your API name',
	default : this.appname, // Default to current folder name. This should also be your openAPI file name.
	validate(input) {
        return new Promise((resolve, reject) => {
            SwaggerParser.validate(input+'.yaml').then((api) => {
                resolve(true);
            }).catch((err) => {
                resolve('You must provide an existing OpenAPI spec (yaml file in working directory) and the spec MUST be valid');
            });
        });
	}
    }, {
        type : 'confirm',
        name : 'createMock',
        message : 'Would you like to create a mock service as the backend for your API?',
        default : false
    }, {
        type : 'confirm',
        name : 'publishApi',
        message : 'Would your like to publish your API?',
        default : false
    }, {
        type : 'input',
        name : 'edgeUsername',
        message : 'Please provide your Edge username.',
        validate: (email) => {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return (re.test(String(email).toLowerCase())) ? true : 'You must provide a valid Edge username (email)'; 
        },
        when : (answers) => {
            return answers.publishApi;
        }
    }, {
        type : 'password',
        name : 'edgePassword',
        message : 'Please provide your Edge password.',
        validate: (input) => {
            return (input && input !== "") ? true : 'You must provide a valid password';
        },
        when : function(answers){
            return answers.publishApi;
        }
    }
                        //{
        //type: 'list',
        //name: "security",
        //message: "Which security pattern are you going to use?",
        //choices: ['B2B','B2C']
        //             }
        ]).then((answers) => {
	   this. promptAnswers = answers;
	});
		
        //this.fs.copyTpl(
        //    this.templatePath('flow-callout-OAuth.xml'),
        //    this.destinationPath(answers.name+'/apiproxy/policies/flow-callout-OAuth-'+answers.security+'.xml'),
        //    { security: answers.security }
        //);
    }
    
    _validate_spec(apiSpec){
        SwaggerParser.validate(apiSpec)
          .then(function(api) {
            console.log('Yay! The API is valid.');
          })
          .catch(function(err) {
            console.error('Onoes! The API is invalid. ' + err.message);
          });
    }

    openapiToApigee(){
	this.spawnCommandSync('openapi2apigee',
	                  ['generateApi', this.promptAnswers.name, '-s', this.promptAnswers.name+'.yaml', '-d', '.']);
    }

    deleteZipFile(){
	fsy.unlinkSync('./'+this.promptAnswers.name+'/apiproxy.zip');

    }
    copyPomTemplate(){
	this.fs.copyTpl(
	    this.templatePath('pom.xml'),
	    this.destinationPath(this.promptAnswers.name+'/pom.xml'),
	    {api_name : this.promptAnswers.name}
	);
	this.fs.commit(()=>{});
    }

    createMock(){
	if(this.promptAnswers.createMock){
	    execSync('cp -r '+this.templatePath('node')+' '+this.promptAnswers.name+'/');
	    execSync('cd '+this.promptAnswers.name+'/node && npm install'); 
	    var setMockScriptTargetXslt = this.fs.read(this.templatePath('set_mock_script_target.xslt'));
	    var stylesheet = libxslt.parse(setMockScriptTargetXslt);
	    var srcDocument = this.fs.read(this.promptAnswers.name + '/apiproxy/targets/default.xml')
	    var result = stylesheet.apply(srcDocument);
	    this.fs.write(this.promptAnswers.name + '/apiproxy/targets/default.xml', result);
	    this.fs.commit(()=>{});
	}
    }

    createMockServer(){
        if(this.promptAnswers.createMock){
        return new Promise((resolve, reject) => {
           let nativeObject = SwaggerParser.dereference(this.promptAnswers.name+'.yaml');
            let mockConfig = {};
            mockConfig.mockDirectory = './mock';
            mockConfig.quiet = false;
            mockConfig.port = '8000';
            mockConfig.latency = 50;
            mockConfig.logRequestHeaders = false;
            let webServices = {};
            let supportedVerbs = ['GET','POST','PUT','DELETE','HEAD','OPTIONS','PATCH'];
            nativeObject.then((api)=>{
                for (let path in api.paths){
                    let webService = {};
                    webService.latency = 1000;
                    webService.verbs = [];
                    let okResponse = {};
                    okResponse.httpStatus = 200;
                    okResponse.mockFile = 'ok.json';
                    let responses = {};
                    for (let verb in api.paths[path]){
                        if(supportedVerbs.includes(verb.toUpperCase())){
                            webService.verbs.push(verb);
                            Object.defineProperty(responses, verb, {value: okResponse, writable: true, enumerable: true});
                        }
                    }
                    Object.defineProperty(webService, 'responses', {value: responses, writable: true, enumerable: true});
                    Object.defineProperty(webServices, path.replace(/\//g,''), {value: webService, writable: true, enumerable: true});
                };
                Object.defineProperty(mockConfig, 'webServices', {value: webServices, writable:true, enumerable: true});
                this.fs.write(this.promptAnswers.name+'/node/config-generated.json', JSON.stringify(mockConfig));
                this.fs.commit(()=>{});
                this.apiDereferenced = api;
                resolve(true);
            });
        });
        }
    }

    createTests(){
    if(this.promptAnswers.publishApi){    
        execSync('cp -rf '+this.templatePath('tests')+' '+this.promptAnswers.name+'/');
        this.fs.copyTpl(
	    this.templatePath('sampleFeature.feature'),
	    this.destinationPath(this.promptAnswers.name+'/tests/features/sampleFeature.feature'),
	    {api : this.apiDereferenced}
        );
        this.fs.commit(()=>{});
    }
    }
    
    publishApi(){
    
	if(this.promptAnswers.publishApi){
	        this.spawnCommandSync('mvn',
	                              ['-f',this.promptAnswers.name+'/pom.xml','install', '-Ptest', '-Dusername='+this.promptAnswers.edgeUsername, '-Dpassword='+this.promptAnswers.edgePassword, '-Dorg=gonzalezruben-eval']);
	}
    }
};
