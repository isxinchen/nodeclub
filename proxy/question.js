var EventProxy = require('eventproxy');
var models     = require('../models');
var Question      = models.Question;
var User       = require('./user');
var Answer      = require('./answer');
var tools      = require('../common/tools');
var at         = require('../common/at');
var _          = require('lodash');


/**
 * 根据主题ID获取主题
 * Callback:
 * - err, 数据库错误
 * - question, 主题
 * - author, 作者
 * - lastAnswer, 最后回复
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getQuestionById = function (id, callback) {
  var proxy = new EventProxy();
  var events = ['question', 'author', 'last_answer'];
  proxy.assign(events, function (question, author, last_answer) {
    if (!author) {
      return callback(null, null, null, null);
    }
    return callback(null, question, author, last_answer);
  }).fail(callback);

  Question.findOne({_id: id}, proxy.done(function (question) {
    if (!question) {
      proxy.emit('question', null);
      proxy.emit('author', null);
      proxy.emit('last_answer', null);
      return;
    }
    proxy.emit('question', question);

    User.getUserById(question.author_id, proxy.done('author'));

    if (question.last_answer) {
      Answer.getAnswerById(question.last_answer, proxy.done(function (last_answer) {
        proxy.emit('last_answer', last_answer);
      }));
    } else {
      proxy.emit('last_answer', null);
    }
  }));
};

/**
 * 获取关键词能搜索到的主题数量
 * Callback:
 * - err, 数据库错误
 * - count, 主题数量
 * @param {String} query 搜索关键词
 * @param {Function} callback 回调函数
 */
exports.getCountByQuery = function (query, callback) {
  Question.count(query, callback);
};

/**
 * 根据关键词，获取主题列表
 * Callback:
 * - err, 数据库错误
 * - count, 主题列表
 * @param {String} query 搜索关键词
 * @param {Object} opt 搜索选项
 * @param {Function} callback 回调函数
 */
exports.getQuestionsByQuery = function (query, opt, callback) {
  query.deleted = false;
  Question.find(query, {}, opt, function (err, questions) {
    if (err) {
      return callback(err);
    }
    if (questions.length === 0) {
      return callback(null, []);
    }

    var proxy = new EventProxy();
    proxy.after('question_ready', questions.length, function () {
      questions = _.compact(questions); // 删除不合规的 question
      return callback(null, questions);
    });
    proxy.fail(callback);

    questions.forEach(function (question, i) {
      var ep = new EventProxy();
      ep.all('author', 'answer', function (author, answer) {
        // 保证顺序
        // 作者可能已被删除
        if (author) {
          question.author = author;
          question.answer = answer;
        } else {
          questions[i] = null;
        }
        proxy.emit('question_ready');
      });

      User.getUserById(question.author_id, ep.done('author'));
      // 获取主题的最后回复
      Answer.getAnswerById(question.last_answer, ep.done('answer'));
    });
  });
};

// for sitemap
exports.getLimit5w = function (callback) {
  Question.find({deleted: false}, '_id', {limit: 50000, sort: '-create_at'}, callback);
};

/**
 * 获取所有信息的主题
 * Callback:
 * - err, 数据库异常
 * - message, 消息
 * - question, 主题
 * - author, 主题作者
 * - answers, 主题的回复
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getFullQuestion = function (id, callback) {
  var proxy = new EventProxy();
  var events = ['question', 'author', 'answers'];
  proxy
    .assign(events, function (question, author, answers) {
      callback(null, '', question, author, answers);
    })
    .fail(callback);

  Question.findOne({_id: id, deleted: false}, proxy.done(function (question) {
    if (!question) {
      proxy.unbind();
      return callback(null, '此话题不存在或已被删除。');
    }
    at.linkUsers(question.content, proxy.done('question', function (str) {
      question.linkedContent = str;
      return question;
    }));

    User.getUserById(question.author_id, proxy.done(function (author) {
      if (!author) {
        proxy.unbind();
        return callback(null, '话题的作者丢了。');
      }
      proxy.emit('author', author);
    }));

    Answer.getRepliesByQuestionId(question._id, proxy.done('answers'));
  }));
};

/**
 * 更新主题的最后回复信息
 * @param {String} questionId 主题ID
 * @param {String} answerId 回复ID
 * @param {Function} callback 回调函数
 */
exports.updateLastAnswer = function (questionId, answerId, callback) {
  Question.findOne({_id: questionId}, function (err, question) {
    if (err || !question) {
      return callback(err);
    }
    question.last_answer    = answerId;
    question.last_answer_at = new Date();
    question.answer_count += 1;
    question.save(callback);
  });
};

/**
 * 根据主题ID，查找一条主题
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getQuestion = function (id, callback) {
  Question.findOne({_id: id}, callback);
};

/**
 * 将当前主题的回复计数减1，并且更新最后回复的用户，删除回复时用到
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.reduceCount = function (id, callback) {
  Question.findOne({_id: id}, function (err, question) {
    if (err) {
      return callback(err);
    }

    if (!question) {
      return callback(new Error('该主题不存在'));
    }
    question.answer_count -= 1;

    Answer.getLastAnswerByTopId(id, function (err, answer) {
      if (err) {
        return callback(err);
      }

      if (answer.length !== 0) {
        question.last_answer = answer[0]._id;
      } else {
        question.last_answer = null;
      }

      question.save(callback);
    });

  });
};

exports.newAndSave = function (title, content, tab, authorId, callback) {
  var question       = new Question();
  question.title     = title;
  question.content   = content;
  question.tab       = tab;
  question.author_id = authorId;

  question.save(callback);
};
