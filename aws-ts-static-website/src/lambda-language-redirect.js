'use strict';

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const languageHeader = request.headers['accept-language'];

    // shortcut invalid requests
    if (request.uri != '/' || typeof languageHeader === 'undefined') {
        callback(null, request);
        return;
    }

    const clientLanguages = languageHeader[0].value;
    console.log('accept-language header from client:', clientLanguages);
    if (clientLanguages.startsWith('es')) {
        callback(null, redirect('/es/'));
    }
    else {
        callback(null, request);
    }
};

function redirect(to) {
    const response = {
        status: '301',
        statusDescription: 'Redirect to language specified by client.',
        headers: {
            location: [{ key: 'Location', value: to }]
        }
    };
    return response;
};
