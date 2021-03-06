var token = process.env.token;

if (!token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var Url = require('url');
var request = require('request');
var os = require('os');
var mjmlEndpoint = 'http://54a672a5.ngrok.io';

var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: token
}).startRTM();



controller.hears(['help'], 'direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Send me an gist containing MJML markup and I\'ll render it.');
    bot.reply(message, 'Send me code sample with ``` and will do the same.');
});

var mjml = '<mj-body>\
  <mj-section>\
    <mj-column>\
      <mj-image width="100" src="/assets/img/logo-small.png"></mj-image>\
      <mj-divider border-color="#F45E43"></mj-divider>\
      <mj-text font-size="20px" color="#F45E43" font-family="helvetica">Hello World</mj-text>\
    </mj-column>\
  </mj-section>\
</mj-body>';

controller.hears(['sample'], 'direct_message,direct_mention,mention', function(bot, message) {
    bot.reply(message, 'Here\'s a sample for you:');
    bot.reply(message, mjml);
});

controller.hears(['//gist.github.com'], 'direct_message,direct_mention,mention', function(bot, message) {

    var Gisty = require('gisty');
    var emails = [];
    getRecipients(message, function(err, response) {
        emails = [
            response.user.profile.email
        ];
    });

    var cleanUrl = message.text.replace('<', '').replace('>', '');
    var userUrl = Url.parse(cleanUrl);
    bot.reply(message, message.text);

    var parts = userUrl.path.split('/');
    var user = parts[1];
    var gistId = parts[2];

    var gist = new Gisty({
        username: user
    });

    gist.fetch(gistId, function(error, gist) {
        if (error) {
            bot.reply(message, 'Did not get that..');
            return;
        }

        bot.reply(message, 'Here\'s a list of the files:');
        for (filename in gist.files) {
            var gistContent = gist.files[filename].content;

            // renderMjml(gistContent, function(err, httpResponse, body) {
            //     bot.reply(message, '```' + body.html.substring(0,99) + '...' + '```');
            // });

            sendMjml(gistContent, emails, function(err, httpResponse, body) {
                bot.reply(message, 'The rendered MJML from file: *' + filename + '* will be sent to: ' + emails.join());
            });
        }
    });
});


controller.hears(['```'], 'direct_message,direct_mention,mention', function(bot, message) {

    // TODO replace only first and last chars.
    var mjmlContent = message.text.replace('```', '');

    var emails = [];
    getRecipients(message, function(err, response) {
        emails = [
            response.user.profile.email
        ];
    });

    sendMjml(mjmlContent, emails, function(err, httpResponse, body) {
        bot.reply(message, 'The rendered MJML from file: *' + filename + '* will be sent to: ' + emails.join());
    });
    // renderMjml(mjmlContent, function(err, httpResponse, body) {
    //     bot.reply(message, '```' + body.html.substring(0, 99) + '...' + '```');
    // });
});

var fetchFromGist = function(gistUrl, callback) {

    request.get({
        url: gistUrl
    }, callback);
}

var renderMjml = function(mjml, callback) {
    request.post({
        url: mjmlEndpoint + '/render',
        json: {
            mjml: mjml
        }
    }, callback);
}

var sendMjml = function(mjml, recipients, callback) {
    request.post({
        url: mjmlEndpoint + '/render-send-email',
        json: {
            mjml: mjml,
            recipients: recipients
        }
    }, callback);
}

var getRecipients = function(message, callback) {
    bot.api.users.info({
        user: message.user
    }, callback);
}