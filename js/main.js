// what to do with the hoursObject once it's been built
function processHours(data, tabletop) {
    // get page_date however you want, I'm just defaulting to new Date
    var date = new Date(2015, 11, 31);

    // only build the hours object once
    var completeHoursObject = buildCompleteHoursObject(data, date);

    console.log(completeHoursObject);

    // extract the hours for a particular date/lib from the complete object this way
    var singleHoursObject = getSingleHoursObject(completeHoursObject, date, 'Barker Library')

    console.log(singleHoursObject);
}
var nonprettyTermsObject;

window.onload = function() {
    // call this when you are ready to get the data and use it
    Tabletop.init({
        // key is generated by Google doc
        key: '1aEV-CZIqJD9hHJWNWTWIN0I4Cgz3M8jpl4hQwA9l8JU',

        // function to call when the data is retrieved
        callback: processTerms,
        prettyColumnNames: false,
        simpleSheet: false
    });
}

// what to do with the hoursObject once it's been built
function processTerms(data, tabletop) {

    nonprettyTermsObject = buildNormalHoursObject(data);

    Tabletop.init({
        // key is generated by Google doc
        key: '1aEV-CZIqJD9hHJWNWTWIN0I4Cgz3M8jpl4hQwA9l8JU',

        // function to call when the data is retrieved
        callback: processReasons,
        simpleSheet: false

    });
}

function processReasons(data, tabletop) {

    var prettyTermsObject = convertReasons(nonprettyTermsObject, data);
    document.write(JSON.stringify(prettyTermsObject));
}