var tester = (function () {

	var tester
		, data = {};

	function create(elem) {
		return tester = wizard.create(elem, {
			"views": {

				"start": {
					"heading": "The Start Of Something Good %apa%"
					, "content": {"uri": "wizard-step/1"}
					, "setup": function () {
						var wizard = this;
						wizard.req.setAttribute("apa", "hee-hee!");
					}
					, "next": function () {
						var wizard = this
							, nick = wizard.req.getParameter("nick");
						if (!nick) {
							alert("give name dammit!");
							return null;
						}
						wizard.req.setAttribute("nick",  nick);
						data.nick = nick;
						return "step2";
					}
				}
				, "step2": {
					"heading": "The Second View, %nick%"
					, "content": {"uri": "wizard-step/2"}
					, "next": function () {
						var wizard = this
							, animal = wizard.req.getParameter("animal");
						if (!animal) {
							alert("No animal? You have to start over, mf!");
							return "start";
						}
						wizard.req.setAttribute("animal", animal);
						data.animal = animal;
						return "step2.5";
					}
				}
				, "step2.5": {
					"heading": "The 2.5 View, %nick%"
					, "content": "<p>En mellanvy utan mening</p>"
					, "setup": function () {
						this.req.setAttribute("nick", data.nick);
					}
					, "next": function () {
						return "step3";
					}
					, "prev": function () {
						this.req.setAttribute("nick", "baaack!");
						return "step2";
					}
				}
				, "step3": {
					"heading": "THE END"
					, "content": {"uri": "/wizard-step/3"}
					, "setup": function () {
						var wizard = this;
						wizard.req.setAttribute("nick", data.nick);
					}
					, "next": function () {
						var wizard = this;
						alert("It is THE END!  You said: "+wizard.req.getParameter("fruit"));
						wizard.req.setAttribute("nick", data.nick);
							wizard.req.setAttribute("animal", data.animal);
							wizard.req.setAttribute("fruit", wizard.req.getParameter("fruit"));
						return "summary";
					}
				}

				, "summary": {
						"heading": "Summary for %nick%"
						, "content": [
							"<ul>"
							, " <li>Frukt: %fruit%</li>"
							, " <li>Djur: %animal%</li>"
							, "</ul>"
						].join("\n")
					}
				}
		});
	}

	return {
		"create": function (elem) {
			return create(elem);
		}
	};
})();