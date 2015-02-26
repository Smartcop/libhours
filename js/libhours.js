function buildNormalHoursObject(data) {

    var hours_data = {};

    _.each(data['Semester Breakdown'].elements, function(semester) {
       
        var dateOjbect = {};
        dateOjbect['start'] = semester.start;
        dateOjbect['end'] = semester.end;

        if (data[semester.semestername]) {
            _.each(data[semester.semestername].elements, function(library) {

            var termObject = {};
            termObject['name'] = semester.semestername;
            termObject['dates'] = dateOjbect;

            var hoursObject = {};
            var singleHours = [];
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
            for(var i = 0 ; i < names_per_day.length ; i++) {

                var dayHours = {};
                var hoursObject = {};
                var splithours = library[names_per_day[i]].split("-");

                dayHours['start'] = splithours[0];
                dayHours['end'] = splithours[1];

                if (singleHours.length) {
                    var poppedHoursObject = singleHours.pop();
                    var poppedHours = poppedHoursObject['hours'];
                    if (poppedHours['start'] == dayHours['start'] && poppedHours['end'] == dayHours['end']) {
                        poppedHoursObject['days'] = poppedHoursObject['days'].concat(dayLetters[i]);
                        singleHours.push(poppedHoursObject);
                    } else {
                        singleHours.push(poppedHoursObject);
                        hoursObject['hours'] = dayHours;
                        hoursObject['days'] = dayLetters[i];
                        singleHours.push(hoursObject);
                    }
                } else {
                    hoursObject['hours'] = dayHours;
                    hoursObject['days'] = dayLetters[i];
                    singleHours.push(hoursObject);
                }
            }

            var regularHours = hours_data[library.location];
            if (!regularHours) {
                regularHours = [];
            }
            termObject['regular'] = singleHours;

            regularHours.push(termObject);
            hours_data[library.location] = regularHours;
            });
        }
    });

    return getSemester(hours_data, data);
}

function getSemester(hours_data, data) {

    _.each(data['Holidays and Special Hours'].elements.slice(1), function(library) {

        var semester = 0;
        var closed = [];
        var exceptions = [];
        var closed_before_date;
        var exceptions_before_date;

         _.each(data['Holidays and Special Hours'].column_names.slice(1), function(exception_name) {

            if (library[exception_name]) {

                var exception_date = data['Holidays and Special Hours'].elements[0][exception_name];

                if (library[exception_name] == 'closed') {
                                        
                   var today_date = exception_date;

                    while (true) {
                        if (semester >= hours_data[library.location].length) {
                            break;
                        }
                        var start_date = moment(hours_data[library.location][semester]['dates']['start']);
                        var end_date = moment(hours_data[library.location][semester]['dates']['end']);
                        var today_date2 = moment(today_date);

                        if (today_date2.isSame(start_date, 'day') ||
                            today_date2.isSame(end_date, 'day') ||
                            (today_date2.isAfter(start_date, 'day') &&
                            today_date2.isBefore(end_date, 'day'))) {

                            break;

                        } else {
                            hours_data[library.location][semester]['closings'] = closed;
                            hours_data[library.location][semester]['exceptions'] = exceptions;

                            closed = [];
                            exceptions = [];
                            semester++;
                            closed_before_date = 0;
                            exceptions_before_date = 0;
                        }
                    }

                    if (closed_before_date) {

                        if (moment(today_date).isSame(moment(closed_before_date).add(1, 'day'))) {
                           
                            var singleException = closed.pop();
                            var dates = singleException['dates'];
                            dates['end'] = today_date
                            closed.push(singleException);

                        } else {
                                                                      
                            closed.push(buildClosingObject(exception_date, exception_name));

                        }

                    } else {
                                                                                      
                       closed.push(buildClosingObject(exception_date, exception_name));

                    }

                    closed_before_date = exception_date;
                
                } else {

                    var today_date = exception_date;

                    while (true) {
                        if (semester >= hours_data[library.location].length) {
                            break;
                        }
                        var start_date = moment(hours_data[library.location][semester]['dates']['start']);
                        var end_date = moment(hours_data[library.location][semester]['dates']['end']);
                        var today_date2 = moment(today_date);

                        if (today_date2.isSame(start_date, 'day') ||
                            today_date2.isSame(end_date, 'day') ||
                            (today_date2.isAfter(start_date, 'day') &&
                            today_date2.isBefore(end_date, 'day'))) {

                            break;

                        } else {

                            hours_data[library.location][semester]['closings'] = closed;
                            hours_data[library.location][semester]['exceptions'] = exceptions;

                            closed = [];
                            exceptions = [];
                            semester++;
                            closed_before_date = 0;
                            exceptions_before_date = 0;
                        }
                    }

                    if (exceptions_before_date) {

                        if (moment(today_date).isSame(moment(exceptions_before_date).add(1, 'day'))) {

                            var hours = {};
                            var splithours = library[exception_name].split("-");

                            hours['start'] = splithours[0];
                            hours['end'] = splithours[1];

                            var singleException = exceptions.pop();

                            var newHours = singleException['hours'];

                            if (newHours['start'] == hours['start'] && newHours['end'] == hours['end']) {

                                var dates = singleException['dates'];
                                dates['end'] = today_date;
                                singleException['dates'] = dates;

                                exceptions.push(singleException);

                            } else {

                                exceptions.push(singleException);
                                
                                exceptions.push(buildExceptionObject(exception_date, exception_name, library[exception_name]));

                            }

                        } else {

                            exceptions.push(buildExceptionObject(exception_date, exception_name, library[exception_name]));

                        }

                    } else {

                        exceptions.push(buildExceptionObject(exception_date, exception_name, library[exception_name]));

                    }

                    exceptions_before_date = exception_date;

                }

            }

        });
        
        hours_data[library.location][semester]['closings'] = closed;
        hours_data[library.location][semester]['exceptions'] = exceptions;
    
    });

    return hours_data;

}

function buildClosingObject(exception_date, exception_name) {

    var dates = {};
    dates['start'] = exception_date;
    dates['end'] = exception_date;

    var singleClosing = {};
    singleClosing['dates'] = dates;
    singleClosing['reason'] = exception_name;
    return singleClosing;
}

function buildExceptionObject(exception_date, exception_name, splithours) {

    var dates = {};
    dates['start'] = exception_date;
    dates['end'] = exception_date;

    var singleException = {};                        
    singleException['dates'] = dates;
    singleException['reason'] = exception_name;

    var hours = {};
    splithours = splithours.split("-");

    hours['start'] = splithours[0];
    hours['end'] = splithours[1];

    singleException['hours'] = hours;

    return singleException;
}

