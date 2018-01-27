var mongoose = require('mongoose');
var config   = require('../config');
var logger = require('../common/logger')

mongoose.connect(config.db, {
  server: {poolSize: 20}
}, function (err) {
  if (err) {
    logger.error('connect to %s error: ', config.db, err.message);
    process.exit(1);
  }
});

// models
require('./user');
require('./question');
require('./answer');
require('./question_collect');
require('./message');
require('./topic');
require('./topic_question');

exports.User         = mongoose.model('User');
exports.Question        = mongoose.model('Question');
exports.Answer        = mongoose.model('Answer');
exports.QuestionCollect = mongoose.model('QuestionCollect');
exports.Message      = mongoose.model('Message');
exports.Topic        = mongoose.model('Topic');
exports.TopicQuestion = mongoose.model('TopicQuestion');
