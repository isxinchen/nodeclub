/*!
 * nodeclub - controllers/question.js
 */

/**
 * Module dependencies.
 */

var validator = require('validator');

var at           = require('../common/at');
var User         = require('../proxy').User;
var Question        = require('../proxy').Question;
var QuestionCollect = require('../proxy').QuestionCollect;
var EventProxy   = require('eventproxy');
var tools        = require('../common/tools');
var store        = require('../common/store');
var config       = require('../config');
var _            = require('lodash');
var cache        = require('../common/cache');
var logger = require('../common/logger')

/**
 * Question page
 *
 * @param  {HttpRequest} req
 * @param  {HttpResponse} res
 * @param  {Function} next
 */
exports.index = function (req, res, next) {
  function isUped(user, answer) {
    if (!answer.ups) {
      return false;
    }
    return answer.ups.indexOf(user._id) !== -1;
  }

  var question_id = req.params.tid;
  var currentUser = req.session.user;

  if (question_id.length !== 24) {
    return res.render404('此话题不存在或已被删除。');
  }
  var events = ['question', 'other_questions', 'no_answer_questions', 'is_collect'];
  var ep = EventProxy.create(events,
    function (question, other_questions, no_answer_questions, is_collect) {
    res.render('question/index', {
      question: question,
      author_other_questions: other_questions,
      no_answer_questions: no_answer_questions,
      is_uped: isUped,
      is_collect: is_collect,
    });
  });

  ep.fail(next);

  Question.getFullQuestion(question_id, ep.done(function (message, question, author, answers) {
    if (message) {
      logger.error('getFullQuestion error question_id: ' + question_id)
      return res.renderError(message);
    }

    question.visit_count += 1;
    question.save();

    question.author  = author;
    question.answers = answers;

    // 点赞数排名第三的回答，它的点赞数就是阈值
    question.answer_up_threshold = (function () {
      var allUpCount = answers.map(function (answer) {
        return answer.ups && answer.ups.length || 0;
      });
      allUpCount = _.sortBy(allUpCount, Number).reverse();

      var threshold = allUpCount[2] || 0;
      if (threshold < 3) {
        threshold = 3;
      }
      return threshold;
    })();

    ep.emit('question', question);

    // get other_questions
    var options = { limit: 5, sort: '-last_answer_at'};
    var query = { author_id: question.author_id, _id: { '$nin': [ question._id ] } };
    Question.getQuestionsByQuery(query, options, ep.done('other_questions'));

    // get no_answer_questions
    cache.get('no_answer_questions', ep.done(function (no_answer_questions) {
      if (no_answer_questions) {
        ep.emit('no_answer_questions', no_answer_questions);
      } else {
        Question.getQuestionsByQuery(
          { answer_count: 0, tab: {$nin: ['job', 'dev']}},
          { limit: 5, sort: '-create_at'},
          ep.done('no_answer_questions', function (no_answer_questions) {
            cache.set('no_answer_questions', no_answer_questions, 60 * 1);
            return no_answer_questions;
          }));
      }
    }));
  }));

  if (!currentUser) {
    ep.emit('is_collect', null);
  } else {
    QuestionCollect.getQuestionCollect(currentUser._id, question_id, ep.done('is_collect'))
  }
};

exports.create = function (req, res, next) {
  res.render('question/edit', {
    tabs: config.tabs
  });
};


exports.put = function (req, res, next) {
  var title   = validator.trim(req.body.title);
  var tab     = validator.trim(req.body.tab);
  var content = validator.trim(req.body.t_content);

  // 得到所有的 tab, e.g. ['ask', 'share', ..]
  var allTabs = config.tabs.map(function (tPair) {
    return tPair[0];
  });

  // 验证
  var editError;
  if (title === '') {
    editError = '标题不能是空的。';
  } else if (title.length < 5 || title.length > 100) {
    editError = '标题字数太多或太少。';
  } else if (!tab || allTabs.indexOf(tab) === -1) {
    editError = '必须选择一个版块。';
  } else if (content === '') {
    editError = '内容不可为空';
  }
  // END 验证

  if (editError) {
    res.status(422);
    return res.render('question/edit', {
      edit_error: editError,
      title: title,
      content: content,
      tabs: config.tabs
    });
  }

  Question.newAndSave(title, content, tab, req.session.user._id, function (err, question) {
    if (err) {
      return next(err);
    }

    var proxy = new EventProxy();

    proxy.all('score_saved', function () {
      res.redirect('/question/' + question._id);
    });
    proxy.fail(next);
    User.getUserById(req.session.user._id, proxy.done(function (user) {
      user.score += 5;
      user.question_count += 1;
      user.save();
      req.session.user = user;
      proxy.emit('score_saved');
    }));

    //发送at消息
    at.sendMessageToMentionUsers(content, question._id, req.session.user._id);
  });
};

exports.showEdit = function (req, res, next) {
  var question_id = req.params.tid;

  Question.getQuestionById(question_id, function (err, question, tags) {
    if (!question) {
      res.render404('此话题不存在或已被删除。');
      return;
    }

    if (String(question.author_id) === String(req.session.user._id) || req.session.user.is_admin) {
      res.render('question/edit', {
        action: 'edit',
        question_id: question._id,
        title: question.title,
        content: question.content,
        tab: question.tab,
        tabs: config.tabs
      });
    } else {
      res.renderError('对不起，你不能编辑此话题。', 403);
    }
  });
};

