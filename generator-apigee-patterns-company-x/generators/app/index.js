var Generator = require('yeoman-generator');
var chalk = require('chalk');

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
      message : 'Your API name  ',
      default : this.appname // Default to current folder name. This should also be your openAPI file name.
    }, {
        type: 'list',
        name: "security",
        message: "Which security pattern are you going to use?",
        choices: ['B2B','B2C']
    }]).then((answers) => {
        this.spawnCommandSync('openapi2apigee', 
            ['generateApi', answers.name, '-s', answers.name+'.yaml', '-d', '.']);
        this.fs.copyTpl(
            this.templatePath('flow-callout-OAuth.xml'),
            this.destinationPath(answers.name+'/apiproxy/policies/flow-callout-OAuth-'+answers.security+'.xml'),
            { security: answers.security }
        );
    });
    }
    
};
