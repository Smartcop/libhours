// Set up the "require" variable which RequireJS will pick up when it is loaded in main.js.
// This ensures that the configuration loads before any other scripts are required in.
var require = {
    // Initialize the application with the main application file
    deps: ['main'],

    paths: {
        moment:     'vendor/moment',
        tabletop:   'vendor/tabletop',
        underscore: 'vendor/underscore'
    },

    shim: {
        moment: {
            exports: 'moment'
        },

        tabletop: {
            exports: 'Tabletop'
        },

        underscore: {
            exports: '_'
        }
    }
};