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
	validate : (input) => {
        let validated = SwaggerParser.validate(input+'.yaml');
        return true;
	    //return this.fs.exists(input+'.yaml') ? true : 'You must provide an existing OpenAPI spec (yaml file in working directory)';
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
    
    validate() {
    return new Promise((resolve, reject) => {
      if (this.isValidDereference && this.api) {
        return resolve(this.api);
      }

      this.swaggerParser.validate(this.swaggerFilepath)
        .then((api) => {
          this.isValidDereference = !!(this.api = api);

          resolve(this.api);
        })
        .catch((error) => {
          this.isValidDereference = false;

          tracer.warn(`Api is invalid: ${error.message}`);

          reject(error);
        });
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
	    execSync('cp -r '+this.promptAnswers.name+'/node '+this.promptAnswers.name+'/apiproxy/resources/');
	    var setMockScriptTargetXslt = this.fs.read(this.templatePath('set_mock_script_target.xslt'));
	    var stylesheet = libxslt.parse(setMockScriptTargetXslt);
	    var srcDocument = this.fs.read(this.promptAnswers.name + '/apiproxy/targets/default.xml')
	    var result = stylesheet.apply(srcDocument);
	    this.fs.write(this.promptAnswers.name + '/apiproxy/targets/default.xml', result);
	    this.fs.commit(()=>{});
	}
    }
/*
    createTests(){
	let nativeObject = await SwaggerParser.dereference(this.promptAnswers.name+'.yaml');
        var mockConfig = {};
	mockConfig.mockDirectory = './mock';
	mockConfig.quiet = false;
	mockConfig.port = '8000';
	mockConfig.latency = 50;
	mockConfig.logRequestHeaders = false;
	var webServices = {};
	
	
    }*/

    publishApi(){
	execSync('cp -rf '+this.templatePath('tests')+' '+this.promptAnswers.name+'/');
	if(this.promptAnswers.publishApi){
	        this.spawnCommandSync('mvn',
	                              ['-f',this.promptAnswers.name+'/pom.xml','install', '-Ptest', '-Dusername='+this.promptAnswers.edgeUsername, '-Dpassword='+this.promptAnswers.edgePassword, '-Dorg=gonzalezruben-eval']);
	}
    }
};
