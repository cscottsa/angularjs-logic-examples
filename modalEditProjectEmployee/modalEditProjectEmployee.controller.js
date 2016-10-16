(function () {
    'use strict';

    angular
        .module('app.widgets')
        .controller('modalEditProjectEmployeeController', modalEditProjectEmployeeController);

    /* @ngInject */
    function modalEditProjectEmployeeController($uibModalInstance, items, adminResource, companyModel, logger, lodash) {

        var vm = this;

        vm.close = close;
        vm.submit = submit;
        vm.dateToDateTime = dateToDateTime;
        vm.skill = skill();
        vm.period = period();
        vm.employee = employee();

        vm.companyModel = companyModel;

        vm.fetched = {
            selectedProject: items.project,
            selectedUserId: items.userId,
            projectDates: {
                startDate: moment(items.project.startDate).toDate(),
                endDate: moment(items.project.endDate).toDate()
            }
        };

        //TODO: Employee already booked for this period by 3 other Projects

        vm.editProjectEmployeeModel = {

            employee: {
                projectUserId: "",
                userFullName: "",		//This property is not required by API, using it to display Full Name in dropdown.
                user: "",
                skillIds: [],
                periods: [
                    // {
                    // 	startDate: "",
                    // 	endDate: ""
                    // }
                ]
            }
        };

        vm.employeeListDropdown = [];

        //The date pickers requires the date to be Date
        vm.periodLookup = [];

        //Skill Objects for ng-repeat
        vm.skillListCheckboxes = [];

        //Store skills checked status
        vm.selectedSkillsLookup = [];

        //User object of specefic user in a project
        vm.projectUserObject = [];


        vm.periodObject = function () {
            return {
                "startDate": "",
                "endDate": ""
            }
        };

        //Period vars
        vm.overlaps = false;
        vm.leftDateCounter = 0;
        vm.rightDateCounter = 1;
        vm.foundEmptyDateField = false;

        //Error message display
        vm.employeeAlreadyBooked = false;
        vm.datesOverlap = false;

        //Other
        vm.contentLoaded = false;

        vm.periodObject = function () {
            return {
                "startDate": "",
                "endDate": "",
                "available": true
            }
        };

        activate();

        function activate() {
            vm.companyModel.init(populate);

            // Disables all md-datepicker-input hack.. Library has no option to disable input fields.
            var cells = document.getElementsByClassName('md-datepicker-input');
            for (var i = 0; i < cells.length; i++) {
                cells[i].disabled = true;
            }
        }

        function populate() {
            vm.fetched.selectedProject = companyModel.getCompanyProjectById(items.project.id);

            vm.projectUserObject = vm.companyModel.getCompanyProjectUserById(vm.fetched.selectedProject.id, vm.fetched.selectedUserId);

            vm.editProjectEmployeeModel.employee = {
                projectUserId: vm.projectUserObject.id,
                userFullName: vm.projectUserObject.user.fullName,
                user: vm.projectUserObject.user
            };

            lodash.forEach(
                vm.projectUserObject.periods,
                function (period) {
                    vm.editProjectEmployeeModel.employee.periods.push(
                        {
                            startDate: period.startDate,
                            endDate: period.endDate,
                            available: true
                        }
                    );

                    vm.periodLookup.push(
                        {
                            startDate: moment(period.startDate).toDate(),
                            endDate: moment(period.endDate).toDate()
                        }
                    )
                }
            );

            vm.skill.populateCheckboxes();
            vm.contentLoaded = true;
        }

        function skill() {
            return {

                populateCheckboxes: function () {

                    var matchSkill = false;
                    var companySkill = "";
                    vm.skillListCheckboxes = [];
                    vm.selectedSkillsLookup = [];

                    lodash.forEach(
                        vm.fetched.selectedProject.skills,
                        function (projectSkill) {

                            matchSkill = false;
                            companySkill = vm.companyModel.getCompanySkillById(projectSkill.skillId);

                            if (companySkill) {

                                if (vm.skill.checkIfEmployeeHasSkill(projectSkill.skillId)) {
                                    vm.skillListCheckboxes.push({
                                        id: companySkill.id,
                                        label: companySkill.label
                                    });

                                    lodash.forEach(
                                        vm.projectUserObject.skillIds,
                                        function (projectUserSkillId) {

                                            if (projectUserSkillId == projectSkill.skillId) {
                                                vm.selectedSkillsLookup.push(
                                                    {
                                                        checked: true
                                                    }
                                                );
                                                matchSkill = true;
                                                return false;
                                            }
                                        }
                                    );

                                    if (matchSkill == false) {
                                        vm.selectedSkillsLookup.push(
                                            {
                                                checked: false
                                            }
                                        );
                                    }
                                }
                            }
                        }
                    );
                },

                checkIfEmployeeHasSkill: function (projectSkillId) {

                    var findSkillResponse = lodash.find(vm.editProjectEmployeeModel.employee.user.companyInfo.userSkills,
                        function (skill) {
                            return skill.skillId == projectSkillId;
                        }
                    );

                    return findSkillResponse;
                },

                checkIfEmployeeInProjectBySkillId: function (employeeId, skillId) {
                    var match = false;

                    lodash.forEach(vm.fetched.selectedProject.users,
                        function (projectUserObject) {

                            if (projectUserObject.user.id == employeeId) {
                                lodash.forEach(projectUserObject.skillIds,
                                    function (projectUserSkillId) {

                                        if (projectUserSkillId == skillId) {
                                            match = true;
                                            return false;
                                        }
                                    }
                                );
                            }

                            if (match == true) {
                                return false;
                            }
                        }
                    );
                    return match
                },

                checkIfAtLeastOneSkillChecked: function () {

                    var foundAtLeastOneSkillChecked = false;

                    lodash.forEach(
                        vm.selectedSkillsLookup,
                        function (checkIndex) {

                            if (checkIndex.checked == true) {
                                foundAtLeastOneSkillChecked = true;
                                return false;
                            }
                        }
                    );

                    return foundAtLeastOneSkillChecked;
                },

                //Using lookup to check if a checkbox is checked by index of ng-repeat
                //If a checkbox is checked, create new object and add skill id
                populateEmployeeSkillsOnSubmit: function () {

                    vm.editProjectEmployeeModel.employee.skillIds = [];

                    for (var i = 0; i < vm.selectedSkillsLookup.length; i++) {
                        if (vm.selectedSkillsLookup[i].checked == true) {
                            vm.editProjectEmployeeModel.employee.skillIds.push(vm.skillListCheckboxes[i].id);
                        }
                    }
                }
            }
        }

        function period() {
            return {

                add: function () {
                    vm.foundEmptyDateField = period().checkIfAnyEmptyDateFields();
                    vm.errorMessage = "";

                    if (vm.foundEmptyDateField == false) {
                        vm.editProjectEmployeeModel.employee.periods.push(new vm.periodObject());
                        vm.periodLookup.push(new vm.periodObject());
                    } else {
                        vm.errorMessage = "Cannot add another period while a date field is empty.";
                    }
                },

                remove: function (index) {
                    if (vm.editProjectEmployeeModel.employee.periods.length != 1) {
                        vm.leftDateCounter--;
                        vm.rightDateCounter--;
                        vm.editProjectEmployeeModel.employee.periods.splice(index, 1);
                        vm.periodLookup.splice(index, 1);
                    } else {
                        vm.leftDateCounter = 0;
                        vm.rightDateCounter = 1;
                        vm.editProjectEmployeeModel.employee.periods[index] = {
                            startDate: "",
                            endDate: ""
                        }
                        vm.periodLookup[index] = {
                            startDate: "",
                            endDate: "";
                        }
                    }
                },

                setDate: function (identifier, index, dateObject) {
                    if (identifier == "start") {
                        vm.editProjectEmployeeModel.employee.periods[index].startDate = moment(dateObject).format("YYYY-MM-DD");
                    } else if (identifier == "end") {
                        vm.editProjectEmployeeModel.employee.periods[index].endDate = moment(dateObject).format("YYYY-MM-DD");
                    } else {
                        console.log("Error with addProject.setDate function, incorrect identifier provided: " + identifier);
                    }

                    checkUserAvailabilityIfPossible(vm.editProjectEmployeeModel.employee.periods[index]);
                },

                //Check if any date fields are empty
                checkIfAnyEmptyDateFields: function () {

                    var emptyDateFieldFound = false;

                    lodash.forEach(
                        vm.editProjectEmployeeModel.employee.periods,
                        function (period, index) {
                            if (period.startDate == "" || period.endDate == "") {
                                emptyDateFieldFound = true;
                                return false;
                            }
                        }
                    );

                    return emptyDateFieldFound;
                },

                checkIfDatesOverlap: function () {

                    vm.datesOverlap = false;
                    var periodsCollection = vm.editProjectEmployeeModel.employee.periods;
                    var periodBlocks = document.getElementsByClassName("period-block");

                    var blocki;
                    var blockj;

                    // Resets overlap status classes to default if overlap already true
                    if (vm.overlaps) {
                        for (var i = 0; i < vm.editProjectEmployeeModel.employee.periods.length; i++) {
                            periodBlocks[i].className = 'period-block';
                        }
                        vm.overlaps = false;
                    }

                    if (vm.editProjectEmployeeModel.employee.periods.length == 2) {
                        vm.overlaps = moment.range(periodsCollection[0].startDate, periodsCollection[0].endDate).overlaps(moment.range(periodsCollection[1].startDate, periodsCollection[1].endDate));
                        if (vm.overlaps) {
                            blocki = 0;
                            blockj = 1;
                        }
                    } else if (vm.editProjectEmployeeModel.employee.periods.length > 2) {

                        for (var i = 0; i < vm.editProjectEmployeeModel.employee.periods.length; i++) {
                            for (var j = i + 1; j < vm.editProjectEmployeeModel.employee.periods.length; j++) {
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

                    if (vm.overlaps == true) {
                        periodBlocks[blocki].className += ' period-overlaps';
                        periodBlocks[blockj].className += ' period-overlaps';
                        vm.datesOverlap = true;
                    }

                    return vm.datesOverlap;
                },

                //Disables datepicker input fields as they are initialized according to their pattern
                setInputDisabledLeft: function (index) {
                    var elements = document.getElementsByClassName('md-datepicker-input');
                    elements[index + vm.leftDateCounter].disabled = true;
                    vm.leftDateCounter++;
                },

                //Disables datepicker input fields as they are initialized according to their pattern
                setInputDisabledRight: function (index) {
                    var elements = document.getElementsByClassName('md-datepicker-input');
                    elements[index + vm.leftDateCounter].disabled = true;
                    vm.rightDateCounter++;
                }
            }
        }

        function checkUserAvailabilityIfPossible(period) {
            if (period.startDate && period.endDate) {
                adminResource.getProjectUserAvailability(
                    vm.editProjectEmployeeModel.employee.user.id,
                    period.startDate + "|" + period.endDate,
                    function (result) {
                        console.log(result);
                        period.available = (result.numProjects < result.maxProjects);
                    },
                    function (error) {
                        console.log(error);
                    });
            }
        }

        function employee() {
            return {

                checkIfEmployeeInProjectById: function (employeeId) {
                    var match = false;

                    lodash.forEach(
                        vm.fetched.selectedProject.users,
                        function (projectUserObject) {
                            if (projectUserObject.user.id == employeeId) {
                                match = true
                                return false;
                            }
                        }
                    );
                    return match
                },

                selectDropdown: function (employee) {

                    //If periods already populated, clear it upon new employee selected
                    if (vm.editProjectEmployeeModel.employee.periods.length > 1) {
                        vm.editProjectEmployeeModel.employee.periods = [
                            {
                                startDate: "",
                                endDate: ""
                            }
                        ];
                        vm.periodLookup = [];
                    }

                    vm.editProjectEmployeeModel.employee = {
                        user: employee,
                        userFullName: employee.firstName + " " + employee.lastName
                    };

                    vm.skill.populateCheckboxes();
                },

                removeFromProject: function () {

                    adminResource.removeProjectEmployee(
                        vm.fetched.selectedProject.id,
                        vm.editProjectEmployeeModel.employee.projectUserId,
                        function (result) {
                            items.project = result;
                            logger.success("", "", "SUCCESS");
                            $uibModalInstance.close();
                        },
                        function (error) {
                            logger.error(error.message, "", "ERROR");
                        }
                    );
                }

            }
        }

        function dateToDateTime(date) {
            return moment(date).toDate();
        }

        function submit(form) {

            if (form.$valid) {

                if (vm.period.checkIfAnyEmptyDateFields()) {
                    vm.errorMessage = "Cannot add employee with an empty date field.";
                    return;
                }

                if (vm.period.checkIfDatesOverlap()) {
                    vm.errorMessage = "Please check your dates selected, they cannot overlap";
                    return;
                }

                if (vm.skill.checkIfAtLeastOneSkillChecked() == false) {
                    vm.errorMessage = "At least one skill needs to be checked."
                    return;
                }

                vm.skill.populateEmployeeSkillsOnSubmit();

                adminResource.updateProjectEmployee(
                    vm.fetched.selectedProject.id,
                    vm.editProjectEmployeeModel.employee.projectUserId,
                    vm.editProjectEmployeeModel.employee,
                    function (result) {
                        companyModel.data = result;
                        logger.success("", "", "SUCCESS");
                        $uibModalInstance.close();
                    },
                    function (error) {
                        logger.error(error.message, "", "ERROR");
                    }
                );
            }
        }

        function close() {
            $uibModalInstance.close();
        }
    }
})
();