exports.update = function (req, res, next) {
  var question_id = req.params.tid;
  var title    = req.body.title;
  var tab      = req.body.tab;
  var content  = req.body.t_content;

  Question.getQuestionById(question_id, function (err, question, tags) {
    if (!question) {
      res.render404('此话题不存在或已被删除。');
      return;
    }

    if (question.author_id.equals(req.session.user._id) || req.session.user.is_admin) {
      title   = validator.trim(title);
      tab     = validator.trim(tab);
      content = validator.trim(content);

      // 验证
      var editError;
      if (title === '') {
        editError = '标题不能是空的。';
      } else if (title.length < 5 || title.length > 100) {
        editError = '标题字数太多或太少。';
      } else if (!tab) {
        editError = '必须选择一个版块。';
      }
      // END 验证

      if (editError) {
        return res.render('question/edit', {
          action: 'edit',
          edit_error: editError,
          question_id: question._id,
          content: content,
          tabs: config.tabs
        });
      }

      //保存话题
      question.title     = title;
      question.content   = content;
      question.tab       = tab;
      question.update_at = new Date();

      question.save(function (err) {
        if (err) {
          return next(err);
        }
        //发送at消息
        at.sendMessageToMentionUsers(content, question._id, req.session.user._id);

        res.redirect('/question/' + question._id);

      });
    } else {
      res.renderError('对不起，你不能编辑此话题。', 403);
    }
  });
};

exports.delete = function (req, res, next) {
  //删除话题, 话题作者question_count减1
  //删除回复，回复作者answer_count减1
  //删除question_collect，用户collect_question_count减1

  var question_id = req.params.tid;

  Question.getFullQuestion(question_id, function (err, err_msg, question, author, answers) {
    if (err) {
      return res.send({ success: false, message: err.message });
    }
    if (!req.session.user.is_admin && !(question.author_id.equals(req.session.user._id))) {
      res.status(403);
      return res.send({success: false, message: '无权限'});
    }
    if (!question) {
      res.status(422);
      return res.send({ success: false, message: '此话题不存在或已被删除。' });
    }
    author.score -= 5;
    author.question_count -= 1;
    author.save();

    question.deleted = true;
    question.save(function (err) {
      if (err) {
        return res.send({ success: false, message: err.message });
      }
      res.send({ success: true, message: '话题已被删除。' });
    });
  });
};

// 设为置顶
exports.top = function (req, res, next) {
  var question_id = req.params.tid;
  var referer  = req.get('referer');

  if (question_id.length !== 24) {
    res.render404('此话题不存在或已被删除。');
    return;
  }
  Question.getQuestion(question_id, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.render404('此话题不存在或已被删除。');
      return;
    }
    question.top = !question.top;
    question.save(function (err) {
      if (err) {
        return next(err);
      }
      var msg = question.top ? '此话题已置顶。' : '此话题已取消置顶。';
      res.render('notify/notify', {success: msg, referer: referer});
    });
  });
};

// 设为精华
exports.good = function (req, res, next) {
  var questionId = req.params.tid;
  var referer = req.get('referer');

  Question.getQuestion(questionId, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.render404('此话题不存在或已被删除。');
      return;
    }
    question.good = !question.good;
    question.save(function (err) {
      if (err) {
        return next(err);
      }
      var msg = question.good ? '此话题已加精。' : '此话题已取消加精。';
      res.render('notify/notify', {success: msg, referer: referer});
    });
  });
};

// 锁定主题，不可再回复
exports.lock = function (req, res, next) {
  var questionId = req.params.tid;
  var referer = req.get('referer');
  Question.getQuestion(questionId, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.render404('此话题不存在或已被删除。');
      return;
    }
    question.lock = !question.lock;
    question.save(function (err) {
      if (err) {
        return next(err);
      }
      var msg = question.lock ? '此话题已锁定。' : '此话题已取消锁定。';
      res.render('notify/notify', {success: msg, referer: referer});
    });
  });
};

// 收藏主题
exports.collect = function (req, res, next) {
  var question_id = req.body.question_id;

  Question.getQuestion(question_id, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.json({status: 'failed'});
    }

    QuestionCollect.getQuestionCollect(req.session.user._id, question._id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (doc) {
        res.json({status: 'failed'});
        return;
      }

      QuestionCollect.newAndSave(req.session.user._id, question._id, function (err) {
        if (err) {
          return next(err);
        }
        res.json({status: 'success'});
      });
      User.getUserById(req.session.user._id, function (err, user) {
        if (err) {
          return next(err);
        }
        user.collect_question_count += 1;
        user.save();
      });

      req.session.user.collect_question_count += 1;
      question.collect_count += 1;
      question.save();
    });
  });
};

exports.de_collect = function (req, res, next) {
  var question_id = req.body.question_id;
  Question.getQuestion(question_id, function (err, question) {
    if (err) {
      return next(err);
    }
    if (!question) {
      res.json({status: 'failed'});
    }
    QuestionCollect.remove(req.session.user._id, question._id, function (err, removeResult) {
      if (err) {
        return next(err);
      }
      if (removeResult.result.n == 0) {
        return res.json({status: 'failed'})
      }

      User.getUserById(req.session.user._id, function (err, user) {
        if (err) {
          return next(err);
        }
        user.collect_question_count -= 1;
        req.session.user = user;
        user.save();
      });

      question.collect_count -= 1;
      question.save();

      res.json({status: 'success'});
    });
  });
};

exports.upload = function (req, res, next) {
  var isFileLimit = false;
  req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
      file.on('limit', function () {
        isFileLimit = true;

        res.json({
          success: false,
          msg: 'File size too large. Max is ' + config.file_limit
        })
      });

      store.upload(file, {filename: filename}, function (err, result) {
        if (err) {
          return next(err);
        }
        if (isFileLimit) {
          return;
        }
        res.json({
          success: true,
          url: result.url,
        });
      });

    });

  req.pipe(req.busboy);
};
