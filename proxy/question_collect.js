var QuestionCollect = require('../models').QuestionCollect;
var _ = require('lodash')

exports.getQuestionCollect = function (userId, questionId, callback) {
  QuestionCollect.findOne({user_id: userId, question_id: questionId}, callback);
};

exports.getQuestionCollectsByUserId = function (userId, opt, callback) {
  var defaultOpt = {sort: '-create_at'};
  opt = _.assign(defaultOpt, opt)
  QuestionCollect.find({user_id: userId}, '', opt, callback);
};

exports.newAndSave = function (userId, questionId, callback) {
  var question_collect      = new QuestionCollect();
  question_collect.user_id  = userId;
  question_collect.question_id = questionId;
  question_collect.save(callback);
};

exports.remove = function (userId, questionId, callback) {
  QuestionCollect.remove({user_id: userId, question_id: questionId}, callback);
};

