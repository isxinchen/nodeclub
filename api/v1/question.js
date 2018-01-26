var models       = require('../../models');
var QuestionModel   = models.Question;
var QuestionProxy   = require('../../proxy').Question;
var QuestionCollect = require('../../proxy').QuestionCollect;
var UserProxy    = require('../../proxy').User;
var UserModel    = models.User;
var config       = require('../../config');
var eventproxy   = require('eventproxy');
var _            = require('lodash');
var at           = require('../../common/at');
var renderHelper = require('../../common/render_helper');
var validator    = require('validator');

var index = function (req, res, next) {
  var page     = parseInt(req.query.page, 10) || 1;
  page         = page > 0 ? page : 1;
  var tab      = req.query.tab || 'all';
  var limit    = Number(req.query.limit) || config.list_question_count;
  var mdrender = req.query.mdrender === 'false' ? false : true;

  var query = {};
  if (!tab || tab === 'all') {
    query.tab = {$nin: ['job', 'dev']}
  } else {
    if (tab === 'good') {
      query.good = true;
    } else {
      query.tab = tab;
    }
  }
  query.deleted = false;
  var options = { skip: (page - 1) * limit, limit: limit, sort: '-top -last_answer_at'};

  var ep = new eventproxy();
  ep.fail(next);

  QuestionModel.find(query, '', options, ep.done('questions'));

  ep.all('questions', function (questions) {
    questions.forEach(function (question) {
      UserModel.findById(question.author_id, ep.done(function (author) {
        if (mdrender) {
          question.content = renderHelper.markdown(at.linkUsers(question.content));
        }
        question.author = _.pick(author, ['loginname', 'avatar_url']);
        ep.emit('author');
      }));
    });

    ep.after('author', questions.length, function () {
      questions = questions.map(function (question) {
        return _.pick(question, ['id', 'author_id', 'tab', 'content', 'title', 'last_answer_at',
          'good', 'top', 'answer_count', 'visit_count', 'create_at', 'author']);
      });

      res.send({success: true, data: questions});
    });
  });
};

exports.index = index;

var show = function (req, res, next) {
  var questionId  = String(req.params.id);

  var mdrender = req.query.mdrender === 'false' ? false : true;
  var ep       = new eventproxy();

  if (!validator.isMongoId(questionId)) {
    res.status(400);
    return res.send({success: false, error_msg: '不是有效的话题id'});
  }

  ep.fail(next);

  QuestionProxy.getFullQuestion(questionId, ep.done(function (msg, question, author, answers) {
    if (!question) {
      res.status(404);
      return res.send({success: false, error_msg: '话题不存在'});
    }
    question = _.pick(question, ['id', 'author_id', 'tab', 'content', 'title', 'last_answer_at',
      'good', 'top', 'answer_count', 'visit_count', 'create_at', 'author']);

    if (mdrender) {
      question.content = renderHelper.markdown(at.linkUsers(question.content));
    }
    question.author = _.pick(author, ['loginname', 'avatar_url']);

    question.answers = answers.map(function (answer) {
      if (mdrender) {
        answer.content = renderHelper.markdown(at.linkUsers(answer.content));
      }
      answer.author = _.pick(answer.author, ['loginname', 'avatar_url']);
      answer =  _.pick(answer, ['id', 'author', 'content', 'ups', 'create_at', 'answer_id']);
      answer.answer_id = answer.answer_id || null;

      if (answer.ups && req.user && answer.ups.indexOf(req.user._id) != -1) {
        answer.is_uped = true;
      } else {
        answer.is_uped = false;
      }

      return answer;
    });

    ep.emit('full_question', question)
  }));


  if (!req.user) {
    ep.emitLater('is_collect', null)
  } else {
    QuestionCollect.getQuestionCollect(req.user._id, questionId, ep.done('is_collect'))
  }

  ep.all('full_question', 'is_collect', function (full_question, is_collect) {
    full_question.is_collect = !!is_collect;

    res.send({success: true, data: full_question});
  })

};

exports.show = show;

var create = function (req, res, next) {
  var title   = validator.trim(req.body.title || '');
  var tab     = validator.trim(req.body.tab || '');
  var content = validator.trim(req.body.content || '');

  // 得到所有的 tab, e.g. ['ask', 'share', ..]
  var allTabs = config.tabs.map(function (tPair) {
    return tPair[0];
  });

  // 验证
  var editError;
  if (title === '') {
    editError = '标题不能为空';
  } else if (title.length < 5 || title.length > 100) {
    editError = '标题字数太多或太少';
  } else if (!tab || !_.includes(allTabs, tab)) {
    editError = '必须选择一个版块';
  } else if (content === '') {
    editError = '内容不可为空';
  }
  // END 验证

  if (editError) {
    res.status(400);
    return res.send({success: false, error_msg: editError});
  }

  QuestionProxy.newAndSave(title, content, tab, req.user.id, function (err, question) {
    if (err) {
      return next(err);
    }

    var proxy = new eventproxy();
    proxy.fail(next);

    proxy.all('score_saved', function () {
      res.send({
        success: true,
        question_id: question.id
      });
    });
    UserProxy.getUserById(req.user.id, proxy.done(function (user) {
      user.score += 5;
      user.question_count += 1;
      user.save();
      req.user = user;
      proxy.emit('score_saved');
    }));

    //发送at消息
    at.sendMessageToMentionUsers(content, question.id, req.user.id);
  });
};

exports.create = create;

exports.update = function (req, res, next) {
  var question_id = _.trim(req.body.question_id);
  var title    = _.trim(req.body.title);
  var tab      = _.trim(req.body.tab);
  var content  = _.trim(req.body.content);

  // 得到所有的 tab, e.g. ['ask', 'share', ..]
  var allTabs = config.tabs.map(function (tPair) {
    return tPair[0];
  });

  QuestionProxy.getQuestionById(question_id, function (err, question, tags) {
    if (!question) {
      res.status(400);
      return res.send({success: false, error_msg: '此话题不存在或已被删除。'});
    }

    if (question.author_id.equals(req.user._id) || req.user.is_admin) {
      // 验证
      var editError;
      if (title === '') {
        editError = '标题不能是空的。';
      } else if (title.length < 5 || title.length > 100) {
        editError = '标题字数太多或太少。';
      } else if (!tab || !_.includes(allTabs, tab)) {
        editError = '必须选择一个版块。';
      }
      // END 验证

      if (editError) {
        return res.send({success: false, error_msg: editError});
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
        at.sendMessageToMentionUsers(content, question._id, req.user._id);

        res.send({
          success: true,
          question_id: question.id
        });
      });
    } else {
      res.status(403)
      return res.send({success: false, error_msg: '对不起，你不能编辑此话题。'});
    }
  });
};

