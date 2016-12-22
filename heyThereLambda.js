'use strict';

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
          (sessionAttributes, speechletResponse) => {
            callback(null, buildResponse(sessionAttributes, speechletResponse));
          }
        );
        break;
      case 'IntentRequest':
        onIntent(
          event.request,
          event.session,
          (sessionAttributes, speechletResponse) => {
            callback(null, buildResponse(sessionAttributes, speechletResponse));
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
  const cardTitle = 'Hey There!';
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

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes,
    response: speechletResponse,
  };
}

function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intent.name;

  switch (intentName) {
    case 'HeyThere':
      promptForMessageResponse(intent, callback);
      break;
    case 'AMAZON.HelpIntent':
      getWelcomeResponse(callback);
      break;
    default:
      throw new Error('Invalid Intent');
      break;
  }
}

function promptForMessageResponse(intent, callback) {
  const sessionAttributes = createSessionAttributesFromSlots(intent);

  const cardTitle = 'Hey There!';
  const repromptText = 'What\'s the message?';
  const speechOutput = `Alright, sending a message to ${sessionAttributes.to} from ${sessionAttributes.from}. ${repromptText}`;
  const shouldEndSession = false;

  callback(
    sessionAttributes,
    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)
  );
}

function createSessionAttributesFromSlots(intent) {
  const toName = intent.slots.To.value;
  const fromName = intent.slots.From.value;

  return {
    to: toName,
    from: fromName,
    message: '',
  };
}

function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
  // Add cleanup logic here
}