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
var isWin = process.platform.startsWith('win');

module.exports = class extends Generator {
    
    async prompting() {
        
    this.log(require('yosay')('This is a sample implementation for a basic scaffolding tool.'));
    this.log(chalk.yellow(
        'Remember:'
    ));
    this.log(chalk.yellow('1. Your API is the first user interface of your application'));
    this.log(chalk.yellow('2. Your API comes first, then the implementation'));
    this.log(chalk.yellow('3. Your API should be self-descriptive'));
    
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
		this.log(chalk.yellow('Creating API Proxy bundle...'));
		this.spawnCommandSync('openapi2apigee',
	                  ['generateApi', this.promptAnswers.name, '-s', this.promptAnswers.name+'.yaml', '-d', '.']);
	    this.log(chalk.yellow('API Proxy bundle created!'));
    }

    deleteZipFile(){
		this.log(chalk.yellow('Rendering templates...'));
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
			fsy.copySync(this.templatePath('node'), this.promptAnswers.name + '/node');
			execSync('cd '+this.promptAnswers.name+'/node && npm install');
			let srcDocument = this.fs.read(this.promptAnswers.name + '/apiproxy/targets/default.xml');
			let doc = new dom().parseFromString(srcDocument);
			let nodes = xpath.select("/TargetEndpoint/HTTPTargetConnection", doc);
			doc.removeChild(nodes[0]);
			let target = xpath.select("/TargetEndpoint", doc);
			let scriptTarget = doc.createElement('ScriptTarget');
			let resourceURL = doc.createElement('ResourceURL');
			resourceURL.textContent = 'node://app.js';
			scriptTarget.appendChild(resourceURL);
			target[0].appendChild(scriptTarget);
			this.fs.write(this.promptAnswers.name + '/apiproxy/targets/default.xml', doc.toString());
			this.fs.commit(()=>{});
		}
		this.log(chalk.yellow('Templates rendered!'));
    }

    async createMockServer(){
        if(this.promptAnswers.createMock){
		this.log(chalk.yellow('Creating NodeJS Mock server...'));
        return await new Promise((resolve, reject) => {
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
                    fsy.writeJsonSync(this.promptAnswers.name+'/node/config-generated.json', mockConfig, {spaces:4});
                    this.fs.commit(()=>{});
                    resolve(true);
                });
            });
        }
    }
	
	copyNodeResources(){
		if(this.promptAnswers.createMock){
			if(isWin){
				execSync('cd '+this.promptAnswers.name+'/node && powershell.exe -nologo -noprofile -command "& { Add-Type -A \'System.IO.Compression.FileSystem\'; [IO.Compression.ZipFile]::CreateFromDirectory(\'node_modules\', \'node_modules.zip\'); }" && rmdir /s /q node_modules');
			} else {
				execSync('cd '+this.promptAnswers.name+'/node && zip -r node_modules.zip node_modules/ && rm -r node_modules');
			}
			fsy.copySync(this.promptAnswers.name + '/node', this.promptAnswers.name + '/apiproxy/resources/node');
			this.log(chalk.yellow('Mock server created!'));
		}
	}

    createTests(){
		if(this.promptAnswers.createMock){
		this.log(chalk.yellow('Rendering Apickli test templates...'));
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
                        if(verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT' || verb.toUpperCase() === 'GET' || verb.toUpperCase() === 'PATCH' || verb.toUpperCase() === 'DELETE'){
                            let useJsonSchemas = () => {
                                if(path[verb].consumes){
                                    return path[verb].consumes.includes('application/json');
                                }
                                if(this.apiConsumes){
                                    return this.apiConsumes.includes('application/json');
                                }
                            };
                            if(path[verb].parameters && path[verb].parameters.length > 0){
								parameterMap[pathString+verb] = new Object();
								parameterMap[pathString+verb].body = new Array();
								parameterMap[pathString+verb].query = new Array();
								parameterMap[pathString+verb].path = new Array();
                                Promise.all(path[verb].parameters.map((parameter) => {
                                    return new Promise((resolve, reject) => {
                                        if(parameter.in === 'body' && parameter.schema && useJsonSchemas()){
                                                resolveSchema(parameter.schema).then((esq) => {
                                                    parameterMap[pathString+verb].body.push(esq);
                                                    resolve(true);
                                                });
                                        } else if(parameter.in === 'query' && parameter.type !== 'array'){
											let stringOrInt = {"type": "object", "properties": {"val": { "type": parameter.type }},"required": ["val"]};
											resolveSchema(stringOrInt).then((esq) => {
												parameterMap[pathString+verb].query.push({name:parameter.name,val:esq.val});
												resolve(true);
											});
										} else if(parameter.in === 'query' && parameter.type === 'array' && parameter.items && parameter.collectionFormat && parameter.collectionFormat === 'multi'){
											let stringOrInt = {"type": "object", "properties": {"val": { "type": parameter.items.type }},"required": ["val"]};
											resolveSchema(stringOrInt).then((esq) => {
												parameterMap[pathString+verb].query.push({name:parameter.name,val:esq.val});
												parameterMap[pathString+verb].query.push({name:parameter.name,val:esq.val});
												resolve(true);
											});
										} else if(parameter.in === 'path' && parameter.type !== 'array'){
											let stringOrInt = {"type": "object", "properties": {"val": { "type": parameter.type }},"required": ["val"]};
											resolveSchema(stringOrInt).then((esq) => {
												parameterMap[pathString+verb].path.push({name:parameter.name,val:esq.val});
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
					
					fsy.copySync(this.templatePath('tests'), this.promptAnswers.name + '/tests');
					let replacePathParams = (valArray, path) => {
						for(let val in valArray){
							path = path.replace(new RegExp('{'+valArray[val].name+'}','g'),valArray[val].val);
						}
						return path;
					};
                    this.fs.copyTpl(
                        this.templatePath('sampleFeature.feature'),
                        this.destinationPath(this.promptAnswers.name+'/tests/features/sampleFeature.feature'),
                        {api : this.apiDereferenced, parameterMap : parameterMap, replacePathParams: replacePathParams}
                    );
                    this.fs.commit(()=>{});
                    resolve(true);
                });
            });
        }
    }
    
    async publishApi(){
		this.log(chalk.yellow('Test templates rendered!'));
		if(this.promptAnswers.publishApi){
		this.log(chalk.yellow('Deploying API Proxy bundle...'));
			var opts = {
				organization: this.promptAnswers.edgeOrg,
				username: this.promptAnswers.edgeUsername,
				password: this.promptAnswers.edgePassword,
				environments: 'test',
				api:this.promptAnswers.name,
				directory:'./'+this.promptAnswers.name,
				debug: false
			}
			
			await sdk.deployProxy(opts);
		}
    }
	
	testApi(){
		this.log(chalk.yellow('API Proxy bundle deployed!'));
		if(this.promptAnswers.publishApi){
			this.log(chalk.yellow('Running test scenarios...'));
			execSync('cd '+this.promptAnswers.name+'/tests && npm install');
			let result = execSync( './node_modules/.bin/'+(isWin ? 'cucumberjs.cmd' : 'cucumber.js')+' ./features --world-parameters \'{"proxyEndpoint":"'+this.promptAnswers.edgeOrg+'-test.apigee.net'+this.basePath+'"}\'',
			{cwd:'./'+this.promptAnswers.name+'/tests'});
			this.log(result.toString('utf8'));
		}
	}
};