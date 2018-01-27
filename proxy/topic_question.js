var EventProxy = require('eventproxy');
var models     = require('../models');
var TopicQuestion      = models.TopicQuestion;
// var User       = require('./user');
// var Answer      = require('./answer');
var tools      = require('../common/tools');
var at         = require('../common/at');
var _          = require('lodash');

/*exports.getTopicByName = function (name, callback) {
  Topic.findOne({name: name}, callback);
}*/

exports.newAndSave = function (topicId, questionId, callback) {
  var topicQuestion = new TopicQuestion();
  topicQuestion.topic_id = topicId;
  topicQuestion.question_id = questionId;

  topicQuestion.save(callback);
}