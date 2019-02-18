Feature:
	As an API consumer I should be able to call an available resource.
    <% for (let path in api.paths){ %>
    <% for (let verb in api.paths[path]){ %>
    <% if (verb.toUpperCase() === 'GET' || verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT' || verb.toUpperCase() === 'DELETE' || verb.toUpperCase() === 'PATCH'){ %>
        <% if(verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT' || verb.toUpperCase() === 'PATCH' || verb.toUpperCase() === 'DELETE'){%>
		<% if(parameterMap[path+verb] && parameterMap[path+verb].body.length > 0){ %>
		<% for (let body in parameterMap[path+verb].body){ %>
    Scenario: Should get a successful response from a <%- verb %> transaction on <%- path %>
        Given I set User-Agent header to apickli
        And I set Content-Type header to application/json
        And I set body to <%- JSON.stringify(body) %>
        
            When I <%- verb.toUpperCase() %><%= verb.toUpperCase() === 'POST' ? ' to' : '' %> <%- path %>
            <% if(api.paths[path][verb].responses){%>
            <% if(Object.keys(api.paths[path][verb].responses).includes('200')){%>
            Then response code should be 200
            <% } else if(Object.keys(api.paths[path][verb].responses).includes('201')) {%>
            Then response code should be 201
            <% } else if(Object.keys(api.paths[path][verb].responses).includes('204')) {%>
            Then response code should be 204
            <% } %>
            <% } %>
		<% } %>
		<% } %>
        <% } else if(verb.toUpperCase() === 'GET'){ %>
	Scenario: Should get a successful response from a <%- verb %> transaction on <%- path %>
        Given I set User-Agent header to apickli
		And I set Content-Type header to application/json
		<% if(parameterMap[path+verb] && parameterMap[path+verb].query.length > 0){ %>
		And I set query parameters to
		  | parameter | value |
		<% for (let qu in parameterMap[path+verb].query){ %>
		  | <%- parameterMap[path+verb].query[qu].name %> | <%- parameterMap[path+verb].query[qu].val %> |
		<% } %>
		<% } %>
		When I <%- verb.toUpperCase() %><%= verb.toUpperCase() === 'POST' ? ' to' : '' %> <%- path %>
            <% if(api.paths[path][verb].responses){%>
            <% if(Object.keys(api.paths[path][verb].responses).includes('200')){%>
            Then response code should be 200
            <% } else if(Object.keys(api.paths[path][verb].responses).includes('201')) {%>
            Then response code should be 201
            <% } else if(Object.keys(api.paths[path][verb].responses).includes('204')) {%>
            Then response code should be 204
            <% } %>
            <% } %>
		<% } %>
    <% } %>
    <% } %>
    <% } %>
