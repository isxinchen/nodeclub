var models       = require('../models');
var eventproxy   = require('eventproxy');
var Message      = models.Message;
var User         = require('../proxy').User;
var messageProxy = require('../proxy/message');
var _            = require('lodash');

exports.sendAnswerMessage = function (master_id, author_id, question_id, answer_id, callback) {
  callback = callback || _.noop;
  var ep = new eventproxy();
  ep.fail(callback);

  var message       = new Message();
  message.type      = 'answer';
  message.master_id = master_id;
  message.author_id = author_id;
  message.question_id  = question_id;
  message.answer_id  = answer_id;

  message.save(ep.done('message_saved'));
  ep.all('message_saved', function (msg) {
    callback(null, msg);
  });
};

exports.sendAtMessage = function (master_id, author_id, question_id, answer_id, callback) {
  callback = callback || _.noop;
  var ep = new eventproxy();
  ep.fail(callback);

  var message       = new Message();
  message.type      = 'at';
  message.master_id = master_id;
  message.author_id = author_id;
  message.question_id  = question_id;
  message.answer_id  = answer_id;

  message.save(ep.done('message_saved'));
  ep.all('message_saved', function (msg) {
    callback(null, msg);
  });
};
