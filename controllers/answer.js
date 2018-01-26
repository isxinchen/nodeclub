var validator  = require('validator');
var _          = require('lodash');
var at         = require('../common/at');
var message    = require('../common/message');
var EventProxy = require('eventproxy');
var User       = require('../proxy').User;
var Question      = require('../proxy').Question;
var Answer      = require('../proxy').Answer;
var config     = require('../config');

/**
 * 添加回复
 */
exports.add = function (req, res, next) {
  var content = req.body.r_content;
  var question_id = req.params.question_id;
  var answer_id = req.body.answer_id;

  var str = validator.trim(String(content));
  if (str === '') {
    return res.renderError('回复内容不能为空!', 422);
  }

  var ep = EventProxy.create();
  ep.fail(next);

  Question.getQuestion(question_id, ep.doneLater(function (question) {
    if (!question) {
      ep.unbind();
      // just 404 page
      return next();
    }

    if (question.lock) {
      return res.status(403).send('此主题已锁定。');
    }
    ep.emit('question', question);
  }));

  ep.all('question', function (question) {
    User.getUserById(question.author_id, ep.done('question_author'));
  });

  ep.all('question', 'question_author', function (question, questionAuthor) {
    Answer.newAndSave(content, question_id, req.session.user._id, answer_id, ep.done(function (answer) {
      Question.updateLastAnswer(question_id, answer._id, ep.done(function () {
        ep.emit('answer_saved', answer);
        //发送at消息，并防止重复 at 作者
        var newContent = content.replace('@' + questionAuthor.loginname + ' ', '');
        at.sendMessageToMentionUsers(newContent, question_id, req.session.user._id, answer._id);
      }));
    }));

    User.getUserById(req.session.user._id, ep.done(function (user) {
      user.score += 5;
      user.answer_count += 1;
      user.save();
      req.session.user = user;
      ep.emit('score_saved');
    }));
  });

  ep.all('answer_saved', 'question', function (answer, question) {
    if (question.author_id.toString() !== req.session.user._id.toString()) {
      message.sendAnswerMessage(question.author_id, req.session.user._id, question._id, answer._id);
    }
    ep.emit('message_saved');
  });

  ep.all('answer_saved', 'message_saved', 'score_saved', function (answer) {
    res.redirect('/question/' + question_id + '#' + answer._id);
  });
};

/**
 * 删除回复信息
 */
exports.delete = function (req, res, next) {
  var answer_id = req.body.answer_id;
  Answer.getAnswerById(answer_id, function (err, answer) {
    if (err) {
      return next(err);
    }

    if (!answer) {
      res.status(422);
      res.json({status: 'no answer ' + answer_id + ' exists'});
      return;
    }
    if (answer.author_id.toString() === req.session.user._id.toString() || req.session.user.is_admin) {
      answer.deleted = true;
      answer.save();
      res.json({status: 'success'});

      answer.author.score -= 5;
      answer.author.answer_count -= 1;
      answer.author.save();
    } else {
      res.json({status: 'failed'});
      return;
    }

    Question.reduceCount(answer.question_id, _.noop);
  });
};
/*
 打开回复编辑器
 */
exports.showEdit = function (req, res, next) {
  var answer_id = req.params.answer_id;

  Answer.getAnswerById(answer_id, function (err, answer) {
    if (!answer) {
      return res.render404('此回复不存在或已被删除。');
    }
    if (req.session.user._id.equals(answer.author_id) || req.session.user.is_admin) {
      res.render('answer/edit', {
        answer_id: answer._id,
        content: answer.content
      });
    } else {
      return res.renderError('对不起，你不能编辑此回复。', 403);
    }
  });
};
/*
 提交编辑回复
 */
exports.update = function (req, res, next) {
  var answer_id = req.params.answer_id;
  var content = req.body.t_content;

  Answer.getAnswerById(answer_id, function (err, answer) {
    if (!answer) {
      return res.render404('此回复不存在或已被删除。');
    }

    if (String(answer.author_id) === req.session.user._id.toString() || req.session.user.is_admin) {

      if (content.trim().length > 0) {
        answer.content = content;
        answer.update_at = new Date();
        answer.save(function (err) {
          if (err) {
            return next(err);
          }
          res.redirect('/question/' + answer.question_id + '#' + answer._id);
        });
      } else {
        return res.renderError('回复的字数太少。', 400);
      }
    } else {
      return res.renderError('对不起，你不能编辑此回复。', 403);
    }
  });
};

exports.up = function (req, res, next) {
  var answerId = req.params.answer_id;
  var userId = req.session.user._id;
  Answer.getAnswerById(answerId, function (err, answer) {
    if (err) {
      return next(err);
    }
    if (answer.author_id.equals(userId) && !config.debug) {
      // 不能帮自己点赞
      res.send({
        success: false,
        message: '呵呵，不能帮自己点赞。',
      });
    } else {
      var action;
      answer.ups = answer.ups || [];
      var upIndex = answer.ups.indexOf(userId);
      if (upIndex === -1) {
        answer.ups.push(userId);
        action = 'up';
      } else {
        answer.ups.splice(upIndex, 1);
        action = 'down';
      }
      answer.save(function () {
        res.send({
          success: true,
          action: action
        });
      });
    }
  });
};
