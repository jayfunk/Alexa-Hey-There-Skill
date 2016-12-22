'use strict';

const http = require('http');
const querystring = require('querystring');

const cardTitle = 'Hey There!';
const momRegex = /^(mom|dan|ma)/ig;
const dadRegex = /^(ty|dad|pa|pop)/ig;

exports.handler = (event, context, callback) => {
  try {
    console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

    if (event.session.new) {
      console.log(`onSessionStarted requestId=${event.request.requestId}, sessionId=${event.session.sessionId}`);
    }

    if (event.session.application.applicationId !== process.env.SKILL_ID) {
      callback('Invalid Application ID');
    }

    switch(event.request.type) {
      case 'LaunchRequest':
        onLaunch(
          event.request,
          event.session,
          (sessionAttr, speechletResponse) => {
            callback(null, buildResponse(sessionAttr, speechletResponse));
          }
        );
        break;
      case 'IntentRequest':
        onIntent(
          event.request,
          event.session,
          (sessionAttr, speechletResponse) => {
            callback(null, buildResponse(sessionAttr, speechletResponse));
          }
        );
        break;
      case 'SessionEndedRequest':
        onSessionEnded(event.request, event.session);
        callback();
        break;
      default:
        callback(`Unknown request type ${event.request.type}`);
        break;
    }
  } catch (err) {
    callback(err);
  }
};

function onLaunch(launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
  getWelcomeResponse(callback);
}

function getWelcomeResponse(callback) {
  const repromptText = 'Start by saying, send a message to Danielle';
  const speechOutput = `Hey There! is a simple tool allowing you to send messages to a preconfigured set of friends. ${repromptText}`;
  const shouldEndSession = false;

  callback(
    {},
    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)
  );
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: output,
    },
    card: {
      type: 'Simple',
      title: `SessionSpeechlet - ${title}`,
      content: `SessionSpeechlet - ${output}`,
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText,
      },
    },
    shouldEndSession,
  };
}

function buildResponse(sessionAttr, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes: sessionAttr,
    response: speechletResponse,
  };
}

function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intent.name;

  switch (intentName) {
    case 'HeyThereToFrom':
      promptForMessageResponse(intent, callback);
      break;
    case 'MessageBody':
      sendSMSAndResponse(intent, session, callback);
      break;
    case 'AMAZON.HelpIntent':
      getWelcomeResponse(callback);
      break;
    case 'AMAZON.CancelIntent':
    case 'AMAZON.StopIntent':
      getCancelResponse(callback);
      break;
    default:
      throw new Error('Invalid Intent');
  }
}

function promptForMessageResponse(intent, callback) {
  const sessionAttr = addSlotsToSessionAttributes(intent, {});

  const repromptText = 'What\'s the message?';
  const speechOutput = `Alright, sending a message to ${sessionAttr.to} from ${sessionAttr.from}. ${repromptText}`;
  const shouldEndSession = false;

  callback(
    sessionAttr,
    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)
  );
}

function addSlotsToSessionAttributes(intent, sessionAttr) {
  var newSessionAttributes = {};

  if(intent.name === 'HeyThereToFrom') {
    newSessionAttributes.to = intent.slots.To.value;
    newSessionAttributes.from = intent.slots.From.value;
  } else if(intent.name === 'MessageBody') {
    newSessionAttributes.message = intent.slots.Message.value;
  }
  const mergedSessionAttributes = Object.assign({}, sessionAttr, newSessionAttributes);
  console.log('Updated session attributes', mergedSessionAttributes);
  return mergedSessionAttributes;
}

function sendSMSAndResponse(intent, session, callback) {
  const shouldEndSession = true;
  const sessionAttr = addSlotsToSessionAttributes(intent, session.attributes);

  try {
    const number = getPhoneNumber(sessionAttr);
    const postData = querystring.stringify({
      'number': number,
      'message': buildSMSMessageBody(sessionAttr),
    });

    const req = http.request({
      hostname: 'textbelt.com',
      path: '/text',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log('SMS Response Body ', chunk);
      });
    });

    req.write(postData);
    req.end();

    callback(
      sessionAttr,
      buildSpeechletResponse(cardTitle, 'OK, sending your message!', '', shouldEndSession)
    );
  } catch(err) {
    callback(
      sessionAttr,
      buildSpeechletResponse(cardTitle, err.message, '', shouldEndSession)
    );
  }
}

function getPhoneNumber(sessionAttr) {
  const toName = sessionAttr.to;

  if (momRegex.test(toName)) {
    return process.env.M_NUM;
  } else if (dadRegex.test(toName)) {
    return process.env.D_NUM;
  }

  throw new Error(`Message addressed to ${toName} was not matched to a configured number.`);
}

function buildSMSMessageBody(sessionAttr) {
  return `${sessionAttr.message} \n ${sessionAttr.from}`;
}

function getCancelResponse(callback) {
  const cancelMessage = 'Ok, cancelling your message.'
  callback(
    {},
    buildSpeechletResponse(cardTitle, cancelMessage, '', true)
  );
}

function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
  // Add cleanup logic here
}