Feature:
	As an API consumer I should be able to call an available resource.
    <% for (let path in api.paths){ %>
    <% for (let verb in api.paths[path]){ %>
    <% if (verb === 'GET' || verb === 'POST' || verb === 'PUT'){ %>
    Scenario: Should get a successful response from a <%- verb %> transaction on <%- path %>
        
    <% } %>
    <% } %>
    <% } %>