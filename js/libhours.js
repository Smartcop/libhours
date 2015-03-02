// takes in the complete data object from the google doc/json file(s)
// and a js date object
// returns a hash (object) of libraries
// library object key is the library name
// library object value is an array of 7 "hours" strings
// each of the 7 corresponds to a day-of-the-week (0=monday, 6=sunday)
// the values are for the week in which the passed date object is in
// e.g. pass in December 16, and you get an object that contains hours for 
// monday-sunday of the week of the 16th, same if you pass in December 17,
// since that is in the same week.
function buildCompleteHoursObject(data, date) {
    // moment will accept lots of different date formats
    var moment_date = moment(date);

    // use that date to determine the monday of "this" week
    // clone insures we don't alter the original
    var start_date = moment_date.clone().subtract(moment_date.isoWeekday()-1, 'days');

    // array with date (using moment) for each day-of-week (dow) 0=monday, 6=sunday
    var dates_per_day = [];

    // array with name of day for each dow
    // this is needed because we need the spreadsheet to be human-readable
    var names_per_day = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ];

    // hash of exceptions--hash of dates each contain a hash of lib names
    // (this could be reversed if that makes more sense)
    var exceptions = {};

    // hash of hours broken down by semester, location, day
    var hours_data = {};

    // array of semester for each dow--in case the semester changes in the middle of the week
    var semester_per_day = [];

    // hash of hours data for "this" week
    var hours = {};

    // exceptions must be accessed by date, then location
    // we have to do some strange iterations because of the format 
    // of the spreadsheet

    // skip first column name ("location"), it's not needed for processing, just for human editing
    _.each(data['Holidays and Special Hours'].column_names.slice(1), function(exception_name) {
        // iterate through each library, creating an object for each
        // where the key is the location name, and the value is an object
        // each object should contain key/value pairs of date => hours
        // skip the first row of elements, because that just holds the dates themselves
        _.each(data['Holidays and Special Hours'].elements.slice(1), function(library) {
            exceptions[library.location] = exceptions[library.location] || {};

            // make sure there's an exception for this particular library for this exception name
            if (library[exception_name]) {
                var exception_date = data['Holidays and Special Hours'].elements[0][exception_name]; 

                exceptions[library.location][exception_date] = library[exception_name];
            }
        });
    });

    // hours_data must be access by semester, then location, then by day
    _.each(data['Semester Breakdown'].elements, function(semester) {
        hours_data[semester.semestername] = {};

        if (data[semester.semestername]) {
            _.each(data[semester.semestername].elements, function(location) {
                hours_data[semester.semestername][location.location] = location;
            });
        }
    });

    // run through each DOW for "this" week
    // determine what date the day is
    // determine which semester that date falls in
    // this is in case a semester changes in the middle of a week (is that possible?)
    for (var i=0; i < 7; i++) {
        var date = start_date.clone().add(i, 'days');
        
        dates_per_day.push(date);
        
        semester_per_day.push(_.find(data['Semester Breakdown'].elements, function(semester) {
            if (    date.isSame(semester.start, 'day') ||
                    date.isSame(semester.end, 'day') ||
                    (   date.isAfter(semester.start, 'day') &&
                        date.isBefore(semester.end, 'day'))) {
                return semester.semestername;
            }
        }));
    }

    // build hash of arrays (weekly hours) for display in template
    // lib name as key, value as array of hours for each DOW
        // for each lib
            // for each DOW
                // check date against lib exceptions list
                // check against lib tab hours
                // if no exceptions and no lib tab, use default hours from default hours object
    _.each(data['Holidays and Special Hours'].elements.slice(1), function(lib) {
        for (var i=0; i < 7; i++) {
            var library = lib.location;
            var date = dates_per_day[i].format('M/D/YYYY');
            var day_name = names_per_day[i];
            var semester = semester_per_day[i].semestername;

            hours[library] = hours[library] || {};

            if (exceptions[library] && exceptions[library][date]) {
                hours[library][i] = exceptions[library][date];
            }
            else if (hours_data[semester] && hours_data[semester][library] && hours_data[semester][library][day_name]) {
                hours[library][i] = hours_data[semester][library][day_name];
            }
            else {
                hours[library][i] = 'TBA';
            }
        }
    });

    return hours;
}

function getsemesterHoursObject(completeHoursObject, date, libname) {
    return completeHoursObject[libname][moment(date).isoWeekday()-1];
}

