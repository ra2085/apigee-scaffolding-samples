var fsy = require('fs-extra');
var Generator = require('yeoman-generator');
var chalk = require('chalk');
var execSync = require('child_process').execSync;
var xpath = require('xpath')
  , dom = require('xmldom').DOMParser;
var SwaggerParser = require('swagger-parser');
var jsf = require('json-schema-faker');
var apigeetool = require('apigeetool');
var sdk = apigeetool.getPromiseSDK();

module.exports = class extends Generator {
    
    async prompting() {
        
    this.log(require('yosay')('This is a sample implementation for a basic scaffolding tool.'));
    this.log(chalk.magenta(
        'Remember:'
    ));
    this.log(chalk.magenta('1. Your API is the first user interface of your application'));
    this.log(chalk.magenta('2. Your API comes first, then the implementation'));
    this.log(chalk.magenta('3. Your API should be self-descriptive'));
    
    this.promptAnswers = await this.prompt([{
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
        type : 'input',
        name : 'edgeOrg',
        message : 'Please provide your Edge organization name.',
        validate: (input) => {
            return (input && input !== "") ? true : 'You must provide a valid organization name'; 
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
        ]);
		
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
                let srcDocument = this.fs.read(this.promptAnswers.name + '/apiproxy/proxies/default.xml');
				let doc = new dom().parseFromString(srcDocument);
				let nodes = xpath.select("/ProxyEndpoint/HTTPProxyConnection/BasePath", doc);
				nodes[0].textContent = api.basePath;
                this.fs.write(this.promptAnswers.name + '/apiproxy/proxies/default.xml', doc.toString());
                this.fs.commit(()=>{});
                resolve(true);
            })
        });
    }

    createMock(){
		if(this.promptAnswers.createMock){
			//execSync('cp -r '+this.templatePath('node')+' '+this.promptAnswers.name+'/');
			fsy.copySync(this.templatePath('node'), this.promptAnswers.name + '/node');
			execSync('cd '+this.promptAnswers.name+'/node && npm install'); 
			let srcDocument = this.fs.read(this.promptAnswers.name + '/apiproxy/targets/default.xml');
			let doc = new dom().parseFromString(srcDocument);
			let nodes = xpath.select("/TargetEndpoint/HTTPTargetConnection", doc);
			while (nodes[0].firstChild) {
				nodes[0].removeChild(nodes[0].firstChild);
			}
			let scriptTarget = doc.createElement('ScriptTarget');
			let resourceURL = doc.createElement('ResourceURL');
			resourceURL.textContent = 'node://app.js';
			scriptTarget.appendChild(resourceURL);
			nodes[0].appendChild(scriptTarget);
			this.fs.write(this.promptAnswers.name + '/apiproxy/targets/default.xml', doc.toString());
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
                jsf.option({
                    alwaysFakeOptionals: true
                });
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
                    webService.latency = 10;
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
					fsy.copySync(this.promptAnswers.name + '/node', this.promptAnswers.name + 'apiproxy/resources');
					this.log('copied sources!');
                    resolve(true);
                });
            });
        }
    }

    createTests(){
		if(this.promptAnswers.createMock){
            return new Promise((resolve, reject) => {
                let parameterMap = new Object();
                let resolveSchema = (schema) => {
                    jsf.option({
                      alwaysFakeOptionals: true
                    });
                    return jsf.resolve(schema);
                };
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
                                Promise.all(path[verb].parameters.map((parameter) => {
                                    return new Promise((resolve, reject) => {
                                        if(parameter.in === 'body' && parameter.schema){
                                                resolveSchema(parameter.schema).then((esq) => {
                                                    parameterMap[pathString+verb] = esq;console.log(''+pathString+verb);
                                                    resolve(true);
                                                });
                                        } else {resolve(true);}
                                    });
                                })).then((resolved) => {resolve(true)});
                            } else {
                                resolve(true);
                            }
                        } else {
                            resolve(true);
                        }
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
    
    async publishApi(){
    
		if(this.promptAnswers.publishApi){
			
			var opts = {
				organization: this.promptAnswers.edgeOrg,
				username: this.promptAnswers.edgeUsername,
				password: this.promptAnswers.edgePassword,
				environments: 'test',
				api:this.promptAnswers.name,
				directory:'./'+this.promptAnswers.name,
				debug: true
			}
			
			await sdk.deployProxy(opts)
			.then(function(result){
				this.log('success!');
        //deploy success
			},function(err){
				console.log('failure!'+ err);
        //deploy failed
			});
				//this.spawnCommandSync('mvn',
				//					  ['-f',this.promptAnswers.name+'/pom.xml','install', '-Ptest', '-Dusername='+this.promptAnswers.edgeUsername, '-Dpassword='+this.promptAnswers.edgePassword, '-Dorg='+this.promptAnswers.edgeOrg, '-DbasePath='+this.basePath]);
		}
    }
};
