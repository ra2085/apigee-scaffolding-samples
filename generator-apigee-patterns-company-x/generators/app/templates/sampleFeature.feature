Feature:
	As an API consumer I should be able to call an available resource.

    <% for (let path in api.paths){ %>
	Scenario: Should get a successful response from <%- path %>
		  	 Given I set User-Agent header to apickli
			       	 When I GET <%- path %>
				         Then response code should be 200
    <% } %>