function buildNormalHoursObject(data) {

    // Format:
        // Library Array
            // Semester Dictionary
                // name
                // dates
                    // start
                    // end
                // regular array
                    // hours
                        // start
                        // end
                    // days
                // closings array
                    // dates
                        // start
                        // end
                    // reason
                // exceptions array
                    // dates
                        // start
                        // end
                    // reason
                    // hours
                        // start
                        // end

    var librariesObjects = {};

    // for each semester 
    _.each(data['Semester Breakdown'].elements, function(semester) {
       
        // create date object containing start and end dates of that semester
        var dateOjbect = {};
        dateOjbect['start'] = semester.start;
        dateOjbect['end'] = semester.end;

        if (data[semester.semestername]) {

            // for each semester gather all of the hours for each library
            _.each(data[semester.semestername].elements, function(library) {

                // create term object containing name, date object (start & end date)
                var termObject = {};
                termObject['name'] = semester.semestername;
                termObject['dates'] = dateOjbect;

                var hoursObject = {};
                var semesterHours = [];
                var dayLetters = ['M','T','W','R','F','S','U'];
                var names_per_day = [
                    'monday',
                    'tuesday',
                    'wednesday',
                    'thursday',
                    'friday',
                    'saturday',
                    'sunday'
                ];

                // for each day create objects that are in the form of: hours{start, end} days:'MTWHF'
                // we loop through the days and keep track of the previous day's hours to combine the days
                // if the hours are the same
                for (var i = 0 ; i < names_per_day.length ; i++) {

                    var dayHours = {};
                    var hoursObject = {};
                    var dayLetter = dayLetters[i];

                    var splithours = library[names_per_day[i]].split("-");
                    dayHours['start'] = splithours[0];
                    dayHours['end'] = splithours[1];

                    // If semestersHours contains hoursObjects
                    if (semesterHours.length > 0 ) {

                        var poppedHoursObject = semesterHours.pop();
                        var poppedHours = poppedHoursObject['hours'];
                        
                        // If previous day's hours are the same as todays
                        if (poppedHours['start'] == dayHours['start'] && poppedHours['end'] == dayHours['end']) {
                            poppedHoursObject['days'] = poppedHoursObject['days'].concat(dayLetter);
                            semesterHours.push(poppedHoursObject);

                        // If previous day's hours are different that todays
                        } else {
                            semesterHours.push(poppedHoursObject);
                            hoursObject['hours'] = dayHours;
                            hoursObject['days'] = dayLetter;
                            semesterHours.push(hoursObject);
                        }

                    // If no current hoursObject in semesterHours
                    } else {
                        hoursObject['hours'] = dayHours;
                        hoursObject['days'] = dayLetter;
                        semesterHours.push(hoursObject);
                    }
                }

                var regularHours = librariesObjects[library.location];
                if (!regularHours) {
                    regularHours = [];
                }

                // add regular hours to library object's regular hours array
                termObject['regular'] = semesterHours;
                regularHours.push(termObject);
                librariesObjects[library.location] = regularHours;
                
            });
        }
    });

    return getExceptionsAndClosings(librariesObjects, data);
}

