(function () {
	'use strict';

	angular
		.module('app.projects')
		.controller('ProjectsFindAMatchController', ProjectsFindAMatchController);

	/* @ngInject */
	function ProjectsFindAMatchController(manageProjectsFindAMatchModel, events, companyModel, adminResource, enumService, logger, $stateParams, $state, $location, $anchorScroll, lodash) {
		var vm = this;

		vm.companyModel = companyModel;
		vm.manageProjectsFindAMatchModel = manageProjectsFindAMatchModel;

		vm.search = search();
		vm.period = period();
		vm.build = build();
		vm.helpers = helpers();
		vm.compare = compare();
		vm.assign = assign;
		vm.logout = logout;

		vm.fetched = {
			selectedProject: {},
			recommendedUsers: ""
		};

		vm.searchSettings = {
			skillId: "",
			skillLabel: "",
			startDate: "",
			endDate: "",
			periods: [
				{
					startDate: "",
					endDate: ""
				}
			],
			// Used with vm.searchSettings.periods
			// API needs YYYY-MM-DD format, and date pickers needs javascript Date format.
			// vm.searchSettings.periodLookup saves the javascript Date format parallel with vm.searchSettings.periods
			periodLookup: [{
				// startDate: "",
				// endDate: ""
			}]
		};

		vm.projectDetails = {
			// projectName: "",
			// startDate: "",
			// endDate: "",
			// skills: [{
			// 		id: "",
			// 		label: ""
			// }]
		};

		vm.selectedEmployee = {

			// id: "",
			// fullName: "",
			// avatarUrl: "",
			// jobTitle: "",
			// projects: [
			// 	{
			// 		projectName: "",
			// 		startDate: "",
			// 		endDate: "",
			// 		startDateLookup: "",
			// 		endDateLookup: "",
			// 		overlaps: "" 			//Boolean
			// 	}
			// ],
			// 	rating: "",
			// 	skills: [
			// 		{
			// 			projectHas: "",
			//			checked: "",
			// 			skillId: "",
			// 			skillLabel: "",
			// 			experienceLevelLabel: "",
			//			experienceLevel: "",
			// 			subSkills: [
			// 				{
			// 					id: "",
			// 					label: ""
			// 				}
			// 			]
			// 		}
			// 	]
		};

		vm.unselectedEmployees = [
			// {
			//  id: "",
			// 	fullName: "",
			//	avatarUrl: "",
			// 	jobTitle: "",
			// 	projects: [
			// 		{
			// 			projectName: "",
			// 			startDate: "",
			// 			endDate: "",
			// 			startDateLookup: "",
			// 			endDateLookup: "",
			// 			overlaps: "" 			//Boolean
			// 		}
			// 	],
			// 	rating: ""
			// }
		];

		//Search toggle window
		vm.headerSearchToggle = false;
		vm.skillListDropdown = [];

		//Data helpers
		vm.stateParamProjectId = "";
		vm.selectedEmployeeIdUse = " "; //Reason for space is to not be the same as any vm.unselected[index].id Object that is ""
		vm.selectedSkillsLookup = [];

		//Periods
		vm.leftDateCounter = 0;
		vm.rightDateCounter = 1;
		vm.overlap = false;

		//Extra helpers
		vm.errorMessage = "";
		vm.projectContentLoaded = false;

		activate();

		function activate() {
			vm.companyModel.init(populate);
		}

		function populate() {
			if($stateParams.projectId) {
				vm.stateParamProjectId = $stateParams.projectId;
				vm.fetched.selectedProject = vm.companyModel.getCompanyProjectById(vm.stateParamProjectId);

				console.log("vm.fetched.selectedProject");
				console.log(vm.fetched.selectedProject);

				vm.build.projectDetailsBlock(vm.fetched.selectedProject);
				vm.search.populateSkillDropdown(vm.stateParamProjectId);
				vm.search.init();
			} else {
				$state.go("manage.projects");
				console.log("Error in manageProjects.findAMatch.controller: did not find a projectId");
			}
		}

		function search() {
			return {

				init: function () {
					if (vm.stateParamProjectId) {

						vm.searchSettings = {
							skillLabel: "All skills",
							startDate: moment(vm.fetched.selectedProject.startDate).toDate(),
							endDate: moment(vm.fetched.selectedProject.endDate).toDate()
						};
						vm.searchSettings.periodLookup[0] = {
							startDate: moment(vm.fetched.selectedProject.startDate).toDate(),
							endDate: moment(vm.fetched.selectedProject.endDate).toDate()
						};
						vm.searchSettings.periods[0] = {
							startDate: moment(vm.fetched.selectedProject.startDate).format("YYYY-MM-DD"),
							endDate: moment(vm.fetched.selectedProject.endDate).format("YYYY-MM-DD")
						};

						adminResource.projectFindAMatch(
							vm.stateParamProjectId ,
							vm.searchSettings.skillId,
							vm.fetched.selectedProject.startDate,
							vm.fetched.selectedProject.endDate,
							null,
							function (result) {
								vm.fetched.recommendedUsers = result;
								vm.build.unselectedEmployees(vm.fetched.recommendedUsers);
								vm.projectContentLoaded = true;
							},
							function (error) {
								logger.error(error.message, "", "ERROR");
							}
						);
					} else {
						$state.go('manage.projects');
					}
				},

				populateSkillDropdown: function(projectId) {
					vm.skillListDropdown = vm.companyModel.getCompanyProjectSkillsById(projectId);
				},

				selectSkill: function(skill) {

					if (skill == null) {
						vm.searchSettings.skillId = null;
						vm.searchSettings.skillLabel = "All skills";
						return;
					}

					vm.searchSettings = {
						skillId: skill.id,
						skillLabel: skill.label
					}
				},

				setDate: function(identifier, index, dateObject) {
					if (identifier == "start") {
						vm.searchSettings.periods[index].startDate = moment(dateObject).format("YYYY-MM-DD");
					} else if (identifier == "end") {
						vm.searchSettings.periods[index].endDate = moment(dateObject).format("YYYY-MM-DD");
					} else {
						console.log("Error with addProject.setDate function");
					}
				},

				addPeriod: function() {

					var foundEmptyDateField = false;

					lodash.forEach(
						vm.searchSettings.periods,
						function (period) {
							if (!period.startDate || !period.endDate) {
								foundEmptyDateField = true;
								return false;
							}
						}
					);

					if (foundEmptyDateField == false) {
						vm.searchSettings.periods.push( {} );
						vm.searchSettings.periodLookup.push( {} );
					}
				},

				removePeriod: function(index) {

					if (vm.searchSettings.periods.length != 1) {
						vm.searchSettings.periods.splice(index, 1);
						vm.searchSettings.periodLookup.splice(index, 1);
					} else {
						vm.searchSettings.periods[index] = {
							startDate: "",
							endDate: ""
						};
						vm.searchSettings.periodLookup[index] = {
							startDate: "",
							endDate: ""
						};
					}

					vm.search.checkIfEmptyDateFieldsFound();
				},

				changedPeriod: function(identifier, index, dateObject) {
					vm.search.setDate(identifier, index, dateObject);
				},

				checkIfEmptyDateFieldsFound: function() {

					var found = false;

					lodash.forEach(vm.searchSettings.periods,
						function (period) {
							if (!period.startDate || !period.endDate) {
								found = true;
								vm.errorMessage = "Please select a valid date range.";
								return false;
							} else {
								vm.errorMessage = "";
							}
						}
					);

					return found;
				},

				checkIfFromToDatesValid: function() {

					var startDateBeforeEndDateFound = false;
					var isEndDateSameOrBeforeStartDate = false;
					var datepickerBlock = "";	//Holds class references

					lodash.forEach(vm.searchSettings.periods,
						function (period, index) {

							isEndDateSameOrBeforeStartDate = moment(period.endDate).isSameOrBefore(period.startDate);
							if(isEndDateSameOrBeforeStartDate == true) {
								startDateBeforeEndDateFound = true;
								datepickerBlock = document.getElementsByClassName("period-row");
								for (var i = 0; i < datepickerBlock.length; i++) {
									datepickerBlock[index].className += " md-datepicker-invalid";
								}
							} else {
								datepickerBlock = document.getElementsByClassName("period-row");
								for (var i = 0; i < datepickerBlock.length; i++) {
									datepickerBlock[index].className = "period-row";
								}
							}
						}
					);

					if (startDateBeforeEndDateFound == true) {
						vm.errorMessage = "Please enter a valid date range";
						return false;
					} else {
						return true;
					}

				},

				go: function() {

					//TODO: CHECK VALIDATION LOGIC

					if (vm.search.checkIfEmptyDateFieldsFound() == true) {
						vm.errorMessage = "Please complete or remove empty date fields";
						return;
					}

					if (vm.search.checkIfFromToDatesValid() == false) {
						vm.errorMessage = "Please enter a valid date range";
						return;
					}

					if (vm.period.checkIfOverlap() == true) {
						vm.errorMessage = "Please select valid date ranges, dates overlap.";
						return;
					}

					vm.selectedEmployee = {};
					vm.selectedEmployeeIdUse = "";
					vm.unselectedEmployees = [];

					vm.projectContentLoaded = false; 	//Enable loading icon

					var startDateArray = [];
					var endDateArray = [];

					lodash.forEach(
						vm.searchSettings.periods,
						function (period) {
							startDateArray.push(period.startDate);
							endDateArray.push(period.endDate);
						}
					);

					adminResource.projectFindAMatch(
						vm.stateParamProjectId ,
						vm.searchSettings.skillId,
						startDateArray,
						endDateArray,
						null,
						function (result) {

							vm.fetched.recommendedUsers = result;

							vm.headerSearchToggle = false;									//Close search settings
							vm.build.unselectedEmployees(vm.fetched.recommendedUsers);
							vm.projectContentLoaded = true;									//Hides loading icon
							vm.helpers.scrollToSuggestedEmployeesList();
						},
						function (error) {
							logger.error(error.message, "", "ERROR");
						}
					);

				}
			};
		}

		function period() {
			return {

				checkIfOverlap: function() {

					vm.datesOverlap = false;
					var periodsCollection = vm.searchSettings.periods;
					var periodBlocks = document.getElementsByClassName("period-row");

					var blocki;
					var blockj;

					// Clear all previously overlapped first before checking again.
					if (vm.overlaps) {
						for (var i = 0; i < vm.searchSettings.periods.length; i++) {
							periodBlocks[i].className = 'period-row';
						}
						vm.overlaps = false;
					}

					if (vm.searchSettings.periods.length == 2) {
						vm.overlaps = moment.range(periodsCollection[0].startDate, periodsCollection[0].endDate).overlaps(moment.range(periodsCollection[1].startDate, periodsCollection[1].endDate));
						if (vm.overlaps) {
							blocki = 0;
							blockj = 1;
						}
					} else if(vm.searchSettings.periods.length > 2) {

						for (var i = 0; i < vm.searchSettings.periods.length; i++) {
							for (var j = i + 1; j < vm.searchSettings.periods.length; j++) {
								vm.overlaps = moment.range(periodsCollection[i].startDate, periodsCollection[i].endDate).overlaps(moment.range(periodsCollection[j].startDate, periodsCollection[j].endDate));
								if (vm.overlaps) {
									blocki = i;
									blockj = j;
									break;
								}
							}
							if (vm.overlaps) {
								break;
							}
						}
					} else {
						return;
					}

					if(vm.overlaps == true) {
						periodBlocks[blocki].className += ' period-overlaps';
						periodBlocks[blockj].className += ' period-overlaps';
						vm.errorMessage = "Please select valid date range, dates overlap.";
					}

					return vm.overlaps;
				},

				//Disables datepicker input fields as they are initialized according to their pattern
				setInputDisabledLeft: function(index) {
					var elements = document.getElementsByClassName('md-datepicker-input');
					elements[index + vm.leftDateCounter].disabled = true;
					vm.leftDateCounter++;
				},

				//Disables datepicker input fields as they are initialized according to their pattern
				setInputDisabledRight: function(index) {
					var elements = document.getElementsByClassName('md-datepicker-input');
					elements[index + vm.leftDateCounter].disabled = true;
					vm.rightDateCounter++;
				}
			}
		}

		function build() {
			return {
				
				projectDetailsBlock: function(project) {

					var formattedStartDate = moment(vm.fetched.selectedProject.startDate).format("DD MMM YYYY");
					var formattedEndDate = moment(vm.fetched.selectedProject.endDate).format("DD MMM YYYY");
					var skillArray = [];

					lodash.forEach(
						vm.fetched.selectedProject.skills,
						function (projectSkill) {
							var skill = vm.companyModel.getCompanySkillById(projectSkill.skillId);
							skillArray.push(
								{
									id: skill.id,
									label: skill.label
								}
							);
						}
					);

					vm.projectDetails = {
						projectName: vm.fetched.selectedProject.label,
						startDate: formattedStartDate,
						endDate: formattedEndDate,
						skills: skillArray
					};
				},

				matchCompare: function(employee) {

					vm.selectedEmployee.skills = [];

					var companyUser = vm.companyModel.getCompanyUserById(employee.id);
					var projectUser = vm.companyModel.getCompanyProjectUserById(vm.stateParamProjectId, employee.id);

					console.log(companyUser);

					var fullCompanySkill = {};
					var tempSkill = {
						projectHas: false,
						checked: false,
						skillId: "",
						skillLabel: "",
						experienceLevelLabel: "",
						experienceLevel: "",
						subSkills: []
					};

					var tempUserSubSkills = [];

					//Helpers
					var projectUserAlreadyAddedToProjectForASkill = false;
					var projectHasSkill = false;
					var tempCheckStatus = false;


					lodash.forEach(companyUser.companyInfo.userSkills,
						function (companyUserSkill) {

							var tempUserSubSkills = [];

							projectHasSkill = false;
							tempCheckStatus = false;

							// fullCompanySkill is the full skill object related to the companyUserSkill which is only a skillId)
							fullCompanySkill = vm.companyModel.getCompanySkillById(companyUserSkill.skillId);

							// Resetting for next loop
							tempSkill = {
								projectHas: false,
								checked: false,
								skillId: "",
								skillLabel: "",
								experienceLevelLabel: "",
								experienceLevel: "",
								subSkills: []
							};

							lodash.forEach(vm.fetched.selectedProject.skills,
								function (projectSkill) {
									//Check if project has the user's skill
									if (projectSkill.skillId == fullCompanySkill.id) {
										projectHasSkill = true;
										return false;
									}

								}
							);

							//If already added to the company for another skill, then this will not be null
							if (projectUser) {
								lodash.forEach(projectUser.skillIds,
									function (projectUserSkillId) {
										
										if (projectUserSkillId == companyUserSkill.skillId) {
											projectUserAlreadyAddedToProjectForASkill = true;
											tempCheckStatus = true;
											return false;
										}
									}
								);
							}

							lodash.forEach(fullCompanySkill.subSkills,
								function (fullCompanySkillSubSkill) {

									lodash.forEach(companyUserSkill.subSkillIds,
										function (companyUserSkillSubSkillId) {

											if (companyUserSkillSubSkillId == fullCompanySkillSubSkill.id) {
												tempUserSubSkills.push(fullCompanySkillSubSkill.label);
											}
										}
									);
								}
							);

							tempSkill = {
								projectHas: projectHasSkill,
								checked: tempCheckStatus,
								skillId: fullCompanySkill.id,
								skillLabel: fullCompanySkill.label,
								experienceLevelLabel: enumService.findEnumLabelByValue(companyUserSkill.experience, "skillExperienceList"),
								experienceLevel: companyUserSkill.experience,
								// subSkills: fullCompanySkill.subSkills
								subSkills: tempUserSubSkills
							};

							vm.selectedEmployee.skills.push(tempSkill);
						}
					);

					console.log("vm.selectedEmployee YAY");
					console.log(vm.selectedEmployee);

				},

				unselectedEmployees: function(recommendedUsers) {

					var usersArray = [];
					var currentLoopUser = {
						fullName: "",
						jobTitle: "",
						projects: [
						// 	{
						// 		projectName: "",
						// 		startDate: "",
						// 		endDate: "",
						// 		startDateLookup: "",
						// 		endDateLookup: "",
						// 		overlaps: "" 			//Boolean
						// 	}
						],
						rating: ""
					};

					var userFoundInProject = false;

					lodash.forEach(recommendedUsers,
						function (recommendedUser) {

							currentLoopUser.id = recommendedUser.userResponse.id;
							currentLoopUser.fullName = recommendedUser.userResponse.firstName + " " + recommendedUser.userResponse.lastName;
							currentLoopUser.avatarUrl = recommendedUser.userResponse.avatarUrl;
							currentLoopUser.jobTitle = recommendedUser.userResponse.companyInfo.jobTitle;

							// if(!recommendedUser.userResponse.companyInfo.jobTitle) {
							// 	return;
							// }

							// Get Company Project Info By UserId
							lodash.forEach(vm.companyModel.data.projects,
								function (project) {

									userFoundInProject = false;

									lodash.forEach(project.users,
										function (projectUserObject) {

											if (projectUserObject.user.id == recommendedUser.userResponse.id) {
												userFoundInProject = true;
												return false;
											}
										}
									);

									if (userFoundInProject) {
										currentLoopUser.projects.push(
											{
												projectName: project.label,
												startDate: project.startDate,
												endDate: project.endDate,
												startDateLookup: moment(project.startDate).format("DD MMM YYYY"),
												endDateLookup: moment(project.endDate).format("DD MMM YYYY"),
												overlaps: vm.helpers.checkIfSelectedProjectDatesOverlapsUserProjectsDates(moment(vm.projectDetails.startDate).toDate(), moment(vm.projectDetails.endDate).toDate(), moment(project.startDate).toDate(), moment(project.endDate).toDate())
											}
										)
									}
								}
							);

							currentLoopUser.rating = Math.round(recommendedUser.rating * 100);

							usersArray.push(currentLoopUser);

							currentLoopUser = {
								fullName: "",
								jobTitle: "",
								projects: [],
								rating: ""
							};
						}
					);

					vm.unselectedEmployees = usersArray;
				},

				skillIdsArrayForAPI: function() {

					var skillIdsArray = [];

					lodash.forEach(vm.selectedEmployee.skills,
						function (selectedEmployeeSkill) {
							if (selectedEmployeeSkill.checked == true) {
								skillIdsArray.push(selectedEmployeeSkill.skillId);
							}
						}
					);

					return skillIdsArray;

				}
			}
		}

		function helpers() {
			return {

				checkIfSelectedProjectDatesOverlapsUserProjectsDates: function(selectedProjectStartDate, selectedProjectEndDate, userProjectStartDate, userProjectEndDate) {
					return moment.range(selectedProjectStartDate, selectedProjectEndDate).overlaps(moment.range(userProjectStartDate, userProjectEndDate));
				},

				checkIfProjectHasSkill: function(skill) {

					if (skill.projectHas) {
						return 'highlight-green';
					} else {
						return 'highlight-red';
					}
				},

				scrollToCompareBlock: function() {
					$location.hash('top-block');
					$anchorScroll();
				},

				scrollToSuggestedEmployeesList: function() {
					$location.hash('suggested-employees-list');
					$anchorScroll();
				}
			}
		}

		function compare() {

			return {

				employee: function(employee) {

					console.log("compare: employee");
					console.log(employee);
					vm.selectedEmployeeIdUse = employee.id;
					vm.selectedEmployee = employee;

					var profilePictureCompare = document.getElementsByClassName("profile-picture");
					profilePictureCompare[0].style.backgroundImage = "url('" + employee.avatarUrl + "')";

					if (!vm.selectedEmployee.skills) {
						vm.build.matchCompare(vm.selectedEmployee);
					}
				},

				checkIfAnyCheckboxSelected: function() {

					var foundChecked = false;

					lodash.forEach(vm.selectedEmployee.skills,
						function (skill) {

							if (skill.checked == true) {
								foundChecked = true;
								return false;
							}
						}
					);

					return foundChecked;
				}

			}
		}

		function assign() {

			var projectUser = vm.companyModel.getCompanyProjectUserById(vm.stateParamProjectId, vm.selectedEmployee.id);
			var projectIdForUser = projectUser.id;

			var companyUser = vm.companyModel.getCompanyUserById(vm.selectedEmployee.id);

			var skillIdsArray = vm.build.skillIdsArrayForAPI();


			vm.manageProjectsFindAMatchModel = {
				user: companyUser,
				periods: vm.searchSettings.periods,
				skillIds: skillIdsArray
			};

			adminResource.updateProjectEmployee(
				vm.fetched.selectedProject.id,
				projectUser.id,
				vm.manageProjectsFindAMatchModel,
				function(result) {
					companyModel.data = result;
					logger.success("", "", "SUCCESS");
					$state.go('manage.projects', {projectId:vm.fetched.selectedProject.id});
				},
				function(error) {
					logger.error(error.message, "", "ERROR");
				}
			);
		}

		function logout() {
			events.logout();
		}
	}
})();