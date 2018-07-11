Feature:
	As an API consumer I should be able to call an available resource.
<%- JSON.stringify(api, null, 4) %>
    <% for (let path in api.paths){ %>
    <% for (let verb in api.paths[path]){ %>
	Scenario: Should get a successful response from <%- path %>
		  	 Given I set User-Agent header to apickli
			 <% if(verb.toUpperCase() === 'POST' || verb.toUpperCase() === 'PUT'){%>
                         <% if(parameterMap.get(path+verb)){ %>
			 And I set Content-Type header to application/json
                         And I set body to <%- parameterMap.get(path+verb) %>
			 <% } %>
			 <% } %>
			       	 When I <%- JSON.stringify(api.paths[path][verb], null, 4) %>
    <% } %>
    <% } %>