function getExceptionsAndClosings(librariesObjects, data) {

    // for each library's closings and exceptions
    _.each(data['Holidays and Special Hours'].elements.slice(1), function(library) {

        var semester = 0;
        var closed = [];
        var exceptions = [];
        var closedBeforeDate;
        var exceptionsBeforeDate;

        var librarySemesters = librariesObjects[library.location];

        // for each closing and exception
         _.each(data['Holidays and Special Hours'].column_names.slice(1), function(exceptionName) {

            if (library[exceptionName]) {

                var exceptionDate = data['Holidays and Special Hours'].elements[0][exceptionName];

                var momentExceptionDate = moment(exceptionDate);

                // if closed
                if (library[exceptionName] == 'closed') {
                                  
                    // loop through the semester dates until the exception date is in semester
                    while (true) {

                        if (semester >= librarySemesters.length) {
                            break;
                        }

                        var startDate = moment(librarySemesters[semester]['dates']['start']);
                        var endDate = moment(librarySemesters[semester]['dates']['end']);

                        // exception date is in semester
                        if  (momentExceptionDate.isSame(startDate, 'day') || momentExceptionDate.isSame(endDate, 'day') ||
                            (momentExceptionDate.isAfter(startDate, 'day') && momentExceptionDate.isBefore(endDate, 'day'))) {
                            
                            break;

                        // exception date is not in semester so save all previous closings and exceptions for that semester
                        } else {

                            librarySemesters[semester]['closings'] = closed;
                            librarySemesters[semester]['exceptions'] = exceptions;

                            closed = [];
                            exceptions = [];
                            closedBeforeDate = 0;
                            exceptionsBeforeDate = 0;
                            semester++;
                        }
                    }

                    // If previous date is the same
                    if (momentExceptionDate.isSame(moment(closedBeforeDate).add(1, 'day'))) {
                       
                        var singleException = closed.pop();

                        // If previous reason is same change end date
                        if (singleException['reason'].split("_")[0] == exceptionName.split("_")[0]) {
                            var dates = singleException['dates'];
                            dates['end'] = exceptionDate
                            closed.push(singleException);

                        // Add new closing object if not same reason
                        } else {
                            closed.push(singleException);
                            closed.push(buildClosingObject(exceptionDate, exceptionName));
                        }
                        
                    // Add new closing object if last added closing day is not one day before current exception date
                    } else {
                        closed.push(buildClosingObject(exceptionDate, exceptionName));
                    }

                    closedBeforeDate = exceptionDate;
                
                // if exception
                } else {

                    // loop through the semester dates until the exception date is in semester
                    while (true) {

                        if (semester >= librarySemesters.length) {
                            break;
                        }

                        var startDate = moment(librarySemesters[semester]['dates']['start']);
                        var endDate = moment(librarySemesters[semester]['dates']['end']);

                        // exception date is in semester
                        if  (momentExceptionDate.isSame(startDate, 'day') || momentExceptionDate.isSame(endDate, 'day') ||
                            (momentExceptionDate.isAfter(startDate, 'day') && momentExceptionDate.isBefore(endDate, 'day'))) {

                            break;

                        // exception date is not in semester so save all previous closings and exceptions for that semester
                        } else {

                            librarySemesters[semester]['closings'] = closed;
                            librarySemesters[semester]['exceptions'] = exceptions;

                            closed = [];
                            exceptions = [];
                            closedBeforeDate = 0;
                            exceptionsBeforeDate = 0;
                            semester++;
                        }
                    }

                    // If previous date is the same
                    if (momentExceptionDate.isSame(moment(exceptionsBeforeDate).add(1, 'day'))) {

                        var hours = {};
                        var splithours = library[exceptionName].split("-");

                        hours['start'] = splithours[0];
                        hours['end'] = splithours[1];

                        var singleException = exceptions.pop();

                        var newHours = singleException['hours'];
                        // If previous start hours, end hours, and exception name are the same change end date 
                        if (newHours['start'] == hours['start'] && newHours['end'] == hours['end'] && singleException['reason'].split("_")[0] == exceptionName.split("_")[0]) {

                            var dates = singleException['dates'];
                            dates['end'] = exceptionDate;
                            singleException['dates'] = dates;

                            exceptions.push(singleException);

                        // Add new exceptions object if not same start/end hours or reason
                        } else {
                            exceptions.push(singleException);
                            exceptions.push(buildExceptionObject(exceptionDate, exceptionName, library[exceptionName]));
                        }

                    // Add new closing object if last added exception day is not one day before current exception date
                    } else {
                        exceptions.push(buildExceptionObject(exceptionDate, exceptionName, library[exceptionName]));
                    }

                    exceptionsBeforeDate = exceptionDate;
                }
            }
        });
        
        librarySemesters[semester]['closings'] = closed;
        librarySemesters[semester]['exceptions'] = exceptions;
    
    });

    return librariesObjects;
}

function convertReasons(object, data) {

    var exceptionNamesDictionary = {};

    // for each exception name ID
    _.each(data['Holidays and Special Hours'].original_columns.slice(1), function(exceptionName) {

        // remove _# from duplicate ids (weatherclosing_3 into weatherclosing)
        // dictionary has "weatherclosing" key to "weatherclosing" value

        var truncatedOriginalColumn = exceptionName.split("_")[0];
        exceptionNamesDictionary[truncatedOriginalColumn] = truncatedOriginalColumn;

    });

    // for each exception Name Pretty Name
    _.each(data['Holidays and Special Hours'].column_names.slice(1), function(exceptionName) {

        // change displayed exception Name into id (Weather closing into weatherclosing)
        var removeCharacterNotLetterOrNumber = exceptionName.replace(/[^\w]/g,'').toLowerCase();

        // if there is exception id in the exceptionNamesDictionary dictionary that mathces the transformed
        // Pretty Name then create a new "weatherclosing" key to "Weather closing" value
        if (exceptionNamesDictionary[removeCharacterNotLetterOrNumber]) {
            exceptionNamesDictionary[removeCharacterNotLetterOrNumber] = exceptionName;
        }
    });

    _.each(object, function(library) {
        _.each(library, function(term) {
            _.each(term['closings'], function(closing) {

               closing['reason'] = exceptionNamesDictionary[closing['reason'].split("_")[0]];

            });
            _.each(term['exceptions'], function(exception) {

               exception['reason'] = exceptionNamesDictionary[exception['reason'].split("_")[0]];

            });
        });
    });
    return object;
}

function buildClosingObject(exceptionDate, exceptionName) {

    var dates = {};
    dates['start'] = exceptionDate;
    dates['end'] = exceptionDate;

    var singleClosing = {};
    singleClosing['dates'] = dates;
    singleClosing['reason'] = exceptionName;
    return singleClosing;
}

function buildExceptionObject(exceptionDate, exceptionName, splithours) {

    var dates = {};
    dates['start'] = exceptionDate;
    dates['end'] = exceptionDate;

    var singleException = {};                        
    singleException['dates'] = dates;
    singleException['reason'] = exceptionName;

    var hours = {};
    splithours = splithours.split("-");

    hours['start'] = splithours[0];
    hours['end'] = splithours[1];

    singleException['hours'] = hours;

    return singleException;
}