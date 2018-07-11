var fsy = require('fs');
var Generator = require('yeoman-generator');
var chalk = require('chalk');
var execSync = require('child_process').execSync;
var libxslt = require('libxslt');
var SwaggerParser = require('swagger-parser');
var jsf = require('json-schema-faker');

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
		console.log(err);
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

    setBasePath(){
        return new Promise((resolve, reject) => {
            SwaggerParser.validate(this.promptAnswers.name+'.yaml').then((api) => {
                this.apiProduces = api.produces;
                this.apiConsumes = api.consumes;
                this.basePath = api.basePath;
                let setBasePathXslt = this.fs.read(this.templatePath('set_basepath.xslt'));
                let stylesheet = libxslt.parse(setBasePathXslt.replace('the_base_path', api.basePath));
                var srcDocument = this.fs.read(this.promptAnswers.name + '/apiproxy/proxies/default.xml')
                var result = stylesheet.apply(srcDocument);
                this.fs.write(this.promptAnswers.name + '/apiproxy/proxies/default.xml', result);
                this.fs.commit(()=>{});
                resolve(true);
            })
        });
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
            let mockConfig = new Object();;
            mockConfig.mockDirectory = './mock';
            mockConfig.quiet = false;
            mockConfig.port = '8000';
            mockConfig.latency = 50;
            mockConfig.logRequestHeaders = false;
            let webServices = new Object();
            let supportedVerbs = ['GET','POST','PUT','DELETE','HEAD','OPTIONS','PATCH'];
            let resolveSchema = (schema) => {
                return jsf.resolve(schema);
            };
            let evalVerb = (pathString, path, verb, supportedVerbs, verbs, responses) => {
                return new Promise((resolve, reject) => {
                    if(supportedVerbs.includes(verb.toUpperCase())){
                        verbs.push(verb);
                        let useJsonSchemas = () => {
                            if(path[verb].produces){
                            return path[verb].produces.includes('application/json');
                            }
                            if(this.apiProduces){
                            return this.apiProduces.includes('application/json');
                            }
                        };
                        if(useJsonSchemas() && path[verb].responses){
                            Promise.all(Object.keys(path[verb].responses).map((response) => {
                                return new Promise((resolve, reject) => {
                                    if(path[verb].responses[response].schema && response != 'default'){
                                        let mockResponse = {};
                                        resolveSchema(path[verb].responses[response].schema).then((schema)=>{
                                        mockResponse.httpStatus = Number(response);
                                        let key = verb+pathString.replace(/\//g, '').replace(/\{/g, '').replace(/\}/g, '')+response;
                                        mockResponse.mockFile = key+'.json';
                                        responses[verb] = mockResponse;
                                        this.fs.write(this.promptAnswers.name+'/node/mock/'+mockResponse.mockFile, JSON.stringify(schema, null, 4));
                                        resolve(true);
                                        });
                                    } else {
                                        let okResponse = {};
                                        okResponse.httpStatus = 200;
                                        okResponse.mockFile = 'ok.json';
                                        responses[verb] = okResponse;
                                        resolve(true);
                                    }
                                });
                            })).then((resp) => {resolve(true);});
                        } else {
                            let okResponse = {};
                            okResponse.httpStatus = 200;
                            okResponse.mockFile = 'ok.json';
                            responses[verb] = okResponse;
                            resolve(true);
                        }
                    } else {
                        resolve(true);
                    }
                });
            };
            let evalPath  = (paths, path, webService) => {
                    return Promise.all(Object.keys(paths[path]).map((verb) => {
                        return evalVerb(path, paths[path], verb, supportedVerbs, webService.verbs, webService.responses, webService);
                    }));
            };
            let evalPaths = (api) => {
                return Promise.all(Object.keys(api.paths).map((path) => {
                    let webService = new Object();
                    webService.latency = 1000;
                    webService.verbs = [];
                    webService.responses = new Object();
                    let pathForMocker = path.substring(1).replace(/\{/g, ':').replace(/}/g, '');
                    webServices[pathForMocker] = webService;
                    return evalPath(api.paths, path, webServices[pathForMocker]);
                }));
            };
            nativeObject.then((api) => {
                this.apiDereferenced = api;
                return evalPaths(api);
            }).then((result) => {
                    Object.defineProperty(mockConfig, 'webServices', {value: webServices, writable:true, enumerable: true});
                    this.fs.write(this.promptAnswers.name+'/node/config-generated.json', JSON.stringify(mockConfig, null, 4));
                    this.fs.commit(()=>{});
                    resolve(true);
                });
            });
        }
    }

    createTests(){
	if(this.promptAnswers.publishApi && this.promptAnswers.createMock){
            return new Promise((resolve, reject) => {
                let parameterMap = new Map();
                let evalVerb = (pathString, path, verb) => {
                    return new Promise((resolve, reject) => {
                        if(verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT'){
                            let useJsonSchemas = () => {
                                if(path[verb].consumes){
                                    return path[verb].consumes.includes('application/json');
                                }
                                if(this.apiConsumes){
                                    return this.apiConsumes.includes('application/json');
                                }
                            };
                            if(useJsonSchemas() && path[verb].parameters){
                                Promise.all(path[verb].parameters).map((parameter) => {
                                    return new Promise((resolve, reject) => {
                                        if(parameter.in === 'body'){
                                            if(parameter.schema){
                                                jsf.resolve(parameter.schema).then((resolved) => {
                                                    parameterMap.set(pathString+verb, resolved);
                                                    resolve(true);
                                                });
                                            } else {resolve(true);}
                                        } else {resolve(true);}
                                    });
                                }).then((resolved) => {resolve(true)});
                            } else {
                                resolve(true);
                            }
                        }
                        resolve(true);
                    });
                };
                let evalPath  = (paths, path) => {
                return Promise.all(Object.keys(paths[path]).map((verb) => {
                    return evalVerb(path, paths[path], verb);
                }));
                };
                let evalPaths = (api) => {
                return Promise.all(Object.keys(api.paths).map((path) => {
                    return evalPath(api.paths, path);
                }));
                };
                evalPaths(this.apiDereferenced).then((resolved) => {
                    execSync('cp -rf '+this.templatePath('tests')+' '+this.promptAnswers.name+'/');
                    this.fs.copyTpl(
                        this.templatePath('sampleFeature.feature'),
                        this.destinationPath(this.promptAnswers.name+'/tests/features/sampleFeature.feature'),
                        {api : this.apiDereferenced, parameterMap : parameterMap}
                    );
                    this.fs.commit(()=>{});
                    resolve(true);
                });
            });
        }
    }
    
    publishApi(){
    
	if(this.promptAnswers.publishApi){
	        this.spawnCommandSync('mvn',
	                              ['-f',this.promptAnswers.name+'/pom.xml','install', '-Ptest', '-Dusername='+this.promptAnswers.edgeUsername, '-Dpassword='+this.promptAnswers.edgePassword, '-Dorg=gonzalezruben-eval', '-DbasePath='+this.basePath]);
	}
    }
};
