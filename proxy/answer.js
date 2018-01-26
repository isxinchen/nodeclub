var models     = require('../models');
var Answer      = models.Answer;
var EventProxy = require('eventproxy');
var tools      = require('../common/tools');
var User       = require('./user');
var at         = require('../common/at');

/**
 * 获取一条回复信息
 * @param {String} id 回复ID
 * @param {Function} callback 回调函数
 */
exports.getAnswer = function (id, callback) {
  Answer.findOne({_id: id}, callback);
};

/**
 * 根据回复ID，获取回复
 * Callback:
 * - err, 数据库异常
 * - answer, 回复内容
 * @param {String} id 回复ID
 * @param {Function} callback 回调函数
 */
exports.getAnswerById = function (id, callback) {
  if (!id) {
    return callback(null, null);
  }
  Answer.findOne({_id: id}, function (err, answer) {
    if (err) {
      return callback(err);
    }
    if (!answer) {
      return callback(err, null);
    }

    var author_id = answer.author_id;
    User.getUserById(author_id, function (err, author) {
      if (err) {
        return callback(err);
      }
      answer.author = author;
      // TODO: 添加更新方法，有些旧帖子可以转换为markdown格式的内容
      if (answer.content_is_html) {
        return callback(null, answer);
      }
      at.linkUsers(answer.content, function (err, str) {
        if (err) {
          return callback(err);
        }
        answer.content = str;
        return callback(err, answer);
      });
    });
  });
};

/**
 * 根据主题ID，获取回复列表
 * Callback:
 * - err, 数据库异常
 * - answers, 回复列表
 * @param {String} id 主题ID
 * @param {Function} callback 回调函数
 */
exports.getRepliesByQuestionId = function (id, cb) {
  Answer.find({question_id: id, deleted: false}, '', {sort: 'create_at'}, function (err, answers) {
    if (err) {
      return cb(err);
    }
    if (answers.length === 0) {
      return cb(null, []);
    }

    var proxy = new EventProxy();
    proxy.after('answer_find', answers.length, function () {
      cb(null, answers);
    });
    for (var j = 0; j < answers.length; j++) {
      (function (i) {
        var author_id = answers[i].author_id;
        User.getUserById(author_id, function (err, author) {
          if (err) {
            return cb(err);
          }
          answers[i].author = author || { _id: '' };
          if (answers[i].content_is_html) {
            return proxy.emit('answer_find');
          }
          at.linkUsers(answers[i].content, function (err, str) {
            if (err) {
              return cb(err);
            }
            answers[i].content = str;
            proxy.emit('answer_find');
          });
        });
      })(j);
    }
  });
};

/**
 * 创建并保存一条回复信息
 * @param {String} content 回复内容
 * @param {String} questionId 主题ID
 * @param {String} authorId 回复作者
 * @param {String} [answerId] 回复ID，当二级回复时设定该值
 * @param {Function} callback 回调函数
 */
exports.newAndSave = function (content, questionId, authorId, answerId, callback) {
  if (typeof answerId === 'function') {
    callback = answerId;
    answerId  = null;
  }
  var answer       = new Answer();
  answer.content   = content;
  answer.question_id  = questionId;
  answer.author_id = authorId;

  if (answerId) {
    answer.answer_id = answerId;
  }
  answer.save(function (err) {
    callback(err, answer);
  });
};

/**
 * 根据questionId查询到最新的一条未删除回复
 * @param questionId 主题ID
 * @param callback 回调函数
 */
exports.getLastAnswerByTopId = function (questionId, callback) {
  Answer.find({question_id: questionId, deleted: false}, '_id', {sort: {create_at : -1}, limit : 1}, callback);
};

exports.getRepliesByAuthorId = function (authorId, opt, callback) {
  if (!callback) {
    callback = opt;
    opt      = null;
  }
  Answer.find({author_id: authorId}, {}, opt, callback);
};

// 通过 author_id 获取回复总数
exports.getCountByAuthorId = function (authorId, callback) {
  Answer.count({author_id: authorId}, callback);
};
