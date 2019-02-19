# Scaffolding Examples

These examples were designed to help you understand how an API first strategy can be realized through automation and templates applied on Apigee Edge artifacts.

## Prerequisites:
 * A stable node.js/npm local installation
 * Install the openapi2apigee tool with `npm i openapi2apigee -g`
 * An OpenAPI spec

## Apigee + Yeoman

This is a [Yeoman generator](https://www.npmjs.com/package/yeoman-generator). It provides a CLI tool that prompts the user for basic inputs and an OpenAPI spec in order to:
 * Create an Apigee API Proxy Bundle
 * Create a NodeJS Mock Target
 * Create basic Apickli Test Scenarios
 * Deploy the Apigee API Proxy Bundle
 * Test the new Proxy

### Prepare your Environment
 * Install Yeoman ([Here](http://yeoman.io/learning/) are the steps)
 * Run `npm link` to link the generator to your local env as described [here](http://yeoman.io/authoring/index.html)

### Test the generator
 * Execute the generator with `yo apigee-patterns-company-x` in the same directory as the existing OpenAPI spec
 * You'll be asked by Yeoman the Name of the API that you want to create (this name must match the file name of the spec minus the suffix .yaml e.g. `my-api` is the name and the file name is `my-api.yaml`)
 * Answer the rest of the prompts 

## Apigee + Ansible
### Prepare your Environment
 * Install Ansible ([Here](http://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html) are the steps)

### Test the playbook
 * Execute the generator. You'll have two options to play around and filter the execution of tasks:
   * `ansible-playbook -e "api_name=YOURAPINAME" ansible-apigee-patterns-company-x.yml` with this command you'll create a basic proxy from your spec. `YOURAPINAME` must match the file name of the spec minus the suffix .yaml e.g. `my-api` is the name and the file name is `my-api.yaml`.
   * `ansible-playbook -e "api_name=YOURAPINAME sec_pattern=B2B" ansible-apigee-patterns-company-x.yml --tags "sec"` with this command you'll enable the tasks for security patterns with the `sec` tag defined within its steps. Notice there's an extra environemnt variable needed and its value its mandatory to fill up templates successfully. 