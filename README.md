# Scaffolding Examples
These are basic implementations that will help you to understand, compare, and try to match capabilities with your existing dev environment characteristics, constraints, and needs.

## Prerequisites:
 * A stable node.js/npm local instalation (can be done easily with a Docker image or an Ansible playbook)
 * Install the openapi2apigee plugin with `npm i openapi2apigee`
 * An OpenAPI spec (this is needed from an "API first strategy" point of view)

## Apigee + Yeoman
### Prepare your Environment
 * Install Yeoman ([Here](http://yeoman.io/learning/) are the steps)
 * Run `npm link` to link the generator to your local env as described [here](http://yeoman.io/authoring/index.html)

### Test the generator
 * Execute the generator with `yo apigee-patterns-company-x` in a directory that contains an OpenAPI spec in a YAML file.
 * You'll be asked by Yeoman the Name of the API that you want o create (this name must match the file name of the spec minus the suffix .yaml e.g. `my-api` is the name and the file name is `my-api.yaml`)

## Apigee + Ansible
### Prepare your Environment
 * Install Ansible ([Here](http://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html) are the steps)

### Test the playbook
 * Execute the generator. You'll have two options to play around and filter the execution of tasks:
   * `ansible-playbook -e "api_name=YOURAPINAME" ansible-apigee-patterns-company-x.yml` with this command you'll create a basic proxy from your spec. `YOURAPINAME` must match the file name of the spec minus the suffix .yaml e.g. `my-api` is the name and the file name is `my-api.yaml`.
   * `ansible-playbook -e "api_name=YOURAPINAME sec_pattern=B2B" ansible-apigee-patterns-company-x.yml --tags "sec"` with this command you'll enable the tasks for security patterns with the `sec` tag defined within its steps. Notice there's an extra environemnt variable needed and its value its mandatory to fill up templates successfully. 