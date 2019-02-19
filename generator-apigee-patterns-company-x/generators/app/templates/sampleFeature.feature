Feature:
	As an API consumer I should be able to call an available resource.
    <%_ for (let path in api.paths){ -%>
    <%_ for (let verb in api.paths[path]){ -%>
    <%_ if (verb.toUpperCase() === 'GET' || verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT' || verb.toUpperCase() === 'DELETE' || verb.toUpperCase() === 'PATCH'){ -%>
        <%_ if(verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT' || verb.toUpperCase() === 'PATCH' || verb.toUpperCase() === 'DELETE'){-%>
		<%_ if(parameterMap[path+verb] && parameterMap[path+verb].body.length > 0){ -%>
		<%_ for (let body in parameterMap[path+verb].body){ -%>
    Scenario: Should get a successful response from a <%- verb.toUpperCase() %> transaction on <%- replacePathParams(parameterMap[path+verb].path, path) %>
        Given I set User-Agent header to apickli
        And I set Content-Type header to application/json
        And I set body to <%- JSON.stringify(body) %>
            When I <%- verb.toUpperCase() %><%= verb.toUpperCase() === 'POST' ? ' to' : '' %> <%- replacePathParams(parameterMap[path+verb].path, path) %>
            <%_ if(api.paths[path][verb].responses){-%>
            <%_ if(Object.keys(api.paths[path][verb].responses).includes('200')){-%>
            Then response code should be 200
            <%_ } else if(Object.keys(api.paths[path][verb].responses).includes('201')) {-%>
            Then response code should be 201
            <%_ } else if(Object.keys(api.paths[path][verb].responses).includes('204')) {-%>
            Then response code should be 204
            <%_ } -%>
            <%_ } -%>
		<% } -%>
		<% } -%>
        <%_ } else if(verb.toUpperCase() === 'GET'){ -%>
	Scenario: Should get a successful response from a <%- verb.toUpperCase() %> transaction on <%- replacePathParams(parameterMap[path+verb].path, path) %>
        Given I set User-Agent header to apickli
		And I set Content-Type header to application/json
		<%_ if(parameterMap[path+verb] && parameterMap[path+verb].query.length > 0){ -%>
		And I set query parameters to
		  | parameter | value |
		<%_ for (let qu in parameterMap[path+verb].query){ -%>
		  | <%- parameterMap[path+verb].query[qu].name -%> | <%- parameterMap[path+verb].query[qu].val -%> |
		<%_ } -%>
		<%_ } -%>
		When I <%- verb.toUpperCase() %><%= verb.toUpperCase() === 'POST' ? ' to' : '' %> <%- replacePathParams(parameterMap[path+verb].path, path) %>
            <%_ if(api.paths[path][verb].responses){ -%>
            <%_ if(Object.keys(api.paths[path][verb].responses).includes('200')){ -%>
        Then response code should be 200
            <%_ } else if(Object.keys(api.paths[path][verb].responses).includes('201')) { -%>
        Then response code should be 201
            <%_ } else if(Object.keys(api.paths[path][verb].responses).includes('204')) { -%>
        Then response code should be 204
            <%_ } -%>
            <%_ } -%>
		<% } -%>
    <% } -%>
    <% } -%>
    <% } -%>
