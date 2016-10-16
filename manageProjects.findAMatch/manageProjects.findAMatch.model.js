(function() {
	'use strict';

	angular
		.module('app.projects')
		.factory('manageProjectsFindAMatchModel', manageProjectsFindAMatchModel);
	/* @ngInject */
	function manageProjectsFindAMatchModel() {

		var service = {
			user: {},
			periods: {},
			skillIds: []
		};

		return service;
	}
})();





